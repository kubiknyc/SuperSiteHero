/**
 * Supabase Edge Function: gcal-refresh-token
 *
 * Refresh Google Calendar access token before it expires
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import {
  corsHeaders,
  refreshAccessToken,
  calculateTokenExpiry,
} from '../_shared/google-calendar.ts'

interface RefreshTokenRequest {
  connectionId: string
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!clientId || !clientSecret) {
      throw new Error('Google Calendar credentials not configured')
    }

    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request
    const { connectionId }: RefreshTokenRequest = await req.json()

    if (!connectionId) {
      throw new Error('Missing connectionId')
    }

    // Get connection with tokens
    const { data: connection, error: connError } = await supabase
      .from('google_calendar_connections')
      .select('*')
      .eq('id', connectionId)
      .single()

    if (connError || !connection) {
      throw new Error('Connection not found')
    }

    if (!connection.refresh_token) {
      // Update connection to mark re-auth needed
      await supabase
        .from('google_calendar_connections')
        .update({
          connection_error: 'No refresh token available. Please reconnect to Google Calendar.',
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', connectionId)

      throw new Error('No refresh token available. Please reconnect to Google Calendar.')
    }

    console.log(`Refreshing token for connection ${connectionId}`)

    // Refresh the token
    const tokens = await refreshAccessToken(connection.refresh_token, clientId, clientSecret)

    // Calculate new expiry date
    const tokenExpiresAt = calculateTokenExpiry(tokens.expires_in)

    // Update connection with new tokens
    // Note: Google may return a new refresh token, so we should update it if provided
    const updateData: Record<string, unknown> = {
      access_token: tokens.access_token,
      token_expires_at: tokenExpiresAt.toISOString(),
      connection_error: null,
      updated_at: new Date().toISOString(),
    }

    if (tokens.refresh_token) {
      updateData.refresh_token = tokens.refresh_token
    }

    const { error: updateError } = await supabase
      .from('google_calendar_connections')
      .update(updateData)
      .eq('id', connectionId)

    if (updateError) {throw updateError}

    console.log(`Token refreshed successfully for connection ${connectionId}`)

    return new Response(
      JSON.stringify({
        success: true,
        tokenExpiresAt: tokenExpiresAt.toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('gcal-refresh-token error:', error)

    // Check if it's an auth error that requires re-connection
    const isAuthError = error instanceof Error && (
      error.message.includes('invalid_grant') ||
      error.message.includes('Token has been expired or revoked') ||
      error.message.includes('No refresh token')
    )

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        requiresReconnect: isAuthError,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: isAuthError ? 401 : 500,
      }
    )
  }
})
