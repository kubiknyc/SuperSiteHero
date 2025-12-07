# MCP Environment Variables Verification Script
# Run this to check which MCP servers are configured

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "MCP Configuration Verification" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

$requiredVars = @{
    "GITHUB_PERSONAL_ACCESS_TOKEN" = "GitHub Integration"
    "POSTGRES_CONNECTION_STRING" = "PostgreSQL Database"
    "BRAVE_API_KEY" = "Brave Search"
    "GOOGLE_MAPS_API_KEY" = "Google Maps"
    "SLACK_BOT_TOKEN" = "Slack Bot"
    "SLACK_TEAM_ID" = "Slack Team ID"
    "SENTRY_AUTH_TOKEN" = "Sentry Monitoring"
}

$configured = 0
$missing = 0

foreach ($var in $requiredVars.Keys) {
    $value = [System.Environment]::GetEnvironmentVariable($var, [System.EnvironmentVariableTarget]::User)

    if ($value) {
        Write-Host "✓" -ForegroundColor Green -NoNewline
        Write-Host " $($requiredVars[$var])" -ForegroundColor White -NoNewline
        Write-Host " ($var)" -ForegroundColor DarkGray
        $configured++
    } else {
        Write-Host "✗" -ForegroundColor Red -NoNewline
        Write-Host " $($requiredVars[$var])" -ForegroundColor White -NoNewline
        Write-Host " ($var)" -ForegroundColor DarkGray
        $missing++
    }
}

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Configured: " -NoNewline -ForegroundColor White
Write-Host "$configured" -ForegroundColor Green
Write-Host "Missing:    " -NoNewline -ForegroundColor White
Write-Host "$missing" -ForegroundColor $(if ($missing -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($missing -gt 0) {
    Write-Host "⚠ Some MCP servers are not configured." -ForegroundColor Yellow
    Write-Host "Run setup-mcp-env.ps1 to configure missing environment variables." -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "✓ All MCP servers are configured!" -ForegroundColor Green
    Write-Host ""
}

Write-Host "Always Configured (No Action Needed):" -ForegroundColor Cyan
Write-Host "  ✓ Supabase Database" -ForegroundColor Green
Write-Host "  ✓ Sequential Thinking" -ForegroundColor Green
Write-Host "  ✓ Memory" -ForegroundColor Green
Write-Host "  ✓ Fetch" -ForegroundColor Green
Write-Host "  ✓ Time" -ForegroundColor Green
Write-Host "  ✓ Filesystem" -ForegroundColor Green
Write-Host "  ✓ Playwright (Browser Automation)" -ForegroundColor Green
Write-Host "  ✓ Puppeteer (Browser Automation)" -ForegroundColor Green
Write-Host "  ✓ Everything (Windows Search)" -ForegroundColor Green
Write-Host ""

Write-Host "For detailed setup instructions, see MCP_SETUP_INSTRUCTIONS.md" -ForegroundColor Gray
Write-Host ""
