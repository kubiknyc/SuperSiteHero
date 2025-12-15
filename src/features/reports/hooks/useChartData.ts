/**
 * useChartData Hook
 *
 * Transforms report data into chart-compatible format.
 * Handles aggregation and grouping for various chart types.
 */

import { useMemo } from 'react'
import type {
  ChartConfiguration,
  ReportAggregationType,
  ReportFieldType,
} from '@/types/report-builder'

export interface ChartDataPoint {
  name: string
  value: number
  [key: string]: string | number
}

interface UseChartDataOptions {
  data: Record<string, unknown>[]
  chartConfig: ChartConfiguration
  valueFieldType?: ReportFieldType
}

/**
 * Aggregate values based on aggregation type
 */
function aggregateValues(
  values: number[],
  aggregationType: ReportAggregationType
): number {
  if (values.length === 0) {return 0}

  switch (aggregationType) {
    case 'sum':
      return values.reduce((acc, val) => acc + val, 0)
    case 'average':
      return values.reduce((acc, val) => acc + val, 0) / values.length
    case 'count':
      return values.length
    case 'min':
      return Math.min(...values)
    case 'max':
      return Math.max(...values)
    case 'none':
    default:
      return values[0] || 0
  }
}

/**
 * Convert value to number safely
 */
function toNumber(value: unknown): number {
  if (typeof value === 'number') {return value}
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? 0 : parsed
  }
  if (typeof value === 'boolean') {return value ? 1 : 0}
  return 0
}

/**
 * Format group name for display
 */
function formatGroupName(value: unknown, fieldType?: ReportFieldType): string {
  if (value === null || value === undefined) {return 'N/A'}

  switch (fieldType) {
    case 'date':
    case 'datetime':
      try {
        const date = new Date(value as string)
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      } catch {
        return String(value)
      }
    case 'boolean':
      return value ? 'Yes' : 'No'
    case 'status':
      return String(value)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
    default:
      return String(value)
  }
}

/**
 * Transform report data into chart format
 */
export function useChartData({
  data,
  chartConfig,
  valueFieldType,
}: UseChartDataOptions) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {return []}
    if (!chartConfig.groupByField || !chartConfig.valueField) {return []}

    // Group data by the groupByField
    const groups = new Map<string, number[]>()

    data.forEach((row) => {
      const groupValue = row[chartConfig.groupByField]
      const value = row[chartConfig.valueField]

      const groupKey = formatGroupName(groupValue, valueFieldType)
      const numericValue = toNumber(value)

      if (!groups.has(groupKey)) {
        groups.set(groupKey, [])
      }
      groups.get(groupKey)!.push(numericValue)
    })

    // Aggregate values for each group
    const aggregated: ChartDataPoint[] = Array.from(groups.entries()).map(
      ([name, values]) => ({
        name,
        value: aggregateValues(values, chartConfig.aggregation || 'sum'),
      })
    )

    // Sort by value descending for better visualization
    // Exception: pie charts look better with largest slice first
    if (chartConfig.type === 'pie') {
      aggregated.sort((a, b) => b.value - a.value)
      // Limit to top 10 for pie charts to avoid clutter
      return aggregated.slice(0, 10)
    }

    return aggregated
  }, [data, chartConfig, valueFieldType])

  // Calculate summary statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return {
        total: 0,
        average: 0,
        min: 0,
        max: 0,
        count: 0,
      }
    }

    const values = chartData.map((d) => d.value)
    return {
      total: values.reduce((acc, val) => acc + val, 0),
      average: values.reduce((acc, val) => acc + val, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: chartData.length,
    }
  }, [chartData])

  return {
    chartData,
    stats,
    isEmpty: chartData.length === 0,
  }
}

export default useChartData
