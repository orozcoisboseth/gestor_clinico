import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  Calendar,
  FileText,
  Receipt,
  Plus,
  Edit2,
  Clock,
  Sparkles,
  AlertTriangle,
  Lock,
  ChevronRight,
} from 'lucide-react';
import { api } from '../api/client';
import { Patient, Appointment } from '../types';

interface PatientDetailModalProps {
  isOpen: boolean;
  patientId: string;
  onClose: () => void;
  onEditPatient: (patient: Patient) => void;
  onNewAppointment: (patient: Patient) => void;
  onOpenSession: (appointmentId: string) => void;
  onOpenInvoice: (invoiceId: string) => void;
}

export const PatientDetailModal: React.FC<PatientDetailModalProps> = ({
  isOpen,
  patientId,
  onClose,
  onEditPatient,
  onNewAppointment,
  onOpenSession,
  onOpenInvoice,
}) => {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'evolution' | 'info' | 'invoices'>('evolution');

  useEffect(() => {
    if (isOpen && patientId) {
      loadPatientDetails();
    }
  }, [isOpen, patientId]);

  const loadPatientDetails = async () => {
    setLoading(true);
    try {
      const res = await api.getPatientById(patientId);
      setPatient(res.patient);
      setHistory(res.history || []);
    } catch (err) {
      console.error('Error fetching patient details:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-base shadow-xs">
              {patient?.full_name ? patient.full_name.charAt(0).toUpperCase() : 'P'}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold tracking-tight text-white">
                  {patient?.full_name || 'Expediente Clínico'}
                </h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {patient?.document_type}: {patient?.document_number}
                </span>
                <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded ${
                  patient?.status === 'activo'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : patient?.status === 'alta'
                    ? 'bg-blue-500/20 text-blue-300'
                    : 'bg-slate-700 text-slate-300'
                }`}>
                  {patient?.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Terapeuta: {patient?.assigned_therapist_name || 'No asignado'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {patient && (
              <>
                <button
                  type="button"
                  onClick={() => onNewAppointment(patient)}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agendar Cita</span>
                </button>
                <button
                  type="button"
                  onClick={() => onEditPatient(patient)}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Editar Ficha"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 gap-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab('evolution')}
            className={`py-3 font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'evolution'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Historial Clínico & Sesiones ({history.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={`py-3 font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'info'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Ficha de Identidad & Antecedentes</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Cargando expediente del paciente...</div>
          ) : activeTab === 'evolution' ? (
            /* TAB 1: Clinical Timeline */
            <div className="space-y-4">
              {history.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <p className="text-sm font-medium text-slate-700">No hay citas ni notas registradas aún</p>
                  <p className="text-xs text-slate-400">
                    Agenda la primera cita para iniciar la evolución clínica del paciente.
                  </p>
                  {patient && (
                    <button
                      onClick={() => onNewAppointment(patient)}
                      className="mt-3 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agendar Primera Sesión</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4 relative before:absolute before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                  {history.map((item, idx) => (
                    <div key={item.appointment_id} className="relative pl-10">
                      {/* Timeline Dot */}
                      <div className={`absolute left-2.5 top-3.5 w-3.5 h-3.5 -ml-1 rounded-full border-2 border-white shadow-xs ${
                        item.appointment_status === 'realizada'
                          ? 'bg-emerald-600'
                          : item.appointment_status === 'confirmada'
                          ? 'bg-blue-600'
                          : item.appointment_status === 'cancelada'
                          ? 'bg-rose-500'
                          : 'bg-amber-500'
                      }`} />

                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 hover:shadow-xs transition-shadow">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 font-mono">
                              {item.appointment_date}
                            </span>
                            <span className="text-xs text-slate-400">·</span>
                            <span className="text-xs text-slate-600 font-mono">
                              {item.start_time} - {item.end_time}
                            </span>
                            <span className="text-xs text-slate-400">·</span>
                            <span className="text-xs font-medium text-slate-700 capitalize">
                              {item.session_type}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase font-mono ${
                              item.appointment_status === 'realizada'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.appointment_status === 'cancelada'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}>
                              {item.appointment_status}
                            </span>

                            {item.appointment_status === 'realizada' && (
                              <button
                                onClick={() => onOpenSession(item.appointment_id)}
                                className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <FileText className="w-3 h-3" />
                                <span>Ver Notas Clínicas</span>
                              </button>
                            )}

                            {item.invoice_id && (
                              <button
                                onClick={() => onOpenInvoice(item.invoice_id)}
                                className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Receipt className="w-3 h-3" />
                                <span>{item.invoice_number}</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Session Evolution Summary */}
                        {item.session_id ? (
                          <div className="mt-3 space-y-2 text-xs">
                            {item.ai_summary && (
                              <div className="p-2.5 bg-emerald-50/70 border border-emerald-100 rounded-lg text-emerald-950 flex items-start gap-2">
                                <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-semibold text-[11px] block">Resumen Clínico (Gemini):</span>
                                  <p className="mt-0.5 text-slate-700">{item.ai_summary}</p>
                                </div>
                              </div>
                            )}

                            {item.subjective_notes && (
                              <div>
                                <strong className="text-slate-800">S (Subjetivo): </strong>
                                <span className="text-slate-600 line-clamp-2">{item.subjective_notes}</span>
                              </div>
                            )}

                            {item.assessment_notes && (
                              <div>
                                <strong className="text-slate-800">A (Evaluación): </strong>
                                <span className="text-slate-600 line-clamp-2">{item.assessment_notes}</span>
                              </div>
                            )}

                            {item.plan_notes && (
                              <div>
                                <strong className="text-slate-800">P (Plan de Tratamiento): </strong>
                                <span className="text-slate-600 line-clamp-2">{item.plan_notes}</span>
                              </div>
                            )}

                            {item.ai_risk_factors && (
                              <div className="p-2 bg-amber-50 border border-amber-200 rounded text-amber-900 text-[11px] flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span><strong>Alerta / Factores de Riesgo:</strong> {item.ai_risk_factors}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
                            <span>{item.appointment_notes || 'Cita agendada sin notas de evolución clínica aún.'}</span>
                            <button
                              onClick={() => onOpenSession(item.appointment_id)}
                              className="text-emerald-600 hover:underline font-semibold cursor-pointer"
                            >
                              + Redactar Notas de Sesión
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* TAB 2: Patient Identity & Clinical History info */
            patient && (
              <div className="space-y-6 text-xs text-slate-700">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <h4 className="font-semibold text-slate-900 uppercase text-[11px] tracking-wider mb-2">
                      Datos de Contacto
                    </h4>
                    <p className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span>{patient.email || 'No registrado'}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>{patient.phone || 'No registrado'}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>Nacimiento: {patient.date_of_birth || 'No registrado'}</span>
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <h4 className="font-semibold text-slate-900 uppercase text-[11px] tracking-wider mb-2">
                      Contacto de Emergencia
                    </h4>
                    <p>
                      <strong>Nombre: </strong>
                      {patient.emergency_contact_name || 'No especificado'}
                    </p>
                    <p>
                      <strong>Teléfono: </strong>
                      {patient.emergency_contact_phone || 'No especificado'}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="font-semibold text-slate-900 uppercase text-[11px] tracking-wider mb-2">
                    Motivo de Consulta Principal
                  </h4>
                  <p className="text-slate-800 leading-relaxed">
                    {patient.reason_for_consultation || 'No se registraron detalles del motivo de consulta.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <h4 className="font-semibold text-slate-900 uppercase text-[11px] tracking-wider mb-2">
                      Antecedentes Médicos / Fármacos
                    </h4>
                    <p className="text-slate-800 leading-relaxed">
                      {patient.medical_history || 'Sin antecedentes médicos informados.'}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <h4 className="font-semibold text-slate-900 uppercase text-[11px] tracking-wider mb-2">
                      Antecedentes Psicológicos Previos
                    </h4>
                    <p className="text-slate-800 leading-relaxed">
                      {patient.psychological_history || 'Sin antecedentes psicológicos previos informados.'}
                    </p>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
