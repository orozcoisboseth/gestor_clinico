import React, { useState, useEffect } from 'react';
import { CalendarDays, Clock, Edit2, UserCheck, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '../api/client';
import { Therapist, TherapistSchedule } from '../types';

interface SchedulesViewProps {
  onConfigureSchedule: (therapist: Therapist) => void;
}

const DAYS_NAMES = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

export const SchedulesView: React.FC<SchedulesViewProps> = ({ onConfigureSchedule }) => {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [selectedTherapistId, setSelectedTherapistId] = useState<string>('');
  const [schedules, setSchedules] = useState<TherapistSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTherapists();
  }, []);

  const loadTherapists = async () => {
    try {
      const data = await api.getTherapists();
      setTherapists(data);
      if (data.length > 0) {
        setSelectedTherapistId(data[0].id);
      }
    } catch (err) {
      console.error('Error loading therapists:', err);
    }
  };

  useEffect(() => {
    if (selectedTherapistId) {
      loadSchedules(selectedTherapistId);
    }
  }, [selectedTherapistId]);

  const loadSchedules = async (thId: string) => {
    setLoading(true);
    try {
      const data = await api.getSchedules(thId);
      setSchedules(data);
    } catch (err) {
      console.error('Error loading schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedTherapist = therapists.find((t) => t.id === selectedTherapistId);

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Agendas de Atención Semanal</h1>
          <p className="text-xs text-slate-500">
            Jornadas laborales, bloques de consulta e intervalos de descanso por terapeuta
          </p>
        </div>
        {selectedTherapist && (
          <button
            onClick={() => onConfigureSchedule(selectedTherapist)}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer self-start sm:self-auto"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Editar Agenda Semanal</span>
          </button>
        )}
      </div>

      {/* Therapist Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {therapists.map((th) => (
          <button
            key={th.id}
            onClick={() => setSelectedTherapistId(th.id)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              selectedTherapistId === th.id
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {th.full_name}
          </button>
        ))}
      </div>

      {/* Schedule Table/Cards */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Horario de Atención Semanal
            </h3>
            <p className="text-xs text-slate-500">
              Terapeuta: <strong>{selectedTherapist?.full_name}</strong> · {selectedTherapist?.specialty}
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-700 font-semibold">
            Tarifa: {selectedTherapist?.hourly_rate} {selectedTherapist?.currency} / sesión
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Cargando agenda...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
            {[1, 2, 3, 4, 5, 6, 0].map((dayIndex) => {
              const sch = schedules.find((s) => s.day_of_week === dayIndex);
              const isActive = Boolean(sch && sch.is_active);

              return (
                <div
                  key={dayIndex}
                  className={`p-4 flex flex-col justify-between min-h-[180px] ${
                    isActive ? 'bg-white' : 'bg-slate-50/70 text-slate-400'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        {DAYS_NAMES[dayIndex]}
                      </span>
                      {isActive ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-500" title="Atención activa" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-300" title="No laborable" />
                      )}
                    </div>

                    {isActive && sch ? (
                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block font-semibold">Jornada</span>
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            {sch.start_time} - {sch.end_time}
                          </span>
                        </div>

                        {sch.break_start && sch.break_end && (
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase block font-semibold">Descanso</span>
                            <span className="font-mono text-slate-600">
                              {sch.break_start} - {sch.break_end}
                            </span>
                          </div>
                        )}

                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block font-semibold">Duración Cita</span>
                          <span className="font-mono text-slate-600">{sch.slot_duration_minutes} minutos</span>
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 text-center text-xs text-slate-400 italic">
                        Sin atención
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
