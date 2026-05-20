import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import SQMSHeader from '@/components/SQMSHeader';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

type QueueTicket = {
  id: number;
  ticket_number: string;
  customer_name: string;
  service_name: string;
  branch_name: string;
  status: 'waiting' | 'serving' | 'completed' | 'cancelled';
  position: number;
  estimated_wait: number;
  issued_at: string;
  called_at: string | null;
  notes: string;
};

type QueueStats = {
  waiting: number;
  serving: number;
  completed: number;
  avg_wait: number;
};

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function fmt12h(iso: string) {
  const d = new Date(iso);
  const h = d.getHours(), m = String(d.getMinutes()).padStart(2, '0');
  return `${h > 12 ? h - 12 : h === 0 ? 12 : h}:${m} ${h >= 12 ? 'PM' : 'AM'}`;
}

function elapsed(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

function shiftTime(startMs: number) {
  const s = Math.floor((Date.now() - startMs) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h === 0) return `${m}m on duty`;
  return `${h}h ${m}m on duty`;
}

export default function StaffDashboard() {
  const { user } = useAuth();

  const [waiting,  setWaiting]  = useState<QueueTicket[]>([]);
  const [serving,  setServing]  = useState<QueueTicket | null>(null);
  const [stats,    setStats]    = useState<QueueStats | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refresh,    setRefresh]    = useState(false);
  const [active,     setActive]     = useState(true);
  const [tick,       setTick]       = useState(0);
  const [completing, setCompleting] = useState(false);
  const [calling,    setCalling]    = useState<number | null>(null);

  const shiftStart = useRef(Date.now());

  // Timer for elapsed display (serving card + shift time)
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);

    const [waitRes, servRes, statRes] = await Promise.all([
      api.get<any>('/queues/?status=waiting'),
      api.get<any>('/queues/?status=serving'),
      api.get<QueueStats>('/queues/status/'),
    ]);

    const toArr = (d: any): QueueTicket[] =>
      Array.isArray(d) ? d : (d?.results ?? []);

    if (waitRes.data != null) setWaiting(toArr(waitRes.data));
    const servArr = servRes.data != null ? toArr(servRes.data) : [];
    setServing(servArr.length > 0 ? servArr[0] : null);
    if (statRes.data) setStats(statRes.data);

    setLoading(false);
    setRefresh(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 10_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleCall = async (ticket: QueueTicket) => {
    if (serving) {
      Alert.alert('Already Serving', 'Complete or skip the current customer first.');
      return;
    }
    if (calling !== null) return;
    setCalling(ticket.id);
    const { error } = await api.post(`/queues/${ticket.id}/call/`, {});
    setCalling(null);
    if (error) { Alert.alert('Error', error); return; }
    fetchData(true);
  };

  const handleComplete = async () => {
    if (!serving || completing) return;
    setCompleting(true);
    setServing(null); // optimistic clear so button disappears immediately
    const { error } = await api.post(`/queues/${serving.id}/complete/`, {});
    setCompleting(false);
    if (error) {
      fetchData(true); // re-fetch to restore correct state if it failed
      Alert.alert('Error', error);
      return;
    }
    fetchData(true);
  };

  const handleCancel = async (ticket: QueueTicket) => {
    Alert.alert('Cancel Ticket', `Cancel ${ticket.ticket_number}?`, [
      { text: 'No',  style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
        const { error } = await api.post(`/queues/${ticket.id}/cancel/`, {});
        if (error) { Alert.alert('Error', error); return; }
        fetchData(true);
      }},
    ]);
  };

  const roleBadge = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'superadmin'
    ? { label: 'Admin', color: '#7c3aed', bg: '#f5f3ff' }
    : { label: 'Staff',  color: '#2563eb', bg: '#eff6ff' };

  const staffName = user?.full_name ?? 'Staff Member';

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <SQMSHeader />

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
        {/* ── Staff identity card ─────────────────────────── */}
        <View style={s.identityCard}>
          <View style={s.avatarWrap}>
            <Text style={s.avatarText}>{initials(staffName)}</Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={s.nameRow}>
              <Text style={s.staffName} numberOfLines={1}>{staffName}</Text>
              <View style={[s.roleBadge, { backgroundColor: roleBadge.bg }]}>
                <Text style={[s.roleBadgeText, { color: roleBadge.color }]}>{roleBadge.label}</Text>
              </View>
            </View>
            <Text style={s.shiftText}>
              {shiftTime(shiftStart.current)}
            </Text>
          </View>
          {/* Active / Break toggle */}
          <TouchableOpacity
            style={[s.statusToggle, active ? s.statusActive : s.statusBreak]}
            onPress={() => setActive(p => !p)}
          >
            <View style={[s.statusDot, { backgroundColor: active ? '#10b981' : '#f59e0b' }]} />
            <Text style={[s.statusToggleTxt, { color: active ? '#065f46' : '#92400e' }]}>
              {active ? 'Active' : 'On Break'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Stats row ───────────────────────────────────── */}
        {loading && !stats ? (
          <View style={s.loadingBox}>
            <ActivityIndicator color="#2563eb" size="large" />
          </View>
        ) : (
          <View style={s.statsRow}>
            {[
              { icon: 'people' as IconName,       label: 'Waiting',    value: String(stats?.waiting   ?? 0), color: '#2563eb', bg: '#eff6ff' },
              { icon: 'person' as IconName,        label: 'Serving',    value: String(stats?.serving   ?? 0), color: '#059669', bg: '#ecfdf5' },
              { icon: 'check-circle' as IconName,  label: 'Done Today', value: String(stats?.completed ?? 0), color: '#7c3aed', bg: '#f5f3ff' },
              { icon: 'schedule' as IconName,      label: 'Avg Wait',   value: `${stats?.avg_wait ?? 0}m`,    color: '#d97706', bg: '#fffbeb' },
            ].map(item => (
              <View key={item.label} style={[s.statCard, { borderColor: item.bg }]}>
                <View style={[s.statIconWrap, { backgroundColor: item.bg }]}>
                  <MaterialIcons name={item.icon} size={16} color={item.color} />
                </View>
                <Text style={s.statValue}>{item.value}</Text>
                <Text style={s.statLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Currently serving ───────────────────────────── */}
        <View style={[s.servingCard, !active && s.servingCardInactive]}>
          <View style={s.servingCardHeader}>
            <View style={s.servingDotRow}>
              <View style={[s.liveDot, !active && s.liveDotOff]} />
              <Text style={s.servingCardTitle}>Currently Serving</Text>
            </View>
            {serving?.called_at && (
              <Text style={s.servingTimer}>{elapsed(serving.called_at)}</Text>
            )}
          </View>

          {serving ? (
            <>
              <Text style={s.servingTicketNum}>{serving.ticket_number}</Text>
              <Text style={s.servingCustomer}>{serving.customer_name}</Text>
              <Text style={s.servingService}>{serving.service_name}</Text>
              {!!serving.notes && (
                <View style={s.notesRow}>
                  <MaterialIcons name="notes" size={13} color="#93c5fd" />
                  <Text style={s.notesText}>{serving.notes}</Text>
                </View>
              )}
              <View style={s.servingActions}>
                <TouchableOpacity
                  style={[s.completeBtn, completing && { opacity: 0.6 }]}
                  onPress={handleComplete}
                  activeOpacity={0.85}
                  disabled={completing}
                >
                  {completing
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <MaterialIcons name="check-circle" size={16} color="#fff" />
                  }
                  <Text style={s.completeBtnTxt}>{completing ? 'Saving…' : 'Complete'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.cancelServingBtn} onPress={() => handleCancel(serving)} activeOpacity={0.85}>
                  <MaterialIcons name="close" size={16} color="#fca5a5" />
                  <Text style={s.cancelServingTxt}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={s.servingEmptyWrap}>
              <MaterialIcons name="person-outline" size={44} color="rgba(255,255,255,0.25)" />
              <Text style={s.servingEmptyTxt}>No customer being served</Text>
              <Text style={s.servingEmptySub}>
                {!active ? 'You are on break' : waiting.length === 0 ? 'Queue is empty' : 'Call the next customer below'}
              </Text>
            </View>
          )}
        </View>

        {/* ── Waiting queue ────────────────────────────────── */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Waiting Queue</Text>
          <View style={[s.countBadge, waiting.length > 0 ? s.countBadgeActive : s.countBadgeEmpty]}>
            <Text style={[s.countBadgeTxt, waiting.length > 0 && { color: '#1d4ed8' }]}>
              {waiting.length} waiting
            </Text>
          </View>
        </View>

        {loading && waiting.length === 0 ? (
          <View style={s.emptyQueue}>
            <ActivityIndicator color="#2563eb" />
          </View>
        ) : waiting.length === 0 ? (
          <View style={s.emptyQueue}>
            <MaterialIcons name="check-circle-outline" size={44} color="#a7f3d0" />
            <Text style={s.emptyQueueTxt}>Queue is clear</Text>
            <Text style={s.emptyQueueSub}>No customers waiting right now</Text>
          </View>
        ) : (
          waiting.map((ticket, idx) => (
            <View key={ticket.id} style={s.queueItem}>
              {/* Position + ticket */}
              <View style={s.queueItemLeft}>
                <View style={s.posWrap}>
                  <Text style={s.posNum}>{String(idx + 1).padStart(2, '0')}</Text>
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={s.ticketNum}>{ticket.ticket_number}</Text>
                  <Text style={s.customerName}>{ticket.customer_name}</Text>
                  <View style={s.metaRow}>
                    <MaterialIcons name="room-service" size={11} color="#94a3b8" />
                    <Text style={s.metaTxt}>{ticket.service_name}</Text>
                    <Text style={s.metaSep}>·</Text>
                    <MaterialIcons name="schedule" size={11} color="#94a3b8" />
                    <Text style={[s.metaTxt, { color: '#d97706' }]}>
                      {ticket.estimated_wait > 0 ? `~${ticket.estimated_wait}m` : '<5m'}
                    </Text>
                  </View>
                  {!!ticket.notes && (
                    <Text style={s.notesBadge} numberOfLines={1}>{ticket.notes}</Text>
                  )}
                </View>
              </View>

              {/* Actions */}
              <View style={s.queueActions}>
                <TouchableOpacity
                  style={[s.callBtn, (!active || !!serving || calling !== null) && s.callBtnDisabled]}
                  onPress={() => handleCall(ticket)}
                  disabled={!active || !!serving || calling !== null}
                  activeOpacity={0.8}
                >
                  {calling === ticket.id
                    ? <ActivityIndicator size="small" color="#94a3b8" style={{ width: 14, height: 14 }} />
                    : <MaterialIcons name="play-arrow" size={14} color={!active || !!serving || calling !== null ? '#94a3b8' : '#2563eb'} />
                  }
                  <Text style={[s.callBtnTxt, (!active || !!serving || calling !== null) && { color: '#94a3b8' }]}>Call</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.cancelItemBtn}
                  onPress={() => handleCancel(ticket)}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="close" size={14} color="#e11d48" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* ── Footer note ─────────────────────────────────── */}
        <View style={s.footerNote}>
          <MaterialIcons name="sync" size={12} color="#94a3b8" />
          <Text style={s.footerNoteTxt}>Auto-refreshes every 10 seconds · Pull down to refresh manually</Text>
        </View>
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, gap: 14, paddingBottom: 32 },

  loadingBox: { height: 80, alignItems: 'center', justifyContent: 'center' },

  // Identity card
  identityCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#0f172a', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  avatarWrap: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '900', color: '#1d4ed8' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  staffName: { fontSize: 15, fontWeight: '800', color: '#0f172a', flex: 1 },
  roleBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  roleBadgeText: { fontSize: 10, fontWeight: '800' },
  shiftText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  statusToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12,
    borderWidth: 1,
  },
  statusActive: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  statusBreak:  { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusToggleTxt: { fontSize: 11, fontWeight: '700' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 10,
    alignItems: 'center', gap: 5, borderWidth: 1.5,
  },
  statIconWrap: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  statLabel: { fontSize: 9, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'center' },

  // Currently serving card
  servingCard: {
    backgroundColor: '#1e40af', borderRadius: 24, padding: 22,
    gap: 6, alignItems: 'center',
    shadowColor: '#1d4ed8', shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
  },
  servingCardInactive: { backgroundColor: '#64748b', shadowColor: '#475569' },
  servingCardHeader: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  servingDotRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#34d399' },
  liveDotOff: { backgroundColor: '#94a3b8' },
  servingCardTitle: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1.2 },
  servingTimer: { fontSize: 11, fontWeight: '700', color: '#93c5fd', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },

  servingTicketNum: { fontSize: 52, fontWeight: '900', color: '#fff', letterSpacing: 1, marginTop: 4 },
  servingCustomer: { fontSize: 16, fontWeight: '700', color: '#e2e8f0' },
  servingService:  { fontSize: 13, color: '#93c5fd', fontWeight: '500' },
  notesRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  notesText: { fontSize: 11, color: '#bfdbfe', fontWeight: '500' },

  servingActions: { flexDirection: 'row', gap: 10, marginTop: 12, width: '100%' },
  completeBtn: {
    flex: 3, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#10b981', borderRadius: 14, paddingVertical: 14,
  },
  completeBtnTxt: { fontSize: 14, fontWeight: '800', color: '#fff' },
  cancelServingBtn: {
    flex: 1.2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
  },
  cancelServingTxt: { fontSize: 13, fontWeight: '700', color: '#fca5a5' },

  servingEmptyWrap: { alignItems: 'center', gap: 6, paddingVertical: 12 },
  servingEmptyTxt: { fontSize: 16, fontWeight: '800', color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  servingEmptySub: { fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center' },

  // Section header
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  countBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  countBadgeActive: { backgroundColor: '#eff6ff' },
  countBadgeEmpty:  { backgroundColor: '#f1f5f9' },
  countBadgeTxt: { fontSize: 10, fontWeight: '700', color: '#94a3b8' },

  // Empty queue
  emptyQueue: {
    backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0',
    padding: 32, alignItems: 'center', gap: 8,
  },
  emptyQueueTxt: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  emptyQueueSub: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },

  // Queue item
  queueItem: {
    backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#e2e8f0',
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#0f172a', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  queueItemLeft: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  posWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  posNum: { fontSize: 13, fontWeight: '900', color: '#475569' },
  ticketNum: { fontSize: 14, fontWeight: '900', color: '#0f172a' },
  customerName: { fontSize: 13, fontWeight: '600', color: '#334155' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  metaTxt: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  metaSep: { fontSize: 11, color: '#cbd5e1' },
  notesBadge: { fontSize: 10, color: '#7c3aed', fontWeight: '600', backgroundColor: '#f5f3ff', alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },

  queueActions: { flexDirection: 'column', gap: 6, alignItems: 'center' },
  callBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#eff6ff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  callBtnDisabled: { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' },
  callBtnTxt: { fontSize: 12, fontWeight: '800', color: '#2563eb' },
  cancelItemBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#fff1f2', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#fecdd3',
  },

  // Footer
  footerNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 6 },
  footerNoteTxt: { fontSize: 10, color: '#cbd5e1', fontWeight: '500', textAlign: 'center' },
});
