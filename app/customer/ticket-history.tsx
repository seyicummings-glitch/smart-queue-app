import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, StatusBar, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SQMSHeader from '@/components/SQMSHeader';
import BottomNav from '@/components/BottomNav';
import { api } from '@/lib/api';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

type HistoryTicket = {
  id: number;
  ticket_number: string;
  service_name: string;
  branch_name: string;
  status: 'called' | 'serving' | 'completed' | 'cancelled' | 'missed';
  issued_at: string;
  completed_at: string | null;
};

type StatusCfg = { label: string; color: string; bg: string; icon: IconName };
const STATUS_CFG: Record<string, StatusCfg> = {
  completed: { label: 'Completed', color: '#059669', bg: '#f0fdf4', icon: 'check-circle'         },
  cancelled: { label: 'Cancelled', color: '#e11d48', bg: '#fff1f2', icon: 'cancel'               },
  missed:    { label: 'Missed',    color: '#b45309', bg: '#fffbeb', icon: 'access-time-filled'   },
  called:    { label: 'Called',    color: '#2563eb', bg: '#eff6ff', icon: 'notifications-active' },
  serving:   { label: 'Serving',   color: '#7c3aed', bg: '#f5f3ff', icon: 'person'               },
};

const HIDDEN_KEY = 'hiddenTicketIds';

export default function TicketHistoryScreen() {
  const router = useRouter();

  const [tickets,        setTickets]        = useState<HistoryTicket[]>([]);
  const [hiddenIds,      setHiddenIds]      = useState<number[]>([]);
  const [loading,        setLoading]        = useState(true);

  // Load hidden IDs from storage once on mount
  useEffect(() => {
    AsyncStorage.getItem(HIDDEN_KEY).then(val => {
      if (val) setHiddenIds(JSON.parse(val));
    });
  }, []);

  const loadTickets = useCallback(async () => {
    const { data } = await api.get<HistoryTicket[]>('/queues/history/');
    if (data) setTickets(data);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    loadTickets();
  }, [loadTickets]));

  const hideTicket = useCallback((id: number) => {
    setHiddenIds(prev => {
      const next = [...prev, id];
      AsyncStorage.setItem(HIDDEN_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const visible = tickets.filter(t => !hiddenIds.includes(t.id));

  const renderItem = ({ item: t }: { item: HistoryTicket }) => {
    const cfg     = STATUS_CFG[t.status] ?? STATUS_CFG.cancelled;
    const d       = new Date(t.issued_at);
    const dateStr = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    return (
      <View style={s.card}>
        <View style={[s.iconBox, { backgroundColor: cfg.bg }]}>
          <MaterialIcons name={cfg.icon} size={20} color={cfg.color} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={s.ticketNum}>{t.ticket_number}</Text>
            <View style={[s.statusChip, { backgroundColor: cfg.bg }]}>
              <Text style={[s.statusTxt, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>
          <Text style={s.service}>{t.service_name}</Text>
          <Text style={s.branch}>{t.branch_name}</Text>
          <Text style={s.time}>{dateStr} · {timeStr}</Text>
        </View>
        <TouchableOpacity
          style={s.dismissBtn}
          onPress={() => hideTicket(t.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="close" size={16} color="#94a3b8" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <SQMSHeader />

      {/* Page header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Ticket History</Text>
          {!loading && (
            <Text style={s.headerSub}>
              {visible.length} ticket{visible.length === 1 ? '' : 's'}
            </Text>
          )}
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={loadTickets}>
          <MaterialIcons name="refresh" size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.centerState}>
          <ActivityIndicator size="large" color="#7c3aed" />
        </View>
      ) : visible.length === 0 ? (
        <View style={s.centerState}>
          <View style={s.emptyIcon}>
            <MaterialIcons name="history" size={36} color="#c4b5fd" />
          </View>
          <Text style={s.emptyTitle}>No ticket history yet</Text>
          <Text style={s.emptySub}>Tickets you take will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={t => String(t.id)}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <BottomNav />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  headerSub:   { fontSize: 12, color: '#94a3b8', fontWeight: '500', marginTop: 1 },
  refreshBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center',
  },

  list: { padding: 16, gap: 10, paddingBottom: 32 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#0f172a', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  ticketNum:   { fontSize: 14, fontWeight: '800', color: '#0f172a', fontFamily: 'monospace' },
  statusChip:  { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  statusTxt:   { fontSize: 10, fontWeight: '700' },
  service:     { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  branch:      { fontSize: 12, color: '#64748b', fontWeight: '500' },
  time:        { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  dismissBtn: {
    width: 30, height: 30, borderRadius: 9, backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },

  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  emptySub:   { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
});
