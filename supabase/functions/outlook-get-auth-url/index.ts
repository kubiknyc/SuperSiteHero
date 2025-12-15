/**
 * Supabase Edge Function: outlook-get-auth-url
 *
 * Generate Microsoft OAuth authorization URL for Outlook Calendar integration
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeaders, generateState, MS_GRAPH_URLS } from '../_shared/microsoft-graph.ts'

interface AuthUrlRequest {
  companyId: string
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
    const clientId = Deno.env.get('MS_GRAPH_CLIENT_ID')
    const redirectUri = Deno.env.get('MS_GRAPH_REDIRECT_URI')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!clientId || !redirectUri) {
      throw new Error('Microsoft Graph credentials not configured')
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
    const { companyId }: AuthUrlRequest = await req.json()

    if (!companyId) {
      throw new Error('Missing companyId')
    }

    // Generate state parameter
    const stateRandom = generateState()
    const state = `${user.id}:${companyId}:${stateRandom}`

    // Store state in database for validation during callback
    const { error: stateError } = await supabase
      .from('outlook_oauth_states')
      .insert({
        state: stateRandom,
        user_id: user.id,
        company_id: companyId,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
      })

    if (stateError) {
      console.warn('Could not store OAuth state:', stateError)
    }

    // Build authorization URL
    const authParams = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      response_mode: 'query',
      scope: MS_GRAPH_URLS.scopes,
      state,
      prompt: 'consent', // Force consent to ensure we get refresh token
    })

    const authUrl = `${MS_GRAPH_URLS.oauth.authorize}?${authParams.toString()}`

    console.log(`Generated Outlook auth URL for user ${user.id}, company ${companyId}`)

    const response: AuthUrlResponse = {
      authUrl,
      state: stateRandom,
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('outlook-get-auth-url error:', error)

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
