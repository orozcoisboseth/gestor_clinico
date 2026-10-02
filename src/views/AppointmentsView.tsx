import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Clock,
  User,
  Filter,
  FileText,
  Receipt,
  MoreVertical,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CalendarCheck,
} from 'lucide-react';
import { api } from '../api/client';
import { Appointment, Therapist } from '../types';

interface AppointmentsViewProps {
  onNewAppointment: () => void;
  onEditAppointment: (appointment: Appointment) => void;
  onOpenSession: (appointmentId: string) => void;
  onOpenPatientDetail: (patientId: string) => void;
  onCreateInvoice: (appointmentId: string) => void;
  onOpenInvoice: (invoiceId: string) => void;
}

export const AppointmentsView: React.FC<AppointmentsViewProps> = ({
  onNewAppointment,
  onEditAppointment,
  onOpenSession,
  onOpenPatientDetail,
  onCreateInvoice,
  onOpenInvoice,
}) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTherapist, setSelectedTherapist] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  useEffect(() => {
    api.getTherapists().then(setTherapists).catch(console.error);
    loadAppointments();
  }, [selectedDate, selectedTherapist, selectedStatus]);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const data = await api.getAppointments({
        date: selectedDate || undefined,
        therapistId: selectedTherapist || undefined,
        status: selectedStatus || undefined,
      });
      setAppointments(data);
    } catch (err) {
      console.error('Error loading appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: any) => {
    try {
      await api.updateAppointment(id, { status: newStatus });
      loadAppointments();
    } catch (err: any) {
      alert(err.message || 'Error al actualizar estado.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'realizada':
        return <span className="text-[10px] font-mono font-semibold uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">Realizada</span>;
      case 'confirmada':
        return <span className="text-[10px] font-mono font-semibold uppercase text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">Confirmada</span>;
      case 'cancelada':
        return <span className="text-[10px] font-mono font-semibold uppercase text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">Cancelada</span>;
      case 'reprogramada':
        return <span className="text-[10px] font-mono font-semibold uppercase text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">Reprogramada</span>;
      default:
        return <span className="text-[10px] font-mono font-semibold uppercase text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">Programada</span>;
    }
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Gestión de Citas & Sesiones</h1>
          <p className="text-xs text-slate-500">
            Control de citas agendadas, reprogramaciones, cancelaciones y notas clínicas
          </p>
        </div>
        <button
          onClick={onNewAppointment}
          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Agendar Cita</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">Fecha:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white font-mono"
          />
          {selectedDate && (
            <button
              onClick={() => setSelectedDate('')}
              className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Limpiar
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">Terapeuta:</span>
          <select
            value={selectedTherapist}
            onChange={(e) => setSelectedTherapist(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white text-slate-700"
          >
            <option value="">Todos</option>
            {therapists.map((th) => (
              <option key={th.id} value={th.id}>{th.full_name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">Estado:</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white text-slate-700"
          >
            <option value="">Todos los estados</option>
            <option value="programada">Programada</option>
            <option value="confirmada">Confirmada</option>
            <option value="realizada">Realizada</option>
            <option value="reprogramada">Reprogramada</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Cargando citas...</div>
        ) : appointments.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <p className="text-sm font-medium text-slate-700">No hay citas en este rango</p>
            <p className="text-xs text-slate-400">Agenda una sesión o cambia los filtros de fecha y estado.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {appointments.map((apt) => (
              <div
                key={apt.id}
                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center font-mono shrink-0">
                    <span className="text-[10px] text-slate-400 uppercase leading-none">
                      {new Date(apt.appointment_date + 'T12:00:00Z').toLocaleDateString('es-ES', { weekday: 'short' })}
                    </span>
                    <span className="text-xs font-bold text-slate-800 mt-0.5">{apt.start_time}</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenPatientDetail(apt.patient_id)}
                        className="text-sm font-bold text-slate-900 hover:text-emerald-700 text-left transition-colors cursor-pointer"
                      >
                        {apt.patient_name}
                      </button>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs text-slate-500 capitalize">{apt.session_type}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs font-mono font-bold text-emerald-700 tabular-nums">
                        ${apt.agreed_fee}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-1">
                      <span>Fecha: <strong className="font-mono">{apt.appointment_date}</strong> ({apt.start_time} - {apt.end_time})</span>
                      <span>·</span>
                      <span>Terapeuta: <strong>{apt.therapist_name}</strong></span>
                      {apt.notes && (
                        <>
                          <span>·</span>
                          <span className="italic text-slate-600 line-clamp-1">"{apt.notes}"</span>
                        </>
                      )}
                    </div>

                    {apt.status === 'cancelada' && apt.cancellation_reason && (
                      <p className="text-xs text-rose-700 mt-1">
                        <strong>Motivo de cancelación: </strong>{apt.cancellation_reason}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {getStatusBadge(apt.status)}

                  {/* Actions */}
                  <button
                    onClick={() => onOpenSession(apt.id)}
                    className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    title="Notas clínicas asistidas por Gemini 2.5 Flash"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{apt.session_id ? 'Ver Notas' : 'Tomar Notas (IA)'}</span>
                  </button>

                  {apt.invoice_id ? (
                    <button
                      onClick={() => onOpenInvoice(apt.invoice_id!)}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>{apt.invoice_number}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onCreateInvoice(apt.id)}
                      className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Factura</span>
                    </button>
                  )}

                  <button
                    onClick={() => onEditAppointment(apt)}
                    className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Reprogramar / Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
