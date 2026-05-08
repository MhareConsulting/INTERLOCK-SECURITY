import { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { TechSpecialisation } from '../types';

interface Props {
  onClose: () => void;
  onCreated: () => void;
  toast: (msg: string) => void;
}

const SPECS: TechSpecialisation[] = [
  'General Security', 'CCTV Specialist', 'Access Control',
  'Electric Fencing', 'Alarm Systems', 'Gate & Automation',
];

export function AddUserModal({ onClose, onCreated, toast }: Props) {
  const [role, setRole] = useState<'admin' | 'technician'>('technician');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [spec, setSpec] = useState<TechSpecialisation>('General Security');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Name, email and password are required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? '';

      const res = await supabase.functions.invoke('create-user', {
        body: { name: name.trim(), email: email.trim(), password, role, specialisation: spec, phone },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.error || res.data?.error) {
        setError(res.data?.error ?? res.error?.message ?? 'Failed to create user');
      } else {
        toast(`User "${name.trim()}" created successfully`);
        onCreated();
        onClose();
      }
    } catch (e: any) {
      setError(e.message ?? 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mo" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="md" style={{ maxWidth: 480 }}>
        <div className="mhdr">
          <div>
            <div className="mttl">Add User</div>
            <div className="msub">Create a login account for a new team member</div>
          </div>
          <button className="mclose" onClick={onClose}>×</button>
        </div>

        <div className="mbdy">
          {/* Role toggle */}
          <div className="fg">
            <label className="fl">Account Type</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['technician', 'admin'] as const).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  style={{
                    flex: 1, padding: '7px 0', borderRadius: 'var(--r)',
                    border: `1.5px solid ${role === r ? 'var(--accent,#6366f1)' : 'var(--border)'}`,
                    background: role === r ? 'var(--accent-bg,rgba(99,102,241,.1))' : 'transparent',
                    color: role === r ? 'var(--accent,#6366f1)' : 'var(--muted)',
                    fontWeight: role === r ? 700 : 400,
                    fontSize: 13, cursor: 'pointer', textTransform: 'capitalize',
                  }}
                >
                  {r === 'technician' ? 'Technician' : 'Admin'}
                </button>
              ))}
            </div>
          </div>

          <div className="frow">
            <div className="fg">
              <label className="fl">Full Name</label>
              <input className="fi" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Joe Smith" />
            </div>
            <div className="fg">
              <label className="fl">Email</label>
              <input className="fi" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@interlock.com" />
            </div>
          </div>

          <div className="frow">
            <div className="fg">
              <label className="fl">Password</label>
              <input className="fi" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" />
            </div>
            {role === 'technician' && (
              <div className="fg">
                <label className="fl">Phone</label>
                <input className="fi" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+27 ..." />
              </div>
            )}
          </div>

          {role === 'technician' && (
            <div className="fg">
              <label className="fl">Specialisation</label>
              <select className="fsel" value={spec} onChange={e => setSpec(e.target.value as TechSpecialisation)}>
                {SPECS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          )}

          {error && (
            <div style={{
              background: 'var(--danger-bg)', color: 'var(--danger-tx)',
              fontSize: 12, padding: '8px 12px', borderRadius: 'var(--r)',
            }}>
              {error}
            </div>
          )}
        </div>

        <div className="mftr">
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? 'Creating…' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  );
}
