/**
 * Supabase Edge Function: outlook-complete-oauth
 *
 * Exchange authorization code for tokens and create Outlook calendar connection
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import {
  corsHeaders,
  exchangeCodeForTokens,
  getUserProfile,
  calculateTokenExpiry,
  getCalendars,
} from '../_shared/microsoft-graph.ts'

interface CompleteOAuthRequest {
  code: string
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
    const clientSecret = Deno.env.get('MS_GRAPH_CLIENT_SECRET')
    const redirectUri = Deno.env.get('MS_GRAPH_REDIRECT_URI')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!clientId || !clientSecret || !redirectUri) {
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
    const { code, state }: CompleteOAuthRequest = await req.json()

    if (!code || !state) {
      throw new Error('Missing required parameters')
    }

    // Parse state to get user ID and company ID
    const stateParts = state.split(':')
    if (stateParts.length < 3) {
      throw new Error('Invalid state parameter format')
    }

    const stateUserId = stateParts[0]
    const stateCompanyId = stateParts[1]

    // Validate state matches authenticated user
    if (stateUserId !== user.id) {
      throw new Error('State user mismatch - invalid OAuth flow')
    }

    console.log(`Completing Outlook OAuth for user ${user.id}, company ${stateCompanyId}`)

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, redirectUri, clientId, clientSecret)

    // Get user profile from Microsoft Graph
    let msUserProfile
    try {
      msUserProfile = await getUserProfile(tokens.access_token)
    } catch (profileError) {
      console.warn('Could not fetch Microsoft user profile:', profileError)
    }

    // Get user's calendars
    let calendars
    let primaryCalendar = null
    try {
      calendars = await getCalendars(tokens.access_token)
      primaryCalendar = calendars.find(c => c.isDefaultCalendar) || calendars[0]
    } catch (calError) {
      console.warn('Could not fetch calendars:', calError)
    }

    // Calculate expiry date
    const tokenExpiresAt = calculateTokenExpiry(tokens.expires_in)

    // Check for existing connection
    const { data: existing } = await supabase
      .from('outlook_calendar_connections')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    let connection

    if (existing) {
      // Update existing connection
      const { data, error } = await supabase
        .from('outlook_calendar_connections')
        .update({
          microsoft_user_id: msUserProfile?.id || null,
          email: msUserProfile?.mail || msUserProfile?.userPrincipalName || null,
          display_name: msUserProfile?.displayName || null,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: tokenExpiresAt.toISOString(),
          calendar_id: primaryCalendar?.id || 'primary',
          calendar_name: primaryCalendar?.name || 'Calendar',
          is_active: true,
          last_connected_at: new Date().toISOString(),
          connection_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      connection = data
    } else {
      // Create new connection
      const { data, error } = await supabase
        .from('outlook_calendar_connections')
        .insert({
          user_id: user.id,
          company_id: stateCompanyId,
          microsoft_user_id: msUserProfile?.id || null,
          email: msUserProfile?.mail || msUserProfile?.userPrincipalName || null,
          display_name: msUserProfile?.displayName || null,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: tokenExpiresAt.toISOString(),
          calendar_id: primaryCalendar?.id || 'primary',
          calendar_name: primaryCalendar?.name || 'Calendar',
          is_active: true,
          last_connected_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      connection = data
    }

    // Clean up the OAuth state
    await supabase
      .from('outlook_oauth_states')
      .delete()
      .eq('user_id', user.id)

    console.log(`Outlook OAuth completed successfully for connection ${connection.id}`)

    // Return connection without sensitive tokens
    const safeConnection = {
      ...connection,
      access_token: null,
      refresh_token: null,
    }

    return new Response(JSON.stringify({
      connection: safeConnection,
      calendars: calendars || [],
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('outlook-complete-oauth error:', error)

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
