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
import { useAppContext } from '@/context/AppContext';
import SQMSHeader from '@/components/SQMSHeader';
import BottomNav from '@/components/BottomNav';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

type Notification = {
  id: string;
  type: 'queue' | 'appointment' | 'system' | 'alert' | 'success';
  title: string;
  body: string;
  time: string;
  read: boolean;
};

const ICON_MAP: Record<Notification['type'], { icon: IconName; color: string; bg: string }> = {
  queue:       { icon: 'queue',            color: '#2563eb', bg: '#eff6ff' },
  appointment: { icon: 'event',            color: '#7c3aed', bg: '#f5f3ff' },
  system:      { icon: 'info',             color: '#475569', bg: '#f1f5f9' },
  alert:       { icon: 'warning',          color: '#d97706', bg: '#fffbeb' },
  success:     { icon: 'check-circle',     color: '#059669', bg: '#ecfdf5' },
};

const CUSTOMER_NOTIFICATIONS: Notification[] = [
  { id: '1', type: 'queue',       title: 'Your turn is coming up',       body: 'You are now 2nd in line at Banking & Finance. Estimated wait: 5 mins.',    time: '2 min ago',  read: false },
  { id: '2', type: 'success',     title: 'Service completed',             body: 'Your service at Healthcare has been completed. Thank you for your visit.',  time: '1 hr ago',   read: false },
  { id: '3', type: 'appointment', title: 'Appointment reminder',          body: 'Your appointment at Government Services is tomorrow at 10:00 AM.',         time: '3 hr ago',   read: true  },
  { id: '4', type: 'alert',       title: 'Queue delay notice',            body: 'The Education queue is experiencing delays. Expected extra wait: 15 mins.', time: 'Yesterday',  read: true  },
  { id: '5', type: 'system',      title: 'Welcome to SQMS',               body: 'Your account is set up. Start by selecting a business to join a queue.',    time: '2 days ago', read: true  },
];

const STAFF_NOTIFICATIONS: Notification[] = [
  { id: '1', type: 'alert',       title: 'Queue threshold reached',       body: 'Banking queue has exceeded 20 customers. Consider opening an extra counter.',  time: '5 min ago',  read: false },
  { id: '2', type: 'queue',       title: 'New customer joined',           body: 'Customer #B-047 has joined your queue. Current queue length: 12.',              time: '8 min ago',  read: false },
  { id: '3', type: 'appointment', title: 'Upcoming appointment',          body: 'Customer James W. has a scheduled appointment in 30 minutes.',                  time: '25 min ago', read: false },
  { id: '4', type: 'success',     title: 'Daily target reached',          body: 'You have served 50 customers today. Great work!',                               time: '2 hr ago',   read: true  },
  { id: '5', type: 'system',      title: 'Shift reminder',                body: 'Your shift ends in 1 hour. Please complete pending tickets before closing.',    time: '3 hr ago',   read: true  },
];

const ADMIN_NOTIFICATIONS: Notification[] = [
  { id: '1', type: 'alert',       title: 'Staff absence reported',        body: '2 staff members at Healthcare branch reported absent today.',                     time: '10 min ago', read: false },
  { id: '2', type: 'system',      title: 'New business request',          body: 'RetailCo Ltd has submitted an onboarding request for SQMS services.',             time: '1 hr ago',   read: false },
  { id: '3', type: 'success',     title: 'Monthly report ready',          body: 'The analytics report for April 2026 is now available. Tap to view.',              time: '3 hr ago',   read: true  },
  { id: '4', type: 'queue',       title: 'Queue anomaly detected',        body: 'Unusually high volume at Government Services branch — 80 customers in queue.',     time: 'Yesterday',  read: true  },
  { id: '5', type: 'appointment', title: 'Scheduled maintenance',         body: 'System maintenance is scheduled for Sunday 10 May at 2:00 AM. Expect downtime.',  time: '2 days ago', read: true  },
];

function NotificationCard({
  item,
  onDismiss,
}: {
  item: Notification;
  onDismiss: (id: string) => void;
}) {
  const cfg = ICON_MAP[item.type];

  return (
    <View style={[styles.card, item.read && styles.cardRead]}>
      <View style={styles.cardLeft}>
        <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
          <MaterialIcons name={cfg.icon} size={20} color={cfg.color} />
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={[styles.cardTitle, item.read && styles.cardTitleRead]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.cardTime}>{item.time}</Text>
        </View>
        <Text style={styles.cardBodyText} numberOfLines={3}>{item.body}</Text>
      </View>
      <TouchableOpacity style={styles.dismissBtn} onPress={() => onDismiss(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <MaterialIcons name="close" size={16} color="#94a3b8" />
      </TouchableOpacity>
    </View>
  );
}

export default function NotificationsScreen() {
  const { role } = useAppContext();
  const [tab, setTab] = useState<'all' | 'unread'>('all');

  const baseList =
    role === 'admin' || role === 'super_admin' || role === 'superadmin' ? ADMIN_NOTIFICATIONS :
    role === 'staff' ? STAFF_NOTIFICATIONS :
    CUSTOMER_NOTIFICATIONS;

  const [items, setItems] = useState<Notification[]>(baseList);

  const displayed = tab === 'unread' ? items.filter(n => !n.read) : items;
  const unreadCount = items.filter(n => !n.read).length;

  const dismiss = (id: string) => setItems(prev => prev.filter(n => n.id !== id));
  const markAllRead = () => setItems(prev => prev.map(n => ({ ...n, read: true })));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <SQMSHeader />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderRow}>
            <View>
              <Text style={styles.pageTitle}>Notifications</Text>
              <Text style={styles.pageSubtitle}>
                {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
              </Text>
            </View>
            {unreadCount > 0 && (
              <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead}>
                <MaterialIcons name="done-all" size={15} color="#2563eb" />
                <Text style={styles.markAllText}>Mark all read</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabBtn, tab === 'all' && styles.tabBtnActive]}
              onPress={() => setTab('all')}
            >
              <Text style={[styles.tabLabel, tab === 'all' && styles.tabLabelActive]}>All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, tab === 'unread' && styles.tabBtnActive]}
              onPress={() => setTab('unread')}
            >
              <Text style={[styles.tabLabel, tab === 'unread' && styles.tabLabelActive]}>Unread</Text>
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {displayed.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <MaterialIcons name="notifications-none" size={32} color="#94a3b8" />
            </View>
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptyBody}>
              {tab === 'unread' ? 'You have read all your notifications.' : 'You have no notifications yet.'}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {displayed.map(item => (
              <NotificationCard key={item.id} item={item} onDismiss={dismiss} />
            ))}
          </View>
        )}
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, gap: 16, paddingBottom: 24 },

  pageHeader: { gap: 12 },
  pageHeaderRow: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
  },
  pageTitle: { fontSize: 28, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 14, color: '#64748b', fontWeight: '500', marginTop: 2 },

  markAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
    borderWidth: 1, borderColor: '#bfdbfe', marginTop: 4,
  },
  markAllText: { fontSize: 12, fontWeight: '700', color: '#2563eb' },

  tabRow: { flexDirection: 'row', gap: 8 },
  tabBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
  },
  tabBtnActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  tabLabel: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  tabLabelActive: { color: '#fff' },
  badge: {
    backgroundColor: '#fff', borderRadius: 999,
    paddingHorizontal: 6, paddingVertical: 1, minWidth: 18, alignItems: 'center',
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#2563eb' },

  list: { gap: 10 },

  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#fff', borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#0f172a', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  cardRead: { opacity: 0.75 },

  cardLeft: { alignItems: 'center', gap: 6 },
  iconWrap: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563eb',
  },

  cardBody: { flex: 1, gap: 4 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '800', color: '#0f172a' },
  cardTitleRead: { color: '#64748b', fontWeight: '600' },
  cardTime: { fontSize: 11, color: '#94a3b8', fontWeight: '600', flexShrink: 0 },
  cardBodyText: { fontSize: 13, color: '#64748b', fontWeight: '500', lineHeight: 19 },

  dismissBtn: { paddingTop: 2 },

  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 24,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  emptyBody: { fontSize: 14, color: '#64748b', fontWeight: '500', textAlign: 'center', lineHeight: 20 },
});
