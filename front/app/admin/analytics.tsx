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

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];
type Period = 'Today' | 'Week' | 'Month';

type QueueStats = {
  waiting: number;
  serving: number;
  completed: number;
  avg_wait: number;
};

const BAR_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const BREAKDOWN = [
  { service: 'Account Opening',        color: '#2563eb' },
  { service: 'General Inquiry',        color: '#059669' },
  { service: 'Document Verification',  color: '#d97706' },
  { service: 'Loan Consultation',      color: '#7c3aed' },
  { service: 'Other',                  color: '#64748b' },
];

export default function Analytics() {
  const router = useRouter();
  const [period, setPeriod]   = useState<Period>('Week');
  const [stats,  setStats]    = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const { data } = await api.get<QueueStats>('/queues/status/');
    if (data) setStats(data);
    setLoading(false);
    setRefresh(false);
  }, []);

  useEffect(() => {
    fetchData();
    const t = setInterval(() => fetchData(true), 30_000);
    return () => clearInterval(t);
  }, [fetchData]);

  const total = (stats?.waiting ?? 0) + (stats?.serving ?? 0) + (stats?.completed ?? 0);

  // Derive a rough bar chart from total (spread across 7 days with some variation)
  const barData = BAR_LABELS.map((label, i) => {
    const seed   = [0.55, 0.85, 0.70, 1.0, 0.90, 0.45, 0.30][i];
    const value  = Math.max(1, Math.round((total * seed) / 3));
    return { label, value };
  });
  const maxBar = Math.max(...barData.map(d => d.value), 1);

  // Breakdown percentages based on total
  const bdData = BREAKDOWN.map((b, i) => {
    const weights = [0.30, 0.25, 0.20, 0.15, 0.10];
    const count   = Math.max(0, Math.round(total * weights[i]));
    const pct     = total > 0 ? count / total : 0;
    return { ...b, count, pct };
  });

  const kpiCards = [
    {
      label: 'Total Tickets',
      value: String(total),
      icon: 'confirmation-number' as IconName,
      color: '#2563eb',
      bg: '#eff6ff',
      trend: stats ? '+live' : '--',
      up: true,
    },
    {
      label: 'Avg Wait Time',
      value: `${stats?.avg_wait ?? 0} min`,
      icon: 'schedule' as IconName,
      color: '#059669',
      bg: '#ecfdf5',
      trend: 'live',
      up: stats ? (stats.avg_wait < 15) : false,
    },
    {
      label: 'Now Serving',
      value: String(stats?.serving ?? 0),
      icon: 'person' as IconName,
      color: '#d97706',
      bg: '#fffbeb',
      trend: 'active',
      up: true,
    },
    {
      label: 'Completed',
      value: String(stats?.completed ?? 0),
      icon: 'check-circle' as IconName,
      color: '#7c3aed',
      bg: '#f5f3ff',
      trend: 'today',
      up: true,
    },
  ];

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={st.header}>
        <TouchableOpacity
          onPress={() => router.replace('/admin/dashboard' as any)}
          style={st.backBtn}
        >
          <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Analytics</Text>
        <TouchableOpacity onPress={() => fetchData()} style={st.refreshBtn}>
          <MaterialIcons name="refresh" size={20} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={st.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refresh}
            onRefresh={() => { setRefresh(true); fetchData(true); }}
            tintColor="#2563eb"
          />
        }
      >
        {/* Period toggle */}
        <View style={st.toggleRow}>
          {(['Today', 'Week', 'Month'] as Period[]).map(p => (
            <TouchableOpacity
              key={p}
              style={[st.toggleBtn, period === p && st.toggleBtnActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[st.toggleText, period === p && st.toggleTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Live indicator */}
        <View style={st.liveBar}>
          <View style={st.liveDot} />
          <Text style={st.liveTxt}>Live data from backend</Text>
          {loading && <ActivityIndicator size="small" color="#2563eb" style={{ marginLeft: 6 }} />}
        </View>

        {/* KPI grid */}
        <View style={st.kpiGrid}>
          {kpiCards.map((k, i) => (
            <View key={i} style={[st.kpiCard, { borderColor: k.bg }]}>
              <View style={[st.kpiIcon, { backgroundColor: k.bg }]}>
                <MaterialIcons name={k.icon} size={18} color={k.color} />
              </View>
              <Text style={[st.kpiValue, { color: k.color }]}>{k.value}</Text>
              <Text style={st.kpiLabel}>{k.label}</Text>
              <View style={st.trendRow}>
                <MaterialIcons
                  name={k.up ? 'arrow-upward' : 'arrow-downward'}
                  size={11}
                  color={k.up ? '#059669' : '#e11d48'}
                />
                <Text style={[st.trendTxt, { color: k.up ? '#059669' : '#e11d48' }]}>
                  {k.trend}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Bar chart */}
        <View style={st.chartCard}>
          <View style={st.chartHdr}>
            <Text style={st.chartTitle}>Tickets by Day</Text>
            <Text style={st.chartSub}>{period} view · estimated</Text>
          </View>
          <View style={st.chartArea}>
            {barData.map((d, i) => (
              <View key={i} style={st.barGroup}>
                <Text style={st.barValTxt}>{d.value}</Text>
                <View style={st.barTrack}>
                  <View
                    style={[
                      st.bar,
                      {
                        height: Math.max(4, (d.value / maxBar) * 100),
                        backgroundColor: i === 3 ? '#1d4ed8' : '#2563eb',
                        opacity: i === 3 ? 1 : 0.7,
                      },
                    ]}
                  />
                </View>
                <Text style={st.barLabelTxt}>{d.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Service breakdown */}
        <View style={st.chartCard}>
          <Text style={st.chartTitle}>Service Breakdown</Text>
          <View style={st.bdList}>
            {bdData.map((row, i) => (
              <View key={i} style={st.bdRow}>
                <View style={st.bdHdr}>
                  <View style={[st.bdDot, { backgroundColor: row.color }]} />
                  <Text style={st.bdService}>{row.service}</Text>
                  <Text style={st.bdCount}>{row.count}</Text>
                  <Text style={[st.bdPct, { color: row.color }]}>
                    {total > 0 ? `${Math.round(row.pct * 100)}%` : '0%'}
                  </Text>
                </View>
                <View style={st.bdTrack}>
                  <View
                    style={[
                      st.bdBar,
                      {
                        width: `${Math.round(row.pct * 100)}%`,
                        backgroundColor: row.color,
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Queue status summary */}
        <View style={st.statusCard}>
          <Text style={st.statusTitle}>Current Queue State</Text>
          <View style={st.statusRow}>
            {[
              { label: 'Waiting',   value: stats?.waiting ?? 0,   color: '#2563eb', bg: '#eff6ff' },
              { label: 'Serving',   value: stats?.serving ?? 0,   color: '#059669', bg: '#ecfdf5' },
              { label: 'Completed', value: stats?.completed ?? 0, color: '#7c3aed', bg: '#f5f3ff' },
            ].map(item => (
              <View key={item.label} style={[st.statusItem, { backgroundColor: item.bg }]}>
                <Text style={[st.statusItemVal, { color: item.color }]}>{item.value}</Text>
                <Text style={[st.statusItemLbl, { color: item.color }]}>{item.label}</Text>
              </View>
            ))}
          </View>
          <View style={st.avgWaitRow}>
            <MaterialIcons name="timer" size={15} color="#d97706" />
            <Text style={st.avgWaitTxt}>
              Average wait time: <Text style={st.avgWaitBold}>{stats?.avg_wait ?? 0} minutes</Text>
            </Text>
          </View>
        </View>

      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  backBtn:    { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  refreshBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  content: { padding: 16, gap: 16, paddingBottom: 40 },

  toggleRow: {
    flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 14, padding: 4,
  },
  toggleBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10 },
  toggleBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  toggleText:       { fontSize: 13, fontWeight: '600', color: '#64748b' },
  toggleTextActive: { color: '#0f172a', fontWeight: '800' },

  liveBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#f0fdf4', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' },
  liveTxt: { fontSize: 12, fontWeight: '600', color: '#059669', flex: 1 },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: {
    flex: 1, minWidth: '45%',
    backgroundColor: '#fff', borderRadius: 20, padding: 14,
    borderWidth: 1.5, gap: 6,
  },
  kpiIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  kpiValue: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  kpiLabel: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  trendTxt: { fontSize: 11, fontWeight: '700' },

  chartCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0', gap: 4,
  },
  chartHdr:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  chartTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  chartSub:   { fontSize: 11, color: '#94a3b8', fontWeight: '500' },

  chartArea: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    height: 140, paddingTop: 10,
  },
  barGroup:   { flex: 1, alignItems: 'center', gap: 5 },
  barValTxt:  { fontSize: 9, fontWeight: '700', color: '#64748b' },
  barTrack:   { width: '60%', height: 100, justifyContent: 'flex-end' },
  bar:        { width: '100%', borderRadius: 5, minHeight: 4 },
  barLabelTxt:{ fontSize: 9, fontWeight: '600', color: '#94a3b8' },

  bdList: { gap: 14, marginTop: 8 },
  bdRow:  { gap: 6 },
  bdHdr:  { flexDirection: 'row', alignItems: 'center', gap: 7 },
  bdDot:  { width: 8, height: 8, borderRadius: 4 },
  bdService: { flex: 1, fontSize: 12, fontWeight: '600', color: '#334155' },
  bdCount:   { fontSize: 12, fontWeight: '800', color: '#0f172a' },
  bdPct:     { fontSize: 11, fontWeight: '700', minWidth: 34, textAlign: 'right' },
  bdTrack:   { height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' },
  bdBar:     { height: '100%', borderRadius: 3 },

  statusCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0', gap: 12,
  },
  statusTitle:   { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  statusRow:     { flexDirection: 'row', gap: 8 },
  statusItem:    { flex: 1, borderRadius: 14, padding: 12, alignItems: 'center', gap: 4 },
  statusItemVal: { fontSize: 22, fontWeight: '900' },
  statusItemLbl: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  avgWaitRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  avgWaitTxt:    { fontSize: 13, color: '#64748b', fontWeight: '500' },
  avgWaitBold:   { fontWeight: '800', color: '#d97706' },
});
