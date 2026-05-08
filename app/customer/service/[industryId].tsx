import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppContext } from '@/context/AppContext';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];
type Step = 'service' | 'branch' | 'action';

type Service = { id: string; name: string; waitTime: number; icon: IconName };
type Branch  = { id: string; name: string; address: string; waitTime: number; queue: number };

// ─── Static data ──────────────────────────────────────────────────────────────

const TICKET_PREFIX: Record<string, string> = {
  banking: 'BNK', healthcare: 'HLT', retail: 'RTL',
  government: 'GOV', education: 'EDU', corporate: 'CRP',
};

const INDUSTRY_META: Record<string, { label: string; icon: IconName; color: string; bg: string }> = {
  banking:    { label: 'Banking & Finance',  icon: 'account-balance', color: '#2563eb', bg: '#eff6ff' },
  healthcare: { label: 'Healthcare',          icon: 'favorite',        color: '#e11d48', bg: '#fff1f2' },
  retail:     { label: 'Retail',              icon: 'shopping-bag',    color: '#d97706', bg: '#fffbeb' },
  government: { label: 'Government Services', icon: 'gavel',           color: '#475569', bg: '#f1f5f9' },
  education:  { label: 'Education',           icon: 'school',          color: '#4f46e5', bg: '#eef2ff' },
  corporate:  { label: 'Corporate Office',    icon: 'business',        color: '#0d9488', bg: '#f0fdfa' },
};

const SERVICES: Record<string, Service[]> = {
  banking: [
    { id: 'teller',  name: 'Teller Services',   waitTime: 15, icon: 'point-of-sale' },
    { id: 'loan',    name: 'Loan Consultation',  waitTime: 45, icon: 'attach-money' },
    { id: 'cs',      name: 'Customer Service',   waitTime: 10, icon: 'headset-mic' },
    { id: 'account', name: 'Account Opening',    waitTime: 30, icon: 'account-balance-wallet' },
    { id: 'card',    name: 'Card Services',      waitTime: 20, icon: 'credit-card' },
  ],
  healthcare: [
    { id: 'general',    name: 'General Practitioner', waitTime: 30, icon: 'local-hospital' },
    { id: 'pharmacy',   name: 'Pharmacy Pickup',      waitTime: 5,  icon: 'medical-services' },
    { id: 'lab',        name: 'Blood Test / Lab',     waitTime: 20, icon: 'biotech' },
    { id: 'dental',     name: 'Dental',               waitTime: 25, icon: 'health-and-safety' },
    { id: 'specialist', name: 'Specialist Consult',   waitTime: 40, icon: 'person-search' },
  ],
  retail: [
    { id: 'returns',  name: 'Returns & Exchanges', waitTime: 12, icon: 'assignment-return' },
    { id: 'customer', name: 'Customer Service',    waitTime: 8,  icon: 'headset-mic' },
    { id: 'tech',     name: 'Tech Support',        waitTime: 25, icon: 'devices' },
    { id: 'collect',  name: 'Click & Collect',     waitTime: 5,  icon: 'inventory' },
  ],
  government: [
    { id: 'documents', name: 'Document Processing',   waitTime: 40, icon: 'description' },
    { id: 'permits',   name: 'Permits & Licenses',    waitTime: 35, icon: 'badge' },
    { id: 'inquiries', name: 'General Inquiries',     waitTime: 15, icon: 'help-outline' },
    { id: 'renewal',   name: 'ID / Passport Renewal', waitTime: 45, icon: 'recent-actors' },
  ],
  education: [
    { id: 'admissions', name: 'Admissions',       waitTime: 20, icon: 'school' },
    { id: 'registrar',  name: 'Registrar',        waitTime: 15, icon: 'assignment' },
    { id: 'finance',    name: 'Financial Aid',    waitTime: 30, icon: 'attach-money' },
    { id: 'library',    name: 'Library Services', waitTime: 5,  icon: 'menu-book' },
  ],
  corporate: [
    { id: 'reception',  name: 'Reception',   waitTime: 5,  icon: 'meeting-room' },
    { id: 'hr',         name: 'HR Services', waitTime: 20, icon: 'people' },
    { id: 'it',         name: 'IT Support',  waitTime: 15, icon: 'computer' },
    { id: 'facilities', name: 'Facilities',  waitTime: 10, icon: 'build' },
  ],
};

const BRANCHES: Record<string, Branch[]> = {
  banking: [
    { id: 'b1', name: 'Manhattan Financial Center', address: '123 Wall St, New York',       waitTime: 14, queue: 4 },
    { id: 'b2', name: 'Brooklyn Service Hub',        address: '456 Atlantic Ave, Brooklyn',  waitTime: 8,  queue: 2 },
    { id: 'b3', name: 'Queens Branch',               address: '789 Queens Blvd, Queens',     waitTime: 22, queue: 7 },
  ],
  healthcare: [
    { id: 'b1', name: 'Main Hospital — Downtown',    address: '10 Medical Blvd, Downtown',   waitTime: 30, queue: 6 },
    { id: 'b2', name: 'Northside Clinic',            address: '22 Health Ave, Northside',    waitTime: 15, queue: 3 },
    { id: 'b3', name: 'Eastside Medical Center',     address: '88 Eastside Rd, East',        waitTime: 45, queue: 9 },
  ],
  retail: [
    { id: 'b1', name: 'Flagship Store — Downtown',   address: '1 Retail Plaza, Downtown',    waitTime: 12, queue: 5 },
    { id: 'b2', name: 'Mall Branch',                 address: 'Level 2, Central Mall',       waitTime: 7,  queue: 2 },
    { id: 'b3', name: 'Westside Outlet',             address: '55 West Rd, Westside',        waitTime: 20, queue: 6 },
  ],
  government: [
    { id: 'b1', name: 'City Hall — Main Office',     address: '1 Civic Square, Downtown',    waitTime: 40, queue: 8 },
    { id: 'b2', name: 'North District Office',       address: '44 North Ave, Northgate',     waitTime: 25, queue: 5 },
    { id: 'b3', name: 'South Service Centre',        address: '77 South Rd, Southville',     waitTime: 35, queue: 6 },
  ],
  education: [
    { id: 'b1', name: 'Main Campus — Admin Block',   address: 'Building A, Main Campus',     waitTime: 20, queue: 4 },
    { id: 'b2', name: 'East Campus',                 address: 'East Wing, Campus B',         waitTime: 10, queue: 2 },
    { id: 'b3', name: 'City Learning Centre',        address: '12 City Rd, Downtown',        waitTime: 30, queue: 5 },
  ],
  corporate: [
    { id: 'b1', name: 'HQ Tower A — Floor 12',       address: '1 Corporate Blvd, CBD',       waitTime: 5,  queue: 1 },
    { id: 'b2', name: 'West Office Park',             address: '33 Business Park, West',      waitTime: 12, queue: 3 },
    { id: 'b3', name: 'East Hub',                     address: '88 East Business Park',       waitTime: 8,  queue: 2 },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function now12h() {
  const d = new Date();
  const h = d.getHours() % 12 || 12;
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
}

function loadInfo(q: number) {
  if (q >= 6) return { label: 'Busy',     color: '#e11d48', bg: '#fff1f2' };
  if (q >= 3) return { label: 'Moderate', color: '#d97706', bg: '#fffbeb' };
  return            { label: 'Quiet',    color: '#059669', bg: '#ecfdf5' };
}

const STEPS: Step[] = ['service', 'branch', 'action'];

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function CustomerServiceList() {
  const router = useRouter();
  const { industryId } = useLocalSearchParams<{ industryId: string }>();
  const { setActiveTicket } = useAppContext();

  const id       = (industryId ?? 'banking').toLowerCase();
  const meta     = INDUSTRY_META[id] ?? INDUSTRY_META.banking;
  const services = SERVICES[id] ?? SERVICES.banking;
  const branches = BRANCHES[id] ?? BRANCHES.banking;
  const prefix   = TICKET_PREFIX[id] ?? 'TKT';

  const [step,    setStep]    = useState<Step>('service');
  const [service, setService] = useState<Service | null>(null);
  const [branch,  setBranch]  = useState<Branch | null>(null);

  const stepIndex = STEPS.indexOf(step);

  const handleBack = () => {
    if (step === 'service') {
      router.canGoBack() ? router.back() : router.replace('/customer/home' as any);
    } else if (step === 'branch') {
      setStep('service');
    } else {
      setStep('branch');
    }
  };

  const handleJoinQueue = () => {
    if (!service || !branch) return;
    const num = `${prefix}-${String(Math.floor(Math.random() * 900) + 100)}`;
    setActiveTicket({
      ticketNumber: num,
      service: service.name,
      industry: meta.label,
      branch: branch.name,
      waitTime: branch.waitTime,
      peopleAhead: branch.queue,
      issuedAt: now12h(),
      status: 'waiting',
    });
    router.push('/customer/ticket' as any);
  };

  const headerTitle =
    step === 'service' ? `${meta.label}` :
    step === 'branch'  ? 'Select a Branch' :
    'How to proceed?';

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={handleBack} style={s.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{headerTitle}</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Step indicator */}
      <View style={s.stepBar}>
        {STEPS.map((st, i) => {
          const done   = i < stepIndex;
          const active = i === stepIndex;
          return (
            <React.Fragment key={st}>
              <View style={[s.stepDot, done && s.stepDotDone, active && s.stepDotActive]}>
                {done
                  ? <MaterialIcons name="check" size={10} color="#fff" />
                  : <Text style={[s.stepNum, (done || active) && { color: '#fff' }]}>{i + 1}</Text>
                }
              </View>
              {i < STEPS.length - 1 && (
                <View style={[s.stepLine, done && s.stepLineDone]} />
              )}
            </React.Fragment>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Step 1: Service ─────────────────────────────────────────────── */}
        {step === 'service' && (
          <>
            <Text style={s.sectionLabel}>Select a service</Text>
            {services.map(svc => (
              <TouchableOpacity
                key={svc.id}
                style={s.serviceCard}
                onPress={() => { setService(svc); setStep('branch'); }}
                activeOpacity={0.8}
              >
                <View style={[s.serviceIcon, { backgroundColor: meta.bg }]}>
                  <MaterialIcons name={svc.icon} size={22} color={meta.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.serviceName}>{svc.name}</Text>
                  <Text style={s.serviceMeta}>~{svc.waitTime} min avg wait</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* ── Step 2: Branch ──────────────────────────────────────────────── */}
        {step === 'branch' && service && (
          <>
            {/* Selected service pill */}
            <View style={[s.pill, { backgroundColor: meta.bg, borderColor: meta.color + '40' }]}>
              <View style={[s.pillIcon, { backgroundColor: meta.color + '20' }]}>
                <MaterialIcons name={service.icon} size={14} color={meta.color} />
              </View>
              <Text style={[s.pillText, { color: meta.color }]}>{service.name}</Text>
            </View>

            <Text style={s.sectionLabel}>Select a branch</Text>
            {branches.map(br => {
              const load = loadInfo(br.queue);
              return (
                <TouchableOpacity
                  key={br.id}
                  style={s.branchCard}
                  onPress={() => { setBranch(br); setStep('action'); }}
                  activeOpacity={0.8}
                >
                  <View style={s.branchTop}>
                    <View style={s.branchIconWrap}>
                      <MaterialIcons name="location-on" size={18} color="#2563eb" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.branchName}>{br.name}</Text>
                      <Text style={s.branchAddr}>{br.address}</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
                  </View>
                  <View style={s.branchMeta}>
                    <View style={s.branchMetaItem}>
                      <MaterialIcons name="schedule" size={13} color="#64748b" />
                      <Text style={s.branchMetaText}>~{br.waitTime} min</Text>
                    </View>
                    <View style={s.branchMetaItem}>
                      <MaterialIcons name="people" size={13} color="#64748b" />
                      <Text style={s.branchMetaText}>{br.queue} in queue</Text>
                    </View>
                    <View style={[s.loadPill, { backgroundColor: load.bg }]}>
                      <Text style={[s.loadPillText, { color: load.color }]}>{load.label}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* ── Step 3: Action ──────────────────────────────────────────────── */}
        {step === 'action' && service && branch && (
          <>
            {/* Summary */}
            <View style={s.summaryCard}>
              <View style={s.summaryRow}>
                <View style={[s.summaryIcon, { backgroundColor: meta.bg }]}>
                  <MaterialIcons name={service.icon} size={18} color={meta.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.summaryLabel}>Service</Text>
                  <Text style={s.summaryValue}>{service.name}</Text>
                </View>
              </View>
              <View style={s.summarySep} />
              <View style={s.summaryRow}>
                <View style={[s.summaryIcon, { backgroundColor: '#eff6ff' }]}>
                  <MaterialIcons name="location-on" size={18} color="#2563eb" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.summaryLabel}>Branch</Text>
                  <Text style={s.summaryValue}>{branch.name}</Text>
                  <Text style={s.summaryAddr}>{branch.address}</Text>
                </View>
              </View>
              <View style={s.summarySep} />
              <View style={s.summaryRow}>
                <View style={[s.summaryIcon, { backgroundColor: '#fffbeb' }]}>
                  <MaterialIcons name="schedule" size={18} color="#d97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.summaryLabel}>Estimated Wait</Text>
                  <Text style={s.summaryValue}>~{branch.waitTime} min · {branch.queue} people ahead</Text>
                </View>
              </View>
            </View>

            <Text style={s.sectionLabel}>Choose how to proceed</Text>

            {/* Join Queue */}
            <TouchableOpacity style={s.actionCard} onPress={handleJoinQueue} activeOpacity={0.85}>
              <View style={[s.actionIconWrap, { backgroundColor: '#eff6ff' }]}>
                <MaterialIcons name="queue" size={30} color="#2563eb" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.actionTitle, { color: '#2563eb' }]}>Join Queue</Text>
                <Text style={s.actionDesc}>Get a virtual ticket and wait your turn. You'll be notified when it's your time.</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#2563eb" />
            </TouchableOpacity>

            {/* Book Appointment */}
            <TouchableOpacity
              style={[s.actionCard, { borderColor: '#a7f3d0' }]}
              onPress={() => router.push('/customer/appointments' as any)}
              activeOpacity={0.85}
            >
              <View style={[s.actionIconWrap, { backgroundColor: '#ecfdf5' }]}>
                <MaterialIcons name="event" size={30} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.actionTitle, { color: '#059669' }]}>Book Appointment</Text>
                <Text style={s.actionDesc}>Schedule a specific time slot and skip the wait entirely.</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#059669" />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', flex: 1, textAlign: 'center' },

  // Step bar
  stepBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 48,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: '#2563eb' },
  stepDotDone:   { backgroundColor: '#059669' },
  stepNum: { fontSize: 11, fontWeight: '800', color: '#64748b' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#e2e8f0', marginHorizontal: 8 },
  stepLineDone: { backgroundColor: '#059669' },

  content: { padding: 16, gap: 10, paddingBottom: 40 },

  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2, marginTop: 4,
  },

  // Service cards
  serviceCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#0f172a', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  serviceIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  serviceName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  serviceMeta: { fontSize: 12, color: '#94a3b8', fontWeight: '500', marginTop: 2 },

  // Selected service pill
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, alignSelf: 'flex-start',
  },
  pillIcon: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  pillText: { fontSize: 13, fontWeight: '700' },

  // Branch cards
  branchCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0', gap: 10,
    shadowColor: '#0f172a', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  branchTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  branchIconWrap: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center',
  },
  branchName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  branchAddr: { fontSize: 12, color: '#64748b', fontWeight: '500', marginTop: 2 },
  branchMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', paddingLeft: 54 },
  branchMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  branchMetaText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  loadPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  loadPillText: { fontSize: 11, fontWeight: '700' },

  // Summary card
  summaryCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 4,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  summaryIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  summaryLabel: { fontSize: 11, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4 },
  summaryValue: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginTop: 2 },
  summaryAddr:  { fontSize: 12, color: '#64748b', fontWeight: '500', marginTop: 1 },
  summarySep: { height: 1, backgroundColor: '#f1f5f9', marginHorizontal: 14 },

  // Action cards
  actionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    borderWidth: 2, borderColor: '#bfdbfe',
    shadowColor: '#0f172a', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  actionIconWrap: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontSize: 17, fontWeight: '800', marginBottom: 4 },
  actionDesc: { fontSize: 13, color: '#64748b', fontWeight: '500', lineHeight: 18 },
});
