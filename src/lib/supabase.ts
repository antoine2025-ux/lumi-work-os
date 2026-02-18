import { createClient } from '@supabase/supabase-js'

// Client-side Supabase client (public anon key)
export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

// Admin client is now in src/lib/supabase/admin.ts (server-only)
// Import getSupabaseAdmin() from '@/lib/supabase/admin' in API routes

