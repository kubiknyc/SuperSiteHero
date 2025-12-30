/**
 * Bid Trend Chart Component
 * Displays bid volume, win rates, and pricing trends over time using recharts
 */

import React from 'react'
import {
  LineChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts'
import { formatCurrency, formatPercentage, type BidTrendData } from '@/types/historical-bid-analysis'

interface BidTrendChartProps {
  data: BidTrendData[]
  type?: 'volume' | 'pricing' | 'winRate' | 'combined'
}

export function BidTrendChart({ data, type = 'combined' }: BidTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    )
  }

  // Volume Chart
  if (type === 'volume') {
    return (
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="period_label" />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip />
          <Legend />
          <Bar yAxisId="left" dataKey="bid_count" fill="#3b82f6" name="Total Bids" />
          <Bar yAxisId="left" dataKey="win_count" fill="#10b981" name="Wins" />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="win_rate"
            stroke="#f59e0b"
            strokeWidth={2}
            name="Win Rate %"
          />
        </ComposedChart>
      </ResponsiveContainer>
    )
  }

  // Pricing Chart
  if (type === 'pricing') {
    return (
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="period_label" />
          <YAxis />
          <Tooltip formatter={(value) => formatCurrency(value as number)} />
          <Legend />
          <Line
            type="monotone"
            dataKey="average_bid"
            stroke="#3b82f6"
            strokeWidth={2}
            name="Average Bid"
          />
          <Line
            type="monotone"
            dataKey="median_bid"
            stroke="#8b5cf6"
            strokeWidth={2}
            strokeDasharray="5 5"
            name="Median Bid"
          />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  // Win Rate Chart
  if (type === 'winRate') {
    return (
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="period_label" />
          <YAxis />
          <Tooltip formatter={(value) => formatPercentage(value as number)} />
          <Legend />
          <Line
            type="monotone"
            dataKey="win_rate"
            stroke="#10b981"
            strokeWidth={2}
            name="Win Rate %"
          />
          <Line
            type="monotone"
            dataKey="average_markup"
            stroke="#f59e0b"
            strokeWidth={2}
            name="Average Markup %"
          />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  // Combined Chart (default)
  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="period_label" />
        <YAxis yAxisId="left" label={{ value: 'Bid Count', angle: -90, position: 'insideLeft' }} />
        <YAxis
          yAxisId="right"
          orientation="right"
          label={{ value: 'Percentage', angle: 90, position: 'insideRight' }}
        />
        <Tooltip
          formatter={(value, name) => {
            if (name === 'Average Bid' || name === 'Total Value') {
              return formatCurrency(value as number)
            }
            if (name === 'Win Rate' || name === 'Markup') {
              return formatPercentage(value as number)
            }
            return value
          }}
        />
        <Legend />
        <Bar yAxisId="left" dataKey="bid_count" fill="#3b82f6" name="Bid Count" />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="win_rate"
          stroke="#10b981"
          strokeWidth={2}
          name="Win Rate"
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="average_markup"
          stroke="#f59e0b"
          strokeWidth={2}
          strokeDasharray="5 5"
          name="Markup"
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
