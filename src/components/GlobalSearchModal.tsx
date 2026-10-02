import React, { useState, useEffect, useRef } from 'react';
import { Search, User, UserCheck, Calendar, ArrowRight, X, Phone, Mail, FileText } from 'lucide-react';
import { api } from '../api/client';
import { Patient, Therapist } from '../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPatient: (patientId: string) => void;
  onSelectTherapist: (therapistId: string) => void;
  onScheduleWithPatient: (patient: Patient) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectPatient,
  onSelectTherapist,
  onScheduleWithPatient,
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setPatients([]);
      setTherapists([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // triggered by parent
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setPatients([]);
      setTherapists([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await api.searchGlobal(query.trim());
        setPatients(results.patients || []);
        setTherapists(results.therapists || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const totalResults = patients.length + therapists.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-950/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-slate-200 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, documento (DNI), correo electrónico o teléfono..."
            className="flex-1 text-sm bg-transparent outline-none text-slate-900 placeholder:text-slate-400"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="px-2 py-0.5 text-[11px] font-mono text-slate-400 bg-slate-100 rounded border border-slate-200">
            ESC
          </kbd>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && (
            <div className="py-8 text-center text-xs text-slate-400">
              Buscando coincidencias clínicas...
            </div>
          )}

          {!loading && query.length >= 2 && totalResults === 0 && (
            <div className="py-10 text-center space-y-1">
              <p className="text-sm font-medium text-slate-700">Sin resultados para "{query}"</p>
              <p className="text-xs text-slate-400">Intenta con el número de documento de identidad, apellido o correo.</p>
            </div>
          )}

          {!loading && query.length < 2 && (
            <div className="py-8 text-center text-xs text-slate-400">
              Escribe al menos 2 caracteres para buscar en pacientes y terapeutas.
            </div>
          )}

          {/* Patients Section */}
          {patients.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Pacientes Encontrados ({patients.length})</span>
                <span className="font-normal lowercase">Expediente Clínico</span>
              </div>
              <div className="space-y-1.5">
                {patients.map((patient) => (
                  <div
                    key={patient.id}
                    className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-lg border border-slate-200/80 transition-colors flex items-center justify-between gap-4 group"
                  >
                    <div
                      onClick={() => {
                        onSelectPatient(patient.id);
                        onClose();
                      }}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                          {patient.full_name}
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs font-mono text-slate-600">
                          {patient.document_type}: {patient.document_number}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        {patient.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {patient.email}
                          </span>
                        )}
                        {patient.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {patient.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          onScheduleWithPatient(patient);
                          onClose();
                        }}
                        className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Calendar className="w-3 h-3" />
                        <span>Agendar Cita</span>
                      </button>
                      <button
                        onClick={() => {
                          onSelectPatient(patient.id);
                          onClose();
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
                        title="Ver Historia Clínica"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Therapists Section */}
          {therapists.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Terapeutas ({therapists.length})</span>
                <span className="font-normal lowercase">Especialistas</span>
              </div>
              <div className="space-y-1.5">
                {therapists.map((therapist) => (
                  <div
                    key={therapist.id}
                    onClick={() => {
                      onSelectTherapist(therapist.id);
                      onClose();
                    }}
                    className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-lg border border-slate-200/80 transition-colors flex items-center justify-between gap-4 cursor-pointer group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                          {therapist.full_name}
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-600">{therapist.specialty}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span>Col: {therapist.license_number}</span>
                        <span>·</span>
                        <span className="font-mono text-emerald-700 font-medium">
                          Tarifa: {therapist.hourly_rate} {therapist.currency}/sesión
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Usa <strong>↑</strong> <strong>↓</strong> para navegar y <strong>ESC</strong> para cerrar</span>
          <span>Búsqueda global indexada</span>
        </div>
      </div>
    </div>
  );
};
