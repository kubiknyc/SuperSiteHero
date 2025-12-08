/**
 * Supabase Edge Function: qb-sync-entity
 *
 * Sync a single entity to/from QuickBooks
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeaders, qbApiRequest, buildQBApiUrl } from '../_shared/quickbooks.ts'

interface SyncEntityRequest {
  connectionId: string
  entity_type: string  // 'subcontractors', 'payment_applications', 'change_orders', etc.
  entity_id: string
  direction?: 'to_quickbooks' | 'from_quickbooks'
}

// Entity type to QB entity mapping
const ENTITY_MAPPINGS: Record<string, { qbType: string; endpoint: string }> = {
  subcontractors: { qbType: 'vendor', endpoint: 'vendor' },
  payment_applications: { qbType: 'invoice', endpoint: 'invoice' },
  change_orders: { qbType: 'bill', endpoint: 'bill' },
  cost_transactions: { qbType: 'expense', endpoint: 'purchase' },
  projects: { qbType: 'customer', endpoint: 'customer' },
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
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      throw new Error('Invalid authentication')
    }

    // Parse request
    const {
      connectionId,
      entity_type,
      entity_id,
      direction = 'to_quickbooks',
    }: SyncEntityRequest = await req.json()

    if (!connectionId || !entity_type || !entity_id) {
      throw new Error('Missing required parameters')
    }

    const entityMapping = ENTITY_MAPPINGS[entity_type]
    if (!entityMapping) {
      throw new Error(`Unsupported entity type: ${entity_type}`)
    }

    // Get connection
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

    console.log(`Syncing ${entity_type}/${entity_id} to QuickBooks (${direction})`)

    // Start sync log
    const syncLogEntry = {
      company_id: connection.company_id,
      connection_id: connectionId,
      sync_type: 'manual',
      direction,
      entity_type: entityMapping.qbType,
      status: 'syncing',
      records_processed: 1,
      records_created: 0,
      records_updated: 0,
      records_failed: 0,
      started_at: new Date().toISOString(),
      initiated_by: user.id,
    }

    const { data: syncLog, error: logError } = await supabase
      .from('qb_sync_logs')
      .insert(syncLogEntry)
      .select()
      .single()

    if (logError) {
      console.warn('Could not create sync log:', logError)
    }

    // Check for existing mapping
    const { data: existingMapping } = await supabase
      .from('qb_entity_mappings')
      .select('*')
      .eq('company_id', connection.company_id)
      .eq('local_entity_type', entity_type)
      .eq('local_entity_id', entity_id)
      .maybeSingle()

    let qbEntityId = existingMapping?.qb_entity_id
    let isCreate = !qbEntityId

    try {
      // Fetch local entity data
      const { data: localEntity, error: entityError } = await supabase
        .from(entity_type)
        .select('*')
        .eq('id', entity_id)
        .single()

      if (entityError || !localEntity) {
        throw new Error(`Entity not found: ${entity_type}/${entity_id}`)
      }

      // Transform to QB format based on entity type
      const qbData = transformToQBFormat(entity_type, localEntity, existingMapping?.qb_sync_token)

      let qbResponse: any

      if (isCreate) {
        // Create in QuickBooks
        qbResponse = await qbApiRequest(
          connection.realm_id,
          entityMapping.endpoint,
          connection.access_token,
          connection.is_sandbox,
          {
            method: 'POST',
            body: qbData,
          }
        )
        qbEntityId = qbResponse[capitalize(entityMapping.qbType)]?.Id
      } else {
        // Update in QuickBooks
        qbResponse = await qbApiRequest(
          connection.realm_id,
          entityMapping.endpoint,
          connection.access_token,
          connection.is_sandbox,
          {
            method: 'POST',
            body: { ...qbData, Id: qbEntityId },
          }
        )
      }

      const qbEntity = qbResponse[capitalize(entityMapping.qbType)]

      // Create or update entity mapping
      const mappingData = {
        company_id: connection.company_id,
        connection_id: connectionId,
        local_entity_type: entity_type,
        local_entity_id: entity_id,
        qb_entity_type: entityMapping.qbType,
        qb_entity_id: qbEntity.Id,
        qb_sync_token: qbEntity.SyncToken,
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
        last_sync_error: null,
      }

      if (existingMapping) {
        await supabase
          .from('qb_entity_mappings')
          .update(mappingData)
          .eq('id', existingMapping.id)
      } else {
        await supabase.from('qb_entity_mappings').insert(mappingData)
      }

      // Update sync log
      if (syncLog) {
        await supabase
          .from('qb_sync_logs')
          .update({
            status: 'synced',
            records_created: isCreate ? 1 : 0,
            records_updated: isCreate ? 0 : 1,
            completed_at: new Date().toISOString(),
            duration_ms: Date.now() - new Date(syncLog.started_at).getTime(),
          })
          .eq('id', syncLog.id)
      }

      console.log(`Successfully synced ${entity_type}/${entity_id} -> QB ${entityMapping.qbType}/${qbEntityId}`)

      return new Response(
        JSON.stringify({
          mapping: {
            local_entity_type: entity_type,
            local_entity_id: entity_id,
            qb_entity_type: entityMapping.qbType,
            qb_entity_id: qbEntityId,
            sync_status: 'synced',
            last_synced_at: new Date().toISOString(),
          },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    } catch (syncError) {
      console.error('Sync error:', syncError)

      // Update mapping with error
      if (existingMapping) {
        await supabase
          .from('qb_entity_mappings')
          .update({
            sync_status: 'failed',
            last_sync_error: syncError instanceof Error ? syncError.message : 'Unknown error',
          })
          .eq('id', existingMapping.id)
      } else {
        await supabase.from('qb_entity_mappings').insert({
          company_id: connection.company_id,
          connection_id: connectionId,
          local_entity_type: entity_type,
          local_entity_id: entity_id,
          qb_entity_type: entityMapping.qbType,
          qb_entity_id: '',
          sync_status: 'failed',
          last_sync_error: syncError instanceof Error ? syncError.message : 'Unknown error',
        })
      }

      // Update sync log
      if (syncLog) {
        await supabase
          .from('qb_sync_logs')
          .update({
            status: 'failed',
            records_failed: 1,
            completed_at: new Date().toISOString(),
            duration_ms: Date.now() - new Date(syncLog.started_at).getTime(),
            error_message: syncError instanceof Error ? syncError.message : 'Unknown error',
          })
          .eq('id', syncLog.id)
      }

      throw syncError
    }
  } catch (error) {
    console.error('qb-sync-entity error:', error)

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

/**
 * Transform local entity to QuickBooks format
 */
function transformToQBFormat(entityType: string, localEntity: any, syncToken?: string): any {
  switch (entityType) {
    case 'subcontractors':
      return {
        DisplayName: localEntity.company_name,
        CompanyName: localEntity.company_name,
        PrintOnCheckName: localEntity.company_name,
        PrimaryPhone: localEntity.contact_phone ? { FreeFormNumber: localEntity.contact_phone } : undefined,
        PrimaryEmailAddr: localEntity.contact_email ? { Address: localEntity.contact_email } : undefined,
        BillAddr: localEntity.address ? {
          Line1: localEntity.address,
          City: localEntity.city,
          CountrySubDivisionCode: localEntity.state,
          PostalCode: localEntity.zip,
        } : undefined,
        Active: true,
        ...(syncToken ? { SyncToken: syncToken } : {}),
      }

    case 'payment_applications':
      return {
        DocNumber: localEntity.app_number?.toString(),
        TxnDate: localEntity.period_to,
        DueDate: localEntity.due_date,
        CustomerRef: { value: localEntity.qb_customer_id || '' },
        Line: [{
          Amount: localEntity.amount_due || 0,
          DetailType: 'SalesItemLineDetail',
          SalesItemLineDetail: {
            ItemRef: { value: '1' }, // Default service item
          },
          Description: `Pay Application #${localEntity.app_number}`,
        }],
        PrivateNote: `Payment Application #${localEntity.app_number} - ${localEntity.project_name || ''}`,
        ...(syncToken ? { SyncToken: syncToken } : {}),
      }

    case 'change_orders':
      return {
        DocNumber: localEntity.co_number?.toString(),
        TxnDate: localEntity.submitted_date || new Date().toISOString().split('T')[0],
        VendorRef: { value: localEntity.qb_vendor_id || '' },
        Line: [{
          Amount: localEntity.approved_amount || localEntity.requested_amount || 0,
          DetailType: 'AccountBasedExpenseLineDetail',
          AccountBasedExpenseLineDetail: {
            AccountRef: { value: localEntity.qb_account_id || '1' },
          },
          Description: `Change Order #${localEntity.co_number}: ${localEntity.description || ''}`,
        }],
        PrivateNote: localEntity.description,
        ...(syncToken ? { SyncToken: syncToken } : {}),
      }

    case 'projects':
      return {
        DisplayName: localEntity.name,
        CompanyName: localEntity.client_name || localEntity.name,
        BillAddr: localEntity.address ? {
          Line1: localEntity.address,
          City: localEntity.city,
          CountrySubDivisionCode: localEntity.state,
          PostalCode: localEntity.zip,
        } : undefined,
        Active: true,
        ...(syncToken ? { SyncToken: syncToken } : {}),
      }

    default:
      throw new Error(`Transform not implemented for: ${entityType}`)
  }
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
