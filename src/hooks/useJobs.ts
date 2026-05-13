import { useState, useEffect, useCallback } from 'react';
import { supabase, isConfigured } from '../lib/supabase';
import { db, localSaveJob, enqueue } from '../lib/db';
import type { Job, ChecklistItem, GpsLogEntry } from '../types';

/** Remote sync: all jobs (admin), assigned only (technician), or paused until session is known (`null`). */
export type UseJobsOptions = {
  serverAssignee?: string | null;
  /** When true, skip server pull until auth metadata (role / technician name) is applied — avoids empty UI and missed sync on login. */
  syncPaused?: boolean;
};

// ─── Seed data (demo / first-run) — empty, no placeholder jobs ──
const SEED_JOBS: Job[] = [];

// ─── Seed IndexedDB on first run ─────────────────────────────
async function seedIfEmpty() {
  const count = await db.jobs.count();
  if (count === 0) {
    await db.jobs.bulkPut(SEED_JOBS);
  }
}

// ─── Map Supabase row → Job ───────────────────────────────────
function mapRow(r: any): Job {
  // Support both old single technician_name and new technician_names array
  let techs: string[] = [];
  if (Array.isArray(r.technician_names) && r.technician_names.length) {
    techs = r.technician_names;
  } else if (r.technician_name) {
    techs = [r.technician_name];
  }
  const js = r.job_signatures?.[0];
  const sigBlob = js?.signature_data_url as string | undefined;
  const hasSigBlob = Boolean(sigBlob && sigBlob.length > 30);
  return {
    id: r.id,
    title: r.title,
    client: r.client,
    type: r.type,
    priority: r.priority,
    status: r.status,
    techs,
    address: r.address ?? '',
    date: r.date ?? '',
    desc: r.description ?? '',
    notes: r.notes ?? '',
    checklist: (r.job_checklist ?? []).map((c: any): ChecklistItem => ({
      id: c.id, t: c.item_label, done: c.checked,
    })),
    photos: (r.job_photos ?? []).map((p: any) => p.storage_path),
    signature: hasSigBlob ? sigBlob! : null,
    sigName: js?.client_name ?? '',
    signaturePending: Boolean(js?.id && !hasSigBlob),
    gpsLog: (r.job_gps_log ?? []).map((g: any): GpsLogEntry => ({
      id: g.id, time: g.logged_at, loc: `${g.lat.toFixed(4)}, ${g.lng.toFixed(4)}`,
    })),
    created_at: r.created_at,
  };
}

// ─── Hook ─────────────────────────────────────────────────────
export function useJobs(opts?: UseJobsOptions) {
  const serverAssignee = opts?.serverAssignee;
  const syncPaused = Boolean(opts?.syncPaused);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  /** True while we are waiting for the first successful remote list (empty local cache, online). */
  const [awaitingRemote, setAwaitingRemote] = useState(false);

  // Load from IndexedDB immediately (works offline)
  const loadLocal = useCallback(async () => {
    await seedIfEmpty();
    const local = await db.jobs.orderBy('id').reverse().toArray();
    setJobs(local);
    setLoading(false);
    const waitingForSession =
      syncPaused &&
      isConfigured &&
      navigator.onLine &&
      local.length === 0;
    const waitingForRemoteList =
      !syncPaused &&
      isConfigured &&
      navigator.onLine &&
      local.length === 0 &&
      serverAssignee !== null;
    setAwaitingRemote(waitingForSession || waitingForRemoteList);
  }, [serverAssignee, syncPaused]);

  // Pull latest from Supabase in background (when online).
  // Omit job_gps_log from the embedded select — it can be huge; hydrate in JobModal when the GPS tab opens.
  const syncFromServer = useCallback(async () => {
    if (!isConfigured || !navigator.onLine) {
      setAwaitingRemote(false);
      return;
    }
    if (syncPaused) {
      return;
    }
    if (serverAssignee === null) {
      setAwaitingRemote(false);
      return;
    }
    try {
      // Omit signature_data_url from the embedded select — large base64 blobs
      // slow Android/WebView; hydrate in JobModal when needed.
      let q = supabase
        .from('jobs')
        .select('*, job_checklist(*), job_photos(*), job_signatures(id, client_name)')
        .order('created_at', { ascending: false });
      if (serverAssignee) {
        q = q.contains('technician_names', [serverAssignee]);
      }
      const { data, error } = await q;
      if (error || !data) {
        setAwaitingRemote(false);
        return;
      }

      const mapped = data.map(mapRow);
      const prevRows = await db.jobs.bulkGet(mapped.map(m => m.id));
      const prevById = new Map(prevRows.filter(Boolean).map(p => [p!.id, p!]));
      const merged = mapped.map(m => {
        const prev = prevById.get(m.id);
        let out = m;
        if (out.gpsLog.length === 0 && prev?.gpsLog?.length) {
          out = { ...out, gpsLog: prev.gpsLog };
        }
        const serverSig = out.signature && out.signature.length > 30;
        const localSig = prev?.signature && prev.signature.length > 30;
        if (!serverSig && localSig) {
          out = {
            ...out,
            signature: prev!.signature,
            sigName: prev!.sigName || out.sigName,
            signaturePending: false,
          };
        }
        return out;
      });
      await db.jobs.bulkPut(merged);
      setJobs(merged);
    } catch {
      // network error — stay with local data
    }
    setAwaitingRemote(false);
  }, [serverAssignee, syncPaused]);

  const hydrateJobGps = useCallback(async (jobId: string, entries: GpsLogEntry[]) => {
    await db.jobs.update(jobId, { gpsLog: entries });
    setJobs(prev => prev.map(j => (j.id === jobId ? { ...j, gpsLog: entries } : j)));
  }, []);

  const hydrateJobSignature = useCallback(async (jobId: string, signature: string | null, sigName: string) => {
    await db.jobs.update(jobId, { signature, sigName, signaturePending: false });
    setJobs(prev =>
      prev.map(j => (j.id === jobId ? { ...j, signature, sigName, signaturePending: false } : j)),
    );
  }, []);

  useEffect(() => {
    void loadLocal().then(syncFromServer);
  }, [loadLocal, syncFromServer]);

  // ─── Add job ───────────────────────────────────────────────
  const addJob = useCallback(async (job: Job) => {
    // 1. Write to local DB immediately — visible in UI with no delay
    await localSaveJob(job);
    setJobs(prev => [job, ...prev]);

    // 2. Push to Supabase if online, otherwise queue
    if (isConfigured) {
      if (navigator.onLine) {
        try {
          const { error } = await supabase.from('jobs').upsert({
            id: job.id,
            title: job.title,
            client: job.client,
            type: job.type,
            priority: job.priority,
            status: job.status,
            technician_name: job.techs[0] ?? null,
            technician_names: job.techs,
            address: job.address,
            date: job.date,
            description: job.desc,
            notes: job.notes,
          });
          if (error) throw error;

          if (job.checklist.length) {
            await supabase.from('job_checklist').insert(
              job.checklist.map(c => ({ job_id: job.id, item_label: c.t, checked: c.done }))
            );
          }
        } catch {
          // Server failed — queue it
          await enqueue('ADD_JOB', job);
        }
      } else {
        await enqueue('ADD_JOB', job);
      }
    }
  }, []);

  // ─── Update job ────────────────────────────────────────────
  const updateJob = useCallback(async (updated: Job) => {
    // 1. Update local DB immediately
    await localSaveJob(updated);
    setJobs(prev => prev.map(j => j.id === updated.id ? updated : j));

    // 2. Push to Supabase if online, otherwise queue
    if (isConfigured) {
      if (navigator.onLine) {
        try {
          const { error } = await supabase.from('jobs').update({
            status: updated.status,
            notes: updated.notes,
            technician_name: updated.techs[0] ?? null,
            technician_names: updated.techs,
          }).eq('id', updated.id);
          if (error) throw error;

          for (const item of updated.checklist) {
            if (item.id) {
              await supabase.from('job_checklist')
                .update({ checked: item.done }).eq('id', item.id);
            }
          }

          if (updated.signature && updated.sigName) {
            await supabase.from('job_signatures').upsert(
              { job_id: updated.id, client_name: updated.sigName, signature_data_url: updated.signature },
              { onConflict: 'job_id' }
            );
          }
        } catch {
          await enqueue('UPDATE_JOB', updated);
        }
      } else {
        await enqueue('UPDATE_JOB', updated);
      }
    }
  }, []);

  return {
    jobs,
    loading: loading || awaitingRemote,
    addJob,
    updateJob,
    hydrateJobGps,
    hydrateJobSignature,
    refetch: loadLocal,
  };
}
