/**
 * Supabase Edge Function: gcal-get-auth-url
 *
 * Generate Google Calendar OAuth authorization URL
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeaders, generateAuthUrl } from '../_shared/google-calendar.ts'

interface GetAuthUrlRequest {
  companyId: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!clientId || !redirectUri) {
      throw new Error('Google Calendar credentials not configured')
    }

    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Get user from JWT
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      throw new Error('Invalid authentication')
    }

    // Parse request
    const { companyId }: GetAuthUrlRequest = await req.json()

    if (!companyId) {
      throw new Error('Missing companyId')
    }

    // Verify user belongs to company
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile || userProfile.company_id !== companyId) {
      throw new Error('User does not belong to the specified company')
    }

    // Generate state parameter (includes company ID and user ID for validation)
    const stateData = {
      companyId,
      userId: user.id,
      timestamp: Date.now(),
      nonce: crypto.randomUUID(),
    }
    const state = btoa(JSON.stringify(stateData))

    // Generate authorization URL
    const authUrl = generateAuthUrl(clientId, redirectUri, state, 'offline')

    console.log(`Generated Google Calendar auth URL for user ${user.id} in company ${companyId}`)

    return new Response(
      JSON.stringify({ authUrl }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('gcal-get-auth-url error:', error)

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error instanceof Error && error.message.includes('Missing') ? 400 : 500,
      }
    )
  }
})
