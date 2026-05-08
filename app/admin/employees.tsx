import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import BottomNav from '@/components/BottomNav';

// ─── Types ────────────────────────────────────────────────────────────────────
type WorkingStatus  = 'Working Now' | 'Off Duty';
type EmployeeStatus = 'Active' | 'Inactive';

type Employee = {
  id: number;
  name: string;
  email: string;
  role: string;
  industry: string;
  counter: number;
  workingStatus: WorkingStatus;
  status: EmployeeStatus;
};

// ─── Static data ──────────────────────────────────────────────────────────────
const INDUSTRY_LIST = [
  'Banking & Finance',
  'Healthcare',
  'Retail',
  'Government Services',
  'Education',
  'Corporate Office',
];

const INDUSTRIES = ['All', ...INDUSTRY_LIST];

const WORKING_FILTERS = ['All', 'Working Now', 'Off Duty'] as const;
type WorkingFilter = typeof WORKING_FILTERS[number];

const INITIAL_EMPLOYEES: Employee[] = [
  { id: 1, name: 'Sarah Mitchell',  email: 'sarah.mitchell@bank.com', role: 'Teller',          industry: 'Banking & Finance',   counter: 3, workingStatus: 'Working Now', status: 'Active'   },
  { id: 2, name: 'James Okafor',    email: 'j.okafor@hospital.org',   role: 'Receptionist',     industry: 'Healthcare',          counter: 1, workingStatus: 'Working Now', status: 'Active'   },
  { id: 3, name: 'Linda Cruz',      email: 'l.cruz@retail.com',       role: 'Customer Service', industry: 'Retail',              counter: 5, workingStatus: 'Off Duty',    status: 'Active'   },
  { id: 4, name: 'Michael Yeboah',  email: 'm.yeboah@gov.ng',         role: 'Clerk',            industry: 'Government Services', counter: 2, workingStatus: 'Working Now', status: 'Active'   },
  { id: 5, name: 'Grace Tan',       email: 'g.tan@edu.ph',            role: 'Registrar',        industry: 'Education',           counter: 4, workingStatus: 'Off Duty',    status: 'Inactive' },
  { id: 6, name: 'Daniel Park',     email: 'd.park@corp.com',         role: 'IT Support',       industry: 'Corporate Office',    counter: 2, workingStatus: 'Working Now', status: 'Active'   },
  { id: 7, name: 'Amina Hassan',    email: 'a.hassan@bank.com',       role: 'Senior Teller',    industry: 'Banking & Finance',   counter: 1, workingStatus: 'Off Duty',    status: 'Active'   },
  { id: 8, name: 'Carlos Reyes',    email: 'c.reyes@hospital.org',    role: 'Nurse',            industry: 'Healthcare',          counter: 6, workingStatus: 'Working Now', status: 'Active'   },
];

const INDUSTRY_COLORS: Record<string, { color: string; bg: string }> = {
  'Banking & Finance':   { color: '#2563eb', bg: '#eff6ff' },
  Healthcare:            { color: '#059669', bg: '#ecfdf5' },
  Retail:                { color: '#f97316', bg: '#fff7ed' },
  'Government Services': { color: '#475569', bg: '#f1f5f9' },
  Education:             { color: '#4f46e5', bg: '#eef2ff' },
  'Corporate Office':    { color: '#7c3aed', bg: '#f5f3ff' },
};

// ─── FormField — MUST be outside the main component so React doesn't remount ──
type FormFieldProps = {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  error?: string;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  autoCapitalize?: 'none' | 'words' | 'sentences';
};

function FormField({ label, value, onChangeText, placeholder, error, keyboardType = 'default', autoCapitalize = 'words' }: FormFieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : undefined]}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function EmployeeManagement() {
  const router = useRouter();

  const [employees,        setEmployees]        = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [selectedIndustry, setSelectedIndustry] = useState('All');
  const [workingFilter,    setWorkingFilter]    = useState<WorkingFilter>('All');
  const [modalVisible,     setModalVisible]     = useState(false);

  // Form fields as individual state values — avoids object spread re-render issues
  const [fName,          setFName]          = useState('');
  const [fEmail,         setFEmail]         = useState('');
  const [fRole,          setFRole]          = useState('');
  const [fCounter,       setFCounter]       = useState('1');
  const [fIndustry,      setFIndustry]      = useState(INDUSTRY_LIST[0]);
  const [fWorkingStatus, setFWorkingStatus] = useState<WorkingStatus>('Working Now');
  const [fEmpStatus,     setFEmpStatus]     = useState<EmployeeStatus>('Active');
  const [errors,         setErrors]         = useState<Record<string, string>>({});

  // ── Filtering ────────────────────────────────────────────────────────────
  const filtered = employees.filter(emp => {
    const industryOk = selectedIndustry === 'All' || emp.industry === selectedIndustry;
    const workingOk  = workingFilter    === 'All' || emp.workingStatus === workingFilter;
    return industryOk && workingOk;
  });

  const workingCount = filtered.filter(e => e.workingStatus === 'Working Now').length;
  const offCount     = filtered.filter(e => e.workingStatus === 'Off Duty').length;

  // ── Modal helpers ────────────────────────────────────────────────────────
  const openModal = () => {
    setFName('');
    setFEmail('');
    setFRole('');
    setFCounter('1');
    setFIndustry(INDUSTRY_LIST[0]);
    setFWorkingStatus('Working Now');
    setFEmpStatus('Active');
    setErrors({});
    setModalVisible(true);
  };

  const handleAdd = () => {
    const e: Record<string, string> = {};
    if (!fName.trim())  e.name    = 'Full name is required';
    if (!fEmail.trim()) e.email   = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(fEmail)) e.email = 'Enter a valid email address';
    if (!fRole.trim())  e.role    = 'Role is required';
    const num = parseInt(fCounter, 10);
    if (!fCounter.trim() || isNaN(num) || num < 1) e.counter = 'Enter a valid counter number (min 1)';

    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }

    const newEmployee: Employee = {
      id: Date.now(),
      name: fName.trim(),
      email: fEmail.trim(),
      role: fRole.trim(),
      industry: fIndustry,
      counter: num,
      workingStatus: fWorkingStatus,
      status: fEmpStatus,
    };

    setEmployees(prev => [newEmployee, ...prev]);
    setModalVisible(false);
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      'Remove Employee',
      'Are you sure you want to remove this employee?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => setEmployees(prev => prev.filter(e => e.id !== id)) },
      ],
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ─────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/admin/dashboard' as any)}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={16} color="#64748b" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.headerRow}>
          <View style={styles.headerTitles}>
            <Text style={styles.title}>Employees</Text>
            <Text style={styles.subtitle}>Manage staff across all industries</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={openModal} activeOpacity={0.8}>
            <MaterialIcons name="person-add" size={16} color="#fff" />
            <Text style={styles.addButtonText}>Add Employee</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── List ───────────────────────────────────────────── */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Industry pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsRow}
          style={styles.pillsScroll}
        >
          {INDUSTRIES.map(ind => (
            <TouchableOpacity
              key={ind}
              style={[styles.pill, selectedIndustry === ind && styles.pillActive]}
              onPress={() => setSelectedIndustry(ind)}
              activeOpacity={0.75}
            >
              <Text style={[styles.pillText, selectedIndustry === ind && styles.pillTextActive]}>{ind}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Working status tabs */}
        <View style={styles.tabRow}>
          {WORKING_FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.tab, workingFilter === f && styles.tabActive]}
              onPress={() => setWorkingFilter(f)}
              activeOpacity={0.75}
            >
              {f !== 'All' && (
                <View style={[styles.statusDot, { backgroundColor: f === 'Working Now' ? '#059669' : '#94a3b8' }]} />
              )}
              <Text style={[styles.tabText, workingFilter === f && styles.tabTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary row */}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>
            Showing <Text style={styles.summaryBold}>{filtered.length}</Text>{' '}
            {filtered.length === 1 ? 'employee' : 'employees'}
          </Text>
          <Text style={styles.summaryMeta}>
            <Text style={styles.workingCount}>{workingCount} working</Text>
            {'   '}
            <Text style={styles.offCount}>{offCount} off</Text>
          </Text>
        </View>

        {/* Employee cards */}
        {filtered.map(emp => {
          const indStyle  = INDUSTRY_COLORS[emp.industry] ?? { color: '#475569', bg: '#f1f5f9' };
          const isWorking = emp.workingStatus === 'Working Now';

          return (
            <View key={emp.id} style={styles.card}>
              {/* Top row */}
              <View style={styles.cardTop}>
                <View style={[styles.avatar, { backgroundColor: indStyle.bg }]}>
                  <Text style={[styles.avatarText, { color: indStyle.color }]}>
                    {emp.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.cardTopInfo}>
                  <Text style={styles.empName}>{emp.name}</Text>
                  <Text style={styles.empEmail}>{emp.email}</Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(emp.id)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="delete-outline" size={18} color="#be123c" />
                </TouchableOpacity>
              </View>

              {/* Pill tags */}
              <View style={styles.pillTagRow}>
                <View style={styles.rolePill}>
                  <Text style={styles.rolePillText}>{emp.role}</Text>
                </View>
                <View style={[styles.industryPill, { backgroundColor: indStyle.bg }]}>
                  <Text style={[styles.industryPillText, { color: indStyle.color }]}>{emp.industry}</Text>
                </View>
              </View>

              {/* Meta row */}
              <View style={styles.cardMeta}>
                <View style={styles.metaItem}>
                  <MaterialIcons name="tag" size={13} color="#94a3b8" />
                  <Text style={styles.metaText}>Counter {emp.counter}</Text>
                </View>
                <View style={styles.metaItem}>
                  <View style={[styles.statusDotSmall, { backgroundColor: isWorking ? '#059669' : '#94a3b8' }]} />
                  <Text style={[styles.workingLabel, { color: isWorking ? '#059669' : '#94a3b8' }]}>
                    {emp.workingStatus}
                  </Text>
                </View>
                <View style={styles.metaSpacer} />
                <View style={[styles.statusPill, { backgroundColor: emp.status === 'Active' ? '#ecfdf5' : '#fff1f2' }]}>
                  <Text style={[styles.statusPillText, { color: emp.status === 'Active' ? '#059669' : '#be123c' }]}>
                    {emp.status}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}

        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcons name="group" size={44} color="#e2e8f0" />
            <Text style={styles.emptyText}>No employees match these filters.</Text>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      <BottomNav />

      {/* ── Add Employee Modal ──────────────────────────────── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayDismiss} onPress={() => setModalVisible(false)} activeOpacity={1} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.sheet}>

              {/* Sheet header */}
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetTitle}>Add New Employee</Text>
                  <Text style={styles.sheetSubtitle}>Fill in all required fields</Text>
                </View>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                  <MaterialIcons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.sheetBody}
                keyboardShouldPersistTaps="handled"
              >
                <FormField
                  label="Full Name *"
                  value={fName}
                  onChangeText={v => { setFName(v); setErrors(e => ({ ...e, name: '' })); }}
                  placeholder="e.g. John Smith"
                  error={errors.name}
                />

                <FormField
                  label="Email Address *"
                  value={fEmail}
                  onChangeText={v => { setFEmail(v); setErrors(e => ({ ...e, email: '' })); }}
                  placeholder="e.g. john@company.com"
                  error={errors.email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <FormField
                  label="Role / Job Title *"
                  value={fRole}
                  onChangeText={v => { setFRole(v); setErrors(e => ({ ...e, role: '' })); }}
                  placeholder="e.g. Teller, Receptionist, Nurse"
                  error={errors.role}
                />

                <FormField
                  label="Counter Number *"
                  value={fCounter}
                  onChangeText={v => { setFCounter(v); setErrors(e => ({ ...e, counter: '' })); }}
                  placeholder="e.g. 3"
                  error={errors.counter}
                  keyboardType="numeric"
                />

                {/* Industry */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Industry</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.selectorRow}
                    keyboardShouldPersistTaps="handled"
                  >
                    {INDUSTRY_LIST.map(ind => (
                      <TouchableOpacity
                        key={ind}
                        style={[styles.selectorPill, fIndustry === ind && styles.selectorPillActive]}
                        onPress={() => setFIndustry(ind)}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.selectorPillText, fIndustry === ind && styles.selectorPillTextActive]}>
                          {ind}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Working Status */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Working Status</Text>
                  <View style={styles.toggleRow}>
                    {(['Working Now', 'Off Duty'] as WorkingStatus[]).map(ws => (
                      <TouchableOpacity
                        key={ws}
                        style={[styles.toggleBtn, fWorkingStatus === ws && styles.toggleBtnActive]}
                        onPress={() => setFWorkingStatus(ws)}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.toggleDot, { backgroundColor: ws === 'Working Now' ? '#059669' : '#94a3b8' }]} />
                        <Text style={[styles.toggleText, fWorkingStatus === ws && styles.toggleTextActive]}>{ws}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Employee Status */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Employee Status</Text>
                  <View style={styles.toggleRow}>
                    {(['Active', 'Inactive'] as EmployeeStatus[]).map(s => (
                      <TouchableOpacity
                        key={s}
                        style={[styles.toggleBtn, fEmpStatus === s && styles.toggleBtnActive]}
                        onPress={() => setFEmpStatus(s)}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.toggleText, fEmpStatus === s && styles.toggleTextActive]}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Submit */}
                <TouchableOpacity style={styles.submitBtn} onPress={handleAdd} activeOpacity={0.85}>
                  <MaterialIcons name="person-add" size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>Add Employee</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  // Header
  header: {
    backgroundColor: '#fff',
    paddingTop: 16, paddingBottom: 14, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, alignSelf: 'flex-start' },
  backText: { color: '#64748b', fontSize: 14, fontWeight: '700' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headerTitles: { flex: 1 },
  title: { fontSize: 24, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  subtitle: { fontSize: 12, color: '#64748b', marginTop: 3 },
  addButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#2563eb', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
  },
  addButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  content: { paddingBottom: 40 },

  // Industry pills
  pillsScroll: { marginTop: 14, marginBottom: 4 },
  pillsRow: { paddingHorizontal: 20, gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  pillActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  pillText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  pillTextActive: { color: '#fff' },

  // Working status tabs
  tabRow: {
    flexDirection: 'row', marginHorizontal: 20, marginTop: 14, marginBottom: 14,
    backgroundColor: '#f1f5f9', borderRadius: 14, padding: 4, gap: 4,
  },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 10 },
  tabActive: { backgroundColor: '#fff', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 12, fontWeight: '700', color: '#94a3b8' },
  tabTextActive: { color: '#0f172a' },
  statusDot: { width: 7, height: 7, borderRadius: 999 },

  // Summary
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 },
  summaryText: { fontSize: 13, fontWeight: '500', color: '#64748b' },
  summaryBold: { fontWeight: '900', color: '#0f172a' },
  summaryMeta: { fontSize: 12 },
  workingCount: { color: '#059669', fontWeight: '700' },
  offCount: { color: '#94a3b8', fontWeight: '700' },

  // Employee cards
  card: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 20, padding: 16, marginHorizontal: 20, marginBottom: 10, gap: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '900' },
  cardTopInfo: { flex: 1 },
  empName: { fontSize: 14, fontWeight: '900', color: '#0f172a' },
  empEmail: { fontSize: 12, fontWeight: '500', color: '#64748b', marginTop: 2 },
  deleteBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#fff1f2', borderWidth: 1, borderColor: '#ffe4e6', alignItems: 'center', justifyContent: 'center' },

  pillTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rolePill: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  rolePillText: { fontSize: 11, fontWeight: '700', color: '#334155' },
  industryPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  industryPillText: { fontSize: 11, fontWeight: '700' },

  cardMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  metaSpacer: { flex: 1 },
  statusDotSmall: { width: 7, height: 7, borderRadius: 999 },
  workingLabel: { fontSize: 12, fontWeight: '700' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  emptyState: { alignItems: 'center', paddingVertical: 52, gap: 12 },
  emptyText: { fontSize: 14, fontWeight: '500', color: '#94a3b8' },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  overlayDismiss: { flex: 1 },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  sheetTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  sheetSubtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  sheetBody: { padding: 20, gap: 16, paddingBottom: 12 },

  // Form fields
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  input: {
    borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 14, color: '#0f172a', backgroundColor: '#f8fafc',
  },
  inputError: { borderColor: '#e11d48', backgroundColor: '#fff8f8' },
  errorText: { fontSize: 11, color: '#e11d48', fontWeight: '600' },

  selectorRow: { gap: 8, paddingVertical: 2 },
  selectorPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#f1f5f9', borderWidth: 1.5, borderColor: '#e2e8f0' },
  selectorPillActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  selectorPillText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  selectorPillTextActive: { color: '#fff' },

  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 11, borderRadius: 12, backgroundColor: '#f1f5f9',
    borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  toggleBtnActive: { backgroundColor: '#eff6ff', borderColor: '#2563eb' },
  toggleDot: { width: 8, height: 8, borderRadius: 999 },
  toggleText: { fontSize: 13, fontWeight: '700', color: '#94a3b8' },
  toggleTextActive: { color: '#2563eb' },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#2563eb', paddingVertical: 15, borderRadius: 16, marginTop: 4,
  },
  submitBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
