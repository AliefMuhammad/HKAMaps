import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Validasi — jika credentials belum diisi, tetap bisa jalan dengan mock data
const isConfigured = supabaseUrl
  && supabaseKey
  && !supabaseUrl.includes('your-supabase-project')
  && !supabaseKey.includes('your-supabase');

if (!isConfigured) {
  console.warn(
    '⚠️  Supabase belum dikonfigurasi. Menggunakan mock data lokal.\n' +
    '   Isi VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY di file .env'
  );
}

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export const isSupabaseConnected = () => !!supabase;
