/**
 * Supabase Edge Function: qb-bulk-sync
 *
 * Batch sync multiple entities to QuickBooks
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeaders } from '../_shared/quickbooks.ts'

interface BulkSyncRequest {
  connectionId: string
  entity_type: string  // 'subcontractors', 'payment_applications', 'change_orders', 'all'
  entity_ids?: string[] // Optional - if not provided, sync all unsynced
  direction?: 'to_quickbooks' | 'from_quickbooks'
}

// Entity types that can be synced
const SYNCABLE_ENTITIES = ['subcontractors', 'payment_applications', 'change_orders', 'projects']

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
      entity_ids,
      direction = 'to_quickbooks',
    }: BulkSyncRequest = await req.json()

    if (!connectionId || !entity_type) {
      throw new Error('Missing required parameters')
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

    console.log(`Starting bulk sync for ${entity_type}, connection ${connectionId}`)

    // Determine which entity types to sync
    const entityTypes = entity_type === 'all'
      ? SYNCABLE_ENTITIES
      : [entity_type]

    // Create sync log
    const { data: syncLog, error: logError } = await supabase
      .from('qb_sync_logs')
      .insert({
        company_id: connection.company_id,
        connection_id: connectionId,
        sync_type: 'manual',
        direction,
        entity_type: entity_type === 'all' ? null : entity_type,
        status: 'syncing',
        records_processed: 0,
        records_created: 0,
        records_updated: 0,
        records_failed: 0,
        started_at: new Date().toISOString(),
        initiated_by: user.id,
      })
      .select()
      .single()

    if (logError) {
      console.warn('Could not create sync log:', logError)
    }

    let totalProcessed = 0
    let totalCreated = 0
    let totalUpdated = 0
    let totalFailed = 0
    const errors: string[] = []

    // Process each entity type
    for (const currentEntityType of entityTypes) {
      try {
        // Get entities to sync
        let entitiesToSync: string[]

        if (entity_ids && entity_ids.length > 0 && entity_type !== 'all') {
          entitiesToSync = entity_ids
        } else {
          // Find entities not yet synced or with failed status
          const { data: existingMappings } = await supabase
            .from('qb_entity_mappings')
            .select('local_entity_id')
            .eq('company_id', connection.company_id)
            .eq('local_entity_type', currentEntityType)
            .eq('sync_status', 'synced')

          const syncedIds = new Set(existingMappings?.map(m => m.local_entity_id) || [])

          // Get all entities of this type for the company
          const { data: allEntities, error: entitiesError } = await supabase
            .from(currentEntityType)
            .select('id')
            .eq('company_id', connection.company_id)
            .limit(100) // Limit batch size

          if (entitiesError) {
            console.warn(`Could not fetch ${currentEntityType}:`, entitiesError)
            continue
          }

          // Filter to unsynced entities
          entitiesToSync = (allEntities || [])
            .map(e => e.id)
            .filter(id => !syncedIds.has(id))
        }

        console.log(`Found ${entitiesToSync.length} ${currentEntityType} to sync`)

        // Queue entities for sync
        for (const entityId of entitiesToSync) {
          totalProcessed++

          // Check if already in pending queue
          const { data: existingPending } = await supabase
            .from('qb_pending_syncs')
            .select('id')
            .eq('connection_id', connectionId)
            .eq('local_entity_type', currentEntityType)
            .eq('local_entity_id', entityId)
            .maybeSingle()

          if (existingPending) {
            // Update existing pending sync
            await supabase
              .from('qb_pending_syncs')
              .update({
                status: 'pending',
                scheduled_at: new Date().toISOString(),
                last_error: null,
              })
              .eq('id', existingPending.id)
          } else {
            // Create new pending sync
            await supabase
              .from('qb_pending_syncs')
              .insert({
                company_id: connection.company_id,
                connection_id: connectionId,
                local_entity_type: currentEntityType,
                local_entity_id: entityId,
                direction,
                priority: 5,
                scheduled_at: new Date().toISOString(),
                status: 'pending',
                created_by: user.id,
              })
          }

          totalCreated++
        }
      } catch (typeError) {
        console.error(`Error processing ${currentEntityType}:`, typeError)
        errors.push(`${currentEntityType}: ${typeError instanceof Error ? typeError.message : 'Unknown error'}`)
        totalFailed++
      }
    }

    // Update sync log
    const finalStatus = totalFailed > 0 && totalCreated === 0 ? 'failed' : 'synced'

    if (syncLog) {
      await supabase
        .from('qb_sync_logs')
        .update({
          status: finalStatus,
          records_processed: totalProcessed,
          records_created: totalCreated,
          records_updated: totalUpdated,
          records_failed: totalFailed,
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - new Date(syncLog.started_at).getTime(),
          error_message: errors.length > 0 ? errors.join('; ') : null,
        })
        .eq('id', syncLog.id)
    }

    console.log(`Bulk sync queued: ${totalProcessed} processed, ${totalCreated} queued, ${totalFailed} failed`)

    return new Response(
      JSON.stringify({
        success: totalCreated,
        failed: totalFailed,
        logId: syncLog?.id || null,
        message: `Queued ${totalCreated} entities for sync`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('qb-bulk-sync error:', error)

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
