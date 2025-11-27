// File: /src/lib/supabase.ts
// Supabase client configuration and initialization

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database-extensions'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Create typed Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// TODO: Add offline sync configuration
// TODO: Add service worker registration for PWA
