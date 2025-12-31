/**
 * Scheduled Report Executor Service
 *
 * Executes scheduled reports by generating the report and sending via email.
 * This provides a "Run Now" capability for testing scheduled reports.
 */

import { supabaseUntyped } from '@/lib/supabase'
import { logger } from '@/lib/utils/logger'
import { reportExportService, type ReportExportOptions } from '@/features/reports/services/reportExportService'
import { getScheduledReport, getReportTemplate } from './report-builder'
import { sendEmail } from '@/lib/email/email-service'
import { generateScheduledReportEmail, type ScheduledReportEmailData } from '@/lib/email/templates'
import type { ReportOutputFormat } from '@/types/report-builder'

// ============================================================================
// Types
// ============================================================================

export interface ExecuteScheduledReportResult {
    success: boolean
    scheduleId: string
    reportName: string
    recipientCount: number
    recordCount: number
    format: ReportOutputFormat
    executedAt: string
    error?: string
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate the date range for the scheduled report based on frequency
 */
function calculateDateRange(frequency: string): { from: string; to: string } {
    const now = new Date()
    const to = now.toISOString().split('T')[0]
    let from: Date

    switch (frequency) {
        case 'daily':
            from = new Date(now)
            from.setDate(from.getDate() - 1)
            break
        case 'weekly':
            from = new Date(now)
            from.setDate(from.getDate() - 7)
            break
        case 'bi_weekly':
            from = new Date(now)
            from.setDate(from.getDate() - 14)
            break
        case 'monthly':
            from = new Date(now)
            from.setMonth(from.getMonth() - 1)
            break
        case 'quarterly':
            from = new Date(now)
            from.setMonth(from.getMonth() - 3)
            break
        default:
            from = new Date(now)
            from.setDate(from.getDate() - 7)
    }

    return {
        from: from.toISOString().split('T')[0],
        to,
    }
}

/**
 * Format date for display
 */
function formatDateForDisplay(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
}

/**
 * Get MIME type for output format
 */
function getMimeType(format: ReportOutputFormat): string {
    switch (format) {
        case 'pdf':
            return 'application/pdf'
        case 'excel':
            return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        case 'csv':
            return 'text/csv'
        default:
            return 'application/octet-stream'
    }
}

/**
 * Get file extension for output format
 */
function getFileExtension(format: ReportOutputFormat): string {
    switch (format) {
        case 'pdf':
            return 'pdf'
        case 'excel':
            return 'xlsx'
        case 'csv':
            return 'csv'
        default:
            return 'dat'
    }
}

// ============================================================================
// Main Executor
// ============================================================================

/**
 * Execute a scheduled report - generate the report and send via email
 */
export async function executeScheduledReport(scheduleId: string): Promise<ExecuteScheduledReportResult> {
    const executedAt = new Date().toISOString()

    try {
        // 1. Fetch the scheduled report configuration
        const schedule = await getScheduledReport(scheduleId)
        if (!schedule) {
            throw new Error(`Scheduled report not found: ${scheduleId}`)
        }

        logger.info(`[ScheduledReportExecutor] Executing scheduled report: ${schedule.name}`)

        // 2. Fetch the template with fields/filters
        const template = await getReportTemplate(schedule.template_id)
        if (!template) {
            throw new Error(`Report template not found: ${schedule.template_id}`)
        }

        // 3. Calculate date range based on frequency
        const dateRange = calculateDateRange(schedule.frequency)

        // 4. Build report export options
        const exportOptions: ReportExportOptions = {
            dataSource: template.data_source,
            fields: template.fields?.map(f => ({
                field_name: f.field_name,
                display_name: f.display_name,
                field_type: f.field_type,
                display_order: f.display_order,
                column_width: f.column_width,
                is_visible: f.is_visible,
                aggregation: f.aggregation,
                format_string: f.format_string,
            })) || [],
            filters: template.filters?.map(f => ({
                field_name: f.field_name,
                operator: f.operator,
                filter_value: f.filter_value,
                is_relative_date: f.is_relative_date,
                relative_date_value: f.relative_date_value,
                relative_date_unit: f.relative_date_unit,
                filter_group: f.filter_group,
                display_order: f.display_order,
            })) || [],
            sorting: template.sorting?.map(s => ({
                field_name: s.field_name,
                direction: s.direction,
                sort_order: s.sort_order,
            })) || [],
            projectId: schedule.project_id,
            dateFrom: dateRange.from,
            dateTo: dateRange.to,
            title: schedule.name,
            orientation: template.page_orientation || 'portrait',
        }

        // 5. Generate the report
        const format = schedule.output_format as ReportOutputFormat || 'pdf'
        const reportResult = await reportExportService.generateReport(format, exportOptions)

        logger.info(`[ScheduledReportExecutor] Generated report: ${reportResult.rowCount} records`)

        // 6. Send to each recipient
        const recipients = (schedule.recipients as string[]) || []

        // Get project name if available
        let projectName: string | undefined
        if (schedule.project_id) {
            const { data: project } = await supabaseUntyped
                .from('projects')
                .select('name')
                .eq('id', schedule.project_id)
                .single()
            projectName = project?.name
        }

        // Convert blob to base64 for attachment (do once for all recipients)
        const arrayBuffer = await reportResult.blob.arrayBuffer()
        const base64Content = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

        // Send to each recipient
        for (const recipientEmail of recipients) {
            // Build email data
            const emailData: ScheduledReportEmailData = {
                recipientName: recipientEmail.split('@')[0], // Use email prefix as name
                reportName: schedule.name,
                templateName: template.name,
                frequency: schedule.frequency,
                projectName,
                dateRange: {
                    from: formatDateForDisplay(dateRange.from),
                    to: formatDateForDisplay(dateRange.to),
                },
                recordCount: reportResult.rowCount,
                format,
            }

            // Generate email content
            const emailContent = generateScheduledReportEmail(emailData)

            // Send email with attachment
            await sendEmail({
                to: { email: recipientEmail },
                subject: schedule.email_subject || `Scheduled Report: ${schedule.name}`,
                html: emailContent.html,
                text: emailContent.text,
                attachments: [
                    {
                        filename: `${schedule.name.replace(/[^a-zA-Z0-9]/g, '_')}_${dateRange.to}.${getFileExtension(format)}`,
                        content: base64Content,
                        contentType: getMimeType(format),
                    },
                ],
            })

            logger.info(`[ScheduledReportExecutor] Sent report to: ${recipientEmail}`)
        }

        // 7. Update last_run_at timestamp
        await supabaseUntyped
            .from('scheduled_reports')
            .update({
                last_run_at: executedAt,
            })
            .eq('id', scheduleId)

        logger.info(`[ScheduledReportExecutor] Completed execution: ${schedule.name}`)

        return {
            success: true,
            scheduleId,
            reportName: schedule.name,
            recipientCount: recipients.length,
            recordCount: reportResult.rowCount,
            format,
            executedAt,
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.error('[ScheduledReportExecutor] Execution failed:', error)

        return {
            success: false,
            scheduleId,
            reportName: 'Unknown',
            recipientCount: 0,
            recordCount: 0,
            format: 'pdf',
            executedAt,
            error: errorMessage,
        }
    }
}
