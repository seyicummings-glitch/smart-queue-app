import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

type TicketStatus = 'open' | 'in_progress' | 'resolved';
type TicketPriority = 'low' | 'medium' | 'high';

type SupportTicket = {
  id: number;
  subject: string;
  customer: string;
  message: string;
  status: TicketStatus;
  priority: TicketPriority;
  date: string;
  replies: number;
};

const MOCK: SupportTicket[] = [
  { id: 1, subject: 'Unable to join virtual queue',     customer: 'James Wilson',    message: "The app keeps showing an error when I try to join the queue for Account Opening.", status: 'open',        priority: 'high',   date: '2026-05-06', replies: 0 },
  { id: 2, subject: 'Appointment not showing up',       customer: 'Maria Santos',    message: 'I booked an appointment yesterday but it is not visible in my appointments list.', status: 'in_progress', priority: 'medium', date: '2026-05-05', replies: 1 },
  { id: 3, subject: 'Wrong wait time displayed',        customer: 'David Chen',      message: 'The estimated wait time shows 5 minutes but I waited over 30 minutes.',            status: 'open',        priority: 'low',    date: '2026-05-04', replies: 0 },
  { id: 4, subject: 'Cannot cancel appointment',        customer: 'Priya Patel',     message: 'The cancel button is greyed out on my upcoming appointment.',                       status: 'resolved',    priority: 'medium', date: '2026-05-03', replies: 3 },
  { id: 5, subject: 'App crashes on QR scan',          customer: 'Lucas Oliveira',  message: 'Every time I try to scan the QR code at the counter the app closes.',              status: 'open',        priority: 'high',   date: '2026-05-02', replies: 0 },
];

const STATUS_META: Record<TicketStatus, { label: string; color: string; bg: string }> = {
  open:        { label: 'Open',        color: '#e11d48', bg: '#fff1f2' },
  in_progress: { label: 'In Progress', color: '#d97706', bg: '#fffbeb' },
  resolved:    { label: 'Resolved',    color: '#059669', bg: '#ecfdf5' },
};

const PRIORITY_META: Record<TicketPriority, { color: string }> = {
  low:    { color: '#64748b' },
  medium: { color: '#d97706' },
  high:   { color: '#e11d48' },
};

type TabKey = 'all' | TicketStatus;

export default function SupportIndex() {
  const router = useRouter();
  const [tab, setTab]           = useState<TabKey>('open');
  const [tickets, setTickets]   = useState(MOCK);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [reply, setReply]       = useState('');

  const filtered   = tickets.filter(t => tab === 'all' || t.status === tab);
  const openCount  = tickets.filter(t => t.status === 'open').length;

  const resolve = (id: number) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status: 'resolved' } : t));
    setSelected(prev => prev && prev.id === id ? { ...prev, status: 'resolved' } : prev);
  };

  const sendReply = () => {
    if (!reply.trim()) return;
    Alert.alert('Reply sent', 'Your reply has been sent to the customer.');
    if (selected) {
      setTickets(prev => prev.map(t =>
        t.id === selected.id ? { ...t, replies: t.replies + 1, status: 'in_progress' } : t
      ));
      setSelected(prev => prev ? { ...prev, replies: prev.replies + 1, status: 'in_progress' } : prev);
    }
    setReply('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Support</Text>
          {openCount > 0 && (
            <Text style={styles.headerSub}>{openCount} open tickets</Text>
          )}
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContent}
      >
        {(['all', 'open', 'in_progress', 'resolved'] as TabKey[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'in_progress' ? 'In Progress' : t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
            {t === 'open' && openCount > 0 && (
              <View style={styles.badge}><Text style={styles.badgeText}>{openCount}</Text></View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {filtered.map(ticket => {
          const sm = STATUS_META[ticket.status];
          const pm = PRIORITY_META[ticket.priority];
          return (
            <TouchableOpacity
              key={ticket.id}
              style={styles.card}
              onPress={() => setSelected(ticket)}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.subject} numberOfLines={1}>{ticket.subject}</Text>
                <View style={[styles.statusBadge, { backgroundColor: sm.bg }]}>
                  <Text style={[styles.statusText, { color: sm.color }]}>{sm.label}</Text>
                </View>
              </View>
              <Text style={styles.customer}>{ticket.customer}</Text>
              <Text style={styles.preview} numberOfLines={2}>{ticket.message}</Text>
              <View style={styles.cardFooter}>
                <View style={styles.metaItem}>
                  <MaterialIcons name="event" size={12} color="#94a3b8" />
                  <Text style={styles.metaText}>{ticket.date}</Text>
                </View>
                <View style={styles.metaItem}>
                  <MaterialIcons name="chat-bubble-outline" size={12} color="#94a3b8" />
                  <Text style={styles.metaText}>{ticket.replies} replies</Text>
                </View>
                <Text style={[styles.priorityText, { color: pm.color }]}>
                  {ticket.priority.toUpperCase()}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcons name="support-agent" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No tickets found</Text>
          </View>
        )}
      </ScrollView>

      {/* Detail modal */}
      <Modal
        visible={!!selected}
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        {selected && (
          <SafeAreaView style={styles.modal}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelected(null)} style={styles.backBtn}>
                <MaterialIcons name="close" size={22} color="#0f172a" />
              </TouchableOpacity>
              <Text style={styles.modalTitle} numberOfLines={1}>{selected.subject}</Text>
              <View style={{ width: 36 }} />
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.detailMeta}>
                <Text style={styles.detailCustomer}>{selected.customer}</Text>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_META[selected.status].bg }]}>
                  <Text style={[styles.statusText, { color: STATUS_META[selected.status].color }]}>
                    {STATUS_META[selected.status].label}
                  </Text>
                </View>
              </View>

              <View style={styles.bubble}>
                <Text style={styles.bubbleText}>{selected.message}</Text>
              </View>

              <Text style={styles.sectionLabel}>REPLY</Text>
              <View style={styles.replyBox}>
                <TextInput
                  style={styles.replyInput}
                  multiline
                  placeholder="Type your reply…"
                  placeholderTextColor="#94a3b8"
                  value={reply}
                  onChangeText={setReply}
                />
              </View>

              <TouchableOpacity style={styles.sendBtn} onPress={sendReply}>
                <MaterialIcons name="send" size={16} color="#fff" />
                <Text style={styles.sendText}>Send Reply</Text>
              </TouchableOpacity>

              {selected.status !== 'resolved' && (
                <TouchableOpacity style={styles.resolveBtn} onPress={() => resolve(selected.id)}>
                  <MaterialIcons name="check-circle" size={16} color="#059669" />
                  <Text style={styles.resolveText}>Mark as Resolved</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  headerSub: { fontSize: 11, color: '#e11d48', fontWeight: '600' },

  tabsScroll: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tabsContent: { paddingHorizontal: 16, gap: 4, paddingVertical: 2 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#e11d48' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#e11d48' },
  badge: { backgroundColor: '#e11d48', borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },

  content: { padding: 16, gap: 12, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  subject: { flex: 1, fontSize: 14, fontWeight: '800', color: '#0f172a' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusText: { fontSize: 10, fontWeight: '700' },
  customer: { fontSize: 12, fontWeight: '600', color: '#2563eb' },
  preview: { fontSize: 12, color: '#64748b', lineHeight: 18 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  priorityText: { fontSize: 10, fontWeight: '800', marginLeft: 'auto' },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, fontWeight: '600', color: '#94a3b8' },

  modal: { flex: 1, backgroundColor: '#f8fafc' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  modalBody: { padding: 16 },
  detailMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  detailCustomer: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  bubble: {
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    borderTopLeftRadius: 4,
    padding: 14,
    marginBottom: 20,
  },
  bubbleText: { fontSize: 14, color: '#334155', lineHeight: 20 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 1,
    marginBottom: 8,
  },
  replyBox: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 12,
    minHeight: 90,
  },
  replyInput: { fontSize: 14, color: '#0f172a', fontWeight: '500', lineHeight: 20 },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  sendText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  resolveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ecfdf5',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    marginBottom: 40,
  },
  resolveText: { fontSize: 14, fontWeight: '700', color: '#059669' },
});
