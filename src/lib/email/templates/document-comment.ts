/**
 * Document Comment Email Template
 *
 * Sent when someone comments on a document you own or are mentioned in.
 */

import { wrapInBaseTemplate, generatePlainText } from './base-template'

export interface DocumentCommentEmailData {
  recipientName: string
  documentName: string
  documentNumber?: string
  projectName: string
  commentBy: string
  commentAt: string
  comment: string
  isMention?: boolean
  viewUrl: string
}

export function generateDocumentCommentEmail(data: DocumentCommentEmailData): { html: string; text: string } {
  const title = data.isMention ? 'You Were Mentioned' : 'New Comment on Your Document'
  const preheaderText = data.isMention
    ? `${data.commentBy} mentioned you in a comment on "${data.documentName}"`
    : `${data.commentBy} commented on "${data.documentName}"`

  const content = `
    <h1 className="heading-page">${title}</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      ${data.isMention
        ? `<strong>${data.commentBy}</strong> mentioned you in a comment on`
        : `<strong>${data.commentBy}</strong> left a comment on`
      }
      a document in the <strong>${data.projectName}</strong> project.
    </p>

    <div class="info-box">
      <table class="data-table" style="margin: 0;">
        <tr>
          <td style="width: 120px; padding: 8px 0; border: none;"><strong>Document:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.documentName}</td>
        </tr>
        ${data.documentNumber ? `
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Doc Number:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.documentNumber}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Comment By:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.commentBy}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Time:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.commentAt}</td>
        </tr>
      </table>
    </div>

    <div style="margin-top: 16px; padding: 16px; background-color: #f0f9ff; border-radius: 8px; border-left: 4px solid #0ea5e9;">
      <p style="margin: 0 0 8px 0;"><strong>Comment:</strong></p>
      <p style="margin: 0; white-space: pre-wrap;">${data.comment}</p>
    </div>

    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.viewUrl}" class="button">
        View Document & Reply
      </a>
    </p>

    <p class="muted text-small" style="text-align: center;">
      Or copy this link: ${data.viewUrl}
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: preheaderText,
    content,
  })

  const text = generatePlainText(content)

  return { html, text }
}
