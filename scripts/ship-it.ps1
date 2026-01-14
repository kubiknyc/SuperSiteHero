# Ship It! - Deployment Script
# Automates the build and deployment process for JobSight

$ErrorActionPreference = "Stop"

function Write-Step {
    param($Message)
    Write-Host "`n🚀 $Message" -ForegroundColor Cyan
}

function Write-Success {
    param($Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error-Msg {
    param($Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# 1. Environment Check
Write-Step "Checking Environment..."

if (-not (Test-Path ".env")) {
    Write-Warning ".env file not found!"
}

# Check for Supabase Access Token
if (-not $env:SUPABASE_ACCESS_TOKEN) {
    Write-Warning "SUPABASE_ACCESS_TOKEN environment variable is not set."
    $token = Read-Host "Please enter your Supabase Access Token (or press Enter to skip Edge Function deployment)"
    if ($token) {
        $env:SUPABASE_ACCESS_TOKEN = $token
        Write-Success "Token set temporarily for this session."
    }
    else {
        Write-Warning "Skipping Edge Function deployment due to missing token."
        $skipEdgeFunctions = $true
    }
}

# 2. Web Build
Write-Step "Building Web Application..."
try {
    npm run build
    if (Test-Path "dist/index.html") {
        Write-Success "Web build completed successfully."
    }
    else {
        throw "Build failed: dist/index.html not found."
    }
}
catch {
    Write-Error-Msg "Web build failed: $_"
    exit 1
}

# 3. Android Sync
Write-Step "Syncing with Android..."
try {
    npx cap sync android
    Write-Success "Android sync completed."
}
catch {
    Write-Error-Msg "Android sync failed: $_"
    exit 1
}

# 4. Edge Function Deployment
if (-not $skipEdgeFunctions) {
    Write-Step "Deploying Edge Functions..."
    $functions = @("get-pending-users", "approve-user", "reject-user")
    
    foreach ($func in $functions) {
        Write-Host "Deploying $func..." -ForegroundColor Yellow
        try {
            npx supabase functions deploy $func --no-verify-jwt
            Write-Success "$func deployed."
        }
        catch {
            Write-Error-Msg "Failed to deploy ${func}: $_"
            # specific error handling or continue?
        }
    }
}

Write-Step "Deployment Process Complete!"
Write-Host "
To finish shipping:
1. Verify the web build in 'dist/'
2. Open Android Studio to build the final APK:
   > npx cap open android
3. Verify Edge Functions in Supabase Dashboard
" -ForegroundColor Green
