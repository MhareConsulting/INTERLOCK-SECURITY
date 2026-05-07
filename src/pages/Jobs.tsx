import { useState } from 'react';
import type { Job, Technician, JobStatus } from '../types';
import { JobCard } from '../components/JobCard';

interface Props {
  jobs: Job[];
  technicians: Technician[];
  onJobClick: (job: Job) => void;
  onNewJob: () => void;
}

type Filter = 'all' | JobStatus | 'urgent';

const FILTERS: { label: string; value: Filter }[] = [
  { label: 'All', value: 'all' },
  { label: 'New', value: 'new' },
  { label: 'In Progress', value: 'in progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Pending', value: 'pending' },
  { label: 'Urgent', value: 'urgent' },
];

export function Jobs({ jobs, technicians, onJobClick, onNewJob }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const visible = jobs.filter(j => {
    if (filter !== 'all') {
      if (filter === 'urgent') { if (j.priority !== 'urgent') return false; }
      else if (j.status !== filter) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      if (![j.title, j.client, j.tech].some(s => s.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="sec-hdr">
        <div className="sec-ttl">Job Management</div>
        <button className="btn btn-primary btn-sm" onClick={onNewJob}>+ New Job</button>
      </div>
      <div className="fbar">
        {FILTERS.map(f => (
          <button
            key={f.value}
            className={`fb${filter === f.value ? ' active' : ''}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
        <input
          className="si"
          type="text"
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="jgrid">
        {visible.map(job => (
          <JobCard key={job.id} job={job} technicians={technicians} onClick={onJobClick} />
        ))}
        {visible.length === 0 && (
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>No jobs match this filter.</p>
        )}
      </div>
    </div>
  );
}
