// Supabase Edge Function: action-item-alerts
// Scheduled function to check for action items needing due date alerts
// Runs daily and sends notifications at 7, 3, and 1 day before due date
// Also sends daily reminders for overdue action items and handles escalation

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Types
interface ActionItem {
  id: string
  meeting_id: string
  title: string
  description: string | null
  assigned_to: string
  due_date: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  status: string
  category: string | null
  escalation_level: number
  carryover_count: number
  created_by: string
  created_at: string
  meetings?: {
    id: string
    title: string
    meeting_date: string
    project_id: string
    projects?: {
      id: string
      name: string
    }
  }
}

interface User {
  id: string
  email: string
  full_name: string | null
}

interface NotificationResult {
  items_due_7_days: number
  items_due_3_days: number
  items_due_1_day: number
  items_overdue: number
  items_escalated: number
  notifications_sent: number
  errors: string[]
}

// Priority colors
const PRIORITY_COLORS: Record<string, string> = {
  low: '#22c55e',
  normal: '#3b82f6',
  high: '#f59e0b',
  urgent: '#ef4444',
}

// Email template for due reminder
function generateDueReminderEmail(
  recipientName: string,
  actionItem: ActionItem,
  projectName: string,
  meetingTitle: string,
  daysUntilDue: number,
  appUrl: string
): { subject: string; html: string; text: string } {
  const urgencyColor = daysUntilDue <= 1 ? '#ef4444' : daysUntilDue <= 3 ? '#f59e0b' : '#3b82f6'
  const priorityColor = PRIORITY_COLORS[actionItem.priority] || PRIORITY_COLORS.normal
  const urgencyText = daysUntilDue === 0 ? 'Due Today!' : daysUntilDue === 1 ? 'Due Tomorrow!' : `Due in ${daysUntilDue} days`

  const subject = `Action Item ${urgencyText}: ${actionItem.title}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: ${urgencyColor};">Action Item Reminder: ${urgencyText}</h1>
      <p>Hi ${recipientName},</p>
      <p>This is a reminder about an action item assigned to you that is <strong style="color: ${urgencyColor};">${urgencyText.toLowerCase()}</strong>.</p>

      <div style="background-color: ${daysUntilDue <= 1 ? '#fef2f2' : daysUntilDue <= 3 ? '#fef3c7' : '#eff6ff'}; border-left: 4px solid ${urgencyColor}; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0;"><strong>Action Item:</strong></td>
            <td style="padding: 8px 0;">${actionItem.title}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Project:</strong></td>
            <td style="padding: 8px 0;">${projectName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Meeting:</strong></td>
            <td style="padding: 8px 0;">${meetingTitle}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Due Date:</strong></td>
            <td style="padding: 8px 0; font-weight: bold; color: ${urgencyColor};">${actionItem.due_date}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Priority:</strong></td>
            <td style="padding: 8px 0;">
              <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background-color: ${priorityColor}; color: white; font-size: 12px; text-transform: uppercase;">
                ${actionItem.priority}
              </span>
            </td>
          </tr>
          ${actionItem.category ? `
          <tr>
            <td style="padding: 8px 0;"><strong>Category:</strong></td>
            <td style="padding: 8px 0;">${actionItem.category}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      ${actionItem.description ? `
      <div style="margin-top: 16px; padding: 16px; background-color: #f9fafb; border-radius: 8px;">
        <p style="margin: 0 0 8px 0;"><strong>Description:</strong></p>
        <p style="margin: 0; white-space: pre-wrap;">${actionItem.description}</p>
      </div>
      ` : ''}

      <p style="text-align: center; margin-top: 24px;">
        <a href="${appUrl}/meetings/${actionItem.meeting_id}/action-items/${actionItem.id}" style="display: inline-block; padding: 12px 24px; background-color: ${urgencyColor}; color: white; text-decoration: none; border-radius: 6px;">Complete Action Item</a>
      </p>
    </body>
    </html>
  `

  const text = `
Action Item Reminder: ${urgencyText}

Hi ${recipientName},

This is a reminder about an action item assigned to you that is ${urgencyText.toLowerCase()}.

Action Item: ${actionItem.title}
Project: ${projectName}
Meeting: ${meetingTitle}
Due Date: ${actionItem.due_date}
Priority: ${actionItem.priority}
${actionItem.category ? `Category: ${actionItem.category}` : ''}
${actionItem.description ? `\nDescription:\n${actionItem.description}` : ''}

Complete Action Item: ${appUrl}/meetings/${actionItem.meeting_id}/action-items/${actionItem.id}
  `.trim()

  return { subject, html, text }
}

// Email template for overdue
function generateOverdueEmail(
  recipientName: string,
  actionItem: ActionItem,
  projectName: string,
  meetingTitle: string,
  daysOverdue: number,
  appUrl: string
): { subject: string; html: string; text: string } {
  const overdueText = daysOverdue === 1 ? '1 day overdue' : `${daysOverdue} days overdue`
  const priorityColor = PRIORITY_COLORS[actionItem.priority] || PRIORITY_COLORS.normal

  const escalationWarning = actionItem.escalation_level > 0
    ? `<p style="color: #9333ea; font-weight: bold;">This action item has been escalated (Level ${actionItem.escalation_level}).</p>`
    : daysOverdue >= 3
    ? `<p style="color: #ef4444;">This item will be escalated if not completed soon.</p>`
    : ''

  const subject = `OVERDUE: ${actionItem.title} - ${overdueText}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #ef4444;">Action Item Overdue</h1>
      <p>Hi ${recipientName},</p>
      <p>An action item assigned to you is now <strong style="color: #ef4444;">${overdueText}</strong>. Please complete this item as soon as possible.</p>

      ${escalationWarning}

      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0;"><strong>Action Item:</strong></td>
            <td style="padding: 8px 0;">${actionItem.title}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Project:</strong></td>
            <td style="padding: 8px 0;">${projectName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Meeting:</strong></td>
            <td style="padding: 8px 0;">${meetingTitle}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Was Due:</strong></td>
            <td style="padding: 8px 0; font-weight: bold; color: #ef4444;">${actionItem.due_date}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Overdue:</strong></td>
            <td style="padding: 8px 0; font-weight: bold; color: #ef4444;">${overdueText}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Priority:</strong></td>
            <td style="padding: 8px 0;">
              <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background-color: ${priorityColor}; color: white; font-size: 12px; text-transform: uppercase;">
                ${actionItem.priority}
              </span>
            </td>
          </tr>
        </table>
      </div>

      <p style="text-align: center; margin-top: 24px;">
        <a href="${appUrl}/meetings/${actionItem.meeting_id}/action-items/${actionItem.id}" style="display: inline-block; padding: 12px 24px; background-color: #ef4444; color: white; text-decoration: none; border-radius: 6px;">Complete Now</a>
      </p>

      <p style="text-align: center; color: #6b7280; font-size: 12px; margin-top: 16px;">
        If you cannot complete this item, please update the status or request a deadline extension.
      </p>
    </body>
    </html>
  `

  const text = `
Action Item Overdue

Hi ${recipientName},

An action item assigned to you is now ${overdueText}. Please complete this item as soon as possible.

${actionItem.escalation_level > 0 ? `This action item has been escalated (Level ${actionItem.escalation_level}).` : ''}

Action Item: ${actionItem.title}
Project: ${projectName}
Meeting: ${meetingTitle}
Was Due: ${actionItem.due_date}
Overdue: ${overdueText}
Priority: ${actionItem.priority}

Complete Now: ${appUrl}/meetings/${actionItem.meeting_id}/action-items/${actionItem.id}

If you cannot complete this item, please update the status or request a deadline extension.
  `.trim()

  return { subject, html, text }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const result: NotificationResult = {
    items_due_7_days: 0,
    items_due_3_days: 0,
    items_due_1_day: 0,
    items_overdue: 0,
    items_escalated: 0,
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

    // Get today's date
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const formatDate = (d: Date) => d.toISOString().split('T')[0]

    console.log(`Checking action items for alerts. Today: ${formatDate(today)}`)

    // Query action items needing alerts (open/in_progress status with due dates)
    const { data: actionItems, error: itemsError } = await supabase
      .from('meeting_action_items')
      .select(`
        *,
        meetings!inner(
          id,
          title,
          meeting_date,
          project_id,
          projects(id, name)
        )
      `)
      .in('status', ['open', 'in_progress'])
      .not('due_date', 'is', null)
      .order('due_date', { ascending: true })

    if (itemsError) {
      throw new Error(`Failed to query action items: ${itemsError.message}`)
    }

    if (!actionItems || actionItems.length === 0) {
      console.log('No action items requiring alerts found')
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    console.log(`Found ${actionItems.length} open action items with due dates`)

    // Categorize action items by reminder type
    const categorizedItems: {
      due7Days: ActionItem[]
      due3Days: ActionItem[]
      due1Day: ActionItem[]
      overdue: { item: ActionItem; daysOverdue: number }[]
      toEscalate: { item: ActionItem; daysOverdue: number }[]
    } = {
      due7Days: [],
      due3Days: [],
      due1Day: [],
      overdue: [],
      toEscalate: [],
    }

    for (const item of actionItems) {
      const dueDate = new Date(item.due_date)
      dueDate.setHours(0, 0, 0, 0)

      const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      if (diffDays < 0) {
        // Overdue
        const daysOverdue = Math.abs(diffDays)
        categorizedItems.overdue.push({ item, daysOverdue })

        // Check for escalation (after 3, 7, 14 days overdue)
        if ((daysOverdue === 3 && item.escalation_level === 0) ||
            (daysOverdue === 7 && item.escalation_level === 1) ||
            (daysOverdue === 14 && item.escalation_level === 2)) {
          categorizedItems.toEscalate.push({ item, daysOverdue })
        }
      } else if (diffDays === 0) {
        categorizedItems.due1Day.push(item) // Due today
      } else if (diffDays === 1) {
        categorizedItems.due1Day.push(item)
      } else if (diffDays === 3) {
        categorizedItems.due3Days.push(item)
      } else if (diffDays === 7) {
        categorizedItems.due7Days.push(item)
      }
    }

    result.items_due_7_days = categorizedItems.due7Days.length
    result.items_due_3_days = categorizedItems.due3Days.length
    result.items_due_1_day = categorizedItems.due1Day.length
    result.items_overdue = categorizedItems.overdue.length
    result.items_escalated = categorizedItems.toEscalate.length

    console.log(`Categorized: 7-day=${result.items_due_7_days}, 3-day=${result.items_due_3_days}, 1-day=${result.items_due_1_day}, overdue=${result.items_overdue}, to-escalate=${result.items_escalated}`)

    // Helper function to get user
    const getUser = async (userId: string): Promise<User | null> => {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('id', userId)
        .single()

      if (error || !data) {return null}
      return data
    }

    // Helper function to send notification
    const sendNotification = async (
      item: ActionItem,
      type: 'reminder' | 'overdue',
      daysValue: number
    ) => {
      try {
        const user = await getUser(item.assigned_to)
        if (!user) {
          console.warn(`Could not find user for action item ${item.id}`)
          return
        }

        const projectName = item.meetings?.projects?.name || 'Unknown Project'
        const meetingTitle = item.meetings?.title || 'Unknown Meeting'
        const recipientName = user.full_name || user.email.split('@')[0]

        // Generate email content
        let emailContent: { subject: string; html: string; text: string }
        if (type === 'overdue') {
          emailContent = generateOverdueEmail(recipientName, item, projectName, meetingTitle, daysValue, appUrl)
        } else {
          emailContent = generateDueReminderEmail(recipientName, item, projectName, meetingTitle, daysValue, appUrl)
        }

        // Send email via the send-email edge function
        const { error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            to: { email: user.email, name: user.full_name },
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
            tags: ['action-item', type === 'overdue' ? 'overdue' : 'reminder'],
            template_name: type === 'overdue' ? 'action-item-overdue' : 'action-item-reminder',
            recipient_user_id: user.id,
          },
        })

        if (emailError) {
          result.errors.push(`Failed to send ${type} email for item ${item.id}: ${emailError.message}`)
        } else {
          result.notifications_sent++
          console.log(`Sent ${type} notification for action item ${item.id} to ${user.email}`)
        }

        // Also create in-app notification
        await supabase.from('notifications').insert({
          user_id: user.id,
          type: type === 'overdue' ? 'action_item_overdue' : 'action_item_due',
          title: type === 'overdue' ? 'Action Item Overdue' : 'Action Item Due Soon',
          message: type === 'overdue'
            ? `Action item "${item.title}" is ${daysValue} day${daysValue !== 1 ? 's' : ''} overdue`
            : daysValue === 0
            ? `Action item "${item.title}" is due today`
            : `Action item "${item.title}" is due in ${daysValue} day${daysValue !== 1 ? 's' : ''}`,
          related_to_id: item.id,
          related_to_type: 'action_item',
          is_read: false,
        })
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        result.errors.push(`Error processing action item ${item.id}: ${errorMsg}`)
        console.error(`Error processing action item ${item.id}:`, error)
      }
    }

    // Helper function to escalate item
    const escalateItem = async (item: ActionItem, daysOverdue: number) => {
      try {
        const newLevel = item.escalation_level + 1

        // Update escalation level
        const { error: updateError } = await supabase
          .from('meeting_action_items')
          .update({
            escalation_level: newLevel,
            escalated_at: new Date().toISOString(),
          })
          .eq('id', item.id)

        if (updateError) {
          result.errors.push(`Failed to escalate item ${item.id}: ${updateError.message}`)
          return
        }

        console.log(`Escalated action item ${item.id} to level ${newLevel}`)

        // Get meeting creator/manager to notify
        const { data: meeting } = await supabase
          .from('meetings')
          .select('created_by')
          .eq('id', item.meeting_id)
          .single()

        if (meeting?.created_by && meeting.created_by !== item.assigned_to) {
          const manager = await getUser(meeting.created_by)
          if (manager) {
            // Send escalation notification to manager
            await supabase.from('notifications').insert({
              user_id: manager.id,
              type: 'action_item_escalated',
              title: 'Action Item Escalated',
              message: `Action item "${item.title}" has been escalated to Level ${newLevel} after being ${daysOverdue} days overdue`,
              related_to_id: item.id,
              related_to_type: 'action_item',
              is_read: false,
            })
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        result.errors.push(`Error escalating action item ${item.id}: ${errorMsg}`)
        console.error(`Error escalating action item ${item.id}:`, error)
      }
    }

    // Send notifications for each category
    for (const item of categorizedItems.due7Days) {
      await sendNotification(item, 'reminder', 7)
    }

    for (const item of categorizedItems.due3Days) {
      await sendNotification(item, 'reminder', 3)
    }

    for (const item of categorizedItems.due1Day) {
      const dueDate = new Date(item.due_date)
      dueDate.setHours(0, 0, 0, 0)
      const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      await sendNotification(item, 'reminder', daysUntil)
    }

    for (const { item, daysOverdue } of categorizedItems.overdue) {
      await sendNotification(item, 'overdue', daysOverdue)
    }

    // Process escalations
    for (const { item, daysOverdue } of categorizedItems.toEscalate) {
      await escalateItem(item, daysOverdue)
    }

    console.log(`Completed. Sent ${result.notifications_sent} notifications. Errors: ${result.errors.length}`)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Check action item alerts error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    result.errors.push(errorMessage)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
