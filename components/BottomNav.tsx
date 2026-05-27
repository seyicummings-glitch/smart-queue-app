import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppContext } from '@/context/AppContext';
import { useNotifications } from '@/context/NotificationContext';

type Tab = {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  route: string;
};

const CUSTOMER_TABS: Tab[] = [
  { key: 'dashboard',    label: 'Dashboard',    icon: 'dashboard',            route: '/customer/home'         },
  { key: 'services',     label: 'Services',     icon: 'room-service',         route: '/customer/industries'   },
  { key: 'queue-status', label: 'Queue Status', icon: 'notifications-active', route: '/customer/queue-status' },
  { key: 'appointments', label: 'Appointments', icon: 'event',                route: '/customer/appointments' },
  { key: 'support',      label: 'Support',      icon: 'support-agent',        route: '/customer/support'      },
];

const STAFF_TABS: Tab[] = [
  { key: 'dashboard',     label: 'Dashboard',     icon: 'dashboard',    route: '/staff/dashboard'        },
  { key: 'my-counter',    label: 'My Counter',    icon: 'person-pin',   route: '/staff/queues'           },
  { key: 'appointments',  label: 'Appointments',  icon: 'event',        route: '/customer/appointments'  },
  { key: 'notifications', label: 'Alerts',        icon: 'notifications',route: '/notifications'          },
  { key: 'chat',          label: 'Chat',          icon: 'chat',         route: '/staff/chat'             },
];

const ADMIN_TABS: Tab[] = [
  { key: 'dashboard',     label: 'Dashboard',     icon: 'dashboard',    route: '/admin/dashboard'        },
  { key: 'appointments',  label: 'Appointments',  icon: 'event',        route: '/customer/appointments'  },
  { key: 'queue',         label: 'Queue',         icon: 'list-alt',     route: '/admin/queue-status'     },
  { key: 'notifications', label: 'Alerts',        icon: 'notifications',route: '/notifications'          },
  { key: 'chat',          label: 'Chat',          icon: 'chat',         route: '/admin/messages'         },
];

export default function BottomNav() {
  const router   = useRouter();
  const pathname = usePathname();
  const { role } = useAppContext();
  const insets   = useSafeAreaInsets();
  const { unreadCount } = useNotifications();

  const tabs =
    role === 'admin' || role === 'super_admin' || role === 'superadmin' ? ADMIN_TABS :
    role === 'staff' ? STAFF_TABS :
    CUSTOMER_TABS;

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {tabs.map(tab => {
        const active     = pathname === tab.route || pathname.startsWith(tab.route + '/');
        const showBadge  = tab.key === 'notifications' && unreadCount > 0;

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
              {showBadge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
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
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
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
  badgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 10,
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
