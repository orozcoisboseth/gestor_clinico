import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, UserCheck, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '../api/client';
import { Appointment, Patient, Therapist } from '../types';

interface AppointmentModalProps {
  isOpen: boolean;
  appointment?: Appointment | null; // If editing/rescheduling
  initialPatient?: Patient | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  appointment,
  initialPatient,
  onClose,
  onSuccess,
}) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);

  const [patientId, setPatientId] = useState('');
  const [therapistId, setTherapistId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('10:50');
  const [sessionType, setSessionType] = useState<'individual' | 'pareja' | 'infanto_juvenil' | 'evaluacion' | 'otro'>('individual');
  const [status, setStatus] = useState<'programada' | 'confirmada' | 'realizada' | 'cancelada' | 'reprogramada'>('programada');
  const [agreedFee, setAgreedFee] = useState('65');
  const [notes, setNotes] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');

  // Slots state
  const [availableSlots, setAvailableSlots] = useState<Array<{ startTime: string; endTime: string; isBooked: boolean }>>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotMessage, setSlotMessage] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    try {
      const [patList, thList] = await Promise.all([
        api.getPatients(),
        api.getTherapists(),
      ]);
      setPatients(patList);
      setTherapists(thList);

      if (appointment) {
        setPatientId(appointment.patient_id);
        setTherapistId(appointment.therapist_id);
        setDate(appointment.appointment_date);
        setStartTime(appointment.start_time);
        setEndTime(appointment.end_time);
        setSessionType(appointment.session_type);
        setStatus(appointment.status);
        setAgreedFee(String(appointment.agreed_fee));
        setNotes(appointment.notes || '');
        setCancellationReason(appointment.cancellation_reason || '');
      } else {
        const defaultTh = thList[0]?.id || '';
        setTherapistId(defaultTh);
        if (initialPatient) {
          setPatientId(initialPatient.id);
          if (initialPatient.assigned_therapist_id) {
            setTherapistId(initialPatient.assigned_therapist_id);
          }
        } else if (patList.length > 0) {
          setPatientId(patList[0].id);
        }
        if (thList[0]?.hourly_rate) {
          setAgreedFee(String(thList[0].hourly_rate));
        }
      }
    } catch (err) {
      console.error('Error loading data for appointment modal:', err);
    }
  };

  // When therapist changes, update agreed fee default
  useEffect(() => {
    if (!appointment && therapistId) {
      const th = therapists.find((t) => t.id === therapistId);
      if (th) {
        setAgreedFee(String(th.hourly_rate));
      }
    }
  }, [therapistId, therapists, appointment]);

  // Fetch available slots from therapist's schedule
  useEffect(() => {
    if (therapistId && date) {
      fetchSlots();
    }
  }, [therapistId, date]);

  const fetchSlots = async () => {
    setLoadingSlots(true);
    setSlotMessage(null);
    try {
      const res = await api.getAvailableSlots(therapistId, date);
      setAvailableSlots(res.slots || []);
      if (!res.available) {
        setSlotMessage(res.message || 'El terapeuta no atiende en esta fecha.');
      }
    } catch (err) {
      console.error('Error fetching slots:', err);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSelectSlot = (start: string, end: string) => {
    setStartTime(start);
    setEndTime(end);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !therapistId || !date || !startTime || !endTime) {
      setError('Por favor completa todos los campos requeridos.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (appointment) {
        await api.updateAppointment(appointment.id, {
          appointment_date: date,
          start_time: startTime,
          end_time: endTime,
          session_type: sessionType,
          status,
          agreed_fee: Number(agreedFee) || 50,
          notes,
          cancellation_reason: status === 'cancelada' ? cancellationReason : undefined,
        });
      } else {
        await api.createAppointment({
          patient_id: patientId,
          therapist_id: therapistId,
          appointment_date: date,
          start_time: startTime,
          end_time: endTime,
          session_type: sessionType,
          agreed_fee: Number(agreedFee) || 50,
          notes,
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la cita.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-tight">
                {appointment ? 'Reprogramar o Modificar Cita' : 'Agendar Nueva Cita'}
              </h3>
              <p className="text-xs text-slate-400">Asignación y Verificación de Disponibilidad</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Patient and Therapist Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Paciente Asignado *
              </label>
              <select
                disabled={Boolean(appointment)}
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white"
              >
                <option value="">Seleccionar paciente...</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.document_number})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Terapeuta Responsable *
              </label>
              <select
                disabled={Boolean(appointment)}
                value={therapistId}
                onChange={(e) => setTherapistId(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white"
              >
                <option value="">Seleccionar terapeuta...</option>
                {therapists.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name} - {t.specialty}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha de la Cita *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Hora Inicio *</label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Hora Fin *</label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 font-mono"
              />
            </div>
          </div>

          {/* Available Slots Helper based on therapist's schedule */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Huecos de Agenda Disponibles ({date})
              </span>
              {loadingSlots && <span className="text-[11px] text-slate-400">Verificando agenda...</span>}
            </div>

            {slotMessage && (
              <p className="text-xs text-amber-700">{slotMessage}</p>
            )}

            {!slotMessage && availableSlots.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {availableSlots.map((slot) => {
                  const isSelected = startTime === slot.startTime;
                  return (
                    <button
                      key={slot.startTime}
                      type="button"
                      disabled={slot.isBooked && !isSelected}
                      onClick={() => handleSelectSlot(slot.startTime, slot.endTime)}
                      className={`px-2.5 py-1 text-xs font-mono rounded transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                          : slot.isBooked
                          ? 'bg-slate-200 text-slate-400 line-through cursor-not-allowed'
                          : 'bg-white text-slate-700 border border-slate-300 hover:border-emerald-600'
                      }`}
                    >
                      {slot.startTime} - {slot.endTime}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Session Type and Agreed Fee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Modalidad de Sesión</label>
              <select
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white capitalize"
              >
                <option value="individual">Individual</option>
                <option value="pareja">Terapia de Pareja</option>
                <option value="infanto_juvenil">Infanto-Juvenil</option>
                <option value="evaluacion">Evaluación Psicológica</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Honorarios Pactados (USD)</label>
              <div className="relative">
                <DollarSign className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="number"
                  required
                  value={agreedFee}
                  onChange={(e) => setAgreedFee(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Status (if editing) */}
          {appointment && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Estado de la Cita</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white uppercase font-mono font-semibold"
                >
                  <option value="programada">PROGRAMADA</option>
                  <option value="confirmada">CONFIRMADA</option>
                  <option value="realizada">REALIZADA</option>
                  <option value="reprogramada">REPROGRAMADA</option>
                  <option value="cancelada">CANCELADA</option>
                </select>
              </div>

              {status === 'cancelada' && (
                <div>
                  <label className="block text-xs font-semibold text-rose-700 mb-1">Motivo de Cancelación</label>
                  <input
                    type="text"
                    required
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    placeholder="Ej: Paciente notificó enfermedad con anticipación..."
                    className="w-full px-3 py-2 text-xs border border-rose-300 rounded-lg outline-none focus:border-rose-600 bg-white"
                  />
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notas del Agendamiento</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instrucciones para la sesión, recordatorios o temas a tratar..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              type="button"
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs disabled:opacity-60 cursor-pointer"
            >
              {loading ? 'Guardando cita...' : appointment ? 'Actualizar Cita' : 'Confirmar Cita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
