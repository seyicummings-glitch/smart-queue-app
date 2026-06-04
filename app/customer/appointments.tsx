import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import BottomNav from '@/components/BottomNav';
import { useAppContext } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];
type AppStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled';

// ─── Industry data ─────────────────────────────────────────────────────────────

const SERVICE_GROUPS: {
  industryId: string;
  industry: string;
  icon: IconName;
  color: string;
  services: { id: string; name: string; estimatedTime: number }[];
}[] = [
  {
    industryId: 'banking',
    industry: 'Banking & Finance', icon: 'account-balance', color: '#2563eb',
    services: [
      { id: 'bnk-1', name: 'Teller Services',    estimatedTime: 15 },
      { id: 'bnk-2', name: 'Loan Consultation',  estimatedTime: 45 },
      { id: 'bnk-3', name: 'Account Opening',    estimatedTime: 30 },
      { id: 'bnk-4', name: 'Card Services',      estimatedTime: 20 },
      { id: 'bnk-5', name: 'Customer Service',   estimatedTime: 10 },
    ],
  },
  {
    industryId: 'healthcare',
    industry: 'Healthcare', icon: 'favorite', color: '#e11d48',
    services: [
      { id: 'hlc-1', name: 'General Practitioner', estimatedTime: 30 },
      { id: 'hlc-2', name: 'Pharmacy Pickup',      estimatedTime: 5  },
      { id: 'hlc-3', name: 'Blood Test / Lab',     estimatedTime: 20 },
      { id: 'hlc-4', name: 'Dental',               estimatedTime: 25 },
      { id: 'hlc-5', name: 'Specialist Consult',   estimatedTime: 40 },
    ],
  },
  {
    industryId: 'retail',
    industry: 'Retail', icon: 'shopping-bag', color: '#d97706',
    services: [
      { id: 'rtl-1', name: 'Returns & Exchanges', estimatedTime: 12 },
      { id: 'rtl-2', name: 'Customer Service',    estimatedTime: 8  },
      { id: 'rtl-3', name: 'Tech Support',        estimatedTime: 25 },
      { id: 'rtl-4', name: 'Click & Collect',     estimatedTime: 5  },
    ],
  },
  {
    industryId: 'government',
    industry: 'Government Services', icon: 'gavel', color: '#475569',
    services: [
      { id: 'gov-1', name: 'Document Processing',   estimatedTime: 40 },
      { id: 'gov-2', name: 'Permits & Licenses',    estimatedTime: 35 },
      { id: 'gov-3', name: 'General Inquiries',     estimatedTime: 15 },
      { id: 'gov-4', name: 'ID / Passport Renewal', estimatedTime: 45 },
    ],
  },
  {
    industryId: 'education',
    industry: 'Education', icon: 'school', color: '#4f46e5',
    services: [
      { id: 'edu-1', name: 'Admissions',       estimatedTime: 20 },
      { id: 'edu-2', name: 'Registrar',        estimatedTime: 15 },
      { id: 'edu-3', name: 'Financial Aid',    estimatedTime: 30 },
      { id: 'edu-4', name: 'Library Services', estimatedTime: 5  },
    ],
  },
  {
    industryId: 'corporate',
    industry: 'Corporate Office', icon: 'business', color: '#0d9488',
    services: [
      { id: 'crp-1', name: 'Reception',   estimatedTime: 5  },
      { id: 'crp-2', name: 'HR Services', estimatedTime: 20 },
      { id: 'crp-3', name: 'IT Support',  estimatedTime: 15 },
      { id: 'crp-4', name: 'Facilities',  estimatedTime: 10 },
    ],
  },
];

const SERVICES = SERVICE_GROUPS.flatMap(g =>
  g.services.map(s => ({ ...s, industry: g.industry, color: g.color }))
);

type ApiBranch = { id: number; name: string; address: string; business_industry: string };

const BRANCHES_BY_INDUSTRY: Record<string, { name: string; address: string }[]> = {
  banking:    [
    { name: 'Manhattan Financial Center', address: '123 Wall St, New York'        },
    { name: 'Brooklyn Service Hub',        address: '456 Atlantic Ave, Brooklyn'  },
    { name: 'Queens Branch',               address: '789 Queens Blvd, Queens'     },
  ],
  healthcare: [
    { name: 'Main Hospital — Downtown',  address: '10 Medical Blvd, Downtown'    },
    { name: 'Northside Clinic',          address: '22 Health Ave, Northside'     },
    { name: 'Eastside Medical Center',   address: '88 Eastside Rd, East'         },
  ],
  retail:     [
    { name: 'Flagship Store — Downtown', address: '1 Retail Plaza, Downtown'     },
    { name: 'Mall Branch',               address: 'Level 2, Central Mall'        },
    { name: 'Westside Outlet',           address: '55 West Rd, Westside'         },
  ],
  government: [
    { name: 'City Hall — Main Office',   address: '1 Civic Square, Downtown'     },
    { name: 'North District Office',     address: '44 North Ave, Northgate'      },
    { name: 'South Service Centre',      address: '77 South Rd, Southville'      },
  ],
  education:  [
    { name: 'Main Campus — Admin Block', address: 'Building A, Main Campus'      },
    { name: 'East Campus',               address: 'East Wing, Campus B'          },
    { name: 'City Learning Centre',      address: '12 City Rd, Downtown'         },
  ],
  corporate:  [
    { name: 'HQ Tower A — Floor 12', address: '1 Corporate Blvd, CBD'            },
    { name: 'West Office Park',      address: '33 Business Park, West'           },
    { name: 'East Hub',              address: '88 East Business Park'            },
  ],
};

// ─── 3 appointment dates per month, per industry ───────────────────────────────
// Each entry: { day: 0=Sun…6=Sat, week: 1st/2nd/3rd/4th occurrence in month }

type DaySlot = { day: number; week: number };

const INDUSTRY_SCHEDULE: Record<string, DaySlot[]> = {
  banking:    [{ day: 2, week: 1 }, { day: 4, week: 2 }, { day: 2, week: 3 }], // 1st Tue, 2nd Thu, 3rd Tue
  healthcare: [{ day: 1, week: 1 }, { day: 3, week: 2 }, { day: 5, week: 3 }], // 1st Mon, 2nd Wed, 3rd Fri
  retail:     [{ day: 6, week: 1 }, { day: 3, week: 2 }, { day: 6, week: 3 }], // 1st Sat, 2nd Wed, 3rd Sat
  government: [{ day: 1, week: 2 }, { day: 3, week: 3 }, { day: 1, week: 4 }], // 2nd Mon, 3rd Wed, 4th Mon
  education:  [{ day: 4, week: 1 }, { day: 1, week: 3 }, { day: 3, week: 4 }], // 1st Thu, 3rd Mon, 4th Wed
  corporate:  [{ day: 2, week: 2 }, { day: 4, week: 3 }, { day: 2, week: 4 }], // 2nd Tue, 3rd Thu, 4th Tue
  general:    [{ day: 2, week: 1 }, { day: 4, week: 2 }, { day: 2, week: 3 }], // default: same as banking
};

// ─── 3 time slots per industry ────────────────────────────────────────────────

const INDUSTRY_TIMES: Record<string, string[]> = {
  banking:    ['09:00', '11:00', '14:00'],
  healthcare: ['08:00', '10:00', '15:00'],
  retail:     ['10:00', '12:00', '16:00'],
  government: ['09:30', '11:30', '14:00'],
  education:  ['10:00', '13:00', '15:00'],
  corporate:  ['09:00', '11:00', '14:30'],
  general:    ['10:00', '12:00', '15:00'],
};

// North Cyprus (TRNC) Public Holidays 2026
const HOLIDAYS: string[] = [
  '2026-01-01', '2026-04-23', '2026-05-01', '2026-05-19',
  '2026-07-20', '2026-08-01', '2026-08-30', '2026-10-29', '2026-11-15',
  '2026-03-20', '2026-03-21', '2026-03-22',
  '2026-05-27', '2026-05-28', '2026-05-29', '2026-05-30',
  '2026-09-04',
];

function getAvailableDates(year: number, month: number, industryId: string): Set<number> {
  const schedule = INDUSTRY_SCHEDULE[industryId] ?? INDUSTRY_SCHEDULE.general;
  const available = new Set<number>();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const weekday    = new Date(year, month, d).getDay();
    const weekOfMonth = Math.ceil(d / 7);
    const dateStr    = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (
      schedule.some(s => s.day === weekday && s.week === weekOfMonth) &&
      !HOLIDAYS.includes(dateStr)
    ) {
      available.add(d);
    }
  }
  return available;
}

// ─── API types ─────────────────────────────────────────────────────────────────

type Appointment = {
  id: number;
  ticket_number: string;
  customer: number;
  customer_name: string;
  service: number | null;
  service_name: string;
  branch: number | null;
  branch_name: string;
  service_name_text: string;
  branch_name_text: string;
  appointment_date: string;
  appointment_time: string;
  status: AppStatus;
  notes: string;
  created_at: string;
  updated_at: string;
};

type BookingForm = {
  customerName: string; serviceId: string; serviceName: string;
  serviceIndustry: string; industryId: string;
  branch: string; date: string; time: string; notes: string;
};

const EMPTY_FORM: BookingForm = {
  customerName: '', serviceId: '', serviceName: '',
  serviceIndustry: '', industryId: '',
  branch: '', date: '', time: '', notes: '',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<AppStatus, { color: string; bg: string; label: string }> = {
  scheduled: { color: '#2563eb', bg: '#eff6ff', label: 'Scheduled' },
  confirmed: { color: '#059669', bg: '#ecfdf5', label: 'Confirmed' },
  completed: { color: '#7c3aed', bg: '#f5f3ff', label: 'Completed' },
  cancelled: { color: '#e11d48', bg: '#fff1f2', label: 'Cancelled' },
};

function displayDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTime(t: string) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const hr = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hr}:${String(m).padStart(2, '0')} ${ap}`;
}

// ─── Calendar Picker ───────────────────────────────────────────────────────────

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];
const CAL_HEADERS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function CalendarPicker({
  visible, selected, onSelect, onClose, industryId,
}: {
  visible: boolean;
  selected: string;
  onSelect: (dateStr: string) => void;
  onClose: () => void;
  industryId: string;   // determines which 3 dates/month are available
}) {
  const today = React.useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }, []);

  const [viewYear,  setViewYear]  = React.useState(today.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(today.getMonth());

  const availSet = React.useMemo(
    () => getAvailableDates(viewYear, viewMonth, industryId || 'general'),
    [viewYear, viewMonth, industryId],
  );

  const cells = React.useMemo(() => {
    const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
    const offset = (firstWeekday + 6) % 7;
    const days   = new Date(viewYear, viewMonth + 1, 0).getDate();
    const arr: (number | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= days; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [viewYear, viewMonth]);

  const selDay = React.useMemo(() => {
    if (!selected) return null;
    const [y, m, d] = selected.split('-').map(Number);
    return y === viewYear && m - 1 === viewMonth ? d : null;
  }, [selected, viewYear, viewMonth]);

  const todayDay = today.getFullYear() === viewYear && today.getMonth() === viewMonth
    ? today.getDate() : null;

  const canPrev = viewYear > today.getFullYear() ||
    (viewYear === today.getFullYear() && viewMonth > today.getMonth());

  const goPrev = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const goNext = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={cal.overlay}>
        <View style={cal.sheet}>
          <View style={cal.hdr}>
            <View>
              <Text style={cal.hdrTitle}>Choose Date</Text>
              <Text style={cal.hdrSub}>Only available appointment days are highlighted</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={cal.monthNav}>
            <TouchableOpacity
              onPress={canPrev ? goPrev : undefined}
              style={[cal.navBtn, !canPrev && { opacity: 0.3 }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialIcons name="chevron-left" size={22} color="#0f172a" />
            </TouchableOpacity>
            <Text style={cal.monthLabel}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
            <TouchableOpacity onPress={goNext} style={cal.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="chevron-right" size={22} color="#0f172a" />
            </TouchableOpacity>
          </View>

          <View style={cal.weekRow}>
            {CAL_HEADERS.map(h => (
              <View key={h} style={cal.weekCell}>
                <Text style={cal.weekHdr}>{h}</Text>
              </View>
            ))}
          </View>

          <View style={cal.grid}>
            {cells.map((day, i) => {
              if (day === null) return <View key={`e${i}`} style={cal.dayCell} />;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isPast  = new Date(dateStr + 'T00:00:00') < today;
              const isAvail = availSet.has(day) && !isPast;
              const isSel   = selDay === day;
              const isToday = todayDay === day;
              return (
                <TouchableOpacity
                  key={`d${day}`}
                  style={cal.dayCell}
                  onPress={isAvail ? () => { onSelect(dateStr); onClose(); } : undefined}
                  activeOpacity={isAvail ? 0.7 : 1}
                  disabled={!isAvail}
                >
                  <View style={[
                    cal.dayInner,
                    isAvail && !isSel && cal.dayInnerAvail,
                    isSel && cal.dayInnerSel,
                    isToday && !isSel && cal.dayInnerToday,
                  ]}>
                    <Text style={[
                      cal.dayTxt,
                      isAvail && !isSel && cal.dayTxtAvail,
                      isSel && cal.dayTxtSel,
                      isPast && cal.dayTxtPast,
                    ]}>
                      {day}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={cal.legend}>
            {([
              { color: '#eff6ff', border: '#93c5fd', label: 'Available' },
              { color: '#2563eb', border: '#2563eb', label: 'Selected'  },
              { color: '#f1f5f9', border: '#e2e8f0', label: 'Unavailable' },
            ] as { color: string; border: string; label: string }[]).map(l => (
              <View key={l.label} style={cal.legendItem}>
                <View style={[cal.legendDot, { backgroundColor: l.color, borderColor: l.border }]} />
                <Text style={cal.legendTxt}>{l.label}</Text>
              </View>
            ))}
          </View>

          {!!selected && selDay !== null && (
            <View style={cal.selBanner}>
              <MaterialIcons name="event" size={15} color="#2563eb" />
              <Text style={cal.selBannerText}>{displayDate(selected)}</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Appointment card ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AppStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <View style={[st.badge, { backgroundColor: s.bg }]}>
      <Text style={[st.badgeText, { color: s.color }]}>{s.label}</Text>
    </View>
  );
}

function AppointmentCard({ appt, isStaff, onCancel, onReschedule, onConfirm, onMarkServed }: {
  appt: Appointment; isStaff: boolean;
  onCancel: (id: number) => void; onReschedule: (a: Appointment) => void;
  onConfirm: (id: number) => void; onMarkServed: (id: number) => void;
}) {
  const svc   = SERVICES.find(s => s.name === appt.service_name);
  const color = svc?.color ?? '#2563eb';
  return (
    <View style={st.apptCard}>
      <View style={[st.apptHdr, { backgroundColor: color }]}>
        <StatusBadge status={appt.status} />
        <Text style={st.apptTicket}>{appt.ticket_number}</Text>
        <Text style={st.apptCustomer}>{appt.customer_name}</Text>
        <Text style={st.apptService}>{appt.service_name}</Text>
        {svc && <Text style={st.apptIndustry}>{svc.industry}</Text>}
      </View>
      <View style={st.apptBody}>
        {[
          { icon: 'event'    as IconName, label: 'Date',     value: displayDate(appt.appointment_date) },
          { icon: 'schedule' as IconName, label: 'Time',     value: formatTime(appt.appointment_time)  },
          { icon: 'place'    as IconName, label: 'Location', value: appt.branch_name                   },
        ].map(row => (
          <View key={row.label} style={st.apptRow}>
            <View style={st.apptRowIcon}>
              <MaterialIcons name={row.icon} size={18} color="#64748b" />
            </View>
            <View>
              <Text style={st.apptRowLabel}>{row.label}</Text>
              <Text style={st.apptRowValue}>{row.value}</Text>
            </View>
          </View>
        ))}
        {isStaff ? (
          <View style={st.actionRow}>
            {appt.status === 'scheduled' && (
              <TouchableOpacity style={[st.actionBtn, { backgroundColor: '#059669' }]} onPress={() => onConfirm(appt.id)}>
                <MaterialIcons name="check" size={14} color="#fff" />
                <Text style={st.actionBtnTxt}>Confirm</Text>
              </TouchableOpacity>
            )}
            {appt.status === 'confirmed' && (
              <TouchableOpacity style={[st.actionBtn, { backgroundColor: '#7c3aed' }]} onPress={() => onMarkServed(appt.id)}>
                <MaterialIcons name="how-to-reg" size={14} color="#fff" />
                <Text style={st.actionBtnTxt}>Mark Served</Text>
              </TouchableOpacity>
            )}
            {(appt.status === 'scheduled' || appt.status === 'confirmed') && (
              <TouchableOpacity style={st.actionBtnOut} onPress={() => onCancel(appt.id)}>
                <Text style={st.actionBtnOutTxt}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          (appt.status === 'scheduled' || appt.status === 'confirmed') ? (
            <View style={st.actionRow}>
              <TouchableOpacity style={st.actionBtnOut} onPress={() => onCancel(appt.id)}>
                <Text style={st.actionBtnOutTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.actionBtn, { flex: 1, backgroundColor: '#2563eb' }]} onPress={() => onReschedule(appt)}>
                <Text style={st.actionBtnTxt}>Reschedule</Text>
              </TouchableOpacity>
            </View>
          ) : null
        )}
      </View>
    </View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function AppointmentsScreen() {
  const router = useRouter();
  const { role } = useAppContext();
  const { user } = useAuth();
  const isStaff = role === 'staff' || role === 'admin' || role === 'super_admin' || role === 'superadmin';

  const [appointments,      setAppointments]      = useState<Appointment[]>([]);
  const [loading,           setLoading]           = useState(true);
  const [staffServices, setStaffServices] = useState<{ name: string; industry: string }[] | null>(null);
  const [publishedIds,      setPublishedIds]      = useState<string[] | null>(null);

  const [apiBranches, setApiBranches] = useState<ApiBranch[]>([]);

  const [showBooking,      setShowBooking]      = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [form,             setForm]             = useState<BookingForm>(EMPTY_FORM);
  const [submitting,       setSubmitting]       = useState(false);
  const [selectedService,  setSelectedService]  = useState<string | null>(null);
  const [successMsg,       setSuccessMsg]       = useState('');

  const [showServicePicker, setShowServicePicker] = useState(false);
  const [showBranchPicker,  setShowBranchPicker]  = useState(false);
  const [showCalendar,      setShowCalendar]      = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await api.get<{ results: Appointment[] } | Appointment[]>('/appointments/');
    if (error) Alert.alert('Error loading appointments', error);
    else {
      const list = Array.isArray(data) ? data : (data as any)?.results ?? [];
      setAppointments(list);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Published industries — controlled by super admin
  useEffect(() => {
    api.get<{ id: string; label: string }[]>('/businesses/visible-industries/')
      .then(({ data }) => {
        if (data && Array.isArray(data)) setPublishedIds(data.map(d => d.id));
      });
  }, []);

  // Set branches for the selected industry; try API then fall back to static data
  useEffect(() => {
    const industryId = form.industryId;
    if (!industryId) return;

    // Show static branches immediately so picker is never empty
    const staticList = (BRANCHES_BY_INDUSTRY[industryId] ?? []).map((b, i) => ({
      id: -(i + 1), ...b, business_industry: industryId,
    }));
    setApiBranches(staticList);

    // Then try to fetch real branches from API and replace if we get results
    const path = industryId === 'general'
      ? '/branches/'
      : `/branches/?industry=${industryId}`;
    api.get<ApiBranch[]>(path, true, true).then(({ data }) => {
      if (data && Array.isArray(data) && data.length > 0) setApiBranches(data);
    });
  }, [form.industryId]);

  // Staff: fetch assigned services with their industry
  useEffect(() => {
    if (role !== 'staff') return;
    api.get<{ assigned_services: { id: number; name: string; industry: string }[] }>('/accounts/my-counter/')
      .then(({ data }) => {
        if (data) setStaffServices(data.assigned_services.map(s => ({ name: s.name, industry: s.industry })));
      });
  }, [role]);

  const visibleGroups = React.useMemo(() => {
    let groups = SERVICE_GROUPS;
    if (publishedIds !== null && publishedIds.length > 0) {
      groups = groups.filter(g => publishedIds.includes(g.industryId));
    }
    if (role === 'staff' && staffServices !== null && staffServices.length > 0) {
      // Filter by industry — ignore services with no industry (fall back to name match)
      const assignedIndustries = new Set(
        staffServices.map(s => s.industry).filter(Boolean)
      );
      const assignedNames = new Set(staffServices.map(s => s.name));
      if (assignedIndustries.size > 0) {
        groups = groups.filter(g => assignedIndustries.has(g.industryId));
      } else {
        // Fallback: filter by service name if industries are missing
        groups = groups.filter(g => g.services.some(s => assignedNames.has(s.name)));
      }
    }
    return groups;
  }, [publishedIds, role, staffServices]);

  const openBooking = (reschedule?: Appointment) => {
    if (reschedule) {
      setRescheduleTarget(reschedule);
      const svc       = SERVICES.find(s => s.name === reschedule.service_name);
      const group     = SERVICE_GROUPS.find(g => g.services.some(s => s.name === reschedule.service_name));
      setForm({
        customerName:    reschedule.customer_name,
        serviceId:       svc?.id ?? 'general',
        serviceName:     reschedule.service_name,
        serviceIndustry: group?.industry ?? '',
        industryId:      group?.industryId ?? 'general',
        branch:          reschedule.branch_name,
        date:            reschedule.appointment_date,
        time:            reschedule.appointment_time.slice(0, 5),
        notes:           reschedule.notes ?? '',
      });
    } else {
      setRescheduleTarget(null);
      setForm({ ...EMPTY_FORM, customerName: user?.full_name ?? '' });
    }
    setShowBooking(true);
  };

  const handleSubmit = async () => {
    if (!form.serviceId) { Alert.alert('Missing', 'Please select a service.'); return; }
    if (!form.branch)    { Alert.alert('Missing', 'Please select a branch.');  return; }
    if (!form.date)      { Alert.alert('Missing', 'Please pick a date.');      return; }
    if (!form.time)      { Alert.alert('Missing', 'Please choose a time.');    return; }
    setSubmitting(true);

    if (rescheduleTarget) {
      const { data, error } = await api.patch<Appointment>(`/appointments/${rescheduleTarget.id}/`, {
        service_name_text: form.serviceName,
        branch_name_text:  form.branch,
        appointment_date:  form.date,
        appointment_time:  form.time,
        notes:             form.notes,
        status:            'scheduled',
      });
      if (error) {
        Alert.alert('Error', error);
      } else {
        setShowBooking(false); setRescheduleTarget(null); setForm(EMPTY_FORM);
        setSuccessMsg(`Rescheduled to ${displayDate(data!.appointment_date)} at ${formatTime(data!.appointment_time.slice(0,5))}`);
        await loadData();
        setTimeout(() => setSuccessMsg(''), 5000);
      }
    } else {
      const { data, error } = await api.post<Appointment>('/appointments/', {
        service_name_text: form.serviceName,
        branch_name_text:  form.branch,
        appointment_date:  form.date,
        appointment_time:  form.time,
        notes:             form.notes,
      });
      if (error) {
        Alert.alert('Booking failed', error);
      } else {
        setShowBooking(false); setForm(EMPTY_FORM);
        setSuccessMsg(`Appointment booked for ${displayDate(data!.appointment_date)} at ${formatTime(data!.appointment_time.slice(0,5))}`);
        await loadData();
        setTimeout(() => setSuccessMsg(''), 5000);
      }
    }
    setSubmitting(false);
  };

  const handleCancel = (id: number) => {
    Alert.alert('Cancel Appointment', 'Are you sure?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
        const { data, error } = await api.post<Appointment>(`/appointments/${id}/cancel/`, {});
        if (error) Alert.alert('Error', error);
        else setAppointments(prev => prev.map(a => a.id === id ? data! : a));
      }},
    ]);
  };

  const handleConfirm = async (id: number) => {
    const { data, error } = await api.post<Appointment>(`/appointments/${id}/confirm/`, {});
    if (error) Alert.alert('Error', error);
    else setAppointments(prev => prev.map(a => a.id === id ? data! : a));
  };

  const handleMarkServed = async (id: number) => {
    const { data, error } = await api.post<Appointment>(`/appointments/${id}/complete/`, {});
    if (error) Alert.alert('Error', error);
    else setAppointments(prev => prev.map(a => a.id === id ? data! : a));
  };

  // ── Booking form ─────────────────────────────────────────────────────────────
  if (showBooking) {
    const svcColor  = SERVICES.find(s => s.id === form.serviceId)?.color ?? '#2563eb';
    const timeSlots = INDUSTRY_TIMES[form.industryId] ?? INDUSTRY_TIMES.general;

    return (
      <SafeAreaView style={st.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={st.header}>
          <TouchableOpacity onPress={() => { setShowBooking(false); setRescheduleTarget(null); }} style={st.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
          </TouchableOpacity>
          <Text style={st.headerTitle}>{rescheduleTarget ? 'Reschedule' : 'Book Appointment'}</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={st.formScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Service */}
          <Text style={st.fieldLabel}>Service</Text>
          <TouchableOpacity style={st.pickerRow} onPress={() => setShowServicePicker(true)}>
            {form.serviceId ? (
              <View style={[st.svcDot, { backgroundColor: svcColor + '20' }]}>
                <MaterialIcons name="confirmation-number" size={16} color={svcColor} />
              </View>
            ) : (
              <MaterialIcons name="confirmation-number" size={18} color="#94a3b8" />
            )}
            <View style={{ flex: 1 }}>
              <Text style={[st.pickerTxt, !form.serviceId && st.pickerPh]}>
                {form.serviceName || 'Select a service'}
              </Text>
              {!!form.serviceIndustry && <Text style={st.pickerSub}>{form.serviceIndustry}</Text>}
            </View>
            <MaterialIcons name="expand-more" size={20} color="#94a3b8" />
          </TouchableOpacity>

          {/* Name */}
          <Text style={[st.fieldLabel, { marginTop: 16 }]}>Your Name</Text>
          <View style={[st.inputRow, { backgroundColor: '#f8fafc' }]}>
            <MaterialIcons name="person" size={18} color="#94a3b8" />
            <TextInput style={[st.textInput, { flex: 1, color: '#94a3b8' }]} value={form.customerName} editable={false} />
          </View>

          {/* Branch */}
          <Text style={[st.fieldLabel, { marginTop: 16 }]}>Branch Location</Text>
          <TouchableOpacity style={st.pickerRow} onPress={() => setShowBranchPicker(true)}>
            <MaterialIcons name="place" size={18} color="#94a3b8" />
            <Text style={[st.pickerTxt, { flex: 1 }, !form.branch && st.pickerPh]}>
              {form.branch || 'Select a branch'}
            </Text>
            <MaterialIcons name="expand-more" size={20} color="#94a3b8" />
          </TouchableOpacity>

          {/* Date — always tappable, only shows scheduled days */}
          <Text style={[st.fieldLabel, { marginTop: 16 }]}>Date</Text>
          <TouchableOpacity style={st.pickerRow} onPress={() => setShowCalendar(true)}>
            <MaterialIcons name="event" size={18} color={form.date ? '#2563eb' : '#94a3b8'} />
            <View style={{ flex: 1 }}>
              <Text style={[st.pickerTxt, !form.date && st.pickerPh]}>
                {form.date ? displayDate(form.date) : 'Choose an available date'}
              </Text>
              {!form.date && (
                <Text style={st.pickerSub}>~3 available dates per month</Text>
              )}
            </View>
            <MaterialIcons name="chevron-right" size={18} color="#94a3b8" />
          </TouchableOpacity>

          {/* Time — 3 slots, always visible and clickable */}
          <Text style={[st.fieldLabel, { marginTop: 16 }]}>Time</Text>
          <View style={st.timeGrid}>
            {timeSlots.map(slot => (
              <TouchableOpacity
                key={slot}
                style={[st.timeSlot, form.time === slot && st.timeSlotActive]}
                onPress={() => setForm(p => ({ ...p, time: slot }))}
                activeOpacity={0.7}
              >
                <Text style={[st.timeSlotTxt, form.time === slot && st.timeSlotTxtActive]}>
                  {formatTime(slot)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Notes */}
          <Text style={[st.fieldLabel, { marginTop: 16 }]}>Special Requirements</Text>
          <TextInput
            style={st.notesInput}
            placeholder="Any special requirements…"
            placeholderTextColor="#94a3b8"
            multiline numberOfLines={3}
            value={form.notes}
            onChangeText={v => setForm(p => ({ ...p, notes: v }))}
          />

          {/* Submit */}
          <View style={st.submitRow}>
            <TouchableOpacity style={st.cancelFormBtn} onPress={() => { setShowBooking(false); setRescheduleTarget(null); }}>
              <Text style={st.cancelFormBtnTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.submitBtn} onPress={handleSubmit} disabled={submitting}>
              {submitting
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={st.submitBtnTxt}>{rescheduleTarget ? 'Confirm Reschedule' : 'Confirm Booking'}</Text>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Service picker */}
        <Modal visible={showServicePicker} transparent animationType="slide">
          <View style={st.modalOverlay}>
            <View style={st.pickerModal}>
              <View style={st.pickerModalHdr}>
                <Text style={st.pickerModalTitle}>Select Service</Text>
                <TouchableOpacity onPress={() => setShowServicePicker(false)}>
                  <MaterialIcons name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {visibleGroups.map(group => (
                  <View key={group.industry}>
                    <View style={[st.groupHdr, { borderLeftColor: group.color }]}>
                      <View style={[st.svcGroupDot, { backgroundColor: group.color + '20' }]}>
                        <MaterialIcons name={group.icon} size={14} color={group.color} />
                      </View>
                      <Text style={[st.groupHdrTxt, { color: group.color }]}>{group.industry}</Text>
                    </View>
                    {group.services.map(svc => (
                      <TouchableOpacity
                        key={svc.id}
                        style={st.pickerOpt}
                        onPress={() => {
                          setForm(p => ({ ...p, serviceId: svc.id, serviceName: svc.name, serviceIndustry: group.industry, industryId: group.industryId, date: '', time: '' }));
                          setShowServicePicker(false);
                        }}
                      >
                        <View style={{ flex: 1, paddingLeft: 8 }}>
                          <Text style={st.pickerOptName}>{svc.name}</Text>
                          <Text style={st.pickerOptSub}>{svc.estimatedTime} min est.</Text>
                        </View>
                        {form.serviceId === svc.id && <MaterialIcons name="check-circle" size={20} color="#2563eb" />}
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Branch picker */}
        <Modal visible={showBranchPicker} transparent animationType="slide">
          <View style={st.modalOverlay}>
            <View style={st.pickerModal}>
              <View style={st.pickerModalHdr}>
                <Text style={st.pickerModalTitle}>Select Branch</Text>
                <TouchableOpacity onPress={() => setShowBranchPicker(false)}>
                  <MaterialIcons name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {apiBranches.length === 0 ? (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <Text style={{ color: '#94a3b8', fontSize: 13 }}>No branches available for this service.</Text>
                  </View>
                ) : apiBranches.map(branch => (
                  <TouchableOpacity
                    key={branch.id}
                    style={st.pickerOpt}
                    onPress={() => { setForm(p => ({ ...p, branch: branch.name })); setShowBranchPicker(false); }}
                  >
                    <MaterialIcons name="location-on" size={18} color="#64748b" style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={st.pickerOptName}>{branch.name}</Text>
                      {!!branch.address && <Text style={st.pickerOptSub}>{branch.address}</Text>}
                    </View>
                    {form.branch === branch.name && <MaterialIcons name="check-circle" size={20} color="#2563eb" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Calendar */}
        <CalendarPicker
          visible={showCalendar}
          selected={form.date}
          onSelect={dateStr => setForm(p => ({ ...p, date: dateStr, time: '' }))}
          onClose={() => setShowCalendar(false)}
          industryId={form.industryId || 'general'}
        />
      </SafeAreaView>
    );
  }

  // ── Staff: service grid ───────────────────────────────────────────────────────
  if (isStaff && !selectedService) {
    // Wait for both appointments AND assigned services to load before rendering
    const staffLoading = loading || (role === 'staff' && staffServices === null);

    return (
      <SafeAreaView style={st.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={st.header}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/staff/dashboard' as any)} style={st.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Appointments</Text>
          <View style={{ width: 36 }} />
        </View>
        {staffLoading ? (
          <View style={st.loadingBox}><ActivityIndicator size="large" color="#2563eb" /></View>
        ) : (
          <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
            {visibleGroups.length === 0 ? (
              <View style={st.emptyBox}>
                <MaterialIcons name="event-busy" size={48} color="#cbd5e1" />
                <Text style={st.emptyTitle}>No Assigned Services</Text>
                <Text style={st.emptySub}>You have no services assigned yet. Contact your admin.</Text>
              </View>
            ) : visibleGroups.map(group => {
              // Only show services this staff member is actually assigned to
              const assignedServiceNames = (staffServices && staffServices.length > 0)
                ? staffServices.filter(s => !s.industry || s.industry === group.industryId).map(s => s.name)
                : null;
              const assignedServices = group.services.filter(svc =>
                !assignedServiceNames || assignedServiceNames.length === 0 || assignedServiceNames.includes(svc.name)
              );
              return (
                <View key={group.industry}>
                  <View style={[st.groupHdr, { borderLeftColor: group.color }]}>
                    <View style={[st.svcGroupDot, { backgroundColor: group.color + '20' }]}>
                      <MaterialIcons name={group.icon} size={14} color={group.color} />
                    </View>
                    <Text style={[st.groupHdrTxt, { color: group.color }]}>{group.industry}</Text>
                  </View>
                  {assignedServices.map(svc => {
                    const count = appointments.filter(a => a.service_name === svc.name).length;
                    return (
                      <TouchableOpacity key={svc.id} style={st.serviceCard} onPress={() => setSelectedService(svc.name)} activeOpacity={0.85}>
                        <View style={[st.serviceCardIcon, { backgroundColor: group.color + '15' }]}>
                          <MaterialIcons name="confirmation-number" size={22} color={group.color} />
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={st.serviceCardName}>{svc.name}</Text>
                          <Text style={st.serviceCardMeta}>{svc.estimatedTime} min · <Text style={[st.serviceCardCount, { color: group.color }]}>{count} appt{count !== 1 ? 's' : ''}</Text></Text>
                        </View>
                        <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })}
          </ScrollView>
        )}
        <BottomNav />
      </SafeAreaView>
    );
  }

  // ── Staff: appointments for a service ─────────────────────────────────────────
  if (isStaff && selectedService) {
    const staffAppts = appointments.filter(a => a.service_name === selectedService);
    return (
      <SafeAreaView style={st.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={st.header}>
          <TouchableOpacity onPress={() => setSelectedService(null)} style={st.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
          </TouchableOpacity>
          <Text style={st.headerTitle} numberOfLines={1}>{selectedService}</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
          {staffAppts.length === 0 ? (
            <View style={st.emptyBox}>
              <MaterialIcons name="event-busy" size={48} color="#cbd5e1" />
              <Text style={st.emptyTitle}>No Appointments</Text>
              <Text style={st.emptySub}>No appointments for this service yet.</Text>
            </View>
          ) : staffAppts.map(appt => (
            <AppointmentCard key={appt.id} appt={appt} isStaff
              onCancel={handleCancel} onReschedule={openBooking}
              onConfirm={handleConfirm} onMarkServed={handleMarkServed} />
          ))}
        </ScrollView>
        <BottomNav />
      </SafeAreaView>
    );
  }

  // ── Customer view ─────────────────────────────────────────────────────────────
  const customerAppts = appointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed');
  const pastAppts     = appointments.filter(a => a.status === 'completed');

  return (
    <SafeAreaView style={st.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={st.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/customer/home' as any)} style={st.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={st.headerTitle}>My Appointments</Text>
        <TouchableOpacity onPress={() => openBooking()} style={st.addBtn}>
          <MaterialIcons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {!!successMsg && (
        <View style={st.successBanner}>
          <MaterialIcons name="check-circle" size={18} color="#059669" />
          <Text style={st.successBannerTxt}>{successMsg}</Text>
        </View>
      )}

      {loading ? (
        <View style={st.loadingBox}><ActivityIndicator size="large" color="#2563eb" /></View>
      ) : (
        <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
          <Text style={st.sectionLabel}>Upcoming Appointments</Text>
          {customerAppts.length === 0 ? (
            <View style={st.emptyBox}>
              <MaterialIcons name="event-available" size={48} color="#cbd5e1" />
              <Text style={st.emptyTitle}>No Upcoming Appointments</Text>
              <Text style={st.emptySub}>You have no appointments scheduled.</Text>
              <TouchableOpacity style={st.bookNowBtn} onPress={() => openBooking()}>
                <Text style={st.bookNowBtnTxt}>Book Your First Appointment</Text>
              </TouchableOpacity>
            </View>
          ) : customerAppts.map(appt => (
            <AppointmentCard key={appt.id} appt={appt} isStaff={false}
              onCancel={handleCancel} onReschedule={openBooking}
              onConfirm={handleConfirm} onMarkServed={handleMarkServed} />
          ))}

          {pastAppts.length > 0 && (
            <>
              <Text style={[st.sectionLabel, { marginTop: 8 }]}>Past Appointments</Text>
              {pastAppts.map(appt => (
                <AppointmentCard key={appt.id} appt={appt} isStaff={false}
                  onCancel={handleCancel} onReschedule={openBooking}
                  onConfirm={handleConfirm} onMarkServed={handleMarkServed} />
              ))}
            </>
          )}
        </ScrollView>
      )}
      <BottomNav />
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', flex: 1, textAlign: 'center' },
  addBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  successBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#ecfdf5', borderBottomWidth: 1, borderBottomColor: '#a7f3d0', paddingHorizontal: 16, paddingVertical: 12 },
  successBannerTxt: { fontSize: 13, fontWeight: '700', color: '#059669', flex: 1 },
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },
  browseRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  browseIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center' },
  browseTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  browseSub: { fontSize: 12, fontWeight: '500', color: '#64748b', marginTop: 2 },
  apptCard: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  apptHdr: { padding: 18, gap: 3 },
  apptTicket: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.65)', fontFamily: 'monospace' },
  apptCustomer: { fontSize: 18, fontWeight: '800', color: '#fff' },
  apptService: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  apptIndustry: { fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: '600', marginTop: 2 },
  apptBody: { padding: 14, gap: 10 },
  apptRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  apptRowIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  apptRowLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' },
  apptRowValue: { fontSize: 13, color: '#0f172a', fontWeight: '600', marginTop: 1 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, marginBottom: 4 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 10 },
  actionBtnTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
  actionBtnOut: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 10, borderWidth: 2, borderColor: '#fecaca' },
  actionBtnOutTxt: { fontSize: 13, fontWeight: '700', color: '#e11d48' },
  serviceCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  serviceCardIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  serviceCardName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  serviceCardMeta: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
  serviceCardCount: { fontWeight: '700' },
  groupHdr: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingLeft: 4, borderLeftWidth: 3, paddingHorizontal: 10, marginTop: 8 },
  svcGroupDot: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  groupHdrTxt: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  emptyBox: { backgroundColor: '#fff', borderRadius: 20, padding: 40, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', marginTop: 8 },
  emptySub: { fontSize: 13, color: '#64748b', fontWeight: '500', textAlign: 'center' },
  bookNowBtn: { marginTop: 12, backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  bookNowBtnTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
  formScroll: { padding: 16, gap: 4, paddingBottom: 40 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  pickerTxt: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  pickerPh: { color: '#94a3b8', fontWeight: '500' },
  pickerSub: { fontSize: 11, color: '#94a3b8', fontWeight: '500', marginTop: 1 },
  svcDot: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  textInput: { fontSize: 14, color: '#0f172a', fontWeight: '600' },
  timeGrid: { flexDirection: 'row', gap: 12, marginTop: 2, flexWrap: 'wrap' },
  timeSlot: { flex: 1, minWidth: 90, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#fff', alignItems: 'center' },
  timeSlotActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  timeSlotTxt: { fontSize: 14, fontWeight: '700', color: '#334155' },
  timeSlotTxtActive: { color: '#fff' },
  notesInput: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 14, color: '#0f172a', fontWeight: '500', textAlignVertical: 'top', minHeight: 80 },
  submitRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelFormBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 2, borderColor: '#e2e8f0', alignItems: 'center' },
  cancelFormBtnTxt: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  submitBtn: { flex: 2, paddingVertical: 14, borderRadius: 14, backgroundColor: '#2563eb', alignItems: 'center' },
  submitBtnTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  pickerModal: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '75%' },
  pickerModalHdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  pickerModalTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  pickerOpt: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 10 },
  pickerOptName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  pickerOptSub: { fontSize: 11, color: '#94a3b8', fontWeight: '500', marginTop: 1 },
});

// ─── Calendar styles ───────────────────────────────────────────────────────────

const cal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:   { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 16 },
  hdr:      { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  hdrTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  hdrSub:   { fontSize: 12, color: '#7c3aed', fontWeight: '600', marginTop: 3 },
  monthNav:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  navBtn:     { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  monthLabel: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  weekRow:  { flexDirection: 'row', marginBottom: 4 },
  weekCell: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  weekHdr:  { fontSize: 11, fontWeight: '700', color: '#94a3b8' },
  grid:    { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.285%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayInner:      { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dayInnerAvail: { backgroundColor: '#eff6ff' },
  dayInnerSel:   { backgroundColor: '#2563eb' },
  dayInnerToday: { borderWidth: 2, borderColor: '#2563eb' },
  dayTxt:      { fontSize: 13, fontWeight: '500', color: '#cbd5e1' },
  dayTxtAvail: { fontSize: 13, fontWeight: '700', color: '#1d4ed8' },
  dayTxtSel:   { fontSize: 13, fontWeight: '800', color: '#fff' },
  dayTxtPast:  { fontSize: 13, fontWeight: '400', color: '#e8ecf0' },
  legend:     { flexDirection: 'row', gap: 14, justifyContent: 'center', paddingTop: 10, marginTop: 6, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:  { width: 10, height: 10, borderRadius: 5, borderWidth: 1 },
  legendTxt:  { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  selBanner:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#eff6ff', borderRadius: 12, padding: 12, marginTop: 10 },
  selBannerText: { fontSize: 13, fontWeight: '600', color: '#1d4ed8', flex: 1 },
});
