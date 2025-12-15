/**
 * Send Push Notification Edge Function
 *
 * Handles sending Web Push notifications to subscribed users.
 * Supports multiple notification types and respects user preferences.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// Types
// ============================================================================

interface PushNotificationPayload {
  user_id: string;
  type: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  url?: string;
  related_to_type?: string;
  related_to_id?: string;
  actions?: Array<{ action: string; title: string; icon?: string }>;
  data?: Record<string, any>;
  require_interaction?: boolean;
  is_critical?: boolean;
}

interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
}

interface PushPreferences {
  enabled: boolean;
  types: {
    rfiResponses: boolean;
    submittalDecisions: boolean;
    dailyReports: boolean;
    punchItems: boolean;
    safetyIncidents: boolean;
    paymentApprovals: boolean;
    scheduleChanges: boolean;
    approvalRequests: boolean;
    tasks: boolean;
    mentions: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
    allowCritical: boolean;
  };
}

interface SendResult {
  success: boolean;
  sent_count: number;
  failed_count: number;
  errors: string[];
  log_ids: string[];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map notification type to preference key
 */
function mapTypeToPreference(type: string): keyof PushPreferences['types'] | null {
  const mapping: Record<string, keyof PushPreferences['types']> = {
    rfi_response: 'rfiResponses',
    rfi_assigned: 'rfiResponses',
    submittal_approved: 'submittalDecisions',
    submittal_rejected: 'submittalDecisions',
    submittal_assigned: 'submittalDecisions',
    daily_report_submitted: 'dailyReports',
    punch_item_assigned: 'punchItems',
    safety_incident: 'safetyIncidents',
    payment_approved: 'paymentApprovals',
    payment_application: 'paymentApprovals',
    schedule_change: 'scheduleChanges',
    approval_request: 'approvalRequests',
    approval_completed: 'approvalRequests',
    task_assigned: 'tasks',
    task_due: 'tasks',
    mention: 'mentions',
    comment: 'mentions',
  };
  return mapping[type] || null;
}

/**
 * Check if notification should be sent based on preferences
 */
function shouldSendNotification(
  preferences: PushPreferences | null,
  type: string,
  isCritical: boolean
): boolean {
  // No preferences = use defaults (send)
  if (!preferences) {
    return true;
  }

  // Push globally disabled
  if (!preferences.enabled) {
    return false;
  }

  // Check quiet hours
  if (preferences.quietHours?.enabled) {
    const inQuietHours = isInQuietHours(
      preferences.quietHours.start,
      preferences.quietHours.end,
      preferences.quietHours.timezone
    );

    if (inQuietHours) {
      // Critical notifications can override quiet hours
      if (isCritical && preferences.quietHours.allowCritical) {
        return true;
      }
      return false;
    }
  }

  // Check type-specific preference
  const prefKey = mapTypeToPreference(type);
  if (prefKey) {
    // Safety incidents always send if critical
    if (prefKey === 'safetyIncidents' && isCritical) {
      return true;
    }
    return preferences.types[prefKey] !== false;
  }

  return true;
}

/**
 * Check if current time is within quiet hours
 */
function isInQuietHours(start: string, end: string, timezone: string): boolean {
  try {
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
    });

    // Handle overnight quiet hours (e.g., 22:00 - 07:00)
    if (start > end) {
      return currentTime >= start || currentTime <= end;
    }

    // Normal range (e.g., 01:00 - 06:00)
    return currentTime >= start && currentTime <= end;
  } catch {
    return false;
  }
}

/**
 * Build Web Push notification payload
 */
function buildPushPayload(notification: PushNotificationPayload): string {
  const payload = {
    title: notification.title,
    body: notification.body,
    icon: notification.icon || '/icons/icon-192x192.png',
    badge: notification.badge || '/icons/badge-72x72.png',
    image: notification.image,
    tag: notification.tag || `jobsight-${notification.type}-${Date.now()}`,
    data: {
      type: notification.type,
      url: notification.url,
      id: notification.related_to_id,
      notificationId: null, // Will be set after logging
      ...notification.data,
    },
    actions: notification.actions || getDefaultActions(notification.type),
    requireInteraction: notification.require_interaction || notification.is_critical,
    renotify: true,
  };

  return JSON.stringify(payload);
}

/**
 * Get default notification actions based on type
 */
function getDefaultActions(type: string): Array<{ action: string; title: string }> {
  switch (type) {
    case 'rfi_response':
    case 'rfi_assigned':
      return [
        { action: 'view', title: 'View RFI' },
        { action: 'reply', title: 'Reply' },
      ];
    case 'safety_incident':
      return [
        { action: 'view', title: 'View Incident' },
        { action: 'acknowledge', title: 'Acknowledge' },
      ];
    case 'approval_request':
      return [
        { action: 'view', title: 'Review' },
      ];
    default:
      return [
        { action: 'view', title: 'View' },
        { action: 'dismiss', title: 'Dismiss' },
      ];
  }
}

/**
 * Send push notification using Web Push protocol
 *
 * Note: In production, this would use VAPID authentication with the keys.
 * The current implementation is simplified and would need a proper web-push
 * library for full VAPID support.
 */
async function sendWebPush(
  subscription: PushSubscription,
  payload: string,
  _vapidPublicKey: string,
  _vapidPrivateKey: string
): Promise<boolean> {
  try {
    // TODO: In production, implement proper VAPID authentication
    // using the vapidPublicKey and vapidPrivateKey parameters.
    // This requires crypto operations to sign the JWT for VAPID.

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Encoding': 'aes128gcm',
        TTL: '86400', // 24 hours
        // In production, add proper VAPID authorization headers:
        // 'Authorization': `vapid t=${jwtToken}, k=${vapidPublicKey}`
      },
      body: payload,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Push failed for ${subscription.endpoint}: ${response.status} - ${errorText}`);

      // Handle specific error codes
      if (response.status === 410 || response.status === 404) {
        // Subscription is no longer valid - mark for cleanup
        console.log(`Subscription ${subscription.id} is no longer valid`);
      }

      return false;
    }

    return true;
  } catch (error) {
    console.error(`Push error for ${subscription.endpoint}:`, error);
    return false;
  }
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get VAPID keys from environment
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys not configured');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Push notifications not configured (missing VAPID keys)',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const payload: PushNotificationPayload = await req.json();

    // Validate required fields
    if (!payload.user_id || !payload.type || !payload.title || !payload.body) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: user_id, type, title, body',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get user's push preferences
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('push_notification_preferences')
      .eq('id', payload.user_id)
      .single();

    if (userError) {
      console.error('Failed to get user preferences:', userError);
    }

    const preferences = userData?.push_notification_preferences as PushPreferences | null;

    // Check if notification should be sent
    if (!shouldSendNotification(preferences, payload.type, payload.is_critical || false)) {
      return new Response(
        JSON.stringify({
          success: true,
          sent_count: 0,
          failed_count: 0,
          errors: [],
          log_ids: [],
          message: 'Notification skipped due to user preferences',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get active subscriptions for user
    const { data: subscriptions, error: subError } = await supabase
      .rpc('get_user_push_subscriptions', { target_user_id: payload.user_id });

    if (subError) {
      console.error('Failed to get subscriptions:', subError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to retrieve push subscriptions',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          sent_count: 0,
          failed_count: 0,
          errors: [],
          log_ids: [],
          message: 'No active push subscriptions for user',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Build push payload
    const pushPayload = buildPushPayload(payload);

    // Send to all subscriptions
    const result: SendResult = {
      success: true,
      sent_count: 0,
      failed_count: 0,
      errors: [],
      log_ids: [],
    };

    for (const subscription of subscriptions) {
      try {
        // Log the notification attempt
        const { data: logData, error: _logError } = await supabase.rpc('log_push_notification', {
          p_subscription_id: subscription.id,
          p_user_id: payload.user_id,
          p_notification_type: payload.type,
          p_title: payload.title,
          p_body: payload.body,
          p_related_to_type: payload.related_to_type,
          p_related_to_id: payload.related_to_id,
          p_payload: payload.data || {},
        });

        const logId = logData;
        if (logId) {
          result.log_ids.push(logId);
        }

        // Send push notification
        const success = await sendWebPush(
          subscription,
          pushPayload,
          vapidPublicKey,
          vapidPrivateKey
        );

        if (success) {
          result.sent_count++;

          // Update log status to sent
          if (logId) {
            await supabase.rpc('update_push_notification_status', {
              p_log_id: logId,
              p_status: 'sent',
            });
          }

          // Mark subscription as used
          await supabase.rpc('mark_push_subscription_used', {
            subscription_id: subscription.id,
          });
        } else {
          result.failed_count++;
          result.errors.push(`Failed to send to subscription ${subscription.id}`);

          // Update log status to failed
          if (logId) {
            await supabase.rpc('update_push_notification_status', {
              p_log_id: logId,
              p_status: 'failed',
              p_error_message: 'Push delivery failed',
            });
          }

          // Increment failure count
          await supabase.rpc('increment_push_failure', {
            subscription_id: subscription.id,
          });
        }
      } catch (error: any) {
        result.failed_count++;
        result.errors.push(`Error for subscription ${subscription.id}: ${error.message}`);
      }
    }

    result.success = result.failed_count === 0;

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 207, // 207 Multi-Status for partial success
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Send push notification error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
