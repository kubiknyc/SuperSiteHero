# Performance Testing

Comprehensive performance testing and monitoring for JobSight.

## Overview

This directory contains tools and utilities for measuring and monitoring application performance:

1. **Web Vitals Monitoring** - Real user monitoring (RUM) of Core Web Vitals
2. **Lighthouse CI** - Automated performance audits
3. **Bundle Analysis** - JavaScript bundle size tracking
4. **Database Performance** - Query optimization and monitoring

## Web Vitals

### Core Web Vitals

**Largest Contentful Paint (LCP)** - Loading Performance
- **Good:** < 2.5s
- **Needs Improvement:** 2.5s - 4.0s
- **Poor:** > 4.0s
- **Our Target:** < 2.0s

**First Input Delay (FID)** - Interactivity
- **Good:** < 100ms
- **Needs Improvement:** 100ms - 300ms
- **Poor:** > 300ms
- **Our Target:** < 50ms

**Cumulative Layout Shift (CLS)** - Visual Stability
- **Good:** < 0.1
- **Needs Improvement:** 0.1 - 0.25
- **Poor:** > 0.25
- **Our Target:** < 0.05

### Additional Metrics

**First Contentful Paint (FCP)** - Initial Content
- **Our Target:** < 1.5s

**Time to First Byte (TTFB)** - Server Response
- **Our Target:** < 600ms

### Usage

Web Vitals are automatically monitored in production. To view metrics:

```typescript
import { getWebVitalsReport } from './tests/performance/web-vitals-baseline';

// Get current metrics
const report = await getWebVitalsReport();
console.log('Current LCP:', report.current.lcp);
console.log('Average LCP:', report.average.lcp);
console.log('Evaluation:', report.evaluation);
```

### Viewing Stored Metrics

```typescript
import { getStoredMetrics, calculateAverageMetrics } from './tests/performance/web-vitals-baseline';

const metrics = getStoredMetrics();
const averages = calculateAverageMetrics(metrics);
console.log('Average metrics over time:', averages);
```

## Lighthouse CI

### Running Lighthouse

```bash
# Build and run Lighthouse
npm run build
npm run lighthouse

# Run individual steps
npm run lighthouse:collect  # Collect metrics
npm run lighthouse:assert   # Assert against budgets
```

### Configuration

Performance budgets are defined in `.lighthouserc.js`:

```javascript
{
  'categories:performance': ['error', { minScore: 0.9 }],  // 90+
  'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
  'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
  // ... more budgets
}
```

### CI/CD Integration

Add to `.github/workflows/ci.yml`:

```yaml
- name: Run Lighthouse CI
  run: |
    npm run build
    npm run lighthouse
```

## Bundle Analysis

### Analyze Bundle Size

```bash
# Generate bundle analysis
npm run analyze

# After build, opens visualizer in browser
npm run build && npm run analyze
```

### Bundle Size Targets

- **Main Bundle:** < 300KB (gzipped)
- **Vendor Bundle:** < 500KB (gzipped)
- **Total Bundle:** < 1MB (gzipped)

### Current Bundle Split

```javascript
// vite.config.ts
manualChunks: {
  'vendor-react': ['react', 'react-dom', 'react-router-dom'],
  'vendor-query': ['@tanstack/react-query'],
  'vendor-supabase': ['@supabase/supabase-js'],
  'vendor-ui': ['lucide-react', 'date-fns', 'clsx'],
  'vendor-state': ['zustand', 'react-hot-toast'],
  'vendor-forms': ['zod', 'react-hook-form'],
  'vendor-charts': ['recharts'],
}
```

## Database Performance

### Analyze Queries

Run the SQL analysis script in Supabase SQL Editor:

```sql
-- Copy and run scripts/analyze-queries.sql
-- Analyzes:
-- - Slow queries
-- - Missing indexes
-- - Table statistics
-- - RLS policy performance
```

### Key Queries

```sql
-- Show slowest queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Show tables needing indexes
SELECT tablename, seq_scan, idx_scan
FROM pg_stat_user_tables
WHERE seq_scan > idx_scan
ORDER BY seq_scan DESC;
```

### Performance Monitoring

Regular checks:
- **Daily:** Slow queries (> 1s)
- **Weekly:** Index usage, RLS policies
- **Monthly:** Unused indexes, query patterns

## Performance Checklist

### Initial Load
- [ ] Bundle size < 1MB
- [ ] LCP < 2.5s
- [ ] FCP < 1.8s
- [ ] TTFB < 800ms
- [ ] Code splitting enabled
- [ ] Images lazy loaded

### Runtime
- [ ] CLS < 0.1
- [ ] FID < 100ms
- [ ] No unnecessary re-renders
- [ ] Virtual scrolling for long lists
- [ ] Memoized expensive computations

### Database
- [ ] Indexes on frequently queried columns
- [ ] Query time < 200ms
- [ ] RLS policies optimized
- [ ] Connection pooling enabled

### Network
- [ ] API response time < 500ms
- [ ] Compression enabled
- [ ] CDN for static assets
- [ ] Request batching implemented

## Continuous Monitoring

### Production Monitoring

1. **Vercel Analytics** - Already integrated
   ```typescript
   import { Analytics } from '@vercel/analytics/react';
   <Analytics />
   ```

2. **Sentry Performance** - Already integrated
   ```typescript
   import * as Sentry from '@sentry/react';
   // Automatically tracks performance
   ```

3. **Custom Web Vitals** - Implemented
   ```typescript
   initWebVitalsMonitoring(); // In App.tsx
   ```

### Alerts

Set up alerts for:
- LCP > 4s (poor)
- FID > 300ms (poor)
- CLS > 0.25 (poor)
- API errors > 1%
- Database queries > 1s

## Optimization Strategies

### Frontend

1. **Code Splitting**
   - Lazy load routes
   - Dynamic imports for heavy features
   - Prefetch critical routes

2. **Bundle Optimization**
   - Tree shaking
   - Minimize dependencies
   - Use production builds

3. **React Optimization**
   - Memo components
   - useMemo for expensive computations
   - useCallback for functions

### Backend/Database

1. **Query Optimization**
   - Add appropriate indexes
   - Avoid N+1 queries
   - Use efficient joins

2. **Caching**
   - React Query caching
   - Service Worker caching
   - Database query caching

3. **RLS Policies**
   - Keep policies simple
   - Use indexes in WHERE clauses
   - Test policy performance

## Tools

- **Web Vitals:** https://web.dev/vitals/
- **Lighthouse:** https://developers.google.com/web/tools/lighthouse
- **k6:** https://k6.io/ (load testing)
- **Bundle Visualizer:** https://www.npmjs.com/package/vite-bundle-visualizer
- **React DevTools Profiler:** Built into React DevTools

## References

- [Web Vitals Guide](https://web.dev/vitals/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [React Performance](https://react.dev/learn/render-and-commit)
- [Supabase Performance](https://supabase.com/docs/guides/database/query-performance)
