import { createClient } from '@supabase/supabase-js';

// Estas dos variables se configuran en Vercel (y en un archivo .env.local
// para probar en tu computadora). Nunca lleves aquí la "service role key",
// solo la "anon public key": esa es segura para usarse en el navegador.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
