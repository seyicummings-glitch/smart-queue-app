import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import SQMSHeader from '@/components/SQMSHeader';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

// ─── API types ────────────────────────────────────────────────────────────────

type ActiveTicket = {
  id: number;
  ticket_number: string;
  service_name: string;
  branch_name: string;
  status: 'waiting' | 'serving';
  position: number;
  estimated_wait: number;
};

type Appointment = {
  id: number;
  ticket_number: string;
  service_name: string;
  branch_name: string;
  appointment_date: string;
  appointment_time: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function greeting(name: string): string {
  const h = new Date().getHours();
  const part = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  return `Good ${part}, ${name.split(' ')[0]}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const hr = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hr}:${String(m).padStart(2, '0')} ${ap}`;
}

function nextUpcoming(appts: Appointment[]): Appointment | null {
  const active = appts
    .filter(a => a.status === 'scheduled' || a.status === 'confirmed')
    .sort((a, b) => {
      const da = new Date(`${a.appointment_date}T${a.appointment_time}`);
      const db = new Date(`${b.appointment_date}T${b.appointment_time}`);
      return da.getTime() - db.getTime();
    });
  return active[0] ?? null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ActiveQueueCard({ ticket, onLeave, onPress }: {
  ticket: ActiveTicket;
  onLeave: () => void;
  onPress: () => void;
}) {
  const isServing = ticket.status === 'serving';
  return (
    <TouchableOpacity style={s.queueCard} onPress={onPress} activeOpacity={0.92}>
      <View style={s.queueCardTop}>
        <View style={[s.queueBadge, isServing ? s.queueBadgeServing : s.queueBadgeWaiting]}>
          <View style={[s.queueDot, { backgroundColor: isServing ? '#059669' : '#2563eb' }]} />
          <Text style={[s.queueBadgeTxt, { color: isServing ? '#059669' : '#2563eb' }]}>
            {isServing ? 'Now Serving' : 'In Queue'}
          </Text>
        </View>
        <Text style={s.queueTicketNum}>{ticket.ticket_number}</Text>
      </View>

      <Text style={s.queueService}>{ticket.service_name}</Text>
      <Text style={s.queueBranch}>{ticket.branch_name}</Text>

      <View style={s.queueStats}>
        <View style={s.queueStat}>
          <MaterialIcons name="format-list-numbered" size={16} color="#2563eb" />
          <View>
            <Text style={s.queueStatVal}>{isServing ? '—' : `#${ticket.position}`}</Text>
            <Text style={s.queueStatLbl}>Position</Text>
          </View>
        </View>
        <View style={s.queueStatDivider} />
        <View style={s.queueStat}>
          <MaterialIcons name="schedule" size={16} color="#2563eb" />
          <View>
            <Text style={s.queueStatVal}>
              {isServing ? 'Your turn' : ticket.estimated_wait > 0 ? `~${ticket.estimated_wait} min` : '< 5 min'}
            </Text>
            <Text style={s.queueStatLbl}>Est. wait</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={s.leaveBtn} onPress={onLeave} activeOpacity={0.8}>
        <MaterialIcons name="exit-to-app" size={15} color="#e11d48" />
        <Text style={s.leaveBtnTxt}>Leave Queue</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function NoQueueCard({ onJoin }: { onJoin: () => void }) {
  return (
    <View style={s.emptyCard}>
      <View style={s.emptyCardIcon}>
        <MaterialIcons name="queue" size={26} color="#2563eb" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.emptyCardTitle}>No Active Queue</Text>
        <Text style={s.emptyCardSub}>You're not in any queue right now</Text>
      </View>
      <TouchableOpacity style={s.emptyCardBtn} onPress={onJoin} activeOpacity={0.8}>
        <Text style={s.emptyCardBtnTxt}>Join</Text>
      </TouchableOpacity>
    </View>
  );
}

function NextAppointmentCard({ appt, onViewAll }: {
  appt: Appointment;
  onViewAll: () => void;
}) {
  const isConfirmed = appt.status === 'confirmed';
  return (
    <View style={s.apptCard}>
      <View style={s.apptCardTop}>
        <Text style={s.apptCardLabel}>Next Appointment</Text>
        <TouchableOpacity onPress={onViewAll}>
          <Text style={s.apptViewAll}>View all</Text>
        </TouchableOpacity>
      </View>
      <Text style={s.apptService}>{appt.service_name}</Text>
      <View style={s.apptMeta}>
        <View style={s.apptMetaRow}>
          <MaterialIcons name="event" size={14} color="#64748b" />
          <Text style={s.apptMetaTxt}>{formatDate(appt.appointment_date)}</Text>
        </View>
        <View style={s.apptMetaRow}>
          <MaterialIcons name="schedule" size={14} color="#64748b" />
          <Text style={s.apptMetaTxt}>{formatTime(appt.appointment_time)}</Text>
        </View>
        <View style={s.apptMetaRow}>
          <MaterialIcons name="place" size={14} color="#64748b" />
          <Text style={s.apptMetaTxt}>{appt.branch_name}</Text>
        </View>
      </View>
      <View style={[s.apptStatusChip, isConfirmed ? s.apptStatusConfirmed : s.apptStatusScheduled]}>
        <Text style={[s.apptStatusTxt, { color: isConfirmed ? '#059669' : '#2563eb' }]}>
          {isConfirmed ? 'Confirmed' : 'Scheduled'}
        </Text>
      </View>
    </View>
  );
}

function NoAppointmentCard({ onBook }: { onBook: () => void }) {
  return (
    <View style={s.emptyCard}>
      <View style={[s.emptyCardIcon, { backgroundColor: '#f0fdf4' }]}>
        <MaterialIcons name="event-available" size={26} color="#059669" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.emptyCardTitle}>No Upcoming Appointments</Text>
        <Text style={s.emptyCardSub}>Schedule one when you're ready</Text>
      </View>
      <TouchableOpacity style={[s.emptyCardBtn, { backgroundColor: '#059669' }]} onPress={onBook} activeOpacity={0.8}>
        <Text style={s.emptyCardBtnTxt}>Book</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

const QUICK_ACTIONS: {
  label: string; icon: IconName; color: string; bg: string; route: string;
}[] = [
  { label: 'Join Queue',        icon: 'queue',               color: '#2563eb', bg: '#eff6ff', route: '/customer/industries'   },
  { label: 'Book Appointment',  icon: 'event',               color: '#059669', bg: '#f0fdf4', route: '/customer/appointments' },
  { label: 'Queue Status',      icon: 'notifications-active', color: '#7c3aed', bg: '#f5f3ff', route: '/customer/queue-status' },
  { label: 'Support',           icon: 'support-agent',       color: '#d97706', bg: '#fffbeb', route: '/customer/support'      },
];

export default function CustomerHome() {
  const router = useRouter();
  const { user } = useAuth();

  const [activeTicket,  setActiveTicket]  = useState<ActiveTicket | null>(null);
  const [appointments,  setAppointments]  = useState<Appointment[]>([]);
  const [loading,       setLoading]       = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [ticketRes, apptsRes] = await Promise.all([
      api.get<ActiveTicket>('/queues/my-ticket/'),
      api.get<{ results: Appointment[] } | Appointment[]>('/appointments/'),
    ]);
    setActiveTicket(ticketRes.error ? null : ticketRes.data);
    const raw = apptsRes.data;
    const list = Array.isArray(raw) ? raw : (raw as any)?.results ?? [];
    setAppointments(list);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleLeaveQueue = () => {
    if (!activeTicket) return;
    Alert.alert('Leave Queue', 'Are you sure you want to leave the queue?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Leave', style: 'destructive', onPress: async () => {
        const { error } = await api.post(`/queues/${activeTicket.id}/cancel/`, {});
        if (error) Alert.alert('Error', error);
        else setActiveTicket(null);
      }},
    ]);
  };

  // Stats
  const totalAppts     = appointments.length;
  const completedAppts = appointments.filter(a => a.status === 'completed').length;
  const upcomingAppts  = appointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length;
  const nextAppt       = nextUpcoming(appointments);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <SQMSHeader />

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View style={s.greetRow}>
          <View>
            <Text style={s.greetText}>{greeting(user?.full_name ?? 'there')}</Text>
            <Text style={s.greetSub}>Here's your queue overview</Text>
          </View>
          <TouchableOpacity style={s.refreshBtn} onPress={loadData}>
            <MaterialIcons name="refresh" size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={s.statsRow}>
          {[
            { label: 'Total',     value: totalAppts,     icon: 'event-note'      as IconName, color: '#2563eb' },
            { label: 'Upcoming',  value: upcomingAppts,  icon: 'event-available' as IconName, color: '#059669' },
            { label: 'Completed', value: completedAppts, icon: 'check-circle'    as IconName, color: '#7c3aed' },
          ].map(stat => (
            <View key={stat.label} style={s.statCard}>
              <MaterialIcons name={stat.icon} size={18} color={stat.color} />
              <Text style={[s.statValue, { color: stat.color }]}>{loading ? '–' : stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Section: Active Queue */}
        <Text style={s.sectionTitle}>Active Queue</Text>
        {loading ? (
          <View style={[s.emptyCard, { justifyContent: 'center' }]}>
            <ActivityIndicator color="#2563eb" />
          </View>
        ) : activeTicket ? (
          <ActiveQueueCard ticket={activeTicket} onLeave={handleLeaveQueue} onPress={() => router.push('/customer/queue-status' as any)} />
        ) : (
          <NoQueueCard onJoin={() => router.push('/customer/industries' as any)} />
        )}

        {/* Section: Next Appointment */}
        <Text style={s.sectionTitle}>Next Appointment</Text>
        {loading ? (
          <View style={[s.emptyCard, { justifyContent: 'center' }]}>
            <ActivityIndicator color="#059669" />
          </View>
        ) : nextAppt ? (
          <NextAppointmentCard
            appt={nextAppt}
            onViewAll={() => router.push('/customer/appointments' as any)}
          />
        ) : (
          <NoAppointmentCard onBook={() => router.push('/customer/appointments' as any)} />
        )}

        {/* Section: Quick Actions */}
        <Text style={s.sectionTitle}>Quick Actions</Text>
        <View style={s.actionsGrid}>
          {QUICK_ACTIONS.map(action => (
            <TouchableOpacity
              key={action.label}
              style={s.actionCard}
              onPress={() => router.push(action.route as any)}
              activeOpacity={0.8}
            >
              <View style={[s.actionIcon, { backgroundColor: action.bg }]}>
                <MaterialIcons name={action.icon} size={22} color={action.color} />
              </View>
              <Text style={s.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, gap: 12, paddingBottom: 32 },

  // Greeting
  greetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  greetText: { fontSize: 22, fontWeight: '900', color: '#0f172a', letterSpacing: -0.3 },
  greetSub: { fontSize: 13, color: '#64748b', fontWeight: '500', marginTop: 2 },
  refreshBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14,
    alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#0f172a', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Section title
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#0f172a', marginTop: 4 },

  // Active queue card
  queueCard: {
    backgroundColor: '#1e40af', borderRadius: 20, padding: 18, gap: 6,
    shadowColor: '#1e40af', shadowOpacity: 0.25, shadowRadius: 12, elevation: 4,
  },
  queueCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  queueBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  queueBadgeWaiting: { backgroundColor: 'rgba(255,255,255,0.15)' },
  queueBadgeServing: { backgroundColor: 'rgba(255,255,255,0.2)' },
  queueDot: { width: 7, height: 7, borderRadius: 999 },
  queueBadgeTxt: { fontSize: 11, fontWeight: '800' },
  queueTicketNum: { fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' },
  queueService: { fontSize: 20, fontWeight: '900', color: '#fff' },
  queueBranch: { fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: '500', marginBottom: 4 },
  queueStats: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 12, gap: 0, marginBottom: 4,
  },
  queueStat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  queueStatDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 4 },
  queueStatVal: { fontSize: 15, fontWeight: '800', color: '#fff' },
  queueStatLbl: { fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: '600', textTransform: 'uppercase' },
  leaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12,
    paddingVertical: 10, marginTop: 4,
  },
  leaveBtnTxt: { fontSize: 13, fontWeight: '700', color: '#fca5a5' },

  // Empty state cards (queue / appointment)
  emptyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
    minHeight: 72,
  },
  emptyCardIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  emptyCardTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  emptyCardSub: { fontSize: 12, color: '#94a3b8', fontWeight: '500', marginTop: 2 },
  emptyCardBtn: { backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  emptyCardBtnTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Next appointment card
  apptCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 18, gap: 6,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#0f172a', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  apptCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  apptCardLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  apptViewAll: { fontSize: 12, fontWeight: '700', color: '#2563eb' },
  apptService: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginTop: 2 },
  apptMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  apptMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  apptMetaTxt: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  apptStatusChip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginTop: 4 },
  apptStatusScheduled: { backgroundColor: '#eff6ff' },
  apptStatusConfirmed: { backgroundColor: '#f0fdf4' },
  apptStatusTxt: { fontSize: 11, fontWeight: '700' },

  // Quick actions
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: {
    width: '47.5%', backgroundColor: '#fff', borderRadius: 18, padding: 16,
    alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#0f172a', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  actionIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 13, fontWeight: '700', color: '#0f172a', textAlign: 'center' },
});
