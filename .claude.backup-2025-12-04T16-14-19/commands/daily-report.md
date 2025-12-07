# Create Daily Report Feature

You are tasked with implementing or enhancing the Daily Report feature for construction superintendents.

## Context

Daily reports are critical for construction documentation. They must capture:
- Weather conditions
- Work performed by trade
- Workforce counts
- Equipment usage
- Material deliveries
- Visitors
- Safety observations
- Issues and delays
- Photos with location data

## Task Instructions

1. **Review Current Implementation**
   - Check `src/features/daily-reports/` for existing code
   - Review `src/types/database.ts` for DailyReport type
   - Check related tables: workforce, equipment, deliveries, visitors

2. **Implement Missing Features**
   - Daily report CRUD operations
   - Related sections (workforce, equipment, deliveries, visitors)
   - Weather integration (optional)
   - Photo attachment and location tagging
   - PDF export functionality
   - Email distribution list

3. **UI Components Needed**
   - Daily report list with filters (date range, project)
   - Daily report form with sections
   - Weather picker/input
   - Workforce entry table
   - Equipment log table
   - Delivery log table
   - Visitor log table
   - Photo gallery with GPS data
   - PDF preview/download

4. **Business Logic**
   - One report per project per day (validation)
   - Auto-save drafts
   - Submit/finalize workflow
   - Notifications to stakeholders
   - Historical data access
   - Search and filtering

5. **Multi-Tenant Considerations**
   - Filter by user's assigned projects only
   - Company-specific templates
   - Custom fields per company (if in settings)

6. **Offline Support (Future)**
   - Cache recent reports
   - Queue submissions when offline
   - Sync when connection restored

## Database Tables Involved

- `daily_reports` - Main report
- `daily_report_workforce` - Labor tracking
- `daily_report_equipment` - Equipment hours
- `daily_report_deliveries` - Material deliveries
- `daily_report_visitors` - Site visitors
- `photos` - Linked via daily_report_id

## Key Features to Implement

1. **Quick Entry Mode** - Fast data entry for field use
2. **Template System** - Pre-fill common entries
3. **Voice-to-Text** - Dictate notes (future)
4. **Photo Management** - Bulk upload with auto-location
5. **Weather API** - Auto-populate weather data
6. **Export Options** - PDF, Excel, Email

## Testing Checklist

- [ ] Create daily report for today
- [ ] Add workforce entries
- [ ] Add equipment usage
- [ ] Log deliveries
- [ ] Record visitors
- [ ] Attach photos with locations
- [ ] Edit existing report
- [ ] Delete report (soft delete)
- [ ] Export to PDF
- [ ] Filter reports by date range
- [ ] Search reports by content
- [ ] Verify RLS (can't see other company's reports)
