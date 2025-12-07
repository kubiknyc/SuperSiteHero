# RFI Workflow Management

Create or enhance the RFI (Request for Information) workflow feature.

## Context

RFIs are critical communication tools in construction for clarifying design intent, resolving conflicts, and documenting decisions. They must be tracked, routed properly, and answered in a timely manner.

## Task

Implement a complete RFI workflow system with the following capabilities:

### 1. RFI Creation
- Sequential numbering per project
- Assign to responsible party (architect, engineer, owner)
- Link to drawings/specifications
- Attach photos and documents
- Set priority (low, medium, high, urgent)
- Set due date based on contract requirements
- Cost/schedule impact flags

### 2. Routing & Notifications
- Email notifications to assignee
- CC distribution list
- Reminder notifications for overdue RFIs
- Status change notifications

### 3. Response Management
- Official response field
- Attach markup drawings
- Response date tracking
- Reviewer approval workflow

### 4. Status Tracking
- Draft → Submitted → Under Review → Answered → Closed
- Reopen if needed
- Track response time metrics

### 5. Integration Points
- Link to change orders (if RFI results in CO)
- Link to submittals
- Link to daily reports
- Link to specific drawing sheets

### 6. Reporting
- Open RFIs by assignee
- Overdue RFIs report
- Average response time
- RFI log export (PDF/Excel)

## Implementation Steps

1. **Review Database Schema**
   - Check `workflow_items` table
   - Verify `workflow_types` includes RFI type
   - Check related tables: `workflow_comments`, `workflow_history`

2. **Create Feature Module**
   ```
   src/features/rfis/
   ├── hooks/
   │   ├── useRFIs.ts
   │   └── useRFIComments.ts
   ├── components/
   │   ├── RFIList.tsx
   │   ├── RFIDetail.tsx
   │   ├── CreateRFIDialog.tsx
   │   └── RFITimeline.tsx
   ```

3. **Implement UI Components**
   - RFI list with filters (status, priority, assignee)
   - RFI detail view with timeline
   - Create/Edit form with file uploads
   - Comment thread for discussions
   - Status change workflow

4. **Business Logic**
   - Auto-generate RFI number (format: RFI-001, RFI-002, etc.)
   - Validate required fields
   - Send notifications on status changes
   - Track SLA for response times
   - Prevent unauthorized status changes

5. **Multi-Tenant Security**
   - Filter by company_id
   - Only show RFIs for assigned projects
   - External users (architects) only see RFIs assigned to them

## Database Query Patterns

```typescript
// Fetch RFIs for a project
const { data } = await supabase
  .from('workflow_items')
  .select(`
    *,
    project:projects(*),
    assigned_to:users(*),
    created_by:users(*)
  `)
  .eq('project_id', projectId)
  .eq('workflow_type_id', rfiWorkflowTypeId)
  .order('item_number', { ascending: false })

// Create RFI with auto-number
const nextNumber = await getNextRFINumber(projectId)
const { data } = await supabase
  .from('workflow_items')
  .insert({
    project_id: projectId,
    workflow_type_id: rfiWorkflowTypeId,
    item_number: `RFI-${String(nextNumber).padStart(3, '0')}`,
    subject: 'Question about...',
    description: 'We need clarification on...',
    assigned_to: architectId,
    status: 'submitted',
    priority: 'medium',
    due_date: calculateDueDate(7), // 7 days from now
  })
```

## Testing Checklist

- [ ] Create new RFI
- [ ] Auto-generate RFI number
- [ ] Upload attachments
- [ ] Assign to external user (architect)
- [ ] Add comments
- [ ] Change status (workflow progression)
- [ ] Link to drawings
- [ ] Mark as having cost impact
- [ ] Filter by status
- [ ] Filter by overdue
- [ ] Export RFI log
- [ ] Verify notifications sent
- [ ] Test multi-tenant isolation

## UI/UX Considerations

- Mobile-friendly for field use
- Quick create shortcut
- Bulk actions (close multiple)
- Search by RFI number or content
- Visual status indicators
- Priority color coding
- Overdue highlighting
