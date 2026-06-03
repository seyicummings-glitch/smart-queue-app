/**
 * Queue, Appointment and Service helpers — backed by the Django REST API.
 * Function signatures are unchanged from the Supabase version so no screens
 * need to be updated.
 */
import { api } from '../lib/api';

// ── Shared Django response shapes ─────────────────────────────────────────────
export type DjangoTicket = {
  id:             number;
  ticket_number:  string;
  customer:       number;
  customer_name:  string;
  service:        number;
  service_name:   string;
  branch:         number;
  branch_name:    string;
  status:         'waiting' | 'serving' | 'completed' | 'cancelled' | 'called';
  position:       number;
  notes:          string;
  estimated_wait: number;
  issued_at:      string;
  called_at:      string | null;
  completed_at:   string | null;
};

export type DjangoAppointment = {
  id:               number;
  ticket_number:    string;
  customer:         number;
  customer_name:    string;
  service:          number;
  service_name:     string;
  branch:           number;
  branch_name:      string;
  appointment_date: string;
  appointment_time: string;
  status:           string;
  notes:            string;
  created_at:       string;
  updated_at:       string;
};

export type DjangoService = {
  id:             number;
  name:           string;
  description:    string;
  estimated_time: number;
  industry:       string;
  business:       number;
  business_name:  string;
  branch:         number | null;
  branch_name:    string | null;
  is_active:      boolean;
  created_at:     string;
};

type PagedResponse<T> = { count: number; next: string | null; previous: string | null; results: T[] };

// ── Queue Tickets ─────────────────────────────────────────────────────────────

/**
 * Join the queue for a given service + branch.
 * @param serviceId  Django integer service ID (as string for compatibility)
 * @param branchId   Django integer branch ID (as string for compatibility)
 */
export const createQueueTicket = async (
  _customerId: string,   // kept for API compatibility; Django derives from token
  _industryId: string,   // kept for API compatibility; not needed by Django
  serviceId:   string,
  branchId:    string = '1',
  notes?:      string,
) => {
  const { data, error } = await api.post<DjangoTicket>('/queues/join/', {
    service: Number(serviceId),
    branch:  Number(branchId),
    ...(notes ? { notes } : {}),
  });
  if (error || !data) return { data: null, error: new Error(error ?? 'Failed to join queue') };
  return { data, error: null };
};

/** All tickets for the authenticated customer (paginated). */
export const getCustomerTickets = async (_customerId: string) => {
  const { data, error } = await api.get<PagedResponse<DjangoTicket>>('/queues/tickets/');
  if (error || !data) return { data: null, error: new Error(error ?? 'Failed to load tickets') };
  return { data: data.results, error: null };
};

/** The currently active (waiting / called / serving) ticket for this user. */
export const getActiveTicket = async (_customerId: string) => {
  const { data, error } = await api.get<DjangoTicket | null>('/queues/my-ticket/');
  // 404 means no active ticket — not a real error
  if (error?.includes('404') || error?.includes('No active')) return { data: null, error: null };
  if (error) return { data: null, error: new Error(error) };
  return { data, error: null };
};

/** Cancel a queue ticket. */
export const cancelTicket = async (ticketId: string) => {
  const { error } = await api.post(`/queues/tickets/${ticketId}/cancel/`);
  if (error) return { error: new Error(error) };
  return { error: null };
};

/** All active tickets for a given industry (staff view). */
export const getQueueByIndustry = async (_industryId: string) => {
  const { data, error } = await api.get<PagedResponse<DjangoTicket>>(
    `/queues/tickets/?status=waiting&status=serving&status=called`,
  );
  if (error || !data) return { data: null, error: new Error(error ?? 'Failed to load queue') };
  return { data: data.results, error: null };
};

/** Update a ticket's status (call / complete). */
export const updateTicketStatus = async (
  ticketId: string,
  status:   string,
  _counterId?: string,
) => {
  let path: string;
  if (status === 'serving' || status === 'called') {
    path = `/queues/tickets/${ticketId}/call-next/`;
  } else if (status === 'completed') {
    path = `/queues/tickets/${ticketId}/complete/`;
  } else if (status === 'cancelled') {
    path = `/queues/tickets/${ticketId}/cancel/`;
  } else {
    return { error: new Error(`Unknown status: ${status}`) };
  }
  const { error } = await api.post(path);
  if (error) return { error: new Error(error) };
  return { error: null };
};

/** Live queue stats for a branch. */
export const getQueueStatus = async (branchId?: string) => {
  const query = branchId ? `?branch=${branchId}` : '';
  const { data, error } = await api.get<{
    waiting: number; serving: number; completed: number; avg_wait: number;
  }>(`/queues/status/${query}`);
  if (error || !data) return { data: null, error: new Error(error ?? 'Failed to load status') };
  return { data, error: null };
};

// ── Appointments ──────────────────────────────────────────────────────────────

/** Book an appointment. */
export const createAppointment = async (
  _customerId:     string,
  _industryId:     string,
  serviceId:       string,
  appointmentDate: string,
  appointmentTime: string,
  notes?:          string,
  branchId:        string = '1',
) => {
  // Ensure time is in HH:MM:SS format Django expects
  const time = appointmentTime.length === 5 ? `${appointmentTime}:00` : appointmentTime;
  const { data, error } = await api.post<DjangoAppointment>('/appointments/', {
    service:          Number(serviceId),
    branch:           Number(branchId),
    appointment_date: appointmentDate,
    appointment_time: time,
    ...(notes ? { notes } : {}),
  });
  if (error || !data) return { data: null, error: new Error(error ?? 'Failed to book appointment') };
  return { data, error: null };
};

/** All appointments for the authenticated customer. */
export const getCustomerAppointments = async (_customerId: string) => {
  const { data, error } = await api.get<PagedResponse<DjangoAppointment>>('/appointments/');
  if (error || !data) return { data: null, error: new Error(error ?? 'Failed to load appointments') };
  return { data: data.results, error: null };
};

/** Cancel an appointment. */
export const cancelAppointment = async (appointmentId: string) => {
  const { error } = await api.post(`/appointments/${appointmentId}/cancel/`);
  if (error) return { error: new Error(error) };
  return { error: null };
};

/** Confirm an appointment (staff). */
export const confirmAppointment = async (appointmentId: string) => {
  const { error } = await api.post(`/appointments/${appointmentId}/confirm/`);
  if (error) return { error: new Error(error) };
  return { error: null };
};

/** Complete an appointment (staff). */
export const completeAppointment = async (appointmentId: string) => {
  const { error } = await api.post(`/appointments/${appointmentId}/complete/`);
  if (error) return { error: new Error(error) };
  return { error: null };
};

// ── Services ──────────────────────────────────────────────────────────────────

/** Services for a given industry (string name, e.g. "banking"). */
export const getServicesByIndustry = async (industryId: string) => {
  const { data, error } = await api.get<PagedResponse<DjangoService>>(
    `/services/?industry=${encodeURIComponent(industryId)}`,
  );
  if (error || !data) return { data: null, error: new Error(error ?? 'Failed to load services') };
  return { data: data.results, error: null };
};

/** All active services (no industry filter). */
export const getAllServices = async () => {
  const { data, error } = await api.get<PagedResponse<DjangoService>>('/services/');
  if (error || !data) return { data: null, error: new Error(error ?? 'Failed to load services') };
  return { data: data.results, error: null };
};

// ── Industries (static — Django has no dedicated endpoint) ────────────────────
export const getAllIndustries = async () => {
  const INDUSTRIES = [
    { id: 'banking',    name: 'Banking & Finance',   icon: 'account-balance', color: '#2563eb', description: 'Financial services' },
    { id: 'healthcare', name: 'Healthcare',           icon: 'local-hospital',  color: '#059669', description: 'Medical services'   },
    { id: 'retail',     name: 'Retail',               icon: 'shopping-cart',   color: '#f97316', description: 'Shopping & retail'  },
    { id: 'government', name: 'Government Services',  icon: 'account-balance', color: '#475569', description: 'Government offices' },
    { id: 'education',  name: 'Education',            icon: 'school',          color: '#4f46e5', description: 'Schools & colleges' },
    { id: 'corporate',  name: 'Corporate Office',     icon: 'business',        color: '#7c3aed', description: 'Corporate services' },
  ];
  return { data: INDUSTRIES, error: null };
};

// ── Real-time polling (replaces Supabase subscriptions) ───────────────────────
/**
 * Poll for queue updates every `intervalMs` ms.
 * Returns a cleanup function — call it to stop polling.
 */
export const subscribeToQueueUpdates = (
  industryId: string,
  callback:   (data: DjangoTicket[]) => void,
  intervalMs  = 8000,
): (() => void) => {
  let active = true;
  const poll = async () => {
    if (!active) return;
    const { data } = await getQueueByIndustry(industryId);
    if (active && data) callback(data);
    if (active) setTimeout(poll, intervalMs);
  };
  poll();
  return () => { active = false; };
};

export const subscribeToTicketUpdates = (
  ticketId: string,
  callback: (ticket: DjangoTicket | null) => void,
  intervalMs = 5000,
): (() => void) => {
  let active = true;
  const poll = async () => {
    if (!active) return;
    const { data } = await api.get<DjangoTicket>(`/queues/tickets/${ticketId}/`);
    if (active) callback(data ?? null);
    if (active) setTimeout(poll, intervalMs);
  };
  poll();
  return () => { active = false; };
};
