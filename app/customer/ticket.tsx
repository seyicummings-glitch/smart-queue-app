import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Animated, Alert, ActivityIndicator, Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useAppContext } from '@/context/AppContext';
import { api } from '@/lib/api';

type TicketStatus = 'waiting' | 'called' | 'serving' | 'completed' | 'cancelled' | 'missed';

type QueueTicketResponse = {
  id: number;
  ticket_number: string;
  service_name: string;
  branch_name: string;
  status: TicketStatus;
  position: number;
  estimated_wait: number;
  issued_at: string;
  called_at: string | null;
  completed_at: string | null;
  ahead_tickets: string[];
  counter_number?: number | null;
};

function fmt12h(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h > 12 ? h - 12 : h === 0 ? 12 : h}:${m} ${h >= 12 ? 'PM' : 'AM'}`;
}

function fmtDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function calcExpectedTime(issuedIso: string, waitMins: number): string {
  const base = issuedIso ? new Date(issuedIso).getTime() : Date.now();
  const ready = new Date(base + waitMins * 60_000);
  const h = ready.getHours();
  const m = String(ready.getMinutes()).padStart(2, '0');
  return `${h > 12 ? h - 12 : h === 0 ? 12 : h}:${m} ${h >= 12 ? 'PM' : 'AM'}`;
}

function calcCountdown(calledAtIso: string | null): number {
  if (!calledAtIso) return 300;
  const elapsed = (Date.now() - new Date(calledAtIso).getTime()) / 1000;
  return Math.max(0, 300 - Math.floor(elapsed));
}

export default function CustomerTicket() {
  const router = useRouter();
  const { activeTicket, setActiveTicket } = useAppContext();
  const pulseAnim    = useRef(new Animated.Value(1)).current;
  const ticketIdRef  = useRef<number | null>(activeTicket?.ticketId ?? null);
  const prevStatusRef = useRef<TicketStatus | null>(null);

  const [apiTicket,        setApiTicket]        = useState<QueueTicketResponse | null>(null);
  const [loadingTicket,    setLoadingTicket]    = useState(true);
  const [cancelling,       setCancelling]       = useState(false);
  const [countdown,        setCountdown]        = useState(300);
  const [autoRedirectSecs, setAutoRedirectSecs] = useState<number | null>(null);
  const autoRedirectRef = useRef<string | null>(null);

  // Fetch the specific ticket by ID, falling back to /my-ticket/
  const fetchTicket = useCallback(async () => {
    const endpoint = ticketIdRef.current
      ? `/queues/${ticketIdRef.current}/`
      : '/queues/my-ticket/';
    const { data } = await api.get<QueueTicketResponse>(endpoint);
    if (data) {
      // Terminal statuses — auto-redirect useEffect handles countdown and navigation
      // except for cancelled/missed which redirect immediately
      if (data.status === 'cancelled' || data.status === 'missed') {
        setApiTicket(null);
        setActiveTicket(null);
        setLoadingTicket(false);
        router.replace('/customer/home' as any);
        return;
      }

      if (!ticketIdRef.current) ticketIdRef.current = data.id;

      // Vibrate when status becomes 'called'
      if (prevStatusRef.current !== 'called' && data.status === 'called') {
        Vibration.vibrate([0, 400, 200, 400, 200, 400]);
      }
      prevStatusRef.current = data.status;

      setApiTicket(data);
      setActiveTicket(prev =>
        prev
          ? {
              ...prev,
              ticketId:     data.id,
              ticketNumber: data.ticket_number,
              waitTime:     data.estimated_wait,
              peopleAhead:  Math.max(0, data.position - 1),
              status:       data.status as 'waiting' | 'called' | 'serving' | 'completed' | 'missed',
              aheadTickets: data.ahead_tickets,
            }
          : prev
      );
    }
    setLoadingTicket(false);
  }, []);

  // Poll faster (5 s) when called, normal (15 s) otherwise
  useEffect(() => {
    fetchTicket();
    const interval = setInterval(fetchTicket, apiTicket?.status === 'called' ? 5_000 : 15_000);
    return () => clearInterval(interval);
  }, [fetchTicket, apiTicket?.status]);

  // Countdown timer when status is 'called'
  useEffect(() => {
    if (apiTicket?.status !== 'called') return;
    setCountdown(calcCountdown(apiTicket.called_at));
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [apiTicket?.status, apiTicket?.called_at]);

  // Auto-redirect: called → home in 8s, completed → home in 4s (clears activeTicket so customer can rejoin)
  useEffect(() => {
    const status = apiTicket?.status;
    if (!status || autoRedirectRef.current === status) return;
    if (status !== 'called' && status !== 'completed') return;

    autoRedirectRef.current = status;
    const secs = status === 'called' ? 8 : 4;
    setAutoRedirectSecs(secs);

    const interval = setInterval(() => {
      setAutoRedirectSecs(prev => (prev !== null && prev > 1 ? prev - 1 : 0));
    }, 1000);

    const timer = setTimeout(() => {
      clearInterval(interval);
      if (status === 'completed') {
        setApiTicket(null);
        setActiveTicket(null);
        ticketIdRef.current = null;
      }
      router.replace('/customer/home' as any);
    }, secs * 1000);

    return () => { clearInterval(interval); clearTimeout(timer); };
  }, [apiTicket?.status]);

  // Pulse animation
  useEffect(() => {
    const st = apiTicket?.status ?? activeTicket?.status;
    if (st === 'waiting' || st === 'called' || st === 'serving') {
      const speed = st === 'called' ? 500 : 900;
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: st === 'called' ? 1.08 : 1.05, duration: speed, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: speed, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [apiTicket?.status, activeTicket?.status]);

  const handleCancel = () => {
    const id = apiTicket?.id ?? ticketIdRef.current;
    if (!id) return;
    const displayNumber = apiTicket?.ticket_number ?? activeTicket?.ticketNumber ?? `#${id}`;
    Alert.alert(
      'Leave Queue',
      `Leave the queue? Your ticket ${displayNumber} will be removed and you will lose your place.`,
      [
        { text: 'Stay in Queue', style: 'cancel' },
        {
          text: 'Leave Queue',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            const { error } = await api.post(`/queues/${id}/cancel/`);
            setCancelling(false);
            if (error) {
              Alert.alert('Error', error);
            } else {
              setApiTicket(null);
              setActiveTicket(null);
              ticketIdRef.current = null;
              router.replace('/customer/home' as any);
            }
          },
        },
      ],
    );
  };

  const ticket        = apiTicket ?? activeTicket;
  const ticketNumber  = apiTicket?.ticket_number ?? activeTicket?.ticketNumber ?? '';
  const serviceName   = apiTicket?.service_name  ?? activeTicket?.service ?? '';
  const branchName    = apiTicket?.branch_name   ?? activeTicket?.branch  ?? '';
  const industryName  = activeTicket?.industry ?? '';
  const waitMins      = apiTicket?.estimated_wait ?? activeTicket?.waitTime ?? 0;
  const peopleAhead   = apiTicket ? Math.max(0, apiTicket.position - 1) : (activeTicket?.peopleAhead ?? 0);
  const aheadTickets  = apiTicket?.ahead_tickets ?? activeTicket?.aheadTickets ?? [];
  const currentStatus: TicketStatus = (apiTicket?.status ?? activeTicket?.status ?? 'waiting') as TicketStatus;
  const counterNumber = apiTicket?.counter_number ?? activeTicket?.counter ?? null;

  const isActive = currentStatus === 'waiting' || currentStatus === 'called' || currentStatus === 'serving';

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loadingTicket && !activeTicket) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/customer/home' as any)} style={styles.headerBackBtn}>
            <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Ticket</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.emptyContent}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaView>
    );
  }

  // ── No ticket ──────────────────────────────────────────────────────────────
  if (!ticket && !loadingTicket) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/customer/home' as any)} style={styles.headerBackBtn}>
            <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Ticket</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.emptyContent}>
          <View style={styles.emptyIconWrap}>
            <MaterialIcons name="confirmation-number" size={52} color="#94a3b8" />
          </View>
          <Text style={styles.emptyTitle}>No Active Ticket</Text>
          <Text style={styles.emptySub}>You are not currently in a queue.{'\n'}Join a queue to get your ticket.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/customer/industries' as any)}>
            <MaterialIcons name="queue" size={18} color="#fff" />
            <Text style={styles.emptyBtnText}>Browse Services</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const issuedDate   = apiTicket ? fmtDate(apiTicket.issued_at) : '—';
  const issuedTime   = apiTicket ? fmt12h(apiTicket.issued_at) : (activeTicket?.issuedAt ?? '—');
  const expectedTime = apiTicket ? calcExpectedTime(apiTicket.issued_at, waitMins) : '—';

  const headerColor =
    currentStatus === 'called'    ? '#d97706' :
    currentStatus === 'serving'   ? '#059669' :
    currentStatus === 'completed' ? '#475569' :
    currentStatus === 'cancelled' ? '#94a3b8' :
    currentStatus === 'missed'    ? '#e11d48' : '#2563eb';

  const countdownMins = Math.floor(countdown / 60);
  const countdownSecs = String(countdown % 60).padStart(2, '0');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e293b" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={isActive ? () => router.replace('/customer/home' as any) : () => router.replace('/customer/home' as any)}
          style={styles.closeBtn}
        >
          <MaterialIcons name="close" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {industryName ? `${industryName} · ` : ''}{serviceName}
        </Text>
        <View style={[styles.activePill, !isActive && { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
          <View style={[styles.activeDot, {
            backgroundColor:
              currentStatus === 'called'    ? '#fbbf24' :
              currentStatus === 'serving'   ? '#34d399' :
              currentStatus === 'missed'    ? '#f87171' :
              isActive ? '#34d399' : '#94a3b8',
          }]} />
          <Text style={styles.activeText}>
            {currentStatus === 'called'    ? 'Called!' :
             currentStatus === 'serving'   ? 'Serving' :
             currentStatus === 'completed' ? 'Done'    :
             currentStatus === 'missed'    ? 'Missed'  : 'Live'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── CALLED alert banner ───────────────────────────────────── */}
        {currentStatus === 'called' && (
          <View style={styles.calledBanner}>
            <MaterialIcons name="notifications-active" size={28} color="#92400e" />
            <View style={{ flex: 1 }}>
              <Text style={styles.calledBannerTitle}>It's Your Turn!</Text>
              <Text style={styles.calledBannerDesc}>
                Please proceed to the counter immediately.{'\n'}
                Time remaining: {countdownMins}:{countdownSecs}
                {autoRedirectSecs !== null ? `\nLeaving this page in ${autoRedirectSecs}s…` : ''}
              </Text>
            </View>
          </View>
        )}

        {/* ── COMPLETED banner ──────────────────────────────────────── */}
        {currentStatus === 'completed' && (
          <View style={styles.completedBanner}>
            <MaterialIcons name="check-circle" size={26} color="#065f46" />
            <View style={{ flex: 1 }}>
              <Text style={styles.completedBannerTitle}>Service Complete!</Text>
              <Text style={styles.completedBannerDesc}>
                Thank you for visiting.
                {autoRedirectSecs !== null ? `\nReturning to home in ${autoRedirectSecs}s…` : ''}
              </Text>
            </View>
          </View>
        )}

        {/* ── MISSED banner ─────────────────────────────────────────── */}
        {currentStatus === 'missed' && (
          <View style={styles.missedBanner}>
            <MaterialIcons name="access-time-filled" size={24} color="#991b1b" />
            <View style={{ flex: 1 }}>
              <Text style={styles.missedBannerTitle}>You Missed Your Turn</Text>
              <Text style={styles.missedBannerDesc}>
                Your ticket expired. Please rejoin the queue if you still need this service.
              </Text>
            </View>
          </View>
        )}

        {/* ── Ticket card ───────────────────────────────────────────── */}
        <View style={styles.ticketCard}>
          <View style={styles.notchLeft} />
          <View style={styles.notchRight} />

          <View style={[styles.ticketHeader, { backgroundColor: headerColor }]}>
            <Text style={styles.ticketLabel}>TICKET NUMBER</Text>
            <Animated.Text style={[styles.ticketNumber, { transform: [{ scale: pulseAnim }] }]}>
              {ticketNumber}
            </Animated.Text>
            <Text style={styles.ticketSubtext}>
              {currentStatus === 'called'    ? '⚡ Go to the counter NOW' :
               currentStatus === 'serving'   ? "It's your turn — please go to the counter" :
               currentStatus === 'completed' ? 'Service completed — thank you!' :
               currentStatus === 'cancelled' ? 'This ticket has been cancelled' :
               currentStatus === 'missed'    ? 'Ticket expired — you missed your turn' :
               "Please wait — you'll be notified when it's your turn"}
            </Text>
          </View>

          <View style={styles.dashed} />

          <View style={styles.infoGrid}>
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>DATE ISSUED</Text>
              <Text style={styles.infoValue}>{issuedDate}</Text>
            </View>
            <View style={styles.infoCellDivider} />
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>TIME ISSUED</Text>
              <Text style={styles.infoValue}>{issuedTime}</Text>
            </View>
          </View>

          <View style={styles.dashed} />

          <View style={styles.infoGrid}>
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>
                {currentStatus === 'called' ? 'RESPOND BY' : 'ATTEND BY'}
              </Text>
              <Text style={[styles.infoValue, {
                color: currentStatus === 'called' ? '#d97706' :
                       currentStatus === 'serving' ? '#059669' : '#0f172a',
              }]}>
                {currentStatus === 'called'  ? `${countdownMins}:${countdownSecs}` :
                 currentStatus === 'serving' ? 'Now' :
                 currentStatus === 'waiting' ? expectedTime : '—'}
              </Text>
              {currentStatus === 'waiting' && peopleAhead === 0 && (
                <Text style={styles.nextUpText}>You're next!</Text>
              )}
            </View>
            <View style={styles.infoCellDivider} />
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>COUNTER</Text>
              <Text style={styles.infoValue}>
                {isActive ? `#${apiTicket?.position ?? '—'}` : '—'}
              </Text>
              {counterNumber != null && (
                <Text style={styles.counterPendingText}>#{counterNumber}</Text>
              )}
            </View>
          </View>

          <View style={styles.dashed} />

          {/* Ahead tickets */}
          {currentStatus === 'waiting' && aheadTickets.length > 0 && (
            <View style={styles.aheadSection}>
              <Text style={styles.aheadLabel}>
                {peopleAhead} {peopleAhead === 1 ? 'person' : 'people'} ahead of you
              </Text>
              <View style={styles.aheadChips}>
                {aheadTickets.map(tn => (
                  <View key={tn} style={styles.aheadChip}>
                    <Text style={styles.aheadChipText}>{tn}</Text>
                  </View>
                ))}
                <View style={[styles.aheadChip, styles.aheadChipYou]}>
                  <Text style={[styles.aheadChipText, { color: '#fff' }]}>{ticketNumber} (You)</Text>
                </View>
              </View>
            </View>
          )}

          {/* Counter banner */}
          {counterNumber != null && (
            <View style={styles.counterBanner}>
              <View style={styles.counterBannerIcon}>
                <MaterialIcons name="tag" size={20} color="#2563eb" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.counterBannerLabel}>Proceed to Counter</Text>
                <Text style={styles.counterBannerNum}>Counter #{counterNumber}</Text>
              </View>
              <MaterialIcons name="arrow-forward" size={20} color="#2563eb" />
            </View>
          )}

          {/* QR code */}
          <View style={styles.qrSection}>
            <View style={styles.qrBox}>
              {ticketNumber
                ? <QRCode value={ticketNumber} size={116} color="#0f172a" backgroundColor="#f8fafc" />
                : <MaterialIcons name="qr-code-2" size={100} color="#0f172a" />
              }
            </View>
            <Text style={styles.qrHint}>Show this QR code at the counter</Text>
          </View>
        </View>

        {/* ── Branch info ───────────────────────────────────────────── */}
        <View style={styles.locationCard}>
          <MaterialIcons name="place" size={22} color="#0d9488" />
          <View style={{ flex: 1 }}>
            <Text style={styles.locationTitle}>{branchName}</Text>
            <Text style={styles.locationDesc}>
              {currentStatus === 'called'
                ? 'Please make your way to the counter immediately.'
                : 'Stay nearby. You will be notified when your number is called.'}
            </Text>
          </View>
        </View>

        {/* ── Track position live ───────────────────────────────────── */}
        {isActive && (
          <TouchableOpacity
            style={styles.trackBtn}
            onPress={() => router.push('/customer/queue-status' as any)}
            activeOpacity={0.85}
          >
            <MaterialIcons name="track-changes" size={18} color="#2563eb" />
            <Text style={styles.trackText}>Track My Position Live</Text>
            <MaterialIcons name="arrow-forward" size={16} color="#2563eb" />
          </TouchableOpacity>
        )}

        {/* ── Tips ──────────────────────────────────────────────────── */}
        {currentStatus === 'waiting' && (
          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>While you wait…</Text>
            {[
              "You'll be notified when it's your turn.",
              'You can move freely around the branch.',
              'Keep your phone volume on for alerts.',
              'This page refreshes automatically every 15 seconds.',
            ].map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <MaterialIcons name="info-outline" size={14} color="#2563eb" />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Actions ───────────────────────────────────────────────── */}
        {(currentStatus === 'waiting' || currentStatus === 'called') && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={handleCancel}
            disabled={cancelling}
            activeOpacity={0.85}
          >
            {cancelling
              ? <ActivityIndicator size="small" color="#e11d48" />
              : <>
                  <MaterialIcons name="cancel" size={16} color="#e11d48" />
                  <Text style={styles.cancelBtnText}>Cancel Ticket</Text>
                </>
            }
          </TouchableOpacity>
        )}

        {(currentStatus === 'serving' || currentStatus === 'called') && (
          <TouchableOpacity
            style={styles.homeBtn}
            onPress={() => router.replace('/customer/home' as any)}
          >
            <Text style={styles.homeBtnText}>Back to Home</Text>
          </TouchableOpacity>
        )}

        {(currentStatus === 'completed' || currentStatus === 'cancelled' || currentStatus === 'missed') && (
          <TouchableOpacity
            style={styles.homeBtn}
            onPress={() => router.replace('/customer/home' as any)}
          >
            <Text style={styles.homeBtnText}>Back to Home</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  emptyContainer: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  headerBackBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle:   { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  emptyContent:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  emptyIconWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  emptySub:   { fontSize: 14, color: '#64748b', fontWeight: '500', textAlign: 'center', lineHeight: 22 },
  emptyBtn:   {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#2563eb', borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 14, marginTop: 8,
  },
  emptyBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  container: { flex: 1, backgroundColor: '#1e293b' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  topBarTitle: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)', flex: 1, textAlign: 'center', marginHorizontal: 8 },
  activePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
  },
  activeDot:  { width: 7, height: 7, borderRadius: 4, backgroundColor: '#34d399' },
  activeText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  calledBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fef3c7', borderRadius: 16, padding: 16,
    borderWidth: 2, borderColor: '#fbbf24',
  },
  calledBannerTitle: { fontSize: 16, fontWeight: '900', color: '#92400e' },
  calledBannerDesc:  { fontSize: 12, fontWeight: '600', color: '#b45309', lineHeight: 18, marginTop: 2 },

  missedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff1f2', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#fecaca',
  },
  missedBannerTitle: { fontSize: 15, fontWeight: '800', color: '#991b1b' },
  missedBannerDesc:  { fontSize: 12, fontWeight: '500', color: '#b91c1c', lineHeight: 18, marginTop: 2 },

  completedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#ecfdf5', borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: '#6ee7b7',
  },
  completedBannerTitle: { fontSize: 15, fontWeight: '800', color: '#065f46' },
  completedBannerDesc:  { fontSize: 12, fontWeight: '500', color: '#059669', lineHeight: 18, marginTop: 2 },

  content: { padding: 16, gap: 14, paddingBottom: 40 },

  ticketCard: {
    backgroundColor: '#fff', borderRadius: 28, overflow: 'visible',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 24, elevation: 10,
  },
  notchLeft:  { position: 'absolute', top: '50%', left: -14, width: 28, height: 28, borderRadius: 14, backgroundColor: '#1e293b', zIndex: 10 },
  notchRight: { position: 'absolute', top: '50%', right: -14, width: 28, height: 28, borderRadius: 14, backgroundColor: '#1e293b', zIndex: 10 },

  ticketHeader: {
    backgroundColor: '#2563eb',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 28, alignItems: 'center', gap: 8,
  },
  ticketLabel:   { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.65)', letterSpacing: 1.5, textTransform: 'uppercase' },
  ticketNumber:  { fontSize: 60, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  ticketSubtext: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600', textAlign: 'center' },

  dashed: { height: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: '#e2e8f0', marginHorizontal: 20 },

  infoGrid:        { flexDirection: 'row', paddingVertical: 18, paddingHorizontal: 20 },
  infoCell:        { flex: 1, alignItems: 'center', gap: 4 },
  infoCellDivider: { width: 1, backgroundColor: '#e2e8f0' },
  infoLabel:       { fontSize: 9, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 },
  infoValue:       { fontSize: 17, fontWeight: '900', color: '#0f172a', textAlign: 'center' },
  nextUpText:         { fontSize: 11, fontWeight: '700', color: '#2563eb', marginTop: 2 },
  counterPendingText: { fontSize: 12, fontWeight: '800', color: '#2563eb', marginTop: 2 },

  counterBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginBottom: 4,
    backgroundColor: '#eff6ff', borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: '#bfdbfe',
  },
  counterBannerIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center',
  },
  counterBannerLabel: { fontSize: 11, fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  counterBannerNum:   { fontSize: 20, fontWeight: '900', color: '#1d4ed8', marginTop: 1 },

  aheadSection: { paddingHorizontal: 20, paddingVertical: 14, gap: 8 },
  aheadLabel:   { fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8 },
  aheadChips:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  aheadChip:    { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  aheadChipYou: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  aheadChipText:{ fontSize: 12, fontWeight: '700', color: '#475569' },

  qrSection: { alignItems: 'center', paddingVertical: 22, gap: 8 },
  qrBox: {
    width: 148, height: 148, backgroundColor: '#f8fafc',
    borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  qrHint: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },

  locationCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#f0fdfa', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: '#99f6e4',
  },
  locationTitle: { fontSize: 13, fontWeight: '700', color: '#134e4a', marginBottom: 4 },
  locationDesc:  { fontSize: 12, color: '#0d9488', fontWeight: '500', lineHeight: 18 },

  trackBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#eff6ff', paddingVertical: 14, borderRadius: 16,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  trackText: { fontSize: 14, fontWeight: '700', color: '#2563eb' },

  tipsCard:  { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', gap: 8 },
  tipsTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  tipRow:    { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  tipText:   { flex: 1, fontSize: 12, color: '#64748b', fontWeight: '500', lineHeight: 18 },

  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14,
    borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff1f2',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: '#e11d48' },

  homeBtn: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 14, backgroundColor: '#059669',
  },
  homeBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
