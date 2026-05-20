import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import BottomNav from '@/components/BottomNav';
import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type AssignedService = { id: number; name: string };

type Ticket = {
  id: number;
  ticket_number: string;
  customer_name: string;
  service_name: string;
  status: 'waiting' | 'serving' | 'completed' | 'cancelled';
  position: number;
  estimated_wait: number;
  issued_at: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toArr<T>(d: any): T[] {
  return Array.isArray(d) ? d : (d?.results ?? []);
}

function fmt12h(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h > 12 ? h - 12 : h === 0 ? 12 : h}:${m} ${h >= 12 ? 'PM' : 'AM'}`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function StaffQueues() {
  const router = useRouter();
  const { role } = useAppContext();

  const [loading,       setLoading]       = useState(true);
  const [refresh,       setRefresh]       = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [counterNumber, setCounterNumber] = useState<number | null>(null);
  const [services,      setServices]      = useState<AssignedService[]>([]);
  const [selectedId,    setSelectedId]    = useState<number | null>(null);
  const [waitingMap,    setWaitingMap]    = useState<Record<number, Ticket[]>>({});
  const [servingMap,    setServingMap]    = useState<Record<number, Ticket | null>>({});

  const initializedRef = useRef(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);

    const { data: ci } = await api.get<{ counter_number: number | null; assigned_services: AssignedService[] }>(
      '/accounts/my-counter/',
    );

    if (ci) {
      setCounterNumber(ci.counter_number);
      setServices(ci.assigned_services);

      if (!initializedRef.current && ci.assigned_services.length > 0) {
        setSelectedId(ci.assigned_services[0].id);
        initializedRef.current = true;
      }

      const newWaiting: Record<number, Ticket[]>      = {};
      const newServing: Record<number, Ticket | null> = {};

      await Promise.all(
        ci.assigned_services.map(async (svc) => {
          const [w, s] = await Promise.all([
            api.get<any>(`/queues/?service=${svc.id}&status=waiting`),
            api.get<any>(`/queues/?service=${svc.id}&status=serving`),
          ]);
          newWaiting[svc.id] = toArr<Ticket>(w.data);
          const servingList  = toArr<Ticket>(s.data);
          newServing[svc.id] = servingList.length > 0 ? servingList[0] : null;
        }),
      );

      setWaitingMap(newWaiting);
      setServingMap(newServing);
    }

    setLoading(false);
    setRefresh(false);
  }, []);

  useEffect(() => {
    fetchData();
    const t = setInterval(() => fetchData(true), 8_000);
    return () => clearInterval(t);
  }, [fetchData]);

  const handleCallNext = async () => {
    if (!selectedId) return;
    const waiting = waitingMap[selectedId] ?? [];
    if (waiting.length === 0) return;
    setActionLoading(true);
    const { error } = await api.post(`/queues/${waiting[0].id}/call/`, {});
    setActionLoading(false);
    if (error) { Alert.alert('Error', error); return; }
    fetchData(true);
  };

  const handleComplete = async () => {
    if (!selectedId) return;
    const serving = servingMap[selectedId];
    if (!serving) return;
    setActionLoading(true);
    const { error } = await api.post(`/queues/${serving.id}/complete/`, {});
    setActionLoading(false);
    if (error) { Alert.alert('Error', error); return; }
    fetchData(true);
  };

  const selectedWaiting = selectedId ? (waitingMap[selectedId] ?? []) : [];
  const selectedServing  = selectedId ? (servingMap[selectedId]  ?? null) : null;

  const dashboardRoute = (role === 'admin' || role === 'super_admin' || role === 'superadmin')
    ? '/admin/dashboard'
    : '/staff/dashboard';

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
        <BottomNav />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.canGoBack() ? router.back() : router.replace(dashboardRoute as any)}
          >
            <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>My Counter</Text>
            <Text style={styles.headerSub}>
              {counterNumber ? `Counter #${counterNumber}` : 'Assigned service queues'}
            </Text>
          </View>
          {counterNumber !== null && (
            <View style={styles.counterBadge}>
              <MaterialIcons name="tag" size={14} color="#2563eb" />
              <Text style={styles.counterBadgeText}>{counterNumber}</Text>
            </View>
          )}
        </View>
      </View>

      {/* No assignments */}
      {services.length === 0 ? (
        <View style={styles.noQueues}>
          <MaterialIcons name="group" size={48} color="#cbd5e1" />
          <Text style={styles.noQueuesTitle}>No queues assigned</Text>
          <Text style={styles.noQueuesText}>
            Contact your administrator to be assigned to a service queue.
          </Text>
        </View>
      ) : (
        <>
          {/* Service tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillsContent}
            style={styles.pillsScroll}
          >
            {services.map((svc) => {
              const active = svc.id === selectedId;
              const count  = (waitingMap[svc.id] ?? []).length;
              return (
                <TouchableOpacity
                  key={svc.id}
                  style={[styles.pill, active && styles.pillActive]}
                  onPress={() => setSelectedId(svc.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>
                    {svc.name}
                  </Text>
                  <View style={[styles.pillBadge, active && styles.pillBadgeActive]}>
                    <Text style={[styles.pillBadgeText, active && styles.pillBadgeTextActive]}>
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refresh}
                onRefresh={() => { setRefresh(true); fetchData(true); }}
                tintColor="#2563eb"
              />
            }
          >
            {/* Currently Serving */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Currently Serving</Text>
            </View>

            {selectedServing ? (
              <View style={styles.servingCard}>
                <View style={styles.servingDark}>
                  <View style={styles.servingTopRow}>
                    <View>
                      <Text style={styles.nowServingLabel}>Now Serving</Text>
                      <Text style={styles.servingTicket}>{selectedServing.ticket_number}</Text>
                    </View>
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeBadgeText}>Walk-In</Text>
                    </View>
                  </View>
                  <Text style={styles.servingName}>{selectedServing.customer_name}</Text>
                  <Text style={styles.servingService}>{selectedServing.service_name}</Text>
                  <View style={styles.waitRow}>
                    <MaterialIcons name="access-time" size={13} color="#94a3b8" />
                    <Text style={styles.waitText}>Since {fmt12h(selectedServing.issued_at)}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.completeBtn, actionLoading && { opacity: 0.6 }]}
                  onPress={handleComplete}
                  disabled={actionLoading}
                  activeOpacity={0.8}
                >
                  {actionLoading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <>
                        <MaterialIcons name="check-circle" size={18} color="#fff" />
                        <Text style={styles.completeBtnText}>Mark as Complete</Text>
                      </>
                  }
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyServing}>
                <MaterialIcons name="person" size={36} color="#cbd5e1" />
                <Text style={styles.emptyServingText}>No customer being served</Text>
                <Text style={styles.emptyServingHint}>
                  {selectedWaiting.length > 0
                    ? 'Press "Call Next" below to start'
                    : 'The waiting queue is empty'}
                </Text>
              </View>
            )}

            {/* Waiting customers */}
            <View style={[styles.sectionHeader, { marginTop: 8 }]}>
              <Text style={styles.sectionTitle}>Waiting Customers</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{selectedWaiting.length}</Text>
              </View>
            </View>

            {selectedWaiting.length === 0 ? (
              <View style={styles.emptyList}>
                <MaterialIcons name="check-circle" size={36} color="#10b981" />
                <Text style={styles.emptyListText}>Queue is clear!</Text>
              </View>
            ) : (
              selectedWaiting.map((ticket, index) => (
                <TicketRow key={ticket.id} ticket={ticket} position={index + 1} />
              ))
            )}

            {/* Call next button */}
            <TouchableOpacity
              style={[
                styles.callNextBtn,
                (selectedWaiting.length === 0 || selectedServing !== null || actionLoading) &&
                  styles.callNextBtnDisabled,
              ]}
              onPress={handleCallNext}
              disabled={selectedWaiting.length === 0 || selectedServing !== null || actionLoading}
              activeOpacity={0.8}
            >
              {actionLoading
                ? <ActivityIndicator color="#94a3b8" size="small" />
                : <>
                    <MaterialIcons
                      name="play-circle-outline"
                      size={20}
                      color={
                        selectedWaiting.length === 0 || selectedServing !== null
                          ? '#94a3b8'
                          : '#fff'
                      }
                    />
                    <Text
                      style={[
                        styles.callNextBtnText,
                        (selectedWaiting.length === 0 || selectedServing !== null) &&
                          styles.callNextBtnTextDisabled,
                      ]}
                    >
                      {selectedServing !== null
                        ? 'Complete current first'
                        : selectedWaiting.length === 0
                        ? 'Queue Empty'
                        : 'Call Next Customer'}
                    </Text>
                  </>
              }
            </TouchableOpacity>
          </ScrollView>
        </>
      )}

      <BottomNav />
    </SafeAreaView>
  );
}

// ─── Ticket row ───────────────────────────────────────────────────────────────

function TicketRow({ ticket, position }: { ticket: Ticket; position: number }) {
  return (
    <View style={styles.customerRow}>
      <View style={styles.posCircle}>
        <Text style={styles.posText}>#{position}</Text>
      </View>
      <View style={styles.customerInfo}>
        <Text style={styles.customerTicket}>{ticket.ticket_number}</Text>
        <Text style={styles.customerName}>{ticket.customer_name}</Text>
        <Text style={styles.customerService}>{ticket.service_name}</Text>
      </View>
      <View style={styles.waitBadge}>
        <MaterialIcons name="access-time" size={12} color="#64748b" />
        <Text style={styles.waitBadgeText}>~{ticket.estimated_wait} min</Text>
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
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  counterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  counterBadgeText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#2563eb',
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

  // Ticket row
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
