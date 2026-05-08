import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// ─── Types ────────────────────────────────────────────────────────────────────

export type QueueTab = 'waiting' | 'serving' | 'completed';

export type QueueStats = {
  waiting: number;
  serving: number;
  completed: number;
};

export type QueueStatusBarProps = {
  activeTab: QueueTab;
  onTabChange: (tab: QueueTab) => void;
  stats: QueueStats;
};

// ─── Tab Config ───────────────────────────────────────────────────────────────

type TabConfig = {
  key: QueueTab;
  label: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  activeBg: string;
  activeText: string;
  activeBorder: string;
  badgeBg: string;
  badgeText: string;
};

const TABS: TabConfig[] = [
  {
    key: 'waiting',
    label: 'Waiting',
    icon: 'access-time',
    activeBg: '#eff6ff',
    activeText: '#2563eb',
    activeBorder: '#2563eb',
    badgeBg: '#2563eb',
    badgeText: '#fff',
  },
  {
    key: 'serving',
    label: 'Serving',
    icon: 'play-arrow',
    activeBg: '#f0fdf4',
    activeText: '#16a34a',
    activeBorder: '#16a34a',
    badgeBg: '#16a34a',
    badgeText: '#fff',
  },
  {
    key: 'completed',
    label: 'Completed',
    icon: 'check-circle',
    activeBg: '#f8fafc',
    activeText: '#334155',
    activeBorder: '#475569',
    badgeBg: '#475569',
    badgeText: '#fff',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function QueueStatusBar({ activeTab, onTabChange, stats }: QueueStatusBarProps) {
  return (
    <View style={styles.container}>
      {TABS.map((tab, idx) => {
        const isActive = activeTab === tab.key;
        const count = stats[tab.key];
        const isLast = idx === TABS.length - 1;

        return (
          <React.Fragment key={tab.key}>
            <TouchableOpacity
              style={[
                styles.tab,
                isActive && {
                  backgroundColor: tab.activeBg,
                  borderColor: tab.activeBorder,
                },
              ]}
              onPress={() => onTabChange(tab.key)}
              activeOpacity={0.75}
            >
              {/* Icon + Label row */}
              <View style={styles.tabLabelRow}>
                <MaterialIcons
                  name={tab.icon}
                  size={16}
                  color={isActive ? tab.activeText : '#94a3b8'}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    { color: isActive ? tab.activeText : '#94a3b8' },
                  ]}
                >
                  {tab.label}
                </Text>
              </View>

              {/* Count badge */}
              <View
                style={[
                  styles.badge,
                  { backgroundColor: isActive ? tab.badgeBg : '#e2e8f0' },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: isActive ? tab.badgeText : '#64748b' },
                  ]}
                >
                  {count}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Vertical divider between tabs */}
            {!isLast && <View style={styles.divider} />}
          </React.Fragment>
        );
      })}
    </View>
  );
}

export default QueueStatusBar;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 0,
    alignItems: 'stretch',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 6,
  },
  tabLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  badge: {
    minWidth: 26,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  divider: {
    width: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 6,
    marginHorizontal: 4,
  },
});
