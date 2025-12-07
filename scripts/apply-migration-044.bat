@echo off
echo ========================================
echo Apply Migration 044
echo ========================================
echo.
echo This migration enables automatic user profile creation
echo and fixes the login issue after signup.
echo.
echo INSTRUCTIONS:
echo 1. This will copy the SQL to your clipboard
echo 2. Your browser will open to Supabase SQL Editor
echo 3. Paste (Ctrl+V) the SQL into the editor
echo 4. Click "Run" to execute
echo.
pause

REM Copy migration SQL to clipboard
type "%~dp0..\migrations\044_enable_auto_user_creation.sql" | clip

echo.
echo ✓ SQL copied to clipboard!
echo.
echo Opening Supabase SQL Editor...
echo (If it doesn't open, manually go to your Supabase Dashboard -^> SQL Editor)
echo.

REM Try to get project URL from .env
for /f "tokens=2 delims==" %%a in ('findstr "VITE_SUPABASE_URL" "%~dp0..\.env"') do set SUPABASE_URL=%%a

if defined SUPABASE_URL (
    REM Extract project ID from URL (format: https://xxxxx.supabase.co)
    for /f "tokens=2 delims=/." %%a in ("%SUPABASE_URL%") do set PROJECT_ID=%%a
    start https://supabase.com/dashboard/project/%PROJECT_ID%/sql/new
) else (
    echo Could not find SUPABASE_URL in .env
    echo Please manually navigate to: Supabase Dashboard -^> SQL Editor
    pause
)

echo.
echo NEXT STEPS:
echo 1. Paste the SQL (Ctrl+V) in the SQL Editor
echo 2. Click "Run"
echo 3. Wait for success message
echo 4. Try signing up with a NEW email
echo 5. Login should work immediately!
echo.
pause
