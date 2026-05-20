import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Animated, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomNav from '@/components/BottomNav';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { api } from '@/lib/api';

type TicketStatus = 'waiting' | 'serving' | 'completed' | 'cancelled';

type ActiveTicket = {
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
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ComponentProps<typeof MaterialIcons>['name'] }> = {
  waiting:   { label: 'Waiting',     color: '#2563eb', bg: '#eff6ff', icon: 'schedule'    },
  serving:   { label: 'Now Serving', color: '#059669', bg: '#ecfdf5', icon: 'person'       },
  completed: { label: 'Completed',   color: '#64748b', bg: '#f1f5f9', icon: 'check-circle' },
  cancelled: { label: 'Cancelled',   color: '#e11d48', bg: '#fff1f2', icon: 'cancel'       },
};

function formatIssuedAt(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const h  = d.getHours();
  const m  = String(d.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  const hr = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hr}:${m} ${ap}`;
}

function calcReadyTime(waitMins: number): string {
  const ready = new Date(Date.now() + waitMins * 60_000);
  const h = ready.getHours();
  const m = String(ready.getMinutes()).padStart(2, '0');
  return `${h > 12 ? h - 12 : h === 0 ? 12 : h}:${m} ${h >= 12 ? 'PM' : 'AM'}`;
}

export default function CustomerQueueStatus() {
  const router = useRouter();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [ticket,  setTicket]  = useState<ActiveTicket | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTicket = useCallback(async () => {
    const { data, error } = await api.get<ActiveTicket>('/queues/my-ticket/');
    if (error || !data) {
      setTicket(null);
    } else {
      setTicket(data);
    }
    setLoading(false);
  }, []);

  // Initial load + poll every 10 seconds
  useEffect(() => {
    fetchTicket();
    const interval = setInterval(fetchTicket, 10_000);
    return () => clearInterval(interval);
  }, [fetchTicket]);

  // Pulse animation while waiting or serving
  useEffect(() => {
    const status = ticket?.status;
    if (status === 'waiting' || status === 'serving') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.07, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 800, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [ticket?.status]);

  const handleLeave = () => {
    if (!ticket) return;
    Alert.alert('Leave Queue', 'Are you sure? Your ticket will be cancelled.', [
      { text: 'Stay', style: 'cancel' },
      { text: 'Leave Queue', style: 'destructive', onPress: async () => {
        const { error } = await api.post(`/queues/${ticket.id}/cancel/`, {});
        if (error) { Alert.alert('Error', error); return; }
        setTicket(null);
        router.replace('/customer/home' as any);
      }},
    ]);
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/customer/home' as any)} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Queue Status</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.emptyContent}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
        <BottomNav />
      </SafeAreaView>
    );
  }

  // ── No active ticket ──────────────────────────────────────────────────────
  if (!ticket || ticket.status === 'cancelled') {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/customer/home' as any)} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Queue Status</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.emptyContent}>
          <View style={styles.emptyIconWrap}>
            <MaterialIcons name="track-changes" size={52} color="#94a3b8" />
          </View>
          <Text style={styles.emptyTitle}>Not in a Queue</Text>
          <Text style={styles.emptySub}>
            Join a queue to track your position{'\n'}and estimated wait time in real-time.
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.push('/customer/industries' as any)}
          >
            <MaterialIcons name="queue" size={18} color="#fff" />
            <Text style={styles.emptyBtnText}>Browse Services</Text>
          </TouchableOpacity>
        </View>
        <BottomNav />
      </SafeAreaView>
    );
  }

  const meta        = STATUS_META[ticket.status] ?? STATUS_META.waiting;
  const peopleAhead = Math.max(0, ticket.position - 1);
  const aheadTickets = ticket.ahead_tickets ?? [];
  const waitMins    = ticket.estimated_wait > 0 ? ticket.estimated_wait : 5;
  const readyAt     = ticket.status === 'waiting' ? calcReadyTime(waitMins) : null;

  // ── Active queue status ───────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/customer/home' as any)} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Queue Status</Text>
        {/* Refresh button */}
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchTicket}>
          <MaterialIcons name="refresh" size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Ticket number ──────────────────────────────── */}
        <View style={styles.ticketCard}>
          <Text style={styles.ticketLabel}>Your Ticket</Text>
          <Animated.View style={[
            styles.ticketNumWrap,
            { transform: [{ scale: pulseAnim }] },
            ticket.status === 'serving'   && { backgroundColor: '#059669' },
            ticket.status === 'completed' && { backgroundColor: '#64748b' },
          ]}>
            <Text style={styles.ticketNumber}>{ticket.ticket_number}</Text>
          </Animated.View>

          <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
            <MaterialIcons name={meta.icon} size={14} color={meta.color} />
            <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
          </View>

          <Text style={styles.serviceText}>{ticket.service_name}</Text>
          <Text style={styles.branchText}>{ticket.branch_name}</Text>

          {readyAt && (
            <View style={styles.readyAtBanner}>
              <MaterialIcons name="alarm" size={15} color="#059669" />
              <Text style={styles.readyAtBannerTxt}>Your turn at {readyAt}</Text>
            </View>
          )}
        </View>

        {/* ── Stats ─────────────────────────────────────── */}
        {ticket.status !== 'completed' && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{peopleAhead}</Text>
              <Text style={styles.statLabel}>Ahead</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {ticket.status === 'serving' ? '—' : ticket.estimated_wait > 0 ? ticket.estimated_wait : '<5'}
                {ticket.status !== 'serving' && <Text style={styles.statUnit}>m</Text>}
              </Text>
              <Text style={styles.statLabel}>Est. Wait</Text>
              {readyAt && (
                <View style={styles.readyAtRow}>
                  <MaterialIcons name="alarm" size={10} color="#059669" />
                  <Text style={styles.readyAtText}>{readyAt}</Text>
                </View>
              )}
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{formatIssuedAt(ticket.issued_at)}</Text>
              <Text style={styles.statLabel}>Issued</Text>
            </View>
          </View>
        )}

        {/* ── Queue position chips ───────────────────────── */}
        {ticket.status === 'waiting' && (
          <View style={styles.chipsCard}>
            <Text style={styles.chipsLabel}>
              {peopleAhead === 0 ? "You're next!" : `${peopleAhead} ${peopleAhead === 1 ? 'person' : 'people'} ahead of you`}
            </Text>
            <View style={styles.chips}>
              {aheadTickets.map(tn => (
                <View key={tn} style={styles.chip}>
                  <Text style={styles.chipText}>{tn}</Text>
                </View>
              ))}
              <View style={[styles.chip, styles.chipYou]}>
                <Text style={[styles.chipText, { color: '#fff' }]}>{ticket.ticket_number} (You)</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Serving alert ─────────────────────────────── */}
        {ticket.status === 'serving' && (
          <View style={styles.servingCard}>
            <MaterialIcons name="notifications-active" size={32} color="#059669" />
            <Text style={styles.servingTitle}>It's Your Turn!</Text>
            <Text style={styles.servingDesc}>Please proceed to the service counter now.</Text>
          </View>
        )}

        {/* ── Completed ─────────────────────────────────── */}
        {ticket.status === 'completed' && (
          <View style={styles.completedCard}>
            <MaterialIcons name="check-circle" size={52} color="#059669" />
            <Text style={styles.completedTitle}>Service Completed</Text>
            <Text style={styles.completedDesc}>Thank you for using SmartQueue!</Text>
            <TouchableOpacity
              style={styles.homeBtn}
              onPress={() => router.replace('/customer/home' as any)}
            >
              <Text style={styles.homeBtnText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Tips ──────────────────────────────────────── */}
        {ticket.status !== 'completed' && (
          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>While you wait…</Text>
            {[
              'Stay close — we will notify you when it is your turn.',
              'Feel free to sit down and relax while you wait.',
              'Make sure your phone sound is on so you do not miss your call.',
              'Your position updates automatically every 10 seconds.',
            ].map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <MaterialIcons name="info-outline" size={14} color="#2563eb" />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Leave ─────────────────────────────────────── */}
        {(ticket.status === 'waiting' || ticket.status === 'serving') && (
          <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave}>
            <MaterialIcons name="exit-to-app" size={16} color="#e11d48" />
            <Text style={styles.leaveText}>Leave Queue</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  emptyContainer: { flex: 1, backgroundColor: '#f8fafc' },
  emptyContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  emptyIconWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  emptySub:   { fontSize: 14, color: '#64748b', fontWeight: '500', textAlign: 'center', lineHeight: 22 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#2563eb', borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 14, marginTop: 8,
  },
  emptyBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  backBtn:    { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  refreshBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },

  content: { padding: 16, gap: 14, paddingBottom: 40 },

  ticketCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 24,
    alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#0f172a', shadowOpacity: 0.06, shadowRadius: 16, elevation: 3,
  },
  ticketLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase' },
  ticketNumWrap: {
    width: 116, height: 116, borderRadius: 58, backgroundColor: '#2563eb',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#2563eb', shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
  },
  ticketNumber: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999,
  },
  statusText:  { fontSize: 13, fontWeight: '700' },
  serviceText: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  branchText:  { fontSize: 12, fontWeight: '500', color: '#64748b' },
  readyAtBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#f0fdf4', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: '#bbf7d0', marginTop: 4,
  },
  readyAtBannerTxt: { fontSize: 13, fontWeight: '700', color: '#059669' },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14,
    alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#e2e8f0',
  },
  statValue: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  statUnit:  { fontSize: 13, fontWeight: '500', color: '#64748b' },
  statLabel: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  readyAtRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
  readyAtText: { fontSize: 10, fontWeight: '700', color: '#059669' },

  chipsCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0', gap: 10,
  },
  chipsLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', textAlign: 'center' },
  chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center' },
  chip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0',
  },
  chipYou: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontSize: 12, fontWeight: '700', color: '#475569' },

  servingCard: {
    backgroundColor: '#ecfdf5', borderRadius: 20, padding: 24,
    alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#a7f3d0',
  },
  servingTitle: { fontSize: 22, fontWeight: '900', color: '#059669' },
  servingDesc:  { fontSize: 14, color: '#065f46', fontWeight: '500', textAlign: 'center' },

  completedCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#e2e8f0',
  },
  completedTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  completedDesc:  { fontSize: 14, color: '#64748b', fontWeight: '500' },
  homeBtn: {
    backgroundColor: '#059669', paddingHorizontal: 32, paddingVertical: 12,
    borderRadius: 14, marginTop: 8,
  },
  homeBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  tipsCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0', gap: 8,
  },
  tipsTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  tipRow:    { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  tipText:   { flex: 1, fontSize: 12, color: '#64748b', fontWeight: '500', lineHeight: 18 },

  leaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14,
    borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff1f2',
  },
  leaveText: { fontSize: 14, fontWeight: '700', color: '#e11d48' },
});
