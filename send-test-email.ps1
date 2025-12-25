# Test Email with Verified Domain
$supabaseUrl = "https://nxlznnrocrffnbzjaaae.supabase.co"
$serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bHpubnJvY3JmZm5iemphYWFlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzY3ODYwNSwiZXhwIjoyMDc5MjU0NjA1fQ.K9Zt9yUuYrTqTzTyXUUiTkee40R919fnY1o9iLmO1Tc"

Write-Host "Sending test email from jobsightapp.com..." -ForegroundColor Cyan

$jsonBody = @'
{
  "to": {
    "email": "kubiknyc@gmail.com",
    "name": "Test User"
  },
  "subject": "Test Email from JobSight - Verified Domain",
  "html": "<div style='font-family: Arial; max-width: 600px; margin: 0 auto;'><div style='background-color: #1E40AF; padding: 24px; text-align: center;'><h1 style='color: white; margin: 0;'>JobSight</h1></div><div style='padding: 32px; background-color: white;'><h2 style='color: #22c55e;'>Success! Domain Verified!</h2><p>Your email system is now fully operational with your verified domain.</p><div style='background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 24px 0;'><p style='margin: 0; color: #15803d; font-weight: bold;'>Domain: jobsightapp.com - VERIFIED</p><p style='margin: 8px 0 0 0; color: #15803d; font-weight: bold;'>Resend API: Connected</p><p style='margin: 8px 0 0 0; color: #15803d; font-weight: bold;'>Email Functions: Deployed</p><p style='margin: 8px 0 0 0; color: #15803d; font-weight: bold;'>Status: Production Ready</p></div><p><strong>You can now send emails to any address!</strong></p><ul><li>User approval notifications</li><li>Password reset emails</li><li>System notifications</li><li>Scheduled reports</li></ul></div><div style='background-color: #f8fafc; padding: 24px; text-align: center; color: #64748b;'><p>2025 JobSight. All rights reserved.</p></div></div>",
  "text": "Success! Your domain is verified and the email system is fully operational.",
  "template_name": "test-email-verified"
}
'@

try {
    $response = Invoke-RestMethod -Uri "$supabaseUrl/functions/v1/send-email" `
        -Method Post `
        -Headers @{
            "Authorization" = "Bearer $serviceRoleKey"
            "Content-Type" = "application/json"
        } `
        -Body $jsonBody

    if ($response.success) {
        Write-Host ""
        Write-Host "SUCCESS! Email sent successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "From: JobSight <noreply@jobsightapp.com>" -ForegroundColor Cyan
        Write-Host "To: kubiknyc@gmail.com" -ForegroundColor Cyan
        Write-Host "Resend Message ID: $($response.message_id)" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Check your inbox!" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Your email system is now PRODUCTION READY!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "Email function returned error:" -ForegroundColor Red
        Write-Host $response.error -ForegroundColor Red
    }
}
catch {
    Write-Host ""
    Write-Host "Failed to send email:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
