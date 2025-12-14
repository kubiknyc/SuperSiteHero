/**
 * Budget Table Component
 * Displays project budget lines with sorting and filtering
 */

import { useState, useMemo } from 'react'
import {
  DollarSign,
  Edit,
  Trash2,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  MoreHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import type { ProjectBudgetWithDetails } from '@/types/cost-tracking'

interface BudgetTableProps {
  budgets: ProjectBudgetWithDetails[]
  isLoading: boolean
  onEdit: (budget: ProjectBudgetWithDetails) => void
  onDelete: (id: string) => void
}

type SortField = 'cost_code' | 'original_budget' | 'revised_budget' | 'actual_cost' | 'variance' | 'percent_spent'
type SortDirection = 'asc' | 'desc'

export function BudgetTable({ budgets, isLoading, onEdit, onDelete }: BudgetTableProps) {
  const [sortField, setSortField] = useState<SortField>('cost_code')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const sortedBudgets = useMemo(() => {
    return [...budgets].sort((a, b) => {
      let aVal: string | number
      let bVal: string | number

      switch (sortField) {
        case 'cost_code':
          aVal = a.cost_code || ''
          bVal = b.cost_code || ''
          break
        case 'original_budget':
          aVal = a.original_budget
          bVal = b.original_budget
          break
        case 'revised_budget':
          aVal = a.revised_budget
          bVal = b.revised_budget
          break
        case 'actual_cost':
          aVal = a.actual_cost
          bVal = b.actual_cost
          break
        case 'variance':
          aVal = a.variance
          bVal = b.variance
          break
        case 'percent_spent':
          aVal = a.percent_spent
          bVal = b.percent_spent
          break
        default:
          return 0
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }

      return sortDirection === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number)
    })
  }, [budgets, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th
      className="text-left py-3 px-3 font-medium text-gray-500 cursor-pointer hover:bg-gray-50 select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          sortDirection === 'asc' ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )
        )}
      </div>
    </th>
  )

  const handleConfirmDelete = () => {
    if (deleteId) {
      onDelete(deleteId)
      setDeleteId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="py-12 text-center text-gray-500">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-10 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  if (budgets.length === 0) {
    return (
      <div className="py-12 text-center">
        <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No budget lines found</p>
        <p className="text-sm text-gray-400">Add budget lines to track costs by cost code</p>
      </div>
    )
  }

  // Calculate totals
  const totals = budgets.reduce(
    (acc, b) => ({
      original: acc.original + b.original_budget,
      approved: acc.approved + b.approved_changes,
      revised: acc.revised + b.revised_budget,
      committed: acc.committed + b.committed_cost,
      actual: acc.actual + b.actual_cost,
      variance: acc.variance + b.variance,
    }),
    { original: 0, approved: 0, revised: 0, committed: 0, actual: 0, variance: 0 }
  )

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <SortHeader field="cost_code">Cost Code</SortHeader>
              <th className="text-left py-3 px-3 font-medium text-gray-500">Description</th>
              <SortHeader field="original_budget">
                <span className="text-right w-full">Original</span>
              </SortHeader>
              <th className="text-right py-3 px-3 font-medium text-gray-500">Changes</th>
              <SortHeader field="revised_budget">
                <span className="text-right w-full">Revised</span>
              </SortHeader>
              <th className="text-right py-3 px-3 font-medium text-gray-500">Committed</th>
              <SortHeader field="actual_cost">
                <span className="text-right w-full">Actual</span>
              </SortHeader>
              <SortHeader field="variance">
                <span className="text-right w-full">Variance</span>
              </SortHeader>
              <SortHeader field="percent_spent">
                <span className="text-right w-full">% Spent</span>
              </SortHeader>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {sortedBudgets.map((budget) => {
              const isOverBudget = budget.variance < 0
              const isNearBudget = budget.percent_spent > 90 && budget.percent_spent <= 100

              return (
                <tr
                  key={budget.id}
                  className="border-b hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{budget.cost_code}</span>
                      {budget.division && (
                        <Badge variant="outline" className="text-xs">
                          Div {budget.division}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-sm text-gray-600 max-w-[200px] truncate">
                    {budget.cost_code_name}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sm">
                    {formatCurrency(budget.original_budget)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sm">
                    <span className={budget.approved_changes !== 0 ? (budget.approved_changes > 0 ? 'text-blue-600' : 'text-orange-600') : ''}>
                      {budget.approved_changes !== 0 && (budget.approved_changes > 0 ? '+' : '')}
                      {formatCurrency(budget.approved_changes)}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sm font-medium">
                    {formatCurrency(budget.revised_budget)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sm text-gray-600">
                    {formatCurrency(budget.committed_cost)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sm">
                    {formatCurrency(budget.actual_cost)}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {isOverBudget ? (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      ) : isNearBudget ? (
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      <span
                        className={cn(
                          'font-mono text-sm font-medium',
                          isOverBudget ? 'text-red-600' : isNearBudget ? 'text-orange-600' : 'text-green-600'
                        )}
                      >
                        {isOverBudget ? '-' : ''}
                        {formatCurrency(Math.abs(budget.variance))}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full transition-all',
                            budget.percent_spent > 100 ? 'bg-red-500' :
                            budget.percent_spent > 90 ? 'bg-orange-500' :
                            'bg-green-500'
                          )}
                          style={{ width: `${Math.min(budget.percent_spent, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-10 text-right">
                        {budget.percent_spent.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(budget)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteId(budget.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-medium border-t-2">
              <td className="py-3 px-3" colSpan={2}>
                Totals ({budgets.length} lines)
              </td>
              <td className="py-3 px-3 text-right font-mono">
                {formatCurrency(totals.original)}
              </td>
              <td className="py-3 px-3 text-right font-mono">
                {totals.approved !== 0 && (totals.approved > 0 ? '+' : '')}
                {formatCurrency(totals.approved)}
              </td>
              <td className="py-3 px-3 text-right font-mono">
                {formatCurrency(totals.revised)}
              </td>
              <td className="py-3 px-3 text-right font-mono text-gray-600">
                {formatCurrency(totals.committed)}
              </td>
              <td className="py-3 px-3 text-right font-mono">
                {formatCurrency(totals.actual)}
              </td>
              <td className="py-3 px-3 text-right font-mono">
                <span className={totals.variance < 0 ? 'text-red-600' : 'text-green-600'}>
                  {totals.variance < 0 ? '-' : ''}
                  {formatCurrency(Math.abs(totals.variance))}
                </span>
              </td>
              <td className="py-3 px-3 text-right text-sm text-gray-500">
                {totals.revised > 0 ? ((totals.actual / totals.revised) * 100).toFixed(0) : 0}%
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget Line</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this budget line? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
