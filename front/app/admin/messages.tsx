import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppContext } from '@/context/AppContext';
import BottomNav from '@/components/BottomNav';
import { api } from '@/lib/api';

type Tab = 'conversations' | 'compose';
type RecipientRole = 'staff' | 'super_admin' | 'admin';

type Reply = {
  id: number;
  sender_name: string;
  sender_role: string;
  body: string;
  created_at: string;
};

type Msg = {
  id: number;
  sender_name: string;
  sender_role: string;
  recipient_role: string;
  subject: string;
  body: string;
  created_at: string;
  is_read: boolean;
  replies: Reply[];
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

function toArr<T>(d: any): T[] {
  return Array.isArray(d) ? d : (d?.results ?? []);
}

const RECIPIENT_OPTIONS: { label: string; value: RecipientRole; color: string; bg: string }[] = [
  { label: 'Staff',       value: 'staff',       color: '#059669', bg: '#ecfdf5' },
  { label: 'Super Admin', value: 'super_admin', color: '#7c3aed', bg: '#f5f3ff' },
];

const SUPER_ADMIN_OPTIONS: { label: string; value: RecipientRole; color: string; bg: string }[] = [
  { label: 'Admin',  value: 'admin',  color: '#2563eb', bg: '#eff6ff' },
  { label: 'Staff',  value: 'staff',  color: '#059669', bg: '#ecfdf5' },
];

const ROLE_COLOR: Record<string, string> = {
  staff: '#059669', admin: '#2563eb', super_admin: '#7c3aed',
};

export default function AdminMessages() {
  const router = useRouter();
  const { role } = useAppContext();
  const isSuperAdmin = role === 'super_admin' || role === 'superadmin';
  const myRole = isSuperAdmin ? 'super_admin' : 'admin';

  const pickerOptions = isSuperAdmin ? SUPER_ADMIN_OPTIONS : RECIPIENT_OPTIONS;

  const [tab,           setTab]           = useState<Tab>('conversations');
  const [conversations, setConversations] = useState<Msg[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [refresh,       setRefresh]       = useState(false);
  const [sending,       setSending]       = useState(false);
  const [replying,      setReplying]      = useState(false);
  const [showPicker,    setShowPicker]    = useState(false);

  const [subject,   setSubject]   = useState('');
  const [body,      setBody]      = useState('');
  const [recipient, setRecipient] = useState<RecipientRole>(isSuperAdmin ? 'admin' : 'staff');
  const [selected,  setSelected]  = useState<Msg | null>(null);
  const [replyText, setReplyText] = useState('');

  const unreadCount = conversations.filter(m => m.recipient_role === myRole && !m.is_read).length;

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const { data } = await api.get<any>('/notifications/messages/conversations/');
    if (data != null) setConversations(toArr<Msg>(data));
    setLoading(false);
    setRefresh(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const t = setInterval(() => fetchAll(true), 8_000);
    return () => clearInterval(t);
  }, [fetchAll]);

  // Keep selected in sync with background refreshes
  useEffect(() => {
    if (selected) {
      const updated = conversations.find(m => m.id === selected.id);
      if (updated) setSelected(updated);
    }
  }, [conversations]);

  const handleDelete = async (id: number) => {
    await api.delete(`/notifications/messages/${id}/delete/`);
    setConversations(prev => prev.filter(m => m.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const openMsg = async (m: Msg) => {
    setSelected(m);
    setReplyText('');
    if (!m.is_read && m.recipient_role === myRole) {
      await api.post(`/notifications/messages/${m.id}/read/`, {});
      setConversations(prev => prev.map(x => x.id === m.id ? { ...x, is_read: true } : x));
    }
  };

  const handleReply = async () => {
    if (!selected || !replyText.trim()) return;
    setReplying(true);
    const { data, error } = await api.post(`/notifications/messages/${selected.id}/reply/`, { body: replyText.trim() });
    setReplying(false);
    if (error) { Alert.alert('Error', error); return; }
    const newReply = data as Reply;
    const updatedMsg = { ...selected, replies: [...(selected.replies ?? []), newReply] };
    setSelected(updatedMsg);
    setConversations(prev => prev.map(m => m.id === selected.id ? updatedMsg : m));
    setReplyText('');
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      Alert.alert('Missing fields', 'Please fill in both subject and message.');
      return;
    }
    setSending(true);
    const { error } = await api.post('/notifications/messages/send/', {
      recipient_role: recipient,
      subject: subject.trim(),
      body: body.trim(),
    });
    setSending(false);
    if (error) { Alert.alert('Error', error); return; }
    const destLabel = pickerOptions.find(o => o.value === recipient)?.label ?? recipient;
    setSubject(''); setBody('');
    Alert.alert('Sent', `Message sent to ${destLabel}.`);
    setTab('conversations');
    fetchAll(true);
  };

  const currentOpt = pickerOptions.find(o => o.value === recipient) ?? pickerOptions[0];

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.replace('/admin/dashboard' as any)} style={s.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.headerTitle}>{isSuperAdmin ? 'Super Admin' : 'Admin'} Messages</Text>
          <Text style={s.headerSub}>{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</Text>
        </View>
        {unreadCount > 0 && (
          <View style={s.unreadBadge}><Text style={s.unreadBadgeText}>{unreadCount}</Text></View>
        )}
      </View>

      {/* Tabs */}
      <View style={s.tabBar}>
        <TouchableOpacity
          style={[s.tabItem, tab === 'conversations' && s.tabActive]}
          onPress={() => setTab('conversations')}
        >
          <Text style={[s.tabLabel, tab === 'conversations' && s.tabLabelActive]}>
            Conversations{unreadCount > 0 ? ` (${unreadCount})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabItem, tab === 'compose' && s.tabActive]}
          onPress={() => setTab('compose')}
        >
          <Text style={[s.tabLabel, tab === 'compose' && s.tabLabelActive]}>
            {isSuperAdmin ? 'Broadcast' : 'New Message'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Conversations ── */}
      {tab === 'conversations' && (
        loading ? (
          <View style={s.centered}><ActivityIndicator color="#2563eb" size="large" /></View>
        ) : (
          <ScrollView
            contentContainerStyle={s.content}
            refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => { setRefresh(true); fetchAll(true); }} tintColor="#2563eb" />}
          >
            {conversations.length === 0 ? (
              <View style={s.empty}>
                <MaterialIcons name="forum" size={52} color="#cbd5e1" />
                <Text style={s.emptyTitle}>No conversations yet</Text>
                <Text style={s.emptySub}>Send a message to start a conversation</Text>
              </View>
            ) : conversations.map(msg => {
              const isMine    = msg.sender_role === myRole;
              const lastReply = msg.replies?.length ? msg.replies[msg.replies.length - 1] : null;
              const isUnread  = msg.recipient_role === myRole && !msg.is_read;
              const otherRole = isMine ? msg.recipient_role : msg.sender_role;
              const otherColor = ROLE_COLOR[otherRole] ?? '#64748b';
              const replyCount = msg.replies?.length ?? 0;

              return (
                <TouchableOpacity
                  key={msg.id}
                  style={[s.card, isUnread && s.cardUnread]}
                  onPress={() => openMsg(msg)}
                  activeOpacity={0.8}
                >
                  <View style={s.cardRow}>
                    <View style={[s.roleBadge, { backgroundColor: isMine ? '#ecfdf5' : '#eff6ff' }]}>
                      <MaterialIcons name={isMine ? 'send' : 'inbox'} size={11} color={isMine ? '#059669' : otherColor} />
                      <Text style={[s.roleBadgeTxt, { color: isMine ? '#059669' : otherColor }]}>
                        {isMine
                          ? `You → ${pickerOptions.find(p => p.value === msg.recipient_role)?.label ?? msg.recipient_role}`
                          : `${msg.sender_name} → You`}
                      </Text>
                    </View>
                    <Text style={s.cardTime}>{timeAgo(lastReply?.created_at ?? msg.created_at)}</Text>
                    {isUnread && <View style={s.dot} />}
                    <TouchableOpacity
                      onPress={() => handleDelete(msg.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <MaterialIcons name="delete-outline" size={15} color="#e11d48" />
                    </TouchableOpacity>
                  </View>

                  <Text style={s.cardTitle}>{msg.subject}</Text>

                  <Text style={s.cardPreview} numberOfLines={1}>
                    {lastReply
                      ? `${lastReply.sender_role === myRole ? 'You' : lastReply.sender_name}: ${lastReply.body}`
                      : msg.body}
                  </Text>

                  {replyCount > 0 && (
                    <View style={s.replyCountRow}>
                      <MaterialIcons name="chat-bubble-outline" size={11} color="#94a3b8" />
                      <Text style={s.replyCountTxt}>{replyCount} repl{replyCount > 1 ? 'ies' : 'y'}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )
      )}

      {/* ── Compose ── */}
      {tab === 'compose' && (
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          {isSuperAdmin && (
            <View style={s.broadcastBanner}>
              <MaterialIcons name="campaign" size={22} color="#7c3aed" />
              <Text style={s.broadcastBannerText}>Broadcast to your team — messages reach all selected recipients instantly.</Text>
            </View>
          )}

          <View style={s.composeCard}>
            <View style={s.toRow}>
              <Text style={s.toLabel}>To:</Text>
              <TouchableOpacity
                style={[s.badge, { backgroundColor: currentOpt.bg }]}
                onPress={() => setShowPicker(true)}
              >
                <Text style={[s.badgeText, { color: currentOpt.color }]}>{currentOpt.label} ▾</Text>
              </TouchableOpacity>
            </View>
            <View style={s.divider} />
            <TextInput
              style={s.subjectInput}
              placeholder="Subject"
              placeholderTextColor="#94a3b8"
              value={subject}
              onChangeText={setSubject}
            />
            <View style={s.divider} />
            <TextInput
              style={s.bodyInput}
              placeholder="Write your message..."
              placeholderTextColor="#94a3b8"
              value={body}
              onChangeText={setBody}
              multiline
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={[s.sendBtn, isSuperAdmin && { backgroundColor: '#7c3aed' }, sending && { opacity: 0.6 }]}
            onPress={handleSend}
            disabled={sending}
          >
            {sending
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <MaterialIcons name={isSuperAdmin ? 'campaign' : 'send'} size={18} color="#fff" />
                  <Text style={s.sendBtnText}>Send to {currentOpt.label}</Text>
                </>
            }
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── Recipient picker ── */}
      <Modal visible={showPicker} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowPicker(false)} />
        <View style={s.sheet}>
          <Text style={s.sheetTitle}>Send Message To</Text>
          {pickerOptions.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[s.sheetOption, recipient === opt.value && { backgroundColor: opt.bg, borderRadius: 10, paddingHorizontal: 12, marginHorizontal: -8 }]}
              onPress={() => { setRecipient(opt.value); setShowPicker(false); }}
            >
              <Text style={[s.sheetOptionText, recipient === opt.value && { color: opt.color, fontWeight: '700' }]}>
                {opt.label}
              </Text>
              {recipient === opt.value && <MaterialIcons name="check" size={18} color={opt.color} />}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>

      {/* ── Thread modal ── */}
      <Modal visible={!!selected} transparent animationType="slide">
        <View style={s.detailOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.detailSheet}>
            {selected && (
              <>
                <View style={s.detailHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.detailTitle} numberOfLines={2}>{selected.subject}</Text>
                    <Text style={s.detailSub}>
                      {selected.sender_role === myRole
                        ? `You → ${pickerOptions.find(p => p.value === selected.recipient_role)?.label ?? selected.recipient_role}`
                        : `${selected.sender_name} → You`}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelected(null)}>
                    <MaterialIcons name="close" size={24} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={{ flex: 1 }}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10, paddingBottom: 8 }}
                >
                  {/* Original message */}
                  <View style={[s.bubble, selected.sender_role === myRole ? s.bubbleMe : s.bubbleOther]}>
                    <View style={s.bubbleHead}>
                      <Text style={[s.bubbleFrom, { color: selected.sender_role === myRole ? '#059669' : '#2563eb' }]}>
                        {selected.sender_role === myRole ? 'You' : selected.sender_name}
                      </Text>
                      <Text style={s.bubbleTime}>{timeAgo(selected.created_at)}</Text>
                    </View>
                    <Text style={s.bubbleBody}>{selected.body}</Text>
                  </View>

                  {/* Replies */}
                  {(selected.replies ?? []).map(r => {
                    const isMe = r.sender_role === myRole;
                    return (
                      <View key={r.id} style={[s.bubble, isMe ? s.bubbleMe : s.bubbleOther]}>
                        <View style={s.bubbleHead}>
                          <Text style={[s.bubbleFrom, { color: isMe ? '#059669' : '#2563eb' }]}>
                            {isMe ? 'You' : r.sender_name}
                          </Text>
                          <Text style={s.bubbleTime}>{timeAgo(r.created_at)}</Text>
                        </View>
                        <Text style={s.bubbleBody}>{r.body}</Text>
                      </View>
                    );
                  })}
                </ScrollView>

                {/* Reply input */}
                <View style={s.replyRow}>
                  <TextInput
                    style={s.replyInput}
                    placeholder="Write a reply..."
                    placeholderTextColor="#94a3b8"
                    value={replyText}
                    onChangeText={setReplyText}
                    multiline
                  />
                  <TouchableOpacity
                    style={[s.replyBtn, (!replyText.trim() || replying) && { opacity: 0.5 }]}
                    onPress={handleReply}
                    disabled={!replyText.trim() || replying}
                  >
                    {replying
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <MaterialIcons name="send" size={18} color="#fff" />
                    }
                  </TouchableOpacity>
                </View>
              </>
            )}
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <BottomNav />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  backBtn:         { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  headerTitle:     { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  headerSub:       { fontSize: 12, color: '#64748b', fontWeight: '500', marginTop: 2 },
  unreadBadge:     { minWidth: 24, height: 24, borderRadius: 12, backgroundColor: '#e11d48', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  unreadBadgeText: { fontSize: 12, fontWeight: '800', color: '#fff' },

  tabBar:         { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tabItem:        { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:      { borderBottomColor: '#2563eb' },
  tabLabel:       { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  tabLabelActive: { color: '#2563eb', fontWeight: '700' },

  content: { padding: 16, gap: 10, paddingBottom: 40 },

  card:       { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 14, gap: 6 },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: '#2563eb' },
  cardRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roleBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  roleBadgeTxt: { fontSize: 11, fontWeight: '700' },
  cardTime:   { fontSize: 11, color: '#94a3b8', fontWeight: '500', flex: 1, textAlign: 'right' },
  dot:        { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563eb' },
  cardTitle:  { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  cardPreview:{ fontSize: 12, color: '#64748b', fontWeight: '500' },
  replyCountRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  replyCountTxt: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },

  badge:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText:{ fontSize: 11, fontWeight: '700' },

  broadcastBanner:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#f5f3ff', borderRadius: 14, padding: 14 },
  broadcastBannerText: { flex: 1, fontSize: 13, color: '#5b21b6', fontWeight: '500', lineHeight: 19 },

  composeCard:  { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  toRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  toLabel:      { fontSize: 14, fontWeight: '700', color: '#64748b' },
  divider:      { height: 1, backgroundColor: '#f1f5f9' },
  subjectInput: { paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: '#0f172a', fontWeight: '600' },
  bodyInput:    { paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: '#0f172a', minHeight: 160, textAlignVertical: 'top' },
  sendBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 14, gap: 8 },
  sendBtnText:  { fontSize: 15, fontWeight: '800', color: '#fff' },

  empty:      { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#64748b' },
  emptySub:   { fontSize: 13, color: '#94a3b8', textAlign: 'center', paddingHorizontal: 20 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:   { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 4, paddingBottom: 40 },
  sheetTitle:      { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  sheetOption:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  sheetOptionText: { fontSize: 14, fontWeight: '600', color: '#475569' },

  detailOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  detailSheet:   { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, height: '82%' },
  detailHead:    { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 },
  detailTitle:   { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  detailSub:     { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginTop: 3 },

  bubble:      { borderRadius: 14, padding: 14, backgroundColor: '#f1f5f9' },
  bubbleMe:    { backgroundColor: '#ecfdf5' },
  bubbleOther: { backgroundColor: '#eff6ff' },
  bubbleHead:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  bubbleFrom:  { fontSize: 12, fontWeight: '700' },
  bubbleTime:  { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  bubbleBody:  { fontSize: 13, color: '#334155', fontWeight: '500', lineHeight: 19 },

  replyRow:   { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0', marginTop: 8 },
  replyInput: { flex: 1, borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: '#0f172a', maxHeight: 90, textAlignVertical: 'top' },
  replyBtn:   { width: 44, height: 44, borderRadius: 12, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
});
