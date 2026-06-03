import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import AppLogo from '@/components/AppLogo';

export default function SQMSHeader() {
  const router = useRouter();
  const { user } = useAuth();
  const { unreadCount: unread } = useNotifications();

  const initials = user?.full_name
    ? user.full_name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  return (
    <View style={styles.header}>
      <View style={styles.logoRow}>
        <AppLogo size={32} />
        <Text style={styles.logoText}>SQMS</Text>
      </View>

      <View style={styles.rightRow}>
        {/* Notification bell */}
        <TouchableOpacity
          style={styles.bellBtn}
          onPress={() => router.push('/notifications' as any)}
          activeOpacity={0.8}
        >
          <MaterialIcons name="notifications-none" size={22} color="#475569" />
          {unread > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Profile avatar */}
        <TouchableOpacity
          style={styles.avatar}
          onPress={() => router.push('/profile' as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  logoLetter: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  logoText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  bellBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#e11d48',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  bellBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
});
