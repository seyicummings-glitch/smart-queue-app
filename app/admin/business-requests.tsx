import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { api } from '@/lib/api';

type ReqStatus = 'pending' | 'approved' | 'rejected';

type BusinessRequest = {
  id: number;
  business_name: string;
  contact_name: string;
  email: string;
  phone: string;
  industry: string;
  message: string;
  status: ReqStatus;
  created_at: string;
};

type TabKey = 'all' | ReqStatus;

export default function BusinessRequests() {
  const router = useRouter();
  const [tab,      setTab]      = useState<TabKey>('pending');
  const [requests, setReqs]     = useState<BusinessRequest[]>([]);
  const [loading,  setLoading]  = useState(true);

  const fetchRequests = useCallback(async () => {
    const { data } = await api.get<BusinessRequest[] | { results: BusinessRequest[] }>('/businesses/requests/');
    const list = Array.isArray(data) ? data : (data as any)?.results ?? [];
    setReqs(list);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const filtered     = requests.filter(r => tab === 'all' || r.status === tab);
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  const approve = (id: number) => {
    Alert.alert('Approve', 'Approve this business registration request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          const { error } = await api.post(`/businesses/requests/${id}/approve/`, {});
          if (error) { Alert.alert('Error', error); return; }
          setReqs(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r));
        },
      },
    ]);
  };

  const reject = (id: number) => {
    Alert.alert('Reject', 'Reject this business request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive',
        onPress: async () => {
          const { error } = await api.post(`/businesses/requests/${id}/reject/`, {});
          if (error) { Alert.alert('Error', error); return; }
          setReqs(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r));
        },
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
        <TouchableOpacity style={styles.backBtn} onPress={fetchRequests}>
          <MaterialIcons name="refresh" size={22} color="#64748b" />
        </TouchableOpacity>
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

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {filtered.map(req => (
            <View key={req.id} style={styles.reqCard}>
              <View style={styles.reqHeader}>
                <View style={styles.reqIcon}>
                  <MaterialIcons name="business" size={20} color="#4f46e5" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bizName}>{req.business_name}</Text>
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
                  { icon: 'person' as const, text: req.contact_name },
                  { icon: 'email'  as const, text: req.email },
                  ...(req.phone ? [{ icon: 'phone' as const, text: req.phone }] : []),
                  { icon: 'event'  as const, text: `Submitted ${req.created_at?.slice(0, 10)}` },
                  ...(req.message ? [{ icon: 'notes' as const, text: req.message }] : []),
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
              <Text style={styles.emptyText}>
                {tab === 'pending' ? 'No pending requests' : 'No requests found'}
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  headerSub: { fontSize: 11, color: '#d97706', fontWeight: '600' },
  tabsScroll: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tabsContent: { paddingHorizontal: 16, gap: 4, paddingVertical: 2 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#4f46e5' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#4f46e5' },
  badge: { backgroundColor: '#f97316', borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  reqCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', gap: 12 },
  reqHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reqIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center' },
  bizName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  industry: { fontSize: 12, fontWeight: '500', color: '#64748b', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '700' },
  details: { gap: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 10 },
  rejectBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff1f2', alignItems: 'center' },
  rejectText: { fontSize: 13, fontWeight: '700', color: '#e11d48' },
  approveBtn: { flex: 2, flexDirection: 'row', paddingVertical: 10, borderRadius: 12, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center', gap: 6 },
  approveText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, fontWeight: '600', color: '#94a3b8' },
});
