import React, { useState, useEffect } from 'react';
import { UserCheck, Plus, CalendarDays, Edit2, DollarSign, Mail, Phone, Award } from 'lucide-react';
import { api } from '../api/client';
import { Therapist } from '../types';

interface TherapistsViewProps {
  onNewTherapist: () => void;
  onEditTherapist: (therapist: Therapist) => void;
  onConfigureSchedule: (therapist: Therapist) => void;
}

export const TherapistsView: React.FC<TherapistsViewProps> = ({
  onNewTherapist,
  onEditTherapist,
  onConfigureSchedule,
}) => {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTherapists();
  }, []);

  const loadTherapists = async () => {
    setLoading(true);
    try {
      const data = await api.getTherapists();
      setTherapists(data);
    } catch (err) {
      console.error('Error loading therapists:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Equipo de Terapeutas & Tarifas</h1>
          <p className="text-xs text-slate-500">
            Gestión de profesionales, honorarios por sesión y configuración de agendas
          </p>
        </div>
        <button
          onClick={onNewTherapist}
          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Registrar Terapeuta</span>
        </button>
      </div>

      {/* Grid of Therapists */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Cargando terapeutas...</div>
      ) : therapists.length === 0 ? (
        <div className="py-12 bg-white rounded-xl border border-slate-200 text-center space-y-2">
          <p className="text-sm font-medium text-slate-700">No hay terapeutas registrados</p>
          <p className="text-xs text-slate-400">Registra al profesional principal del consultorio.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {therapists.map((th) => (
            <div
              key={th.id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between hover:border-slate-300 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm shadow-xs">
                      {th.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{th.full_name}</h3>
                      <p className="text-xs text-slate-500">{th.specialty}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded font-mono ${
                    th.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {th.is_active ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1.5 border border-slate-200/80">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Tarifa por Sesión:</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {th.hourly_rate} {th.currency}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Colegiatura / Licencia:</span>
                    <span className="font-mono text-slate-700">{th.license_number || 'N/A'}</span>
                  </div>
                  {th.email && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Email:</span>
                      <span className="text-slate-700">{th.email}</span>
                    </div>
                  )}
                  {th.phone && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Teléfono:</span>
                      <span className="text-slate-700">{th.phone}</span>
                    </div>
                  )}
                </div>

                {th.bio && (
                  <p className="text-xs text-slate-600 line-clamp-2 italic">
                    "{th.bio}"
                  </p>
                )}
              </div>

              <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => onConfigureSchedule(th)}
                  className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>Configurar Agenda</span>
                </button>

                <button
                  onClick={() => onEditTherapist(th)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
