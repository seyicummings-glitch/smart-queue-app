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

export type Service = {
  id: string;
  name: string;
  description: string;
  duration?: number;
  category?: string;
};

export type ServiceSelectionProps = {
  industryId: string;
  onSelect: (service: Service) => void;
  onClose?: () => void;
  showClose?: boolean;
};

// ─── Services Data ────────────────────────────────────────────────────────────

export const servicesByIndustry: Record<string, Service[]> = {
  banking: [
    {
      id: 'banking-account-opening',
      name: 'Account Opening',
      description: 'Open a new savings or checking account with full KYC verification.',
      duration: 30,
      category: 'Account Services',
    },
    {
      id: 'banking-loan-application',
      name: 'Loan Application',
      description: 'Apply for personal, home, or business loans with credit assessment.',
      duration: 45,
      category: 'Loans & Credit',
    },
    {
      id: 'banking-investment-advisory',
      name: 'Investment Advisory',
      description: 'One-on-one advisory session with a certified financial planner.',
      duration: 60,
      category: 'Investments',
    },
    {
      id: 'banking-card-services',
      name: 'Card Services',
      description: 'Debit/credit card issuance, replacement, and PIN reset services.',
      duration: 15,
      category: 'Account Services',
    },
    {
      id: 'banking-foreign-exchange',
      name: 'Foreign Exchange',
      description: 'Currency exchange and international wire transfer services.',
      duration: 20,
      category: 'Account Services',
    },
    {
      id: 'banking-general-inquiry',
      name: 'General Inquiry',
      description: 'General banking questions and customer support.',
      duration: 10,
      category: 'General',
    },
  ],
  healthcare: [
    {
      id: 'healthcare-general-consultation',
      name: 'General Consultation',
      description: 'Initial assessment and diagnosis with a general practitioner.',
      duration: 20,
      category: 'Consultation',
    },
    {
      id: 'healthcare-lab-tests',
      name: 'Lab Tests',
      description: 'Blood work, urinalysis, and other diagnostic laboratory services.',
      duration: 15,
      category: 'Diagnostics',
    },
    {
      id: 'healthcare-specialist-referral',
      name: 'Specialist Referral',
      description: 'Referral to specialist doctors with documentation.',
      duration: 10,
      category: 'Documentation',
    },
    {
      id: 'healthcare-pharmacy',
      name: 'Pharmacy',
      description: 'Prescription fulfillment and medication counseling.',
      duration: 10,
      category: 'Support',
    },
    {
      id: 'healthcare-vaccination',
      name: 'Vaccination',
      description: 'Immunization and vaccination services for all age groups.',
      duration: 15,
      category: 'Preventive',
    },
    {
      id: 'healthcare-emergency',
      name: 'Emergency',
      description: 'Urgent medical attention and triage assessment.',
      duration: 5,
      category: 'Emergency',
    },
  ],
  retail: [
    {
      id: 'retail-returns-exchanges',
      name: 'Returns & Exchanges',
      description: 'Process product returns and exchanges with receipt.',
      duration: 10,
      category: 'Support',
    },
    {
      id: 'retail-product-inquiry',
      name: 'Product Inquiry',
      description: 'Staff-assisted product search and recommendation.',
      duration: 10,
      category: 'General',
    },
    {
      id: 'retail-layaway-setup',
      name: 'Layaway Setup',
      description: 'Set up layaway payment plans for large purchases.',
      duration: 20,
      category: 'Account Services',
    },
    {
      id: 'retail-gift-wrapping',
      name: 'Gift Wrapping',
      description: 'Professional gift wrapping and card writing service.',
      duration: 10,
      category: 'General',
    },
    {
      id: 'retail-checkout',
      name: 'Checkout',
      description: 'Standard point-of-sale checkout and payment processing.',
      duration: 5,
      category: 'General',
    },
    {
      id: 'retail-customer-service',
      name: 'Customer Service',
      description: 'General customer service, complaints, and feedback.',
      duration: 15,
      category: 'Support',
    },
  ],
  government: [
    {
      id: 'gov-id-issuance',
      name: 'ID Issuance',
      description: 'Application and issuance of national identification cards.',
      duration: 30,
      category: 'Documentation',
    },
    {
      id: 'gov-permit-processing',
      name: 'Permit Processing',
      description: 'Business and construction permit applications.',
      duration: 45,
      category: 'Documentation',
    },
    {
      id: 'gov-certificate-request',
      name: 'Certificate Request',
      description: 'Birth, marriage, and other civil registry certificates.',
      duration: 20,
      category: 'Documentation',
    },
    {
      id: 'gov-tax-filing',
      name: 'Tax Filing Assistance',
      description: 'Guided assistance for tax return submissions.',
      duration: 30,
      category: 'General',
    },
    {
      id: 'gov-license-renewal',
      name: 'License Renewal',
      description: "Driver's license and vehicle registration renewal.",
      duration: 25,
      category: 'Documentation',
    },
    {
      id: 'gov-social-services',
      name: 'Social Services',
      description: 'Welfare benefits, social assistance, and subsidies inquiry.',
      duration: 30,
      category: 'General',
    },
  ],
  education: [
    {
      id: 'edu-enrollment',
      name: 'Enrollment',
      description: 'Student enrollment processing and document submission.',
      duration: 30,
      category: 'Documentation',
    },
    {
      id: 'edu-academic-advising',
      name: 'Academic Advising',
      description: 'Course selection and academic planning session.',
      duration: 30,
      category: 'Consultation',
    },
    {
      id: 'edu-records-request',
      name: 'Records Request',
      description: 'Transcript and diploma request and processing.',
      duration: 15,
      category: 'Documentation',
    },
    {
      id: 'edu-financial-aid',
      name: 'Financial Aid',
      description: 'Scholarship and financial assistance application.',
      duration: 45,
      category: 'Loans & Credit',
    },
    {
      id: 'edu-library-services',
      name: 'Library Services',
      description: 'Book loans, research assistance, and database access.',
      duration: 15,
      category: 'General',
    },
    {
      id: 'edu-it-support',
      name: 'IT Support',
      description: 'Student portal, email, and software troubleshooting.',
      duration: 20,
      category: 'Support',
    },
  ],
  corporate: [
    {
      id: 'corp-visitor-registration',
      name: 'Visitor Registration',
      description: 'Register and badge guests and contractors.',
      duration: 10,
      category: 'General',
    },
    {
      id: 'corp-it-support',
      name: 'IT Support',
      description: 'Hardware, software, and network troubleshooting.',
      duration: 30,
      category: 'Support',
    },
    {
      id: 'corp-hr-consultation',
      name: 'HR Consultation',
      description: 'Employee HR queries, onboarding, and benefits.',
      duration: 20,
      category: 'Consultation',
    },
    {
      id: 'corp-meeting-room-booking',
      name: 'Meeting Room Booking',
      description: 'Reserve conference rooms and AV equipment.',
      duration: 10,
      category: 'General',
    },
    {
      id: 'corp-facilities',
      name: 'Facilities Request',
      description: 'Maintenance requests, access cards, and office supplies.',
      duration: 15,
      category: 'General',
    },
    {
      id: 'corp-payroll',
      name: 'Payroll Inquiry',
      description: 'Salary, deductions, and payslip queries.',
      duration: 20,
      category: 'Consultation',
    },
  ],
};

// ─── Service Card ─────────────────────────────────────────────────────────────

type ServiceCardProps = {
  service: Service;
  selected: boolean;
  onPress: () => void;
};

function ServiceCard({ service, selected, onPress }: ServiceCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.cardInner}>
        {/* Left: text content */}
        <View style={styles.cardContent}>
          <Text style={[styles.cardName, selected && styles.cardNameSelected]}>
            {service.name}
          </Text>
          <Text style={styles.cardDesc} numberOfLines={2}>
            {service.description}
          </Text>
          {(service.duration !== undefined || service.category) && (
            <View style={styles.cardMeta}>
              {service.duration !== undefined && (
                <View style={styles.metaItem}>
                  <MaterialIcons name="access-time" size={12} color="#64748b" />
                  <Text style={styles.metaText}>{service.duration} min</Text>
                </View>
              )}
              {service.category && (
                <View style={[styles.categoryBadge, selected && styles.categoryBadgeSelected]}>
                  <Text style={[styles.categoryText, selected && styles.categoryTextSelected]}>
                    {service.category}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Right: check indicator */}
        <View style={[styles.checkCircle, selected && styles.checkCircleSelected]}>
          {selected && <MaterialIcons name="check" size={16} color="#fff" />}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ServiceSelection({
  industryId,
  onSelect,
  onClose,
  showClose = true,
}: ServiceSelectionProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const services = servicesByIndustry[industryId] ?? servicesByIndustry['banking'];
  const selectedService = services.find(s => s.id === selectedId) ?? null;

  const handleConfirm = () => {
    if (selectedService) {
      onSelect(selectedService);
    }
  };

  const industryLabel = industryId
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

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
            <Text style={styles.headerTitle}>Select a Service</Text>
            <Text style={styles.headerSub}>{industryLabel} services</Text>
          </View>
          {showClose && onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
              <MaterialIcons name="close" size={20} color="#475569" />
            </TouchableOpacity>
          )}
        </View>

        {/* Service list */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {services.map(service => (
            <ServiceCard
              key={service.id}
              service={service}
              selected={selectedId === service.id}
              onPress={() => setSelectedId(service.id)}
            />
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
                ? `Join Queue for ${selectedService?.name ?? ''}`
                : 'Select a Service to Continue'}
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

export default ServiceSelection;

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
  },
  closeButton: {
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 999,
    marginTop: 2,
  },

  // List
  scrollContent: {
    padding: 16,
    gap: 10,
  },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 10,
  },
  cardSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
    borderWidth: 2,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  cardNameSelected: {
    color: '#2563eb',
  },
  cardDesc: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    lineHeight: 17,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  categoryBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  categoryBadgeSelected: {
    backgroundColor: '#dbeafe',
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  categoryTextSelected: {
    color: '#2563eb',
  },

  // Check circle
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    flexShrink: 0,
  },
  checkCircleSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
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
