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

type Period = 'Today' | 'Week' | 'Month';
type IndustryKey = 'all' | 'banking' | 'healthcare' | 'retail' | 'government' | 'education';

const INDUSTRIES: { key: IndustryKey; label: string }[] = [
  { key: 'all', label: 'All Industries' },
  { key: 'banking', label: 'Banking' },
  { key: 'healthcare', label: 'Healthcare' },
  { key: 'retail', label: 'Retail' },
  { key: 'government', label: 'Government' },
  { key: 'education', label: 'Education' },
];

type StatCard = {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  color: string;
  bg: string;
  trend: string;
  up: boolean;
};

const STATS: StatCard[] = [
  { label: 'Total Tickets', value: '284', icon: 'confirmation-number', color: '#2563eb', bg: '#eff6ff', trend: '+12%', up: true },
  { label: 'Avg Wait Time', value: '14 min', icon: 'schedule', color: '#059669', bg: '#ecfdf5', trend: '-8%', up: false },
  { label: 'Peak Hour', value: '10–11 AM', icon: 'trending-up', color: '#d97706', bg: '#fffbeb', trend: '42 tickets', up: true },
  { label: 'Satisfaction', value: '4.7 / 5', icon: 'star', color: '#7c3aed', bg: '#f5f3ff', trend: '+0.3', up: true },
];

const BAR_DATA = [
  { label: 'Mon', value: 45 },
  { label: 'Tue', value: 72 },
  { label: 'Wed', value: 58 },
  { label: 'Thu', value: 91 },
  { label: 'Fri', value: 83 },
  { label: 'Sat', value: 34 },
  { label: 'Sun', value: 21 },
];

const MAX_BAR = Math.max(...BAR_DATA.map(d => d.value));

const BREAKDOWN = [
  { service: 'Account Opening', count: 84, pct: 0.72, color: '#2563eb' },
  { service: 'General Inquiry', count: 63, pct: 0.54, color: '#059669' },
  { service: 'Document Verification', count: 47, pct: 0.40, color: '#d97706' },
  { service: 'Loan Consultation', count: 38, pct: 0.33, color: '#7c3aed' },
  { service: 'Other', count: 21, pct: 0.18, color: '#64748b' },
];

export default function Analytics() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('Week');
  const [industry, setIndustry] = useState<IndustryKey>('all');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Period toggle */}
        <View style={styles.toggleRow}>
          {(['Today', 'Week', 'Month'] as Period[]).map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.toggleBtn, period === p && styles.toggleBtnActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.toggleText, period === p && styles.toggleTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Industry filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {INDUSTRIES.map(ind => (
            <TouchableOpacity
              key={ind.key}
              style={[styles.filterChip, industry === ind.key && styles.filterChipActive]}
              onPress={() => setIndustry(ind.key)}
            >
              <Text style={[styles.filterText, industry === ind.key && styles.filterTextActive]}>
                {ind.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          {STATS.map((s, i) => (
            <View key={i} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: s.bg }]}>
                <MaterialIcons name={s.icon} size={20} color={s.color} />
              </View>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
              <View style={styles.trendRow}>
                <MaterialIcons
                  name={s.up ? 'arrow-upward' : 'arrow-downward'}
                  size={12}
                  color={s.up ? '#059669' : '#e11d48'}
                />
                <Text style={[styles.trendText, { color: s.up ? '#059669' : '#e11d48' }]}>
                  {s.trend}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Bar chart */}
        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Tickets by Day</Text>
          <View style={styles.chartArea}>
            {BAR_DATA.map((d, i) => (
              <View key={i} style={styles.barGroup}>
                <Text style={styles.barValue}>{d.value}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.bar, { height: (d.value / MAX_BAR) * 110 }]} />
                </View>
                <Text style={styles.barLabel}>{d.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Service breakdown */}
        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Service Breakdown</Text>
          <View style={styles.breakdownList}>
            {BREAKDOWN.map((row, i) => (
              <View key={i} style={styles.bdRow}>
                <View style={styles.bdHeader}>
                  <Text style={styles.bdService}>{row.service}</Text>
                  <Text style={styles.bdCount}>{row.count}</Text>
                </View>
                <View style={styles.bdTrack}>
                  <View
                    style={[
                      styles.bdBar,
                      { width: `${Math.round(row.pct * 100)}%`, backgroundColor: row.color },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>
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
  content: { padding: 16, gap: 16, paddingBottom: 40 },

  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  toggleBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  toggleTextActive: { color: '#0f172a', fontWeight: '700' },

  filterScroll: { flexGrow: 0 },
  filterChip: {
    paddingHorizontal: 14,
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

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  statLabel: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  trendText: { fontSize: 11, fontWeight: '700' },

  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 16 },

  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 150,
    paddingTop: 16,
  },
  barGroup: { flex: 1, alignItems: 'center', gap: 4 },
  barValue: { fontSize: 9, fontWeight: '700', color: '#64748b' },
  barTrack: { width: '65%', height: 110, justifyContent: 'flex-end' },
  bar: { width: '100%', backgroundColor: '#2563eb', borderRadius: 4, minHeight: 4 },
  barLabel: { fontSize: 9, fontWeight: '600', color: '#94a3b8' },

  breakdownList: { gap: 12 },
  bdRow: { gap: 6 },
  bdHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  bdService: { fontSize: 12, fontWeight: '600', color: '#334155' },
  bdCount: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  bdTrack: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  bdBar: { height: '100%', borderRadius: 3 },
});
