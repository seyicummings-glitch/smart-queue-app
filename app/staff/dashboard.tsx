import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import SQMSHeader from '@/components/SQMSHeader';
import BottomNav from '@/components/BottomNav';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];
type BusinessKey = 'banking' | 'healthcare' | 'retail' | 'government' | 'education' | 'corporate';

type QueueItem = {
  pos: number;
  ticket: string;
  type: string;
  typeColor: 'orange' | 'slate' | 'blue' | 'green' | 'purple';
  service: string;
  wait: string;
  customer: string;
  tags: string[];
};

type StaffProfile = {
  name: string; initials: string; role: string;
  branch: string; department: string; id: string; services: string[];
};

type BusinessData = {
  staff: StaffProfile;
  stats: { counter: string; inQueue: string; completed: string; avgTime: string };
  queue: QueueItem[];
};

type BusinessCard = {
  key: BusinessKey; label: string; icon: IconName;
  iconColor: string; bg: string; desc: string;
};

const mockDataMap: Record<BusinessKey, BusinessData> = {
  banking: {
    staff: { name: 'Sarah Johnson', initials: 'SJ', role: 'Customer Service Representative', branch: 'Manhattan Financial Center', department: 'Account Services', id: 'BNK-2024-1156', services: ['Account Opening', 'General Banking Inquiry', 'Document Verification'] },
    stats: { counter: '3', inQueue: '2', completed: '0', avgTime: '8' },
    queue: [
      { pos: 1, ticket: 'BAN-1024', type: 'Walk-In', typeColor: 'orange', service: 'Account Opening', wait: '16 mins', customer: 'Sarah Johnson', tags: ['Returning', 'Mobile App'] },
      { pos: 2, ticket: 'BAN-1028', type: 'QR Code', typeColor: 'slate', service: 'Document Verification', wait: '23 mins', customer: 'Jessica Williams', tags: [] },
    ],
  },
  healthcare: {
    staff: { name: 'Dr. Michael Chen', initials: 'MC', role: 'Medical Services Coordinator', branch: 'Main Hospital - Downtown', department: 'Medical Services', id: 'HLC-2024-2487', services: ['General Consultation', 'Specialist Appointment', 'Lab Tests'] },
    stats: { counter: '3', inQueue: '3', completed: '0', avgTime: '8' },
    queue: [
      { pos: 1, ticket: 'HEA-1024', type: 'Walk-In', typeColor: 'orange', service: 'General Consultation', wait: '6 mins', customer: 'Sarah Johnson', tags: ['Returning', 'Mobile App'] },
      { pos: 2, ticket: 'HEA-1025', type: 'QR Code', typeColor: 'slate', service: 'Specialist Appointment', wait: '11 mins', customer: 'Michael Chen', tags: ['Transferred'] },
      { pos: 3, ticket: 'HEA-1026', type: 'Web', typeColor: 'blue', service: 'Lab Tests', wait: '16 mins', customer: 'Emily Davis', tags: [] },
    ],
  },
  retail: {
    staff: { name: 'Emily Rodriguez', initials: 'ER', role: 'Customer Service Associate', branch: 'Flagship Store - Downtown', department: 'Customer Support', id: 'RTL-2024-3891', services: ['Product Return', 'Customer Service', 'Product Consultation'] },
    stats: { counter: '3', inQueue: '3', completed: '12', avgTime: '5' },
    queue: [
      { pos: 1, ticket: 'RET-1024', type: 'Walk-In', typeColor: 'orange', service: 'Product Return', wait: '5 mins', customer: 'Tom Wilson', tags: ['VIP'] },
      { pos: 2, ticket: 'RET-1025', type: 'QR Code', typeColor: 'slate', service: 'Customer Service', wait: '10 mins', customer: 'Karen Lee', tags: [] },
    ],
  },
  government: {
    staff: { name: 'James Wilson', initials: 'JW', role: 'Public Services Officer', branch: 'City Hall - Main Office', department: 'Licensing Services', id: 'GOV-2024-5623', services: ['License Renewal', 'Permit Application', 'General Inquiry'] },
    stats: { counter: '7', inQueue: '2', completed: '9', avgTime: '15' },
    queue: [
      { pos: 1, ticket: 'GOV-1024', type: 'Walk-In', typeColor: 'orange', service: 'License Renewal', wait: '5 mins', customer: 'Anna Thompson', tags: [] },
      { pos: 2, ticket: 'GOV-1025', type: 'QR Code', typeColor: 'slate', service: 'Permit Application', wait: '10 mins', customer: 'Mark Brown', tags: ['Documents Missing'] },
    ],
  },
  education: {
    staff: { name: 'Linda Martinez', initials: 'LM', role: 'Student Services Advisor', branch: 'Main Campus - Admissions', department: 'Admissions', id: 'EDU-2024-7845', services: ['Student Admissions', 'Academic Counseling', 'Registration Support'] },
    stats: { counter: '4', inQueue: '3', completed: '6', avgTime: '10' },
    queue: [
      { pos: 1, ticket: 'EDU-1024', type: 'Walk-In', typeColor: 'orange', service: 'Student Admissions', wait: '5 mins', customer: 'Chris Evans', tags: ['Senior'] },
    ],
  },
  corporate: {
    staff: { name: 'David Kim', initials: 'DK', role: 'HR Business Partner', branch: 'HQ - Tower A, Floor 12', department: 'Human Resources', id: 'CRP-2024-0993', services: ['Onboarding', 'Benefits Enrollment', 'HR Consultations'] },
    stats: { counter: '2', inQueue: '1', completed: '4', avgTime: '20' },
    queue: [
      { pos: 1, ticket: 'CRP-0056', type: 'Appointment', typeColor: 'blue', service: 'Onboarding', wait: '5 mins', customer: 'Samantha Green', tags: ['New Hire'] },
    ],
  },
};

const BUSINESSES: BusinessCard[] = [
  { key: 'banking',    label: 'Banking & Finance', icon: 'account-balance', iconColor: '#2563eb', bg: '#eff6ff', desc: 'Account services, loans, investments' },
  { key: 'healthcare', label: 'Healthcare',         icon: 'favorite',        iconColor: '#e11d48', bg: '#fff1f2', desc: 'Medical appointments, consultations' },
  { key: 'retail',     label: 'Retail',             icon: 'shopping-bag',    iconColor: '#d97706', bg: '#fffbeb', desc: 'Customer service, returns, support' },
  { key: 'government', label: 'Government',         icon: 'gavel',           iconColor: '#4f46e5', bg: '#eef2ff', desc: 'Public services, permits, documentation' },
  { key: 'education',  label: 'Education',          icon: 'school',          iconColor: '#059669', bg: '#ecfdf5', desc: 'Admissions, counseling, registration' },
  { key: 'corporate',  label: 'Corporate Office',   icon: 'business',        iconColor: '#0d9488', bg: '#f0fdfa', desc: 'HR, IT support, facilities' },
];

const TYPE_COLOR: Record<string, { bg: string; text: string }> = {
  orange: { bg: '#fff7ed', text: '#ea580c' },
  slate:  { bg: '#f1f5f9', text: '#475569' },
  blue:   { bg: '#eff6ff', text: '#2563eb' },
  green:  { bg: '#f0fdf4', text: '#16a34a' },
  purple: { bg: '#faf5ff', text: '#9333ea' },
};

export default function StaffDashboard() {
  const [view, setView] = useState<'grid' | 'queue'>('grid');
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessKey | null>(null);
  const [currentlyServing, setCurrentlyServing] = useState<QueueItem | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [completedCounts, setCompletedCounts] = useState<Record<BusinessKey, number>>({
    banking: 0, healthcare: 0, retail: 12, government: 9, education: 6, corporate: 4,
  });
  const [queueItems, setQueueItems] = useState<Record<BusinessKey, QueueItem[]>>(
    Object.fromEntries(Object.entries(mockDataMap).map(([k, v]) => [k, v.queue])) as Record<BusinessKey, QueueItem[]>
  );

  const handleSelectBusiness = (key: BusinessKey) => {
    setSelectedBusiness(key);
    setCurrentlyServing(null);
    setView('queue');
  };

  const handleCallNext = () => {
    if (!selectedBusiness) return;
    const queue = queueItems[selectedBusiness];
    if (!queue.length) return;
    setCurrentlyServing(queue[0]);
    setQueueItems(prev => ({ ...prev, [selectedBusiness]: prev[selectedBusiness].slice(1) }));
  };

  const handleCallNextFromList = (item: QueueItem) => {
    if (!selectedBusiness) return;
    setCurrentlyServing(item);
    setQueueItems(prev => ({ ...prev, [selectedBusiness]: prev[selectedBusiness].filter(q => q.ticket !== item.ticket) }));
  };

  const handleComplete = () => {
    if (!selectedBusiness) return;
    setCompletedCounts(prev => ({ ...prev, [selectedBusiness]: (prev[selectedBusiness] || 0) + 1 }));
    setCurrentlyServing(null);
  };

  const handleSkip = (item?: QueueItem) => {
    if (!selectedBusiness) return;
    if (item) {
      setQueueItems(prev => {
        const filtered = prev[selectedBusiness].filter(q => q.ticket !== item.ticket);
        return { ...prev, [selectedBusiness]: [...filtered, item] };
      });
    } else if (currentlyServing) {
      setQueueItems(prev => ({ ...prev, [selectedBusiness]: [...prev[selectedBusiness], currentlyServing] }));
      setCurrentlyServing(null);
    }
  };

  const handleCancel = (item?: QueueItem) => {
    if (!selectedBusiness) return;
    if (item) {
      setQueueItems(prev => ({ ...prev, [selectedBusiness]: prev[selectedBusiness].filter(q => q.ticket !== item.ticket) }));
    } else {
      setCurrentlyServing(null);
    }
  };

  if (view === 'queue' && selectedBusiness) {
    const data = mockDataMap[selectedBusiness];
    const queue = queueItems[selectedBusiness];
    const completed = completedCounts[selectedBusiness] || 0;

    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <SQMSHeader />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.queueContent}>
          {/* Back row */}
          <View style={styles.backRow}>
            <TouchableOpacity onPress={() => { setView('grid'); setSelectedBusiness(null); setCurrentlyServing(null); }} style={styles.backBtn}>
              <MaterialIcons name="arrow-back" size={20} color="#334155" />
            </TouchableOpacity>
            <View>
              <Text style={styles.queueTitle}>{BUSINESSES.find(b => b.key === selectedBusiness)?.label}</Text>
              <Text style={styles.queueSubtitle}>Queue Management</Text>
            </View>
          </View>

          {/* Profile card */}
          <View style={styles.profileCard}>
            <View style={styles.profileTop}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{data.staff.initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.profileName}>{data.staff.name}</Text>
                <Text style={styles.profileRole}>{data.staff.role}</Text>
              </View>
            </View>
            <View style={styles.profileGrid}>
              <View style={styles.profileGridItem}>
                <Text style={styles.profileGridLabel}>Branch</Text>
                <Text style={styles.profileGridValue}>{data.staff.branch}</Text>
              </View>
              <View style={styles.profileGridItem}>
                <Text style={styles.profileGridLabel}>Department</Text>
                <Text style={styles.profileGridValue}>{data.staff.department}</Text>
              </View>
              <View style={styles.profileGridItem}>
                <Text style={styles.profileGridLabel}>Employee ID</Text>
                <Text style={styles.profileGridValue}>{data.staff.id}</Text>
              </View>
            </View>
            <View style={styles.servicesRow}>
              {data.staff.services.map(svc => (
                <View key={svc} style={styles.serviceChip}>
                  <Text style={styles.serviceChipText}>{svc}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            {[
              { label: 'Counter', value: data.stats.counter },
              { label: 'In Queue', value: String(queue.length), highlight: true },
              { label: 'Completed', value: String(completed) },
              { label: 'Avg Time', value: `${data.stats.avgTime}m` },
            ].map(s => (
              <View key={s.label} style={[styles.statCard, s.highlight && styles.statCardHighlight]}>
                <Text style={[styles.statValue, s.highlight && styles.statValueHighlight]}>{s.value}</Text>
                <Text style={[styles.statLabel, s.highlight && styles.statLabelHighlight]}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Currently serving */}
          <View style={styles.servingCard}>
            <Text style={styles.servingHeading}>Currently Serving</Text>
            {currentlyServing ? (
              <>
                <Text style={styles.servingTicket}>{currentlyServing.ticket}</Text>
                <Text style={styles.servingCustomer}>{currentlyServing.customer}</Text>
                <Text style={styles.servingService}>{currentlyServing.service}</Text>
                <TouchableOpacity style={styles.completeBtn} onPress={handleComplete} activeOpacity={0.8}>
                  <MaterialIcons name="check-circle" size={16} color="#fff" />
                  <Text style={styles.completeBtnText}>Complete Service</Text>
                </TouchableOpacity>
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.skipBtn} onPress={() => handleSkip()} activeOpacity={0.8}>
                    <Text style={styles.skipBtnText}>Skip Ticket</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel()} activeOpacity={0.8}>
                    <Text style={styles.cancelBtnText}>Cancel Ticket</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.servingEmpty}>No Customer Being Served</Text>
                <Text style={styles.servingEmptySub}>Call the next customer to start serving</Text>
                <TouchableOpacity
                  style={[styles.callNextBtn, (!isActive || !queue.length) && styles.callNextBtnDisabled]}
                  onPress={handleCallNext}
                  disabled={!isActive || !queue.length}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="play-circle-outline" size={18} color={isActive && queue.length ? '#2563eb' : '#94a3b8'} />
                  <Text style={[styles.callNextBtnText, (!isActive || !queue.length) && styles.callNextBtnTextDisabled]}>
                    {queue.length === 0 ? 'Queue Empty' : 'Call Next Customer'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Counter status */}
          <View style={styles.counterCard}>
            <View style={styles.counterTop}>
              <View style={[styles.dot, { backgroundColor: isActive ? '#10b981' : '#94a3b8' }]} />
              <Text style={styles.counterTitle}>Counter {data.stats.counter}</Text>
            </View>
            <View style={styles.counterToggleRow}>
              <TouchableOpacity
                style={[styles.toggleBtn, isActive && styles.toggleActive]}
                onPress={() => setIsActive(true)}
              >
                <Text style={[styles.toggleText, isActive && styles.toggleTextActive]}>Active</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, !isActive && styles.toggleInactive]}
                onPress={() => setIsActive(false)}
              >
                <Text style={[styles.toggleText, !isActive && styles.toggleTextInactive]}>Not Active</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Waiting queue */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Waiting Queue</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>{queue.length} Waiting</Text></View>
          </View>

          {queue.length === 0 ? (
            <View style={styles.emptyQueue}>
              <MaterialIcons name="check-circle" size={36} color="#10b981" />
              <Text style={styles.emptyQueueText}>Queue is currently empty</Text>
            </View>
          ) : (
            queue.map(item => (
              <WaitingItem
                key={item.ticket}
                item={item}
                canCall={!currentlyServing && isActive}
                onCall={() => handleCallNextFromList(item)}
                onSkip={() => handleSkip(item)}
                onCancel={() => handleCancel(item)}
              />
            ))
          )}
        </ScrollView>
        <BottomNav />
      </SafeAreaView>
    );
  }

  // Grid view
  const rows: BusinessCard[][] = [];
  for (let i = 0; i < BUSINESSES.length; i += 2) rows.push(BUSINESSES.slice(i, i + 2));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <SQMSHeader />
      <ScrollView contentContainerStyle={styles.gridContent} showsVerticalScrollIndicator={false}>
        <View style={styles.gridPageHeader}>
          <View>
            <Text style={styles.gridTitle}>Workspace</Text>
            <Text style={styles.gridSubtitle}>Manage active queues</Text>
          </View>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBadgeText}>Live</Text>
          </View>
        </View>

        <View style={styles.chooseSectionHeader}>
          <Text style={styles.chooseSectionTitle}>Choose a Business</Text>
          <Text style={styles.chooseSectionSub}>Pick a service that makes your day simpler</Text>
        </View>

        <View style={styles.gridWrapper}>
          {rows.map((row, ri) => (
            <View key={ri} style={styles.gridRow}>
              {row.map(biz => (
                <TouchableOpacity
                  key={biz.key}
                  style={styles.bizCard}
                  onPress={() => handleSelectBusiness(biz.key)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.bizIconWrap, { backgroundColor: biz.bg }]}>
                    <MaterialIcons name={biz.icon} size={22} color={biz.iconColor} />
                  </View>
                  <Text style={styles.bizLabel}>{biz.label}</Text>
                  <Text style={styles.bizDesc}>{biz.desc}</Text>
                </TouchableOpacity>
              ))}
              {row.length === 1 && <View style={styles.cardPlaceholder} />}
            </View>
          ))}
        </View>
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  );
}

function WaitingItem({ item, canCall, onCall, onSkip, onCancel }: {
  item: QueueItem; canCall: boolean;
  onCall: () => void; onSkip: () => void; onCancel: () => void;
}) {
  const tc = TYPE_COLOR[item.typeColor] || TYPE_COLOR.slate;
  return (
    <View style={styles.waitingItem}>
      <View style={styles.waitingTop}>
        <View style={styles.waitingPosWrap}>
          <Text style={styles.waitingPosNum}>{String(item.pos).padStart(3, '0')}</Text>
          <Text style={styles.waitingPosLabel}>{item.ticket}</Text>
        </View>
        <View style={[styles.typeTag, { backgroundColor: tc.bg }]}>
          <Text style={[styles.typeTagText, { color: tc.text }]}>{item.type}</Text>
        </View>
      </View>
      <View style={styles.waitingDetails}>
        <View style={styles.waitingRow}>
          <Text style={styles.waitingDetailLabel}>Service</Text>
          <Text style={styles.waitingDetailValue}>{item.service}</Text>
        </View>
        <View style={styles.waitingRow}>
          <Text style={styles.waitingDetailLabel}>Customer</Text>
          <Text style={styles.waitingDetailValue}>{item.customer}</Text>
        </View>
        <View style={styles.waitingRow}>
          <Text style={styles.waitingDetailLabel}>Wait</Text>
          <Text style={[styles.waitingDetailValue, { color: '#d97706' }]}>{item.wait}</Text>
        </View>
      </View>
      {item.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {item.tags.map(tag => (
            <View key={tag} style={styles.tagPill}>
              <Text style={styles.tagPillText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={styles.waitingActions}>
        <TouchableOpacity style={[styles.wCallBtn, !canCall && styles.wCallBtnDisabled]} onPress={onCall} disabled={!canCall} activeOpacity={0.8}>
          <Text style={[styles.wCallBtnText, !canCall && { color: '#94a3b8' }]}>Call Next</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.wSkipBtn, !canCall && styles.wSkipBtnDisabled]} onPress={onSkip} disabled={!canCall} activeOpacity={0.8}>
          <Text style={styles.wSkipBtnText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.wCancelBtn, !canCall && styles.wCancelBtnDisabled]} onPress={onCancel} disabled={!canCall} activeOpacity={0.8}>
          <Text style={styles.wCancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  // Grid view
  gridContent: { padding: 20, gap: 16, paddingBottom: 24 },
  gridPageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 8 },
  gridTitle: { fontSize: 24, fontWeight: '900', color: '#0f172a', letterSpacing: -0.4 },
  gridSubtitle: { fontSize: 13, color: '#64748b', fontWeight: '500', marginTop: 2 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ecfdf5', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#a7f3d0' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' },
  liveBadgeText: { fontSize: 11, fontWeight: '800', color: '#065f46' },
  chooseSectionHeader: { gap: 4 },
  chooseSectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  chooseSectionSub: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  gridWrapper: { gap: 12 },
  gridRow: { flexDirection: 'row', gap: 12 },
  bizCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 24, borderWidth: 1,
    borderColor: '#e2e8f0', padding: 16, gap: 8,
    shadowColor: '#0f172a', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  cardPlaceholder: { flex: 1 },
  bizIconWrap: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  bizLabel: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  bizDesc: { fontSize: 11, color: '#64748b', fontWeight: '500', lineHeight: 16 },

  // Queue view
  queueContent: { padding: 20, gap: 16, paddingBottom: 24 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 4 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  queueTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a', letterSpacing: -0.3 },
  queueSubtitle: { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Profile card
  profileCard: { backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: '#e2e8f0', padding: 20, gap: 14, shadowColor: '#0f172a', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  profileTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '900', color: '#1d4ed8' },
  profileName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  profileRole: { fontSize: 12, fontWeight: '700', color: '#2563eb', marginTop: 2 },
  profileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  profileGridItem: { gap: 2 },
  profileGridLabel: { fontSize: 9, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  profileGridValue: { fontSize: 12, fontWeight: '600', color: '#334155' },
  servicesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  serviceChip: { backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#e2e8f0' },
  serviceChipText: { fontSize: 10, fontWeight: '700', color: '#475569' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 12, alignItems: 'center', gap: 4 },
  statCardHighlight: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  statValue: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  statValueHighlight: { color: '#1d4ed8' },
  statLabel: { fontSize: 9, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center', letterSpacing: 0.3 },
  statLabelHighlight: { color: '#3b82f6' },

  // Currently serving card
  servingCard: { backgroundColor: '#2563eb', borderRadius: 24, padding: 24, alignItems: 'center', gap: 8, shadowColor: '#2563eb', shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  servingHeading: { fontSize: 10, fontWeight: '800', color: '#bfdbfe', textTransform: 'uppercase', letterSpacing: 1.5 },
  servingTicket: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  servingCustomer: { fontSize: 14, fontWeight: '700', color: '#e2e8f0' },
  servingService: { fontSize: 12, color: '#93c5fd', fontWeight: '500', marginBottom: 8 },
  servingEmpty: { fontSize: 18, fontWeight: '800', color: '#fff', textAlign: 'center' },
  servingEmptySub: { fontSize: 12, color: '#93c5fd', textAlign: 'center', marginBottom: 8 },
  completeBtn: { width: '100%', backgroundColor: '#10b981', borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  completeBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  actionRow: { flexDirection: 'row', gap: 8, width: '100%' },
  skipBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  skipBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  cancelBtn: { flex: 1, backgroundColor: '#ef4444', borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  callNextBtn: { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%' },
  callNextBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.2)' },
  callNextBtnText: { fontSize: 14, fontWeight: '800', color: '#2563eb' },
  callNextBtnTextDisabled: { color: '#94a3b8' },

  // Counter card
  counterCard: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, gap: 12 },
  counterTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  counterTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  counterToggleRow: { flexDirection: 'row', gap: 8 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  toggleActive: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  toggleInactive: { backgroundColor: '#fff1f2', borderColor: '#fecdd3' },
  toggleText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  toggleTextActive: { color: '#059669' },
  toggleTextInactive: { color: '#e11d48' },

  // Queue section
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  badge: { backgroundColor: '#f1f5f9', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#64748b' },
  emptyQueue: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', padding: 32, alignItems: 'center', gap: 10 },
  emptyQueueText: { fontSize: 14, color: '#64748b', fontWeight: '600' },

  // Waiting item
  waitingItem: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, gap: 12 },
  waitingTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  waitingPosWrap: { gap: 2 },
  waitingPosNum: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  waitingPosLabel: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  typeTag: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  typeTagText: { fontSize: 10, fontWeight: '700' },
  waitingDetails: { backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 12, gap: 8 },
  waitingRow: { flexDirection: 'row', justifyContent: 'space-between' },
  waitingDetailLabel: { fontSize: 9, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  waitingDetailValue: { fontSize: 12, fontWeight: '600', color: '#334155' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tagPill: { backgroundColor: '#eff6ff', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  tagPillText: { fontSize: 9, fontWeight: '700', color: '#2563eb' },
  waitingActions: { flexDirection: 'row', gap: 8 },
  wCallBtn: { flex: 2, backgroundColor: '#eff6ff', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  wCallBtnDisabled: { backgroundColor: '#f1f5f9' },
  wCallBtnText: { fontSize: 13, fontWeight: '800', color: '#2563eb' },
  wSkipBtn: { flex: 1, backgroundColor: '#fffbeb', borderRadius: 12, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#fde68a' },
  wSkipBtnDisabled: { opacity: 0.5 },
  wSkipBtnText: { fontSize: 12, fontWeight: '700', color: '#d97706' },
  wCancelBtn: { flex: 1, backgroundColor: '#fff1f2', borderRadius: 12, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#fecdd3' },
  wCancelBtnDisabled: { opacity: 0.5 },
  wCancelBtnText: { fontSize: 12, fontWeight: '700', color: '#e11d48' },
});
