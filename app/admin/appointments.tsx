import React, { useState, useMemo } from 'react';
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

type AppointmentStatus = 'upcoming' | 'completed' | 'cancelled';
type TabKey = 'all' | AppointmentStatus;

type Appointment = {
  id: number;
  customer: string;
  service: string;
  industry: string;
  date: string;   // YYYY-MM-DD
  time: string;
  status: AppointmentStatus;
  notes: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDate(iso: string) {
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts.map(Number);
  return `${MONTH_NAMES[m - 1]} ${d}, ${y}`;
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isToday(iso: string) { return iso === todayISO(); }

function initials(name: string) {
  const parts = name.trim().split(' ');
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
}

// ── Static data ───────────────────────────────────────────────────────────────
const INDUSTRY_LIST = [
  'Banking & Finance',
  'Healthcare',
  'Retail',
  'Government Services',
  'Education',
  'Corporate Office',
];

const INDUSTRY_COLORS: Record<string, { color: string; bg: string }> = {
  'Banking & Finance':   { color: '#2563eb', bg: '#eff6ff' },
  Healthcare:            { color: '#059669', bg: '#ecfdf5' },
  Retail:                { color: '#f97316', bg: '#fff7ed' },
  'Government Services': { color: '#475569', bg: '#f1f5f9' },
  Education:             { color: '#4f46e5', bg: '#eef2ff' },
  'Corporate Office':    { color: '#7c3aed', bg: '#f5f3ff' },
};

const STATUS_META: Record<AppointmentStatus, { label: string; color: string; bg: string; icon: React.ComponentProps<typeof MaterialIcons>['name'] }> = {
  upcoming:  { label: 'Upcoming',  color: '#2563eb', bg: '#eff6ff',  icon: 'schedule'    },
  completed: { label: 'Completed', color: '#059669', bg: '#ecfdf5',  icon: 'check-circle' },
  cancelled: { label: 'Cancelled', color: '#e11d48', bg: '#fff1f2',  icon: 'cancel'       },
};

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all',       label: 'All'       },
  { key: 'upcoming',  label: 'Upcoming'  },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const TIME_SLOTS = [
  '8:00 AM','8:30 AM','9:00 AM','9:30 AM','10:00 AM','10:30 AM',
  '11:00 AM','11:30 AM','12:00 PM','12:30 PM','1:00 PM','1:30 PM',
  '2:00 PM','2:30 PM','3:00 PM','3:30 PM','4:00 PM','4:30 PM',
  '5:00 PM','5:30 PM','6:00 PM',
];

const INITIAL_APPOINTMENTS: Appointment[] = [
  { id: 1, customer: 'James Wilson',   service: 'Account Opening',       industry: 'Banking & Finance',   date: '2026-05-07', time: '10:30 AM', status: 'upcoming',  notes: 'First time customer'  },
  { id: 2, customer: 'Maria Santos',   service: 'Loan Consultation',     industry: 'Banking & Finance',   date: '2026-05-07', time: '11:00 AM', status: 'upcoming',  notes: ''                     },
  { id: 3, customer: 'David Chen',     service: 'General Consultation',  industry: 'Healthcare',          date: '2026-05-06', time: '2:00 PM',  status: 'completed', notes: ''                     },
  { id: 4, customer: 'Priya Patel',    service: 'Document Processing',   industry: 'Government Services', date: '2026-05-05', time: '9:00 AM',  status: 'cancelled', notes: 'Rescheduled'          },
  { id: 5, customer: 'Lucas Oliveira', service: 'Course Registration',   industry: 'Education',           date: '2026-05-07', time: '3:30 PM',  status: 'upcoming',  notes: ''                     },
  { id: 6, customer: 'Aisha Nwosu',    service: 'IT Support',            industry: 'Corporate Office',    date: '2026-05-07', time: '4:00 PM',  status: 'upcoming',  notes: 'Returning client'     },
  { id: 7, customer: 'Tom Harris',     service: 'Credit Card Services',  industry: 'Banking & Finance',   date: '2026-05-08', time: '9:30 AM',  status: 'upcoming',  notes: ''                     },
  { id: 8, customer: 'Fatima Al-Rashid', service: 'Pharmacy Pickup',    industry: 'Healthcare',          date: '2026-05-06', time: '1:00 PM',  status: 'completed', notes: ''                     },
];

const BLANK_FORM = {
  customer: '',
  service: '',
  industry: INDUSTRY_LIST[0],
  date: todayISO(),
  time: '9:00 AM',
  notes: '',
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function AdminAppointments() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [tab,    setTab]    = useState<TabKey>('all');
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const today = todayISO();

  const filtered = useMemo(() => {
    return appointments.filter(a => {
      const matchTab    = tab === 'all' || a.status === tab;
      const matchSearch = search.trim() === ''
        || a.customer.toLowerCase().includes(search.toLowerCase())
        || a.service.toLowerCase().includes(search.toLowerCase())
        || a.industry.toLowerCase().includes(search.toLowerCase());
      return matchTab && matchSearch;
    });
  }, [appointments, tab, search]);

  const totalCount     = appointments.length;
  const upcomingCount  = appointments.filter(a => a.status === 'upcoming').length;
  const todayCount     = appointments.filter(a => isToday(a.date) && a.status === 'upcoming').length;

  const handleCancel = (id: number) => {
    Alert.alert('Cancel Appointment', 'Mark this appointment as cancelled?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: () =>
          setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a))
      },
    ]);
  };

  const handleComplete = (id: number) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'completed' } : a));
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete Appointment', 'Permanently remove this appointment?', [
      { text: 'No', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () =>
          setAppointments(prev => prev.filter(a => a.id !== id))
      },
    ]);
  };

  const openModal = () => {
    setForm({ ...BLANK_FORM, date: todayISO() });
    setErrors({});
    setModalVisible(true);
  };

  const validateDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);

  const handleAdd = () => {
    const e: Record<string, string> = {};
    if (!form.customer.trim()) e.customer = 'Customer name is required';
    if (!form.service.trim())  e.service  = 'Service is required';
    if (!form.date.trim())     e.date     = 'Date is required';
    else if (!validateDate(form.date)) e.date = 'Use format YYYY-MM-DD';
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setAppointments(prev => [{
      id: Date.now(),
      customer: form.customer.trim(),
      service: form.service.trim(),
      industry: form.industry,
      date: form.date.trim(),
      time: form.time,
      status: 'upcoming',
      notes: form.notes.trim(),
    }, ...prev]);
    setModalVisible(false);
  };

  const tabCount = (key: TabKey) =>
    key === 'all' ? appointments.length : appointments.filter(a => a.status === key).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/admin/dashboard' as any)}
          style={styles.backBtn}
        >
          <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointments</Text>
        <TouchableOpacity style={styles.addHeaderBtn} onPress={openModal} activeOpacity={0.8}>
          <MaterialIcons name="add" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats banner */}
      <View style={styles.statsBanner}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalCount}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#2563eb' }]}>{upcomingCount}</Text>
          <Text style={styles.statLabel}>Upcoming</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#059669' }]}>{todayCount}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <MaterialIcons name="search" size={18} color="#94a3b8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by customer, service or industry…"
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
            <MaterialIcons name="close" size={16} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContent}
      >
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
            activeOpacity={0.75}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
            <View style={[styles.tabBadge, tab === t.key && styles.tabBadgeActive]}>
              <Text style={[styles.tabBadgeText, tab === t.key && styles.tabBadgeTextActive]}>{tabCount(t.key)}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {filtered.map(appt => {
          const meta    = STATUS_META[appt.status];
          const indStyle = INDUSTRY_COLORS[appt.industry] ?? { color: '#475569', bg: '#f1f5f9' };
          const todayFlag = isToday(appt.date);

          return (
            <View key={appt.id} style={[styles.card, todayFlag && appt.status === 'upcoming' && styles.cardToday]}>
              {todayFlag && appt.status === 'upcoming' && (
                <View style={styles.todayBanner}>
                  <MaterialIcons name="today" size={11} color="#2563eb" />
                  <Text style={styles.todayText}>Today</Text>
                </View>
              )}

              <View style={styles.cardTop}>
                {/* Avatar */}
                <View style={[styles.avatar, { backgroundColor: indStyle.bg }]}>
                  <Text style={[styles.avatarText, { color: indStyle.color }]}>{initials(appt.customer).toUpperCase()}</Text>
                </View>

                {/* Info */}
                <View style={styles.cardInfo}>
                  <Text style={styles.customerName}>{appt.customer}</Text>
                  <Text style={styles.serviceName}>{appt.service}</Text>
                </View>

                {/* Status badge */}
                <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                  <MaterialIcons name={meta.icon} size={11} color={meta.color} />
                  <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                </View>
              </View>

              {/* Industry + date/time row */}
              <View style={styles.metaRow}>
                <View style={[styles.industryPill, { backgroundColor: indStyle.bg }]}>
                  <Text style={[styles.industryPillText, { color: indStyle.color }]}>{appt.industry}</Text>
                </View>
                <View style={styles.metaItem}>
                  <MaterialIcons name="event" size={12} color="#94a3b8" />
                  <Text style={styles.metaText}>{formatDate(appt.date)}</Text>
                </View>
                <View style={styles.metaItem}>
                  <MaterialIcons name="access-time" size={12} color="#94a3b8" />
                  <Text style={styles.metaText}>{appt.time}</Text>
                </View>
              </View>

              {/* Notes */}
              {!!appt.notes && (
                <View style={styles.notesRow}>
                  <MaterialIcons name="notes" size={12} color="#94a3b8" />
                  <Text style={styles.notesText}>{appt.notes}</Text>
                </View>
              )}

              {/* Action buttons */}
              {appt.status === 'upcoming' ? (
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(appt.id)} activeOpacity={0.8}>
                    <MaterialIcons name="close" size={13} color="#e11d48" />
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.completeBtn} onPress={() => handleComplete(appt.id)} activeOpacity={0.8}>
                    <MaterialIcons name="check" size={13} color="#fff" />
                    <Text style={styles.completeBtnText}>Mark Complete</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(appt.id)} activeOpacity={0.8}>
                    <MaterialIcons name="delete-outline" size={15} color="#94a3b8" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(appt.id)} activeOpacity={0.8}>
                    <MaterialIcons name="delete-outline" size={15} color="#94a3b8" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcons name="event-busy" size={52} color="#e2e8f0" />
            <Text style={styles.emptyTitle}>No appointments found</Text>
            <Text style={styles.emptySubtitle}>
              {search ? 'Try a different search term.' : 'Tap + to add a new appointment.'}
            </Text>
          </View>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>

      <BottomNav />

      {/* ── Add Appointment Modal ─────────────────────────────── */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalKAV}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>New Appointment</Text>
                  <Text style={styles.modalSubtitle}>Fill in the details below</Text>
                </View>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                  <MaterialIcons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBody}>

                {/* Customer name */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Customer Name *</Text>
                  <TextInput
                    style={[styles.input, errors.customer ? styles.inputError : null]}
                    placeholder="e.g. John Smith"
                    placeholderTextColor="#94a3b8"
                    value={form.customer}
                    onChangeText={v => { setForm(f => ({ ...f, customer: v })); setErrors(e => ({ ...e, customer: '' })); }}
                    autoCapitalize="words"
                  />
                  {!!errors.customer && <Text style={styles.errorText}>{errors.customer}</Text>}
                </View>

                {/* Industry */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Industry</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                    {INDUSTRY_LIST.map(ind => (
                      <TouchableOpacity
                        key={ind}
                        style={[styles.pill, form.industry === ind && styles.pillActive]}
                        onPress={() => setForm(f => ({ ...f, industry: ind }))}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.pillText, form.industry === ind && styles.pillTextActive]}>{ind}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Service */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Service *</Text>
                  <TextInput
                    style={[styles.input, errors.service ? styles.inputError : null]}
                    placeholder="e.g. Account Opening"
                    placeholderTextColor="#94a3b8"
                    value={form.service}
                    onChangeText={v => { setForm(f => ({ ...f, service: v })); setErrors(e => ({ ...e, service: '' })); }}
                    autoCapitalize="words"
                  />
                  {!!errors.service && <Text style={styles.errorText}>{errors.service}</Text>}
                </View>

                {/* Date */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Date * (YYYY-MM-DD)</Text>
                  <TextInput
                    style={[styles.input, errors.date ? styles.inputError : null]}
                    placeholder="e.g. 2026-05-10"
                    placeholderTextColor="#94a3b8"
                    value={form.date}
                    onChangeText={v => { setForm(f => ({ ...f, date: v })); setErrors(e => ({ ...e, date: '' })); }}
                    keyboardType="numbers-and-punctuation"
                  />
                  {!!errors.date && <Text style={styles.errorText}>{errors.date}</Text>}
                </View>

                {/* Time */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Time</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                    {TIME_SLOTS.map(t => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.timePill, form.time === t && styles.timePillActive]}
                        onPress={() => setForm(f => ({ ...f, time: t }))}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.timePillText, form.time === t && styles.timePillTextActive]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Notes */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Notes (optional)</Text>
                  <TextInput
                    style={[styles.input, styles.inputMultiline]}
                    placeholder="Any additional notes…"
                    placeholderTextColor="#94a3b8"
                    value={form.notes}
                    onChangeText={v => setForm(f => ({ ...f, notes: v }))}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>

                <TouchableOpacity style={styles.submitBtn} onPress={handleAdd} activeOpacity={0.85}>
                  <MaterialIcons name="event-available" size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>Book Appointment</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  addHeaderBtn: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: '#2563eb',
    alignItems: 'center', justifyContent: 'center',
  },

  // Stats banner
  statsBanner: {
    flexDirection: 'row', backgroundColor: '#fff',
    paddingVertical: 14, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  statLabel: { fontSize: 11, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.3 },
  statDivider: { width: 1, backgroundColor: '#e2e8f0', marginVertical: 4 },

  // Search
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    borderRadius: 14, borderWidth: 1.5, borderColor: '#e2e8f0', paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 13, color: '#0f172a', paddingVertical: 11 },
  clearBtn: { padding: 4 },

  // Tabs
  tabsScroll: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', marginTop: 8 },
  tabsContent: { paddingHorizontal: 16, gap: 4 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#2563eb' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#2563eb', fontWeight: '800' },
  tabBadge: { backgroundColor: '#f1f5f9', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  tabBadgeActive: { backgroundColor: '#eff6ff' },
  tabBadgeText: { fontSize: 10, fontWeight: '700', color: '#94a3b8' },
  tabBadgeTextActive: { color: '#2563eb' },

  // Content
  content: { padding: 16, gap: 10, paddingBottom: 16 },

  // Cards
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0', gap: 10,
  },
  cardToday: { borderColor: '#bfdbfe', borderWidth: 1.5 },
  todayBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  todayText: { fontSize: 10, fontWeight: '800', color: '#2563eb', textTransform: 'uppercase', letterSpacing: 0.4 },

  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '900' },
  cardInfo: { flex: 1 },
  customerName: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  serviceName: { fontSize: 12, fontWeight: '500', color: '#64748b', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 10, fontWeight: '800' },

  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  industryPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  industryPillText: { fontSize: 10, fontWeight: '700' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#64748b', fontWeight: '500' },

  notesRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5 },
  notesText: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic', flex: 1 },

  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 4, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  cancelBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 9, borderRadius: 10, backgroundColor: '#fff1f2',
    borderWidth: 1, borderColor: '#fecaca',
  },
  cancelBtnText: { fontSize: 12, fontWeight: '700', color: '#e11d48' },
  completeBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 9, borderRadius: 10, backgroundColor: '#059669',
  },
  completeBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  deleteBtn: {
    width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
  },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#64748b' },
  emptySubtitle: { fontSize: 13, fontWeight: '500', color: '#94a3b8' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  modalKAV: { justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%', paddingBottom: 32 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  modalSubtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  modalBody: { padding: 20, gap: 16, paddingBottom: 8 },

  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  input: {
    borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#0f172a', backgroundColor: '#f8fafc',
  },
  inputMultiline: { height: 80, paddingTop: 12 },
  inputError: { borderColor: '#e11d48' },
  errorText: { fontSize: 11, color: '#e11d48', fontWeight: '600' },

  pillRow: { gap: 8, paddingVertical: 4 },
  pill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: '#f1f5f9', borderWidth: 1.5, borderColor: '#e2e8f0' },
  pillActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  pillText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  pillTextActive: { color: '#fff' },

  timePill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: '#f1f5f9', borderWidth: 1.5, borderColor: '#e2e8f0' },
  timePillActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  timePillText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  timePillTextActive: { color: '#fff' },

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2563eb', paddingVertical: 15, borderRadius: 16, marginTop: 4 },
  submitBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
