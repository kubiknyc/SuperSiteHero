# Database Migration Guide

## How to Apply Migrations

### Method 1: Supabase Dashboard (Recommended - Easiest)

1. **Login to Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Apply Each Migration File**

   Copy and paste the content of each file below **in order** and click "Run":

   **Migration Order:**
   ```
   1. supabase/migrations/117_enhanced_punch_list_mobile_ux.sql
   2. supabase/migrations/118_site_instruction_qr_workflow.sql
   3. supabase/migrations/119_site_instruction_qr_workflow.sql
   4. supabase/migrations/121_subcontractor_punch_updates.sql
   5. supabase/migrations/121_unified_photo_evidence_hub.sql
   6. supabase/migrations/121_workflow_automation.sql
   7. supabase/migrations/122_equipment_maintenance_schedules.sql
   8. supabase/migrations/123_automated_field_reports.sql
   9. supabase/migrations/123_inspection_punch_auto_link.sql
   ```

4. **Verify Success**
   - Check for green success messages after each migration
   - If errors occur, check that you're running them in order
   - Verify tables were created in the "Table Editor"

### Method 2: Install Supabase CLI (Advanced)

**Windows (PowerShell as Administrator):**
```powershell
# Install Scoop first (if not installed)
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Add Supabase bucket and install
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**macOS/Linux:**
```bash
# Using Homebrew (macOS)
brew install supabase/tap/supabase

# Using NPX (any platform)
npx supabase db push
```

**After Installation:**
```bash
# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

### Method 3: Local Development (Supabase Local)

If you're running Supabase locally:
```bash
# Start local Supabase
supabase start

# Migrations are auto-applied to local instance
# Check status
supabase db diff

# Reset if needed
supabase db reset
```

## What Was Added

### Phase 1: Mobile-First Field Experience
- **Migration 117**: Enhanced punch list mobile UX with subcontractor fields
- **Migrations 118-119**: Site instruction QR code workflow and acknowledgments

### Phase 2: Cross-Feature Integration
- **Migration 121**: Unified photo evidence hub with entity linking
- **Migration 123**: Inspection → Punch item auto-link and remediation tracking

### Phase 3: Offline Sync
- **Migration 121**: Sync telemetry tracking

### Phase 4: Subcontractor Portal
- **Migration 121**: Subcontractor punch updates and compliance documents

### Phase 5: Workflow Automation
- **Migration 121**: Workflow automation and escalation rules
- **Migration 122**: Equipment maintenance schedules and alerts
- **Migration 123**: Automated field reports scheduling

## Verification Checklist

After applying migrations, verify these tables exist:

- [ ] `site_instruction_acknowledgments`
- [ ] `photo_entity_links`
- [ ] `remediation_tracking`
- [ ] `subcontractor_compliance_documents`
- [ ] `escalation_rules`
- [ ] `escalation_events`
- [ ] `equipment_maintenance_schedules`
- [ ] `equipment_maintenance_alerts`
- [ ] `equipment_maintenance_records`
- [ ] `scheduled_field_reports`
- [ ] `generated_field_reports`
- [ ] `sync_telemetry`

## Troubleshooting

**Error: "relation already exists"**
- This migration was already applied
- Skip to the next migration file

**Error: "permission denied"**
- Ensure you're logged in as project owner
- Check RLS policies aren't blocking

**Error: "syntax error"**
- Ensure you copied the entire migration file
- Check for any special characters that got corrupted

## Next Steps After Migration

1. **Test the Application**
   ```bash
   npm run dev
   ```

2. **Run Tests**
   ```bash
   npm test
   ```

3. **Verify Features Work**
   - Test punch list mobile features
   - Test QR code generation
   - Test photo evidence hub
   - Test offline sync

4. **Deploy to Production**
   - Apply same migrations to production database
   - Test thoroughly in staging first
   - Monitor for any issues

---

**Implementation Complete! 🎉**

All 15 phases of field management workflow enhancements are now ready to use once migrations are applied.
