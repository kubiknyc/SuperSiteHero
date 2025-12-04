@echo off
REM Regenerate TypeScript types from Supabase
REM Usage: scripts\regenerate-types.bat <project-ref>

setlocal

if "%~1"=="" (
    echo Usage: scripts\regenerate-types.bat ^<project-ref^>
    echo.
    echo Get your project ref from Supabase Dashboard ^> Project Settings ^> General
    echo Example: scripts\regenerate-types.bat abcdefghijklmnop
    exit /b 1
)

set PROJECT_REF=%~1

echo.
echo Regenerating TypeScript types from Supabase...
echo Project: %PROJECT_REF%
echo.

npx supabase gen types typescript --project-id %PROJECT_REF% > src\types\database.ts

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Types regenerated successfully!
    echo    Output: src\types\database.ts
    echo.
    echo Next steps:
    echo    1. Restart TypeScript server in your editor
    echo    2. Run: npm run type-check
) else (
    echo.
    echo ❌ Failed to regenerate types
    echo    Make sure you're logged in: npx supabase login
    echo    And project is linked: npx supabase link --project-ref %PROJECT_REF%
)

endlocal
