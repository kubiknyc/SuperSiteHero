# React Performance Optimization Implementation

## Analysis Summary

### Current State
- **0 uses** of React.memo, useMemo, useCallback detected in analysis
- **184 setTimeout/setInterval** calls across 117 files (potential memory leaks)
- Multiple high-traffic components without optimization:
  - DashboardPage
  - ProjectsPage
  - DailyReportsPage (has some useMemo but needs more)
  - DailyReportsCalendar
  - NotificationCenter
  - VirtualizedTable

### Memory Leak Risks Identified
1. **NotificationCenter.tsx**: Two setInterval calls (lines 178, 198) - PROPERLY CLEANED ✓
2. **OfflineIndicator.tsx**: setInterval (line 80) - PROPERLY CLEANED ✓
3. **useVideoRecorder.ts**: setInterval (line 358) - PROPERLY CLEANED ✓
4. **useLiveCursors.ts**: setInterval (line 65) - PROPERLY CLEANED ✓

**Note**: The analyzed components properly clean up their intervals. Most memory leak risks are in other files.

## Optimization Strategy

### Priority 1: High-Traffic Components (Immediate Impact)
These components are rendered frequently and would benefit most from optimization:

1. **ProjectsPage** - Project listing with filtering
2. **DailyReportsPage** - Complex filtering and virtualized table
3. **DashboardPage** - Stats cards with re-renders
4. **DailyReportsCalendar** - Date grouping and rendering
5. **NotificationCenter** - Real-time updates

### Priority 2: Reusable Components (Cascade Benefits)
Optimizing these helps many pages:

1. **VirtualizedTable/VirtualizedList** - Used across the app
2. **Card components** - Heavily used in lists
3. **Badge/Button** - Rendered in large quantities

### Priority 3: Heavy Computation Components
Components with expensive operations:

1. **DailyReportsPage** - Complex filtering logic
2. **ProjectsPage** - Search and filtering
3. **DashboardPage** - Sparkline calculations

## Implementation Plan

### Phase 1: Component Memoization (React.memo)

#### Candidates for React.memo:
```typescript
// List item components that render in large quantities
- ProjectCard (in ProjectsPage grid)
- DailyReportListItem
- NotificationItem
- StatCard (in DashboardPage)
- Badge (when props rarely change)
- Card components (when used in lists)

// Calendar components
- DayButton (rendered 30-42 times per month)
- CalendarDay components

// Virtualized list items
- VirtualizedTable row renderer
- VirtualizedList item renderer
```

### Phase 2: useCallback for Event Handlers

#### Components needing useCallback:
```typescript
// ProjectsPage
- setSearchQuery handler
- setSelectedProjectId handler
- setEditingProject handler
- Filter change handlers

// DailyReportsPage
- All filter change handlers
- Search query handler
- clearAllFilters handler
- handleDayClick (in Calendar)

// DashboardPage
- setFocusedCard handlers
- Click handlers for stat cards

// NotificationCenter
- handleMarkAsRead
- handleMarkAllAsRead
- handleClearAll
- handleNotificationClick
```

### Phase 3: useMemo for Expensive Computations

#### Computations to memoize:
```typescript
// DailyReportsPage (already has some, add more)
- filteredReports ✓ (already done)
- tableColumns (stable reference)
- uniqueWeatherConditions ✓ (already done)
- uniqueCreators ✓ (already done)
- activeFilterCount ✓ (already done)

// DailyReportsCalendar
- reportsByDate ✓ (already done)
- datesWithReports ✓ (already done)
- stats ✓ (already done)
- statusColors (constant object, move outside component)

// ProjectsPage
- filteredProjects
- getStatusVariant (move outside or memoize)
- formatStatus (move outside)

// DashboardPage
- stats array (regenerates on every render)
- sparkline rendering
- getHealthColor (move outside or memoize)
```

### Phase 4: Memory Leak Prevention

#### Patterns to implement:
```typescript
// Standard cleanup pattern for all setTimeout/setInterval
useEffect(() => {
  const timer = setTimeout/setInterval(...)

  return () => {
    clearTimeout/clearInterval(timer)
  }
}, [deps])

// For refs holding timers
const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

useEffect(() => {
  timerRef.current = setTimeout(...)

  return () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
  }
}, [deps])
```

## Optimization Patterns

### Pattern 1: List Item Component
```typescript
interface ProjectCardProps {
  project: Project
  onEdit: (project: Project) => void
  onDelete: (id: string) => void
}

// Wrap in memo, only re-render when props change
const ProjectCard = React.memo<ProjectCardProps>(({ project, onEdit, onDelete }) => {
  return (
    <Card>
      {/* content */}
    </Card>
  )
})

// Parent component
function ProjectsPage() {
  // Wrap handlers in useCallback
  const handleEdit = useCallback((project: Project) => {
    setEditingProject(project)
    setEditDialogOpen(true)
  }, []) // No deps if only using setters

  const handleDelete = useCallback((id: string) => {
    // delete logic
  }, [])

  return (
    <>
      {projects.map(project => (
        <ProjectCard
          key={project.id}
          project={project}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ))}
    </>
  )
}
```

### Pattern 2: Expensive Calculation
```typescript
function DailyReportsPage() {
  // Memoize expensive filtering
  const filteredReports = useMemo(() => {
    if (!reports) return []

    return reports.filter(report => {
      // complex filtering logic
    })
  }, [reports, searchQuery, statusFilter, dateRange, weatherFilter, workerRange, createdByFilter])

  // Memoize derived data
  const reportStats = useMemo(() => {
    return {
      total: filteredReports.length,
      pending: filteredReports.filter(r => r.status === 'pending').length,
      // ... more stats
    }
  }, [filteredReports])
}
```

### Pattern 3: Stable Column Definitions
```typescript
function DataTable() {
  // Define columns outside component or use useMemo
  const columns = useMemo(() => [
    {
      key: 'name',
      header: 'Name',
      render: (item) => <span>{item.name}</span>
    },
    // ... more columns
  ], []) // Empty deps if columns never change

  return <VirtualizedTable columns={columns} data={data} />
}
```

## Performance Metrics to Track

### Before Optimization (Baseline)
- Component render count in ProjectsPage with 100 projects
- DailyReportsPage filtering with 500 reports
- DashboardPage stat card re-renders
- Memory usage over time (check for leaks)

### After Optimization (Target)
- 50-70% reduction in unnecessary re-renders
- Filtering operations stay under 100ms
- No memory growth over 30 minutes of usage
- Smooth 60fps interactions

## Testing Strategy

### 1. Visual Regression Tests
```bash
# Run existing visual tests to ensure no UI changes
npm run test:e2e
npm run test:visual
```

### 2. Performance Tests
```typescript
// Add to test files
describe('Performance', () => {
  it('should not re-render when unrelated state changes', () => {
    const renderSpy = vi.fn()
    // test memo components
  })

  it('should memoize expensive calculations', () => {
    // test that useMemo prevents recalculation
  })
})
```

### 3. Manual Testing
- Load ProjectsPage with 100+ projects
- Filter DailyReports with various criteria
- Monitor DevTools Performance tab
- Check for memory leaks in long sessions

## Implementation Files

### New Files to Create
1. `src/pages/projects/components/ProjectCard.tsx` - Memoized project card
2. `src/pages/dashboard/components/StatCard.tsx` - Memoized stat card
3. `src/features/daily-reports/components/DailyReportRow.tsx` - Memoized table row
4. `src/components/optimized/` - Folder for optimized wrapper components

### Files to Modify
1. `src/pages/projects/ProjectsPage.tsx` - Add useCallback, extract ProjectCard
2. `src/pages/dashboard/DashboardPage.tsx` - Add useMemo, extract StatCard
3. `src/pages/daily-reports/DailyReportsPage.tsx` - Add useCallback for handlers
4. `src/features/daily-reports/components/DailyReportsCalendar.tsx` - Move constants outside
5. `src/components/ui/virtualized-table.tsx` - Memoize row component
6. `src/components/NotificationCenter.tsx` - Add useCallback for handlers

## Rollout Plan

### Week 1: Foundation
- [ ] Create optimized component patterns
- [ ] Implement ProjectCard with memo
- [ ] Add useCallback to ProjectsPage
- [ ] Test and validate

### Week 2: High-Traffic Pages
- [ ] Optimize DailyReportsPage
- [ ] Optimize DashboardPage
- [ ] Add performance monitoring
- [ ] Run benchmark tests

### Week 3: Component Library
- [ ] Optimize VirtualizedTable
- [ ] Optimize common UI components
- [ ] Update documentation
- [ ] Team code review

### Week 4: Polish & Monitor
- [ ] Fix any regressions
- [ ] Add performance budgets
- [ ] Update CLAUDE.md with patterns
- [ ] Monitor production metrics

## Success Criteria

- ✅ Reduced re-renders by 50%+ on list pages
- ✅ Filtering stays under 100ms for 1000 items
- ✅ No memory leaks detected in 1hr session
- ✅ All tests passing (unit, integration, e2e)
- ✅ No visual regressions
- ✅ Lighthouse performance score improved

## Notes

- Avoid premature optimization - profile first
- Don't wrap everything in memo - only components with:
  - Expensive render logic
  - Rendered many times (lists, grids)
  - Receive stable props
- Use React DevTools Profiler to validate improvements
- Consider code splitting for rarely used components
