import type { JobStatus, JobPriority } from '../types';

const TC = [
  { bg: '#EDE9FE', tx: '#5B21B6' },
  { bg: '#D1FAE5', tx: '#065F46' },
  { bg: '#FEF3C7', tx: '#92400E' },
  { bg: '#DBEAFE', tx: '#1E40AF' },
  { bg: '#FCE7F3', tx: '#9D174D' },
  { bg: '#E0F2FE', tx: '#0C4A6E' },
];

export function techColor(name: string, techs: { name: string }[]) {
  const idx = techs.findIndex(t => t.name === name);
  return TC[idx >= 0 ? idx % TC.length : 0] ?? TC[0];
}

export function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

export function priColor(p: JobPriority): string {
  if (p === 'urgent') return '#E8371B';
  if (p === 'high') return '#f59e0b';
  return '#94a3b8';
}

interface StatusBadgeProps { status: JobStatus }

export function StatusBadge({ status }: StatusBadgeProps) {
  const cls =
    status === 'new' ? 'b-new' :
    status === 'in progress' ? 'b-prog' :
    status === 'completed' ? 'b-done' :
    'b-pend';
  const label =
    status === 'new' ? 'New' :
    status === 'in progress' ? 'In Progress' :
    status === 'completed' ? 'Completed' :
    'Pending';
  return <span className={`bdg ${cls}`}>{label}</span>;
}

interface PriorityDotProps { priority: JobPriority }
export function PriorityDot({ priority }: PriorityDotProps) {
  return <div className="jpri" style={{ background: priColor(priority) }} />;
}
