# Web Vitals Configuration Guide

This guide explains how to set up and configure Web Vitals monitoring for your SuperSiteHero application with Google Analytics integration.

## Overview

Web Vitals is a set of metrics that measure real-world user experience on your website:

- **LCP (Largest Contentful Paint)**: How quickly the main content loads
- **INP (Interaction to Next Paint)**: Responsiveness to user interactions
- **CLS (Cumulative Layout Shift)**: Visual stability of the page
- **FCP (First Contentful Paint)**: When the first content appears
- **TTFB (Time to First Byte)**: Backend response time

## Current Setup

The application has Web Vitals monitoring already configured with:

1. **Initialization**: `src/lib/performance/web-vitals.ts` - Core monitoring logic
2. **Auto-initialization**: `src/main.tsx` - Automatically starts monitoring
3. **Development Logging**: Console logs and localStorage storage in development
4. **Production Analytics**: Google Analytics 4 integration (configured but requires setup)

## Setup Instructions

### Step 1: Get Your Google Analytics Measurement ID

1. Go to [Google Analytics Console](https://analytics.google.com)
2. Create a new property or select existing one
3. Navigate to Admin → Data Streams → Web
4. Copy your **Measurement ID** (format: `G-XXXXXXXXXX`)

### Step 2: Update index.html

Replace `G-XXXXXXXXXX` in `index.html` with your actual Measurement ID:

```html
<!-- Line 14: Update the script src -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-YOUR-ID"></script>

<!-- Line 19: Uncomment and update the config line -->
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-YOUR-ID'); // Uncomment and replace with your ID
</script>
```

### Step 3: Verify in Development

1. Start the development server: `npm run dev`
2. Open browser DevTools Console
3. Visit different pages of your application
4. You should see Web Vitals logs like:
   ```
   [Performance] {
     name: 'LCP',
     value: 1234,
     rating: 'good',
     delta: 50,
     id: 'v1-234567...'
   }
   ```

5. Check localStorage for metrics: `JSON.parse(localStorage.getItem('performance-metrics'))`

### Step 4: Test Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

Visit pages and verify that metrics are being sent (check Network tab in DevTools for gtag requests).

## Performance Thresholds

The application monitors against these Google-recommended thresholds:

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| **LCP** | ≤2500ms | ≤4000ms | >4000ms |
| **INP** | ≤200ms | ≤500ms | >500ms |
| **CLS** | ≤0.1 | ≤0.25 | >0.25 |
| **FCP** | ≤1800ms | ≤3000ms | >3000ms |
| **TTFB** | ≤800ms | ≤1800ms | >1800ms |

## Monitoring in Google Analytics

Once configured, you can view Web Vitals metrics in Google Analytics:

1. **Real-time Data**: Admin → Events → Check for LCP, INP, CLS, FCP, TTFB events
2. **Custom Report**: Create a custom report to visualize trends
3. **Alerts**: Set up alerts when metrics fall below thresholds

### Recommended Custom Report Setup

1. Go to Reports → Create Report
2. Dimensions: Event Name, Device Category, Country
3. Metrics: Event Count, Event Value (for metric values)
4. Filter for metric names: LCP, INP, CLS, FCP, TTFB
5. Compare against your thresholds

## Performance Budget Enforcement

The codebase includes a performance budget checker:

```typescript
import { checkPerformanceBudget } from '@/lib/performance/web-vitals'

const budget = checkPerformanceBudget({
  lcp: 2500,
  inp: 200,
  cls: 0.1,
  fcp: 1800,
  ttfb: 800,
})

if (!budget.passed) {
  console.warn('Budget violations:', budget.violations)
}
```

## Debugging

### In Development

1. **Console Logs**: Check browser console for detailed metrics
2. **localStorage**: Access stored metrics:
   ```javascript
   JSON.parse(localStorage.getItem('performance-metrics'))
   ```
3. **Clear Metrics**: `localStorage.removeItem('performance-metrics')`

### In Production

1. **Google Analytics Dashboard**: Real-time and historical data
2. **Custom Events**: Look for LCP, INP, CLS, FCP, TTFB events
3. **Event Details**: Custom parameters included:
   - `metric_value`: Raw metric value
   - `metric_delta`: Change since last navigation
   - `metric_rating`: 'good', 'needs-improvement', or 'poor'
   - `metric_id`: Unique identifier for the metric

## Integration with CI/CD

To enforce performance budgets in CI/CD:

```bash
# Add to package.json scripts
"performance-check": "npm run build && npm run preview &"

# Could be extended with performance budget validation
```

## Component Render Performance

For tracking individual component render times:

```typescript
import { measureComponentRender } from '@/lib/performance/web-vitals'

export function MyComponent() {
  const measureRender = measureComponentRender('MyComponent')

  useEffect(() => {
    const renderTime = measureRender()
    console.log(`Component rendered in ${renderTime}ms`)
  })

  return <div>Content</div>
}
```

## Advanced Configuration

### Custom Thresholds

Modify thresholds in `src/lib/performance/web-vitals.ts`:

```typescript
const THRESHOLDS = {
  LCP: { good: 2500, needsImprovement: 4000 },
  // ... adjust as needed
}
```

### Custom Analytics Backend

Replace the GA integration with your preferred backend:

```typescript
// In sendToAnalytics function, add:
if (import.meta.env.PROD) {
  // Send to your API
  fetch('/api/metrics', {
    method: 'POST',
    body: JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      timestamp: new Date().toISOString(),
    })
  })
}
```

### Session Replay Integration

For more detailed debugging, integrate session replay tools:
- Datadog Session Replay
- LogRocket
- Clarity by Microsoft

## Troubleshooting

### Google Analytics Not Receiving Data

1. **Verify Script Loaded**: Check DevTools Network tab for gtag.js
2. **Check ID Format**: Must be `G-XXXXXXXXXX` not `UA-XXXXXXXXXX`
3. **Check console.errors**: Look for CORS or script errors
4. **Wait for Data**: GA typically shows data with 24-48 hour delay

### High CLS Scores

- Check for late-loading images, fonts, or ads
- Use `OptimizedImage` component for images
- Ensure proper aspect ratios
- Check for dynamically sized elements

### High LCP Scores

- Implement code splitting (already done with lazy routes)
- Optimize images with `OptimizedImage`
- Minimize JavaScript bundle
- Check server response times (TTFB)

## Related Documentation

- [Performance.md](./PERFORMANCE.md) - Overall performance optimization guide
- [PHASE2_IMPLEMENTATION_SUMMARY.md](./PHASE2_IMPLEMENTATION_SUMMARY.md) - Phase 2 features
- [INTEGRATION_CHECKLIST.md](./INTEGRATION_CHECKLIST.md) - Component integration checklist
