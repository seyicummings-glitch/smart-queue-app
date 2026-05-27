import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

type Priority = 'Critical' | 'High' | 'Medium' | 'Low';
type TicketStatus = 'Open' | 'In Progress' | 'Resolved';

type Ticket = {
  id: string;
  customer: string;
  issue: string;
  priority: Priority;
  status: TicketStatus;
  time: string;
  assigned: string;
};

type Metric = {
  label: string;
  value: string;
  icon: string;
  color: string;
  bg: string;
};

type HelpResource = {
  icon: string;
  iconColor: string;
  iconBg: string;
  title: string;
  desc: string;
  badge: string;
  badgeColor: string;
  badgeBg: string;
};

const METRICS: Metric[] = [
  { label: 'Total Services', value: '24', icon: 'layers', color: '#2563eb', bg: '#eff6ff' },
  { label: 'Total Branches', value: '8', icon: 'business', color: '#059669', bg: '#ecfdf5' },
  { label: 'Queue Rules', value: '12', icon: 'tune', color: '#7c3aed', bg: '#f5f3ff' },
  { label: 'Open Tickets', value: '5', icon: 'error', color: '#be123c', bg: '#fff1f2' },
];

const TICKETS: Ticket[] = [
  {
    id: 'TKT-001',
    customer: 'Alice Johnson',
    issue: 'Unable to access mobile banking after update.',
    priority: 'Critical',
    status: 'Open',
    time: '2h ago',
    assigned: 'Tech Team',
  },
  {
    id: 'TKT-002',
    customer: 'Bob Martinez',
    issue: 'Queue display screen not updating in Branch 3.',
    priority: 'High',
    status: 'In Progress',
    time: '4h ago',
    assigned: 'Support',
  },
  {
    id: 'TKT-003',
    customer: 'Carol Smith',
    issue: 'SMS notification not received after token issuance.',
    priority: 'Medium',
    status: 'In Progress',
    time: '1d ago',
    assigned: 'Dev Team',
  },
  {
    id: 'TKT-004',
    customer: 'David Lee',
    issue: 'Incorrect wait time displayed for counter 2.',
    priority: 'Low',
    status: 'Resolved',
    time: '2d ago',
    assigned: 'QA Team',
  },
  {
    id: 'TKT-005',
    customer: 'Eva Nguyen',
    issue: 'Employee login session times out too quickly.',
    priority: 'High',
    status: 'Open',
    time: '3d ago',
    assigned: 'Tech Team',
  },
];

const HELP_RESOURCES: HelpResource[] = [
  {
    icon: 'book',
    iconColor: '#2563eb',
    iconBg: '#eff6ff',
    title: 'FAQ Database',
    desc: 'Browse common questions and step-by-step solutions for queue system issues.',
    badge: '120+ Articles',
    badgeColor: '#2563eb',
    badgeBg: '#eff6ff',
  },
  {
    icon: 'phone-in-talk',
    iconColor: '#059669',
    iconBg: '#ecfdf5',
    title: 'Contact Support',
    desc: 'Reach our 24/7 technical support team via phone, chat, or email.',
    badge: 'Available Now',
    badgeColor: '#059669',
    badgeBg: '#ecfdf5',
  },
  {
    icon: 'analytics',
    iconColor: '#7c3aed',
    iconBg: '#f5f3ff',
    title: 'Service Status',
    desc: 'Check real-time system health and planned maintenance windows.',
    badge: 'All Systems OK',
    badgeColor: '#059669',
    badgeBg: '#ecfdf5',
  },
];

const PRIORITY_STYLES: Record<Priority, { color: string; bg: string }> = {
  Critical: { color: '#be123c', bg: '#fff1f2' },
  High:     { color: '#f97316', bg: '#fff7ed' },
  Medium:   { color: '#2563eb', bg: '#eff6ff' },
  Low:      { color: '#64748b', bg: '#f1f5f9' },
};

const STATUS_ICON: Record<TicketStatus, string> = {
  Open:        'error',
  'In Progress': 'access-time',
  Resolved:    'check-circle',
};

const STATUS_COLOR: Record<TicketStatus, string> = {
  Open:        '#be123c',
  'In Progress': '#f97316',
  Resolved:    '#059669',
};

export default function AdminSupportDetail() {
  const router = useRouter();
  const { industryId } = useLocalSearchParams<{ industryId: string }>();

  const slug = Array.isArray(industryId) ? industryId[0] : industryId ?? '';
  const industryLabel = slug
    .split('-')
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={16} color="#64748b" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Support Overview</Text>
        <Text style={styles.subtitle}>{industryLabel} — system health and tickets</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Metrics Grid (2x2) ──────────────────────────── */}
        <View style={styles.metricsGrid}>
          {METRICS.map(m => (
            <View key={m.label} style={styles.metricCard}>
              <View style={[styles.metricIconWrap, { backgroundColor: m.bg }]}>
                <MaterialIcons name={m.icon as any} size={20} color={m.color} />
              </View>
              <Text style={styles.metricValue}>{m.value}</Text>
              <Text style={styles.metricLabel}>{m.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Recent Tickets ──────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Tickets</Text>

          {TICKETS.map(ticket => {
            const pStyle = PRIORITY_STYLES[ticket.priority];
            const sIcon  = STATUS_ICON[ticket.status] as any;
            const sColor = STATUS_COLOR[ticket.status];

            return (
              <View key={ticket.id} style={styles.ticketCard}>
                {/* Top row */}
                <View style={styles.ticketTopRow}>
                  <Text style={styles.ticketId}>{ticket.id}</Text>
                  <View style={[styles.priorityBadge, { backgroundColor: pStyle.bg }]}>
                    <Text style={[styles.priorityText, { color: pStyle.color }]}>
                      {ticket.priority}
                    </Text>
                  </View>
                </View>

                <Text style={styles.ticketCustomer}>{ticket.customer}</Text>
                <Text style={styles.ticketIssue}>{ticket.issue}</Text>

                {/* Bottom meta row */}
                <View style={styles.ticketMeta}>
                  <View style={styles.ticketStatusRow}>
                    <MaterialIcons name={sIcon} size={14} color={sColor} />
                    <Text style={[styles.ticketStatusText, { color: sColor }]}>
                      {ticket.status}
                    </Text>
                  </View>
                  <Text style={styles.ticketTime}>{ticket.time}</Text>
                  <View style={styles.assignedPill}>
                    <Text style={styles.assignedText}>{ticket.assigned}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* ── Help Resources ──────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Help Resources</Text>

          {HELP_RESOURCES.map(res => (
            <TouchableOpacity
              key={res.title}
              style={styles.resourceCard}
              activeOpacity={0.8}
            >
              <View style={[styles.resourceIconWrap, { backgroundColor: res.iconBg }]}>
                <MaterialIcons name={res.icon as any} size={22} color={res.iconColor} />
              </View>

              <View style={styles.resourceBody}>
                <Text style={styles.resourceTitle}>{res.title}</Text>
                <Text style={styles.resourceDesc}>{res.desc}</Text>
              </View>

              <View style={styles.resourceRight}>
                <View style={[styles.resourceBadge, { backgroundColor: res.badgeBg }]}>
                  <Text style={[styles.resourceBadgeText, { color: res.badgeColor }]}>
                    {res.badge}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  // ── Header ──────────────────────────────────────────────
  header: {
    backgroundColor: '#fff',
    paddingTop: 16,
    paddingBottom: 16,
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
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 18,
  },

  // ── Content ─────────────────────────────────────────────
  content: {
    padding: 20,
    paddingBottom: 40,
  },

  // ── Metrics ─────────────────────────────────────────────
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    width: '47.5%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    padding: 16,
    alignItems: 'flex-start',
  },
  metricIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -1,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },

  // ── Section ─────────────────────────────────────────────
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 12,
    letterSpacing: -0.3,
  },

  // ── Tickets ─────────────────────────────────────────────
  ticketCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
  },
  ticketTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  ticketId: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  ticketCustomer: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  ticketIssue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
    lineHeight: 18,
    marginBottom: 12,
  },
  ticketMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  ticketStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ticketStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  ticketTime: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94a3b8',
    marginLeft: 'auto',
  },
  assignedPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  assignedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },

  // ── Help Resources ───────────────────────────────────────
  resourceCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
  },
  resourceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resourceBody: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  resourceDesc: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    lineHeight: 17,
  },
  resourceRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  resourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  resourceBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // ── Spacer ───────────────────────────────────────────────
  bottomSpacer: {
    height: 20,
  },
});
