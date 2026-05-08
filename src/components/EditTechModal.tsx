import { useRef } from 'react';
import type { Technician, TechSpecialisation, TechStatus } from '../types';

interface Props {
  technician: Technician;
  onClose: () => void;
  onSave: (updated: Technician) => void;
  toast: (msg: string) => void;
}

const SPECS: TechSpecialisation[] = [
  'General Security', 'CCTV Specialist', 'Access Control',
  'Electric Fencing', 'Alarm Systems', 'Gate & Automation',
];

export function EditTechModal({ technician, onClose, onSave, toast }: Props) {
  const phoneRef = useRef<HTMLInputElement>(null);
  const specRef = useRef<HTMLSelectElement>(null);
  const statusRef = useRef<HTMLSelectElement>(null);

  const submit = () => {
    const phone = phoneRef.current?.value.trim() ?? '';
    if (!phone) { toast('Phone number is required'); return; }
    const updated: Technician = {
      ...technician,
      phone,
      role: (specRef.current?.value ?? technician.role) as TechSpecialisation,
      status: (statusRef.current?.value ?? technician.status) as TechStatus,
    };
    onSave(updated);
    onClose();
    toast(`${technician.name} updated`);
  };

  return (
    <div className="mo" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="md" style={{ maxWidth: 440 }}>
        <div className="mhdr">
          <div>
            <div className="mttl">Edit Technician</div>
            <div className="msub">{technician.name}</div>
          </div>
          <button className="mclose" onClick={onClose}>×</button>
        </div>
        <div className="mbdy">
          <div className="fg">
            <label className="fl">Phone</label>
            <input
              ref={phoneRef}
              className="fi"
              defaultValue={technician.phone}
              placeholder="+27 ..."
            />
          </div>
          <div className="frow">
            <div className="fg">
              <label className="fl">Specialisation</label>
              <select ref={specRef} className="fsel" defaultValue={technician.role}>
                {SPECS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="fg">
              <label className="fl">Status</label>
              <select ref={statusRef} className="fsel" defaultValue={technician.status}>
                <option value="active">Active</option>
                <option value="enroute">En Route</option>
                <option value="offline">Offline</option>
              </select>
            </div>
          </div>
        </div>
        <div className="mftr">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}
