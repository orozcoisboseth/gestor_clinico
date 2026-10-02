import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Mail,
  Phone,
  FileText,
  Calendar,
  MoreVertical,
  Edit2,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import { api } from '../api/client';
import { Patient, Therapist, User } from '../types';

interface PatientsViewProps {
  user?: User | null;
  onSelectPatient: (patientId: string) => void;
  onNewPatient: () => void;
  onEditPatient: (patient: Patient) => void;
  onScheduleWithPatient: (patient: Patient) => void;
}

export const PatientsView: React.FC<PatientsViewProps> = ({
  user,
  onSelectPatient,
  onNewPatient,
  onEditPatient,
  onScheduleWithPatient,
}) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedTherapist, setSelectedTherapist] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    api.getTherapists().then(setTherapists).catch(console.error);
    loadPatients();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPatients();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, selectedTherapist, selectedStatus]);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const data = await api.getPatients({
        search: search.trim() || undefined,
        therapistId: selectedTherapist || undefined,
        status: selectedStatus || undefined,
      });
      setPatients(data);
    } catch (err) {
      console.error('Error loading patients:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePatient = async (id: string, name: string) => {
    if (!window.confirm(`¿Seguro que deseas eliminar al paciente "${name}" y todos sus expedientes?`)) {
      return;
    }
    try {
      await api.deletePatient(id);
      loadPatients();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar paciente.');
    }
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {isAdmin ? 'Expedientes de Pacientes (Todos)' : 'Mis Pacientes Asignados'}
            </h1>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
              isAdmin ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {isAdmin ? 'Admin' : 'Privado'}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {isAdmin
              ? 'Listado de todos los pacientes registrados en el consultorio'
              : 'Solo puedes visualizar y gestionar los pacientes asignados a tu consulta'}
          </p>
        </div>
        <button
          onClick={onNewPatient}
          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nuevo Paciente</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, documento, email o teléfono..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <select
              value={selectedTherapist}
              onChange={(e) => setSelectedTherapist(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white text-slate-700"
            >
              <option value="">Todos los terapeutas</option>
              {therapists.map((th) => (
                <option key={th.id} value={th.id}>
                  {th.full_name}
                </option>
              ))}
            </select>
          )}

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white text-slate-700"
          >
            <option value="">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
            <option value="alta">Alta Terapéutica</option>
          </select>
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Cargando pacientes...</div>
        ) : patients.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <p className="text-sm font-medium text-slate-700">No se encontraron pacientes</p>
            <p className="text-xs text-slate-400">Prueba ajustando los filtros de búsqueda o agrega uno nuevo.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Paciente / Documento</th>
                  <th className="py-3 px-4">Contacto</th>
                  <th className="py-3 px-4">Terapeuta Asignado</th>
                  <th className="py-3 px-4 text-center">Sesiones Realizadas</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-3 px-4">
                      <button
                        onClick={() => onSelectPatient(patient.id)}
                        className="font-bold text-slate-900 hover:text-emerald-700 text-left cursor-pointer transition-colors block text-sm"
                      >
                        {patient.full_name}
                      </button>
                      <span className="text-[11px] font-mono text-slate-500">
                        {patient.document_type}: {patient.document_number}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 space-y-0.5">
                      {patient.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{patient.email}</span>
                        </div>
                      )}
                      {patient.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{patient.phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {patient.assigned_therapist_name ? (
                        <span className="font-medium text-slate-800">{patient.assigned_therapist_name}</span>
                      ) : (
                        <span className="text-slate-400 italic">Sin asignar</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-mono font-semibold text-slate-800 tabular-nums">
                        {patient.completed_sessions_count ?? 0}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded font-mono ${
                        patient.status === 'activo'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : patient.status === 'alta'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {patient.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onScheduleWithPatient(patient)}
                          title="Agendar Cita"
                          className="px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Calendar className="w-3 h-3" />
                          <span>Cita</span>
                        </button>
                        <button
                          onClick={() => onSelectPatient(patient.id)}
                          title="Ver Expediente Completo"
                          className="p-1 text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEditPatient(patient)}
                          title="Editar"
                          className="p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePatient(patient.id, patient.full_name)}
                          title="Eliminar"
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
