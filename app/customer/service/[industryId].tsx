import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppContext } from '@/context/AppContext';
import { useNotifications } from '@/context/NotificationContext';
import { api } from '@/lib/api';
import BottomNav from '@/components/BottomNav';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];
type Step = 'service' | 'branch' | 'action';

type Service = { id: string; name: string; waitTime: number; icon: IconName };
type Branch  = { id: string; name: string; address: string; queue?: number };

// ─── Static data ──────────────────────────────────────────────────────────────

const INDUSTRY_META: Record<string, { label: string; icon: IconName; color: string; bg: string }> = {
  banking:    { label: 'Banking & Finance',  icon: 'account-balance', color: '#2563eb', bg: '#eff6ff' },
  healthcare: { label: 'Healthcare',          icon: 'favorite',        color: '#e11d48', bg: '#fff1f2' },
  retail:     { label: 'Retail',              icon: 'shopping-bag',    color: '#d97706', bg: '#fffbeb' },
  government: { label: 'Government Services', icon: 'gavel',           color: '#475569', bg: '#f1f5f9' },
  education:  { label: 'Education',           icon: 'school',          color: '#4f46e5', bg: '#eef2ff' },
  corporate:  { label: 'Corporate Office',    icon: 'business',        color: '#0d9488', bg: '#f0fdfa' },
};

type ApiIndustry = { key: string; label: string; icon: string; color: string };

const BRANCHES: Record<string, Branch[]> = {
  banking: [
    { id: 'b1', name: 'Manhattan Financial Center', address: '123 Wall St, New York',      queue: 1 },
    { id: 'b2', name: 'Brooklyn Service Hub',        address: '456 Atlantic Ave, Brooklyn', queue: 0 },
    { id: 'b3', name: 'Queens Branch',               address: '789 Queens Blvd, Queens',    queue: 2 },
  ],
  healthcare: [
    { id: 'b1', name: 'Main Hospital — Downtown',    address: '10 Medical Blvd, Downtown',  queue: 2 },
    { id: 'b2', name: 'Northside Clinic',            address: '22 Health Ave, Northside',   queue: 1 },
    { id: 'b3', name: 'Eastside Medical Center',     address: '88 Eastside Rd, East',       queue: 3 },
  ],
  retail: [
    { id: 'b1', name: 'Flagship Store — Downtown',   address: '1 Retail Plaza, Downtown',   queue: 1 },
    { id: 'b2', name: 'Mall Branch',                 address: 'Level 2, Central Mall',      queue: 0 },
    { id: 'b3', name: 'Westside Outlet',             address: '55 West Rd, Westside',       queue: 2 },
  ],
  government: [
    { id: 'b1', name: 'City Hall — Main Office',     address: '1 Civic Square, Downtown',   queue: 2 },
    { id: 'b2', name: 'North District Office',       address: '44 North Ave, Northgate',    queue: 1 },
    { id: 'b3', name: 'South Service Centre',        address: '77 South Rd, Southville',    queue: 2 },
  ],
  education: [
    { id: 'b1', name: 'Main Campus — Admin Block',   address: 'Building A, Main Campus',    queue: 1 },
    { id: 'b2', name: 'East Campus',                 address: 'East Wing, Campus B',        queue: 0 },
    { id: 'b3', name: 'City Learning Centre',        address: '12 City Rd, Downtown',       queue: 1 },
  ],
  corporate: [
    { id: 'b1', name: 'HQ Tower A — Floor 12',       address: '1 Corporate Blvd, CBD',      queue: 0 },
    { id: 'b2', name: 'West Office Park',             address: '33 Business Park, West',    queue: 1 },
    { id: 'b3', name: 'East Hub',                     address: '88 East Business Park',     queue: 1 },
  ],
};

const SERVICES: Record<string, Service[]> = {
  banking: [
    { id: 'teller',  name: 'Teller Services',   waitTime: 5,  icon: 'point-of-sale' },
    { id: 'loan',    name: 'Loan Consultation',  waitTime: 10, icon: 'attach-money' },
    { id: 'cs',      name: 'Customer Service',   waitTime: 3,  icon: 'headset-mic' },
    { id: 'account', name: 'Account Opening',    waitTime: 8,  icon: 'account-balance-wallet' },
    { id: 'card',    name: 'Card Services',      waitTime: 5,  icon: 'credit-card' },
  ],
  healthcare: [
    { id: 'general',    name: 'General Practitioner', waitTime: 10, icon: 'local-hospital' },
    { id: 'pharmacy',   name: 'Pharmacy Pickup',      waitTime: 2,  icon: 'medical-services' },
    { id: 'lab',        name: 'Blood Test / Lab',     waitTime: 7,  icon: 'biotech' },
    { id: 'dental',     name: 'Dental',               waitTime: 8,  icon: 'health-and-safety' },
    { id: 'specialist', name: 'Specialist Consult',   waitTime: 12, icon: 'person-search' },
  ],
  retail: [
    { id: 'returns',  name: 'Returns & Exchanges', waitTime: 4, icon: 'assignment-return' },
    { id: 'customer', name: 'Customer Service',    waitTime: 3, icon: 'headset-mic' },
    { id: 'tech',     name: 'Tech Support',        waitTime: 8, icon: 'devices' },
    { id: 'collect',  name: 'Click & Collect',     waitTime: 2, icon: 'inventory' },
  ],
  government: [
    { id: 'documents', name: 'Document Processing',   waitTime: 12, icon: 'description' },
    { id: 'permits',   name: 'Permits & Licenses',    waitTime: 10, icon: 'badge' },
    { id: 'inquiries', name: 'General Inquiries',     waitTime: 5,  icon: 'help-outline' },
    { id: 'renewal',   name: 'ID / Passport Renewal', waitTime: 15, icon: 'recent-actors' },
  ],
  education: [
    { id: 'admissions', name: 'Admissions',       waitTime: 7, icon: 'school' },
    { id: 'registrar',  name: 'Registrar',        waitTime: 5, icon: 'assignment' },
    { id: 'finance',    name: 'Financial Aid',    waitTime: 8, icon: 'attach-money' },
    { id: 'library',    name: 'Library Services', waitTime: 2, icon: 'menu-book' },
  ],
  corporate: [
    { id: 'reception',  name: 'Reception',   waitTime: 2, icon: 'meeting-room' },
    { id: 'hr',         name: 'HR Services', waitTime: 7, icon: 'people' },
    { id: 'it',         name: 'IT Support',  waitTime: 5, icon: 'computer' },
    { id: 'facilities', name: 'Facilities',  waitTime: 3, icon: 'build' },
  ],
};


// ─── Types ────────────────────────────────────────────────────────────────────

type QueueTicketResponse = {
  id: number;
  ticket_number: string;
  service_name: string;
  branch_name: string;
  status: 'waiting' | 'called' | 'serving' | 'completed' | 'cancelled';
  position: number;
  estimated_wait: number;
  issued_at: string;
  ahead_tickets: string[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt12h(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h > 12 ? h - 12 : h === 0 ? 12 : h}:${m} ${h >= 12 ? 'PM' : 'AM'}`;
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
  const { showToast } = useNotifications();

  const id       = (industryId ?? 'banking').toLowerCase();
  const staticMeta = INDUSTRY_META[id];
  const services   = SERVICES[id] ?? SERVICES.corporate;

  const [step,           setStep]          = useState<Step>('service');
  const [service,        setService]       = useState<Service | null>(null);
  const [branch,         setBranch]        = useState<Branch | null>(null);
  const [joining,        setJoining]       = useState(false);
  const [dbBranches,     setDbBranches]    = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [branchCounts,   setBranchCounts]  = useState<Record<string, number> | null>(null);
  const [loadingCounts,  setLoadingCounts] = useState(false);
  const [apiMeta,        setApiMeta]       = useState<ApiIndustry | null>(null);

  // Resolved meta: prefer API data for dynamic industries, fall back to static
  const meta = apiMeta
    ? {
        label: apiMeta.label,
        icon:  (apiMeta.icon ?? 'business') as IconName,
        color: apiMeta.color ?? '#0d9488',
        bg:    (apiMeta.color ?? '#0d9488') + '18',
      }
    : staticMeta ?? { label: id, icon: 'business' as IconName, color: '#0d9488', bg: '#f0fdfa' };

  useEffect(() => {
    // Load branches from DB
    api.get<{ id: number; name: string; address: string }[]>('/branches/').then(({ data }) => {
      if (data && data.length > 0) {
        setDbBranches(data.map(b => ({ id: String(b.id), name: b.name, address: b.address ?? '' })));
      }
      setLoadingBranches(false);
    });

    // Load industry meta from API for dynamic industries
    if (!staticMeta) {
      api.get<{ key: string; label: string; icon: string; color: string }[]>('/businesses/visible-industries/')
        .then(({ data }) => {
          if (data) {
            const found = data.find((i: any) => i.key === id);
            if (found) setApiMeta(found);
          }
        });
    }
  }, [id]);

  const branches = dbBranches.length > 0 ? dbBranches : (BRANCHES[id] ?? BRANCHES.corporate);
  const [existingTicket,   setExistingTicket]   = useState<QueueTicketResponse | null>(null);
  const [checkingTicket,   setCheckingTicket]   = useState(false);
  const [cancellingTicket, setCancellingTicket] = useState(false);

  // While an existing-ticket card is showing, poll it every 8 s.
  // The moment staff completes or cancels it, clear the card so
  // "Join Queue" appears automatically — no manual refresh needed.
  useEffect(() => {
    if (!existingTicket) return;
    const ticketId = existingTicket.id;
    const interval = setInterval(async () => {
      const { data } = await api.get<QueueTicketResponse>(`/queues/${ticketId}/`);
      // Card clears as soon as ticket is called, served, completed, or cancelled
      const done = !data || ['called', 'serving', 'completed', 'cancelled', 'missed'].includes(data.status);
      if (done) {
        setExistingTicket(null);
        showToast('You can now take a new ticket', 'Your previous ticket has been called or attended to.', 'queue');
      } else {
        setExistingTicket(data);
      }
    }, 8_000);
    return () => clearInterval(interval);
  }, [existingTicket?.id]);

  const stepIndex = STEPS.indexOf(step);

  const selRealCount = branch && branchCounts !== null ? (branchCounts[branch.name] ?? 0) : 0;
  const selRealWait  = service
    ? (selRealCount > 0 ? selRealCount * service.waitTime : service.waitTime)
    : 0;

  const handleBack = () => {
    if (step === 'service') {
      router.canGoBack() ? router.back() : router.replace('/customer/home' as any);
    } else if (step === 'branch') {
      setStep('service');
    } else {
      setStep('branch');
    }
  };

  const checkExistingTicket = async (serviceName: string, branchName: string) => {
    setCheckingTicket(true);
    setExistingTicket(null);
    const { data } = await api.get<QueueTicketResponse>(
      `/queues/check-ticket/?service_name=${encodeURIComponent(serviceName)}&branch_name=${encodeURIComponent(branchName)}`
    );
    setCheckingTicket(false);
    if (data) setExistingTicket(data);
  };

  const handleViewExistingTicket = () => {
    if (!existingTicket) return;
    setActiveTicket({
      ticketId:     existingTicket.id,
      ticketNumber: existingTicket.ticket_number,
      service:      existingTicket.service_name,
      industry:     meta.label,
      branch:       existingTicket.branch_name,
      waitTime:     existingTicket.estimated_wait,
      peopleAhead:  Math.max(0, existingTicket.position - 1),
      issuedAt:     fmt12h(existingTicket.issued_at),
      status:       existingTicket.status === 'cancelled' ? 'completed' : existingTicket.status,
      aheadTickets: existingTicket.ahead_tickets,
    });
    router.push('/customer/ticket' as any);
  };

  const handleRefreshExistingTicket = async () => {
    if (!existingTicket) return;
    setCheckingTicket(true);
    const { data } = await api.get<QueueTicketResponse>(`/queues/${existingTicket.id}/`);
    setCheckingTicket(false);
    const done = !data || ['called', 'serving', 'completed', 'cancelled', 'missed'].includes(data.status);
    if (done) {
      setExistingTicket(null);
    } else {
      setExistingTicket(data);
    }
  };

  const handleCancelExistingTicket = () => {
    if (!existingTicket) return;
    Alert.alert(
      'Cancel Ticket',
      `Cancel ticket ${existingTicket.ticket_number} for ${existingTicket.service_name}?`,
      [
        { text: 'Keep Ticket', style: 'cancel' },
        {
          text: 'Cancel Ticket',
          style: 'destructive',
          onPress: async () => {
            setCancellingTicket(true);
            await api.post(`/queues/${existingTicket.id}/cancel/`);
            setCancellingTicket(false);
            setExistingTicket(null);
          },
        },
      ],
    );
  };

  const fetchBranchCounts = async (serviceName: string) => {
    setLoadingCounts(true);
    setBranchCounts(null);
    const { data } = await api.get<{ branch_name: string; queue_count: number }[]>(
      `/queues/branch-counts/?service_name=${encodeURIComponent(serviceName)}`
    );
    setLoadingCounts(false);
    setBranchCounts(
      data ? Object.fromEntries(data.map(i => [i.branch_name, i.queue_count])) : {}
    );
  };

  const handleJoinQueue = async (forceCancel = false) => {
    if (!service || !branch || joining) return;
    setJoining(true);

    if (forceCancel) {
      const { data: myTicket } = await api.get<{ id: number }>('/queues/my-ticket/');
      if (myTicket) {
        await api.post(`/queues/${myTicket.id}/cancel/`);
      }
    }

    const { data, error } = await api.post<QueueTicketResponse>('/queues/join/', {
      service_name: service.name,
      branch_name:  branch.name,
      industry:     id,
      estimated_time: service.waitTime,
    });

    setJoining(false);

    if (error || !data) {
      if (!forceCancel && error && error.toLowerCase().includes('active ticket')) {
        Alert.alert(
          'You Have an Active Ticket',
          error,
          [
            { text: 'Cancel & Join New Queue', onPress: () => handleJoinQueue(true) },
            { text: 'View My Ticket', onPress: () => router.push('/customer/ticket' as any) },
            { text: 'Back', style: 'cancel' },
          ],
        );
      } else {
        Alert.alert('Could not join queue', error ?? 'Please try again.');
      }
      return;
    }

    setActiveTicket({
      ticketId:     data.id,
      ticketNumber: data.ticket_number,
      service:      data.service_name,
      industry:     meta.label,
      branch:       data.branch_name,
      waitTime:     data.estimated_wait,
      peopleAhead:  Math.max(0, data.position - 1),
      issuedAt:     fmt12h(data.issued_at),
      status:       data.status === 'cancelled' ? 'completed' : data.status,
      aheadTickets: data.ahead_tickets,
    });

    showToast(
      'You joined the queue!',
      `Ticket ${data.ticket_number} — ${data.service_name} at ${data.branch_name}. Position #${data.position}.`,
      'queue',
    );

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
                onPress={() => { setService(svc); setStep('branch'); fetchBranchCounts(svc.name); }}
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
            {loadingBranches && (
              <ActivityIndicator size="small" color="#2563eb" style={{ marginTop: 24 }} />
            )}
            {!loadingBranches && branches.map(br => {
              const realCount = branchCounts !== null ? (branchCounts[br.name] ?? 0) : (br.queue ?? 0);
              const realWait  = realCount > 0
                ? realCount * (service?.waitTime ?? 15)
                : (service?.waitTime ?? 15);
              const load = loadInfo(realCount);
              return (
                <TouchableOpacity
                  key={br.id}
                  style={s.branchCard}
                  onPress={() => {
                    setBranch(br);
                    setStep('action');
                    if (service) checkExistingTicket(service.name, br.name);
                  }}
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
                      <Text style={s.branchMetaText}>
                        {loadingCounts ? '…' : `~${realWait} min`}
                      </Text>
                    </View>
                    <View style={s.branchMetaItem}>
                      <MaterialIcons name="people" size={13} color="#64748b" />
                      <Text style={s.branchMetaText}>
                        {loadingCounts ? '…' : `${realCount} in queue`}
                      </Text>
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
            {/* Summary card */}
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
                  <Text style={s.summaryValue}>~{selRealWait} min · {selRealCount} people ahead</Text>
                </View>
              </View>
            </View>

            {/* ── Existing active ticket found ─────────────────────────── */}
            {checkingTicket && (
              <View style={s.checkingCard}>
                <ActivityIndicator size="small" color="#d97706" />
                <Text style={s.checkingText}>Checking your active tickets…</Text>
              </View>
            )}

            {!checkingTicket && existingTicket && (
              <View style={s.existingCard}>
                {/* Badge */}
                <View style={s.existingBadge}>
                  <MaterialIcons name="confirmation-number" size={15} color="#d97706" />
                  <Text style={s.existingBadgeText}>You already have an active ticket</Text>
                </View>

                {/* Ticket number */}
                <View style={[s.existingTicketNumWrap, { backgroundColor: meta.bg }]}>
                  <Text style={[s.existingTicketNum, { color: meta.color }]}>
                    {existingTicket.ticket_number}
                  </Text>
                </View>
                <Text style={s.existingServiceMsg}>
                  Active {existingTicket.service_name} ticket
                </Text>

                {/* Info row */}
                <View style={s.existingInfoRow}>
                  <View style={s.existingInfoItem}>
                    <Text style={s.existingInfoLabel}>STATUS</Text>
                    <Text style={[s.existingInfoValue, {
                      color: existingTicket.status === 'called'  ? '#d97706' :
                             existingTicket.status === 'serving' ? '#059669' : '#2563eb',
                    }]}>
                      {existingTicket.status === 'called'    ? 'Called!'    :
                       existingTicket.status === 'serving'   ? 'In Service' : 'Waiting'}
                    </Text>
                  </View>
                  <View style={s.existingInfoDivider} />
                  <View style={s.existingInfoItem}>
                    <Text style={s.existingInfoLabel}>POSITION</Text>
                    <Text style={s.existingInfoValue}>#{existingTicket.position}</Text>
                  </View>
                  <View style={s.existingInfoDivider} />
                  <View style={s.existingInfoItem}>
                    <Text style={s.existingInfoLabel}>EST. WAIT</Text>
                    <Text style={s.existingInfoValue}>
                      {existingTicket.estimated_wait > 0 ? `${existingTicket.estimated_wait}m` : '—'}
                    </Text>
                  </View>
                </View>

                {/* Primary action: View Ticket */}
                <TouchableOpacity style={s.existingViewBtn} onPress={handleViewExistingTicket} activeOpacity={0.85}>
                  <MaterialIcons name="open-in-new" size={17} color="#fff" />
                  <Text style={s.existingViewBtnText}>View Ticket</Text>
                </TouchableOpacity>

                {/* Secondary actions */}
                <View style={s.existingSecRow}>
                  <TouchableOpacity
                    style={s.existingSecBtn}
                    onPress={handleRefreshExistingTicket}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="refresh" size={15} color="#2563eb" />
                    <Text style={s.existingSecBtnText}>Refresh Queue</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.existingSecBtn}
                    onPress={handleViewExistingTicket}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="hourglass-empty" size={15} color="#059669" />
                    <Text style={[s.existingSecBtnText, { color: '#059669' }]}>Continue Waiting</Text>
                  </TouchableOpacity>
                </View>

                {/* Cancel ticket */}
                <TouchableOpacity
                  style={s.existingCancelBtn}
                  onPress={handleCancelExistingTicket}
                  disabled={cancellingTicket}
                  activeOpacity={0.8}
                >
                  {cancellingTicket
                    ? <ActivityIndicator size="small" color="#e11d48" />
                    : <>
                        <MaterialIcons name="cancel" size={15} color="#e11d48" />
                        <Text style={s.existingCancelBtnText}>Cancel Ticket</Text>
                      </>
                  }
                </TouchableOpacity>
              </View>
            )}

            {/* ── No existing ticket — join options ──────────────────── */}
            {!checkingTicket && !existingTicket && (
              <>
                <Text style={s.sectionLabel}>Choose how to proceed</Text>

                {/* Join Queue */}
                <TouchableOpacity
                  style={[s.actionCard, joining && { opacity: 0.7 }]}
                  onPress={() => handleJoinQueue()}
                  activeOpacity={0.85}
                  disabled={joining}
                >
                  <View style={[s.actionIconWrap, { backgroundColor: '#eff6ff' }]}>
                    {joining
                      ? <ActivityIndicator size="small" color="#2563eb" />
                      : <MaterialIcons name="queue" size={30} color="#2563eb" />
                    }
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.actionTitle, { color: '#2563eb' }]}>
                      {joining ? 'Joining Queue…' : 'Join Queue'}
                    </Text>
                    <Text style={s.actionDesc}>Get a virtual ticket and wait your turn. You'll be notified when it's your time.</Text>
                  </View>
                  {!joining && <MaterialIcons name="chevron-right" size={22} color="#2563eb" />}
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
          </>
        )}
      </ScrollView>
      <BottomNav />
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
  backBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', flex: 1, textAlign: 'center' },

  stepBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 48,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  stepDot:       { width: 28, height: 28, borderRadius: 14, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: '#2563eb' },
  stepDotDone:   { backgroundColor: '#059669' },
  stepNum:       { fontSize: 11, fontWeight: '800', color: '#64748b' },
  stepLine:      { flex: 1, height: 2, backgroundColor: '#e2e8f0', marginHorizontal: 8 },
  stepLineDone:  { backgroundColor: '#059669' },

  content:      { padding: 16, gap: 10, paddingBottom: 40 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2, marginTop: 4 },

  serviceCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#0f172a', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  serviceIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  serviceName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  serviceMeta: { fontSize: 12, color: '#94a3b8', fontWeight: '500', marginTop: 2 },

  pill:     { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, alignSelf: 'flex-start' },
  pillIcon: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  pillText: { fontSize: 13, fontWeight: '700' },

  branchCard:     { backgroundColor: '#fff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', gap: 10, shadowColor: '#0f172a', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  branchTop:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  branchIconWrap: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  branchName:     { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  branchAddr:     { fontSize: 12, color: '#64748b', fontWeight: '500', marginTop: 2 },
  branchMeta:     { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', paddingLeft: 54 },
  branchMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  branchMetaText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  loadPill:       { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  loadPillText:   { fontSize: 11, fontWeight: '700' },

  summaryCard:  { backgroundColor: '#fff', borderRadius: 20, padding: 4, borderWidth: 1, borderColor: '#e2e8f0' },
  summaryRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  summaryIcon:  { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  summaryLabel: { fontSize: 11, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4 },
  summaryValue: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginTop: 2 },
  summaryAddr:  { fontSize: 12, color: '#64748b', fontWeight: '500', marginTop: 1 },
  summarySep:   { height: 1, backgroundColor: '#f1f5f9', marginHorizontal: 14 },

  actionCard:     { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 2, borderColor: '#bfdbfe', shadowColor: '#0f172a', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  actionIconWrap: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  actionTitle:    { fontSize: 17, fontWeight: '800', marginBottom: 4 },
  actionDesc:     { fontSize: 13, color: '#64748b', fontWeight: '500', lineHeight: 18 },

  checkingCard:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fffbeb', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#fde68a' },
  checkingText:   { fontSize: 13, fontWeight: '600', color: '#92400e' },

  existingCard:         { backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 2, borderColor: '#fde68a', gap: 14, shadowColor: '#d97706', shadowOpacity: 0.1, shadowRadius: 12, elevation: 3 },
  existingBadge:        { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fffbeb', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  existingBadgeText:    { fontSize: 12, fontWeight: '700', color: '#92400e' },
  existingTicketNumWrap:{ alignSelf: 'center', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 16 },
  existingTicketNum:    { fontSize: 40, fontWeight: '900', letterSpacing: 2, textAlign: 'center' },
  existingServiceMsg:   { fontSize: 14, fontWeight: '600', color: '#64748b', textAlign: 'center', marginTop: -6 },
  existingInfoRow:      { flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 14, padding: 14 },
  existingInfoItem:     { flex: 1, alignItems: 'center', gap: 4 },
  existingInfoDivider:  { width: 1, backgroundColor: '#e2e8f0' },
  existingInfoLabel:    { fontSize: 9, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 },
  existingInfoValue:    { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  existingViewBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 14 },
  existingViewBtnText:  { fontSize: 15, fontWeight: '800', color: '#fff' },
  existingSecRow:       { flexDirection: 'row', gap: 10 },
  existingSecBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#eff6ff', borderRadius: 12, paddingVertical: 11, borderWidth: 1, borderColor: '#bfdbfe' },
  existingSecBtnText:   { fontSize: 12, fontWeight: '700', color: '#2563eb' },
  existingCancelBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff1f2' },
  existingCancelBtnText:{ fontSize: 13, fontWeight: '700', color: '#e11d48' },
});
