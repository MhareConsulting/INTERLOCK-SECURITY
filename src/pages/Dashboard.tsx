import type { Job, Technician } from '../types';
import { JobCard } from '../components/JobCard';

interface Props {
  jobs: Job[];
  technicians: Technician[];
  onJobClick: (job: Job) => void;
  onViewAll: () => void;
}

export function Dashboard({ jobs, technicians, onJobClick, onViewAll }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const todayJobs = jobs.filter(j => j.date === today);
  const urgentOpen = jobs.filter(j => j.priority === 'urgent' && j.status !== 'completed');

  return (
    <div>
      <div className="stats-row">
        <div className="sc red">
          <div className="sc-lbl">Total Jobs Today</div>
          <div className="sc-val">{todayJobs.length}</div>
          <div className="sc-sub">All technicians</div>
        </div>
        <div className="sc amber">
          <div className="sc-lbl">In Progress</div>
          <div className="sc-val">{todayJobs.filter(j => j.status === 'in progress').length}</div>
          <div className="sc-sub">Active now</div>
        </div>
        <div className="sc green">
          <div className="sc-lbl">Completed</div>
          <div className="sc-val">{todayJobs.filter(j => j.status === 'completed').length}</div>
          <div className="sc-sub">Today</div>
        </div>
        <div className="sc blue">
          <div className="sc-lbl">Urgent</div>
          <div className="sc-val">{urgentOpen.length}</div>
          <div className="sc-sub">Needs attention</div>
        </div>
      </div>

      <div className="sec-hdr">
        <div className="sec-ttl">Recent Jobs</div>
        <button className="btn btn-ghost btn-sm" onClick={onViewAll}>View all</button>
      </div>
      <div className="jgrid">
        {jobs.slice(0, 5).map(job => (
          <JobCard key={job.id} job={job} technicians={technicians} onClick={onJobClick} />
        ))}
        {jobs.length === 0 && (
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>No jobs yet. Create your first job.</p>
        )}
      </div>
    </div>
  );
}
