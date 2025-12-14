/**
 * Budget Summary Cards Component
 * Displays key budget metrics in a card grid
 */

import { Card, CardContent } from '@/components/ui/card'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from 'lucide-react'
import type { ProjectBudgetTotals } from '@/types/cost-tracking'

interface BudgetSummaryCardsProps {
  totals: ProjectBudgetTotals | undefined
  isLoading: boolean
}

export function BudgetSummaryCards({ totals, isLoading }: BudgetSummaryCardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-center h-20">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const data = totals || {
    total_original_budget: 0,
    total_approved_changes: 0,
    total_revised_budget: 0,
    total_committed_cost: 0,
    total_actual_cost: 0,
    total_variance: 0,
    budget_count: 0,
  }

  const isOverBudget = data.total_variance < 0
  const variancePercent = data.total_revised_budget > 0
    ? ((data.total_variance / data.total_revised_budget) * 100).toFixed(1)
    : '0'
  const spentPercent = data.total_revised_budget > 0
    ? ((data.total_actual_cost / data.total_revised_budget) * 100).toFixed(1)
    : '0'

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Original Budget */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Original Budget</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(data.total_original_budget)}</p>
              <p className="text-xs text-gray-400 mt-1">{data.budget_count} line items</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approved Changes */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Approved Changes</p>
              <p className={`text-2xl font-bold mt-1 ${data.total_approved_changes >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                {data.total_approved_changes >= 0 ? '+' : ''}{formatCurrency(data.total_approved_changes)}
              </p>
              <p className="text-xs text-gray-400 mt-1">Change orders</p>
            </div>
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revised Budget */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Revised Budget</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(data.total_revised_budget)}</p>
              <p className="text-xs text-gray-400 mt-1">Current contract value</p>
            </div>
            <div className="p-2 bg-indigo-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-indigo-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actual Costs */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Actual Costs</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(data.total_actual_cost)}</p>
              <p className="text-xs text-gray-400 mt-1">{spentPercent}% of budget</p>
            </div>
            <div className="p-2 bg-orange-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-orange-600" />
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  parseFloat(spentPercent) > 100 ? 'bg-red-500' :
                  parseFloat(spentPercent) > 90 ? 'bg-orange-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min(parseFloat(spentPercent), 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Variance */}
      <Card className={isOverBudget ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Variance</p>
              <p className={`text-2xl font-bold mt-1 ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                {isOverBudget ? '-' : '+'}{formatCurrency(Math.abs(data.total_variance))}
              </p>
              <p className={`text-xs mt-1 ${isOverBudget ? 'text-red-500' : 'text-green-500'}`}>
                {isOverBudget ? 'Over budget' : 'Under budget'} ({Math.abs(parseFloat(variancePercent))}%)
              </p>
            </div>
            <div className={`p-2 rounded-lg ${isOverBudget ? 'bg-red-100' : 'bg-green-100'}`}>
              {isOverBudget ? (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
