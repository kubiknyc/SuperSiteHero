// Edge Function: Reject User
// Description: Rejects a pending user and denies them access to the system
// Authorization: Admin or Owner role required

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Email template generator
function generateRejectionEmail(data: {
  userName: string
  companyName: string
  reason?: string
}): { html: string; text: string; subject: string } {
  const year = new Date().getFullYear()
  const supportEmail = 'support@jobsightapp.com'

  const reasonSection = data.reason
    ? `
    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px 0; color: #b91c1c; font-weight: 600;">Reason provided:</p>
      <p style="margin: 0; color: #7f1d1d;">${data.reason}</p>
    </div>
    `
    : ''

  const reasonTextSection = data.reason
    ? `
Reason provided:
${data.reason}
    `
    : ''

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Access Request Update</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto;">
    <!-- Header -->
    <div style="background-color: #1E40AF; padding: 24px; text-align: center;">
      <div style="color: #ffffff; font-size: 24px; font-weight: bold;">JobSight</div>
    </div>

    <!-- Body -->
    <div style="background-color: #ffffff; padding: 32px 24px;">
      <h1 style="color: #0f172a; font-size: 28px; margin: 0 0 24px 0;">Access Request Update</h1>

      <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 16px 0;">Hello ${data.userName},</p>

      <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 16px 0;">
        We're writing to let you know that your request to join <strong>${data.companyName}</strong> on JobSight
        was not approved at this time.
      </p>

      ${reasonSection}

      <p style="color: #0f172a; font-size: 16px; font-weight: 600; margin: 24px 0 16px 0;">What happens next?</p>
      <ul style="color: #475569; line-height: 24px; margin: 16px 0 24px 24px;">
        <li>If you believe this was a mistake, please contact ${data.companyName} directly</li>
        <li>You can request access to a different company by registering again</li>
        <li>If you need assistance, our support team is here to help</li>
      </ul>

      <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 24px 0;">
        If you have questions about this decision or need to reach your company administrator,
        please contact <a href="mailto:${supportEmail}" style="color: #F97316; text-decoration: none;">${supportEmail}</a>.
      </p>

      <p style="color: #94a3b8; font-size: 14px; line-height: 20px; margin: 24px 0 0 0;">
        Thank you for your interest in JobSight. We hope to work with you in the future.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 24px; text-align: center; color: #64748b; font-size: 14px;">
      <p style="margin: 0 0 8px 0;">&copy; ${year} JobSight. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim()

  const text = `
Access Request Update

Hello ${data.userName},

We're writing to let you know that your request to join ${data.companyName} on JobSight
was not approved at this time.
${reasonTextSection}
What happens next?
- If you believe this was a mistake, please contact ${data.companyName} directly
- You can request access to a different company by registering again
- If you need assistance, our support team is here to help

If you have questions about this decision or need to reach your company administrator,
please contact ${supportEmail}.

Thank you for your interest in JobSight. We hope to work with you in the future.

© ${year} JobSight. All rights reserved.
  `.trim()

  return {
    html,
    text,
    subject: `Access Request Update - ${data.companyName}`,
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { userId, reason } = await req.json()

    // Validate input
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Create Supabase client with user's JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
      }
    )

    // Get current user (admin)
    const {
      data: { user: admin },
      error: adminError,
    } = await supabaseClient.auth.getUser()

    if (adminError || !admin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get admin's profile
    const { data: adminProfile, error: adminProfileError } = await supabaseClient
      .from('users')
      .select('company_id, role, first_name, last_name, is_active')
      .eq('id', admin.id)
      .single()

    if (adminProfileError || !adminProfile) {
      return new Response(
        JSON.stringify({ error: 'Admin profile not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Check if admin is active
    if (!adminProfile.is_active) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin account is not active' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Check if admin has permission
    if (!['owner', 'admin'].includes(adminProfile.role)) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin or owner role required' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get user to reject
    const { data: userToReject, error: userError } = await supabaseClient
      .from('users')
      .select('id, email, first_name, last_name, company_id, approval_status')
      .eq('id', userId)
      .is('deleted_at', null)
      .single()

    if (userError || !userToReject) {
      return new Response(
        JSON.stringify({ error: 'User not found or has been deleted' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Verify user is in same company
    if (userToReject.company_id !== adminProfile.company_id) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: User is not in your company' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Verify user is pending
    if (userToReject.approval_status !== 'pending') {
      return new Response(
        JSON.stringify({
          error: `User is not pending approval (current status: ${userToReject.approval_status})`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Update user status to rejected
    const { error: updateError } = await supabaseClient
      .from('users')
      .update({
        approval_status: 'rejected',
        is_active: false,
        rejected_by: admin.id,
        rejected_at: new Date().toISOString(),
        rejection_reason: reason || null,
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating user status:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to reject user', details: updateError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get company name for email
    const { data: company } = await supabaseClient
      .from('companies')
      .select('name')
      .eq('id', adminProfile.company_id)
      .single()

    // Send email notification to user
    try {
      const userName = `${userToReject.first_name || ''} ${userToReject.last_name || ''}`.trim() || userToReject.email
      const companyName = company?.name || 'the company'

      const emailContent = generateRejectionEmail({
        userName,
        companyName,
        reason: reason || undefined,
      })

      await supabaseClient.functions.invoke('send-email', {
        body: {
          to: { email: userToReject.email, name: userName },
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          template_name: 'user-rejected',
          recipient_user_id: userId,
        },
      })
    } catch (emailError) {
      // Log email error but don't fail the rejection
      console.error('Failed to send rejection email:', emailError)
      // Continue - rejection was successful even if email failed
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'User rejected successfully',
        userId: userId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Unexpected error in reject-user:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
