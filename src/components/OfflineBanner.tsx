import type { SyncStatus } from '../hooks/useOnlineStatus';

interface Props {
  isOnline: boolean;
  pendingCount: number;
  syncStatus: SyncStatus;
}

export function OfflineBanner({ isOnline, pendingCount, syncStatus }: Props) {
  if (isOnline && syncStatus === 'idle') return null;

  if (!isOnline) {
    return (
      <div style={{
        background: '#1c1407',
        borderBottom: '0.5px solid #92400e',
        color: '#fbbf24',
        fontSize: 12,
        padding: '7px 1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
          <path d="M1 6s4-4 11-4 11 4 11 4M1 12s4-4 11-4 11 4 11 4" opacity=".3"/>
          <path d="M5 18s3-2 7-2 7 2 7 2M12 22v.01"/>
          <line x1="2" y1="2" x2="22" y2="22" stroke="#ef4444"/>
        </svg>
        <span>
          <strong>You're offline.</strong> Changes are saved locally
          {pendingCount > 0 && <> — <strong>{pendingCount}</strong> change{pendingCount !== 1 ? 's' : ''} waiting to sync</>}.
        </span>
      </div>
    );
  }

  if (syncStatus === 'syncing') {
    return (
      <div style={{
        background: '#0c1a3a',
        borderBottom: '0.5px solid #1e40af',
        color: '#60a5fa',
        fontSize: 12,
        padding: '7px 1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
          <path d="M21 12a9 9 0 1 1-6.22-8.56"/>
        </svg>
        <span>Back online — syncing {pendingCount} change{pendingCount !== 1 ? 's' : ''}…</span>
      </div>
    );
  }

  if (syncStatus === 'synced') {
    return (
      <div style={{
        background: '#052e16',
        borderBottom: '0.5px solid #166534',
        color: '#4ade80',
        fontSize: 12,
        padding: '7px 1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span>All changes synced to server.</span>
      </div>
    );
  }

  if (syncStatus === 'error') {
    return (
      <div style={{
        background: '#1f0909',
        borderBottom: '0.5px solid #991b1b',
        color: '#f87171',
        fontSize: 12,
        padding: '7px 1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>Some changes failed to sync — will retry when possible.</span>
      </div>
    );
  }

  return null;
}
