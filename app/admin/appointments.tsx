import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Alert, ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import BottomNav from '@/components/BottomNav';
import { api, clearCache } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

// ── API shape ─────────────────────────────────────────────────────────────────

type ApiAppointment = {
  id: number;
  customer_name: string;
  service_name: string;
  branch_name: string;
  appointment_date: string;
  appointment_time: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  notes: string;
};

// ── Industry definitions ──────────────────────────────────────────────────────

const INDUSTRIES: {
  id: string;
  label: string;
  icon: IconName;
  color: string;
  bg: string;
  services: string[];
}[] = [
  {
    id: 'banking', label: 'Banking & Finance', icon: 'account-balance',
    color: '#2563eb', bg: '#eff6ff',
    services: ['Teller Services','Loan Consultation','Account Opening','Card Services','Customer Service'],
  },
  {
    id: 'healthcare', label: 'Healthcare', icon: 'favorite',
    color: '#e11d48', bg: '#fff1f2',
    services: ['General Practitioner','Pharmacy Pickup','Blood Test / Lab','Dental','Specialist Consult'],
  },
  {
    id: 'retail', label: 'Retail', icon: 'shopping-bag',
    color: '#d97706', bg: '#fffbeb',
    services: ['Returns & Exchanges','Customer Service','Tech Support','Click & Collect'],
  },
  {
    id: 'government', label: 'Government Services', icon: 'gavel',
    color: '#475569', bg: '#f1f5f9',
    services: ['Document Processing','Permits & Licenses','General Inquiries','ID / Passport Renewal'],
  },
  {
    id: 'education', label: 'Education', icon: 'school',
    color: '#4f46e5', bg: '#eef2ff',
    services: ['Admissions','Registrar','Financial Aid','Library Services'],
  },
  {
    id: 'corporate', label: 'Corporate Office', icon: 'business',
    color: '#0d9488', bg: '#f0fdfa',
    services: ['Reception','HR Services','IT Support','Facilities'],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${d}, ${y}`;
}

function formatTime(t: string) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const hr = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hr}:${String(m).padStart(2, '0')} ${ap}`;
}

function initials(name: string) {
  const p = name.trim().split(' ');
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase();
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: IconName }> = {
  scheduled: { label: 'Scheduled', color: '#2563eb', bg: '#eff6ff', icon: 'schedule'     },
  confirmed: { label: 'Confirmed', color: '#059669', bg: '#ecfdf5', icon: 'check-circle'  },
  completed: { label: 'Completed', color: '#7c3aed', bg: '#f5f3ff', icon: 'done-all'      },
  cancelled: { label: 'Cancelled', color: '#e11d48', bg: '#fff1f2', icon: 'cancel'        },
};

// ── Main screen ───────────────────────────────────────────────────────────────

export default function AdminAppointments() {
  const router = useRouter();
  const { user } = useAuth();
  const assignedBranch   = user?.assigned_branch_name ?? null;
  const assignedIndustry = user?.business_industry    ?? null;  // e.g. 'banking'

  // Which industries this admin can see (super_admin: all; admin: only their own)
  const visibleIndustries = React.useMemo(() => {
    if (!assignedIndustry) return INDUSTRIES;
    return INDUSTRIES.filter(i => i.id === assignedIndustry);
  }, [assignedIndustry]);

  const [appointments, setAppointments] = useState<ApiAppointment[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadAppointments = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const { data, error } = await api.get<{ results: ApiAppointment[] } | ApiAppointment[]>(
      '/appointments/', true, true,
    );
    if (error) Alert.alert('Error', error);
    else {
      // Backend already filters by branch+industry for admin role.
      // Client-side filter acts as a safety net.
      let raw: ApiAppointment[] = Array.isArray(data) ? data : (data as any)?.results ?? [];
      if (assignedBranch)   raw = raw.filter(a => a.branch_name === assignedBranch);
      if (assignedIndustry) {
        const ind = INDUSTRIES.find(i => i.id === assignedIndustry);
        if (ind) raw = raw.filter(a => ind.services.includes(a.service_name));
      }
      setAppointments(raw);
    }
    setLoading(false);
    setRefreshing(false);
  }, [assignedBranch, assignedIndustry]);

  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  const onRefresh = useCallback(() => {
    clearCache();
    setRefreshing(true);
    loadAppointments(true);
  }, [loadAppointments]);

  // Count appointments per industry
  const countForIndustry = useCallback((ind: typeof INDUSTRIES[0]) => {
    return appointments.filter(a => ind.services.includes(a.service_name)).length;
  }, [appointments]);

  // Appointments for the selected industry, filtered by search
  const industryAppointments = useMemo(() => {
    if (!selectedIndustry) return [];
    const ind = INDUSTRIES.find(i => i.id === selectedIndustry);
    if (!ind) return [];
    return appointments.filter(a => {
      const matchInd = ind.services.includes(a.service_name);
      const q = search.toLowerCase();
      const matchSearch = !q ||
        a.customer_name.toLowerCase().includes(q) ||
        a.service_name.toLowerCase().includes(q) ||
        a.branch_name.toLowerCase().includes(q);
      return matchInd && matchSearch;
    });
  }, [appointments, selectedIndustry, search]);

  const selectedMeta = INDUSTRIES.find(i => i.id === selectedIndustry);

  const handleCancel = (id: number) => {
    Alert.alert('Cancel Appointment', 'Mark this appointment as cancelled?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
        const { error } = await api.post(`/appointments/${id}/cancel/`, {});
        if (error) Alert.alert('Error', error);
        else loadAppointments(true);
      }},
    ]);
  };

  const handleComplete = async (id: number) => {
    const { error } = await api.post(`/appointments/${id}/complete/`, {});
    if (error) Alert.alert('Error', error);
    else loadAppointments(true);
  };

  // ── Industry list view ────────────────────────────────────────────────────
  if (!selectedIndustry) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />

        <View style={s.header}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/admin/dashboard' as any)} style={s.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Appointments</Text>
          <TouchableOpacity style={s.refreshBtn} onPress={onRefresh} disabled={refreshing}>
            {refreshing
              ? <ActivityIndicator size="small" color="#2563eb" />
              : <MaterialIcons name="refresh" size={22} color="#64748b" />
            }
          </TouchableOpacity>
        </View>

        {/* Total banner */}
        <View style={s.totalBanner}>
          <MaterialIcons name="event" size={16} color="#2563eb" />
          <Text style={s.totalTxt}>
            <Text style={s.totalNum}>{appointments.length}</Text>
            {assignedBranch
              ? ` appointment${appointments.length !== 1 ? 's' : ''} at ${assignedBranch}`
              : ' total appointments across all industries'}
          </Text>
        </View>

        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={s.gridContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}
          >
            <View style={s.grid}>
              {visibleIndustries.map(ind => {
                const count    = countForIndustry(ind);
                const upcoming = appointments.filter(a =>
                  ind.services.includes(a.service_name) &&
                  (a.status === 'scheduled' || a.status === 'confirmed')
                ).length;

                return (
                  <TouchableOpacity
                    key={ind.id}
                    style={[s.industryCard, { borderColor: count > 0 ? ind.color : '#e2e8f0' }]}
                    onPress={() => { setSelectedIndustry(ind.id); setSearch(''); }}
                    activeOpacity={0.8}
                  >
                    <View style={[s.indIconBox, { backgroundColor: ind.bg }]}>
                      <MaterialIcons name={ind.icon} size={24} color={ind.color} />
                    </View>

                    <Text style={s.indLabel} numberOfLines={2}>{ind.label}</Text>

                    <View style={[s.countPill, { backgroundColor: ind.bg }]}>
                      <Text style={[s.countNum, { color: ind.color }]}>{count}</Text>
                      <Text style={[s.countLbl, { color: ind.color }]}>appts</Text>
                    </View>

                    {upcoming > 0 && (
                      <View style={s.upcomingPill}>
                        <View style={s.upcomingDot} />
                        <Text style={s.upcomingTxt}>{upcoming} upcoming</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        )}

        <BottomNav />
      </SafeAreaView>
    );
  }

  // ── Appointments list for selected industry ───────────────────────────────
  const today = todayISO();

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={s.header}>
        <TouchableOpacity onPress={() => { setSelectedIndustry(null); setSearch(''); }} style={s.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{selectedMeta?.label}</Text>
        <TouchableOpacity style={s.refreshBtn} onPress={onRefresh} disabled={refreshing}>
          {refreshing
            ? <ActivityIndicator size="small" color="#2563eb" />
            : <MaterialIcons name="refresh" size={22} color="#64748b" />
          }
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <MaterialIcons name="search" size={18} color="#94a3b8" />
        <TextInput
          style={s.searchInput}
          placeholder="Search by customer, service or branch…"
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

      <ScrollView
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}
      >
        {industryAppointments.length === 0 ? (
          <View style={s.empty}>
            <MaterialIcons name="event-busy" size={52} color="#e2e8f0" />
            <Text style={s.emptyTitle}>No appointments found</Text>
            <Text style={s.emptySub}>
              {search ? 'Try a different search term.' : 'No appointments have been booked in this industry yet.'}
            </Text>
          </View>
        ) : (
          industryAppointments.map(appt => {
            const meta      = STATUS_META[appt.status] ?? STATUS_META.scheduled;
            const indColor  = selectedMeta?.color ?? '#2563eb';
            const indBg     = selectedMeta?.bg    ?? '#eff6ff';
            const isToday   = appt.appointment_date === today;

            return (
              <View key={appt.id} style={[s.card, isToday && appt.status === 'scheduled' && s.cardToday]}>
                {isToday && (appt.status === 'scheduled' || appt.status === 'confirmed') && (
                  <View style={s.todayTag}>
                    <MaterialIcons name="today" size={11} color="#2563eb" />
                    <Text style={s.todayTxt}>Today</Text>
                  </View>
                )}

                {/* Customer row */}
                <View style={s.cardTop}>
                  <View style={[s.avatar, { backgroundColor: indBg }]}>
                    <Text style={[s.avatarTxt, { color: indColor }]}>{initials(appt.customer_name)}</Text>
                  </View>
                  <View style={s.cardInfo}>
                    <Text style={s.customerName}>{appt.customer_name}</Text>
                    <Text style={s.serviceName}>{appt.service_name}</Text>
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: meta.bg }]}>
                    <MaterialIcons name={meta.icon} size={11} color={meta.color} />
                    <Text style={[s.statusTxt, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                </View>

                {/* Details row */}
                <View style={s.detailsRow}>
                  <View style={s.detailItem}>
                    <MaterialIcons name="event" size={13} color="#94a3b8" />
                    <Text style={s.detailTxt}>{formatDate(appt.appointment_date)}</Text>
                  </View>
                  <View style={s.detailItem}>
                    <MaterialIcons name="access-time" size={13} color="#94a3b8" />
                    <Text style={s.detailTxt}>{formatTime(appt.appointment_time)}</Text>
                  </View>
                  <View style={s.detailItem}>
                    <MaterialIcons name="place" size={13} color="#94a3b8" />
                    <Text style={s.detailTxt}>{appt.branch_name}</Text>
                  </View>
                </View>

                {!!appt.notes && (
                  <View style={s.notesRow}>
                    <MaterialIcons name="notes" size={12} color="#94a3b8" />
                    <Text style={s.notesTxt} numberOfLines={2}>{appt.notes}</Text>
                  </View>
                )}

                {/* Actions */}
                {(appt.status === 'scheduled' || appt.status === 'confirmed') && (
                  <View style={s.actions}>
                    <TouchableOpacity style={s.cancelBtn} onPress={() => handleCancel(appt.id)} activeOpacity={0.8}>
                      <MaterialIcons name="close" size={13} color="#e11d48" />
                      <Text style={s.cancelTxt}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.completeBtn} onPress={() => handleComplete(appt.id)} activeOpacity={0.8}>
                      <MaterialIcons name="check" size={13} color="#fff" />
                      <Text style={s.completeTxt}>Mark Complete</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
        <View style={{ height: 24 }} />
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  backBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', flex: 1, textAlign: 'center' },
  refreshBtn:  { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  totalBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#eff6ff', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#bfdbfe',
  },
  totalTxt: { fontSize: 13, color: '#1d4ed8', fontWeight: '600' },
  totalNum: { fontWeight: '900', fontSize: 14 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Industry grid — 3 columns × 2 rows
  gridContent: { padding: 16, paddingBottom: 32 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },

  industryCard: {
    width: '32%',
    backgroundColor: '#fff', borderRadius: 16, padding: 12,
    borderWidth: 1.5, alignItems: 'center', gap: 8,
  },
  indIconBox: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  indLabel:   { fontSize: 11, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  countPill:  { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  countNum:   { fontSize: 14, fontWeight: '900' },
  countLbl:   { fontSize: 9,  fontWeight: '700' },
  upcomingPill: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  upcomingDot:  { width: 5, height: 5, borderRadius: 3, backgroundColor: '#059669' },
  upcomingTxt:  { fontSize: 9, fontWeight: '700', color: '#059669' },

  // Search
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 10,
    borderRadius: 14, borderWidth: 1.5, borderColor: '#e2e8f0', paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#0f172a', paddingVertical: 11 },

  // Appointment list
  listContent: { padding: 16, gap: 12, paddingBottom: 32 },

  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: '#e2e8f0', gap: 10,
  },
  cardToday: { borderColor: '#93c5fd', borderWidth: 1.5 },

  todayTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  todayTxt: { fontSize: 10, fontWeight: '800', color: '#2563eb', textTransform: 'uppercase' },

  cardTop:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar:       { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarTxt:    { fontSize: 15, fontWeight: '900' },
  cardInfo:     { flex: 1 },
  customerName: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  serviceName:  { fontSize: 12, color: '#64748b', fontWeight: '500', marginTop: 2 },
  statusBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  statusTxt:    { fontSize: 10, fontWeight: '800' },

  detailsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailTxt:  { fontSize: 12, color: '#64748b', fontWeight: '500' },

  notesRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5 },
  notesTxt: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic', flex: 1 },

  actions:     { flexDirection: 'row', gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  cancelBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 9, borderRadius: 10, backgroundColor: '#fff1f2', borderWidth: 1, borderColor: '#fecaca' },
  cancelTxt:   { fontSize: 12, fontWeight: '700', color: '#e11d48' },
  completeBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 9, borderRadius: 10, backgroundColor: '#059669' },
  completeTxt: { fontSize: 12, fontWeight: '700', color: '#fff' },

  empty:      { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#64748b' },
  emptySub:   { fontSize: 13, color: '#94a3b8', textAlign: 'center', paddingHorizontal: 24 },
});
