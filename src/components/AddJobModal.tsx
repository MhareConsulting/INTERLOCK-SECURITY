import { useRef, useState } from 'react';
import type { Job, Technician, JobType, JobPriority } from '../types';

const MAX_ASSIGNEES = 3;

interface Props {
  technicians: Technician[];
  onClose: () => void;
  onSubmit: (job: Job) => void;
  onUpdateGps: (techName: string, lat: number, lng: number) => void;
  toast: (msg: string) => void;
  jobCount: number;
}

const JOB_TYPES: JobType[] = [
  'Installation', 'Maintenance', 'Repair', 'Inspection',
  'Alarm Response', 'CCTV', 'Access Control', 'Electric Fence',
];

// Reverse-geocode using Nominatim (OpenStreetMap) — no API key required
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'en', 'User-Agent': 'InterlockSecurityApp/1.0' },
  });
  if (!res.ok) throw new Error('Geocode request failed');
  const data = await res.json();
  // Build a clean street address from the response parts
  const a = data.address ?? {};
  const parts = [
    a.house_number,
    a.road ?? a.pedestrian ?? a.footway,
    a.suburb ?? a.neighbourhood,
    a.city ?? a.town ?? a.village ?? a.municipality,
    a.state,
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : (data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
}

export function AddJobModal({ technicians, onClose, onSubmit, onUpdateGps, toast, jobCount }: Props) {
  const titleRef = useRef<HTMLInputElement>(null);
  const clientRef = useRef<HTMLInputElement>(null);
  const typeRef = useRef<HTMLSelectElement>(null);
  const priorityRef = useRef<HTMLSelectElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  const [selectedTechs, setSelectedTechs] = useState<string[]>(
    technicians.length ? [technicians[0].name] : []
  );
  const [locState, setLocState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [locCoords, setLocCoords] = useState<{ lat: number; lng: number } | null>(null);

  const toggleTech = (name: string) => {
    setSelectedTechs(prev => {
      if (prev.includes(name)) {
        return prev.filter(n => n !== name);
      }
      if (prev.length >= MAX_ASSIGNEES) {
        toast(`Max ${MAX_ASSIGNEES} technicians per job`);
        return prev;
      }
      return [...prev, name];
    });
  };

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      toast('Geolocation is not supported by this browser');
      return;
    }
    setLocState('loading');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setLocCoords({ lat, lng });
        try {
          const address = await reverseGeocode(lat, lng);
          if (addressRef.current) addressRef.current.value = address;
          setLocState('done');
          toast('Location detected');
        } catch {
          // fallback: show raw coords if geocoding fails
          if (addressRef.current) {
            addressRef.current.value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          }
          setLocState('done');
          toast('Location set (address lookup failed)');
        }
      },
      (err) => {
        setLocState('error');
        const msg =
          err.code === 1 ? 'Location permission denied — please allow access in your browser' :
          err.code === 2 ? 'Location unavailable — check GPS or network' :
          'Location request timed out';
        toast(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const submit = () => {
    const title = titleRef.current?.value.trim() ?? '';
    const client = clientRef.current?.value.trim() ?? '';
    if (!title || !client) { toast('Fill in title and client'); return; }
    if (selectedTechs.length === 0) { toast('Assign at least one technician'); return; }

    const id = 'JC-' + String(jobCount + 1).padStart(4, '0');
    const job: Job = {
      id,
      title,
      client,
      type: (typeRef.current?.value ?? 'Installation') as JobType,
      priority: (priorityRef.current?.value ?? 'normal') as JobPriority,
      status: 'new',
      techs: selectedTechs,
      address: addressRef.current?.value ?? '',
      date: dateRef.current?.value ?? new Date().toISOString().split('T')[0],
      desc: descRef.current?.value ?? '',
      notes: '',
      checklist: [
        { t: 'Site assessment', done: false },
        { t: 'Complete work', done: false },
        { t: 'Test & verify', done: false },
        { t: 'Client sign-off', done: false },
      ],
      photos: [],
      signature: null,
      sigName: '',
      gpsLog: locCoords
        ? [{
            time: new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }),
            loc: `${locCoords.lat.toFixed(5)}°S, ${locCoords.lng.toFixed(5)}°E — Job created`,
          }]
        : [],
    };
    onSubmit(job);

    // Update all assigned technicians' GPS pins with the captured location
    if (locCoords) {
      selectedTechs.forEach(name => onUpdateGps(name, locCoords.lat, locCoords.lng));
    }

    onClose();
    toast('Job created: ' + id);
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="mo" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="md">
        <div className="mhdr">
          <div><div className="mttl">New Job</div></div>
          <button className="mclose" onClick={onClose}>×</button>
        </div>
        <div className="mbdy">
          <div className="frow">
            <div className="fg">
              <label className="fl">Job Title</label>
              <input ref={titleRef} className="fi" placeholder="e.g. Gate Motor Installation" />
            </div>
            <div className="fg">
              <label className="fl">Client Name</label>
              <input ref={clientRef} className="fi" placeholder="Full name" />
            </div>
          </div>
          <div className="frow">
            <div className="fg">
              <label className="fl">Job Type</label>
              <select ref={typeRef} className="fsel">
                {JOB_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="fg">
              <label className="fl">Priority</label>
              <select ref={priorityRef} className="fsel">
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div className="frow">
            <div className="fg" style={{ flex: 2 }}>
              <label className="fl">
                Assign Team&nbsp;
                <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 11 }}>
                  ({selectedTechs.length}/{MAX_ASSIGNEES} selected)
                </span>
              </label>
              <div style={{
                border: '1px solid var(--border)', borderRadius: 'var(--r)',
                padding: '6px 8px', maxHeight: 160, overflowY: 'auto',
                display: 'flex', flexDirection: 'column', gap: 4,
              }}>
                {technicians.map(t => {
                  const checked = selectedTechs.includes(t.name);
                  const disabled = !checked && selectedTechs.length >= MAX_ASSIGNEES;
                  return (
                    <label
                      key={t.name}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '4px 6px', borderRadius: 4, cursor: disabled ? 'not-allowed' : 'pointer',
                        background: checked ? 'var(--accent-bg, rgba(99,102,241,.12))' : 'transparent',
                        opacity: disabled ? 0.45 : 1,
                        fontSize: 13,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggleTech(t.name)}
                        style={{ accentColor: 'var(--accent)', width: 14, height: 14 }}
                      />
                      <span style={{ fontWeight: checked ? 600 : 400 }}>{t.name}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--muted)' }}>{t.role}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="fg">
              <label className="fl">Date</label>
              <input ref={dateRef} className="fi" type="date" defaultValue={today} />
            </div>
          </div>
          <div className="fg">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
              <label className="fl" style={{ margin: 0 }}>Address</label>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleUseLocation}
                disabled={locState === 'loading'}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px' }}
              >
                {locState === 'loading' ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      style={{ animation: 'spin 1s linear infinite' }}>
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                    Detecting…
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                      <path d="M12 8a4 4 0 100 8 4 4 0 000-8z" strokeOpacity="0"/>
                    </svg>
                    {locState === 'done' ? '✓ Location set' : 'Use my location'}
                  </>
                )}
              </button>
            </div>
            <input
              ref={addressRef}
              className="fi"
              placeholder="Site address or tap 'Use my location'"
              style={locState === 'done' ? { borderColor: 'var(--success-tx)' } : undefined}
            />
            {locState === 'done' && locCoords && (
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>
                GPS: {locCoords.lat.toFixed(5)}°S, {locCoords.lng.toFixed(5)}°E
              </div>
            )}
            {locState === 'error' && (
              <div style={{ fontSize: 10, color: 'var(--danger-tx)', marginTop: 3 }}>
                Could not detect location — enter manually
              </div>
            )}
          </div>
          <div className="fg">
            <label className="fl">Description</label>
            <textarea ref={descRef} className="ftxt" placeholder="Describe the job..." />
          </div>
        </div>
        <div className="mftr">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit}>Create Job</button>
        </div>
      </div>
    </div>
  );
}
