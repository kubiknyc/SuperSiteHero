/**
 * Comment Mention Email Template
 *
 * Sent when someone @mentions a user in a comment on any entity type
 * (RFIs, Submittals, Change Orders, Workflow Items, Documents, etc.)
 */

import { wrapInBaseTemplate, generatePlainText } from './base-template'

export interface CommentMentionEmailData {
  recipientName: string
  mentionedBy: string
  entityType: 'rfi' | 'submittal' | 'change_order' | 'document' | 'task' | 'daily_report' | 'punch_item' | 'message' | 'general'
  entityName: string
  entityNumber?: string
  projectName: string
  commentText: string
  commentedAt: string
  viewUrl: string
  replyUrl?: string
}

// Entity type display configuration
const ENTITY_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  rfi: { label: 'RFI', icon: '📋', color: '#3b82f6' },
  submittal: { label: 'Submittal', icon: '📤', color: '#8b5cf6' },
  change_order: { label: 'Change Order', icon: '📝', color: '#f59e0b' },
  document: { label: 'Document', icon: '📄', color: '#6b7280' },
  task: { label: 'Task', icon: '✅', color: '#22c55e' },
  daily_report: { label: 'Daily Report', icon: '📅', color: '#0ea5e9' },
  punch_item: { label: 'Punch Item', icon: '🔧', color: '#ef4444' },
  message: { label: 'Message', icon: '💬', color: '#10b981' },
  general: { label: 'Comment', icon: '💬', color: '#6b7280' },
}

export function generateCommentMentionEmail(data: CommentMentionEmailData): { html: string; text: string } {
  const entityConfig = ENTITY_CONFIG[data.entityType] || ENTITY_CONFIG.general
  const entityDisplay = data.entityNumber
    ? `${entityConfig.label} ${data.entityNumber}`
    : entityConfig.label

  // Truncate comment if too long for preview
  const commentPreview = data.commentText.length > 500
    ? data.commentText.substring(0, 500) + '...'
    : data.commentText

  const content = `
    <h1 style="color: ${entityConfig.color};">
      ${entityConfig.icon} You Were Mentioned
    </h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      <strong>${data.mentionedBy}</strong> mentioned you in a comment on
      <strong>${entityDisplay}</strong> in the <strong>${data.projectName}</strong> project.
    </p>

    <div class="info-box">
      <table class="data-table" style="margin: 0;">
        <tr>
          <td style="width: 140px; padding: 8px 0; border: none;"><strong>${entityConfig.label}:</strong></td>
          <td style="padding: 8px 0; border: none;">
            ${data.entityNumber ? `<strong>${data.entityNumber}</strong> - ` : ''}${data.entityName}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Project:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.projectName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Mentioned By:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.mentionedBy}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Time:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.commentedAt}</td>
        </tr>
      </table>
    </div>

    <div style="margin-top: 16px; padding: 16px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
      <p style="margin: 0 0 8px 0; font-size: 12px; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px;">
        <strong>Comment mentioning you:</strong>
      </p>
      <p style="margin: 0; white-space: pre-wrap; color: #1f2937;">${commentPreview}</p>
    </div>

    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.viewUrl}" class="button" style="background-color: ${entityConfig.color};">
        View ${entityConfig.label} & Reply
      </a>
    </p>

    ${data.replyUrl && data.replyUrl !== data.viewUrl ? `
    <p style="text-align: center; margin-top: 12px;">
      <a href="${data.replyUrl}" style="color: ${entityConfig.color}; text-decoration: underline;">
        Reply directly to this comment
      </a>
    </p>
    ` : ''}

    <p class="muted text-small" style="text-align: center;">
      Or copy this link: ${data.viewUrl}
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

    <p class="muted text-small">
      You received this email because you were @mentioned in a comment.
      You can adjust your notification preferences in your account settings.
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `${data.mentionedBy} mentioned you in a ${entityConfig.label.toLowerCase()} comment on ${data.projectName}`,
    content,
  })

  const text = generatePlainText(content)

  return { html, text }
}

/**
 * Generate a batch mention email for multiple mentions
 */
export interface BatchMentionEmailData {
  recipientName: string
  mentions: Array<{
    mentionedBy: string
    entityType: CommentMentionEmailData['entityType']
    entityName: string
    entityNumber?: string
    projectName: string
    commentPreview: string
    commentedAt: string
    viewUrl: string
  }>
}

export function generateBatchMentionEmail(data: BatchMentionEmailData): { html: string; text: string } {
  const mentionCount = data.mentions.length

  const mentionsHtml = data.mentions.slice(0, 10).map((mention, index) => {
    const config = ENTITY_CONFIG[mention.entityType] || ENTITY_CONFIG.general
    const preview = mention.commentPreview.length > 150
      ? mention.commentPreview.substring(0, 150) + '...'
      : mention.commentPreview

    return `
      <div style="padding: 16px; background-color: ${index % 2 === 0 ? '#f9fafb' : '#ffffff'}; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid ${config.color};">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <div>
            <strong style="color: ${config.color};">${config.icon} ${config.label}</strong>
            ${mention.entityNumber ? `<span style="color: #6b7280;"> #${mention.entityNumber}</span>` : ''}
          </div>
          <span style="font-size: 12px; color: #9ca3af;">${mention.commentedAt}</span>
        </div>
        <p style="margin: 0 0 8px 0; font-size: 14px;">
          <strong>${mention.mentionedBy}</strong> mentioned you on <strong>${mention.projectName}</strong>
        </p>
        <p style="margin: 0; font-size: 13px; color: #4b5563; font-style: italic;">
          "${preview}"
        </p>
        <a href="${mention.viewUrl}" style="display: inline-block; margin-top: 8px; font-size: 13px; color: ${config.color};">
          View & Reply &rarr;
        </a>
      </div>
    `
  }).join('')

  const content = `
    <h1>You Have ${mentionCount} New Mention${mentionCount !== 1 ? 's' : ''}</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      You've been @mentioned in ${mentionCount} comment${mentionCount !== 1 ? 's' : ''} across your projects.
    </p>

    ${mentionsHtml}

    ${mentionCount > 10 ? `
    <p style="text-align: center; color: #6b7280; font-size: 14px;">
      ...and ${mentionCount - 10} more mentions
    </p>
    ` : ''}

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

    <p class="muted text-small">
      You received this email because you were @mentioned in comments.
      You can adjust your notification preferences in your account settings.
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `You have ${mentionCount} new mention${mentionCount !== 1 ? 's' : ''} across your projects`,
    content,
  })

  const text = generatePlainText(content)

  return { html, text }
}
