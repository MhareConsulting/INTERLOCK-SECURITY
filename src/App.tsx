import { useState, useEffect } from 'react';
import { supabase, isConfigured } from './lib/supabase';
import { useJobs } from './hooks/useJobs';
import { useTechnicians } from './hooks/useTechnicians';

import { Toast, useToast } from './components/Toast';
import { JobModal } from './components/JobModal';
import { AddJobModal } from './components/AddJobModal';
import { AddTechModal } from './components/AddTechModal';

import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Jobs } from './pages/Jobs';
import { Technicians } from './pages/Technicians';
import { GPSTracking } from './pages/GPSTracking';
import { JobCards } from './pages/JobCards';
import { Reports } from './pages/Reports';

import type { Job } from './types';

type Panel = 'dashboard' | 'jobs' | 'technicians' | 'gps' | 'jobcards' | 'reports';

const NAV: { label: string; panel: Panel }[] = [
  { label: 'Dashboard', panel: 'dashboard' },
  { label: 'Jobs', panel: 'jobs' },
  { label: 'Technicians', panel: 'technicians' },
  { label: 'GPS Tracking', panel: 'gps' },
  { label: 'Job Cards', panel: 'jobcards' },
  { label: 'Reports', panel: 'reports' },
];

export default function App() {
  const [authed, setAuthed] = useState(!isConfigured); // demo mode: skip auth
  const [panel, setPanel] = useState<Panel>('dashboard');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showAddJob, setShowAddJob] = useState(false);
  const [showAddTech, setShowAddTech] = useState(false);

  const toast = useToast();
  const { jobs, addJob, updateJob } = useJobs();
  const { technicians, addTechnician, updateGps } = useTechnicians();

  // Check existing Supabase session
  useEffect(() => {
    if (!isConfigured) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setAuthed(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_ev, session) => {
      setAuthed(Boolean(session));
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleRefreshGPS = () => {
    technicians.forEach(t => {
      const lat = t.lat + (Math.random() * 0.008 - 0.004);
      const lng = t.lng + (Math.random() * 0.008 - 0.004);
      updateGps(t.name, lat, lng);
    });
    toast('GPS locations refreshed');
  };

  const handleSignOut = async () => {
    if (isConfigured) await supabase.auth.signOut();
    setAuthed(false);
  };

  const dateStr = new Date().toLocaleDateString('en-ZA', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });

  const userInitials = isConfigured ? 'DS' : 'DS';

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
          Demo mode — data resets on refresh. Connect Supabase to enable persistence.
        </div>
      )}

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
        {NAV.map(({ label, panel: p }) => (
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
        {panel === 'dashboard' && (
          <Dashboard
            jobs={jobs}
            technicians={technicians}
            onJobClick={setSelectedJob}
            onViewAll={() => setPanel('jobs')}
          />
        )}
        {panel === 'jobs' && (
          <Jobs
            jobs={jobs}
            technicians={technicians}
            onJobClick={setSelectedJob}
            onNewJob={() => setShowAddJob(true)}
          />
        )}
        {panel === 'technicians' && (
          <Technicians
            technicians={technicians}
            jobs={jobs}
            onAddTech={() => setShowAddTech(true)}
          />
        )}
        {panel === 'gps' && (
          <GPSTracking
            technicians={technicians}
            jobs={jobs}
            onRefresh={handleRefreshGPS}
          />
        )}
        {panel === 'jobcards' && (
          <JobCards
            jobs={jobs}
            technicians={technicians}
            onJobClick={setSelectedJob}
          />
        )}
        {panel === 'reports' && (
          <Reports jobs={jobs} technicians={technicians} />
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

      {showAddJob && (
        <AddJobModal
          technicians={technicians}
          jobCount={jobs.length}
          onClose={() => setShowAddJob(false)}
          onSubmit={addJob}
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
