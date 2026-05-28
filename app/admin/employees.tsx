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
import { useAuth } from '@/context/AuthContext';

// ─── Country codes ────────────────────────────────────────────────────────────

const COUNTRY_CODES = [
  { flag: '🇺🇸', name: 'United States',    code: '+1'   },
  { flag: '🇬🇧', name: 'United Kingdom',   code: '+44'  },
  { flag: '🇳🇬', name: 'Nigeria',          code: '+234' },
  { flag: '🇬🇭', name: 'Ghana',            code: '+233' },
  { flag: '🇿🇦', name: 'South Africa',     code: '+27'  },
  { flag: '🇰🇪', name: 'Kenya',            code: '+254' },
  { flag: '🇪🇬', name: 'Egypt',            code: '+20'  },
  { flag: '🇨🇦', name: 'Canada',           code: '+1'   },
  { flag: '🇦🇺', name: 'Australia',        code: '+61'  },
  { flag: '🇮🇳', name: 'India',            code: '+91'  },
  { flag: '🇦🇪', name: 'UAE',              code: '+971' },
  { flag: '🇸🇦', name: 'Saudi Arabia',     code: '+966' },
  { flag: '🇹🇷', name: 'Turkey',           code: '+90'  },
  { flag: '🇩🇪', name: 'Germany',          code: '+49'  },
  { flag: '🇫🇷', name: 'France',           code: '+33'  },
  { flag: '🇧🇷', name: 'Brazil',           code: '+55'  },
  { flag: '🇲🇽', name: 'Mexico',           code: '+52'  },
  { flag: '🇯🇵', name: 'Japan',            code: '+81'  },
  { flag: '🇨🇳', name: 'China',            code: '+86'  },
  { flag: '🇷🇺', name: 'Russia',           code: '+7'   },
  { flag: '🇵🇰', name: 'Pakistan',         code: '+92'  },
  { flag: '🇧🇩', name: 'Bangladesh',       code: '+880' },
  { flag: '🇮🇩', name: 'Indonesia',        code: '+62'  },
  { flag: '🇵🇭', name: 'Philippines',      code: '+63'  },
  { flag: '🇪🇹', name: 'Ethiopia',         code: '+251' },
  { flag: '🇹🇿', name: 'Tanzania',         code: '+255' },
  { flag: '🇺🇬', name: 'Uganda',           code: '+256' },
  { flag: '🇨🇲', name: 'Cameroon',         code: '+237' },
  { flag: '🇸🇳', name: 'Senegal',          code: '+221' },
  { flag: '🇨🇮', name: "Côte d'Ivoire",    code: '+225' },
];

type CountryEntry = typeof COUNTRY_CODES[number];

function CountryCodePicker({
  selected,
  onSelect,
}: {
  selected: CountryEntry;
  onSelect: (c: CountryEntry) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity
        style={s.ccBtn}
        onPress={() => setOpen(true)}
        activeOpacity={0.75}
      >
        <Text style={s.ccFlag}>{selected.flag}</Text>
        <Text style={s.ccCode}>{selected.code}</Text>
        <MaterialIcons name="arrow-drop-down" size={18} color="#64748b" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={s.ccOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setOpen(false)} />
          <View style={s.ccSheet}>
            <View style={s.ccSheetHead}>
              <Text style={s.ccSheetTitle}>Select Country Code</Text>
              <TouchableOpacity onPress={() => setOpen(false)} style={s.ccCloseBtn}>
                <MaterialIcons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {COUNTRY_CODES.map((c, i) => {
                const isSel = c.code === selected.code && c.name === selected.name;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[s.ccRow, isSel && s.ccRowSelected]}
                    onPress={() => { onSelect(c); setOpen(false); }}
                    activeOpacity={0.75}
                  >
                    <Text style={s.ccRowFlag}>{c.flag}</Text>
                    <Text style={[s.ccRowName, isSel && { color: '#2563eb', fontWeight: '700' }]}>{c.name}</Text>
                    <Text style={[s.ccRowCode, isSel && { color: '#2563eb', fontWeight: '700' }]}>{c.code}</Text>
                    {isSel && <MaterialIcons name="check-circle" size={16} color="#2563eb" />}
                  </TouchableOpacity>
                );
              })}
              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Employee = {
  id: number;
  email: string;
  full_name: string;
  role: 'staff' | 'admin' | 'super_admin';
  phone: string;
  counter_number: number | null;
  assigned_branch: number | null;
  assigned_branch_name: string | null;
  assigned_services: number[];
  created_at: string;
};

type BackendService = {
  id: number;
  name: string;
  industry: string;
  estimated_time: number;
  branch: number | null;
};

type Branch = {
  id: number;
  name: string;
  business_name: string;
  industry: string;
};

// ─── Industry definitions ─────────────────────────────────────────────────────

type IndustryDef = {
  id: string;
  label: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  color: string;
  bg: string;
};

const INDUSTRIES: IndustryDef[] = [
  { id: 'banking',    label: 'Banking & Finance',    icon: 'account-balance', color: '#2563eb', bg: '#eff6ff' },
  { id: 'healthcare', label: 'Healthcare',           icon: 'local-hospital',  color: '#e11d48', bg: '#fff1f2' },
  { id: 'retail',     label: 'Retail',               icon: 'shopping-bag',    color: '#d97706', bg: '#fffbeb' },
  { id: 'government', label: 'Government Services',  icon: 'gavel',           color: '#475569', bg: '#f1f5f9' },
  { id: 'education',  label: 'Education',            icon: 'school',          color: '#4f46e5', bg: '#eef2ff' },
  { id: 'corporate',  label: 'Corporate Office',     icon: 'business',        color: '#7c3aed', bg: '#f5f3ff' },
];

// Total services used to detect whether seed is needed
const INDUSTRY_SERVICES: Record<string, string[]> = {
  banking:    ['Teller Services', 'Loan Consultation', 'Customer Service', 'Account Opening', 'Card Services'],
  healthcare: ['General Practitioner', 'Pharmacy Pickup', 'Blood Test / Lab', 'Dental', 'Specialist Consult'],
  retail:     ['Returns & Exchanges', 'Customer Service', 'Tech Support', 'Click & Collect'],
  government: ['Document Processing', 'Permits & Licenses', 'General Inquiries', 'ID / Passport Renewal'],
  education:  ['Admissions', 'Registrar', 'Financial Aid', 'Library Services'],
  corporate:  ['Reception', 'HR Services', 'IT Support', 'Facilities'],
};

const EXPECTED_SERVICE_COUNT = Object.values(INDUSTRY_SERVICES).reduce((n, arr) => n + arr.length, 0);

// Same branches shown in the customer page — used as fallback when DB is empty
// Negative IDs indicate "pending creation" (not yet in DB)
const FALLBACK_BRANCHES: Record<string, Array<{ id: number; name: string }>> = {
  banking:    [
    { id: -1,  name: 'Manhattan Financial Center' },
    { id: -2,  name: 'Brooklyn Service Hub'        },
    { id: -3,  name: 'Queens Branch'               },
  ],
  healthcare: [
    { id: -4,  name: 'Main Hospital — Downtown'  },
    { id: -5,  name: 'Northside Clinic'          },
    { id: -6,  name: 'Eastside Medical Center'   },
  ],
  retail: [
    { id: -7,  name: 'Flagship Store — Downtown' },
    { id: -8,  name: 'Mall Branch'               },
    { id: -9,  name: 'Westside Outlet'           },
  ],
  government: [
    { id: -10, name: 'City Hall — Main Office'   },
    { id: -11, name: 'North District Office'     },
    { id: -12, name: 'South Service Centre'      },
  ],
  education: [
    { id: -13, name: 'Main Campus — Admin Block' },
    { id: -14, name: 'East Campus'               },
    { id: -15, name: 'City Learning Centre'      },
  ],
  corporate: [
    { id: -16, name: 'HQ Tower A — Floor 12' },
    { id: -17, name: 'West Office Park'       },
    { id: -18, name: 'East Hub'               },
  ],
};

function fallbackBranchName(id: number): string | null {
  for (const brs of Object.values(FALLBACK_BRANCHES)) {
    const b = brs.find(x => x.id === id);
    if (b) return b.name;
  }
  return null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  staff:       { label: 'Staff',       color: '#2563eb', bg: '#eff6ff' },
  admin:       { label: 'Admin',       color: '#7c3aed', bg: '#f5f3ff' },
  super_admin: { label: 'Super Admin', color: '#dc2626', bg: '#fff1f2' },
};

function toArr<T>(d: any): T[] {
  return Array.isArray(d) ? d : (d?.results ?? []);
}

function idToName(id: number, backendServices: BackendService[]): string {
  return backendServices.find(s => s.id === id)?.name ?? String(id);
}

// ─── Assignment Wizard ────────────────────────────────────────────────────────

function AssignmentWizard({
  backendSvcs,
  branches,
  industry,
  branch,
  services,
  seeding,
  onIndustryChange,
  onBranchChange,
  onServicesChange,
}: {
  backendSvcs: BackendService[];
  branches: Branch[];
  industry: string | null;
  branch: number | null;
  services: number[];
  seeding: boolean;
  onIndustryChange: (v: string | null) => void;
  onBranchChange: (v: number | null) => void;
  onServicesChange: (v: number[]) => void;
}) {
  const ind = INDUSTRIES.find(i => i.id === industry) ?? null;

  // Branches filtered by the selected industry
  const industryBranches = industry
    ? branches.filter(b => b.industry === industry)
    : branches;

  // Services in DB matching the selected industry — deduplicated by name
  const industryServices = (() => {
    if (!industry) return [];
    const seen = new Set<string>();
    return backendSvcs.filter(s => {
      if (s.industry !== industry) return false;
      if (seen.has(s.name)) return false;
      seen.add(s.name);
      return true;
    });
  })();

  const clearAll = () => {
    onIndustryChange(null);
    onBranchChange(null);
    onServicesChange([]);
  };

  return (
    <View style={s.wizardWrap}>

      {/* ── Step 1: Industry ─────────────────────────────── */}
      <View style={s.stepBlock}>
        <View style={s.stepRow}>
          <View style={[s.stepCircle, industry != null && s.stepCircleDone]}>
            {industry != null
              ? <MaterialIcons name="check" size={12} color="#fff" />
              : <Text style={s.stepCircleNum}>1</Text>}
          </View>
          <Text style={s.stepTitle}>Select Industry</Text>
          {industry != null && (
            <TouchableOpacity onPress={clearAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={s.changeTxt}>Change</Text>
            </TouchableOpacity>
          )}
        </View>

        {industry != null && ind ? (
          // Collapsed: show selected chip
          <View style={[s.selectedChip, { borderColor: ind.color, backgroundColor: ind.bg }]}>
            <View style={[s.selectedChipIcon, { backgroundColor: ind.color }]}>
              <MaterialIcons name={ind.icon} size={14} color="#fff" />
            </View>
            <Text style={[s.selectedChipTxt, { color: ind.color }]}>{ind.label}</Text>
          </View>
        ) : (
          // Expanded: 2-column grid
          <View style={s.industryGrid}>
            {INDUSTRIES.map(i => (
              <TouchableOpacity
                key={i.id}
                style={s.industryGridCard}
                onPress={() => { onIndustryChange(i.id); onBranchChange(null); onServicesChange([]); }}
                activeOpacity={0.72}
              >
                <View style={[s.industryGridIcon, { backgroundColor: i.bg }]}>
                  <MaterialIcons name={i.icon} size={22} color={i.color} />
                </View>
                <Text style={[s.industryGridLabel, { color: i.color }]} numberOfLines={2}>
                  {i.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* ── Step 2: Branch (unlocks after industry) ──────── */}
      {industry != null && (
        <View style={s.stepBlock}>
          <View style={s.stepRow}>
            <TouchableOpacity onPress={clearAll} style={s.stepBackBtn} activeOpacity={0.7}>
              <MaterialIcons name="arrow-back" size={14} color="#475569" />
              <Text style={s.stepBackTxt}>Back</Text>
            </TouchableOpacity>
            <View style={[s.stepCircle, branch != null && s.stepCircleDone]}>
              {branch != null
                ? <MaterialIcons name="check" size={12} color="#fff" />
                : <Text style={s.stepCircleNum}>2</Text>}
            </View>
            <Text style={s.stepTitle}>Select Branch</Text>
            <Text style={s.stepNote}>optional</Text>
          </View>

          {/* Subtitle showing the industry context */}
          {ind && (
            <View style={[s.contextTag, { backgroundColor: ind.bg }]}>
              <MaterialIcons name={ind.icon} size={12} color={ind.color} />
              <Text style={[s.contextTagTxt, { color: ind.color }]}>
                {ind.label} — select the branch this staff will serve
              </Text>
            </View>
          )}

          <ScrollView
            style={s.listScroll}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={s.branchList}>
              <TouchableOpacity
                style={[s.branchRow, branch === null && s.branchRowSelected]}
                onPress={() => onBranchChange(null)}
                activeOpacity={0.75}
              >
                <View style={[s.radio, branch === null && s.radioSelected]}>
                  {branch === null && <View style={s.radioDot} />}
                </View>
                <Text style={[s.branchRowName, branch === null && { color: '#0f172a', fontWeight: '700' }]}>
                  Not assigned
                </Text>
              </TouchableOpacity>

              {industryBranches.length === 0 ? (
                <View style={s.infoBox}>
                  <MaterialIcons name="place" size={14} color="#cbd5e1" />
                  <Text style={s.infoTxt}>No branches found for this industry</Text>
                </View>
              ) : (
                industryBranches.map(br => {
                  const isSel = branch === br.id;
                  return (
                    <TouchableOpacity
                      key={br.id}
                      style={[s.branchRow, isSel && s.branchRowSelected]}
                      onPress={() => onBranchChange(br.id)}
                      activeOpacity={0.75}
                    >
                      <View style={[s.radio, isSel && s.radioSelected]}>
                        {isSel && <View style={s.radioDot} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.branchRowName, isSel && { color: '#0f172a', fontWeight: '700' }]}>
                          {br.name}
                        </Text>
                        {!!br.business_name && (
                          <Text style={s.branchRowBiz}>{br.business_name}</Text>
                        )}
                      </View>
                      {isSel && <MaterialIcons name="check-circle" size={16} color="#2563eb" />}
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </ScrollView>
        </View>
      )}

      {/* ── Step 3: Services (unlocks after industry) ────── */}
      {industry != null && (
        <View style={s.stepBlock}>
          <View style={s.stepRow}>
            <TouchableOpacity onPress={clearAll} style={s.stepBackBtn} activeOpacity={0.7}>
              <MaterialIcons name="arrow-back" size={14} color="#475569" />
              <Text style={s.stepBackTxt}>Back</Text>
            </TouchableOpacity>
            <View style={[s.stepCircle, services.length > 0 && s.stepCircleDone]}>
              {services.length > 0
                ? <MaterialIcons name="check" size={12} color="#fff" />
                : <Text style={s.stepCircleNum}>3</Text>}
            </View>
            <Text style={s.stepTitle}>
              Assign Services
              {services.length > 0 && ind && (
                <Text style={{ color: ind.color }}> · {services.length} selected</Text>
              )}
            </Text>
            {services.length > 0 && (
              <TouchableOpacity onPress={() => onServicesChange([])} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={s.clearTxt}>Clear all</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Branch context for services */}
          {branch != null && (() => {
            const br = branches.find(b => b.id === branch);
            return br ? (
              <View style={[s.contextTag, { backgroundColor: '#f0fdf4' }]}>
                <MaterialIcons name="place" size={12} color="#059669" />
                <Text style={[s.contextTagTxt, { color: '#059669' }]}>
                  {br.name} — showing {ind?.label ?? 'industry'} services
                </Text>
              </View>
            ) : null;
          })()}

          {seeding ? (
            <View style={s.infoBox}>
              <ActivityIndicator size="small" color="#2563eb" />
              <Text style={s.infoTxt}>Setting up services…</Text>
            </View>
          ) : industryServices.length === 0 ? (
            <View style={s.infoBox}>
              <MaterialIcons name="info-outline" size={15} color="#94a3b8" />
              <Text style={s.infoTxt}>No services found for this industry in the database</Text>
            </View>
          ) : (
            <ScrollView
              style={s.listScroll}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={s.serviceList}>
                {industryServices.map(svc => {
                  const isSel = services.includes(svc.id);
                  return (
                    <TouchableOpacity
                      key={svc.id}
                      style={[s.svcRow, isSel && ind && { borderColor: ind.color, backgroundColor: ind.bg }]}
                      onPress={() =>
                        onServicesChange(
                          isSel ? services.filter(x => x !== svc.id) : [...services, svc.id],
                        )
                      }
                      activeOpacity={0.75}
                    >
                      <View style={[s.checkbox, isSel && ind && { backgroundColor: ind.color, borderColor: ind.color }]}>
                        {isSel && <MaterialIcons name="check" size={13} color="#fff" />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.svcName, isSel && { fontWeight: '700' }]}>{svc.name}</Text>
                        {svc.estimated_time > 0 && (
                          <Text style={s.svcTime}>~{svc.estimated_time} min avg</Text>
                        )}
                      </View>
                      {isSel && ind && (
                        <MaterialIcons name="check-circle" size={16} color={ind.color} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EmployeeManagement() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'superadmin' || currentUser?.role === 'super_admin';

  const [employees,   setEmployees]   = useState<Employee[]>([]);
  const [backendSvcs, setBackendSvcs] = useState<BackendService[]>([]);
  const [branches,    setBranches]    = useState<Branch[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [seeding,     setSeeding]     = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);
  const [roleFilter,  setRoleFilter]  = useState<'All' | 'staff' | 'admin' | 'super_admin'>('All');

  // Add employee modal
  const [addModal,  setAddModal]  = useState(false);
  const [fName,     setFName]     = useState('');
  const [fEmail,    setFEmail]    = useState('');
  const [fCountry,  setFCountry]  = useState<CountryEntry>(COUNTRY_CODES[0]);
  const [fPhone,    setFPhone]    = useState('');
  const [fCounter,  setFCounter]  = useState('');
  const [fIndustry, setFIndustry] = useState<string | null>(null);
  const [fBranch,   setFBranch]   = useState<number | null>(null);
  const [fServices, setFServices] = useState<number[]>([]);
  const [fErrors,   setFErrors]   = useState<Record<string, string>>({});
  const [fRole,     setFRole]     = useState<'staff' | 'admin'>('staff');
  const [adding,    setAdding]    = useState(false);

  // Edit assignment modal
  const [assignModal,  setAssignModal]  = useState(false);
  const [assignTarget, setAssignTarget] = useState<Employee | null>(null);
  const [aCounter,     setACounter]     = useState('');
  const [aIndustry,    setAIndustry]    = useState<string | null>(null);
  const [aBranch,      setABranch]      = useState<number | null>(null);
  const [aServices,    setAServices]    = useState<number[]>([]);
  const [saving,       setSaving]       = useState(false);

  // ── Load employees + ensure services exist in DB ─────────────────────────

  const loadServices = useCallback(async (): Promise<BackendService[]> => {
    const { data: first } = await api.get<any>('/services/');
    const list = toArr<BackendService>(first ?? []);

    if (list.length >= EXPECTED_SERVICE_COUNT) return list;

    setSeeding(true);
    await api.post<any>('/services/seed/', {});
    setSeeding(false);

    const { data: fresh } = await api.get<any>('/services/');
    return toArr<BackendService>(fresh ?? list);
  }, []);

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);

    // Always seed branches in parallel — idempotent and ensures DB has branch data
    const [empRes, svcs, seedRes] = await Promise.all([
      api.get<any>('/accounts/employees/?page_size=500', true, true),
      loadServices(),
      api.post<any>('/branches/seed/', {}),
    ]);

    if (empRes.data != null) setEmployees(toArr<Employee>(empRes.data));
    setBackendSvcs(svcs);

    let branchRaw: any[] = [];

    if (seedRes.data != null) {
      // Seed succeeded — use its result (includes all branches with real IDs)
      branchRaw = toArr<any>(seedRes.data);
    } else {
      // Seed endpoint not found (old server) — try plain GET
      const { data: brData } = await api.get<any>('/branches/');
      branchRaw = brData != null ? toArr<any>(brData) : [];
    }

    if (branchRaw.length > 0) {
      setBranches(branchRaw.map((b: any) => ({
        id:            b.id,
        name:          b.name,
        business_name: b.business_name ?? b.business?.name ?? '',
        industry:      b.business_industry ?? b.business?.industry ?? '',
      })));
    } else {
      // Last resort: show hardcoded fallbacks with negative IDs for display
      setBranches(
        Object.entries(FALLBACK_BRANCHES).flatMap(([ind, brs]) =>
          brs.map(b => ({ id: b.id, name: b.name, business_name: '', industry: ind }))
        )
      );
    }

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
    setFName(''); setFEmail('');
    setFCountry(COUNTRY_CODES[0]); setFPhone(''); setFCounter('');
    setFIndustry(null); setFBranch(null); setFServices([]);
    setFErrors({}); setFRole('staff');
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

    // Resolve hardcoded branch (negative ID) to a real DB ID via seed
    let resolvedBranch = fBranch;
    if (fBranch !== null && fBranch < 0) {
      const brName = fallbackBranchName(fBranch);
      const { data: seeded } = await api.post<any>('/branches/seed/', {});
      if (seeded) {
        const real = toArr<any>(seeded).find(
          (b: any) => b.name?.toLowerCase() === brName?.toLowerCase()
        );
        if (real?.id) {
          resolvedBranch = real.id;
          setBranches(toArr<any>(seeded).map((b: any) => ({
            id: b.id, name: b.name,
            business_name: b.business_name ?? '',
            industry: b.business_industry ?? '',
          })));
        }
      }
      if (!resolvedBranch || resolvedBranch < 0) {
        setAdding(false);
        Alert.alert('Server Error', 'Could not create branch. Please restart the Django server and try again.');
        return;
      }
    }

    const body: Record<string, unknown> = {
      full_name:         fName.trim(),
      email:             fEmail.trim().toLowerCase(),
      role:              fRole,
      phone:             fPhone.trim() ? `${fCountry.code}${fPhone.trim()}` : '0000000000',
      password:          'changeme',
      assigned_branch:   resolvedBranch,
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
    setABranch(emp.assigned_branch ?? null);

    // Detect industry from first assigned service
    const firstSvcId = emp.assigned_services?.[0];
    const firstSvc   = firstSvcId != null ? backendSvcs.find(s => s.id === firstSvcId) : undefined;
    setAIndustry(firstSvc?.industry ?? null);

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

    // Resolve hardcoded branch (negative ID) to a real DB ID via seed
    let resolvedBranch = aBranch;
    if (aBranch !== null && aBranch < 0) {
      const brName = fallbackBranchName(aBranch);
      const { data: seeded } = await api.post<any>('/branches/seed/', {});
      if (seeded) {
        const real = toArr<any>(seeded).find(
          (b: any) => b.name?.toLowerCase() === brName?.toLowerCase()
        );
        if (real?.id) {
          resolvedBranch = real.id;
          setBranches(toArr<any>(seeded).map((b: any) => ({
            id: b.id, name: b.name,
            business_name: b.business_name ?? '',
            industry: b.business_industry ?? '',
          })));
        }
      }
      if (!resolvedBranch || resolvedBranch < 0) {
        setSaving(false);
        Alert.alert('Server Error', 'Could not create branch. Please restart the Django server and try again.');
        return;
      }
    }

    const body: Record<string, unknown> = {
      assigned_services: aServices,
      assigned_branch:   resolvedBranch,
      counter_number:    aCounter.trim() ? num : null,
    };

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
        {(['All', 'staff', 'admin', 'super_admin'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[s.filterChip, roleFilter === f && s.filterChipActive]}
            onPress={() => setRoleFilter(f)}
          >
            <Text style={[s.filterChipTxt, roleFilter === f && s.filterChipTxtActive]}>
              {f === 'All' ? 'All' : f === 'staff' ? 'Staff' : f === 'admin' ? 'Admin' : 'Super Admin'}
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

            // Detect industry for badge
            const firstSvcId = emp.assigned_services?.[0];
            const firstSvc   = firstSvcId != null ? backendSvcs.find(sv => sv.id === firstSvcId) : undefined;
            const empInd     = firstSvc ? INDUSTRIES.find(i => i.id === firstSvc.industry) : null;

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
                  {empInd && (
                    <View style={[s.badge, { backgroundColor: empInd.bg }]}>
                      <MaterialIcons name={empInd.icon} size={10} color={empInd.color} />
                      <Text style={[s.badgeTxt, { color: empInd.color, marginLeft: 3 }]}>{empInd.label}</Text>
                    </View>
                  )}
                  {emp.counter_number != null && (
                    <View style={s.counterBadge}>
                      <MaterialIcons name="tag" size={11} color="#2563eb" />
                      <Text style={s.counterTxt}>Counter {emp.counter_number}</Text>
                    </View>
                  )}
                  {!!emp.assigned_branch_name && (
                    <View style={s.branchBadge}>
                      <MaterialIcons name="place" size={11} color="#059669" />
                      <Text style={s.branchBadgeTxt}>{emp.assigned_branch_name}</Text>
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
                        <View key={n} style={[s.svcTag, empInd && { backgroundColor: empInd.bg }]}>
                          <Text style={[s.svcTagTxt, empInd && { color: empInd.color }]}>{n}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Assign / Edit button:
                    - never shown for super_admin employees
                    - only super_admin can assign admin employees */}
                {emp.role !== 'super_admin' && (emp.role !== 'admin' || isSuperAdmin) && (
                  <TouchableOpacity style={s.assignBtn} onPress={() => openAssign(emp)} activeOpacity={0.8}>
                    <MaterialIcons name="edit" size={13} color="#2563eb" />
                    <Text style={s.assignBtnTxt}>
                      {emp.counter_number == null && empSvcNames.length === 0
                        ? 'Assign Industry, Branch & Services'
                        : 'Edit Assignment'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      <BottomNav />

      {/* ── Add Employee Modal ─────────────────────────────────────────── */}
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

              <ScrollView
                contentContainerStyle={s.sheetBody}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* ── Personal Info ── */}
                <Text style={s.sectionLbl}>Personal Information</Text>

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
                  <Text style={s.fieldLbl}>Phone *</Text>
                  <View style={s.phoneRow}>
                    <CountryCodePicker selected={fCountry} onSelect={setFCountry} />
                    <TextInput
                      style={[s.input, s.phoneInput]}
                      placeholder="555 000 0000"
                      placeholderTextColor="#94a3b8"
                      value={fPhone}
                      onChangeText={v => setFPhone(v.replace(/[^0-9 ]/g, ''))}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                <View style={s.field}>
                  <Text style={s.fieldLbl}>Counter / Desk Number</Text>
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

                {isSuperAdmin && (
                  <View style={s.field}>
                    <Text style={s.fieldLbl}>Role *</Text>
                    <View style={s.toggleRow}>
                      <TouchableOpacity
                        style={[s.toggleBtn, fRole === 'staff' && s.toggleBtnActive]}
                        onPress={() => setFRole('staff')}
                      >
                        <Text style={[s.toggleTxt, fRole === 'staff' && s.toggleTxtActive]}>Staff</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.toggleBtn, fRole === 'admin' && s.toggleBtnActive]}
                        onPress={() => setFRole('admin')}
                      >
                        <Text style={[s.toggleTxt, fRole === 'admin' && s.toggleTxtActive]}>Admin</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* ── Assignment Wizard ── */}
                <View style={s.divider} />
                <Text style={s.sectionLbl}>Assignment</Text>
                <Text style={s.sectionSub}>
                  Select an industry, then the branch this staff will work at,
                  and the services they will handle.
                </Text>

                <AssignmentWizard
                  backendSvcs={backendSvcs}
                  branches={branches}
                  industry={fIndustry}
                  branch={fBranch}
                  services={fServices}
                  seeding={seeding}
                  onIndustryChange={setFIndustry}
                  onBranchChange={setFBranch}
                  onServicesChange={setFServices}
                />

                <TouchableOpacity
                  style={[s.submitBtn, adding && { opacity: 0.6 }]}
                  onPress={handleAdd}
                  disabled={adding}
                >
                  {adding
                    ? <ActivityIndicator color="#fff" size="small" />
                    : (
                      <>
                        <MaterialIcons name="person-add" size={18} color="#fff" />
                        <Text style={s.submitBtnTxt}>Add Employee</Text>
                      </>
                    )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ── Edit Assignment Modal ──────────────────────────────────────── */}
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
                  <Text style={s.sheetSub}>Update counter, branch and services</Text>
                </View>
                <TouchableOpacity onPress={() => setAssignModal(false)} style={s.closeBtn}>
                  <MaterialIcons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={s.sheetBody}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={s.field}>
                  <Text style={s.fieldLbl}>Counter / Desk Number</Text>
                  <TextInput
                    style={s.input}
                    placeholder="e.g. 1  (leave blank to unassign)"
                    placeholderTextColor="#94a3b8"
                    value={aCounter}
                    onChangeText={setACounter}
                    keyboardType="numeric"
                  />
                </View>

                <View style={s.divider} />
                <Text style={s.sectionLbl}>Assignment</Text>
                <Text style={s.sectionSub}>
                  Change the industry, branch, or services for this staff member.
                </Text>

                <AssignmentWizard
                  backendSvcs={backendSvcs}
                  branches={branches}
                  industry={aIndustry}
                  branch={aBranch}
                  services={aServices}
                  seeding={seeding}
                  onIndustryChange={setAIndustry}
                  onBranchChange={setABranch}
                  onServicesChange={setAServices}
                />

                <TouchableOpacity
                  style={[s.submitBtn, saving && { opacity: 0.6 }]}
                  onPress={handleSaveAssign}
                  disabled={saving}
                >
                  {saving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : (
                      <>
                        <MaterialIcons name="save" size={18} color="#fff" />
                        <Text style={s.submitBtnTxt}>Save Changes</Text>
                      </>
                    )}
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

  // Header
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

  // Filters
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

  // List
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingTxt: { fontSize: 14, color: '#94a3b8', fontWeight: '500' },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#64748b' },
  emptySub: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },

  // Employee card
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
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
  counterBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  counterTxt: { fontSize: 11, fontWeight: '700', color: '#2563eb' },
  branchBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#f0fdf4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  branchBadgeTxt: { fontSize: 11, fontWeight: '700', color: '#059669' },
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

  // Form fields
  field: { gap: 6 },
  fieldLbl: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
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

  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 4 },
  sectionLbl: { fontSize: 14, fontWeight: '900', color: '#0f172a' },
  sectionSub: { fontSize: 12, color: '#64748b', fontWeight: '500', lineHeight: 17, marginTop: -8 },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 14, marginTop: 4,
  },
  submitBtnTxt: { fontSize: 15, fontWeight: '800', color: '#fff' },

  // ── Assignment Wizard ─────────────────────────────────────────────────────

  wizardWrap: { gap: 12 },

  stepBlock: {
    borderRadius: 14, borderWidth: 1.5, borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc', padding: 14, gap: 12,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepCircle: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#e2e8f0',
    alignItems: 'center', justifyContent: 'center',
  },
  stepCircleDone: { backgroundColor: '#2563eb' },
  stepCircleNum: { fontSize: 11, fontWeight: '900', color: '#94a3b8' },
  stepTitle: { flex: 1, fontSize: 13, fontWeight: '800', color: '#0f172a' },
  stepNote: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  changeTxt: { fontSize: 12, fontWeight: '700', color: '#2563eb' },
  stepBackBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#f1f5f9', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 5,
    marginRight: 4,
  },
  stepBackTxt: { fontSize: 12, fontWeight: '700', color: '#475569' },
  clearTxt: { fontSize: 12, fontWeight: '700', color: '#e11d48' },

  // Industry grid
  industryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  industryGridCard: {
    width: '48%',
    borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0',
    backgroundColor: '#fff', padding: 12,
    alignItems: 'center', gap: 8,
  },
  industryGridIcon: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  industryGridLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center', lineHeight: 15 },

  // Selected chip (after industry chosen)
  selectedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  selectedChipIcon: {
    width: 30, height: 30, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  selectedChipTxt: { fontSize: 13, fontWeight: '800' },

  // Context tag (shown under step header)
  contextTag: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  contextTagTxt: { fontSize: 11, fontWeight: '600', flex: 1 },

  // Scrollable cap for branch + service lists inside wizard
  listScroll: { maxHeight: 220 },

  // Branch list
  branchList: { gap: 6 },
  branchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#fff',
  },
  branchRowSelected: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  branchRowName: { fontSize: 13, fontWeight: '600', color: '#475569' },
  branchRowBiz:  { fontSize: 11, color: '#94a3b8', fontWeight: '500', marginTop: 1 },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#cbd5e1',
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: '#2563eb' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2563eb' },

  // Info box (empty state inside wizard)
  infoBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  infoTxt: { fontSize: 12, color: '#94a3b8', fontWeight: '500', flex: 1 },

  // Service list
  serviceList: { gap: 6 },
  svcRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#fff',
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: '#cbd5e1',
    alignItems: 'center', justifyContent: 'center',
  },
  svcName: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  svcTime: { fontSize: 11, color: '#94a3b8', fontWeight: '500', marginTop: 1 },

  // Phone row with country picker
  phoneRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  phoneInput:{ flex: 1 },
  ccBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 14,
    paddingHorizontal: 10, paddingVertical: 13,
    backgroundColor: '#f8fafc',
  },
  ccFlag: { fontSize: 20 },
  ccCode: { fontSize: 14, fontWeight: '700', color: '#0f172a' },

  // Country picker modal
  ccOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  ccSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '70%', paddingBottom: 20,
  },
  ccSheetHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  ccSheetTitle: { fontSize: 17, fontWeight: '900', color: '#0f172a' },
  ccCloseBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  ccRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f8fafc',
  },
  ccRowSelected: { backgroundColor: '#eff6ff' },
  ccRowFlag: { fontSize: 24 },
  ccRowName: { flex: 1, fontSize: 14, fontWeight: '500', color: '#0f172a' },
  ccRowCode: { fontSize: 14, fontWeight: '600', color: '#64748b' },
});
