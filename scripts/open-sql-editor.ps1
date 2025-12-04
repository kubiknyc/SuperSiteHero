# PowerShell script to apply migration via Supabase Dashboard
# This copies the SQL to clipboard and opens the SQL Editor

$migrationFile = "migrations\044_enable_auto_user_creation.sql"
$projectRef = "nxlznnrocrffnbzjaaae"
$sqlEditorUrl = "https://app.supabase.com/project/$projectRef/sql/new"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Supabase Migration Helper" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if migration file exists
if (!(Test-Path $migrationFile)) {
    Write-Host "ERROR: Migration file not found" -ForegroundColor Red
    Write-Host "Expected: $migrationFile" -ForegroundColor Red
    exit 1
}

# Read SQL content
$sqlContent = Get-Content $migrationFile -Raw

# Copy to clipboard
Set-Clipboard -Value $sqlContent
Write-Host "✓ SQL copied to clipboard!" -ForegroundColor Green
Write-Host ""

# Show instructions
Write-Host "Instructions:" -ForegroundColor Yellow
Write-Host "1. Opening Supabase SQL Editor in your browser..." -ForegroundColor White
Write-Host "2. The migration SQL has been copied to your clipboard" -ForegroundColor White
Write-Host "3. Paste (Ctrl+V) into the SQL Editor" -ForegroundColor White
Write-Host "4. Click 'Run' or press Ctrl+Enter" -ForegroundColor White
Write-Host "5. Check the results to verify success" -ForegroundColor White
Write-Host ""

Write-Host "Opening browser..." -ForegroundColor Cyan
Start-Process $sqlEditorUrl

Write-Host ""
Write-Host "Migration file: $migrationFile" -ForegroundColor Gray
Write-Host "SQL length: $($sqlContent.Length) characters" -ForegroundColor Gray
Write-Host ""
Write-Host "Browser opened! Paste the SQL and click Run." -ForegroundColor Green
