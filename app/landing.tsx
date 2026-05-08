import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StatusBar,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

// ─── Types ────────────────────────────────────────────────────────────────────

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

// ─── Static data ──────────────────────────────────────────────────────────────

const INDUSTRIES = [
  { id: 'banking',    name: 'Banking',    icon: 'account-balance' as IconName, color: '#2563eb', bg: '#eff6ff', desc: 'Teller services, loans, account management' },
  { id: 'healthcare', name: 'Healthcare', icon: 'local-hospital'  as IconName, color: '#e11d48', bg: '#fff1f2', desc: 'GP consultations, pharmacy, lab tests' },
  { id: 'retail',     name: 'Retail',     icon: 'shopping-bag'    as IconName, color: '#d97706', bg: '#fffbeb', desc: 'Returns, customer service, tech support' },
  { id: 'government', name: 'Government', icon: 'gavel'           as IconName, color: '#475569', bg: '#f1f5f9', desc: 'Permits, licenses, document processing' },
  { id: 'education',  name: 'Education',  icon: 'school'          as IconName, color: '#0d9488', bg: '#f0fdfa', desc: 'Admissions, registrar, financial aid' },
  { id: 'corporate',  name: 'Corporate',  icon: 'business'        as IconName, color: '#7c3aed', bg: '#f5f3ff', desc: 'HR services, IT support, reception' },
];

const FEATURES = [
  { icon: 'access-time'   as IconName, color: '#2563eb', title: 'Real-Time Queue Management', short: 'Track wait times and queue status in real-time with live updates.', full: 'Our advanced real-time tracking system provides instant updates on queue status, wait times, and service availability. Industry-leading algorithms predict wait times with 95% precision, reducing customer anxiety and improving satisfaction scores by an average of 40%.' },
  { icon: 'group'         as IconName, color: '#0d9488', title: 'Multi-Role Support',          short: 'Separate interfaces for customers, staff, and administrators.',        full: 'SQMS provides tailored experiences for every user type. Customers enjoy a simple interface for joining queues, staff get powerful counter management tools, and administrators access comprehensive dashboards. Our role-based system reduces training time by 60% and improves operational efficiency by 45%.' },
  { icon: 'smartphone'    as IconName, color: '#7c3aed', title: 'Virtual Queue System',        short: "Join queues remotely and get notified when it's your turn.",           full: 'Skip physical lines entirely with our virtual queue technology. Customers can join queues from anywhere using their smartphones. Virtual queuing reduces perceived wait times by 70% and increases customer satisfaction by 50%. Serving over 2 million customers monthly.' },
  { icon: 'bar-chart'     as IconName, color: '#d97706', title: 'Analytics & Reports',         short: 'Comprehensive insights into queue performance and service efficiency.',  full: 'Make data-driven decisions with our powerful analytics engine. Track average wait times, service duration, peak hours, and customer flow patterns. Our clients report 35% improvement in resource allocation and 28% reduction in operational costs within 3 months.' },
  { icon: 'security'      as IconName, color: '#e11d48', title: 'Secure & Private',            short: 'Privacy-focused system displaying only queue numbers to customers.',    full: 'Security and privacy are at the core of SQMS. We use AES-256 encryption to protect all data. Our privacy-first approach displays only queue numbers publicly, never personal information. GDPR and HIPAA compliant for healthcare and financial institutions.' },
  { icon: 'event-available' as IconName, color: '#059669', title: 'Appointment Scheduling', short: 'Book appointments in advance and choose preferred service branches.',   full: 'Combine the flexibility of appointments with queue management. Smart scheduling optimizes appointment spacing to minimize gaps and maximize throughput. Automatic reminders reduce no-shows by 65%, and branch selection lets customers choose convenient locations.' },
];

const TESTIMONIALS = [
  { name: 'Sarah Johnson',     role: 'Operations Manager, Metro Bank',            rating: 5,   comment: 'SQMS transformed our branch operations. Wait times decreased by 45% and customer satisfaction jumped from 72% to 94% in just two months.', icon: 'account-balance' as IconName, color: '#2563eb' },
  { name: 'Dr. Michael Chen',  role: 'Hospital Administrator',                    rating: 5,   comment: 'The virtual queue system has been a game-changer. Patients love being able to wait from their cars or a nearby café instead of a crowded lobby.', icon: 'local-hospital' as IconName, color: '#e11d48' },
  { name: 'Patricia Williams', role: 'Director, Department of Motor Vehicles',    rating: 4.5, comment: 'We reduced average wait time from 47 minutes to just 12 minutes. The analytics help us staff appropriately during peak hours.', icon: 'gavel' as IconName, color: '#475569' },
];

const STEPS = [
  { num: '1', color: '#2563eb', bg: '#eff6ff', icon: 'dashboard' as IconName, title: 'Create Your Digital Branch', desc: 'Set up your business profile, add services, and configure branches in minutes. No technical expertise required.' },
  { num: '2', color: '#0d9488', bg: '#f0fdfa', icon: 'qr-code-2' as IconName, title: 'Generate Unique QR Codes',   desc: 'Get custom QR codes for your entrance. Customers scan to join the virtual queue instantly from their phones.' },
  { num: '3', color: '#475569', bg: '#f1f5f9', icon: 'bar-chart'  as IconName, title: 'Manage From Dashboard',     desc: 'Monitor queues in real-time, call customers, and track performance metrics. Complete control at your fingertips.' },
];

const COUNTRY_CODES = [
  { code: '+1', label: '+1 US/CA' },
  { code: '+44', label: '+44 UK' },
  { code: '+91', label: '+91 India' },
  { code: '+90', label: '+90 Turkey' },
  { code: '+86', label: '+86 China' },
  { code: '+49', label: '+49 Germany' },
  { code: '+33', label: '+33 France' },
  { code: '+61', label: '+61 Australia' },
];

const BRANCH_OPTIONS = ['1 Branch', '2–5 Branches', '6–10 Branches', '11–50 Branches', '51–100 Branches', '100+ Branches'];

// ─── Picker Modal ─────────────────────────────────────────────────────────────

function PickerModal<T extends string>({
  visible, title, options, selected, onSelect, onClose,
}: {
  visible: boolean;
  title: string;
  options: T[];
  selected: T;
  onSelect: (v: T) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={pm.overlay}>
        <View style={pm.sheet}>
          <View style={pm.sheetHeader}>
            <Text style={pm.sheetTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {options.map(opt => (
              <TouchableOpacity key={opt} style={pm.option} onPress={() => { onSelect(opt); onClose(); }}>
                <Text style={pm.optionText}>{opt}</Text>
                {selected === opt && <MaterialIcons name="check-circle" size={20} color="#2563eb" />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const pm = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:       { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '60%' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle:  { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  option:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  optionText:  { fontSize: 15, fontWeight: '600', color: '#0f172a' },
});

// ─── Star rating ──────────────────────────────────────────────────────────────

function Stars({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <MaterialIcons
          key={i}
          name={i <= Math.floor(rating) ? 'star' : i - 0.5 <= rating ? 'star-half' : 'star-border'}
          size={16}
          color="#f59e0b"
        />
      ))}
    </View>
  );
}

// ─── Register modal ───────────────────────────────────────────────────────────

function RegisterModal({ visible, onClose, onSuccess }: { visible: boolean; onClose: () => void; onSuccess: (email: string) => void }) {
  const [form, setForm] = useState({ businessName: '', industry: '', otherIndustry: '', contactName: '', email: '', countryCode: '+1', phone: '', password: '', address: '', branches: '1 Branch' });
  const [pwError, setPwError]       = useState('');
  const [showIndustryPicker, setShowIndustryPicker] = useState(false);
  const [showCodePicker,     setShowCodePicker]     = useState(false);
  const [showBranchPicker,   setShowBranchPicker]   = useState(false);
  const [showPw,             setShowPw]             = useState(false);

  const handleSubmit = () => {
    if (!form.businessName || !form.industry || !form.contactName || !form.email || !form.phone || !form.password || !form.address) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.'); return;
    }
    if (form.password.length > 20) { setPwError('Password must be 20 characters or less.'); return; }
    if (!/[A-Z]/.test(form.password)) { setPwError('Password must contain at least one capital letter.'); return; }
    if (!/[0-9]/.test(form.password)) { setPwError('Password must contain at least one number.'); return; }
    setPwError('');
    onSuccess(form.email);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={rm.overlay}>
          <View style={rm.sheet}>
            <View style={rm.header}>
              <View>
                <Text style={rm.title}>Register Your Business</Text>
                <Text style={rm.sub}>Fill out the form to get started</Text>
              </View>
              <TouchableOpacity onPress={onClose}>
                <MaterialIcons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <FormField label="Business Name *" placeholder="Your business name" value={form.businessName} onChangeText={v => setForm(p => ({ ...p, businessName: v }))} />

              <Text style={rm.label}>Industry *</Text>
              <TouchableOpacity style={rm.picker} onPress={() => setShowIndustryPicker(true)}>
                <Text style={[rm.pickerText, !form.industry && { color: '#94a3b8' }]}>
                  {form.industry ? INDUSTRIES.find(i => i.id === form.industry)?.name : 'Select industry'}
                </Text>
                <MaterialIcons name="expand-more" size={20} color="#94a3b8" />
              </TouchableOpacity>

              {form.industry === 'other' && (
                <FormField label="Specify Industry *" placeholder="Enter industry type" value={form.otherIndustry} onChangeText={v => setForm(p => ({ ...p, otherIndustry: v }))} />
              )}

              <View style={rm.row}>
                <View style={{ flex: 1 }}>
                  <FormField label="Contact Name *" placeholder="Your full name" value={form.contactName} onChangeText={v => setForm(p => ({ ...p, contactName: v }))} />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <FormField label="Email *" placeholder="your@email.com" value={form.email} onChangeText={v => setForm(p => ({ ...p, email: v }))} keyboardType="email-address" />
                </View>
              </View>

              <Text style={rm.label}>Phone Number *</Text>
              <View style={rm.phoneRow}>
                <TouchableOpacity style={rm.codePicker} onPress={() => setShowCodePicker(true)}>
                  <Text style={rm.codeText}>{form.countryCode}</Text>
                  <MaterialIcons name="expand-more" size={16} color="#94a3b8" />
                </TouchableOpacity>
                <TextInput
                  style={rm.phoneInput}
                  placeholder="Phone number"
                  placeholderTextColor="#94a3b8"
                  value={form.phone}
                  onChangeText={v => setForm(p => ({ ...p, phone: v.replace(/[^0-9]/g, '').slice(0, 15) }))}
                  keyboardType="phone-pad"
                />
              </View>

              <Text style={rm.label}>Password *</Text>
              <View style={rm.inputRow}>
                <TextInput
                  style={rm.input}
                  placeholder="Create a password"
                  placeholderTextColor="#94a3b8"
                  value={form.password}
                  onChangeText={v => { setForm(p => ({ ...p, password: v })); setPwError(''); }}
                  secureTextEntry={!showPw}
                  maxLength={20}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPw(p => !p)}>
                  <MaterialIcons name={showPw ? 'visibility-off' : 'visibility'} size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>
              {pwError ? <Text style={rm.error}>{pwError}</Text> : null}
              <Text style={rm.hint}>Max 20 chars · at least one capital letter · one number</Text>

              <FormField label="Business Address *" placeholder="123 Main St, City, State" value={form.address} onChangeText={v => setForm(p => ({ ...p, address: v }))} />

              <Text style={rm.label}>Number of Branches *</Text>
              <TouchableOpacity style={rm.picker} onPress={() => setShowBranchPicker(true)}>
                <Text style={rm.pickerText}>{form.branches}</Text>
                <MaterialIcons name="expand-more" size={20} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity style={rm.submitBtn} onPress={handleSubmit}>
                <Text style={rm.submitBtnText}>Complete Registration</Text>
              </TouchableOpacity>

              <View style={{ height: 32 }} />
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>

      <PickerModal
        visible={showIndustryPicker} title="Select Industry"
        options={[...INDUSTRIES.map(i => i.id), 'other'] as string[]}
        selected={form.industry}
        onSelect={v => setForm(p => ({ ...p, industry: v }))}
        onClose={() => setShowIndustryPicker(false)}
      />
      <PickerModal
        visible={showCodePicker} title="Country Code"
        options={COUNTRY_CODES.map(c => c.code)}
        selected={form.countryCode}
        onSelect={v => setForm(p => ({ ...p, countryCode: v }))}
        onClose={() => setShowCodePicker(false)}
      />
      <PickerModal
        visible={showBranchPicker} title="Number of Branches"
        options={BRANCH_OPTIONS}
        selected={form.branches}
        onSelect={v => setForm(p => ({ ...p, branches: v }))}
        onClose={() => setShowBranchPicker(false)}
      />
    </Modal>
  );
}

function FormField({ label, placeholder, value, onChangeText, keyboardType }: {
  label: string; placeholder: string; value: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={rm.label}>{label}</Text>
      <View style={rm.inputRow}>
        <TextInput
          style={rm.input}
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType ?? 'default'}
          autoCapitalize="none"
        />
      </View>
    </View>
  );
}

const rm = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '92%' },
  header:     { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
  title:      { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  sub:        { fontSize: 13, color: '#64748b', fontWeight: '500', marginTop: 2 },
  label:      { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 },
  inputRow:   { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14, backgroundColor: '#fff' },
  input:      { flex: 1, fontSize: 14, color: '#0f172a', fontWeight: '500' },
  picker:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 14 },
  pickerText: { fontSize: 14, fontWeight: '500', color: '#0f172a', flex: 1 },
  phoneRow:   { flexDirection: 'row', gap: 8, marginBottom: 14 },
  codePicker: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 14 },
  codeText:   { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  phoneInput: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#0f172a' },
  row:        { flexDirection: 'row' },
  error:      { color: '#e11d48', fontSize: 12, fontWeight: '600', marginTop: -10, marginBottom: 8 },
  hint:       { fontSize: 11, color: '#94a3b8', marginBottom: 14, marginTop: -10 },
  submitBtn:  { backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  submitBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function LandingScreen() {
  const router = useRouter();
  const [expandedFeature, setExpandedFeature] = useState<number | null>(null);
  const [showRegister,    setShowRegister]    = useState(false);
  const [showPending,     setShowPending]     = useState(false);
  const [showPricing,     setShowPricing]     = useState(false);
  const [pendingEmail,    setPendingEmail]    = useState('');

  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' });

  const handleRegisterSuccess = (email: string) => {
    setPendingEmail(email);
    setShowRegister(false);
    setShowPending(true);
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Sticky header ── */}
      <View style={s.header}>
        <View style={s.logo}>
          <MaterialIcons name="queue" size={26} color="#2563eb" />
          <Text style={s.logoText}>SQMS</Text>
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity style={s.loginBtn} onPress={() => router.push('/login' as any)}>
            <Text style={s.loginBtnText}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.registerBtn} onPress={() => setShowRegister(true)}>
            <Text style={s.registerBtnText}>Register</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Hero ── */}
        <View style={s.hero}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1720753608518-0256245fc15e?w=800&h=500&fit=crop' }}
            style={s.heroImage}
          />
          <View style={s.heroOverlay} />
          <View style={s.heroContent}>
            <Text style={s.heroTitle}>Smart Queue{'\n'}Management{'\n'}
              <Text style={s.heroTitleAccent}>Made Simple</Text>
            </Text>
            <Text style={s.heroSub}>Reduce wait times, improve customer experience, and optimize service flow.</Text>

            <View style={s.heroChecks}>
              {['Real-time Updates', 'Multi-Branch Support', 'Smart Analytics'].map(t => (
                <View key={t} style={s.heroCheckItem}>
                  <MaterialIcons name="check-circle" size={16} color="#22c55e" />
                  <Text style={s.heroCheckText}>{t}</Text>
                </View>
              ))}
            </View>

            <View style={s.ratingBadge}>
              <Stars rating={4.9} />
              <Text style={s.ratingText}>4.9/5.0 Rating</Text>
            </View>

            <TouchableOpacity style={s.heroBtn} onPress={() => router.push('/login' as any)}>
              <Text style={s.heroBtnText}>Get Started</Text>
              <MaterialIcons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── How it works ── */}
        <View style={s.section}>
          <View style={s.sectionBadge}><Text style={s.sectionBadgeText}>HOW IT WORKS</Text></View>
          <Text style={s.sectionTitle}>Get Started in 3 Simple Steps</Text>
          <Text style={s.sectionSub}>Launch your digital queue management system in minutes, not days</Text>

          {STEPS.map((step, i) => (
            <View key={i} style={[s.stepCard, { borderLeftColor: step.color, borderLeftWidth: 4 }]}>
              <View style={[s.stepNum, { backgroundColor: step.color }]}>
                <Text style={s.stepNumText}>{step.num}</Text>
              </View>
              <View style={[s.stepIconWrap, { backgroundColor: step.bg }]}>
                <MaterialIcons name={step.icon} size={28} color={step.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.stepTitle}>{step.title}</Text>
                <Text style={s.stepDesc}>{step.desc}</Text>
              </View>
            </View>
          ))}

          <TouchableOpacity style={s.primaryBtn} onPress={() => setShowRegister(true)}>
            <Text style={s.primaryBtnText}>Start Your Free Trial</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ── Stats ── */}
        <View style={s.statsBar}>
          {[['500+', 'Active Users'], ['25+', 'Business Partners'], ['99.5%', 'Uptime'], ['24/7', 'Support']].map(([val, label]) => (
            <View key={label} style={s.statItem}>
              <Text style={s.statValue}>{val}</Text>
              <Text style={s.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* ── Industries ── */}
        <View style={s.section}>
          <View style={s.sectionBadge}><Text style={s.sectionBadgeText}>INDUSTRY SOLUTIONS</Text></View>
          <Text style={s.sectionTitle}>Tailored for Your Industry</Text>
          <Text style={s.sectionSub}>SQMS adapts to your specific industry needs with customised workflows and features.</Text>

          <View style={s.industryGrid}>
            {INDUSTRIES.map(ind => (
              <TouchableOpacity
                key={ind.id}
                style={[s.industryCard, { borderColor: ind.color + '40' }]}
                onPress={() => setShowRegister(true)}
                activeOpacity={0.8}
              >
                <View style={[s.industryIcon, { backgroundColor: ind.bg }]}>
                  <MaterialIcons name={ind.icon} size={28} color={ind.color} />
                </View>
                <Text style={s.industryName}>{ind.name}</Text>
                <Text style={s.industryDesc}>{ind.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Features ── */}
        <View style={[s.section, { backgroundColor: '#f8fafc' }]}>
          <View style={s.sectionBadge}><Text style={s.sectionBadgeText}>WHY CHOOSE SQMS</Text></View>
          <Text style={s.sectionTitle}>Powerful Features</Text>
          <Text style={s.sectionSub}>Everything you need to manage queues efficiently and provide exceptional customer service.</Text>

          {FEATURES.map((f, i) => (
            <TouchableOpacity
              key={i}
              style={[s.featureCard, expandedFeature === i && { borderColor: f.color }]}
              onPress={() => setExpandedFeature(expandedFeature === i ? null : i)}
              activeOpacity={0.9}
            >
              <View style={s.featureTop}>
                <View style={[s.featureIcon, { backgroundColor: f.color + '20' }]}>
                  <MaterialIcons name={f.icon} size={24} color={f.color} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={s.featureTitle}>{f.title}</Text>
                  <Text style={s.featureShort}>{f.short}</Text>
                </View>
                <MaterialIcons
                  name={expandedFeature === i ? 'expand-less' : 'expand-more'}
                  size={22} color="#94a3b8"
                />
              </View>
              {expandedFeature === i && (
                <View style={[s.featureExpanded, { borderTopColor: f.color + '30' }]}>
                  <Text style={s.featureFull}>{f.full}</Text>
                  <TouchableOpacity style={[s.featureBtn, { backgroundColor: f.color }]} onPress={() => router.push('/login' as any)}>
                    <Text style={s.featureBtnText}>Try This Feature</Text>
                    <MaterialIcons name="arrow-forward" size={15} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Testimonials ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>What Our Customers Say</Text>
          <Text style={s.sectionSub}>Real feedback from industry leaders</Text>

          {TESTIMONIALS.map((t, i) => (
            <View key={i} style={s.testimonialCard}>
              <View style={s.testimonialTop}>
                <View style={[s.testimonialAvatar, { backgroundColor: t.color + '20' }]}>
                  <MaterialIcons name={t.icon} size={24} color={t.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.testimonialName}>{t.name}</Text>
                  <Text style={s.testimonialRole}>{t.role}</Text>
                  <Stars rating={t.rating} />
                </View>
              </View>
              <Text style={s.testimonialComment}>"{t.comment}"</Text>
            </View>
          ))}
        </View>

        {/* ── CTA ── */}
        <View style={s.cta}>
          <Text style={s.ctaTitle}>Ready to Get Started?</Text>
          <Text style={s.ctaSub}>Join many businesses using SQMS to improve their customer service.</Text>
          <TouchableOpacity style={s.ctaBtn} onPress={() => setShowRegister(true)}>
            <Text style={s.ctaBtnText}>Get Started Now</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#2563eb" />
          </TouchableOpacity>
        </View>

        {/* ── Contact ── */}
        <View style={s.section}>
          <View style={s.sectionBadge}><Text style={s.sectionBadgeText}>CONTACT US</Text></View>
          <Text style={s.sectionTitle}>Get in Touch</Text>
          <Text style={s.sectionSub}>Have questions? Send us a message and we'll respond as soon as possible.</Text>

          <View style={s.contactCard}>
            {(['name', 'email', 'subject'] as const).map(field => (
              <View key={field} style={s.contactField}>
                <Text style={s.contactLabel}>{field.charAt(0).toUpperCase() + field.slice(1)} *</Text>
                <TextInput
                  style={s.contactInput}
                  placeholder={field === 'email' ? 'your@email.com' : field === 'name' ? 'Your name' : 'How can we help?'}
                  placeholderTextColor="#94a3b8"
                  value={contactForm[field]}
                  onChangeText={v => setContactForm(p => ({ ...p, [field]: v }))}
                  keyboardType={field === 'email' ? 'email-address' : 'default'}
                  autoCapitalize="none"
                />
              </View>
            ))}
            <View style={s.contactField}>
              <Text style={s.contactLabel}>Message *</Text>
              <TextInput
                style={[s.contactInput, { height: 100, textAlignVertical: 'top', paddingTop: 12 }]}
                placeholder="Tell us more about your inquiry..."
                placeholderTextColor="#94a3b8"
                multiline
                value={contactForm.message}
                onChangeText={v => setContactForm(p => ({ ...p, message: v }))}
              />
            </View>
            <TouchableOpacity
              style={s.contactSendBtn}
              onPress={() => {
                if (!contactForm.name || !contactForm.email || !contactForm.message) {
                  Alert.alert('Missing Fields', 'Please fill in all required fields.'); return;
                }
                Alert.alert('Message Sent!', "We'll get back to you soon.");
                setContactForm({ name: '', email: '', subject: '', message: '' });
              }}
            >
              <Text style={s.contactSendBtnText}>Send Message</Text>
            </TouchableOpacity>

            <View style={s.contactInfoRow}>
              {[
                { icon: 'email'  as IconName, label: 'Email',  value: 'support@sqms.com',    color: '#2563eb', bg: '#eff6ff' },
                { icon: 'phone'  as IconName, label: 'Phone',  value: '+1 (555) 123-4567',   color: '#0d9488', bg: '#f0fdfa' },
                { icon: 'place'  as IconName, label: 'Office', value: 'San Francisco, CA',   color: '#475569', bg: '#f1f5f9' },
              ].map(item => (
                <View key={item.label} style={s.contactInfoItem}>
                  <View style={[s.contactInfoIcon, { backgroundColor: item.bg }]}>
                    <MaterialIcons name={item.icon} size={18} color={item.color} />
                  </View>
                  <Text style={s.contactInfoLabel}>{item.label}</Text>
                  <Text style={s.contactInfoValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── Pricing modal trigger ── */}
        <TouchableOpacity style={s.pricingRow} onPress={() => setShowPricing(true)}>
          <MaterialIcons name="trending-up" size={18} color="#2563eb" />
          <Text style={s.pricingRowText}>View Pricing Information</Text>
          <MaterialIcons name="chevron-right" size={18} color="#2563eb" />
        </TouchableOpacity>

        {/* ── Footer ── */}
        <View style={s.footer}>
          <View style={s.footerLogo}>
            <MaterialIcons name="queue" size={22} color="#fff" />
            <Text style={s.footerLogoText}>SQMS</Text>
          </View>
          <Text style={s.footerText}>Smart Queue Management System © 2026. All rights reserved.</Text>
        </View>

      </ScrollView>

      {/* ── Modals ── */}
      <RegisterModal visible={showRegister} onClose={() => setShowRegister(false)} onSuccess={handleRegisterSuccess} />

      {/* Pending Approval */}
      <Modal visible={showPending} transparent animationType="fade">
        <View style={modal.overlay}>
          <View style={modal.box}>
            <View style={modal.pendingIcon}>
              <MaterialIcons name="access-time" size={48} color="#2563eb" />
            </View>
            <Text style={modal.pendingTitle}>Registration Submitted!</Text>
            <Text style={modal.pendingSub}>Your business registration is pending approval.</Text>
            <View style={modal.pendingSteps}>
              <Text style={modal.pendingStepsTitle}>What happens next?</Text>
              {['Our team will review your application within 24–48 hours.', "You'll receive an email confirmation once approved.", 'Your account will be activated and ready to use.'].map(step => (
                <View key={step} style={modal.pendingStep}>
                  <MaterialIcons name="check-circle" size={16} color="#2563eb" />
                  <Text style={modal.pendingStepText}>{step}</Text>
                </View>
              ))}
            </View>
            <Text style={modal.pendingEmail}>Registration email: <Text style={{ fontWeight: '800' }}>{pendingEmail}</Text></Text>
            <TouchableOpacity style={modal.pendingBtn} onPress={() => setShowPending(false)}>
              <Text style={modal.pendingBtnText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Pricing */}
      <Modal visible={showPricing} transparent animationType="slide">
        <View style={modal.overlay}>
          <View style={modal.box}>
            <View style={modal.pricingHeader}>
              <Text style={modal.pricingTitle}>Pricing Information</Text>
              <TouchableOpacity onPress={() => setShowPricing(false)}>
                <MaterialIcons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View style={modal.pricingBadge}>
              <MaterialIcons name="trending-up" size={32} color="#2563eb" />
              <Text style={modal.pricingBadgeTitle}>Custom Pricing</Text>
              <Text style={modal.pricingBadgeSub}>Tailored to your business needs</Text>
            </View>
            <Text style={modal.pricingDesc}>Our pricing is customised based on your specific requirements:</Text>
            {['Number of branches and locations', 'Expected customer volume', 'Industry-specific features', 'Integration requirements'].map(item => (
              <View key={item} style={modal.pricingItem}>
                <MaterialIcons name="check-circle" size={16} color="#2563eb" />
                <Text style={modal.pricingItemText}>{item}</Text>
              </View>
            ))}
            <TouchableOpacity style={modal.pricingBtn} onPress={() => { setShowPricing(false); setShowRegister(true); }}>
              <Text style={modal.pricingBtnText}>Register Your Business</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const modal = StyleSheet.create({
  overlay:          { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  box:              { backgroundColor: '#fff', borderRadius: 24, padding: 24 },
  pendingIcon:      { width: 90, height: 90, borderRadius: 45, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16 },
  pendingTitle:     { fontSize: 22, fontWeight: '900', color: '#0f172a', textAlign: 'center' },
  pendingSub:       { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 6, marginBottom: 16 },
  pendingSteps:     { backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, marginBottom: 12, gap: 8 },
  pendingStepsTitle:{ fontSize: 13, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  pendingStep:      { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  pendingStepText:  { fontSize: 13, color: '#475569', flex: 1, fontWeight: '500' },
  pendingEmail:     { fontSize: 12, color: '#64748b', textAlign: 'center', marginBottom: 16 },
  pendingBtn:       { backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  pendingBtnText:   { fontSize: 15, fontWeight: '800', color: '#fff' },
  pricingHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  pricingTitle:     { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  pricingBadge:     { backgroundColor: '#eff6ff', borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 14, gap: 4 },
  pricingBadgeTitle:{ fontSize: 18, fontWeight: '800', color: '#0f172a' },
  pricingBadgeSub:  { fontSize: 12, color: '#64748b', fontWeight: '500' },
  pricingDesc:      { fontSize: 13, color: '#475569', marginBottom: 10, fontWeight: '500' },
  pricingItem:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  pricingItemText:  { fontSize: 13, color: '#334155', fontWeight: '600' },
  pricingBtn:       { backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  pricingBtnText:   { fontSize: 15, fontWeight: '800', color: '#fff' },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  // Header
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  logo:          { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText:      { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  headerActions: { flexDirection: 'row', gap: 8 },
  loginBtn:      { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5, borderColor: '#cbd5e1', borderRadius: 10 },
  loginBtnText:  { fontSize: 13, fontWeight: '700', color: '#334155' },
  registerBtn:   { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#2563eb', borderRadius: 10 },
  registerBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Hero
  hero:        { position: 'relative', height: 440 },
  heroImage:   { width: '100%', height: '100%', position: 'absolute' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.55)' },
  heroContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, gap: 12 },
  heroTitle:       { fontSize: 36, fontWeight: '900', color: '#fff', lineHeight: 42 },
  heroTitleAccent: { color: '#60a5fa' },
  heroSub:         { fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: '500', lineHeight: 20 },
  heroChecks:      { gap: 6 },
  heroCheckItem:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroCheckText:   { fontSize: 13, color: '#fff', fontWeight: '600' },
  ratingBadge:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  ratingText:      { fontSize: 12, fontWeight: '700', color: '#fff' },
  heroBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2563eb', paddingVertical: 14, borderRadius: 14, marginTop: 4 },
  heroBtnText:     { fontSize: 15, fontWeight: '800', color: '#fff' },

  // Section
  section:       { padding: 20, gap: 12 },
  sectionBadge:  { alignSelf: 'flex-start', backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  sectionBadgeText: { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  sectionTitle:  { fontSize: 24, fontWeight: '900', color: '#0f172a', letterSpacing: -0.3 },
  sectionSub:    { fontSize: 13, color: '#64748b', fontWeight: '500', lineHeight: 20 },

  // Steps
  stepCard:  { backgroundColor: '#fff', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1, borderColor: '#e2e8f0', marginTop: 4 },
  stepNum:   { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontSize: 16, fontWeight: '900', color: '#fff' },
  stepIconWrap: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  stepDesc:  { fontSize: 12, color: '#64748b', fontWeight: '500', lineHeight: 18 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2563eb', paddingVertical: 14, borderRadius: 14, marginTop: 4 },
  primaryBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  // Stats
  statsBar:  { backgroundColor: '#0f172a', flexDirection: 'row', paddingVertical: 24 },
  statItem:  { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 24, fontWeight: '900', color: '#fff' },
  statLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600', textAlign: 'center' },

  // Industries
  industryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  industryCard: { width: '47%', backgroundColor: '#fff', borderRadius: 20, padding: 16, alignItems: 'center', borderWidth: 1.5, gap: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  industryIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  industryName: { fontSize: 14, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  industryDesc: { fontSize: 11, color: '#94a3b8', fontWeight: '500', textAlign: 'center', lineHeight: 16 },

  // Features
  featureCard:     { backgroundColor: '#fff', borderRadius: 18, padding: 16, borderWidth: 1.5, borderColor: '#e2e8f0' },
  featureTop:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  featureIcon:     { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  featureTitle:    { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  featureShort:    { fontSize: 12, color: '#64748b', fontWeight: '500', lineHeight: 18 },
  featureExpanded: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, gap: 10 },
  featureFull:     { fontSize: 13, color: '#334155', lineHeight: 20, fontWeight: '500' },
  featureBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  featureBtnText:  { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Testimonials
  testimonialCard:   { backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', gap: 12 },
  testimonialTop:    { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  testimonialAvatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  testimonialName:   { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  testimonialRole:   { fontSize: 11, color: '#64748b', fontWeight: '500', marginBottom: 4 },
  testimonialComment:{ fontSize: 13, color: '#475569', fontWeight: '500', lineHeight: 20, fontStyle: 'italic' },

  // CTA
  cta:       { backgroundColor: '#2563eb', margin: 20, borderRadius: 24, padding: 28, alignItems: 'center', gap: 10 },
  ctaTitle:  { fontSize: 24, fontWeight: '900', color: '#fff', textAlign: 'center' },
  ctaSub:    { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center', fontWeight: '500' },
  ctaBtn:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, marginTop: 4 },
  ctaBtnText:{ fontSize: 15, fontWeight: '800', color: '#2563eb' },

  // Contact
  contactCard:      { backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', gap: 4 },
  contactField:     { marginBottom: 12 },
  contactLabel:     { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 },
  contactInput:     { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#0f172a' },
  contactSendBtn:   { backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4, marginBottom: 16 },
  contactSendBtnText:{ fontSize: 15, fontWeight: '800', color: '#fff' },
  contactInfoRow:   { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  contactInfoItem:  { alignItems: 'center', gap: 4 },
  contactInfoIcon:  { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  contactInfoLabel: { fontSize: 11, fontWeight: '700', color: '#0f172a' },
  contactInfoValue: { fontSize: 10, color: '#64748b', fontWeight: '500', textAlign: 'center' },

  // Pricing row
  pricingRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', paddingVertical: 16 },
  pricingRowText: { fontSize: 14, fontWeight: '700', color: '#2563eb' },

  // Footer
  footer:         { backgroundColor: '#0f172a', padding: 24, alignItems: 'center', gap: 8 },
  footerLogo:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footerLogoText: { fontSize: 18, fontWeight: '900', color: '#fff' },
  footerText:     { fontSize: 12, color: '#64748b', textAlign: 'center', fontWeight: '500' },
});
