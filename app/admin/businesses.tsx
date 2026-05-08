import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

type Plan = 'Basic' | 'Pro' | 'Enterprise';

type Business = {
  id: number;
  name: string;
  industry: string;
  branches: number;
  employees: number;
  status: 'Active' | 'Inactive';
  plan: Plan;
};

const MOCK: Business[] = [
  { id: 1, name: 'First National Bank',  industry: 'Banking & Finance', branches: 5, employees: 45,  status: 'Active',   plan: 'Enterprise' },
  { id: 2, name: 'City Health Clinic',   industry: 'Healthcare',        branches: 2, employees: 12,  status: 'Active',   plan: 'Pro' },
  { id: 3, name: 'MegaMart Retail',      industry: 'Retail',            branches: 8, employees: 120, status: 'Active',   plan: 'Enterprise' },
  { id: 4, name: 'City Council Office',  industry: 'Government',        branches: 3, employees: 30,  status: 'Inactive', plan: 'Basic' },
  { id: 5, name: 'Sunrise University',   industry: 'Education',         branches: 1, employees: 85,  status: 'Active',   plan: 'Pro' },
];

const PLAN_STYLE: Record<Plan, { color: string; bg: string }> = {
  Basic:      { color: '#64748b', bg: '#f1f5f9' },
  Pro:        { color: '#2563eb', bg: '#eff6ff' },
  Enterprise: { color: '#7c3aed', bg: '#f5f3ff' },
};

type FormState = { name: string; industry: string; branches: string; employees: string };

export default function Businesses() {
  const router = useRouter();
  const [businesses, setBizs] = useState(MOCK);
  const [search, setSearch]   = useState('');
  const [showModal, setModal] = useState(false);
  const [editing, setEditing] = useState<Business | null>(null);
  const [form, setForm]       = useState<FormState>({ name: '', industry: '', branches: '', employees: '' });

  const filtered = businesses.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.industry.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', industry: '', branches: '', employees: '' });
    setModal(true);
  };

  const openEdit = (b: Business) => {
    setEditing(b);
    setForm({ name: b.name, industry: b.industry, branches: String(b.branches), employees: String(b.employees) });
    setModal(true);
  };

  const save = () => {
    if (!form.name.trim() || !form.industry.trim()) {
      Alert.alert('Error', 'Name and industry are required.');
      return;
    }
    if (editing) {
      setBizs(prev => prev.map(b => b.id === editing.id
        ? { ...b, name: form.name, industry: form.industry, branches: Number(form.branches) || b.branches, employees: Number(form.employees) || b.employees }
        : b
      ));
    } else {
      setBizs(prev => [...prev, {
        id: Date.now(),
        name: form.name,
        industry: form.industry,
        branches: Number(form.branches) || 1,
        employees: Number(form.employees) || 0,
        status: 'Active',
        plan: 'Basic',
      }]);
    }
    setModal(false);
  };

  const remove = (id: number) => {
    Alert.alert('Remove Business', 'Remove this business from the platform?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => setBizs(prev => prev.filter(b => b.id !== id)),
      },
    ]);
  };

  const setField = (key: keyof FormState) => (val: string) =>
    setForm(prev => ({ ...prev, [key]: val }));

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Businesses</Text>
        <TouchableOpacity onPress={openAdd} style={styles.addBtn}>
          <MaterialIcons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

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

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {filtered.map(biz => {
          const ps = PLAN_STYLE[biz.plan];
          return (
            <View key={biz.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.cardIcon}>
                  <MaterialIcons name="business" size={20} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bizName}>{biz.name}</Text>
                  <Text style={styles.bizIndustry}>{biz.industry}</Text>
                </View>
                <View style={[styles.planBadge, { backgroundColor: ps.bg }]}>
                  <Text style={[styles.planText, { color: ps.color }]}>{biz.plan}</Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <MaterialIcons name="location-on" size={13} color="#94a3b8" />
                  <Text style={styles.statText}>{biz.branches} branches</Text>
                </View>
                <View style={styles.statItem}>
                  <MaterialIcons name="group" size={13} color="#94a3b8" />
                  <Text style={styles.statText}>{biz.employees} employees</Text>
                </View>
                <View style={styles.statItem}>
                  <View style={[styles.statusDot, { backgroundColor: biz.status === 'Active' ? '#059669' : '#94a3b8' }]} />
                  <Text style={[styles.statText, { color: biz.status === 'Active' ? '#059669' : '#94a3b8' }]}>
                    {biz.status}
                  </Text>
                </View>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(biz)}>
                  <MaterialIcons name="edit" size={14} color="#2563eb" />
                  <Text style={styles.editText}>Edit</Text>
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
            <Text style={styles.emptyText}>No businesses found</Text>
          </View>
        )}
      </ScrollView>

      {/* Add / Edit modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setModal(false)} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{editing ? 'Edit Business' : 'Add Business'}</Text>

            {[
              { label: 'Business Name',        key: 'name'      as const, kb: 'default'  as const },
              { label: 'Industry',             key: 'industry'  as const, kb: 'default'  as const },
              { label: 'Branches',             key: 'branches'  as const, kb: 'numeric'  as const },
              { label: 'Employees',            key: 'employees' as const, kb: 'numeric'  as const },
            ].map(f => (
              <View key={f.key} style={styles.field}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={form[f.key]}
                  onChangeText={setField(f.key)}
                  keyboardType={f.kb}
                  placeholderTextColor="#94a3b8"
                  placeholder={f.label}
                />
              </View>
            ))}

            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={save}>
                <Text style={styles.saveText}>{editing ? 'Save' : 'Add'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0f172a', fontWeight: '500' },

  content: { paddingHorizontal: 16, gap: 12, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bizName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  bizIndustry: { fontSize: 12, color: '#64748b', fontWeight: '500', marginTop: 2 },
  planBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  planText: { fontSize: 11, fontWeight: '700' },

  statsRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },

  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
  },
  editText: { fontSize: 12, fontWeight: '700', color: '#2563eb' },
  removeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#fff1f2',
  },
  removeText: { fontSize: 12, fontWeight: '700', color: '#e11d48' },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, fontWeight: '600', color: '#94a3b8' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    gap: 14,
  },
  sheetTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#334155' },
  fieldInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },
  sheetActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  cancelText: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#059669',
    alignItems: 'center',
  },
  saveText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
