# Optimize Performance Skill

Improve application performance across frontend, backend, and database layers.

## Usage

Invoke this skill when you need to:
- Improve page load times
- Reduce bundle size
- Optimize slow queries
- Fix rendering performance
- Improve mobile performance

## Examples

**Page optimization**:
```
Use optimize-performance skill to speed up the dashboard
```

**Database optimization**:
```
Use optimize-performance skill to optimize slow daily reports query
```

**Bundle optimization**:
```
Use optimize-performance skill to reduce bundle size
```

## Optimization Process

### Step 1: Measure Current Performance

**Frontend**:
```bash
# Build and analyze bundle
npm run build
npx vite-bundle-visualizer

# Run Lighthouse
npx lighthouse http://localhost:5173 --view
```

**Database**:
```sql
-- Analyze query performance
EXPLAIN ANALYZE
SELECT * FROM daily_reports
WHERE project_id = 'xxx'
ORDER BY report_date DESC;
```

**Key Metrics**:
- Page load time (target: < 3s)
- Time to Interactive (target: < 5s)
- Bundle size (target: < 200KB main chunk)
- Query time (target: < 200ms)
- Lighthouse score (target: > 90)

### Step 2: Identify Bottlenecks

Use performance-optimizer agent for deep analysis:
```
"Use performance-optimizer to analyze performance issues"
```

**Common Bottlenecks**:
1. Large bundle size
2. Unnecessary re-renders
3. Slow database queries
4. N+1 query problems
5. Large images
6. No code splitting
7. Missing indexes

### Step 3: Apply Optimizations

#### Frontend Optimizations

**1. Code Splitting**
```typescript
// Lazy load routes
const DailyReportsPage = lazy(() => import('./pages/DailyReportsPage'));
const ChangeOrdersPage = lazy(() => import('./pages/ChangeOrdersPage'));

// Wrap in Suspense
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/daily-reports" element={<DailyReportsPage />} />
  </Routes>
</Suspense>
```

**2. Memoization**
```typescript
// Memoize expensive computations
const filteredProjects = useMemo(() => {
  return projects.filter(p => p.status === 'active');
}, [projects]);

// Memoize components
const ProjectCard = React.memo(({ project }) => {
  return <div>{project.name}</div>;
});

// Memoize callbacks
const handleClick = useCallback(() => {
  updateProject(projectId);
}, [projectId]);
```

**3. Image Optimization**
```typescript
// Lazy load images
<img src={url} loading="lazy" alt="..." />

// Use responsive images
<picture>
  <source srcSet={webp} type="image/webp" />
  <img src={jpg} alt="..." />
</picture>

// Compress before upload
const compressed = await compressImage(file, { maxWidth: 1920 });
```

**4. Virtual Scrolling**
```typescript
// For long lists (>100 items)
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={items.length}
  itemSize={80}
>
  {({ index, style }) => (
    <div style={style}>{items[index].name}</div>
  )}
</FixedSizeList>
```

#### Database Optimizations

**1. Add Indexes**
```sql
-- Index frequently queried columns
CREATE INDEX idx_daily_reports_project_date
ON daily_reports(project_id, report_date DESC);

-- Composite index for filtering
CREATE INDEX idx_projects_company_status
ON projects(company_id, status)
WHERE deleted_at IS NULL;

-- Index for joins
CREATE INDEX idx_project_assignments_user
ON project_assignments(user_id, project_id);
```

**2. Optimize Queries**
```typescript
// ❌ BAD - Fetch everything
const { data } = await supabase
  .from('projects')
  .select('*');

// ✅ GOOD - Limit and select only needed
const { data } = await supabase
  .from('projects')
  .select('id, name, status, created_at')
  .eq('company_id', companyId)
  .order('created_at', { ascending: false })
  .limit(50);
```

**3. Prevent N+1 Queries**
```typescript
// ❌ BAD - N+1 problem
const reports = await fetchReports();
for (const report of reports) {
  report.project = await fetchProject(report.project_id);
}

// ✅ GOOD - Join in single query
const { data } = await supabase
  .from('daily_reports')
  .select(`
    *,
    project:projects(id, name),
    author:users(id, name)
  `)
  .eq('project_id', projectId);
```

**4. Use Pagination**
```typescript
// Offset pagination
const { data } = await supabase
  .from('projects')
  .select('*')
  .range(page * pageSize, (page + 1) * pageSize - 1);

// Cursor pagination (better for large datasets)
const { data } = await supabase
  .from('daily_reports')
  .select('*')
  .gt('created_at', lastCursor)
  .order('created_at')
  .limit(20);
```

#### React Query Optimizations

**1. Prefetch Data**
```typescript
export function useProject(id: string) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['project', id],
    queryFn: () => fetchProject(id),
    onSuccess: (project) => {
      // Prefetch likely next data
      queryClient.prefetchQuery({
        queryKey: ['daily-reports', { project_id: id }],
        queryFn: () => fetchDailyReports(id)
      });
    }
  });
}
```

**2. Optimistic Updates**
```typescript
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProject,
    onMutate: async (updated) => {
      await queryClient.cancelQueries(['project', updated.id]);
      const previous = queryClient.getQueryData(['project', updated.id]);
      queryClient.setQueryData(['project', updated.id], updated);
      return { previous };
    },
    onError: (err, updated, context) => {
      queryClient.setQueryData(['project', updated.id], context.previous);
    }
  });
}
```

### Step 4: Measure Impact

**Before vs After**:
- Run Lighthouse again
- Check bundle size
- Measure query times
- Test on mobile device
- Verify improvements

**Document improvements**:
```
## Performance Improvements

### Before
- Dashboard load: 4.2s
- Bundle size: 450KB
- Query time: 800ms
- Lighthouse: 65

### After
- Dashboard load: 1.8s (-57%)
- Bundle size: 180KB (-60%)
- Query time: 120ms (-85%)
- Lighthouse: 94 (+45%)
```

## Performance Budget

Set and enforce limits:

```javascript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'query-vendor': ['@tanstack/react-query']
        }
      }
    },
    chunkSizeWarningLimit: 500 // Warn if chunk > 500KB
  }
});
```

## Monitoring

**Track metrics**:
```typescript
import { getCLS, getFID, getLCP } from 'web-vitals';

function sendToAnalytics(metric) {
  // Log or send to analytics
  console.log(metric);
}

getCLS(sendToAnalytics);  // Cumulative Layout Shift
getFID(sendToAnalytics);  // First Input Delay
getLCP(sendToAnalytics);  // Largest Contentful Paint
```

## Mobile Performance

**Specific optimizations**:
1. Reduce JavaScript payloads
2. Optimize images for mobile
3. Minimize main thread work
4. Enable service worker caching
5. Use skeleton screens
6. Debounce user inputs
7. Throttle scroll handlers

## Construction App Specific

**Field use optimizations**:
1. Offline support (critical!)
2. Compress photos before upload
3. Cache frequently accessed data
4. Prefetch project data on load
5. Quick entry forms (minimal fields)
6. Auto-save drafts
7. Batch sync operations

## Quick Wins

**Immediate improvements**:
1. Add code splitting (30-50% bundle reduction)
2. Lazy load images
3. Add database indexes
4. Limit query results
5. Memoize list items
6. Enable compression
7. Use Web Workers for heavy tasks

## Tools

**Analysis**:
- Chrome DevTools Performance tab
- React DevTools Profiler
- Lighthouse
- Bundle analyzer
- PostgreSQL EXPLAIN ANALYZE

**Testing**:
```bash
# Bundle analysis
npm run build
npx vite-bundle-visualizer

# Performance testing
npm run test:perf

# Database analysis
EXPLAIN ANALYZE SELECT ...
```

## Checklist

Before marking optimization complete:
- [ ] Measured baseline performance
- [ ] Identified top 3 bottlenecks
- [ ] Applied targeted optimizations
- [ ] Measured improvements
- [ ] No regressions introduced
- [ ] Mobile performance acceptable
- [ ] Database indexes added
- [ ] Bundle size reduced
- [ ] Code splitting implemented
- [ ] Images optimized
- [ ] Queries limited
- [ ] Memoization where needed
- [ ] Documentation updated
