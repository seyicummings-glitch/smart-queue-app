import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

type Industry = {
  id: string;
  name: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  color: string;
  bg: string;
  border: string;
};

const INDUSTRIES: Industry[] = [
  { id: 'banking',    name: 'Banking',    icon: 'account-balance', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  { id: 'healthcare', name: 'Healthcare', icon: 'local-hospital',  color: '#e11d48', bg: '#fff1f2', border: '#fecaca' },
  { id: 'retail',     name: 'Retail',     icon: 'shopping-bag',    color: '#d97706', bg: '#fffbeb', border: '#fed7aa' },
  { id: 'government', name: 'Government', icon: 'gavel',           color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' },
  { id: 'education',  name: 'Education',  icon: 'school',          color: '#0d9488', bg: '#f0fdfa', border: '#99f6e4' },
  { id: 'corporate',  name: 'Corporate',  icon: 'business',        color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
];

export default function CustomerIndustries() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Service</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Where do you need to go?</Text>
        <Text style={styles.subheading}>Choose an industry to join the queue.</Text>

        <View style={styles.grid}>
          {INDUSTRIES.map(ind => (
            <TouchableOpacity
              key={ind.id}
              style={[styles.card, { borderColor: ind.border }]}
              onPress={() => router.push(`/customer/service/${ind.id}` as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconWrap, { backgroundColor: ind.bg }]}>
                <MaterialIcons name={ind.icon} size={28} color={ind.color} />
              </View>
              <Text style={styles.cardName}>{ind.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },

  content: { padding: 20, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: '900', color: '#0f172a', marginBottom: 6 },
  subheading: { fontSize: 13, color: '#64748b', fontWeight: '500', marginBottom: 24 },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  card: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },
});
