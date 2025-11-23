# Performance Optimization - Quick Reference

This guide provides quick code snippets and patterns for using Phase 2 performance optimizations.

## Table of Contents
1. [Code Splitting](#code-splitting)
2. [Virtualized Lists](#virtualized-lists)
3. [Optimized Images](#optimized-images)
4. [Performance Monitoring](#performance-monitoring)

---

## Code Splitting

### Adding a New Lazy Route

```typescript
// 1. Import lazy and Suspense
import { lazy, Suspense } from 'react'

// 2. Create lazy component
const MyNewPage = lazy(() =>
  import('./pages/MyNewPage')
    .then(m => ({ default: m.MyNewPage }))
)

// 3. Add route inside Suspense
<Suspense fallback={<RouteLoadingFallback />}>
  <Routes>
    <Route path="/my-route" element={<ProtectedRoute><MyNewPage /></ProtectedRoute>} />
  </Routes>
</Suspense>
```

### Custom Loading Fallback

```typescript
import { ComponentLoadingFallback } from '@/components/loading/RouteLoadingFallback'

const HeavyComponent = lazy(() => import('./HeavyComponent'))

<Suspense fallback={<ComponentLoadingFallback />}>
  <HeavyComponent />
</Suspense>
```

---

## Virtualized Lists

### Basic Table

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
/>
```

### Table with Row Click

```typescript
<VirtualizedTable
  data={items}
  columns={columns}
  onRowClick={(item) => navigate(`/items/${item.id}`)}
  rowClassName={(item) => item.isHighlighted ? 'bg-yellow-50' : ''}
/>
```

### Card List (Virtualized)

```typescript
import { VirtualizedList } from '@/components/ui/virtualized-table'

<VirtualizedList
  data={projects}
  renderItem={(project, index) => (
    <Card key={project.id} className="mb-4">
      <CardHeader>
        <CardTitle>{project.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{project.description}</p>
      </CardContent>
    </Card>
  )}
  estimatedItemHeight={200}
  maxHeight="800px"
/>
```

### Custom Column Width

```typescript
columns={[
  {
    key: 'name',
    header: 'Name',
    render: (item) => item.name,
    className: 'w-1/3' // Tailwind width class
  },
  {
    key: 'status',
    header: 'Status',
    render: (item) => <Badge>{item.status}</Badge>,
    className: 'w-24' // Fixed width
  }
]}
```

---

## Optimized Images

### Basic Image

```typescript
import { OptimizedImage } from '@/components/ui/optimized-image'

<OptimizedImage
  src={photo.url}
  alt={photo.description}
  aspectRatio="video"
/>
```

### Image with Fallback

```typescript
<OptimizedImage
  src={user.avatar}
  alt={user.name}
  fallbackSrc="/default-avatar.png"
  aspectRatio="square"
  objectFit="cover"
/>
```

### Image Gallery

```typescript
import { ImageGallery } from '@/components/ui/optimized-image'

<ImageGallery
  images={[
    { src: '/photo1.jpg', alt: 'Photo 1', caption: 'Main entrance' },
    { src: '/photo2.jpg', alt: 'Photo 2', caption: 'Work area' },
  ]}
  columns={3}
  aspectRatio="video"
  onImageClick={(index) => openLightbox(index)}
/>
```

### Avatar with Initials

```typescript
import { AvatarImage } from '@/components/ui/optimized-image'

<AvatarImage
  src={user.avatar}
  alt={user.name}
  fallbackText={user.name} // Shows initials if image fails
  size="lg"
/>
```

### Aspect Ratios

```typescript
// Available aspect ratios:
aspectRatio="square"   // 1:1
aspectRatio="video"    // 16:9
aspectRatio="portrait" // 3:4
aspectRatio="auto"     // Natural size
```

### Object Fit Options

```typescript
// How image fills container:
objectFit="cover"   // Fill container, crop if needed (default)
objectFit="contain" // Fit inside, letterbox if needed
objectFit="fill"    // Stretch to fill
objectFit="none"    // Natural size
```

---

## Performance Monitoring

### Accessing Metrics in Development

```javascript
// In browser console:
localStorage.getItem('performance-metrics')

// Or use the helper:
import { getStoredMetrics } from '@/lib/performance/web-vitals'
console.log(getStoredMetrics())
```

### Measure Component Render Time

```typescript
import { measureComponentRender } from '@/lib/performance/web-vitals'
import { useEffect } from 'react'

function MyComponent() {
  useEffect(() => {
    const endMeasure = measureComponentRender('MyComponent')
    return () => {
      const renderTime = endMeasure()
      // renderTime in milliseconds
    }
  }, [])

  return <div>Content</div>
}
```

### Check Performance Budget

```typescript
import { checkPerformanceBudget } from '@/lib/performance/web-vitals'

const result = checkPerformanceBudget({
  lcp: 2000,
  inp: 150,
  cls: 0.05,
  fcp: 1500,
  ttfb: 600
})

if (!result.passed) {
  console.warn('Performance budget violations:', result.violations)
}
```

### Custom Performance Budget

```typescript
const result = checkPerformanceBudget(
  metrics,
  {
    lcp: 2000,    // Custom: 2s instead of 2.5s
    inp: 100,     // Custom: 100ms instead of 200ms
    bundleSize: 300 // Custom: 300KB instead of 500KB
  }
)
```

---

## Common Patterns

### List Page with Virtualization

```typescript
import { VirtualizedTable } from '@/components/ui/virtualized-table'
import { useDailyReports } from '@/features/daily-reports/hooks/useDailyReports'

export function DailyReportsPage() {
  const { data: reports, isLoading } = useDailyReports()

  if (isLoading) return <LoadingSpinner />

  return (
    <VirtualizedTable
      data={reports}
      columns={[
        {
          key: 'date',
          header: 'Date',
          render: (report) => format(new Date(report.date), 'MMM d, yyyy')
        },
        {
          key: 'weather',
          header: 'Weather',
          render: (report) => report.weather
        }
      ]}
      onRowClick={(report) => navigate(`/daily-reports/${report.id}`)}
    />
  )
}
```

### Image Upload Preview

```typescript
import { OptimizedImage } from '@/components/ui/optimized-image'
import { useState } from 'react'

function ImageUpload() {
  const [preview, setPreview] = useState<string>()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPreview(URL.createObjectURL(file))
    }
  }

  return (
    <div>
      <input type="file" onChange={handleFileChange} accept="image/*" />
      {preview && (
        <OptimizedImage
          src={preview}
          alt="Preview"
          aspectRatio="video"
          className="mt-4"
        />
      )}
    </div>
  )
}
```

### Lazy Load Heavy Feature

```typescript
import { lazy, Suspense } from 'react'
import { ComponentLoadingFallback } from '@/components/loading/RouteLoadingFallback'

// Heavy chart library only loaded when needed
const ReportChart = lazy(() => import('./ReportChart'))

function ReportsSection() {
  const [showChart, setShowChart] = useState(false)

  return (
    <div>
      <Button onClick={() => setShowChart(true)}>
        View Chart
      </Button>

      {showChart && (
        <Suspense fallback={<ComponentLoadingFallback />}>
          <ReportChart data={data} />
        </Suspense>
      )}
    </div>
  )
}
```

---

## Performance Tips

### Do's ✅

- ✅ Use `VirtualizedTable` for lists with 100+ items
- ✅ Use `OptimizedImage` for all external images
- ✅ Lazy load routes that aren't frequently accessed
- ✅ Measure render time for heavy components
- ✅ Check Web Vitals in development
- ✅ Use proper aspect ratios for images
- ✅ Add fallback images for external sources

### Don'ts ❌

- ❌ Don't lazy load critical routes (login, dashboard)
- ❌ Don't use standard `<img>` tags without lazy loading
- ❌ Don't render 1000+ items without virtualization
- ❌ Don't skip loading states for lazy components
- ❌ Don't ignore performance warnings in console
- ❌ Don't load large images without optimization
- ❌ Don't forget to measure before optimizing

---

## Troubleshooting

### Virtualized Table Issues

**Problem**: Rows have wrong height
```typescript
// Solution: Adjust estimatedRowHeight
<VirtualizedTable
  estimatedRowHeight={100} // Increase if rows are taller
/>
```

**Problem**: Scrolling not smooth
```typescript
// Solution: Increase overscan
const virtualizer = useVirtualizer({
  overscan: 10, // More pre-rendered rows
})
```

### Image Loading Issues

**Problem**: Images not lazy loading
```typescript
// Make sure loading prop is set
<img loading="lazy" />
// Or use OptimizedImage which includes it
<OptimizedImage src={url} alt={alt} />
```

**Problem**: Layout shift when images load
```typescript
// Solution: Always set aspectRatio
<OptimizedImage
  src={url}
  alt={alt}
  aspectRatio="video" // Reserves space
/>
```

### Bundle Size Issues

**Problem**: Chunk too large warning
```typescript
// Check if you're importing heavy library at top level
// Bad:
import * as ChartLibrary from 'heavy-charts'

// Good:
const ChartLibrary = lazy(() => import('heavy-charts'))
```

---

## Quick Checklist

Before committing new code:

- [ ] Are lists >100 items using virtualization?
- [ ] Are images using `OptimizedImage`?
- [ ] Are new routes lazy loaded (if not critical)?
- [ ] Are loading states defined?
- [ ] Did you test on slow network?
- [ ] Are Web Vitals still in budget?
- [ ] Did bundle size increase reasonably?

---

## Resources

- Full documentation: [PERFORMANCE.md](../PERFORMANCE.md)
- Implementation summary: [PHASE2_IMPLEMENTATION_SUMMARY.md](../PHASE2_IMPLEMENTATION_SUMMARY.md)
- Web Vitals: https://web.dev/vitals/
- TanStack Virtual: https://tanstack.com/virtual/latest

---

Last Updated: 2025-11-23
