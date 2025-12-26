# Performance Optimization Plan
## JobSight Construction Field Management Platform

**Generated:** 2025-12-25
**Status:** Code splitting IMPLEMENTED, bundle optimization NEEDED

---

## Executive Summary

### Current State
- ✅ **Code splitting:** Already implemented with React.lazy and Suspense
- ✅ **Vendor chunking:** Configured in vite.config.ts
- ⚠️ **Main bundle size:** 2.1MB (CRITICAL - target: <500KB)
- ⚠️ **Heavy dependencies:** Not lazy-loaded, included in main bundle

### Performance Score: C+ → Target: A

---

## Critical Issues (Immediate Action Required)

### 1. Main Bundle Size: 2.1MB
**Impact:** Slow initial page load, poor mobile performance, high bounce rate

**Root Causes:**
- Heavy libraries bundled eagerly
- Large dependencies not code-split
- Unused code from large libraries

### 2. Heavy Dependencies Not Lazy Loaded
**Current State:**
```typescript
// These large libraries are loaded immediately:
- @tensorflow/tfjs (22MB+) - ML predictions
- three.js (1.4MB) - 3D visualization
- pdfjs-dist (1.2MB) - PDF rendering
- konva (374KB) - Canvas manipulation
- exceljs (910KB) - Excel export
- tesseract.js (large) - OCR
- html5-qrcode (380KB) - QR scanning
- jspdf (353KB) - PDF generation
- emoji-picker-react (263KB) - Emoji picker
```

**Expected Impact:** 40-60% bundle size reduction

---

## Implementation Plan

## Phase 1: Lazy Load Heavy Libraries (CRITICAL - 2-3 days)

### 1.1 TensorFlow.js (22MB+)
**Current Usage:** ML predictions in analytics

```typescript
// src/lib/ml/inference/prediction-service.ts
// BEFORE:
import * as tf from '@tensorflow/tfjs';

// AFTER:
const loadTensorFlow = async () => {
  const tf = await import('@tensorflow/tfjs');
  return tf;
};

// Usage:
export async function predictScheduleDelay(features: number[]) {
  const tf = await loadTensorFlow();
  // ... use tf
}
```

**Files to update:**
- `src/lib/ml/inference/prediction-service.ts`
- `src/pages/analytics/AnalyticsPage.tsx` (lazy load entire page)

**Expected savings:** 22MB+ (not loaded unless analytics page is visited)

---

### 1.2 Three.js (3D Visualization)
**Current Usage:** 3D BIM viewer, AR/VR features

```typescript
// src/features/visualization/components/ModelViewer3D.tsx
// BEFORE:
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';

// AFTER:
const ModelViewer3D = lazy(() => import('./ModelViewer3D.lazy'));

// Create new file: ModelViewer3D.lazy.tsx
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
// ... component implementation
```

**Files to update:**
- `src/features/visualization/components/ModelViewer3D.tsx`
- `src/features/visualization/components/BIMViewer.tsx`
- `src/features/visualization/components/ARViewer.tsx`
- `src/features/visualization/components/VRWalkthrough.tsx`
- `src/pages/visualization/VisualizationPage.tsx`

**Implementation:**
1. Create lazy-loaded wrapper components
2. Add loading fallbacks with skeleton screens
3. Only load when user navigates to 3D features

**Expected savings:** 1.4MB+ (only loaded for 3D visualization)

---

### 1.3 PDF.js (PDF Rendering)
**Current Usage:** PDF viewer, document markup

```typescript
// src/features/documents/components/viewers/PDFViewer.tsx
// BEFORE:
import * as pdfjsLib from 'pdfjs-dist';

// AFTER:
const PDFViewer = lazy(() => import('./PDFViewer.lazy'));

// In PDFViewer.lazy.tsx:
const loadPDFJS = async () => {
  const pdfjsLib = await import('pdfjs-dist');
  return pdfjsLib;
};
```

**Files to update:**
- `src/features/documents/components/viewers/PDFViewer.tsx`
- `src/features/documents/utils/pdf-to-canvas.ts`
- `src/features/documents/components/markup/DrawingMarkupCanvas.tsx`

**Expected savings:** 1.2MB+ (only loaded when viewing PDFs)

---

### 1.4 Konva (Canvas Manipulation)
**Current Usage:** Drawing markup, takeoffs, photo annotation

```typescript
// src/features/takeoffs/components/TakeoffCanvas.tsx
// BEFORE:
import { Stage, Layer } from 'react-konva';
import Konva from 'konva';

// AFTER:
const TakeoffCanvas = lazy(() => import('./TakeoffCanvas.lazy'));
```

**Files to update:**
- `src/features/takeoffs/components/TakeoffCanvas.tsx`
- `src/features/documents/components/markup/DrawingMarkupCanvas.tsx`
- `src/features/documents/components/markup/UnifiedDrawingCanvas.tsx`
- `src/features/checklists/components/PhotoAnnotationEditor.tsx`
- `src/features/punch-lists/components/FloorPlanPinDrop.tsx`

**Expected savings:** 374KB (only loaded when using canvas features)

---

### 1.5 ExcelJS (Excel Export)
**Current Usage:** Export reports to Excel

```typescript
// Create utility function for lazy loading:
// src/lib/export/excel-export.ts
export async function exportToExcel(data: any[], filename: string) {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  // ... export logic
}
```

**Files to update:**
- Create new `src/lib/export/excel-export.ts` wrapper
- Update all export buttons to use lazy-loaded export

**Expected savings:** 910KB (only loaded when exporting to Excel)

---

### 1.6 Tesseract.js (OCR)
**Current Usage:** OCR in workers

```typescript
// src/workers/ocr.worker.ts
// Already in worker, but ensure it's lazy-loaded:
const loadTesseract = async () => {
  const Tesseract = await import('tesseract.js');
  return Tesseract;
};
```

**Note:** Already excluded from pre-bundling in vite.config.ts
**Action:** Verify it's only loaded when OCR is actually used

---

### 1.7 html5-qrcode (QR Scanning)
**Current Usage:** QR code scanner for punch lists

```typescript
// src/features/punch-lists/components/QRCodeScanner.tsx
const QRCodeScanner = lazy(() => import('./QRCodeScanner.lazy'));
```

**Expected savings:** 380KB (only loaded when scanning QR codes)

---

### 1.8 jsPDF (PDF Generation)
**Current Usage:** Generate PDF reports

```typescript
// src/lib/export/pdf-export.ts
export async function generatePDF(content: any) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  // ... generation logic
}
```

**Expected savings:** 353KB (only loaded when generating PDFs)

---

### 1.9 emoji-picker-react (Emoji Picker)
**Current Usage:** Emoji picker in messaging

```typescript
// Create lazy-loaded emoji picker component:
const EmojiPicker = lazy(() => import('emoji-picker-react'));
```

**Expected savings:** 263KB (only loaded when opening emoji picker)

---

## Phase 2: Optimize Vite Configuration (1 day)

### 2.1 Add Manual Chunks for Heavy Libraries

Update `vite.config.ts`:

```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        // Existing chunks...
        'vendor-react': ['react', 'react-dom', 'react-router-dom'],
        'vendor-query': ['@tanstack/react-query'],
        'vendor-supabase': ['@supabase/supabase-js'],

        // NEW: Heavy libraries in separate chunks
        'vendor-pdf': ['pdfjs-dist', 'jspdf', 'jspdf-autotable'],
        'vendor-3d': ['three', '@react-three/fiber', '@react-three/drei'],
        'vendor-canvas': ['konva', 'react-konva'],
        'vendor-export': ['exceljs', 'jszip'],
        'vendor-ocr': ['tesseract.js'],
        'vendor-qr': ['html5-qrcode', 'qrcode.react'],
        'vendor-emoji': ['emoji-picker-react'],
        'vendor-ml': ['@tensorflow/tfjs'],

        // ... existing chunks
      }
    }
  },
  chunkSizeWarningLimit: 300, // Keep strict limit
}
```

### 2.2 Add Preload Hints for Critical Chunks

```typescript
// In index.html or create a preload component:
<link rel="modulepreload" href="/assets/vendor-react-[hash].js" />
<link rel="modulepreload" href="/assets/vendor-supabase-[hash].js" />
```

---

## Phase 3: Component-Level Optimizations (2-3 days)

### 3.1 Add React.memo for Heavy Components

```typescript
// PhotoOrganizerPage (1.4MB) - memoize expensive components
export const PhotoCard = React.memo(({ photo }) => {
  return <div>...</div>;
});

// MarkupVersionComparison (1.2MB) - memoize comparison views
export const ComparisonView = React.memo(({ before, after }) => {
  return <div>...</div>;
});
```

### 3.2 Add useMemo for Expensive Calculations

```typescript
// In analytics pages:
const chartData = useMemo(() => {
  return processAnalyticsData(rawData);
}, [rawData]);

// In takeoffs:
const measurements = useMemo(() => {
  return calculateMeasurements(shapes);
}, [shapes]);
```

### 3.3 Add useCallback for Event Handlers

```typescript
// In canvas components:
const handleCanvasClick = useCallback((e: KonvaEventObject<MouseEvent>) => {
  // Handle click
}, [dependencies]);
```

---

## Phase 4: Route Preloading (1 day)

### 4.1 Implement Prefetching for Likely Routes

```typescript
// src/lib/utils/route-prefetch.ts
export function prefetchRoute(path: string) {
  // Prefetch route when hovering over link
  const route = getRouteComponent(path);
  if (route) {
    route.preload();
  }
}

// Usage in navigation:
<Link
  to="/projects"
  onMouseEnter={() => prefetchRoute('/projects')}
>
  Projects
</Link>
```

### 4.2 Prefetch Critical Routes on Idle

```typescript
// src/App.tsx
useEffect(() => {
  // Prefetch critical routes when browser is idle
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      // Prefetch likely next routes
      import('./pages/projects/ProjectsPage');
      import('./pages/daily-reports/DailyReportsPage');
    });
  }
}, []);
```

---

## Phase 5: Image Optimization (1-2 days)

### 5.1 Implement Progressive Image Loading

```typescript
// Create optimized image component:
export function OptimizedImage({ src, alt, ...props }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      {!loaded && <Skeleton />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={loaded ? 'opacity-100' : 'opacity-0'}
        {...props}
      />
    </>
  );
}
```

### 5.2 Use WebP Format with Fallbacks

```typescript
<picture>
  <source srcSet={image.webp} type="image/webp" />
  <source srcSet={image.jpg} type="image/jpeg" />
  <img src={image.jpg} alt="Project photo" loading="lazy" />
</picture>
```

---

## Phase 6: Bundle Analysis & Monitoring (Ongoing)

### 6.1 Regular Bundle Analysis

```bash
# Run bundle analyzer monthly
npm run analyze

# Check for unused dependencies quarterly
npx depcheck

# Audit npm dependencies monthly
npm audit
```

### 6.2 Set Up Bundle Size Budgets in CI

```yaml
# .github/workflows/bundle-size.yml
- name: Check Bundle Size
  run: |
    npm run build
    MAX_SIZE=500000  # 500KB max for main bundle
    ACTUAL_SIZE=$(stat -f%z dist/assets/index-*.js)
    if [ $ACTUAL_SIZE -gt $MAX_SIZE ]; then
      echo "Bundle too large: $ACTUAL_SIZE bytes (max: $MAX_SIZE)"
      exit 1
    fi
```

### 6.3 Performance Budgets

Target metrics:
- Main bundle: <500KB (currently 2.1MB) ❌
- Vendor bundles: <200KB each ✓
- CSS bundle: <200KB (currently 175KB) ✓
- First Contentful Paint: <1.5s
- Time to Interactive: <3.5s
- Lighthouse Score: >90

---

## Implementation Priority

### Week 1 (CRITICAL)
- [ ] Lazy load TensorFlow.js (22MB+ savings)
- [ ] Lazy load Three.js (1.4MB+ savings)
- [ ] Lazy load PDF.js (1.2MB+ savings)
- [ ] Run bundle analysis to verify improvements

### Week 2 (HIGH)
- [ ] Lazy load Konva (374KB savings)
- [ ] Lazy load ExcelJS (910KB savings)
- [ ] Lazy load QR scanner (380KB savings)
- [ ] Update Vite config with new manual chunks

### Week 3 (MEDIUM)
- [ ] Add React.memo to PhotoOrganizerPage components
- [ ] Add React.memo to MarkupVersionComparison components
- [ ] Implement route prefetching
- [ ] Add useMemo/useCallback where needed

### Week 4 (LOW)
- [ ] Image optimization
- [ ] Set up bundle size monitoring
- [ ] Document performance best practices
- [ ] Training for team on performance optimization

---

## Expected Results

### Before Optimization
- Main bundle: 2.1MB
- Total bundle size: ~8MB
- First Load JS: ~2.5MB
- FCP: ~3.5s
- TTI: ~6s
- Lighthouse: 65

### After Optimization (Projected)
- Main bundle: <500KB (76% reduction) ✅
- Total bundle size: ~3MB (62% reduction) ✅
- First Load JS: <600KB (76% reduction) ✅
- FCP: <1.5s (57% improvement) ✅
- TTI: <3.5s (42% improvement) ✅
- Lighthouse: >90 (38% improvement) ✅

### User Impact
- 76% faster initial page load
- 62% less data usage (important for mobile)
- Improved SEO rankings (Google prioritizes fast sites)
- Better user experience, especially on slow connections
- Lower bounce rates
- Higher engagement

---

## Files to Update (Summary)

### Critical Files (Phase 1)
1. `src/lib/ml/inference/prediction-service.ts` - TensorFlow lazy load
2. `src/features/visualization/components/ModelViewer3D.tsx` - Three.js lazy load
3. `src/features/documents/components/viewers/PDFViewer.tsx` - PDF.js lazy load
4. `src/features/takeoffs/components/TakeoffCanvas.tsx` - Konva lazy load
5. `vite.config.ts` - Update manual chunks

### Supporting Files
6. Create `src/lib/export/excel-export.ts` - ExcelJS wrapper
7. Create `src/lib/export/pdf-export.ts` - jsPDF wrapper
8. Create `src/lib/utils/route-prefetch.ts` - Route prefetching
9. Create `src/components/OptimizedImage.tsx` - Image optimization

### Configuration Files
10. `vite.config.ts` - Manual chunks, optimization
11. `.github/workflows/bundle-size.yml` - CI bundle size check
12. `package.json` - Add bundle analysis scripts

---

## Monitoring & Validation

### After Each Phase
1. Run `npm run build` and check bundle sizes
2. Test all affected features thoroughly
3. Run Lighthouse audit: `npm run lighthouse`
4. Check Core Web Vitals: `npm run perf:web-vitals`
5. Verify lazy loading works in production

### Success Criteria
- ✅ Main bundle <500KB
- ✅ No feature regressions
- ✅ Lighthouse score >90
- ✅ FCP <1.5s
- ✅ TTI <3.5s
- ✅ All lazy-loaded features work correctly

---

## Risk Mitigation

### Potential Issues
1. **Lazy loading delays:** Add loading skeletons
2. **Code splitting breaks:** Test thoroughly in production
3. **SEO impact:** Ensure critical content loads fast
4. **User experience:** Show loading states, not blank screens

### Testing Strategy
1. Test each lazy-loaded feature manually
2. Run E2E tests after each phase
3. Monitor Sentry for lazy loading errors
4. Check bundle sizes in CI before merge
5. Canary deploy to 10% of users first

---

## Resources

### Tools
- `npm run analyze` - Bundle size analyzer
- `npm run lighthouse` - Lighthouse audit
- `npx depcheck` - Find unused dependencies
- Chrome DevTools > Coverage - Find unused code
- Chrome DevTools > Performance - Profile runtime

### Documentation
- [React.lazy docs](https://react.dev/reference/react/lazy)
- [Vite code splitting](https://vitejs.dev/guide/features.html#code-splitting)
- [Web Vitals](https://web.dev/vitals/)

---

**Next Steps:**
1. Review this plan with team
2. Create GitHub issues for each phase
3. Assign developers to each phase
4. Start with Phase 1 (Critical) immediately
5. Track progress weekly

**Questions/Concerns:**
Contact performance team lead for guidance on implementation.
