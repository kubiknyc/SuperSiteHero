# Test Email Script
# Sends a test email to verify Resend configuration

$supabaseUrl = "https://nxlznnrocrffnbzjaaae.supabase.co"
$serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bHpubnJvY3JmZm5iemphYWFlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzY3ODYwNSwiZXhwIjoyMDc5MjU0NjA1fQ.K9Zt9yUuYrTqTzTyXUUiTkee40R919fnY1o9iLmO1Tc"
$testEmail = "kubiknyc@gmail.com"

Write-Host "Sending test email to: $testEmail" -ForegroundColor Cyan
Write-Host ""

$body = @{
    to = @{
        email = $testEmail
        name = "Test User"
    }
    subject = "Test Email from JobSight"
    html = @"
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Email</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto;">
    <!-- Header -->
    <div style="background-color: #1E40AF; padding: 24px; text-align: center;">
      <div style="color: #ffffff; font-size: 24px; font-weight: bold;">JobSight</div>
    </div>

    <!-- Body -->
    <div style="background-color: #ffffff; padding: 32px 24px;">
      <h1 style="color: #0f172a; font-size: 28px; margin: 0 0 24px 0;">Email Test Successful! ✓</h1>

      <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 16px 0;">
        If you're reading this, your Resend integration is working correctly.
      </p>

      <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 24px 0; border-radius: 4px;">
        <p style="margin: 0 0 8px 0; color: #15803d; font-weight: 600;">✓ Resend API Key: Configured</p>
        <p style="margin: 8px 0 0 0; color: #15803d; font-weight: 600;">✓ Email Service: Active</p>
        <p style="margin: 8px 0 0 0; color: #15803d; font-weight: 600;">✓ Template Rendering: Working</p>
        <p style="margin: 8px 0 0 0; color: #15803d; font-weight: 600;">✓ Database Logging: Enabled</p>
      </div>

      <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 16px 0;">
        <strong>Test Details:</strong>
      </p>
      <ul style="color: #475569; line-height: 24px;">
        <li>Sent via: Resend API</li>
        <li>Function: send-email (v11)</li>
        <li>Template: Professional HTML + Text</li>
        <li>Recipient: $testEmail</li>
      </ul>

      <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0; border-radius: 4px;">
        <p style="margin: 0; color: #1e40af; font-size: 14px;">
          <strong>Next Step:</strong> Test the approval workflow by creating a pending user and approving them.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 24px; text-align: center; color: #64748b; font-size: 14px;">
      <p style="margin: 0 0 8px 0;">© 2025 JobSight. All rights reserved.</p>
      <p style="margin: 0;">This is an automated test email.</p>
    </div>
  </div>
</body>
</html>
"@
    text = "Email Test Successful! If you're reading this, your Resend integration is working correctly. Test Details: Sent via Resend API, Function: send-email (v11), Template: Professional HTML + Text, Recipient: $testEmail"
    template_name = "test-email"
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "$supabaseUrl/functions/v1/send-email" `
        -Method Post `
        -Headers @{
            "Authorization" = "Bearer $serviceRoleKey"
            "Content-Type" = "application/json"
        } `
        -Body $body

    Write-Host "Email sent successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10 | Write-Host
    Write-Host ""
    Write-Host "Check your inbox at: $testEmail" -ForegroundColor Yellow
    Write-Host "Check your spam folder too!" -ForegroundColor Yellow
}
catch {
    Write-Host "Failed to send email" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Red
    $_.ErrorDetails.Message | Write-Host
}
