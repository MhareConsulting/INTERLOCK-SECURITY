import { useState } from 'react';
import type { Job, Technician } from '../types';
import { JobCard } from '../components/JobCard';

interface Props {
  jobs: Job[];
  technicians: Technician[];
  onJobClick: (job: Job) => void;
}

export function JobCards({ jobs, technicians, onJobClick }: Props) {
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const visible = jobs.filter(j => {
    if (filter !== 'all' && j.tech !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (![j.title, j.client].some(s => s.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="sec-hdr">
        <div className="sec-ttl">Job Cards</div>
      </div>
      <div className="fbar">
        <button
          className={`fb${filter === 'all' ? ' active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        {technicians.map(t => (
          <button
            key={t.name}
            className={`fb${filter === t.name ? ' active' : ''}`}
            onClick={() => setFilter(t.name)}
          >
            {t.name.split(' ')[0]}
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
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>No job cards match this filter.</p>
        )}
      </div>
    </div>
  );
}
