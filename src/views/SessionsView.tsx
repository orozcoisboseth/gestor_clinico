import React, { useState, useEffect } from 'react';
import {
  FileText,
  Sparkles,
  Calendar,
  User,
  AlertTriangle,
  ArrowRight,
  Search,
} from 'lucide-react';
import { api } from '../api/client';
import { Appointment } from '../types';

interface SessionsViewProps {
  onOpenSession: (appointmentId: string) => void;
  onOpenPatientDetail: (patientId: string) => void;
}

export const SessionsView: React.FC<SessionsViewProps> = ({
  onOpenSession,
  onOpenPatientDetail,
}) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await api.getAppointments({ status: 'realizada' });
      setAppointments(data);
    } catch (err) {
      console.error('Error loading sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = appointments.filter((a) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      (a.patient_name || '').toLowerCase().includes(term) ||
      (a.therapist_name || '').toLowerCase().includes(term) ||
      (a.notes || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Sesiones de Psicoterapia & Notas Clínicas
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
              Gemini 2.5 Flash
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Evolución terapéutica estructurada en formato SOAP, alertas de riesgo y notas confidenciales
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filtrar por nombre de paciente o terapeuta..."
          className="flex-1 text-xs outline-none bg-transparent"
        />
      </div>

      {/* Sessions Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Cargando sesiones...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <p className="text-sm font-medium text-slate-700">No hay sesiones clínicas realizadas registradas</p>
            <p className="text-xs text-slate-400">
              Marca citas como 'Realizada' o redacta sus notas clínicas para verlas en este módulo.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((apt) => (
              <div
                key={apt.id}
                className="p-5 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenPatientDetail(apt.patient_id)}
                      className="text-sm font-bold text-slate-900 hover:text-emerald-700 transition-colors cursor-pointer"
                    >
                      {apt.patient_name}
                    </button>
                    <span className="text-slate-300">·</span>
                    <span className="text-xs font-mono text-slate-500">{apt.appointment_date}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-xs font-medium text-slate-600 capitalize">{apt.session_type}</span>
                  </div>

                  <p className="text-xs text-slate-500">
                    Terapeuta Responsable: <strong>{apt.therapist_name}</strong>
                  </p>

                  {apt.notes && (
                    <p className="text-xs text-slate-600 italic bg-slate-50 p-2 rounded border border-slate-200/80">
                      "{apt.notes}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onOpenSession(apt.id)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{apt.session_id ? 'Abrir Expediente SOAP' : 'Registrar Notas (IA)'}</span>
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
