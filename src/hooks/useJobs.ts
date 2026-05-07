import { useState, useEffect, useCallback } from 'react';
import { supabase, isConfigured } from '../lib/supabase';
import type { Job, ChecklistItem, GpsLogEntry } from '../types';

// Seed data shown when Supabase is not configured
const SEED_JOBS: Job[] = [
  {
    id: 'JC-0001', title: 'Gate Motor Installation', client: 'Thabo Nkosi',
    type: 'Installation', priority: 'high', status: 'in progress',
    tech: 'Sipho Dlamini', address: '14 Baobab St, Midrand', date: '2026-04-04',
    desc: 'Install CENTURION D5 Evo motor on sliding gate.', notes: '',
    checklist: [
      { t: 'Survey site', done: true }, { t: 'Mount motor bracket', done: true },
      { t: 'Wire motor', done: false }, { t: 'Program remotes', done: false },
      { t: 'Test & handover', done: false },
    ],
    photos: [], signature: null, sigName: '',
    gpsLog: [
      { time: '08:14', loc: 'Pretoria, GP' },
      { time: '09:02', loc: 'Midrand, GP — En route to site' },
      { time: '09:45', loc: '14 Baobab St, Midrand — On site' },
    ],
  },
  {
    id: 'JC-0002', title: 'CCTV Camera Upgrade', client: 'Sandton Mall',
    type: 'CCTV', priority: 'urgent', status: 'new',
    tech: 'Lerato Molefe', address: '83 Rivonia Rd, Sandton', date: '2026-04-04',
    desc: 'Replace 12x dome cameras with 4K Hikvision units.', notes: '',
    checklist: [
      { t: 'Remove old cameras', done: false }, { t: 'Run new cabling', done: false },
      { t: 'Install 4K cameras', done: false }, { t: 'Configure NVR', done: false },
      { t: 'Test remote view', done: false },
    ],
    photos: [], signature: null, sigName: '',
    gpsLog: [
      { time: '07:50', loc: 'Soweto, GP' },
      { time: '09:15', loc: 'Sandton, GP — Arrived at site' },
    ],
  },
  {
    id: 'JC-0003', title: 'Alarm Panel Repair', client: 'Mrs van der Merwe',
    type: 'Repair', priority: 'normal', status: 'completed',
    tech: 'Mpho Sithole', address: '7 Fynbos Cres, Randburg', date: '2026-04-03',
    desc: 'Faulty zone on alarm panel.', notes: 'Replaced tampered zone PCB. All zones clear.',
    checklist: [
      { t: 'Diagnose fault', done: true }, { t: 'Replace board', done: true },
      { t: 'Test all zones', done: true }, { t: 'Client sign-off', done: true },
    ],
    photos: [], signature: 'data:image/png;base64,iVBORw0KGgo=', sigName: 'Helen van der Merwe',
    gpsLog: [
      { time: '10:00', loc: 'Randburg, GP — Arrived' },
      { time: '11:30', loc: 'Job complete' },
    ],
  },
  {
    id: 'JC-0004', title: 'Electric Fence Maintenance', client: 'Sunninghill Estate',
    type: 'Electric Fence', priority: 'normal', status: 'pending',
    tech: 'Sipho Dlamini', address: 'Sunninghill HOA, JHB', date: '2026-04-05',
    desc: 'Monthly maintenance and energiser check.', notes: '',
    checklist: [
      { t: 'Inspect fence wires', done: false }, { t: 'Test energiser', done: false },
      { t: 'Clear vegetation', done: false }, { t: 'Check earth stakes', done: false },
      { t: 'Service report', done: false },
    ],
    photos: [], signature: null, sigName: '', gpsLog: [],
  },
  {
    id: 'JC-0005', title: 'Access Control System', client: 'Growthpoint Offices',
    type: 'Access Control', priority: 'high', status: 'in progress',
    tech: 'Lerato Molefe', address: '1 Discovery Place, Sandton', date: '2026-04-04',
    desc: 'Install HID card readers at 4 entry points.',
    notes: 'Floors 1-3 complete. Floor 4 reader awaiting delivery.',
    checklist: [
      { t: 'Install floor 1', done: true }, { t: 'Install floor 2', done: true },
      { t: 'Install floor 3', done: true }, { t: 'Install floor 4', done: false },
      { t: 'Configure access', done: false }, { t: 'Train admin', done: false },
    ],
    photos: [], signature: null, sigName: '',
    gpsLog: [{ time: '08:30', loc: 'Sandton, GP — On site' }],
  },
  {
    id: 'JC-0006', title: 'Panic Button Response', client: 'Mariana Costa',
    type: 'Alarm Response', priority: 'urgent', status: 'completed',
    tech: 'James Pretorius', address: '9 Hawthorne Rd, Rosebank', date: '2026-04-04',
    desc: 'Client activated panic. Respond and assess.',
    notes: 'False alarm. Remote accidentally triggered.',
    checklist: [
      { t: 'Respond to site', done: true },
      { t: 'Assess threat', done: true },
      { t: 'Report to control', done: true },
    ],
    photos: [], signature: 'data:image/png;base64,iVBORw0KGgo=', sigName: 'Mariana Costa',
    gpsLog: [
      { time: '10:45', loc: 'Rosebank, GP — Arrived' },
      { time: '11:10', loc: 'Job closed' },
    ],
  },
];

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>(SEED_JOBS);
  const [loading, setLoading] = useState(false);

  const fetchJobs = useCallback(async () => {
    if (!isConfigured) return;
    setLoading(true);
    try {
      const { data: jobRows, error } = await supabase
        .from('jobs')
        .select('*, job_checklist(*), job_gps_log(*), job_photos(*), job_signatures(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!jobRows) return;

      const mapped: Job[] = jobRows.map((r: any) => ({
        id: r.id,
        title: r.title,
        client: r.client,
        type: r.type,
        priority: r.priority,
        status: r.status,
        tech: r.technician_name,
        address: r.address,
        date: r.date,
        desc: r.description ?? '',
        notes: r.notes ?? '',
        checklist: (r.job_checklist ?? []).map((c: any): ChecklistItem => ({
          id: c.id, t: c.item_label, done: c.checked,
        })),
        photos: (r.job_photos ?? []).map((p: any) => p.storage_path),
        signature: r.job_signatures?.[0]?.signature_data_url ?? null,
        sigName: r.job_signatures?.[0]?.client_name ?? '',
        gpsLog: (r.job_gps_log ?? []).map((g: any): GpsLogEntry => ({
          id: g.id, time: g.logged_at, loc: `${g.lat.toFixed(4)}, ${g.lng.toFixed(4)}`,
        })),
        created_at: r.created_at,
      }));

      setJobs(mapped);
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const addJob = useCallback(async (job: Job) => {
    if (!isConfigured) {
      setJobs(prev => [job, ...prev]);
      return;
    }
    const { error } = await supabase.from('jobs').insert({
      id: job.id,
      title: job.title,
      client: job.client,
      type: job.type,
      priority: job.priority,
      status: job.status,
      technician_name: job.tech,
      address: job.address,
      date: job.date,
      description: job.desc,
      notes: job.notes,
    });
    if (error) { console.error(error); return; }

    if (job.checklist.length) {
      await supabase.from('job_checklist').insert(
        job.checklist.map(c => ({ job_id: job.id, item_label: c.t, checked: c.done }))
      );
    }
    await fetchJobs();
  }, [fetchJobs]);

  const updateJob = useCallback(async (updated: Job) => {
    setJobs(prev => prev.map(j => j.id === updated.id ? updated : j));

    if (!isConfigured) return;

    await supabase.from('jobs').update({
      status: updated.status,
      notes: updated.notes,
      technician_name: updated.tech,
    }).eq('id', updated.id);

    // Upsert checklist items
    for (const item of updated.checklist) {
      if (item.id) {
        await supabase.from('job_checklist').update({ checked: item.done }).eq('id', item.id);
      }
    }

    // Upsert signature
    if (updated.signature && updated.sigName) {
      await supabase.from('job_signatures').upsert({
        job_id: updated.id,
        client_name: updated.sigName,
        signature_data_url: updated.signature,
      }, { onConflict: 'job_id' });
    }
  }, []);

  return { jobs, loading, addJob, updateJob, refetch: fetchJobs };
}
