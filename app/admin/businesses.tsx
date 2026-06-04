import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import BottomNav from '@/components/BottomNav';
import { api, clearCache } from '@/lib/api';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

type IndustryControl = {
  id: number;
  industry: string;
  label: string;
  is_visible: boolean;
};

const INDUSTRY_META: Record<string, { icon: IconName; color: string }> = {
  banking:    { icon: 'account-balance', color: '#2563eb' },
  healthcare: { icon: 'favorite',        color: '#e11d48' },
  retail:     { icon: 'shopping-bag',    color: '#d97706' },
  government: { icon: 'gavel',           color: '#475569' },
  education:  { icon: 'school',          color: '#4f46e5' },
  corporate:  { icon: 'business',        color: '#0d9488' },
};

export default function Businesses() {
  const router = useRouter();

  const [controls,   setControls]   = useState<IndustryControl[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling,   setToggling]   = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    const { data } = await api.get<IndustryControl[]>('/businesses/industry-controls/');
    setControls(Array.isArray(data) ? data : []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const onRefresh = useCallback(() => {
    clearCache();
    setRefreshing(true);
    fetchAll();
  }, [fetchAll]);

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

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/admin/dashboard' as any)} style={s.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>All Businesses</Text>
        <TouchableOpacity style={s.refreshBtn} onPress={onRefresh} disabled={refreshing}>
          {refreshing
            ? <ActivityIndicator size="small" color="#059669" />
            : <MaterialIcons name="refresh" size={22} color="#64748b" />
          }
        </TouchableOpacity>
      </View>

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
          <View style={s.sectionCard}>
            <View style={s.sectionRow}>
              <MaterialIcons name="category" size={18} color="#4f46e5" />
              <Text style={s.sectionTitle}>Customer Industry Access</Text>
            </View>
            <Text style={s.sectionSub}>
              Choose which industries customers can see and use in the app.
            </Text>

            <View style={s.gridWrap}>
              {controls.map(ctrl => {
                const meta   = INDUSTRY_META[ctrl.industry];
                const icon   = meta?.icon  ?? 'business';
                const color  = meta?.color ?? '#6B7280';
                const isOn   = ctrl.is_visible;
                const isBusy = toggling === ctrl.industry;
                return (
                  <TouchableOpacity
                    key={ctrl.industry}
                    style={[s.tile, { borderColor: isOn ? color : '#e2e8f0' }]}
                    onPress={() => toggleIndustry(ctrl)}
                    disabled={isBusy}
                    activeOpacity={0.8}
                  >
                    <View style={[s.tileIcon, { backgroundColor: color + '18' }]}>
                      {isBusy
                        ? <ActivityIndicator size="small" color={color} />
                        : <MaterialIcons name={icon} size={22} color={color} />
                      }
                    </View>
                    <Text style={[s.tileLabel, { color: isOn ? '#0f172a' : '#94a3b8' }]}>
                      {ctrl.label}
                    </Text>
                    <View style={[s.badge, { backgroundColor: isOn ? '#ecfdf5' : '#f1f5f9' }]}>
                      <View style={[s.badgeDot, { backgroundColor: isOn ? '#059669' : '#94a3b8' }]} />
                      <Text style={[s.badgeTxt, { color: isOn ? '#059669' : '#94a3b8' }]}>
                        {isOn ? 'ON' : 'OFF'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>
      )}

      <BottomNav />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f8fafc' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backBtn:      { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  refreshBtn:   { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { fontSize: 18, fontWeight: '800', color: '#0f172a', flex: 1, textAlign: 'center' },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:      { padding: 16, gap: 14, paddingBottom: 40 },
  sectionCard:  { backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', gap: 10 },
  sectionRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  sectionSub:   { fontSize: 12, color: '#64748b', fontWeight: '500' },
  gridWrap:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile:         { width: '47%', borderRadius: 16, borderWidth: 1.5, backgroundColor: '#fff', padding: 14, alignItems: 'center', gap: 8 },
  tileIcon:     { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  tileLabel:    { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  badge:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  badgeDot:     { width: 6, height: 6, borderRadius: 999 },
  badgeTxt:     { fontSize: 10, fontWeight: '800' },
});
