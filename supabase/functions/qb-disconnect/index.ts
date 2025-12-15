/**
 * Supabase Edge Function: qb-disconnect
 *
 * Revoke tokens and deactivate QuickBooks connection
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeaders, revokeToken } from '../_shared/quickbooks.ts'

interface DisconnectRequest {
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
    const { connectionId }: DisconnectRequest = await req.json()

    if (!connectionId) {
      throw new Error('Missing connectionId')
    }

    // Get connection
    const { data: connection, error: connError } = await supabase
      .from('qb_connections')
      .select('*')
      .eq('id', connectionId)
      .single()

    if (connError || !connection) {
      throw new Error('Connection not found')
    }

    console.log(`Disconnecting connection ${connectionId}`)

    // Revoke refresh token (this also invalidates access token)
    if (connection.refresh_token) {
      try {
        await revokeToken(connection.refresh_token, clientId, clientSecret)
        console.log('Token revoked successfully')
      } catch (revokeError) {
        // Log but continue - token may already be invalid
        console.warn('Token revocation warning:', revokeError)
      }
    }

    // Deactivate connection (preserve for potential reconnection)
    const { error: updateError } = await supabase
      .from('qb_connections')
      .update({
        is_active: false,
        access_token: null,
        refresh_token: null,
        token_expires_at: null,
        refresh_token_expires_at: null,
        connection_error: 'Disconnected by user',
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId)

    if (updateError) {throw updateError}

    // Clear any pending syncs for this connection
    await supabase
      .from('qb_pending_syncs')
      .delete()
      .eq('connection_id', connectionId)

    console.log(`Connection ${connectionId} disconnected successfully`)

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('qb-disconnect error:', error)

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
