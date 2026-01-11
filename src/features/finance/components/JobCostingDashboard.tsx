/**
 * Job Costing Dashboard Component
 *
 * Comprehensive job cost management with:
 * - Budget vs Actual by cost code
 * - Committed costs tracking
 * - Variance analysis
 * - Forecast to complete
 */

import { useState, useMemo } from 'react'
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  BarChart3,
  PieChart,
  RefreshCw,
  Plus,
  Filter,
  Download,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import {
  useCostCodes,
  useJobCostSummary,
  useVarianceAnalysis,
  useCommittedCostSummary,
  useCostTransactions,
} from '../hooks/useJobCosting'
import { useForecastToComplete } from '../hooks/useCashFlow'
import type { CostCode, JobCostSummary, CostTypeSummary } from '../types/sov'

// ============================================================================
// TYPES
// ============================================================================

interface JobCostingDashboardProps {
  projectId: string
  className?: string
}

type CostType = 'labor' | 'material' | 'equipment' | 'subcontract' | 'other'

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatCurrencyPrecise(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

function getCostTypeColor(type: CostType): string {
  switch (type) {
    case 'labor':
      return 'bg-blue-500'
    case 'material':
      return 'bg-green-500'
    case 'equipment':
      return 'bg-yellow-500'
    case 'subcontract':
      return 'bg-purple-500'
    case 'other':
      return 'bg-gray-500'
    default:
      return 'bg-gray-500'
  }
}

function getCostTypeLabel(type: CostType): string {
  switch (type) {
    case 'labor':
      return 'Labor'
    case 'material':
      return 'Material'
    case 'equipment':
      return 'Equipment'
    case 'subcontract':
      return 'Subcontract'
    case 'other':
      return 'Other'
    default:
      return type
  }
}

function getVarianceStatus(variance: number, budget: number) {
  if (budget === 0) {return { status: 'neutral', label: 'N/A' }}
  const percent = (variance / budget) * 100
  if (percent > 5) {return { status: 'under', label: 'Under Budget' }}
  if (percent < -5) {return { status: 'over', label: 'Over Budget' }}
  return { status: 'on-track', label: 'On Track' }
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface SummaryCardsProps {
  summary: JobCostSummary
}

function SummaryCards({ summary }: SummaryCardsProps) {
  const varianceStatus = getVarianceStatus(summary.total_variance, summary.total_revised_budget)

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.total_revised_budget)}</div>
          {summary.total_budget !== summary.total_revised_budget && (
            <p className="text-xs text-muted-foreground">
              Original: {formatCurrency(summary.total_budget)}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Committed</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.total_committed)}</div>
          <p className="text-xs text-muted-foreground">
            {formatPercent((summary.total_committed / summary.total_revised_budget) * 100)} of budget
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Actual Costs</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.total_actual)}</div>
          <div className="mt-2">
            <Progress value={summary.percent_complete} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {formatPercent(summary.percent_complete)} spent
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className={cn(
        varianceStatus.status === 'over' && 'border-red-200 bg-red-50',
        varianceStatus.status === 'under' && 'border-green-200 bg-green-50'
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Variance</CardTitle>
          {summary.total_variance >= 0 ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600" />
          )}
        </CardHeader>
        <CardContent>
          <div className={cn(
            'text-2xl font-bold',
            summary.total_variance >= 0 ? 'text-green-600' : 'text-red-600'
          )}>
            {summary.total_variance >= 0 ? '+' : ''}{formatCurrency(summary.total_variance)}
          </div>
          <Badge
            variant={varianceStatus.status === 'over' ? 'destructive' : 'default'}
            className="mt-1"
          >
            {varianceStatus.label}
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Remaining</CardTitle>
          <PieChart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(
              summary.total_revised_budget - summary.total_committed - summary.total_actual
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Uncommitted budget
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

interface CostTypeBreakdownProps {
  byType: JobCostSummary['by_type']
  totalBudget: number
}

function CostTypeBreakdown({ byType, totalBudget }: CostTypeBreakdownProps) {
  const types: CostType[] = ['labor', 'material', 'equipment', 'subcontract', 'other']

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost Breakdown by Type</CardTitle>
        <CardDescription>Budget allocation and spending by cost category</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {types.map((type) => {
            const data = byType[type]
            const budgetPercent = totalBudget > 0 ? (data.budget / totalBudget) * 100 : 0
            const spentPercent = data.budget > 0 ? data.percent_spent : 0

            return (
              <div key={type} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-3 h-3 rounded-full', getCostTypeColor(type))} />
                    <span className="font-medium">{getCostTypeLabel(type)}</span>
                    <span className="text-sm text-muted-foreground">
                      ({formatPercent(budgetPercent)} of budget)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium">{formatCurrency(data.committed + data.actual)}</span>
                    <span className="text-muted-foreground"> / {formatCurrency(data.budget)}</span>
                  </div>
                </div>
                <div className="relative">
                  <Progress value={Math.min(spentPercent, 100)} className="h-2" />
                  {spentPercent > 100 && (
                    <div
                      className="absolute top-0 h-2 bg-red-500 rounded-r-full"
                      style={{ left: '100%', width: `${Math.min(spentPercent - 100, 20)}%` }}
                    />
                  )}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Committed: {formatCurrency(data.committed)}</span>
                  <span>Actual: {formatCurrency(data.actual)}</span>
                  <span className={data.variance < 0 ? 'text-red-600' : 'text-green-600'}>
                    Variance: {formatCurrency(data.variance)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

interface CostCodeTableProps {
  costCodes: CostCode[]
  filterType: CostType | 'all'
  searchTerm: string
}

function CostCodeTable({ costCodes, filterType, searchTerm }: CostCodeTableProps) {
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(new Set())

  const filteredCodes = useMemo(() => {
    let filtered = costCodes

    if (filterType !== 'all') {
      filtered = filtered.filter((cc) => cc.cost_type === filterType)
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (cc) =>
          cc.code.toLowerCase().includes(term) ||
          cc.name.toLowerCase().includes(term)
      )
    }

    return filtered.sort((a, b) => a.code.localeCompare(b.code))
  }, [costCodes, filterType, searchTerm])

  const toggleExpand = (id: string) => {
    setExpandedCodes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (filteredCodes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No cost codes found</p>
      </div>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead className="w-24">Code</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-20">Type</TableHead>
            <TableHead className="text-right w-28">Budget</TableHead>
            <TableHead className="text-right w-28">Committed</TableHead>
            <TableHead className="text-right w-28">Actual</TableHead>
            <TableHead className="text-right w-28">Variance</TableHead>
            <TableHead className="text-right w-20">% Spent</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredCodes.map((cc) => {
            const isExpanded = expandedCodes.has(cc.id)
            const varianceStatus = getVarianceStatus(cc.budget_variance, cc.revised_budget)

            return (
              <Collapsible key={cc.id} asChild>
                <>
                  <TableRow
                    className={cn(
                      'group cursor-pointer',
                      varianceStatus.status === 'over' && 'bg-red-50'
                    )}
                    onClick={() => toggleExpand(cc.id)}
                  >
                    <TableCell>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </TableCell>
                    <TableCell className="font-mono font-medium">{cc.code}</TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate">{cc.name}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {getCostTypeLabel(cc.cost_type as CostType)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(cc.revised_budget)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(cc.committed_cost)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(cc.actual_cost)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          'font-mono',
                          cc.budget_variance >= 0 ? 'text-green-600' : 'text-red-600'
                        )}
                      >
                        {cc.budget_variance >= 0 ? '+' : ''}
                        {formatCurrency(cc.budget_variance)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Progress
                          value={Math.min(cc.percent_spent, 100)}
                          className={cn(
                            'w-12 h-2',
                            cc.percent_spent > 100 && '[&>div]:bg-red-500'
                          )}
                        />
                        <span className="text-sm font-mono w-12 text-right">
                          {formatPercent(cc.percent_spent)}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                  <CollapsibleContent asChild>
                    <TableRow className="bg-muted/30">
                      <TableCell colSpan={9}>
                        <div className="py-2 px-4 grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Original Budget</p>
                            <p className="font-medium">{formatCurrency(cc.original_budget)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Revised Budget</p>
                            <p className="font-medium">{formatCurrency(cc.revised_budget)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Remaining Budget</p>
                            <p className="font-medium">
                              {formatCurrency(
                                cc.revised_budget - cc.committed_cost - cc.actual_cost
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Forecast at Completion</p>
                            <p className="font-medium">
                              {formatCurrency(cc.committed_cost + cc.actual_cost)}
                            </p>
                          </div>
                          {cc.description && (
                            <div className="col-span-4">
                              <p className="text-muted-foreground">Description</p>
                              <p>{cc.description}</p>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  </CollapsibleContent>
                </>
              </Collapsible>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

interface ForecastPanelProps {
  projectId: string
}

function ForecastPanel({ projectId }: ForecastPanelProps) {
  const { data: forecast, isLoading } = useForecastToComplete(projectId)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    )
  }

  if (!forecast) {return null}

  return (
    <Card>
      <CardHeader>
        <CardTitle>Forecast to Complete</CardTitle>
        <CardDescription>Earned Value Analysis and Cost Projections</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-muted-foreground">Contract Value</p>
            <p className="text-xl font-bold">{formatCurrency(forecast.contract_value)}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-muted-foreground">Earned to Date</p>
            <p className="text-xl font-bold">{formatCurrency(forecast.earned_to_date)}</p>
            <p className="text-xs text-muted-foreground">
              {formatPercent(forecast.percent_complete)} complete
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-muted-foreground">Estimate at Completion</p>
            <p className="text-xl font-bold">{formatCurrency(forecast.estimate_at_completion)}</p>
          </div>
          <div className={cn(
            'p-4 rounded-lg',
            forecast.projected_profit >= 0 ? 'bg-green-50' : 'bg-red-50'
          )}>
            <p className="text-sm text-muted-foreground">Projected Profit</p>
            <p className={cn(
              'text-xl font-bold',
              forecast.projected_profit >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {formatCurrency(forecast.projected_profit)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatPercent(forecast.projected_margin)} margin
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">Cost Performance Index (CPI)</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>EV / AC - Values &gt;1 indicate under budget</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Badge variant={forecast.cost_performance_index >= 1 ? 'default' : 'destructive'}>
                {forecast.cost_performance_index.toFixed(2)}
              </Badge>
            </div>
            <Progress
              value={Math.min(forecast.cost_performance_index * 50, 100)}
              className="h-2"
            />
            {forecast.is_over_budget && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Project is over budget
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">Schedule Performance Index (SPI)</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>EV / PV - Values &gt;1 indicate ahead of schedule</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Badge variant={forecast.schedule_performance_index >= 1 ? 'default' : 'destructive'}>
                {forecast.schedule_performance_index.toFixed(2)}
              </Badge>
            </div>
            <Progress
              value={Math.min(forecast.schedule_performance_index * 50, 100)}
              className="h-2"
            />
            {forecast.is_behind_schedule && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Project is behind schedule
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function JobCostingDashboard({ projectId, className }: JobCostingDashboardProps) {
  const { data: summary, isLoading: summaryLoading, error, refetch } = useJobCostSummary(projectId)
  const { data: costCodes, isLoading: codesLoading } = useCostCodes(projectId)
  const { data: committed } = useCommittedCostSummary(projectId)

  const [filterType, setFilterType] = useState<CostType | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Loading state
  if (summaryLoading || codesLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="grid gap-4 md:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
          <p className="text-lg font-medium">Error loading job costing data</p>
          <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
          <Button onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!summary) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No Job Costing Data</p>
          <p className="text-sm text-muted-foreground mb-4">
            Set up cost codes and budgets to start tracking job costs.
          </p>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Cost Codes
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Summary Cards */}
      <SummaryCards summary={summary} />

      {/* Tabs for different views */}
      <Tabs defaultValue="breakdown" className="space-y-4">
        <TabsList>
          <TabsTrigger value="breakdown">Cost Breakdown</TabsTrigger>
          <TabsTrigger value="codes">Cost Codes</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
        </TabsList>

        <TabsContent value="breakdown" className="space-y-4">
          <CostTypeBreakdown byType={summary.by_type} totalBudget={summary.total_revised_budget} />

          {/* Variance Alerts */}
          {(summary.top_over_budget.length > 0 || summary.top_under_budget.length > 0) && (
            <div className="grid md:grid-cols-2 gap-4">
              {summary.top_over_budget.length > 0 && (
                <Card className="border-red-200">
                  <CardHeader>
                    <CardTitle className="text-red-600 flex items-center gap-2">
                      <TrendingDown className="h-5 w-5" />
                      Over Budget Items
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {summary.top_over_budget.slice(0, 5).map((cc) => (
                        <div key={cc.id} className="flex justify-between items-center">
                          <div>
                            <span className="font-medium">{cc.code}</span>
                            <span className="text-sm text-muted-foreground ml-2">{cc.name}</span>
                          </div>
                          <span className="text-red-600 font-mono">
                            {formatCurrency(cc.budget_variance)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {summary.top_under_budget.length > 0 && (
                <Card className="border-green-200">
                  <CardHeader>
                    <CardTitle className="text-green-600 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Under Budget Items
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {summary.top_under_budget.slice(0, 5).map((cc) => (
                        <div key={cc.id} className="flex justify-between items-center">
                          <div>
                            <span className="font-medium">{cc.code}</span>
                            <span className="text-sm text-muted-foreground ml-2">{cc.name}</span>
                          </div>
                          <span className="text-green-600 font-mono">
                            +{formatCurrency(cc.budget_variance)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="codes" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-sm">
              <Input
                placeholder="Search cost codes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterType} onValueChange={(v) => setFilterType(v as CostType | 'all')}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="labor">Labor</SelectItem>
                <SelectItem value="material">Material</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="subcontract">Subcontract</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          {/* Cost Codes Table */}
          <CostCodeTable
            costCodes={costCodes || []}
            filterType={filterType}
            searchTerm={searchTerm}
          />
        </TabsContent>

        <TabsContent value="forecast" className="space-y-4">
          <ForecastPanel projectId={projectId} />
        </TabsContent>
      </Tabs>

      {/* Committed Costs Summary */}
      {committed && (committed.po_count > 0 || committed.subcontract_count > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Committed Costs Summary</CardTitle>
            <CardDescription>Purchase orders and subcontracts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Purchase Orders ({committed.po_count})</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Amount</span>
                    <span className="font-mono">{formatCurrency(committed.total_po_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Invoiced</span>
                    <span className="font-mono">{formatCurrency(committed.total_po_invoiced)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Paid</span>
                    <span className="font-mono">{formatCurrency(committed.total_po_paid)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Remaining</span>
                    <span className="font-mono">{formatCurrency(committed.total_po_remaining)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Subcontracts ({committed.subcontract_count})</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Amount</span>
                    <span className="font-mono">{formatCurrency(committed.total_subcontract_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Billed</span>
                    <span className="font-mono">{formatCurrency(committed.total_subcontract_billed)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Retainage</span>
                    <span className="font-mono">{formatCurrency(committed.total_subcontract_retainage)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Remaining</span>
                    <span className="font-mono">{formatCurrency(committed.total_subcontract_remaining)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default JobCostingDashboard
