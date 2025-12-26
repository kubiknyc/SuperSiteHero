/**
 * Send Push Notification Edge Function
 *
 * Handles sending Web Push notifications to subscribed users.
 * Supports multiple notification types and respects user preferences.
 * Uses proper VAPID authentication for Web Push protocol compliance.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encode as base64UrlEncode } from 'https://deno.land/std@0.168.0/encoding/base64url.ts';
import { decode as base64Decode } from 'https://deno.land/std@0.168.0/encoding/base64.ts';

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
// VAPID Authentication Helpers
// ============================================================================

/**
 * Convert a URL-safe base64 string to a Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  return base64Decode(base64);
}

/**
 * Convert Uint8Array to URL-safe base64 string
 */
function uint8ArrayToBase64Url(array: Uint8Array): string {
  return base64UrlEncode(array);
}

/**
 * Create a VAPID JWT token for Web Push authentication
 */
async function createVapidJwt(
  audience: string,
  subject: string,
  vapidPrivateKey: string,
  expiration: number
): Promise<string> {
  // JWT Header
  const header = {
    typ: 'JWT',
    alg: 'ES256',
  };

  // JWT Payload
  const payload = {
    aud: audience,
    exp: expiration,
    sub: subject,
  };

  const headerB64 = uint8ArrayToBase64Url(
    new TextEncoder().encode(JSON.stringify(header))
  );
  const payloadB64 = uint8ArrayToBase64Url(
    new TextEncoder().encode(JSON.stringify(payload))
  );

  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import the VAPID private key for signing
  const privateKeyBytes = urlBase64ToUint8Array(vapidPrivateKey);

  // For ES256, we need to construct the proper JWK
  // The private key is 32 bytes (256 bits) for P-256
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    privateKeyBytes,
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    false,
    ['sign']
  ).catch(async () => {
    // If raw import fails, try as PKCS8 or JWK format
    // Construct JWK from the raw private key (d) and derive public key
    const jwk = {
      kty: 'EC',
      crv: 'P-256',
      d: vapidPrivateKey,
      // We need x and y for a complete JWK - derive from private key
      x: '', // Will be populated
      y: '', // Will be populated
    };

    // Generate a temporary key pair to get proper format
    const keyPair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify']
    );

    const exportedPrivate = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
    jwk.x = exportedPrivate.x!;
    jwk.y = exportedPrivate.y!;

    return crypto.subtle.importKey(
      'jwk',
      { ...jwk, d: vapidPrivateKey },
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );
  });

  // Sign the token
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert signature from DER to raw format (r || s)
  const signatureB64 = uint8ArrayToBase64Url(new Uint8Array(signature));

  return `${unsignedToken}.${signatureB64}`;
}

/**
 * Encrypt the push notification payload using the subscription's public key
 * This implements the Web Push encryption scheme (aes128gcm)
 */
async function encryptPayload(
  payload: string,
  p256dhKey: string,
  authKey: string
): Promise<{ encrypted: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  // Export local public key
  const localPublicKeyRaw = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);
  const localPublicKey = new Uint8Array(localPublicKeyRaw);

  // Import subscriber's public key
  const subscriberPublicKeyBytes = urlBase64ToUint8Array(p256dhKey);
  const subscriberPublicKey = await crypto.subtle.importKey(
    'raw',
    subscriberPublicKeyBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // Derive shared secret
  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: subscriberPublicKey },
    localKeyPair.privateKey,
    256
  );
  const sharedSecret = new Uint8Array(sharedSecretBits);

  // Import auth key
  const authKeyBytes = urlBase64ToUint8Array(authKey);

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Derive encryption key using HKDF
  // PRK = HKDF-Extract(auth, sharedSecret)
  const prkKey = await crypto.subtle.importKey(
    'raw',
    authKeyBytes,
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );

  // Build info for the IKM
  const authInfo = new TextEncoder().encode('WebPush: info\0');
  const ikmInfo = new Uint8Array([
    ...authInfo,
    ...subscriberPublicKeyBytes,
    ...localPublicKey,
  ]);

  // Import shared secret for HKDF
  const sharedSecretKey = await crypto.subtle.importKey(
    'raw',
    sharedSecret,
    'HKDF',
    false,
    ['deriveBits']
  );

  // Derive IKM
  const ikm = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: authKeyBytes,
      info: ikmInfo,
    },
    sharedSecretKey,
    256
  );

  // Import IKM for final key derivation
  const ikmKey = await crypto.subtle.importKey(
    'raw',
    ikm,
    'HKDF',
    false,
    ['deriveBits']
  );

  // Derive content encryption key (CEK)
  const cekInfo = new TextEncoder().encode('Content-Encoding: aes128gcm\0');
  const cekBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt,
      info: cekInfo,
    },
    ikmKey,
    128
  );

  // Derive nonce
  const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\0');
  const nonceBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt,
      info: nonceInfo,
    },
    ikmKey,
    96
  );

  // Import CEK for AES-GCM
  const cek = await crypto.subtle.importKey(
    'raw',
    cekBits,
    'AES-GCM',
    false,
    ['encrypt']
  );

  // Add padding delimiter to payload
  const payloadBytes = new TextEncoder().encode(payload);
  const paddedPayload = new Uint8Array(payloadBytes.length + 1);
  paddedPayload.set(payloadBytes);
  paddedPayload[payloadBytes.length] = 2; // Padding delimiter

  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonceBits },
    cek,
    paddedPayload
  );

  return {
    encrypted: new Uint8Array(encrypted),
    salt,
    localPublicKey,
  };
}

/**
 * Build the aes128gcm encrypted body for Web Push
 */
function buildAes128gcmBody(
  encrypted: Uint8Array,
  salt: Uint8Array,
  localPublicKey: Uint8Array
): Uint8Array {
  // Record size (4 bytes) - we use 4096 as the default
  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096, false);

  // Key ID length (1 byte) - 65 for uncompressed P-256 public key
  const keyIdLength = new Uint8Array([65]);

  // Build the body: salt (16) + record size (4) + key id length (1) + key id (65) + ciphertext
  const body = new Uint8Array(
    salt.length + recordSize.length + keyIdLength.length + localPublicKey.length + encrypted.length
  );

  let offset = 0;
  body.set(salt, offset);
  offset += salt.length;
  body.set(recordSize, offset);
  offset += recordSize.length;
  body.set(keyIdLength, offset);
  offset += keyIdLength.length;
  body.set(localPublicKey, offset);
  offset += localPublicKey.length;
  body.set(encrypted, offset);

  return body;
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
 * Send push notification using Web Push protocol with proper VAPID authentication
 *
 * Implements RFC 8030 (Generic Event Delivery Using HTTP Push) and
 * RFC 8292 (Voluntary Application Server Identification for Web Push)
 */
async function sendWebPush(
  subscription: PushSubscription,
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string = 'mailto:support@jobsight.co'
): Promise<boolean> {
  try {
    // Extract the origin from the endpoint for the VAPID audience
    const endpointUrl = new URL(subscription.endpoint);
    const audience = endpointUrl.origin;

    // Create VAPID JWT token (valid for 12 hours)
    const expiration = Math.floor(Date.now() / 1000) + (12 * 60 * 60);
    const vapidToken = await createVapidJwt(
      audience,
      vapidSubject,
      vapidPrivateKey,
      expiration
    );

    // Encrypt the payload using the subscription's keys
    const { encrypted, salt, localPublicKey } = await encryptPayload(
      payload,
      subscription.p256dh_key,
      subscription.auth_key
    );

    // Build the encrypted body in aes128gcm format
    const body = buildAes128gcmBody(encrypted, salt, localPublicKey);

    // Send the push notification with proper VAPID headers
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'Content-Length': body.length.toString(),
        'TTL': '86400', // 24 hours
        'Urgency': 'normal',
        'Authorization': `vapid t=${vapidToken}, k=${vapidPublicKey}`,
      },
      body: body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Push failed for ${subscription.endpoint}: ${response.status} - ${errorText}`);

      // Handle specific error codes per RFC 8030
      if (response.status === 410 || response.status === 404) {
        // 410 Gone or 404 Not Found: Subscription is no longer valid
        console.log(`Subscription ${subscription.id} is no longer valid - should be removed`);
      } else if (response.status === 413) {
        // 413 Payload Too Large
        console.error(`Payload too large for subscription ${subscription.id}`);
      } else if (response.status === 429) {
        // 429 Too Many Requests - rate limited
        console.warn(`Rate limited for subscription ${subscription.id}`);
      }

      return false;
    }

    // 201 Created indicates successful delivery to the push service
    return response.status === 201 || response.status === 200;
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

    // Get VAPID configuration from environment
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:support@jobsight.co';

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

        // Send push notification with VAPID authentication
        const success = await sendWebPush(
          subscription,
          pushPayload,
          vapidPublicKey,
          vapidPrivateKey,
          vapidSubject
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
