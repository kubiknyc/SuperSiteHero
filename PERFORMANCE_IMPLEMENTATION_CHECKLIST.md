# Performance Optimization Implementation Checklist
## Reduce Main Bundle from 2.1MB to <500KB

**Goal:** 76% reduction in initial bundle size
**Time:** 2-3 hours for critical fixes
**Impact:** Massive improvement in page load speed

---

## Pre-Implementation

- [ ] Review `PERFORMANCE_SUMMARY.md` for context
- [ ] Review `QUICK_START_PERFORMANCE_FIX.md` for detailed steps
- [ ] Create a new branch: `git checkout -b perf/lazy-load-heavy-libs`
- [ ] Ensure dev server is running: `npm run dev`
- [ ] Have browser DevTools open for testing

---

## Phase 1: Lazy Load TensorFlow.js (22MB+)

### Implementation
- [ ] Open `src/lib/ml/inference/prediction-service.ts`
- [ ] Remove direct import: `import * as tf from '@tensorflow/tfjs'`
- [ ] Add lazy loader function:
  ```typescript
  let tfModule: typeof import('@tensorflow/tfjs') | null = null;

  async function getTensorFlow() {
    if (!tfModule) {
      tfModule = await import('@tensorflow/tfjs');
    }
    return tfModule;
  }
  ```
- [ ] Update all functions to use `await getTensorFlow()`
- [ ] Save file

### Testing
- [ ] Navigate to analytics page in browser
- [ ] Check Network tab - TensorFlow should only load on analytics page
- [ ] Verify predictions still work
- [ ] Check console for errors
- [ ] Navigate away and back - should use cached module

### Verification
- [ ] Build: `npm run build`
- [ ] Check bundle size - should see reduction
- [ ] No errors in build output

**Expected Savings:** 22MB+ (only loads for analytics users)

---

## Phase 2: Lazy Load Three.js (1.4MB)

### Files to Update
- [ ] `src/features/visualization/components/ModelViewer3D.tsx`
- [ ] `src/features/visualization/components/BIMViewer.tsx`
- [ ] `src/features/visualization/components/ARViewer.tsx`
- [ ] `src/features/visualization/components/VRWalkthrough.tsx`

### Implementation
- [ ] In each file, remove direct Three.js imports
- [ ] Add lazy loading pattern:
  ```typescript
  import { lazy, Suspense } from 'react';

  const ModelViewer3D = lazy(() =>
    import('./ModelViewer3D.implementation')
  );

  export function ModelViewer3DWrapper(props) {
    return (
      <Suspense fallback={<div>Loading 3D viewer...</div>}>
        <ModelViewer3D {...props} />
      </Suspense>
    );
  }
  ```
- [ ] Move implementation to `.implementation.tsx` files
- [ ] Update exports

### Testing
- [ ] Navigate to visualization page
- [ ] Should see "Loading 3D viewer..." briefly
- [ ] 3D viewer should render correctly
- [ ] Check Network tab - Three.js only loads when needed
- [ ] Test AR/VR features if applicable

### Verification
- [ ] Build: `npm run build`
- [ ] Check bundle size reduction
- [ ] Test in production build: `npm run preview`

**Expected Savings:** 1.4MB

---

## Phase 3: Lazy Load PDF.js (1.2MB)

### Implementation
- [ ] Open `src/features/documents/components/viewers/PDFViewer.tsx`
- [ ] Remove direct import: `import * as pdfjsLib from 'pdfjs-dist'`
- [ ] Add lazy loader:
  ```typescript
  let pdfjsModule: typeof import('pdfjs-dist') | null = null;

  async function getPDFJS() {
    if (!pdfjsModule) {
      pdfjsModule = await import('pdfjs-dist');
      pdfjsModule.GlobalWorkerOptions.workerSrc =
        '/assets/pdf.worker.min.js';
    }
    return pdfjsModule;
  }
  ```
- [ ] Update all PDF loading code to use `await getPDFJS()`

### Other Files
- [ ] Update `src/features/documents/utils/pdf-to-canvas.ts`
- [ ] Update `src/features/documents/components/markup/DrawingMarkupCanvas.tsx`
- [ ] Update `src/features/documents/components/comparison/MarkupVersionComparison.tsx`

### Testing
- [ ] Open a document page
- [ ] Click to view a PDF
- [ ] Should load smoothly
- [ ] Check Network tab - PDF.js loads on demand
- [ ] Test markup tools on PDF
- [ ] Test PDF comparison features

### Verification
- [ ] Build and check size
- [ ] Test multiple PDF-related features
- [ ] Verify worker loads correctly

**Expected Savings:** 1.2MB

---

## Phase 4: Lazy Load ExcelJS (910KB)

### Create Export Utility
- [ ] Create new file: `src/lib/export/excel-export.ts`
- [ ] Add export function:
  ```typescript
  export async function exportToExcel(
    data: any[],
    filename: string,
    sheetName: string = 'Sheet1'
  ) {
    const ExcelJS = (await import('exceljs')).default;
    // ... implementation
  }
  ```
- [ ] Copy implementation from `QUICK_START_PERFORMANCE_FIX.md`

### Find and Replace Direct Imports
- [ ] Search codebase for: `import ExcelJS from 'exceljs'`
- [ ] Replace with: `import { exportToExcel } from '@/lib/export/excel-export'`
- [ ] Update export button handlers

### Testing
- [ ] Find an export to Excel button
- [ ] Click it
- [ ] File should download correctly
- [ ] Check Network tab - ExcelJS loads on click
- [ ] Test multiple export features

### Verification
- [ ] Build and verify size reduction
- [ ] Test exports from different pages

**Expected Savings:** 910KB

---

## Phase 5: Lazy Load Konva (374KB)

### Files to Update
- [ ] `src/features/takeoffs/components/TakeoffCanvas.tsx`
- [ ] `src/features/documents/components/markup/DrawingMarkupCanvas.tsx`
- [ ] `src/features/checklists/components/PhotoAnnotationEditor.tsx`
- [ ] `src/features/punch-lists/components/FloorPlanPinDrop.tsx`

### Implementation
- [ ] For each canvas component:
  - [ ] Create wrapper with Suspense
  - [ ] Move implementation to `.implementation.tsx`
  - [ ] Add loading fallback
- [ ] Use pattern from `QUICK_START_PERFORMANCE_FIX.md`

### Testing
- [ ] Test takeoff tools
- [ ] Test drawing markup
- [ ] Test photo annotation
- [ ] Test floor plan pin drops
- [ ] Verify all canvas features work

**Expected Savings:** 374KB

---

## Phase 6: Update Vite Config

### Edit vite.config.ts
- [ ] Open `vite.config.ts`
- [ ] Find `build.rollupOptions.output.manualChunks`
- [ ] Add new vendor chunks:
  ```typescript
  'vendor-pdf': ['pdfjs-dist', 'jspdf', 'jspdf-autotable'],
  'vendor-3d': ['three', '@react-three/fiber', '@react-three/drei'],
  'vendor-canvas': ['konva', 'react-konva'],
  'vendor-export': ['exceljs', 'jszip'],
  'vendor-qr': ['html5-qrcode', 'qrcode.react'],
  ```
- [ ] Save file

### Verification
- [ ] Build: `npm run build`
- [ ] Should see new vendor chunks in output
- [ ] Check bundle sizes

---

## Phase 7: Lazy Load Additional Libraries (Optional)

### QR Scanner
- [ ] Update `src/features/punch-lists/components/QRCodeScanner.tsx`
- [ ] Wrap in lazy loading

### Emoji Picker
- [ ] Find emoji picker usage
- [ ] Wrap in lazy component

### jsPDF
- [ ] Create `src/lib/export/pdf-export.ts`
- [ ] Add lazy loading wrapper

---

## Final Verification

### Build Tests
- [ ] Run `npm run build`
- [ ] Check main bundle size: **Target <500KB**
- [ ] Verify no build errors
- [ ] Check for bundle warnings

### Feature Testing Checklist
- [ ] Analytics page loads and predictions work
- [ ] 3D visualization renders
- [ ] PDF viewer opens documents
- [ ] PDF markup tools work
- [ ] Excel export downloads
- [ ] Takeoff canvas works
- [ ] Drawing markup functions
- [ ] Photo annotation works
- [ ] QR scanner (if updated)

### Performance Tests
- [ ] Run Lighthouse: `npm run lighthouse`
  - [ ] Performance score >90
  - [ ] FCP <1.5s
  - [ ] TTI <3.5s
- [ ] Test on slow 3G connection
- [ ] Check initial page load time

### Bundle Analysis
- [ ] Run bundle analyzer (if available): `npm run analyze`
- [ ] Verify main bundle <500KB
- [ ] Check that heavy libraries are in separate chunks
- [ ] Confirm lazy loading working

### Cross-Browser Testing
- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari (if available)
- [ ] Test on mobile device

---

## Rollback Plan

If something breaks:

```bash
# Stash your changes
git stash

# Or revert specific files
git checkout HEAD -- path/to/file

# Rebuild
npm run build

# Test
npm run dev
```

Keep commits small so you can revert specific changes if needed.

---

## Success Criteria

### Bundle Sizes
- [x] Main bundle: <500KB (currently 2.1MB)
- [x] Vendor chunks: <200KB each
- [x] CSS bundle: <200KB

### Performance Metrics
- [x] Lighthouse Performance: >90
- [x] First Contentful Paint: <1.5s
- [x] Time to Interactive: <3.5s
- [x] Total Blocking Time: <200ms

### Functionality
- [x] All lazy-loaded features work correctly
- [x] No console errors in production
- [x] Loading states show appropriately
- [x] No feature regressions

---

## Post-Implementation

### Documentation
- [ ] Update `PERFORMANCE_SUMMARY.md` with results
- [ ] Document any issues encountered
- [ ] Add comments to complex lazy loading code
- [ ] Update team wiki if applicable

### Deployment
- [ ] Create pull request
- [ ] Add before/after bundle size comparison
- [ ] Request code review
- [ ] Run CI/CD pipeline
- [ ] Deploy to staging
- [ ] Monitor for errors
- [ ] Deploy to production

### Monitoring
- [ ] Set up bundle size monitoring in CI
- [ ] Monitor Sentry for lazy loading errors
- [ ] Track Core Web Vitals
- [ ] Compare before/after metrics
- [ ] Celebrate success! 🎉

---

## Troubleshooting

### Issue: Build fails with module errors
**Solution:** Check import paths, ensure dynamic imports use correct syntax

### Issue: Features don't load
**Solution:** Check Network tab, verify chunk loads, check for errors in console

### Issue: Infinite loading states
**Solution:** Verify Suspense boundaries, check error handling in lazy loads

### Issue: Performance not improved
**Solution:** Run bundle analyzer, verify heavy libs are actually lazy-loaded

---

## Resources

- Quick start guide: `QUICK_START_PERFORMANCE_FIX.md`
- Full plan: `PERFORMANCE_OPTIMIZATION_PLAN.md`
- Summary: `PERFORMANCE_SUMMARY.md`
- Analysis: `CODE_ANALYSIS_REPORT.md`

---

## Notes

Add any notes or issues encountered during implementation:

```
[Add your notes here]
```

---

**Estimated Time:** 2-3 hours
**Impact:** 76% bundle size reduction
**Difficulty:** Medium
**Priority:** CRITICAL
