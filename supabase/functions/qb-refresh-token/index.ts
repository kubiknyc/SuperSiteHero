/**
 * Supabase Edge Function: qb-refresh-token
 *
 * Refresh QuickBooks access token before it expires
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import {
  corsHeaders,
  refreshAccessToken,
  calculateTokenExpiry,
  calculateRefreshTokenExpiry,
} from '../_shared/quickbooks.ts'

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
    const clientId = Deno.env.get('QB_CLIENT_ID')
    const clientSecret = Deno.env.get('QB_CLIENT_SECRET')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!clientId || !clientSecret) {
      throw new Error('QuickBooks credentials not configured')
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
      .from('qb_connections')
      .select('*')
      .eq('id', connectionId)
      .single()

    if (connError || !connection) {
      throw new Error('Connection not found')
    }

    if (!connection.refresh_token) {
      throw new Error('No refresh token available')
    }

    // Check if refresh token is expired
    if (connection.refresh_token_expires_at) {
      const refreshExpiresAt = new Date(connection.refresh_token_expires_at)
      if (refreshExpiresAt < new Date()) {
        // Update connection to mark re-auth needed
        await supabase
          .from('qb_connections')
          .update({
            connection_error: 'Refresh token expired. Please reconnect to QuickBooks.',
            updated_at: new Date().toISOString(),
          })
          .eq('id', connectionId)

        throw new Error('Refresh token expired. Please reconnect to QuickBooks.')
      }
    }

    console.log(`Refreshing token for connection ${connectionId}`)

    // Refresh the token
    const tokens = await refreshAccessToken(connection.refresh_token, clientId, clientSecret)

    // Calculate expiry dates
    const tokenExpiresAt = calculateTokenExpiry(tokens.expires_in)
    const refreshTokenExpiresAt = calculateRefreshTokenExpiry(tokens.x_refresh_token_expires_in)

    // Update connection
    const { error: updateError } = await supabase
      .from('qb_connections')
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: tokenExpiresAt.toISOString(),
        refresh_token_expires_at: refreshTokenExpiresAt.toISOString(),
        connection_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId)

    if (updateError) throw updateError

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
    console.error('qb-refresh-token error:', error)

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
