import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

// ─── Types ────────────────────────────────────────────────────────────────────

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

type MetricColor = 'blue' | 'emerald' | 'violet' | 'orange';

type Metric = {
  id: 'services' | 'branches' | 'rules' | 'queue';
  title: string;
  icon: IconName;
  color: MetricColor;
  desc: string;
  isLive?: boolean;
};

type MetricCounts = {
  services: number;
  branches: number;
  rules: number;
  queue: number;
};

// ─── Color map ────────────────────────────────────────────────────────────────

const COLOR_MAP: Record<MetricColor, { icon: string; bg: string; dot: string }> = {
  blue: { icon: '#2563eb', bg: '#eff6ff', dot: '#2563eb' },
  emerald: { icon: '#059669', bg: '#ecfdf5', dot: '#059669' },
  violet: { icon: '#7c3aed', bg: '#f5f3ff', dot: '#7c3aed' },
  orange: { icon: '#ea580c', bg: '#fff7ed', dot: '#ea580c' },
};

// ─── Metric definitions ───────────────────────────────────────────────────────

const METRICS: Metric[] = [
  {
    id: 'services',
    title: 'Total Services',
    icon: 'layers',
    color: 'blue',
    desc: 'Active services available',
  },
  {
    id: 'branches',
    title: 'Total Branches',
    icon: 'location-on',
    color: 'emerald',
    desc: 'Operational locations',
  },
  {
    id: 'rules',
    title: 'Queue Rules',
    icon: 'tune',
    color: 'violet',
    desc: 'Active routing policies',
  },
  {
    id: 'queue',
    title: 'Total in Queue',
    icon: 'group',
    color: 'orange',
    desc: 'People currently waiting',
    isLive: true,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTitle(slug: string): string {
  return slug
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getMetricsCounts(slug: string): MetricCounts {
  // Provide realistic seed counts based on industry slug
  const slugLower = (slug ?? '').toLowerCase();
  if (slugLower.includes('bank') || slugLower.includes('financ')) {
    return { services: 12, branches: 8, rules: 5, queue: 34 };
  }
  if (slugLower.includes('health') || slugLower.includes('hospital')) {
    return { services: 18, branches: 6, rules: 7, queue: 52 };
  }
  if (slugLower.includes('retail') || slugLower.includes('shop')) {
    return { services: 8, branches: 15, rules: 4, queue: 21 };
  }
  if (slugLower.includes('telecom')) {
    return { services: 10, branches: 12, rules: 6, queue: 19 };
  }
  if (slugLower.includes('gov') || slugLower.includes('public')) {
    return { services: 14, branches: 9, rules: 8, queue: 67 };
  }
  // Default
  return { services: 10, branches: 5, rules: 4, queue: 22 };
}

// ─── Pulsing live dot ─────────────────────────────────────────────────────────

function LiveDot({ color }: { color: string }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.2,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[styles.liveDot, { backgroundColor: color, opacity }]}
    />
  );
}

// ─── Metric card ─────────────────────────────────────────────────────────────

function MetricCard({
  metric,
  value,
  onPress,
}: {
  metric: Metric;
  value: number;
  onPress?: () => void;
}) {
  const colors = COLOR_MAP[metric.color];
  const card = (
    <View style={[styles.metricCard, !onPress && styles.metricCardStatic]}>
      <View style={styles.metricCardTop}>
        <View style={[styles.metricIconWrap, { backgroundColor: colors.bg }]}>
          <MaterialIcons name={metric.icon} size={20} color={colors.icon} />
        </View>
        {metric.isLive && (
          <View style={styles.liveBadge}>
            <LiveDot color={colors.dot} />
            <Text style={[styles.liveBadgeText, { color: colors.icon }]}>Live</Text>
          </View>
        )}
        {onPress && (
          <MaterialIcons
            name="chevron-right"
            size={16}
            color="#94a3b8"
            style={styles.metricArrow}
          />
        )}
      </View>
      <Text style={[styles.metricValue, { color: colors.icon }]}>{value}</Text>
      <Text style={styles.metricTitle}>{metric.title}</Text>
      <Text style={styles.metricDesc}>{metric.desc}</Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={styles.metricCardWrapper} onPress={onPress} activeOpacity={0.8}>
        {card}
      </TouchableOpacity>
    );
  }
  return <View style={styles.metricCardWrapper}>{card}</View>;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AdminIndustryDetail() {
  const router = useRouter();
  const { industryId } = useLocalSearchParams<{ industryId: string }>();

  const [counts, setCounts] = useState<MetricCounts>(
    getMetricsCounts(industryId ?? '')
  );

  // Simulate live queue count updates every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCounts((prev) => ({
        ...prev,
        queue: Math.max(0, prev.queue + Math.floor(Math.random() * 7) - 3),
      }));
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const displayTitle = formatTitle(industryId ?? 'Industry');

  function getRouteForMetric(id: Metric['id']): string | undefined {
    switch (id) {
      case 'branches':
        return `/admin/branches/${industryId}`;
      case 'rules':
        return `/admin/queue-rules/${industryId}`;
      case 'services':
        return `/admin/services/${industryId}`;
      default:
        return undefined;
    }
  }

  // Pair metrics into rows of 2
  const rows: Metric[][] = [];
  for (let i = 0; i < METRICS.length; i += 2) {
    rows.push(METRICS.slice(i, i + 2));
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={16} color="#64748b" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{displayTitle}</Text>
        <Text style={styles.headerSub}>Industry overview and management</Text>
      </View>

      {/* Metrics grid */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>Overview Metrics</Text>
        {rows.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.row}>
            {row.map((metric) => {
              const route = getRouteForMetric(metric.id);
              return (
                <MetricCard
                  key={metric.id}
                  metric={metric}
                  value={counts[metric.id]}
                  onPress={route ? () => router.push(route as any) : undefined}
                />
              );
            })}
          </View>
        ))}

        {/* Quick actions */}
        <Text style={[styles.sectionLabel, { marginTop: 8 }]}>Quick Actions</Text>
        <View style={styles.actionsCard}>
          {[
            { label: 'Manage Services', route: `/admin/services/${industryId}`, icon: 'layers' as IconName },
            { label: 'Manage Branches', route: `/admin/branches/${industryId}`, icon: 'location-on' as IconName },
            { label: 'Queue Rules', route: `/admin/queue-rules/${industryId}`, icon: 'tune' as IconName },
          ].map((action, idx, arr) => (
            <React.Fragment key={action.label}>
              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => router.push(action.route as any)}
                activeOpacity={0.7}
              >
                <View style={styles.actionIconWrap}>
                  <MaterialIcons name={action.icon} size={18} color="#475569" />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
                <MaterialIcons name="chevron-right" size={18} color="#cbd5e1" />
              </TouchableOpacity>
              {idx < arr.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  // Header
  header: {
    backgroundColor: '#fff',
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  backText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '500',
  },

  // Content
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },

  // Metric card
  metricCardWrapper: {
    flex: 1,
  },
  metricCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    gap: 6,
  },
  metricCardStatic: {
    // same appearance, just not pressable
  },
  metricCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  metricIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricArrow: {
    // positioned to top-right naturally via flexRow justify space-between
  },
  metricValue: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  metricTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  metricDesc: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94a3b8',
    lineHeight: 15,
  },

  // Live badge
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Quick actions card
  actionsCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 16,
  },
});
