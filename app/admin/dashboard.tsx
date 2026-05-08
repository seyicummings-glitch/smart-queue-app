import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppContext } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import SQMSHeader from '@/components/SQMSHeader';
import BottomNav from '@/components/BottomNav';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

type MenuCard = {
  title: string;
  desc: string;
  tags: string;
  iconName: IconName;
  iconColor: string;
  bg: string;
  route: string;
};

const SUPER_ADMIN_MENU: MenuCard[] = [
  {
    title: 'Business Requests',
    desc: 'Review and approve businesses requesting SQMS services',
    tags: 'Review • Approve • Setup',
    iconName: 'description',
    iconColor: '#4f46e5',
    bg: '#eef2ff',
    route: '/admin/business-requests',
  },
  {
    title: 'Businesses',
    desc: 'Register and manage businesses across all industries',
    tags: 'Register • Manage • Overview',
    iconName: 'business',
    iconColor: '#059669',
    bg: '#ecfdf5',
    route: '/admin/businesses',
  },
  {
    title: 'Employees',
    desc: 'Manage employees across all businesses',
    tags: 'Add • Edit • Assign Roles',
    iconName: 'group',
    iconColor: '#2563eb',
    bg: '#eff6ff',
    route: '/admin/employees',
  },
  {
    title: 'Analytics',
    desc: 'View analytics across all businesses',
    tags: 'Reports • Insights • Performance',
    iconName: 'bar-chart',
    iconColor: '#d97706',
    bg: '#fffbeb',
    route: '/admin/analytics',
  },
];

const ADMIN_MENU: MenuCard[] = [
  {
    title: 'Employees',
    desc: 'Manage your staff and admins',
    tags: 'Add • Edit • Assign Roles',
    iconName: 'group',
    iconColor: '#2563eb',
    bg: '#eff6ff',
    route: '/admin/employees',
  },
  {
    title: 'Admin Panel',
    desc: 'Manage services, branches, industry settings, and queue rules',
    tags: 'Services • Branches • Industry • Rules',
    iconName: 'settings',
    iconColor: '#475569',
    bg: '#f1f5f9',
    route: '/admin/industry-selection',
  },
  {
    title: 'Queue Status',
    desc: 'Monitor real-time queue status and customer flow',
    tags: 'Live • Monitoring • Notifications',
    iconName: 'queue',
    iconColor: '#059669',
    bg: '#ecfdf5',
    route: '/admin/queue-status',
  },
  {
    title: 'Appointments',
    desc: 'Manage scheduled appointments and bookings',
    tags: 'Schedule • Manage • Overview',
    iconName: 'event',
    iconColor: '#4f46e5',
    bg: '#eef2ff',
    route: '/admin/appointments',
  },
  {
    title: 'Analytics',
    desc: 'View reports and performance metrics',
    tags: 'Reports • Insights • Performance',
    iconName: 'bar-chart',
    iconColor: '#d97706',
    bg: '#fffbeb',
    route: '/admin/analytics',
  },
  {
    title: 'Support',
    desc: 'Customer support tickets and help desk management',
    tags: 'Tickets • FAQ • Resources',
    iconName: 'help',
    iconColor: '#e11d48',
    bg: '#fff1f2',
    route: '/admin/support',
  },
];

function TagPills({ tags, bg, color }: { tags: string; bg: string; color: string }) {
  return (
    <View style={styles.tagRow}>
      {tags.split(' • ').map((tag, i) => (
        <View key={i} style={[styles.tagPill, { backgroundColor: bg }]}>
          <Text style={[styles.tagText, { color }]}>{tag}</Text>
        </View>
      ))}
    </View>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const { role } = useAppContext();
  const { user } = useAuth();

  const isSuperAdmin = role === 'super_admin' || role === 'superadmin';
  const menu = isSuperAdmin ? SUPER_ADMIN_MENU : ADMIN_MENU;
  const displayName = user?.full_name?.split(' ')[0] ?? (isSuperAdmin ? 'Admin' : 'Admin');

  const rows: MenuCard[][] = [];
  for (let i = 0; i < menu.length; i += 2) rows.push(menu.slice(i, i + 2));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <SQMSHeader />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Welcome, {displayName}</Text>
          <Text style={styles.pageSubtitle}>
            {isSuperAdmin
              ? 'Manage all businesses and analytics'
              : 'Manage your queue management system'}
          </Text>
        </View>

        <View style={styles.gridWrapper}>
          {rows.map((row, ri) => (
            <View key={ri} style={styles.row}>
              {row.map(card => (
                <TouchableOpacity
                  key={card.title}
                  style={styles.card}
                  onPress={() => router.push(card.route as any)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.iconWrap, { backgroundColor: card.bg }]}>
                    <MaterialIcons name={card.iconName} size={24} color={card.iconColor} />
                  </View>
                  <Text style={styles.cardTitle}>{card.title}</Text>
                  <Text style={styles.cardDesc} numberOfLines={2}>{card.desc}</Text>
                  <TagPills tags={card.tags} bg={card.bg} color={card.iconColor} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 24,
  },
  pageHeader: {
    paddingTop: 8,
    paddingBottom: 4,
    gap: 6,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
    lineHeight: 22,
  },
  gridWrapper: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    gap: 8,
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPlaceholder: {
    flex: 1,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.1,
  },
  cardDesc: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '500',
    lineHeight: 14,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  tagPill: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});
