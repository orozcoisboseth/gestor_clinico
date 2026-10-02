import React, { useState, useEffect } from 'react';
import {
  Database,
  Sparkles,
  Mail,
  ShieldCheck,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  KeyRound,
  Server,
  Zap,
} from 'lucide-react';
import { api } from '../api/client';
import { SystemStatus } from '../types';

interface SettingsViewProps {
  onStatusUpdated?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onStatusUpdated }) => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Turso form
  const [tursoUrl, setTursoUrl] = useState('');
  const [tursoToken, setTursoToken] = useState('');
  const [tursoLoading, setTursoLoading] = useState(false);
  const [tursoMessage, setTursoMessage] = useState<{ success: boolean; text: string } | null>(null);

  // Gemini form
  const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiBaseUrl, setGeminiBaseUrl] = useState('');
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiMessage, setGeminiMessage] = useState<{ success: boolean; text: string } | null>(null);

  // SMTP form
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpMessage, setSmtpMessage] = useState<{ success: boolean; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await api.getSystemStatus();
      setStatus(data);
      if (data.database) {
        setTursoUrl(data.database.url.startsWith('file:') ? '' : data.database.url);
      }
      if (data.ai) {
        setGeminiModel(data.ai.model || 'gemini-2.5-flash');
      }
      if (data.smtp) {
        setSmtpHost(data.smtp.host || 'smtp.gmail.com');
        setSmtpPort(String(data.smtp.port || 587));
        setSmtpUser(data.smtp.user === 'No configurado' ? '' : data.smtp.user);
        setSmtpFrom(data.smtp.from || '');
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTurso = async (e: React.FormEvent) => {
    e.preventDefault();
    setTursoLoading(true);
    setTursoMessage(null);
    try {
      const res = await api.saveTursoConfig({ url: tursoUrl.trim(), token: tursoToken.trim() });
      setTursoMessage({ success: true, text: res.message });
      loadSettings();
      if (onStatusUpdated) onStatusUpdated();
    } catch (err: any) {
      setTursoMessage({ success: false, text: err.message || 'Error al conectar con Turso.' });
    } finally {
      setTursoLoading(false);
    }
  };

  const handleSaveGemini = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeminiLoading(true);
    setGeminiMessage(null);
    try {
      const res = await api.saveGeminiConfig({
        model: geminiModel.trim(),
        apiKey: geminiApiKey.trim() || undefined,
        baseUrl: geminiBaseUrl.trim() || undefined,
      });
      setGeminiMessage({ success: true, text: res.message });
      setGeminiApiKey('');
      loadSettings();
      if (onStatusUpdated) onStatusUpdated();
    } catch (err: any) {
      setGeminiMessage({ success: false, text: err.message || 'Error al actualizar configuración de IA.' });
    } finally {
      setGeminiLoading(false);
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSmtpLoading(true);
    setSmtpMessage(null);
    try {
      const res = await api.saveSmtpConfig({
        host: smtpHost.trim(),
        port: Number(smtpPort) || 587,
        user: smtpUser.trim(),
        pass: smtpPass.trim() || undefined,
        from: smtpFrom.trim(),
      });
      setSmtpMessage({ success: true, text: res.message });
      setSmtpPass('');
      loadSettings();
      if (onStatusUpdated) onStatusUpdated();
    } catch (err: any) {
      setSmtpMessage({ success: false, text: err.message || 'Error al guardar SMTP.' });
    } finally {
      setSmtpLoading(false);
    }
  };

  const handleTestSmtp = async () => {
    setSmtpTesting(true);
    setSmtpMessage(null);
    try {
      const res = await api.testSmtpConnection({
        host: smtpHost.trim(),
        port: Number(smtpPort) || 587,
        user: smtpUser.trim(),
        pass: smtpPass.trim() || undefined,
      });
      setSmtpMessage({ success: res.success, text: res.message });
    } catch (err: any) {
      setSmtpMessage({ success: false, text: err.message || 'Error en la prueba de conexión SMTP.' });
    } finally {
      setSmtpTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Title */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          Configuración del Stack & Servicios Externos
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Ajusta los parámetros requeridos para Turso LibSQL, Google Gen AI SDK (Gemini 2.5 Flash) y Google SMTP.
        </p>
      </div>

      {/* Grid of 3 Main Config Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 1. TURSO LIBSQL */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/10 text-emerald-700 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                1. Turso (LibSQL)
              </h3>
              <p className="text-[11px] text-slate-500">Base de datos SQLite distribuida</p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1 mb-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Modo Actual:</span>
              <span className="font-semibold text-slate-800">{status?.database.type}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Estado:</span>
              <span className={`font-mono text-[11px] font-medium ${status?.database.isTurso ? 'text-emerald-700' : 'text-amber-700'}`}>
                {status?.database.isTurso ? 'Turso Cloud Conectado' : 'SQLite Local Activo'}
              </span>
            </div>
          </div>

          {tursoMessage && (
            <div
              className={`p-2.5 rounded-lg text-xs mb-3 flex items-start gap-1.5 ${
                tursoMessage.success
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border border-rose-200'
              }`}
            >
              {tursoMessage.success ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
              <span>{tursoMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleSaveTurso} className="space-y-3 flex-1 flex flex-col justify-between">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Turso Database URL
                </label>
                <input
                  type="text"
                  value={tursoUrl}
                  onChange={(e) => setTursoUrl(e.target.value)}
                  placeholder="libsql://tu-base-de-datos.turso.io"
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Deja vacío para usar el SQLite local embebido automáticamente.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Turso Auth Token
                </label>
                <input
                  type="password"
                  value={tursoToken}
                  onChange={(e) => setTursoToken(e.target.value)}
                  placeholder="Token de autenticación de Turso"
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={tursoLoading}
              className="w-full mt-4 py-2 px-3 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-60"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{tursoLoading ? 'Conectando...' : 'Guardar y Reconectar Turso'}</span>
            </button>
          </form>
        </div>

        {/* 2. GEMINI 2.5 FLASH */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/10 text-emerald-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                2. Google Gen AI SDK
              </h3>
              <p className="text-[11px] text-slate-500">Gemini 2.5 Flash para notas clínicas</p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1 mb-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Modelo Activo:</span>
              <span className="font-mono font-semibold text-emerald-700">{status?.ai.model}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">API Key:</span>
              <span className="font-mono text-[11px] text-slate-700">{status?.ai.apiKeyMasked}</span>
            </div>
          </div>

          {geminiMessage && (
            <div
              className={`p-2.5 rounded-lg text-xs mb-3 flex items-start gap-1.5 ${
                geminiMessage.success
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border border-rose-200'
              }`}
            >
              {geminiMessage.success ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
              <span>{geminiMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleSaveGemini} className="space-y-3 flex-1 flex flex-col justify-between">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Modelo Seleccionado
                </label>
                <select
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white"
                >
                  <option value="gemini-2.5-flash">gemini-2.5-flash (Requerido por MVP)</option>
                  <option value="gemini-3.8-flash">gemini-3.8-flash (Última versión rápida)</option>
                  <option value="gemini-flash-latest">gemini-flash-latest</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  GEMINI_API_KEY
                </label>
                <input
                  type="password"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="Actualizar clave de API de Gemini..."
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  URL Base / Endpoint Opcional
                </label>
                <input
                  type="text"
                  value={geminiBaseUrl}
                  onChange={(e) => setGeminiBaseUrl(e.target.value)}
                  placeholder="https://generativelanguage.googleapis.com"
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={geminiLoading}
              className="w-full mt-4 py-2 px-3 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-60"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{geminiLoading ? 'Guardando...' : 'Actualizar Configuración IA'}</span>
            </button>
          </form>
        </div>

        {/* 3. GOOGLE SMTP */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/10 text-emerald-700 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                3. Google SMTP
              </h3>
              <p className="text-[11px] text-slate-500">Envío de emails y recuperación de clave</p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1 mb-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Servidor:</span>
              <span className="font-mono text-slate-800">{status?.smtp.host}:{status?.smtp.port}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Usuario:</span>
              <span className="font-mono text-[11px] text-slate-700">{status?.smtp.user}</span>
            </div>
          </div>

          {smtpMessage && (
            <div
              className={`p-2.5 rounded-lg text-xs mb-3 flex items-start gap-1.5 ${
                smtpMessage.success
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border border-rose-200'
              }`}
            >
              {smtpMessage.success ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
              <span>{smtpMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleSaveSmtp} className="space-y-2.5 flex-1 flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Host SMTP</label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    className="w-full px-2 py-1 text-xs font-mono border border-slate-300 rounded bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Puerto</label>
                  <input
                    type="text"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    className="w-full px-2 py-1 text-xs font-mono border border-slate-300 rounded bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Correo Gmail / Workspace
                </label>
                <input
                  type="email"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  placeholder="tucorreo@gmail.com"
                  className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded outline-none focus:border-emerald-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Contraseña de Aplicación de Google (App Password)
                </label>
                <input
                  type="password"
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  placeholder="xxxx xxxx xxxx xxxx"
                  className="w-full px-2.5 py-1 text-xs font-mono border border-slate-300 rounded outline-none focus:border-emerald-600 bg-white"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Generada en la sección de Seguridad de tu cuenta de Google.
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Remitente (From)</label>
                <input
                  type="text"
                  value={smtpFrom}
                  onChange={(e) => setSmtpFrom(e.target.value)}
                  placeholder="Consultorio Psicológico <notificaciones@gmail.com>"
                  className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded outline-none focus:border-emerald-600 bg-white"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestSmtp}
                disabled={smtpTesting}
                className="flex-1 py-1.5 px-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer disabled:opacity-50"
              >
                {smtpTesting ? 'Probando...' : 'Probar Conexión'}
              </button>
              <button
                type="submit"
                disabled={smtpLoading}
                className="flex-1 py-1.5 px-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {smtpLoading ? 'Guardando...' : 'Guardar SMTP'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
