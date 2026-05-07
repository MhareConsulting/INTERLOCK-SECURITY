import type { Job, Technician } from '../types';

interface Props {
  jobs: Job[];
  technicians: Technician[];
}

const TC = [
  { bg: '#EDE9FE', tx: '#5B21B6' },
  { bg: '#D1FAE5', tx: '#065F46' },
  { bg: '#FEF3C7', tx: '#92400E' },
  { bg: '#DBEAFE', tx: '#1E40AF' },
  { bg: '#FCE7F3', tx: '#9D174D' },
  { bg: '#E0F2FE', tx: '#0C4A6E' },
];

function Bar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="brow">
      <span className="blbl">{label}</span>
      <div className="btrk">
        <div className="bfil" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="bval">{count}</span>
    </div>
  );
}

export function Reports({ jobs, technicians }: Props) {
  const statuses = ['new', 'in progress', 'completed', 'pending'] as const;
  const statusColors: Record<string, string> = {
    new: '#3b82f6', 'in progress': '#f59e0b', completed: '#22c55e', pending: '#94a3b8',
  };
  const maxStatus = Math.max(...statuses.map(s => jobs.filter(j => j.status === s).length), 1);

  const maxTech = Math.max(...technicians.map(t => jobs.filter(j => j.tech === t.name).length), 1);

  const types = [...new Set(jobs.map(j => j.type))];
  const tyColors = ['#E8371B', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];
  const maxType = Math.max(...types.map(ty => jobs.filter(j => j.type === ty).length), 1);

  const priorities = ['urgent', 'high', 'normal'] as const;
  const prioColors = { urgent: '#E8371B', high: '#f59e0b', normal: '#94a3b8' };
  const maxPrio = Math.max(...priorities.map(p => jobs.filter(j => j.priority === p).length), 1);

  return (
    <div>
      <div className="sec-hdr">
        <div className="sec-ttl">Performance Reports</div>
      </div>
      <div className="rpt-grid">
        <div className="rpt-card">
          <div className="msec-ttl">Jobs by status</div>
          <div className="bbar">
            {statuses.map(s => (
              <Bar
                key={s}
                label={s}
                count={jobs.filter(j => j.status === s).length}
                max={maxStatus}
                color={statusColors[s]}
              />
            ))}
          </div>
        </div>

        <div className="rpt-card">
          <div className="msec-ttl">Jobs per technician</div>
          <div className="bbar">
            {technicians.map((t, i) => (
              <Bar
                key={t.name}
                label={t.name.split(' ')[0]}
                count={jobs.filter(j => j.tech === t.name).length}
                max={maxTech}
                color={TC[i % TC.length].tx}
              />
            ))}
          </div>
        </div>

        <div className="rpt-card">
          <div className="msec-ttl">Jobs by type</div>
          <div className="bbar">
            {types.map((ty, i) => (
              <Bar
                key={ty}
                label={ty}
                count={jobs.filter(j => j.type === ty).length}
                max={maxType}
                color={tyColors[i % tyColors.length]}
              />
            ))}
          </div>
        </div>

        <div className="rpt-card">
          <div className="msec-ttl">Priority breakdown</div>
          <div className="bbar">
            {priorities.map(p => (
              <Bar
                key={p}
                label={p}
                count={jobs.filter(j => j.priority === p).length}
                max={maxPrio}
                color={prioColors[p]}
              />
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <div className="sec-ttl" style={{ marginBottom: '.75rem' }}>Summary</div>
        <div style={{
          background: 'var(--surf)', border: '0.5px solid var(--bdr)',
          borderRadius: 'var(--rl)', padding: '1rem',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 10,
        }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>Total Jobs</div>
            <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 24, fontWeight: 700 }}>{jobs.length}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>Completion Rate</div>
            <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 24, fontWeight: 700, color: 'var(--success-tx)' }}>
              {jobs.length ? Math.round((jobs.filter(j => j.status === 'completed').length / jobs.length) * 100) : 0}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>Active Techs</div>
            <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 24, fontWeight: 700, color: 'var(--warn-tx)' }}>
              {technicians.filter(t => t.status !== 'offline').length}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>Urgent Open</div>
            <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 24, fontWeight: 700, color: 'var(--danger-tx)' }}>
              {jobs.filter(j => j.priority === 'urgent' && j.status !== 'completed').length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
