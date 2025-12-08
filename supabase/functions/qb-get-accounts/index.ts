/**
 * Supabase Edge Function: qb-get-accounts
 *
 * Fetch QuickBooks Chart of Accounts for account mapping
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeaders, qbApiRequest } from '../_shared/quickbooks.ts'

interface GetAccountsRequest {
  connectionId: string
  accountType?: string // Filter by type: 'Expense', 'Income', 'Asset', etc.
}

interface QBAccount {
  Id: string
  Name: string
  AccountType: string
  AccountSubType?: string
  AcctNum?: string
  Description?: string
  Active: boolean
  CurrentBalance?: number
  FullyQualifiedName?: string
}

interface QBQueryResponse {
  QueryResponse: {
    Account?: QBAccount[]
    maxResults?: number
  }
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request
    const { connectionId, accountType }: GetAccountsRequest = await req.json()

    if (!connectionId) {
      throw new Error('Missing connectionId')
    }

    // Get connection with tokens
    const { data: connection, error: connError } = await supabase
      .from('qb_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('is_active', true)
      .single()

    if (connError || !connection) {
      throw new Error('Connection not found or inactive')
    }

    if (!connection.access_token) {
      throw new Error('No access token available')
    }

    // Check if token is expired
    if (connection.token_expires_at) {
      const expiresAt = new Date(connection.token_expires_at)
      if (expiresAt < new Date()) {
        throw new Error('Access token expired. Please refresh the token.')
      }
    }

    console.log(`Fetching accounts for connection ${connectionId}`)

    // Build query - fetch all active accounts
    let query = "SELECT * FROM Account WHERE Active = true"
    if (accountType) {
      query += ` AND AccountType = '${accountType}'`
    }
    query += " ORDERBY Name"

    // Query QuickBooks
    const response = await qbApiRequest<QBQueryResponse>(
      connection.realm_id,
      'query',
      connection.access_token,
      connection.is_sandbox,
      {
        query: { query },
      }
    )

    const accounts = response.QueryResponse?.Account || []

    console.log(`Fetched ${accounts.length} accounts from QuickBooks`)

    // Map to simpler format
    const mappedAccounts = accounts.map((account) => ({
      Id: account.Id,
      Name: account.Name,
      AccountType: account.AccountType,
      AccountSubType: account.AccountSubType,
      AcctNum: account.AcctNum,
      Description: account.Description,
      Active: account.Active,
      FullyQualifiedName: account.FullyQualifiedName,
    }))

    return new Response(
      JSON.stringify({ accounts: mappedAccounts }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('qb-get-accounts error:', error)

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
