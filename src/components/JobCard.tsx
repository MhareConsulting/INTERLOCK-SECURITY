import type { Job } from '../types';
import type { Technician } from '../types';
import { StatusBadge, PriorityDot, techColor, initials } from './StatusBadge';

interface Props {
  job: Job;
  technicians: Technician[];
  onClick: (job: Job) => void;
}

export function JobCard({ job, technicians, onClick }: Props) {
  const done = job.checklist.filter(x => x.done).length;
  const total = job.checklist.length;
  const hasSig = Boolean((job.signature && job.signature.length > 30) || job.signaturePending);
  const hasPhotos = job.photos.length > 0;
  const assignedTechs = job.techs ?? [];

  return (
    <div className="jcard" onClick={() => onClick(job)}>
      <PriorityDot priority={job.priority} />
      <div className="jmain">
        <div className="jttl">{job.title}</div>
        <div className="jmeta">
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            {assignedTechs.map((techName, i) => {
              const col = techColor(techName, technicians);
              return (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{
                    width: 16, height: 16, borderRadius: '50%',
                    background: col.bg, color: col.tx,
                    fontSize: 8, fontWeight: 700,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {initials(techName)}
                  </span>
                  <span style={{ fontSize: 12 }}>{techName}</span>
                </span>
              );
            })}
          </span>
          <span>{job.client}</span>
          <span style={{ color: 'var(--hint)' }}>{job.type}</span>
          <span style={{ color: 'var(--hint)' }}>{done}/{total} tasks</span>
          {hasSig && <span className="text-success" style={{ fontSize: 10 }}>✓ Signed</span>}
          {hasPhotos && (
            <span className="text-info" style={{ fontSize: 10 }}>
              {job.photos.length} photo{job.photos.length > 1 ? 's' : ''}
            </span>
          )}
          {job.priority === 'urgent' && (
            <span className="bdg b-urg" style={{ fontSize: 10, padding: '2px 7px' }}>Urgent</span>
          )}
        </div>
      </div>
      <div className="jright">
        <StatusBadge status={job.status} />
        <span className="jid">{job.id}</span>
      </div>
    </div>
  );
}
