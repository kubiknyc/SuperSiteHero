# JobSight Testing Checklist

## Pre-Testing Configuration

### Environment Setup
- [ ] Verify `.env.local` exists with proper values:
  - [ ] `VITE_SUPABASE_URL` is set
  - [ ] `VITE_SUPABASE_ANON_KEY` is set
  - [ ] `VITE_APP_URL` is set (defaults to `http://localhost:5173`)

### Supabase Secrets (Required for Email/Push)
Run these commands in your terminal:
```bash
# Email (Resend)
supabase secrets set RESEND_API_KEY=re_your_key_here
supabase secrets set EMAIL_FROM="JobSight <noreply@yourdomain.com>"

# Push Notifications (VAPID)
# Generate keys: npx web-push generate-vapid-keys
supabase secrets set VAPID_PRIVATE_KEY=your_private_key
# Set public key in .env.local: VITE_VAPID_PUBLIC_KEY=your_public_key
```

---

## Core Features Testing

### 1. RFI (Request for Information)

#### Create RFI
- [ ] Navigate to project RFIs page
- [ ] Click "Create RFI" button
- [ ] Fill required fields (subject, question)
- [ ] Test drawing reference:
  - [ ] Type manual reference (e.g., "A-101")
  - [ ] Click drawing picker icon
  - [ ] Select drawing from list
  - [ ] Place pin on drawing (optional)
  - [ ] Verify pin location is saved
- [ ] Set priority (low/normal/high/urgent)
- [ ] Set discipline
- [ ] Set response due date
- [ ] Set ball-in-court assignment
- [ ] Add cost/schedule impact if applicable
- [ ] Add distribution list recipients
- [ ] Submit RFI
- [ ] Verify RFI number is generated (RFI-001, etc.)

#### RFI Notifications
- [ ] Verify distribution list users receive in-app notification
- [ ] Verify distribution list users receive email (if RESEND configured)
- [ ] Check email content includes RFI details and link

#### Respond to RFI
- [ ] Open existing RFI
- [ ] Add response text
- [ ] Submit response
- [ ] Verify RFI creator receives notification
- [ ] Verify status changes to "Responded"

#### RFI Analytics
- [ ] View RFI statistics dashboard
- [ ] Check overdue RFI tracking
- [ ] Verify ball-in-court filtering works

### 2. Submittals

#### Create Submittal
- [ ] Navigate to project submittals page
- [ ] Click "Create Submittal" button
- [ ] Fill spec section (e.g., "03 30 00")
- [ ] Add description/title
- [ ] Set submittal type (product data, shop drawing, etc.)
- [ ] Assign responsible party
- [ ] Set required date
- [ ] Add attachments
- [ ] Save as draft

#### Submit for Review
- [ ] Open draft submittal
- [ ] Click "Submit for Review"
- [ ] Verify project managers receive notification
- [ ] Verify ball-in-court changes to "Architect"

#### Review Submittal
- [ ] Open submitted submittal as reviewer
- [ ] Add review comments
- [ ] Select review status (Approved, Approved as Noted, Revise & Resubmit, Rejected)
- [ ] Submit review
- [ ] Verify submittal creator receives notification
- [ ] Verify status updates correctly

#### Submittal Matrix/Schedule View
- [ ] Open submittal register/matrix view
- [ ] Verify traffic light status indicators
- [ ] Test filtering by status, spec section
- [ ] Check lead time calculations

### 3. Change Orders

#### Create PCO (Potential Change Order)
- [ ] Navigate to change orders
- [ ] Create new PCO
- [ ] Fill description, reason
- [ ] Add line items (labor, material, equipment, subcontract)
- [ ] Calculate totals
- [ ] Submit for internal review

#### Approval Workflow
- [ ] Test 6-step approval workflow
- [ ] Verify notifications at each step
- [ ] Test approval with conditions
- [ ] Test rejection flow
- [ ] Convert PCO to CO after owner approval

#### G702/G703 Integration
- [ ] Link change order to payment application
- [ ] Verify amounts update in SOV

### 4. Payment Applications (G702/G703)

#### Create Payment Application
- [ ] Navigate to payment applications
- [ ] Create new application
- [ ] Add SOV line items
- [ ] Enter work completed percentages
- [ ] Add stored materials
- [ ] Calculate retention

#### Generate PDFs
- [ ] Generate G702 (Application for Payment)
- [ ] Verify all fields populated correctly
- [ ] Generate G703 (Continuation Sheet)
- [ ] Verify line items and totals match

### 5. Safety/OSHA

#### Daily Inspection
- [ ] Create safety checklist
- [ ] Complete inspection items
- [ ] Mark pass/fail items
- [ ] Add photos for failed items
- [ ] Submit inspection

#### Incident Reporting
- [ ] Create safety incident report
- [ ] Select severity level
- [ ] Add witness information
- [ ] Upload photos/documents
- [ ] Submit report
- [ ] Verify notifications sent to safety team

#### Toolbox Talks
- [ ] Create toolbox talk
- [ ] Add attendees
- [ ] Record signatures
- [ ] Complete talk

### 6. Daily Reports

#### Create Daily Report
- [ ] Start new daily report
- [ ] Add weather conditions
- [ ] Add manpower entries
- [ ] Add equipment on site
- [ ] Add work performed notes
- [ ] Add photos
- [ ] Submit report

### 7. Punch Lists

#### Create Punch Items
- [ ] Navigate to punch lists
- [ ] Add new punch item
- [ ] Assign to responsible party
- [ ] Set priority
- [ ] Add location/drawing reference
- [ ] Add photos

#### Complete Punch Items
- [ ] Mark item as complete
- [ ] Add completion photos
- [ ] Verify item status updates

### 8. Documents & Drawings

#### Upload Documents
- [ ] Upload various file types (PDF, images, DWG)
- [ ] Test drag-and-drop upload
- [ ] Verify file preview works

#### Drawing Viewer
- [ ] Open drawing in PDF viewer
- [ ] Test pan/zoom controls
- [ ] Test rotation
- [ ] Test fullscreen mode

#### Markup Tools
- [ ] Add arrow annotations
- [ ] Add text annotations
- [ ] Add shape annotations
- [ ] Add freehand drawing
- [ ] Save markup
- [ ] Verify markup persists on reload

#### Drawing Comparison
- [ ] Select two revisions
- [ ] Test side-by-side view
- [ ] Test overlay view
- [ ] Test slider comparison

### 9. Schedule/Gantt

#### View Gantt Chart
- [ ] Open schedule page
- [ ] View tasks on timeline
- [ ] Test zoom in/out
- [ ] View critical path

#### Baseline Comparison
- [ ] Create baseline
- [ ] Make schedule changes
- [ ] Compare against baseline
- [ ] View variance indicators

#### Look-Ahead Planner
- [ ] Open 4-week look-ahead
- [ ] Export look-ahead report

### 10. Portals

#### Subcontractor Portal
- [ ] Login as subcontractor
- [ ] View assigned punch items
- [ ] Update item status with photo
- [ ] Upload compliance documents
- [ ] Test offline sync

#### Client Portal
- [ ] Login as client
- [ ] View project photos timeline
- [ ] View change order status (read-only)
- [ ] View schedule milestones

---

## Email Notifications Testing

### Configuration Check
- [ ] Verify `RESEND_API_KEY` is set in Supabase secrets
- [ ] Verify `EMAIL_FROM` is set in Supabase secrets
- [ ] Test Edge Function is deployed: `supabase functions list`

### Email Delivery Tests
- [ ] RFI Created → Distribution list receives email
- [ ] RFI Responded → Creator receives email
- [ ] Submittal Submitted → Reviewer receives email
- [ ] Submittal Reviewed → Creator receives email
- [ ] Change Order Status Change → Stakeholders receive email
- [ ] Safety Incident → Safety team receives email
- [ ] Punch Item Assigned → Assignee receives email

### Email Content Verification
- [ ] Check email renders correctly
- [ ] Check links work (view in app)
- [ ] Check project name is correct
- [ ] Check sender address is correct

---

## Push Notifications Testing

### Configuration Check
- [ ] Verify `VITE_VAPID_PUBLIC_KEY` in `.env.local`
- [ ] Verify `VAPID_PRIVATE_KEY` in Supabase secrets

### Browser Notification Tests
- [ ] Request notification permission
- [ ] Subscribe to push notifications
- [ ] Trigger notification (e.g., assign punch item)
- [ ] Verify notification appears in browser/OS

---

## Offline Functionality Testing

### IndexedDB Sync
- [ ] Navigate to a project
- [ ] Disable network (DevTools → Network → Offline)
- [ ] Create/edit items while offline
- [ ] Re-enable network
- [ ] Verify data syncs to server

### PWA Tests
- [ ] Install app as PWA
- [ ] Open app offline
- [ ] Verify cached pages load
- [ ] Test sync queue visualization

---

## Performance Testing

### Page Load
- [ ] Home page loads < 3s
- [ ] Project pages load < 2s
- [ ] Large lists virtualize correctly

### Real-time Updates
- [ ] Open same project in two browsers
- [ ] Make change in one
- [ ] Verify update appears in other

---

## Browser Compatibility

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

---

## Known Issues/Notes

_Document any issues discovered during testing here:_

1.
2.
3.

---

## Test Environment Info

- **Date Tested:**
- **Tested By:**
- **Environment:** Local / Staging / Production
- **Browser:**
- **Device:**

