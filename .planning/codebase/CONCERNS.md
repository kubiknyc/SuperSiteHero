# Technical Concerns

> Generated: 2026-01-13 | Project: JobSight (SuperSiteHero)

## Summary

| Category | High | Medium | Low | Total |
|----------|------|--------|-----|-------|
| Technical Debt | 3 | 2 | - | 5 |
| Code Quality | 4 | 3 | - | 7 |
| Security | - | 4 | 1 | 5 |
| Performance | - | 3 | - | 3 |
| Dependencies | - | - | 1 | 1 |
| **TOTAL** | **7** | **12** | **2** | **21** |

---

## HIGH SEVERITY

### 1. Role-based Approval Workflows Incomplete
- **Location**: `src/types/approval-workflow.ts:6`
- **Issue**: TODO indicates role-based approvers not implemented
- **Impact**: Approval workflows limited to user-based only
- **Fix**: Implement role-based approval configuration system

### 2. Large Component Files (1500+ lines)
- **Locations**:
  - `src/features/subcontractors/components/PreQualificationForm.tsx` (1653 lines)
  - `src/features/documents/components/markup/UnifiedDrawingCanvas.tsx` (1607 lines)
  - `src/features/tasks/components/EnhancedGanttChart.tsx` (1564 lines)
- **Impact**: Difficult to test, maintain, and understand
- **Fix**: Break into smaller composable components

### 3. CSS Variables Animation Support
- **Location**: `src/components/LoadingScreen.tsx:29`
- **Issue**: Hardcoded color instead of design token
- **Fix**: Update when animation support available

### 4. React Hook Violations
- **Locations**:
  - `src/features/drawings/components/DrawingRevisionComparison.tsx`
  - `src/features/drawings/components/DrawingSliderComparison.tsx`
  - `src/hooks/useCursorPersistence.ts`
  - `src/hooks/useFieldValidation.ts`
- **Issue**: ESLint disable for hook rules
- **Impact**: Potential stale closures, infinite renders
- **Fix**: Refactor to properly use hooks or useReducer

### 5. Konva Private API Access
- **Location**: `src/features/documents/components/DrawingCanvas.tsx:1046-1049`
- **Issue**: Accessing private Konva properties with `@ts-expect-error`
- **Impact**: Breaks with library updates
- **Fix**: Use public Konva API

### 6. Non-Standard Touch Events
- **Location**: `src/features/documents/hooks/useMobileTouchGestures.ts:175`
- **Issue**: Accessing non-standard `touchType` property
- **Impact**: Browser compatibility issues
- **Fix**: Use standard Touch interface

### 7. Excessive ESLint Max Warnings
- **Location**: `package.json:13`
- **Issue**: `--max-warnings 3000`
- **Impact**: Linting effectiveness reduced
- **Fix**: Incrementally reduce (100 → 50 → 0)

---

## MEDIUM SEVERITY

### 8. Type Safety with Generic Functions
- **Location**: `src/lib/api/client.ts:80-81`
- **Issue**: Using `Function` type (unsafe)
- **Fix**: Define proper typed interface

### 9. Untyped Supabase Client
- **Location**: `src/lib/supabase.ts:46-47`
- **Issue**: `as any` for tables not in generated types
- **Impact**: 2733 instances of `as any/unknown`
- **Fix**: Run Supabase type generation

### 10. Unsafe Regex Pattern
- **Location**: `src/features/documents/hooks/useDrawingSetManagement.ts`
- **Issue**: `eslint-disable security/detect-unsafe-regex`
- **Impact**: Potential ReDoS vulnerability
- **Fix**: Audit and simplify regex

### 11. React Hook Form Type Mismatch
- **Location**: `src/features/material-receiving/components/DeliveryForm.tsx:110`
- **Issue**: Type mismatch with `z.coerce.number()`
- **Fix**: Create proper wrapper types

### 12. Duplicate Imports
- **Locations**:
  - `src/features/safety/components/NearMissTrendDashboard.tsx`
  - `src/features/safety/components/NearMissHeatMap.tsx`
- **Fix**: Combine imports from same module

### 13. Sensitive Data in Offline Storage
- **Location**: `src/lib/offline/indexeddb.ts`
- **Issue**: IndexedDB caching potentially sensitive data
- **Fix**: Implement encryption for sensitive fields

### 14. Public Approval Links
- **Location**: `src/types/approval-workflow.ts:374-398`
- **Issues**:
  - No rate limiting visible
  - Optional email verification
- **Fix**: Add rate limiting, audit logging, mandatory verification

### 15. localStorage for Sensitive State
- **Locations**: Multiple layout components
- **Issue**: Recent searches stored in plain text
- **Fix**: Use sessionStorage or encryption

### 16. Missing Performance Optimizations
- **Issue**: No React.memo, useMemo, useCallback detected
- **Impact**: Unnecessary re-renders
- **Fix**: Profile and add memoization

### 17. JSON.stringify in Render Paths
- **Locations**:
  - `src/components/ConflictResolutionDialog.tsx`
  - `src/lib/offline/conflict-resolver.ts`
- **Impact**: Performance degradation with large data
- **Fix**: Use shallow comparison helpers

### 18. Large Sync Batch Handling
- **Location**: `src/lib/offline/sync-manager.ts:143`
- **Issue**: Background Sync API type bypass
- **Fix**: Define proper TypeScript types

### 19. Console Logging in Production
- **Count**: 1371 console calls across 162 files
- **Impact**: Performance overhead, debug info exposure
- **Fix**: Use centralized logger with environment detection

---

## LOW SEVERITY

### 20. Clean Dependency Audit
- **Status**: ✅ No vulnerabilities found
- **Note**: Maintain regular audits

### 21. Control Character Regex
- **Location**: `src/features/schedule/utils/scheduleExport.ts:75`
- **Impact**: Minor, used for sanitization
- **Fix**: Document filtered characters

---

## PRIORITY FIXES

### Immediate (High Impact)
1. Reduce ESLint max-warnings from 3000 to 200
2. Break down mega-components (>1500 lines)
3. Fix React hook violations in drawing components

### Short-term
4. Implement Supabase type generation for all tables
5. Add rate limiting for public approval links
6. Implement offline data encryption

### Medium-term
7. Profile and add memoization to high-render components
8. Replace console.log with centralized logger
9. Refactor Konva code to use public API

---

## TECHNICAL DEBT TRACKING

### Known TODOs
- Role-based approval system
- CSS variable animations
- Background Sync API types

### Disabled ESLint Rules
- `react-hooks/set-state-in-effect` (drawing components)
- `react-hooks/exhaustive-deps` (field validation)
- `security/detect-unsafe-regex` (document parsing)
- `@typescript-eslint/no-explicit-any` (API client)

### @ts-expect-error Comments
- Konva private properties (DrawingCanvas)
- Touch events (MobileTouchGestures)
- React Hook Form resolver (DeliveryForm)
- Background Sync API (sync-manager)

---

## MONITORING RECOMMENDATIONS

1. **Error Tracking**: Sentry configured ✅
2. **Performance**: Web Vitals configured ✅
3. **Security Scanning**: Add regular npm audit to CI
4. **Type Coverage**: Track `any` usage over time
5. **Bundle Size**: Monitor with vite-bundle-visualizer
