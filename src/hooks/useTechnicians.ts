import { useState, useEffect, useCallback } from 'react';
import { supabase, isConfigured } from '../lib/supabase';
import type { Technician } from '../types';

const SEED_TECHS: Technician[] = [
  { name: 'Sipho Dlamini', role: 'General Security', status: 'active', phone: '+27 82 111 2233', lat: -25.7461, lng: 28.1881 },
  { name: 'Lerato Molefe', role: 'CCTV Specialist', status: 'enroute', phone: '+27 71 432 8891', lat: -26.1076, lng: 28.0567 },
  { name: 'Mpho Sithole', role: 'Access Control', status: 'active', phone: '+27 64 567 4412', lat: -26.0274, lng: 27.8650 },
  { name: 'James Pretorius', role: 'Alarm Systems', status: 'offline', phone: '+27 83 998 1155', lat: -26.1929, lng: 28.0305 },
];

export function useTechnicians() {
  const [technicians, setTechnicians] = useState<Technician[]>(SEED_TECHS);
  const [loading, setLoading] = useState(false);

  const fetchTechnicians = useCallback(async () => {
    if (!isConfigured) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('technicians')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      if (data) {
        setTechnicians(data.map((r: any): Technician => ({
          id: r.id,
          name: r.name,
          role: r.specialisation,
          status: r.status,
          phone: r.phone,
          lat: r.lat ?? -26.2041,
          lng: r.lng ?? 28.0473,
          created_at: r.created_at,
        })));
      }
    } catch (err) {
      console.error('Failed to fetch technicians:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTechnicians(); }, [fetchTechnicians]);

  const addTechnician = useCallback(async (tech: Technician) => {
    if (!isConfigured) {
      setTechnicians(prev => [...prev, tech]);
      return;
    }
    const { error } = await supabase.from('technicians').insert({
      name: tech.name,
      phone: tech.phone,
      specialisation: tech.role,
      status: tech.status,
      lat: tech.lat,
      lng: tech.lng,
    });
    if (error) { console.error(error); return; }
    await fetchTechnicians();
  }, [fetchTechnicians]);

  const updateGps = useCallback(async (name: string, lat: number, lng: number) => {
    setTechnicians(prev =>
      prev.map(t => t.name === name ? { ...t, lat, lng } : t)
    );
    if (!isConfigured) return;
    await supabase.from('technicians').update({ lat, lng }).eq('name', name);
    await supabase.from('technician_gps').insert({ technician_name: name, lat, lng });
  }, []);

  return { technicians, loading, addTechnician, updateGps, refetch: fetchTechnicians };
}
