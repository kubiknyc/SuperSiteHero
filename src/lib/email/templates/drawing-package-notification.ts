/**
 * Drawing Package Notification Email Template
 *
 * Sent to recipients when a drawing package is distributed.
 */

import { wrapInBaseTemplate, generatePlainText } from './base-template';

export interface DrawingPackageEmailData {
  recipientName: string;
  recipientEmail: string;
  recipientCompany?: string;
  senderName: string;
  senderCompany: string;
  projectName: string;
  packageName: string;
  packageNumber: string;
  packageType: string;
  packageDescription?: string;
  drawingCount: number;
  requiresAcknowledgment: boolean;
  acknowledgmentDeadline?: string;
  expiresAt?: string;
  accessUrl: string;
  downloadUrl?: string;
}

export function generateDrawingPackageNotificationEmail(
  data: DrawingPackageEmailData
): { html: string; text: string; subject: string } {
  const packageTypeLabels: Record<string, string> = {
    bid: 'Bid Package',
    submittal: 'Submittal Package',
    construction: 'Construction Package',
    as_built: 'As-Built Package',
  };

  const packageTypeLabel = packageTypeLabels[data.packageType] || data.packageType;

  const content = `
    <h1 className="heading-page">Drawing Package Available</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      <strong>${data.senderName}</strong> from <strong>${data.senderCompany}</strong> has shared
      a drawing package with you for the <strong>${data.projectName}</strong> project.
    </p>

    <div class="info-box">
      <table style="width: 100%; margin: 0;">
        <tr>
          <td style="width: 140px; padding: 8px 0; border: none; vertical-align: top;"><strong>Package:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.packageName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none; vertical-align: top;"><strong>Package Number:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.packageNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none; vertical-align: top;"><strong>Type:</strong></td>
          <td style="padding: 8px 0; border: none;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background-color: #3b82f6; color: white; font-size: 12px;">
              ${packageTypeLabel}
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none; vertical-align: top;"><strong>Drawings:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.drawingCount} drawing${data.drawingCount !== 1 ? 's' : ''}</td>
        </tr>
        ${data.packageDescription ? `
        <tr>
          <td style="padding: 8px 0; border: none; vertical-align: top;"><strong>Description:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.packageDescription}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    ${data.requiresAcknowledgment ? `
    <div class="warning-box">
      <p style="margin: 0 0 8px 0; font-weight: bold; color: #92400e;">Acknowledgment Required</p>
      <p style="margin: 0; color: #92400e;">
        Please review and acknowledge receipt of this drawing package.
        ${data.acknowledgmentDeadline ? `<br><strong>Deadline:</strong> ${data.acknowledgmentDeadline}` : ''}
      </p>
    </div>
    ` : ''}

    <div style="margin-top: 24px; padding: 16px; background-color: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
      <p style="margin: 0 0 8px 0; font-weight: bold; color: #166534;">What's Included:</p>
      <ul style="margin: 0; padding-left: 20px; color: #166534;">
        <li>Cover sheet with project information</li>
        <li>Table of contents</li>
        <li>All ${data.drawingCount} drawing${data.drawingCount !== 1 ? 's' : ''} in the package</li>
        <li>Revision history</li>
      </ul>
    </div>

    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.accessUrl}" class="button">
        View Drawing Package
      </a>
    </p>

    ${data.downloadUrl ? `
    <p style="text-align: center;">
      <a href="${data.downloadUrl}" class="button button-secondary">
        Download All Drawings
      </a>
    </p>
    ` : ''}

    <p class="muted text-small" style="text-align: center; margin-top: 16px;">
      Or copy this link to access the package:<br>
      <a href="${data.accessUrl}" style="color: #64748b;">${data.accessUrl}</a>
    </p>

    ${data.expiresAt ? `
    <p class="muted text-small" style="margin-top: 24px;">
      <strong>Note:</strong> This link will expire on ${data.expiresAt}. Please download the drawings before this date.
    </p>
    ` : ''}

    <p class="muted text-small" style="margin-top: 24px;">
      If you have any questions about this package, please contact ${data.senderName} at ${data.senderCompany}.
    </p>
  `;

  const html = wrapInBaseTemplate({
    preheader: `${data.senderName} shared "${data.packageName}" drawing package with you`,
    content,
  });

  const text = generatePlainText(content);

  const subject = `Drawing Package: ${data.packageName} - ${data.projectName}`;

  return { html, text, subject };
}

/**
 * Generate acknowledgment reminder email
 */
export interface AcknowledgmentReminderEmailData {
  recipientName: string;
  senderName: string;
  senderCompany: string;
  projectName: string;
  packageName: string;
  packageNumber: string;
  acknowledgmentDeadline: string;
  daysRemaining: number;
  accessUrl: string;
}

export function generateAcknowledgmentReminderEmail(
  data: AcknowledgmentReminderEmailData
): { html: string; text: string; subject: string } {
  const urgencyClass = data.daysRemaining <= 1 ? 'danger-box' : 'warning-box';
  const urgencyColor = data.daysRemaining <= 1 ? '#991b1b' : '#92400e';

  const content = `
    <h1 className="heading-page">Acknowledgment Reminder</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      This is a reminder that you have not yet acknowledged receipt of the
      <strong>${data.packageName}</strong> drawing package for the
      <strong>${data.projectName}</strong> project.
    </p>

    <div class="${urgencyClass}">
      <p style="margin: 0; font-weight: bold; color: ${urgencyColor};">
        ${data.daysRemaining <= 0
          ? 'Acknowledgment is overdue!'
          : data.daysRemaining === 1
            ? 'Only 1 day remaining!'
            : `${data.daysRemaining} days remaining`}
      </p>
      <p style="margin: 8px 0 0 0; color: ${urgencyColor};">
        Deadline: ${data.acknowledgmentDeadline}
      </p>
    </div>

    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.accessUrl}" class="button">
        View & Acknowledge Package
      </a>
    </p>

    <p class="muted text-small" style="margin-top: 24px;">
      If you have already reviewed this package, please click the button above
      to formally acknowledge receipt. If you have questions, please contact
      ${data.senderName} at ${data.senderCompany}.
    </p>
  `;

  const html = wrapInBaseTemplate({
    preheader: `Reminder: Please acknowledge "${data.packageName}" drawing package`,
    content,
  });

  const text = generatePlainText(content);

  const subject = `Reminder: Acknowledge Drawing Package - ${data.packageName}`;

  return { html, text, subject };
}

/**
 * Generate download notification email (sent to package owner)
 */
export interface DownloadNotificationEmailData {
  ownerName: string;
  recipientName: string;
  recipientEmail: string;
  recipientCompany?: string;
  projectName: string;
  packageName: string;
  packageNumber: string;
  downloadedAt: string;
}

export function generateDownloadNotificationEmail(
  data: DownloadNotificationEmailData
): { html: string; text: string; subject: string } {
  const content = `
    <h1 className="heading-page">Package Downloaded</h1>

    <p>Hi ${data.ownerName},</p>

    <p>
      Your drawing package has been downloaded by a recipient.
    </p>

    <div class="success-box">
      <table style="width: 100%; margin: 0;">
        <tr>
          <td style="width: 120px; padding: 8px 0; border: none;"><strong>Package:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.packageName} (${data.packageNumber})</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Project:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.projectName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Downloaded by:</strong></td>
          <td style="padding: 8px 0; border: none;">
            ${data.recipientName}${data.recipientCompany ? ` (${data.recipientCompany})` : ''}<br>
            <span class="muted">${data.recipientEmail}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Downloaded at:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.downloadedAt}</td>
        </tr>
      </table>
    </div>

    <p class="muted text-small">
      This notification is sent automatically when recipients download drawing packages.
      You can manage your notification preferences in your JobSight settings.
    </p>
  `;

  const html = wrapInBaseTemplate({
    preheader: `${data.recipientName} downloaded "${data.packageName}"`,
    content,
  });

  const text = generatePlainText(content);

  const subject = `Package Downloaded: ${data.packageName} by ${data.recipientName}`;

  return { html, text, subject };
}

/**
 * Generate acknowledgment notification email (sent to package owner)
 */
export interface AcknowledgmentNotificationEmailData {
  ownerName: string;
  recipientName: string;
  recipientEmail: string;
  recipientCompany?: string;
  projectName: string;
  packageName: string;
  packageNumber: string;
  acknowledgedAt: string;
  acknowledgmentNotes?: string;
}

export function generateAcknowledgmentNotificationEmail(
  data: AcknowledgmentNotificationEmailData
): { html: string; text: string; subject: string } {
  const content = `
    <h1 className="heading-page">Package Acknowledged</h1>

    <p>Hi ${data.ownerName},</p>

    <p>
      A recipient has acknowledged receipt of your drawing package.
    </p>

    <div class="success-box">
      <table style="width: 100%; margin: 0;">
        <tr>
          <td style="width: 130px; padding: 8px 0; border: none;"><strong>Package:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.packageName} (${data.packageNumber})</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Project:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.projectName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Acknowledged by:</strong></td>
          <td style="padding: 8px 0; border: none;">
            ${data.recipientName}${data.recipientCompany ? ` (${data.recipientCompany})` : ''}<br>
            <span class="muted">${data.recipientEmail}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Acknowledged at:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.acknowledgedAt}</td>
        </tr>
        ${data.acknowledgmentNotes ? `
        <tr>
          <td style="padding: 8px 0; border: none; vertical-align: top;"><strong>Notes:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.acknowledgmentNotes}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <p class="muted text-small">
      This notification is sent automatically when recipients acknowledge drawing packages.
      You can manage your notification preferences in your JobSight settings.
    </p>
  `;

  const html = wrapInBaseTemplate({
    preheader: `${data.recipientName} acknowledged "${data.packageName}"`,
    content,
  });

  const text = generatePlainText(content);

  const subject = `Package Acknowledged: ${data.packageName} by ${data.recipientName}`;

  return { html, text, subject };
}
