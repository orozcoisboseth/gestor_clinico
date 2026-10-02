import React, { useState, useEffect } from 'react';
import { X, CalendarDays, Clock, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';
import { Therapist, TherapistSchedule } from '../types';

interface ScheduleEditorModalProps {
  isOpen: boolean;
  therapist: Therapist | null;
  onClose: () => void;
  onSuccess: () => void;
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

export const ScheduleEditorModal: React.FC<ScheduleEditorModalProps> = ({
  isOpen,
  therapist,
  onClose,
  onSuccess,
}) => {
  const [schedules, setSchedules] = useState<TherapistSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && therapist) {
      loadSchedules();
    }
  }, [isOpen, therapist]);

  const loadSchedules = async () => {
    if (!therapist) return;
    setLoading(true);
    try {
      const data = await api.getSchedules(therapist.id);
      // Map to guarantee all 7 days exist (0 to 6)
      const fullWeek: TherapistSchedule[] = [];
      for (let day = 0; day <= 6; day++) {
        const existing = data.find((d) => d.day_of_week === day);
        if (existing) {
          fullWeek.push(existing);
        } else {
          // Default: Monday to Friday active (9:00 - 18:00), weekends inactive
          const isWeekday = day >= 1 && day <= 5;
          fullWeek.push({
            id: `sch_temp_${day}`,
            therapist_id: therapist.id,
            day_of_week: day,
            start_time: '09:00',
            end_time: '18:00',
            slot_duration_minutes: 50,
            break_start: '13:00',
            break_end: '14:00',
            is_active: isWeekday ? 1 : 0,
          });
        }
      }
      setSchedules(fullWeek);
    } catch (err) {
      console.error('Error loading schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDay = (dayIndex: number, fields: Partial<TherapistSchedule>) => {
    setSchedules((prev) =>
      prev.map((sch) => (sch.day_of_week === dayIndex ? { ...sch, ...fields } : sch))
    );
  };

  const handleSave = async () => {
    if (!therapist) return;
    setSaving(true);
    setError(null);
    try {
      await api.saveSchedules(therapist.id, schedules);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar los horarios de atención.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !therapist) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-tight">
                Agenda de Atención Semanal · {therapist.full_name}
              </h3>
              <p className="text-xs text-slate-400">Configuración de Días, Horas y Descansos</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <p className="text-xs text-slate-600">
            Define las jornadas de atención para cada día de la semana. El sistema calculará automáticamente los bloques de cita disponibles y evitará colisiones al agendar.
          </p>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Cargando agenda...</div>
          ) : (
            <div className="space-y-3">
              {schedules.map((sch) => {
                const isActive = Boolean(sch.is_active);
                return (
                  <div
                    key={sch.day_of_week}
                    className={`p-3.5 rounded-xl border transition-colors ${
                      isActive
                        ? 'bg-slate-50 border-slate-300'
                        : 'bg-slate-100/50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      {/* Day toggle */}
                      <div className="flex items-center gap-3 w-40">
                        <input
                          type="checkbox"
                          id={`day_check_${sch.day_of_week}`}
                          checked={isActive}
                          onChange={(e) =>
                            handleUpdateDay(sch.day_of_week, { is_active: e.target.checked ? 1 : 0 })
                          }
                          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <label
                          htmlFor={`day_check_${sch.day_of_week}`}
                          className={`text-xs font-bold cursor-pointer ${
                            isActive ? 'text-slate-900' : 'text-slate-400'
                          }`}
                        >
                          {DAYS_NAMES[sch.day_of_week]}
                        </label>
                      </div>

                      {/* Working hours */}
                      {isActive ? (
                        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2.5 items-center text-xs">
                          <div>
                            <span className="text-[10px] text-slate-500 block mb-0.5">Inicio</span>
                            <input
                              type="time"
                              value={sch.start_time}
                              onChange={(e) =>
                                handleUpdateDay(sch.day_of_week, { start_time: e.target.value })
                              }
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white font-mono"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block mb-0.5">Fin</span>
                            <input
                              type="time"
                              value={sch.end_time}
                              onChange={(e) =>
                                handleUpdateDay(sch.day_of_week, { end_time: e.target.value })
                              }
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white font-mono"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block mb-0.5">Descanso/Almuerzo</span>
                            <div className="flex items-center gap-1 font-mono">
                              <input
                                type="time"
                                value={sch.break_start || ''}
                                onChange={(e) =>
                                  handleUpdateDay(sch.day_of_week, { break_start: e.target.value || null })
                                }
                                placeholder="13:00"
                                className="w-full px-1.5 py-1 text-[11px] border border-slate-300 rounded bg-white"
                              />
                              <span>-</span>
                              <input
                                type="time"
                                value={sch.break_end || ''}
                                onChange={(e) =>
                                  handleUpdateDay(sch.day_of_week, { break_end: e.target.value || null })
                                }
                                placeholder="14:00"
                                className="w-full px-1.5 py-1 text-[11px] border border-slate-300 rounded bg-white"
                              />
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block mb-0.5">Duración Sesión</span>
                            <select
                              value={sch.slot_duration_minutes}
                              onChange={(e) =>
                                handleUpdateDay(sch.day_of_week, {
                                  slot_duration_minutes: Number(e.target.value),
                                })
                              }
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white font-mono"
                            >
                              <option value={45}>45 min</option>
                              <option value={50}>50 min</option>
                              <option value={60}>60 min</option>
                              <option value={90}>90 min</option>
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 text-xs text-slate-400 italic">
                          Día no laborable / Sin atención al público
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            type="button"
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Guardando agenda...' : 'Guardar Horarios Semanales'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
