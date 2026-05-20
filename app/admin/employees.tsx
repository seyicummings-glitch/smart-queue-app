import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Modal, TextInput, KeyboardAvoidingView,
  Platform, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import BottomNav from '@/components/BottomNav';
import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type Employee = {
  id: number;
  email: string;
  full_name: string;
  role: 'staff' | 'admin' | 'super_admin';
  phone: string;
  counter_number: number | null;
  assigned_services: number[];
  created_at: string;
};

type BackendService = {
  id: number;
  name: string;
  industry: string;
};

// ─── Same 6 industries + services as the customer-facing app ─────────────────

type IndustryDef = {
  id: string;
  label: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  color: string;
  bg: string;
  services: string[];
};

const INDUSTRY_SERVICES: IndustryDef[] = [
  {
    id: 'banking',
    label: 'Banking & Finance',
    icon: 'account-balance',
    color: '#2563eb',
    bg: '#eff6ff',
    services: ['Teller Services', 'Loan Consultation', 'Customer Service', 'Account Opening', 'Card Services'],
  },
  {
    id: 'healthcare',
    label: 'Healthcare',
    icon: 'local-hospital',
    color: '#e11d48',
    bg: '#fff1f2',
    services: ['General Practitioner', 'Pharmacy Pickup', 'Blood Test / Lab', 'Dental', 'Specialist Consult'],
  },
  {
    id: 'retail',
    label: 'Retail',
    icon: 'shopping-bag',
    color: '#d97706',
    bg: '#fffbeb',
    services: ['Returns & Exchanges', 'Customer Service', 'Tech Support', 'Click & Collect'],
  },
  {
    id: 'government',
    label: 'Government Services',
    icon: 'gavel',
    color: '#475569',
    bg: '#f1f5f9',
    services: ['Document Processing', 'Permits & Licenses', 'General Inquiries', 'ID / Passport Renewal'],
  },
  {
    id: 'education',
    label: 'Education',
    icon: 'school',
    color: '#4f46e5',
    bg: '#eef2ff',
    services: ['Admissions', 'Registrar', 'Financial Aid', 'Library Services'],
  },
  {
    id: 'corporate',
    label: 'Corporate Office',
    icon: 'business',
    color: '#7c3aed',
    bg: '#f5f3ff',
    services: ['Reception', 'HR Services', 'IT Support', 'Facilities'],
  },
];

// Total number of services across all 6 industries — used to detect incomplete seed
const EXPECTED_SERVICE_COUNT = INDUSTRY_SERVICES.reduce((n, ind) => n + ind.services.length, 0);

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  staff:       { label: 'Staff',       color: '#2563eb', bg: '#eff6ff' },
  admin:       { label: 'Admin',       color: '#7c3aed', bg: '#f5f3ff' },
  super_admin: { label: 'Super Admin', color: '#dc2626', bg: '#fff1f2' },
};

function toArr<T>(d: any): T[] {
  return Array.isArray(d) ? d : (d?.results ?? []);
}

// Build a lookup: "name|industry" → backend service ID
function buildNameMap(backendServices: BackendService[]): Map<string, number> {
  const m = new Map<string, number>();
  backendServices.forEach(s => m.set(`${s.name}|${s.industry}`, s.id));
  return m;
}

// Reverse lookup: backend ID → service name
function idToName(id: number, backendServices: BackendService[]): string {
  return backendServices.find(s => s.id === id)?.name ?? String(id);
}

// ─── Service picker ───────────────────────────────────────────────────────────

function ServicePicker({
  nameMap,
  selectedIds,
  onToggleId,
  seeding,
}: {
  nameMap: Map<string, number>;
  selectedIds: number[];
  onToggleId: (id: number) => void;
  seeding: boolean;
}) {
  const [openIndustry, setOpenIndustry] = useState<string | null>(null);

  if (seeding) {
    return (
      <View style={s.seedingBox}>
        <ActivityIndicator size="small" color="#2563eb" />
        <Text style={s.seedingTxt}>Setting up services…</Text>
      </View>
    );
  }

  return (
    <View style={s.industryList}>
      {INDUSTRY_SERVICES.map(ind => {
        const isOpen = openIndustry === ind.id;

        // Count how many services of this industry are selected
        const selectedInIndustry = ind.services.filter(name => {
          const svcId = nameMap.get(`${name}|${ind.id}`);
          return svcId !== undefined && selectedIds.includes(svcId);
        }).length;

        return (
          <View key={ind.id} style={s.industryCard}>
            {/* Industry header row — tap to expand/collapse */}
            <TouchableOpacity
              style={[s.industryHeader, { borderColor: isOpen ? ind.color : '#e2e8f0' }]}
              onPress={() => setOpenIndustry(isOpen ? null : ind.id)}
              activeOpacity={0.8}
            >
              <View style={[s.industryIcon, { backgroundColor: ind.bg }]}>
                <MaterialIcons name={ind.icon} size={18} color={ind.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.industryLabel, { color: ind.color }]}>{ind.label}</Text>
                <Text style={s.industrySub}>
                  {selectedInIndustry > 0
                    ? `${selectedInIndustry} of ${ind.services.length} selected`
                    : `${ind.services.length} services`}
                </Text>
              </View>
              {selectedInIndustry > 0 && (
                <View style={[s.industryBadge, { backgroundColor: ind.bg }]}>
                  <Text style={[s.industryBadgeTxt, { color: ind.color }]}>{selectedInIndustry}</Text>
                </View>
              )}
              <MaterialIcons
                name={isOpen ? 'expand-less' : 'expand-more'}
                size={22}
                color={ind.color}
              />
            </TouchableOpacity>

            {/* Service list — shown when expanded */}
            {isOpen && (
              <View style={s.serviceSubList}>
                {ind.services.map(svcName => {
                  const svcId = nameMap.get(`${svcName}|${ind.id}`);
                  const isSelected = svcId !== undefined && selectedIds.includes(svcId);
                  const available = svcId !== undefined;

                  return (
                    <TouchableOpacity
                      key={svcName}
                      style={[
                        s.svcRow,
                        isSelected && { borderColor: ind.color, backgroundColor: ind.bg },
                        !available && s.svcRowDisabled,
                      ]}
                      onPress={() => available && onToggleId(svcId!)}
                      activeOpacity={available ? 0.75 : 1}
                    >
                      <View style={[
                        s.checkbox,
                        isSelected && { backgroundColor: ind.color, borderColor: ind.color },
                        !available && s.checkboxDisabled,
                      ]}>
                        {isSelected && <MaterialIcons name="check" size={13} color="#fff" />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.svcName, !available && { color: '#cbd5e1' }]}>
                          {svcName}
                        </Text>
                        {!available && (
                          <Text style={s.svcNotReady}>not available yet</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EmployeeManagement() {
  const router = useRouter();

  const [employees,   setEmployees]   = useState<Employee[]>([]);
  const [backendSvcs, setBackendSvcs] = useState<BackendService[]>([]);
  const [nameMap,     setNameMap]     = useState<Map<string, number>>(new Map());
  const [loading,     setLoading]     = useState(true);
  const [seeding,     setSeeding]     = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);
  const [roleFilter,  setRoleFilter]  = useState<'All' | 'staff' | 'admin'>('All');

  // Add employee modal
  const [addModal,    setAddModal]    = useState(false);
  const [fName,       setFName]       = useState('');
  const [fEmail,      setFEmail]      = useState('');
  const [fRole,       setFRole]       = useState<'staff' | 'admin'>('staff');
  const [fPhone,      setFPhone]      = useState('');
  const [fCounter,    setFCounter]    = useState('');
  const [fServices,   setFServices]   = useState<number[]>([]);
  const [fErrors,     setFErrors]     = useState<Record<string, string>>({});
  const [adding,      setAdding]      = useState(false);

  // Edit assignment modal
  const [assignModal,  setAssignModal]  = useState(false);
  const [assignTarget, setAssignTarget] = useState<Employee | null>(null);
  const [aCounter,     setACounter]     = useState('');
  const [aServices,    setAServices]    = useState<number[]>([]);
  const [saving,       setSaving]       = useState(false);

  // ── Load employees + ensure services exist in DB ─────────────────────────

  const loadServices = useCallback(async (): Promise<BackendService[]> => {
    const { data: first } = await api.get<any>('/services/');
    const list = toArr<BackendService>(first ?? []);

    if (list.length >= EXPECTED_SERVICE_COUNT) return list;

    // Missing services — seed then re-fetch (seed uses get_or_create, safe to repeat)
    setSeeding(true);
    await api.post<any>('/services/seed/', {});
    setSeeding(false);

    const { data: fresh } = await api.get<any>('/services/');
    return toArr<BackendService>(fresh ?? list);
  }, []);

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);

    const [empRes, svcs] = await Promise.all([
      api.get<any>('/accounts/employees/'),
      loadServices(),
    ]);

    if (empRes.data != null) setEmployees(toArr<Employee>(empRes.data));
    setBackendSvcs(svcs);
    setNameMap(buildNameMap(svcs));

    setLoading(false);
    setRefreshing(false);
  }, [loadServices]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Derived ──────────────────────────────────────────────────────────────

  const filtered = employees.filter(e =>
    roleFilter === 'All' ? true : e.role === roleFilter,
  );

  // ── Add employee ─────────────────────────────────────────────────────────

  const openAdd = () => {
    setFName(''); setFEmail(''); setFRole('staff');
    setFPhone(''); setFCounter(''); setFServices([]); setFErrors({});
    setAddModal(true);
  };

  const handleAdd = async () => {
    const e: Record<string, string> = {};
    if (!fName.trim())  e.name  = 'Name is required';
    if (!fEmail.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(fEmail)) e.email = 'Enter a valid email';
    if (fCounter.trim() && (isNaN(parseInt(fCounter, 10)) || parseInt(fCounter, 10) < 1))
      e.counter = 'Counter must be a number ≥ 1';
    if (Object.keys(e).length > 0) { setFErrors(e); return; }

    setAdding(true);
    const body: Record<string, unknown> = {
      full_name:         fName.trim(),
      email:             fEmail.trim().toLowerCase(),
      role:              fRole,
      phone:             fPhone.trim() || '0000000000',
      password:          'changeme',
      assigned_services: fServices,
    };
    if (fCounter.trim()) body.counter_number = parseInt(fCounter, 10);

    const { error } = await api.post('/accounts/employees/', body);
    setAdding(false);
    if (error) { Alert.alert('Error', error); return; }
    setAddModal(false);
    Alert.alert('Employee Added', `${fName.trim()} has been added.\nDefault password: changeme`);
    fetchAll(true);
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = (emp: Employee) => {
    Alert.alert('Remove Employee', `Remove ${emp.full_name} from the system?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          const { error } = await api.delete(`/accounts/employees/${emp.id}/`);
          if (error) { Alert.alert('Error', error); return; }
          fetchAll(true);
        },
      },
    ]);
  };

  // ── Edit assignment ───────────────────────────────────────────────────────

  const openAssign = (emp: Employee) => {
    setAssignTarget(emp);
    setACounter(emp.counter_number != null ? String(emp.counter_number) : '');
    setAServices(emp.assigned_services ?? []);
    setAssignModal(true);
  };

  const handleSaveAssign = async () => {
    if (!assignTarget) return;
    const num = parseInt(aCounter, 10);
    if (aCounter.trim() && (isNaN(num) || num < 1)) {
      Alert.alert('Invalid Counter', 'Counter must be a number ≥ 1'); return;
    }
    setSaving(true);
    const body: Record<string, unknown> = { assigned_services: aServices };
    body.counter_number = aCounter.trim() ? num : null;

    const { error } = await api.patch(`/accounts/employees/${assignTarget.id}/`, body);
    setSaving(false);
    if (error) { Alert.alert('Error', error); return; }
    setAssignModal(false);
    fetchAll(true);
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.replace('/admin/dashboard' as any)} style={s.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.headerTitle}>Employees</Text>
          <Text style={s.headerSub}>{employees.length} member{employees.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={openAdd} activeOpacity={0.8}>
          <MaterialIcons name="person-add" size={16} color="#fff" />
          <Text style={s.addBtnText}>Add Staff</Text>
        </TouchableOpacity>
      </View>

      {/* Role filter */}
      <View style={s.filterRow}>
        {(['All', 'staff', 'admin'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[s.filterChip, roleFilter === f && s.filterChipActive]}
            onPress={() => setRoleFilter(f)}
          >
            <Text style={[s.filterChipTxt, roleFilter === f && s.filterChipTxtActive]}>
              {f === 'All' ? 'All' : f === 'staff' ? 'Staff' : 'Admin'}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={{ flex: 1 }} />
        <Text style={s.countLabel}>{filtered.length} shown</Text>
      </View>

      {/* List */}
      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={s.loadingTxt}>{seeding ? 'Setting up services…' : 'Loading…'}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchAll(true); }}
              tintColor="#2563eb"
            />
          }
        >
          {filtered.length === 0 ? (
            <View style={s.empty}>
              <MaterialIcons name="group" size={52} color="#cbd5e1" />
              <Text style={s.emptyTitle}>No employees found</Text>
              <Text style={s.emptySub}>Tap "Add Staff" to add your first employee</Text>
            </View>
          ) : filtered.map(emp => {
            const roleStyle = ROLE_STYLE[emp.role] ?? ROLE_STYLE.staff;
            const empSvcNames = (emp.assigned_services ?? [])
              .map(id => idToName(id, backendSvcs))
              .filter(Boolean);

            return (
              <View key={emp.id} style={s.card}>
                {/* Top row */}
                <View style={s.cardTop}>
                  <View style={[s.avatar, { backgroundColor: roleStyle.bg }]}>
                    <Text style={[s.avatarTxt, { color: roleStyle.color }]}>
                      {(emp.full_name || emp.email).charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.empName}>{emp.full_name || '—'}</Text>
                    <Text style={s.empEmail}>{emp.email}</Text>
                  </View>
                  <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(emp)}>
                    <MaterialIcons name="delete-outline" size={18} color="#be123c" />
                  </TouchableOpacity>
                </View>

                {/* Badges */}
                <View style={s.badgeRow}>
                  <View style={[s.badge, { backgroundColor: roleStyle.bg }]}>
                    <Text style={[s.badgeTxt, { color: roleStyle.color }]}>{roleStyle.label}</Text>
                  </View>
                  {emp.counter_number != null && (
                    <View style={s.counterBadge}>
                      <MaterialIcons name="tag" size={11} color="#2563eb" />
                      <Text style={s.counterTxt}>Counter {emp.counter_number}</Text>
                    </View>
                  )}
                  {!!emp.phone && emp.phone !== '0000000000' && (
                    <View style={s.phoneBadge}>
                      <MaterialIcons name="phone" size={11} color="#64748b" />
                      <Text style={s.phoneTxt}>{emp.phone}</Text>
                    </View>
                  )}
                </View>

                {/* Assigned services */}
                {empSvcNames.length > 0 && (
                  <View style={s.servicesRow}>
                    <MaterialIcons name="room-service" size={12} color="#94a3b8" />
                    <View style={s.serviceTagsWrap}>
                      {empSvcNames.map(n => (
                        <View key={n} style={s.svcTag}>
                          <Text style={s.svcTagTxt}>{n}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Assign / Edit button */}
                <TouchableOpacity style={s.assignBtn} onPress={() => openAssign(emp)} activeOpacity={0.8}>
                  <MaterialIcons name="edit" size={13} color="#2563eb" />
                  <Text style={s.assignBtnTxt}>
                    {emp.counter_number == null && empSvcNames.length === 0
                      ? 'Assign Counter & Services'
                      : 'Edit Assignment'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}

          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      <BottomNav />

      {/* ── Add Employee Modal ──────────────────────────────── */}
      <Modal visible={addModal} animationType="slide" transparent onRequestClose={() => setAddModal(false)}>
        <View style={s.overlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setAddModal(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={s.sheet}>
              <View style={s.sheetHead}>
                <View>
                  <Text style={s.sheetTitle}>Add Employee</Text>
                  <Text style={s.sheetSub}>Default password: changeme</Text>
                </View>
                <TouchableOpacity onPress={() => setAddModal(false)} style={s.closeBtn}>
                  <MaterialIcons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={s.sheetBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={s.field}>
                  <Text style={s.fieldLbl}>Full Name *</Text>
                  <TextInput
                    style={[s.input, fErrors.name && s.inputErr]}
                    placeholder="e.g. Seyi Andrew"
                    placeholderTextColor="#94a3b8"
                    value={fName}
                    onChangeText={v => { setFName(v); setFErrors(p => ({ ...p, name: '' })); }}
                    autoCapitalize="words"
                  />
                  {!!fErrors.name && <Text style={s.errTxt}>{fErrors.name}</Text>}
                </View>

                <View style={s.field}>
                  <Text style={s.fieldLbl}>Email Address *</Text>
                  <TextInput
                    style={[s.input, fErrors.email && s.inputErr]}
                    placeholder="e.g. staff@company.com"
                    placeholderTextColor="#94a3b8"
                    value={fEmail}
                    onChangeText={v => { setFEmail(v); setFErrors(p => ({ ...p, email: '' })); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  {!!fErrors.email && <Text style={s.errTxt}>{fErrors.email}</Text>}
                </View>

                <View style={s.field}>
                  <Text style={s.fieldLbl}>Phone (optional)</Text>
                  <TextInput
                    style={s.input}
                    placeholder="e.g. +1 555 000 0000"
                    placeholderTextColor="#94a3b8"
                    value={fPhone}
                    onChangeText={v => setFPhone(v.replace(/[^0-9]/g, '').slice(0, 10))}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={s.field}>
                  <Text style={s.fieldLbl}>Role</Text>
                  <View style={s.toggleRow}>
                    {(['staff', 'admin'] as const).map(r => (
                      <TouchableOpacity
                        key={r}
                        style={[s.toggleBtn, fRole === r && s.toggleBtnActive]}
                        onPress={() => setFRole(r)}
                      >
                        <Text style={[s.toggleTxt, fRole === r && s.toggleTxtActive]}>
                          {r === 'staff' ? 'Staff' : 'Admin'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={s.field}>
                  <Text style={s.fieldLbl}>Counter Number (optional)</Text>
                  <TextInput
                    style={[s.input, fErrors.counter && s.inputErr]}
                    placeholder="e.g. 1"
                    placeholderTextColor="#94a3b8"
                    value={fCounter}
                    onChangeText={v => { setFCounter(v); setFErrors(p => ({ ...p, counter: '' })); }}
                    keyboardType="numeric"
                  />
                  {!!fErrors.counter && <Text style={s.errTxt}>{fErrors.counter}</Text>}
                </View>

                <View style={s.field}>
                  <View style={s.fieldLblRow}>
                    <Text style={s.fieldLbl}>Assign Services (optional)</Text>
                    {fServices.length > 0 && (
                      <TouchableOpacity onPress={() => setFServices([])}>
                        <Text style={s.clearTxt}>Clear all</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <ServicePicker
                    nameMap={nameMap}
                    selectedIds={fServices}
                    onToggleId={id => setFServices(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                    seeding={seeding}
                  />
                </View>

                <TouchableOpacity style={[s.submitBtn, adding && { opacity: 0.6 }]} onPress={handleAdd} disabled={adding}>
                  {adding
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <><MaterialIcons name="person-add" size={18} color="#fff" /><Text style={s.submitBtnTxt}>Add Employee</Text></>
                  }
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ── Edit Assignment Modal ────────────────────────────── */}
      <Modal visible={assignModal} animationType="slide" transparent onRequestClose={() => setAssignModal(false)}>
        <View style={s.overlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setAssignModal(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={s.sheet}>
              <View style={s.sheetHead}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={s.sheetTitle} numberOfLines={1}>
                    Edit — {assignTarget?.full_name || assignTarget?.email}
                  </Text>
                  <Text style={s.sheetSub}>Update counter and service assignments</Text>
                </View>
                <TouchableOpacity onPress={() => setAssignModal(false)} style={s.closeBtn}>
                  <MaterialIcons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={s.sheetBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={s.field}>
                  <Text style={s.fieldLbl}>Counter Number</Text>
                  <TextInput
                    style={s.input}
                    placeholder="e.g. 1  (leave blank to unassign)"
                    placeholderTextColor="#94a3b8"
                    value={aCounter}
                    onChangeText={setACounter}
                    keyboardType="numeric"
                  />
                </View>

                <View style={s.field}>
                  <View style={s.fieldLblRow}>
                    <Text style={s.fieldLbl}>Allowed Services</Text>
                    <View style={s.selectionRow}>
                      <TouchableOpacity onPress={() => {
                        const allIds = backendSvcs.map(sv => sv.id);
                        setAServices(allIds);
                      }}>
                        <Text style={s.selectAllTxt}>Select all</Text>
                      </TouchableOpacity>
                      <Text style={s.sepDot}>·</Text>
                      <TouchableOpacity onPress={() => setAServices([])}>
                        <Text style={s.clearTxt}>Clear</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <ServicePicker
                    nameMap={nameMap}
                    selectedIds={aServices}
                    onToggleId={id => setAServices(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                    seeding={seeding}
                  />
                </View>

                <TouchableOpacity style={[s.submitBtn, saving && { opacity: 0.6 }]} onPress={handleSaveAssign} disabled={saving}>
                  {saving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <><MaterialIcons name="save" size={18} color="#fff" /><Text style={s.submitBtnTxt}>Save Changes</Text></>
                  }
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

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  headerSub: { fontSize: 12, color: '#64748b', fontWeight: '500', marginTop: 1 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#2563eb', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  filterRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  filterChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  filterChipTxt: { fontSize: 12, fontWeight: '700', color: '#475569' },
  filterChipTxtActive: { color: '#fff' },
  countLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },

  content: { padding: 16, gap: 12, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingTxt: { fontSize: 14, color: '#94a3b8', fontWeight: '500' },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#64748b' },
  emptySub: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },

  card: {
    backgroundColor: '#fff', borderRadius: 18, borderWidth: 1,
    borderColor: '#e2e8f0', padding: 16, gap: 10,
    shadowColor: '#0f172a', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 18, fontWeight: '900' },
  empName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  empEmail: { fontSize: 12, color: '#64748b', fontWeight: '500', marginTop: 1 },
  deleteBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#fff1f2', alignItems: 'center', justifyContent: 'center' },

  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
  counterBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  counterTxt: { fontSize: 11, fontWeight: '700', color: '#2563eb' },
  phoneBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  phoneTxt: { fontSize: 11, fontWeight: '600', color: '#64748b' },

  servicesRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  serviceTagsWrap: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  svcTag: { backgroundColor: '#ecfdf5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  svcTagTxt: { fontSize: 10, fontWeight: '700', color: '#059669' },

  assignBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: '#bfdbfe', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#eff6ff',
  },
  assignBtnTxt: { fontSize: 13, fontWeight: '700', color: '#2563eb' },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '92%', paddingBottom: Platform.OS === 'ios' ? 32 : 20,
  },
  sheetHead: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  sheetSub: { fontSize: 12, color: '#64748b', marginTop: 3 },
  closeBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  sheetBody: { padding: 20, gap: 16, paddingBottom: 12 },

  field: { gap: 6 },
  fieldLblRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fieldLbl: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  selectionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  selectAllTxt: { fontSize: 12, fontWeight: '700', color: '#2563eb' },
  clearTxt: { fontSize: 12, fontWeight: '700', color: '#e11d48' },
  sepDot: { fontSize: 12, color: '#94a3b8' },

  input: {
    borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 14, color: '#0f172a', backgroundColor: '#f8fafc',
  },
  inputErr: { borderColor: '#e11d48', backgroundColor: '#fff8f8' },
  errTxt: { fontSize: 11, color: '#e11d48', fontWeight: '600' },

  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 12,
    backgroundColor: '#f1f5f9', borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  toggleBtnActive: { backgroundColor: '#eff6ff', borderColor: '#2563eb' },
  toggleTxt: { fontSize: 13, fontWeight: '700', color: '#94a3b8' },
  toggleTxtActive: { color: '#2563eb' },

  // Service picker
  seedingBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#f8fafc', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  seedingTxt: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },

  industryList: { gap: 8 },
  industryCard: { borderRadius: 14, overflow: 'hidden' },
  industryHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, backgroundColor: '#fff',
    borderWidth: 1.5, borderRadius: 14,
  },
  industryIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  industryLabel: { fontSize: 13, fontWeight: '800' },
  industrySub: { fontSize: 11, color: '#94a3b8', fontWeight: '500', marginTop: 2 },
  industryBadge: {
    minWidth: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  industryBadgeTxt: { fontSize: 12, fontWeight: '800' },

  serviceSubList: { gap: 4, paddingTop: 6, paddingHorizontal: 4, paddingBottom: 4 },
  svcRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 11, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#f8fafc',
  },
  svcRowDisabled: { opacity: 0.4 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: '#cbd5e1',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxDisabled: { borderColor: '#e2e8f0', backgroundColor: '#f1f5f9' },
  svcName: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  svcNotReady: { fontSize: 10, color: '#94a3b8', fontWeight: '500', marginTop: 1 },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 14, marginTop: 4,
  },
  submitBtnTxt: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
