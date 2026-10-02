import { User, Therapist, TherapistSchedule, Patient, Appointment, PsychotherapySession, Invoice, SystemStatus } from '../types';

const TOKEN_KEY = 'psicogestion_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || data.message || `Error en el servidor (${response.status})`);
  }

  return data as T;
}

export const api = {
  // Auth
  login: (credentials: { email: string; password: string }) =>
    request<{ token: string; user: User; message: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  loginDemo: () =>
    request<{ token: string; user: User; message: string }>('/auth/demo', {
      method: 'POST',
    }),

  register: (payload: { name: string; email: string; password: string; clinic_name?: string }) =>
    request<{ token: string; user: User; message: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMe: () => request<{ user: User; therapist: Therapist | null }>('/auth/me'),

  forgotPassword: (email: string) =>
    request<{ message: string; emailSent: boolean; previewCode?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (payload: { email: string; code: string; newPassword: string }) =>
    request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Therapists
  getTherapists: () => request<Therapist[]>('/therapists'),
  createTherapist: (therapist: Partial<Therapist>) =>
    request<{ message: string; id: string }>('/therapists', {
      method: 'POST',
      body: JSON.stringify(therapist),
    }),
  updateTherapist: (id: string, therapist: Partial<Therapist>) =>
    request<{ message: string }>(`/therapists/${id}`, {
      method: 'PUT',
      body: JSON.stringify(therapist),
    }),

  // Schedules
  getSchedules: (therapistId: string) => request<TherapistSchedule[]>(`/schedules/${therapistId}`),
  saveSchedules: (therapistId: string, schedules: Partial<TherapistSchedule>[]) =>
    request<{ message: string }>(`/schedules/${therapistId}`, {
      method: 'POST',
      body: JSON.stringify({ schedules }),
    }),
  getAvailableSlots: (therapistId: string, date: string) =>
    request<{ available: boolean; slots: Array<{ startTime: string; endTime: string; isBooked: boolean }>; message?: string }>(
      `/schedules/${therapistId}/available-slots?date=${date}`
    ),

  // Patients
  getPatients: (params?: { search?: string; therapistId?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.therapistId) query.append('therapistId', params.therapistId);
    if (params?.status) query.append('status', params.status);
    return request<Patient[]>(`/patients?${query.toString()}`);
  },
  getPatientById: (id: string) => request<{ patient: Patient; history: any[] }>(`/patients/${id}`),
  createPatient: (patient: Partial<Patient>) =>
    request<{ message: string; id: string }>('/patients', {
      method: 'POST',
      body: JSON.stringify(patient),
    }),
  updatePatient: (id: string, patient: Partial<Patient>) =>
    request<{ message: string }>(`/patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(patient),
    }),
  deletePatient: (id: string) => request<{ message: string }>(`/patients/${id}`, { method: 'DELETE' }),

  // Appointments
  getAppointments: (params?: { date?: string; therapistId?: string; patientId?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.date) query.append('date', params.date);
    if (params?.therapistId) query.append('therapistId', params.therapistId);
    if (params?.patientId) query.append('patientId', params.patientId);
    if (params?.status) query.append('status', params.status);
    return request<Appointment[]>(`/appointments?${query.toString()}`);
  },
  createAppointment: (appointment: Partial<Appointment>) =>
    request<{ message: string; id: string }>('/appointments', {
      method: 'POST',
      body: JSON.stringify(appointment),
    }),
  updateAppointment: (id: string, appointment: Partial<Appointment>) =>
    request<{ message: string }>(`/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(appointment),
    }),

  // Psychotherapy Sessions
  getSessionByAppointment: (appointmentId: string) =>
    request<{ session: PsychotherapySession | null; appointment?: Appointment }>(`/sessions/appointment/${appointmentId}`),
  saveSession: (session: Partial<PsychotherapySession>) =>
    request<{ message: string }>('/sessions', {
      method: 'POST',
      body: JSON.stringify(session),
    }),

  // AI Gemini 2.5 Flash
  processSOAP: (rawNotes: string, patientContext?: string) =>
    request<{ subjective: string; objective: string; assessment: string; plan: string; keyThemes: string[] }>('/ai/soap', {
      method: 'POST',
      body: JSON.stringify({ rawNotes, patientContext }),
    }),
  analyzeInsights: (session: { subjective: string; objective: string; assessment: string; plan: string }) =>
    request<{ summary: string; riskFactors: string; nextGoals: string; suggestedInterventions: string[] }>('/ai/insights', {
      method: 'POST',
      body: JSON.stringify(session),
    }),
  polishNote: (text: string) =>
    request<{ polished: string }>('/ai/polish', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  // Invoices
  getInvoices: () => request<Invoice[]>('/invoices'),
  getInvoiceById: (id: string) => request<Invoice>(`/invoices/${id}`),
  createInvoiceFromAppointment: (appointmentId: string, options?: { taxRate?: number; notes?: string; paymentMethod?: string; paymentStatus?: string }) =>
    request<{ message: string; id: string; invoiceNumber: string }>('/invoices/from-appointment', {
      method: 'POST',
      body: JSON.stringify({
        appointment_id: appointmentId,
        tax_rate: options?.taxRate || 0,
        notes: options?.notes,
        payment_method: options?.paymentMethod,
        payment_status: options?.paymentStatus,
      }),
    }),
  updateInvoiceStatus: (id: string, status: string, paymentMethod?: string) =>
    request<{ message: string }>(`/invoices/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ payment_status: status, payment_method: paymentMethod }),
    }),
  sendInvoiceEmail: (id: string) =>
    request<{ sent: boolean; message: string }>(`/invoices/${id}/send-email`, {
      method: 'POST',
    }),

  // Global Search
  searchGlobal: (query: string) => request<{ patients: Patient[]; therapists: Therapist[] }>(`/search?q=${encodeURIComponent(query)}`),

  // Dashboard Stats
  getDashboardStats: () =>
    request<{
      activePatients: number;
      todayAppointments: number;
      pendingInvoicesCount: number;
      pendingInvoicesTotal: number;
      completedSessionsCount: number;
      recentAppointments: any[];
    }>('/dashboard/stats'),

  // Settings & Diagnostics
  getSystemStatus: () => request<SystemStatus>('/settings/status'),
  saveTursoConfig: (payload: { url: string; token: string }) =>
    request<{ success: boolean; message: string; database: any }>('/settings/turso', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  saveGeminiConfig: (payload: { apiKey?: string; model?: string; baseUrl?: string }) =>
    request<{ success: boolean; message: string }>('/settings/gemini', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  saveSmtpConfig: (payload: { host?: string; port?: number; user?: string; pass?: string; from?: string }) =>
    request<{ success: boolean; message: string }>('/settings/smtp', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  testSmtpConnection: (payload?: { host?: string; port?: number; user?: string; pass?: string }) =>
    request<{ success: boolean; message: string }>('/settings/smtp/test', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),
};
