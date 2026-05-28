import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { api } from '@/lib/api';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];
type ReqStatus = 'pending' | 'approved' | 'rejected';
type TabKey = 'all' | ReqStatus;

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
  business_id?: number;
};

type Industry = {
  id: number;
  key: string;
  label: string;
  icon: string;
  color: string;
  is_visible: boolean;
  is_builtin: boolean;
};

function industryIcon(icon: string): IconName {
  const known = [
    'account-balance', 'favorite', 'shopping-bag', 'gavel', 'school', 'business',
    'restaurant', 'local-shipping', 'home-repair-service', 'sports-soccer',
    'hotel', 'directions-car',
  ];
  return (known.includes(icon) ? icon : 'business') as IconName;
}

export default function BusinessRequests() {
  const router = useRouter();
  const [tab,        setTab]       = useState<TabKey>('pending');
  const [requests,   setReqs]      = useState<BusinessRequest[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loading,    setLoading]   = useState(true);

  // Post-approval industry assignment modal
  const [assignModal,  setAssignModal]  = useState<{ bizId: number; bizName: string } | null>(null);
  const [selectedIds,  setSelectedIds]  = useState<number[]>([]);
  const [assigning,    setAssigning]    = useState(false);

  const fetchAll = useCallback(async () => {
    const [reqRes, indRes] = await Promise.all([
      api.get<BusinessRequest[] | { results: BusinessRequest[] }>('/businesses/requests/'),
      api.get<Industry[]>('/businesses/industries/'),
    ]);
    const list = Array.isArray(reqRes.data) ? reqRes.data : (reqRes.data as any)?.results ?? [];
    setReqs(list);
    setIndustries(Array.isArray(indRes.data) ? indRes.data : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered     = requests.filter(r => tab === 'all' || r.status === tab);
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  const approve = (req: BusinessRequest) => {
    Alert.alert('Approve', `Approve "${req.business_name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          const { data, error } = await api.post<BusinessRequest & { business_id?: number }>(
            `/businesses/requests/${req.id}/approve/`, {}
          );
          if (error) { Alert.alert('Error', error); return; }
          const updated = { ...req, status: 'approved' as ReqStatus, business_id: data?.business_id };
          setReqs(prev => prev.map(r => r.id === req.id ? updated : r));

          // Offer to assign industries right away
          if (data?.business_id) {
            setSelectedIds([]);
            setAssignModal({ bizId: data.business_id, bizName: req.business_name });
          }
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

  const toggleSelectedId = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const saveAssignment = async () => {
    if (!assignModal) return;
    setAssigning(true);
    const { error } = await api.put(`/businesses/${assignModal.bizId}/industries/`, {
      industry_ids: selectedIds,
    });
    setAssigning(false);
    if (error) { Alert.alert('Error', error); return; }
    setAssignModal(null);
  };

  const openAssignModal = (req: BusinessRequest) => {
    if (!req.business_id) {
      Alert.alert(
        'Not Found',
        'Business record not linked yet. Pull down to refresh the page, then try again.',
      );
      return;
    }
    setSelectedIds([]);
    setAssignModal({ bizId: req.business_id, bizName: req.business_name });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
        <TouchableOpacity style={styles.backBtn} onPress={fetchAll}>
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
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 3 }}>
                    {req.industry.split(',').map(ind => ind.trim()).filter(Boolean).map(ind => (
                      <View key={ind} style={{ backgroundColor: '#eef2ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700' as const, color: '#4f46e5' }}>
                          {ind.charAt(0).toUpperCase() + ind.slice(1)}
                        </Text>
                      </View>
                    ))}
                  </View>
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
                  ...(req.phone   ? [{ icon: 'phone' as const, text: req.phone }] : []),
                  { icon: 'event' as const, text: `Submitted ${req.created_at?.slice(0, 10)}` },
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
                  <TouchableOpacity style={styles.approveBtn} onPress={() => approve(req)}>
                    <MaterialIcons name="check" size={15} color="#fff" />
                    <Text style={styles.approveText}>Approve</Text>
                  </TouchableOpacity>
                </View>
              )}

              {req.status === 'approved' && (
                <TouchableOpacity
                  style={styles.assignIndBtn}
                  onPress={() => openAssignModal(req)}
                  activeOpacity={0.85}
                >
                  <MaterialIcons name="category" size={14} color="#4f46e5" />
                  <Text style={styles.assignIndBtnTxt}>Manage Industries</Text>
                </TouchableOpacity>
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

      {/* ── Assign Industries Modal ─────────────────────────────────────── */}
      <Modal visible={!!assignModal} transparent animationType="slide" onRequestClose={() => setAssignModal(null)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Assign Industries</Text>
                {assignModal && (
                  <Text style={styles.sheetSub}>{assignModal.bizName}</Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setAssignModal(null)}>
                <MaterialIcons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            <Text style={styles.sheetHint}>
              Select which industries this business belongs to. You can choose more than one.
            </Text>
            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
              {industries.map(ind => {
                const checked = selectedIds.includes(ind.id);
                return (
                  <TouchableOpacity
                    key={ind.id}
                    style={[styles.indOpt, checked && styles.indOptActive]}
                    onPress={() => toggleSelectedId(ind.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.indOptIcon, { backgroundColor: ind.color + '18' }]}>
                      <MaterialIcons name={industryIcon(ind.icon)} size={18} color={ind.color} />
                    </View>
                    <Text style={[styles.indOptTxt, checked && { color: '#4f46e5', fontWeight: '800' }]}>
                      {ind.label}
                    </Text>
                    <MaterialIcons
                      name={checked ? 'check-box' : 'check-box-outline-blank'}
                      size={22}
                      color={checked ? '#4f46e5' : '#cbd5e1'}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={[styles.saveBtn, assigning && { opacity: 0.6 }]}
              onPress={saveAssignment}
              disabled={assigning}
            >
              {assigning
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.saveBtnTxt}>
                    {selectedIds.length === 0 ? 'Skip for Now' : `Confirm (${selectedIds.length} selected)`}
                  </Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f8fafc' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backBtn:      { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  headerSub:    { fontSize: 11, color: '#d97706', fontWeight: '600' },
  tabsScroll:   { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', flexGrow: 0 },
  tabsContent:  { paddingHorizontal: 12, gap: 0, paddingVertical: 0, alignItems: 'center' },
  tab:          { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:    { borderBottomColor: '#4f46e5' },
  tabText:      { fontSize: 13, fontWeight: '600', color: '#64748b' },
  tabTextActive:{ color: '#4f46e5' },
  badge:        { backgroundColor: '#f97316', borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 },
  badgeText:    { fontSize: 10, fontWeight: '800', color: '#fff' },
  content:      { padding: 16, gap: 12, paddingBottom: 40 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  reqCard:      { backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', gap: 12 },
  reqHeader:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reqIcon:      { width: 44, height: 44, borderRadius: 14, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center' },
  bizName:      { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  industry:     { fontSize: 12, fontWeight: '500', color: '#64748b', marginTop: 2 },
  statusBadge:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText:   { fontSize: 11, fontWeight: '700' },
  details:      { gap: 6 },
  detailRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText:   { fontSize: 12, color: '#64748b', fontWeight: '500' },
  actions:      { flexDirection: 'row', gap: 10 },
  rejectBtn:    { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff1f2', alignItems: 'center' },
  rejectText:   { fontSize: 13, fontWeight: '700', color: '#e11d48' },
  approveBtn:   { flex: 2, flexDirection: 'row', paddingVertical: 10, borderRadius: 12, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center', gap: 6 },
  approveText:  { fontSize: 13, fontWeight: '700', color: '#fff' },
  assignIndBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 12, backgroundColor: '#eef2ff', borderWidth: 1, borderColor: '#c7d2fe' },
  assignIndBtnTxt: { fontSize: 13, fontWeight: '700', color: '#4f46e5' },
  emptyState:   { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText:    { fontSize: 14, fontWeight: '600', color: '#94a3b8' },

  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:       { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 10, paddingBottom: 40 },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 },
  sheetTitle:  { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  sheetSub:    { fontSize: 13, color: '#64748b', fontWeight: '600', marginTop: 2 },
  sheetHint:   { fontSize: 13, color: '#64748b', fontWeight: '500', lineHeight: 18 },
  indOpt:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1.5, borderColor: '#e2e8f0', marginBottom: 8 },
  indOptActive:{ borderColor: '#4f46e5', backgroundColor: '#eef2ff' },
  indOptIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  indOptTxt:   { flex: 1, fontSize: 14, fontWeight: '600', color: '#0f172a' },
  saveBtn:     { backgroundColor: '#4f46e5', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  saveBtnTxt:  { fontSize: 15, fontWeight: '800', color: '#fff' },
});
