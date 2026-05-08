import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppContext } from '@/context/AppContext';

type Tab = {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  route: string;
};

const CUSTOMER_TABS: Tab[] = [
  { key: 'home',     label: 'Home',     icon: 'home',            route: '/customer/home' },
  { key: 'queue',    label: 'Queue',    icon: 'qr-code-scanner', route: '/customer/appointments' },
  { key: 'alerts',   label: 'Alerts',   icon: 'notifications',   route: '/notifications' },
  { key: 'settings', label: 'Settings', icon: 'settings',        route: '/profile' },
];

const STAFF_TABS: Tab[] = [
  { key: 'home',     label: 'Home',     icon: 'home',            route: '/staff/dashboard' },
  { key: 'queue',    label: 'Queue',    icon: 'view-list',       route: '/staff/queues' },
  { key: 'alerts',   label: 'Alerts',   icon: 'notifications',   route: '/notifications' },
  { key: 'settings', label: 'Settings', icon: 'settings',        route: '/profile' },
];

const ADMIN_TABS: Tab[] = [
  { key: 'home',     label: 'Home',     icon: 'home',            route: '/admin/dashboard' },
  { key: 'queue',    label: 'Queue',    icon: 'view-list',       route: '/staff/queues' },
  { key: 'alerts',   label: 'Alerts',   icon: 'notifications',   route: '/notifications' },
  { key: 'settings', label: 'Settings', icon: 'settings',        route: '/profile' },
];

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { role } = useAppContext();

  const tabs =
    role === 'admin' || role === 'super_admin' || role === 'superadmin' ? ADMIN_TABS :
    role === 'staff' ? STAFF_TABS :
    CUSTOMER_TABS;

  return (
    <View style={styles.container}>
      {tabs.map(tab => {
        const active = pathname === tab.route || pathname.startsWith(tab.route + '/');
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => router.replace(tab.route as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBg, active && styles.iconBgActive]}>
              <MaterialIcons
                name={tab.icon}
                size={20}
                color={active ? '#2563eb' : '#94a3b8'}
              />
            </View>
            <Text style={[styles.label, active && styles.labelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBgActive: {
    backgroundColor: '#eff6ff',
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  labelActive: {
    color: '#2563eb',
  },
});
