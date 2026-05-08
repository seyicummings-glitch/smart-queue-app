import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import SQMSHeader from '@/components/SQMSHeader';
import BottomNav from '@/components/BottomNav';

type Industry = {
  id: string;
  name: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  color: string;
  bg: string;
  border: string;
  desc: string;
};

const INDUSTRIES: Industry[] = [
  {
    id: 'banking',
    name: 'Banking & Finance',
    icon: 'account-balance',
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
    desc: 'Account services, loans, investments',
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    icon: 'favorite',
    color: '#e11d48',
    bg: '#fff1f2',
    border: '#fecaca',
    desc: 'Medical appointments, consultations',
  },
  {
    id: 'retail',
    name: 'Retail',
    icon: 'shopping-bag',
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    desc: 'Customer service, returns, support',
  },
  {
    id: 'government',
    name: 'Government Services',
    icon: 'gavel',
    color: '#475569',
    bg: '#f1f5f9',
    border: '#cbd5e1',
    desc: 'Public services, permits, documentation',
  },
  {
    id: 'education',
    name: 'Education',
    icon: 'school',
    color: '#4f46e5',
    bg: '#eef2ff',
    border: '#c7d2fe',
    desc: 'Admissions, counseling, registration',
  },
  {
    id: 'corporate',
    name: 'Corporate Office',
    icon: 'business',
    color: '#0d9488',
    bg: '#f0fdfa',
    border: '#99f6e4',
    desc: 'HR, IT support, facilities',
  },
];

export default function CustomerHome() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <SQMSHeader />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Choose a Business</Text>
          <Text style={styles.pageSubtitle}>Pick a service that makes your day simpler</Text>
        </View>

        <View style={styles.grid}>
          {INDUSTRIES.map(ind => (
            <TouchableOpacity
              key={ind.id}
              style={styles.card}
              onPress={() => router.push(`/customer/service/${ind.id}` as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconWrap, { backgroundColor: ind.bg, borderColor: ind.border }]}>
                <MaterialIcons name={ind.icon} size={24} color={ind.color} />
              </View>
              <View style={styles.cardTextWrap}>
                <Text style={styles.cardName}>{ind.name}</Text>
                <Text style={styles.cardDesc}>{ind.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 24,
  },
  pageHeader: {
    paddingTop: 8,
    paddingBottom: 4,
    gap: 4,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
    lineHeight: 22,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '47.5%',
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    gap: 12,
    alignItems: 'flex-start',
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cardTextWrap: {
    flex: 1,
    gap: 4,
  },
  cardName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 18,
  },
  cardDesc: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    lineHeight: 16,
  },
});
