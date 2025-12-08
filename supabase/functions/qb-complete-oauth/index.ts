/**
 * Supabase Edge Function: qb-complete-oauth
 *
 * Exchange authorization code for tokens and create connection record
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import {
  corsHeaders,
  exchangeCodeForTokens,
  getCompanyInfo,
  calculateTokenExpiry,
  calculateRefreshTokenExpiry,
} from '../_shared/quickbooks.ts'

interface CompleteOAuthRequest {
  companyId: string
  code: string
  realm_id: string
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
    const clientSecret = Deno.env.get('QB_CLIENT_SECRET')
    const redirectUri = Deno.env.get('QB_REDIRECT_URI')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!clientId || !clientSecret || !redirectUri) {
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
    const { companyId, code, realm_id, state }: CompleteOAuthRequest = await req.json()

    if (!companyId || !code || !realm_id || !state) {
      throw new Error('Missing required parameters')
    }

    // Parse state to get sandbox flag
    const stateParts = state.split(':')
    const stateCompanyId = stateParts[0]
    const isSandbox = stateParts[1] === '1'

    // Validate state matches company
    if (stateCompanyId !== companyId) {
      throw new Error('Invalid state parameter')
    }

    console.log(`Completing OAuth for company ${companyId}, realm ${realm_id}, sandbox: ${isSandbox}`)

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, redirectUri, clientId, clientSecret)

    // Get company info from QuickBooks
    let qbCompanyName = null
    try {
      const companyInfo = await getCompanyInfo(realm_id, tokens.access_token, isSandbox)
      qbCompanyName = companyInfo.CompanyName
    } catch (infoError) {
      console.warn('Could not fetch company info:', infoError)
    }

    // Calculate expiry dates
    const tokenExpiresAt = calculateTokenExpiry(tokens.expires_in)
    const refreshTokenExpiresAt = calculateRefreshTokenExpiry(tokens.x_refresh_token_expires_in)

    // Check for existing connection
    const { data: existing } = await supabase
      .from('qb_connections')
      .select('id')
      .eq('company_id', companyId)
      .eq('realm_id', realm_id)
      .maybeSingle()

    let connection

    if (existing) {
      // Update existing connection
      const { data, error } = await supabase
        .from('qb_connections')
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: tokenExpiresAt.toISOString(),
          refresh_token_expires_at: refreshTokenExpiresAt.toISOString(),
          company_name: qbCompanyName,
          is_sandbox: isSandbox,
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
        .from('qb_connections')
        .insert({
          company_id: companyId,
          realm_id: realm_id,
          company_name: qbCompanyName,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: tokenExpiresAt.toISOString(),
          refresh_token_expires_at: refreshTokenExpiresAt.toISOString(),
          is_sandbox: isSandbox,
          is_active: true,
          last_connected_at: new Date().toISOString(),
          created_by: user.id,
        })
        .select()
        .single()

      if (error) throw error
      connection = data
    }

    console.log(`OAuth completed successfully for connection ${connection.id}`)

    // Return connection without sensitive tokens
    const safeConnection = {
      ...connection,
      access_token: null,
      refresh_token: null,
    }

    return new Response(JSON.stringify({ connection: safeConnection }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('qb-complete-oauth error:', error)

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
