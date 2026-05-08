import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  // Admin Supabase client (service role — server only)
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Verify caller is a logged-in admin
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  const { data: { user: caller }, error: authErr } = await adminClient.auth.getUser(token);
  if (authErr || !caller) {
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

  // Parse request body
  const { name, email, password, role, specialisation, phone } = await req.json();

  if (!name || !email || !password || !role) {
    return new Response(JSON.stringify({ error: 'name, email, password and role are required' }), { status: 400, headers: CORS });
  }

  // Create the Supabase Auth user
  const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,   // skip confirmation email — admin is setting it up
    user_metadata: { role, technician_name: role === 'technician' ? name : null },
  });

  if (createErr || !created.user) {
    return new Response(JSON.stringify({ error: createErr?.message ?? 'Failed to create user' }), { status: 400, headers: CORS });
  }

  // Insert user_profile row
  await adminClient.from('user_profiles').insert({
    user_id: created.user.id,
    role,
    technician_name: role === 'technician' ? name : null,
  });

  // If technician, upsert the technician record
  if (role === 'technician') {
    await adminClient.from('technicians').upsert({
      name,
      phone: phone ?? '',
      specialisation: specialisation ?? 'General Security',
      status: 'active',
      lat: -26.2041,
      lng: 28.0473,
    }, { onConflict: 'name' });
  }

  return new Response(
    JSON.stringify({ success: true, userId: created.user.id }),
    { headers: { ...CORS, 'Content-Type': 'application/json' } }
  );
});
