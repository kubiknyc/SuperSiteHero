// @ts-nocheck
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DollarSign,
  Plus,
  Search,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { useProjectBudgets } from '@/features/cost-tracking/hooks/useCostTracking'
import { useMyProjects } from '@/features/projects/hooks/useProjects'

export function BudgetPage() {
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('project') || undefined
  const [search, setSearch] = useState('')

  const { data: projects } = useMyProjects()
  const { data: budgets, isLoading } = useProjectBudgets(
    projectId ? { projectId } : { projectId: '' }
  )

  // Calculate totals
  const totals = budgets?.reduce(
    (acc, b) => ({
      original: acc.original + (b.original_budget || 0),
      revised: acc.revised + (b.revised_budget || 0),
      committed: acc.committed + (b.committed_cost || 0),
      actual: acc.actual + (b.actual_cost || 0),
    }),
    { original: 0, revised: 0, committed: 0, actual: 0 }
  ) || { original: 0, revised: 0, committed: 0, actual: 0 }

  const variance = totals.revised - totals.actual
  const variancePercent = totals.revised > 0 ? ((variance / totals.revised) * 100).toFixed(1) : '0'
  const isOverBudget = variance < 0

  // Filter budgets by search
  const filteredBudgets = budgets?.filter(b => {
    if (search) {
      const searchLower = search.toLowerCase()
      return (
        b.cost_code?.toLowerCase().includes(searchLower) ||
        b.cost_code_name?.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <DollarSign className="h-6 w-6" />
              Budget
            </h1>
            <p className="text-gray-500 mt-1">
              Track project budgets and cost codes
            </p>
          </div>
          <div className="flex gap-2">
            <select
              className="border rounded-md px-3 py-2 text-sm"
              value={projectId || ''}
              onChange={(e) => {
                const url = new URL(window.location.href)
                if (e.target.value) {
                  url.searchParams.set('project', e.target.value)
                } else {
                  url.searchParams.delete('project')
                }
                window.history.pushState({}, '', url.toString())
              }}
            >
              <option value="">All Projects</option>
              {projects?.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Budget Line
            </Button>
          </div>
        </div>

        {/* Budget Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Original Budget</p>
                  <p className="text-2xl font-bold">{formatCurrency(totals.original)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Revised Budget</p>
                  <p className="text-2xl font-bold">{formatCurrency(totals.revised)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Actual Costs</p>
                  <p className="text-2xl font-bold">{formatCurrency(totals.actual)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={isOverBudget ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isOverBudget ? 'bg-red-100' : 'bg-green-100'}`}>
                  {isOverBudget ? (
                    <ArrowDownRight className="h-5 w-5 text-red-600" />
                  ) : (
                    <ArrowUpRight className="h-5 w-5 text-green-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Variance</p>
                  <p className={`text-2xl font-bold ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(Math.abs(variance))}
                  </p>
                  <p className={`text-xs ${isOverBudget ? 'text-red-500' : 'text-green-500'}`}>
                    {isOverBudget ? 'Over budget' : 'Under budget'} ({variancePercent}%)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search cost codes..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Budget Table */}
        <Card>
          <CardHeader>
            <CardTitle>Cost Code Budgets</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading budgets...</div>
            ) : !projectId ? (
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Select a project to view budgets</p>
                <p className="text-sm text-gray-400">Choose a project from the dropdown above</p>
              </div>
            ) : filteredBudgets?.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No budget lines found</p>
                <p className="text-sm text-gray-400">Add budget lines to track costs</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium text-gray-500">Cost Code</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-500">Description</th>
                      <th className="text-right py-3 px-2 font-medium text-gray-500">Original</th>
                      <th className="text-right py-3 px-2 font-medium text-gray-500">Changes</th>
                      <th className="text-right py-3 px-2 font-medium text-gray-500">Revised</th>
                      <th className="text-right py-3 px-2 font-medium text-gray-500">Committed</th>
                      <th className="text-right py-3 px-2 font-medium text-gray-500">Actual</th>
                      <th className="text-right py-3 px-2 font-medium text-gray-500">Variance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBudgets?.map((budget) => {
                      const lineVariance = (budget.revised_budget || 0) - (budget.actual_costs || 0)
                      const isLineOver = lineVariance < 0

                      return (
                        <tr key={budget.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-2 font-mono text-sm">
                            {budget.cost_code?.code || '-'}
                          </td>
                          <td className="py-3 px-2">
                            {budget.cost_code?.description || '-'}
                          </td>
                          <td className="py-3 px-2 text-right">
                            {formatCurrency(budget.original_budget || 0)}
                          </td>
                          <td className="py-3 px-2 text-right">
                            {formatCurrency(budget.approved_changes || 0)}
                          </td>
                          <td className="py-3 px-2 text-right font-medium">
                            {formatCurrency(budget.revised_budget || 0)}
                          </td>
                          <td className="py-3 px-2 text-right">
                            {formatCurrency(budget.committed_costs || 0)}
                          </td>
                          <td className="py-3 px-2 text-right">
                            {formatCurrency(budget.actual_costs || 0)}
                          </td>
                          <td className={`py-3 px-2 text-right font-medium ${isLineOver ? 'text-red-600' : 'text-green-600'}`}>
                            {isLineOver ? '-' : ''}{formatCurrency(Math.abs(lineVariance))}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-medium">
                      <td className="py-3 px-2" colSpan={2}>Totals</td>
                      <td className="py-3 px-2 text-right">{formatCurrency(totals.original)}</td>
                      <td className="py-3 px-2 text-right">-</td>
                      <td className="py-3 px-2 text-right">{formatCurrency(totals.revised)}</td>
                      <td className="py-3 px-2 text-right">{formatCurrency(totals.committed)}</td>
                      <td className="py-3 px-2 text-right">{formatCurrency(totals.actual)}</td>
                      <td className={`py-3 px-2 text-right ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                        {isOverBudget ? '-' : ''}{formatCurrency(Math.abs(variance))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

export default BudgetPage
