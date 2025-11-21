# Safety Incident Management

Create or enhance the safety incident tracking and reporting feature.

## Context

Safety is paramount on construction sites. This feature must:
- Document incidents immediately (mobile-friendly)
- Meet OSHA reporting requirements
- Track corrective actions
- Generate required reports
- Support toolbox talks and safety meetings

## Task

Implement comprehensive safety management features:

### 1. Incident Reporting
- Incident type (near miss, first aid, medical treatment, lost time, fatality)
- Severity classification
- Injured person details (name, company, trade)
- Incident location (building, floor, area)
- Date/time of incident
- Witness information
- Photo documentation
- Initial description
- Immediate actions taken

### 2. Investigation Workflow
- Assign investigator
- Root cause analysis
- Contributing factors
- Corrective actions
- Preventive measures
- Follow-up required
- Status tracking (open → investigating → corrective actions → closed)

### 3. OSHA Compliance
- OSHA 300 log integration
- Recordable injury determination
- Days away/restricted/transfer tracking
- Annual summary generation
- Electronic submission preparation

### 4. Corrective Actions
- Action items with assigned owners
- Due dates
- Completion verification
- Photo evidence of corrections

### 5. Toolbox Talks
- Schedule safety meetings
- Track attendance
- Topic management
- Sign-off collection
- Recurring topics

### 6. Safety Observations
- Positive observations
- Hazard identification
- Near-miss reporting
- Safety suggestions

## Implementation Steps

1. **Review Database Schema**
   - `safety_incidents` table
   - `toolbox_talks` table
   - `safety_observations` table
   - Related photo attachments

2. **Create Feature Module**
   ```
   src/features/safety/
   ├── hooks/
   │   ├── useSafetyIncidents.ts
   │   ├── useToolboxTalks.ts
   │   └── useSafetyObservations.ts
   ├── components/
   │   ├── IncidentList.tsx
   │   ├── IncidentForm.tsx
   │   ├── IncidentDetail.tsx
   │   ├── CorrectiveActions.tsx
   │   ├── ToolboxTalksList.tsx
   │   └── OSHA300Log.tsx
   ```

3. **UI Components**
   - Quick incident report (mobile-optimized)
   - Investigation detail view
   - Corrective action tracker
   - Toolbox talk scheduler with attendance
   - OSHA 300 log view/export
   - Safety metrics dashboard

4. **Business Logic**
   - Auto-determine if incident is OSHA recordable
   - Calculate lost days
   - Notification escalation for serious incidents
   - Reminder for overdue corrective actions
   - Annual OSHA 300 summary generation

5. **Reports & Analytics**
   - Incident rate calculations (TRIR, DART)
   - Incidents by type/severity
   - Incidents by trade/subcontractor
   - Trend analysis
   - Leading indicators (observations, near misses)

## Safety Metrics

### Total Recordable Incident Rate (TRIR)
```typescript
// (Number of recordable incidents × 200,000) / Total hours worked
const calculateTRIR = (incidents: number, hours: number) => {
  return (incidents * 200000) / hours
}
```

### Days Away, Restricted, or Transferred (DART) Rate
```typescript
const calculateDART = (dartCases: number, hours: number) => {
  return (dartCases * 200000) / hours
}
```

## OSHA Recordability Determination

Implement logic to determine if an incident is OSHA recordable:
```typescript
const isOSHARecordable = (incident: SafetyIncident): boolean => {
  // Work-related AND results in:
  // - Death
  // - Days away from work
  // - Restricted work or job transfer
  // - Medical treatment beyond first aid
  // - Loss of consciousness
  // - Significant injury diagnosed by healthcare professional

  return incident.is_work_related && (
    incident.resulted_in_death ||
    incident.days_away > 0 ||
    incident.days_restricted > 0 ||
    incident.medical_treatment ||
    incident.loss_of_consciousness ||
    incident.significant_injury_diagnosed
  )
}
```

## Testing Checklist

- [ ] Report incident from mobile device
- [ ] Upload photos
- [ ] Assign investigator
- [ ] Complete root cause analysis
- [ ] Create corrective actions
- [ ] Mark actions complete
- [ ] Schedule toolbox talk
- [ ] Record attendance
- [ ] View OSHA 300 log
- [ ] Export annual summary
- [ ] Calculate TRIR and DART rates
- [ ] Filter incidents by date range
- [ ] Filter by severity
- [ ] Test notifications for serious incidents
- [ ] Verify multi-tenant isolation

## Mobile UX Considerations

- Large touch targets for field use
- Voice-to-text for descriptions
- Camera integration for photos
- GPS location capture
- Offline capability (critical!)
- One-handed operation where possible

## Compliance Requirements

- Retain records for 5+ years
- Protect privacy of injured workers
- Provide employee access to records
- Annual summary posting (Feb 1 - April 30)
- Electronic submission if required
