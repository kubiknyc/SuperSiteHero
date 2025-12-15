/**
 * Supabase Edge Function: gcal-complete-oauth
 *
 * Exchange authorization code for tokens and create/update connection record
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import {
  corsHeaders,
  exchangeCodeForTokens,
  getUserInfo,
  listCalendars,
  calculateTokenExpiry,
} from '../_shared/google-calendar.ts'

interface CompleteOAuthRequest {
  companyId: string
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
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
    const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!clientId || !clientSecret || !redirectUri) {
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
    const { companyId, code, state }: CompleteOAuthRequest = await req.json()

    if (!companyId || !code || !state) {
      throw new Error('Missing required parameters')
    }

    // Validate state parameter
    let stateData: { companyId: string; userId: string; timestamp: number; nonce: string }
    try {
      stateData = JSON.parse(atob(state))
    } catch {
      throw new Error('Invalid state parameter')
    }

    // Validate state matches request
    if (stateData.companyId !== companyId || stateData.userId !== user.id) {
      throw new Error('State parameter mismatch')
    }

    // Check state is not too old (15 minutes max)
    if (Date.now() - stateData.timestamp > 15 * 60 * 1000) {
      throw new Error('OAuth flow expired. Please try again.')
    }

    console.log(`Completing Google Calendar OAuth for user ${user.id} in company ${companyId}`)

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, redirectUri, clientId, clientSecret)

    if (!tokens.refresh_token) {
      throw new Error('No refresh token received. Please revoke app access in Google settings and try again.')
    }

    // Get user info from Google
    const googleUserInfo = await getUserInfo(tokens.access_token)

    // Get available calendars
    const calendars = await listCalendars(tokens.access_token)
    const primaryCalendar = calendars.find((c) => c.primary) || calendars[0]

    // Calculate token expiration
    const tokenExpiresAt = calculateTokenExpiry(tokens.expires_in)

    // Check for existing connection for this Google account
    const { data: existing } = await supabase
      .from('google_calendar_connections')
      .select('id')
      .eq('company_id', companyId)
      .eq('user_id', user.id)
      .eq('google_account_email', googleUserInfo.email)
      .maybeSingle()

    let connection

    if (existing) {
      // Update existing connection
      const { data, error } = await supabase
        .from('google_calendar_connections')
        .update({
          google_account_name: googleUserInfo.name || null,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: tokenExpiresAt.toISOString(),
          calendar_id: primaryCalendar?.id || 'primary',
          calendar_name: primaryCalendar?.summary || null,
          calendar_timezone: primaryCalendar?.timeZone || null,
          is_active: true,
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
        .from('google_calendar_connections')
        .insert({
          company_id: companyId,
          user_id: user.id,
          google_account_email: googleUserInfo.email,
          google_account_name: googleUserInfo.name || null,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: tokenExpiresAt.toISOString(),
          calendar_id: primaryCalendar?.id || 'primary',
          calendar_name: primaryCalendar?.summary || null,
          calendar_timezone: primaryCalendar?.timeZone || null,
          is_active: true,
        })
        .select()
        .single()

      if (error) throw error
      connection = data
    }

    console.log(`Google Calendar OAuth completed successfully for connection ${connection.id}`)

    // Return connection without sensitive tokens
    const safeConnection = {
      ...connection,
      access_token: null,
      refresh_token: null,
    }

    // Also return available calendars for selection
    const safeCalendars = calendars.map((c) => ({
      id: c.id,
      name: c.summary,
      description: c.description,
      timeZone: c.timeZone,
      primary: c.primary,
      accessRole: c.accessRole,
    }))

    return new Response(
      JSON.stringify({
        connection: safeConnection,
        calendars: safeCalendars,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('gcal-complete-oauth error:', error)

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
