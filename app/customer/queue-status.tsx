import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, StatusBar, Animated, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppContext } from '@/context/AppContext';

const STATUS_META = {
  waiting:   { label: 'Waiting',     color: '#2563eb', bg: '#eff6ff', icon: 'schedule'      as const },
  serving:   { label: 'Now Serving', color: '#059669', bg: '#ecfdf5', icon: 'person'         as const },
  completed: { label: 'Completed',   color: '#64748b', bg: '#f1f5f9', icon: 'check-circle'   as const },
};

export default function CustomerQueueStatus() {
  const router = useRouter();
  const { activeTicket, setActiveTicket } = useAppContext();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Local copy of position/wait so we can simulate countdown without mutating context
  const [position,  setPosition]  = useState(activeTicket?.peopleAhead ?? 0);
  const [waitTime,  setWaitTime]  = useState(activeTicket?.waitTime    ?? 0);
  const [status,    setStatus]    = useState(activeTicket?.status      ?? 'waiting');

  // Sync if context ticket changes
  useEffect(() => {
    setPosition(activeTicket?.peopleAhead ?? 0);
    setWaitTime(activeTicket?.waitTime    ?? 0);
    setStatus(activeTicket?.status        ?? 'waiting');
  }, [activeTicket]);

  // Pulse animation while waiting or serving
  useEffect(() => {
    if (status === 'waiting' || status === 'serving') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.07, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 800, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [status]);

  const handleLeave = () => {
    Alert.alert(
      'Leave Queue',
      'Are you sure? Your ticket will be cancelled.',
      [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Leave Queue',
          style: 'destructive',
          onPress: () => {
            setActiveTicket(null);
            router.replace('/customer/home' as any);
          },
        },
      ]
    );
  };

  // ── No active ticket ───────────────────────────────────────────────────────
  if (!activeTicket) {
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
            onPress={() => router.push('/customer/home' as any)}
          >
            <MaterialIcons name="queue" size={18} color="#fff" />
            <Text style={styles.emptyBtnText}>Browse Services</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const meta = STATUS_META[status];
  const dots = Math.min(position + 1, 10);

  // ── Active queue status ────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/customer/home' as any)} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Queue Status</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Ticket number ──────────────────────────────── */}
        <View style={styles.ticketCard}>
          <Text style={styles.ticketLabel}>Your Ticket</Text>
          <Animated.View style={[styles.ticketNumWrap, { transform: [{ scale: pulseAnim }] },
            status === 'serving'   && { backgroundColor: '#059669' },
            status === 'completed' && { backgroundColor: '#64748b' },
          ]}>
            <Text style={styles.ticketNumber}>{activeTicket.ticketNumber}</Text>
          </Animated.View>

          <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
            <MaterialIcons name={meta.icon} size={14} color={meta.color} />
            <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
          </View>

          <Text style={styles.serviceText}>{activeTicket.service}</Text>
          <Text style={styles.branchText}>{activeTicket.branch}</Text>
        </View>

        {/* ── Stats ─────────────────────────────────────── */}
        {status !== 'completed' && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{position}</Text>
              <Text style={styles.statLabel}>Position</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{waitTime}<Text style={styles.statUnit}>m</Text></Text>
              <Text style={styles.statLabel}>Est. Wait</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{activeTicket.issuedAt}</Text>
              <Text style={styles.statLabel}>Issued</Text>
            </View>
          </View>
        )}

        {/* ── Queue dots visual ─────────────────────────── */}
        {status === 'waiting' && (
          <View style={styles.dotsCard}>
            <Text style={styles.dotsLabel}>People ahead of you</Text>
            <View style={styles.dots}>
              {Array.from({ length: dots }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i < position ? { backgroundColor: '#2563eb' } : { backgroundColor: '#059669' }]}
                />
              ))}
              {position > 9 && (
                <Text style={styles.dotsMore}>+{position - 9} more</Text>
              )}
            </View>
            <View style={styles.dotsLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#2563eb' }]} />
                <Text style={styles.legendText}>Waiting</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#059669' }]} />
                <Text style={styles.legendText}>You</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Serving alert ─────────────────────────────── */}
        {status === 'serving' && (
          <View style={styles.servingCard}>
            <MaterialIcons name="notifications-active" size={32} color="#059669" />
            <Text style={styles.servingTitle}>It's Your Turn!</Text>
            <Text style={styles.servingDesc}>Please proceed to the service counter now.</Text>
          </View>
        )}

        {/* ── Completed ─────────────────────────────────── */}
        {status === 'completed' && (
          <View style={styles.completedCard}>
            <MaterialIcons name="check-circle" size={52} color="#059669" />
            <Text style={styles.completedTitle}>Service Completed</Text>
            <Text style={styles.completedDesc}>Thank you for using SmartQueue!</Text>
            <TouchableOpacity
              style={styles.homeBtn}
              onPress={() => {
                setActiveTicket(null);
                router.replace('/customer/home' as any);
              }}
            >
              <Text style={styles.homeBtnText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── View ticket ───────────────────────────────── */}
        {status !== 'completed' && (
          <TouchableOpacity
            style={styles.ticketBtn}
            onPress={() => router.push('/customer/ticket' as any)}
            activeOpacity={0.85}
          >
            <MaterialIcons name="confirmation-number" size={18} color="#2563eb" />
            <Text style={styles.ticketBtnText}>View My Ticket</Text>
            <MaterialIcons name="arrow-forward" size={16} color="#2563eb" />
          </TouchableOpacity>
        )}

        {/* ── Tips ──────────────────────────────────────── */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>While you wait…</Text>
          {[
            "You'll be notified automatically when it's your turn.",
            'You can leave the branch but stay nearby.',
            'Keep your phone volume on for alerts.',
          ].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <MaterialIcons name="info-outline" size={14} color="#2563eb" />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        {/* ── Leave ─────────────────────────────────────── */}
        {status !== 'completed' && (
          <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave}>
            <MaterialIcons name="exit-to-app" size={16} color="#e11d48" />
            <Text style={styles.leaveText}>Leave Queue</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Empty state
  emptyContainer: { flex: 1, backgroundColor: '#f8fafc' },
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

  // Active
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
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
  statusText: { fontSize: 13, fontWeight: '700' },
  serviceText: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  branchText: { fontSize: 12, fontWeight: '500', color: '#64748b' },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14,
    alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#e2e8f0',
  },
  statValue: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  statUnit: { fontSize: 13, fontWeight: '500', color: '#64748b' },
  statLabel: { fontSize: 11, fontWeight: '600', color: '#64748b' },

  dotsCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', gap: 12,
  },
  dotsLabel: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  dots: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  dot: { width: 22, height: 22, borderRadius: 11 },
  dotsMore: { fontSize: 12, color: '#94a3b8', fontWeight: '600', alignSelf: 'center' },
  dotsLegend: { flexDirection: 'row', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: '#64748b', fontWeight: '600' },

  servingCard: {
    backgroundColor: '#ecfdf5', borderRadius: 20, padding: 24,
    alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#a7f3d0',
  },
  servingTitle: { fontSize: 22, fontWeight: '900', color: '#059669' },
  servingDesc: { fontSize: 14, color: '#065f46', fontWeight: '500', textAlign: 'center' },

  completedCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#e2e8f0',
  },
  completedTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  completedDesc: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  homeBtn: {
    backgroundColor: '#059669', paddingHorizontal: 32, paddingVertical: 12,
    borderRadius: 14, marginTop: 8,
  },
  homeBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  ticketBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#eff6ff', paddingVertical: 14, borderRadius: 16,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  ticketBtnText: { fontSize: 14, fontWeight: '700', color: '#2563eb' },

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
});
