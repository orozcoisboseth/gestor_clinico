export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'therapist';
  clinic_name?: string | null;
  therapistId?: string | null;
  created_at?: string;
}

export interface Therapist {
  id: string;
  user_id?: string | null;
  full_name: string;
  license_number: string;
  specialty: string;
  phone: string;
  email: string;
  hourly_rate: number;
  currency: string;
  bio?: string;
  is_active: number;
  created_at?: string;
}

export interface TherapistSchedule {
  id: string;
  therapist_id: string;
  day_of_week: number; // 0: Dom, 1: Lun, 2: Mar, ... 6: Sab
  start_time: string; // HH:MM
  end_time: string;   // HH:MM
  slot_duration_minutes: number;
  break_start?: string | null;
  break_end?: string | null;
  is_active: number;
}

export interface Patient {
  id: string;
  full_name: string;
  document_type: string;
  document_number: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  reason_for_consultation?: string;
  medical_history?: string;
  psychological_history?: string;
  assigned_therapist_id?: string;
  assigned_therapist_name?: string;
  completed_sessions_count?: number;
  status: 'activo' | 'inactivo' | 'alta';
  created_at?: string;
}

export type AppointmentStatus = 'programada' | 'confirmada' | 'realizada' | 'cancelada' | 'reprogramada';
export type SessionType = 'individual' | 'pareja' | 'infanto_juvenil' | 'evaluacion' | 'otro';

export interface Appointment {
  id: string;
  patient_id: string;
  patient_name?: string;
  patient_document?: string;
  patient_email?: string;
  patient_phone?: string;
  therapist_id: string;
  therapist_name?: string;
  therapist_currency?: string;
  appointment_date: string; // YYYY-MM-DD
  start_time: string;       // HH:MM
  end_time: string;         // HH:MM
  session_type: SessionType;
  status: AppointmentStatus;
  agreed_fee: number;
  notes?: string;
  cancellation_reason?: string;
  session_id?: string | null;
  invoice_id?: string | null;
  invoice_number?: string | null;
  invoice_status?: string | null;
  created_at?: string;
}

export interface PsychotherapySession {
  id: string;
  appointment_id: string;
  patient_id: string;
  patient_name?: string;
  patient_document?: string;
  reason_for_consultation?: string;
  therapist_id: string;
  therapist_name?: string;
  session_date: string;
  subjective_notes: string;
  objective_notes: string;
  assessment_notes: string;
  plan_notes: string;
  private_notes?: string;
  ai_summary?: string;
  ai_risk_factors?: string;
  ai_next_goals?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  appointment_id: string;
  patient_id: string;
  patient_name: string;
  patient_document?: string;
  patient_email?: string;
  patient_phone?: string;
  therapist_id: string;
  therapist_name: string;
  therapist_license?: string;
  therapist_email?: string;
  therapist_phone?: string;
  issue_date: string;
  due_date: string;
  session_cost: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  payment_status: 'pendiente' | 'pagada' | 'anulada';
  payment_method: string;
  notes?: string;
  sent_via_email: number;
  email_sent_at?: string;
  appointment_date?: string;
  start_time?: string;
  end_time?: string;
  session_type?: string;
  created_at?: string;
}

export interface SystemStatus {
  database: {
    isConfigured: boolean;
    isTurso: boolean;
    type: string;
    url: string;
    hasAuthToken: boolean;
  };
  ai: {
    configured: boolean;
    model: string;
    hasBaseUrl: boolean;
    apiKeyMasked: string;
  };
  smtp: {
    configured: boolean;
    host: string;
    port: number;
    user: string;
    hasPass: boolean;
    from: string;
  };
}
