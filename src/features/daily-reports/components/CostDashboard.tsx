// File: /src/features/daily-reports/components/CostDashboard.tsx
// Dashboard for displaying daily report cost aggregation data

import * as React from 'react'
import { useState, useMemo } from 'react'
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'
import {
  useLaborByCostCodeWithTotals,
  useEquipmentByCostCodeWithTotals,
  useProgressByCostCodeWithTotals,
  useDailyReportCostSummaryByDivision,
  useProjectCostStats,
} from '../hooks/useDailyReportCosts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import {
  BarChart3,
  Users,
  Truck,
  TrendingUp,
  Clock,
  DollarSign,
  Calendar,
  RefreshCw,
  AlertCircle,
  ChevronRight,
} from 'lucide-react'

interface CostDashboardProps {
  projectId: string
  onViewCostCode?: (costCode: string) => void
}

type DateRange = 'today' | 'week' | 'month' | 'custom'

export function CostDashboard({ projectId, onViewCostCode }: CostDashboardProps) {
  const [dateRange, setDateRange] = useState<DateRange>('week')

  // Calculate date filters based on range
  const dateFilters = useMemo(() => {
    const today = new Date()
    let startDate: string
    let endDate = format(today, 'yyyy-MM-dd')

    switch (dateRange) {
      case 'today':
        startDate = endDate
        break
      case 'week':
        startDate = format(subDays(today, 7), 'yyyy-MM-dd')
        break
      case 'month':
        startDate = format(startOfMonth(today), 'yyyy-MM-dd')
        endDate = format(endOfMonth(today), 'yyyy-MM-dd')
        break
      default:
        startDate = format(subDays(today, 7), 'yyyy-MM-dd')
    }

    return { projectId, startDate, endDate }
  }, [projectId, dateRange])

  // Fetch data
  const {
    data: laborData,
    isLoading: laborLoading,
    error: laborError,
  } = useLaborByCostCodeWithTotals(dateFilters)

  const {
    data: equipmentData,
    isLoading: equipmentLoading,
    error: equipmentError,
  } = useEquipmentByCostCodeWithTotals(dateFilters)

  const {
    data: progressData,
    isLoading: progressLoading,
    error: progressError,
  } = useProgressByCostCodeWithTotals(dateFilters)

  const {
    data: divisionData,
    isLoading: divisionLoading,
  } = useDailyReportCostSummaryByDivision(dateFilters)

  const {
    data: _stats,
    isLoading: statsLoading,
  } = useProjectCostStats(projectId, dateFilters.startDate, dateFilters.endDate)

  const isLoading = laborLoading || equipmentLoading || progressLoading || divisionLoading || statsLoading
  const hasError = laborError || equipmentError || progressError

  // Calculate totals
  const laborTotals = useMemo(() => {
    if (!laborData?.items) {return { hours: 0, headcount: 0, entries: 0 }}
    return laborData.items.reduce(
      (acc, item) => ({
        hours: acc.hours + (item.total_hours || 0),
        headcount: acc.headcount + (item.total_headcount || 0),
        entries: acc.entries + (item.entry_count || 0),
      }),
      { hours: 0, headcount: 0, entries: 0 }
    )
  }, [laborData])

  const equipmentTotals = useMemo(() => {
    if (!equipmentData?.items) {return { operated: 0, idle: 0, fuel: 0 }}
    return equipmentData.items.reduce(
      (acc, item) => ({
        operated: acc.operated + (item.total_operated_hours || 0),
        idle: acc.idle + (item.total_idle_hours || 0),
        fuel: acc.fuel + (item.total_fuel_used || 0),
      }),
      { operated: 0, idle: 0, fuel: 0 }
    )
  }, [equipmentData])

  const progressTotals = useMemo(() => {
    if (!progressData?.items) {return { planned: 0, actual: 0, productivity: 0 }}
    const totals = progressData.items.reduce(
      (acc, item) => ({
        planned: acc.planned + (item.total_planned_quantity || 0),
        actual: acc.actual + (item.total_actual_quantity || 0),
      }),
      { planned: 0, actual: 0 }
    )
    return {
      ...totals,
      productivity: totals.planned > 0 ? (totals.actual / totals.planned) * 100 : 0,
    }
  }, [progressData])

  if (hasError) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-2 text-destructive">
            <AlertCircle className="h-8 w-8" />
            <p>Failed to load cost data</p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with date filter */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-green-500" />
            Cost Dashboard
          </h2>
          <p className="text-muted-foreground">
            Aggregated costs from daily reports by cost code
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={dateRange} onChange={(e) => setDateRange(e.target.value as DateRange)}>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">This Month</option>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Labor Hours */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Labor Hours</p>
                <p className="text-2xl font-bold">
                  {isLoading ? '...' : laborTotals.hours.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {laborTotals.headcount} workers
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Equipment Hours */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Equipment Hours</p>
                <p className="text-2xl font-bold">
                  {isLoading ? '...' : equipmentTotals.operated.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {equipmentTotals.fuel.toFixed(0)} gal fuel
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Truck className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Production */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Production</p>
                <p className="text-2xl font-bold">
                  {isLoading ? '...' : `${progressTotals.productivity.toFixed(0)}%`}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {progressTotals.actual.toLocaleString()} / {progressTotals.planned.toLocaleString()} units
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cost Codes */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Cost Codes</p>
                <p className="text-2xl font-bold">
                  {isLoading ? '...' : (laborData?.items?.length || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {laborTotals.entries} entries
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Division Breakdown */}
      {divisionData && Object.keys(divisionData).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cost by Division</CardTitle>
            <CardDescription>Labor hours and production by CSI division</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(divisionData).map(([division, items]) => {
                const divisionTotalHours = (items as any[]).reduce(
                  (sum, item) => sum + (item.total_labor_hours || 0),
                  0
                )
                return (
                  <div
                    key={division}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/80 transition-colors"
                  >
                    <div>
                      <p className="font-medium">Division {division}</p>
                      <p className="text-sm text-muted-foreground">
                        {(items as any[]).length} cost codes
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{divisionTotalHours.toLocaleString()} hrs</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cost Code Details */}
      <Card>
        <CardHeader>
          <CardTitle>Labor by Cost Code</CardTitle>
          <CardDescription>Detailed breakdown of labor hours</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : !laborData?.items || laborData.items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No labor data for this period</p>
            </div>
          ) : (
            <div className="space-y-2">
              {laborData.items.slice(0, 10).map((item) => (
                <div
                  key={`${item.cost_code}-${item.report_date}`}
                  className="group flex items-center justify-between p-3 border rounded-lg hover:border-primary/50 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => onViewCostCode?.(item.cost_code)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium">{item.cost_code}</span>
                      {item.phase_code && (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">
                          Phase: {item.phase_code}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(item.report_date), 'MMM d, yyyy')} • {item.total_headcount} workers
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <div>
                      <p className="font-bold">{item.total_hours?.toFixed(1)} hrs</p>
                      {(item.total_overtime_hours || 0) > 0 && (
                        <p className="text-xs text-orange-600 dark:text-orange-400">
                          +{item.total_overtime_hours?.toFixed(1)} OT
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
              {laborData.items.length > 10 && (
                <p className="text-center text-sm text-muted-foreground pt-2">
                  +{laborData.items.length - 10} more cost codes
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Equipment Details */}
      <Card>
        <CardHeader>
          <CardTitle>Equipment by Cost Code</CardTitle>
          <CardDescription>Equipment usage and utilization</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : !equipmentData?.items || equipmentData.items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Truck className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No equipment data for this period</p>
            </div>
          ) : (
            <div className="space-y-2">
              {equipmentData.items.slice(0, 10).map((item) => {
                const totalHours = (item.total_operated_hours || 0) + (item.total_idle_hours || 0)
                const utilization = totalHours > 0 ? ((item.total_operated_hours || 0) / totalHours) * 100 : 0
                return (
                  <div
                    key={`${item.cost_code}-${item.report_date}`}
                    className="flex items-center justify-between p-3 border rounded-lg hover:border-primary/50 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1">
                      <span className="font-mono font-medium">{item.cost_code}</span>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(item.report_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{item.total_operated_hours?.toFixed(1)} hrs</p>
                      <p className="text-xs text-muted-foreground">
                        {utilization.toFixed(0)}% utilization
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
