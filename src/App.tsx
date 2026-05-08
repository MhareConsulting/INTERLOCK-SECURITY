import { useState, useEffect } from 'react';
import { supabase, isConfigured } from './lib/supabase';
import { useJobs } from './hooks/useJobs';
import { useTechnicians } from './hooks/useTechnicians';
import { useOnlineStatus } from './hooks/useOnlineStatus';

import { Toast, useToast } from './components/Toast';
import { JobModal } from './components/JobModal';
import { AddJobModal } from './components/AddJobModal';
import { AddTechModal } from './components/AddTechModal';
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
  const [userRole, setUserRole] = useState<AppUserRole>('admin');
  const [currentTechName, setCurrentTechName] = useState<string>('');
  const [panel, setPanel] = useState<Panel>('dashboard');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showAddJob, setShowAddJob] = useState(false);
  const [showAddTech, setShowAddTech] = useState(false);

  const toast = useToast();
  const { jobs, addJob, updateJob } = useJobs();
  const { technicians, addTechnician, updateGps } = useTechnicians();
  const { isOnline, pendingCount, syncStatus } = useOnlineStatus();

  // Resolve role + tech name from Supabase session metadata
  const applySession = (session: { user?: { user_metadata?: Record<string, string> } } | null) => {
    if (!session?.user) return;
    const meta = session.user.user_metadata ?? {};
    if (meta.role === 'technician' && meta.technician_name) {
      setUserRole('technician');
      setCurrentTechName(meta.technician_name);
      setPanel('jobs'); // technicians land on Jobs
    } else {
      setUserRole('admin');
      setCurrentTechName('');
    }
  };

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
    });
    return () => listener.subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  if (!authed) {
    return (
      <>
        <Login onLogin={() => setAuthed(true)} />
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
        {panel === 'dashboard' && userRole === 'admin' && (
          <Dashboard
            jobs={visibleJobs}
            technicians={technicians}
            onJobClick={setSelectedJob}
            onViewAll={() => setPanel('jobs')}
          />
        )}
        {panel === 'jobs' && (
          <Jobs
            jobs={visibleJobs}
            technicians={technicians}
            onJobClick={setSelectedJob}
            onNewJob={userRole === 'admin' ? () => setShowAddJob(true) : null}
          />
        )}
        {panel === 'technicians' && userRole === 'admin' && (
          <Technicians
            technicians={technicians}
            jobs={visibleJobs}
            onAddTech={() => setShowAddTech(true)}
          />
        )}
        {panel === 'gps' && userRole === 'admin' && (
          <GPSTracking
            technicians={technicians}
            jobs={visibleJobs}
            onRefresh={handleRefreshGPS}
          />
        )}
        {panel === 'jobcards' && (
          <JobCards
            jobs={visibleJobs}
            technicians={technicians}
            onJobClick={setSelectedJob}
          />
        )}
        {panel === 'reports' && userRole === 'admin' && (
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

      <Toast />
    </div>
  );
}
