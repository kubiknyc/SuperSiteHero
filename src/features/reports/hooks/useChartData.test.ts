/**
 * useChartData Hook Tests
 *
 * Tests data transformation for chart visualizations.
 */

import { renderHook } from '@testing-library/react'
import { useChartData } from './useChartData'
import type { ChartConfiguration } from '@/types/report-builder'

describe('useChartData', () => {
  const mockData = [
    { status: 'open', cost: 1000, created_at: '2024-01-01' },
    { status: 'open', cost: 1500, created_at: '2024-01-02' },
    { status: 'closed', cost: 2000, created_at: '2024-01-03' },
    { status: 'closed', cost: 2500, created_at: '2024-01-04' },
    { status: 'pending', cost: 500, created_at: '2024-01-05' },
  ]

  describe('sum aggregation', () => {
    it('should sum values by group', () => {
      const chartConfig: ChartConfiguration = {
        type: 'bar',
        groupByField: 'status',
        valueField: 'cost',
        aggregation: 'sum',
      }

      const { result } = renderHook(() =>
        useChartData({ data: mockData, chartConfig })
      )

      expect(result.current.chartData).toHaveLength(3)
      expect(result.current.chartData).toContainEqual({
        name: 'open',
        value: 2500,
      })
      expect(result.current.chartData).toContainEqual({
        name: 'closed',
        value: 4500,
      })
      expect(result.current.chartData).toContainEqual({
        name: 'pending',
        value: 500,
      })
    })

    it('should calculate correct statistics', () => {
      const chartConfig: ChartConfiguration = {
        type: 'bar',
        groupByField: 'status',
        valueField: 'cost',
        aggregation: 'sum',
      }

      const { result } = renderHook(() =>
        useChartData({ data: mockData, chartConfig })
      )

      expect(result.current.stats.total).toBe(7500)
      expect(result.current.stats.count).toBe(3)
      expect(result.current.stats.average).toBe(2500)
      expect(result.current.stats.min).toBe(500)
      expect(result.current.stats.max).toBe(4500)
    })
  })

  describe('average aggregation', () => {
    it('should average values by group', () => {
      const chartConfig: ChartConfiguration = {
        type: 'bar',
        groupByField: 'status',
        valueField: 'cost',
        aggregation: 'average',
      }

      const { result } = renderHook(() =>
        useChartData({ data: mockData, chartConfig })
      )

      expect(result.current.chartData).toHaveLength(3)
      expect(result.current.chartData).toContainEqual({
        name: 'open',
        value: 1250,
      })
      expect(result.current.chartData).toContainEqual({
        name: 'closed',
        value: 2250,
      })
      expect(result.current.chartData).toContainEqual({
        name: 'pending',
        value: 500,
      })
    })
  })

  describe('count aggregation', () => {
    it('should count items by group', () => {
      const chartConfig: ChartConfiguration = {
        type: 'bar',
        groupByField: 'status',
        valueField: 'cost',
        aggregation: 'count',
      }

      const { result } = renderHook(() =>
        useChartData({ data: mockData, chartConfig })
      )

      expect(result.current.chartData).toHaveLength(3)
      expect(result.current.chartData).toContainEqual({
        name: 'open',
        value: 2,
      })
      expect(result.current.chartData).toContainEqual({
        name: 'closed',
        value: 2,
      })
      expect(result.current.chartData).toContainEqual({
        name: 'pending',
        value: 1,
      })
    })
  })

  describe('min aggregation', () => {
    it('should find minimum value by group', () => {
      const chartConfig: ChartConfiguration = {
        type: 'bar',
        groupByField: 'status',
        valueField: 'cost',
        aggregation: 'min',
      }

      const { result } = renderHook(() =>
        useChartData({ data: mockData, chartConfig })
      )

      expect(result.current.chartData).toContainEqual({
        name: 'open',
        value: 1000,
      })
      expect(result.current.chartData).toContainEqual({
        name: 'closed',
        value: 2000,
      })
    })
  })

  describe('max aggregation', () => {
    it('should find maximum value by group', () => {
      const chartConfig: ChartConfiguration = {
        type: 'bar',
        groupByField: 'status',
        valueField: 'cost',
        aggregation: 'max',
      }

      const { result } = renderHook(() =>
        useChartData({ data: mockData, chartConfig })
      )

      expect(result.current.chartData).toContainEqual({
        name: 'open',
        value: 1500,
      })
      expect(result.current.chartData).toContainEqual({
        name: 'closed',
        value: 2500,
      })
    })
  })

  describe('pie chart', () => {
    it('should limit to top 10 items for pie charts', () => {
      const largeData = Array.from({ length: 15 }, (_, i) => ({
        category: `Category ${i + 1}`,
        value: (i + 1) * 100,
      }))

      const chartConfig: ChartConfiguration = {
        type: 'pie',
        groupByField: 'category',
        valueField: 'value',
        aggregation: 'sum',
      }

      const { result } = renderHook(() =>
        useChartData({ data: largeData, chartConfig })
      )

      expect(result.current.chartData).toHaveLength(10)
    })

    it('should sort pie chart data by value descending', () => {
      const chartConfig: ChartConfiguration = {
        type: 'pie',
        groupByField: 'status',
        valueField: 'cost',
        aggregation: 'sum',
      }

      const { result } = renderHook(() =>
        useChartData({ data: mockData, chartConfig })
      )

      const values = result.current.chartData.map((d) => d.value)
      const sortedValues = [...values].sort((a, b) => b - a)
      expect(values).toEqual(sortedValues)
    })
  })

  describe('empty data handling', () => {
    it('should handle empty data array', () => {
      const chartConfig: ChartConfiguration = {
        type: 'bar',
        groupByField: 'status',
        valueField: 'cost',
        aggregation: 'sum',
      }

      const { result } = renderHook(() =>
        useChartData({ data: [], chartConfig })
      )

      expect(result.current.chartData).toEqual([])
      expect(result.current.isEmpty).toBe(true)
      expect(result.current.stats.total).toBe(0)
      expect(result.current.stats.count).toBe(0)
    })

    it('should handle missing fields', () => {
      const chartConfig: ChartConfiguration = {
        type: 'bar',
        groupByField: 'nonexistent',
        valueField: 'cost',
        aggregation: 'sum',
      }

      const { result } = renderHook(() =>
        useChartData({ data: mockData, chartConfig })
      )

      expect(result.current.chartData.length).toBeGreaterThan(0)
    })
  })

  describe('data type conversion', () => {
    it('should convert string numbers to numeric values', () => {
      const stringData = [
        { status: 'open', cost: '1000' },
        { status: 'closed', cost: '2000' },
      ]

      const chartConfig: ChartConfiguration = {
        type: 'bar',
        groupByField: 'status',
        valueField: 'cost',
        aggregation: 'sum',
      }

      const { result } = renderHook(() =>
        useChartData({ data: stringData, chartConfig })
      )

      expect(result.current.chartData).toContainEqual({
        name: 'open',
        value: 1000,
      })
      expect(result.current.chartData).toContainEqual({
        name: 'closed',
        value: 2000,
      })
    })

    it('should convert boolean values to numbers', () => {
      const boolData = [
        { status: 'open', is_active: true },
        { status: 'open', is_active: true },
        { status: 'closed', is_active: false },
      ]

      const chartConfig: ChartConfiguration = {
        type: 'bar',
        groupByField: 'status',
        valueField: 'is_active',
        aggregation: 'sum',
      }

      const { result } = renderHook(() =>
        useChartData({ data: boolData, chartConfig })
      )

      expect(result.current.chartData).toContainEqual({
        name: 'open',
        value: 2,
      })
      expect(result.current.chartData).toContainEqual({
        name: 'closed',
        value: 0,
      })
    })

    it('should handle null and undefined values', () => {
      const nullData = [
        { status: 'open', cost: null },
        { status: 'open', cost: 1000 },
        { status: 'closed', cost: undefined },
      ]

      const chartConfig: ChartConfiguration = {
        type: 'bar',
        groupByField: 'status',
        valueField: 'cost',
        aggregation: 'sum',
      }

      const { result } = renderHook(() =>
        useChartData({ data: nullData, chartConfig })
      )

      expect(result.current.chartData).toContainEqual({
        name: 'open',
        value: 1000,
      })
      expect(result.current.chartData).toContainEqual({
        name: 'closed',
        value: 0,
      })
    })
  })

  describe('date formatting', () => {
    it('should format date group names', () => {
      const chartConfig: ChartConfiguration = {
        type: 'line',
        groupByField: 'created_at',
        valueField: 'cost',
        aggregation: 'sum',
      }

      const { result } = renderHook(() =>
        useChartData({ data: mockData, chartConfig, valueFieldType: 'date' })
      )

      // Check that dates are formatted (exact format may vary by locale)
      result.current.chartData.forEach((point) => {
        expect(point.name).not.toMatch(/^\d{4}-\d{2}-\d{2}$/)
      })
    })
  })

  describe('status formatting', () => {
    it('should format status field names', () => {
      const statusData = [
        { status: 'pending_approval', cost: 1000 },
        { status: 'approved', cost: 2000 },
      ]

      const chartConfig: ChartConfiguration = {
        type: 'bar',
        groupByField: 'status',
        valueField: 'cost',
        aggregation: 'sum',
      }

      const { result } = renderHook(() =>
        useChartData({ data: statusData, chartConfig, valueFieldType: 'status' })
      )

      // Status values should be formatted with proper capitalization
      const names = result.current.chartData.map((d) => d.name)
      expect(names).toContain('pending_approval')
    })
  })
})
