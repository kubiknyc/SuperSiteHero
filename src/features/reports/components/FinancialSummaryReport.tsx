// File: /src/features/reports/components/FinancialSummaryReport.tsx
// Financial summary report showing budget and cost tracking

import { useFinancialSummary } from '../hooks/useReports'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AlertCircle, TrendingDown, Loader2 } from 'lucide-react'
import { formatCurrency, formatPercentage } from '@/lib/utils/pdfExport'

interface FinancialSummaryReportProps {
  projectId: string | undefined
}

export function FinancialSummaryReport({ projectId }: FinancialSummaryReportProps) {
  const { data: report, isLoading, error } = useFinancialSummary(projectId)

  if (!projectId) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <AlertCircle className="h-12 w-12 text-disabled mx-auto mb-4" />
          <p className="text-secondary">No project selected</p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader2 className="h-12 w-12 text-disabled mx-auto mb-4 animate-spin" />
          <p className="text-secondary">Loading financial data...</p>
        </CardContent>
      </Card>
    )
  }

  if (error || !report) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-error">Failed to load financial summary</p>
        </CardContent>
      </Card>
    )
  }

  const isOverBudget = report.percentageOverBudget > 0
  const remainingBudget = (report.budget || 0) - report.forecastedTotal
  const budgetUtilization = report.budget ? (report.forecastedTotal / report.budget) * 100 : 0

  return (
    <div id="financial-summary-report" className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Financial Summary</CardTitle>
          <CardDescription>Budget analysis and cost tracking</CardDescription>
        </CardHeader>
      </Card>

      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Contract Value */}
        <Card>
          <CardHeader>
            <CardDescription>Contract Value</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatCurrency(report.contractValue)}</div>
            <p className="text-xs text-secondary mt-2">Original contract amount</p>
          </CardContent>
        </Card>

        {/* Budget */}
        <Card>
          <CardHeader>
            <CardDescription>Budget</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(report.budget)}</div>
            <p className="text-xs text-secondary mt-2">Approved budget</p>
          </CardContent>
        </Card>

        {/* Forecasted Total */}
        <Card>
          <CardHeader>
            <CardDescription>Forecasted Total</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isOverBudget ? 'text-error' : 'text-success'}`}>
              {formatCurrency(report.forecastedTotal)}
            </div>
            <p className="text-xs text-secondary mt-2">Including change orders</p>
          </CardContent>
        </Card>

        {/* Budget Status */}
        <Card>
          <CardHeader>
            <CardDescription>Budget Status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${isOverBudget ? 'text-error' : 'text-success'}`}>
              {formatPercentage(budgetUtilization)}
            </div>
            <p className="text-xs text-secondary mt-2">Budget utilized</p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-secondary">Contract Value vs Budget</span>
              <span className="text-sm font-bold text-foreground">{formatCurrency(report.contractValue)} / {formatCurrency(report.budget)}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className="bg-primary h-3 rounded-full transition-all"
                style={{
                  width: `${report.budget ? Math.min((report.contractValue || 0) / report.budget * 100, 100) : 0}%`,
                }}
              />
            </div>
          </div>

          <div className="mt-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-secondary">Change Order Impact</span>
              <span className="text-sm font-bold text-foreground">{formatCurrency(report.changeOrdersImpact)}</span>
            </div>
            <p className="text-xs text-secondary">Total cost impact from approved change orders</p>
          </div>

          <div className="mt-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-secondary">Remaining Budget</span>
              <span className={`text-sm font-bold ${remainingBudget >= 0 ? 'text-success' : 'text-error'}`}>
                {formatCurrency(remainingBudget)}
              </span>
            </div>
            <p className="text-xs text-secondary">Budget available for additional work</p>
          </div>
        </CardContent>
      </Card>

      {/* Cost Allocation */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Allocation</CardTitle>
          <CardDescription>Breakdown of project costs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <p className="text-sm text-secondary">Base Contract</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(report.contractValue)}</p>
              </div>
              <div className="border-l-4 border-orange-500 pl-4">
                <p className="text-sm text-secondary">Change Orders</p>
                <p className="text-lg font-bold text-orange-600">{formatCurrency(report.changeOrdersImpact)}</p>
              </div>
              <div className="border-l-4 border-purple-500 pl-4">
                <p className="text-sm text-secondary">Subcontractor Costs</p>
                <p className="text-lg font-bold text-purple-600">{formatCurrency(report.subcontractorCosts)}</p>
              </div>
              <div className="border-l-4 border-green-500 pl-4">
                <p className="text-sm text-secondary">Retainage Held</p>
                <p className="text-lg font-bold text-success">{formatCurrency(report.retainageHeld)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget Alerts */}
      {isOverBudget && (
        <div className="alert alert-danger rounded-lg p-4 bg-error-light border border-red-200">
          <div className="flex items-start gap-3">
            <TrendingDown className="h-5 w-5 text-error mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-900">Budget Overrun Alert</p>
              <p className="text-sm text-red-800 mt-1">
                Project is projected to exceed budget by {formatCurrency(Math.abs(remainingBudget))} ({formatPercentage(report.percentageOverBudget)}).
                Review change orders and forecast costs.
              </p>
            </div>
          </div>
        </div>
      )}

      {budgetUtilization > 80 && budgetUtilization <= 100 && (
        <div className="alert alert-warning rounded-lg p-4 bg-warning-light border border-yellow-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-yellow-900">Budget Status</p>
              <p className="text-sm text-yellow-800 mt-1">
                {budgetUtilization.toFixed(1)}% of budget is forecasted to be utilized. Limited contingency remaining.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
