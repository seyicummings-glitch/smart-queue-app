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

export default function StaffSupportInbox() {
  const router = useRouter();

  const [messages,  setMessages]  = useState<Msg[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [refresh,   setRefresh]   = useState(false);
  const [selected,  setSelected]  = useState<Msg | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replying,  setReplying]  = useState(false);

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const { data } = await api.get<any>('/notifications/messages/conversations/');
    if (data != null) {
      const all = toArr<Msg>(data);
      // Only show messages sent by customers to staff
      setMessages(all.filter(m => m.sender_role === 'customer'));
    }
    setLoading(false);
    setRefresh(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const t = setInterval(() => fetchAll(true), 8_000);
    return () => clearInterval(t);
  }, [fetchAll]);

  useEffect(() => {
    if (selected) {
      const updated = messages.find(m => m.id === selected.id);
      if (updated) setSelected(updated);
    }
  }, [messages]);

  const openMsg = async (m: Msg) => {
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
    const { data, error } = await api.post(`/notifications/messages/${selected.id}/reply/`, { body: replyText.trim() });
    setReplying(false);
    if (error) { Alert.alert('Error', error); return; }
    const updatedMsg = { ...selected, replies: [...(selected.replies ?? []), data as Reply] };
    setSelected(updatedMsg);
    setMessages(prev => prev.map(m => m.id === selected.id ? updatedMsg : m));
    setReplyText('');
  };

  const unreadCount = messages.filter(m => !m.is_read).length;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.replace('/staff/dashboard' as any)} style={s.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.headerTitle}>Customer Support</Text>
          <Text style={s.headerSub}>
            {unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
          </Text>
        </View>
        {unreadCount > 0 && (
          <View style={s.badge}>
            <Text style={s.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      {/* List */}
      {loading ? (
        <View style={s.centered}><ActivityIndicator color="#2563eb" size="large" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={s.content}
          refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => { setRefresh(true); fetchAll(true); }} tintColor="#2563eb" />}
        >
          {messages.length === 0 ? (
            <View style={s.empty}>
              <MaterialIcons name="support-agent" size={56} color="#cbd5e1" />
              <Text style={s.emptyTitle}>No customer messages</Text>
              <Text style={s.emptySub}>Customer support messages will appear here</Text>
            </View>
          ) : messages.map(msg => {
            const lastReply  = msg.replies?.length ? msg.replies[msg.replies.length - 1] : null;
            const isUnread   = !msg.is_read;
            const replyCount = msg.replies?.length ?? 0;

            return (
              <TouchableOpacity
                key={msg.id}
                style={[s.card, isUnread && s.cardUnread]}
                onPress={() => openMsg(msg)}
                activeOpacity={0.8}
              >
                <View style={s.cardRow}>
                  <View style={s.customerBadge}>
                    <MaterialIcons name="person" size={11} color="#7c3aed" />
                    <Text style={s.customerBadgeTxt}>{msg.sender_name}</Text>
                  </View>
                  <Text style={s.cardTime}>{timeAgo(lastReply?.created_at ?? msg.created_at)}</Text>
                  {isUnread && <View style={s.dot} />}
                </View>

                <Text style={s.cardTitle}>{msg.subject}</Text>

                <Text style={s.cardPreview} numberOfLines={1}>
                  {lastReply
                    ? `${lastReply.sender_role === 'customer' ? lastReply.sender_name : 'You'}: ${lastReply.body}`
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
      )}

      {/* Thread modal */}
      <Modal visible={!!selected} transparent animationType="slide">
        <View style={s.detailOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.detailSheet}>
            {selected && (
              <>
                <View style={s.detailHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.detailTitle} numberOfLines={2}>{selected.subject}</Text>
                    <Text style={s.detailSub}>From: {selected.sender_name}</Text>
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
                  <View style={s.bubbleCustomer}>
                    <View style={s.bubbleHead}>
                      <Text style={s.bubbleFromCustomer}>{selected.sender_name}</Text>
                      <Text style={s.bubbleTime}>{timeAgo(selected.created_at)}</Text>
                    </View>
                    <Text style={s.bubbleBody}>{selected.body}</Text>
                  </View>

                  {/* Replies */}
                  {(selected.replies ?? []).map(r => {
                    const isMe = r.sender_role !== 'customer';
                    return (
                      <View key={r.id} style={isMe ? s.bubbleMe : s.bubbleCustomer}>
                        <View style={s.bubbleHead}>
                          <Text style={isMe ? s.bubbleFromMe : s.bubbleFromCustomer}>
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
                    placeholder="Reply to customer..."
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
  backBtn:     { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  headerSub:   { fontSize: 12, color: '#64748b', fontWeight: '500', marginTop: 2 },
  badge:       { minWidth: 24, height: 24, borderRadius: 12, backgroundColor: '#e11d48', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText:   { fontSize: 12, fontWeight: '800', color: '#fff' },

  content: { padding: 16, gap: 10, paddingBottom: 40 },

  card:        { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 14, gap: 6 },
  cardUnread:  { borderLeftWidth: 3, borderLeftColor: '#7c3aed' },
  cardRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  customerBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: '#f5f3ff' },
  customerBadgeTxt: { fontSize: 11, fontWeight: '700', color: '#7c3aed' },
  cardTime:    { fontSize: 11, color: '#94a3b8', fontWeight: '500', flex: 1, textAlign: 'right' },
  dot:         { width: 8, height: 8, borderRadius: 4, backgroundColor: '#7c3aed' },
  cardTitle:   { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  cardPreview: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  replyCountRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  replyCountTxt: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },

  empty:      { alignItems: 'center', paddingVertical: 80, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#64748b' },
  emptySub:   { fontSize: 13, color: '#94a3b8', textAlign: 'center', paddingHorizontal: 20 },

  detailOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  detailSheet:   { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, height: '82%' },
  detailHead:    { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 },
  detailTitle:   { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  detailSub:     { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginTop: 3 },

  bubbleCustomer: { borderRadius: 14, padding: 14, backgroundColor: '#f5f3ff' },
  bubbleMe:       { borderRadius: 14, padding: 14, backgroundColor: '#ecfdf5' },
  bubbleHead:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  bubbleFromCustomer: { fontSize: 12, fontWeight: '700', color: '#7c3aed' },
  bubbleFromMe:       { fontSize: 12, fontWeight: '700', color: '#059669' },
  bubbleTime:  { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  bubbleBody:  { fontSize: 13, color: '#334155', fontWeight: '500', lineHeight: 19 },

  replyRow:   { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0', marginTop: 8 },
  replyInput: { flex: 1, borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: '#0f172a', maxHeight: 90, textAlignVertical: 'top' },
  replyBtn:   { width: 44, height: 44, borderRadius: 12, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
});
