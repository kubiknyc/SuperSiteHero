// Edge Function: Approve User
// Description: Approves a pending user and grants them access to the system
// Authorization: Admin or Owner role required

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Email template generator
function generateApprovalEmail(data: {
  userName: string
  companyName: string
  adminName: string
  loginUrl: string
}): { html: string; text: string; subject: string } {
  const year = new Date().getFullYear()

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${data.companyName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto;">
    <!-- Header -->
    <div style="background-color: #1E40AF; padding: 24px; text-align: center;">
      <div style="color: #ffffff; font-size: 24px; font-weight: bold;">JobSight</div>
    </div>

    <!-- Body -->
    <div style="background-color: #ffffff; padding: 32px 24px;">
      <h1 style="color: #0f172a; font-size: 28px; margin: 0 0 24px 0;">Welcome to ${data.companyName}!</h1>

      <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 16px 0;">Hello ${data.userName},</p>

      <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 24px 0; border-radius: 4px;">
        <p style="margin: 0; color: #15803d; font-weight: 600;">✓ Your access request has been approved!</p>
      </div>

      <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 16px 0;">
        Great news! ${data.adminName} has approved your request to join <strong>${data.companyName}</strong> on JobSight.
        You now have full access to the platform.
      </p>

      <p style="color: #0f172a; font-size: 16px; font-weight: 600; margin: 24px 0 16px 0;">What you can do now:</p>
      <ul style="color: #475569; line-height: 24px; margin: 16px 0 24px 24px;">
        <li>Access all projects and job sites</li>
        <li>Create and manage daily reports</li>
        <li>Track RFIs, submittals, and change orders</li>
        <li>Collaborate with your team</li>
        <li>Monitor safety incidents and compliance</li>
      </ul>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.loginUrl}" style="display: inline-block; background: linear-gradient(to right, #22c55e, #16a34a); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Log In to JobSight
        </a>
      </div>

      <p style="color: #94a3b8; font-size: 14px; line-height: 20px; margin: 24px 0 0 0;">
        If you have any questions about using JobSight, please contact your administrator or our support team.
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
Welcome to ${data.companyName}!

Hello ${data.userName},

✓ Your access request has been approved!

Great news! ${data.adminName} has approved your request to join ${data.companyName} on JobSight.
You now have full access to the platform.

What you can do now:
- Access all projects and job sites
- Create and manage daily reports
- Track RFIs, submittals, and change orders
- Collaborate with your team
- Monitor safety incidents and compliance

Log in to JobSight: ${data.loginUrl}

If you have any questions about using JobSight, please contact your administrator or our support team.

© ${year} JobSight. All rights reserved.
  `.trim()

  return {
    html,
    text,
    subject: `Access Approved - Welcome to ${data.companyName}`,
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { userId } = await req.json()

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

    // Get user to approve
    const { data: userToApprove, error: userError } = await supabaseClient
      .from('users')
      .select('id, email, first_name, last_name, company_id, approval_status')
      .eq('id', userId)
      .is('deleted_at', null)
      .single()

    if (userError || !userToApprove) {
      return new Response(
        JSON.stringify({ error: 'User not found or has been deleted' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Verify user is in same company
    if (userToApprove.company_id !== adminProfile.company_id) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: User is not in your company' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Verify user is pending
    if (userToApprove.approval_status !== 'pending') {
      return new Response(
        JSON.stringify({
          error: `User is not pending approval (current status: ${userToApprove.approval_status})`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Update user status
    const { error: updateError } = await supabaseClient
      .from('users')
      .update({
        approval_status: 'approved',
        is_active: true,
        approved_by: admin.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating user status:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to approve user', details: updateError.message }),
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
      const appUrl = Deno.env.get('APP_URL') || 'https://supersitehero.com'
      const userName = `${userToApprove.first_name || ''} ${userToApprove.last_name || ''}`.trim() || userToApprove.email
      const adminName = `${adminProfile.first_name || ''} ${adminProfile.last_name || ''}`.trim() || 'Company Admin'
      const companyName = company?.name || 'your company'

      const emailContent = generateApprovalEmail({
        userName,
        companyName,
        adminName,
        loginUrl: `${appUrl}/login`,
      })

      await supabaseClient.functions.invoke('send-email', {
        body: {
          to: { email: userToApprove.email, name: userName },
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          template_name: 'user-approved',
          recipient_user_id: userId,
        },
      })
    } catch (emailError) {
      // Log email error but don't fail the approval
      console.error('Failed to send approval email:', emailError)
      // Continue - approval was successful even if email failed
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'User approved successfully',
        userId: userId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Unexpected error in approve-user:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
