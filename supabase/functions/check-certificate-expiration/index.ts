// Supabase Edge Function: check-certificate-expiration
// Scheduled function to check for expiring certificates and send reminders
// Runs daily and sends notifications at 90, 60, and 30 days before expiration
// Also sends weekly reminders for expired certificates

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Types
interface Certificate {
  id: string
  company_id: string
  subcontractor_id?: string
  certificate_type: 'insurance' | 'license' | 'certification'
  name: string
  policy_number?: string
  carrier?: string
  coverage_amount?: number
  expiration_date: string
  vendor_name?: string
  vendor_email?: string
  project_id?: string
  status: string
  reminder_sent_at?: string
}

interface Project {
  id: string
  name: string
}

interface Subcontractor {
  id: string
  company_name: string
  contact_email?: string
}

interface User {
  id: string
  email: string
  full_name?: string
}

interface NotificationResult {
  certificates_90_days: number
  certificates_60_days: number
  certificates_30_days: number
  certificates_expired: number
  notifications_sent: number
  errors: string[]
}

// Configuration
const REMINDER_CONFIG = {
  firstReminderDays: 90,
  secondReminderDays: 60,
  thirdReminderDays: 30,
  expiredReminderFrequency: 7, // Send expired reminders weekly
}

const CERTIFICATE_TYPE_LABELS: Record<string, string> = {
  insurance: 'Insurance Certificate',
  license: 'License',
  certification: 'Certification',
}

const URGENCY_LABELS: Record<string, string> = {
  first: 'Advance Notice',
  second: 'Reminder',
  third: 'Final Notice',
  expired: 'EXPIRED',
}

// Email templates
function generateRenewalEmail(
  recipientName: string,
  certificate: Certificate & { projects?: { name: string }; subcontractors?: Subcontractor },
  daysUntilExpiration: number,
  escalationLevel: 'first' | 'second' | 'third',
  appUrl: string
): { subject: string; html: string; text: string } {
  const typeLabel = CERTIFICATE_TYPE_LABELS[certificate.certificate_type] || 'Certificate'
  const urgencyLabel = URGENCY_LABELS[escalationLevel]
  const urgencyColor = escalationLevel === 'first' ? '#f59e0b' : escalationLevel === 'second' ? '#f97316' : '#ef4444'
  const bgColor = escalationLevel === 'first' ? '#fef3c7' : escalationLevel === 'second' ? '#ffedd5' : '#fee2e2'

  const vendorName = certificate.vendor_name || certificate.subcontractors?.company_name || 'Vendor'
  const projectName = certificate.projects?.name

  const subject = `${urgencyLabel}: ${typeLabel} for ${vendorName} expires ${certificate.expiration_date}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: ${urgencyColor};">${typeLabel} Renewal ${urgencyLabel}</h1>
      <p>Hi ${recipientName},</p>
      <p>A ${typeLabel.toLowerCase()} for <strong>${vendorName}</strong> is approaching its expiration date.</p>

      <div style="background-color: ${bgColor}; border: 1px solid ${urgencyColor}; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0; font-size: 14px; color: ${urgencyColor};">
          <strong>This ${typeLabel.toLowerCase()} expires in ${daysUntilExpiration} days!</strong>
        </p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; width: 150px;"><strong>Certificate Type:</strong></td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${typeLabel}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Name:</strong></td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${certificate.name}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Vendor:</strong></td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${vendorName}</td>
        </tr>
        ${certificate.policy_number ? `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Policy Number:</strong></td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${certificate.policy_number}</td>
        </tr>
        ` : ''}
        ${projectName ? `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Project:</strong></td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${projectName}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0;"><strong>Expiration Date:</strong></td>
          <td style="padding: 8px 0; font-weight: bold; color: ${urgencyColor};">${certificate.expiration_date}</td>
        </tr>
      </table>

      <p style="text-align: center;">
        <a href="${appUrl}/insurance/${certificate.id}" style="display: inline-block; padding: 12px 24px; background-color: ${urgencyColor}; color: white; text-decoration: none; border-radius: 6px;">View Certificate</a>
      </p>

      <p style="font-size: 12px; color: #6b7280; margin-top: 24px;">
        Please ensure the renewed certificate is uploaded before the expiration date to maintain compliance.
      </p>
    </body>
    </html>
  `

  const text = `
${typeLabel} Renewal ${urgencyLabel}

Hi ${recipientName},

A ${typeLabel.toLowerCase()} for ${vendorName} is approaching its expiration date.

This ${typeLabel.toLowerCase()} expires in ${daysUntilExpiration} days!

Certificate Type: ${typeLabel}
Name: ${certificate.name}
Vendor: ${vendorName}
${certificate.policy_number ? `Policy Number: ${certificate.policy_number}` : ''}
${projectName ? `Project: ${projectName}` : ''}
Expiration Date: ${certificate.expiration_date}

View Certificate: ${appUrl}/insurance/${certificate.id}

Please ensure the renewed certificate is uploaded before the expiration date to maintain compliance.
  `.trim()

  return { subject, html, text }
}

function generateExpiredEmail(
  recipientName: string,
  certificate: Certificate & { projects?: { name: string }; subcontractors?: Subcontractor },
  daysExpired: number,
  appUrl: string
): { subject: string; html: string; text: string } {
  const typeLabel = CERTIFICATE_TYPE_LABELS[certificate.certificate_type] || 'Certificate'
  const vendorName = certificate.vendor_name || certificate.subcontractors?.company_name || 'Vendor'
  const projectName = certificate.projects?.name

  const subject = `EXPIRED: ${typeLabel} for ${vendorName} - Immediate Action Required`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #dc2626;">EXPIRED: ${typeLabel} Requires Immediate Attention</h1>
      <p>Hi ${recipientName},</p>
      <p>A ${typeLabel.toLowerCase()} for <strong>${vendorName}</strong> has <strong>expired</strong>.</p>

      <div style="background-color: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0; font-size: 16px; color: #7f1d1d; font-weight: bold;">
          This ${typeLabel.toLowerCase()} expired ${daysExpired} day${daysExpired !== 1 ? 's' : ''} ago!
        </p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #991b1b;">
          <strong>Work may be suspended</strong> until a valid certificate is provided.
        </p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; width: 150px;"><strong>Certificate Type:</strong></td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${typeLabel}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Name:</strong></td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${certificate.name}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Vendor:</strong></td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${vendorName}</td>
        </tr>
        ${projectName ? `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Project:</strong></td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${projectName}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Was Due:</strong></td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #dc2626; font-weight: bold; text-decoration: line-through;">${certificate.expiration_date}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Days Expired:</strong></td>
          <td style="padding: 8px 0; font-weight: bold; color: #dc2626;">${daysExpired}</td>
        </tr>
      </table>

      <p style="text-align: center;">
        <a href="${appUrl}/insurance/${certificate.id}/upload" style="display: inline-block; padding: 12px 24px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 6px;">Upload Renewed Certificate</a>
      </p>

      <p style="background-color: #fef2f2; padding: 12px; border-radius: 8px; font-size: 14px; color: #7f1d1d; margin-top: 24px;">
        <strong>Important:</strong> Operating without valid certificates may expose your company to significant liability.
        Please upload the renewed certificate immediately.
      </p>
    </body>
    </html>
  `

  const text = `
EXPIRED: ${typeLabel} Requires Immediate Attention

Hi ${recipientName},

A ${typeLabel.toLowerCase()} for ${vendorName} has EXPIRED.

This ${typeLabel.toLowerCase()} expired ${daysExpired} day${daysExpired !== 1 ? 's' : ''} ago!
Work may be suspended until a valid certificate is provided.

Certificate Type: ${typeLabel}
Name: ${certificate.name}
Vendor: ${vendorName}
${projectName ? `Project: ${projectName}` : ''}
Was Due: ${certificate.expiration_date}
Days Expired: ${daysExpired}

Upload Renewed Certificate: ${appUrl}/insurance/${certificate.id}/upload

Important: Operating without valid certificates may expose your company to significant liability.
Please upload the renewed certificate immediately.
  `.trim()

  return { subject, html, text }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const result: NotificationResult = {
    certificates_90_days: 0,
    certificates_60_days: 0,
    certificates_30_days: 0,
    certificates_expired: 0,
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

    const in30Days = new Date(today)
    in30Days.setDate(in30Days.getDate() + 30)

    const in60Days = new Date(today)
    in60Days.setDate(in60Days.getDate() + 60)

    const in90Days = new Date(today)
    in90Days.setDate(in90Days.getDate() + 90)

    // Format dates for query
    const formatDate = (d: Date) => d.toISOString().split('T')[0]

    console.log(`Checking certificates for reminders. Today: ${formatDate(today)}`)

    // Query certificates needing reminders
    const { data: certificates, error: certificatesError } = await supabase
      .from('insurance_certificates')
      .select('*, projects(name), subcontractors(id, company_name, contact_email)')
      .in('status', ['active', 'expiring', 'expired'])
      .not('expiration_date', 'is', null)
      .lte('expiration_date', formatDate(in90Days))
      .is('deleted_at', null)
      .order('expiration_date', { ascending: true })

    if (certificatesError) {
      throw new Error(`Failed to query certificates: ${certificatesError.message}`)
    }

    if (!certificates || certificates.length === 0) {
      console.log('No certificates requiring reminders found')
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    console.log(`Found ${certificates.length} certificates to check`)

    // Categorize certificates by reminder type
    type CertificateWithRelations = Certificate & { projects?: { name: string }; subcontractors?: Subcontractor }

    const categorizedCertificates: {
      at90Days: CertificateWithRelations[]
      at60Days: CertificateWithRelations[]
      at30Days: CertificateWithRelations[]
      expired: { certificate: CertificateWithRelations; daysExpired: number }[]
    } = {
      at90Days: [],
      at60Days: [],
      at30Days: [],
      expired: [],
    }

    for (const certificate of certificates as CertificateWithRelations[]) {
      const expDate = new Date(certificate.expiration_date)
      expDate.setHours(0, 0, 0, 0)

      const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      // Check if reminder was already sent recently
      const shouldSend = !certificate.reminder_sent_at ||
        (new Date().getTime() - new Date(certificate.reminder_sent_at).getTime()) > (7 * 24 * 60 * 60 * 1000)

      if (!shouldSend) continue

      if (diffDays < 0) {
        // Only send expired reminders weekly
        const daysExpired = Math.abs(diffDays)
        if (daysExpired % REMINDER_CONFIG.expiredReminderFrequency === 0 || daysExpired === 1) {
          categorizedCertificates.expired.push({ certificate, daysExpired })
        }
      } else if (diffDays <= 30) {
        categorizedCertificates.at30Days.push(certificate)
      } else if (diffDays <= 60) {
        categorizedCertificates.at60Days.push(certificate)
      } else if (diffDays <= 90) {
        categorizedCertificates.at90Days.push(certificate)
      }
    }

    result.certificates_90_days = categorizedCertificates.at90Days.length
    result.certificates_60_days = categorizedCertificates.at60Days.length
    result.certificates_30_days = categorizedCertificates.at30Days.length
    result.certificates_expired = categorizedCertificates.expired.length

    console.log(`Categorized: 90-day=${result.certificates_90_days}, 60-day=${result.certificates_60_days}, 30-day=${result.certificates_30_days}, expired=${result.certificates_expired}`)

    // Helper function to send notification
    const sendNotification = async (
      certificate: CertificateWithRelations,
      type: 'first' | 'second' | 'third' | 'expired',
      daysValue: number
    ) => {
      try {
        // Get recipient email
        let recipientEmail = certificate.vendor_email
        let recipientName = certificate.vendor_name || certificate.subcontractors?.company_name || 'Vendor'

        if (!recipientEmail && certificate.subcontractors?.contact_email) {
          recipientEmail = certificate.subcontractors.contact_email
          recipientName = certificate.subcontractors.company_name
        }

        // If no vendor email, try to get project admin
        if (!recipientEmail && certificate.project_id) {
          const { data: teamMember } = await supabase
            .from('project_team_members')
            .select('users!inner(id, email, full_name)')
            .eq('project_id', certificate.project_id)
            .in('role', ['project_manager', 'pm', 'owner', 'admin'])
            .limit(1)
            .single()

          if (teamMember?.users) {
            recipientEmail = (teamMember.users as any).email
            recipientName = (teamMember.users as any).full_name || recipientEmail.split('@')[0]
          }
        }

        if (!recipientEmail) {
          console.warn(`No recipient email found for certificate ${certificate.name}`)
          return
        }

        // Generate email content
        let emailContent: { subject: string; html: string; text: string }
        if (type === 'expired') {
          emailContent = generateExpiredEmail(recipientName, certificate, daysValue, appUrl)
        } else {
          emailContent = generateRenewalEmail(recipientName, certificate, daysValue, type, appUrl)
        }

        // Send email via the send-email edge function
        const { error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            to: { email: recipientEmail, name: recipientName },
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
            tags: ['certificate', type === 'expired' ? 'expired' : 'reminder'],
            template_name: type === 'expired' ? 'certificate-expired' : 'certificate-reminder',
          },
        })

        if (emailError) {
          result.errors.push(`Failed to send ${type} email for ${certificate.name}: ${emailError.message}`)
        } else {
          result.notifications_sent++
          console.log(`Sent ${type} notification for certificate ${certificate.name} to ${recipientEmail}`)

          // Update reminder_sent_at
          await supabase
            .from('insurance_certificates')
            .update({
              reminder_sent_at: new Date().toISOString(),
              status: type === 'expired' ? 'expired' : 'expiring'
            })
            .eq('id', certificate.id)
        }

        // Create in-app notification
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('email', recipientEmail)
          .single()

        if (user) {
          await supabase.from('notifications').insert({
            user_id: user.id,
            type: type === 'expired' ? 'certificate_expired' : 'certificate_expiring',
            title: type === 'expired' ? 'Certificate Expired' : 'Certificate Expiring Soon',
            message: type === 'expired'
              ? `${certificate.name} for ${recipientName} expired ${daysValue} day(s) ago`
              : `${certificate.name} for ${recipientName} expires in ${daysValue} day(s)`,
            related_to_id: certificate.id,
            related_to_type: 'insurance_certificate',
            is_read: false,
          })
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        result.errors.push(`Error processing certificate ${certificate.name}: ${errorMsg}`)
        console.error(`Error processing certificate ${certificate.name}:`, error)
      }
    }

    // Send notifications for each category
    for (const certificate of categorizedCertificates.at90Days) {
      const daysUntil = Math.ceil((new Date(certificate.expiration_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      await sendNotification(certificate, 'first', daysUntil)
    }

    for (const certificate of categorizedCertificates.at60Days) {
      const daysUntil = Math.ceil((new Date(certificate.expiration_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      await sendNotification(certificate, 'second', daysUntil)
    }

    for (const certificate of categorizedCertificates.at30Days) {
      const daysUntil = Math.ceil((new Date(certificate.expiration_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      await sendNotification(certificate, 'third', daysUntil)
    }

    for (const { certificate, daysExpired } of categorizedCertificates.expired) {
      await sendNotification(certificate, 'expired', daysExpired)
    }

    console.log(`Completed. Sent ${result.notifications_sent} notifications. Errors: ${result.errors.length}`)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Check certificate expiration error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    result.errors.push(errorMessage)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
