import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Verify caller is a logged-in admin
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  const { data: { user: caller } } = await adminClient.auth.getUser(token);
  if (!caller) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS });
  }

  const { data: callerProfile } = await adminClient
    .from('user_profiles')
    .select('role')
    .eq('user_id', caller.id)
    .single();

  if (callerProfile?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden — admins only' }), { status: 403, headers: CORS });
  }

  const { userId, technicianName } = await req.json();

  if (!userId && !technicianName) {
    return new Response(JSON.stringify({ error: 'userId or technicianName required' }), { status: 400, headers: CORS });
  }

  // Prevent self-deletion
  if (userId && userId === caller.id) {
    return new Response(JSON.stringify({ error: 'You cannot delete your own account' }), { status: 400, headers: CORS });
  }

  // Delete from auth.users (cascades to user_profiles via FK)
  if (userId) {
    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: CORS });
    }
  }

  // Delete technician record and their GPS history if applicable
  if (technicianName) {
    await adminClient.from('technician_gps').delete().eq('technician_name', technicianName);
    // Null out technician_name on jobs so jobs are preserved
    await adminClient.from('jobs')
      .update({ technician_name: null })
      .eq('technician_name', technicianName);
    await adminClient.from('technicians').delete().eq('name', technicianName);
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...CORS, 'Content-Type': 'application/json' } }
  );
});
