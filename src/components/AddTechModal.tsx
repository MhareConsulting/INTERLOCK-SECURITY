import { useRef } from 'react';
import type { Technician, TechSpecialisation, TechStatus } from '../types';

interface Props {
  onClose: () => void;
  onSubmit: (tech: Technician) => void;
  toast: (msg: string) => void;
}

const SPECS: TechSpecialisation[] = [
  'General Security', 'CCTV Specialist', 'Access Control',
  'Electric Fencing', 'Alarm Systems', 'Gate & Automation',
];

// Rough centre of Gauteng for demo — real GPS comes from device
const GAUTENG = { lat: -26.2041, lng: 28.0473 };

export function AddTechModal({ onClose, onSubmit, toast }: Props) {
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const specRef = useRef<HTMLSelectElement>(null);
  const statusRef = useRef<HTMLSelectElement>(null);

  const submit = () => {
    const name = nameRef.current?.value.trim() ?? '';
    if (!name) { toast('Enter a name'); return; }
    const tech: Technician = {
      name,
      phone: phoneRef.current?.value ?? '',
      role: (specRef.current?.value ?? 'General Security') as TechSpecialisation,
      status: (statusRef.current?.value ?? 'active') as TechStatus,
      lat: GAUTENG.lat + (Math.random() * 0.4 - 0.2),
      lng: GAUTENG.lng + (Math.random() * 0.4 - 0.2),
    };
    onSubmit(tech);
    onClose();
    toast('Technician added: ' + name);
  };

  return (
    <div className="mo" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="md">
        <div className="mhdr">
          <div><div className="mttl">Add Technician</div></div>
          <button className="mclose" onClick={onClose}>×</button>
        </div>
        <div className="mbdy">
          <div className="frow">
            <div className="fg">
              <label className="fl">Full Name</label>
              <input ref={nameRef} className="fi" placeholder="e.g. Sipho Dlamini" />
            </div>
            <div className="fg">
              <label className="fl">Phone</label>
              <input ref={phoneRef} className="fi" placeholder="+27 ..." />
            </div>
          </div>
          <div className="frow">
            <div className="fg">
              <label className="fl">Specialisation</label>
              <select ref={specRef} className="fsel">
                {SPECS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="fg">
              <label className="fl">Status</label>
              <select ref={statusRef} className="fsel">
                <option value="active">Active</option>
                <option value="enroute">En Route</option>
                <option value="offline">Offline</option>
              </select>
            </div>
          </div>
        </div>
        <div className="mftr">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit}>Add Technician</button>
        </div>
      </div>
    </div>
  );
}
