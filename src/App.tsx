/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { AuthModal } from './components/AuthModal';
import { AuthView } from './views/AuthView';
import { PatientModal } from './components/PatientModal';
import { PatientDetailModal } from './components/PatientDetailModal';
import { AppointmentModal } from './components/AppointmentModal';
import { SessionDetailModal } from './components/SessionDetailModal';
import { InvoiceDetailModal } from './components/InvoiceDetailModal';
import { TherapistModal } from './components/TherapistModal';
import { ScheduleEditorModal } from './components/ScheduleEditorModal';
import { SettingsView } from './components/SettingsView';

import { DashboardView } from './views/DashboardView';
import { PatientsView } from './views/PatientsView';
import { TherapistsView } from './views/TherapistsView';
import { SchedulesView } from './views/SchedulesView';
import { AppointmentsView } from './views/AppointmentsView';
import { SessionsView } from './views/SessionsView';
import { InvoicesView } from './views/InvoicesView';

import { api, getStoredToken, setStoredToken } from './api/client';
import { User, Patient, Therapist, Appointment } from './types';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isGuestMode, setIsGuestMode] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [systemSummary, setSystemSummary] = useState({
    tursoConnected: false,
    geminiConfigured: false,
    smtpConfigured: false,
  });

  // Modals state
  const [searchOpen, setSearchOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  // Patient Modals
  const [patientModalOpen, setPatientModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [patientDetailId, setPatientDetailId] = useState<string | null>(null);

  // Appointment Modals
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [appointmentInitialPatient, setAppointmentInitialPatient] = useState<Patient | null>(null);

  // Session & Clinical Notes Modal
  const [sessionAppointmentId, setSessionAppointmentId] = useState<string | null>(null);

  // Invoice Modal
  const [invoiceId, setInvoiceId] = useState<string | null>(null);

  // Therapist Modals
  const [therapistModalOpen, setTherapistModalOpen] = useState(false);
  const [editingTherapist, setEditingTherapist] = useState<Therapist | null>(null);
  const [scheduleTherapist, setScheduleTherapist] = useState<Therapist | null>(null);

  // Refresh trigger for views
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  // Load initial authentication & system status
  useEffect(() => {
    checkAuth();
    loadSystemHealth();
  }, []);

  const checkAuth = async () => {
    const token = getStoredToken();
    if (!token) {
      setAuthChecking(false);
      return;
    }
    try {
      const data = await api.getMe();
      setCurrentUser(data.user);
    } catch {
      setStoredToken(null);
      setCurrentUser(null);
    } finally {
      setAuthChecking(false);
    }
  };

  const loadSystemHealth = async () => {
    try {
      const st = await api.getSystemStatus();
      setSystemSummary({
        tursoConnected: Boolean(st.database.isTurso),
        geminiConfigured: Boolean(st.ai.configured),
        smtpConfigured: Boolean(st.smtp.configured),
      });
    } catch (err) {
      console.error('System health check error:', err);
    }
  };

  const handleLogout = () => {
    setStoredToken(null);
    setCurrentUser(null);
    setIsGuestMode(false);
  };

  // Keyboard shortcut Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // FIRST WINDOW: Show Login and Registration window if not authenticated and not in guest mode
  if (!authChecking && !currentUser && !isGuestMode) {
    return (
      <AuthView
        onSuccess={(user) => {
          setCurrentUser(user);
          setIsGuestMode(false);
          triggerRefresh();
        }}
        onExploreDemo={async () => {
          try {
            const res = await api.loginDemo();
            setStoredToken(res.token);
            setCurrentUser(res.user);
            setIsGuestMode(false);
            triggerRefresh();
          } catch (e) {
            console.error('Demo error:', e);
            setIsGuestMode(true);
          }
        }}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        onSelectView={(view) => setCurrentView(view)}
        user={currentUser}
        systemSummary={systemSummary}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TopBar */}
        <TopBar
          user={currentUser}
          activeView={currentView}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenAuth={() => {
            setIsGuestMode(false);
          }}
          onLogout={handleLogout}
          onOpenSettings={() => setCurrentView('settings')}
          onNewAppointment={() => {
            setEditingAppointment(null);
            setAppointmentInitialPatient(null);
            setAppointmentModalOpen(true);
          }}
        />

        {/* Viewport */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {currentView === 'dashboard' && (
            <DashboardView
              key={refreshKey}
              user={currentUser}
              onNewAppointment={() => {
                setEditingAppointment(null);
                setAppointmentInitialPatient(null);
                setAppointmentModalOpen(true);
              }}
              onNewPatient={() => {
                setEditingPatient(null);
                setPatientModalOpen(true);
              }}
              onOpenSession={(aptId) => setSessionAppointmentId(aptId)}
              onOpenPatientDetail={(patId) => setPatientDetailId(patId)}
              onOpenInvoice={(invId) => setInvoiceId(invId)}
              onCreateInvoiceFromAppointment={(aptId) => {
                api
                  .createInvoiceFromAppointment(aptId)
                  .then((res) => {
                    setInvoiceId(res.id);
                    triggerRefresh();
                  })
                  .catch((err) => alert(err.message));
              }}
              onOpenSearch={() => setSearchOpen(true)}
            />
          )}

          {currentView === 'patients' && (
            <PatientsView
              key={refreshKey}
              onSelectPatient={(patId) => setPatientDetailId(patId)}
              onNewPatient={() => {
                setEditingPatient(null);
                setPatientModalOpen(true);
              }}
              onEditPatient={(pat) => {
                setEditingPatient(pat);
                setPatientModalOpen(true);
              }}
              onScheduleWithPatient={(pat) => {
                setEditingAppointment(null);
                setAppointmentInitialPatient(pat);
                setAppointmentModalOpen(true);
              }}
            />
          )}

          {currentView === 'therapists' && (
            <TherapistsView
              key={refreshKey}
              onNewTherapist={() => {
                setEditingTherapist(null);
                setTherapistModalOpen(true);
              }}
              onEditTherapist={(th) => {
                setEditingTherapist(th);
                setTherapistModalOpen(true);
              }}
              onConfigureSchedule={(th) => setScheduleTherapist(th)}
            />
          )}

          {currentView === 'schedules' && (
            <SchedulesView
              key={refreshKey}
              onConfigureSchedule={(th) => setScheduleTherapist(th)}
            />
          )}

          {currentView === 'appointments' && (
            <AppointmentsView
              key={refreshKey}
              onNewAppointment={() => {
                setEditingAppointment(null);
                setAppointmentInitialPatient(null);
                setAppointmentModalOpen(true);
              }}
              onEditAppointment={(apt) => {
                setEditingAppointment(apt);
                setAppointmentModalOpen(true);
              }}
              onOpenSession={(aptId) => setSessionAppointmentId(aptId)}
              onOpenPatientDetail={(patId) => setPatientDetailId(patId)}
              onCreateInvoice={(aptId) => {
                api
                  .createInvoiceFromAppointment(aptId)
                  .then((res) => {
                    setInvoiceId(res.id);
                    triggerRefresh();
                  })
                  .catch((err) => alert(err.message));
              }}
              onOpenInvoice={(invId) => setInvoiceId(invId)}
            />
          )}

          {currentView === 'sessions' && (
            <SessionsView
              key={refreshKey}
              onOpenSession={(aptId) => setSessionAppointmentId(aptId)}
              onOpenPatientDetail={(patId) => setPatientDetailId(patId)}
            />
          )}

          {currentView === 'invoices' && (
            <InvoicesView
              key={refreshKey}
              onOpenInvoice={(invId) => setInvoiceId(invId)}
              onInvoiceCreated={triggerRefresh}
            />
          )}

          {currentView === 'settings' && (
            <SettingsView
              onStatusUpdated={() => {
                loadSystemHealth();
                triggerRefresh();
              }}
            />
          )}
        </main>
      </div>

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectPatient={(patId) => setPatientDetailId(patId)}
        onSelectTherapist={(thId) => {
          setCurrentView('therapists');
        }}
        onScheduleWithPatient={(pat) => {
          setEditingAppointment(null);
          setAppointmentInitialPatient(pat);
          setAppointmentModalOpen(true);
        }}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          triggerRefresh();
        }}
      />

      {/* Patient Create / Edit Modal */}
      <PatientModal
        isOpen={patientModalOpen}
        patient={editingPatient}
        onClose={() => {
          setPatientModalOpen(false);
          setEditingPatient(null);
        }}
        onSuccess={triggerRefresh}
      />

      {/* Patient Detailed Chart Modal */}
      {patientDetailId && (
        <PatientDetailModal
          isOpen={Boolean(patientDetailId)}
          patientId={patientDetailId}
          onClose={() => setPatientDetailId(null)}
          onEditPatient={(pat) => {
            setEditingPatient(pat);
            setPatientModalOpen(true);
          }}
          onNewAppointment={(pat) => {
            setEditingAppointment(null);
            setAppointmentInitialPatient(pat);
            setAppointmentModalOpen(true);
          }}
          onOpenSession={(aptId) => setSessionAppointmentId(aptId)}
          onOpenInvoice={(invId) => setInvoiceId(invId)}
        />
      )}

      {/* Appointment Scheduling / Rescheduling Modal */}
      <AppointmentModal
        isOpen={appointmentModalOpen}
        appointment={editingAppointment}
        initialPatient={appointmentInitialPatient}
        onClose={() => {
          setAppointmentModalOpen(false);
          setEditingAppointment(null);
          setAppointmentInitialPatient(null);
        }}
        onSuccess={triggerRefresh}
      />

      {/* Psychotherapy Clinical Session Modal (SOAP + Gemini 2.5 Flash) */}
      {sessionAppointmentId && (
        <SessionDetailModal
          isOpen={Boolean(sessionAppointmentId)}
          appointmentId={sessionAppointmentId}
          onClose={() => setSessionAppointmentId(null)}
          onSessionSaved={triggerRefresh}
          onCreateInvoice={(aptId) => {
            api
              .createInvoiceFromAppointment(aptId)
              .then((res) => {
                setSessionAppointmentId(null);
                setInvoiceId(res.id);
                triggerRefresh();
              })
              .catch((err) => alert(err.message));
          }}
        />
      )}

      {/* Invoice Detail & Print/Email Modal */}
      {invoiceId && (
        <InvoiceDetailModal
          isOpen={Boolean(invoiceId)}
          invoiceId={invoiceId}
          onClose={() => setInvoiceId(null)}
          onInvoiceUpdated={triggerRefresh}
        />
      )}

      {/* Therapist Create / Edit Modal */}
      <TherapistModal
        isOpen={therapistModalOpen}
        therapist={editingTherapist}
        onClose={() => {
          setTherapistModalOpen(false);
          setEditingTherapist(null);
        }}
        onSuccess={triggerRefresh}
      />

      {/* Schedule Editor Modal */}
      {scheduleTherapist && (
        <ScheduleEditorModal
          isOpen={Boolean(scheduleTherapist)}
          therapist={scheduleTherapist}
          onClose={() => setScheduleTherapist(null)}
          onSuccess={triggerRefresh}
        />
      )}
    </div>
  );
}
