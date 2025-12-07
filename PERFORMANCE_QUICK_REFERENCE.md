# Performance Testing Quick Reference

Quick commands and cheat sheet for performance testing.

## Installation

```bash
# Install Lighthouse CI
npm install -D @lhci/cli

# Install Bundle Visualizer
npm install -D vite-bundle-visualizer

# Install k6 (Windows)
choco install k6

# Install k6 (macOS)
brew install k6
```

## Quick Commands

### Bundle Analysis
```bash
npm run build && npm run analyze
```

### Lighthouse
```bash
npm run build && npm run lighthouse
```

### Load Testing
```bash
# Setup (first time only)
copy .env.k6.example .env.k6
# Edit .env.k6 with credentials

# Run tests
npm run perf:load              # Auth test
npm run perf:load:projects     # Projects CRUD
npm run perf:load:documents    # Documents
npm run perf:load:stress       # Stress test
npm run perf:load:spike        # Spike test
```

### All Performance Tests
```bash
npm run perf:all
```

## Performance Targets

| Metric | Target | Command |
|--------|--------|---------|
| LCP | < 2.0s | `npm run lighthouse` |
| FID | < 50ms | Web Vitals (auto) |
| CLS | < 0.05 | Web Vitals (auto) |
| Bundle | < 1MB | `npm run analyze` |
| API P95 | < 2s | `npm run perf:load` |

## Check Performance

### Web Vitals (In App)
```typescript
import { PerformanceMonitor } from './tests/performance/performance-monitor';
<PerformanceMonitor />
```

### Database Queries
1. Open Supabase SQL Editor
2. Run `scripts/analyze-queries.sql`
3. Check slow queries section

### Bundle Size
```bash
npm run build
# Check dist/ folder sizes
# Or run: npm run analyze
```

## Common Issues

### Slow LCP
- Optimize images (use WebP, lazy load)
- Reduce bundle size
- Use code splitting
- Add resource hints

### High CLS
- Set image/video dimensions
- Reserve space for dynamic content
- Avoid inserting content above viewport
- Use font-display: swap

### Large Bundle
- Check `npm run analyze`
- Remove unused dependencies
- Use dynamic imports
- Enable tree shaking

### Slow API
- Add database indexes
- Optimize queries
- Check RLS policies
- Use caching

## Monitoring

### Daily
- Check Web Vitals dashboard
- Review error logs

### Weekly
- Run `npm run analyze`
- Run smoke tests

### Monthly
- Run `npm run lighthouse`
- Run full load tests
- Review database indexes

## CI/CD

Add to `.github/workflows/performance.yml`:

```yaml
- run: npm run build
- run: npm run lighthouse
- run: npm run perf:load
```

## Files

| File | Purpose |
|------|---------|
| `.lighthouserc.js` | Lighthouse configuration |
| `tests/load/k6-config.js` | k6 base config |
| `tests/load/scenarios/*.js` | k6 test scenarios |
| `tests/performance/web-vitals-baseline.ts` | Web Vitals utilities |
| `scripts/analyze-queries.sql` | DB performance queries |

## Resources

- Load Testing: `tests/load/README.md`
- Performance: `tests/performance/README.md`
- Full Setup: `PERFORMANCE_TESTING_SETUP.md`
