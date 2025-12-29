# SuperSiteHero Improvement Tasks

Generated: 2025-12-28

This document contains prioritized improvement tasks identified from a comprehensive codebase analysis.

---

## Summary

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Performance | 1 | 2 | 2 | 0 |
| Accessibility | 0 | 2 | 2 | 1 |
| Code Quality | 1 | 2 | 2 | 1 |
| Testing | 0 | 2 | 2 | 1 |
| UX | 0 | 2 | 2 | 1 |

---

## 1. Performance Optimizations

### HIGH PRIORITY

#### P1.1 Add React.memo and useCallback to high-render components
**Effort:** Medium (2-3 hours)

Multiple components lack memoization despite frequent re-renders.

**Components to Update:**
- [ ] `src/features/daily-reports/components/v2/PhotosSection.tsx` - Add useCallback to addPhoto, updatePhoto, removePhoto handlers
- [ ] `src/features/daily-reports/components/v2/ApprovalWorkflowPanel.tsx` - Memoize onSubmit, onApprove, onRequestChanges handlers
- [ ] `src/components/layout/MobileBottomNav.tsx` - Wrap with React.memo (re-renders on location changes)
- [ ] `src/features/checklists/pages/ChecklistsDashboardPage.tsx` - Wrap stat cards in React.memo
- [ ] `src/features/checklists/pages/TemplatesPage.tsx` - Memoize template list rendering

#### P1.2 Standardize API query staleTime configuration
**Effort:** Medium (2-3 hours)

API calls have inconsistent staleTime configurations.

**Files to Review:**
- [ ] `src/features/rfis/hooks/useRFIAttachments.ts` - No staleTime set
- [ ] `src/features/rfis/hooks/useRFIRouting.ts` - Inconsistent settings
- [ ] All hooks in `src/features/*/hooks/` directories

**Recommended Pattern:**
```typescript
const QUERY_STALE_TIMES = {
  static: 30 * 60 * 1000,    // 30 min for rarely changing data
  moderate: 5 * 60 * 1000,   // 5 min for moderately changing data
  dynamic: 60 * 1000,        // 1 min for frequently changing data
};
```

### MEDIUM PRIORITY

#### P1.3 Lazy load UnifiedDrawingCanvas component
**Effort:** Large (4-6 hours)

UnifiedDrawingCanvas (1609 lines) is imported eagerly despite being used only on drawing pages.

**File:** `src/features/documents/components/markup/UnifiedDrawingCanvas.tsx`

**Solution:** Create lazy-loaded wrapper similar to `src/features/punch-lists/components/LazyFloorPlanPinDrop.tsx`

**Impact:** Reduce initial bundle by ~50KB

#### P1.4 Optimize PDF Export with Caching
**Effort:** Small (1-2 hours)

Multiple PDF export utilities generate PDFs on demand without caching.

**Files:**
- `src/features/checklists/utils/failureTrendExport.ts`
- `src/features/rfis/utils/pdfExport.ts`
- `src/features/daily-reports/utils/pdfExport.ts`

---

## 2. Accessibility (a11y) Improvements

### HIGH PRIORITY

#### A2.1 Add ARIA labels to interactive elements
**Effort:** Medium (3-4 hours)

Many interactive elements lack proper ARIA labels.

**Critical Components:**
- [ ] `src/components/layout/MobileBottomNav.tsx` - "More" button needs aria-label
- [ ] `src/features/daily-reports/components/v2/PhotosSection.tsx` - Upload, GPS capture, edit buttons
- [ ] `src/features/documents/components/markup/UnifiedDrawingCanvas.tsx` - Drawing tools toolbar
- [ ] `src/features/checklists/pages/ChecklistsDashboardPage.tsx` - Chart filter buttons

**Example Fix:**
```tsx
// Before
<Button variant="ghost" size="icon">
  <Camera className="h-4 w-4" />
</Button>

// After
<Button variant="ghost" size="icon" aria-label="Take photo">
  <Camera className="h-4 w-4" />
</Button>
```

#### A2.2 Implement keyboard navigation for custom components
**Effort:** Medium (3-4 hours)

Custom components don't handle keyboard events properly.

**Missing Implementations:**
- [ ] Drawing canvas: Escape to cancel, Enter to confirm
- [ ] Dialog overlays: Escape key handling in custom modals
- [ ] Form sections: Tab order optimization

### MEDIUM PRIORITY

#### A2.3 Fix focus management in dialogs
**Effort:** Small (1-2 hours)

**Files:**
- [ ] `src/features/daily-reports/components/v2/PhotosSection.tsx` - Add focus trap
- [ ] `src/pages/settings/ApprovalWorkflowsPage.tsx` - DialogContent focus management

#### A2.4 Audit chart color contrast
**Effort:** Small (1-2 hours)

**File:** `src/features/checklists/pages/ChecklistsDashboardPage.tsx`

Recharts colors may not meet WCAG AA contrast requirements.

### LOW PRIORITY

#### A2.5 Fix form label associations
**Effort:** Small (1 hour)

Some inputs lack proper htmlFor/id associations.

**Files to Check:**
- `src/features/daily-reports/components/v2/DetailedModeForm.tsx`
- `src/features/daily-reports/components/v2/DelayEntry.tsx`

---

## 3. Code Quality Improvements

### HIGH PRIORITY

#### C3.1 Create shared PDF export utility
**Effort:** Small (2-3 hours)

Multiple features have duplicate PDF export logic.

**Current Duplicates:**
- `src/features/checklists/utils/failureTrendExport.ts`
- `src/features/rfis/utils/pdfExport.ts`
- `src/features/daily-reports/utils/pdfExport.ts`
- `src/features/submittals/utils/pdfExport.ts`
- `src/features/change-orders/utils/pdfExport.ts`

**Proposed Solution:** Create `src/lib/utils/pdfGenerator.ts`

```typescript
interface PDFOptions {
  title: string;
  subtitle?: string;
  logo?: boolean;
  headerInfo?: Record<string, string>;
  sections: PDFSection[];
  footer?: string;
}

export function generatePDF(options: PDFOptions): Promise<Blob>;
export function downloadPDF(blob: Blob, filename: string): void;
```

#### C3.2 Fix "any" type usage
**Effort:** Medium (4-6 hours)

40 files use the `any` type, reducing type safety.

**Priority Files:**
- [ ] `src/features/checklists/pages/ExecutionDetailPage.tsx` (L76)
- [ ] `src/features/daily-reports/hooks/usePhotoUploadManager.ts`
- [ ] `src/features/daily-reports/hooks/usePhotoStorage.ts`
- [ ] `src/features/reports/components/ChartRenderer.tsx`
- [ ] `src/features/daily-reports/hooks/useWeather.ts`

### MEDIUM PRIORITY

#### C3.3 Split large components (1000+ lines)
**Effort:** Medium (2-4 hours per component)

**Components to Split:**

| Component | Lines | Split Into |
|-----------|-------|------------|
| UnifiedDrawingCanvas | 1609 | CanvasToolbar, CanvasRenderer, ShapeEditor |
| ApprovalWorkflowsPage | 1154 | WorkflowForm, WorkflowListView, TemplateSelector |
| SafetyIncidentsSection | 1154 | IncidentForm, IncidentCard, IncidentsList |
| EquipmentPage | 1003 | EquipmentGrid, EquipmentStats, EquipmentModals |

#### C3.4 Standardize error handling patterns
**Effort:** Small (2 hours)

**Files with generic error handling:**
- `src/pages/approvals/ApprovalRequestPage.tsx`
- `src/pages/approvals/MyApprovalsPage.tsx`

**Solution:** Create error handling utility for consistent messages.

### LOW PRIORITY

#### C3.5 Remove deprecated ESLint disables
**Effort:** Small (1 hour)

**Files:**
- `src/features/documents/components/markup/UnifiedDrawingCanvas.tsx` (L4)
- `src/features/checklists/pages/ExecutionDetailPage.tsx` (L5)

---

## 4. Testing Gaps

### HIGH PRIORITY

#### T4.1 Add unit tests for major pages
**Effort:** Large (1-2 hours per page)

**Pages Without Tests:**
- [ ] `src/pages/equipment/EquipmentPage.tsx` (1003 lines)
- [ ] `src/pages/budget/BudgetPage.tsx`
- [ ] `src/pages/cost-tracking/CostTrackingPage.tsx`
- [ ] `src/pages/analytics/AnalyticsPage.tsx`
- [ ] `src/pages/permits/PermitsPage.tsx`
- [ ] `src/pages/site-instructions/SiteInstructionsPage.tsx`

**Test Requirements for EquipmentPage:**
- Renders equipment grid with data
- Filters work correctly (status, type, inspection due)
- Stats cards show correct totals
- Maintenance timeline displays properly
- Add/edit equipment modals function

#### T4.2 Add integration tests for critical workflows
**Effort:** Medium (3-4 hours)

**Workflows Not Fully Tested:**
- [ ] Daily report creation → approval → locking flow
- [ ] Checklist execution with failure tracking
- [ ] RFI routing and ball-in-court management
- [ ] Photo upload with GPS metadata capture

### MEDIUM PRIORITY

#### T4.3 Cover offline sync edge cases
**Effort:** Medium (3-4 hours)

**Location:** `src/__tests__/integration/offline-sync-workflow.test.tsx`

**Missing Tests:**
- [ ] Sync conflict resolution with multiple versions
- [ ] Attachment uploads during partial connectivity
- [ ] Large batch operations while offline

#### T4.4 Add component library tests
**Effort:** Small (2-3 hours)

**Components Missing Tests:**
- [ ] `src/components/ui/touch-wrapper.tsx`
- [ ] `src/components/ui/glove-mode-toggle.tsx`
- [ ] `src/components/ui/voice-input.tsx`

### LOW PRIORITY

#### T4.5 Add performance baseline tests
**Effort:** Large (6-8 hours)

**Tests to Add:**
- Page load time thresholds
- Component render count limits
- Memory usage in long-running pages
- PDF generation performance

---

## 5. UX Improvements

### HIGH PRIORITY

#### U5.1 Add error boundaries to chart/canvas components
**Effort:** Small (2-3 hours)

**Components Needing Error Boundaries:**
- [ ] `src/features/documents/components/markup/UnifiedDrawingCanvas.tsx`
- [ ] `src/features/reports/components/ChartRenderer.tsx`
- [ ] `src/features/checklists/pages/ChecklistsDashboardPage.tsx` - Chart section

**Implementation:**
```tsx
// src/components/error/LocalErrorBoundary.tsx
export class LocalErrorBoundary extends React.Component<Props, State> {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <ErrorFallbackCard />;
    }
    return this.props.children;
  }
}
```

#### U5.2 Add confirmation dialogs for destructive actions
**Effort:** Medium (3-4 hours)

**Missing Confirmations:**
- [ ] Bulk delete operations in equipment/budget pages
- [ ] Approval rejection without reason prompt
- [ ] Template deletion without showing usage count
- [ ] Attachment deletion in RFIs/Submittals

### MEDIUM PRIORITY

#### U5.3 Enhance loading states
**Effort:** Medium (2-3 hours)

**Files Needing Enhancement:**
- [ ] `src/features/checklists/pages/ChecklistsDashboardPage.tsx` - Add chart skeleton
- [ ] `src/features/checklists/pages/TemplatesPage.tsx` - Add skeleton loader
- [ ] `src/features/daily-reports/components/v2/PhotosSection.tsx` - Improve upload feedback

#### U5.4 Create standardized empty state component
**Effort:** Small (2 hours)

Create `src/components/ui/empty-state.tsx` for consistent empty states across all list pages.

```tsx
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

### LOW PRIORITY

#### U5.5 Implement undo/recovery for destructive actions
**Effort:** Large (6-8 hours)

**Critical Operations Without Undo:**
- Signature submission on daily reports
- Approval decisions on workflows
- Checklist failure marking
- Drawing markup deletion

**Solution:** Implement optimistic updates with 5-second undo window using toast notifications.

---

## Prioritized Action Plan

### Week 1-2 (HIGH PRIORITY)
1. [ ] Add useCallback to PhotosSection handlers (P1.1)
2. [ ] Create shared PDF export utility (C3.1)
3. [ ] Add ARIA labels to interactive elements (A2.1)
4. [ ] Fix "any" types in ExecutionDetailPage (C3.2)
5. [ ] Add error boundaries to chart components (U5.1)

### Week 3-4 (MEDIUM PRIORITY)
1. [ ] Split UnifiedDrawingCanvas into smaller components (C3.3)
2. [ ] Add React.memo to MobileBottomNav and stat cards (P1.1)
3. [ ] Create test suite for EquipmentPage and BudgetPage (T4.1)
4. [ ] Implement keyboard navigation (A2.2)
5. [ ] Add confirmation dialogs for destructive actions (U5.2)

### Week 5+ (LOW PRIORITY)
1. [ ] Lazy load drawing canvas components (P1.3)
2. [ ] Create standardized empty states (U5.4)
3. [ ] Implement undo/recovery for destructive actions (U5.5)
4. [ ] Audit color contrast in charts (A2.4)
5. [ ] Add performance baseline tests (T4.5)

---

## Metrics

**Total Files Analyzed:** 400+ TypeScript/React files
**Test Files Found:** 376 test files (48 test directories)
**Critical Issues:** 8
**Code Quality Issues:** 12
**Performance Opportunities:** 5
**Accessibility Gaps:** 5
**Testing Gaps:** 5
**UX Gaps:** 5
