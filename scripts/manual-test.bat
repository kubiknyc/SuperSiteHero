@echo off
REM Playwright Manual Testing Script for Windows
REM Opens browser with Playwright Codegen for interactive manual testing

echo ==========================================
echo Playwright Manual Testing Mode
echo ==========================================
echo.
echo This will open a Chromium browser with Playwright Inspector.
echo You can manually interact with your application and record actions.
echo.
echo Prerequisites:
echo   - Dev server should be running on http://localhost:5174
echo   - If not running, start it with: npm run dev
echo.
echo Starting Playwright Codegen...
echo.

npx playwright codegen http://localhost:5174

echo.
echo Manual testing session ended.
pause
