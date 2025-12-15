# RFI Trend Report - Quick Start Guide

## Installation Complete ✓

All RFI Trend Reporting components are ready to use!

## Quickest Way to Get Started

### Option 1: Full Dashboard (Recommended)

```tsx
import { RFITrendReport } from '@/features/rfis/components'

function MyPage() {
  return <RFITrendReport projectId="your-project-id" />
}
```

That's it! This gives you:
- 4 summary cards
- 4 interactive charts
- Recurring issues analysis
- Top performers list
- Automated insights
- Date range and priority filters
- Export to PDF button

---

### Option 2: Individual Charts

```tsx
import { useRFIResponseAnalytics } from '@/features/rfis/hooks/useRFIResponseAnalytics'
import {
  RFITrendChart,
  RFIPriorityChart,
  RFIAssigneeChart,
  RFIOnTimeTrendChart,
} from '@/features/rfis/components'

function MyCharts({ projectId }: { projectId: string }) {
  const { data } = useRFIResponseAnalytics(projectId)

  if (!data) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      {/* Response time trend over time */}
      <RFITrendChart data={data.trends} />

      {/* Priority performance comparison */}
      <RFIPriorityChart data={data.byPriority} />

      {/* Top 5 assignee performers */}
      <RFIAssigneeChart data={data.byAssignee} maxAssignees={5} />

      {/* On-time percentage trend */}
      <RFIOnTimeTrendChart data={data.trends.dataPoints} />
    </div>
  )
}
```

---

## What You Get

### 1. RFITrendChart
- **Shows**: Response time trends over time
- **Includes**: Moving averages, trend indicators
- **Use when**: You want to see if response times are improving/declining

### 2. RFIPriorityChart
- **Shows**: Response time by priority level
- **Includes**: Actual vs target comparison
- **Use when**: You want to check performance against SLAs

### 3. RFIAssigneeChart
- **Shows**: Top performers and their on-time %
- **Includes**: Color-coded performance ratings
- **Use when**: You want to identify star performers

### 4. RFIOnTimeTrendChart
- **Shows**: On-time percentage over time
- **Includes**: Smooth trend visualization
- **Use when**: You want to track deadline compliance

---

## Files Created

```
src/features/rfis/components/
├── RFITrendReport.tsx              # Main dashboard
├── RFITrendReport.test.tsx         # Tests
├── RFITrendChart.tsx               # Chart components
├── RFITrendChart.test.tsx          # Tests
├── RFI_TREND_REPORT_README.md      # Full documentation
└── index.ts                        # Exports (updated)
```

---

## Configuration Options

### Date Range Filtering

```tsx
// Built into RFITrendReport component
// Options: Last 30 Days, Last 90 Days, Last 6 Months, Last Year, All Time
```

### Priority Filtering

```tsx
// Built into RFITrendReport component
// Options: All Priorities, Critical, High, Normal, Low
```

### Custom Filters (for individual charts)

```tsx
const { data } = useRFIResponseAnalytics(projectId, {
  dateRange: {
    startDate: '2024-01-01',
    endDate: '2024-03-31',
  },
  priority: 'high',
  assigneeId: 'user-123',
})
```

---

## Automated Insights

The RFITrendReport automatically shows insights for:

✓ **Improving trends** - When response times decrease
✓ **Declining trends** - When response times increase
✓ **Low on-time %** - When < 80% on-time
✓ **Workload issues** - When assignees struggle

---

## Performance Ratings

| Color | Rating | On-Time % |
|-------|--------|-----------|
| 🟢 Green | Excellent | ≥95% |
| 🔵 Blue | Good | ≥85% |
| 🟠 Orange | Average | ≥70% |
| 🔴 Red | Needs Improvement | <70% |

---

## Run Tests

```bash
# Test chart components
npm test -- src/features/rfis/components/RFITrendChart.test.tsx

# Test main report
npm test -- src/features/rfis/components/RFITrendReport.test.tsx

# Test with coverage
npm test -- --coverage src/features/rfis/components/RFITrend*
```

---

## Common Use Cases

### 1. Executive Dashboard
```tsx
<RFITrendReport projectId={projectId} />
```

### 2. Team Performance Review
```tsx
<RFIAssigneeChart
  data={assigneeData}
  title="Team Performance This Quarter"
  maxAssignees={10}
/>
```

### 3. Priority Analysis
```tsx
<RFIPriorityChart
  data={priorityData}
  title="Are we meeting our SLAs?"
/>
```

### 4. Trend Monitoring
```tsx
<RFITrendChart
  data={trends}
  showMovingAverage={true}
  title="Last 90 Days Performance"
/>
```

---

## Next Steps

1. ✓ Components are ready to use
2. ✓ Tests are passing
3. ✓ Documentation is complete
4. → Import and use in your pages
5. → Customize as needed
6. → Implement PDF export (see README)

---

## Need Help?

1. Check `RFI_TREND_REPORT_README.md` for detailed docs
2. Review test files for usage examples
3. Check TypeScript types for available props
4. Consult existing analytics service docs

---

## That's It!

You're ready to visualize RFI trends and patterns. Start with the full `RFITrendReport` component and customize from there.

**Happy analyzing! 📊**
