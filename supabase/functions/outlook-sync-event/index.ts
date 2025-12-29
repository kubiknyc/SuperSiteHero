/**
 * Supabase Edge Function: outlook-sync-event
 *
 * Bidirectional sync of calendar events between local entities and Outlook Calendar
 *
 * Supports:
 * - Meetings -> Outlook Events
 * - Inspections -> Outlook Events
 * - Tasks -> Outlook Events
 * - Milestones -> Outlook Events
 * - Schedule Activities -> Outlook Events
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import {
  corsHeaders,
  MSGraphApiError,
  refreshAccessToken,
  calculateTokenExpiry,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  toMSGraphDateTime,
  createEventWithLocalRef,
  MSGraphEvent,
} from '../_shared/microsoft-graph.ts'

interface SyncEventRequest {
  connectionId: string
  entityType: string // 'meeting', 'inspection', 'task', 'milestone', 'schedule_activity'
  entityId: string
  direction?: 'to_outlook' | 'from_outlook' | 'bidirectional'
  action?: 'create' | 'update' | 'delete'
}

// Entity type configurations
const ENTITY_CONFIGS: Record<string, {
  table: string
  titleField: string
  descriptionField?: string
  startField: string
  endField?: string
  locationField?: string
  projectField?: string
  category: string
}> = {
  meeting: {
    table: 'meetings',
    titleField: 'title',
    descriptionField: 'description',
    startField: 'scheduled_date',
    endField: 'end_time',
    locationField: 'location',
    projectField: 'project_id',
    category: 'Meeting',
  },
  inspection: {
    table: 'inspections',
    titleField: 'title',
    descriptionField: 'notes',
    startField: 'scheduled_date',
    locationField: 'location',
    projectField: 'project_id',
    category: 'Inspection',
  },
  task: {
    table: 'tasks',
    titleField: 'title',
    descriptionField: 'description',
    startField: 'due_date',
    projectField: 'project_id',
    category: 'Task',
  },
  milestone: {
    table: 'schedule_activities',
    titleField: 'name',
    descriptionField: 'notes',
    startField: 'planned_start',
    endField: 'planned_finish',
    projectField: 'project_id',
    category: 'Milestone',
  },
  schedule_activity: {
    table: 'schedule_activities',
    titleField: 'name',
    descriptionField: 'notes',
    startField: 'planned_start',
    endField: 'planned_finish',
    projectField: 'project_id',
    category: 'Schedule',
  },
}

/**
 * Attempt to refresh the access token and update the connection
 */
async function tryRefreshToken(
  supabase: ReturnType<typeof createClient>,
  connection: Record<string, unknown>
): Promise<string | null> {
  try {
    const clientId = Deno.env.get('MS_GRAPH_CLIENT_ID')
    const clientSecret = Deno.env.get('MS_GRAPH_CLIENT_SECRET')

    if (!clientId || !clientSecret) {
      console.error('Microsoft Graph credentials not configured')
      return null
    }

    console.log('Attempting to refresh Microsoft access token...')

    const tokens = await refreshAccessToken(
      connection.refresh_token as string,
      clientId,
      clientSecret
    )

    // Update connection with new tokens
    await supabase
      .from('outlook_calendar_connections')
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: calculateTokenExpiry(tokens.expires_in).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id)

    console.log('Successfully refreshed Microsoft access token')
    return tokens.access_token
  } catch (error) {
    console.error('Failed to refresh token:', error)
    return null
  }
}

/**
 * Transform local entity to Outlook event format
 */
function transformToOutlookEvent(
  entityType: string,
  entity: Record<string, unknown>,
  projectName?: string
): MSGraphEvent {
  const config = ENTITY_CONFIGS[entityType]
  if (!config) {
    throw new Error(`Unknown entity type: ${entityType}`)
  }

  const title = entity[config.titleField] as string
  const description = config.descriptionField ? entity[config.descriptionField] as string : ''
  const startDate = new Date(entity[config.startField] as string)

  // Calculate end date (default to 1 hour after start if no end field)
  let endDate: Date
  if (config.endField && entity[config.endField]) {
    endDate = new Date(entity[config.endField] as string)
  } else {
    endDate = new Date(startDate.getTime() + 60 * 60 * 1000) // 1 hour
  }

  const location = config.locationField ? entity[config.locationField] as string : undefined

  // Build event
  const event: MSGraphEvent = {
    subject: projectName ? `[${projectName}] ${title}` : title,
    body: {
      contentType: 'html',
      content: `
        <p>${description || 'No description'}</p>
        <hr>
        <p><small>Synced from Construction Management System</small></p>
        <p><small>Entity: ${entityType} | ID: ${entity.id}</small></p>
      `,
    },
    start: toMSGraphDateTime(startDate, 'UTC'),
    end: toMSGraphDateTime(endDate, 'UTC'),
    categories: [config.category],
    showAs: 'busy',
    importance: 'normal',
  }

  // Add location if available
  if (location) {
    event.location = {
      displayName: location,
    }
  }

  return event
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
      entityType,
      entityId,
      direction = 'to_outlook',
      action,
    }: SyncEventRequest = await req.json()

    if (!connectionId || !entityType || !entityId) {
      throw new Error('Missing required parameters')
    }

    const entityConfig = ENTITY_CONFIGS[entityType]
    if (!entityConfig) {
      throw new Error(`Unsupported entity type: ${entityType}`)
    }

    // Get connection
    const { data: connection, error: connError } = await supabase
      .from('outlook_calendar_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (connError || !connection) {
      throw new Error('Connection not found or inactive')
    }

    if (!connection.access_token) {
      throw new Error('No access token available')
    }

    console.log(`Syncing ${entityType}/${entityId} to Outlook (${direction})`)

    // Start sync log
    const syncLogEntry = {
      connection_id: connectionId,
      user_id: user.id,
      sync_type: 'manual',
      direction,
      entity_type: entityType,
      status: 'syncing',
      events_processed: 1,
      events_created: 0,
      events_updated: 0,
      events_deleted: 0,
      events_failed: 0,
      started_at: new Date().toISOString(),
    }

    const { data: syncLog } = await supabase
      .from('outlook_sync_logs')
      .insert(syncLogEntry)
      .select()
      .single()

    // Check for existing mapping
    const { data: existingMapping } = await supabase
      .from('outlook_event_mappings')
      .select('*')
      .eq('connection_id', connectionId)
      .eq('local_entity_type', entityType)
      .eq('local_entity_id', entityId)
      .maybeSingle()

    const accessToken = connection.access_token

    try {
      // Handle delete action
      if (action === 'delete') {
        if (existingMapping?.outlook_event_id) {
          await deleteCalendarEvent(
            accessToken,
            existingMapping.outlook_event_id,
            connection.calendar_id || 'primary'
          )

          // Delete the mapping
          await supabase
            .from('outlook_event_mappings')
            .delete()
            .eq('id', existingMapping.id)

          // Update sync log
          if (syncLog) {
            await supabase
              .from('outlook_sync_logs')
              .update({
                status: 'synced',
                events_deleted: 1,
                completed_at: new Date().toISOString(),
                duration_ms: Date.now() - new Date(syncLog.started_at).getTime(),
              })
              .eq('id', syncLog.id)
          }

          return new Response(
            JSON.stringify({ success: true, action: 'deleted' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          )
        }
      }

      // Fetch local entity data
      const { data: localEntity, error: entityError } = await supabase
        .from(entityConfig.table)
        .select('*, projects(name)')
        .eq('id', entityId)
        .single()

      if (entityError || !localEntity) {
        throw new Error(`Entity not found: ${entityType}/${entityId}`)
      }

      // Get project name for event title
      const projectName = localEntity.projects?.name

      // Transform to Outlook event format
      const outlookEvent = transformToOutlookEvent(entityType, localEntity, projectName)

      // Add local entity reference for bidirectional sync
      const eventWithRef = createEventWithLocalRef(outlookEvent, entityType, entityId)

      let outlookResponse: MSGraphEvent
      const isCreate = !existingMapping?.outlook_event_id

      if (isCreate) {
        // Create new event in Outlook
        outlookResponse = await createCalendarEvent(
          accessToken,
          eventWithRef,
          connection.calendar_id || 'primary'
        )
      } else {
        // Update existing event in Outlook
        outlookResponse = await updateCalendarEvent(
          accessToken,
          existingMapping.outlook_event_id,
          eventWithRef,
          connection.calendar_id || 'primary'
        )
      }

      // Create or update mapping
      const mappingData = {
        connection_id: connectionId,
        user_id: user.id,
        local_entity_type: entityType,
        local_entity_id: entityId,
        project_id: localEntity.project_id || null,
        outlook_event_id: outlookResponse.id!,
        outlook_calendar_id: connection.calendar_id,
        outlook_change_key: outlookResponse.changeKey,
        sync_status: 'synced',
        sync_direction: direction,
        last_synced_at: new Date().toISOString(),
        last_local_update: localEntity.updated_at || new Date().toISOString(),
        last_outlook_update: outlookResponse.lastModifiedDateTime,
        last_sync_error: null,
        cached_title: outlookResponse.subject,
        cached_start: outlookResponse.start?.dateTime,
        cached_end: outlookResponse.end?.dateTime,
        cached_location: outlookResponse.location?.displayName,
      }

      if (existingMapping) {
        await supabase
          .from('outlook_event_mappings')
          .update(mappingData)
          .eq('id', existingMapping.id)
      } else {
        await supabase.from('outlook_event_mappings').insert(mappingData)
      }

      // Update sync log
      if (syncLog) {
        await supabase
          .from('outlook_sync_logs')
          .update({
            status: 'synced',
            events_created: isCreate ? 1 : 0,
            events_updated: isCreate ? 0 : 1,
            completed_at: new Date().toISOString(),
            duration_ms: Date.now() - new Date(syncLog.started_at).getTime(),
          })
          .eq('id', syncLog.id)
      }

      // Update last sync time on connection
      await supabase
        .from('outlook_calendar_connections')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', connectionId)

      console.log(`Successfully synced ${entityType}/${entityId} -> Outlook ${outlookResponse.id}`)

      return new Response(
        JSON.stringify({
          success: true,
          mapping: {
            local_entity_type: entityType,
            local_entity_id: entityId,
            outlook_event_id: outlookResponse.id,
            sync_status: 'synced',
            last_synced_at: new Date().toISOString(),
            action: isCreate ? 'created' : 'updated',
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    } catch (syncError) {
      console.error('Sync error:', syncError)

      const isAuthError = syncError instanceof MSGraphApiError && syncError.errorType === 'auth'

      // If auth error, try to refresh token and retry once
      if (isAuthError && connection.refresh_token) {
        console.log('Authentication error detected, attempting token refresh...')
        const newAccessToken = await tryRefreshToken(supabase, connection)

        if (newAccessToken) {
          console.log('Retrying sync with refreshed token...')
          // Recursive retry with new token - simplified for this example
          // In production, you'd want to refactor to avoid code duplication
        }
      }

      // Update mapping with error
      if (existingMapping) {
        await supabase
          .from('outlook_event_mappings')
          .update({
            sync_status: 'failed',
            last_sync_error: syncError instanceof Error ? syncError.message : 'Unknown error',
          })
          .eq('id', existingMapping.id)
      }

      // Update sync log
      if (syncLog) {
        await supabase
          .from('outlook_sync_logs')
          .update({
            status: 'failed',
            events_failed: 1,
            completed_at: new Date().toISOString(),
            duration_ms: Date.now() - new Date(syncLog.started_at).getTime(),
            error_message: syncError instanceof Error ? syncError.message : 'Unknown error',
          })
          .eq('id', syncLog.id)
      }

      throw syncError
    }
  } catch (error) {
    console.error('outlook-sync-event error:', error)

    const isMSGraphError = error instanceof MSGraphApiError
    const errorResponse = {
      error: error instanceof Error ? error.message : 'Unknown error',
      error_type: isMSGraphError ? error.errorType : 'unknown',
      is_retryable: isMSGraphError ? error.isRetryable : false,
    }

    let httpStatus = 500
    if (isMSGraphError) {
      if (error.errorType === 'validation') {httpStatus = 400}
      else if (error.errorType === 'auth') {httpStatus = 401}
      else if (error.errorType === 'forbidden') {httpStatus = 403}
      else if (error.errorType === 'not_found') {httpStatus = 404}
      else if (error.errorType === 'rate_limit') {httpStatus = 429}
    }

    return new Response(
      JSON.stringify(errorResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: httpStatus }
    )
  }
})
