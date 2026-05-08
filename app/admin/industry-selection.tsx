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
import { useRouter, usePathname } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

type Industry = {
  slug: string;
  label: string;
  icon: string;
  desc: string;
  color: string;
  bg: string;
  border: string;
};

const INDUSTRIES: Industry[] = [
  {
    slug: 'banking-finance',
    label: 'Banking & Finance',
    icon: 'account-balance',
    desc: 'Manage queues for banking services, loan counters, and investment desks.',
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
  },
  {
    slug: 'healthcare',
    label: 'Healthcare',
    icon: 'local-hospital',
    desc: 'Streamline patient flow for clinics, hospitals, and pharmacies.',
    color: '#059669',
    bg: '#ecfdf5',
    border: '#a7f3d0',
  },
  {
    slug: 'retail',
    label: 'Retail',
    icon: 'shopping-bag',
    desc: 'Optimise customer service queues for retail stores and supermarkets.',
    color: '#f97316',
    bg: '#fff7ed',
    border: '#fed7aa',
  },
  {
    slug: 'government',
    label: 'Government Services',
    icon: 'business',
    desc: 'Manage citizen service queues for government offices and agencies.',
    color: '#475569',
    bg: '#f1f5f9',
    border: '#cbd5e1',
  },
  {
    slug: 'education',
    label: 'Education',
    icon: 'school',
    desc: 'Handle student enrollment, advising, and records queues.',
    color: '#4f46e5',
    bg: '#eef2ff',
    border: '#c7d2fe',
  },
  {
    slug: 'corporate',
    label: 'Corporate Office',
    icon: 'work',
    desc: 'Coordinate visitor check-in, HR, and IT support queues.',
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
  },
];

export default function IndustrySelection() {
  const router = useRouter();
  const pathname = usePathname();

  const isSupport = pathname.includes('support');

  const handleSelect = (slug: string) => {
    if (isSupport) {
      router.push(`/admin/support/${slug}` as any);
    } else {
      router.push(`/admin/${slug}` as any);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={16} color="#64748b" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Select Industry</Text>
        <Text style={styles.subtitle}>
          {isSupport
            ? 'Choose an industry to view support details.'
            : 'Choose an industry to manage its admin panel.'}
        </Text>
      </View>

      {/* Grid */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {INDUSTRIES.map(ind => (
            <TouchableOpacity
              key={ind.slug}
              style={[styles.card, { borderColor: ind.border }]}
              activeOpacity={0.8}
              onPress={() => handleSelect(ind.slug)}
            >
              {/* Icon */}
              <View style={[styles.iconWrap, { backgroundColor: ind.bg }]}>
                <MaterialIcons name={ind.icon as any} size={26} color={ind.color} />
              </View>

              {/* Label */}
              <Text style={styles.cardLabel}>{ind.label}</Text>

              {/* Description */}
              <Text style={styles.cardDesc} numberOfLines={3}>
                {ind.desc}
              </Text>

              {/* Chevron */}
              <View style={[styles.chevronWrap, { backgroundColor: ind.bg }]}>
                <MaterialIcons name="chevron-right" size={18} color={ind.color} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  // ── Header ──────────────────────────────────────────────
  header: {
    backgroundColor: '#fff',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  backText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '700',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 19,
  },

  // ── Grid ─────────────────────────────────────────────────
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  card: {
    width: '47.5%',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderRadius: 24,
    padding: 18,
  },
  iconWrap: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
    lineHeight: 19,
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
    lineHeight: 16,
    marginBottom: 14,
    flexGrow: 1,
  },
  chevronWrap: {
    alignSelf: 'flex-end',
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Spacer ───────────────────────────────────────────────
  bottomSpacer: {
    height: 20,
  },
});
