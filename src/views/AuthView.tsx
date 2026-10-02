import React, { useState } from 'react';
import {
  Brain,
  Lock,
  Mail,
  User,
  ShieldCheck,
  KeyRound,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Database,
  ArrowLeft,
  Building2,
  Users2,
} from 'lucide-react';
import { api, setStoredToken } from '../api/client';
import { User as UserType } from '../types';

interface AuthViewProps {
  onSuccess: (user: UserType) => void;
  onExploreDemo: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onSuccess, onExploreDemo }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');

  // Login & Register state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [clinicName, setClinicName] = useState('Consultorio Psicológico Bienestar');

  // Forgot & Reset state
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [previewCode, setPreviewCode] = useState<string | null>(null);

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.login({ email, password });
      setStoredToken(res.token);
      onSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión. Verifica tus credenciales de usuario.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.register({
        name,
        email,
        password,
        clinic_name: clinicName,
      });
      setStoredToken(res.token);
      onSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Error al registrar la cuenta de usuario.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await api.forgotPassword(email);
      setSuccessMsg(res.message);
      if (res.previewCode) {
        setPreviewCode(res.previewCode);
        setResetCode(res.previewCode);
      }
      setMode('reset');
    } catch (err: any) {
      setError(err.message || 'Error al solicitar recuperación.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.resetPassword({ email, code: resetCode, newPassword });
      setSuccessMsg(res.message);
      setTimeout(() => {
        setMode('login');
        setPassword('');
        setSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Error al restablecer contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const loadDemoCredentials = () => {
    setEmail('doctora.elena@consultorio.com');
    setPassword('terapeuta123');
    setError(null);
  };

  return (
    <div className="min-h-screen w-full bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-white block">
              PsicoGestión
            </span>
            <span className="text-[11px] text-slate-400 block -mt-0.5">
              Gestión Integral de Consultorios, Terapeutas y Pacientes
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onExploreDemo}
            className="text-xs font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Explorar en modo demo
          </button>
        </div>
      </header>

      {/* Main Center Window */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-md bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Card Header & Brand */}
          <div className="p-6 bg-slate-950 text-white border-b border-slate-800 relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-lg">
                Ψ
              </div>
              <div>
                <h1 className="text-base font-bold text-white tracking-tight">
                  {mode === 'login' && 'Iniciar Sesión de Usuario'}
                  {mode === 'register' && 'Crear Cuenta de Usuario'}
                  {mode === 'forgot' && 'Recuperar Contraseña de Usuario'}
                  {mode === 'reset' && 'Nueva Contraseña de Acceso'}
                </h1>
                <p className="text-xs text-slate-400">
                  {mode === 'login' && 'Acceso seguro al panel de control del consultorio'}
                  {mode === 'register' && 'Registra tu usuario para dar de alta y administrar tus terapeutas'}
                  {mode === 'forgot' && 'Te enviaremos un código de seguridad por correo'}
                  {mode === 'reset' && 'Define tu nueva clave de acceso'}
                </p>
              </div>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          {(mode === 'login' || mode === 'register') && (
            <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-3 text-center transition-colors cursor-pointer ${
                  mode === 'login'
                    ? 'border-b-2 border-emerald-600 bg-white text-slate-900'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-3 text-center transition-colors cursor-pointer ${
                  mode === 'register'
                    ? 'border-b-2 border-emerald-600 bg-white text-slate-900'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Registrar Usuario
              </button>
            </div>
          )}

          {/* Form Content */}
          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* 1. LOGIN FORM */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Correo Electrónico del Usuario
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="usuario@consultorio.com"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">Contraseña de Usuario</label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setError(null);
                        setSuccessMsg(null);
                      }}
                      className="text-[11px] text-emerald-700 hover:underline cursor-pointer"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <span>{loading ? 'Verificando usuario...' : 'Entrar al Consultorio'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                {/* 1-Click Demo Shortcut */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <span className="font-semibold flex items-center gap-1">
                        <Users2 className="w-3.5 h-3.5 text-emerald-600" />
                        Cuenta Demo de Usuario:
                      </span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-medium">
                        2 terapeutas vinculados
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={loadDemoCredentials}
                      className="w-full py-1.5 px-3 text-[11px] text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer font-mono"
                    >
                      <span>Cargar credenciales (Dra. Elena Vasquez)</span>
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* 2. REGISTER USER FORM */}
            {mode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3">
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 flex items-start gap-2">
                  <Users2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p>
                    Como <strong>usuario titular</strong> podrás dar de alta a <strong>uno o más terapeutas</strong> en el consultorio, configurar sus agendas individuales y registrar pacientes.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre del Usuario Titular *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Dr. Fernando Morales"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre del Consultorio o Centro Psicológico *
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={clinicName}
                      onChange={(e) => setClinicName(e.target.value)}
                      placeholder="Centro Psicológico Bienestar"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Correo Electrónico del Usuario *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contacto@miconsultorio.com"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Contraseña *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mín. 6 caracteres"
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Confirmar Clave *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repite tu clave"
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-3 py-2.5 px-4 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <span>{loading ? 'Creando cuenta de usuario...' : 'Crear Cuenta de Usuario'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            )}

            {/* 3. FORGOT PASSWORD */}
            {mode === 'forgot' && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver al inicio de sesión</span>
                </button>

                <p className="text-xs text-slate-600">
                  Ingresa el correo electrónico de tu cuenta de usuario. Te enviaremos un código de seguridad de 6 dígitos mediante Google SMTP para restablecer tu contraseña.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Correo Electrónico Registrado
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="usuario@consultorio.com"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {loading ? 'Enviando código...' : 'Enviar Código de Seguridad'}
                </button>
              </form>
            )}

            {/* 4. RESET PASSWORD */}
            {mode === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-3.5">
                <p className="text-xs text-slate-600">
                  Ingresa el código de 6 dígitos enviado a <strong>{email}</strong> y define tu nueva contraseña de usuario.
                </p>

                {previewCode && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
                    <span className="font-semibold block">Código de prueba temporal:</span>
                    <div className="font-mono text-lg font-bold tracking-widest text-slate-900">{previewCode}</div>
                    <span className="text-[11px] text-amber-700">
                      (Visible para pruebas inmediatas si aún no has conectado Google SMTP en Ajustes).
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Código de 6 dígitos
                  </label>
                  <input
                    type="text"
                    required
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                    className="w-full px-3 py-2 text-center text-lg font-mono tracking-widest border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nueva Contraseña
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {loading ? 'Guardando...' : 'Restablecer Contraseña'}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="text-xs text-slate-500 hover:underline cursor-pointer"
                  >
                    Volver al login
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="px-6 py-4 border-t border-slate-800/80 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            Turso LibSQL SQLite
          </span>
          <span>·</span>
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Gemini 2.5 Flash
          </span>
          <span>·</span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Google SMTP
          </span>
        </div>
        <p className="text-[11px] text-slate-500">
          PsicoGestión · Gestión multi-terapeuta y privacidad médica
        </p>
      </footer>
    </div>
  );
};
