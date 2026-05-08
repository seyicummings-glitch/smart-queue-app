import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppContext } from '@/context/AppContext';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];
type AppStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled';

// ─── Data ─────────────────────────────────────────────────────────────────────

const SERVICE_GROUPS: {
  industry: string;
  icon: IconName;
  color: string;
  services: { id: string; name: string; estimatedTime: number }[];
}[] = [
  {
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
    industry: 'Retail', icon: 'shopping-bag', color: '#d97706',
    services: [
      { id: 'rtl-1', name: 'Returns & Exchanges', estimatedTime: 12 },
      { id: 'rtl-2', name: 'Customer Service',    estimatedTime: 8  },
      { id: 'rtl-3', name: 'Tech Support',        estimatedTime: 25 },
      { id: 'rtl-4', name: 'Click & Collect',     estimatedTime: 5  },
    ],
  },
  {
    industry: 'Government Services', icon: 'gavel', color: '#475569',
    services: [
      { id: 'gov-1', name: 'Document Processing',   estimatedTime: 40 },
      { id: 'gov-2', name: 'Permits & Licenses',    estimatedTime: 35 },
      { id: 'gov-3', name: 'General Inquiries',     estimatedTime: 15 },
      { id: 'gov-4', name: 'ID / Passport Renewal', estimatedTime: 45 },
    ],
  },
  {
    industry: 'Education', icon: 'school', color: '#4f46e5',
    services: [
      { id: 'edu-1', name: 'Admissions',       estimatedTime: 20 },
      { id: 'edu-2', name: 'Registrar',        estimatedTime: 15 },
      { id: 'edu-3', name: 'Financial Aid',    estimatedTime: 30 },
      { id: 'edu-4', name: 'Library Services', estimatedTime: 5  },
    ],
  },
  {
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

const BRANCHES = ['Main Branch', 'Downtown Branch', 'West End Hub', 'Northside Branch'];

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
];

type Appointment = {
  id: string; date: string; time: string;
  service: string; serviceId: string; branch: string;
  status: AppStatus; customerName: string; ticketNumber: string; notes?: string;
};

type BookingForm = {
  customerName: string; serviceId: string; serviceName: string;
  serviceIndustry: string; branch: string; date: string; time: string; notes: string;
};

const EMPTY_FORM: BookingForm = {
  customerName: 'Alex Johnson', serviceId: '', serviceName: '',
  serviceIndustry: '', branch: '', date: '', time: '', notes: '',
};

const MOCK_APPOINTMENTS: Appointment[] = [
  { id: '1', date: '2026-05-10', time: '10:00', service: 'Account Opening',    serviceId: 'bnk-3', branch: 'Main Branch',     status: 'scheduled', customerName: 'Alex Johnson', ticketNumber: 'APT-001' },
  { id: '2', date: '2026-05-12', time: '14:30', service: 'Loan Consultation',  serviceId: 'bnk-2', branch: 'Downtown Branch', status: 'confirmed', customerName: 'Maria Santos', ticketNumber: 'APT-002' },
  { id: '3', date: '2026-04-28', time: '09:30', service: 'General Practitioner',serviceId: 'hlc-1', branch: 'West End Hub',   status: 'completed', customerName: 'James Lee',   ticketNumber: 'APT-003' },
  { id: '4', date: '2026-04-20', time: '11:00', service: 'IT Support',         serviceId: 'crp-3', branch: 'Main Branch',     status: 'cancelled', customerName: 'Sarah Kim',   ticketNumber: 'APT-004' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const hr = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hr}:${String(m).padStart(2, '0')} ${ap}`;
}

// ─── Calendar Picker ──────────────────────────────────────────────────────────

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_ABBR    = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function CalendarPicker({
  visible, selected, onSelect, onClose,
}: {
  visible: boolean;
  selected: string;
  onSelect: (dateStr: string) => void;
  onClose: () => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear,       setViewYear]       = useState(today.getFullYear());
  const [viewMonth,      setViewMonth]      = useState(today.getMonth());
  const [showYearPicker, setShowYearPicker] = useState(false);

  React.useEffect(() => {
    if (visible) {
      if (selected && /^\d{4}-\d{2}-\d{2}$/.test(selected)) {
        const d = new Date(selected + 'T00:00:00');
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      } else {
        setViewYear(today.getFullYear());
        setViewMonth(today.getMonth());
      }
      setShowYearPicker(false);
    }
  }, [visible]);

  const MIN_YEAR = today.getFullYear();
  const MAX_YEAR = today.getFullYear() + 5;
  const years = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MIN_YEAR + i);

  const canPrev = !(viewMonth === today.getMonth() && viewYear === MIN_YEAR);
  const canNext = !(viewMonth === 11 && viewYear === MAX_YEAR);

  const prevMonth = () => {
    if (!canPrev) return;
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (!canNext) return;
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const toStr   = (d: number) => `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const isPast  = (d: number) => new Date(viewYear, viewMonth, d) < today;
  const isToday = (d: number) => viewYear === today.getFullYear() && viewMonth === today.getMonth() && d === today.getDate();
  const isSel   = (d: number) => selected === toStr(d);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={cal.overlay}>
        <View style={cal.sheet}>
          {/* Header */}
          <View style={cal.hdr}>
            <Text style={cal.hdrTitle}>Select Date</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Month / year navigation */}
          <View style={cal.nav}>
            <TouchableOpacity onPress={prevMonth} disabled={!canPrev} style={[cal.navBtn, !canPrev && { opacity: 0.25 }]}>
              <MaterialIcons name="chevron-left" size={28} color="#0f172a" />
            </TouchableOpacity>

            <TouchableOpacity style={cal.monthYearBtn} onPress={() => setShowYearPicker(true)}>
              <Text style={cal.monthText}>{MONTH_NAMES[viewMonth]}</Text>
              <View style={cal.yearChip}>
                <Text style={cal.yearChipText}>{viewYear}</Text>
                <MaterialIcons name="arrow-drop-down" size={16} color="#2563eb" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={nextMonth} disabled={!canNext} style={[cal.navBtn, !canNext && { opacity: 0.25 }]}>
              <MaterialIcons name="chevron-right" size={28} color="#0f172a" />
            </TouchableOpacity>
          </View>

          {/* Day-of-week labels */}
          <View style={cal.dayRow}>
            {DAY_ABBR.map(d => <Text key={d} style={cal.dayLabel}>{d}</Text>)}
          </View>

          {/* Day grid */}
          <View style={cal.grid}>
            {cells.map((day, i) => {
              if (day === null) return <View key={`e${i}`} style={cal.cell} />;
              const past = isPast(day);
              const sel  = isSel(day);
              const tod  = isToday(day);
              return (
                <TouchableOpacity
                  key={`d${day}`}
                  style={[cal.cell, sel && cal.cellSel, tod && !sel && cal.cellTod]}
                  onPress={() => { if (!past) { onSelect(toStr(day)); onClose(); } }}
                  disabled={past}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    cal.cellTxt,
                    past && cal.cellPast,
                    tod && !sel && cal.cellTodTxt,
                    sel && cal.cellSelTxt,
                  ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Selected date display */}
          {!!selected && (
            <View style={cal.selBanner}>
              <MaterialIcons name="event" size={15} color="#2563eb" />
              <Text style={cal.selBannerText}>{displayDate(selected)}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Year picker nested modal */}
      {showYearPicker && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowYearPicker(false)}>
          <View style={cal.overlay}>
            <View style={cal.yearSheet}>
              <View style={cal.hdr}>
                <Text style={cal.hdrTitle}>Select Year</Text>
                <TouchableOpacity onPress={() => setShowYearPicker(false)}>
                  <MaterialIcons name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {years.map(y => (
                  <TouchableOpacity
                    key={y}
                    style={[cal.yearRow, y === viewYear && cal.yearRowActive]}
                    onPress={() => { setViewYear(y); setShowYearPicker(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[cal.yearTxt, y === viewYear && cal.yearTxtActive]}>{y}</Text>
                    {y === viewYear && <MaterialIcons name="check-circle" size={18} color="#2563eb" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </Modal>
  );
}

// ─── Appointment card ─────────────────────────────────────────────────────────

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
  onCancel: (id: string) => void; onReschedule: (a: Appointment) => void;
  onConfirm: (id: string) => void; onMarkServed: (id: string) => void;
}) {
  const svc = SERVICES.find(s => s.id === appt.serviceId);
  const color = svc?.color ?? '#2563eb';
  return (
    <View style={st.apptCard}>
      <View style={[st.apptHdr, { backgroundColor: color }]}>
        <StatusBadge status={appt.status} />
        <Text style={st.apptTicket}>{appt.ticketNumber}</Text>
        <Text style={st.apptCustomer}>{appt.customerName}</Text>
        <Text style={st.apptService}>{appt.service}</Text>
        {svc && <Text style={st.apptIndustry}>{svc.industry}</Text>}
      </View>
      <View style={st.apptBody}>
        {[
          { icon: 'event'    as IconName, label: 'Date',     value: displayDate(appt.date) },
          { icon: 'schedule' as IconName, label: 'Time',     value: formatTime(appt.time)  },
          { icon: 'place'    as IconName, label: 'Location', value: appt.branch             },
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

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function AppointmentsScreen() {
  const router = useRouter();
  const { role } = useAppContext();
  const isStaff = role === 'staff' || role === 'admin' || role === 'super_admin' || role === 'superadmin';

  const [appointments,     setAppointments]     = useState<Appointment[]>(MOCK_APPOINTMENTS);
  const [showBooking,      setShowBooking]       = useState(false);
  const [rescheduleTarget, setRescheduleTarget]  = useState<Appointment | null>(null);
  const [form,             setForm]              = useState<BookingForm>(EMPTY_FORM);
  const [submitting,       setSubmitting]        = useState(false);
  const [selectedService,  setSelectedService]   = useState<string | null>(null);

  // Pickers
  const [showServicePicker, setShowServicePicker] = useState(false);
  const [showBranchPicker,  setShowBranchPicker]  = useState(false);
  const [showCalendar,      setShowCalendar]      = useState(false);

  const openBooking = (reschedule?: Appointment) => {
    if (reschedule) {
      setRescheduleTarget(reschedule);
      const svc = SERVICES.find(s => s.id === reschedule.serviceId);
      setForm({
        customerName: reschedule.customerName,
        serviceId: reschedule.serviceId,
        serviceName: reschedule.service,
        serviceIndustry: svc?.industry ?? '',
        branch: reschedule.branch,
        date: reschedule.date,
        time: reschedule.time,
        notes: reschedule.notes ?? '',
      });
    } else {
      setRescheduleTarget(null);
      setForm(EMPTY_FORM);
    }
    setShowBooking(true);
  };

  const handleSubmit = () => {
    if (!form.serviceId) { Alert.alert('Missing', 'Please select a service.'); return; }
    if (!form.branch)    { Alert.alert('Missing', 'Please select a branch.');  return; }
    if (!form.date)      { Alert.alert('Missing', 'Please pick a date.');      return; }
    if (!form.time)      { Alert.alert('Missing', 'Please choose a time slot.'); return; }
    setSubmitting(true);
    setTimeout(() => {
      if (rescheduleTarget) {
        setAppointments(prev => prev.map(a =>
          a.id === rescheduleTarget.id
            ? { ...a, service: form.serviceName, serviceId: form.serviceId, branch: form.branch, date: form.date, time: form.time, notes: form.notes, status: 'scheduled' }
            : a
        ));
        Alert.alert('Rescheduled', 'Your appointment has been rescheduled.');
      } else {
        const newAppt: Appointment = {
          id: String(Date.now()),
          date: form.date, time: form.time,
          service: form.serviceName, serviceId: form.serviceId,
          branch: form.branch, status: 'scheduled',
          customerName: form.customerName,
          ticketNumber: `APT-${String(appointments.length + 1).padStart(3, '0')}`,
          notes: form.notes,
        };
        setAppointments(prev => [newAppt, ...prev]);
        Alert.alert('Booked!', 'Your appointment has been scheduled.');
      }
      setSubmitting(false);
      setShowBooking(false);
      setRescheduleTarget(null);
      setForm(EMPTY_FORM);
    }, 800);
  };

  const handleCancel = (id: string) => {
    Alert.alert('Cancel Appointment', 'Are you sure?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: () =>
        setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a)) },
    ]);
  };
  const handleConfirm    = (id: string) => setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'confirmed'  } : a));
  const handleMarkServed = (id: string) => setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'completed'  } : a));

  // ── Booking form view ──────────────────────────────────────────────────────
  if (showBooking) {
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
              <View style={[st.svcDot, { backgroundColor: (SERVICES.find(s => s.id === form.serviceId)?.color ?? '#2563eb') + '20' }]}>
                <MaterialIcons name="confirmation-number" size={16} color={SERVICES.find(s => s.id === form.serviceId)?.color ?? '#2563eb'} />
              </View>
            ) : (
              <MaterialIcons name="confirmation-number" size={18} color="#94a3b8" />
            )}
            <View style={{ flex: 1 }}>
              <Text style={[st.pickerTxt, !form.serviceId && st.pickerPh]}>
                {form.serviceName || 'Select a service'}
              </Text>
              {!!form.serviceIndustry && (
                <Text style={st.pickerSub}>{form.serviceIndustry}</Text>
              )}
            </View>
            <MaterialIcons name="expand-more" size={20} color="#94a3b8" />
          </TouchableOpacity>
          {!!form.serviceId && (
            <Text style={st.fieldHint}>
              Est. duration: {SERVICES.find(s => s.id === form.serviceId)?.estimatedTime} min
            </Text>
          )}

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

          {/* Date — calendar picker */}
          <Text style={[st.fieldLabel, { marginTop: 16 }]}>Date</Text>
          <TouchableOpacity style={st.pickerRow} onPress={() => setShowCalendar(true)}>
            <MaterialIcons name="event" size={18} color={form.date ? '#2563eb' : '#94a3b8'} />
            <Text style={[st.pickerTxt, { flex: 1 }, !form.date && st.pickerPh]}>
              {form.date ? displayDate(form.date) : 'Pick a date'}
            </Text>
            <MaterialIcons name="calendar-today" size={16} color="#94a3b8" />
          </TouchableOpacity>

          {/* Time slots */}
          <Text style={[st.fieldLabel, { marginTop: 16 }]}>Time Slot</Text>
          <View style={st.timeGrid}>
            {TIME_SLOTS.map(slot => (
              <TouchableOpacity
                key={slot}
                style={[st.timeSlot, form.time === slot && st.timeSlotActive]}
                onPress={() => setForm(p => ({ ...p, time: slot }))}
              >
                <Text style={[st.timeSlotTxt, form.time === slot && st.timeSlotTxtActive]}>
                  {slot}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Notes */}
          <Text style={[st.fieldLabel, { marginTop: 16 }]}>Notes (optional)</Text>
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

        {/* ── Service picker modal ── */}
        <Modal visible={showServicePicker} transparent animationType="slide">
          <View style={st.modalOverlay}>
            <View style={st.pickerModal}>
              <View style={st.pickerModalHdr}>
                <Text style={st.pickerModalTitle}>Select Service</Text>
                <TouchableOpacity onPress={() => setShowServicePicker(false)}>
                  <MaterialIcons name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* No service option */}
                <TouchableOpacity
                  style={st.pickerOpt}
                  onPress={() => { setForm(p => ({ ...p, serviceId: 'general', serviceName: 'General / No Specific Service', serviceIndustry: '' })); setShowServicePicker(false); }}
                >
                  <View style={[st.svcGroupDot, { backgroundColor: '#f1f5f9' }]}>
                    <MaterialIcons name="help-outline" size={16} color="#64748b" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.pickerOptName}>General / No Specific Service</Text>
                    <Text style={st.pickerOptSub}>I don't need a specific service</Text>
                  </View>
                  {form.serviceId === 'general' && <MaterialIcons name="check-circle" size={20} color="#2563eb" />}
                </TouchableOpacity>

                {/* Services grouped by industry */}
                {SERVICE_GROUPS.map(group => (
                  <View key={group.industry}>
                    {/* Industry header */}
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
                        onPress={() => { setForm(p => ({ ...p, serviceId: svc.id, serviceName: svc.name, serviceIndustry: group.industry })); setShowServicePicker(false); }}
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

        {/* ── Branch picker modal ── */}
        <Modal visible={showBranchPicker} transparent animationType="slide">
          <View style={st.modalOverlay}>
            <View style={st.pickerModal}>
              <View style={st.pickerModalHdr}>
                <Text style={st.pickerModalTitle}>Select Branch</Text>
                <TouchableOpacity onPress={() => setShowBranchPicker(false)}>
                  <MaterialIcons name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>
              {BRANCHES.map(branch => (
                <TouchableOpacity
                  key={branch}
                  style={st.pickerOpt}
                  onPress={() => { setForm(p => ({ ...p, branch })); setShowBranchPicker(false); }}
                >
                  <MaterialIcons name="location-on" size={18} color="#64748b" style={{ marginRight: 8 }} />
                  <Text style={[st.pickerOptName, { flex: 1 }]}>{branch}</Text>
                  {form.branch === branch && <MaterialIcons name="check-circle" size={20} color="#2563eb" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

        {/* ── Calendar modal ── */}
        <CalendarPicker
          visible={showCalendar}
          selected={form.date}
          onSelect={dateStr => setForm(p => ({ ...p, date: dateStr }))}
          onClose={() => setShowCalendar(false)}
        />
      </SafeAreaView>
    );
  }

  // ── Staff: service grid ────────────────────────────────────────────────────
  if (isStaff && !selectedService) {
    return (
      <SafeAreaView style={st.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={st.header}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/admin/dashboard' as any)} style={st.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Appointments</Text>
          <TouchableOpacity onPress={() => openBooking()} style={st.addBtn}>
            <MaterialIcons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
          {SERVICE_GROUPS.map(group => (
            <View key={group.industry}>
              <View style={[st.groupHdr, { borderLeftColor: group.color }]}>
                <View style={[st.svcGroupDot, { backgroundColor: group.color + '20' }]}>
                  <MaterialIcons name={group.icon} size={14} color={group.color} />
                </View>
                <Text style={[st.groupHdrTxt, { color: group.color }]}>{group.industry}</Text>
              </View>
              {group.services.map(svc => {
                const count = appointments.filter(a => a.serviceId === svc.id).length;
                return (
                  <TouchableOpacity key={svc.id} style={st.serviceCard} onPress={() => setSelectedService(svc.id)} activeOpacity={0.85}>
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
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Staff: appointments for service ───────────────────────────────────────
  if (isStaff && selectedService) {
    const svcName = SERVICES.find(s => s.id === selectedService)?.name ?? '';
    const staffAppts = appointments.filter(a => a.serviceId === selectedService);
    return (
      <SafeAreaView style={st.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={st.header}>
          <TouchableOpacity onPress={() => setSelectedService(null)} style={st.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
          </TouchableOpacity>
          <Text style={st.headerTitle} numberOfLines={1}>{svcName}</Text>
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
      </SafeAreaView>
    );
  }

  // ── Customer view ──────────────────────────────────────────────────────────
  const customerAppts = appointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed');
  const pastAppts     = appointments.filter(a => a.status === 'completed'  || a.status === 'cancelled');

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

      <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={st.browseRow} onPress={() => router.push('/customer/virtual-queue' as any)} activeOpacity={0.85}>
          <View style={st.browseIcon}>
            <MaterialIcons name="queue" size={20} color="#7c3aed" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.browseTitle}>Walk-in Queue</Text>
            <Text style={st.browseSub}>Join the live queue without booking</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
        </TouchableOpacity>

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
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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

  content: { padding: 16, gap: 10, paddingBottom: 40 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },

  browseRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  browseIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center' },
  browseTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  browseSub: { fontSize: 12, fontWeight: '500', color: '#64748b', marginTop: 2 },

  // Appointment card
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

  // Staff service grid
  serviceCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  serviceCardIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  serviceCardName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  serviceCardMeta: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
  serviceCardCount: { fontWeight: '700' },
  groupHdr: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingLeft: 4, borderLeftWidth: 3, paddingHorizontal: 10, marginTop: 8 },
  svcGroupDot: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  groupHdrTxt: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Empty state
  emptyBox: { backgroundColor: '#fff', borderRadius: 20, padding: 40, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', marginTop: 8 },
  emptySub: { fontSize: 13, color: '#64748b', fontWeight: '500', textAlign: 'center' },
  bookNowBtn: { marginTop: 12, backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  bookNowBtnTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Booking form
  formScroll: { padding: 16, gap: 4, paddingBottom: 40 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 },
  fieldHint: { fontSize: 11, color: '#94a3b8', fontWeight: '500', marginTop: 4 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  pickerTxt: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  pickerPh: { color: '#94a3b8', fontWeight: '500' },
  pickerSub: { fontSize: 11, color: '#94a3b8', fontWeight: '500', marginTop: 1 },
  svcDot: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  textInput: { fontSize: 14, color: '#0f172a', fontWeight: '600' },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeSlot: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  timeSlotActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  timeSlotTxt: { fontSize: 12, fontWeight: '600', color: '#334155' },
  timeSlotTxtActive: { color: '#fff' },
  notesInput: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 14, color: '#0f172a', fontWeight: '500', textAlignVertical: 'top', minHeight: 80 },
  submitRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelFormBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 2, borderColor: '#e2e8f0', alignItems: 'center' },
  cancelFormBtnTxt: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  submitBtn: { flex: 2, paddingVertical: 14, borderRadius: 14, backgroundColor: '#2563eb', alignItems: 'center' },
  submitBtnTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Pickers / modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  pickerModal: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '75%' },
  pickerModalHdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  pickerModalTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  pickerOpt: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 10 },
  pickerOptName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  pickerOptSub: { fontSize: 11, color: '#94a3b8', fontWeight: '500', marginTop: 1 },
});

// ─── Calendar styles ──────────────────────────────────────────────────────────

const cal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 32 },
  yearSheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: 380, paddingBottom: 32 },

  hdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  hdrTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },

  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  navBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  monthYearBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  monthText: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  yearChip: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  yearChipText: { fontSize: 14, fontWeight: '700', color: '#2563eb' },

  dayRow: { flexDirection: 'row', marginBottom: 6 },
  dayLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', paddingVertical: 4 },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.2857%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 2 },
  cellSel: { backgroundColor: '#2563eb', borderRadius: 999 },
  cellTod: { borderWidth: 2, borderColor: '#2563eb', borderRadius: 999 },
  cellTxt: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  cellPast: { color: '#cbd5e1' },
  cellTodTxt: { color: '#2563eb', fontWeight: '800' },
  cellSelTxt: { color: '#fff', fontWeight: '800' },

  selBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#eff6ff', borderRadius: 12, padding: 12, marginTop: 14 },
  selBannerText: { fontSize: 13, fontWeight: '600', color: '#1d4ed8', flex: 1 },

  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  yearRowActive: { backgroundColor: '#eff6ff', borderRadius: 10, paddingHorizontal: 10 },
  yearTxt: { fontSize: 16, fontWeight: '600', color: '#334155' },
  yearTxtActive: { color: '#2563eb', fontWeight: '800' },
});
