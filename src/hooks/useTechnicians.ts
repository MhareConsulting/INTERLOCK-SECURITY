import { useState, useEffect, useCallback } from 'react';
import { supabase, isConfigured } from '../lib/supabase';
import { db, localSaveTech, enqueue } from '../lib/db';
import type { Technician } from '../types';

const SEED_TECHS: Technician[] = [
  { name: 'Sipho Dlamini',   role: 'General Security', status: 'active',  phone: '+27 82 111 2233', lat: -25.7461, lng: 28.1881 },
  { name: 'Lerato Molefe',   role: 'CCTV Specialist',  status: 'enroute', phone: '+27 71 432 8891', lat: -26.1076, lng: 28.0567 },
  { name: 'Mpho Sithole',    role: 'Access Control',   status: 'active',  phone: '+27 64 567 4412', lat: -26.0274, lng: 27.8650 },
  { name: 'James Pretorius', role: 'Alarm Systems',    status: 'offline', phone: '+27 83 998 1155', lat: -26.1929, lng: 28.0305 },
];

async function seedIfEmpty() {
  const count = await db.technicians.count();
  if (count === 0) await db.technicians.bulkPut(SEED_TECHS);
}

export function useTechnicians() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLocal = useCallback(async () => {
    await seedIfEmpty();
    const local = await db.technicians.toArray();
    setTechnicians(local);
    setLoading(false);
  }, []);

  const syncFromServer = useCallback(async () => {
    if (!isConfigured || !navigator.onLine) return;
    try {
      const { data, error } = await supabase
        .from('technicians')
        .select('*')
        .order('created_at', { ascending: true });
      if (error || !data) return;

      const mapped: Technician[] = data.map((r: any) => ({
        id: r.id,
        name: r.name,
        role: r.specialisation,
        status: r.status,
        phone: r.phone,
        lat: r.lat ?? -26.2041,
        lng: r.lng ?? 28.0473,
        created_at: r.created_at,
      }));
      await db.technicians.bulkPut(mapped);
      setTechnicians(mapped);
    } catch {
      // stay with local
    }
  }, []);

  useEffect(() => {
    loadLocal().then(syncFromServer);
  }, [loadLocal, syncFromServer]);

  const addTechnician = useCallback(async (tech: Technician) => {
    await localSaveTech(tech);
    setTechnicians(prev => [...prev, tech]);

    if (isConfigured) {
      if (navigator.onLine) {
        try {
          const { error } = await supabase.from('technicians').upsert({
            name: tech.name,
            phone: tech.phone,
            specialisation: tech.role,
            status: tech.status,
            lat: tech.lat,
            lng: tech.lng,
          });
          if (error) throw error;
        } catch {
          await enqueue('ADD_TECHNICIAN', tech);
        }
      } else {
        await enqueue('ADD_TECHNICIAN', tech);
      }
    }
  }, []);

  const updateGps = useCallback(async (name: string, lat: number, lng: number) => {
    const updated = { name, lat, lng };
    await db.technicians.where('name').equals(name).modify({ lat, lng });
    setTechnicians(prev => prev.map(t => t.name === name ? { ...t, lat, lng } : t));

    if (isConfigured) {
      if (navigator.onLine) {
        try {
          await supabase.from('technicians').update({ lat, lng }).eq('name', name);
          await supabase.from('technician_gps').insert({ technician_name: name, lat, lng });
        } catch {
          await enqueue('UPDATE_GPS', updated);
        }
      } else {
        await enqueue('UPDATE_GPS', updated);
      }
    }
  }, []);

  return { technicians, loading, addTechnician, updateGps, refetch: loadLocal };
}
