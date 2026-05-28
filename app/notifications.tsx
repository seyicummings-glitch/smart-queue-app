import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNotifications } from '@/context/NotificationContext';
import SQMSHeader from '@/components/SQMSHeader';
import BottomNav from '@/components/BottomNav';
import { api } from '@/lib/api';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

type Notification = {
  id: number;
  type: 'queue' | 'appointment' | 'system' | 'alert' | 'success';
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
};

const ICON_MAP: Record<Notification['type'], { icon: IconName; color: string; bg: string }> = {
  queue:       { icon: 'queue',         color: '#2563eb', bg: '#eff6ff' },
  appointment: { icon: 'event',         color: '#7c3aed', bg: '#f5f3ff' },
  system:      { icon: 'info',          color: '#475569', bg: '#f1f5f9' },
  alert:       { icon: 'warning',       color: '#d97706', bg: '#fffbeb' },
  success:     { icon: 'check-circle',  color: '#059669', bg: '#ecfdf5' },
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return hrs === 1 ? '1 hr ago' : `${hrs} hrs ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? 'Yesterday' : `${days} days ago`;
}

function NotificationCard({ item, onRead, onDismiss }: {
  item: Notification;
  onRead:    (id: number) => void;
  onDismiss: (id: number) => void;
}) {
  const cfg = ICON_MAP[item.type] ?? ICON_MAP.system;
  return (
    <TouchableOpacity
      style={[styles.card, item.is_read && styles.cardRead]}
      activeOpacity={0.85}
      onPress={() => { if (!item.is_read) onRead(item.id); }}
    >
      <View style={styles.cardLeft}>
        <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
          <MaterialIcons name={cfg.icon} size={20} color={cfg.color} />
        </View>
        {!item.is_read && <View style={styles.unreadDot} />}
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={[styles.cardTitle, item.is_read && styles.cardTitleRead]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.cardTime}>{relativeTime(item.created_at)}</Text>
        </View>
        <Text style={styles.cardBodyText} numberOfLines={3}>{item.body}</Text>
      </View>
      <TouchableOpacity
        style={styles.dismissBtn}
        onPress={() => onDismiss(item.id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialIcons name="close" size={16} color="#94a3b8" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const [tab,        setTab]        = useState<'all' | 'unread'>('all');
  const [items,      setItems]      = useState<Notification[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { setUnreadCount } = useNotifications();

  const loadNotifications = useCallback(async () => {
    const { data, error } = await api.get<{ results: Notification[] } | Notification[]>('/notifications/');
    if (!error) {
      const list = Array.isArray(data) ? data : (data as any)?.results ?? [];
      setItems(list);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    loadNotifications();
    setUnreadCount(0);
  }, [loadNotifications]);

  const handleRead = async (id: number) => {
    await api.post(`/notifications/${id}/read/`, {});
    setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleDismiss = async (id: number) => {
    await api.delete(`/notifications/${id}/`);
    setItems(prev => prev.filter(n => n.id !== id));
  };

  const handleMarkAllRead = async () => {
    await api.post('/notifications/read-all/', {});
    setItems(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const displayed    = tab === 'unread' ? items.filter(n => !n.is_read) : items;
  const unreadCount  = items.filter(n => !n.is_read).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <SQMSHeader />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}
      >
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderRow}>
            <View>
              <Text style={styles.pageTitle}>Notifications</Text>
              <Text style={styles.pageSubtitle}>
                {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
              </Text>
            </View>
            {unreadCount > 0 && (
              <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead}>
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

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : displayed.length === 0 ? (
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
              <NotificationCard
                key={item.id}
                item={item}
                onRead={handleRead}
                onDismiss={handleDismiss}
              />
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
  content:   { padding: 20, gap: 16, paddingBottom: 24 },
  loadingBox: { paddingVertical: 60, alignItems: 'center' },

  pageHeader:    { gap: 12 },
  pageHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  pageTitle:     { fontSize: 28, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  pageSubtitle:  { fontSize: 14, color: '#64748b', fontWeight: '500', marginTop: 2 },

  markAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 10, borderWidth: 1, borderColor: '#bfdbfe', marginTop: 4,
  },
  markAllText: { fontSize: 12, fontWeight: '700', color: '#2563eb' },

  tabRow: { flexDirection: 'row', gap: 8 },
  tabBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
  },
  tabBtnActive:  { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  tabLabel:      { fontSize: 13, fontWeight: '700', color: '#64748b' },
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
  cardRead: { opacity: 0.7 },

  cardLeft:  { alignItems: 'center', gap: 6 },
  iconWrap:  { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563eb' },

  cardBody:   { flex: 1, gap: 4 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle:      { flex: 1, fontSize: 14, fontWeight: '800', color: '#0f172a' },
  cardTitleRead:  { color: '#64748b', fontWeight: '600' },
  cardTime:       { fontSize: 11, color: '#94a3b8', fontWeight: '600', flexShrink: 0 },
  cardBodyText:   { fontSize: 13, color: '#64748b', fontWeight: '500', lineHeight: 19 },

  dismissBtn: { paddingTop: 2 },

  emptyState:   { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 24, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  emptyTitle:   { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  emptyBody:    { fontSize: 14, color: '#64748b', fontWeight: '500', textAlign: 'center', lineHeight: 20 },
});
