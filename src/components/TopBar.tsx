import React from 'react';
import { Search, User as UserIcon, LogOut, Settings, Plus, Sparkles, Brain } from 'lucide-react';
import { User } from '../types';

interface TopBarProps {
  user: User | null;
  onOpenSearch: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenSettings: () => void;
  onNewAppointment: () => void;
  activeView: string;
}

export const TopBar: React.FC<TopBarProps> = ({
  user,
  onOpenSearch,
  onOpenAuth,
  onLogout,
  onOpenSettings,
  onNewAppointment,
  activeView,
}) => {
  const getBreadcrumbTitle = () => {
    switch (activeView) {
      case 'dashboard': return 'Resumen Clínico';
      case 'patients': return 'Expedientes de Pacientes';
      case 'therapists': return 'Equipo Terapéutico & Tarifas';
      case 'schedules': return 'Agendas de Atención';
      case 'appointments': return 'Gestión de Citas';
      case 'sessions': return 'Sesiones Clínicas & Notas IA';
      case 'invoices': return 'Facturación & Comprobantes';
      case 'settings': return 'Ajustes del Sistema & Conexiones';
      default: return 'Consultorio';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Zone 1: Brand title & View Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
            <Brain className="w-5 h-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900 hidden sm:inline">
            PsicoGestión
          </span>
        </div>
        <span className="text-slate-300 hidden md:inline">/</span>
        <span className="text-sm font-medium text-slate-600 hidden md:inline truncate max-w-xs">
          {getBreadcrumbTitle()}
        </span>
      </div>

      {/* Zone 2: Quick Search Bar Affordance */}
      <div className="flex-1 max-w-md mx-4">
        <button
          onClick={onOpenSearch}
          type="button"
          className="w-full flex items-center justify-between px-3.5 py-1.5 text-xs text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
            <span className="truncate">Buscar paciente o terapeuta por nombre, DNI o email...</span>
          </div>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Zone 3: Primary Actions & User State */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onNewAppointment}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shadow-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nueva Cita</span>
        </button>

        {user ? (
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
            <button
              onClick={onOpenSettings}
              title="Ajustes de Base de Datos, Gemini y SMTP"
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <div className={`w-6 h-6 rounded-full font-semibold flex items-center justify-center text-[11px] ${
                user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col text-left hidden lg:block">
                <span className="font-semibold text-slate-800 max-w-[150px] truncate block text-[11px] leading-tight">
                  {user.clinic_name || user.name}
                </span>
                <span className={`text-[9px] font-mono font-bold uppercase tracking-wider block ${
                  user.role === 'admin' ? 'text-purple-700' : 'text-emerald-700'
                }`}>
                  {user.role === 'admin' ? 'Admin' : 'Usuario'}
                </span>
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Cerrar sesión"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Iniciar Sesión</span>
          </button>
        )}
      </div>
    </header>
  );
};
