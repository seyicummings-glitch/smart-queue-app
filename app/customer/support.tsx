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
  SupportCategory,
  TicketStatus,
} from '@/context/MessagesContext';

type Tab = 'faq' | 'contact' | 'tickets' | 'report';

const FAQS = [
  { q: 'How do I join a queue?', a: 'Go to Home, select a business/industry, then tap "Join Queue". You will receive a ticket number with your estimated wait time shown in real-time.' },
  { q: 'Can I book an appointment in advance?', a: 'Yes! Navigate to Appointments from the Home screen, select your preferred branch and service, then choose an available time slot.' },
  { q: 'How do I check my queue position?', a: 'Tap "Queue Status" from the Home screen or your ticket screen. It shows your current position and estimated wait time in real-time.' },
  { q: 'What happens if I miss my turn?', a: 'If you miss your turn, your ticket will be marked as skipped. You can rejoin the queue and receive a new ticket, or contact staff for assistance.' },
  { q: 'Can I cancel my appointment?', a: 'Yes. Go to My Appointments, find the appointment you want to cancel, and tap Cancel. Please cancel at least 30 minutes before your appointment time.' },
  { q: 'How do I update my profile information?', a: 'Tap the profile icon (person icon) at the top right of the Home screen. You can edit your name, phone number, and other details there.' },
  { q: 'Is my data secure?', a: 'Yes. All your data is encrypted and stored securely. We never share your personal information with third parties without your explicit consent.' },
  { q: 'What industries does SmartQueue support?', a: 'SmartQueue supports Banking, Healthcare, Retail, Government, Education, and Corporate services. More industries are being added regularly.' },
  { q: 'Can I use SmartQueue without creating an account?', a: 'A basic account is needed to join queues and book appointments so we can send you updates about your position and appointment status.' },
  { q: 'How do I receive notifications?', a: 'Enable push notifications in your device settings for SmartQueue. You will get alerts when your turn is approaching or your appointment is confirmed.' },
];

const CATEGORIES: { label: string; value: SupportCategory }[] = [
  { label: 'General Inquiry', value: 'general' },
  { label: 'Technical Issue', value: 'technical' },
  { label: 'Billing & Payments', value: 'billing' },
  { label: 'Complaint', value: 'complaint' },
  { label: 'Other', value: 'other' },
];

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

const TABS: { key: Tab; label: string; icon: React.ComponentProps<typeof MaterialIcons>['name'] }[] = [
  { key: 'faq',     label: 'FAQ',       icon: 'help-outline' },
  { key: 'contact', label: 'Contact',   icon: 'email' },
  { key: 'tickets', label: 'My Tickets',icon: 'inbox' },
  { key: 'report',  label: 'Report',    icon: 'report-problem' },
];

export default function CustomerSupport() {
  const router = useRouter();
  const { sendTicket, tickets, replyTicket } = useMessages();
  const [tab, setTab] = useState<Tab>('faq');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Contact form
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<SupportCategory>('general');
  const [showCatPicker, setShowCatPicker] = useState(false);

  // Report form
  const [issueType, setIssueType] = useState<SupportCategory>('complaint');
  const [issueDesc, setIssueDesc] = useState('');
  const [showIssuePicker, setShowIssuePicker] = useState(false);

  // Ticket detail
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');

  const myTickets = tickets.filter(t => t.from === 'customer');

  const handleSendContact = () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Missing fields', 'Please fill in both subject and message.');
      return;
    }
    sendTicket({
      from: 'customer', fromName: 'You', to: 'staff',
      subject: subject.trim(), body: message.trim(), category,
    });
    setSubject(''); setMessage(''); setCategory('general');
    Alert.alert('Message Sent!', 'Your message has been sent to the support team. We will respond shortly.', [
      { text: 'View My Tickets', onPress: () => setTab('tickets') },
      { text: 'OK' },
    ]);
  };

  const handleSendReport = () => {
    if (!issueDesc.trim()) {
      Alert.alert('Missing description', 'Please describe the issue you are experiencing.');
      return;
    }
    const label = CATEGORIES.find(c => c.value === issueType)?.label ?? 'Issue';
    sendTicket({
      from: 'customer', fromName: 'You', to: 'admin',
      subject: `Issue Report: ${label}`, body: issueDesc.trim(), category: issueType,
    });
    setIssueDesc(''); setIssueType('complaint');
    Alert.alert('Report Submitted!', 'Thank you for reporting. Our team will review it and follow up with you.', [
      { text: 'View My Tickets', onPress: () => setTab('tickets') },
      { text: 'OK' },
    ]);
  };

  const handleReply = () => {
    if (!selectedTicket || !replyText.trim()) return;
    replyTicket(selectedTicket.id, { from: 'customer', fromName: 'You', body: replyText.trim() });
    setReplyText('');
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.headerTitle}>Help & Support</Text>
          <Text style={s.headerSub}>How can we help you today?</Text>
        </View>
      </View>

      {/* Tab bar */}
      <View style={s.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[s.tabItem, tab === t.key && s.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <MaterialIcons name={t.icon} size={17} color={tab === t.key ? '#2563eb' : '#94a3b8'} />
            <Text style={[s.tabLabel, tab === t.key && s.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

        {/* ── FAQ & Documentation ─────────────────────────── */}
        {tab === 'faq' && (
          <>
            <View style={s.sectionBanner}>
              <View style={[s.bannerIcon, { backgroundColor: '#eff6ff' }]}>
                <MaterialIcons name="menu-book" size={24} color="#2563eb" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.bannerTitle}>FAQ & Documentation</Text>
                <Text style={s.bannerSub}>Find answers to common questions</Text>
              </View>
            </View>

            {FAQS.map((faq, i) => (
              <TouchableOpacity
                key={i}
                style={s.faqCard}
                onPress={() => setExpandedFaq(expandedFaq === i ? null : i)}
                activeOpacity={0.8}
              >
                <View style={s.faqRow}>
                  <Text style={s.faqQ}>{faq.q}</Text>
                  <MaterialIcons
                    name={expandedFaq === i ? 'expand-less' : 'expand-more'}
                    size={22} color="#94a3b8"
                  />
                </View>
                {expandedFaq === i && <Text style={s.faqA}>{faq.a}</Text>}
              </TouchableOpacity>
            ))}

            <View style={s.docCard}>
              <View style={[s.bannerIcon, { backgroundColor: '#f5f3ff' }]}>
                <MaterialIcons name="description" size={20} color="#7c3aed" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.docTitle}>Full User Guide</Text>
                <Text style={s.docSub}>Detailed documentation for all SmartQueue features</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#cbd5e1" />
            </View>

            <View style={s.docCard}>
              <View style={[s.bannerIcon, { backgroundColor: '#f0fdf4' }]}>
                <MaterialIcons name="video-library" size={20} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.docTitle}>Video Tutorials</Text>
                <Text style={s.docSub}>Step-by-step guides for getting started</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#cbd5e1" />
            </View>
          </>
        )}

        {/* ── Contact Support Team ────────────────────────── */}
        {tab === 'contact' && (
          <>
            <View style={s.sectionBanner}>
              <View style={[s.bannerIcon, { backgroundColor: '#ecfdf5' }]}>
                <MaterialIcons name="support-agent" size={24} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.bannerTitle}>Contact Support Team</Text>
                <Text style={s.bannerSub}>We typically respond within 2–4 hours</Text>
              </View>
            </View>

            <View style={s.formCard}>
              <Text style={s.label}>Category</Text>
              <TouchableOpacity style={s.picker} onPress={() => setShowCatPicker(true)}>
                <Text style={s.pickerText}>{CATEGORIES.find(c => c.value === category)?.label}</Text>
                <MaterialIcons name="keyboard-arrow-down" size={20} color="#64748b" />
              </TouchableOpacity>

              <Text style={s.label}>Subject</Text>
              <TextInput
                style={s.input}
                placeholder="What is this about?"
                placeholderTextColor="#94a3b8"
                value={subject}
                onChangeText={setSubject}
              />

              <Text style={s.label}>Message</Text>
              <TextInput
                style={[s.input, s.textarea]}
                placeholder="Describe your issue or question in detail..."
                placeholderTextColor="#94a3b8"
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />

              <TouchableOpacity style={s.submitBtn} onPress={handleSendContact}>
                <MaterialIcons name="send" size={18} color="#fff" />
                <Text style={s.submitBtnText}>Send Message</Text>
              </TouchableOpacity>
            </View>

            {/* Other contact options */}
            <Text style={s.sectionLabel}>Other Ways to Reach Us</Text>
            {[
              { icon: 'phone' as const, label: 'Phone Support', value: '+1 (800) 555-SQMS', sub: 'Mon–Fri, 9am–6pm' },
              { icon: 'email' as const, label: 'Email', value: 'support@smartqueue.app', sub: '24-hour response time' },
              { icon: 'chat' as const, label: 'Live Chat', value: 'Available in-app', sub: 'Mon–Sun, 8am–10pm' },
            ].map((item, i) => (
              <View key={i} style={s.contactRow}>
                <View style={[s.bannerIcon, { backgroundColor: '#eff6ff' }]}>
                  <MaterialIcons name={item.icon} size={20} color="#2563eb" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.contactLabel}>{item.label}</Text>
                  <Text style={s.contactValue}>{item.value}</Text>
                  <Text style={s.contactSub}>{item.sub}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* ── My Tickets ─────────────────────────────────── */}
        {tab === 'tickets' && (
          <>
            <View style={s.sectionBanner}>
              <View style={[s.bannerIcon, { backgroundColor: '#f5f3ff' }]}>
                <MaterialIcons name="inbox" size={24} color="#7c3aed" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.bannerTitle}>My Support Tickets</Text>
                <Text style={s.bannerSub}>{myTickets.length} ticket{myTickets.length !== 1 ? 's' : ''} submitted</Text>
              </View>
            </View>

            {myTickets.length === 0 ? (
              <View style={s.empty}>
                <MaterialIcons name="confirmation-number" size={52} color="#cbd5e1" />
                <Text style={s.emptyTitle}>No tickets yet</Text>
                <Text style={s.emptySub}>Your submitted support tickets will appear here</Text>
                <TouchableOpacity style={s.emptyBtn} onPress={() => setTab('contact')}>
                  <Text style={s.emptyBtnText}>Contact Support</Text>
                </TouchableOpacity>
              </View>
            ) : myTickets.map(ticket => {
              const st = STATUS_STYLE[ticket.status];
              return (
                <TouchableOpacity
                  key={ticket.id}
                  style={s.ticketCard}
                  onPress={() => setSelectedTicket(ticket)}
                  activeOpacity={0.8}
                >
                  <View style={s.ticketHead}>
                    <View style={[s.badge, { backgroundColor: st.bg }]}>
                      <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
                    </View>
                    <Text style={s.ticketTime}>{timeAgo(ticket.timestamp)}</Text>
                  </View>
                  <Text style={s.ticketSubject}>{ticket.subject}</Text>
                  <Text style={s.ticketBody} numberOfLines={2}>{ticket.body}</Text>
                  {ticket.replies.length > 0 && (
                    <View style={s.replyBadge}>
                      <MaterialIcons name="reply" size={13} color="#059669" />
                      <Text style={s.replyBadgeText}>{ticket.replies.length} repl{ticket.replies.length > 1 ? 'ies' : 'y'} from support</Text>
                    </View>
                  )}
                  <View style={s.ticketFooter}>
                    <Text style={s.ticketFooterText}>Tap to view full conversation</Text>
                    <MaterialIcons name="chevron-right" size={16} color="#94a3b8" />
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* ── Report an Issue ─────────────────────────────── */}
        {tab === 'report' && (
          <>
            <View style={s.sectionBanner}>
              <View style={[s.bannerIcon, { backgroundColor: '#fff1f2' }]}>
                <MaterialIcons name="report-problem" size={24} color="#e11d48" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.bannerTitle}>Report an Issue</Text>
                <Text style={s.bannerSub}>Help us improve by reporting bugs or problems</Text>
              </View>
            </View>

            <View style={s.formCard}>
              <Text style={s.label}>Issue Type</Text>
              <TouchableOpacity style={s.picker} onPress={() => setShowIssuePicker(true)}>
                <Text style={s.pickerText}>{CATEGORIES.find(c => c.value === issueType)?.label}</Text>
                <MaterialIcons name="keyboard-arrow-down" size={20} color="#64748b" />
              </TouchableOpacity>

              <Text style={s.label}>Description</Text>
              <TextInput
                style={[s.input, s.textarea, { height: 140 }]}
                placeholder="Please describe the issue in as much detail as possible. Include steps to reproduce if applicable..."
                placeholderTextColor="#94a3b8"
                value={issueDesc}
                onChangeText={setIssueDesc}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />

              <View style={s.tipBox}>
                <MaterialIcons name="lightbulb-outline" size={16} color="#d97706" />
                <Text style={s.tipText}>Include screenshots or error messages if possible — it helps us resolve your issue faster.</Text>
              </View>

              <TouchableOpacity style={[s.submitBtn, { backgroundColor: '#e11d48' }]} onPress={handleSendReport}>
                <MaterialIcons name="report" size={18} color="#fff" />
                <Text style={s.submitBtnText}>Submit Report</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Category picker ─────────────────────────────── */}
      <Modal visible={showCatPicker} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowCatPicker(false)} />
        <View style={s.sheet}>
          <Text style={s.sheetTitle}>Select Category</Text>
          {CATEGORIES.map(c => (
            <TouchableOpacity
              key={c.value}
              style={[s.sheetOption, category === c.value && s.sheetOptionActive]}
              onPress={() => { setCategory(c.value); setShowCatPicker(false); }}
            >
              <Text style={[s.sheetOptionText, category === c.value && s.sheetOptionTextActive]}>{c.label}</Text>
              {category === c.value && <MaterialIcons name="check" size={18} color="#2563eb" />}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>

      {/* ── Issue type picker ───────────────────────────── */}
      <Modal visible={showIssuePicker} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowIssuePicker(false)} />
        <View style={s.sheet}>
          <Text style={s.sheetTitle}>Select Issue Type</Text>
          {CATEGORIES.map(c => (
            <TouchableOpacity
              key={c.value}
              style={[s.sheetOption, issueType === c.value && s.sheetOptionActive]}
              onPress={() => { setIssueType(c.value); setShowIssuePicker(false); }}
            >
              <Text style={[s.sheetOptionText, issueType === c.value && s.sheetOptionTextActive]}>{c.label}</Text>
              {issueType === c.value && <MaterialIcons name="check" size={18} color="#2563eb" />}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>

      {/* ── Ticket detail modal ─────────────────────────── */}
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
                  <View style={[s.badge, { backgroundColor: st.bg, alignSelf: 'flex-start', marginBottom: 12 }]}>
                    <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
                  </View>

                  <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                    {/* Original message */}
                    <View style={s.bubble}>
                      <View style={s.bubbleHead}>
                        <Text style={s.bubbleFrom}>You</Text>
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
                            {r.from !== 'customer' ? 'Support Team' : 'You'}
                          </Text>
                          <Text style={s.bubbleTime}>{timeAgo(r.timestamp)}</Text>
                        </View>
                        <Text style={s.bubbleBody}>{r.body}</Text>
                      </View>
                    ))}
                  </ScrollView>

                  {selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved' && (
                    <View style={s.replyRow}>
                      <TextInput
                        style={s.replyInput}
                        placeholder="Write a reply..."
                        placeholderTextColor="#94a3b8"
                        value={replyText}
                        onChangeText={setReplyText}
                        multiline
                      />
                      <TouchableOpacity style={s.replyBtn} onPress={handleReply}>
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

  tabBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  tabItem: {
    flex: 1, alignItems: 'center', paddingVertical: 10, gap: 2,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#2563eb' },
  tabLabel: { fontSize: 9, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.3 },
  tabLabelActive: { color: '#2563eb' },

  content: { padding: 16, gap: 12, paddingBottom: 40 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: 1, marginTop: 4,
  },

  sectionBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1,
    borderColor: '#e2e8f0', padding: 16,
  },
  bannerIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  bannerTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  bannerSub: { fontSize: 12, color: '#64748b', fontWeight: '500', marginTop: 2 },

  // FAQ
  faqCard: {
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1,
    borderColor: '#e2e8f0', padding: 16,
  },
  faqRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  faqQ: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0f172a' },
  faqA: { fontSize: 13, color: '#475569', fontWeight: '500', lineHeight: 21, marginTop: 12 },

  docCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1,
    borderColor: '#e2e8f0', padding: 16,
  },
  docTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  docSub: { fontSize: 12, color: '#64748b', fontWeight: '500', marginTop: 2 },

  // Form
  formCard: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1,
    borderColor: '#e2e8f0', padding: 20, gap: 4,
  },
  label: {
    fontSize: 11, fontWeight: '700', color: '#64748b',
    textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 10, marginBottom: 4,
  },
  input: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#0f172a', backgroundColor: '#f8fafc',
  },
  textarea: { height: 120, textAlignVertical: 'top' },
  picker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#f8fafc',
  },
  pickerText: { fontSize: 14, color: '#0f172a', fontWeight: '500' },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 14, gap: 8, marginTop: 12,
  },
  submitBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  // Contact info
  contactRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1,
    borderColor: '#e2e8f0', padding: 16,
  },
  contactLabel: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  contactValue: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginTop: 2 },
  contactSub: { fontSize: 11, color: '#94a3b8', fontWeight: '500', marginTop: 1 },

  // Tickets
  ticketCard: {
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1,
    borderColor: '#e2e8f0', padding: 16, gap: 6,
  },
  ticketHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  ticketTime: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  ticketSubject: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  ticketBody: { fontSize: 13, color: '#64748b', fontWeight: '500', lineHeight: 18 },
  replyBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  replyBadgeText: { fontSize: 12, color: '#059669', fontWeight: '600' },
  ticketFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  ticketFooterText: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },

  // Tip
  tipBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#fffbeb', borderRadius: 10, padding: 12, marginTop: 8,
  },
  tipText: { flex: 1, fontSize: 12, color: '#92400e', fontWeight: '500', lineHeight: 18 },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#64748b' },
  emptySub: { fontSize: 13, color: '#94a3b8', fontWeight: '500', textAlign: 'center' },
  emptyBtn: {
    marginTop: 8, backgroundColor: '#2563eb', borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Sheet / overlay modals
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, gap: 2, paddingBottom: 40,
  },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  sheetOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  sheetOptionActive: { backgroundColor: '#eff6ff', borderRadius: 10, paddingHorizontal: 12, marginHorizontal: -8 },
  sheetOptionText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  sheetOptionTextActive: { color: '#2563eb', fontWeight: '700' },

  // Ticket detail modal
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

  bubble: {
    backgroundColor: '#f1f5f9', borderRadius: 14, padding: 14, marginBottom: 10,
  },
  bubbleStaff: { backgroundColor: '#eff6ff' },
  bubbleHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  bubbleFrom: { fontSize: 12, fontWeight: '700', color: '#2563eb' },
  bubbleTime: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  bubbleBody: { fontSize: 13, color: '#334155', fontWeight: '500', lineHeight: 19 },

  replyRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0', marginTop: 8,
  },
  replyInput: {
    flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: '#0f172a',
    maxHeight: 80, textAlignVertical: 'top',
  },
  replyBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center',
  },
});
