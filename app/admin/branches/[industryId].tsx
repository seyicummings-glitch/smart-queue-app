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

type Branch = {
  id: number;
  name: string;
  address: string;
  phone: string;
  hours: string;
  counters: number;
};

type FormData = {
  name: string;
  address: string;
  phone: string;
  hours: string;
  counters: string;
};

const INITIAL_BRANCHES: Branch[] = [
  { id: 1, name: 'First National Bank - Downtown', address: '123 Financial District, Manhattan, NY 10005', phone: '+1 (212) 555-0100', hours: '9:00 AM - 6:00 PM', counters: 5 },
  { id: 2, name: 'First National Bank - Midtown', address: '456 Park Avenue, New York, NY 10022', phone: '+1 (212) 555-0200', hours: '9:00 AM - 6:00 PM', counters: 3 },
  { id: 3, name: 'First National Bank - Brooklyn', address: '789 Atlantic Avenue, Brooklyn, NY 11217', phone: '+1 (718) 555-0300', hours: '9:00 AM - 5:00 PM', counters: 5 },
  { id: 4, name: 'First National Bank - Queens', address: '321 Main Street, Flushing, NY 11354', phone: '+1 (718) 555-0400', hours: '9:00 AM - 5:00 PM', counters: 3 },
];

const EMPTY_FORM: FormData = { name: '', address: '', phone: '', hours: '', counters: '' };

export default function AdminBranches() {
  const router = useRouter();
  const { industryId } = useLocalSearchParams<{ industryId: string }>();

  const [branches, setBranches] = useState<Branch[]>(INITIAL_BRANCHES);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);

  const handleDelete = (id: number) => {
    setBranches(prev => prev.filter(b => b.id !== id));
  };

  const handleEditClick = (branch: Branch) => {
    setFormData({
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      hours: branch.hours,
      counters: branch.counters.toString(),
    });
    setEditingBranchId(branch.id);
    setIsModalOpen(true);
  };

  const handleAddClick = () => {
    setFormData(EMPTY_FORM);
    setEditingBranchId(null);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) return;

    if (editingBranchId !== null) {
      setBranches(prev =>
        prev.map(b =>
          b.id === editingBranchId
            ? {
                ...b,
                name: formData.name,
                address: formData.address || 'N/A',
                phone: formData.phone || 'N/A',
                hours: formData.hours || 'N/A',
                counters: parseInt(formData.counters) || 0,
              }
            : b
        )
      );
    } else {
      const newId = branches.length > 0 ? Math.max(...branches.map(b => b.id)) + 1 : 1;
      setBranches(prev => [
        ...prev,
        {
          id: newId,
          name: formData.name,
          address: formData.address || 'N/A',
          phone: formData.phone || 'N/A',
          hours: formData.hours || 'N/A',
          counters: parseInt(formData.counters) || 0,
        },
      ]);
    }

    setIsModalOpen(false);
    setFormData(EMPTY_FORM);
    setEditingBranchId(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData(EMPTY_FORM);
    setEditingBranchId(null);
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

        <View style={styles.headerRow}>
          <View style={styles.headerTitles}>
            <Text style={styles.title}>Manage Branches</Text>
            <Text style={styles.subtitle}>Manage locations for this industry</Text>
          </View>
          <TouchableOpacity onPress={handleAddClick} style={styles.addButton} activeOpacity={0.8}>
            <MaterialIcons name="add" size={16} color="#fff" />
            <Text style={styles.addButtonText}>Add Branch</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Branch List */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {branches.map(branch => (
          <View key={branch.id} style={styles.card}>
            <Text style={styles.branchName}>{branch.name}</Text>

            <View style={styles.infoList}>
              <View style={styles.infoRow}>
                <MaterialIcons name="location-on" size={16} color="#94a3b8" style={styles.infoIcon} />
                <Text style={styles.infoText}>{branch.address}</Text>
              </View>
              <View style={styles.infoRow}>
                <MaterialIcons name="phone" size={16} color="#94a3b8" style={styles.infoIcon} />
                <Text style={styles.infoText}>{branch.phone}</Text>
              </View>
              <View style={styles.infoRow}>
                <MaterialIcons name="access-time" size={16} color="#94a3b8" style={styles.infoIcon} />
                <Text style={styles.infoText}>{branch.hours}</Text>
              </View>
              <View style={styles.infoRow}>
                <MaterialIcons name="tag" size={16} color="#94a3b8" style={styles.infoIcon} />
                <Text style={styles.infoText}>{branch.counters} counters</Text>
              </View>
            </View>

            <View style={styles.cardActions}>
              <TouchableOpacity
                onPress={() => handleEditClick(branch)}
                style={styles.editButton}
                activeOpacity={0.7}
              >
                <MaterialIcons name="edit" size={14} color="#475569" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDelete(branch.id)}
                style={styles.deleteButton}
                activeOpacity={0.7}
              >
                <MaterialIcons name="delete" size={14} color="#be123c" />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {branches.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No branches found. Add one above.</Text>
          </View>
        )}
      </ScrollView>

      {/* Add / Edit Bottom Sheet Modal */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalContainer}>
          {/* Backdrop tap to dismiss */}
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={handleCloseModal}
          />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalSheet}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingBranchId !== null ? 'Edit Branch' : 'Add New Branch'}
                </Text>
                <TouchableOpacity onPress={handleCloseModal} style={styles.closeButton}>
                  <MaterialIcons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Form */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                style={styles.formScroll}
              >
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Branch Name</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.name}
                    onChangeText={t => setFormData(p => ({ ...p, name: t }))}
                    placeholder="e.g. First National Bank - Downtown"
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Address</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.address}
                    onChangeText={t => setFormData(p => ({ ...p, address: t }))}
                    placeholder="123 Financial District..."
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Phone</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.phone}
                    onChangeText={t => setFormData(p => ({ ...p, phone: t }))}
                    placeholder="+1 (212) 555-0100"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.twoCol}>
                  <View style={[styles.fieldGroup, styles.flex1]}>
                    <Text style={styles.label}>Hours</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.hours}
                      onChangeText={t => setFormData(p => ({ ...p, hours: t }))}
                      placeholder="9:00 AM - 6:00 PM"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                  <View style={[styles.fieldGroup, styles.flex1]}>
                    <Text style={styles.label}>Counters</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.counters}
                      onChangeText={t => setFormData(p => ({ ...p, counters: t }))}
                      placeholder="e.g. 5"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.formBottomSpacer} />
              </ScrollView>

              {/* Save Button */}
              <TouchableOpacity onPress={handleSave} style={styles.saveButton} activeOpacity={0.85}>
                <Text style={styles.saveButtonText}>
                  {editingBranchId !== null ? 'Save Changes' : 'Save Branch'}
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
    paddingBottom: 12,
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTitles: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 18,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  // ── Branch List ─────────────────────────────────────────
  content: {
    padding: 20,
    gap: 12,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 24,
    padding: 20,
  },
  branchName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 12,
    lineHeight: 20,
  },
  infoList: {
    gap: 8,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginTop: 1,
    marginRight: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
    lineHeight: 18,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  editButtonText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fff1f2',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffe4e6',
  },
  deleteButtonText: {
    color: '#be123c',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },

  // ── Modal ────────────────────────────────────────────────
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
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  closeButton: {
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 999,
  },
  formScroll: {
    flexGrow: 0,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  flex1: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '500',
    color: '#0f172a',
  },
  twoCol: {
    flexDirection: 'row',
    gap: 12,
  },
  formBottomSpacer: {
    height: 8,
  },
  saveButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
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
