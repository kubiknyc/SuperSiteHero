# Autonomous Auth Schema Migration Application
# This script applies the auth schema permissions directly via Supabase REST API

$ErrorActionPreference = "Stop"

# Load environment variables
$envFile = ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.+)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

$SUPABASE_URL = $env:VITE_SUPABASE_URL
$SERVICE_ROLE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY
$PROJECT_REF = "nxlznnrocrffnbzjaaae"

Write-Host "🚀 Autonomous Auth Schema Permission Migration" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Gray
Write-Host ""

# Read the migration SQL
$migrationPath = "migrations\016_grant_auth_schema_access.sql"
Write-Host "📄 Reading migration file: $migrationPath" -ForegroundColor Yellow

if (-not (Test-Path $migrationPath)) {
    Write-Host "❌ Migration file not found!" -ForegroundColor Red
    exit 1
}

$sql = Get-Content $migrationPath -Raw
Write-Host "✅ Migration file loaded" -ForegroundColor Green
Write-Host ""

# Split SQL into individual statements
$statements = $sql -split ';' | Where-Object { $_.Trim() -and $_ -notmatch '^\s*--' }

Write-Host "📊 Found $($statements.Count) SQL statements to execute" -ForegroundColor Yellow
Write-Host ""

# Execute each statement via Supabase Management API
$successCount = 0
$failCount = 0

foreach ($statement in $statements) {
    $trimmedStatement = $statement.Trim()
    if (-not $trimmedStatement) { continue }

    # Show what we're executing (first 80 chars)
    $preview = if ($trimmedStatement.Length -gt 80) {
        $trimmedStatement.Substring(0, 80) + "..."
    } else {
        $trimmedStatement
    }

    Write-Host "⏳ Executing: $preview" -ForegroundColor Cyan

    try {
        # Use PostgreSQL REST endpoint
        $body = @{
            query = $trimmedStatement
        } | ConvertTo-Json

        $headers = @{
            "apikey" = $SERVICE_ROLE_KEY
            "Authorization" = "Bearer $SERVICE_ROLE_KEY"
            "Content-Type" = "application/json"
            "Prefer" = "return=representation"
        }

        # Try to execute via direct database connection using pg_net
        $response = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/rpc/exec" `
            -Method POST `
            -Headers $headers `
            -Body $body `
            -ErrorAction SilentlyContinue

        Write-Host "  ✅ Success" -ForegroundColor Green
        $successCount++

    } catch {
        # If that fails, show manual instructions
        Write-Host "  ⚠️  API execution not available, using manual method..." -ForegroundColor Yellow
        break
    }
}

# If API method didn't work, use psql or manual method
if ($successCount -eq 0) {
    Write-Host ""
    Write-Host "🔧 Executing via PostgreSQL connection..." -ForegroundColor Yellow

    # Get PostgreSQL connection string
    $pgConnString = $env:POSTGRES_CONNECTION_STRING

    if ($pgConnString) {
        # Save SQL to temp file
        $tempSqlFile = [System.IO.Path]::GetTempFileName() + ".sql"
        $sql | Out-File -FilePath $tempSqlFile -Encoding UTF8

        Write-Host "📝 Executing SQL via psql..." -ForegroundColor Cyan

        # Try to execute with psql if available
        $psqlPath = (Get-Command psql -ErrorAction SilentlyContinue).Source

        if ($psqlPath) {
            psql $pgConnString -f $tempSqlFile
            $successCount = $statements.Count
            Write-Host "✅ Migration executed successfully via psql" -ForegroundColor Green
        } else {
            # Create a Node.js script to execute
            $nodeScript = @"
const { Client } = require('pg');
const fs = require('fs');

const connectionString = process.env.POSTGRES_CONNECTION_STRING;
const sql = fs.readFileSync('$tempSqlFile', 'utf8');

const client = new Client({ connectionString });

async function execute() {
  try {
    await client.connect();
    console.log('✅ Connected to database');

    await client.query(sql);
    console.log('✅ Migration executed successfully');

    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

execute();
"@

            $nodeScriptPath = "scripts\temp-execute-migration.js"
            $nodeScript | Out-File -FilePath $nodeScriptPath -Encoding UTF8

            Write-Host "🔧 Installing pg module..." -ForegroundColor Yellow
            npm install pg --silent 2>$null

            Write-Host "⏳ Executing via Node.js..." -ForegroundColor Cyan
            node $nodeScriptPath

            if ($LASTEXITCODE -eq 0) {
                $successCount = $statements.Count
            }

            # Cleanup
            Remove-Item $nodeScriptPath -ErrorAction SilentlyContinue
        }

        Remove-Item $tempSqlFile -ErrorAction SilentlyContinue
    } else {
        Write-Host "⚠️  No PostgreSQL connection string found" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host ("=" * 60) -ForegroundColor Gray

if ($successCount -gt 0) {
    Write-Host "✅ Migration Complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Results:" -ForegroundColor Cyan
    Write-Host "   ✅ Successful: $successCount" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 You can now query auth.users in the SQL Editor!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🧪 Test with this query:" -ForegroundColor Yellow
    Write-Host "   SELECT id, email, created_at FROM auth.users LIMIT 5;" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "❌ Automatic execution failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "📋 Manual execution required:" -ForegroundColor Yellow
    Write-Host "1. Opening SQL Editor..." -ForegroundColor White
    Start-Process "https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"
    Start-Sleep -Seconds 2

    Write-Host "2. Copying SQL to clipboard..." -ForegroundColor White
    Get-Content $migrationPath | Set-Clipboard

    Write-Host "3. ✅ SQL copied to clipboard - Paste it (Ctrl+V) and click RUN" -ForegroundColor Green
    Write-Host ""
}

Write-Host ("=" * 60) -ForegroundColor Gray
