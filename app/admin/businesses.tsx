import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, StatusBar, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { api } from '@/lib/api';

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

type IndustryControl = {
  id: number;
  industry: string;
  label: string;
  is_visible: boolean;
};

const INDUSTRY_META: Record<string, { icon: React.ComponentProps<typeof MaterialIcons>['name']; color: string; bg: string }> = {
  banking:    { icon: 'account-balance', color: '#2563eb', bg: '#eff6ff' },
  healthcare: { icon: 'local-hospital',  color: '#e11d48', bg: '#fff1f2' },
  retail:     { icon: 'shopping-bag',    color: '#d97706', bg: '#fffbeb' },
  government: { icon: 'gavel',           color: '#475569', bg: '#f1f5f9' },
  education:  { icon: 'school',          color: '#0d9488', bg: '#f0fdfa' },
  corporate:  { icon: 'business',        color: '#7c3aed', bg: '#f5f3ff' },
};

const INDUSTRY_OPTIONS = ['banking', 'healthcare', 'retail', 'government', 'education', 'corporate'];
const INDUSTRY_LABELS:  Record<string, string> = {
  banking: 'Banking', healthcare: 'Healthcare', retail: 'Retail',
  government: 'Government', education: 'Education', corporate: 'Corporate',
};

export default function Businesses() {
  const router = useRouter();
  const [businesses,  setBizs]      = useState<Business[]>([]);
  const [controls,    setControls]  = useState<IndustryControl[]>([]);
  const [search,      setSearch]    = useState('');
  const [loading,     setLoading]   = useState(true);
  const [toggling,    setToggling]  = useState<string | null>(null);
  const [assignModal, setAssignModal] = useState<{ bizId: number; current: string } | null>(null);
  const [assigning,   setAssigning]  = useState(false);

  const fetchAll = useCallback(async () => {
    const [bizRes, ctrlRes] = await Promise.all([
      api.get<Business[] | { results: Business[] }>('/businesses/'),
      api.get<IndustryControl[]>('/businesses/industry-controls/'),
    ]);
    setBizs(Array.isArray(bizRes.data) ? bizRes.data : (bizRes.data as any)?.results ?? []);
    setControls(Array.isArray(ctrlRes.data) ? ctrlRes.data : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = businesses.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.industry.toLowerCase().includes(search.toLowerCase())
  );

  const toggleIndustry = async (industry: string, currentVal: boolean) => {
    setToggling(industry);
    const { error } = await api.patch(`/businesses/industry-controls/${industry}/`, { is_visible: !currentVal });
    if (error) { Alert.alert('Error', error); }
    else {
      setControls(prev => prev.map(c =>
        c.industry === industry ? { ...c, is_visible: !currentVal } : c
      ));
    }
    setToggling(null);
  };

  const assignIndustry = async (bizId: number, industry: string) => {
    setAssigning(true);
    const { error } = await api.patch(`/businesses/${bizId}/`, { industry });
    if (error) { Alert.alert('Error', error); }
    else {
      setBizs(prev => prev.map(b => b.id === bizId ? { ...b, industry } : b));
      setAssignModal(null);
    }
    setAssigning(false);
  };

  const remove = (id: number) => {
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Businesses</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchAll}>
          <MaterialIcons name="refresh" size={22} color="#64748b" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* ── Industry Visibility Controls ─────────────────────────────── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="visibility" size={18} color="#4f46e5" />
              <Text style={styles.sectionTitle}>Customer Industry Access</Text>
            </View>
            <Text style={styles.sectionSub}>
              Toggle which industries customers can see and use in the app.
            </Text>
            <View style={styles.industryGrid}>
              {controls.map(ctrl => {
                const meta = INDUSTRY_META[ctrl.industry] ?? INDUSTRY_META.corporate;
                const isOn = ctrl.is_visible;
                return (
                  <TouchableOpacity
                    key={ctrl.industry}
                    style={[styles.industryToggle, isOn ? styles.industryToggleOn : styles.industryToggleOff]}
                    onPress={() => toggleIndustry(ctrl.industry, isOn)}
                    disabled={toggling === ctrl.industry}
                    activeOpacity={0.8}
                  >
                    {toggling === ctrl.industry ? (
                      <ActivityIndicator size="small" color={isOn ? '#fff' : '#94a3b8'} />
                    ) : (
                      <MaterialIcons
                        name={meta.icon}
                        size={18}
                        color={isOn ? '#fff' : '#94a3b8'}
                      />
                    )}
                    <Text style={[styles.industryToggleTxt, { color: isOn ? '#fff' : '#94a3b8' }]}>
                      {ctrl.label}
                    </Text>
                    <View style={[styles.onOffPill, isOn ? styles.onPill : styles.offPill]}>
                      <Text style={[styles.onOffTxt, { color: isOn ? '#059669' : '#94a3b8' }]}>
                        {isOn ? 'ON' : 'OFF'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Search ───────────────────────────────────────────────────── */}
          <View style={styles.searchWrap}>
            <MaterialIcons name="search" size={18} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
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
            const meta = INDUSTRY_META[biz.industry] ?? INDUSTRY_META.corporate;
            return (
              <View key={biz.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={[styles.cardIcon, { backgroundColor: meta.bg }]}>
                    <MaterialIcons name={meta.icon} size={20} color={meta.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bizName}>{biz.name}</Text>
                    <View style={styles.industryRow}>
                      <View style={[styles.industryChip, { backgroundColor: meta.bg }]}>
                        <Text style={[styles.industryChipTxt, { color: meta.color }]}>
                          {INDUSTRY_LABELS[biz.industry] ?? biz.industry}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={[styles.statusDotWrap, { backgroundColor: biz.status === 'active' ? '#ecfdf5' : '#f1f5f9' }]}>
                    <View style={[styles.statusDot, { backgroundColor: biz.status === 'active' ? '#059669' : '#94a3b8' }]} />
                    <Text style={[styles.statusTxt, { color: biz.status === 'active' ? '#059669' : '#94a3b8' }]}>
                      {biz.status.charAt(0).toUpperCase() + biz.status.slice(1)}
                    </Text>
                  </View>
                </View>

                {(biz.email || biz.phone) && (
                  <View style={styles.metaRow}>
                    {biz.email ? (
                      <View style={styles.metaItem}>
                        <MaterialIcons name="email" size={12} color="#94a3b8" />
                        <Text style={styles.metaText}>{biz.email}</Text>
                      </View>
                    ) : null}
                    {biz.phone ? (
                      <View style={styles.metaItem}>
                        <MaterialIcons name="phone" size={12} color="#94a3b8" />
                        <Text style={styles.metaText}>{biz.phone}</Text>
                      </View>
                    ) : null}
                  </View>
                )}

                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.assignBtn}
                    onPress={() => setAssignModal({ bizId: biz.id, current: biz.industry })}
                  >
                    <MaterialIcons name="category" size={14} color="#4f46e5" />
                    <Text style={styles.assignText}>Assign Industry</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.removeBtn} onPress={() => remove(biz.id)}>
                    <MaterialIcons name="delete" size={14} color="#e11d48" />
                    <Text style={styles.removeText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {filtered.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialIcons name="business" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>No businesses registered yet</Text>
              <Text style={styles.emptySub}>Approve business requests to see them here</Text>
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Industry</Text>
              <TouchableOpacity onPress={() => setAssignModal(null)}>
                <MaterialIcons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>
              Choose which industry this business belongs to.{'\n'}
              This controls what services the business can offer.
            </Text>
            {INDUSTRY_OPTIONS.map(key => {
              const meta   = INDUSTRY_META[key];
              const isCurr = assignModal?.current === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.modalOption, isCurr && styles.modalOptionActive]}
                  onPress={() => assignModal && assignIndustry(assignModal.bizId, key)}
                  disabled={assigning}
                  activeOpacity={0.8}
                >
                  <View style={[styles.modalOptionIcon, { backgroundColor: meta.bg }]}>
                    <MaterialIcons name={meta.icon} size={18} color={meta.color} />
                  </View>
                  <Text style={[styles.modalOptionTxt, isCurr && { color: '#4f46e5', fontWeight: '800' }]}>
                    {INDUSTRY_LABELS[key]}
                  </Text>
                  {isCurr && <MaterialIcons name="check-circle" size={18} color="#4f46e5" />}
                  {assigning && isCurr && <ActivityIndicator size="small" color="#4f46e5" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f8fafc' },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  refreshBtn:  { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:     { padding: 16, gap: 14, paddingBottom: 40 },

  // Industry controls section
  sectionCard:   { backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle:  { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  sectionSub:    { fontSize: 12, color: '#64748b', fontWeight: '500', marginTop: -4 },
  industryGrid:  { gap: 8 },
  industryToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1.5,
  },
  industryToggleOn:  { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  industryToggleOff: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' },
  industryToggleTxt: { flex: 1, fontSize: 13, fontWeight: '700' },
  onOffPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  onPill:    { backgroundColor: '#ecfdf5' },
  offPill:   { backgroundColor: '#f1f5f9' },
  onOffTxt:  { fontSize: 10, fontWeight: '800' },

  // Search
  searchWrap:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  searchInput: { flex: 1, fontSize: 14, color: '#0f172a', fontWeight: '500' },

  // Business cards
  card:         { backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', gap: 12 },
  cardTop:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon:     { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bizName:      { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  industryRow:  { flexDirection: 'row', marginTop: 3 },
  industryChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  industryChipTxt: { fontSize: 11, fontWeight: '700' },
  statusDotWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusDot:    { width: 7, height: 7, borderRadius: 999 },
  statusTxt:    { fontSize: 11, fontWeight: '700' },
  metaRow:      { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  metaItem:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:     { fontSize: 12, color: '#64748b', fontWeight: '500' },
  actions:      { flexDirection: 'row', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  assignBtn:    { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 10, backgroundColor: '#eef2ff' },
  assignText:   { fontSize: 12, fontWeight: '700', color: '#4f46e5' },
  removeBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 10, backgroundColor: '#fff1f2' },
  removeText:   { fontSize: 12, fontWeight: '700', color: '#e11d48' },
  emptyState:   { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText:    { fontSize: 16, fontWeight: '700', color: '#64748b' },
  emptySub:     { fontSize: 13, color: '#94a3b8', textAlign: 'center' },

  // Assign industry modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet:   { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 10, paddingBottom: 40 },
  modalHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  modalTitle:   { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  modalSub:     { fontSize: 13, color: '#64748b', fontWeight: '500', lineHeight: 20, marginBottom: 6 },
  modalOption:  { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1.5, borderColor: '#e2e8f0' },
  modalOptionActive: { borderColor: '#4f46e5', backgroundColor: '#eef2ff' },
  modalOptionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modalOptionTxt:  { flex: 1, fontSize: 14, fontWeight: '600', color: '#0f172a' },
});
