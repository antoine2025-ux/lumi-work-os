import { createClient } from '@supabase/supabase-js'

// Remove quotes if present in env vars
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^["']|["']$/g, '')
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/^["']|["']$/g, '')

// Log for debugging (remove sensitive data in production)
if (!supabaseUrl) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseServiceRoleKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
}

// Validate service role key format (should start with eyJ)
if (!supabaseServiceRoleKey.startsWith('eyJ')) {
  console.error('❌ Invalid SUPABASE_SERVICE_ROLE_KEY format - should be a JWT token starting with eyJ')
  throw new Error('Invalid SUPABASE_SERVICE_ROLE_KEY format')
}

console.log('✅ Supabase admin client initializing...')
console.log('✅ Supabase URL:', supabaseUrl)
console.log('✅ Service role key length:', supabaseServiceRoleKey.length)

// Admin client with service role key for server-side operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

console.log('✅ Supabase admin client initialized successfully')

// Client-side Supabase client (if needed)
export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

