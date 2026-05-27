import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { api } from '@/lib/api';

const INDUSTRIES = [
  { key: 'banking',    label: 'Banking & Finance' },
  { key: 'healthcare', label: 'Healthcare'        },
  { key: 'retail',     label: 'Retail'            },
  { key: 'government', label: 'Government'        },
  { key: 'education',  label: 'Education'         },
  { key: 'corporate',  label: 'Corporate'         },
];

export default function RegisterBusiness() {
  const router = useRouter();

  const [businessName, setBusinessName] = useState('');
  const [contactName,  setContactName]  = useState('');
  const [email,        setEmail]        = useState('');
  const [phone,        setPhone]        = useState('');
  const [industry,     setIndustry]     = useState('');
  const [message,      setMessage]      = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [submitted,    setSubmitted]    = useState(false);

  const handleSubmit = async () => {
    if (!businessName.trim() || !contactName.trim() || !email.trim() || !industry) {
      Alert.alert('Error', 'Please fill in all required fields and select an industry.');
      return;
    }

    setSubmitting(true);
    const { error } = await api.post(
      '/businesses/requests/',
      { business_name: businessName, contact_name: contactName, email, phone, industry, message },
      false,
    );
    setSubmitting(false);

    if (error) {
      Alert.alert('Error', error);
      return;
    }

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
            Your business registration request has been sent to the Super Admin for review. You will be contacted once it is approved.
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
            placeholder="e.g. 05001234567"
            placeholderTextColor="#94a3b8"
            keyboardType="phone-pad"
            maxLength={10}
          />
        </View>

        {/* Industry */}
        <View style={s.fieldGroup}>
          <Text style={s.label}>Industry <Text style={s.required}>*</Text></Text>
          <View style={s.industryGrid}>
            {INDUSTRIES.map(ind => (
              <TouchableOpacity
                key={ind.key}
                style={[s.industryChip, industry === ind.key && s.industryChipActive]}
                onPress={() => setIndustry(ind.key)}
                activeOpacity={0.8}
              >
                <Text style={[s.industryChipText, industry === ind.key && s.industryChipTextActive]}>
                  {ind.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
  container:  { flex: 1, backgroundColor: '#f8fafc' },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backBtn:    { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle:{ fontSize: 17, fontWeight: '800', color: '#0f172a' },
  content:    { padding: 16, gap: 16, paddingBottom: 40 },

  infoCard:   { flexDirection: 'row', gap: 10, backgroundColor: '#eff6ff', borderRadius: 12, padding: 14, alignItems: 'flex-start' },
  infoText:   { flex: 1, fontSize: 13, color: '#2563eb', fontWeight: '500', lineHeight: 20 },

  fieldGroup: { gap: 8 },
  label:      { fontSize: 13, fontWeight: '700', color: '#374151' },
  required:   { color: '#e11d48' },
  input:      { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#0f172a' },
  textArea:   { height: 100, textAlignVertical: 'top' },

  industryGrid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  industryChip:          { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  industryChipActive:    { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  industryChipText:      { fontSize: 13, fontWeight: '600', color: '#64748b' },
  industryChipTextActive:{ color: '#fff' },

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
