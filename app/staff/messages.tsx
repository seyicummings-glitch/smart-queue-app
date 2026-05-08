import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import {
  useMessages,
  SupportTicket,
  InternalMessage,
  TicketStatus,
} from '@/context/MessagesContext';

type Tab = 'inbox' | 'compose' | 'sent';

const STATUS_STYLE: Record<TicketStatus, { color: string; bg: string; label: string }> = {
  open:        { color: '#2563eb', bg: '#eff6ff', label: 'Open' },
  in_progress: { color: '#d97706', bg: '#fffbeb', label: 'In Progress' },
  resolved:    { color: '#059669', bg: '#ecfdf5', label: 'Resolved' },
  closed:      { color: '#64748b', bg: '#f1f5f9', label: 'Closed' },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function StaffMessages() {
  const router = useRouter();
  const {
    messages, ticketsFor, messagesFor,
    replyTicket, sendMessage,
    markTicketRead, markMessageRead,
    updateStatus,
  } = useMessages();

  const [tab, setTab] = useState<Tab>('inbox');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [selectedMsg, setSelectedMsg] = useState<InternalMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  const myTickets = ticketsFor('staff');
  const allMyMessages = messagesFor('staff');
  const inboxMessages = allMyMessages.filter(m => m.from !== 'staff');
  const sentMessages = messages.filter(m => m.from === 'staff');

  const unreadTickets = myTickets.filter(t => !t.isRead).length;
  const unreadMsgs = inboxMessages.filter(m => !m.isRead).length;
  const totalUnread = unreadTickets + unreadMsgs;

  const handleSend = () => {
    if (!composeSubject.trim() || !composeBody.trim()) {
      Alert.alert('Missing fields', 'Please fill in both subject and message.');
      return;
    }
    sendMessage({
      from: 'staff', fromName: 'Staff Member', to: 'admin',
      subject: composeSubject.trim(), body: composeBody.trim(), type: 'message',
    });
    setComposeSubject(''); setComposeBody('');
    Alert.alert('Message Sent', 'Your message has been sent to the Admin team.', [
      { text: 'View Sent', onPress: () => setTab('sent') },
      { text: 'OK' },
    ]);
  };

  const handleTicketReply = () => {
    if (!selectedTicket || !replyText.trim()) return;
    replyTicket(selectedTicket.id, { from: 'staff', fromName: 'Support Staff', body: replyText.trim() });
    setReplyText('');
  };

  const openTicket = (t: SupportTicket) => {
    markTicketRead(t.id);
    setSelectedTicket(t);
  };

  const openMsg = (m: InternalMessage) => {
    markMessageRead(m.id);
    setSelectedMsg(m);
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.headerTitle}>Messages</Text>
          <Text style={s.headerSub}>
            {totalUnread > 0 ? `${totalUnread} unread message${totalUnread > 1 ? 's' : ''}` : 'All caught up'}
          </Text>
        </View>
        {totalUnread > 0 && (
          <View style={s.unreadBadge}>
            <Text style={s.unreadBadgeText}>{totalUnread}</Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={s.tabBar}>
        {([
          { key: 'inbox' as Tab, label: `Inbox${totalUnread > 0 ? ` (${totalUnread})` : ''}` },
          { key: 'compose' as Tab, label: 'New Message' },
          { key: 'sent' as Tab, label: `Sent (${sentMessages.length})` },
        ]).map(t => (
          <TouchableOpacity
            key={t.key}
            style={[s.tabItem, tab === t.key && s.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[s.tabLabel, tab === t.key && s.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Inbox ─────────────────────────────────────── */}
      {tab === 'inbox' && (
        <ScrollView contentContainerStyle={s.content}>
          {myTickets.length > 0 && (
            <>
              <Text style={s.sectionLabel}>Customer Support Tickets</Text>
              {myTickets.map(ticket => {
                const st = STATUS_STYLE[ticket.status];
                return (
                  <TouchableOpacity
                    key={ticket.id}
                    style={[s.card, !ticket.isRead && s.cardUnread]}
                    onPress={() => openTicket(ticket)}
                    activeOpacity={0.8}
                  >
                    <View style={s.cardRow}>
                      <View style={[s.badge, { backgroundColor: st.bg }]}>
                        <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
                      </View>
                      <Text style={s.cardTime}>{timeAgo(ticket.timestamp)}</Text>
                      {!ticket.isRead && <View style={s.dot} />}
                    </View>
                    <Text style={s.cardTitle}>{ticket.subject}</Text>
                    <Text style={s.cardFrom}>From: {ticket.fromName} (Customer)</Text>
                    <Text style={s.cardBody} numberOfLines={2}>{ticket.body}</Text>
                    {ticket.replies.length > 0 && (
                      <Text style={s.replyCount}>{ticket.replies.length} repl{ticket.replies.length > 1 ? 'ies' : 'y'}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {inboxMessages.length > 0 && (
            <>
              <Text style={s.sectionLabel}>Messages from Admin</Text>
              {inboxMessages.map(msg => (
                <TouchableOpacity
                  key={msg.id}
                  style={[s.card, !msg.isRead && s.cardUnread]}
                  onPress={() => openMsg(msg)}
                  activeOpacity={0.8}
                >
                  <View style={s.cardRow}>
                    <View style={[s.badge, {
                      backgroundColor: msg.type === 'announcement' ? '#fff7ed' : '#f0fdf4',
                    }]}>
                      <Text style={[s.badgeText, {
                        color: msg.type === 'announcement' ? '#ea580c' : '#16a34a',
                      }]}>
                        {msg.type === 'announcement' ? 'Announcement' : 'Message'}
                      </Text>
                    </View>
                    <Text style={s.cardTime}>{timeAgo(msg.timestamp)}</Text>
                    {!msg.isRead && <View style={s.dot} />}
                  </View>
                  <Text style={s.cardTitle}>{msg.subject}</Text>
                  <Text style={s.cardFrom}>From: {msg.fromName}</Text>
                  <Text style={s.cardBody} numberOfLines={2}>{msg.body}</Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          {myTickets.length === 0 && inboxMessages.length === 0 && (
            <View style={s.empty}>
              <MaterialIcons name="inbox" size={52} color="#cbd5e1" />
              <Text style={s.emptyTitle}>Inbox is empty</Text>
              <Text style={s.emptySub}>Customer tickets and admin messages will appear here</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Compose ──────────────────────────────────── */}
      {tab === 'compose' && (
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <View style={s.composeCard}>
            <View style={s.toRow}>
              <Text style={s.toLabel}>To:</Text>
              <View style={[s.badge, { backgroundColor: '#eff6ff' }]}>
                <Text style={[s.badgeText, { color: '#2563eb' }]}>Admin Team</Text>
              </View>
            </View>
            <View style={s.divider} />
            <TextInput
              style={s.subjectInput}
              placeholder="Subject"
              placeholderTextColor="#94a3b8"
              value={composeSubject}
              onChangeText={setComposeSubject}
            />
            <View style={s.divider} />
            <TextInput
              style={s.bodyInput}
              placeholder="Write your message here..."
              placeholderTextColor="#94a3b8"
              value={composeBody}
              onChangeText={setComposeBody}
              multiline
              textAlignVertical="top"
            />
          </View>
          <TouchableOpacity style={s.sendBtn} onPress={handleSend}>
            <MaterialIcons name="send" size={18} color="#fff" />
            <Text style={s.sendBtnText}>Send to Admin</Text>
          </TouchableOpacity>
          <View style={s.hintBox}>
            <MaterialIcons name="info-outline" size={16} color="#2563eb" />
            <Text style={s.hintText}>Messages are sent to the Admin team managing this branch. For urgent issues, contact them directly.</Text>
          </View>
        </ScrollView>
      )}

      {/* ── Sent ──────────────────────────────────────── */}
      {tab === 'sent' && (
        <ScrollView contentContainerStyle={s.content}>
          {sentMessages.length === 0 ? (
            <View style={s.empty}>
              <MaterialIcons name="send" size={52} color="#cbd5e1" />
              <Text style={s.emptyTitle}>No sent messages</Text>
              <Text style={s.emptySub}>Messages you send to admin will appear here</Text>
            </View>
          ) : sentMessages.map(msg => (
            <TouchableOpacity
              key={msg.id}
              style={s.card}
              onPress={() => setSelectedMsg(msg)}
              activeOpacity={0.8}
            >
              <View style={s.cardRow}>
                <View style={[s.badge, { backgroundColor: '#ecfdf5' }]}>
                  <Text style={[s.badgeText, { color: '#059669' }]}>Sent</Text>
                </View>
                <Text style={s.cardTime}>{timeAgo(msg.timestamp)}</Text>
              </View>
              <Text style={s.cardTitle}>{msg.subject}</Text>
              <Text style={s.cardFrom}>To: Admin Team</Text>
              <Text style={s.cardBody} numberOfLines={2}>{msg.body}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── Ticket detail modal ──────────────────────── */}
      <Modal visible={!!selectedTicket} transparent animationType="slide">
        <View style={s.detailOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={s.detailSheet}
          >
            {selectedTicket && (() => {
              const st = STATUS_STYLE[selectedTicket.status];
              return (
                <>
                  <View style={s.detailHead}>
                    <Text style={s.detailTitle} numberOfLines={2}>{selectedTicket.subject}</Text>
                    <TouchableOpacity onPress={() => { setSelectedTicket(null); setReplyText(''); }}>
                      <MaterialIcons name="close" size={24} color="#64748b" />
                    </TouchableOpacity>
                  </View>

                  <View style={s.detailMeta}>
                    <View style={[s.badge, { backgroundColor: st.bg }]}>
                      <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
                    </View>
                    <TouchableOpacity
                      style={s.changeStatusBtn}
                      onPress={() => setShowStatusPicker(true)}
                    >
                      <MaterialIcons name="edit" size={14} color="#2563eb" />
                      <Text style={s.changeStatusText}>Update Status</Text>
                    </TouchableOpacity>
                    <Text style={s.fromText}>From: {selectedTicket.fromName}</Text>
                  </View>

                  <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                    <View style={s.bubble}>
                      <View style={s.bubbleHead}>
                        <Text style={s.bubbleFrom}>{selectedTicket.fromName} (Customer)</Text>
                        <Text style={s.bubbleTime}>{timeAgo(selectedTicket.timestamp)}</Text>
                      </View>
                      <Text style={s.bubbleBody}>{selectedTicket.body}</Text>
                    </View>
                    {selectedTicket.replies.map(r => (
                      <View
                        key={r.id}
                        style={[s.bubble, r.from !== 'customer' && s.bubbleStaff]}
                      >
                        <View style={s.bubbleHead}>
                          <Text style={[s.bubbleFrom, r.from !== 'customer' && { color: '#059669' }]}>
                            {r.from !== 'customer' ? r.fromName : selectedTicket.fromName}
                          </Text>
                          <Text style={s.bubbleTime}>{timeAgo(r.timestamp)}</Text>
                        </View>
                        <Text style={s.bubbleBody}>{r.body}</Text>
                      </View>
                    ))}
                  </ScrollView>

                  {selectedTicket.status !== 'closed' && (
                    <View style={s.replyRow}>
                      <TextInput
                        style={s.replyInput}
                        placeholder="Reply to customer..."
                        placeholderTextColor="#94a3b8"
                        value={replyText}
                        onChangeText={setReplyText}
                        multiline
                      />
                      <TouchableOpacity style={s.replyBtn} onPress={handleTicketReply}>
                        <MaterialIcons name="send" size={18} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              );
            })()}
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ── Message detail modal ─────────────────────── */}
      <Modal visible={!!selectedMsg} transparent animationType="slide">
        <View style={s.detailOverlay}>
          <View style={s.detailSheet}>
            {selectedMsg && (
              <>
                <View style={s.detailHead}>
                  <Text style={s.detailTitle} numberOfLines={2}>{selectedMsg.subject}</Text>
                  <TouchableOpacity onPress={() => setSelectedMsg(null)}>
                    <MaterialIcons name="close" size={24} color="#64748b" />
                  </TouchableOpacity>
                </View>
                <Text style={s.fromText}>From: {selectedMsg.fromName}</Text>
                <ScrollView style={{ flex: 1, marginTop: 12 }} showsVerticalScrollIndicator={false}>
                  <View style={s.bubble}>
                    <View style={s.bubbleHead}>
                      <Text style={s.bubbleFrom}>{selectedMsg.fromName}</Text>
                      <Text style={s.bubbleTime}>{timeAgo(selectedMsg.timestamp)}</Text>
                    </View>
                    <Text style={s.bubbleBody}>{selectedMsg.body}</Text>
                  </View>
                  {selectedMsg.replies.map(r => (
                    <View key={r.id} style={[s.bubble, r.from === 'staff' && s.bubbleStaff]}>
                      <View style={s.bubbleHead}>
                        <Text style={s.bubbleFrom}>{r.fromName}</Text>
                        <Text style={s.bubbleTime}>{timeAgo(r.timestamp)}</Text>
                      </View>
                      <Text style={s.bubbleBody}>{r.body}</Text>
                    </View>
                  ))}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Status picker ────────────────────────────── */}
      <Modal visible={showStatusPicker} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowStatusPicker(false)} />
        <View style={s.sheet}>
          <Text style={s.sheetTitle}>Update Ticket Status</Text>
          {(['open', 'in_progress', 'resolved', 'closed'] as TicketStatus[]).map(status => {
            const st = STATUS_STYLE[status];
            return (
              <TouchableOpacity
                key={status}
                style={s.sheetOption}
                onPress={() => {
                  if (selectedTicket) updateStatus(selectedTicket.id, status);
                  setShowStatusPicker(false);
                }}
              >
                <View style={[s.badge, { backgroundColor: st.bg }]}>
                  <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
                </View>
                {selectedTicket?.status === status && <MaterialIcons name="check" size={18} color="#2563eb" />}
              </TouchableOpacity>
            );
          })}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a', letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: '#64748b', fontWeight: '500', marginTop: 2 },
  unreadBadge: {
    minWidth: 24, height: 24, borderRadius: 12,
    backgroundColor: '#e11d48', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: { fontSize: 12, fontWeight: '800', color: '#fff' },

  tabBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  tabItem: {
    flex: 1, alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#2563eb' },
  tabLabel: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  tabLabelActive: { color: '#2563eb', fontWeight: '700' },

  content: { padding: 16, gap: 12, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: 1, marginTop: 4,
  },

  card: {
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1,
    borderColor: '#e2e8f0', padding: 16, gap: 5,
  },
  cardUnread: { borderColor: '#bfdbfe', borderLeftWidth: 3, borderLeftColor: '#2563eb' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardTime: { fontSize: 11, color: '#94a3b8', fontWeight: '500', flex: 1, textAlign: 'right' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563eb' },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  cardFrom: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  cardBody: { fontSize: 13, color: '#64748b', fontWeight: '500', lineHeight: 18 },
  replyCount: { fontSize: 12, color: '#059669', fontWeight: '600' },

  // Compose
  composeCard: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1,
    borderColor: '#e2e8f0', overflow: 'hidden',
  },
  toRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  toLabel: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  divider: { height: 1, backgroundColor: '#f1f5f9' },
  subjectInput: {
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 14, color: '#0f172a', fontWeight: '600',
  },
  bodyInput: {
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 14, color: '#0f172a', minHeight: 160,
    textAlignVertical: 'top',
  },
  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 14, gap: 8,
  },
  sendBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  hintBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#eff6ff', borderRadius: 12, padding: 12,
  },
  hintText: { flex: 1, fontSize: 12, color: '#1e40af', fontWeight: '500', lineHeight: 18 },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 56, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#64748b' },
  emptySub: { fontSize: 13, color: '#94a3b8', fontWeight: '500', textAlign: 'center' },

  // Modals
  detailOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  detailSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, height: '88%',
  },
  detailHead: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', gap: 12, marginBottom: 10,
  },
  detailTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: '#0f172a' },
  detailMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 },
  changeStatusBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#eff6ff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  changeStatusText: { fontSize: 12, color: '#2563eb', fontWeight: '700' },
  fromText: { fontSize: 12, color: '#64748b', fontWeight: '500' },

  bubble: { backgroundColor: '#f1f5f9', borderRadius: 14, padding: 14, marginBottom: 10 },
  bubbleStaff: { backgroundColor: '#ecfdf5' },
  bubbleHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  bubbleFrom: { fontSize: 12, fontWeight: '700', color: '#2563eb' },
  bubbleTime: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  bubbleBody: { fontSize: 13, color: '#334155', fontWeight: '500', lineHeight: 19 },

  replyRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0', marginTop: 4,
  },
  replyInput: {
    flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: '#0f172a',
    maxHeight: 80, textAlignVertical: 'top',
  },
  replyBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center',
  },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, gap: 4, paddingBottom: 40,
  },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  sheetOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
});
