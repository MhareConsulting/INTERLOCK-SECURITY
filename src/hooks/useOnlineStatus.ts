import { useState, useEffect, useRef } from 'react';
import { queueCount } from '../lib/db';
import { flushSyncQueue } from '../lib/sync';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const wasOffline = useRef(false);

  // Keep pending count fresh
  const refreshCount = async () => {
    const n = await queueCount();
    setPendingCount(n);
  };

  useEffect(() => {
    refreshCount();
  }, []);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      if (wasOffline.current) {
        wasOffline.current = false;
        const count = await queueCount();
        if (count > 0) {
          setSyncStatus('syncing');
          try {
            const { synced, failed } = await flushSyncQueue();
            setSyncStatus(failed > 0 ? 'error' : 'synced');
            console.info(`Sync complete: ${synced} synced, ${failed} failed`);
          } catch {
            setSyncStatus('error');
          } finally {
            await refreshCount();
            // Reset to idle after 3 s so the banner disappears
            setTimeout(() => setSyncStatus('idle'), 3000);
          }
        }
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      wasOffline.current = true;
      setSyncStatus('idle');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, pendingCount, syncStatus, refreshCount };
}
