import { useState, useRef, useEffect, useCallback } from 'react';
import type { Job, JobStatus, Technician, GpsLogEntry } from '../types';
import { supabase, isConfigured } from '../lib/supabase';
import { priColor, initials, techColor } from './StatusBadge';

interface Props {
  job: Job | null;
  technicians: Technician[];
  onClose: () => void;
  onSave: (job: Job) => void;
  /** Persist GPS log into the shared jobs store after lazy load (does not push to server). */
  onGpsHydrated?: (jobId: string, entries: GpsLogEntry[]) => void;
  /** Persist signature blob after lazy load (does not push to server). */
  onSignatureHydrated?: (jobId: string, signature: string | null, sigName: string) => void;
  toast: (msg: string) => void;
}

type TabName = 'details' | 'gps' | 'photos' | 'signature';

export function JobModal({ job: initialJob, technicians, onClose, onSave, onGpsHydrated, onSignatureHydrated, toast }: Props) {
  const [job, setJob] = useState<Job | null>(null);
  const [tab, setTab] = useState<TabName>('details');
  const gpsHydratedForJob = useRef<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const sigRef = useRef<HTMLCanvasElement>(null);
  const sigDrawing = useRef(false);
  const sigHasData = useRef(false);
  const sigCtx = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    if (initialJob) {
      setJob({ ...initialJob, checklist: initialJob.checklist.map(c => ({ ...c })) });
      setTab('details');
      gpsHydratedForJob.current = null;
    }
  }, [initialJob]);

  // Lazy-load job GPS history (excluded from the bulk jobs query for performance).
  useEffect(() => {
    if (tab !== 'gps' || !job || !isConfigured || !navigator.onLine) return;
    if (job.gpsLog.length > 0) return;
    if (gpsHydratedForJob.current === job.id) return;

    let cancelled = false;
    const jobId = job.id;

    void (async () => {
      try {
        const { data, error } = await supabase
          .from('job_gps_log')
          .select('id, lat, lng, logged_at')
          .eq('job_id', jobId)
          .order('logged_at', { ascending: false })
          .limit(400);
        if (cancelled || error || !data) return;
        const entries: GpsLogEntry[] = data.map((g: { id: string; lat: number; lng: number; logged_at: string }) => ({
          id: g.id,
          time: g.logged_at,
          loc: `${g.lat.toFixed(4)}, ${g.lng.toFixed(4)}`,
        }));
        gpsHydratedForJob.current = jobId;
        setJob(prev => (prev && prev.id === jobId ? { ...prev, gpsLog: entries } : prev));
        onGpsHydrated?.(jobId, entries);
      } catch {
        gpsHydratedForJob.current = jobId;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tab, job?.id, job?.gpsLog.length, onGpsHydrated]);

  // Lazy-load signature image (omitted from bulk jobs query for performance).
  useEffect(() => {
    if (!job || !job.signaturePending || !isConfigured || !navigator.onLine) return;
    if (job.signature && job.signature.length > 30) return;

    let cancelled = false;
    const jobId = job.id;

    void (async () => {
      try {
        const { data, error } = await supabase
          .from('job_signatures')
          .select('signature_data_url, client_name')
          .eq('job_id', jobId)
          .maybeSingle();
        if (cancelled || error || !data?.signature_data_url) return;
        const url = data.signature_data_url as string;
        const name = (data.client_name as string) || job.sigName;
        setJob(prev =>
          prev && prev.id === jobId ? { ...prev, signature: url, sigName: name, signaturePending: false } : prev,
        );
        onSignatureHydrated?.(jobId, url, name);
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [job?.id, job?.signaturePending, job?.signature, job?.sigName, onSignatureHydrated]);

  const initSig = useCallback(() => {
    const canvas = sigRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    sigCtx.current = ctx;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    sigHasData.current = false;

    const getPos = (e: MouseEvent | Touch, rect: DOMRect) => ({
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    });

    canvas.onmousedown = (e) => {
      sigDrawing.current = true;
      const r = canvas.getBoundingClientRect();
      ctx.beginPath();
      ctx.moveTo(...Object.values(getPos(e, r)) as [number, number]);
    };
    canvas.onmousemove = (e) => {
      if (!sigDrawing.current) return;
      const r = canvas.getBoundingClientRect();
      ctx.lineTo(...Object.values(getPos(e, r)) as [number, number]);
      ctx.stroke();
      sigHasData.current = true;
    };
    canvas.onmouseup = canvas.onmouseleave = () => { sigDrawing.current = false; };

    canvas.ontouchstart = (e) => {
      e.preventDefault();
      sigDrawing.current = true;
      const r = canvas.getBoundingClientRect();
      ctx.beginPath();
      ctx.moveTo(...Object.values(getPos(e.touches[0], r)) as [number, number]);
    };
    canvas.ontouchmove = (e) => {
      e.preventDefault();
      if (!sigDrawing.current) return;
      const r = canvas.getBoundingClientRect();
      ctx.lineTo(...Object.values(getPos(e.touches[0], r)) as [number, number]);
      ctx.stroke();
      sigHasData.current = true;
    };
    canvas.ontouchend = () => { sigDrawing.current = false; };
  }, []);

  useEffect(() => {
    if (tab === 'signature') {
      setTimeout(initSig, 50);
    }
  }, [tab, initSig]);

  if (!job) return null;

  const assignedTechs = job.techs ?? [];
  const primaryTechName = assignedTechs[0] ?? '';
  const col = techColor(primaryTechName, technicians);

  const setStatus = (s: JobStatus) => setJob(prev => prev ? { ...prev, status: s } : prev);
  const toggleCheck = (i: number, done: boolean) => {
    setJob(prev => {
      if (!prev) return prev;
      const cl = [...prev.checklist];
      cl[i] = { ...cl[i], done };
      return { ...prev, checklist: cl };
    });
  };

  const handleAddPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setJob(prev => prev ? { ...prev, photos: [...prev.photos, result] } : prev);
      toast('Photo added');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const delPhoto = (i: number) => {
    setJob(prev => {
      if (!prev) return prev;
      const photos = [...prev.photos];
      photos.splice(i, 1);
      return { ...prev, photos };
    });
  };

  const clearSig = () => {
    if (sigCtx.current && sigRef.current) {
      sigCtx.current.clearRect(0, 0, sigRef.current.width, sigRef.current.height);
    }
    sigHasData.current = false;
    setJob(prev => prev ? { ...prev, signature: null, sigName: '', signaturePending: false } : prev);
  };

  const captureSig = () => {
    if (!sigHasData.current) { toast('Please draw signature first'); return; }
    const name = (document.getElementById('sigName') as HTMLInputElement)?.value.trim();
    if (!name) { toast('Please enter client name'); return; }
    const dataUrl = sigRef.current?.toDataURL() ?? '';
    const next = job ? { ...job, signature: dataUrl, sigName: name, signaturePending: false } : null;
    if (next) {
      setJob(next);
      onSave(next);
    }
  };

  const handleSave = () => {
    onSave(job);
    onClose();
  };

  const statuses: JobStatus[] = ['new', 'in progress', 'completed', 'pending'];

  return (
    <div className="mo" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="md">
        <div className="mhdr">
          <div>
            <div className="mttl">{job.title}</div>
            <div className="msub">{job.id} · {job.client} · {job.address}</div>
          </div>
          <button className="mclose" onClick={onClose}>×</button>
        </div>
        <div className="mbdy">
          <div className="mtabs">
            {(['details', 'gps', 'photos', 'signature'] as TabName[]).map(t => (
              <button
                key={t}
                className={`mtab${tab === t ? ' active' : ''}`}
                onClick={() => setTab(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* DETAILS TAB */}
          <div className={`tabp${tab === 'details' ? ' active' : ''}`}>
            <div className="msec">
              <div className="msec-ttl">Job info</div>
              <div className="igrid">
                <div><div className="ilbl">Type</div><div className="ival">{job.type}</div></div>
                <div>
                  <div className="ilbl">Priority</div>
                  <div className="ival" style={{ color: priColor(job.priority) }}>{job.priority}</div>
                </div>
                <div>
                  <div className="ilbl">Team</div>
                  <div className="ival" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {assignedTechs.map((name, i) => {
                      const c = techColor(name, technicians);
                      return (
                        <span key={i} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          background: c.bg, color: c.tx,
                          padding: '2px 8px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                        }}>
                          <span style={{
                            width: 16, height: 16, borderRadius: '50%',
                            background: c.tx, color: c.bg,
                            fontSize: 8, fontWeight: 700,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          }}>{initials(name)}</span>
                          {name}
                          {i === 0 && <span style={{ fontSize: 9, opacity: 0.7 }}>lead</span>}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div><div className="ilbl">Date</div><div className="ival">{job.date}</div></div>
                <div style={{ gridColumn: '1/-1' }}>
                  <div className="ilbl">Address</div>
                  <div className="ival" style={{ fontWeight: 400 }}>{job.address}</div>
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <div className="ilbl">Description</div>
                  <div className="ival" style={{ fontWeight: 400, color: 'var(--muted)' }}>{job.desc}</div>
                </div>
              </div>
            </div>

            <div className="msec">
              <div className="msec-ttl">Status</div>
              <div className="stat-sel">
                {statuses.map(s => (
                  <span
                    key={s}
                    className={`sopt${job.status === s ? ' s-' + s.replace(' ', '-') : ''}`}
                    onClick={() => setStatus(s)}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="msec">
              <div className="msec-ttl">Work checklist</div>
              <div className="chklist">
                {job.checklist.map((c, i) => (
                  <label key={i} className="chi">
                    <input
                      type="checkbox"
                      checked={c.done}
                      onChange={(e) => toggleCheck(i, e.target.checked)}
                    />
                    <span className={c.done ? 'chd' : ''}>{c.t}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="msec">
              <div className="msec-ttl">Technician notes</div>
              <textarea
                className="ntxt"
                value={job.notes}
                onChange={(e) => setJob(prev => prev ? { ...prev, notes: e.target.value } : prev)}
                placeholder="Add field notes..."
              />
            </div>
          </div>

          {/* GPS TAB */}
          <div className={`tabp${tab === 'gps' ? ' active' : ''}`}>
            <div className="msec">
              <div className="msec-ttl">Technician location</div>
              <div className="gps-info">
                {(() => {
                  const primaryTech = technicians.find(t => t.name === primaryTechName);
                  return (
                    <>
                      <div className="gps-coord">Lat <span>{primaryTech?.lat?.toFixed(4) ?? '-'}°</span></div>
                      <div className="gps-coord">Lng <span>{primaryTech?.lng?.toFixed(4) ?? '-'}°</span></div>
                      <div className="gps-coord">
                        Status{' '}
                        <span style={{
                          color: primaryTech?.status === 'active' ? 'var(--success-tx)' :
                            primaryTech?.status === 'enroute' ? 'var(--warn-tx)' : 'var(--muted)'
                        }}>
                          {primaryTech?.status ?? '-'}
                        </span>
                      </div>
                      <div className="gps-coord">
                        Team{' '}
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          background: col.bg, color: col.tx,
                          padding: '1px 6px', borderRadius: 10, fontSize: 11,
                        }}>
                          {initials(primaryTechName)} {assignedTechs.join(', ')}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
            <div className="msec">
              <div className="msec-ttl">Location log</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {job.gpsLog.length ? job.gpsLog.map((e, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                    padding: '6px 10px', background: 'var(--surf2)',
                    borderRadius: 'var(--r)', border: '0.5px solid var(--bdr)',
                  }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                      {e.time}
                    </span>
                    <span style={{ fontSize: 12 }}>{e.loc}</span>
                  </div>
                )) : (
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>No location history available.</span>
                )}
              </div>
            </div>
          </div>

          {/* PHOTOS TAB */}
          <div className={`tabp${tab === 'photos' ? ' active' : ''}`}>
            <div className="msec">
              <div className="msec-ttl">Job site photos</div>
              <div className="photo-grid">
                {job.photos.map((p, i) => (
                  <div key={i} className="photo-slot">
                    <img src={p} alt={`Job photo ${i + 1}`} />
                    <button className="photo-del" onClick={() => delPhoto(i)}>×</button>
                  </div>
                ))}
                {job.photos.length < 6 && (
                  <div className="photo-slot" onClick={() => fileRef.current?.click()}>
                    <div className="photo-icon">
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="12" cy="11" r="3" />
                        <path d="M3 16l4-4 3 3 3-3 5 5" />
                      </svg>
                    </div>
                    <span className="photo-add-lbl">Add photo</span>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAddPhoto} />
            </div>
          </div>

          {/* SIGNATURE TAB */}
          <div className={`tabp${tab === 'signature' ? ' active' : ''}`}>
            <div className="msec">
              <div className="msec-ttl">Client sign-off</div>
              {((job.signature && job.signature.length > 30) || job.signaturePending) && (
                <div className="sig-done" style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 14 }}>✓</span> Signed by {job.sigName || 'client'}
                </div>
              )}
              <div className="sig-wrap">
                <canvas ref={sigRef} className="sig-canvas" width={600} height={150} />
                <div className="sig-bar">
                  <span>Sign above with mouse or finger</span>
                  <button className="btn btn-ghost btn-sm" onClick={clearSig}>Clear</button>
                </div>
              </div>
              <input
                id="sigName"
                className="sig-client-name"
                defaultValue={job.sigName}
                placeholder="Client full name"
              />
            </div>
            <div style={{ display: 'flex', gap: 7, marginTop: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={captureSig}>Capture Signature</button>
              <button className="btn btn-ghost btn-sm" onClick={clearSig}>Reset</button>
            </div>
          </div>
        </div>

        <div className="mftr">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}
