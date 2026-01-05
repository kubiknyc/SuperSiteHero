/**
 * Supabase Edge Function: docusign-token-exchange
 *
 * Securely exchange DocuSign authorization codes for tokens.
 * Keeps client_secret on server-side only.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TokenExchangeRequest {
  code: string
  redirect_uri: string
  is_demo: boolean
}

interface RefreshTokenRequest {
  connection_id: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const clientId = Deno.env.get('DOCUSIGN_CLIENT_ID')
    const clientSecret = Deno.env.get('DOCUSIGN_CLIENT_SECRET')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!clientId || !clientSecret) {
      throw new Error('DocuSign credentials not configured')
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

    // Parse URL to determine action
    const url = new URL(req.url)
    const action = url.pathname.split('/').pop()

    if (action === 'exchange') {
      // Exchange authorization code for tokens
      const { code, redirect_uri, is_demo }: TokenExchangeRequest = await req.json()

      if (!code || !redirect_uri) {
        throw new Error('Missing required parameters')
      }

      const tokenUrl = is_demo
        ? 'https://account-d.docusign.com/oauth/token'
        : 'https://account.docusign.com/oauth/token'

      const basicAuth = btoa(`${clientId}:${clientSecret}`)

      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${basicAuth}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri,
        }),
      })

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text()
        console.error('DocuSign token exchange failed:', errorText)
        throw new Error(`Token exchange failed: ${tokenResponse.status}`)
      }

      const tokens = await tokenResponse.json()

      // Get user info
      const userInfoUrl = is_demo
        ? 'https://account-d.docusign.com/oauth/userinfo'
        : 'https://account.docusign.com/oauth/userinfo'

      const userInfoResponse = await fetch(userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
        },
      })

      if (!userInfoResponse.ok) {
        throw new Error('Failed to get DocuSign user info')
      }

      const userInfo = await userInfoResponse.json()

      return new Response(JSON.stringify({
        tokens: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_in: tokens.expires_in,
        },
        user_info: userInfo,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })

    } else if (action === 'refresh') {
      // Refresh an existing token
      const { connection_id }: RefreshTokenRequest = await req.json()

      if (!connection_id) {
        throw new Error('Missing connection_id')
      }

      // Get existing connection
      const { data: connection, error: connError } = await supabase
        .from('docusign_connections')
        .select('*')
        .eq('id', connection_id)
        .single()

      if (connError || !connection) {
        throw new Error('Connection not found')
      }

      if (!connection.refresh_token) {
        throw new Error('No refresh token available')
      }

      const tokenUrl = connection.is_demo
        ? 'https://account-d.docusign.com/oauth/token'
        : 'https://account.docusign.com/oauth/token'

      const basicAuth = btoa(`${clientId}:${clientSecret}`)

      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${basicAuth}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: connection.refresh_token,
        }),
      })

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text()
        console.error('DocuSign token refresh failed:', errorText)

        // Update connection with error
        await supabase
          .from('docusign_connections')
          .update({ connection_error: errorText })
          .eq('id', connection_id)

        throw new Error(`Token refresh failed: ${tokenResponse.status}`)
      }

      const tokens = await tokenResponse.json()

      // Update connection with new tokens
      const { error: updateError } = await supabase
        .from('docusign_connections')
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          connection_error: null,
        })
        .eq('id', connection_id)

      if (updateError) {
        throw new Error(`Failed to update connection: ${updateError.message}`)
      }

      return new Response(JSON.stringify({
        success: true,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    throw new Error('Invalid action')

  } catch (error) {
    console.error('docusign-token-exchange error:', error)

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
