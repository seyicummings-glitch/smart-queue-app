import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CustomerQueueStats = {
  waiting: number;
  serving: number;
};

export type CustomerQueueStatusBarProps = {
  stats: CustomerQueueStats;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function CustomerQueueStatusBar({ stats }: CustomerQueueStatusBarProps) {
  return (
    <View style={styles.container}>
      {/* Waiting stat */}
      <View style={styles.statBox}>
        <View style={[styles.iconWrap, styles.iconWrapBlue]}>
          <MaterialIcons name="access-time" size={20} color="#2563eb" />
        </View>
        <View style={styles.statText}>
          <Text style={styles.statCount}>{stats.waiting}</Text>
          <Text style={styles.statLabel}>Waiting</Text>
        </View>
      </View>

      {/* Vertical divider */}
      <View style={styles.divider} />

      {/* Serving stat */}
      <View style={styles.statBox}>
        <View style={[styles.iconWrap, styles.iconWrapGreen]}>
          <MaterialIcons name="play-arrow" size={20} color="#16a34a" />
        </View>
        <View style={styles.statText}>
          <Text style={styles.statCount}>{stats.serving}</Text>
          <Text style={styles.statLabel}>Serving</Text>
        </View>
      </View>
    </View>
  );
}

export default CustomerQueueStatusBar;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },

  // Stat box
  statBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  // Icon wrapper
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapBlue: {
    backgroundColor: '#eff6ff',
  },
  iconWrapGreen: {
    backgroundColor: '#f0fdf4',
  },

  // Text
  statText: {
    gap: 2,
  },
  statCount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
    lineHeight: 26,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: 0.1,
  },

  // Divider
  divider: {
    width: 1,
    height: 44,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 8,
  },
});
