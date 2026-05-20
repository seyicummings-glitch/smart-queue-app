import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Animated, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppContext } from '@/context/AppContext';
import { api } from '@/lib/api';

type QueueTicketResponse = {
  id: number;
  ticket_number: string;
  service_name: string;
  branch_name: string;
  status: 'waiting' | 'serving' | 'completed' | 'cancelled';
  position: number;
  estimated_wait: number;
  issued_at: string;
  called_at: string | null;
  completed_at: string | null;
  ahead_tickets: string[];
};

function fmt12h(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h > 12 ? h - 12 : h === 0 ? 12 : h}:${m} ${h >= 12 ? 'PM' : 'AM'}`;
}

function calcReadyTime(waitMins: number): string {
  const ready = new Date(Date.now() + waitMins * 60_000);
  const h = ready.getHours();
  const m = String(ready.getMinutes()).padStart(2, '0');
  return `${h > 12 ? h - 12 : h === 0 ? 12 : h}:${m} ${h >= 12 ? 'PM' : 'AM'}`;
}

export default function CustomerTicket() {
  const router = useRouter();
  const { activeTicket, setActiveTicket } = useAppContext();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [apiTicket, setApiTicket] = useState<QueueTicketResponse | null>(null);
  const [loadingTicket, setLoadingTicket] = useState(true);

  // Fetch real ticket from backend on mount and every 15 s
  const fetchTicket = useCallback(async () => {
    const { data } = await api.get<QueueTicketResponse>('/queues/my-ticket/');
    if (data) {
      setApiTicket(data);
      // Keep AppContext in sync so other pages reflect current state
      setActiveTicket(prev => prev ? {
        ...prev,
        ticketId:     data.id,
        ticketNumber: data.ticket_number,
        waitTime:     data.estimated_wait,
        peopleAhead:  Math.max(0, data.position - 1),
        status:       data.status === 'cancelled' ? 'completed' : data.status,
        aheadTickets: data.ahead_tickets,
      } : prev);
    }
    setLoadingTicket(false);
  }, []);

  useEffect(() => {
    fetchTicket();
    const interval = setInterval(fetchTicket, 15_000);
    return () => clearInterval(interval);
  }, [fetchTicket]);

  // Pulse animation
  useEffect(() => {
    const st = apiTicket?.status ?? activeTicket?.status;
    if (st === 'waiting' || st === 'serving') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [apiTicket?.status, activeTicket?.status]);

  const handleLeave = () => {
    Alert.alert('Leave Queue', 'Cancel your ticket and leave the queue?', [
      { text: 'Stay in Queue', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          const ticketId = apiTicket?.id ?? activeTicket?.ticketId;
          if (ticketId) {
            await api.post(`/queues/${ticketId}/cancel/`, {});
          }
          setActiveTicket(null);
          router.replace('/customer/home' as any);
        },
      },
    ]);
  };

  // Use API data as source of truth; fall back to AppContext while loading
  const ticket = apiTicket ?? activeTicket;
  const ticketNumber = apiTicket?.ticket_number ?? activeTicket?.ticketNumber ?? '';
  const serviceName  = apiTicket?.service_name  ?? activeTicket?.service ?? '';
  const branchName   = apiTicket?.branch_name   ?? activeTicket?.branch  ?? '';
  const industryName = activeTicket?.industry ?? '';
  const waitMins     = apiTicket?.estimated_wait ?? activeTicket?.waitTime ?? 0;
  const peopleAhead  = apiTicket ? Math.max(0, apiTicket.position - 1) : (activeTicket?.peopleAhead ?? 0);
  const aheadTickets = apiTicket?.ahead_tickets ?? activeTicket?.aheadTickets ?? [];
  const issuedAt     = apiTicket ? fmt12h(apiTicket.issued_at) : (activeTicket?.issuedAt ?? '—');
  const currentStatus = apiTicket?.status ?? activeTicket?.status ?? 'waiting';

  // ── Loading (first load, no context data either) ───────────────────────────
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

  // ── No active ticket state ─────────────────────────────────────────────────
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
          <Text style={styles.emptySub}>
            You are not currently in a queue.{'\n'}Join a queue to get your ticket.
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.push('/customer/industries' as any)}
          >
            <MaterialIcons name="queue" size={18} color="#fff" />
            <Text style={styles.emptyBtnText}>Browse Services</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isActive = currentStatus === 'waiting' || currentStatus === 'serving';
  const readyAt  = waitMins > 0 ? calcReadyTime(waitMins) : null;

  // ── Active / recent ticket ─────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e293b" />

      <View style={styles.topBar}>
        <TouchableOpacity onPress={isActive ? handleLeave : () => router.replace('/customer/home' as any)} style={styles.closeBtn}>
          <MaterialIcons name="close" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {industryName ? `${industryName} · ` : ''}{serviceName}
        </Text>
        <View style={[styles.activePill, !isActive && { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
          <View style={[styles.activeDot, !isActive && { backgroundColor: '#94a3b8' }]} />
          <Text style={styles.activeText}>
            {currentStatus === 'serving' ? 'Now Serving' : currentStatus === 'completed' ? 'Done' : 'Live'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Ticket card ───────────────────────────────────── */}
        <View style={styles.ticketCard}>
          <View style={styles.notchLeft} />
          <View style={styles.notchRight} />

          {/* Header section */}
          <View style={[
            styles.ticketHeader,
            currentStatus === 'serving'   && { backgroundColor: '#059669' },
            currentStatus === 'completed' && { backgroundColor: '#475569' },
            currentStatus === 'cancelled' && { backgroundColor: '#94a3b8' },
          ]}>
            <Text style={styles.ticketLabel}>TICKET NUMBER</Text>
            <Animated.Text style={[styles.ticketNumber, { transform: [{ scale: pulseAnim }] }]}>
              {ticketNumber}
            </Animated.Text>
            <Text style={styles.ticketSubtext}>
              {currentStatus === 'serving'   ? "It's your turn — please go to the counter" :
               currentStatus === 'completed' ? 'Service completed — thank you!' :
               currentStatus === 'cancelled' ? 'This ticket has been cancelled' :
               'Please wait — you will be called when it\'s your turn'}
            </Text>
          </View>

          {/* Dashed divider */}
          <View style={styles.dashed} />

          {/* Wait stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Est. Wait</Text>
              <View style={styles.statValueRow}>
                <Text style={styles.statValue}>
                  {currentStatus === 'waiting' ? (waitMins > 0 ? waitMins : '<5') : '—'}
                </Text>
                {currentStatus === 'waiting' && <Text style={styles.statUnit}> min</Text>}
              </View>
              {/* Ready at time — shown directly below Est. Wait */}
              {currentStatus === 'waiting' && readyAt && (
                <View style={styles.readyAtRow}>
                  <MaterialIcons name="alarm" size={11} color="#059669" />
                  <Text style={styles.readyAtText}>Ready ~{readyAt}</Text>
                </View>
              )}
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Ahead of You</Text>
              <View style={styles.statValueRow}>
                <Text style={styles.statValue}>{currentStatus === 'waiting' ? peopleAhead : '—'}</Text>
                {currentStatus === 'waiting' && <Text style={styles.statUnit}> people</Text>}
              </View>
              {currentStatus === 'waiting' && peopleAhead === 0 && (
                <Text style={[styles.readyAtText, { color: '#2563eb' }]}>You're next!</Text>
              )}
            </View>
          </View>

          {/* Dashed divider */}
          <View style={styles.dashed} />

          {/* Ahead tickets list */}
          {currentStatus === 'waiting' && aheadTickets.length > 0 && (
            <View style={styles.aheadSection}>
              <Text style={styles.aheadLabel}>Waiting before you</Text>
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

          {/* QR section */}
          <View style={styles.qrSection}>
            <View style={styles.qrBox}>
              <MaterialIcons name="qr-code-2" size={100} color="#0f172a" />
            </View>
            <Text style={styles.qrHint}>Show this at the counter</Text>
          </View>

          <Text style={styles.issuedAt}>Issued at {issuedAt}</Text>
        </View>

        {/* ── Branch info ───────────────────────────────────── */}
        <View style={styles.locationCard}>
          <MaterialIcons name="place" size={22} color="#0d9488" />
          <View style={{ flex: 1 }}>
            <Text style={styles.locationTitle}>{branchName}</Text>
            <Text style={styles.locationDesc}>
              Please stay nearby. You will be notified when your number is called.
            </Text>
          </View>
        </View>

        {/* ── Track position live ───────────────────────────── */}
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

        {/* ── Tips ──────────────────────────────────────────── */}
        {isActive && (
          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>While you wait…</Text>
            {[
              "You'll be notified when it's your turn.",
              'You can move freely around the branch.',
              'Keep your phone volume on for alerts.',
              'This page refreshes every 15 seconds.',
            ].map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <MaterialIcons name="info-outline" size={14} color="#2563eb" />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Leave / Done ──────────────────────────────────── */}
        {isActive ? (
          <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave}>
            <MaterialIcons name="exit-to-app" size={16} color="#e11d48" />
            <Text style={styles.leaveText}>Leave Queue</Text>
          </TouchableOpacity>
        ) : (
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
  // Empty state
  emptyContainer: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  headerBackBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  emptyContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  emptyIconWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  emptySub: { fontSize: 14, color: '#64748b', fontWeight: '500', textAlign: 'center', lineHeight: 22 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#2563eb', borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 14, marginTop: 8,
  },
  emptyBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Active ticket
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
  activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#34d399' },
  activeText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  content: { padding: 16, gap: 14, paddingBottom: 40 },

  ticketCard: {
    backgroundColor: '#fff', borderRadius: 28, overflow: 'visible',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 24, elevation: 10,
  },
  notchLeft: {
    position: 'absolute', top: '50%', left: -14,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#1e293b', zIndex: 10,
  },
  notchRight: {
    position: 'absolute', top: '50%', right: -14,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#1e293b', zIndex: 10,
  },

  ticketHeader: {
    backgroundColor: '#2563eb',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 28, alignItems: 'center', gap: 8,
  },
  ticketLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.65)', letterSpacing: 1.5, textTransform: 'uppercase' },
  ticketNumber: { fontSize: 60, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  ticketSubtext: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500', textAlign: 'center' },

  dashed: { height: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: '#e2e8f0', marginHorizontal: 20 },

  statsRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 20, paddingHorizontal: 24 },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8 },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  statValue: { fontSize: 30, fontWeight: '900', color: '#0f172a' },
  statUnit: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  statDivider: { width: 1, height: 44, backgroundColor: '#e2e8f0', marginTop: 20 },

  // "Ready at" shown below Est. Wait
  readyAtRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  readyAtText: { fontSize: 11, fontWeight: '700', color: '#059669' },

  // Ahead tickets
  aheadSection: { paddingHorizontal: 20, paddingVertical: 14, gap: 8 },
  aheadLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8 },
  aheadChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  aheadChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0',
  },
  aheadChipYou: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  aheadChipText: { fontSize: 12, fontWeight: '700', color: '#475569' },

  qrSection: { alignItems: 'center', paddingVertical: 22, gap: 8 },
  qrBox: {
    width: 148, height: 148, backgroundColor: '#f8fafc',
    borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  qrHint: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
  issuedAt: { textAlign: 'center', fontSize: 11, color: '#94a3b8', fontWeight: '500', paddingBottom: 22 },

  locationCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#f0fdfa', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: '#99f6e4',
  },
  locationTitle: { fontSize: 13, fontWeight: '700', color: '#134e4a', marginBottom: 4 },
  locationDesc: { fontSize: 12, color: '#0d9488', fontWeight: '500', lineHeight: 18 },

  trackBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#eff6ff', paddingVertical: 14, borderRadius: 16,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  trackText: { fontSize: 14, fontWeight: '700', color: '#2563eb' },

  tipsCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0', gap: 8,
  },
  tipsTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  tipRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  tipText: { flex: 1, fontSize: 12, color: '#64748b', fontWeight: '500', lineHeight: 18 },

  leaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14,
    borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff1f2',
  },
  leaveText: { fontSize: 14, fontWeight: '700', color: '#e11d48' },

  homeBtn: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 14, backgroundColor: '#059669',
  },
  homeBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
