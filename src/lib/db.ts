import Dexie, { type Table } from 'dexie';
import type { Job, Technician } from '../types';

// ─── Sync queue entry ────────────────────────────────────────
export type SyncOperation =
  | 'ADD_JOB'
  | 'UPDATE_JOB'
  | 'ADD_TECHNICIAN'
  | 'UPDATE_GPS';

export interface SyncQueueItem {
  id?: number;           // auto-incremented by Dexie
  operation: SyncOperation;
  payload: unknown;
  createdAt: number;     // Date.now()
  retries: number;
}

// ─── Dexie database ──────────────────────────────────────────
class InterlockDB extends Dexie {
  jobs!: Table<Job, string>;               // keyed by job.id
  technicians!: Table<Technician, string>; // keyed by tech.name
  syncQueue!: Table<SyncQueueItem, number>;

  constructor() {
    super('interlockSecurityDB');

    this.version(1).stores({
      jobs:         'id, status, priority, tech, date, created_at',
      technicians:  'name, status',
      syncQueue:    '++id, operation, createdAt',
    });
  }
}

export const db = new InterlockDB();

// ─── Helpers ─────────────────────────────────────────────────

/** Persist a job locally (insert or replace) */
export async function localSaveJob(job: Job) {
  await db.jobs.put(job);
}

/** Persist a technician locally (insert or replace) */
export async function localSaveTech(tech: Technician) {
  await db.technicians.put(tech);
}

/** Enqueue an operation to be synced to Supabase later */
export async function enqueue(operation: SyncOperation, payload: unknown) {
  await db.syncQueue.add({ operation, payload, createdAt: Date.now(), retries: 0 });
}

/** Return all pending items ordered oldest-first */
export async function getPendingQueue(): Promise<SyncQueueItem[]> {
  return db.syncQueue.orderBy('createdAt').toArray();
}

/** Remove a successfully synced item */
export async function dequeue(id: number) {
  await db.syncQueue.delete(id);
}

/** Increment retry count (max 3, then drop) */
export async function incrementRetry(id: number) {
  const item = await db.syncQueue.get(id);
  if (!item) return;
  if (item.retries >= 3) {
    await db.syncQueue.delete(id);
  } else {
    await db.syncQueue.update(id, { retries: item.retries + 1 });
  }
}

/** How many items are waiting to sync */
export async function queueCount(): Promise<number> {
  return db.syncQueue.count();
}
