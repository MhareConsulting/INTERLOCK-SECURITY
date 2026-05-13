import { useMemo } from 'react';
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

  const statusCounts = useMemo(
    () => Object.fromEntries(statuses.map(s => [s, jobs.filter(j => j.status === s).length])) as Record<(typeof statuses)[number], number>,
    [jobs],
  );
  const maxStatus = useMemo(
    () => Math.max(...statuses.map(s => statusCounts[s]), 1),
    [statusCounts],
  );

  const techCounts = useMemo(
    () => technicians.map(t => ({ tech: t, count: jobs.filter(j => (j.techs ?? []).includes(t.name)).length })),
    [jobs, technicians],
  );
  const maxTech = useMemo(() => Math.max(...techCounts.map(x => x.count), 1), [techCounts]);

  const types = useMemo(() => [...new Set(jobs.map(j => j.type))], [jobs]);
  const tyColors = ['#E8371B', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];
  const typeCounts = useMemo(
    () => Object.fromEntries(types.map(ty => [ty, jobs.filter(j => j.type === ty).length])),
    [jobs, types],
  );
  const maxType = useMemo(() => Math.max(...types.map(ty => typeCounts[ty] ?? 0), 1), [types, typeCounts]);

  const priorities = ['urgent', 'high', 'normal'] as const;
  const prioColors = { urgent: '#E8371B', high: '#f59e0b', normal: '#94a3b8' };
  const prioCounts = useMemo(
    () => Object.fromEntries(priorities.map(p => [p, jobs.filter(j => j.priority === p).length])) as Record<(typeof priorities)[number], number>,
    [jobs],
  );
  const maxPrio = useMemo(
    () => Math.max(...priorities.map(p => prioCounts[p]), 1),
    [prioCounts],
  );

  const totalJobs = jobs.length;
  const completedCount = useMemo(() => jobs.filter(j => j.status === 'completed').length, [jobs]);
  const activeTechs = useMemo(() => technicians.filter(t => t.status !== 'offline').length, [technicians]);
  const urgentOpen = useMemo(
    () => jobs.filter(j => j.priority === 'urgent' && j.status !== 'completed').length,
    [jobs],
  );

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
                count={statusCounts[s]}
                max={maxStatus}
                color={statusColors[s]}
              />
            ))}
          </div>
        </div>

        <div className="rpt-card">
          <div className="msec-ttl">Jobs per technician</div>
          <div className="bbar">
            {techCounts.map(({ tech: t, count }, i) => (
              <Bar
                key={t.name}
                label={t.name.split(' ')[0]}
                count={count}
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
                count={typeCounts[ty] ?? 0}
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
                count={prioCounts[p]}
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
            <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 24, fontWeight: 700 }}>{totalJobs}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>Completion Rate</div>
            <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 24, fontWeight: 700, color: 'var(--success-tx)' }}>
              {totalJobs ? Math.round((completedCount / totalJobs) * 100) : 0}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>Active Techs</div>
            <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 24, fontWeight: 700, color: 'var(--warn-tx)' }}>
              {activeTechs}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>Urgent Open</div>
            <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 24, fontWeight: 700, color: 'var(--danger-tx)' }}>
              {urgentOpen}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
