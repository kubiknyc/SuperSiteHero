/**
 * Supabase Edge Function: email-complete-oauth
 *
 * Completes OAuth flow for email account connection:
 * - Exchanges authorization code for tokens
 * - Creates email account record
 * - Supports Gmail and Outlook
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OAuthRequest {
  provider: 'gmail' | 'outlook'
  code: string
  redirect_uri?: string
}

interface GoogleTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  id_token?: string
}

interface GoogleUserInfo {
  email: string
  name?: string
  picture?: string
}

interface MicrosoftTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}

interface MicrosoftUserInfo {
  mail: string
  displayName?: string
  userPrincipalName: string
}

// Exchange Google authorization code for tokens
async function exchangeGoogleCode(code: string, redirectUri: string): Promise<GoogleTokenResponse> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured')
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Google token exchange failed: ${error.error_description || error.error}`)
  }

  return await response.json()
}

// Get Google user info
async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch Google user info')
  }

  return await response.json()
}

// Exchange Microsoft authorization code for tokens
async function exchangeMicrosoftCode(code: string, redirectUri: string): Promise<MicrosoftTokenResponse> {
  const clientId = Deno.env.get('MICROSOFT_CLIENT_ID')
  const clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET')

  if (!clientId || !clientSecret) {
    throw new Error('Microsoft OAuth credentials not configured')
  }

  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      scope: 'https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send offline_access openid email',
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Microsoft token exchange failed: ${error.error_description || error.error}`)
  }

  return await response.json()
}

// Get Microsoft user info
async function getMicrosoftUserInfo(accessToken: string): Promise<MicrosoftUserInfo> {
  const response = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch Microsoft user info')
  }

  return await response.json()
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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
    const { provider, code, redirect_uri }: OAuthRequest = await req.json()

    if (!provider || !code) {
      throw new Error('Missing required parameters: provider and code')
    }

    // Default redirect URI
    const redirectUri = redirect_uri || `${req.headers.get('origin')}/settings/email/callback`

    let emailAddress: string
    let displayName: string | null = null
    let accessToken: string
    let refreshToken: string
    let expiresIn: number

    // Exchange code based on provider
    if (provider === 'gmail') {
      const tokens = await exchangeGoogleCode(code, redirectUri)
      accessToken = tokens.access_token
      refreshToken = tokens.refresh_token
      expiresIn = tokens.expires_in

      const userInfo = await getGoogleUserInfo(accessToken)
      emailAddress = userInfo.email
      displayName = userInfo.name || null

      console.log(`Connected Gmail account: ${emailAddress}`)
    } else if (provider === 'outlook') {
      const tokens = await exchangeMicrosoftCode(code, redirectUri)
      accessToken = tokens.access_token
      refreshToken = tokens.refresh_token
      expiresIn = tokens.expires_in

      const userInfo = await getMicrosoftUserInfo(accessToken)
      emailAddress = userInfo.mail || userInfo.userPrincipalName
      displayName = userInfo.displayName || null

      console.log(`Connected Outlook account: ${emailAddress}`)
    } else {
      throw new Error(`Unsupported provider: ${provider}`)
    }

    // Calculate token expiry
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

    // Get user's company ID
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    // Check for existing account
    const { data: existingAccount } = await supabase
      .from('email_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('email_address', emailAddress)
      .maybeSingle()

    let account

    if (existingAccount) {
      // Update existing account
      const { data, error } = await supabase
        .from('email_accounts')
        .update({
          access_token: accessToken,
          refresh_token: refreshToken,
          token_expires_at: tokenExpiresAt,
          display_name: displayName,
          is_active: true,
          connected_at: new Date().toISOString(),
          sync_status: 'pending',
          sync_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingAccount.id)
        .select(`
          id, user_id, company_id, email_address, display_name, provider,
          sync_enabled, last_sync_at, sync_status, sync_error, sync_from_date,
          is_active, connected_at, created_at, updated_at
        `)
        .single()

      if (error) {throw error}
      account = data
    } else {
      // Create new account
      const { data, error } = await supabase
        .from('email_accounts')
        .insert({
          user_id: user.id,
          company_id: userData?.company_id || null,
          email_address: emailAddress,
          display_name: displayName,
          provider,
          access_token: accessToken,
          refresh_token: refreshToken,
          token_expires_at: tokenExpiresAt,
          is_active: true,
          sync_enabled: true,
          sync_status: 'pending',
          sync_from_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
        })
        .select(`
          id, user_id, company_id, email_address, display_name, provider,
          sync_enabled, last_sync_at, sync_status, sync_error, sync_from_date,
          is_active, connected_at, created_at, updated_at
        `)
        .single()

      if (error) {throw error}
      account = data
    }

    console.log(`Email account ${existingAccount ? 'updated' : 'created'}: ${account.id}`)

    // Trigger initial sync asynchronously
    try {
      await supabase.functions.invoke('sync-emails-cron', {
        body: { accountId: account.id },
      })
    } catch (syncError) {
      console.warn('Failed to trigger initial sync:', syncError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        account,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('email-complete-oauth error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error instanceof Error && error.message.includes('Missing') ? 400 : 500,
      }
    )
  }
})
