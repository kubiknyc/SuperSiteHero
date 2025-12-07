# Autonomous E2E Test Runner Script
#
# This script runs the complete E2E test suite in phases,
# similar to the CI workflow but for local development.
#
# Usage:
#   .\scripts\run-autonomous-tests.ps1               # Run all phases
#   .\scripts\run-autonomous-tests.ps1 -Phase critical   # Run critical only
#   .\scripts\run-autonomous-tests.ps1 -Phase crud       # Run CRUD only
#   .\scripts\run-autonomous-tests.ps1 -Browser firefox  # Use Firefox

param(
    [ValidateSet("all", "critical", "crud", "workflow", "feature", "quality", "portal")]
    [string]$Phase = "all",

    [ValidateSet("chromium", "firefox", "webkit")]
    [string]$Browser = "chromium",

    [switch]$Headed,
    [switch]$Debug,
    [switch]$UpdateSnapshots
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================"
Write-Host "  AUTONOMOUS E2E TEST SUITE"
Write-Host "========================================"
Write-Host ""
Write-Host "Phase: $Phase"
Write-Host "Browser: $Browser"
Write-Host "Headed: $Headed"
Write-Host ""

# Build common args
$commonArgs = @(
    "--project=$Browser"
)

if ($Headed) {
    $commonArgs += "--headed"
}

if ($Debug) {
    $commonArgs += "--debug"
}

if ($UpdateSnapshots) {
    $commonArgs += "--update-snapshots"
}

function Run-TestPhase {
    param(
        [string]$Name,
        [string[]]$TestFiles
    )

    Write-Host ""
    Write-Host "----------------------------------------"
    Write-Host "Running: $Name"
    Write-Host "----------------------------------------"

    $testGlobs = $TestFiles -join " "
    $cmd = "npx playwright test $testGlobs $($commonArgs -join ' ')"

    Write-Host "Command: $cmd"
    Write-Host ""

    Invoke-Expression $cmd

    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: $Name failed!" -ForegroundColor Red
        if ($Phase -eq "all" -and $Name -eq "Critical Path Tests") {
            Write-Host "Critical tests failed. Stopping execution." -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "SUCCESS: $Name passed!" -ForegroundColor Green
    }
}

# Phase 1: Critical Tests
if ($Phase -eq "all" -or $Phase -eq "critical") {
    Run-TestPhase -Name "Critical Path Tests (Auth + Offline)" -TestFiles @(
        "tests/e2e/auth/*.spec.ts",
        "tests/e2e/offline*.spec.ts"
    )
}

# Phase 2: CRUD Tests
if ($Phase -eq "all" -or $Phase -eq "crud") {
    Run-TestPhase -Name "CRUD Tests" -TestFiles @(
        "tests/e2e/*-crud.spec.ts",
        "tests/e2e/projects-crud.spec.ts",
        "tests/e2e/daily-reports-crud.spec.ts",
        "tests/e2e/tasks-crud.spec.ts",
        "tests/e2e/punch-lists-crud.spec.ts"
    )
}

# Phase 3: Workflow Tests
if ($Phase -eq "all" -or $Phase -eq "workflow") {
    Run-TestPhase -Name "Workflow Tests" -TestFiles @(
        "tests/e2e/*-workflow.spec.ts",
        "tests/e2e/rfis-workflow.spec.ts",
        "tests/e2e/submittals-workflow.spec.ts",
        "tests/e2e/change-orders-workflow.spec.ts"
    )
}

# Phase 4: Feature Tests
if ($Phase -eq "all" -or $Phase -eq "feature") {
    Run-TestPhase -Name "Feature Tests" -TestFiles @(
        "tests/e2e/documents*.spec.ts",
        "tests/e2e/photos*.spec.ts",
        "tests/e2e/safety*.spec.ts",
        "tests/e2e/materials*.spec.ts",
        "tests/e2e/meetings*.spec.ts"
    )
}

# Phase 5: Quality Tests
if ($Phase -eq "all" -or $Phase -eq "quality") {
    Run-TestPhase -Name "Quality Tests" -TestFiles @(
        "tests/e2e/accessibility*.spec.ts",
        "tests/e2e/responsive*.spec.ts",
        "tests/e2e/performance*.spec.ts",
        "tests/e2e/browser-compatibility*.spec.ts"
    )
}

# Phase 6: Portal Tests
if ($Phase -eq "all" -or $Phase -eq "portal") {
    Run-TestPhase -Name "Portal Tests" -TestFiles @(
        "tests/e2e/portal*.spec.ts"
    )
}

Write-Host ""
Write-Host "========================================"
Write-Host "  TEST SUITE COMPLETE"
Write-Host "========================================"
Write-Host ""
Write-Host "View detailed report: npx playwright show-report"
Write-Host ""
