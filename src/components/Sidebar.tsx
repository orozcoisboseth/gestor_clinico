import React from 'react';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  CalendarDays,
  Calendar,
  FileText,
  Receipt,
  Settings,
  Sparkles,
  ShieldCheck,
  Database,
  Lock,
  Globe,
} from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  user: User | null;
  systemSummary?: {
    tursoConnected: boolean;
    geminiConfigured: boolean;
    smtpConfigured: boolean;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onSelectView, user, systemSummary }) => {
  const isAdmin = user?.role === 'admin';

  const navItems = [
    { id: 'dashboard', label: isAdmin ? 'Dashboard Global' : 'Mi Dashboard', icon: LayoutDashboard },
    { id: 'patients', label: isAdmin ? 'Todos los Pacientes' : 'Mis Pacientes', icon: Users },
    { id: 'therapists', label: isAdmin ? 'Todos los Terapeutas' : 'Mis Terapeutas & Tarifas', icon: UserCheck },
    { id: 'schedules', label: isAdmin ? 'Agendas del Equipo' : 'Agendas de Atención', icon: CalendarDays },
    { id: 'appointments', label: isAdmin ? 'Todas las Citas' : 'Mis Citas', icon: Calendar },
    { id: 'sessions', label: isAdmin ? 'Todas las Notas (IA)' : 'Mis Notas Clínicas & IA', icon: FileText, badge: 'Gemini 2.5' },
    { id: 'invoices', label: isAdmin ? 'Facturación Global' : 'Mis Facturas', icon: Receipt },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0 select-none">
      {/* Clinic Name and Subtitle */}
      <div className="p-5 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
            Ψ
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-white tracking-tight truncate">
              {user?.clinic_name || 'Mi Consultorio'}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isAdmin ? (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-semibold flex items-center gap-1">
                  <Globe className="w-2.5 h-2.5" />
                  Admin Global
                </span>
              ) : (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-semibold flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  Usuario Titular
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  isActive ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-800 text-emerald-400 border border-emerald-900/50'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Tech Stack Health Status */}
      <div className="p-3.5 m-3 rounded-lg bg-slate-800/50 border border-slate-800 text-[11px] space-y-1.5">
        <div className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
          Estado del Stack
        </div>
        <div className="flex items-center justify-between text-slate-300">
          <span className="flex items-center gap-1.5">
            <Database className="w-3 h-3 text-slate-400" />
            Turso / LibSQL
          </span>
          <span className={`font-mono text-[10px] ${systemSummary?.tursoConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
            {systemSummary?.tursoConnected ? 'Activo' : 'SQLite'}
          </span>
        </div>
        <div className="flex items-center justify-between text-slate-300">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-slate-400" />
            Gemini 2.5 Flash
          </span>
          <span className={`font-mono text-[10px] ${systemSummary?.geminiConfigured ? 'text-emerald-400' : 'text-slate-400'}`}>
            {systemSummary?.geminiConfigured ? 'Listo' : 'Pendiente'}
          </span>
        </div>
        <div className="flex items-center justify-between text-slate-300">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-slate-400" />
            Google SMTP
          </span>
          <span className={`font-mono text-[10px] ${systemSummary?.smtpConfigured ? 'text-emerald-400' : 'text-slate-400'}`}>
            {systemSummary?.smtpConfigured ? 'Conectado' : 'Simulado'}
          </span>
        </div>
      </div>
    </aside>
  );
};
