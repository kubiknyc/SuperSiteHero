/**
 * Supabase Edge Function: outlook-refresh-token
 *
 * Refresh Microsoft Graph access token before it expires
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import {
  corsHeaders,
  refreshAccessToken,
  calculateTokenExpiry,
} from '../_shared/microsoft-graph.ts'

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
    const clientId = Deno.env.get('MS_GRAPH_CLIENT_ID')
    const clientSecret = Deno.env.get('MS_GRAPH_CLIENT_SECRET')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!clientId || !clientSecret) {
      throw new Error('Microsoft Graph credentials not configured')
    }

    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      throw new Error('Invalid authentication')
    }

    // Parse request
    const { connectionId }: RefreshTokenRequest = await req.json()

    if (!connectionId) {
      throw new Error('Missing connectionId')
    }

    // Get connection with tokens
    const { data: connection, error: connError } = await supabase
      .from('outlook_calendar_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', user.id) // Ensure user owns this connection
      .single()

    if (connError || !connection) {
      throw new Error('Connection not found')
    }

    if (!connection.refresh_token) {
      throw new Error('No refresh token available - please reconnect to Outlook')
    }

    console.log(`Refreshing Outlook token for connection ${connectionId}`)

    // Refresh the token
    const tokens = await refreshAccessToken(connection.refresh_token, clientId, clientSecret)

    // Calculate expiry date
    const tokenExpiresAt = calculateTokenExpiry(tokens.expires_in)

    // Update connection
    const { error: updateError } = await supabase
      .from('outlook_calendar_connections')
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token, // Microsoft may issue a new refresh token
        token_expires_at: tokenExpiresAt.toISOString(),
        connection_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId)

    if (updateError) throw updateError

    console.log(`Outlook token refreshed successfully for connection ${connectionId}`)

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
    console.error('outlook-refresh-token error:', error)

    // Check if this is a refresh token expiration error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const isRefreshExpired = errorMessage.includes('invalid_grant') ||
                            errorMessage.includes('refresh token') ||
                            errorMessage.includes('expired')

    return new Response(
      JSON.stringify({
        error: isRefreshExpired
          ? 'Session expired. Please reconnect to Outlook Calendar.'
          : errorMessage,
        needsReauth: isRefreshExpired,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: isRefreshExpired ? 401 : 500,
      }
    )
  }
})
