// Supabase Edge Function: insurance-compliance-check
// Daily cron job to check certificate expiration and compliance status
// Sends notifications and applies/releases payment holds automatically

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

import {
  generateComplianceEmail,
  createInAppNotification,
  type NotificationType,
  type ComplianceNotificationContext,
} from '../_shared/compliance-notifications.ts'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Types
interface Certificate {
  id: string
  company_id: string
  subcontractor_id: string
  project_id: string | null
  insurance_type: string
  expiration_date: string
  carrier_name: string
  status: string
  reminder_sent_at: string | null
  subcontractor: {
    id: string
    company_name: string
    contact_email: string | null
  }
  project: {
    id: string
    name: string
  } | null
}

interface ComplianceStatus {
  id: string
  company_id: string
  subcontractor_id: string
  project_id: string | null
  is_compliant: boolean
  payment_hold: boolean
  expiring_soon_count: number
  expired_count: number
  subcontractor: {
    company_name: string
  }
}

interface CheckResult {
  certificates_checked: number
  expiring_30_days: number
  expiring_14_days: number
  expiring_7_days: number
  expired: number
  holds_applied: number
  holds_released: number
  notifications_sent: number
  compliance_recalculated: number
  errors: string[]
}

// Insurance type labels
const INSURANCE_TYPE_LABELS: Record<string, string> = {
  general_liability: 'General Liability',
  auto_liability: 'Auto Liability',
  workers_compensation: "Workers' Compensation",
  umbrella: 'Umbrella/Excess',
  professional_liability: 'Professional Liability',
  builders_risk: "Builder's Risk",
  pollution: 'Pollution',
  cyber: 'Cyber',
  other: 'Other',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const result: CheckResult = {
    certificates_checked: 0,
    expiring_30_days: 0,
    expiring_14_days: 0,
    expiring_7_days: 0,
    expired: 0,
    holds_applied: 0,
    holds_released: 0,
    notifications_sent: 0,
    compliance_recalculated: 0,
    errors: [],
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const appUrl = Deno.env.get('APP_URL') || 'https://supersitehero.com'

    // Create Supabase client with service role (bypass RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get today's date
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Calculate date thresholds
    const in7Days = new Date(today)
    in7Days.setDate(in7Days.getDate() + 7)

    const in14Days = new Date(today)
    in14Days.setDate(in14Days.getDate() + 14)

    const in30Days = new Date(today)
    in30Days.setDate(in30Days.getDate() + 30)

    const formatDate = (d: Date) => d.toISOString().split('T')[0]

    console.log(`Running insurance compliance check. Today: ${formatDate(today)}`)

    // Step 1: Query all active certificates expiring within 30 days or already expired
    const { data: certificates, error: certError } = await supabase
      .from('insurance_certificates')
      .select(`
        id, company_id, subcontractor_id, project_id, insurance_type,
        expiration_date, carrier_name, status, reminder_sent_at,
        subcontractor:subcontractors!inner(id, company_name, contact_email),
        project:projects(id, name)
      `)
      .in('status', ['active', 'expiring_soon', 'expired'])
      .not('expiration_date', 'is', null)
      .lte('expiration_date', formatDate(in30Days))
      .is('deleted_at', null)
      .order('expiration_date', { ascending: true })

    if (certError) {
      throw new Error(`Failed to query certificates: ${certError.message}`)
    }

    result.certificates_checked = certificates?.length || 0
    console.log(`Found ${result.certificates_checked} certificates to check`)

    if (!certificates || certificates.length === 0) {
      console.log('No certificates requiring attention')
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Step 2: Categorize certificates by urgency
    const categorized: {
      at30Days: Certificate[]
      at14Days: Certificate[]
      at7Days: Certificate[]
      expired: { cert: Certificate; daysExpired: number }[]
    } = {
      at30Days: [],
      at14Days: [],
      at7Days: [],
      expired: [],
    }

    for (const cert of certificates as unknown as Certificate[]) {
      const expDate = new Date(cert.expiration_date)
      expDate.setHours(0, 0, 0, 0)

      const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      // Check if we should send a reminder (not sent in last 7 days)
      const shouldSendReminder = !cert.reminder_sent_at ||
        (today.getTime() - new Date(cert.reminder_sent_at).getTime()) > (7 * 24 * 60 * 60 * 1000)

      if (diffDays < 0) {
        // Expired
        categorized.expired.push({ cert, daysExpired: Math.abs(diffDays) })

        // Update certificate status
        await supabase
          .from('insurance_certificates')
          .update({ status: 'expired' })
          .eq('id', cert.id)
          .eq('status', 'active')
      } else if (diffDays <= 7 && shouldSendReminder) {
        categorized.at7Days.push(cert)
      } else if (diffDays <= 14 && shouldSendReminder) {
        categorized.at14Days.push(cert)
      } else if (diffDays <= 30 && shouldSendReminder) {
        categorized.at30Days.push(cert)
      }
    }

    result.expiring_30_days = categorized.at30Days.length
    result.expiring_14_days = categorized.at14Days.length
    result.expiring_7_days = categorized.at7Days.length
    result.expired = categorized.expired.length

    console.log(`Categorized: 30-day=${result.expiring_30_days}, 14-day=${result.expiring_14_days}, 7-day=${result.expiring_7_days}, expired=${result.expired}`)

    // Step 3: Send notifications for expiring certificates
    const sendNotification = async (
      cert: Certificate,
      type: NotificationType,
      daysUntilExpiry?: number,
      daysExpired?: number
    ) => {
      try {
        const context: ComplianceNotificationContext = {
          subcontractor_name: cert.subcontractor.company_name,
          project_name: cert.project?.name,
          certificate_type: INSURANCE_TYPE_LABELS[cert.insurance_type] || cert.insurance_type,
          expiration_date: new Date(cert.expiration_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          days_until_expiry: daysUntilExpiry,
          days_expired: daysExpired,
          app_url: appUrl,
        }

        // Get recipient - try subcontractor contact, then project manager
        let recipientEmail = cert.subcontractor.contact_email
        let recipientName = cert.subcontractor.company_name

        if (!recipientEmail && cert.project_id) {
          // Get project manager
          const { data: teamMember } = await supabase
            .from('project_team_members')
            .select('users!inner(id, email, full_name)')
            .eq('project_id', cert.project_id)
            .in('role', ['project_manager', 'pm', 'owner', 'admin'])
            .limit(1)
            .single()

          if (teamMember?.users) {
            const user = teamMember.users as { id: string; email: string; full_name?: string }
            recipientEmail = user.email
            recipientName = user.full_name || user.email.split('@')[0]
          }
        }

        if (!recipientEmail) {
          console.warn(`No recipient email for certificate ${cert.id}`)
          return
        }

        // Generate and send email
        const email = generateComplianceEmail(type, recipientName, context)

        const { error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            to: { email: recipientEmail, name: recipientName },
            subject: email.subject,
            html: email.html,
            text: email.text,
            tags: ['insurance', type],
            template_name: `insurance-${type}`,
          },
        })

        if (emailError) {
          result.errors.push(`Failed to send email for ${cert.id}: ${emailError.message}`)
        } else {
          result.notifications_sent++
          console.log(`Sent ${type} notification for certificate ${cert.id}`)
        }

        // Update reminder_sent_at
        await supabase
          .from('insurance_certificates')
          .update({
            reminder_sent_at: new Date().toISOString(),
            status: type === 'expired' ? 'expired' : 'expiring_soon',
          })
          .eq('id', cert.id)

        // Create in-app notification if user exists
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('email', recipientEmail)
          .single()

        if (user) {
          const notification = createInAppNotification(user.id, type, context)
          await supabase.from('notifications').insert(notification)
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        result.errors.push(`Error processing certificate ${cert.id}: ${errorMsg}`)
      }
    }

    // Send notifications
    for (const cert of categorized.at30Days) {
      await sendNotification(cert, 'expiring_30_days', 30)
    }

    for (const cert of categorized.at14Days) {
      await sendNotification(cert, 'expiring_14_days', 14)
    }

    for (const cert of categorized.at7Days) {
      await sendNotification(cert, 'expiring_7_days', 7)
    }

    for (const { cert, daysExpired } of categorized.expired) {
      // Only send expired notifications weekly
      if (daysExpired === 1 || daysExpired % 7 === 0) {
        await sendNotification(cert, 'expired', undefined, daysExpired)
      }
    }

    // Step 4: Recalculate compliance status for affected subcontractors
    const affectedSubcontractors = new Set<string>()

    for (const cert of certificates as unknown as Certificate[]) {
      affectedSubcontractors.add(cert.subcontractor_id)
    }

    for (const subcontractorId of affectedSubcontractors) {
      try {
        // Get company_id for this subcontractor
        const { data: sub } = await supabase
          .from('subcontractors')
          .select('company_id')
          .eq('id', subcontractorId)
          .single()

        if (sub) {
          await supabase.rpc('recalculate_compliance_status', {
            p_subcontractor_id: subcontractorId,
            p_project_id: null,
            p_company_id: sub.company_id,
          })
          result.compliance_recalculated++
        }
      } catch (error) {
        console.warn(`Failed to recalculate compliance for ${subcontractorId}:`, error)
      }
    }

    console.log(`Recalculated compliance for ${result.compliance_recalculated} subcontractors`)

    // Step 5: Auto-apply payment holds for non-compliant subcontractors with expired certs
    const { data: nonCompliantStatuses } = await supabase
      .from('subcontractor_compliance_status')
      .select(`
        id, company_id, subcontractor_id, project_id,
        is_compliant, payment_hold, expired_count,
        subcontractor:subcontractors(company_name)
      `)
      .eq('is_compliant', false)
      .eq('payment_hold', false)
      .gt('expired_count', 0)

    if (nonCompliantStatuses) {
      for (const status of nonCompliantStatuses as unknown as ComplianceStatus[]) {
        try {
          await supabase.rpc('apply_payment_hold', {
            p_subcontractor_id: status.subcontractor_id,
            p_project_id: status.project_id,
            p_reason: 'Expired insurance certificates',
            p_applied_by: null, // System
          })
          result.holds_applied++

          // Send notification
          const context: ComplianceNotificationContext = {
            subcontractor_name: status.subcontractor.company_name,
            hold_reason: 'Expired insurance certificates',
            app_url: appUrl,
          }

          // Get company admin to notify
          const { data: admins } = await supabase
            .from('users')
            .select('id, email, full_name')
            .eq('company_id', status.company_id)
            .in('role', ['owner', 'admin'])
            .limit(3)

          if (admins) {
            for (const admin of admins) {
              const email = generateComplianceEmail('payment_hold_applied', admin.full_name || 'Admin', context)

              await supabase.functions.invoke('send-email', {
                body: {
                  to: { email: admin.email, name: admin.full_name || 'Admin' },
                  subject: email.subject,
                  html: email.html,
                  text: email.text,
                  tags: ['insurance', 'payment_hold'],
                  template_name: 'insurance-payment-hold-applied',
                },
              })

              const notification = createInAppNotification(admin.id, 'payment_hold_applied', context)
              await supabase.from('notifications').insert(notification)
            }
          }

          console.log(`Applied payment hold for subcontractor ${status.subcontractor_id}`)
        } catch (error) {
          console.warn(`Failed to apply hold for ${status.subcontractor_id}:`, error)
        }
      }
    }

    // Step 6: Release holds for now-compliant subcontractors
    const { data: compliantWithHolds } = await supabase
      .from('subcontractor_compliance_status')
      .select(`
        id, company_id, subcontractor_id, project_id,
        is_compliant, payment_hold,
        subcontractor:subcontractors(company_name)
      `)
      .eq('is_compliant', true)
      .eq('payment_hold', true)

    if (compliantWithHolds) {
      for (const status of compliantWithHolds as unknown as ComplianceStatus[]) {
        try {
          await supabase.rpc('release_payment_hold', {
            p_subcontractor_id: status.subcontractor_id,
            p_project_id: status.project_id,
            p_reason: 'Insurance compliance restored',
            p_released_by: null, // System
          })
          result.holds_released++

          // Send notification
          const context: ComplianceNotificationContext = {
            subcontractor_name: status.subcontractor.company_name,
            app_url: appUrl,
          }

          // Get company admin to notify
          const { data: admins } = await supabase
            .from('users')
            .select('id, email, full_name')
            .eq('company_id', status.company_id)
            .in('role', ['owner', 'admin'])
            .limit(3)

          if (admins) {
            for (const admin of admins) {
              const email = generateComplianceEmail('payment_hold_released', admin.full_name || 'Admin', context)

              await supabase.functions.invoke('send-email', {
                body: {
                  to: { email: admin.email, name: admin.full_name || 'Admin' },
                  subject: email.subject,
                  html: email.html,
                  text: email.text,
                  tags: ['insurance', 'payment_hold'],
                  template_name: 'insurance-payment-hold-released',
                },
              })

              const notification = createInAppNotification(admin.id, 'payment_hold_released', context)
              await supabase.from('notifications').insert(notification)
            }
          }

          console.log(`Released payment hold for subcontractor ${status.subcontractor_id}`)
        } catch (error) {
          console.warn(`Failed to release hold for ${status.subcontractor_id}:`, error)
        }
      }
    }

    console.log(`Completed. Holds applied: ${result.holds_applied}, released: ${result.holds_released}`)
    console.log(`Notifications sent: ${result.notifications_sent}, Errors: ${result.errors.length}`)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Insurance compliance check error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    result.errors.push(errorMessage)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
