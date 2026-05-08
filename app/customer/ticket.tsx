import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, StatusBar, Animated, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppContext } from '@/context/AppContext';

export default function CustomerTicket() {
  const router = useRouter();
  const { activeTicket, setActiveTicket } = useAppContext();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);


  const handleLeave = () => {
    Alert.alert('Leave Queue', 'Cancel your ticket and leave the queue?', [
      { text: 'Stay in Queue', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () => {
          const industry = activeTicket?.industry?.toLowerCase() ?? 'banking';
          setActiveTicket(null);
          router.replace(`/customer/service/${industry}` as any);
        },
      },
    ]);
  };

  // ── No active ticket state ─────────────────────────────────────────────────
  if (!activeTicket) {
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
            onPress={() => router.push('/customer/home' as any)}
          >
            <MaterialIcons name="queue" size={18} color="#fff" />
            <Text style={styles.emptyBtnText}>Browse Services</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.emptyBtnOutline}
            onPress={() => router.push('/customer/virtual-queue' as any)}
          >
            <Text style={styles.emptyBtnOutlineText}>Join Virtual Queue</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Active ticket ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e293b" />

      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleLeave} style={styles.closeBtn}>
          <MaterialIcons name="close" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{activeTicket.industry} · {activeTicket.service}</Text>
        <View style={styles.activePill}>
          <View style={styles.activeDot} />
          <Text style={styles.activeText}>Live</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Ticket card ───────────────────────────────────── */}
        <View style={styles.ticketCard}>
          <View style={styles.notchLeft} />
          <View style={styles.notchRight} />

          {/* Blue header section */}
          <View style={styles.ticketHeader}>
            <Text style={styles.ticketLabel}>TICKET NUMBER</Text>
            <Animated.Text style={[styles.ticketNumber, { transform: [{ scale: pulseAnim }] }]}>
              {activeTicket.ticketNumber}
            </Animated.Text>
            <Text style={styles.ticketSubtext}>Please wait — you will be called when it's your turn</Text>
          </View>

          {/* Dashed divider */}
          <View style={styles.dashed} />

          {/* Wait stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Est. Wait</Text>
              <View style={styles.statValueRow}>
                <Text style={styles.statValue}>{activeTicket.waitTime}</Text>
                <Text style={styles.statUnit}> min</Text>
              </View>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Ahead of You</Text>
              <View style={styles.statValueRow}>
                <Text style={styles.statValue}>{activeTicket.peopleAhead}</Text>
                <Text style={styles.statUnit}> people</Text>
              </View>
            </View>
          </View>

          {/* Dashed divider */}
          <View style={styles.dashed} />

          {/* QR section */}
          <View style={styles.qrSection}>
            <View style={styles.qrBox}>
              <MaterialIcons name="qr-code-2" size={100} color="#0f172a" />
            </View>
            <Text style={styles.qrHint}>Show this at the counter</Text>
          </View>

          <Text style={styles.issuedAt}>Issued at {activeTicket.issuedAt}</Text>
        </View>

        {/* ── Branch info ───────────────────────────────────── */}
        <View style={styles.locationCard}>
          <MaterialIcons name="place" size={22} color="#0d9488" />
          <View style={{ flex: 1 }}>
            <Text style={styles.locationTitle}>{activeTicket.branch}</Text>
            <Text style={styles.locationDesc}>
              Please stay nearby. You will be notified when your number is called.
            </Text>
          </View>
        </View>

        {/* ── Track position ────────────────────────────────── */}
        <TouchableOpacity
          style={styles.trackBtn}
          onPress={() => router.push('/customer/queue-status' as any)}
          activeOpacity={0.85}
        >
          <MaterialIcons name="track-changes" size={18} color="#2563eb" />
          <Text style={styles.trackText}>Track My Position Live</Text>
          <MaterialIcons name="arrow-forward" size={16} color="#2563eb" />
        </TouchableOpacity>

        {/* ── Tips ──────────────────────────────────────────── */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>While you wait…</Text>
          {[
            'You\'ll be notified when it\'s your turn.',
            'You can move freely around the branch.',
            'Keep your phone volume on for alerts.',
          ].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <MaterialIcons name="info-outline" size={14} color="#2563eb" />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        {/* ── Leave queue ───────────────────────────────────── */}
        <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave}>
          <MaterialIcons name="exit-to-app" size={16} color="#e11d48" />
          <Text style={styles.leaveText}>Leave Queue</Text>
        </TouchableOpacity>
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
  emptyBtnOutline: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 14, backgroundColor: '#fff',
  },
  emptyBtnOutlineText: { fontSize: 15, fontWeight: '600', color: '#64748b' },

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
    position: 'absolute', top: '52%', left: -14,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#1e293b', zIndex: 10,
  },
  notchRight: {
    position: 'absolute', top: '52%', right: -14,
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

  statsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 22, paddingHorizontal: 24 },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8 },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  statValue: { fontSize: 30, fontWeight: '900', color: '#0f172a' },
  statUnit: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  statDivider: { width: 1, height: 44, backgroundColor: '#e2e8f0' },

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
});
