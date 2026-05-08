import { useState } from 'react';
import type { Job, Technician } from '../types';
import { initials } from '../components/StatusBadge';
import { EditTechModal } from '../components/EditTechModal';

const TC = [
  { bg: '#EDE9FE', tx: '#5B21B6' },
  { bg: '#D1FAE5', tx: '#065F46' },
  { bg: '#FEF3C7', tx: '#92400E' },
  { bg: '#DBEAFE', tx: '#1E40AF' },
  { bg: '#FCE7F3', tx: '#9D174D' },
  { bg: '#E0F2FE', tx: '#0C4A6E' },
];

interface Props {
  technicians: Technician[];
  jobs: Job[];
  onAddTech: () => void;
  onUpdateTech: (updated: Technician) => void;
  toast: (msg: string) => void;
}

export function Technicians({ technicians, jobs, onAddTech, onUpdateTech, toast }: Props) {
  const [editing, setEditing] = useState<Technician | null>(null);

  return (
    <div>
      <div className="sec-hdr">
        <div className="sec-ttl">Field Technicians</div>
        <button className="btn btn-primary btn-sm" onClick={onAddTech}>+ Add Technician</button>
      </div>
      <div className="tgrid">
        {technicians.map((t, i) => {
          const col = TC[i % TC.length];
          const myJobs = jobs.filter(j => (j.techs ?? []).includes(t.name));
          const done = myJobs.filter(j => j.status === 'completed').length;
          const active = myJobs.filter(j => j.status === 'in progress').length;
          const dotCls = t.status === 'active' ? 'da' : t.status === 'enroute' ? 'de' : 'do';
          const statusLabel = t.status === 'active' ? 'On Site' : t.status === 'enroute' ? 'En Route' : 'Offline';
          const statusColor = t.status === 'active' ? 'var(--success-tx)' : t.status === 'enroute' ? 'var(--warn-tx)' : 'var(--muted)';

          return (
            <div key={t.name} className="tcard">
              <div className="thdr">
                <div className="tav" style={{ background: col.bg, color: col.tx }}>
                  {initials(t.name)}
                </div>
                <div>
                  <div className="tnm">{t.name}</div>
                  <div className="trl">{t.role}</div>
                </div>
                <span className={`tdot ${dotCls}`} style={{ marginLeft: 'auto' }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
                {t.phone} · <span style={{ color: statusColor }}>{statusLabel}</span>
              </div>
              <div className="tstats">
                <div>
                  <div className="tsv">{myJobs.length}</div>
                  <div className="tsl">Total</div>
                </div>
                <div>
                  <div className="tsv" style={{ color: 'var(--warn-tx)' }}>{active}</div>
                  <div className="tsl">Active</div>
                </div>
                <div>
                  <div className="tsv" style={{ color: 'var(--success-tx)' }}>{done}</div>
                  <div className="tsl">Done</div>
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setEditing(t)}
                style={{ width: '100%', marginTop: 10, fontSize: 11 }}
              >
                Edit
              </button>
            </div>
          );
        })}
        {technicians.length === 0 && (
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>No technicians yet.</p>
        )}
      </div>

      {editing && (
        <EditTechModal
          technician={editing}
          onClose={() => setEditing(null)}
          onSave={onUpdateTech}
          toast={toast}
        />
      )}
    </div>
  );
}
