# MCP Environment Variables Setup Script for Windows
# Run this script to set up environment variables for MCP servers

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "MCP Servers Environment Setup" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Function to set environment variable
function Set-MCP-EnvVar {
    param(
        [string]$Name,
        [string]$Description,
        [string]$HowToGet
    )

    Write-Host "Setting: $Name" -ForegroundColor Yellow
    Write-Host "Purpose: $Description" -ForegroundColor Gray
    Write-Host "Get it from: $HowToGet" -ForegroundColor Gray

    $value = Read-Host "Enter value (or press Enter to skip)"

    if ($value) {
        [System.Environment]::SetEnvironmentVariable($Name, $value, [System.EnvironmentVariableTarget]::User)
        Write-Host "Success - $Name set successfully" -ForegroundColor Green
    } else {
        Write-Host "Skipped $Name" -ForegroundColor DarkGray
    }
    Write-Host ""
}

Write-Host "This script will help you set up environment variables for MCP servers." -ForegroundColor White
Write-Host "Environment variables will be set at the USER level (not system-wide)." -ForegroundColor White
Write-Host ""

$continue = Read-Host "Do you want to continue? (Y/n)"
if ($continue -eq "n" -or $continue -eq "N") {
    Write-Host "Setup cancelled." -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "--- GitHub Integration ---" -ForegroundColor Cyan
$githubDescription = "Repository management, issue tracking, PR automation"
$githubHowTo = "https://github.com/settings/tokens (scopes: repo, read:org)"
Set-MCP-EnvVar -Name "GITHUB_PERSONAL_ACCESS_TOKEN" -Description $githubDescription -HowToGet $githubHowTo

Write-Host "--- PostgreSQL Direct Access ---" -ForegroundColor Cyan
$postgresDescription = "Direct database queries and management"
$postgresHowTo = "Supabase Dashboard - Project Settings - Database - Connection String (Pooling)"
Set-MCP-EnvVar -Name "POSTGRES_CONNECTION_STRING" -Description $postgresDescription -HowToGet $postgresHowTo

Write-Host "--- Brave Search API ---" -ForegroundColor Cyan
$braveDescription = "Web search for construction specs, regulations, materials"
$braveHowTo = "https://brave.com/search/api/ - 2000 free queries per month"
Set-MCP-EnvVar -Name "BRAVE_API_KEY" -Description $braveDescription -HowToGet $braveHowTo

Write-Host "--- Google Maps API ---" -ForegroundColor Cyan
$mapsDescription = "Site locations, geocoding, route planning"
$mapsHowTo = "https://console.cloud.google.com/ - Enable: Maps JavaScript API, Geocoding API"
Set-MCP-EnvVar -Name "GOOGLE_MAPS_API_KEY" -Description $mapsDescription -HowToGet $mapsHowTo

Write-Host "--- Slack Integration ---" -ForegroundColor Cyan
$slackDescription = "Team notifications, daily reports, alerts"
$slackHowTo = "https://api.slack.com/apps - Bot Token with chat:write scope"
Set-MCP-EnvVar -Name "SLACK_BOT_TOKEN" -Description $slackDescription -HowToGet $slackHowTo

$slackTeamDescription = "Slack workspace team ID"
$slackTeamHowTo = "Slack Workspace Settings - format: T0123456789"
Set-MCP-EnvVar -Name "SLACK_TEAM_ID" -Description $slackTeamDescription -HowToGet $slackTeamHowTo

Write-Host "--- Sentry Error Tracking ---" -ForegroundColor Cyan
$sentryDescription = "Production error monitoring and debugging"
$sentryHowTo = "https://sentry.io/ - Settings - Auth Tokens - scopes: project:read, org:read"
Set-MCP-EnvVar -Name "SENTRY_AUTH_TOKEN" -Description $sentryDescription -HowToGet $sentryHowTo

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Important: You must restart your terminal/IDE for changes to take effect." -ForegroundColor Yellow
Write-Host ""
Write-Host "To verify your configuration, run:" -ForegroundColor White
$verifyCommand = 'Get-ChildItem Env: | Where-Object { $_.Name -match "GITHUB|POSTGRES|BRAVE|GOOGLE|SLACK|SENTRY" }'
Write-Host "  $verifyCommand" -ForegroundColor Gray
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Restart your terminal/IDE" -ForegroundColor Gray
Write-Host "  2. Review MCP_SETUP_INSTRUCTIONS.md for detailed configuration" -ForegroundColor Gray
Write-Host "  3. Test each MCP server integration" -ForegroundColor Gray
Write-Host ""
