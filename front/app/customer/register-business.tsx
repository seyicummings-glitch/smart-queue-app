import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { api } from '@/lib/api';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

// Fallback industries (shown if API is unavailable)
const FALLBACK_INDUSTRIES = [
  { key: 'banking',    label: 'Banking & Finance' },
  { key: 'healthcare', label: 'Healthcare'        },
  { key: 'retail',     label: 'Retail'            },
  { key: 'government', label: 'Government'        },
  { key: 'education',  label: 'Education'         },
  { key: 'corporate',  label: 'Corporate'         },
];

const IND_ICON: Record<string, IconName> = {
  banking:    'account-balance',
  healthcare: 'favorite',
  retail:     'shopping-bag',
  government: 'gavel',
  education:  'school',
  corporate:  'business',
};

const IND_COLOR: Record<string, string> = {
  banking:    '#2563eb',
  healthcare: '#e11d48',
  retail:     '#d97706',
  government: '#475569',
  education:  '#4f46e5',
  corporate:  '#0d9488',
};

export default function RegisterBusiness() {
  const router = useRouter();

  const [businessName,   setBusinessName]   = useState('');
  const [contactName,    setContactName]    = useState('');
  const [email,          setEmail]          = useState('');
  const [phone,          setPhone]          = useState('');
  const [selectedInds,   setSelectedInds]   = useState<string[]>([]);
  const [message,        setMessage]        = useState('');
  const [submitting,     setSubmitting]     = useState(false);
  const [submitted,      setSubmitted]      = useState(false);
  const [industries,     setIndustries]     = useState(FALLBACK_INDUSTRIES);
  const [loadingInds,    setLoadingInds]    = useState(true);

  // Load visible industries from the API
  useEffect(() => {
    api.get<{ key: string; label: string; icon?: string; color?: string }[]>(
      '/businesses/visible-industries/',
      false,   // no auth needed for public endpoint? Actually it needs auth...
    ).then(({ data }) => {
      if (data && data.length > 0) {
        setIndustries(data.map(i => ({ key: i.key, label: i.label })));
      }
      setLoadingInds(false);
    }).catch(() => setLoadingInds(false));
  }, []);

  const toggleIndustry = (key: string) => {
    setSelectedInds(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSubmit = async () => {
    if (!businessName.trim() || !contactName.trim() || !email.trim() || selectedInds.length === 0) {
      Alert.alert('Missing Information', 'Please fill in all required fields and select at least one industry.');
      return;
    }

    setSubmitting(true);
    const { error } = await api.post(
      '/businesses/requests/',
      {
        business_name: businessName.trim(),
        contact_name:  contactName.trim(),
        email:         email.trim(),
        phone:         phone.trim(),
        industry:      selectedInds.join(', '),  // store multiple as "banking, healthcare"
        message:       message.trim(),
      },
      false,
    );
    setSubmitting(false);

    if (error) { Alert.alert('Error', error); return; }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.replace('/customer/home' as any)}>
            <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Register Business</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={s.successContainer}>
          <View style={s.successIcon}>
            <MaterialIcons name="check-circle" size={64} color="#059669" />
          </View>
          <Text style={s.successTitle}>Request Submitted!</Text>
          <Text style={s.successSub}>
            Your business registration request has been sent to the Super Admin for review.{'\n\n'}
            You will receive a notification and an email once it is approved or reviewed.
          </Text>
          <TouchableOpacity style={s.backHomeBtn} onPress={() => router.replace('/customer/home' as any)}>
            <Text style={s.backHomeBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Register Your Business</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Info banner */}
        <View style={s.infoCard}>
          <MaterialIcons name="info" size={18} color="#2563eb" />
          <Text style={s.infoText}>
            Your request will be reviewed by the Super Admin. You'll receive a notification once approved.
          </Text>
        </View>

        {/* Business Name */}
        <View style={s.fieldGroup}>
          <Text style={s.label}>Business Name <Text style={s.required}>*</Text></Text>
          <TextInput
            style={s.input}
            value={businessName}
            onChangeText={setBusinessName}
            placeholder="e.g. City Health Clinic"
            placeholderTextColor="#94a3b8"
          />
        </View>

        {/* Contact Name */}
        <View style={s.fieldGroup}>
          <Text style={s.label}>Contact Person Name <Text style={s.required}>*</Text></Text>
          <TextInput
            style={s.input}
            value={contactName}
            onChangeText={setContactName}
            placeholder="Your full name"
            placeholderTextColor="#94a3b8"
          />
        </View>

        {/* Email */}
        <View style={s.fieldGroup}>
          <Text style={s.label}>Email Address <Text style={s.required}>*</Text></Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder="business@example.com"
            placeholderTextColor="#94a3b8"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Phone */}
        <View style={s.fieldGroup}>
          <Text style={s.label}>Phone Number</Text>
          <TextInput
            style={s.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="e.g. +234 800 000 0000"
            placeholderTextColor="#94a3b8"
            keyboardType="phone-pad"
          />
        </View>

        {/* Industry — multi-select */}
        <View style={s.fieldGroup}>
          <Text style={s.label}>
            Industry <Text style={s.required}>*</Text>
            <Text style={s.labelHint}> (select one or more)</Text>
          </Text>

          {loadingInds ? (
            <ActivityIndicator size="small" color="#2563eb" style={{ marginTop: 8 }} />
          ) : (
            <View style={s.indList}>
              {industries.map(ind => {
                const selected = selectedInds.includes(ind.key);
                const color    = IND_COLOR[ind.key] ?? '#4f46e5';
                const icon     = IND_ICON[ind.key]  ?? 'business';
                return (
                  <TouchableOpacity
                    key={ind.key}
                    style={[s.indRow, selected && { borderColor: color, backgroundColor: color + '0d' }]}
                    onPress={() => toggleIndustry(ind.key)}
                    activeOpacity={0.8}
                  >
                    <View style={[s.indRowIcon, { backgroundColor: color + '18' }]}>
                      <MaterialIcons name={icon} size={18} color={color} />
                    </View>
                    <Text style={[s.indRowLabel, selected && { color, fontWeight: '800' }]}>
                      {ind.label}
                    </Text>
                    <MaterialIcons
                      name={selected ? 'check-box' : 'check-box-outline-blank'}
                      size={22}
                      color={selected ? color : '#cbd5e1'}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {selectedInds.length > 0 && (
            <View style={s.selectedWrap}>
              <Text style={s.selectedLabel}>Selected: </Text>
              {selectedInds.map(k => (
                <View key={k} style={[s.selChip, { backgroundColor: (IND_COLOR[k] ?? '#4f46e5') + '18' }]}>
                  <Text style={[s.selChipTxt, { color: IND_COLOR[k] ?? '#4f46e5' }]}>
                    {industries.find(i => i.key === k)?.label ?? k}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Message */}
        <View style={s.fieldGroup}>
          <Text style={s.label}>Additional Information</Text>
          <TextInput
            style={[s.input, s.textArea]}
            value={message}
            onChangeText={setMessage}
            placeholder="Tell us more about your business (optional)"
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={4}
          />
        </View>

        <TouchableOpacity
          style={[s.submitBtn, submitting && s.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting
            ? <ActivityIndicator color="#fff" size="small" />
            : <>
                <MaterialIcons name="send" size={18} color="#fff" />
                <Text style={s.submitBtnText}>Submit Request</Text>
              </>
          }
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f8fafc' },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  content:     { padding: 16, gap: 16, paddingBottom: 40 },

  infoCard:    { flexDirection: 'row', gap: 10, backgroundColor: '#eff6ff', borderRadius: 12, padding: 14, alignItems: 'flex-start' },
  infoText:    { flex: 1, fontSize: 13, color: '#2563eb', fontWeight: '500', lineHeight: 20 },

  fieldGroup:  { gap: 8 },
  label:       { fontSize: 13, fontWeight: '700', color: '#374151' },
  labelHint:   { fontSize: 12, fontWeight: '500', color: '#94a3b8' },
  required:    { color: '#e11d48' },
  input:       { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#0f172a' },
  textArea:    { height: 100, textAlignVertical: 'top' },

  // Industry multi-select
  indList:     { gap: 8 },
  indRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: '#e2e8f0', padding: 12 },
  indRowIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  indRowLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: '#374151' },

  selectedWrap:{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 4 },
  selectedLabel:{ fontSize: 12, fontWeight: '700', color: '#64748b' },
  selChip:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  selChipTxt:  { fontSize: 12, fontWeight: '700' },

  submitBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 16, marginTop: 8 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText:     { fontSize: 16, fontWeight: '800', color: '#fff' },

  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  successIcon:      { width: 100, height: 100, borderRadius: 50, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center' },
  successTitle:     { fontSize: 24, fontWeight: '900', color: '#0f172a' },
  successSub:       { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22 },
  backHomeBtn:      { backgroundColor: '#2563eb', borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14, marginTop: 8 },
  backHomeBtnText:  { fontSize: 15, fontWeight: '800', color: '#fff' },
});
