# Open Supabase SQL Editor and copy fix script to clipboard

Write-Host ""
Write-Host "PROJECT CREATION FIX - Opening Supabase SQL Editor" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir

# Read .env file
$envPath = Join-Path $projectRoot ".env"
$supabaseUrl = ""

if (Test-Path $envPath) {
    Get-Content $envPath | ForEach-Object {
        if ($_ -match "^VITE_SUPABASE_URL=(.+)$") {
            $supabaseUrl = $Matches[1]
        }
    }
}

if (-not $supabaseUrl) {
    Write-Host "ERROR: Could not find VITE_SUPABASE_URL in .env file" -ForegroundColor Red
    exit 1
}

# Extract project reference
$pattern = "https://(.+?)\.supabase\.co"
if ($supabaseUrl -match $pattern) {
    $projectRef = $Matches[1]
    Write-Host "Found Supabase project: $projectRef" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "ERROR: Invalid Supabase URL format" -ForegroundColor Red
    exit 1
}

# Read SQL fix script
$sqlPath = Join-Path $scriptDir "FIX_NULL_COMPANY_ID.sql"
if (Test-Path $sqlPath) {
    $sqlContent = Get-Content $sqlPath -Raw
    Set-Clipboard -Value $sqlContent
    Write-Host "SQL fix script copied to clipboard!" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "WARNING: SQL file not found at $sqlPath" -ForegroundColor Yellow
    Write-Host ""
}

# Build URL
$sqlEditorUrl = "https://supabase.com/dashboard/project/$projectRef/sql/new"

Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "  1. Browser will open to Supabase SQL Editor"
Write-Host "  2. Press Ctrl+V to paste the fix script"
Write-Host "  3. Click 'Run' button"
Write-Host "  4. Verify results show 'CORRECT' status"
Write-Host "  5. Log out and back into your app"
Write-Host "  6. Try creating a project again"
Write-Host ""

Start-Sleep -Seconds 2

Write-Host "Opening browser..." -ForegroundColor Cyan
Start-Process $sqlEditorUrl

Write-Host ""
Write-Host "Done! Paste the script in SQL Editor and run it." -ForegroundColor Green
Write-Host ""
