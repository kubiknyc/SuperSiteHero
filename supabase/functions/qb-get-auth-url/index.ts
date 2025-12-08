/**
 * Supabase Edge Function: qb-get-auth-url
 *
 * Generate QuickBooks OAuth authorization URL with state parameter
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeaders, generateState, QB_URLS } from '../_shared/quickbooks.ts'

interface AuthUrlRequest {
  companyId: string
  isSandbox?: boolean
}

interface AuthUrlResponse {
  authUrl: string
  state: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const clientId = Deno.env.get('QB_CLIENT_ID')
    const redirectUri = Deno.env.get('QB_REDIRECT_URI')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!clientId || !redirectUri) {
      throw new Error('QuickBooks credentials not configured')
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
    const { companyId, isSandbox = false }: AuthUrlRequest = await req.json()

    if (!companyId) {
      throw new Error('Missing companyId')
    }

    // Generate state parameter (includes company ID for validation on callback)
    const stateRandom = generateState()
    const state = `${companyId}:${isSandbox ? '1' : '0'}:${stateRandom}`

    // Store state in database for validation during callback
    const { error: stateError } = await supabase
      .from('qb_oauth_states')
      .insert({
        state: stateRandom,
        company_id: companyId,
        user_id: user.id,
        is_sandbox: isSandbox,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
      })

    // If table doesn't exist, that's ok - we'll validate state from the encoded value
    if (stateError && !stateError.message.includes('does not exist')) {
      console.warn('Could not store OAuth state:', stateError)
    }

    // Build authorization URL
    const authParams = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      scope: QB_URLS.scopes,
      redirect_uri: redirectUri,
      state,
    })

    const authUrl = `${QB_URLS.oauth.authorize}?${authParams.toString()}`

    console.log(`Generated auth URL for company ${companyId}, sandbox: ${isSandbox}`)

    const response: AuthUrlResponse = {
      authUrl,
      state: stateRandom,
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('qb-get-auth-url error:', error)

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
