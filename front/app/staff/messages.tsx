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
import { api, clearCache } from '@/lib/api';

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

export default function StaffSupport() {
  const router = useRouter();

  const [messages,   setMessages]   = useState<Msg[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected,   setSelected]   = useState<Msg | null>(null);
  const [replyText,  setReplyText]  = useState('');
  const [replying,   setReplying]   = useState(false);

  const unread = messages.filter(m => !m.is_read).length;

  const fetchMessages = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const { data } = await api.get<any>('/notifications/messages/conversations/', true, true);
    if (data != null) {
      const all = toArr<Msg>(data);
      // Only show messages sent by customers
      setMessages(all.filter(m => m.sender_role === 'customer'));
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchMessages();
    const t = setInterval(() => fetchMessages(true), 10_000);
    return () => clearInterval(t);
  }, [fetchMessages]);

  // Keep selected conversation in sync with background refresh
  useEffect(() => {
    if (selected) {
      const updated = messages.find(m => m.id === selected.id);
      if (updated) setSelected(updated);
    }
  }, [messages]);

  const onRefresh = () => { clearCache(); setRefreshing(true); fetchMessages(true); };

  const handleDelete = async (id: number) => {
    await api.delete(`/notifications/messages/${id}/delete/`);
    setMessages(prev => prev.filter(m => m.id !== id));
    if (selected?.id === id) { setSelected(null); setReplyText(''); }
  };

  const openMessage = async (m: Msg) => {
    setSelected(m);
    setReplyText('');
    if (!m.is_read) {
      await api.post(`/notifications/messages/${m.id}/read/`, {});
      setMessages(prev => prev.map(x => x.id === m.id ? { ...x, is_read: true } : x));
    }
  };

  const handleReply = async () => {
    if (!selected || !replyText.trim()) return;
    setReplying(true);
    const { data, error } = await api.post(
      `/notifications/messages/${selected.id}/reply/`,
      { body: replyText.trim() },
    );
    setReplying(false);
    if (error) { Alert.alert('Error', error); return; }
    const newReply = data as Reply;
    const updated = { ...selected, replies: [...(selected.replies ?? []), newReply] };
    setSelected(updated);
    setMessages(prev => prev.map(m => m.id === selected.id ? updated : m));
    setReplyText('');
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/staff/dashboard' as any)}
          style={s.backBtn}
        >
          <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.headerTitle}>Customer Support</Text>
          <Text style={s.headerSub}>
            {unread > 0 ? `${unread} unread message${unread > 1 ? 's' : ''}` : 'All messages read'}
          </Text>
        </View>
        {unread > 0 && (
          <View style={s.badge}>
            <Text style={s.badgeTxt}>{unread}</Text>
          </View>
        )}
      </View>

      {/* Message list */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} />
          }
        >
          {messages.length === 0 ? (
            <View style={s.empty}>
              <MaterialIcons name="support-agent" size={52} color="#cbd5e1" />
              <Text style={s.emptyTitle}>No customer messages</Text>
              <Text style={s.emptySub}>
                When customers send support messages they will appear here.
              </Text>
            </View>
          ) : (
            messages.map(msg => (
              <TouchableOpacity
                key={msg.id}
                style={[s.card, !msg.is_read && s.cardUnread]}
                onPress={() => openMessage(msg)}
                activeOpacity={0.8}
              >
                <View style={s.cardTop}>
                  <View style={s.avatar}>
                    <Text style={s.avatarTxt}>
                      {(msg.sender_name ?? '?')[0].toUpperCase()}
                    </Text>
                  </View>

                  <View style={s.cardInfo}>
                    <Text style={s.senderName}>{msg.sender_name}</Text>
                    <Text style={s.subject} numberOfLines={1}>{msg.subject}</Text>
                  </View>

                  <View style={s.cardRight}>
                    <Text style={s.time}>{timeAgo(msg.created_at)}</Text>
                    {!msg.is_read && <View style={s.unreadDot} />}
                    <TouchableOpacity
                      onPress={() => handleDelete(msg.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <MaterialIcons name="delete-outline" size={16} color="#e11d48" />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={s.preview} numberOfLines={2}>{msg.body}</Text>

                {(msg.replies?.length ?? 0) > 0 && (
                  <View style={s.replyRow}>
                    <MaterialIcons name="forum" size={12} color="#059669" />
                    <Text style={s.replyTxt}>
                      {msg.replies.length} repl{msg.replies.length > 1 ? 'ies' : 'y'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* Conversation modal */}
      <Modal visible={!!selected} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={s.modalSheet}
          >
            {selected && (
              <>
                <View style={s.modalHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.modalTitle} numberOfLines={2}>{selected.subject}</Text>
                    <Text style={s.modalFrom}>From: {selected.sender_name}</Text>
                  </View>
                  <TouchableOpacity onPress={() => { setSelected(null); setReplyText(''); }}>
                    <MaterialIcons name="close" size={24} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                  {/* Customer original message */}
                  <View style={s.bubble}>
                    <View style={s.bubbleHead}>
                      <Text style={s.bubbleFrom}>{selected.sender_name}</Text>
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
                            {isMe ? 'You (Staff)' : r.sender_name}
                          </Text>
                          <Text style={s.bubbleTime}>{timeAgo(r.created_at)}</Text>
                        </View>
                        <Text style={s.bubbleBody}>{r.body}</Text>
                      </View>
                    );
                  })}
                </ScrollView>

                {/* Reply input */}
                <View style={s.replyBox}>
                  <TextInput
                    style={s.replyInput}
                    placeholder="Write a reply to the customer..."
                    placeholderTextColor="#94a3b8"
                    value={replyText}
                    onChangeText={setReplyText}
                    multiline
                  />
                  <TouchableOpacity
                    style={[s.sendBtn, replying && { opacity: 0.6 }]}
                    onPress={handleReply}
                    disabled={replying}
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

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  backBtn:    { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle:{ fontSize: 18, fontWeight: '800', color: '#0f172a' },
  headerSub:  { fontSize: 12, color: '#64748b', fontWeight: '500', marginTop: 1 },
  badge: {
    minWidth: 22, height: 22, borderRadius: 11, backgroundColor: '#e11d48',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  badgeTxt: { fontSize: 11, fontWeight: '800', color: '#fff' },

  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 10, paddingBottom: 32 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#e2e8f0', gap: 8,
  },
  cardUnread: { borderColor: '#059669', borderWidth: 1.5 },
  cardTop:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 42, height: 42, borderRadius: 13,
    backgroundColor: '#d97706' + '20', alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt:  { fontSize: 16, fontWeight: '900', color: '#d97706' },
  cardInfo:   { flex: 1 },
  senderName: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  subject:    { fontSize: 12, color: '#64748b', fontWeight: '500', marginTop: 2 },
  cardRight:  { alignItems: 'flex-end', gap: 4 },
  time:       { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  unreadDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: '#059669' },
  preview:    { fontSize: 13, color: '#64748b', lineHeight: 18 },
  replyRow:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  replyTxt:   { fontSize: 11, fontWeight: '700', color: '#059669' },

  empty:      { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#64748b' },
  emptySub:   { fontSize: 13, color: '#94a3b8', textAlign: 'center', paddingHorizontal: 24 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, height: '88%',
  },
  modalHead: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', gap: 12, marginBottom: 14,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  modalFrom:  { fontSize: 12, color: '#64748b', fontWeight: '600', marginTop: 3 },

  bubble:      { backgroundColor: '#f1f5f9', borderRadius: 14, padding: 14, marginBottom: 10 },
  bubbleMe:    { backgroundColor: '#ecfdf5' },
  bubbleOther: { backgroundColor: '#eff6ff' },
  bubbleHead:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  bubbleFrom:  { fontSize: 12, fontWeight: '700', color: '#d97706' },
  bubbleTime:  { fontSize: 11, color: '#94a3b8' },
  bubbleBody:  { fontSize: 13, color: '#334155', lineHeight: 19 },

  replyBox: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0', marginTop: 8,
  },
  replyInput: {
    flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 13, color: '#0f172a', maxHeight: 80, textAlignVertical: 'top',
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center',
  },
});
