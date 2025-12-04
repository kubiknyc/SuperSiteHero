# Get Supabase database password from dashboard
# This script helps you retrieve and save the database password

Write-Host "To run migrations via Supabase CLI, you need the database password." -ForegroundColor Yellow
Write-Host ""
Write-Host "Steps to get your database password:" -ForegroundColor Cyan
Write-Host "1. Go to: https://app.supabase.com/project/nxlznnrocrffnbzjaaae/settings/database" -ForegroundColor White
Write-Host "2. Scroll to 'Connection string' section" -ForegroundColor White
Write-Host "3. Click 'Connection Pooling' tab" -ForegroundColor White
Write-Host "4. Copy the password (after [YOUR-PASSWORD])" -ForegroundColor White
Write-Host ""

Start-Process "https://app.supabase.com/project/nxlznnrocrffnbzjaaae/settings/database"

Write-Host "Opening database settings in browser..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Once you have the password, you can run:" -ForegroundColor Green
Write-Host "  npx supabase db push --db-url 'postgresql://postgres:[PASSWORD]@db.nxlznnrocrffnbzjaaae.supabase.co:5432/postgres'" -ForegroundColor Gray
Write-Host ""
Write-Host "Or save it to .env as:" -ForegroundColor Green
Write-Host "  SUPABASE_DB_PASSWORD=your_password_here" -ForegroundColor Gray
