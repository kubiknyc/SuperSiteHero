# Push Migration via Supabase CLI

$env:SUPABASE_ACCESS_TOKEN = "sbp_085bac04acec4712ff695469ed2b68388c10a16f"

Write-Host "Pushing migration to Supabase..." -ForegroundColor Cyan

npx supabase db push

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Migration successful!" -ForegroundColor Green
} else {
    Write-Host "`n❌ Migration failed with exit code $LASTEXITCODE" -ForegroundColor Red
}
