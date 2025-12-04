# Apply Supabase Migration
# Copies SQL to clipboard and opens browser

$migrationFile = "migrations\044_enable_auto_user_creation.sql"
$projectRef = "nxlznnrocrffnbzjaaae"
$sqlEditorUrl = "https://app.supabase.com/project/$projectRef/sql/new"

Write-Host "Supabase Migration Helper" -ForegroundColor Cyan
Write-Host ""

if (!(Test-Path $migrationFile)) {
    Write-Host "ERROR: Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

$sqlContent = Get-Content $migrationFile -Raw
Set-Clipboard -Value $sqlContent

Write-Host "SUCCESS: SQL copied to clipboard!" -ForegroundColor Green
Write-Host "Opening Supabase SQL Editor..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Browser will open with SQL Editor"
Write-Host "2. Press Ctrl+V to paste the migration SQL"
Write-Host "3. Click Run button or press Ctrl+Enter"
Write-Host "4. Verify the trigger was created successfully"
Write-Host ""

Start-Process $sqlEditorUrl

Write-Host "Done! Browser opened." -ForegroundColor Green
