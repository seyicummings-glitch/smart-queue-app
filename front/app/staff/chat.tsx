import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import BottomNav from '@/components/BottomNav';
import { api } from '@/lib/api';

type Tab = 'conversations' | 'compose';

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

export default function StaffChat() {
  const router = useRouter();

  const [tab,          setTab]          = useState<Tab>('conversations');
  const [conversations, setConversations] = useState<Msg[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [refresh,      setRefresh]      = useState(false);
  const [sending,      setSending]      = useState(false);
  const [replying,     setReplying]     = useState(false);

  const [subject,   setSubject]   = useState('');
  const [body,      setBody]      = useState('');
  const [selected,  setSelected]  = useState<Msg | null>(null);
  const [replyText, setReplyText] = useState('');

  const unreadCount = conversations.filter(m => m.recipient_role === 'staff' && !m.is_read).length;

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

  // Keep selected in sync with latest data (replies update in background)
  useEffect(() => {
    if (selected) {
      const updated = conversations.find(m => m.id === selected.id);
      if (updated) setSelected(updated);
    }
  }, [conversations]);

  const openMsg = async (m: Msg) => {
    setSelected(m);
    setReplyText('');
    if (!m.is_read && m.recipient_role === 'staff') {
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
      recipient_role: 'admin',
      subject: subject.trim(),
      body: body.trim(),
    });
    setSending(false);
    if (error) { Alert.alert('Error', error); return; }
    setSubject(''); setBody('');
    Alert.alert('Sent', 'Your message has been sent to the Admin team.');
    setTab('conversations');
    fetchAll(true);
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.replace('/staff/dashboard' as any)} style={s.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.headerTitle}>Team Chat</Text>
          <Text style={s.headerSub}>
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </Text>
        </View>
        {unreadCount > 0 && (
          <View style={s.unreadBadge}>
            <Text style={s.unreadBadgeText}>{unreadCount}</Text>
          </View>
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
          <Text style={[s.tabLabel, tab === 'compose' && s.tabLabelActive]}>New Message</Text>
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
                <Text style={s.emptySub}>Tap "New Message" to start a conversation with Admin</Text>
              </View>
            ) : conversations.map(msg => {
              const isMine   = msg.sender_role === 'staff';
              const lastReply = msg.replies?.length ? msg.replies[msg.replies.length - 1] : null;
              const isUnread  = !isMine && !msg.is_read;
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
                      <MaterialIcons name={isMine ? 'send' : 'inbox'} size={11} color={isMine ? '#059669' : '#2563eb'} />
                      <Text style={[s.roleBadgeTxt, { color: isMine ? '#059669' : '#2563eb' }]}>
                        {isMine ? 'You → Admin' : 'Admin → You'}
                      </Text>
                    </View>
                    <Text style={s.cardTime}>{timeAgo(lastReply?.created_at ?? msg.created_at)}</Text>
                    {isUnread && <View style={s.dot} />}
                  </View>

                  <Text style={s.cardTitle}>{msg.subject}</Text>

                  <Text style={s.cardPreview} numberOfLines={1}>
                    {lastReply
                      ? `${lastReply.sender_role === 'staff' ? 'You' : lastReply.sender_name}: ${lastReply.body}`
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
          <View style={s.infoBanner}>
            <MaterialIcons name="info-outline" size={18} color="#2563eb" />
            <Text style={s.infoBannerText}>
              Your message will be sent to the Admin team. Replies will appear in your Conversations.
            </Text>
          </View>

          <View style={s.composeCard}>
            <View style={s.toRow}>
              <Text style={s.toLabel}>To:</Text>
              <View style={s.adminBadge}><Text style={s.adminBadgeTxt}>Admin Team</Text></View>
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

          <TouchableOpacity style={[s.sendBtn, sending && { opacity: 0.6 }]} onPress={handleSend} disabled={sending}>
            {sending
              ? <ActivityIndicator color="#fff" size="small" />
              : <><MaterialIcons name="send" size={18} color="#fff" /><Text style={s.sendBtnText}>Send to Admin</Text></>
            }
          </TouchableOpacity>
        </ScrollView>
      )}

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
                      {selected.sender_role === 'staff' ? 'You → Admin' : `Admin → You`}
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
                  <View style={[s.bubble, selected.sender_role === 'staff' ? s.bubbleMe : s.bubbleOther]}>
                    <View style={s.bubbleHead}>
                      <Text style={[s.bubbleFrom, { color: selected.sender_role === 'staff' ? '#059669' : '#2563eb' }]}>
                        {selected.sender_role === 'staff' ? 'You' : selected.sender_name}
                      </Text>
                      <Text style={s.bubbleTime}>{timeAgo(selected.created_at)}</Text>
                    </View>
                    <Text style={s.bubbleBody}>{selected.body}</Text>
                  </View>

                  {/* Replies */}
                  {(selected.replies ?? []).map(r => {
                    const isMe = r.sender_role === 'staff';
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

  content:  { padding: 16, gap: 10, paddingBottom: 40 },

  card:       { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 14, gap: 6 },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: '#2563eb' },
  cardRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roleBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  roleBadgeTxt:{ fontSize: 11, fontWeight: '700' },
  cardTime:   { fontSize: 11, color: '#94a3b8', fontWeight: '500', flex: 1, textAlign: 'right' },
  dot:        { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563eb' },
  cardTitle:  { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  cardPreview:{ fontSize: 12, color: '#64748b', fontWeight: '500' },
  replyCountRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  replyCountTxt: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },

  adminBadge:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: '#eff6ff' },
  adminBadgeTxt: { fontSize: 11, fontWeight: '700', color: '#2563eb' },

  infoBanner:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#eff6ff', borderRadius: 14, padding: 14 },
  infoBannerText: { flex: 1, fontSize: 13, color: '#1d4ed8', fontWeight: '500', lineHeight: 19 },

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
