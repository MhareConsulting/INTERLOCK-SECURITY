import { useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isConfigured } from '../lib/supabase';

interface Props {
  /** Demo mode only — opens the app without Supabase. */
  onLogin: () => void;
  /** Supabase sign-in succeeded — apply session before showing the shell (fixes role/assignee race). */
  onAuthenticated?: (session: Session) => void;
}

export function Login({ onLogin, onAuthenticated }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isConfigured) {
      // Demo mode — bypass auth
      onLogin();
      return;
    }

    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        const am = authError.message ?? '';
        if (/failed to fetch|networkerror|network request failed|load failed/i.test(am)) {
          setError(
            'Cannot reach the sign-in server. Check your connection and that this build has the correct Supabase URL. On Android, try fully closing the app or clearing app data if sign-in used to work.',
          );
        } else {
          setError(am);
        }
      } else if (data.session) {
        onAuthenticated?.(data.session);
      } else {
        setError('Signed in but no session was returned. Try again.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/failed to fetch|networkerror|network request failed|load failed/i.test(msg)) {
        setError(
          'Cannot reach the sign-in server. Check Wi‑Fi or mobile data, confirm your Supabase URL is correct in the build, and try again. If this is the Android app after an update, fully close the app and reopen — or clear the app\'s storage once if the problem persists.',
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-box">
            <svg viewBox="0 0 24 24">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4l5 2.18V11c0 3.5-2.33 6.79-5 7.93-2.67-1.14-5-4.43-5-7.93V7.18L12 5z" />
            </svg>
          </div>
          <span className="logo-name">INTER<span>LOCK</span> SECURITY</span>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
            Sign in
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            {isConfigured ? 'Enter your credentials to continue' : 'Running in demo mode — click Sign in to continue'}
          </div>
        </div>

        {!isConfigured && (
          <div style={{
            background: 'var(--info-bg)', color: 'var(--info-tx)',
            fontSize: 11, padding: '8px 12px', borderRadius: 'var(--r)',
            marginBottom: '1rem', lineHeight: 1.5,
          }}>
            Demo mode: Supabase not connected. All data is local and resets on refresh.
            Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to enable persistence.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="fg">
            <label className="fl">Email</label>
            <input
              className="fi"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@interlocksa.co.za"
              required={isConfigured}
              autoComplete="email"
            />
          </div>
          <div className="fg">
            <label className="fl">Password</label>
            <input
              className="fi"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required={isConfigured}
              autoComplete="current-password"
            />
          </div>
          {error && (
            <div style={{
              background: 'var(--danger-bg)', color: 'var(--danger-tx)',
              fontSize: 12, padding: '8px 12px', borderRadius: 'var(--r)', marginBottom: '.875rem',
            }}>
              {error}
            </div>
          )}
          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: '100%', marginTop: '.25rem' }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
