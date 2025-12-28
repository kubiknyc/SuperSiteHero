/**
 * Supabase Edge Function: gcal-sync-event
 *
 * Create, update, or delete Google Calendar events for meetings
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import {
  corsHeaders,
  createEvent,
  updateEvent,
  deleteEvent,
  getEvent,
  meetingToGCalEvent,
  gcalEventToMeetingData,
  refreshAccessToken,
  calculateTokenExpiry,
  isTokenExpired,
  GCalEvent,
} from '../_shared/google-calendar.ts'

interface SyncEventRequest {
  connectionId: string
  operation: 'create' | 'update' | 'delete' | 'sync_from_google'
  meetingId?: string
  googleEventId?: string
  meetingData?: {
    title: string
    description?: string | null
    location?: string | null
    virtual_meeting_link?: string | null
    meeting_date: string
    start_time?: string | null
    end_time?: string | null
    duration_minutes?: number | null
    attendees?: Array<{ email?: string; name: string }> | null
  }
  sendNotifications?: boolean
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!clientId || !clientSecret) {
      throw new Error('Google Calendar credentials not configured')
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
    const {
      connectionId,
      operation,
      meetingId,
      googleEventId,
      meetingData,
      sendNotifications = true,
    }: SyncEventRequest = await req.json()

    if (!connectionId || !operation) {
      throw new Error('Missing required parameters')
    }

    // Validate operation-specific requirements
    if (operation === 'create' && !meetingData) {
      throw new Error('Meeting data required for create operation')
    }
    if (operation === 'update' && (!googleEventId || !meetingData)) {
      throw new Error('Google event ID and meeting data required for update operation')
    }
    if (operation === 'delete' && !googleEventId) {
      throw new Error('Google event ID required for delete operation')
    }
    if (operation === 'sync_from_google' && !googleEventId) {
      throw new Error('Google event ID required for sync_from_google operation')
    }

    // Get connection
    const { data: connection, error: connError } = await supabase
      .from('google_calendar_connections')
      .select('*')
      .eq('id', connectionId)
      .single()

    if (connError || !connection) {
      throw new Error('Connection not found')
    }

    if (!connection.is_active || !connection.sync_enabled) {
      throw new Error('Calendar sync is disabled for this connection')
    }

    // Check and refresh token if needed
    let accessToken = connection.access_token
    if (isTokenExpired(connection.token_expires_at)) {
      console.log(`Token expired for connection ${connectionId}, refreshing...`)

      try {
        const tokens = await refreshAccessToken(connection.refresh_token, clientId, clientSecret)
        const tokenExpiresAt = calculateTokenExpiry(tokens.expires_in)

        const updateData: Record<string, unknown> = {
          access_token: tokens.access_token,
          token_expires_at: tokenExpiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        }
        if (tokens.refresh_token) {
          updateData.refresh_token = tokens.refresh_token
        }

        await supabase
          .from('google_calendar_connections')
          .update(updateData)
          .eq('id', connectionId)

        accessToken = tokens.access_token
      } catch (_refreshError) {
        // Mark connection as needing re-auth
        await supabase
          .from('google_calendar_connections')
          .update({
            connection_error: 'Token refresh failed. Please reconnect.',
            updated_at: new Date().toISOString(),
          })
          .eq('id', connectionId)

        throw new Error('Token refresh failed. Please reconnect to Google Calendar.')
      }
    }

    const calendarId = connection.calendar_id || 'primary'
    const sendUpdates = sendNotifications ? 'all' : 'none'
    let result: { googleEventId?: string; googleEvent?: GCalEvent; meetingData?: unknown } = {}

    // Perform operation
    switch (operation) {
      case 'create': {
        const gcalEvent = meetingToGCalEvent(meetingData!)

        // Add extended property to track this event came from our app
        gcalEvent.extendedProperties = {
          private: {
            source: 'construction_app',
            meeting_id: meetingId || '',
          },
        }

        const createdEvent = await createEvent(accessToken, calendarId, gcalEvent, { sendUpdates })

        console.log(`Created Google Calendar event ${createdEvent.id} for meeting ${meetingId}`)

        // Create mapping record
        if (meetingId) {
          await supabase.from('calendar_event_mappings').insert({
            connection_id: connectionId,
            company_id: connection.company_id,
            local_entity_type: 'meeting',
            local_entity_id: meetingId,
            google_event_id: createdEvent.id,
            google_calendar_id: calendarId,
            sync_status: 'synced',
            last_synced_at: new Date().toISOString(),
            google_etag: createdEvent.etag,
            last_local_update: new Date().toISOString(),
            last_google_update: createdEvent.updated,
          })

          // Update meeting with Google event ID
          await supabase
            .from('meetings')
            .update({
              google_calendar_event_id: createdEvent.id,
              google_calendar_synced_at: new Date().toISOString(),
            })
            .eq('id', meetingId)
        }

        result = { googleEventId: createdEvent.id, googleEvent: createdEvent }
        break
      }

      case 'update': {
        const gcalEvent = meetingToGCalEvent(meetingData!)
        const updatedEvent = await updateEvent(accessToken, calendarId, googleEventId!, gcalEvent, { sendUpdates })

        console.log(`Updated Google Calendar event ${googleEventId}`)

        // Update mapping record
        if (meetingId) {
          await supabase
            .from('calendar_event_mappings')
            .update({
              sync_status: 'synced',
              last_synced_at: new Date().toISOString(),
              google_etag: updatedEvent.etag,
              last_local_update: new Date().toISOString(),
              last_google_update: updatedEvent.updated,
              last_sync_error: null,
            })
            .eq('connection_id', connectionId)
            .eq('local_entity_id', meetingId)

          // Update meeting sync timestamp
          await supabase
            .from('meetings')
            .update({
              google_calendar_synced_at: new Date().toISOString(),
            })
            .eq('id', meetingId)
        }

        result = { googleEventId: updatedEvent.id, googleEvent: updatedEvent }
        break
      }

      case 'delete': {
        await deleteEvent(accessToken, calendarId, googleEventId!, { sendUpdates })

        console.log(`Deleted Google Calendar event ${googleEventId}`)

        // Remove mapping record
        await supabase
          .from('calendar_event_mappings')
          .delete()
          .eq('connection_id', connectionId)
          .eq('google_event_id', googleEventId)

        // Clear Google event ID from meeting
        if (meetingId) {
          await supabase
            .from('meetings')
            .update({
              google_calendar_event_id: null,
              google_calendar_synced_at: null,
            })
            .eq('id', meetingId)
        }

        result = { googleEventId }
        break
      }

      case 'sync_from_google': {
        const googleEvent = await getEvent(accessToken, calendarId, googleEventId!)
        const meetingDataFromGoogle = gcalEventToMeetingData(googleEvent)

        console.log(`Retrieved Google Calendar event ${googleEventId} for sync`)

        result = { googleEventId: googleEvent.id, googleEvent, meetingData: meetingDataFromGoogle }
        break
      }

      default:
        throw new Error(`Unknown operation: ${operation}`)
    }

    // Log the sync operation
    await supabase.from('calendar_sync_logs').insert({
      connection_id: connectionId,
      company_id: connection.company_id,
      operation,
      direction: operation === 'sync_from_google' ? 'from_google' : 'to_google',
      entity_type: 'meeting',
      entity_id: meetingId || crypto.randomUUID(),
      google_event_id: result.googleEventId || googleEventId,
      status: 'success',
      completed_at: new Date().toISOString(),
    })

    // Update last sync time on connection
    await supabase
      .from('google_calendar_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        connection_error: null,
      })
      .eq('id', connectionId)

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('gcal-sync-event error:', error)

    // Try to log failed sync
    try {
      const { connectionId, operation, meetingId, googleEventId } = await req.clone().json()
      if (connectionId) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        const { data: connection } = await supabase
          .from('google_calendar_connections')
          .select('company_id')
          .eq('id', connectionId)
          .single()

        if (connection) {
          await supabase.from('calendar_sync_logs').insert({
            connection_id: connectionId,
            company_id: connection.company_id,
            operation: operation || 'unknown',
            direction: operation === 'sync_from_google' ? 'from_google' : 'to_google',
            entity_type: 'meeting',
            entity_id: meetingId || crypto.randomUUID(),
            google_event_id: googleEventId,
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            completed_at: new Date().toISOString(),
          })
        }
      }
    } catch (_error) {
      // Ignore logging errors
    }

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
