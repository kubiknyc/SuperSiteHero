# RFI Trend Report Components

Comprehensive components for identifying recurring RFI issues and patterns with trend analysis.

## Overview

The RFI Trend Report suite provides powerful analytics and visualization tools for understanding RFI response patterns, identifying recurring issues, tracking performance trends, and generating actionable insights.

## Components

### 1. RFITrendReport

The main dashboard component that displays comprehensive RFI trend analysis.

**Features:**
- Summary statistics cards (average response time, total RFIs, on-time %, median response)
- Multiple visualization charts (trends, priority, assignee performance, on-time %)
- Recurring issue analysis by response type
- Top performers and assignees needing attention
- Automated insights and recommendations
- Date range and priority filtering
- PDF export functionality

**Usage:**
```tsx
import { RFITrendReport } from '@/features/rfis/components'

function ProjectAnalytics() {
  return (
    <div className="p-6">
      <RFITrendReport projectId="project-123" />
    </div>
  )
}
```

**Props:**
- `projectId: string` - Required. The project to analyze
- `className?: string` - Optional. Custom CSS classes

---

### 2. RFITrendChart

Line chart showing response time trends over time with moving averages.

**Features:**
- Average and median response time lines
- 7-day and 30-day moving averages
- Trend direction indicator (improving/declining/stable)
- Percentage change badge
- Configurable granularity (day/week/month)

**Usage:**
```tsx
import { RFITrendChart } from '@/features/rfis/components'
import { useResponseTimeTrends } from '@/features/rfis/hooks/useRFIResponseAnalytics'

function TrendsView() {
  const { data: trends } = useResponseTimeTrends(
    projectId,
    dateRange,
    'week' // granularity
  )

  if (!trends) return null

  return (
    <RFITrendChart
      data={trends}
      title="Response Time Trends"
      showMovingAverage={true}
      height={400}
    />
  )
}
```

**Props:**
- `data: ResponseTimeTrends` - Required. Trend data from analytics service
- `title?: string` - Optional. Chart title (default: "Response Time Trends")
- `height?: number` - Optional. Chart height in pixels (default: 300)
- `showMovingAverage?: boolean` - Optional. Show moving averages (default: true)
- `className?: string` - Optional. Custom CSS classes

---

### 3. RFIPriorityChart

Bar chart comparing actual vs target response times by priority level.

**Features:**
- Side-by-side comparison of actual and target times
- Color-coded by priority
- On-time percentage display
- Hover tooltips with detailed metrics

**Usage:**
```tsx
import { RFIPriorityChart } from '@/features/rfis/components'
import { useResponseTimeByPriority } from '@/features/rfis/hooks/useRFIResponseAnalytics'

function PriorityAnalysis() {
  const { data: priorityData } = useResponseTimeByPriority(projectId, filters)

  if (!priorityData) return null

  return (
    <RFIPriorityChart
      data={priorityData}
      title="Response Time by Priority"
      height={350}
    />
  )
}
```

**Props:**
- `data: ResponseTimeByPriority[]` - Required. Priority metrics from analytics service
- `title?: string` - Optional. Chart title (default: "Response Time by Priority")
- `height?: number` - Optional. Chart height in pixels (default: 300)
- `className?: string` - Optional. Custom CSS classes

---

### 4. RFIAssigneeChart

Horizontal bar chart showing assignee on-time performance.

**Features:**
- Color-coded bars by performance rating
  - Green: Excellent (≥95% on-time)
  - Blue: Good (≥85% on-time)
  - Orange: Average (≥70% on-time)
  - Red: Needs improvement (<70% on-time)
- Filters assignees with minimum 3 responses
- Sorted by on-time percentage
- Configurable max assignees to display

**Usage:**
```tsx
import { RFIAssigneeChart } from '@/features/rfis/components'
import { useResponseTimeByAssignee } from '@/features/rfis/hooks/useRFIResponseAnalytics'

function AssigneePerformance() {
  const { data: assigneeData } = useResponseTimeByAssignee(projectId, filters)

  if (!assigneeData) return null

  return (
    <RFIAssigneeChart
      data={assigneeData}
      title="Top Performers"
      maxAssignees={10}
      height={400}
    />
  )
}
```

**Props:**
- `data: ResponseTimeByAssignee[]` - Required. Assignee metrics from analytics service
- `title?: string` - Optional. Chart title (default: "Assignee Performance")
- `height?: number` - Optional. Chart height in pixels (default: 300)
- `maxAssignees?: number` - Optional. Max assignees to show (default: 10)
- `className?: string` - Optional. Custom CSS classes

---

### 5. RFIOnTimeTrendChart

Area chart showing on-time performance percentage over time.

**Features:**
- Smooth area chart with gradient fill
- Shows percentage of RFIs responded to on time
- Trend over time visualization
- Hover tooltips with period details

**Usage:**
```tsx
import { RFIOnTimeTrendChart } from '@/features/rfis/components'
import { useResponseTimeTrends } from '@/features/rfis/hooks/useRFIResponseAnalytics'

function OnTimePerformance() {
  const { data: trends } = useResponseTimeTrends(projectId, dateRange, 'week')

  if (!trends) return null

  return (
    <RFIOnTimeTrendChart
      data={trends.dataPoints}
      title="On-Time Performance Trend"
      height={300}
    />
  )
}
```

**Props:**
- `data: ResponseTimeTrendPoint[]` - Required. Trend points from analytics service
- `title?: string` - Optional. Chart title (default: "On-Time Performance Trend")
- `height?: number` - Optional. Chart height in pixels (default: 250)
- `className?: string` - Optional. Custom CSS classes

---

## Data Sources

All components consume data from the RFI Response Analytics service via React Query hooks:

### Available Hooks

```tsx
import {
  useRFIResponseAnalytics,        // Complete analytics
  useResponseTimeTrends,           // Trend data
  useResponseTimeByPriority,       // Priority metrics
  useResponseTimeByAssignee,       // Assignee performance
  useAverageResponseTime,          // Overall metrics
  useResponseTimeDistribution,     // Distribution analysis
  useOnTimePerformance,            // On-time stats
} from '@/features/rfis/hooks/useRFIResponseAnalytics'
```

### Complete Analytics Hook

The `useRFIResponseAnalytics` hook fetches all metrics in a single request:

```tsx
const { data: analytics, isLoading, isError } = useRFIResponseAnalytics(
  projectId,
  {
    dateRange: {
      startDate: '2024-01-01',
      endDate: '2024-03-31',
    },
    priority: 'high', // Optional filter
    assigneeId: 'user-123', // Optional filter
  }
)

// Returns:
// - summary: Overall metrics
// - byPriority: Metrics by priority level
// - byAssignee: Assignee performance
// - byResponseType: Response type distribution
// - distribution: Distribution analysis
// - trends: Trend data over time
// - byDayOfWeek: Day-of-week patterns
// - byMonth: Monthly metrics
// - fastestResponses: Top 5 fastest
// - slowestResponses: Top 5 slowest
```

### Date Range Presets

```tsx
import { getDateRangeFromPreset } from '@/features/rfis/hooks/useRFIResponseAnalytics'

const dateRange = getDateRangeFromPreset('last_90_days')
// Options: 'last_7_days' | 'last_30_days' | 'last_90_days' | 'last_6_months' | 'last_year' | 'all_time'
```

---

## Advanced Usage Examples

### Custom Dashboard with Multiple Charts

```tsx
import {
  RFITrendChart,
  RFIPriorityChart,
  RFIAssigneeChart,
  RFIOnTimeTrendChart,
} from '@/features/rfis/components'
import { useRFIResponseAnalytics } from '@/features/rfis/hooks/useRFIResponseAnalytics'

function CustomDashboard({ projectId }: { projectId: string }) {
  const { data, isLoading } = useRFIResponseAnalytics(projectId, {
    dateRange: {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    },
  })

  if (isLoading) return <div>Loading...</div>
  if (!data) return <div>No data</div>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <RFITrendChart data={data.trends} />
        <RFIOnTimeTrendChart data={data.trends.dataPoints} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <RFIPriorityChart data={data.byPriority} />
        <RFIAssigneeChart
          data={data.byAssignee}
          title="Team Performance"
          maxAssignees={5}
        />
      </div>
    </div>
  )
}
```

### Filtered Analysis

```tsx
import { useState } from 'react'
import { RFITrendReport } from '@/features/rfis/components'
import { Select } from '@/components/ui/select'

function FilteredReport({ projectId }: { projectId: string }) {
  const [priority, setPriority] = useState<'all' | 'critical' | 'high' | 'normal' | 'low'>('all')

  return (
    <div>
      <Select value={priority} onValueChange={setPriority}>
        <SelectItem value="all">All Priorities</SelectItem>
        <SelectItem value="critical">Critical</SelectItem>
        <SelectItem value="high">High</SelectItem>
        <SelectItem value="normal">Normal</SelectItem>
        <SelectItem value="low">Low</SelectItem>
      </Select>

      <RFITrendReport
        projectId={projectId}
        // Filtering is built into the component
      />
    </div>
  )
}
```

### Export to PDF Implementation

The RFITrendReport includes a placeholder for PDF export. Here's how to implement it:

```tsx
import html2pdf from 'html2pdf.js'

const handleExportPDF = async () => {
  const element = reportRef.current
  if (!element) return

  const opt = {
    margin: 1,
    filename: `rfi-trend-report-${new Date().toISOString().split('T')[0]}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' },
  }

  await html2pdf().set(opt).from(element).save()
}
```

---

## Insights & Recommendations

The RFITrendReport component automatically generates insights based on the data:

### Insight Types

1. **Improving Trend**: When response times decrease by ≥10%
   - Shows percentage improvement
   - Recommends sharing best practices

2. **Declining Trend**: When response times increase by ≥10%
   - Highlights percentage increase
   - Suggests reviewing workload distribution

3. **Low On-Time Performance**: When on-time % < 80%
   - Identifies the percentage
   - Recommends reviewing deadlines and priorities

4. **Workload Redistribution**: When assignees need attention
   - Lists struggling assignees
   - Suggests redistributing to top performers

---

## Performance Ratings

Assignee performance is automatically categorized:

| Rating | On-Time % | Color | Description |
|--------|-----------|-------|-------------|
| Excellent | ≥95% | Green | Consistently meets deadlines |
| Good | ≥85% | Blue | Generally meets deadlines |
| Average | ≥70% | Orange | Sometimes misses deadlines |
| Needs Improvement | <70% | Red | Frequently misses deadlines |

---

## Trend Indicators

Trend direction is calculated by comparing first half vs second half of the period:

| Trend | Change | Icon | Description |
|-------|--------|------|-------------|
| Improving | ≤-10% | ↓ | Response times decreasing |
| Stable | -10% to +10% | → | No significant change |
| Declining | ≥+10% | ↑ | Response times increasing |

---

## Testing

All components include comprehensive test coverage:

```bash
# Run all RFI trend tests
npm test -- src/features/rfis/components/RFITrendChart.test.tsx
npm test -- src/features/rfis/components/RFITrendReport.test.tsx

# Run with coverage
npm test -- --coverage src/features/rfis/components/RFI*
```

**Test Coverage:**
- Component rendering with data
- Empty states
- Loading states
- Error states
- User interactions (filters, exports)
- Trend calculations
- Performance ratings
- Insights generation

---

## Dependencies

- `recharts` - Chart library
- `date-fns` - Date formatting
- `@tanstack/react-query` - Data fetching
- `lucide-react` - Icons
- `@/components/ui` - UI components (shadcn/ui)

---

## Type Safety

All components are fully typed with TypeScript:

```tsx
import type {
  ResponseTimeTrends,
  ResponseTimeByPriority,
  ResponseTimeByAssignee,
  ResponseTimeTrendPoint,
  RFIResponseTimeAnalytics,
  DateRangePreset,
  TrendDirection,
} from '@/types/rfi-response-analytics'
```

---

## Accessibility

All charts and components follow accessibility best practices:

- Semantic HTML structure
- ARIA labels and descriptions
- Keyboard navigation support
- Screen reader compatible
- Color-blind friendly palettes
- Sufficient color contrast ratios

---

## Browser Support

Compatible with all modern browsers:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

---

## Future Enhancements

Potential improvements for future versions:

1. **Advanced Filtering**
   - Multiple assignee selection
   - Response type filtering
   - Custom date ranges

2. **Export Options**
   - Excel/CSV export
   - Image export (PNG/SVG)
   - Scheduled report emails

3. **Interactive Features**
   - Drill-down charts
   - Comparison views
   - Custom metric selection

4. **AI-Powered Insights**
   - Predictive analytics
   - Anomaly detection
   - Automated recommendations

5. **Collaboration**
   - Share reports
   - Add comments/notes
   - Team annotations

---

## Support

For issues or questions:
1. Check this documentation
2. Review the test files for usage examples
3. Consult the RFI Response Analytics service documentation
4. Review the TypeScript type definitions

---

## License

Part of the Construction Management Platform.
