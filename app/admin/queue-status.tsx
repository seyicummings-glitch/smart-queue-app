import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

type TicketStatus = 'serving' | 'waiting' | 'completed';

type QueueItem = {
  id: number;
  ticket: string;
  name: string;
  service: string;
  waitTime: string;
  status: TicketStatus;
  counter: string | null;
};

const MOCK_QUEUE: QueueItem[] = [
  { id: 1, ticket: 'A-001', name: 'James Wilson',    service: 'Account Opening',        waitTime: '5 min',  status: 'serving',   counter: '1' },
  { id: 2, ticket: 'A-002', name: 'Maria Santos',    service: 'Loan Consultation',      waitTime: '12 min', status: 'waiting',   counter: null },
  { id: 3, ticket: 'A-003', name: 'David Chen',      service: 'General Inquiry',        waitTime: '18 min', status: 'waiting',   counter: null },
  { id: 4, ticket: 'A-004', name: 'Priya Patel',     service: 'Document Verification',  waitTime: '25 min', status: 'waiting',   counter: null },
  { id: 5, ticket: 'A-005', name: 'Lucas Oliveira',  service: 'Account Opening',        waitTime: '31 min', status: 'waiting',   counter: null },
  { id: 6, ticket: 'A-006', name: 'Aisha Nwosu',     service: 'General Inquiry',        waitTime: '—',      status: 'completed', counter: '2' },
];

type StatusFilter = 'All' | 'Serving' | 'Waiting' | 'Completed';

const STATUS_META: Record<TicketStatus, { label: string; color: string; bg: string; dot: string }> = {
  serving:   { label: 'Serving',   color: '#059669', bg: '#ecfdf5', dot: '#059669' },
  waiting:   { label: 'Waiting',   color: '#2563eb', bg: '#eff6ff', dot: '#2563eb' },
  completed: { label: 'Done',      color: '#64748b', bg: '#f1f5f9', dot: '#94a3b8' },
};

export default function QueueStatus() {
  const router = useRouter();
  const [filter, setFilter] = useState<StatusFilter>('All');

  const filtered = MOCK_QUEUE.filter(item => {
    if (filter === 'All') return true;
    return item.status === filter.toLowerCase();
  });

  const servingCount  = MOCK_QUEUE.filter(i => i.status === 'serving').length;
  const waitingCount  = MOCK_QUEUE.filter(i => i.status === 'waiting').length;
  const completedCount = MOCK_QUEUE.filter(i => i.status === 'completed').length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Queue Status</Text>
        <View style={styles.livePill}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'In Queue',  value: String(waitingCount),   color: '#2563eb', bg: '#eff6ff' },
            { label: 'Serving',   value: String(servingCount),   color: '#059669', bg: '#ecfdf5' },
            { label: 'Completed', value: String(completedCount), color: '#d97706', bg: '#fffbeb' },
            { label: 'Avg Wait',  value: '14 m',                 color: '#7c3aed', bg: '#f5f3ff' },
          ].map((s, i) => (
            <View key={i} style={[styles.statItem, { backgroundColor: s.bg }]}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Filter tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {(['All', 'Serving', 'Waiting', 'Completed'] as StatusFilter[]).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Queue list */}
        {filtered.map(item => {
          const meta = STATUS_META[item.status];
          return (
            <View key={item.id} style={styles.queueCard}>
              <View style={[styles.statusBar, { backgroundColor: meta.dot }]} />
              <View style={styles.queueBody}>
                <View style={styles.queueLeft}>
                  <Text style={styles.ticketNum}>{item.ticket}</Text>
                  <Text style={styles.customerName}>{item.name}</Text>
                  <Text style={styles.serviceName}>{item.service}</Text>
                  {item.counter && (
                    <Text style={styles.counterText}>Counter {item.counter}</Text>
                  )}
                </View>
                <View style={styles.queueRight}>
                  <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                    <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                  {item.status !== 'completed' && (
                    <Text style={styles.waitText}>{item.waitTime}</Text>
                  )}
                </View>
              </View>
            </View>
          );
        })}

        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcons name="queue" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>Queue is empty</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#059669' },
  liveText: { fontSize: 11, fontWeight: '700', color: '#059669' },

  content: { padding: 16, gap: 12, paddingBottom: 40 },

  statsRow: { flexDirection: 'row', gap: 8 },
  statItem: { flex: 1, borderRadius: 16, padding: 12, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 20, fontWeight: '900' },
  statLabel: { fontSize: 10, fontWeight: '600', color: '#64748b' },

  filterScroll: { flexGrow: 0 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  filterText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  filterTextActive: { color: '#fff' },

  queueCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  statusBar: { width: 4 },
  queueBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  queueLeft: { gap: 2 },
  ticketNum: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  customerName: { fontSize: 12, fontWeight: '600', color: '#334155' },
  serviceName: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  counterText: { fontSize: 10, color: '#94a3b8', fontWeight: '600', marginTop: 2 },
  queueRight: { alignItems: 'flex-end', gap: 6 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '700' },
  waitText: { fontSize: 12, fontWeight: '600', color: '#64748b' },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, fontWeight: '600', color: '#94a3b8' },
});
