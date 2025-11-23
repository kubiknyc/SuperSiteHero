@echo off
REM Simple batch file to run database migration

echo.
echo 🚀 SUPER SITE HERO - Database Migration
echo ============================================================
echo.

REM Check if password is provided as argument
if "%1"=="" (
    echo Error: Database password not provided
    echo Usage: migrate.bat YOUR_DB_PASSWORD
    exit /b 1
)

set SUPABASE_DB_PASSWORD=%1

REM Run Python script
python run-migrations.py

echo.
echo Migration complete!
echo.
