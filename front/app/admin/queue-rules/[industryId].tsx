import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  SafeAreaView,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

// ─── Types ────────────────────────────────────────────────────────────────────

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];
type RuleColor = 'blue' | 'emerald' | 'amber';

type QueueRule = {
  id: string;
  title: string;
  desc: string;
  icon: IconName;
  color: RuleColor;
  unit: string;
  defaultValue: number;
};

// ─── Color map ────────────────────────────────────────────────────────────────

const COLOR_MAP: Record<RuleColor, { icon: string; bg: string }> = {
  blue: { icon: '#2563eb', bg: '#eff6ff' },
  emerald: { icon: '#059669', bg: '#ecfdf5' },
  amber: { icon: '#d97706', bg: '#fffbeb' },
};

// ─── Rule definitions ─────────────────────────────────────────────────────────

const QUEUE_RULES: QueueRule[] = [
  {
    id: 'max_queue_size',
    title: 'Max Queue Size',
    desc: 'Maximum number of people allowed in queue at one time',
    icon: 'group',
    color: 'blue',
    unit: 'people',
    defaultValue: 50,
  },
  {
    id: 'avg_service_time',
    title: 'Average Service Time',
    desc: 'Estimated minutes per customer for service completion',
    icon: 'access-time',
    color: 'emerald',
    unit: 'minutes',
    defaultValue: 5,
  },
  {
    id: 'auto_close_queue',
    title: 'Auto Close Queue',
    desc: 'Automatically close queue when this many minutes remain before closing time',
    icon: 'warning',
    color: 'amber',
    unit: 'minutes',
    defaultValue: 40,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTitle(slug: string): string {
  return slug
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AdminQueueRules() {
  const router = useRouter();
  const { industryId } = useLocalSearchParams<{ industryId: string }>();

  // Rule values keyed by rule id
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(QUEUE_RULES.map((r) => [r.id, r.defaultValue]))
  );

  // Modal state
  const [editingRule, setEditingRule] = useState<QueueRule | null>(null);
  const [inputValue, setInputValue] = useState('');

  function openEdit(rule: QueueRule) {
    setEditingRule(rule);
    setInputValue(String(values[rule.id]));
  }

  function closeEdit() {
    setEditingRule(null);
    setInputValue('');
  }

  function handleSave() {
    if (!editingRule) return;
    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      setValues((prev) => ({ ...prev, [editingRule.id]: parsed }));
    }
    closeEdit();
  }

  const displayTitle = formatTitle(industryId ?? 'Industry');

  // Pair rules into rows of 2 for the grid
  const rows: QueueRule[][] = [];
  for (let i = 0; i < QUEUE_RULES.length; i += 2) {
    rows.push(QUEUE_RULES.slice(i, i + 2));
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={16} color="#64748b" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>Queue Rules</Text>
          <Text style={styles.headerSub}>{displayTitle} — Active routing policies</Text>
        </View>
      </View>

      {/* Rules grid */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>Current Rules</Text>

        {rows.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.row}>
            {row.map((rule) => {
              const colors = COLOR_MAP[rule.color];
              return (
                <View key={rule.id} style={styles.ruleCard}>
                  {/* Icon */}
                  <View style={[styles.ruleIconWrap, { backgroundColor: colors.bg }]}>
                    <MaterialIcons name={rule.icon} size={20} color={colors.icon} />
                  </View>

                  {/* Title & description */}
                  <Text style={styles.ruleTitle}>{rule.title}</Text>
                  <Text style={styles.ruleDesc}>{rule.desc}</Text>

                  {/* Current value */}
                  <View style={styles.ruleValueRow}>
                    <Text style={[styles.ruleValue, { color: colors.icon }]}>
                      {values[rule.id]}
                    </Text>
                    <Text style={styles.ruleUnit}>{rule.unit}</Text>
                  </View>

                  {/* Edit button */}
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => openEdit(rule)}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="edit" size={13} color="#475569" />
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
            {/* Fill empty slot if odd number */}
            {row.length === 1 && <View style={styles.ruleCardPlaceholder} />}
          </View>
        ))}

        {/* Info note */}
        <View style={styles.infoBox}>
          <MaterialIcons name="error" size={16} color="#2563eb" />
          <Text style={styles.infoText}>
            Changes take effect immediately for all branches under this industry.
          </Text>
        </View>
      </ScrollView>

      {/* Edit bottom sheet modal */}
      <Modal
        visible={editingRule !== null}
        animationType="slide"
        transparent
        onRequestClose={closeEdit}
      >
        <View style={styles.modalContainer}>
          {/* Backdrop */}
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={closeEdit}
          />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalSheet}>
              {/* Modal header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Edit{editingRule ? ` — ${editingRule.title}` : ''}
                </Text>
                <TouchableOpacity onPress={closeEdit} style={styles.closeButton}>
                  <MaterialIcons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Description */}
              {editingRule && (
                <Text style={styles.modalDesc}>{editingRule.desc}</Text>
              )}

              {/* Input */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>
                  New Value{editingRule ? ` (${editingRule.unit})` : ''}
                </Text>
                <TextInput
                  style={styles.numberInput}
                  value={inputValue}
                  onChangeText={setInputValue}
                  keyboardType="numeric"
                  placeholder="Enter value"
                  placeholderTextColor="#94a3b8"
                  autoFocus
                />
              </View>

              {/* Save button */}
              <TouchableOpacity
                onPress={handleSave}
                style={styles.saveButton}
                activeOpacity={0.85}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  // Header
  header: {
    backgroundColor: '#fff',
    paddingTop: 16,
    paddingBottom: 14,
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
  headerTitles: {
    gap: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },

  // Content
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },

  // Rule card
  ruleCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    gap: 8,
  },
  ruleCardPlaceholder: {
    flex: 1,
  },
  ruleIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  ruleTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
    lineHeight: 18,
  },
  ruleDesc: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
    lineHeight: 15,
  },
  ruleValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginVertical: 4,
  },
  ruleValue: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1.5,
  },
  ruleUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 9,
    marginTop: 4,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },

  // Info box
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#dbeafe',
    marginTop: 4,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: '#1d4ed8',
    lineHeight: 18,
  },

  // Modal
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.3,
    flex: 1,
    paddingRight: 8,
  },
  closeButton: {
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 999,
  },
  modalDesc: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
    lineHeight: 19,
    marginBottom: 20,
  },

  // Form
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    marginLeft: 2,
  },
  numberInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 32,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    letterSpacing: -1,
  },

  // Save button
  saveButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
