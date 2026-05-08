import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

type ReqStatus = 'pending' | 'approved' | 'rejected';

type BusinessRequest = {
  id: number;
  businessName: string;
  contactName: string;
  email: string;
  industry: string;
  employees: number;
  submittedDate: string;
  status: ReqStatus;
};

const MOCK: BusinessRequest[] = [
  { id: 1, businessName: 'First National Bank',   contactName: 'Robert Hughes',   email: 'r.hughes@fnb.com',         industry: 'Banking & Finance', employees: 45,  submittedDate: '2026-05-05', status: 'pending' },
  { id: 2, businessName: 'City Health Clinic',    contactName: 'Dr. Sarah Lee',   email: 's.lee@cityclinic.com',     industry: 'Healthcare',        employees: 12,  submittedDate: '2026-05-04', status: 'pending' },
  { id: 3, businessName: 'MegaMart Retail',       contactName: 'Kevin Brown',     email: 'k.brown@megamart.com',     industry: 'Retail',            employees: 120, submittedDate: '2026-05-03', status: 'approved' },
  { id: 4, businessName: 'City Council Office',   contactName: 'Janet Moore',     email: 'j.moore@citycouncil.gov',  industry: 'Government',        employees: 30,  submittedDate: '2026-05-02', status: 'rejected' },
  { id: 5, businessName: 'Sunrise University',    contactName: 'Prof. Alan Wong', email: 'a.wong@sunrise.edu',       industry: 'Education',         employees: 85,  submittedDate: '2026-05-01', status: 'pending' },
];

type TabKey = 'all' | ReqStatus;

export default function BusinessRequests() {
  const router = useRouter();
  const [tab, setTab]       = useState<TabKey>('pending');
  const [requests, setReqs] = useState(MOCK);

  const filtered     = requests.filter(r => tab === 'all' || r.status === tab);
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  const approve = (id: number) => {
    Alert.alert('Approve', 'Approve this business and create their admin account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: () => setReqs(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r)),
      },
    ]);
  };

  const reject = (id: number) => {
    Alert.alert('Reject', 'Reject this business request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: () => setReqs(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r)),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Business Requests</Text>
          {pendingCount > 0 && (
            <Text style={styles.headerSub}>{pendingCount} pending review</Text>
          )}
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContent}
      >
        {(['all', 'pending', 'approved', 'rejected'] as TabKey[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
            {t === 'pending' && pendingCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {filtered.map(req => (
          <View key={req.id} style={styles.reqCard}>
            <View style={styles.reqHeader}>
              <View style={styles.reqIcon}>
                <MaterialIcons name="business" size={20} color="#4f46e5" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bizName}>{req.businessName}</Text>
                <Text style={styles.industry}>{req.industry}</Text>
              </View>
              {req.status !== 'pending' && (
                <View style={[
                  styles.statusBadge,
                  req.status === 'approved' ? { backgroundColor: '#ecfdf5' } : { backgroundColor: '#fff1f2' },
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: req.status === 'approved' ? '#059669' : '#e11d48' },
                  ]}>
                    {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.details}>
              {[
                { icon: 'person' as const,  text: req.contactName },
                { icon: 'email'  as const,  text: req.email },
                { icon: 'group'  as const,  text: `${req.employees} employees` },
                { icon: 'event'  as const,  text: `Submitted ${req.submittedDate}` },
              ].map((d, i) => (
                <View key={i} style={styles.detailRow}>
                  <MaterialIcons name={d.icon} size={13} color="#94a3b8" />
                  <Text style={styles.detailText}>{d.text}</Text>
                </View>
              ))}
            </View>

            {req.status === 'pending' && (
              <View style={styles.actions}>
                <TouchableOpacity style={styles.rejectBtn} onPress={() => reject(req.id)}>
                  <Text style={styles.rejectText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.approveBtn} onPress={() => approve(req.id)}>
                  <MaterialIcons name="check" size={15} color="#fff" />
                  <Text style={styles.approveText}>Approve</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}

        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcons name="description" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No requests found</Text>
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
  headerSub: { fontSize: 11, color: '#d97706', fontWeight: '600' },

  tabsScroll: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tabsContent: { paddingHorizontal: 16, gap: 4, paddingVertical: 2 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#4f46e5' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#4f46e5' },
  badge: { backgroundColor: '#f97316', borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },

  content: { padding: 16, gap: 12, paddingBottom: 40 },
  reqCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  reqHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reqIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bizName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  industry: { fontSize: 12, fontWeight: '500', color: '#64748b', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '700' },

  details: { gap: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 12, color: '#64748b', fontWeight: '500' },

  actions: { flexDirection: 'row', gap: 10 },
  rejectBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fff1f2',
    alignItems: 'center',
  },
  rejectText: { fontSize: 13, fontWeight: '700', color: '#e11d48' },
  approveBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  approveText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, fontWeight: '600', color: '#94a3b8' },
});
