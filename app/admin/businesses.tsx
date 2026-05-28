import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, StatusBar, Alert, ActivityIndicator, Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { api } from '@/lib/api';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

// ── Types ─────────────────────────────────────────────────────────────────────

type IndustryControl = {
  id: number;
  industry: string;   // key e.g. "banking"
  label: string;
  is_visible: boolean;
};

type Business = {
  id: number;
  name: string;
  industry: string;
  plan: string;
  status: string;
  email: string;
  phone: string;
  address: string;
  created_at: string;
};

// ── Static metadata for the 6 built-in industries ────────────────────────────

const INDUSTRY_META: Record<string, { icon: IconName; color: string }> = {
  banking:    { icon: 'account-balance', color: '#2563eb' },
  healthcare: { icon: 'favorite',        color: '#e11d48' },
  retail:     { icon: 'shopping-bag',    color: '#d97706' },
  government: { icon: 'gavel',           color: '#475569' },
  education:  { icon: 'school',          color: '#4f46e5' },
  corporate:  { icon: 'business',        color: '#0d9488' },
};

const INDUSTRY_LABELS: Record<string, string> = {
  banking:    'Banking',
  healthcare: 'Healthcare',
  retail:     'Retail',
  government: 'Government',
  education:  'Education',
  corporate:  'Corporate',
};

export default function Businesses() {
  const router = useRouter();

  const [controls,   setControls]   = useState<IndustryControl[]>([]);
  const [businesses, setBizs]       = useState<Business[]>([]);
  const [search,     setSearch]     = useState('');
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling,   setToggling]   = useState<string | null>(null);

  // Assign Industry modal (single select from the 6)
  const [assignModal, setAssignModal] = useState<{ bizId: number; bizName: string; current: string } | null>(null);
  const [assignPick,  setAssignPick]  = useState('');
  const [assigning,   setAssigning]   = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    const [bizRes, ctrlRes] = await Promise.all([
      api.get<Business[] | { results: Business[] }>('/businesses/'),
      api.get<IndustryControl[]>('/businesses/industry-controls/'),
    ]);
    setBizs(Array.isArray(bizRes.data) ? bizRes.data : (bizRes.data as any)?.results ?? []);
    setControls(Array.isArray(ctrlRes.data) ? ctrlRes.data : []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAll();
  }, [fetchAll]);

  const filtered = businesses.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.industry.toLowerCase().includes(search.toLowerCase())
  );

  // ── Toggle industry visibility ────────────────────────────────────────────

  const toggleIndustry = async (ctrl: IndustryControl) => {
    setToggling(ctrl.industry);
    const newVal = !ctrl.is_visible;
    const { error } = await api.patch(
      `/businesses/industry-controls/${ctrl.industry}/`,
      { is_visible: newVal },
    );
    if (error) {
      Alert.alert('Error', error);
    } else {
      setControls(prev =>
        prev.map(c => c.industry === ctrl.industry ? { ...c, is_visible: newVal } : c)
      );
    }
    setToggling(null);
  };

  // ── Assign industry to business ───────────────────────────────────────────

  const openAssign = (biz: Business) => {
    setAssignPick(biz.industry);
    setAssignModal({ bizId: biz.id, bizName: biz.name, current: biz.industry });
  };

  const saveAssign = async () => {
    if (!assignModal) return;
    setAssigning(true);
    const { error } = await api.patch(`/businesses/${assignModal.bizId}/`, {
      industry: assignPick,
    });
    setAssigning(false);
    if (error) { Alert.alert('Error', error); return; }
    setBizs(prev => prev.map(b => b.id === assignModal!.bizId ? { ...b, industry: assignPick } : b));
    setAssignModal(null);
  };

  const removeBiz = (id: number) => {
    Alert.alert('Remove Business', 'Remove this business from the platform?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          const { error } = await api.delete(`/businesses/${id}/`);
          if (error) { Alert.alert('Error', error); return; }
          setBizs(prev => prev.filter(b => b.id !== id));
        },
      },
    ]);
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>All Businesses</Text>
        <TouchableOpacity style={s.refreshBtn} onPress={onRefresh}>
          <MaterialIcons name="refresh" size={22} color="#64748b" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} />
          }
        >
          {/* ── Customer Industry Access ─────────────────────────────────── */}
          <View style={s.sectionCard}>
            <View style={s.sectionRow}>
              <MaterialIcons name="category" size={18} color="#4f46e5" />
              <Text style={s.sectionTitle}>Customer Industry Access</Text>
            </View>
            <Text style={s.sectionSub}>
              Choose which industries customers can see and use in the app.
            </Text>

            <View style={s.gridWrap}>
              {controls.map(ctrl => {
                const meta   = INDUSTRY_META[ctrl.industry];
                const icon   = meta?.icon   ?? 'business';
                const color  = meta?.color  ?? '#6B7280';
                const isOn   = ctrl.is_visible;
                const isBusy = toggling === ctrl.industry;
                return (
                  <TouchableOpacity
                    key={ctrl.industry}
                    style={[s.tile, { borderColor: isOn ? color : '#e2e8f0' }]}
                    onPress={() => toggleIndustry(ctrl)}
                    disabled={isBusy}
                    activeOpacity={0.8}
                  >
                    <View style={[s.tileIcon, { backgroundColor: color + '18' }]}>
                      {isBusy
                        ? <ActivityIndicator size="small" color={color} />
                        : <MaterialIcons name={icon} size={22} color={color} />
                      }
                    </View>
                    <Text style={[s.tileLabel, { color: isOn ? '#0f172a' : '#94a3b8' }]}>
                      {ctrl.label}
                    </Text>
                    <View style={[s.badge, { backgroundColor: isOn ? '#ecfdf5' : '#f1f5f9' }]}>
                      <View style={[s.badgeDot, { backgroundColor: isOn ? '#059669' : '#94a3b8' }]} />
                      <Text style={[s.badgeTxt, { color: isOn ? '#059669' : '#94a3b8' }]}>
                        {isOn ? 'ON' : 'OFF'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Search ───────────────────────────────────────────────────── */}
          <View style={s.searchWrap}>
            <MaterialIcons name="search" size={18} color="#94a3b8" />
            <TextInput
              style={s.searchInput}
              placeholder="Search businesses…"
              placeholderTextColor="#94a3b8"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <MaterialIcons name="close" size={18} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          {/* ── Business list ─────────────────────────────────────────────── */}
          {filtered.map(biz => {
            const meta  = INDUSTRY_META[biz.industry];
            const color = meta?.color ?? '#6B7280';
            const icon  = meta?.icon  ?? 'business';
            return (
              <View key={biz.id} style={s.card}>
                <View style={s.cardTop}>
                  <View style={[s.cardIcon, { backgroundColor: color + '18' }]}>
                    <MaterialIcons name={icon} size={20} color={color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.bizName}>{biz.name}</Text>
                    {biz.industry ? (
                      <View style={s.chipRow}>
                        <View style={[s.chip, { backgroundColor: color + '18' }]}>
                          <Text style={[s.chipTxt, { color }]}>
                            {INDUSTRY_LABELS[biz.industry] ?? biz.industry}
                          </Text>
                        </View>
                      </View>
                    ) : null}
                  </View>
                  <View style={[s.statusWrap, { backgroundColor: biz.status === 'active' ? '#ecfdf5' : '#f1f5f9' }]}>
                    <View style={[s.statusDot, { backgroundColor: biz.status === 'active' ? '#059669' : '#94a3b8' }]} />
                    <Text style={[s.statusTxt, { color: biz.status === 'active' ? '#059669' : '#94a3b8' }]}>
                      {biz.status.charAt(0).toUpperCase() + biz.status.slice(1)}
                    </Text>
                  </View>
                </View>

                {(biz.email || biz.phone) && (
                  <View style={s.metaRow}>
                    {biz.email ? <View style={s.metaItem}><MaterialIcons name="email" size={12} color="#94a3b8" /><Text style={s.metaTxt}>{biz.email}</Text></View> : null}
                    {biz.phone ? <View style={s.metaItem}><MaterialIcons name="phone" size={12} color="#94a3b8" /><Text style={s.metaTxt}>{biz.phone}</Text></View> : null}
                  </View>
                )}

                <View style={s.actions}>
                  <TouchableOpacity style={s.assignBtn} onPress={() => openAssign(biz)}>
                    <MaterialIcons name="edit" size={14} color="#4f46e5" />
                    <Text style={s.assignTxt}>Assign Industry</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.removeBtn} onPress={() => removeBiz(biz.id)}>
                    <MaterialIcons name="delete" size={14} color="#e11d48" />
                    <Text style={s.removeTxt}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {filtered.length === 0 && (
            <View style={s.emptyState}>
              <MaterialIcons name="business" size={48} color="#cbd5e1" />
              <Text style={s.emptyText}>No businesses registered yet</Text>
              <Text style={s.emptySub}>Approve business requests to see them here</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Assign Industry Modal ────────────────────────────────────────── */}
      <Modal
        visible={!!assignModal}
        transparent
        animationType="slide"
        onRequestClose={() => setAssignModal(null)}
      >
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <View>
                <Text style={s.sheetTitle}>Assign Industry</Text>
                {assignModal && <Text style={s.sheetSub}>{assignModal.bizName}</Text>}
              </View>
              <TouchableOpacity onPress={() => setAssignModal(null)}>
                <MaterialIcons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={s.sheetHint}>Select the industry this business belongs to.</Text>

            {Object.entries(INDUSTRY_META).map(([key, meta]) => {
              const selected = assignPick === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[s.indOpt, selected && { borderColor: meta.color, backgroundColor: meta.color + '10' }]}
                  onPress={() => setAssignPick(key)}
                  activeOpacity={0.8}
                >
                  <View style={[s.indOptIcon, { backgroundColor: meta.color + '18' }]}>
                    <MaterialIcons name={meta.icon} size={18} color={meta.color} />
                  </View>
                  <Text style={[s.indOptTxt, selected && { color: meta.color, fontWeight: '800' }]}>
                    {INDUSTRY_LABELS[key]}
                  </Text>
                  <MaterialIcons
                    name={selected ? 'radio-button-checked' : 'radio-button-unchecked'}
                    size={20}
                    color={selected ? meta.color : '#cbd5e1'}
                  />
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[s.saveBtn, assigning && { opacity: 0.6 }]}
              onPress={saveAssign}
              disabled={assigning}
            >
              {assigning
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.saveBtnTxt}>Save</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f8fafc' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backBtn:      { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  refreshBtn:   { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:      { padding: 16, gap: 14, paddingBottom: 40 },

  // Industry access section
  sectionCard:  { backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', gap: 10 },
  sectionRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  sectionSub:   { fontSize: 12, color: '#64748b', fontWeight: '500' },
  gridWrap:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile:         { width: '47%', borderRadius: 16, borderWidth: 1.5, backgroundColor: '#fff', padding: 14, alignItems: 'center', gap: 8 },
  tileIcon:     { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  tileLabel:    { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  badge:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  badgeDot:     { width: 6, height: 6, borderRadius: 999 },
  badgeTxt:     { fontSize: 10, fontWeight: '800' },

  // Search
  searchWrap:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  searchInput: { flex: 1, fontSize: 14, color: '#0f172a', fontWeight: '500' },

  // Business cards
  card:        { backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', gap: 12 },
  cardTop:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon:    { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bizName:     { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  chipRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  chip:        { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  chipTxt:     { fontSize: 11, fontWeight: '700' },
  statusWrap:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusDot:   { width: 7, height: 7, borderRadius: 999 },
  statusTxt:   { fontSize: 11, fontWeight: '700' },
  metaRow:     { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  metaItem:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTxt:     { fontSize: 12, color: '#64748b', fontWeight: '500' },
  actions:     { flexDirection: 'row', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  assignBtn:   { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 10, backgroundColor: '#eef2ff' },
  assignTxt:   { fontSize: 12, fontWeight: '700', color: '#4f46e5' },
  removeBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 10, backgroundColor: '#fff1f2' },
  removeTxt:   { fontSize: 12, fontWeight: '700', color: '#e11d48' },
  emptyState:  { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText:   { fontSize: 16, fontWeight: '700', color: '#64748b' },
  emptySub:    { fontSize: 13, color: '#94a3b8', textAlign: 'center' },

  // Modal
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:       { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 10, paddingBottom: 40 },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 },
  sheetTitle:  { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  sheetSub:    { fontSize: 13, color: '#64748b', fontWeight: '600', marginTop: 2 },
  sheetHint:   { fontSize: 13, color: '#64748b', fontWeight: '500' },
  indOpt:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1.5, borderColor: '#e2e8f0', marginBottom: 8 },
  indOptIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  indOptTxt:   { flex: 1, fontSize: 14, fontWeight: '600', color: '#0f172a' },
  saveBtn:     { backgroundColor: '#4f46e5', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  saveBtnTxt:  { fontSize: 15, fontWeight: '800', color: '#fff' },
});
