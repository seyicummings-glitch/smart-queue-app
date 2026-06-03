import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import BottomNav from '@/components/BottomNav';
import { api, clearCache } from '@/lib/api';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

type IndustryControl = {
  id: number;
  industry: string;   // e.g. "banking"
  label: string;
  is_visible: boolean;
};

const INDUSTRY_META: Record<string, { icon: IconName; color: string; bg: string; desc: string }> = {
  banking:    { icon: 'account-balance', color: '#2563eb', bg: '#eff6ff', desc: 'Teller services, loans, account opening & card services.' },
  healthcare: { icon: 'favorite',        color: '#e11d48', bg: '#fff1f2', desc: 'Clinics, pharmacy pickups, lab tests & specialist consults.' },
  retail:     { icon: 'shopping-bag',    color: '#d97706', bg: '#fffbeb', desc: 'Returns, exchanges, tech support & click & collect.' },
  government: { icon: 'gavel',           color: '#475569', bg: '#f1f5f9', desc: 'Document processing, permits, licenses & ID renewals.' },
  education:  { icon: 'school',          color: '#4f46e5', bg: '#eef2ff', desc: 'Admissions, registrar, financial aid & library services.' },
  corporate:  { icon: 'business',        color: '#0d9488', bg: '#f0fdfa', desc: 'Reception, HR services, IT support & facilities.' },
};

export default function IndustrySelection() {
  const router = useRouter();

  const [controls,   setControls]   = useState<IndustryControl[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling,   setToggling]   = useState<string | null>(null);

  const fetchControls = useCallback(async () => {
    const { data, error } = await api.get<IndustryControl[]>('/businesses/industry-controls/', true, true);
    if (error) Alert.alert('Error loading industries', error);
    else if (data) setControls(Array.isArray(data) ? data : []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchControls(); }, [fetchControls]);

  const onRefresh = useCallback(() => {
    clearCache();
    setRefreshing(true);
    fetchControls();
  }, [fetchControls]);

  const toggleIndustry = async (ctrl: IndustryControl) => {
    setToggling(ctrl.industry);
    const newVal = !ctrl.is_visible;
    const { error } = await api.patch(
      `/businesses/industry-controls/${ctrl.industry}/`,
      { is_visible: newVal },
    );
    if (error) {
      Alert.alert('Error', error);
    } else {
      clearCache();
      setControls(prev =>
        prev.map(c => c.industry === ctrl.industry ? { ...c, is_visible: newVal } : c)
      );
    }
    setToggling(null);
  };

  const visibleCount = controls.filter(c => c.is_visible).length;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/admin/dashboard' as any)} style={s.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>All Businesses</Text>
        <TouchableOpacity style={s.refreshBtn} onPress={onRefresh} disabled={refreshing}>
          {refreshing
            ? <ActivityIndicator size="small" color="#2563eb" />
            : <MaterialIcons name="refresh" size={22} color="#64748b" />
          }
        </TouchableOpacity>
      </View>

      {/* Subtitle banner */}
      <View style={s.banner}>
        <MaterialIcons name="visibility" size={18} color="#4f46e5" />
        <View style={{ flex: 1 }}>
          <Text style={s.bannerTitle}>Customer-Visible Industries</Text>
          <Text style={s.bannerSub}>
            Tap any industry to turn it ON or OFF for customers.
            {visibleCount > 0 ? `  ${visibleCount} of ${controls.length} active.` : ''}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={s.loadingTxt}>Loading industries…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4f46e5']} />}
        >
          {controls.length === 0 ? (
            <View style={s.empty}>
              <MaterialIcons name="category" size={52} color="#e2e8f0" />
              <Text style={s.emptyTitle}>No industries found</Text>
              <Text style={s.emptySub}>Pull down to refresh or check server connection.</Text>
            </View>
          ) : (
            controls.map(ctrl => {
              const meta   = INDUSTRY_META[ctrl.industry];
              const isOn   = ctrl.is_visible;
              const isBusy = toggling === ctrl.industry;
              const color  = meta?.color ?? '#6B7280';
              const bg     = meta?.bg    ?? '#f1f5f9';
              const icon   = meta?.icon  ?? 'business';
              const desc   = meta?.desc  ?? '';

              return (
                <TouchableOpacity
                  key={ctrl.industry}
                  style={[s.card, { borderColor: isOn ? color : '#e2e8f0' }, isOn && s.cardOn]}
                  onPress={() => toggleIndustry(ctrl)}
                  disabled={isBusy}
                  activeOpacity={0.8}
                >
                  {/* Left icon */}
                  <View style={[s.iconBox, { backgroundColor: isOn ? bg : '#f8fafc' }]}>
                    {isBusy
                      ? <ActivityIndicator size="small" color={color} />
                      : <MaterialIcons name={icon} size={26} color={isOn ? color : '#94a3b8'} />
                    }
                  </View>

                  {/* Text */}
                  <View style={s.cardBody}>
                    <Text style={[s.cardLabel, !isOn && { color: '#94a3b8' }]}>{ctrl.label}</Text>
                    <Text style={s.cardDesc} numberOfLines={2}>{desc}</Text>
                  </View>

                  {/* Toggle pill */}
                  <View style={[s.togglePill, { backgroundColor: isOn ? color : '#e2e8f0' }]}>
                    <View style={[s.toggleDot, isOn ? s.toggleDotOn : s.toggleDotOff]} />
                    <Text style={[s.toggleTxt, { color: isOn ? '#fff' : '#94a3b8' }]}>
                      {isBusy ? '…' : isOn ? 'ON' : 'OFF'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      <BottomNav />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  backBtn:    { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', flex: 1, textAlign: 'center' },
  refreshBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  banner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#eef2ff', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#c7d2fe',
  },
  bannerTitle: { fontSize: 13, fontWeight: '800', color: '#4f46e5' },
  bannerSub:   { fontSize: 12, color: '#6366f1', fontWeight: '500', marginTop: 2 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingTxt: { fontSize: 13, color: '#64748b', fontWeight: '600' },

  content: { padding: 16, gap: 12, paddingBottom: 32 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 18, padding: 16,
    borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  cardOn: {
    shadowColor: '#4f46e5', shadowOpacity: 0.08,
    shadowRadius: 8, elevation: 3,
  },
  iconBox: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardLabel: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 3 },
  cardDesc:  { fontSize: 12, color: '#64748b', fontWeight: '500', lineHeight: 17 },

  togglePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    minWidth: 58, justifyContent: 'center',
  },
  toggleDot:    { width: 8, height: 8, borderRadius: 4 },
  toggleDotOn:  { backgroundColor: 'rgba(255,255,255,0.9)' },
  toggleDotOff: { backgroundColor: '#94a3b8' },
  toggleTxt:    { fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#64748b' },
  emptySub:   { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
});
