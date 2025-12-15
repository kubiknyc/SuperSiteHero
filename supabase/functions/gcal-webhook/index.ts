/**
 * Supabase Edge Function: gcal-webhook
 *
 * Handle Google Calendar push notifications for real-time sync
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import {
  corsHeaders,
  listEvents,
  gcalEventToMeetingData,
  refreshAccessToken,
  calculateTokenExpiry,
  isTokenExpired,
  GCalEvent,
} from '../_shared/google-calendar.ts'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')

    if (!clientId || !clientSecret) {
      throw new Error('Google Calendar credentials not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get headers from Google push notification
    const channelId = req.headers.get('X-Goog-Channel-ID')
    const resourceId = req.headers.get('X-Goog-Resource-ID')
    const resourceState = req.headers.get('X-Goog-Resource-State')
    const channelToken = req.headers.get('X-Goog-Channel-Token')
    const messageNumber = req.headers.get('X-Goog-Message-Number')

    console.log(`Received Google Calendar webhook: channel=${channelId}, state=${resourceState}, message=${messageNumber}`)

    // Ignore sync messages (initial connection)
    if (resourceState === 'sync') {
      console.log('Ignoring sync message')
      return new Response('OK', { status: 200 })
    }

    if (!channelId || !resourceId) {
      console.log('Missing channel or resource ID')
      return new Response('Missing headers', { status: 400 })
    }

    // Find the connection by webhook channel ID
    const { data: connection, error: connError } = await supabase
      .from('google_calendar_connections')
      .select('*')
      .eq('webhook_channel_id', channelId)
      .single()

    if (connError || !connection) {
      console.log(`Connection not found for channel ${channelId}`)
      // Return 200 to prevent Google from retrying
      return new Response('OK', { status: 200 })
    }

    if (!connection.is_active || !connection.sync_enabled) {
      console.log(`Sync disabled for connection ${connection.id}`)
      return new Response('OK', { status: 200 })
    }

    // Verify resource ID matches
    if (connection.webhook_resource_id !== resourceId) {
      console.log(`Resource ID mismatch for connection ${connection.id}`)
      return new Response('OK', { status: 200 })
    }

    // Check sync direction allows inbound
    if (connection.sync_direction === 'to_google') {
      console.log(`Sync direction is to_google only for connection ${connection.id}`)
      return new Response('OK', { status: 200 })
    }

    // Check and refresh token if needed
    let accessToken = connection.access_token
    if (isTokenExpired(connection.token_expires_at)) {
      console.log(`Token expired for connection ${connection.id}, refreshing...`)

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
          .eq('id', connection.id)

        accessToken = tokens.access_token
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError)
        await supabase
          .from('google_calendar_connections')
          .update({
            connection_error: 'Token refresh failed. Please reconnect.',
            updated_at: new Date().toISOString(),
          })
          .eq('id', connection.id)
        return new Response('OK', { status: 200 })
      }
    }

    // Fetch recent events to see what changed
    // Use incremental sync if we have a sync token
    const calendarId = connection.calendar_id || 'primary'

    try {
      // Get events updated in the last hour
      const timeMin = new Date(Date.now() - 60 * 60 * 1000).toISOString()

      const eventList = await listEvents(accessToken, calendarId, {
        timeMin,
        singleEvents: true,
        orderBy: 'updated',
        maxResults: 100,
      })

      console.log(`Fetched ${eventList.items.length} recent events for connection ${connection.id}`)

      // Process each event
      for (const googleEvent of eventList.items) {
        await processGoogleEvent(supabase, connection, googleEvent)
      }

      // Update last sync time
      await supabase
        .from('google_calendar_connections')
        .update({
          last_sync_at: new Date().toISOString(),
          connection_error: null,
        })
        .eq('id', connection.id)
    } catch (fetchError) {
      console.error('Error fetching events:', fetchError)
      // Log the error but return 200 to prevent retries
    }

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('gcal-webhook error:', error)
    // Return 200 to prevent Google from retrying with bad data
    return new Response('OK', { status: 200 })
  }
})

/**
 * Process a single Google Calendar event and sync to local database
 */
async function processGoogleEvent(
  supabase: ReturnType<typeof createClient>,
  connection: {
    id: string
    company_id: string
    user_id: string
    sync_direction: string
  },
  googleEvent: GCalEvent
): Promise<void> {
  if (!googleEvent.id) return

  // Check if this event came from our app (skip to avoid loops)
  const source = googleEvent.extendedProperties?.private?.source
  if (source === 'construction_app') {
    console.log(`Skipping event ${googleEvent.id} - originated from our app`)
    return
  }

  // Look for existing mapping
  const { data: mapping } = await supabase
    .from('calendar_event_mappings')
    .select('*')
    .eq('connection_id', connection.id)
    .eq('google_event_id', googleEvent.id)
    .maybeSingle()

  // Handle cancelled (deleted) events
  if (googleEvent.status === 'cancelled') {
    if (mapping) {
      console.log(`Event ${googleEvent.id} was cancelled`)

      // Update mapping status
      await supabase
        .from('calendar_event_mappings')
        .update({
          sync_status: 'synced',
          last_synced_at: new Date().toISOString(),
          last_google_update: googleEvent.updated,
        })
        .eq('id', mapping.id)

      // Optionally mark the local meeting as cancelled
      // Only if sync direction allows it
      if (connection.sync_direction === 'from_google' || connection.sync_direction === 'bidirectional') {
        await supabase
          .from('meetings')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', mapping.local_entity_id)
      }

      // Log the sync
      await supabase.from('calendar_sync_logs').insert({
        connection_id: connection.id,
        company_id: connection.company_id,
        operation: 'delete',
        direction: 'from_google',
        entity_type: 'meeting',
        entity_id: mapping.local_entity_id,
        google_event_id: googleEvent.id,
        status: 'success',
        completed_at: new Date().toISOString(),
      })
    }
    return
  }

  // Convert Google event to meeting data
  const meetingData = gcalEventToMeetingData(googleEvent)

  if (mapping) {
    // Update existing meeting if Google event is newer
    const googleUpdated = googleEvent.updated ? new Date(googleEvent.updated) : new Date()
    const lastGoogleUpdate = mapping.last_google_update ? new Date(mapping.last_google_update) : new Date(0)

    if (googleUpdated > lastGoogleUpdate) {
      console.log(`Updating meeting ${mapping.local_entity_id} from Google event ${googleEvent.id}`)

      // Update the meeting
      await supabase
        .from('meetings')
        .update({
          title: meetingData.title,
          description: meetingData.description,
          location: meetingData.location,
          meeting_date: meetingData.meeting_date,
          start_time: meetingData.start_time,
          end_time: meetingData.end_time,
          virtual_meeting_link: meetingData.virtual_meeting_link,
          google_calendar_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', mapping.local_entity_id)

      // Update mapping
      await supabase
        .from('calendar_event_mappings')
        .update({
          sync_status: 'synced',
          last_synced_at: new Date().toISOString(),
          google_etag: googleEvent.etag,
          last_google_update: googleEvent.updated,
          last_sync_error: null,
        })
        .eq('id', mapping.id)

      // Log the sync
      await supabase.from('calendar_sync_logs').insert({
        connection_id: connection.id,
        company_id: connection.company_id,
        operation: 'update',
        direction: 'from_google',
        entity_type: 'meeting',
        entity_id: mapping.local_entity_id,
        google_event_id: googleEvent.id,
        status: 'success',
        completed_at: new Date().toISOString(),
      })
    }
  } else if (connection.sync_direction === 'from_google' || connection.sync_direction === 'bidirectional') {
    // Create new meeting from Google event (only if sync direction allows)
    console.log(`Creating new meeting from Google event ${googleEvent.id}`)

    // We need a project to create a meeting
    // For now, we'll queue this for manual review or get the default project
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .eq('company_id', connection.company_id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)

    if (!projects || projects.length === 0) {
      console.log(`No active project found for company ${connection.company_id}, skipping event creation`)
      return
    }

    const projectId = projects[0].id

    // Create the meeting
    const { data: newMeeting, error: createError } = await supabase
      .from('meetings')
      .insert({
        project_id: projectId,
        title: meetingData.title,
        description: meetingData.description,
        location: meetingData.location,
        meeting_date: meetingData.meeting_date,
        start_time: meetingData.start_time,
        end_time: meetingData.end_time,
        virtual_meeting_link: meetingData.virtual_meeting_link,
        meeting_type: 'other',
        status: 'scheduled',
        google_calendar_event_id: googleEvent.id,
        google_calendar_synced_at: new Date().toISOString(),
        created_by: connection.user_id,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating meeting:', createError)
      return
    }

    // Create mapping
    await supabase.from('calendar_event_mappings').insert({
      connection_id: connection.id,
      company_id: connection.company_id,
      local_entity_type: 'meeting',
      local_entity_id: newMeeting.id,
      google_event_id: googleEvent.id,
      google_calendar_id: connection.calendar_id || 'primary',
      sync_status: 'synced',
      last_synced_at: new Date().toISOString(),
      google_etag: googleEvent.etag,
      last_google_update: googleEvent.updated,
    })

    // Log the sync
    await supabase.from('calendar_sync_logs').insert({
      connection_id: connection.id,
      company_id: connection.company_id,
      operation: 'create',
      direction: 'from_google',
      entity_type: 'meeting',
      entity_id: newMeeting.id,
      google_event_id: googleEvent.id,
      status: 'success',
      completed_at: new Date().toISOString(),
    })
  }
}
