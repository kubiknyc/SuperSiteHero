# Quick Start: Critical Performance Fix
## Reduce Main Bundle from 2.1MB to <500KB

**Time Required:** 2-3 hours for immediate 60-70% reduction
**Impact:** Massive improvement in initial page load speed

---

## Step 1: Lazy Load TensorFlow.js (Highest Impact - 22MB+)

### Current Issue
TensorFlow is loaded on every page load, even though it's only used in analytics.

### Fix

**File:** `src/lib/ml/inference/prediction-service.ts`

```typescript
// BEFORE: ❌ Loads 22MB on every page load
import * as tf from '@tensorflow/tfjs';

export async function predictScheduleDelay(features: number[]) {
  const model = await tf.loadLayersModel('/models/schedule-delay.json');
  // ...
}

// AFTER: ✅ Only loads when analytics features are used
let tfModule: typeof import('@tensorflow/tfjs') | null = null;

async function getTensorFlow() {
  if (!tfModule) {
    tfModule = await import('@tensorflow/tfjs');
  }
  return tfModule;
}

export async function predictScheduleDelay(features: number[]) {
  const tf = await getTensorFlow();
  const model = await tf.loadLayersModel('/models/schedule-delay.json');
  // ...
}
```

**Expected Savings:** 22MB+ (won't load unless user visits analytics page)

---

## Step 2: Lazy Load Three.js (High Impact - 1.4MB)

### Current Issue
3D visualization library loads on every page, but only used in specific features.

### Fix

**File:** `src/pages/visualization/VisualizationPage.tsx`

```typescript
// BEFORE: ❌ Loads 1.4MB of 3D libraries on every page
import { ModelViewer3D } from '@/features/visualization/components/ModelViewer3D';

// AFTER: ✅ Only loads when user navigates to visualization page
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '@/components/loading/LoadingSpinner';

const ModelViewer3D = lazy(() =>
  import('@/features/visualization/components/ModelViewer3D')
);

export function VisualizationPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ModelViewer3D />
    </Suspense>
  );
}
```

**Files to Update:**
- `src/pages/visualization/VisualizationPage.tsx`
- `src/features/visualization/components/BIMViewer.tsx` (if used elsewhere)

**Expected Savings:** 1.4MB

---

## Step 3: Lazy Load PDF.js (High Impact - 1.2MB)

### Current Issue
PDF rendering library loads on every page, even on pages without PDFs.

### Fix

**File:** `src/features/documents/components/viewers/PDFViewer.tsx`

```typescript
// BEFORE: ❌ Loads 1.2MB PDF library immediately
import * as pdfjsLib from 'pdfjs-dist';
import { getDocument } from 'pdfjs-dist';

export function PDFViewer({ url }: { url: string }) {
  const loadPDF = async () => {
    const pdf = await getDocument(url).promise;
    // ...
  };
}

// AFTER: ✅ Only loads when viewing PDFs
let pdfjsModule: typeof import('pdfjs-dist') | null = null;

async function getPDFJS() {
  if (!pdfjsModule) {
    pdfjsModule = await import('pdfjs-dist');
    // Configure worker path
    pdfjsModule.GlobalWorkerOptions.workerSrc =
      '/assets/pdf.worker.min.js';
  }
  return pdfjsModule;
}

export function PDFViewer({ url }: { url: string }) {
  const loadPDF = async () => {
    const pdfjs = await getPDFJS();
    const pdf = await pdfjs.getDocument(url).promise;
    // ...
  };
}
```

**Expected Savings:** 1.2MB (only loads when opening PDF documents)

---

## Step 4: Lazy Load ExcelJS (Medium Impact - 910KB)

### Create Export Utility

**New File:** `src/lib/export/excel-export.ts`

```typescript
// Lazy-loaded Excel export utility
export async function exportToExcel(
  data: any[],
  filename: string,
  sheetName: string = 'Sheet1'
) {
  // Only load ExcelJS when actually exporting
  const ExcelJS = (await import('exceljs')).default;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // Add data
  worksheet.addRows(data);

  // Generate file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  // Download
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
```

**Usage Example:**

```typescript
// In your export button:
import { exportToExcel } from '@/lib/export/excel-export';

function ExportButton({ data }: { data: any[] }) {
  const handleExport = async () => {
    await exportToExcel(data, 'daily-reports.xlsx', 'Reports');
  };

  return <button onClick={handleExport}>Export to Excel</button>;
}
```

**Expected Savings:** 910KB (only loads when clicking export button)

---

## Step 5: Lazy Load Konva (Medium Impact - 374KB)

### Current Issue
Canvas library loads on all pages, only used for drawing/markup features.

### Fix

**File:** `src/features/takeoffs/components/TakeoffCanvas.tsx`

```typescript
// Wrap the entire canvas component in lazy loading:
import { lazy, Suspense } from 'react';

const TakeoffCanvasLazy = lazy(() =>
  import('./TakeoffCanvas.implementation').then(m => ({
    default: m.TakeoffCanvasImplementation
  }))
);

export function TakeoffCanvas(props: TakeoffCanvasProps) {
  return (
    <Suspense fallback={<div>Loading canvas...</div>}>
      <TakeoffCanvasLazy {...props} />
    </Suspense>
  );
}
```

**New File:** `src/features/takeoffs/components/TakeoffCanvas.implementation.tsx`

```typescript
// Move the actual implementation here
import { Stage, Layer } from 'react-konva';
import Konva from 'konva';

export function TakeoffCanvasImplementation(props: TakeoffCanvasProps) {
  // ... existing canvas implementation
}
```

**Expected Savings:** 374KB (only loads when using drawing/markup features)

---

## Step 6: Update Vite Config

**File:** `vite.config.ts`

Add these manual chunks to separate heavy libraries:

```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        // Existing chunks
        'vendor-react': ['react', 'react-dom', 'react-router-dom'],
        'vendor-query': ['@tanstack/react-query'],
        'vendor-supabase': ['@supabase/supabase-js'],
        'vendor-ui': ['lucide-react', 'date-fns', 'clsx', 'tailwind-merge'],

        // NEW: Add these for better code splitting
        'vendor-pdf': ['pdfjs-dist', 'jspdf', 'jspdf-autotable'],
        'vendor-3d': ['three', '@react-three/fiber', '@react-three/drei'],
        'vendor-canvas': ['konva', 'react-konva'],
        'vendor-export': ['exceljs', 'jszip'],
        'vendor-qr': ['html5-qrcode', 'qrcode.react'],
        'vendor-charts': ['recharts'],
      }
    }
  },
  chunkSizeWarningLimit: 300,
}
```

---

## Step 7: Test & Verify

### 1. Build and Check Bundle Sizes

```bash
npm run build
```

Look for the main bundle size in the output. Should see significant reduction.

### 2. Test Lazy-Loaded Features

Test each feature that was made lazy-loaded:
- [ ] Analytics page (TensorFlow)
- [ ] 3D visualization (Three.js)
- [ ] PDF viewer (PDF.js)
- [ ] Excel export button (ExcelJS)
- [ ] Drawing/markup tools (Konva)

### 3. Check for Errors

```bash
# Run dev server
npm run dev

# Check browser console for errors
# Test all lazy-loaded features
```

### 4. Run Bundle Analyzer (if available)

```bash
npm run analyze
```

This will show you a visual breakdown of your bundle sizes.

---

## Expected Results

### Before
- Main bundle: **2.1MB**
- Initial load: Slow, especially on mobile
- Time to Interactive: ~6s

### After (these 6 steps)
- Main bundle: **~500KB** (76% reduction!)
- Initial load: Much faster
- Time to Interactive: ~2.5s

### Impact
- 76% faster initial page load
- 76% less initial data transfer
- Much better mobile experience
- Improved SEO rankings
- Lower bounce rates

---

## Troubleshooting

### Issue: "Cannot find module" errors

**Solution:** Make sure dynamic imports use correct paths:
```typescript
// Use relative paths
await import('./component')

// Or use aliases
await import('@/features/component')
```

### Issue: Loading states show too long

**Solution:** Add better loading indicators:
```typescript
<Suspense fallback={
  <div className="flex items-center justify-center p-8">
    <LoadingSpinner />
    <span>Loading 3D viewer...</span>
  </div>
}>
  <ModelViewer3D />
</Suspense>
```

### Issue: Features break after lazy loading

**Solution:**
1. Check that all imports are included in lazy-loaded component
2. Verify no circular dependencies
3. Test in production build, not just dev

---

## Next Steps

After completing these quick wins:

1. **Review full plan:** See `PERFORMANCE_OPTIMIZATION_PLAN.md` for comprehensive approach
2. **Add monitoring:** Set up bundle size tracking in CI
3. **Optimize images:** Implement lazy loading for images
4. **Add React.memo:** Memoize expensive components
5. **Profile runtime:** Use React DevTools Profiler to find render bottlenecks

---

## Validation Checklist

- [ ] Build completes without errors
- [ ] Main bundle is <500KB
- [ ] All lazy-loaded features work correctly
- [ ] No console errors in production
- [ ] Loading states show appropriately
- [ ] Page load feels significantly faster
- [ ] Run Lighthouse audit (should show improvement)

---

## Emergency Rollback

If something breaks:

```bash
# Revert changes
git checkout HEAD -- src/lib/ml/inference/prediction-service.ts
git checkout HEAD -- src/features/visualization/
git checkout HEAD -- src/features/documents/components/viewers/
git checkout HEAD -- vite.config.ts

# Rebuild
npm run build
```

---

**Questions?** Review the full `PERFORMANCE_OPTIMIZATION_PLAN.md` for detailed implementation guidance.

**Estimated Time:** 2-3 hours
**Difficulty:** Medium
**Impact:** Critical (76% bundle size reduction)
