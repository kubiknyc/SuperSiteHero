@echo off
REM Apply database migration using Supabase CLI
REM This batch file runs the migration on the remote Supabase database

echo ========================================
echo   Applying Database Migration
echo ========================================
echo.

REM Check if migration file exists
if not exist "migrations\044_enable_auto_user_creation.sql" (
    echo ERROR: Migration file not found
    echo Expected: migrations\044_enable_auto_user_creation.sql
    pause
    exit /b 1
)

echo Migration file: migrations\044_enable_auto_user_creation.sql
echo.

REM Option 1: Try using Supabase CLI db push
echo Attempting to push migration using Supabase CLI...
echo.

npx supabase db push --db-url "postgresql://postgres.nxlznnrocrffnbzjaaae:YOUR_DATABASE_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres" --include-all 2>nul

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✓ Migration applied successfully!
    goto :verify
)

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo   Manual Migration Required
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo The automated push failed. Please apply the migration manually:
echo.
echo 1. Go to your Supabase Dashboard:
echo    https://app.supabase.com/project/nxlznnrocrffnbzjaaae/sql/new
echo.
echo 2. Open this file in a text editor:
echo    %CD%\migrations\044_enable_auto_user_creation.sql
echo.
echo 3. Copy the entire contents
echo.
echo 4. Paste into the SQL Editor and click "Run"
echo.
echo 5. Check the results to verify:
echo    - Trigger "on_auth_user_created" was created
echo    - User counts match (auth users = profile users)
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo Opening the migration file for you...
notepad migrations\044_enable_auto_user_creation.sql
echo.
pause
exit /b 1

:verify
echo.
echo ========================================
echo   Verifying Migration
echo ========================================
echo.
echo Run this query in Supabase SQL Editor to verify:
echo.
echo   SELECT trigger_name FROM information_schema.triggers
echo   WHERE trigger_name = 'on_auth_user_created';
echo.
pause
