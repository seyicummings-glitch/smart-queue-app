import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppContext } from '@/context/AppContext';

type Step = 'service' | 'branch' | 'confirm';

type Service = { id: string; name: string; duration: string; icon: React.ComponentProps<typeof MaterialIcons>['name'] };
type Branch  = { id: string; name: string; address: string; waitTime: number; queue: number };

const SERVICES: Service[] = [
  { id: '1', name: 'Account Opening',       duration: '30 min', icon: 'account-balance-wallet' },
  { id: '2', name: 'Loan Consultation',     duration: '45 min', icon: 'attach-money' },
  { id: '3', name: 'General Inquiry',       duration: '15 min', icon: 'help-outline' },
  { id: '4', name: 'Document Verification', duration: '20 min', icon: 'description' },
  { id: '5', name: 'Credit Card Services',  duration: '25 min', icon: 'credit-card' },
  { id: '6', name: 'Teller Services',       duration: '10 min', icon: 'point-of-sale' },
];

const BRANCHES: Branch[] = [
  { id: 'b1', name: 'Manhattan Financial Center', address: '123 Wall St, New York',      waitTime: 14, queue: 4 },
  { id: 'b2', name: 'Brooklyn Service Hub',        address: '456 Atlantic Ave, Brooklyn', waitTime: 8,  queue: 2 },
  { id: 'b3', name: 'Queens Branch',               address: '789 Queens Blvd, Queens',    waitTime: 22, queue: 7 },
];

const STEPS: Step[] = ['service', 'branch', 'confirm'];

function now12h() {
  const d = new Date();
  const h = d.getHours() % 12 || 12;
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
}

export default function VirtualQueue() {
  const router = useRouter();
  const { setActiveTicket } = useAppContext();

  const [step,     setStep]     = useState<Step>('service');
  const [service,  setService]  = useState<Service | null>(null);
  const [branch,   setBranch]   = useState<Branch | null>(null);
  const [joining,  setJoining]  = useState(false);

  const stepIndex = STEPS.indexOf(step);

  const handleBack = () => {
    if (step === 'service') router.canGoBack() ? router.back() : router.replace('/customer/home' as any);
    else if (step === 'branch')  setStep('service');
    else if (step === 'confirm') setStep('branch');
  };

  const handleJoin = () => {
    if (!service || !branch) return;
    setJoining(true);
    setTimeout(() => {
      const num = `VQ-${String(Math.floor(Math.random() * 900) + 100)}`;
      setActiveTicket({
        ticketNumber: num,
        service: service.name,
        industry: 'Banking',
        branch: branch.name,
        waitTime: branch.waitTime,
        peopleAhead: branch.queue,
        issuedAt: now12h(),
        status: 'waiting',
      });
      setJoining(false);
      // Replace so the back-stack goes home, not back to confirm
      router.replace('/customer/ticket' as any);
    }, 900);
  };

  const StepIndicator = () => (
    <View style={styles.stepRow}>
      {STEPS.map((s, i) => {
        const done   = i < stepIndex;
        const active = i === stepIndex;
        return (
          <React.Fragment key={s}>
            <View style={[styles.stepCircle, done && styles.stepDone, active && styles.stepActive]}>
              {done
                ? <MaterialIcons name="check" size={12} color="#fff" />
                : <Text style={[styles.stepNum, (done || active) && { color: '#fff' }]}>{i + 1}</Text>
              }
            </View>
            {i < STEPS.length - 1 && (
              <View style={[styles.stepLine, done && styles.stepLineDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );

  const Header = ({ title }: { title: string }) => (
    <View style={styles.header}>
      <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
        <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={{ width: 36 }} />
    </View>
  );

  // ── Step 1: Service selection ──────────────────────────────────────────────
  if (step === 'service') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <Header title="Join a Queue" />
        <ScrollView contentContainerStyle={styles.content}>
          <StepIndicator />
          <Text style={styles.stepTitle}>Select a Service</Text>
          <Text style={styles.stepDesc}>Choose the service you need assistance with.</Text>
          {SERVICES.map(s => (
            <TouchableOpacity
              key={s.id}
              style={[styles.optionCard, service?.id === s.id && styles.optionCardActive]}
              onPress={() => setService(s)}
              activeOpacity={0.8}
            >
              <View style={[styles.optionIcon, service?.id === s.id && { backgroundColor: '#2563eb' }]}>
                <MaterialIcons name={s.icon} size={20} color={service?.id === s.id ? '#fff' : '#2563eb'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionName}>{s.name}</Text>
                <Text style={styles.optionMeta}>Approx. {s.duration}</Text>
              </View>
              {service?.id === s.id && <MaterialIcons name="check-circle" size={20} color="#2563eb" />}
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.nextBtn, !service && styles.nextBtnDisabled]}
            onPress={() => service && setStep('branch')}
            disabled={!service}
          >
            <Text style={styles.nextBtnText}>Next: Choose Branch</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Step 2: Branch selection ───────────────────────────────────────────────
  if (step === 'branch') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <Header title="Join a Queue" />
        <ScrollView contentContainerStyle={styles.content}>
          <StepIndicator />
          <Text style={styles.stepTitle}>Select Branch</Text>
          <Text style={styles.stepDesc}>Pick the most convenient location near you.</Text>
          {BRANCHES.map(b => {
            const busy = b.queue >= 6;
            const moderate = b.queue >= 3;
            const loadColor = busy ? '#e11d48' : moderate ? '#d97706' : '#059669';
            const loadBg    = busy ? '#fff1f2' : moderate ? '#fffbeb' : '#ecfdf5';
            const loadLabel = busy ? 'Busy' : moderate ? 'Moderate' : 'Quiet';
            return (
              <TouchableOpacity
                key={b.id}
                style={[styles.branchCard, branch?.id === b.id && styles.optionCardActive]}
                onPress={() => setBranch(b)}
                activeOpacity={0.8}
              >
                <View style={styles.branchTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.branchName}>{b.name}</Text>
                    <Text style={styles.branchAddr}>{b.address}</Text>
                  </View>
                  {branch?.id === b.id && <MaterialIcons name="check-circle" size={20} color="#2563eb" />}
                </View>
                <View style={styles.branchStats}>
                  <View style={styles.branchStat}>
                    <MaterialIcons name="schedule" size={13} color="#64748b" />
                    <Text style={styles.branchStatText}>~{b.waitTime} min wait</Text>
                  </View>
                  <View style={styles.branchStat}>
                    <MaterialIcons name="people" size={13} color="#64748b" />
                    <Text style={styles.branchStatText}>{b.queue} in queue</Text>
                  </View>
                  <View style={[styles.loadPill, { backgroundColor: loadBg }]}>
                    <Text style={[styles.loadPillText, { color: loadColor }]}>{loadLabel}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={[styles.nextBtn, !branch && styles.nextBtnDisabled]}
            onPress={() => branch && setStep('confirm')}
            disabled={!branch}
          >
            <Text style={styles.nextBtnText}>Next: Confirm</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Step 3: Confirm ────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <Header title="Join a Queue" />
      <ScrollView contentContainerStyle={styles.content}>
        <StepIndicator />
        <Text style={styles.stepTitle}>Confirm & Join</Text>
        <Text style={styles.stepDesc}>Review your details before joining the queue.</Text>

        <View style={styles.confirmCard}>
          {[
            { icon: 'layers' as const,    label: 'Service',   value: service?.name ?? '',  sub: service?.duration ? `Approx. ${service.duration}` : '' },
            { icon: 'location-on' as const, label: 'Branch',  value: branch?.name  ?? '',  sub: branch?.address ?? '' },
            { icon: 'schedule' as const,  label: 'Est. Wait', value: `~${branch?.waitTime ?? 0} min`, sub: `${branch?.queue ?? 0} people ahead` },
          ].map((row, i) => (
            <React.Fragment key={row.label}>
              {i > 0 && <View style={styles.separator} />}
              <View style={styles.confirmRow}>
                <View style={[styles.confirmIcon, i === 0 && { backgroundColor: '#eff6ff' }, i === 1 && { backgroundColor: '#ecfdf5' }, i === 2 && { backgroundColor: '#fffbeb' }]}>
                  <MaterialIcons name={row.icon} size={18} color={i === 0 ? '#2563eb' : i === 1 ? '#059669' : '#d97706'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.confirmLabel}>{row.label}</Text>
                  <Text style={styles.confirmValue}>{row.value}</Text>
                  {!!row.sub && <Text style={styles.confirmSub}>{row.sub}</Text>}
                </View>
              </View>
            </React.Fragment>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.joinBtn, joining && styles.joinBtnLoading]}
          onPress={handleJoin}
          disabled={joining}
          activeOpacity={0.85}
        >
          {joining ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <MaterialIcons name="queue" size={18} color="#fff" />
              <Text style={styles.joinBtnText}>Join Queue Now</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },

  content: { padding: 16, gap: 16, paddingBottom: 40 },

  // Step indicator
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  stepCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center',
  },
  stepActive: { backgroundColor: '#2563eb' },
  stepDone:   { backgroundColor: '#059669' },
  stepNum: { fontSize: 12, fontWeight: '800', color: '#64748b' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#e2e8f0', marginHorizontal: 4 },
  stepLineDone: { backgroundColor: '#059669' },

  stepTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a', marginBottom: -8 },
  stepDesc:  { fontSize: 13, color: '#64748b', fontWeight: '500' },

  // Service options
  optionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  optionCardActive: { borderColor: '#2563eb', borderWidth: 2 },
  optionIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center',
  },
  optionName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  optionMeta: { fontSize: 12, color: '#64748b', fontWeight: '500', marginTop: 2 },

  // Branch cards
  branchCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0', gap: 10,
  },
  branchTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  branchName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  branchAddr: { fontSize: 12, color: '#64748b', fontWeight: '500', marginTop: 2 },
  branchStats: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  branchStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  branchStatText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  loadPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  loadPillText: { fontSize: 11, fontWeight: '700' },

  // Nav buttons
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#2563eb', paddingVertical: 14, borderRadius: 16,
  },
  nextBtnDisabled: { backgroundColor: '#94a3b8' },
  nextBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Confirm card
  confirmCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  confirmRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 14 },
  confirmIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  confirmLabel: { fontSize: 11, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  confirmValue: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginTop: 2 },
  confirmSub:   { fontSize: 12, color: '#64748b', fontWeight: '500', marginTop: 1 },
  separator: { height: 1, backgroundColor: '#f1f5f9' },

  joinBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#059669', paddingVertical: 16, borderRadius: 16,
    shadowColor: '#059669', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  joinBtnLoading: { opacity: 0.7 },
  joinBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
