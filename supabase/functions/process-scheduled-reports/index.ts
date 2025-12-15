// Supabase Edge Function: process-scheduled-reports
// Processes due scheduled reports and sends them via email
// Run this on a cron schedule (e.g., every 15 minutes)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Types
interface ScheduledReport {
  id: string
  template_id: string
  company_id: string
  name: string
  description: string | null
  frequency: string
  day_of_week: number | null
  day_of_month: number | null
  time_of_day: string
  timezone: string
  output_format: string
  recipients: string[]
  email_subject: string | null
  email_body: string | null
  project_id: string | null
  is_active: boolean
  last_run_at: string | null
  next_run_at: string | null
  created_by: string | null
  template?: {
    id: string
    name: string
    data_source: string
    configuration: Record<string, unknown>
  }
  project?: {
    id: string
    name: string
  }
  company?: {
    id: string
    name: string
  }
}

interface ProcessResult {
  total_due: number
  processed: number
  succeeded: number
  failed: number
  skipped: number
  details: Array<{
    schedule_id: string
    schedule_name: string
    status: 'success' | 'failed' | 'skipped'
    message: string
    recipients_sent?: number
  }>
  errors: string[]
}

// Generate email HTML for report delivery
function generateReportEmail(
  scheduleName: string,
  templateName: string,
  projectName: string | null,
  frequency: string,
  customBody: string | null,
  appUrl: string,
  reportId: string
): { html: string; text: string } {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #3b82f6, #2563eb); padding: 24px; border-radius: 8px 8px 0 0; color: white;">
        <h1 style="margin: 0; font-size: 24px;">📊 Scheduled Report</h1>
        <p style="margin: 8px 0 0 0; opacity: 0.9;">${scheduleName}</p>
      </div>

      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        ${customBody ? `<p style="margin-bottom: 16px;">${customBody}</p>` : ''}

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Report Template:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 500;">${templateName}</td>
          </tr>
          ${projectName ? `
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Project:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 500;">${projectName}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Frequency:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${frequency}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Generated:</td>
            <td style="padding: 8px 0;">${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</td>
          </tr>
        </table>

        <p style="margin: 16px 0 8px 0;">
          <strong>Your report is attached to this email.</strong>
        </p>

        <p style="margin-top: 24px; text-align: center;">
          <a href="${appUrl}/reports"
             style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
            View Reports Dashboard
          </a>
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />

        <p style="font-size: 12px; color: #9ca3af; text-align: center;">
          This is an automated report from SuperSiteHero.<br/>
          To manage your scheduled reports, visit your <a href="${appUrl}/reports" style="color: #3b82f6;">Reports Dashboard</a>.
        </p>
      </div>
    </body>
    </html>
  `

  const text = `
Scheduled Report: ${scheduleName}

${customBody || ''}

Report Template: ${templateName}
${projectName ? `Project: ${projectName}` : ''}
Frequency: ${frequency}
Generated: ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}

Your report is attached to this email.

View Reports Dashboard: ${appUrl}/reports

---
This is an automated report from SuperSiteHero.
To manage your scheduled reports, visit your Reports Dashboard.
  `.trim()

  return { html, text }
}

// Calculate next run time based on frequency
function calculateNextRun(
  frequency: string,
  dayOfWeek: number | null,
  dayOfMonth: number | null,
  timeOfDay: string,
  timezone: string
): Date {
  // Parse time
  const [hours, minutes] = timeOfDay.split(':').map(Number)
  const now = new Date()

  const nextRun = new Date()
  nextRun.setHours(hours, minutes, 0, 0)

  switch (frequency) {
    case 'daily':
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1)
      }
      break

    case 'weekly':
      // dayOfWeek: 0 = Sunday, 6 = Saturday
      const currentDay = now.getDay()
      const targetDay = dayOfWeek ?? 1 // Default Monday
      let daysUntil = targetDay - currentDay
      if (daysUntil <= 0 || (daysUntil === 0 && nextRun <= now)) {
        daysUntil += 7
      }
      nextRun.setDate(now.getDate() + daysUntil)
      break

    case 'biweekly':
      const currentDayBi = now.getDay()
      const targetDayBi = dayOfWeek ?? 1
      let daysUntilBi = targetDayBi - currentDayBi
      if (daysUntilBi <= 0 || (daysUntilBi === 0 && nextRun <= now)) {
        daysUntilBi += 14 // Two weeks
      }
      nextRun.setDate(now.getDate() + daysUntilBi)
      break

    case 'monthly':
      const targetDate = dayOfMonth ?? 1
      nextRun.setDate(targetDate)
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 1)
      }
      break

    case 'quarterly':
      const currentMonth = now.getMonth()
      const quarterStart = Math.floor(currentMonth / 3) * 3
      const nextQuarterStart = quarterStart + 3
      nextRun.setMonth(nextQuarterStart)
      nextRun.setDate(dayOfMonth ?? 1)
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 3)
      }
      break
  }

  return nextRun
}

// Placeholder report generation - in production this would generate actual PDF/Excel
async function generateReportData(
  supabase: ReturnType<typeof createClient>,
  schedule: ScheduledReport
): Promise<{ content: string; filename: string; contentType: string }> {
  // This is a simplified version - real implementation would:
  // 1. Query the data source based on template configuration
  // 2. Apply filters, sorting, grouping from template
  // 3. Generate PDF/Excel using appropriate library

  const dataSource = schedule.template?.data_source || 'unknown'
  const projectFilter = schedule.project_id ? { project_id: schedule.project_id } : {}

  // Get sample data based on data source
  let data: unknown[] = []
  let rowCount = 0

  switch (dataSource) {
    case 'daily_reports':
      const { data: dailyReports } = await supabase
        .from('daily_reports')
        .select('*')
        .match(projectFilter)
        .order('report_date', { ascending: false })
        .limit(100)
      data = dailyReports || []
      rowCount = data.length
      break

    case 'rfis':
      const { data: rfis } = await supabase
        .from('rfis')
        .select('*')
        .match(projectFilter)
        .order('created_at', { ascending: false })
        .limit(100)
      data = rfis || []
      rowCount = data.length
      break

    case 'submittals':
      const { data: submittals } = await supabase
        .from('submittals')
        .select('*')
        .match(projectFilter)
        .order('created_at', { ascending: false })
        .limit(100)
      data = submittals || []
      rowCount = data.length
      break

    case 'change_orders':
      const { data: cos } = await supabase
        .from('change_orders')
        .select('*')
        .match(projectFilter)
        .order('created_at', { ascending: false })
        .limit(100)
      data = cos || []
      rowCount = data.length
      break

    case 'safety_incidents':
      const { data: incidents } = await supabase
        .from('safety_incidents')
        .select('*')
        .match(projectFilter)
        .order('incident_date', { ascending: false })
        .limit(100)
      data = incidents || []
      rowCount = data.length
      break

    case 'punch_list':
      const { data: punchItems } = await supabase
        .from('punch_list_items')
        .select('*')
        .match(projectFilter)
        .order('created_at', { ascending: false })
        .limit(100)
      data = punchItems || []
      rowCount = data.length
      break

    default:
      // Generic query
      data = []
      rowCount = 0
  }

  // Generate CSV content (simplified - real implementation would support PDF/Excel)
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `${schedule.name.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.csv`

  // Create CSV
  let csvContent = ''
  if (data.length > 0) {
    const headers = Object.keys(data[0] as Record<string, unknown>)
    csvContent = headers.join(',') + '\n'
    csvContent += data.map(row => {
      const r = row as Record<string, unknown>
      return headers.map(h => {
        const val = r[h]
        if (val === null || val === undefined) {return ''}
        if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
          return `"${val.replace(/"/g, '""')}"`
        }
        return String(val)
      }).join(',')
    }).join('\n')
  } else {
    csvContent = 'No data available for this report period.'
  }

  // Base64 encode for email attachment
  const encoder = new TextEncoder()
  const content = btoa(String.fromCharCode(...encoder.encode(csvContent)))

  return {
    content,
    filename,
    contentType: 'text/csv',
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const result: ProcessResult = {
    total_due: 0,
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    details: [],
    errors: [],
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const appUrl = Deno.env.get('APP_URL') || 'https://supersitehero.com'

    // Create Supabase client with service role key (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const now = new Date()
    console.log(`Processing scheduled reports at ${now.toISOString()}`)

    // Query scheduled reports that are due to run
    const { data: dueReports, error: queryError } = await supabase
      .from('scheduled_reports')
      .select(`
        *,
        template:report_templates(id, name, data_source, configuration),
        project:projects(id, name),
        company:companies(id, name)
      `)
      .eq('is_active', true)
      .lte('next_run_at', now.toISOString())

    if (queryError) {
      throw new Error(`Failed to query scheduled reports: ${queryError.message}`)
    }

    if (!dueReports || dueReports.length === 0) {
      console.log('No scheduled reports due to run')
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    result.total_due = dueReports.length
    console.log(`Found ${dueReports.length} scheduled reports due to run`)

    // Process each due report
    for (const schedule of dueReports as ScheduledReport[]) {
      result.processed++

      try {
        // Validate schedule has template and recipients
        if (!schedule.template) {
          result.skipped++
          result.details.push({
            schedule_id: schedule.id,
            schedule_name: schedule.name,
            status: 'skipped',
            message: 'Template not found or deleted',
          })
          continue
        }

        if (!schedule.recipients || schedule.recipients.length === 0) {
          result.skipped++
          result.details.push({
            schedule_id: schedule.id,
            schedule_name: schedule.name,
            status: 'skipped',
            message: 'No recipients configured',
          })
          continue
        }

        console.log(`Processing schedule: ${schedule.name} (${schedule.id})`)

        // Generate the report
        const reportData = await generateReportData(supabase, schedule)

        // Create generated report record
        const { data: generatedReport, error: createError } = await supabase
          .from('generated_reports')
          .insert({
            template_id: schedule.template_id,
            scheduled_report_id: schedule.id,
            company_id: schedule.company_id,
            report_name: `${schedule.name} - ${new Date().toLocaleDateString()}`,
            data_source: schedule.template.data_source,
            is_scheduled: true,
            output_format: schedule.output_format,
            project_id: schedule.project_id,
            status: 'completed',
          })
          .select()
          .single()

        if (createError) {
          console.warn(`Failed to create generated report record: ${createError.message}`)
        }

        // Generate email content
        const { html, text } = generateReportEmail(
          schedule.name,
          schedule.template.name,
          schedule.project?.name || null,
          schedule.frequency,
          schedule.email_body,
          appUrl,
          generatedReport?.id || 'unknown'
        )

        // Send email to each recipient
        let sentCount = 0
        for (const recipient of schedule.recipients) {
          try {
            const { error: emailError } = await supabase.functions.invoke('send-email', {
              body: {
                to: { email: recipient },
                subject: schedule.email_subject || `Scheduled Report: ${schedule.name}`,
                html,
                text,
                attachments: [{
                  filename: reportData.filename,
                  content: reportData.content,
                  content_type: reportData.contentType,
                }],
                tags: ['scheduled-report', schedule.frequency],
                template_name: 'scheduled-report',
              },
            })

            if (emailError) {
              console.warn(`Failed to send to ${recipient}: ${emailError.message}`)
            } else {
              sentCount++
              console.log(`Sent report to ${recipient}`)
            }
          } catch (sendError) {
            console.warn(`Error sending to ${recipient}:`, sendError)
          }
        }

        // Update schedule's last_run_at and next_run_at
        const nextRunAt = calculateNextRun(
          schedule.frequency,
          schedule.day_of_week,
          schedule.day_of_month,
          schedule.time_of_day,
          schedule.timezone
        )

        await supabase
          .from('scheduled_reports')
          .update({
            last_run_at: now.toISOString(),
            next_run_at: nextRunAt.toISOString(),
          })
          .eq('id', schedule.id)

        if (sentCount > 0) {
          result.succeeded++
          result.details.push({
            schedule_id: schedule.id,
            schedule_name: schedule.name,
            status: 'success',
            message: `Report sent successfully`,
            recipients_sent: sentCount,
          })
        } else {
          result.failed++
          result.details.push({
            schedule_id: schedule.id,
            schedule_name: schedule.name,
            status: 'failed',
            message: 'Failed to send to any recipients',
          })
        }
      } catch (processError) {
        result.failed++
        const errorMsg = processError instanceof Error ? processError.message : 'Unknown error'
        result.details.push({
          schedule_id: schedule.id,
          schedule_name: schedule.name,
          status: 'failed',
          message: errorMsg,
        })
        result.errors.push(`Schedule ${schedule.name}: ${errorMsg}`)
        console.error(`Error processing schedule ${schedule.name}:`, processError)
      }
    }

    console.log(`Completed. Succeeded: ${result.succeeded}, Failed: ${result.failed}, Skipped: ${result.skipped}`)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Process scheduled reports error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    result.errors.push(errorMessage)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
