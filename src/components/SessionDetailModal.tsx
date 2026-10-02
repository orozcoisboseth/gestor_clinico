import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Save,
  Lock,
  User,
  Calendar,
  AlertTriangle,
  CheckCircle,
  FileText,
  Wand2,
  Receipt,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../api/client';
import { Appointment, PsychotherapySession } from '../types';

interface SessionDetailModalProps {
  isOpen: boolean;
  appointmentId: string;
  onClose: () => void;
  onSessionSaved: () => void;
  onCreateInvoice?: (appointmentId: string) => void;
}

export const SessionDetailModal: React.FC<SessionDetailModalProps> = ({
  isOpen,
  appointmentId,
  onClose,
  onSessionSaved,
  onCreateInvoice,
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [session, setSession] = useState<PsychotherapySession | null>(null);

  // Form states
  const [rawNotes, setRawNotes] = useState('');
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');
  const [privateNotes, setPrivateNotes] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [aiRiskFactors, setAiRiskFactors] = useState('');
  const [aiNextGoals, setAiNextGoals] = useState('');
  const [activeTab, setActiveTab] = useState<'soap' | 'ai' | 'private'>('soap');

  useEffect(() => {
    if (isOpen && appointmentId) {
      loadSessionData();
    }
  }, [isOpen, appointmentId]);

  const loadSessionData = async () => {
    setLoading(true);
    try {
      const res = await api.getSessionByAppointment(appointmentId);
      if (res.session) {
        setSession(res.session);
        setSubjective(res.session.subjective_notes || '');
        setObjective(res.session.objective_notes || '');
        setAssessment(res.session.assessment_notes || '');
        setPlan(res.session.plan_notes || '');
        setPrivateNotes(res.session.private_notes || '');
        setAiSummary(res.session.ai_summary || '');
        setAiRiskFactors(res.session.ai_risk_factors || '');
        setAiNextGoals(res.session.ai_next_goals || '');
      } else {
        setSession(null);
        setSubjective('');
        setObjective('');
        setAssessment('');
        setPlan('');
        setPrivateNotes('');
        setAiSummary('');
        setAiRiskFactors('');
        setAiNextGoals('');
      }

      if (res.appointment) {
        setAppointment(res.appointment);
      } else {
        // Fetch appointment details
        const apts = await api.getAppointments();
        const found = apts.find((a) => a.id === appointmentId);
        if (found) setAppointment(found);
      }
    } catch (err) {
      console.error('Error loading session:', err);
    } finally {
      setLoading(false);
    }
  };

  // AI 1: Estructurar notas crudas en formato SOAP usando Gemini 2.5 Flash
  const handleAISoap = async () => {
    if (!rawNotes.trim()) {
      alert('Escribe las notas rápidas de la sesión en el campo de texto antes de estructurar con IA.');
      return;
    }
    setAiProcessing(true);
    setAiSuccessMessage(null);
    try {
      const context = appointment
        ? `Paciente: ${appointment.patient_name}. Motivo consulta: ${appointment.notes || 'No especificado'}. Tipo: ${appointment.session_type}`
        : '';
      const result = await api.processSOAP(rawNotes, context);

      setSubjective(result.subjective || '');
      setObjective(result.objective || '');
      setAssessment(result.assessment || '');
      setPlan(result.plan || '');
      setActiveTab('soap');
      setAiSuccessMessage('Estructura SOAP generada con éxito con Gemini 2.5 Flash.');
    } catch (err: any) {
      alert(err.message || 'Error al procesar con Gemini 2.5 Flash.');
    } finally {
      setAiProcessing(false);
    }
  };

  // AI 2: Generar resumen clínico y evaluación de factores de riesgo
  const handleAIInsights = async () => {
    if (!subjective && !assessment && !rawNotes) {
      alert('Completa al menos el contenido subjetivo o evaluación para generar el análisis.');
      return;
    }
    setAiProcessing(true);
    setAiSuccessMessage(null);
    try {
      const result = await api.analyzeInsights({
        subjective: subjective || rawNotes,
        objective,
        assessment,
        plan,
      });

      setAiSummary(result.summary || '');
      setAiRiskFactors(result.riskFactors || '');
      setAiNextGoals(result.nextGoals || '');
      if (result.suggestedInterventions?.length) {
        setPlan((prev) =>
          prev
            ? `${prev}\n\nIntervenciones sugeridas (Gemini):\n${result.suggestedInterventions.map((i) => `• ${i}`).join('\n')}`
            : `Intervenciones recomendadas:\n${result.suggestedInterventions.map((i) => `• ${i}`).join('\n')}`
        );
      }
      setActiveTab('ai');
      setAiSuccessMessage('Análisis clínico y detección de alertas generado con éxito.');
    } catch (err: any) {
      alert(err.message || 'Error al generar insights.');
    } finally {
      setAiProcessing(false);
    }
  };

  // Guardar sesión
  const handleSave = async () => {
    if (!appointment) return;
    setSaving(true);
    try {
      await api.saveSession({
        appointment_id: appointment.id,
        patient_id: appointment.patient_id,
        therapist_id: appointment.therapist_id,
        session_date: appointment.appointment_date,
        subjective_notes: subjective,
        objective_notes: objective,
        assessment_notes: assessment,
        plan_notes: plan,
        private_notes: privateNotes,
        ai_summary: aiSummary,
        ai_risk_factors: aiRiskFactors,
        ai_next_goals: aiNextGoals,
      });

      onSessionSaved();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Error al guardar notas de sesión.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold tracking-tight">Expediente de Sesión de Psicoterapia</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                  Gemini 2.5 Flash
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {appointment?.patient_name} · Terapeuta: {appointment?.therapist_name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onCreateInvoice && (
              <button
                type="button"
                onClick={() => onCreateInvoice(appointmentId)}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Generar Factura</span>
              </button>
            )}
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Appointment Context Ribbon */}
        {appointment && (
          <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 font-medium text-slate-800">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Fecha: {appointment.appointment_date} ({appointment.start_time} - {appointment.end_time})
              </span>
              <span>·</span>
              <span className="capitalize">Tipo: {appointment.session_type}</span>
              <span>·</span>
              <span className="font-mono text-emerald-700 font-semibold">
                Honorarios: {appointment.agreed_fee} {appointment.therapist_currency || 'USD'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">Estado de cita:</span>
              <span className="text-[11px] px-2 py-0.5 rounded font-medium bg-slate-200 text-slate-800">
                {appointment.status.toUpperCase()}
              </span>
            </div>
          </div>
        )}

        {/* AI Quick Assistant Banner */}
        <div className="p-4 bg-emerald-50/60 border-b border-emerald-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-emerald-600 text-white shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-950">Asistente Clínico Inteligente</p>
              <p className="text-[11px] text-emerald-800">
                Escribe notas rápidas en bruto y Gemini 2.5 Flash las estructurará en formato SOAP y detectará alertas clínicas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleAISoap}
              disabled={aiProcessing}
              type="button"
              className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-60 cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>{aiProcessing ? 'Estructurando...' : 'Estructurar en SOAP'}</span>
            </button>
            <button
              onClick={handleAIInsights}
              disabled={aiProcessing}
              type="button"
              className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-60 cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-emerald-700" />
              <span>Analizar Alertas & Metas</span>
            </button>
          </div>
        </div>

        {aiSuccessMessage && (
          <div className="px-5 py-2 bg-emerald-100/70 text-emerald-900 text-xs flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 shrink-0 text-emerald-700" />
            <span>{aiSuccessMessage}</span>
          </div>
        )}

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Quick Raw Notes Input */}
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-800">
                Notas Rápidas de Sesión (Borrador en tiempo real)
              </label>
              <span className="text-[11px] text-slate-500">Pega o anota aquí lo conversado libremente</span>
            </div>
            <textarea
              rows={3}
              value={rawNotes}
              onChange={(e) => setRawNotes(e.target.value)}
              placeholder="Ej: Paciente llega angustiado por discusión con su jefe. Refiere falta de sueño e ideas de insuficiencia. Se trabajó técnica de defusión cognitiva..."
              className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
            />
          </div>

          {/* Navigation Tabs for SOAP, AI Insights, and Private Notes */}
          <div className="flex border-b border-slate-200 gap-1 text-xs">
            <button
              onClick={() => setActiveTab('soap')}
              type="button"
              className={`py-2 px-4 font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'soap'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Evolución SOAP
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              type="button"
              className={`py-2 px-4 font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'ai'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span>Resumen & Factores de Alerta</span>
            </button>
            <button
              onClick={() => setActiveTab('private')}
              type="button"
              className={`py-2 px-4 font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'private'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Lock className="w-3 h-3 text-slate-500" />
              <span>Notas Confidenciales Privadas</span>
            </button>
          </div>

          {/* TAB 1: SOAP Form */}
          {activeTab === 'soap' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  S - Subjetivo (Lo manifestado por el paciente)
                </label>
                <textarea
                  rows={4}
                  value={subjective}
                  onChange={(e) => setSubjective(e.target.value)}
                  placeholder="Relato del paciente, sintomatología percibida, estados afectivos autoreportados..."
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  O - Objetivo (Observación clínica del terapeuta)
                </label>
                <textarea
                  rows={4}
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="Examen del estado mental, apariencia, conducta verbal/no verbal, reactividad..."
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  A - Análisis / Evaluación Diagnóstica
                </label>
                <textarea
                  rows={4}
                  value={assessment}
                  onChange={(e) => setAssessment(e.target.value)}
                  placeholder="Hipótesis diagnóstica, progreso observado, defensas, conceptualización..."
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  P - Plan de Tratamiento & Tareas Intersesión
                </label>
                <textarea
                  rows={4}
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  placeholder="Intervenciones acordadas, tareas para casa, objetivos para el próximo encuentro..."
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                />
              </div>
            </div>
          )}

          {/* TAB 2: AI Summary & Risk Factors */}
          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Resumen Clínico Ejecutivo
                </label>
                <textarea
                  rows={3}
                  value={aiSummary}
                  onChange={(e) => setAiSummary(e.target.value)}
                  placeholder="Resumen del progreso terapéutico generado o redactado..."
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-slate-50/50"
                />
              </div>

              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Detección de Factores de Riesgo / Señales de Alarma</span>
                </div>
                <textarea
                  rows={3}
                  value={aiRiskFactors}
                  onChange={(e) => setAiRiskFactors(e.target.value)}
                  placeholder="Señales de alerta (ideación, autolesión, impulsividad, consumo, violencia)..."
                  className="w-full p-2.5 text-xs border border-amber-300 rounded-lg outline-none focus:border-emerald-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Objetivos Prioritarios para la Siguiente Sesión
                </label>
                <textarea
                  rows={3}
                  value={aiNextGoals}
                  onChange={(e) => setAiNextGoals(e.target.value)}
                  placeholder="Puntos a retomar y revisar en el próximo encuentro..."
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                />
              </div>
            </div>
          )}

          {/* TAB 3: Private Notes */}
          {activeTab === 'private' && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-100 rounded-lg text-xs text-slate-600 flex items-start gap-2">
                <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Confidencialidad Absoluta:</strong> Estas anotaciones son de uso exclusivo del profesional terapeuta.
                  No formarán parte de informes clínicos exportables ni serán visibles para terceros.
                </span>
              </div>
              <textarea
                rows={8}
                value={privateNotes}
                onChange={(e) => setPrivateNotes(e.target.value)}
                placeholder="Impresiones personales, contratransferencia, hipótesis exploratorias preliminares..."
                className="w-full p-3 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 font-sans"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Al guardar, la cita se marcará automáticamente como <strong>Realizada</strong>.
          </span>
          <div className="flex items-center gap-2">
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
              <span>{saving ? 'Guardando expediente...' : 'Guardar Notas Clínicas'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
