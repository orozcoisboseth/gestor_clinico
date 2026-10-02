import React, { useState, useEffect } from 'react';
import { X, User, Phone, Mail, FileText, AlertCircle } from 'lucide-react';
import { api } from '../api/client';
import { Patient, Therapist } from '../types';

interface PatientModalProps {
  isOpen: boolean;
  patient?: Patient | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const PatientModal: React.FC<PatientModalProps> = ({
  isOpen,
  patient,
  onClose,
  onSuccess,
}) => {
  const [fullName, setFullName] = useState('');
  const [documentType, setDocumentType] = useState('DNI');
  const [documentNumber, setDocumentNumber] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('No especificado');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [reasonForConsultation, setReasonForConsultation] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [psychologicalHistory, setPsychologicalHistory] = useState('');
  const [assignedTherapistId, setAssignedTherapistId] = useState('');
  const [status, setStatus] = useState<'activo' | 'inactivo' | 'alta'>('activo');

  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.getTherapists().then(setTherapists).catch(console.error);

      if (patient) {
        setFullName(patient.full_name);
        setDocumentType(patient.document_type || 'DNI');
        setDocumentNumber(patient.document_number);
        setEmail(patient.email || '');
        setPhone(patient.phone || '');
        setDateOfBirth(patient.date_of_birth || '');
        setGender(patient.gender || 'No especificado');
        setEmergencyContactName(patient.emergency_contact_name || '');
        setEmergencyContactPhone(patient.emergency_contact_phone || '');
        setReasonForConsultation(patient.reason_for_consultation || '');
        setMedicalHistory(patient.medical_history || '');
        setPsychologicalHistory(patient.psychological_history || '');
        setAssignedTherapistId(patient.assigned_therapist_id || '');
        setStatus(patient.status || 'activo');
      } else {
        setFullName('');
        setDocumentType('DNI');
        setDocumentNumber('');
        setEmail('');
        setPhone('');
        setDateOfBirth('');
        setGender('No especificado');
        setEmergencyContactName('');
        setEmergencyContactPhone('');
        setReasonForConsultation('');
        setMedicalHistory('');
        setPsychologicalHistory('');
        setAssignedTherapistId('');
        setStatus('activo');
      }
    }
  }, [isOpen, patient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !documentNumber.trim()) {
      setError('Nombre y documento son obligatorios.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload: Partial<Patient> = {
        full_name: fullName.trim(),
        document_type: documentType,
        document_number: documentNumber.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        date_of_birth: dateOfBirth || undefined,
        gender,
        emergency_contact_name: emergencyContactName.trim() || undefined,
        emergency_contact_phone: emergencyContactPhone.trim() || undefined,
        reason_for_consultation: reasonForConsultation.trim() || undefined,
        medical_history: medicalHistory.trim() || undefined,
        psychological_history: psychologicalHistory.trim() || undefined,
        assigned_therapist_id: assignedTherapistId || undefined,
        status,
      };

      if (patient) {
        await api.updatePatient(patient.id, payload);
      } else {
        await api.createPatient(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el paciente.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-tight">
                {patient ? 'Editar Ficha de Paciente' : 'Nuevo Paciente'}
              </h3>
              <p className="text-xs text-slate-400">Datos Clínicos y Contacto</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Personal Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1">
              Información de Identidad
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nombre y Apellidos"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo Doc.</label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="w-full px-2 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white"
                  >
                    <option value="DNI">INE</option>
                    <option value="Pasaporte">Pasap.</option>
                    <option value="LIC">Licencia</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nº Doc. *</label>
                  <input
                    type="text"
                    required
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    placeholder="12345678A"
                    className="w-full px-2 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono Móvil</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+34 600 000 000"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha de Nacimiento</label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Emergency & Assignment */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1">
              Contacto de Emergencia & Terapeuta
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contacto de Emergencia</label>
                <input
                  type="text"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  placeholder="Nombre y relación (Ej: Hermana)"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono de Emergencia</label>
                <input
                  type="tel"
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  placeholder="+34 600 000 000"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Terapeuta Asignado</label>
                <select
                  value={assignedTherapistId}
                  onChange={(e) => setAssignedTherapistId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white"
                >
                  <option value="">Sin terapeuta asignado</option>
                  {therapists.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name} ({t.specialty})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Estado del Paciente</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white font-medium"
                >
                  <option value="activo">Activo (En tratamiento)</option>
                  <option value="inactivo">Inactivo / Pausado</option>
                  <option value="alta">Alta Terapéutica</option>
                </select>
              </div>
            </div>
          </div>

          {/* Clinical Background */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1">
              Antecedentes y Motivo de Consulta
            </h4>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Motivo de Consulta Principal</label>
              <textarea
                rows={2}
                value={reasonForConsultation}
                onChange={(e) => setReasonForConsultation(e.target.value)}
                placeholder="Descripción del motivo que lleva al paciente a iniciar psicoterapia..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Antecedentes Médicos / Farmacología</label>
                <textarea
                  rows={2}
                  value={medicalHistory}
                  onChange={(e) => setMedicalHistory(e.target.value)}
                  placeholder="Enfermedades crónicas, medicación psiquiátrica actual o relevante..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Antecedentes Psicológicos Previos</label>
                <textarea
                  rows={2}
                  value={psychologicalHistory}
                  onChange={(e) => setPsychologicalHistory(e.target.value)}
                  placeholder="Procesos psicoterapéuticos anteriores, hospitalizaciones, eventos traumáticos..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
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
              {loading ? 'Guardando...' : patient ? 'Actualizar Ficha' : 'Guardar Paciente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
