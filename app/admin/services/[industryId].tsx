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

type Service = {
  id: number;
  name: string;
  desc: string;
  duration: number;
  category: string;
};

type FormData = {
  name: string;
  desc: string;
  duration: string;
  category: string;
};

// Category picker option
type CategoryOption = { label: string; value: string };

const CATEGORIES: CategoryOption[] = [
  { label: 'Account Services', value: 'Account Services' },
  { label: 'Loans & Credit', value: 'Loans & Credit' },
  { label: 'Investments', value: 'Investments' },
  { label: 'Insurance', value: 'Insurance' },
  { label: 'General', value: 'General' },
  { label: 'Consultation', value: 'Consultation' },
  { label: 'Documentation', value: 'Documentation' },
  { label: 'Support', value: 'Support' },
];

function getInitialServices(slug: string): Service[] {
  switch (slug) {
    case 'banking-finance':
      return [
        { id: 1, name: 'Account Opening', desc: 'Open a new savings or checking account with full KYC verification.', duration: 30, category: 'Account Services' },
        { id: 2, name: 'Loan Application', desc: 'Apply for personal, home, or business loans with credit assessment.', duration: 45, category: 'Loans & Credit' },
        { id: 3, name: 'Investment Advisory', desc: 'One-on-one advisory session with a certified financial planner.', duration: 60, category: 'Investments' },
        { id: 4, name: 'Card Services', desc: 'Debit/credit card issuance, replacement, and PIN reset services.', duration: 15, category: 'Account Services' },
      ];
    case 'healthcare':
      return [
        { id: 1, name: 'General Consultation', desc: 'Initial assessment and diagnosis with a general practitioner.', duration: 20, category: 'Consultation' },
        { id: 2, name: 'Lab Tests', desc: 'Blood work, urinalysis, and other diagnostic laboratory services.', duration: 15, category: 'Diagnostics' },
        { id: 3, name: 'Specialist Referral', desc: 'Referral to specialist doctors with documentation.', duration: 10, category: 'Documentation' },
        { id: 4, name: 'Pharmacy', desc: 'Prescription fulfillment and medication counseling.', duration: 10, category: 'Support' },
      ];
    case 'retail':
      return [
        { id: 1, name: 'Returns & Exchanges', desc: 'Process product returns and exchanges with receipt.', duration: 10, category: 'Support' },
        { id: 2, name: 'Product Inquiry', desc: 'Staff-assisted product search and recommendation.', duration: 10, category: 'General' },
        { id: 3, name: 'Layaway Setup', desc: 'Set up layaway payment plans for large purchases.', duration: 20, category: 'Account Services' },
        { id: 4, name: 'Gift Wrapping', desc: 'Professional gift wrapping and card writing service.', duration: 10, category: 'General' },
      ];
    case 'government':
      return [
        { id: 1, name: 'ID Issuance', desc: 'Application and issuance of national identification cards.', duration: 30, category: 'Documentation' },
        { id: 2, name: 'Permit Processing', desc: 'Business and construction permit applications.', duration: 45, category: 'Documentation' },
        { id: 3, name: 'Certificate Request', desc: 'Birth, marriage, and other civil registry certificates.', duration: 20, category: 'Documentation' },
        { id: 4, name: 'Tax Filing Assistance', desc: 'Guided assistance for tax return submissions.', duration: 30, category: 'General' },
      ];
    case 'education':
      return [
        { id: 1, name: 'Enrollment', desc: 'Student enrollment processing and document submission.', duration: 30, category: 'Documentation' },
        { id: 2, name: 'Academic Advising', desc: 'Course selection and academic planning session.', duration: 30, category: 'Consultation' },
        { id: 3, name: 'Records Request', desc: 'Transcript and diploma request and processing.', duration: 15, category: 'Documentation' },
        { id: 4, name: 'Financial Aid', desc: 'Scholarship and financial assistance application.', duration: 45, category: 'Loans & Credit' },
      ];
    case 'corporate':
      return [
        { id: 1, name: 'Visitor Registration', desc: 'Register and badge guests and contractors.', duration: 10, category: 'General' },
        { id: 2, name: 'IT Support', desc: 'Hardware, software, and network troubleshooting.', duration: 30, category: 'Support' },
        { id: 3, name: 'HR Consultation', desc: 'Employee HR queries, onboarding, and benefits.', duration: 20, category: 'Consultation' },
        { id: 4, name: 'Meeting Room Booking', desc: 'Reserve conference rooms and AV equipment.', duration: 10, category: 'General' },
      ];
    default:
      return [
        { id: 1, name: 'General Service', desc: 'General customer service and inquiries.', duration: 20, category: 'General' },
      ];
  }
}

const EMPTY_FORM: FormData = { name: '', desc: '', duration: '', category: '' };

export default function AdminServices() {
  const router = useRouter();
  const { industryId } = useLocalSearchParams<{ industryId: string }>();

  const slug = Array.isArray(industryId) ? industryId[0] : industryId ?? '';

  const [services, setServices] = useState<Service[]>(() => getInitialServices(slug));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const handleDelete = (id: number) => {
    setServices(prev => prev.filter(s => s.id !== id));
  };

  const handleEditClick = (service: Service) => {
    setFormData({
      name: service.name,
      desc: service.desc,
      duration: service.duration.toString(),
      category: service.category,
    });
    setEditingId(service.id);
    setIsModalOpen(true);
  };

  const handleAddClick = () => {
    setFormData(EMPTY_FORM);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) return;

    if (editingId !== null) {
      setServices(prev =>
        prev.map(s =>
          s.id === editingId
            ? {
                ...s,
                name: formData.name,
                desc: formData.desc || '',
                duration: parseInt(formData.duration) || 0,
                category: formData.category || 'General',
              }
            : s
        )
      );
    } else {
      const newId = services.length > 0 ? Math.max(...services.map(s => s.id)) + 1 : 1;
      setServices(prev => [
        ...prev,
        {
          id: newId,
          name: formData.name,
          desc: formData.desc || '',
          duration: parseInt(formData.duration) || 0,
          category: formData.category || 'General',
        },
      ]);
    }

    setIsModalOpen(false);
    setFormData(EMPTY_FORM);
    setEditingId(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData(EMPTY_FORM);
    setEditingId(null);
  };

  const industryLabel = slug
    .split('-')
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

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
            <Text style={styles.title}>Manage Services</Text>
            <Text style={styles.subtitle}>Services for {industryLabel}</Text>
          </View>
          <TouchableOpacity onPress={handleAddClick} style={styles.addButton} activeOpacity={0.8}>
            <MaterialIcons name="add" size={16} color="#fff" />
            <Text style={styles.addButtonText}>Add Service</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Service List */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {services.map(service => (
          <View key={service.id} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.serviceName}>{service.name}</Text>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{service.category}</Text>
              </View>
            </View>

            <Text style={styles.serviceDesc}>{service.desc}</Text>

            <View style={styles.durationRow}>
              <MaterialIcons name="access-time" size={14} color="#64748b" />
              <Text style={styles.durationText}>{service.duration} min</Text>
            </View>

            <View style={styles.cardActions}>
              <TouchableOpacity
                onPress={() => handleEditClick(service)}
                style={styles.editButton}
                activeOpacity={0.7}
              >
                <MaterialIcons name="edit" size={14} color="#475569" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDelete(service.id)}
                style={styles.deleteButton}
                activeOpacity={0.7}
              >
                <MaterialIcons name="delete" size={14} color="#be123c" />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {services.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No services found. Add one above.</Text>
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
                  {editingId !== null ? 'Edit Service' : 'Add New Service'}
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
                {/* Name */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Service Name</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.name}
                    onChangeText={t => setFormData(p => ({ ...p, name: t }))}
                    placeholder="e.g. Account Opening"
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                {/* Description */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={styles.textArea}
                    value={formData.desc}
                    onChangeText={t => setFormData(p => ({ ...p, desc: t }))}
                    placeholder="Describe what this service covers..."
                    placeholderTextColor="#94a3b8"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                {/* Duration + Category in 2-col grid */}
                <View style={styles.twoCol}>
                  <View style={[styles.fieldGroup, styles.flex1]}>
                    <Text style={styles.label}>Duration (min)</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.duration}
                      onChangeText={t => setFormData(p => ({ ...p, duration: t }))}
                      placeholder="e.g. 30"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={[styles.fieldGroup, styles.flex1]}>
                    <Text style={styles.label}>Category</Text>
                    <TouchableOpacity
                      style={styles.pickerButton}
                      activeOpacity={0.8}
                      onPress={() => setShowCategoryPicker(true)}
                    >
                      <Text
                        style={[
                          styles.pickerButtonText,
                          !formData.category && styles.pickerPlaceholder,
                        ]}
                        numberOfLines={1}
                      >
                        {formData.category || 'Select...'}
                      </Text>
                      <MaterialIcons name="expand-more" size={18} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.formBottomSpacer} />
              </ScrollView>

              {/* Save Button */}
              <TouchableOpacity onPress={handleSave} style={styles.saveButton} activeOpacity={0.85}>
                <Text style={styles.saveButtonText}>
                  {editingId !== null ? 'Save Changes' : 'Save Service'}
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Category Picker Modal */}
      <Modal
        visible={showCategoryPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setShowCategoryPicker(false)}
          />
          <View style={styles.pickerSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity
                onPress={() => setShowCategoryPicker(false)}
                style={styles.closeButton}
              >
                <MaterialIcons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.pickerOption,
                    formData.category === cat.value && styles.pickerOptionActive,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setFormData(p => ({ ...p, category: cat.value }));
                    setShowCategoryPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      formData.category === cat.value && styles.pickerOptionTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                  {formData.category === cat.value && (
                    <MaterialIcons name="check" size={18} color="#2563eb" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
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

  // ── Service List ─────────────────────────────────────────
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
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  serviceName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
    lineHeight: 20,
  },
  categoryBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  serviceDesc: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
    lineHeight: 19,
    marginBottom: 10,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 14,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
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
  pickerSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    maxHeight: '60%',
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
  textArea: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '500',
    color: '#0f172a',
    minHeight: 96,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 12,
  },
  pickerButton: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#0f172a',
  },
  pickerPlaceholder: {
    color: '#94a3b8',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  pickerOptionActive: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  pickerOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
  },
  pickerOptionTextActive: {
    color: '#2563eb',
    fontWeight: '700',
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
