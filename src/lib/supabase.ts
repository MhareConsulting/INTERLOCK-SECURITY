import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase env vars not set. Running in demo mode with local data.\n' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );
}

// Capacitor WebView: URL-based session detection breaks Auth init / requests for many apps.
const clientOptions = Capacitor.isNativePlatform()
  ? { auth: { detectSessionInUrl: false } }
  : {};

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  clientOptions,
);

export const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);
