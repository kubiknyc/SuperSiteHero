import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Pagination } from '@/components/ui/pagination'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DollarSign,
  Plus,
  Search,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  AlertTriangle,
  CheckCircle2,
  MinusCircle,
  Wallet,
  Receipt,
} from 'lucide-react'
import { useProjectBudgets } from '@/features/cost-tracking/hooks/useCostTracking'
import { useMyProjects } from '@/features/projects/hooks/useProjects'

// Skeleton component for loading state
function BudgetTableSkeleton() {
  return (
    <div className="space-y-3">
      {/* Table header skeleton */}
      <div className="flex gap-4 py-3 px-2 border-b">
        {[100, 200, 80, 80, 80, 80, 80, 80, 100].map((width, i) => (
          <Skeleton key={i} className="h-4" style={{ width: `${width}px` }} />
        ))}
      </div>
      {/* Table rows skeleton */}
      {Array.from({ length: 8 }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 py-3 px-2 border-b">
          <Skeleton className="h-5 w-[100px]" />
          <Skeleton className="h-5 w-[200px]" />
          <Skeleton className="h-5 w-[80px]" />
          <Skeleton className="h-5 w-[80px]" />
          <Skeleton className="h-5 w-[80px]" />
          <Skeleton className="h-5 w-[80px]" />
          <Skeleton className="h-5 w-[80px]" />
          <Skeleton className="h-5 w-[80px]" />
          <Skeleton className="h-5 w-[100px]" />
        </div>
      ))}
    </div>
  )
}

// Skeleton for summary cards
function SummaryCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Status badge component for budget items
function BudgetStatusBadge({ variance, budget }: { variance: number; budget: number }) {
  // Calculate variance percentage
  const variancePercent = budget > 0 ? (variance / budget) * 100 : 0

  if (variance < 0) {
    return (
      <Badge variant="destructive" className="gap-1 whitespace-nowrap">
        <AlertTriangle className="h-3 w-3" />
        Over Budget
      </Badge>
    )
  }

  // Under budget by more than 10%
  if (variancePercent > 10) {
    return (
      <Badge variant="success" className="gap-1 whitespace-nowrap">
        <CheckCircle2 className="h-3 w-3" />
        Under Budget
      </Badge>
    )
  }

  // On track (within 10%)
  return (
    <Badge variant="secondary" className="gap-1 whitespace-nowrap">
      <MinusCircle className="h-3 w-3" />
      On Track
    </Badge>
  )
}

// Get row background class based on variance
function getRowBackgroundClass(variance: number, budget: number): string {
  if (variance < 0) {
    // Over budget - red tint
    return 'bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50'
  }

  const variancePercent = budget > 0 ? (variance / budget) * 100 : 0

  if (variancePercent > 10) {
    // Under budget by more than 10% - green tint
    return 'bg-green-50 hover:bg-green-100 dark:bg-green-950/30 dark:hover:bg-green-950/50'
  }

  // On track - default background
  return 'hover:bg-surface dark:hover:bg-surface/50'
}

export function BudgetPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const projectId = searchParams.get('project') || undefined
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)

  const { data: projects, isLoading: projectsLoading } = useMyProjects()
  const { data: budgets, isLoading: budgetsLoading } = useProjectBudgets(
    projectId ? { projectId } : { projectId: '' }
  )

  const isLoading = budgetsLoading || (projectId && projectsLoading)

  // Calculate totals
  const totals = useMemo(() => {
    return budgets?.reduce(
      (acc, b) => ({
        original: acc.original + (b.original_budget || 0),
        revised: acc.revised + (b.revised_budget || 0),
        committed: acc.committed + (b.committed_costs || 0),
        actual: acc.actual + (b.actual_costs || 0),
      }),
      { original: 0, revised: 0, committed: 0, actual: 0 }
    ) || { original: 0, revised: 0, committed: 0, actual: 0 }
  }, [budgets])

  const variance = totals.revised - totals.actual
  const variancePercent = totals.revised > 0 ? ((variance / totals.revised) * 100).toFixed(1) : '0'
  const isOverBudget = variance < 0
  const remaining = totals.revised - totals.committed

  // Filter budgets by search
  const filteredBudgets = useMemo(() => {
    return budgets?.filter(b => {
      if (search) {
        const searchLower = search.toLowerCase()
        return (
          b.cost_code?.code?.toLowerCase().includes(searchLower) ||
          b.cost_code?.description?.toLowerCase().includes(searchLower)
        )
      }
      return true
    }) || []
  }, [budgets, search])

  // Paginate filtered budgets
  const paginatedBudgets = useMemo(() => {
    const start = page * pageSize
    return filteredBudgets.slice(start, start + pageSize)
  }, [filteredBudgets, page, pageSize])

  const totalPages = Math.ceil(filteredBudgets.length / pageSize)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Handle project change
  const handleProjectChange = (value: string) => {
    if (value === 'all') {
      searchParams.delete('project')
    } else {
      searchParams.set('project', value)
    }
    setSearchParams(searchParams)
    setPage(0) // Reset to first page when changing project
  }

  // Handle page size change
  const handlePageSizeChange = (size: number) => {
    setPageSize(size)
    setPage(0) // Reset to first page when changing page size
  }

  // Export budget data as CSV
  const handleExport = () => {
    if (!filteredBudgets.length) return

    const headers = [
      'Cost Code',
      'Description',
      'Original Budget',
      'Approved Changes',
      'Revised Budget',
      'Committed',
      'Actual',
      'Variance',
      'Status',
    ]

    const rows = filteredBudgets.map(budget => {
      const lineVariance = (budget.revised_budget || 0) - (budget.actual_costs || 0)
      const status = lineVariance < 0 ? 'Over Budget' : lineVariance / (budget.revised_budget || 1) > 0.1 ? 'Under Budget' : 'On Track'

      return [
        budget.cost_code?.code || '',
        budget.cost_code?.description || '',
        budget.original_budget || 0,
        budget.approved_changes || 0,
        budget.revised_budget || 0,
        budget.committed_costs || 0,
        budget.actual_costs || 0,
        lineVariance,
        status,
      ]
    })

    // Add totals row
    rows.push([
      'TOTALS',
      '',
      totals.original,
      '-',
      totals.revised,
      totals.committed,
      totals.actual,
      variance,
      isOverBudget ? 'Over Budget' : 'On Track',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `budget-export-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 heading-page">
              <DollarSign className="h-6 w-6" />
              Budget
            </h1>
            <p className="text-muted mt-1">
              Track project budgets and cost codes
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select
              value={projectId || 'all'}
              onValueChange={handleProjectChange}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects?.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2" onClick={handleExport} disabled={!filteredBudgets.length}>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Budget Line</span>
            </Button>
          </div>
        </div>

        {/* Budget Summary Cards */}
        {isLoading ? (
          <SummaryCardsSkeleton />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted">Total Budget</p>
                    <p className="text-xl md:text-2xl font-bold">{formatCurrency(totals.revised)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <Receipt className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted">Spent</p>
                    <p className="text-xl md:text-2xl font-bold">{formatCurrency(totals.actual)}</p>
                    <p className="text-xs text-muted">
                      {totals.revised > 0 ? ((totals.actual / totals.revised) * 100).toFixed(1) : 0}% of budget
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted">Committed</p>
                    <p className="text-xl md:text-2xl font-bold">{formatCurrency(totals.committed)}</p>
                    <p className="text-xs text-muted">
                      {totals.revised > 0 ? ((totals.committed / totals.revised) * 100).toFixed(1) : 0}% committed
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                    <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted">Remaining</p>
                    <p className={`text-xl md:text-2xl font-bold ${remaining < 0 ? 'text-error' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {formatCurrency(Math.abs(remaining))}
                    </p>
                    <p className="text-xs text-muted">
                      {remaining < 0 ? 'Over committed' : 'Available'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={isOverBudget ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30' : 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30'}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isOverBudget ? 'bg-red-100 dark:bg-red-900/50' : 'bg-green-100 dark:bg-green-900/50'}`}>
                    {isOverBudget ? (
                      <ArrowDownRight className="h-5 w-5 text-error" />
                    ) : (
                      <ArrowUpRight className="h-5 w-5 text-success" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted">Variance</p>
                    <p className={`text-xl md:text-2xl font-bold ${isOverBudget ? 'text-error' : 'text-success'}`}>
                      {isOverBudget ? '-' : '+'}{formatCurrency(Math.abs(variance))}
                    </p>
                    <p className={`text-xs ${isOverBudget ? 'text-error' : 'text-success'}`}>
                      {isOverBudget ? 'Over' : 'Under'} budget ({variancePercent}%)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-disabled" />
            <Input
              placeholder="Search cost codes..."
              className="pl-10"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(0) // Reset to first page when searching
              }}
            />
          </div>
          {filteredBudgets.length > 0 && (
            <p className="text-sm text-muted self-center">
              {filteredBudgets.length} cost code{filteredBudgets.length !== 1 ? 's' : ''} found
            </p>
          )}
        </div>

        {/* Budget Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span>Cost Code Budgets</span>
              {!isLoading && projectId && filteredBudgets.length > 0 && (
                <div className="flex gap-2 text-sm font-normal">
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Over Budget
                  </Badge>
                  <Badge variant="success" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Under Budget
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    <MinusCircle className="h-3 w-3" />
                    On Track
                  </Badge>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading && projectId ? (
              <div className="p-4">
                <BudgetTableSkeleton />
              </div>
            ) : !projectId ? (
              <div className="text-center py-12">
                <DollarSign className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-muted font-medium">Select a project to view budgets</p>
                <p className="text-sm text-disabled mt-1">Choose a project from the dropdown above</p>
              </div>
            ) : filteredBudgets.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-muted font-medium">No budget lines found</p>
                <p className="text-sm text-disabled mt-1">
                  {search ? 'Try adjusting your search' : 'Add budget lines to track costs'}
                </p>
              </div>
            ) : (
              <>
                {/* Responsive table with horizontal scroll */}
                <ScrollArea className="w-full">
                  <div className="min-w-[900px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">Cost Code</TableHead>
                          <TableHead className="min-w-[180px]">Description</TableHead>
                          <TableHead className="text-right w-[100px]">Original</TableHead>
                          <TableHead className="text-right w-[100px]">Changes</TableHead>
                          <TableHead className="text-right w-[100px]">Revised</TableHead>
                          <TableHead className="text-right w-[100px]">Committed</TableHead>
                          <TableHead className="text-right w-[100px]">Actual</TableHead>
                          <TableHead className="text-right w-[100px]">Variance</TableHead>
                          <TableHead className="w-[120px]">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedBudgets.map((budget) => {
                          const lineVariance = (budget.revised_budget || 0) - (budget.actual_costs || 0)
                          const isLineOver = lineVariance < 0
                          const rowBgClass = getRowBackgroundClass(lineVariance, budget.revised_budget || 0)

                          return (
                            <TableRow
                              key={budget.id}
                              className={rowBgClass}
                            >
                              <TableCell className="font-mono text-sm">
                                {budget.cost_code?.code || '-'}
                              </TableCell>
                              <TableCell>
                                {budget.cost_code?.description || '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(budget.original_budget || 0)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(budget.approved_changes || 0)}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(budget.revised_budget || 0)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(budget.committed_costs || 0)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(budget.actual_costs || 0)}
                              </TableCell>
                              <TableCell className={`text-right font-medium ${isLineOver ? 'text-error' : 'text-success'}`}>
                                {isLineOver ? '-' : '+'}{formatCurrency(Math.abs(lineVariance))}
                              </TableCell>
                              <TableCell>
                                <BudgetStatusBadge
                                  variance={lineVariance}
                                  budget={budget.revised_budget || 0}
                                />
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                      <TableFooter>
                        <TableRow className="bg-surface dark:bg-background font-medium">
                          <TableCell colSpan={2}>Totals</TableCell>
                          <TableCell className="text-right">{formatCurrency(totals.original)}</TableCell>
                          <TableCell className="text-right">-</TableCell>
                          <TableCell className="text-right">{formatCurrency(totals.revised)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(totals.committed)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(totals.actual)}</TableCell>
                          <TableCell className={`text-right ${isOverBudget ? 'text-error' : 'text-success'}`}>
                            {isOverBudget ? '-' : '+'}{formatCurrency(Math.abs(variance))}
                          </TableCell>
                          <TableCell>
                            <BudgetStatusBadge variance={variance} budget={totals.revised} />
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>

                {/* Pagination */}
                {filteredBudgets.length > pageSize && (
                  <Pagination
                    page={page}
                    pageSize={pageSize}
                    totalCount={filteredBudgets.length}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    onPageSizeChange={handlePageSizeChange}
                    showPageSizeSelector
                    pageSizeOptions={[10, 20, 50, 100]}
                    className="border-t-0"
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

export default BudgetPage
