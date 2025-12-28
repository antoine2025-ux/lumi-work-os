import "server-only"
import { createClient } from '@supabase/supabase-js'

/**
 * Get Supabase admin client (server-only)
 * 
 * Lazy-loads the service role key to avoid build-time errors.
 * Only call this function in server-side code (API routes, server components).
 * 
 * @throws Error if SUPABASE_SERVICE_ROLE_KEY is missing or invalid when called
 */
export function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^["']|["']$/g, '')
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/^["']|["']$/g, '')
  
  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
  }
  
  if (!supabaseServiceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY environment variable. ' +
      'This is only required for admin operations (user invites). ' +
      'Set SUPABASE_ADMIN_ENABLED=false to disable admin features.'
    )
  }
  
  // Validate service role key format (should start with eyJ)
  if (!supabaseServiceRoleKey.startsWith('eyJ')) {
    throw new Error(
      'Invalid SUPABASE_SERVICE_ROLE_KEY format - should be a JWT token starting with eyJ. ' +
      'Get it from Supabase Dashboard → Settings → API → service_role key'
    )
  }
  
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

