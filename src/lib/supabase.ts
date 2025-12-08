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

/**
 * Untyped Supabase client for tables not yet in generated types.
 * Use this for: insurance_certificates, insurance_requirements, lien_waivers,
 * insurance_compliance_summary, insurance_certificate_history, insurance_expiration_alerts
 *
 * @example
 * const { data } = await supabaseUntyped.from('insurance_certificates').select('*')
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabaseUntyped = supabase as any

// TODO: Add offline sync configuration
// TODO: Add service worker registration for PWA
