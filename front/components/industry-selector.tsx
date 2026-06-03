import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Industry = {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  color: string;
};

export type IndustrySelectorProps = {
  onSelect: (industry: Industry) => void;
  onClose?: () => void;
  showClose?: boolean;
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const INDUSTRIES: Industry[] = [
  {
    id: 'banking',
    name: 'Banking & Finance',
    description: 'Banks, credit unions, and financial institutions',
    icon: 'account-balance',
    color: '#2563eb',
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    description: 'Hospitals, clinics, and medical facilities',
    icon: 'favorite',
    color: '#dc2626',
  },
  {
    id: 'retail',
    name: 'Retail',
    description: 'Stores, shops, and retail outlets',
    icon: 'shopping-bag',
    color: '#9333ea',
  },
  {
    id: 'government',
    name: 'Government',
    description: 'Government offices and public services',
    icon: 'business',
    color: '#0d9488',
  },
  {
    id: 'education',
    name: 'Education',
    description: 'Schools, universities, and learning centres',
    icon: 'school',
    color: '#ea580c',
  },
  {
    id: 'corporate',
    name: 'Corporate',
    description: 'Offices, enterprises, and corporate services',
    icon: 'work',
    color: '#475569',
  },
];

// Icon background colors keyed by industry id
const ICON_BG: Record<string, string> = {
  banking: '#2563eb',
  healthcare: '#dc2626',
  retail: '#9333ea',
  government: '#0d9488',
  education: '#ea580c',
  corporate: '#475569',
};

// Card selection highlight colors
const CARD_SELECTED_BG: Record<string, string> = {
  banking: '#eff6ff',
  healthcare: '#fef2f2',
  retail: '#faf5ff',
  government: '#f0fdfa',
  education: '#fff7ed',
  corporate: '#f8fafc',
};

const CARD_SELECTED_BORDER: Record<string, string> = {
  banking: '#2563eb',
  healthcare: '#dc2626',
  retail: '#9333ea',
  government: '#0d9488',
  education: '#ea580c',
  corporate: '#475569',
};

// ─── Industry Card ────────────────────────────────────────────────────────────

type IndustryCardProps = {
  industry: Industry;
  selected: boolean;
  onPress: () => void;
};

function IndustryCard({ industry, selected, onPress }: IndustryCardProps) {
  const iconBg = ICON_BG[industry.id] ?? '#2563eb';
  const selectedBg = CARD_SELECTED_BG[industry.id] ?? '#eff6ff';
  const selectedBorder = CARD_SELECTED_BORDER[industry.id] ?? '#2563eb';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        selected && {
          backgroundColor: selectedBg,
          borderColor: selectedBorder,
          borderWidth: 2,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Selection checkmark */}
      {selected && (
        <View style={[styles.checkBadge, { backgroundColor: selectedBorder }]}>
          <MaterialIcons name="check" size={12} color="#fff" />
        </View>
      )}

      {/* Icon box */}
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        <MaterialIcons name={industry.icon} size={26} color="#fff" />
      </View>

      {/* Text */}
      <Text style={[styles.cardName, selected && { color: selectedBorder }]} numberOfLines={2}>
        {industry.name}
      </Text>
      <Text style={styles.cardDesc} numberOfLines={2}>
        {industry.description}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function IndustrySelector({ onSelect, onClose, showClose = true }: IndustrySelectorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedIndustry = INDUSTRIES.find(i => i.id === selectedId) ?? null;

  const handleConfirm = () => {
    if (selectedIndustry) {
      onSelect(selectedIndustry);
    }
  };

  // Pair industries into rows of 2
  const rows: Industry[][] = [];
  for (let i = 0; i < INDUSTRIES.length; i += 2) {
    rows.push(INDUSTRIES.slice(i, i + 2));
  }

  return (
    <Modal
      visible
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitles}>
            <Text style={styles.headerTitle}>Select Your Industry</Text>
            <Text style={styles.headerSub}>
              Choose the industry that best describes your business
            </Text>
          </View>
          {showClose && onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
              <MaterialIcons name="close" size={20} color="#475569" />
            </TouchableOpacity>
          )}
        </View>

        {/* Grid */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {rows.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.row}>
              {row.map(industry => (
                <IndustryCard
                  key={industry.id}
                  industry={industry}
                  selected={selectedId === industry.id}
                  onPress={() => setSelectedId(industry.id)}
                />
              ))}
              {/* Spacer when odd number */}
              {row.length === 1 && <View style={styles.cardSpacer} />}
            </View>
          ))}
          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Confirm button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.confirmButton, !selectedId && styles.confirmButtonDisabled]}
            onPress={handleConfirm}
            activeOpacity={selectedId ? 0.85 : 1}
            disabled={!selectedId}
          >
            <Text style={styles.confirmButtonText}>
              {selectedId
                ? `Continue with ${selectedIndustry?.name ?? ''}`
                : 'Select an Industry to Continue'}
            </Text>
            {selectedId && (
              <MaterialIcons name="arrow-forward" size={18} color="#fff" style={styles.confirmIcon} />
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

export default IndustrySelector;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  // Header
  header: {
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 16 : 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTitles: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 4,
    lineHeight: 17,
  },
  closeButton: {
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 999,
    marginTop: 2,
  },

  // Grid
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    gap: 8,
    position: 'relative',
    minHeight: 150,
  },
  cardSpacer: {
    flex: 1,
  },

  // Check badge (top-right of selected card)
  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Icon box
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },

  // Card text
  cardName: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.2,
    lineHeight: 18,
  },
  cardDesc: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
    lineHeight: 15,
  },

  // Footer
  footer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
  },
  confirmButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonDisabled: {
    backgroundColor: '#cbd5e1',
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  confirmIcon: {
    marginLeft: 2,
  },
  bottomSpacer: {
    height: 8,
  },
});
