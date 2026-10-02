import React, { useState, useEffect } from 'react';
import {
  Users,
  Calendar,
  Clock,
  Receipt,
  FileText,
  Plus,
  ArrowRight,
  Sparkles,
  Search,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { api } from '../api/client';
import { Appointment, Patient, User } from '../types';

interface DashboardViewProps {
  user?: User | null;
  onNewAppointment: () => void;
  onNewPatient: () => void;
  onOpenSession: (appointmentId: string) => void;
  onOpenPatientDetail: (patientId: string) => void;
  onOpenInvoice: (invoiceId: string) => void;
  onCreateInvoiceFromAppointment: (appointmentId: string) => void;
  onOpenSearch: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  onNewAppointment,
  onNewPatient,
  onOpenSession,
  onOpenPatientDetail,
  onOpenInvoice,
  onCreateInvoiceFromAppointment,
  onOpenSearch,
}) => {
  const [stats, setStats] = useState<{
    scope?: string;
    activePatients: number;
    todayAppointments: number;
    pendingInvoicesCount: number;
    pendingInvoicesTotal: number;
    completedSessionsCount: number;
    recentAppointments: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'realizada':
        return <span className="text-[10px] font-mono font-semibold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Realizada</span>;
      case 'confirmada':
        return <span className="text-[10px] font-mono font-semibold uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded">Confirmada</span>;
      case 'cancelada':
        return <span className="text-[10px] font-mono font-semibold uppercase text-rose-700 bg-rose-50 px-2 py-0.5 rounded">Cancelada</span>;
      case 'reprogramada':
        return <span className="text-[10px] font-mono font-semibold uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded">Reprogramada</span>;
      default:
        return <span className="text-[10px] font-mono font-semibold uppercase text-slate-700 bg-slate-100 px-2 py-0.5 rounded">Programada</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Welcome & Quick Actions Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {user?.role === 'admin' ? 'Consultorio Psicológico (Panel Global)' : `Consultorio de ${user?.name || 'Psicoterapia'}`}
            </h1>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
              user?.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {user?.role === 'admin' ? 'Administrador' : 'Mis Recursos'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {user?.role === 'admin'
              ? 'Supervisión completa: todos los terapeutas, pacientes, citas clínicas y facturación.'
              : 'Tus pacientes asignados, agenda privada de atención y notas clínicas protegidas.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={onOpenSearch}
            className="flex-1 md:flex-none px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Búsqueda Rápida (⌘K)</span>
          </button>
          <button
            onClick={onNewPatient}
            className="flex-1 md:flex-none px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Nuevo Paciente</span>
          </button>
          <button
            onClick={onNewAppointment}
            className="flex-1 md:flex-none px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agendar Cita</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today Appointments */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Citas Hoy
            </span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
              {stats?.todayAppointments ?? 0}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Sesiones programadas</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Active Patients */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Pacientes Activos
            </span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
              {stats?.activePatients ?? 0}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">En proceso terapéutico</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Completed Sessions */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Evoluciones con IA
            </span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
              {stats?.completedSessionsCount ?? 0}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Notas SOAP & Resúmenes</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Invoices Pending */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Facturas Pendientes
            </span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
              ${stats?.pendingInvoicesTotal ?? 0}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              {stats?.pendingInvoicesCount ?? 0} comprobantes por cobrar
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
            <Receipt className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Section: Agenda & Recent Appointments */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Agenda & Citas Recientes</h2>
            <p className="text-xs text-slate-500">Últimas sesiones agendadas y registro de evolución clínica</p>
          </div>
          <button
            onClick={onNewAppointment}
            className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer"
          >
            + Agendar
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Cargando citas...</div>
        ) : !stats?.recentAppointments || stats.recentAppointments.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-sm font-medium text-slate-700">No hay citas registradas</p>
            <p className="text-xs text-slate-400">Comienza agendando tu primera sesión con un paciente.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {stats.recentAppointments.map((apt: any) => (
              <div
                key={apt.id}
                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex flex-col items-center justify-center font-mono text-[11px] font-bold shrink-0 mt-0.5">
                    <span>{apt.start_time}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenPatientDetail(apt.patient_id)}
                        className="text-sm font-semibold text-slate-900 hover:text-emerald-700 text-left transition-colors cursor-pointer"
                      >
                        {apt.patient_name}
                      </button>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs text-slate-500 capitalize">{apt.session_type}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs font-mono font-medium text-emerald-700 tabular-nums">
                        ${apt.agreed_fee}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>Fecha: <strong className="font-mono">{apt.appointment_date}</strong></span>
                      <span>·</span>
                      <span>Terapeuta: {apt.therapist_name}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {getStatusBadge(apt.status)}

                  {/* Actions according to status */}
                  <button
                    onClick={() => onOpenSession(apt.id)}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                    title="Abrir o redactar notas clínicas con Gemini 2.5 Flash"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{apt.session_id ? 'Ver Notas' : 'Tomar Notas (IA)'}</span>
                  </button>

                  <button
                    onClick={() => onCreateInvoiceFromAppointment(apt.id)}
                    className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    title="Generar Comprobante"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Factura</span>
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
