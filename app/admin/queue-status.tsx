import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import BottomNav from '@/components/BottomNav';
import { api } from '@/lib/api';

type TicketStatus = 'serving' | 'waiting' | 'completed' | 'cancelled';
type StatusFilter = 'All' | 'Serving' | 'Waiting' | 'Completed';

type QueueTicket = {
  id: number;
  ticket_number: string;
  customer_name: string;
  service_name: string;
  branch_name: string;
  status: TicketStatus;
  position: number;
  estimated_wait: number;
  issued_at: string;
  called_at: string | null;
};

type QueueStats = {
  waiting: number;
  serving: number;
  completed: number;
  avg_wait: number;
};

const STATUS_META: Record<TicketStatus, { label: string; color: string; bg: string; bar: string }> = {
  serving:   { label: 'Serving',   color: '#059669', bg: '#ecfdf5', bar: '#059669' },
  waiting:   { label: 'Waiting',   color: '#2563eb', bg: '#eff6ff', bar: '#2563eb' },
  completed: { label: 'Done',      color: '#7c3aed', bg: '#f5f3ff', bar: '#7c3aed' },
  cancelled: { label: 'Cancelled', color: '#64748b', bg: '#f1f5f9', bar: '#94a3b8' },
};

function elapsed(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ago`;
}

function toArr<T>(d: any): T[] {
  return Array.isArray(d) ? d : (d?.results ?? []);
}

export default function QueueStatusAdmin() {
  const router = useRouter();

  const [tickets,  setTickets]  = useState<QueueTicket[]>([]);
  const [stats,    setStats]    = useState<QueueStats | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [refresh,  setRefresh]  = useState(false);
  const [filter,   setFilter]   = useState<StatusFilter>('All');

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const [ticketRes, statRes] = await Promise.all([
      api.get<any>('/queues/'),
      api.get<QueueStats>('/queues/status/'),
    ]);
    if (ticketRes.data != null) setTickets(toArr<QueueTicket>(ticketRes.data));
    if (statRes.data)           setStats(statRes.data);
    setLoading(false);
    setRefresh(false);
  }, []);

  useEffect(() => {
    fetchData();
    const t = setInterval(() => fetchData(true), 15_000);
    return () => clearInterval(t);
  }, [fetchData]);

  const filtered = tickets.filter(t => {
    if (filter === 'All')       return true;
    if (filter === 'Serving')   return t.status === 'serving';
    if (filter === 'Waiting')   return t.status === 'waiting';
    if (filter === 'Completed') return t.status === 'completed';
    return true;
  });

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/admin/dashboard' as any)}
          style={s.backBtn}
        >
          <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Queue Monitor</Text>
        <View style={s.livePill}>
          <View style={s.liveDot} />
          <Text style={s.liveTxt}>Live</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refresh}
            onRefresh={() => { setRefresh(true); fetchData(true); }}
            tintColor="#2563eb"
          />
        }
      >
        {/* Stats summary */}
        {loading && !stats ? (
          <View style={s.loader}>
            <ActivityIndicator color="#2563eb" />
            <Text style={s.loaderTxt}>Loading queue data…</Text>
          </View>
        ) : (
          <View style={s.statsRow}>
            {[
              { label: 'Waiting',   value: stats?.waiting ?? 0,   color: '#2563eb', bg: '#eff6ff' },
              { label: 'Serving',   value: stats?.serving ?? 0,   color: '#059669', bg: '#ecfdf5' },
              { label: 'Done',      value: stats?.completed ?? 0, color: '#7c3aed', bg: '#f5f3ff' },
              { label: 'Avg Wait',  value: `${stats?.avg_wait ?? 0}m`, color: '#d97706', bg: '#fffbeb' },
            ].map((item, i) => (
              <View key={i} style={[s.statItem, { backgroundColor: item.bg }]}>
                <Text style={[s.statValue, { color: item.color }]}>{item.value}</Text>
                <Text style={s.statLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll}>
          {(['All', 'Serving', 'Waiting', 'Completed'] as StatusFilter[]).map(f => (
            <TouchableOpacity
              key={f}
              style={[s.chip, filter === f && s.chipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[s.chipTxt, filter === f && s.chipTxtActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Count row */}
        {!loading && (
          <View style={s.countRow}>
            <Text style={s.countTxt}>
              <Text style={s.countBold}>{filtered.length}</Text> ticket{filtered.length !== 1 ? 's' : ''}
              {filter !== 'All' ? ` · ${filter}` : ''}
            </Text>
            {loading && <ActivityIndicator size="small" color="#2563eb" />}
          </View>
        )}

        {/* Ticket list */}
        {loading && tickets.length === 0 ? (
          <View style={s.emptyBox}>
            <ActivityIndicator color="#2563eb" size="large" />
          </View>
        ) : filtered.length === 0 ? (
          <View style={s.emptyBox}>
            <MaterialIcons name="queue" size={48} color="#cbd5e1" />
            <Text style={s.emptyTxt}>No tickets in this view</Text>
            <Text style={s.emptySub}>Pull down to refresh</Text>
          </View>
        ) : (
          filtered.map(ticket => {
            const meta = STATUS_META[ticket.status] ?? STATUS_META.waiting;
            return (
              <View key={ticket.id} style={s.card}>
                <View style={[s.cardBar, { backgroundColor: meta.bar }]} />
                <View style={s.cardBody}>
                  <View style={s.cardLeft}>
                    <View style={s.ticketRow}>
                      <Text style={s.ticketNum}>{ticket.ticket_number}</Text>
                      <View style={[s.statusBadge, { backgroundColor: meta.bg }]}>
                        <Text style={[s.statusBadgeTxt, { color: meta.color }]}>{meta.label}</Text>
                      </View>
                    </View>
                    <Text style={s.customerName}>{ticket.customer_name}</Text>
                    <View style={s.metaRow}>
                      <MaterialIcons name="room-service" size={11} color="#94a3b8" />
                      <Text style={s.metaTxt}>{ticket.service_name}</Text>
                      <Text style={s.metaSep}>·</Text>
                      <MaterialIcons name="place" size={11} color="#94a3b8" />
                      <Text style={s.metaTxt}>{ticket.branch_name}</Text>
                    </View>
                  </View>
                  <View style={s.cardRight}>
                    {ticket.status === 'waiting' && (
                      <Text style={s.waitTime}>
                        ~{ticket.estimated_wait > 0 ? `${ticket.estimated_wait}m` : '<5m'}
                      </Text>
                    )}
                    {ticket.status === 'serving' && ticket.called_at && (
                      <Text style={[s.waitTime, { color: '#059669' }]}>
                        {elapsed(ticket.called_at)}
                      </Text>
                    )}
                    <Text style={s.issuedAt}>{elapsed(ticket.issued_at)}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}

      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  backBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  livePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#ecfdf5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#059669' },
  liveTxt: { fontSize: 11, fontWeight: '700', color: '#059669' },

  content: { padding: 16, gap: 12, paddingBottom: 40 },

  loader:    { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  loaderTxt: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },

  statsRow: { flexDirection: 'row', gap: 8 },
  statItem: { flex: 1, borderRadius: 16, padding: 10, alignItems: 'center', gap: 3 },
  statValue:{ fontSize: 20, fontWeight: '900' },
  statLabel:{ fontSize: 9, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4 },

  filterScroll: { flexGrow: 0 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', marginRight: 8,
  },
  chipActive:   { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipTxt:      { fontSize: 12, fontWeight: '600', color: '#475569' },
  chipTxtActive:{ color: '#fff' },

  countRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countTxt: { fontSize: 13, color: '#64748b', fontWeight: '500', flex: 1 },
  countBold:{ fontWeight: '800', color: '#0f172a' },

  card: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0',
    flexDirection: 'row', overflow: 'hidden',
    shadowColor: '#0f172a', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  cardBar:  { width: 4 },
  cardBody: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, gap: 10 },
  cardLeft: { flex: 1, gap: 4 },
  cardRight:{ alignItems: 'flex-end', gap: 4 },

  ticketRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  ticketNum: { fontSize: 15, fontWeight: '900', color: '#0f172a' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusBadgeTxt: { fontSize: 10, fontWeight: '700' },

  customerName: { fontSize: 13, fontWeight: '700', color: '#334155' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  metaTxt: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  metaSep: { fontSize: 11, color: '#cbd5e1' },

  waitTime: { fontSize: 13, fontWeight: '800', color: '#2563eb' },
  issuedAt: { fontSize: 10, color: '#94a3b8', fontWeight: '500' },

  emptyBox: { paddingVertical: 52, alignItems: 'center', gap: 8 },
  emptyTxt: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  emptySub: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
});
