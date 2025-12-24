/**
 * Bid Accuracy Chart Component
 * Displays estimated vs actual costs comparison with variance indicators
 */

import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import type { TradeVariance } from '@/types/historical-bid-analysis'
import { formatCurrency, formatPercentage, getAccuracyConfig } from '@/types/historical-bid-analysis'

interface BidAccuracyChartProps {
  data: TradeVariance[]
}

export function BidAccuracyChart({ data }: BidAccuracyChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-muted-foreground">
        No accuracy data available
      </div>
    )
  }

  const chartData = data.map((item) => ({
    name: item.division_name,
    estimated: item.estimated_amount,
    actual: item.actual_amount,
    variance: item.variance,
    variancePercent: item.variance_percentage,
  }))

  return (
    <div className="space-y-4">
      {/* Chart */}
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
          <YAxis tickFormatter={(value) => formatCurrency(value)} />
          <Tooltip
            formatter={(value, name) => {
              if (name === 'Estimated' || name === 'Actual') {
                return formatCurrency(value as number)
              }
              return value
            }}
          />
          <Legend />
          <Bar dataKey="estimated" fill="#3b82f6" name="Estimated" />
          <Bar dataKey="actual" fill="#10b981" name="Actual">
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.variance > 0 ? '#ef4444' : '#10b981'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Variance Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">Trade</th>
              <th className="text-right p-3 font-medium">Estimated</th>
              <th className="text-right p-3 font-medium">Actual</th>
              <th className="text-right p-3 font-medium">Variance</th>
              <th className="text-center p-3 font-medium">Rating</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.map((item, index) => {
              const accuracyConfig = getAccuracyConfig(item.accuracy_rating)
              return (
                <tr key={index} className="hover:bg-muted/30">
                  <td className="p-3 font-medium">{item.division_name}</td>
                  <td className="p-3 text-right">{formatCurrency(item.estimated_amount)}</td>
                  <td className="p-3 text-right">{formatCurrency(item.actual_amount)}</td>
                  <td className={`p-3 text-right font-medium ${item.is_over_budget ? 'text-error' : 'text-success'}`}>
                    {item.is_over_budget ? '+' : ''}{formatPercentage(item.variance_percentage)}
                  </td>
                  <td className="p-3 text-center">
                    <Badge variant="outline" className={`bg-${accuracyConfig?.color}-50 text-${accuracyConfig?.color}-700 border-${accuracyConfig?.color}-200`}>
                      {accuracyConfig?.label}
                    </Badge>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
