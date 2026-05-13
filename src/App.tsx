import { useState, useEffect, useRef, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { supabase, isConfigured } from './lib/supabase';
import { useJobs } from './hooks/useJobs';
import { useTechnicians } from './hooks/useTechnicians';
import { useOnlineStatus } from './hooks/useOnlineStatus';

import { Toast, useToast } from './components/Toast';
import { JobModal } from './components/JobModal';
import { AddJobModal } from './components/AddJobModal';
import { AddTechModal } from './components/AddTechModal';
import { AddUserModal } from './components/AddUserModal';
import { OfflineBanner } from './components/OfflineBanner';

import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Jobs } from './pages/Jobs';
import { Technicians } from './pages/Technicians';
import { GPSTracking } from './pages/GPSTracking';
import { JobCards } from './pages/JobCards';
import { Reports } from './pages/Reports';

import type { Job, AppUserRole } from './types';

type Panel = 'dashboard' | 'jobs' | 'technicians' | 'gps' | 'jobcards' | 'reports';

const ALL_NAV: { label: string; panel: Panel; roles: AppUserRole[] }[] = [
  { label: 'Dashboard',    panel: 'dashboard',    roles: ['admin'] },
  { label: 'Jobs',         panel: 'jobs',         roles: ['admin', 'technician'] },
  { label: 'Technicians',  panel: 'technicians',  roles: ['admin'] },
  { label: 'GPS Tracking', panel: 'gps',          roles: ['admin'] },
  { label: 'Job Cards',    panel: 'jobcards',     roles: ['admin', 'technician'] },
  { label: 'Reports',      panel: 'reports',      roles: ['admin'] },
];

export default function App() {
  const [authed, setAuthed] = useState(!isConfigured); // demo mode: skip auth
  /** Supabase: false until user metadata is applied (avoids empty shell / wrong role on login). */
  const [sessionReady, setSessionReady] = useState(!isConfigured);
  const [userRole, setUserRole] = useState<AppUserRole>('admin');
  const [currentTechName, setCurrentTechName] = useState<string>('');
  const [panel, setPanel] = useState<Panel>('dashboard');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showAddJob, setShowAddJob] = useState(false);
  const [showAddTech, setShowAddTech] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);

  const nativeBackState = useRef({
    authed,
    showAddUser,
    showAddTech,
    showAddJob,
    selectedJob: null as Job | null,
  });

  useEffect(() => {
    nativeBackState.current = {
      authed,
      showAddUser,
      showAddTech,
      showAddJob,
      selectedJob,
    };
  }, [authed, showAddUser, showAddTech, showAddJob, selectedJob]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let handle: { remove: () => Promise<void> } | undefined;
    void CapApp.addListener('backButton', () => {
      const s = nativeBackState.current;
      if (!s.authed) {
        void CapApp.exitApp();
        return;
      }
      if (s.showAddUser) {
        setShowAddUser(false);
        return;
      }
      if (s.showAddTech) {
        setShowAddTech(false);
        return;
      }
      if (s.showAddJob) {
        setShowAddJob(false);
        return;
      }
      if (s.selectedJob) {
        setSelectedJob(null);
        return;
      }
      void CapApp.exitApp();
    }).then((h) => {
      handle = h;
    });
    return () => {
      void handle?.remove();
    };
  }, []);

  const toast = useToast();

  const serverAssignee =
    !isConfigured ? undefined
      : userRole === 'technician' ? (currentTechName || null)
        : undefined;

  const syncPaused = Boolean(isConfigured && authed && !sessionReady);

  const { jobs, addJob, updateJob, hydrateJobGps, hydrateJobSignature, loading: jobsLoading } = useJobs({
    serverAssignee,
    syncPaused,
  });
  const { technicians, addTechnician, updateTechnician, deleteTechnician, updateGps, loading: techniciansLoading } =
    useTechnicians();
  const { isOnline, pendingCount, syncStatus } = useOnlineStatus();

  // Resolve role + tech name from Supabase session metadata
  const applySession = useCallback((session: Session | null) => {
    if (!session?.user) {
      setSessionReady(false);
      return;
    }
    const meta = session.user.user_metadata ?? {};
    if (meta.role === 'technician' && meta.technician_name) {
      setUserRole('technician');
      setCurrentTechName(meta.technician_name);
      setPanel('jobs'); // technicians land on Jobs
    } else {
      setUserRole('admin');
      setCurrentTechName('');
    }
    setSessionReady(true);
  }, []);

  // Check existing Supabase session
  useEffect(() => {
    if (!isConfigured) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setAuthed(true);
        applySession(data.session);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_ev, session) => {
      setAuthed(Boolean(session));
      if (session) applySession(session);
      else {
        setSessionReady(false);
        setUserRole('admin');
        setCurrentTechName('');
        setPanel('dashboard');
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [applySession]);

  const handleRefreshGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          // Update the first active technician with the real device location.
          // In production each technician would be logged in on their own device.
          const activeTech = technicians.find(t => t.status !== 'offline') ?? technicians[0];
          if (activeTech) {
            updateGps(activeTech.name, pos.coords.latitude, pos.coords.longitude);
            toast(`${activeTech.name.split(' ')[0]}'s location updated`);
          }
        },
        () => {
          // Fallback: nudge all positions slightly if permission denied
          technicians.forEach(t => {
            updateGps(t.name, t.lat + (Math.random() * 0.004 - 0.002), t.lng + (Math.random() * 0.004 - 0.002));
          });
          toast('GPS locations refreshed (simulated)');
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
      );
    } else {
      toast('Geolocation not supported');
    }
  };

  const handleSignOut = async () => {
    if (isConfigured) await supabase.auth.signOut();
    setAuthed(false);
    setSessionReady(false);
    setUserRole('admin');
    setCurrentTechName('');
    setPanel('dashboard');
  };

  const dateStr = new Date().toLocaleDateString('en-ZA', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });

  // Technicians only see jobs they are assigned to
  const visibleJobs = userRole === 'technician'
    ? jobs.filter(j => (j.techs ?? []).includes(currentTechName))
    : jobs;

  const visibleNav = ALL_NAV.filter(n => n.roles.includes(userRole));

  const userInitials = userRole === 'technician'
    ? currentTechName.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
    : 'DS';

  const workspaceLoading =
    authed &&
    isConfigured &&
    (!sessionReady ||
      (jobsLoading && jobs.length === 0) ||
      techniciansLoading);

  if (!authed) {
    return (
      <>
        <Login
          onLogin={() => setAuthed(true)}
          onAuthenticated={(session) => {
            setAuthed(true);
            applySession(session);
          }}
        />
        <Toast />
      </>
    );
  }

  return (
    <div className="app">
      {!isConfigured && (
        <div className="demo-banner">
          Demo mode — data is stored locally in your browser. Connect Supabase to enable cloud sync.
        </div>
      )}
      <OfflineBanner isOnline={isOnline} pendingCount={pendingCount} syncStatus={syncStatus} />

      <header className="header">
        <a className="logo" href="#" onClick={e => { e.preventDefault(); setPanel('dashboard'); }}>
          <div className="logo-box">
            <svg viewBox="0 0 24 24">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4l5 2.18V11c0 3.5-2.33 6.79-5 7.93-2.67-1.14-5-4.43-5-7.93V7.18L12 5z" />
            </svg>
          </div>
          <span className="logo-name">INTER<span>LOCK</span> SECURITY</span>
        </a>
        <div className="hdr-r">
          {/* Offline / pending-sync indicator */}
          {!isOnline && (
            <span title="Offline — changes saved locally" style={{
              fontSize: 11, color: '#fbbf24',
              background: '#1c1407',
              border: '0.5px solid #92400e',
              padding: '3px 9px', borderRadius: 20,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
              Offline{pendingCount > 0 ? ` · ${pendingCount} pending` : ''}
            </span>
          )}
          {userRole === 'technician' && (
            <span style={{
              fontSize: 11, color: 'var(--accent-tx, #6366f1)',
              background: 'var(--accent-bg, rgba(99,102,241,.12))',
              border: '0.5px solid rgba(99,102,241,.3)',
              padding: '3px 9px', borderRadius: 20,
            }}>
              Technician · {currentTechName}
            </span>
          )}
          <span className="dbadge">{dateStr}</span>
          <div
            className="av"
            title="Sign out"
            onClick={handleSignOut}
            style={{ cursor: 'pointer' }}
          >
            {userInitials}
          </div>
        </div>
      </header>

      <nav className="nav">
        {visibleNav.map(({ label, panel: p }) => (
          <button
            key={p}
            className={`nb${panel === p ? ' active' : ''}`}
            onClick={() => setPanel(p)}
          >
            {label}
          </button>
        ))}
      </nav>

      <main className="content">
        {workspaceLoading && (
          <div style={{
            padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--muted)', fontSize: 14,
            lineHeight: 1.6,
          }}>
            <div style={{ fontWeight: 600, color: 'var(--fg, #e5e7eb)', marginBottom: 6 }}>
              Loading your workspace…
            </div>
            <div style={{ fontSize: 12 }}>Fetching jobs and team data from the server.</div>
          </div>
        )}
        {!workspaceLoading && panel === 'dashboard' && userRole === 'admin' && (
          <Dashboard
            jobs={visibleJobs}
            technicians={technicians}
            onJobClick={setSelectedJob}
            onViewAll={() => setPanel('jobs')}
          />
        )}
        {!workspaceLoading && panel === 'jobs' && (
          <Jobs
            jobs={visibleJobs}
            technicians={technicians}
            onJobClick={setSelectedJob}
            onNewJob={userRole === 'admin' ? () => setShowAddJob(true) : null}
          />
        )}
        {!workspaceLoading && panel === 'technicians' && userRole === 'admin' && (
          <Technicians
            technicians={technicians}
            jobs={visibleJobs}
            onAddTech={() => setShowAddTech(true)}
            onAddUser={() => setShowAddUser(true)}
            onUpdateTech={updateTechnician}
            onDeleteTech={deleteTechnician}
            toast={toast}
          />
        )}
        {!workspaceLoading && panel === 'gps' && userRole === 'admin' && (
          <GPSTracking
            technicians={technicians}
            jobs={visibleJobs}
            onRefresh={handleRefreshGPS}
          />
        )}
        {!workspaceLoading && panel === 'jobcards' && (
          <JobCards
            jobs={visibleJobs}
            technicians={technicians}
            onJobClick={setSelectedJob}
          />
        )}
        {!workspaceLoading && panel === 'reports' && userRole === 'admin' && (
          <Reports jobs={visibleJobs} technicians={technicians} />
        )}
      </main>

      {selectedJob && (
        <JobModal
          job={selectedJob}
          technicians={technicians}
          onClose={() => setSelectedJob(null)}
          onSave={(updated) => {
            updateJob(updated);
            toast('Job card saved');
          }}
          onGpsHydrated={hydrateJobGps}
          onSignatureHydrated={hydrateJobSignature}
          toast={toast}
        />
      )}

      {showAddJob && userRole === 'admin' && (
        <AddJobModal
          technicians={technicians}
          jobCount={jobs.length}
          onClose={() => setShowAddJob(false)}
          onSubmit={addJob}
          onUpdateGps={updateGps}
          toast={toast}
        />
      )}

      {showAddTech && (
        <AddTechModal
          onClose={() => setShowAddTech(false)}
          onSubmit={addTechnician}
          toast={toast}
        />
      )}

      {showAddUser && (
        <AddUserModal
          onClose={() => setShowAddUser(false)}
          onCreated={() => { /* technicians list refreshes via syncFromServer */ }}
          toast={toast}
        />
      )}

      <Toast />
    </div>
  );
}
