/**
 * Supabase Edge Function: outlook-webhook
 *
 * Handle Microsoft Graph webhook notifications for calendar changes
 *
 * This endpoint:
 * 1. Handles webhook validation requests (required by Microsoft)
 * 2. Receives change notifications for calendar events
 * 3. Queues notifications for async processing
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeaders } from '../_shared/microsoft-graph.ts'

/**
 * Microsoft Graph webhook notification structure
 */
interface MSGraphNotification {
  subscriptionId: string
  subscriptionExpirationDateTime: string
  changeType: 'created' | 'updated' | 'deleted'
  resource: string
  resourceData?: {
    '@odata.type': string
    '@odata.id': string
    '@odata.etag'?: string
    id: string
  }
  clientState?: string
  tenantId?: string
}

interface MSGraphWebhookPayload {
  value: MSGraphNotification[]
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const webhookSecret = Deno.env.get('MS_GRAPH_WEBHOOK_SECRET')

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const url = new URL(req.url)

    // Handle webhook validation request (Microsoft sends GET request with validationToken)
    const validationToken = url.searchParams.get('validationToken')
    if (validationToken) {
      console.log('Webhook validation request received')
      // Must return the validation token as plain text
      return new Response(validationToken, {
        headers: { 'Content-Type': 'text/plain' },
        status: 200,
      })
    }

    // Handle notification request (POST)
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    const payload: MSGraphWebhookPayload = await req.json()

    if (!payload.value || !Array.isArray(payload.value)) {
      return new Response('Invalid payload', { status: 400 })
    }

    console.log(`Received ${payload.value.length} webhook notification(s)`)

    // Process each notification
    for (const notification of payload.value) {
      // Validate client state if configured
      if (webhookSecret && notification.clientState !== webhookSecret) {
        console.warn(`Invalid client state for subscription ${notification.subscriptionId}`)
        continue
      }

      // Find the connection associated with this subscription
      const { data: connection } = await supabase
        .from('outlook_calendar_connections')
        .select('id, user_id')
        .eq('webhook_subscription_id', notification.subscriptionId)
        .single()

      if (!connection) {
        console.warn(`No connection found for subscription ${notification.subscriptionId}`)
        continue
      }

      // Extract event ID from resource path (e.g., "users/{id}/events/{event-id}")
      const resourceId = notification.resourceData?.id ||
        notification.resource.split('/').pop() || ''

      // Queue notification for async processing
      const { error: insertError } = await supabase
        .from('outlook_webhook_notifications')
        .insert({
          connection_id: connection.id,
          subscription_id: notification.subscriptionId,
          change_type: notification.changeType,
          resource_id: resourceId,
          resource_data: notification.resourceData || null,
          processed: false,
          received_at: new Date().toISOString(),
        })

      if (insertError) {
        console.error('Failed to queue notification:', insertError)
      } else {
        console.log(`Queued ${notification.changeType} notification for event ${resourceId}`)
      }

      // For immediate processing (optional - can be done via scheduled job instead)
      // This handles the notification synchronously
      try {
        await processNotification(supabase, connection.id, notification)
      } catch (processError) {
        console.error('Error processing notification:', processError)
        // Don't fail the webhook - notification is queued for retry
      }
    }

    // Microsoft expects 202 Accepted for successful webhook processing
    return new Response(null, { status: 202 })
  } catch (error) {
    console.error('outlook-webhook error:', error)

    // Return 202 anyway to prevent Microsoft from retrying
    // Errors are logged and notifications are queued for retry
    return new Response(null, { status: 202 })
  }
})

/**
 * Process a webhook notification
 */
async function processNotification(
  supabase: ReturnType<typeof createClient>,
  connectionId: string,
  notification: MSGraphNotification
): Promise<void> {
  const eventId = notification.resourceData?.id ||
    notification.resource.split('/').pop() || ''

  // Find the mapping for this Outlook event
  const { data: mapping } = await supabase
    .from('outlook_event_mappings')
    .select('*')
    .eq('connection_id', connectionId)
    .eq('outlook_event_id', eventId)
    .maybeSingle()

  if (!mapping) {
    // Event not mapped - could be an event created directly in Outlook
    // For bidirectional sync, we might want to create a local entity
    console.log(`No mapping found for Outlook event ${eventId} - skipping`)
    return
  }

  switch (notification.changeType) {
    case 'created':
      // Event created in Outlook - for bidirectional sync, create local entity
      console.log(`Event created in Outlook: ${eventId}`)
      break

    case 'updated':
      // Event updated in Outlook - check for conflicts and update local entity
      console.log(`Event updated in Outlook: ${eventId}`)

      // Mark mapping as needing sync from Outlook
      await supabase
        .from('outlook_event_mappings')
        .update({
          sync_status: 'pending',
          last_outlook_update: new Date().toISOString(),
        })
        .eq('id', mapping.id)
      break

    case 'deleted':
      // Event deleted in Outlook - optionally delete local entity or just unlink
      console.log(`Event deleted in Outlook: ${eventId}`)

      // Option 1: Delete the mapping (keep local entity)
      await supabase
        .from('outlook_event_mappings')
        .delete()
        .eq('id', mapping.id)

      // Option 2: Mark local entity as deleted (if bidirectional)
      // await supabase.from(mapping.local_entity_type).delete().eq('id', mapping.local_entity_id)
      break
  }

  // Mark notification as processed
  await supabase
    .from('outlook_webhook_notifications')
    .update({
      processed: true,
      processed_at: new Date().toISOString(),
    })
    .eq('subscription_id', notification.subscriptionId)
    .eq('resource_id', eventId)
    .eq('processed', false)
}
