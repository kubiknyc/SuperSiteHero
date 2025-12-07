# Performance Testing Infrastructure Setup Complete

## Overview

Comprehensive performance testing infrastructure has been successfully set up for SuperSiteHero. This includes load testing, bundle analysis, Web Vitals monitoring, Lighthouse CI, and database query performance analysis.

## What Was Created

### 1. Load Testing with k6

**Directory:** `tests/load/`

#### Files Created:

**`tests/load/k6-config.js`** - Base configuration for all k6 tests
- Configurable base URLs and API endpoints
- Test user credentials management
- Performance thresholds (P95, P99, error rates)
- Reusable helper functions
- Custom metrics definitions

**`tests/load/scenarios/auth.js`** - Authentication load test
- Tests login flow
- Session validation
- User profile fetching
- Logout operations
- Custom metrics: login_duration, login_success_rate
- Thresholds: 95% under 1s, 99% under 2s

**`tests/load/scenarios/projects.js`** - Project CRUD operations
- Create, read, update, delete projects
- List operations with pagination
- Single resource fetching
- Thresholds: Create <2s, Read <500ms, Update <1.5s, Delete <1s

**`tests/load/scenarios/documents.js`** - Document operations
- Upload documents (100KB PDFs)
- Download documents
- List documents with filtering
- Metadata retrieval
- Thresholds: Upload <5s, Download <2s, List <1s

**`tests/load/scenarios/api-stress.js`** - Comprehensive API stress test
- Tests all major endpoints (projects, daily reports, RFIs, tasks, etc.)
- Complex queries with joins
- Aggregation queries
- Endpoint-specific metrics
- Configurable scenarios: smoke, load, stress, spike, soak

**`tests/load/README.md`** - Comprehensive documentation
- Installation instructions
- Usage examples
- Result interpretation
- CI/CD integration
- Best practices
- Troubleshooting guide

**`tests/load/results/.gitkeep`** - Results directory
- Stores JSON and HTML test results
- Git-tracked but results ignored

**`.env.k6.example`** - Environment variable template
- Example configuration for k6 tests
- Test user credentials
- API endpoints

### 2. Bundle Analysis

**Configuration:** Updated `package.json`

#### New Scripts:

```json
"analyze": "vite-bundle-visualizer"
```

**Features:**
- Visual bundle size analysis
- Identifies large dependencies
- Tracks bundle growth over time
- Interactive treemap visualization

**Usage:**
```bash
npm run build
npm run analyze
```

### 3. Lighthouse CI

**File:** `.lighthouserc.js`

#### Configuration Includes:

**Performance Budgets:**
- Performance score: 90+
- Accessibility: 95+
- Best practices: 90+
- LCP: < 2.5s
- CLS: < 0.1
- TBT: < 300ms

**Resource Sizes:**
- JavaScript: < 500KB
- CSS: < 100KB
- Images: < 1MB
- Total: < 2MB

**Test URLs:**
- Homepage
- Login
- Projects
- Daily Reports
- Documents

#### New Scripts:

```json
"lighthouse": "lhci autorun",
"lighthouse:collect": "lhci collect",
"lighthouse:assert": "lhci assert"
```

**Usage:**
```bash
npm run build
npm run lighthouse
```

### 4. Web Vitals Monitoring

**File:** `tests/performance/web-vitals-baseline.ts`

#### Features:

**Core Web Vitals Tracking:**
- LCP (Largest Contentful Paint)
- FID (First Input Delay)
- CLS (Cumulative Layout Shift)
- FCP (First Contentful Paint)
- TTFB (Time to First Byte)

**Performance Targets:**
```typescript
{
  lcp: 2000,    // 2s
  fid: 50,      // 50ms
  cls: 0.05,    // 0.05
  fcp: 1500,    // 1.5s
  ttfb: 600,    // 600ms
}
```

**Functionality:**
- Automatic metric collection
- Local storage persistence
- Historical data tracking
- Rating system (good/needs-improvement/poor)
- Analytics integration
- Average calculations

**Integration:**
- Added to `src/App.tsx`
- Automatically runs in production
- Stores last 100 measurements

**File:** `tests/performance/performance-monitor.tsx`

#### Visual Dashboard Component:

**Features:**
- Real-time Web Vitals display
- Historical trend charts
- Color-coded ratings
- Average calculations
- Refresh and clear controls
- Collapsible floating widget

**Usage:**
```typescript
import { PerformanceMonitor } from './tests/performance/performance-monitor';

// Add to your app (dev/admin only)
<PerformanceMonitor />
```

**File:** `tests/performance/README.md`
- Complete documentation
- Usage examples
- Performance targets
- Optimization strategies

### 5. Database Query Performance

**File:** `scripts/analyze-queries.sql`

#### Analysis Queries Include:

1. **Slow Queries Analysis**
   - Identifies queries taking > 1s
   - Uses pg_stat_statements
   - Shows mean, max, stddev execution times

2. **Table Statistics**
   - Table and index sizes
   - Row counts
   - Sequential vs index scan ratios
   - Insert/update/delete counts

3. **Missing Indexes**
   - Tables with high sequential scans
   - Unused indexes
   - Index usage statistics

4. **Specific Table Analysis**
   - Projects queries with EXPLAIN ANALYZE
   - Daily reports with joins
   - Documents with filtering
   - RLS policy performance

5. **Foreign Key Relationships**
   - Lists all foreign keys
   - Checks for indexes on FK columns

6. **Recommended Indexes**
   - Pre-written CREATE INDEX statements
   - Optimized for SuperSiteHero schema
   - Includes partial indexes

7. **Vacuum and Analyze**
   - Dead tuple detection
   - Last vacuum/analyze times
   - Maintenance recommendations

8. **Connection and Resource Usage**
   - Active connections
   - Query states
   - Cache hit ratios
   - Connection pool statistics

**Recommended Indexes Added:**
```sql
-- Projects
CREATE INDEX idx_projects_company_status_created
ON projects(company_id, status, created_at DESC)
WHERE deleted_at IS NULL;

-- Daily Reports
CREATE INDEX idx_daily_reports_project_date
ON daily_reports(project_id, report_date DESC);

-- Documents
CREATE INDEX idx_documents_project_type_created
ON documents(project_id, file_type, created_at DESC);

-- And many more...
```

## Package.json Scripts

### New Scripts Added:

```json
{
  "analyze": "vite-bundle-visualizer",
  "lighthouse": "lhci autorun",
  "lighthouse:collect": "lhci collect",
  "lighthouse:assert": "lhci assert",
  "perf:web-vitals": "tsx tests/performance/web-vitals-baseline.ts",
  "perf:load": "k6 run tests/load/scenarios/auth.js",
  "perf:load:projects": "k6 run tests/load/scenarios/projects.js",
  "perf:load:documents": "k6 run tests/load/scenarios/documents.js",
  "perf:load:stress": "k6 run --env SCENARIO=stress tests/load/scenarios/api-stress.js",
  "perf:load:spike": "k6 run --env SCENARIO=spike tests/load/scenarios/api-stress.js",
  "perf:all": "npm run build && npm run lighthouse && npm run perf:load"
}
```

## Installation Requirements

### Required Dependencies (Already Installed):
- `web-vitals`: ^5.1.0 ✅

### To Install Separately:

#### 1. k6 (Load Testing)

**Windows (Chocolatey):**
```bash
choco install k6
```

**macOS (Homebrew):**
```bash
brew install k6
```

**Linux:**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

#### 2. Lighthouse CI

```bash
npm install -D @lhci/cli
```

#### 3. Bundle Visualizer

```bash
npm install -D vite-bundle-visualizer
```

## Quick Start Guide

### 1. Web Vitals Monitoring

**Already integrated!** Web Vitals are automatically collected in production.

To view metrics:
```typescript
import { getWebVitalsReport } from './tests/performance/web-vitals-baseline';

const report = await getWebVitalsReport();
console.log('Current metrics:', report.current);
console.log('Averages:', report.average);
```

Or use the visual dashboard:
```typescript
import { PerformanceMonitor } from './tests/performance/performance-monitor';

// Add anywhere in your app (dev mode recommended)
<PerformanceMonitor />
```

### 2. Bundle Analysis

```bash
# Build and analyze
npm run build
npm run analyze

# Browser will open with interactive visualization
```

### 3. Lighthouse CI

```bash
# Run full Lighthouse audit
npm run build
npm run lighthouse

# Results saved to .lighthouseci/ directory
```

### 4. Load Testing

#### Setup:

1. Copy environment template:
```bash
copy .env.k6.example .env.k6
```

2. Edit `.env.k6` with your credentials

3. Create test users in your database

#### Run tests:

```bash
# Authentication test
npm run perf:load

# Project CRUD test
npm run perf:load:projects

# Document operations test
npm run perf:load:documents

# API stress test
npm run perf:load:stress

# API spike test
npm run perf:load:spike
```

### 5. Database Query Analysis

1. Open Supabase SQL Editor
2. Copy contents of `scripts/analyze-queries.sql`
3. Run sections individually
4. Review results and apply recommended indexes

## Performance Targets

### Web Vitals

| Metric | Good | Target | Needs Improvement | Poor |
|--------|------|--------|-------------------|------|
| LCP | < 2.5s | **< 2.0s** | 2.5s - 4.0s | > 4.0s |
| FID | < 100ms | **< 50ms** | 100ms - 300ms | > 300ms |
| CLS | < 0.1 | **< 0.05** | 0.1 - 0.25 | > 0.25 |
| FCP | < 1.8s | **< 1.5s** | 1.8s - 3.0s | > 3.0s |
| TTFB | < 800ms | **< 600ms** | 800ms - 1.8s | > 1.8s |

### Bundle Sizes (Gzipped)

| Bundle | Target | Warning |
|--------|--------|---------|
| Main | < 300KB | > 400KB |
| Vendor | < 500KB | > 700KB |
| Total | < 1MB | > 1.5MB |

### API Performance

| Operation | Target | Warning |
|-----------|--------|---------|
| Database Query | < 200ms | > 500ms |
| API Response | < 500ms | > 1s |
| Authentication | < 1s | > 2s |

### Load Testing

| Metric | Target |
|--------|--------|
| P95 Response Time | < 2s |
| P99 Response Time | < 5s |
| Error Rate | < 1% |
| Success Rate | > 95% |

## Continuous Monitoring

### Daily Checks
- [ ] Review slow queries (> 1s)
- [ ] Check Web Vitals dashboard
- [ ] Monitor error rates

### Weekly Checks
- [ ] Run bundle analysis
- [ ] Check index usage
- [ ] Review RLS policy performance
- [ ] Run smoke tests

### Monthly Checks
- [ ] Run full Lighthouse audit
- [ ] Run comprehensive load tests
- [ ] Review unused indexes
- [ ] Analyze query patterns
- [ ] Update performance baselines

## CI/CD Integration

### Example GitHub Actions Workflow

```yaml
name: Performance Tests

on:
  pull_request:
  schedule:
    - cron: '0 2 * * 1' # Weekly on Mondays

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm run lighthouse

  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run load tests
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          TEST_SUPER_EMAIL: ${{ secrets.TEST_SUPER_EMAIL }}
          TEST_SUPER_PASSWORD: ${{ secrets.TEST_SUPER_PASSWORD }}
        run: |
          k6 run tests/load/scenarios/auth.js
          k6 run tests/load/scenarios/projects.js
```

## Documentation

- **Load Testing:** `tests/load/README.md`
- **Performance Monitoring:** `tests/performance/README.md`
- **Database Analysis:** `scripts/analyze-queries.sql` (inline comments)
- **Lighthouse Config:** `.lighthouserc.js` (inline comments)
- **Web Vitals:** `tests/performance/web-vitals-baseline.ts` (JSDoc)

## File Structure

```
project-root/
├── .lighthouserc.js                    # Lighthouse CI configuration
├── .env.k6.example                     # k6 environment template
├── package.json                        # Updated with perf scripts
├── src/
│   └── App.tsx                         # Integrated Web Vitals monitoring
├── scripts/
│   └── analyze-queries.sql             # Database performance analysis
└── tests/
    ├── load/                           # k6 load testing
    │   ├── k6-config.js                # Base configuration
    │   ├── README.md                   # Load testing guide
    │   ├── scenarios/
    │   │   ├── auth.js                 # Authentication tests
    │   │   ├── projects.js             # Project CRUD tests
    │   │   ├── documents.js            # Document operations
    │   │   └── api-stress.js           # Comprehensive stress test
    │   └── results/                    # Test results directory
    │       └── .gitkeep
    └── performance/                    # Performance monitoring
        ├── README.md                   # Performance guide
        ├── web-vitals-baseline.ts      # Web Vitals utilities
        └── performance-monitor.tsx     # Visual dashboard component
```

## Next Steps

### Immediate Actions

1. **Install k6:**
   ```bash
   # Windows
   choco install k6

   # macOS
   brew install k6
   ```

2. **Install Lighthouse CI:**
   ```bash
   npm install -D @lhci/cli
   ```

3. **Install Bundle Visualizer:**
   ```bash
   npm install -D vite-bundle-visualizer
   ```

4. **Setup k6 environment:**
   ```bash
   copy .env.k6.example .env.k6
   # Edit .env.k6 with your credentials
   ```

5. **Run baseline tests:**
   ```bash
   npm run build
   npm run analyze
   npm run lighthouse
   npm run perf:load
   ```

### Ongoing Maintenance

1. **Monitor Web Vitals** in production
2. **Run weekly load tests** to catch regressions
3. **Monthly Lighthouse audits** for performance budgets
4. **Quarterly database analysis** for optimization

## Success Metrics

Track these metrics to measure performance improvements:

1. **Web Vitals Scores:**
   - All metrics in "good" range
   - LCP < 2s consistently
   - CLS < 0.05 consistently

2. **Load Test Results:**
   - P95 < 2s for all endpoints
   - Error rate < 0.5%
   - Can handle 50 concurrent users

3. **Bundle Size:**
   - Main bundle < 300KB
   - Total bundle < 1MB
   - No unexpected growth

4. **Lighthouse Scores:**
   - Performance: 90+
   - Accessibility: 95+
   - Best Practices: 90+

## Support and Resources

- **k6 Documentation:** https://k6.io/docs/
- **Lighthouse CI:** https://github.com/GoogleChrome/lighthouse-ci
- **Web Vitals:** https://web.dev/vitals/
- **Supabase Performance:** https://supabase.com/docs/guides/database/query-performance

## Conclusion

Your SuperSiteHero application now has a comprehensive performance testing infrastructure that covers:

- **Real User Monitoring** (Web Vitals)
- **Load Testing** (k6)
- **Performance Audits** (Lighthouse CI)
- **Bundle Analysis** (Vite Bundle Visualizer)
- **Database Performance** (Query Analysis)

This infrastructure will help you maintain excellent performance as your application grows and scales.
