# Chart Builder Quick Start Guide

## Overview

The Chart Builder allows users to create visual charts in custom reports. This guide explains how to use the chart builder components.

## Quick Integration

### 1. Import Components

```typescript
import { ChartBuilder, ChartRenderer } from '@/features/reports/components'
import { useChartData } from '@/features/reports/hooks'
import type { ChartConfiguration } from '@/types/report-builder'
```

### 2. Basic Usage

```typescript
function MyReportPage() {
  const [chartConfig, setChartConfig] = useState<ChartConfiguration | null>(null)
  const [reportData, setReportData] = useState([])
  const fieldDefinitions = [] // Your available fields

  return (
    <ChartBuilder
      availableFields={fieldDefinitions}
      chartConfig={chartConfig}
      previewData={reportData}
      onConfigChange={setChartConfig}
    />
  )
}
```

### 3. Display Chart

```typescript
function ChartDisplay({ data, config }) {
  return <ChartRenderer data={data} config={config} />
}
```

## Chart Types

| Type | Icon | Best For | Example Use Case |
|------|------|----------|------------------|
| Bar | 📊 | Compare values across categories | Cost by project |
| Line | 📈 | Show trends over time | Daily RFI count |
| Pie | 🥧 | Display proportions | Budget breakdown |
| Area | 📉 | Cumulative totals | Running total of hours |

## Field Requirements

### Group By Field (X-Axis)
- Must be a groupable field
- Types: text, status, date, datetime, user, project, company
- Example: "Status", "Project", "Created Date"

### Value Field (Y-Axis)
- Must be a numeric field
- Types: number, currency
- Example: "Cost", "Hours", "Count"

### Aggregation
- **Sum**: Total of all values
- **Average**: Mean value
- **Count**: Number of items
- **Min**: Smallest value
- **Max**: Largest value

## Configuration Examples

### Example 1: Cost Analysis Bar Chart

```typescript
const config: ChartConfiguration = {
  type: 'bar',
  groupByField: 'status',
  valueField: 'cost',
  aggregation: 'sum',
  title: 'Total Cost by Status',
  xAxisLabel: 'Status',
  yAxisLabel: 'Total Cost ($)',
  showLegend: true,
  showGrid: true,
  colorScheme: 'default',
}
```

### Example 2: Project Distribution Pie Chart

```typescript
const config: ChartConfiguration = {
  type: 'pie',
  groupByField: 'project_name',
  valueField: 'budget',
  aggregation: 'sum',
  title: 'Budget Distribution',
  showLegend: true,
  showDataLabels: true,
  colorScheme: 'blue',
}
```

### Example 3: Daily Trend Line Chart

```typescript
const config: ChartConfiguration = {
  type: 'line',
  groupByField: 'created_date',
  valueField: 'item_count',
  aggregation: 'count',
  title: 'Daily Activity',
  xAxisLabel: 'Date',
  yAxisLabel: 'Items Created',
  showGrid: true,
  colorScheme: 'green',
}
```

## Display Options

### Titles and Labels

```typescript
config.title = 'My Chart Title'
config.xAxisLabel = 'X-Axis Label'
config.yAxisLabel = 'Y-Axis Label'
```

### Visual Options

```typescript
config.showLegend = true      // Show/hide legend
config.showGrid = true        // Show/hide grid lines
config.showDataLabels = true  // Show percentages (pie charts only)
```

### Height

```typescript
config.height = 400  // Chart height in pixels (default: 400)
```

## Color Schemes

Available color schemes:
- `default` - Multi-color (8 colors)
- `blue` - Blue gradient (8 shades)
- `green` - Green gradient
- `purple` - Purple gradient
- `orange` - Orange gradient
- `red` - Red gradient

```typescript
config.colorScheme = 'blue'
```

## Data Format

### Input Data

```typescript
const reportData = [
  { status: 'open', cost: 1000, project: 'Project A' },
  { status: 'open', cost: 1500, project: 'Project B' },
  { status: 'closed', cost: 2000, project: 'Project A' },
  // ...
]
```

### Transformed Data (useChartData)

```typescript
const { chartData, stats, isEmpty } = useChartData({
  data: reportData,
  chartConfig: config,
})

// chartData = [
//   { name: 'open', value: 2500 },
//   { name: 'closed', value: 2000 },
// ]

// stats = {
//   total: 4500,
//   average: 2250,
//   min: 2000,
//   max: 2500,
//   count: 2,
// }
```

## Export Support

### Excel Export

Charts are exported as a separate "Chart Data" sheet with:
- Category column
- Value column
- Chart type and aggregation metadata

### PDF Export

Charts are rendered as HTML/CSS visualizations:
- Bar charts: Visual bar graphs
- Pie charts: Formatted tables with percentages

## Common Patterns

### Pattern 1: Simple Bar Chart

```typescript
<ChartRenderer
  data={myData}
  config={{
    type: 'bar',
    groupByField: 'category',
    valueField: 'amount',
    aggregation: 'sum',
  }}
/>
```

### Pattern 2: Chart with Click Handler

```typescript
<ChartRenderer
  data={myData}
  config={chartConfig}
  onChartClick={(dataPoint) => {
    console.log('Clicked:', dataPoint.name, dataPoint.value)
  }}
/>
```

### Pattern 3: Conditional Chart Display

```typescript
{chartConfig && reportData.length > 0 && (
  <ChartRenderer data={reportData} config={chartConfig} />
)}
```

## Troubleshooting

### Chart Not Displaying

- ✅ Verify `groupByField` and `valueField` are set
- ✅ Check that data array is not empty
- ✅ Ensure field names match data object keys
- ✅ Confirm aggregation type is compatible with field type

### No Data Points Showing

- ✅ Check field types (groupable vs numeric)
- ✅ Verify data has the specified fields
- ✅ Look for null/undefined values in data

### Preview Not Updating

- ✅ Ensure `onConfigChange` is called
- ✅ Verify `chartConfig` prop is updated
- ✅ Check React state management

## API Reference

### ChartBuilder Props

```typescript
interface ChartBuilderProps {
  availableFields: ReportFieldDefinition[]
  chartConfig: ChartConfiguration | null
  previewData?: Record<string, unknown>[]
  onConfigChange: (config: ChartConfiguration | null) => void
  className?: string
}
```

### ChartRenderer Props

```typescript
interface ChartRendererProps {
  data: Record<string, unknown>[]
  config: ChartConfiguration
  className?: string
  onChartClick?: (data: ChartDataPoint) => void
}
```

### useChartData Hook

```typescript
function useChartData(options: UseChartDataOptions): {
  chartData: ChartDataPoint[]
  stats: {
    total: number
    average: number
    min: number
    max: number
    count: number
  }
  isEmpty: boolean
}
```

## Best Practices

1. **Always validate field compatibility** before allowing selection
2. **Provide meaningful titles and labels** for better UX
3. **Use appropriate chart types** for the data being visualized
4. **Limit pie chart categories** (auto-limited to 10)
5. **Show summary statistics** for additional context
6. **Handle empty states** gracefully
7. **Make charts responsive** to different screen sizes
8. **Use color schemes consistently** across reports

## Examples from Codebase

See working examples in:
- `src/pages/reports/ReportBuilderPage.tsx` - Integration in wizard
- `src/features/reports/components/ChartRenderer.test.tsx` - Component usage
- `src/features/reports/hooks/useChartData.test.ts` - Hook usage

## Support

For issues or questions:
1. Check test files for examples
2. Review type definitions in `src/types/report-builder.ts`
3. Consult implementation documentation in `CHART_BUILDER_IMPLEMENTATION.md`
