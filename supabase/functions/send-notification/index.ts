/**
 * Send Notification Edge Function
 * Handles multi-channel notifications: email and in-app
 * Push notifications are deferred for future implementation
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Notification payload interface
interface NotificationPayload {
  user_id: string;
  type: string;
  title: string;
  message: string;
  channels: ('email' | 'in_app' | 'push')[];
  related_to_type?: string;
  related_to_id?: string;
  action_url?: string;
  metadata?: Record<string, any>;
  email_template?: string;
}

// Response interface
interface NotificationResult {
  success: boolean;
  channels: {
    in_app?: { success: boolean; notification_id?: string; error?: string };
    email?: { success: boolean; error?: string };
    push?: { success: boolean; error?: string };
  };
}

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

    // Parse request body
    const payload: NotificationPayload = await req.json();

    // Validate required fields
    if (!payload.user_id || !payload.type || !payload.title || !payload.message) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: user_id, type, title, message',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Default to in_app if no channels specified
    const channels = payload.channels || ['in_app'];
    const result: NotificationResult = { success: true, channels: {} };

    // Process each channel
    for (const channel of channels) {
      switch (channel) {
        case 'in_app':
          result.channels.in_app = await sendInAppNotification(supabase, payload);
          break;

        case 'email':
          result.channels.email = await sendEmailNotification(supabase, supabaseUrl, payload);
          break;

        case 'push':
          // Push notifications deferred for later implementation
          result.channels.push = {
            success: false,
            error: 'Push notifications not yet implemented',
          };
          break;

        default:
          console.warn(`Unknown notification channel: ${channel}`);
      }
    }

    // Check if any channel failed
    const hasFailure = Object.values(result.channels).some(
      (ch) => ch && !ch.success
    );
    result.success = !hasFailure;

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 207, // 207 Multi-Status for partial success
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Send notification error:', error);

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

/**
 * Send in-app notification by inserting into notifications table
 */
async function sendInAppNotification(
  supabase: any,
  payload: NotificationPayload
): Promise<{ success: boolean; notification_id?: string; error?: string }> {
  try {
    const { data, error } = await supabase.from('notifications').insert({
      user_id: payload.user_id,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      related_to_type: payload.related_to_type || null,
      related_to_id: payload.related_to_id || null,
      action_url: payload.action_url || null,
      metadata: payload.metadata || {},
      is_read: false,
    }).select('id').single();

    if (error) {
      console.error('In-app notification error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, notification_id: data.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Send email notification by calling the existing send-email Edge Function
 */
async function sendEmailNotification(
  supabase: any,
  supabaseUrl: string,
  payload: NotificationPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get user email from user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', payload.user_id)
      .single();

    if (userError || !userData?.email) {
      return {
        success: false,
        error: userError?.message || 'User email not found',
      };
    }

    // Call the existing send-email Edge Function
    const emailPayload = {
      to: userData.email,
      subject: payload.title,
      template: payload.email_template || 'notification',
      data: {
        title: payload.title,
        message: payload.message,
        recipient_name: userData.full_name || 'User',
        action_url: payload.action_url,
        type: payload.type,
        ...payload.metadata,
      },
    };

    // Call send-email function
    const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify(emailPayload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `Email service error: ${response.status}`,
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Email notification error:', error);
    return { success: false, error: error.message };
  }
}
