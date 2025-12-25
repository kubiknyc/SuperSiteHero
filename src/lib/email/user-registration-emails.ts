/**
 * User Registration Email Service
 *
 * Functions for sending emails related to user registration and company approval flow
 */

import { sendEmail } from './email-service'
import type { EmailRecipient } from './email-service'
import {
  generateUserPendingApprovalEmail,
  generateUserApprovedEmail,
  generateUserRejectedEmail,
  type UserPendingApprovalData,
  type UserApprovedData,
  type UserRejectedData,
} from './templates'

/**
 * Send notification to company admin when a new user requests to join
 */
export async function sendUserPendingApprovalEmail(
  adminEmail: string,
  adminName: string,
  data: {
    companyName: string
    userName: string
    userEmail: string
    requestDate: string
    approvalUrl: string
  }
) {
  const emailData: UserPendingApprovalData = {
    adminName,
    companyName: data.companyName,
    userName: data.userName,
    userEmail: data.userEmail,
    requestDate: data.requestDate,
    approvalUrl: data.approvalUrl,
  }

  const { html, text, subject } = generateUserPendingApprovalEmail(emailData)

  const recipient: EmailRecipient = {
    email: adminEmail,
    name: adminName,
  }

  return sendEmail({
    to: recipient,
    subject,
    html,
    text,
    tags: ['user-registration', 'pending-approval'],
  })
}

/**
 * Send confirmation email to user when their access is approved
 */
export async function sendUserApprovedEmail(
  userEmail: string,
  userName: string,
  data: {
    companyName: string
    adminName: string
    approvedDate: string
    loginUrl: string
  }
) {
  const emailData: UserApprovedData = {
    userName,
    companyName: data.companyName,
    adminName: data.adminName,
    approvedDate: data.approvedDate,
    loginUrl: data.loginUrl,
  }

  const { html, text, subject } = generateUserApprovedEmail(emailData)

  const recipient: EmailRecipient = {
    email: userEmail,
    name: userName,
  }

  return sendEmail({
    to: recipient,
    subject,
    html,
    text,
    tags: ['user-registration', 'approval-confirmed'],
  })
}

/**
 * Send notification to user when their access request is rejected
 */
export async function sendUserRejectedEmail(
  userEmail: string,
  userName: string,
  data: {
    companyName: string
    rejectedDate: string
    supportEmail?: string
  }
) {
  const emailData: UserRejectedData = {
    userName,
    companyName: data.companyName,
    rejectedDate: data.rejectedDate,
    supportEmail: data.supportEmail,
  }

  const { html, text, subject } = generateUserRejectedEmail(emailData)

  const recipient: EmailRecipient = {
    email: userEmail,
    name: userName,
  }

  return sendEmail({
    to: recipient,
    subject,
    html,
    text,
    tags: ['user-registration', 'approval-rejected'],
  })
}

/**
 * Notify multiple company admins about a pending user
 * (sends individual emails to each admin)
 */
export async function notifyCompanyAdmins(
  admins: Array<{ email: string; name: string }>,
  data: {
    companyName: string
    userName: string
    userEmail: string
    requestDate: string
    approvalUrl: string
  }
) {
  const results = await Promise.allSettled(
    admins.map((admin) =>
      sendUserPendingApprovalEmail(admin.email, admin.name, data)
    )
  )

  const successful = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length

  return {
    total: admins.length,
    successful,
    failed,
    results,
  }
}
