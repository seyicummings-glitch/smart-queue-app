import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppContext } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import SQMSHeader from '@/components/SQMSHeader';
import BottomNav from '@/components/BottomNav';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

// ─── Country codes ────────────────────────────────────────────────────────────

const COUNTRIES = [
  { code: 'TR', name: 'Turkey',               dial: '+90',  flag: '🇹🇷' },
  { code: 'CY', name: 'Cyprus (TRNC)',         dial: '+90',  flag: '🇨🇾' },
  { code: 'US', name: 'United States',         dial: '+1',   flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom',        dial: '+44',  flag: '🇬🇧' },
  { code: 'DE', name: 'Germany',               dial: '+49',  flag: '🇩🇪' },
  { code: 'FR', name: 'France',                dial: '+33',  flag: '🇫🇷' },
  { code: 'IT', name: 'Italy',                 dial: '+39',  flag: '🇮🇹' },
  { code: 'ES', name: 'Spain',                 dial: '+34',  flag: '🇪🇸' },
  { code: 'NL', name: 'Netherlands',           dial: '+31',  flag: '🇳🇱' },
  { code: 'GR', name: 'Greece',               dial: '+30',  flag: '🇬🇷' },
  { code: 'NG', name: 'Nigeria',               dial: '+234', flag: '🇳🇬' },
  { code: 'GH', name: 'Ghana',                 dial: '+233', flag: '🇬🇭' },
  { code: 'KE', name: 'Kenya',                 dial: '+254', flag: '🇰🇪' },
  { code: 'ZA', name: 'South Africa',          dial: '+27',  flag: '🇿🇦' },
  { code: 'EG', name: 'Egypt',                 dial: '+20',  flag: '🇪🇬' },
  { code: 'SA', name: 'Saudi Arabia',          dial: '+966', flag: '🇸🇦' },
  { code: 'AE', name: 'UAE',                   dial: '+971', flag: '🇦🇪' },
  { code: 'IN', name: 'India',                 dial: '+91',  flag: '🇮🇳' },
  { code: 'PK', name: 'Pakistan',              dial: '+92',  flag: '🇵🇰' },
  { code: 'CN', name: 'China',                 dial: '+86',  flag: '🇨🇳' },
  { code: 'JP', name: 'Japan',                 dial: '+81',  flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea',           dial: '+82',  flag: '🇰🇷' },
  { code: 'AU', name: 'Australia',             dial: '+61',  flag: '🇦🇺' },
  { code: 'CA', name: 'Canada',               dial: '+1',   flag: '🇨🇦' },
  { code: 'BR', name: 'Brazil',               dial: '+55',  flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico',               dial: '+52',  flag: '🇲🇽' },
  { code: 'RU', name: 'Russia',               dial: '+7',   flag: '🇷🇺' },
  { code: 'IR', name: 'Iran',                 dial: '+98',  flag: '🇮🇷' },
  { code: 'IQ', name: 'Iraq',                 dial: '+964', flag: '🇮🇶' },
  { code: 'SY', name: 'Syria',                dial: '+963', flag: '🇸🇾' },
  { code: 'LB', name: 'Lebanon',              dial: '+961', flag: '🇱🇧' },
  { code: 'JO', name: 'Jordan',               dial: '+962', flag: '🇯🇴' },
  { code: 'MA', name: 'Morocco',              dial: '+212', flag: '🇲🇦' },
  { code: 'DZ', name: 'Algeria',              dial: '+213', flag: '🇩🇿' },
  { code: 'TN', name: 'Tunisia',              dial: '+216', flag: '🇹🇳' },
  { code: 'LY', name: 'Libya',               dial: '+218', flag: '🇱🇾' },
  { code: 'SD', name: 'Sudan',               dial: '+249', flag: '🇸🇩' },
  { code: 'ET', name: 'Ethiopia',            dial: '+251', flag: '🇪🇹' },
  { code: 'TZ', name: 'Tanzania',            dial: '+255', flag: '🇹🇿' },
  { code: 'UG', name: 'Uganda',              dial: '+256', flag: '🇺🇬' },
  { code: 'PH', name: 'Philippines',         dial: '+63',  flag: '🇵🇭' },
  { code: 'ID', name: 'Indonesia',           dial: '+62',  flag: '🇮🇩' },
  { code: 'MY', name: 'Malaysia',            dial: '+60',  flag: '🇲🇾' },
  { code: 'SG', name: 'Singapore',           dial: '+65',  flag: '🇸🇬' },
  { code: 'BD', name: 'Bangladesh',          dial: '+880', flag: '🇧🇩' },
  { code: 'LK', name: 'Sri Lanka',           dial: '+94',  flag: '🇱🇰' },
  { code: 'NP', name: 'Nepal',               dial: '+977', flag: '🇳🇵' },
  { code: 'AF', name: 'Afghanistan',         dial: '+93',  flag: '🇦🇫' },
  { code: 'PL', name: 'Poland',              dial: '+48',  flag: '🇵🇱' },
  { code: 'UA', name: 'Ukraine',             dial: '+380', flag: '🇺🇦' },
  { code: 'RO', name: 'Romania',             dial: '+40',  flag: '🇷🇴' },
  { code: 'SE', name: 'Sweden',              dial: '+46',  flag: '🇸🇪' },
  { code: 'NO', name: 'Norway',              dial: '+47',  flag: '🇳🇴' },
  { code: 'DK', name: 'Denmark',             dial: '+45',  flag: '🇩🇰' },
  { code: 'FI', name: 'Finland',             dial: '+358', flag: '🇫🇮' },
  { code: 'PT', name: 'Portugal',            dial: '+351', flag: '🇵🇹' },
  { code: 'CH', name: 'Switzerland',         dial: '+41',  flag: '🇨🇭' },
  { code: 'AT', name: 'Austria',             dial: '+43',  flag: '🇦🇹' },
  { code: 'BE', name: 'Belgium',             dial: '+32',  flag: '🇧🇪' },
  { code: 'AR', name: 'Argentina',           dial: '+54',  flag: '🇦🇷' },
  { code: 'CL', name: 'Chile',              dial: '+56',  flag: '🇨🇱' },
  { code: 'CO', name: 'Colombia',           dial: '+57',  flag: '🇨🇴' },
  { code: 'VE', name: 'Venezuela',          dial: '+58',  flag: '🇻🇪' },
  { code: 'PE', name: 'Peru',               dial: '+51',  flag: '🇵🇪' },
];

type Country = typeof COUNTRIES[number];

// ─── Phone field with country picker ─────────────────────────────────────────

function PhoneField({
  value, onChangeText, editable,
}: {
  value: string;
  onChangeText: (full: string, number: string, country: Country) => void;
  editable: boolean;
}) {
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
  const [numberOnly, setNumberOnly]           = useState('');
  const [modalVisible, setModalVisible]       = useState(false);
  const [search, setSearch]                   = useState('');
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || !value) return;
    initialized.current = true;
    const found = COUNTRIES.find(c => value.startsWith(c.dial));
    if (found) {
      setSelectedCountry(found);
      setNumberOnly(value.slice(found.dial.length));
    } else {
      setNumberOnly(value.replace(/[^0-9]/g, '').slice(0, 12));
    }
  }, [value]);

  const filtered = useMemo(() =>
    COUNTRIES.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.dial.includes(search)
    ), [search]);

  const handleNumberChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, 12);
    setNumberOnly(digits);
    onChangeText(`${selectedCountry.dial}${digits}`, digits, selectedCountry);
  };

  const handleSelectCountry = (country: Country) => {
    setSelectedCountry(country);
    setModalVisible(false);
    setSearch('');
    onChangeText(`${country.dial}${numberOnly}`, numberOnly, country);
  };

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>Phone Number</Text>
      <View style={[styles.inputRow, !editable && styles.inputRowDisabled]}>
        <TouchableOpacity
          style={styles.dialCodeBtn}
          onPress={() => editable && setModalVisible(true)}
          disabled={!editable}
          activeOpacity={0.7}
        >
          <Text style={styles.dialFlag}>{selectedCountry.flag}</Text>
          <Text style={[styles.dialCode, !editable && { color: '#94a3b8' }]}>
            {selectedCountry.dial}
          </Text>
          {editable && <MaterialIcons name="arrow-drop-down" size={18} color="#94a3b8" />}
        </TouchableOpacity>
        <View style={styles.dialDivider} />
        <TextInput
          style={[styles.textInput, !editable && styles.textInputDisabled]}
          value={numberOnly}
          onChangeText={handleNumberChange}
          editable={editable}
          keyboardType="phone-pad"
          placeholder="Phone number"
          placeholderTextColor="#94a3b8"
        />
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setModalVisible(false)} />
          <View style={styles.countrySheet}>
            <View style={styles.countrySheetHeader}>
              <Text style={styles.countrySheetTitle}>Select Country Code</Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); setSearch(''); }}>
                <MaterialIcons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View style={styles.countrySearch}>
              <MaterialIcons name="search" size={18} color="#94a3b8" />
              <TextInput
                style={styles.countrySearchInput}
                placeholder="Search country…"
                placeholderTextColor="#94a3b8"
                value={search}
                onChangeText={setSearch}
                autoFocus
              />
            </View>
            <FlatList
              data={filtered}
              keyExtractor={item => item.code}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.countryRow, selectedCountry.code === item.code && styles.countryRowActive]}
                  onPress={() => handleSelectCountry(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.countryFlag}>{item.flag}</Text>
                  <Text style={styles.countryName}>{item.name}</Text>
                  <Text style={styles.countryDial}>{item.dial}</Text>
                  {selectedCountry.code === item.code && (
                    <MaterialIcons name="check" size={16} color="#2563eb" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  superadmin:  'Super Admin',
  admin:       'Admin',
  staff:       'Staff',
  customer:    'Customer',
};

const ROLE_COLORS: Record<string, { color: string; bg: string }> = {
  super_admin: { color: '#7c3aed', bg: '#f5f3ff' },
  superadmin:  { color: '#7c3aed', bg: '#f5f3ff' },
  admin:       { color: '#2563eb', bg: '#eff6ff' },
  staff:       { color: '#059669', bg: '#ecfdf5' },
  customer:    { color: '#d97706', bg: '#fffbeb' },
};

// ─── Field ────────────────────────────────────────────────────────────────────

function ProfileField({
  label, value, icon, editable, onChangeText, keyboardType,
}: {
  label: string;
  value: string;
  icon: IconName;
  editable: boolean;
  onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputRow, !editable && styles.inputRowDisabled]}>
        <MaterialIcons name={icon} size={18} color="#94a3b8" />
        <TextInput
          style={[styles.textInput, !editable && styles.textInputDisabled]}
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          keyboardType={keyboardType ?? 'default'}
          autoCapitalize="none"
          placeholderTextColor="#94a3b8"
        />
      </View>
    </View>
  );
}

// ─── Password field ───────────────────────────────────────────────────────────

function PasswordField({
  label, value, onChangeText, visible, onToggle,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <MaterialIcons name="lock-outline" size={18} color="#94a3b8" />
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          placeholder="••••••••"
          placeholderTextColor="#94a3b8"
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={onToggle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name={visible ? 'visibility-off' : 'visibility'} size={18} color="#94a3b8" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Section accordion ────────────────────────────────────────────────────────

function SectionHeader({
  icon, title, subtitle, iconColor, iconBg, open, onToggle,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  iconColor: string;
  iconBg: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity style={styles.sectionHeaderRow} onPress={onToggle} activeOpacity={0.7}>
      <View style={[styles.sectionIconWrap, { backgroundColor: iconBg }]}>
        <MaterialIcons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.sectionHeaderText}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSub}>{subtitle}</Text> : null}
      </View>
      <MaterialIcons name={open ? 'expand-less' : 'expand-more'} size={22} color="#94a3b8" />
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();
  const { role, setRole } = useAppContext();
  const { user, signOut, updateProfile } = useAuth();

  const roleKey    = role ?? 'customer';
  const roleLabel  = ROLE_LABEL[roleKey] ?? 'Customer';
  const roleColors = ROLE_COLORS[roleKey] ?? ROLE_COLORS.customer;

  const fullName  = user?.full_name ?? 'User';
  const email     = user?.email ?? '';
  const nameParts = fullName.trim().split(' ');
  const firstName = nameParts[0] ?? '';
  const lastName  = nameParts.slice(1).join(' ') || '';
  const rawInitials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
  const initials = rawInitials || fullName[0]?.toUpperCase() || 'U';

  const [openSection, setOpenSection] = useState<'personal' | 'notifications' | 'security' | null>('personal');
  const toggle = (s: 'personal' | 'notifications' | 'security') =>
    setOpenSection(prev => (prev === s ? null : s));

  const [isEditing, setIsEditing] = useState(false);
  const [hasDraft, setHasDraft]   = useState(false);
  const [form, setForm] = useState({
    firstName,
    lastName,
    email,
    phone: '',
  });

  const DRAFT_KEY = `profile_draft_${user?.id ?? 'unknown'}`;

  useEffect(() => {
    if (user) {
      const parts = (user.full_name ?? '').trim().split(' ');
      const base = {
        firstName: parts[0] ?? '',
        lastName: parts.slice(1).join(' ') || '',
        email: user.email ?? '',
        phone: '',
      };
      AsyncStorage.getItem(DRAFT_KEY).then(raw => {
        if (raw) {
          try {
            const draft = JSON.parse(raw);
            setForm({ ...base, ...draft });
            setHasDraft(true);
          } catch {
            setForm(base);
          }
        } else {
          setForm(base);
        }
      });
    }
  }, [user]);

  const [notifPrefs, setNotifPrefs] = useState({
    queueUpdates:  true,
    appointments:  true,
    systemAlerts:  true,
    emailDigest:   false,
  });

  const [saving, setSaving] = useState(false);

  const [showPwSection, setShowPwSection] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwVisible, setPwVisible] = useState({ current: false, next: false, confirm: false });

  const handleConfirm = useCallback(async () => {
    try {
      await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({
        firstName: form.firstName,
        lastName:  form.lastName,
        phone:     form.phone,
      }));
    } catch {}
    setHasDraft(true);
    setIsEditing(false);
  }, [DRAFT_KEY, form]);

  const handleSave = useCallback(async () => {
    if (!form.firstName.trim()) {
      Alert.alert('Error', 'Name cannot be empty.');
      return;
    }
    setSaving(true);
    const { error } = await updateProfile({
      full_name: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
      email: form.email.trim(),
    });
    setSaving(false);
    if (error) {
      Alert.alert('Error', error);
      return;
    }
    try { await AsyncStorage.removeItem(DRAFT_KEY); } catch {}
    setHasDraft(false);
    setIsEditing(false);
    Alert.alert('Saved', 'Profile updated successfully.');
  }, [DRAFT_KEY, form, updateProfile]);

  const handleCancel = useCallback(async () => {
    if (hasDraft) {
      try {
        const raw = await AsyncStorage.getItem(DRAFT_KEY);
        if (raw) {
          const draft = JSON.parse(raw);
          setForm(prev => ({ ...prev, ...draft }));
        }
      } catch {}
    } else if (user) {
      const parts = (user.full_name ?? '').trim().split(' ');
      setForm({
        firstName: parts[0] ?? '',
        lastName:  parts.slice(1).join(' ') || '',
        email:     user.email ?? '',
        phone:     '',
      });
    }
    setIsEditing(false);
  }, [DRAFT_KEY, hasDraft, user]);

  const handleDiscardDraft = useCallback(async () => {
    try { await AsyncStorage.removeItem(DRAFT_KEY); } catch {}
    setHasDraft(false);
    if (user) {
      const parts = (user.full_name ?? '').trim().split(' ');
      setForm({
        firstName: parts[0] ?? '',
        lastName:  parts.slice(1).join(' ') || '',
        email:     user.email ?? '',
        phone:     '',
      });
    }
  }, [DRAFT_KEY, user]);

  const handleChangePassword = async () => {
    if (!pwForm.current.trim()) { Alert.alert('Error', 'Enter your current password.'); return; }
    if (pwForm.next.length < 6)  { Alert.alert('Error', 'New password must be at least 6 characters.'); return; }
    if (pwForm.next !== pwForm.confirm) { Alert.alert('Error', 'Passwords do not match.'); return; }
    setSaving(true);
    const { error } = await api.post('/accounts/change-password/', {
      current_password: pwForm.current,
      new_password:     pwForm.next,
    });
    setSaving(false);
    if (error) { Alert.alert('Error', error); return; }
    setPwForm({ current: '', next: '', confirm: '' });
    setShowPwSection(false);
    Alert.alert('Success', 'Password changed successfully.');
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      if (!window.confirm('Are you sure you want to sign out?')) return;
      await signOut();
      setRole(null);
      router.replace('/login' as any);
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out', style: 'destructive',
          onPress: async () => {
            await signOut();
            setRole(null);
            router.replace('/login' as any);
          },
        },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <SQMSHeader />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Page header */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>My Profile</Text>
          <Text style={styles.pageSubtitle}>Manage your account settings</Text>
        </View>

        {/* Avatar card */}
        <View style={styles.avatarCard}>
          <View style={[styles.avatar, { backgroundColor: roleColors.color }]}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
          <Text style={styles.avatarName}>{fullName}</Text>
          <Text style={styles.avatarEmail}>{email}</Text>
          <View style={[styles.roleBadge, { backgroundColor: roleColors.bg }]}>
            <MaterialIcons name="shield" size={13} color={roleColors.color} />
            <Text style={[styles.roleBadgeText, { color: roleColors.color }]}>{roleLabel}</Text>
          </View>
        </View>

        {/* Personal Info */}
        <View style={styles.section}>
          <SectionHeader
            icon="person"
            title="Personal Information"
            subtitle="Name, email, phone"
            iconColor="#2563eb"
            iconBg="#eff6ff"
            open={openSection === 'personal'}
            onToggle={() => toggle('personal')}
          />
          {openSection === 'personal' && (
            <View style={styles.sectionBody}>
              <View style={styles.sectionBodyHeader}>
                {!isEditing ? (
                  <View style={styles.editActionRow}>
                    {hasDraft && (
                      <TouchableOpacity style={[styles.editBtn, { backgroundColor: '#059669' }]} onPress={handleSave}>
                        <MaterialIcons name="save" size={14} color="#fff" />
                        <Text style={styles.editBtnText}>Save</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)}>
                      <MaterialIcons name="edit" size={14} color="#fff" />
                      <Text style={styles.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.editActionRow}>
                    <TouchableOpacity style={[styles.editBtn, { backgroundColor: '#059669', opacity: saving ? 0.6 : 1 }]} onPress={handleSave} disabled={saving}>
                      <MaterialIcons name="check" size={14} color="#fff" />
                      <Text style={styles.editBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.editBtn, { backgroundColor: '#2563eb' }]} onPress={handleConfirm}>
                      <MaterialIcons name="bookmark" size={14} color="#fff" />
                      <Text style={styles.editBtnText}>Confirm</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.editBtn, { backgroundColor: '#94a3b8' }]} onPress={handleCancel}>
                      <MaterialIcons name="close" size={14} color="#fff" />
                      <Text style={styles.editBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {hasDraft && !isEditing && (
                <View style={styles.draftBanner}>
                  <MaterialIcons name="info-outline" size={14} color="#d97706" />
                  <Text style={styles.draftBannerText}>Unsaved changes — tap Save to apply</Text>
                  <TouchableOpacity onPress={handleDiscardDraft} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialIcons name="close" size={14} color="#d97706" />
                  </TouchableOpacity>
                </View>
              )}

              <ProfileField label="First Name"    value={form.firstName} icon="person"    editable={isEditing} onChangeText={v => setForm(p => ({ ...p, firstName: v }))} />
              <ProfileField label="Last Name"     value={form.lastName}  icon="person"    editable={isEditing} onChangeText={v => setForm(p => ({ ...p, lastName: v }))} />
              <ProfileField label="Email Address" value={form.email}     icon="email"     editable={isEditing} onChangeText={v => setForm(p => ({ ...p, email: v }))} keyboardType="email-address" />
              <PhoneField value={form.phone} onChangeText={(full) => setForm(p => ({ ...p, phone: full }))} editable={isEditing} />
              <ProfileField label="Role"          value={roleLabel}      icon="admin-panel-settings" editable={false} onChangeText={() => {}} />
            </View>
          )}
        </View>

        {/* Notification Preferences */}
        <View style={styles.section}>
          <SectionHeader
            icon="notifications"
            title="Notifications"
            subtitle="Alerts and preferences"
            iconColor="#7c3aed"
            iconBg="#f5f3ff"
            open={openSection === 'notifications'}
            onToggle={() => toggle('notifications')}
          />
          {openSection === 'notifications' && (
            <View style={styles.sectionBody}>
              {(
                [
                  { key: 'queueUpdates',  label: 'Queue Updates',    sub: 'Alerts when your position changes' },
                  { key: 'appointments',  label: 'Appointments',     sub: 'Reminders for upcoming bookings'  },
                  { key: 'systemAlerts',  label: 'System Alerts',    sub: 'Important service notifications'  },
                  { key: 'emailDigest',   label: 'Email Digest',     sub: 'Weekly summary to your inbox'     },
                ] as const
              ).map(item => (
                <TouchableOpacity
                  key={item.key}
                  style={styles.toggleRow}
                  onPress={() => setNotifPrefs(p => ({ ...p, [item.key]: !p[item.key] }))}
                  activeOpacity={0.7}
                >
                  <View style={styles.toggleText}>
                    <Text style={styles.toggleLabel}>{item.label}</Text>
                    <Text style={styles.toggleSub}>{item.sub}</Text>
                  </View>
                  <View style={[styles.toggle, notifPrefs[item.key] && styles.toggleOn]}>
                    <View style={[styles.toggleThumb, notifPrefs[item.key] && styles.toggleThumbOn]} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Security */}
        <View style={styles.section}>
          <SectionHeader
            icon="lock"
            title="Security"
            subtitle="Password and account security"
            iconColor="#d97706"
            iconBg="#fffbeb"
            open={openSection === 'security'}
            onToggle={() => toggle('security')}
          />
          {openSection === 'security' && (
            <View style={styles.sectionBody}>
              {!showPwSection ? (
                <TouchableOpacity style={styles.changePwBtn} onPress={() => setShowPwSection(true)}>
                  <MaterialIcons name="lock-outline" size={16} color="#2563eb" />
                  <Text style={[styles.changePwBtnText, { flex: 1 }]}>Change Password</Text>
                  <MaterialIcons name="chevron-right" size={18} color="#2563eb" />
                </TouchableOpacity>
              ) : (
                <>
                  <PasswordField label="Current Password" value={pwForm.current} onChangeText={v => setPwForm(p => ({ ...p, current: v }))} visible={pwVisible.current} onToggle={() => setPwVisible(p => ({ ...p, current: !p.current }))} />
                  <PasswordField label="New Password"     value={pwForm.next}    onChangeText={v => setPwForm(p => ({ ...p, next: v }))}    visible={pwVisible.next}    onToggle={() => setPwVisible(p => ({ ...p, next: !p.next }))} />
                  <PasswordField label="Confirm Password" value={pwForm.confirm} onChangeText={v => setPwForm(p => ({ ...p, confirm: v }))} visible={pwVisible.confirm} onToggle={() => setPwVisible(p => ({ ...p, confirm: !p.confirm }))} />
                  <View style={styles.pwBtnRow}>
                    <TouchableOpacity style={[styles.pwSaveBtn, saving && { opacity: 0.6 }]} onPress={handleChangePassword} disabled={saving}>
                      <Text style={styles.pwSaveBtnText}>{saving ? 'Saving…' : 'Save Password'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.pwCancelBtn} onPress={() => { setShowPwSection(false); setPwForm({ current: '', next: '', confirm: '' }); }}>
                      <Text style={styles.pwCancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          )}
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <MaterialIcons name="logout" size={20} color="#fff" />
          <Text style={styles.signOutBtnText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, gap: 16, paddingBottom: 24 },

  pageHeader: { paddingTop: 8, paddingBottom: 4, gap: 4 },
  pageTitle: { fontSize: 28, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 15, color: '#64748b', fontWeight: '500', lineHeight: 22 },

  // Avatar card
  avatarCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 24,
    alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#0f172a', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  avatarInitials: { fontSize: 32, fontWeight: '900', color: '#fff' },
  avatarName:  { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  avatarEmail: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, marginTop: 4,
  },
  roleBadgeText: { fontSize: 12, fontWeight: '700' },

  // Section card
  section: {
    backgroundColor: '#fff', borderRadius: 20,
    borderWidth: 1, borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#0f172a', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16,
  },
  sectionIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionHeaderText: { flex: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  sectionSub: { fontSize: 12, color: '#94a3b8', fontWeight: '500', marginTop: 1 },

  sectionBody: {
    paddingHorizontal: 16, paddingBottom: 16, gap: 0,
    borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  sectionBodyHeader: {
    flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 12, paddingBottom: 4,
  },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
  },
  editBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  editActionRow: { flexDirection: 'row', gap: 8 },
  draftBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fffbeb', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#fde68a', marginBottom: 8 },
  draftBannerText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#d97706' },

  // Fields
  fieldGroup: { marginBottom: 10, marginTop: 4 },
  fieldLabel: {
    fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 6,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  inputRowDisabled: { backgroundColor: '#f8fafc' },
  textInput: { flex: 1, fontSize: 14, color: '#0f172a', fontWeight: '600' },
  textInputDisabled: { color: '#64748b' },

  // Toggle rows
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  toggleText: { flex: 1 },
  toggleLabel: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  toggleSub: { fontSize: 12, color: '#94a3b8', fontWeight: '500', marginTop: 2 },
  toggle: {
    width: 44, height: 24, borderRadius: 12, backgroundColor: '#e2e8f0',
    justifyContent: 'center', padding: 2,
  },
  toggleOn: { backgroundColor: '#2563eb' },
  toggleThumb: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 2, elevation: 2,
  },
  toggleThumbOn: { alignSelf: 'flex-end' },

  // Change password
  changePwBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#eff6ff', borderRadius: 12, padding: 14, marginTop: 8,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  changePwBtnText: { fontSize: 14, fontWeight: '700', color: '#2563eb' },

  // Password buttons
  pwBtnRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  pwSaveBtn: { flex: 1, backgroundColor: '#2563eb', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  pwSaveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  pwCancelBtn: { flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  pwCancelBtnText: { fontSize: 14, fontWeight: '700', color: '#64748b' },

  // Country code picker
  dialCodeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 8 },
  dialFlag: { fontSize: 18 },
  dialCode: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  dialDivider: { width: 1, height: 20, backgroundColor: '#e2e8f0', marginRight: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  countrySheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '75%' as any, padding: 20 },
  countrySheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  countrySheetTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  countrySearch: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  countrySearchInput: { flex: 1, fontSize: 14, color: '#0f172a' },
  countryRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  countryRowActive: { backgroundColor: '#eff6ff', borderRadius: 10, paddingHorizontal: 8 },
  countryFlag: { fontSize: 22 },
  countryName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0f172a' },
  countryDial: { fontSize: 13, color: '#64748b', fontWeight: '600', marginRight: 4 },

  // Sign out
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#e11d48', paddingVertical: 16, borderRadius: 18,
    shadowColor: '#e11d48', shadowOpacity: 0.2, shadowRadius: 8, elevation: 3,
  },
  signOutBtnText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },
});
