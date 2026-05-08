import { supabase, isConfigured } from './supabase';
import {
  getPendingQueue,
  dequeue,
  incrementRetry,
  type SyncQueueItem,
} from './db';
import type { Job, Technician } from '../types';

// ─── Flush the queue ─────────────────────────────────────────
// Called when the app comes back online. Processes every pending
// operation in order, oldest first. Failed items are retried up
// to 3 times then dropped.

export async function flushSyncQueue(
  onProgress?: (synced: number, total: number) => void
): Promise<{ synced: number; failed: number }> {
  if (!isConfigured) return { synced: 0, failed: 0 };

  const items = await getPendingQueue();
  let synced = 0;
  let failed = 0;

  for (const item of items) {
    const ok = await processItem(item);
    if (ok) {
      await dequeue(item.id!);
      synced++;
    } else {
      await incrementRetry(item.id!);
      failed++;
    }
    onProgress?.(synced, items.length);
  }

  return { synced, failed };
}

// ─── Process a single queue item ─────────────────────────────
async function processItem(item: SyncQueueItem): Promise<boolean> {
  try {
    switch (item.operation) {
      case 'ADD_JOB':
        return await syncAddJob(item.payload as Job);
      case 'UPDATE_JOB':
        return await syncUpdateJob(item.payload as Job);
      case 'ADD_TECHNICIAN':
        return await syncAddTech(item.payload as Technician);
      case 'UPDATE_GPS': {
        const { name, lat, lng } = item.payload as { name: string; lat: number; lng: number };
        return await syncUpdateGps(name, lat, lng);
      }
      default:
        return true; // unknown op — drop it
    }
  } catch {
    return false;
  }
}

// ─── Individual sync operations ──────────────────────────────

async function syncAddJob(job: Job): Promise<boolean> {
  const { error } = await supabase.from('jobs').upsert({
    id: job.id,
    title: job.title,
    client: job.client,
    type: job.type,
    priority: job.priority,
    status: job.status,
    technician_name: job.techs?.[0] ?? null,
    technician_names: job.techs ?? [],
    address: job.address,
    date: job.date,
    description: job.desc,
    notes: job.notes,
  });
  if (error) return false;

  // Upsert checklist items
  if (job.checklist.length) {
    const { error: clErr } = await supabase.from('job_checklist').upsert(
      job.checklist.map(c => ({ job_id: job.id, item_label: c.t, checked: c.done }))
    );
    if (clErr) return false;
  }

  // Seed the GPS log entry if present
  for (const entry of job.gpsLog) {
    await supabase.from('job_gps_log').insert({
      job_id: job.id,
      lat: parseFloat(entry.loc.split('°')[0]) || 0,
      lng: parseFloat(entry.loc.split(',')[1]) || 0,
    }).select();
  }

  return true;
}

async function syncUpdateJob(job: Job): Promise<boolean> {
  const { error } = await supabase.from('jobs').update({
    status: job.status,
    notes: job.notes,
    technician_name: job.techs?.[0] ?? null,
    technician_names: job.techs ?? [],
  }).eq('id', job.id);
  if (error) return false;

  for (const item of job.checklist) {
    if (item.id) {
      await supabase.from('job_checklist').update({ checked: item.done }).eq('id', item.id);
    }
  }

  if (job.signature && job.sigName) {
    await supabase.from('job_signatures').upsert(
      { job_id: job.id, client_name: job.sigName, signature_data_url: job.signature },
      { onConflict: 'job_id' }
    );
  }

  return true;
}

async function syncAddTech(tech: Technician): Promise<boolean> {
  const { error } = await supabase.from('technicians').upsert({
    name: tech.name,
    phone: tech.phone,
    specialisation: tech.role,
    status: tech.status,
    lat: tech.lat,
    lng: tech.lng,
  });
  return !error;
}

async function syncUpdateGps(name: string, lat: number, lng: number): Promise<boolean> {
  const { error } = await supabase.from('technicians').update({ lat, lng }).eq('name', name);
  if (error) return false;
  await supabase.from('technician_gps').insert({ technician_name: name, lat, lng });
  return true;
}
