import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useAppContext } from '@/context/AppContext';
import SQMSHeader from '@/components/SQMSHeader';
import BottomNav from '@/components/BottomNav';
import { api } from '@/lib/api';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

type QueueStats = {
  waiting: number;
  serving: number;
  completed: number;
  avg_wait: number;
};

type QuickAction = {
  key: string;
  label: string;
  sub: string;
  icon: IconName;
  color: string;
  bg: string;
  border: string;
  route: string;
};

const ADMIN_ACTIONS: QuickAction[] = [
  {
    key: 'queue',
    label: 'Queue Monitor',
    sub: 'Live view of all counters',
    icon: 'sensors',
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
    route: '/admin/queue-status',
  },
  {
    key: 'employees',
    label: 'Employees',
    sub: 'Manage staff & roles',
    icon: 'badge',
    color: '#059669',
    bg: '#ecfdf5',
    border: '#a7f3d0',
    route: '/admin/employees',
  },
  {
    key: 'appointments',
    label: 'Appointments',
    sub: 'Bookings & schedule',
    icon: 'event',
    color: '#4f46e5',
    bg: '#eef2ff',
    border: '#c7d2fe',
    route: '/admin/appointments',
  },
  {
    key: 'analytics',
    label: 'Analytics',
    sub: 'Reports & insights',
    icon: 'bar-chart',
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    route: '/admin/analytics',
  },
  {
    key: 'support',
    label: 'Support Tickets',
    sub: 'Help desk & FAQs',
    icon: 'headset-mic',
    color: '#e11d48',
    bg: '#fff1f2',
    border: '#fecdd3',
    route: '/admin/support',
  },
  {
    key: 'settings',
    label: 'System Settings',
    sub: 'Services, branches & rules',
    icon: 'tune',
    color: '#475569',
    bg: '#f1f5f9',
    border: '#cbd5e1',
    route: '/admin/industry-selection',
  },
];

const SUPER_ADMIN_ACTIONS: QuickAction[] = [
  {
    key: 'requests',
    label: 'Business Requests',
    sub: 'Pending approvals',
    icon: 'assignment',
    color: '#4f46e5',
    bg: '#eef2ff',
    border: '#c7d2fe',
    route: '/admin/business-requests',
  },
  {
    key: 'businesses',
    label: 'All Businesses',
    sub: 'Manage registered orgs',
    icon: 'domain',
    color: '#059669',
    bg: '#ecfdf5',
    border: '#a7f3d0',
    route: '/admin/businesses',
  },
  {
    key: 'employees',
    label: 'All Employees',
    sub: 'Staff across all orgs',
    icon: 'groups',
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
    route: '/admin/employees',
  },
  {
    key: 'analytics',
    label: 'Platform Analytics',
    sub: 'System-wide reports',
    icon: 'insights',
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    route: '/admin/analytics',
  },
];

const STATUS_ITEMS = [
  { label: 'Queue API',     ok: true },
  { label: 'Notifications', ok: true },
  { label: 'Database',      ok: true },
  { label: 'Tunnel',        ok: true },
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function fmtTime(): string {
  return new Date().toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function fmtDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

export default function AdminDashboard() {
  const router     = useRouter();
  const { user }   = useAuth();
  const { role }   = useAppContext();

  const isSuperAdmin = role === 'super_admin' || role === 'superadmin';
  const actions      = isSuperAdmin ? SUPER_ADMIN_ACTIONS : ADMIN_ACTIONS;
  const firstName    = user?.full_name?.split(' ')[0] ?? 'Admin';

  const [stats,     setStats]     = useState<QueueStats | null>(null);
  const [unread,    setUnread]    = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [refresh,   setRefresh]   = useState(false);
  const [clock,     setClock]     = useState(fmtTime());

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setClock(fmtTime()), 30_000);
    return () => clearInterval(t);
  }, []);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const [statRes, notifRes] = await Promise.all([
      api.get<QueueStats>('/queues/status/'),
      api.get<{ count: number }>('/notifications/unread-count/'),
    ]);
    if (statRes.data)  setStats(statRes.data);
    if (notifRes.data) setUnread(notifRes.data.count);
    setLoading(false);
    setRefresh(false);
  }, []);

  useEffect(() => {
    fetchData();
    const t = setInterval(() => fetchData(true), 30_000);
    return () => clearInterval(t);
  }, [fetchData]);

  const totalToday = (stats?.waiting ?? 0) + (stats?.serving ?? 0) + (stats?.completed ?? 0);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <SQMSHeader />

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refresh}
            onRefresh={() => { setRefresh(true); fetchData(true); }}
            tintColor="#2563eb"
          />
        }
      >

        {/* ── Hero banner ─────────────────────────────────────── */}
        <View style={s.hero}>
          <View style={s.heroLeft}>
            <View style={s.roleBadgeWrap}>
              <View style={[s.roleDot, isSuperAdmin ? s.roleDotSuper : s.roleDotAdmin]} />
              <Text style={[s.roleBadgeTxt, isSuperAdmin ? s.roleTxtSuper : s.roleTxtAdmin]}>
                {isSuperAdmin ? 'Super Admin' : 'Admin'}
              </Text>
            </View>
            <Text style={s.greet}>{greeting()},</Text>
            <Text style={s.heroName}>{firstName}</Text>
            <Text style={s.heroDate}>{fmtDate()}</Text>
          </View>
          <View style={s.heroRight}>
            <Text style={s.heroClock}>{clock}</Text>
            <TouchableOpacity
              style={s.notifBtn}
              onPress={() => router.push('/notifications' as any)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="notifications-none" size={20} color="#2563eb" />
              {unread > 0 && (
                <View style={s.notifBadge}>
                  <Text style={s.notifBadgeTxt}>{unread > 9 ? '9+' : unread}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Live KPI cards ──────────────────────────────────── */}
        <Text style={s.sectionLabel}>Live Queue Overview</Text>
        {loading && !stats ? (
          <View style={s.kpiLoader}>
            <ActivityIndicator color="#2563eb" size="small" />
            <Text style={s.kpiLoaderTxt}>Fetching live data…</Text>
          </View>
        ) : (
          <View style={s.kpiRow}>
            <View style={[s.kpiCard, s.kpiCardBlue]}>
              <View style={s.kpiIconWrap}>
                <MaterialIcons name="people" size={18} color="#2563eb" />
              </View>
              <Text style={s.kpiValue}>{stats?.waiting ?? 0}</Text>
              <Text style={s.kpiLabel}>Waiting</Text>
            </View>
            <View style={[s.kpiCard, s.kpiCardGreen]}>
              <View style={[s.kpiIconWrap, { backgroundColor: '#d1fae5' }]}>
                <MaterialIcons name="person" size={18} color="#059669" />
              </View>
              <Text style={[s.kpiValue, { color: '#059669' }]}>{stats?.serving ?? 0}</Text>
              <Text style={s.kpiLabel}>Serving</Text>
            </View>
            <View style={[s.kpiCard, s.kpiCardPurple]}>
              <View style={[s.kpiIconWrap, { backgroundColor: '#ede9fe' }]}>
                <MaterialIcons name="check-circle" size={18} color="#7c3aed" />
              </View>
              <Text style={[s.kpiValue, { color: '#7c3aed' }]}>{stats?.completed ?? 0}</Text>
              <Text style={s.kpiLabel}>Done Today</Text>
            </View>
            <View style={[s.kpiCard, s.kpiCardAmber]}>
              <View style={[s.kpiIconWrap, { backgroundColor: '#fef3c7' }]}>
                <MaterialIcons name="schedule" size={18} color="#d97706" />
              </View>
              <Text style={[s.kpiValue, { color: '#d97706' }]}>{stats?.avg_wait ?? 0}m</Text>
              <Text style={s.kpiLabel}>Avg Wait</Text>
            </View>
          </View>
        )}

        {/* ── Today summary bar ───────────────────────────────── */}
        <View style={s.summaryBar}>
          <View style={s.summaryBarLeft}>
            <MaterialIcons name="today" size={15} color="#2563eb" />
            <Text style={s.summaryBarTxt}>
              <Text style={s.summaryBarBold}>{totalToday}</Text> customers processed today
            </Text>
          </View>
          <View style={s.liveIndicator}>
            <View style={s.livePulse} />
            <Text style={s.liveTxt}>LIVE</Text>
          </View>
        </View>

        {/* ── Quick actions ────────────────────────────────────── */}
        <Text style={[s.sectionLabel, { marginTop: 20 }]}>Control Panel</Text>
        <View style={s.actionsGrid}>
          {actions.map(action => (
            <TouchableOpacity
              key={action.key}
              style={[s.actionCard, { borderColor: action.border }]}
              onPress={() => router.push(action.route as any)}
              activeOpacity={0.8}
            >
              <View style={[s.actionIconBox, { backgroundColor: action.bg }]}>
                <MaterialIcons name={action.icon} size={22} color={action.color} />
              </View>
              <Text style={s.actionLabel}>{action.label}</Text>
              <Text style={s.actionSub} numberOfLines={1}>{action.sub}</Text>
              <View style={[s.actionArrow, { backgroundColor: action.bg }]}>
                <MaterialIcons name="arrow-forward" size={12} color={action.color} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── System health ────────────────────────────────────── */}
        <Text style={[s.sectionLabel, { marginTop: 20 }]}>System Health</Text>
        <View style={s.healthCard}>
          <View style={s.healthHeader}>
            <View style={s.healthDotGreen} />
            <Text style={s.healthTitle}>All systems operational</Text>
            <Text style={s.healthTime}>Updated {clock}</Text>
          </View>
          <View style={s.healthGrid}>
            {STATUS_ITEMS.map(item => (
              <View key={item.label} style={s.healthItem}>
                <MaterialIcons
                  name={item.ok ? 'check-circle' : 'error'}
                  size={14}
                  color={item.ok ? '#059669' : '#e11d48'}
                />
                <Text style={[s.healthItemTxt, { color: item.ok ? '#059669' : '#e11d48' }]}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Admin info card ──────────────────────────────────── */}
        <View style={s.adminInfoCard}>
          <View style={s.adminInfoAvatar}>
            <Text style={s.adminInfoAvatarTxt}>
              {user?.full_name
                ? user.full_name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
                : 'A'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.adminInfoName}>{user?.full_name ?? 'Admin User'}</Text>
            <Text style={s.adminInfoEmail}>{user?.email ?? ''}</Text>
          </View>
          <View style={[
            s.adminInfoBadge,
            isSuperAdmin ? { backgroundColor: '#f5f3ff' } : { backgroundColor: '#eff6ff' },
          ]}>
            <Text style={[
              s.adminInfoBadgeTxt,
              isSuperAdmin ? { color: '#7c3aed' } : { color: '#2563eb' },
            ]}>
              {isSuperAdmin ? 'Super Admin' : 'Admin'}
            </Text>
          </View>
        </View>

      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  scroll:    { padding: 16, paddingBottom: 40, gap: 0 },

  // Hero
  hero: {
    backgroundColor: '#1e40af',
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    shadowColor: '#1d4ed8',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  heroLeft:  { flex: 1, gap: 2 },
  heroRight: { alignItems: 'flex-end', gap: 10 },

  roleBadgeWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  roleDot:      { width: 7, height: 7, borderRadius: 4 },
  roleDotAdmin: { backgroundColor: '#60a5fa' },
  roleDotSuper: { backgroundColor: '#a78bfa' },
  roleBadgeTxt:  { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.9)', letterSpacing: 0.5 },
  roleTxtAdmin:  {},
  roleTxtSuper:  { color: '#c4b5fd' },

  greet:    { fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: '500' },
  heroName: { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: -0.5, lineHeight: 32 },
  heroDate: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4, fontWeight: '500' },

  heroClock: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  notifBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute', top: 5, right: 5,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#e11d48',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#1e40af',
  },
  notifBadgeTxt: { fontSize: 7, fontWeight: '800', color: '#fff' },

  // Section label
  sectionLabel: {
    fontSize: 11, fontWeight: '800', color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10,
  },

  // KPI cards
  kpiLoader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0',
  },
  kpiLoaderTxt: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },

  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  kpiCard: {
    flex: 1, borderRadius: 16, padding: 12,
    alignItems: 'center', gap: 5,
    borderWidth: 1,
  },
  kpiCardBlue:   { backgroundColor: '#fff', borderColor: '#bfdbfe' },
  kpiCardGreen:  { backgroundColor: '#fff', borderColor: '#a7f3d0' },
  kpiCardPurple: { backgroundColor: '#fff', borderColor: '#ddd6fe' },
  kpiCardAmber:  { backgroundColor: '#fff', borderColor: '#fde68a' },

  kpiIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#dbeafe',
    alignItems: 'center', justifyContent: 'center',
  },
  kpiValue: { fontSize: 20, fontWeight: '900', color: '#2563eb', lineHeight: 24 },
  kpiLabel: { fontSize: 9, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },

  // Summary bar
  summaryBar: {
    backgroundColor: '#fff',
    borderRadius: 14, padding: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#e2e8f0',
    marginBottom: 4,
  },
  summaryBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryBarTxt:  { fontSize: 13, color: '#475569', fontWeight: '500' },
  summaryBarBold: { fontWeight: '800', color: '#0f172a' },
  liveIndicator:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  livePulse: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981',
  },
  liveTxt: { fontSize: 10, fontWeight: '800', color: '#10b981', letterSpacing: 1 },

  // Quick actions grid
  actionsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4,
  },
  actionCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 14,
    gap: 6,
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  actionIconBox: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  actionLabel: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  actionSub:   { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  actionArrow: {
    alignSelf: 'flex-start',
    width: 22, height: 22, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },

  // System health
  healthCard: {
    backgroundColor: '#fff', borderRadius: 20,
    borderWidth: 1, borderColor: '#e2e8f0',
    padding: 16, gap: 12, marginBottom: 4,
  },
  healthHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  healthDotGreen: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#10b981',
  },
  healthTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a', flex: 1 },
  healthTime:  { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  healthGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  healthItem: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#f8fafc', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 10, borderWidth: 1, borderColor: '#f1f5f9',
  },
  healthItemTxt: { fontSize: 12, fontWeight: '600' },

  // Admin info
  adminInfoCard: {
    backgroundColor: '#fff', borderRadius: 20,
    borderWidth: 1, borderColor: '#e2e8f0',
    padding: 16, flexDirection: 'row',
    alignItems: 'center', gap: 12,
    marginTop: 20,
    shadowColor: '#0f172a', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  adminInfoAvatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#1e40af',
    alignItems: 'center', justifyContent: 'center',
  },
  adminInfoAvatarTxt: { fontSize: 17, fontWeight: '900', color: '#fff' },
  adminInfoName:  { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  adminInfoEmail: { fontSize: 12, color: '#94a3b8', fontWeight: '500', marginTop: 2 },
  adminInfoBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  adminInfoBadgeTxt: { fontSize: 11, fontWeight: '800' },
});
