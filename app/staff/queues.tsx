import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import BottomNav from '@/components/BottomNav';

// ─── Types ────────────────────────────────────────────────────────────────────

type Customer = {
  id: string;
  name: string;
  waitTime: string;
  service?: string;
};

type CurrentServing = {
  ticketId: string;
  name: string;
  service: string;
  waitTime: string;
  type: string;
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function StaffQueues() {
  const router = useRouter();
  const { staffQueues, role } = useAppContext();

  const [selectedQueueId, setSelectedQueueId] = useState<number>(
    staffQueues.length > 0 ? staffQueues[0].id : 1,
  );
  const [currentServing, setCurrentServing] = useState<CurrentServing | null>(null);

  // Local waiting list keyed by queue id — populated from mock data
  const [waitingMap, setWaitingMap] = useState<Record<number, Customer[]>>(() => {
    const initial: Record<number, Customer[]> = {};
    staffQueues.forEach((q) => {
      initial[q.id] = Array.from({ length: q.count }, (_, i) => ({
        id: `TKT-${String(q.id * 100 + i + 1).padStart(4, '0')}`,
        name: ['Alex Turner', 'Maria Santos', 'John Doe', 'Priya Patel', 'Lucas Oliveira'][
          (q.id + i) % 5
        ],
        waitTime: `${(i + 1) * 5} mins`,
        service: q.name,
      }));
    });
    return initial;
  });

  const waitingList = waitingMap[selectedQueueId] || [];

  const handleCallNext = () => {
    if (waitingList.length === 0) return;
    const next = waitingList[0];
    setCurrentServing({
      ticketId: next.id,
      name: next.name,
      service: next.service || 'General Service',
      waitTime: next.waitTime,
      type: 'Walk-In',
    });
    setWaitingMap((prev) => ({
      ...prev,
      [selectedQueueId]: prev[selectedQueueId].slice(1),
    }));
  };

  const handleComplete = () => {
    setCurrentServing(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              const home = role === 'admin' || role === 'super_admin' || role === 'superadmin'
                ? '/admin/dashboard'
                : '/staff/dashboard';
              router.canGoBack() ? router.back() : router.replace(home as any);
            }}
          >
            <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>My Queues</Text>
            <Text style={styles.headerSub}>Manage your assigned service queues</Text>
          </View>
        </View>
      </View>

      {/* Queue selector pills */}
      {staffQueues.length > 0 ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillsContent}
            style={styles.pillsScroll}
          >
            {staffQueues.map((q) => {
              const active = q.id === selectedQueueId;
              return (
                <TouchableOpacity
                  key={q.id}
                  style={[styles.pill, active && styles.pillActive]}
                  onPress={() => {
                    setSelectedQueueId(q.id);
                    setCurrentServing(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>
                    {q.name}
                  </Text>
                  <View style={[styles.pillBadge, active && styles.pillBadgeActive]}>
                    <Text style={[styles.pillBadgeText, active && styles.pillBadgeTextActive]}>
                      {(waitingMap[q.id] || []).length}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Currently Serving */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Currently Serving</Text>
            </View>

            {currentServing ? (
              <View style={styles.servingCard}>
                <View style={styles.servingDark}>
                  <View style={styles.servingTopRow}>
                    <View>
                      <Text style={styles.nowServingLabel}>Now Serving</Text>
                      <Text style={styles.servingTicket}>{currentServing.ticketId}</Text>
                    </View>
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeBadgeText}>{currentServing.type}</Text>
                    </View>
                  </View>
                  <Text style={styles.servingName}>{currentServing.name}</Text>
                  <Text style={styles.servingService}>{currentServing.service}</Text>
                  <View style={styles.waitRow}>
                    <MaterialIcons name="access-time" size={13} color="#94a3b8" />
                    <Text style={styles.waitText}>Waited {currentServing.waitTime}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.completeBtn}
                  onPress={handleComplete}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="check-circle" size={18} color="#fff" />
                  <Text style={styles.completeBtnText}>Mark as Complete</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyServing}>
                <MaterialIcons name="person" size={36} color="#cbd5e1" />
                <Text style={styles.emptyServingText}>No customer being served</Text>
                <Text style={styles.emptyServingHint}>
                  {waitingList.length > 0
                    ? 'Press "Call Next" below to start'
                    : 'The waiting queue is empty'}
                </Text>
              </View>
            )}

            {/* Waiting customers */}
            <View style={[styles.sectionHeader, { marginTop: 8 }]}>
              <Text style={styles.sectionTitle}>Waiting Customers</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{waitingList.length}</Text>
              </View>
            </View>

            {waitingList.length === 0 ? (
              <View style={styles.emptyList}>
                <MaterialIcons name="check-circle" size={36} color="#10b981" />
                <Text style={styles.emptyListText}>Queue is clear!</Text>
              </View>
            ) : (
              waitingList.map((customer, index) => (
                <CustomerRow key={customer.id} customer={customer} position={index + 1} />
              ))
            )}

            {/* Call next button */}
            <TouchableOpacity
              style={[
                styles.callNextBtn,
                (waitingList.length === 0 || currentServing !== null) && styles.callNextBtnDisabled,
              ]}
              onPress={handleCallNext}
              disabled={waitingList.length === 0 || currentServing !== null}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name="play-circle-outline"
                size={20}
                color={waitingList.length === 0 || currentServing !== null ? '#94a3b8' : '#fff'}
              />
              <Text
                style={[
                  styles.callNextBtnText,
                  (waitingList.length === 0 || currentServing !== null) &&
                    styles.callNextBtnTextDisabled,
                ]}
              >
                {currentServing !== null
                  ? 'Complete current first'
                  : waitingList.length === 0
                  ? 'Queue Empty'
                  : 'Call Next Customer'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </>
      ) : (
        <View style={styles.noQueues}>
          <MaterialIcons name="group" size={48} color="#cbd5e1" />
          <Text style={styles.noQueuesTitle}>No queues assigned</Text>
          <Text style={styles.noQueuesText}>
            Contact your administrator to be assigned to a service queue.
          </Text>
        </View>
      )}

      <BottomNav />
    </SafeAreaView>
  );
}

// ─── Customer row ─────────────────────────────────────────────────────────────

function CustomerRow({ customer, position }: { customer: Customer; position: number }) {
  return (
    <View style={styles.customerRow}>
      <View style={styles.posCircle}>
        <Text style={styles.posText}>#{position}</Text>
      </View>
      <View style={styles.customerInfo}>
        <Text style={styles.customerTicket}>{customer.id}</Text>
        <Text style={styles.customerName}>{customer.name}</Text>
        {customer.service && (
          <Text style={styles.customerService}>{customer.service}</Text>
        )}
      </View>
      <View style={styles.waitBadge}>
        <MaterialIcons name="access-time" size={12} color="#64748b" />
        <Text style={styles.waitBadgeText}>{customer.waitTime}</Text>
      </View>
    </View>
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
    paddingTop: 12,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '500',
  },

  // Pills
  pillsScroll: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  pillsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pillActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  pillTextActive: {
    color: '#fff',
  },
  pillBadge: {
    backgroundColor: '#e2e8f0',
    borderRadius: 999,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  pillBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  pillBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  pillBadgeTextActive: {
    color: '#fff',
  },

  // Content
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  countBadge: {
    backgroundColor: '#2563eb',
    borderRadius: 999,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },

  // Serving card
  servingCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  servingDark: {
    backgroundColor: '#0f172a',
    padding: 18,
    gap: 5,
  },
  servingTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nowServingLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  servingTicket: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
  },
  typeBadge: {
    backgroundColor: '#fff7ed',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ea580c',
  },
  servingName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  servingService: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  waitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  waitText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    margin: 12,
    borderRadius: 12,
    paddingVertical: 12,
  },
  completeBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },

  // Empty serving
  emptyServing: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyServingText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  emptyServingHint: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },

  // Customer row
  customerRow: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  posCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  posText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  customerInfo: {
    flex: 1,
    gap: 2,
  },
  customerTicket: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
  },
  customerName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  customerService: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  waitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  waitBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },

  // Call next button
  callNextBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  callNextBtnDisabled: {
    backgroundColor: '#f1f5f9',
  },
  callNextBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
  callNextBtnTextDisabled: {
    color: '#94a3b8',
  },

  // Empty list
  emptyList: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyListText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },

  // No queues
  noQueues: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  noQueuesTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#334155',
  },
  noQueuesText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
});
