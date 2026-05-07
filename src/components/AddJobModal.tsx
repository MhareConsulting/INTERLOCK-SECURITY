import { useRef } from 'react';
import type { Job, Technician, JobType, JobPriority } from '../types';

interface Props {
  technicians: Technician[];
  onClose: () => void;
  onSubmit: (job: Job) => void;
  toast: (msg: string) => void;
  jobCount: number;
}

const JOB_TYPES: JobType[] = [
  'Installation', 'Maintenance', 'Repair', 'Inspection',
  'Alarm Response', 'CCTV', 'Access Control', 'Electric Fence',
];

export function AddJobModal({ technicians, onClose, onSubmit, toast, jobCount }: Props) {
  const titleRef = useRef<HTMLInputElement>(null);
  const clientRef = useRef<HTMLInputElement>(null);
  const typeRef = useRef<HTMLSelectElement>(null);
  const priorityRef = useRef<HTMLSelectElement>(null);
  const techRef = useRef<HTMLSelectElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const title = titleRef.current?.value.trim() ?? '';
    const client = clientRef.current?.value.trim() ?? '';
    if (!title || !client) { toast('Fill in title and client'); return; }

    const id = 'JC-' + String(jobCount + 1).padStart(4, '0');
    const job: Job = {
      id,
      title,
      client,
      type: (typeRef.current?.value ?? 'Installation') as JobType,
      priority: (priorityRef.current?.value ?? 'normal') as JobPriority,
      status: 'new',
      tech: techRef.current?.value ?? (technicians[0]?.name ?? ''),
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
      gpsLog: [],
    };
    onSubmit(job);
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
            <div className="fg">
              <label className="fl">Assign Technician</label>
              <select ref={techRef} className="fsel">
                {technicians.map(t => <option key={t.name}>{t.name}</option>)}
              </select>
            </div>
            <div className="fg">
              <label className="fl">Date</label>
              <input ref={dateRef} className="fi" type="date" defaultValue={today} />
            </div>
          </div>
          <div className="fg">
            <label className="fl">Address</label>
            <input ref={addressRef} className="fi" placeholder="Site address" />
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
