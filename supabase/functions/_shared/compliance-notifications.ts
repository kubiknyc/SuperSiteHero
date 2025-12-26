// Compliance notification templates and utilities
// Handles email and in-app notifications for insurance compliance events

export interface NotificationRecipient {
  email: string
  name: string
  user_id?: string
}

export interface ComplianceNotificationContext {
  subcontractor_name: string
  project_name?: string
  certificate_type?: string
  expiration_date?: string
  days_until_expiry?: number
  days_expired?: number
  missing_coverage?: string[]
  insufficient_coverage?: string[]
  hold_reason?: string
  app_url: string
}

export type NotificationType =
  | 'expiring_30_days'
  | 'expiring_14_days'
  | 'expiring_7_days'
  | 'expired'
  | 'payment_hold_applied'
  | 'payment_hold_released'
  | 'compliance_restored'
  | 'new_certificate_uploaded'
  | 'certificate_needs_review'

/**
 * Generate email content for compliance notifications
 */
export function generateComplianceEmail(
  type: NotificationType,
  recipientName: string,
  context: ComplianceNotificationContext
): { subject: string; html: string; text: string } {
  switch (type) {
    case 'expiring_30_days':
      return generateExpiringEmail(recipientName, context, 30, '#f59e0b', '#fef3c7')
    case 'expiring_14_days':
      return generateExpiringEmail(recipientName, context, 14, '#f97316', '#ffedd5')
    case 'expiring_7_days':
      return generateExpiringEmail(recipientName, context, 7, '#ef4444', '#fee2e2')
    case 'expired':
      return generateExpiredEmail(recipientName, context)
    case 'payment_hold_applied':
      return generatePaymentHoldAppliedEmail(recipientName, context)
    case 'payment_hold_released':
      return generatePaymentHoldReleasedEmail(recipientName, context)
    case 'compliance_restored':
      return generateComplianceRestoredEmail(recipientName, context)
    case 'new_certificate_uploaded':
      return generateNewCertificateEmail(recipientName, context)
    case 'certificate_needs_review':
      return generateReviewNeededEmail(recipientName, context)
    default:
      throw new Error(`Unknown notification type: ${type}`)
  }
}

function generateExpiringEmail(
  recipientName: string,
  context: ComplianceNotificationContext,
  days: number,
  urgencyColor: string,
  bgColor: string
): { subject: string; html: string; text: string } {
  const urgencyLabel = days === 30 ? 'Advance Notice' : days === 14 ? 'Reminder' : 'Final Notice'

  const subject = `${urgencyLabel}: Insurance Certificate for ${context.subcontractor_name} expires in ${days} days`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: ${urgencyColor};">Insurance Certificate Renewal ${urgencyLabel}</h1>
      <p>Hi ${recipientName},</p>
      <p>An insurance certificate for <strong>${context.subcontractor_name}</strong> is approaching its expiration date.</p>

      <div style="background-color: ${bgColor}; border: 1px solid ${urgencyColor}; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0; font-size: 14px; color: ${urgencyColor};">
          <strong>This certificate expires in ${days} days!</strong>
        </p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; width: 150px;"><strong>Subcontractor:</strong></td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${context.subcontractor_name}</td>
        </tr>
        ${context.project_name ? `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Project:</strong></td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${context.project_name}</td>
        </tr>
        ` : ''}
        ${context.certificate_type ? `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Certificate Type:</strong></td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${context.certificate_type}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0;"><strong>Expiration Date:</strong></td>
          <td style="padding: 8px 0; font-weight: bold; color: ${urgencyColor};">${context.expiration_date}</td>
        </tr>
      </table>

      <p style="text-align: center;">
        <a href="${context.app_url}/insurance" style="display: inline-block; padding: 12px 24px; background-color: ${urgencyColor}; color: white; text-decoration: none; border-radius: 6px;">View Insurance Dashboard</a>
      </p>

      <p style="font-size: 12px; color: #6b7280; margin-top: 24px;">
        Please ensure the renewed certificate is uploaded before the expiration date to maintain compliance and avoid payment holds.
      </p>
    </body>
    </html>
  `

  const text = `
Insurance Certificate Renewal ${urgencyLabel}

Hi ${recipientName},

An insurance certificate for ${context.subcontractor_name} is approaching its expiration date.

This certificate expires in ${days} days!

Subcontractor: ${context.subcontractor_name}
${context.project_name ? `Project: ${context.project_name}` : ''}
${context.certificate_type ? `Certificate Type: ${context.certificate_type}` : ''}
Expiration Date: ${context.expiration_date}

View Insurance Dashboard: ${context.app_url}/insurance

Please ensure the renewed certificate is uploaded before the expiration date to maintain compliance and avoid payment holds.
  `.trim()

  return { subject, html, text }
}

function generateExpiredEmail(
  recipientName: string,
  context: ComplianceNotificationContext
): { subject: string; html: string; text: string } {
  const subject = `EXPIRED: Insurance Certificate for ${context.subcontractor_name} - Immediate Action Required`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #dc2626;">EXPIRED: Insurance Certificate Requires Immediate Attention</h1>
      <p>Hi ${recipientName},</p>
      <p>An insurance certificate for <strong>${context.subcontractor_name}</strong> has <strong>expired</strong>.</p>

      <div style="background-color: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0; font-size: 16px; color: #7f1d1d; font-weight: bold;">
          This certificate expired ${context.days_expired} day${context.days_expired !== 1 ? 's' : ''} ago!
        </p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #991b1b;">
          <strong>A payment hold may be applied</strong> until valid coverage is provided.
        </p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; width: 150px;"><strong>Subcontractor:</strong></td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${context.subcontractor_name}</td>
        </tr>
        ${context.project_name ? `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Project:</strong></td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${context.project_name}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0;"><strong>Expired:</strong></td>
          <td style="padding: 8px 0; font-weight: bold; color: #dc2626;">${context.expiration_date}</td>
        </tr>
      </table>

      <p style="text-align: center;">
        <a href="${context.app_url}/insurance" style="display: inline-block; padding: 12px 24px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 6px;">Upload Renewed Certificate</a>
      </p>

      <p style="background-color: #fef2f2; padding: 12px; border-radius: 8px; font-size: 14px; color: #7f1d1d; margin-top: 24px;">
        <strong>Important:</strong> Operating without valid insurance certificates may expose your company to significant liability. Please upload the renewed certificate immediately.
      </p>
    </body>
    </html>
  `

  const text = `
EXPIRED: Insurance Certificate Requires Immediate Attention

Hi ${recipientName},

An insurance certificate for ${context.subcontractor_name} has EXPIRED.

This certificate expired ${context.days_expired} day${context.days_expired !== 1 ? 's' : ''} ago!
A payment hold may be applied until valid coverage is provided.

Subcontractor: ${context.subcontractor_name}
${context.project_name ? `Project: ${context.project_name}` : ''}
Expired: ${context.expiration_date}

Upload Renewed Certificate: ${context.app_url}/insurance

Important: Operating without valid insurance certificates may expose your company to significant liability. Please upload the renewed certificate immediately.
  `.trim()

  return { subject, html, text }
}

function generatePaymentHoldAppliedEmail(
  recipientName: string,
  context: ComplianceNotificationContext
): { subject: string; html: string; text: string } {
  const subject = `Payment Hold Applied: ${context.subcontractor_name} - Insurance Compliance Issue`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #dc2626;">Payment Hold Applied</h1>
      <p>Hi ${recipientName},</p>
      <p>A payment hold has been applied to <strong>${context.subcontractor_name}</strong> due to insurance compliance issues.</p>

      <div style="background-color: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0; font-size: 14px; color: #7f1d1d;">
          <strong>Reason:</strong> ${context.hold_reason || 'Insurance compliance issue'}
        </p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #991b1b;">
          Payment applications cannot be approved until compliance is restored.
        </p>
      </div>

      ${context.missing_coverage && context.missing_coverage.length > 0 ? `
      <div style="margin: 16px 0;">
        <p style="font-weight: bold; margin-bottom: 8px;">Missing Coverage:</p>
        <ul style="margin: 0; padding-left: 20px;">
          ${context.missing_coverage.map(c => `<li>${c}</li>`).join('')}
        </ul>
      </div>
      ` : ''}

      ${context.insufficient_coverage && context.insufficient_coverage.length > 0 ? `
      <div style="margin: 16px 0;">
        <p style="font-weight: bold; margin-bottom: 8px;">Insufficient Coverage:</p>
        <ul style="margin: 0; padding-left: 20px;">
          ${context.insufficient_coverage.map(c => `<li>${c}</li>`).join('')}
        </ul>
      </div>
      ` : ''}

      <p style="text-align: center;">
        <a href="${context.app_url}/insurance" style="display: inline-block; padding: 12px 24px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 6px;">Resolve Compliance Issues</a>
      </p>
    </body>
    </html>
  `

  const text = `
Payment Hold Applied

Hi ${recipientName},

A payment hold has been applied to ${context.subcontractor_name} due to insurance compliance issues.

Reason: ${context.hold_reason || 'Insurance compliance issue'}

Payment applications cannot be approved until compliance is restored.

${context.missing_coverage && context.missing_coverage.length > 0 ? `Missing Coverage:\n${context.missing_coverage.map(c => `- ${c}`).join('\n')}` : ''}

${context.insufficient_coverage && context.insufficient_coverage.length > 0 ? `Insufficient Coverage:\n${context.insufficient_coverage.map(c => `- ${c}`).join('\n')}` : ''}

Resolve Compliance Issues: ${context.app_url}/insurance
  `.trim()

  return { subject, html, text }
}

function generatePaymentHoldReleasedEmail(
  recipientName: string,
  context: ComplianceNotificationContext
): { subject: string; html: string; text: string } {
  const subject = `Payment Hold Released: ${context.subcontractor_name} - Now Compliant`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #16a34a;">Payment Hold Released</h1>
      <p>Hi ${recipientName},</p>
      <p>Good news! The payment hold for <strong>${context.subcontractor_name}</strong> has been released.</p>

      <div style="background-color: #f0fdf4; border: 1px solid #16a34a; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0; font-size: 14px; color: #166534;">
          Insurance compliance has been restored. Payment applications can now proceed normally.
        </p>
      </div>

      <p style="text-align: center;">
        <a href="${context.app_url}/insurance" style="display: inline-block; padding: 12px 24px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 6px;">View Insurance Dashboard</a>
      </p>
    </body>
    </html>
  `

  const text = `
Payment Hold Released

Hi ${recipientName},

Good news! The payment hold for ${context.subcontractor_name} has been released.

Insurance compliance has been restored. Payment applications can now proceed normally.

View Insurance Dashboard: ${context.app_url}/insurance
  `.trim()

  return { subject, html, text }
}

function generateComplianceRestoredEmail(
  recipientName: string,
  context: ComplianceNotificationContext
): { subject: string; html: string; text: string } {
  const subject = `Compliance Restored: ${context.subcontractor_name}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #16a34a;">Insurance Compliance Restored</h1>
      <p>Hi ${recipientName},</p>
      <p><strong>${context.subcontractor_name}</strong> is now fully compliant with insurance requirements.</p>

      <div style="background-color: #f0fdf4; border: 1px solid #16a34a; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0; font-size: 14px; color: #166534;">
          All required insurance certificates are current and meet project requirements.
        </p>
      </div>

      <p style="text-align: center;">
        <a href="${context.app_url}/insurance" style="display: inline-block; padding: 12px 24px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 6px;">View Insurance Dashboard</a>
      </p>
    </body>
    </html>
  `

  const text = `
Insurance Compliance Restored

Hi ${recipientName},

${context.subcontractor_name} is now fully compliant with insurance requirements.

All required insurance certificates are current and meet project requirements.

View Insurance Dashboard: ${context.app_url}/insurance
  `.trim()

  return { subject, html, text }
}

function generateNewCertificateEmail(
  recipientName: string,
  context: ComplianceNotificationContext
): { subject: string; html: string; text: string } {
  const subject = `New Insurance Certificate Uploaded: ${context.subcontractor_name}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #2563eb;">New Insurance Certificate Uploaded</h1>
      <p>Hi ${recipientName},</p>
      <p>A new insurance certificate has been uploaded for <strong>${context.subcontractor_name}</strong>.</p>

      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        ${context.certificate_type ? `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; width: 150px;"><strong>Certificate Type:</strong></td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${context.certificate_type}</td>
        </tr>
        ` : ''}
        ${context.expiration_date ? `
        <tr>
          <td style="padding: 8px 0;"><strong>Expiration Date:</strong></td>
          <td style="padding: 8px 0;">${context.expiration_date}</td>
        </tr>
        ` : ''}
      </table>

      <p style="text-align: center;">
        <a href="${context.app_url}/insurance" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px;">Review Certificate</a>
      </p>
    </body>
    </html>
  `

  const text = `
New Insurance Certificate Uploaded

Hi ${recipientName},

A new insurance certificate has been uploaded for ${context.subcontractor_name}.

${context.certificate_type ? `Certificate Type: ${context.certificate_type}` : ''}
${context.expiration_date ? `Expiration Date: ${context.expiration_date}` : ''}

Review Certificate: ${context.app_url}/insurance
  `.trim()

  return { subject, html, text }
}

function generateReviewNeededEmail(
  recipientName: string,
  context: ComplianceNotificationContext
): { subject: string; html: string; text: string } {
  const subject = `Review Required: Insurance Certificate for ${context.subcontractor_name}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #f59e0b;">Certificate Review Required</h1>
      <p>Hi ${recipientName},</p>
      <p>An insurance certificate for <strong>${context.subcontractor_name}</strong> needs manual review.</p>

      <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0; font-size: 14px; color: #92400e;">
          The AI extraction system flagged this certificate for manual verification. This may be due to low confidence in the extracted data or potential compliance issues.
        </p>
      </div>

      <p style="text-align: center;">
        <a href="${context.app_url}/insurance" style="display: inline-block; padding: 12px 24px; background-color: #f59e0b; color: white; text-decoration: none; border-radius: 6px;">Review Certificate</a>
      </p>
    </body>
    </html>
  `

  const text = `
Certificate Review Required

Hi ${recipientName},

An insurance certificate for ${context.subcontractor_name} needs manual review.

The AI extraction system flagged this certificate for manual verification. This may be due to low confidence in the extracted data or potential compliance issues.

Review Certificate: ${context.app_url}/insurance
  `.trim()

  return { subject, html, text }
}

/**
 * Create in-app notification
 */
export interface InAppNotification {
  user_id: string
  type: string
  title: string
  message: string
  related_to_id?: string
  related_to_type: string
  is_read: boolean
  priority?: 'low' | 'normal' | 'high' | 'urgent'
}

export function createInAppNotification(
  userId: string,
  type: NotificationType,
  context: ComplianceNotificationContext
): InAppNotification {
  const priorityMap: Record<NotificationType, 'low' | 'normal' | 'high' | 'urgent'> = {
    expiring_30_days: 'normal',
    expiring_14_days: 'high',
    expiring_7_days: 'urgent',
    expired: 'urgent',
    payment_hold_applied: 'urgent',
    payment_hold_released: 'high',
    compliance_restored: 'normal',
    new_certificate_uploaded: 'low',
    certificate_needs_review: 'high',
  }

  const titleMap: Record<NotificationType, string> = {
    expiring_30_days: 'Certificate Expiring Soon',
    expiring_14_days: 'Certificate Expiring in 14 Days',
    expiring_7_days: 'Certificate Expiring in 7 Days',
    expired: 'Certificate Expired',
    payment_hold_applied: 'Payment Hold Applied',
    payment_hold_released: 'Payment Hold Released',
    compliance_restored: 'Compliance Restored',
    new_certificate_uploaded: 'New Certificate Uploaded',
    certificate_needs_review: 'Certificate Review Required',
  }

  const messageMap: Record<NotificationType, string> = {
    expiring_30_days: `Insurance certificate for ${context.subcontractor_name} expires in 30 days`,
    expiring_14_days: `Insurance certificate for ${context.subcontractor_name} expires in 14 days`,
    expiring_7_days: `Insurance certificate for ${context.subcontractor_name} expires in 7 days`,
    expired: `Insurance certificate for ${context.subcontractor_name} has expired`,
    payment_hold_applied: `Payment hold applied to ${context.subcontractor_name} due to insurance compliance`,
    payment_hold_released: `Payment hold released for ${context.subcontractor_name}`,
    compliance_restored: `${context.subcontractor_name} is now fully compliant`,
    new_certificate_uploaded: `New insurance certificate uploaded for ${context.subcontractor_name}`,
    certificate_needs_review: `Certificate for ${context.subcontractor_name} needs manual review`,
  }

  return {
    user_id: userId,
    type: `insurance_${type}`,
    title: titleMap[type],
    message: messageMap[type],
    related_to_type: 'insurance_certificate',
    is_read: false,
    priority: priorityMap[type],
  }
}
