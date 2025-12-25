# ============================================================================
# APPROVAL WORKFLOW TEST SCRIPT
# ============================================================================
# Tests the complete user approval workflow

$supabaseUrl = "https://nxlznnrocrffnbzjaaae.supabase.co"
$serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bHpubnJvY3JmZm5iemphYWFlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzY3ODYwNSwiZXhwIjoyMDc5MjU0NjA1fQ.K9Zt9yUuYrTqTzTyXUUiTkee40R919fnY1o9iLmO1Tc"

# Test user IDs (from setup script)
$adminUserId = "00000000-0000-0000-0000-000000000010"
$pendingUserId = "00000000-0000-0000-0000-000000000020"

Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "TESTING APPROVAL WORKFLOW" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# STEP 1: Get Pending Users
# ============================================================================
Write-Host "STEP 1: Fetching pending users..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$supabaseUrl/functions/v1/get-pending-users" `
        -Method Post `
        -Headers @{
            "Authorization" = "Bearer $serviceRoleKey"
            "Content-Type" = "application/json"
        }

    Write-Host "Success! Found pending users:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 5 | Write-Host
    Write-Host ""
}
catch {
    Write-Host "Failed to get pending users:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
}

# ============================================================================
# STEP 2: Approve Pending User
# ============================================================================
Write-Host "STEP 2: Approving pending user..." -ForegroundColor Yellow

$approvalBody = @{
    userId = $pendingUserId
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$supabaseUrl/functions/v1/approve-user" `
        -Method Post `
        -Headers @{
            "Authorization" = "Bearer $serviceRoleKey"
            "Content-Type" = "application/json"
        } `
        -Body $approvalBody

    if ($response.success) {
        Write-Host "SUCCESS! User approved!" -ForegroundColor Green
        Write-Host ""
        Write-Host "User ID: $pendingUserId" -ForegroundColor Cyan
        Write-Host "Status: Approved" -ForegroundColor Green
        Write-Host "Email should be sent to: pending@testcompany.com" -ForegroundColor Cyan
        Write-Host ""
    } else {
        Write-Host "Approval returned error:" -ForegroundColor Red
        Write-Host $response | ConvertTo-Json -ForegroundColor Red
    }
}
catch {
    Write-Host "Failed to approve user:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
}

# ============================================================================
# STEP 3: Verify User Status Changed
# ============================================================================
Write-Host "STEP 3: Verifying user status..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Run this SQL query in Supabase to verify:" -ForegroundColor Cyan
Write-Host @"
SELECT 
  email,
  first_name || ' ' || last_name as name,
  role,
  approval_status,
  is_active,
  approved_at,
  approved_by
FROM users
WHERE id = '$pendingUserId';
"@ -ForegroundColor Gray
Write-Host ""

# ============================================================================
# SUMMARY
# ============================================================================
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "TEST COMPLETE!" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "What to check:" -ForegroundColor Yellow
Write-Host "1. Email sent to pending@testcompany.com (check Resend dashboard)" -ForegroundColor White
Write-Host "2. User status changed from 'pending' to 'approved' in database" -ForegroundColor White
Write-Host "3. User is_active changed from false to true" -ForegroundColor White
Write-Host "4. approved_at and approved_by fields are populated" -ForegroundColor White
Write-Host ""
Write-Host "Check email logs:" -ForegroundColor Yellow
Write-Host "SELECT * FROM email_logs ORDER BY created_at DESC LIMIT 5;" -ForegroundColor Gray
Write-Host ""
