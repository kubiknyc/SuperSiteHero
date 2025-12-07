# ============================================
# OPEN SUPABASE SQL EDITOR
# ============================================
# This script opens the Supabase SQL Editor in your browser
# and copies the fix script to your clipboard
# ============================================

Write-Host ""
Write-Host "🔧 PROJECT CREATION FIX - AUTOMATED SCRIPT" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Read Supabase URL from .env
$envPath = Join-Path $PSScriptRoot ".." ".env"
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath
    $supabaseUrl = ($envContent | Select-String "VITE_SUPABASE_URL=(.+)").Matches.Groups[1].Value

    if ($supabaseUrl) {
        # Extract project ref from URL
        $pattern = "https://(.+?)\.supabase\.co"
        $projectRef = $null
        if ($supabaseUrl -match $pattern) {
            $projectRef = $Matches[1]
        }

        Write-Host "✅ Found Supabase project: $projectRef" -ForegroundColor Green
        Write-Host ""

        # Read the fix SQL
        $sqlPath = Join-Path $PSScriptRoot "fix-project-creation.sql"
        if (Test-Path $sqlPath) {
            $sqlContent = Get-Content $sqlPath -Raw

            # Copy to clipboard
            Set-Clipboard -Value $sqlContent
            Write-Host "✅ SQL fix script copied to clipboard!" -ForegroundColor Green
            Write-Host ""
        }

        # Construct SQL Editor URL
        $sqlEditorUrl = "https://supabase.com/dashboard/project/$projectRef/sql/new"

        Write-Host "📋 NEXT STEPS:" -ForegroundColor Yellow
        Write-Host "   1. Browser will open to Supabase SQL Editor" -ForegroundColor White
        Write-Host "   2. Press Ctrl+V to paste the fix script" -ForegroundColor White
        Write-Host "   3. Click 'Run' button (or press Ctrl+Enter)" -ForegroundColor White
        Write-Host "   4. Verify results show '✅ CORRECT' status" -ForegroundColor White
        Write-Host "   5. Log out and back into your application" -ForegroundColor White
        Write-Host "   6. Try creating a project - 403 error should be fixed!" -ForegroundColor White
        Write-Host ""

        # Wait a moment
        Start-Sleep -Seconds 2

        # Open browser
        Write-Host "🌐 Opening Supabase SQL Editor..." -ForegroundColor Cyan
        Start-Process $sqlEditorUrl

        Write-Host ""
        Write-Host "✨ Script ready in clipboard - paste into SQL Editor!" -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host "❌ Could not find VITE_SUPABASE_URL in .env file" -ForegroundColor Red
    }
} else {
    Write-Host "❌ .env file not found at: $envPath" -ForegroundColor Red
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
