/**
 * Email Test Utility
 *
 * Run this from browser console to test email sending:
 *
 * import { testEmailSending } from '@/lib/email/test-email'
 * testEmailSending('your@email.com')
 */

import { sendEmail } from './email-service'
import { generatePortalInvitationEmail } from './templates'
import { logger } from '../utils/logger';


export async function testEmailSending(recipientEmail: string): Promise<void> {
  logger.log('[Email Test] Starting email test...')
  logger.log('[Email Test] Recipient:', recipientEmail)
  logger.log('[Email Test] Provider:', import.meta.env.VITE_EMAIL_PROVIDER || 'console')

  try {
    // Generate test email content
    const { html, text } = generatePortalInvitationEmail({
      recipientName: 'Test User',
      recipientEmail,
      companyName: 'Test Company',
      projectName: 'Test Project',
      invitedBy: 'System Test',
      accessLevel: 'Full Access',
      expiresAt: '7 days',
      invitationUrl: 'http://localhost:5173/portal/test',
    })

    logger.log('[Email Test] Generated email content')
    logger.log('[Email Test] Sending via Resend Edge Function...')

    const result = await sendEmail({
      to: { email: recipientEmail, name: 'Test User' },
      subject: '[TEST] JobSight Email Test',
      html,
      text,
      tags: ['test', 'email-verification'],
    })

    logger.log('[Email Test] Result:', result)

    if (result.success) {
      logger.log('[Email Test] ✅ SUCCESS! Message ID:', result.messageId)
      logger.log('[Email Test] Check your inbox at:', recipientEmail)
    } else {
      logger.error('[Email Test] ❌ FAILED:', result.error)
    }
  } catch (error) {
    logger.error('[Email Test] ❌ EXCEPTION:', error)
  }
}

// Make it available on window for easy browser console access
if (typeof window !== 'undefined') {
  (window as any).testEmailSending = testEmailSending
}
