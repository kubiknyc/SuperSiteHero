@echo off
REM Push migration using Supabase CLI

echo ========================================
echo   Pushing Migration to Supabase
echo ========================================
echo.

REM Set environment variable from .env
for /f "tokens=2 delims==" %%a in ('findstr "SUPABASE_ACCESS_TOKEN" .env') do set SUPABASE_ACCESS_TOKEN=%%a

if "%SUPABASE_ACCESS_TOKEN%"=="" (
    echo ERROR: SUPABASE_ACCESS_TOKEN not found in .env file
    pause
    exit /b 1
)

echo ✓ Access token loaded from .env
echo.
echo Pushing migration...
echo.

npx supabase db push

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Migration pushed successfully!
) else (
    echo.
    echo ❌ Migration failed
)

echo.
pause
