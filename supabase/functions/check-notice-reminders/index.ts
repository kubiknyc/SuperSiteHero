// Supabase Edge Function: check-notice-reminders
// Scheduled function to check for notices needing response reminders
// Runs daily and sends notifications at 7, 3, and 1 day before due date
// Also sends daily reminders for overdue notices

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Types
interface Notice {
  id: string
  project_id: string
  notice_number: string
  subject: string
  notice_type: string
  from_party: string
  response_due_date: string
  is_critical: boolean
  status: string
  created_by: string
}

interface Project {
  id: string
  name: string
}

interface User {
  id: string
  email: string
  full_name?: string
}

interface NotificationResult {
  notices_due_7_days: number
  notices_due_3_days: number
  notices_due_1_day: number
  notices_overdue: number
  notifications_sent: number
  errors: string[]
}

// Email templates (simplified for edge function)
function generateReminderEmail(
  recipientName: string,
  notice: Notice,
  projectName: string,
  daysUntilDue: number,
  appUrl: string
): { subject: string; html: string; text: string } {
  const urgencyColor = daysUntilDue <= 1 ? '#ef4444' : daysUntilDue <= 3 ? '#f59e0b' : '#3b82f6'
  const urgencyLabel = daysUntilDue <= 1 ? 'Due tomorrow!' : `Due in ${daysUntilDue} days`

  const subject = `Notice Response Due in ${daysUntilDue} Day${daysUntilDue !== 1 ? 's' : ''}: ${notice.notice_number}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: ${urgencyColor};">Notice Response Reminder</h1>
      <p>Hi ${recipientName},</p>
      <p>This is a reminder that a response is required for a notice on the <strong>${projectName}</strong> project.</p>

      <div style="background-color: ${daysUntilDue <= 1 ? '#fef2f2' : daysUntilDue <= 3 ? '#fef3c7' : '#eff6ff'}; border: 1px solid ${urgencyColor}; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0; font-size: 14px; color: ${urgencyColor};"><strong>${urgencyLabel}</strong></p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Reference:</strong></td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${notice.notice_number}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Subject:</strong></td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${notice.subject}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Type:</strong></td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${notice.notice_type.replace(/_/g, ' ')}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>From:</strong></td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${notice.from_party}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Response Due:</strong></td>
          <td style="padding: 8px 0; font-weight: bold; color: ${urgencyColor};">${notice.response_due_date}</td>
        </tr>
      </table>

      <p style="text-align: center;">
        <a href="${appUrl}/notices/${notice.id}" style="display: inline-block; padding: 12px 24px; background-color: ${urgencyColor}; color: white; text-decoration: none; border-radius: 6px;">View Notice & Respond</a>
      </p>
    </body>
    </html>
  `

  const text = `
Notice Response Reminder

Hi ${recipientName},

This is a reminder that a response is required for a notice on the ${projectName} project.

${urgencyLabel}

Reference: ${notice.notice_number}
Subject: ${notice.subject}
Type: ${notice.notice_type.replace(/_/g, ' ')}
From: ${notice.from_party}
Response Due: ${notice.response_due_date}

View Notice: ${appUrl}/notices/${notice.id}
  `.trim()

  return { subject, html, text }
}

function generateOverdueEmail(
  recipientName: string,
  notice: Notice,
  projectName: string,
  daysOverdue: number,
  appUrl: string
): { subject: string; html: string; text: string } {
  const subject = `OVERDUE: Notice Response Required - ${notice.notice_number}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #ef4444;">Notice Response Overdue</h1>
      <p>Hi ${recipientName},</p>
      <p>A response to the following notice is <strong style="color: #ef4444;">overdue</strong> on the <strong>${projectName}</strong> project.</p>

      <div style="background-color: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0; font-size: 14px; color: #dc2626;">
          <strong>${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue!</strong> Please respond as soon as possible.
        </p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Reference:</strong></td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${notice.notice_number}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Subject:</strong></td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${notice.subject}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Type:</strong></td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${notice.notice_type.replace(/_/g, ' ')}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>From:</strong></td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${notice.from_party}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Was Due:</strong></td>
          <td style="padding: 8px 0; font-weight: bold; color: #ef4444;">${notice.response_due_date}</td>
        </tr>
      </table>

      <p style="text-align: center;">
        <a href="${appUrl}/notices/${notice.id}" style="display: inline-block; padding: 12px 24px; background-color: #ef4444; color: white; text-decoration: none; border-radius: 6px;">Respond Now</a>
      </p>

      <p style="text-align: center; color: #6b7280; font-size: 12px; margin-top: 16px;">
        You will continue to receive daily reminders until a response is recorded.
      </p>
    </body>
    </html>
  `

  const text = `
Notice Response Overdue

Hi ${recipientName},

A response to the following notice is OVERDUE on the ${projectName} project.

${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue! Please respond as soon as possible.

Reference: ${notice.notice_number}
Subject: ${notice.subject}
Type: ${notice.notice_type.replace(/_/g, ' ')}
From: ${notice.from_party}
Was Due: ${notice.response_due_date}

Respond Now: ${appUrl}/notices/${notice.id}

You will continue to receive daily reminders until a response is recorded.
  `.trim()

  return { subject, html, text }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const result: NotificationResult = {
    notices_due_7_days: 0,
    notices_due_3_days: 0,
    notices_due_1_day: 0,
    notices_overdue: 0,
    notifications_sent: 0,
    errors: [],
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const appUrl = Deno.env.get('APP_URL') || 'https://supersitehero.com'

    // Create Supabase client with service role key (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get today's date and future dates
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const in1Day = new Date(today)
    in1Day.setDate(in1Day.getDate() + 1)

    const in3Days = new Date(today)
    in3Days.setDate(in3Days.getDate() + 3)

    const in7Days = new Date(today)
    in7Days.setDate(in7Days.getDate() + 7)

    // Format dates for query
    const formatDate = (d: Date) => d.toISOString().split('T')[0]

    console.log(`Checking notices for reminders. Today: ${formatDate(today)}`)

    // Query notices needing reminders (pending_response status, not yet responded)
    const { data: notices, error: noticesError } = await supabase
      .from('notices')
      .select('*, projects(name)')
      .eq('status', 'pending_response')
      .not('response_due_date', 'is', null)
      .order('response_due_date', { ascending: true })

    if (noticesError) {
      throw new Error(`Failed to query notices: ${noticesError.message}`)
    }

    if (!notices || notices.length === 0) {
      console.log('No notices requiring reminders found')
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    console.log(`Found ${notices.length} notices pending response`)

    // Categorize notices by reminder type
    const categorizedNotices: {
      due7Days: Notice[]
      due3Days: Notice[]
      due1Day: Notice[]
      overdue: { notice: Notice; daysOverdue: number }[]
    } = {
      due7Days: [],
      due3Days: [],
      due1Day: [],
      overdue: [],
    }

    for (const notice of notices) {
      const dueDate = new Date(notice.response_due_date)
      dueDate.setHours(0, 0, 0, 0)

      const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      if (diffDays < 0) {
        // Overdue
        categorizedNotices.overdue.push({ notice, daysOverdue: Math.abs(diffDays) })
      } else if (diffDays === 1) {
        categorizedNotices.due1Day.push(notice)
      } else if (diffDays === 3) {
        categorizedNotices.due3Days.push(notice)
      } else if (diffDays === 7) {
        categorizedNotices.due7Days.push(notice)
      }
    }

    result.notices_due_7_days = categorizedNotices.due7Days.length
    result.notices_due_3_days = categorizedNotices.due3Days.length
    result.notices_due_1_day = categorizedNotices.due1Day.length
    result.notices_overdue = categorizedNotices.overdue.length

    console.log(`Categorized: 7-day=${result.notices_due_7_days}, 3-day=${result.notices_due_3_days}, 1-day=${result.notices_due_1_day}, overdue=${result.notices_overdue}`)

    // Helper function to send notification
    const sendNotification = async (
      notice: Notice & { projects?: { name: string } },
      type: 'reminder' | 'overdue',
      daysValue: number
    ) => {
      try {
        // Get the user who created the notice (they're responsible for responses to incoming notices)
        const { data: user, error: userError } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .eq('id', notice.created_by)
          .single()

        if (userError || !user) {
          console.warn(`Could not find user for notice ${notice.notice_number}: ${userError?.message}`)
          return
        }

        const projectName = notice.projects?.name || 'Unknown Project'
        const recipientName = user.full_name || user.email.split('@')[0]

        // Generate email content
        let emailContent: { subject: string; html: string; text: string }
        if (type === 'overdue') {
          emailContent = generateOverdueEmail(recipientName, notice, projectName, daysValue, appUrl)
        } else {
          emailContent = generateReminderEmail(recipientName, notice, projectName, daysValue, appUrl)
        }

        // Send email via the send-email edge function
        const { error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            to: { email: user.email, name: user.full_name },
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
            tags: ['notice', type === 'overdue' ? 'overdue' : 'reminder'],
            template_name: type === 'overdue' ? 'notice-overdue' : 'notice-reminder',
            recipient_user_id: user.id,
          },
        })

        if (emailError) {
          result.errors.push(`Failed to send ${type} email for ${notice.notice_number}: ${emailError.message}`)
        } else {
          result.notifications_sent++
          console.log(`Sent ${type} notification for notice ${notice.notice_number} to ${user.email}`)
        }

        // Also create in-app notification
        await supabase.from('notifications').insert({
          user_id: user.id,
          type: type === 'overdue' ? 'notice_overdue' : 'notice_response_due',
          title: type === 'overdue' ? 'Notice Response Overdue' : 'Notice Response Reminder',
          message: type === 'overdue'
            ? `Response is ${daysValue} day${daysValue !== 1 ? 's' : ''} overdue for notice: ${notice.notice_number}`
            : `Response due in ${daysValue} day${daysValue !== 1 ? 's' : ''} for notice: ${notice.notice_number}`,
          related_to_id: notice.id,
          related_to_type: 'notice',
          is_read: false,
        })
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        result.errors.push(`Error processing notice ${notice.notice_number}: ${errorMsg}`)
        console.error(`Error processing notice ${notice.notice_number}:`, error)
      }
    }

    // Send notifications for each category
    for (const notice of categorizedNotices.due7Days) {
      await sendNotification(notice, 'reminder', 7)
    }

    for (const notice of categorizedNotices.due3Days) {
      await sendNotification(notice, 'reminder', 3)
    }

    for (const notice of categorizedNotices.due1Day) {
      await sendNotification(notice, 'reminder', 1)
    }

    for (const { notice, daysOverdue } of categorizedNotices.overdue) {
      await sendNotification(notice, 'overdue', daysOverdue)
    }

    console.log(`Completed. Sent ${result.notifications_sent} notifications. Errors: ${result.errors.length}`)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Check notice reminders error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    result.errors.push(errorMessage)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
