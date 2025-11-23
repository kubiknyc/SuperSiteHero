# Phase 2 Performance - Integration Checklist

This checklist tracks the integration of Phase 2 performance components into existing pages.

## Overview

Phase 2 components are **built and ready** but need to be integrated into existing pages. This checklist helps track migration progress.

## Status Legend
- ✅ Complete
- 🟡 In Progress
- ⬜ Not Started
- ⏭️ Not Applicable

---

## 1. Code Splitting Integration ✅

All routes have been converted to lazy loading.

### Routes Converted
- ✅ Projects (ProjectsPage, ProjectDetailPage)
- ✅ Daily Reports (4 pages)
- ✅ Tasks (4 pages)
- ✅ Change Orders (2 pages)
- ✅ Documents (1 page)
- ✅ RFIs (1 page)
- ✅ Submittals (2 pages)
- ✅ Punch Lists (2 pages)
- ✅ Workflows (2 pages)
- ✅ Reports (1 page)

### Auth Pages (Eager Loading)
- ✅ LoginPage
- ✅ SignupPage
- ✅ ForgotPasswordPage
- ✅ DashboardPage

---

## 2. List Virtualization Integration ⬜

Components created, pending integration into pages with large lists.

### Priority 1 - Large Lists (>100 typical items)

#### Daily Reports Page
- ⬜ Replace Table with VirtualizedTable
- ⬜ Test with 1000+ reports
- ⬜ Verify filters still work
- ⬜ Verify sorting works
- ⬜ Test row click navigation

File: `src/pages/daily-reports/DailyReportsPage.tsx`

#### Tasks Page
- ⬜ Replace Table with VirtualizedTable
- ⬜ Test with 1000+ tasks
- ⬜ Verify filters work (status, assignee)
- ⬜ Test row actions

File: `src/pages/tasks/TasksPage.tsx`

#### Documents (when list view added)
- ⬜ Implement VirtualizedList for document cards
- ⬜ Test with 1000+ documents
- ⬜ Verify thumbnail loading

File: TBD

### Priority 2 - Medium Lists (50-100 items)

#### Workflows Page (RFIs, Submittals, Change Orders)
- ⬜ Replace Table with VirtualizedTable
- ⬜ Test with 500+ items
- ⬜ Verify status filters

File: `src/pages/workflows/WorkflowsPage.tsx`

#### Punch Lists Page
- ⬜ Replace Table with VirtualizedTable
- ⬜ Test with 500+ items
- ⬜ Verify status badges

File: `src/pages/punch-lists/PunchListsPage.tsx`

#### Change Orders Page
- ⬜ Replace Table with VirtualizedTable
- ⬜ Test with 200+ items

File: `src/pages/change-orders/ChangeOrdersPage.tsx`

### Priority 3 - Smaller Lists (Optional)

#### Projects Page
- ⬜ Evaluate if virtualization needed
- ⬜ Most users have <50 projects
- ⏭️ Skip if not needed

File: `src/pages/projects/ProjectsPage.tsx`

#### Submittals Page
- ⬜ Replace Table if needed
- ⬜ Test with 200+ items

File: `src/pages/submittals/SubmittalsPage.tsx`

---

## 3. Image Optimization Integration ⬜

Replace all `<img>` tags with `OptimizedImage` component.

### Priority 1 - User Uploaded Images

#### Document Thumbnails
- ⬜ Find all document thumbnail renders
- ⬜ Replace with OptimizedImage
- ⬜ Add fallback for failed loads
- ⬜ Set appropriate aspect ratio

Files: `src/pages/documents/*`, `src/features/documents/*`

#### Photo Galleries
- ⬜ Daily report photos
- ⬜ Punch list photos
- ⬜ Progress photos
- ⬜ Use ImageGallery component

Files:
- `src/pages/daily-reports/DailyReportDetailPage.tsx`
- `src/pages/punch-lists/PunchItemDetailPage.tsx`

#### Project Images
- ⬜ Project header images
- ⬜ Project photo galleries
- ⬜ Replace with OptimizedImage

Files: `src/pages/projects/ProjectDetailPage.tsx`

### Priority 2 - User Avatars

#### User Profile Images
- ⬜ Replace with AvatarImage component
- ⬜ Ensure initials fallback works
- ⬜ Check all sizes (sm, md, lg, xl)

Files to check:
- `src/components/layout/AppLayout.tsx` (header avatar)
- Any user list/card components
- Comment sections
- Assignment components

### Priority 3 - Static Assets

#### Logo and Branding
- ⬜ Replace logo with OptimizedImage
- ⬜ Add proper alt text

Files: `src/components/layout/AppLayout.tsx`

#### Empty State Illustrations
- ⬜ Review if lazy loading benefits
- ⬜ Add if illustrations are large

Files: Search for "empty state" components

---

## 4. Performance Monitoring Integration ✅

### Web Vitals Setup
- ✅ Web Vitals installed
- ✅ Monitoring initialized in main.tsx
- ✅ Console logging in development
- ✅ localStorage storage for debugging

### Production Monitoring (Future)
- ⬜ Choose analytics service (GA, Datadog, etc.)
- ⬜ Configure sendToAnalytics function
- ⬜ Set up error tracking (Sentry/Rollbar)
- ⬜ Create performance dashboard

File: `src/lib/performance/web-vitals.ts`

---

## 5. Testing Checklist

### Before Integration
- ✅ Type checking passes
- ✅ Build succeeds
- ✅ Bundle size reduced

### During Integration

For each page migrated:
- [ ] Component renders correctly
- [ ] Loading states work
- [ ] Error states work
- [ ] Empty states work
- [ ] Filters still functional
- [ ] Sorting still functional
- [ ] Navigation still works
- [ ] Row actions work
- [ ] Performance improved (use DevTools)

### Manual Testing
- [ ] Test on slow 3G (Chrome DevTools)
- [ ] Test on mobile device
- [ ] Test with 1000+ items
- [ ] Verify smooth scrolling
- [ ] Check memory usage (DevTools Memory)
- [ ] Test image lazy loading
- [ ] Verify Web Vitals metrics

### Browser Testing
- [ ] Chrome/Edge latest
- [ ] Firefox latest
- [ ] Safari latest (if Mac available)
- [ ] Mobile Safari
- [ ] Mobile Chrome

---

## 6. Documentation Updates

### Code Documentation
- ✅ Component JSDoc comments
- ✅ Performance documentation created
- ✅ Quick reference guide created
- ✅ Implementation summary created

### User Documentation (If needed)
- [ ] Update any user-facing performance docs
- [ ] Add "Tips for Best Performance" section
- [ ] Document any behavioral changes

---

## 7. Monitoring & Alerts (Future)

### Performance Budgets
- ⬜ Set up CI bundle size checks
- ⬜ Add Lighthouse CI
- ⬜ Configure budget alerts
- ⬜ Add to PR checks

### Production Monitoring
- ⬜ Set up RUM (Real User Monitoring)
- ⬜ Configure slow request alerts
- ⬜ Set up LCP/INP thresholds
- ⬜ Create performance dashboard

---

## Priority Order for Integration

### Week 1 Focus: High-Impact Lists
1. Daily Reports Page (highest traffic)
2. Tasks Page (frequently accessed)
3. Workflows Page (multiple list types)

### Week 2 Focus: Images
1. Document thumbnails
2. Photo galleries (daily reports, punch lists)
3. User avatars

### Week 3 Focus: Remaining Lists
1. Punch Lists Page
2. Change Orders Page
3. Projects Page (if needed)

### Week 4 Focus: Polish & Testing
1. Comprehensive testing
2. Performance measurements
3. Documentation review
4. Production monitoring setup

---

## Migration Example

### Before: Standard Table
```typescript
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Date</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {reports.map((report) => (
      <TableRow key={report.id}>
        <TableCell>{report.date}</TableCell>
        <TableCell>{report.status}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### After: Virtualized Table
```typescript
import { VirtualizedTable } from '@/components/ui/virtualized-table'

<VirtualizedTable
  data={reports}
  columns={[
    {
      key: 'date',
      header: 'Date',
      render: (report) => format(new Date(report.date), 'MMM d, yyyy')
    },
    {
      key: 'status',
      header: 'Status',
      render: (report) => <Badge>{report.status}</Badge>
    }
  ]}
  estimatedRowHeight={73}
  onRowClick={(report) => navigate(`/daily-reports/${report.id}`)}
/>
```

---

## Success Metrics

Track these metrics before and after integration:

### Before Integration (Baseline)
- [ ] Record initial load time
- [ ] Record LCP for main pages
- [ ] Record INP for interactions
- [ ] Record scroll performance with large lists
- [ ] Record image load times

### After Integration (Target)
- [ ] 50%+ reduction in initial load time
- [ ] LCP < 2.5s on all pages
- [ ] INP < 200ms on all interactions
- [ ] Smooth 60fps scroll with 1000+ items
- [ ] 60%+ faster image loading

---

## Blockers & Issues

Track any issues encountered during integration:

### Current Blockers
None identified yet.

### Resolved Issues
- ✅ TypeScript errors in web-vitals (FID → INP migration)
- ✅ Bundle configuration warnings

### Known Limitations
1. Virtualized components not yet integrated (by design)
2. Image components not yet used (by design)
3. Production monitoring not configured (future work)

---

## Rollback Plan

If integration causes issues:

1. **Code Revert**: Each page migration is isolated, easy to revert
2. **Feature Flag**: Consider adding feature flag for virtualization
3. **Gradual Rollout**: Test with subset of users first
4. **Monitoring**: Watch error rates and performance metrics

---

## Next Steps

1. **Immediate**: Start with Daily Reports Page virtualization
2. **This Week**: Migrate top 3 high-traffic list pages
3. **Next Week**: Begin image optimization integration
4. **This Month**: Complete all integrations
5. **Next Month**: Production monitoring setup

---

## Questions & Support

For questions about integration:
- See: [PERFORMANCE_QUICK_REFERENCE.md](./docs/PERFORMANCE_QUICK_REFERENCE.md)
- See: [PERFORMANCE.md](./PERFORMANCE.md)
- Check: Component source code with examples

---

Last Updated: 2025-11-23
Status: Phase 2 Complete, Integration Pending
