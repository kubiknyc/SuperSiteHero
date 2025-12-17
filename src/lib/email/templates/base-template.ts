/**
 * Base Email Template
 *
 * Provides consistent branding and layout for all emails.
 */

export interface BaseTemplateData {
  preheader?: string
  content: string
  footerText?: string
  unsubscribeUrl?: string
}

/**
 * Wrap content in the base email template
 */
export function wrapInBaseTemplate(data: BaseTemplateData): string {
  const year = new Date().getFullYear()
  const footerText = data.footerText || `&copy; ${year} JobSight. All rights reserved.`

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>JobSight</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Reset */
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }

    /* Base styles */
    body {
      margin: 0 !important;
      padding: 0 !important;
      background-color: #f4f4f5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }

    .email-container {
      max-width: 600px;
      margin: 0 auto;
    }

    .email-header {
      background-color: #F97316;
      padding: 24px;
      text-align: center;
    }

    .logo {
      color: #ffffff;
      font-size: 24px;
      font-weight: bold;
      text-decoration: none;
    }

    .logo-icon {
      display: inline-block;
      background-color: #EA580C;
      border-radius: 8px;
      padding: 8px 12px;
      margin-right: 8px;
    }

    .email-body {
      background-color: #ffffff;
      padding: 32px 24px;
    }

    .email-footer {
      background-color: #f8fafc;
      padding: 24px;
      text-align: center;
      color: #64748b;
      font-size: 12px;
    }

    .button {
      display: inline-block;
      background-color: #F97316;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-weight: 600;
      margin: 16px 0;
    }

    .button:hover {
      background-color: #EA580C;
    }

    .button-secondary {
      background-color: #64748b;
    }

    .button-danger {
      background-color: #dc2626;
    }

    .button-success {
      background-color: #16a34a;
    }

    h1 {
      color: #1e293b;
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 16px 0;
    }

    h2 {
      color: #1e293b;
      font-size: 20px;
      font-weight: 600;
      margin: 0 0 12px 0;
    }

    p {
      color: #475569;
      font-size: 16px;
      line-height: 24px;
      margin: 0 0 16px 0;
    }

    .muted {
      color: #94a3b8;
    }

    .text-small {
      font-size: 14px;
    }

    .info-box {
      background-color: #fff7ed;
      border-left: 4px solid #F97316;
      padding: 16px;
      margin: 16px 0;
    }

    .warning-box {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 16px;
      margin: 16px 0;
    }

    .danger-box {
      background-color: #fee2e2;
      border-left: 4px solid #dc2626;
      padding: 16px;
      margin: 16px 0;
    }

    .success-box {
      background-color: #dcfce7;
      border-left: 4px solid #16a34a;
      padding: 16px;
      margin: 16px 0;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }

    .data-table th,
    .data-table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }

    .data-table th {
      background-color: #f8fafc;
      color: #64748b;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
    }

    @media screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
      }
      .email-body {
        padding: 24px 16px !important;
      }
    }
  </style>
</head>
<body>
  ${data.preheader ? `
  <!-- Preheader text (hidden) -->
  <div style="display: none; font-size: 1px; color: #f4f4f5; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${data.preheader}
  </div>
  ` : ''}

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td style="padding: 24px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" class="email-container" align="center" width="600">
          <!-- Header -->
          <tr>
            <td class="email-header">
              <a href="${import.meta.env.VITE_APP_URL || 'https://jobsightapp.com'}" class="logo" style="text-decoration: none;">
                <div style="display: inline-block; margin-bottom: 8px;">
                  <span style="color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                    Job<span style="color: #FED7AA;">Sight</span>
                  </span>
                </div>
                <div style="color: #FED7AA; font-size: 12px; font-weight: 400; letter-spacing: 0.5px; text-transform: uppercase;">
                  Construction Field Management
                </div>
              </a>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="email-body">
              ${data.content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="email-footer">
              <p style="margin: 0 0 8px 0;">
                ${footerText}
              </p>
              ${data.unsubscribeUrl ? `
              <p style="margin: 0;">
                <a href="${data.unsubscribeUrl}" style="color: #64748b; text-decoration: underline;">
                  Unsubscribe from these emails
                </a>
              </p>
              ` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

/**
 * Generate plain text version from HTML content
 */
export function generatePlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&copy;/g, '(c)')
    .replace(/\s+/g, ' ')
    .trim()
}
