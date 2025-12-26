// File: /src/features/checklists/components/ChecklistFailureTrendReport.tsx
// Dashboard for checklist failure trend analysis

import { useState } from 'react'
import { useChecklistFailureAnalytics } from '../hooks/useChecklistFailureAnalytics'
import { getDateRangeFromPreset } from '@/lib/api/services/checklist-failure-analytics'
import type { DateRangePreset, FailureFrequency } from '@/types/checklist-failure-analytics'
import { downloadFailureTrendAsCSV, downloadFailureTrendAsPDF } from '../utils/failureTrendExport'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Minus,
  FileText,
  CheckCircle2,
  Download,
  Calendar,
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { logger } from '../../../lib/utils/logger';


interface ChecklistFailureTrendReportProps {
  projectId: string
  projectName?: string
  templateId?: string
  templateName?: string
  className?: string
}

export function ChecklistFailureTrendReport({
  projectId,
  projectName = 'Project',
  templateId,
  templateName,
  className,
}: ChecklistFailureTrendReportProps) {
  const [dateRange, setDateRange] = useState<DateRangePreset>('last_90_days')
  const [selectedLocation, setSelectedLocation] = useState<string>()
  const [isExporting, setIsExporting] = useState(false)

  const dateRangeValues = getDateRangeFromPreset(dateRange)

  const { data, isLoading, error } = useChecklistFailureAnalytics({
    projectId,
    templateId,
    dateFrom: dateRangeValues?.from,
    dateTo: dateRangeValues?.to,
    location: selectedLocation,
  })

  const handleExport = async (format: 'csv' | 'pdf') => {
    if (!data) {return}

    setIsExporting(true)
    try {
      if (format === 'csv') {
        downloadFailureTrendAsCSV(data, projectName, dateRange, templateName)
      } else {
        await downloadFailureTrendAsPDF(data, projectName, dateRange, templateName)
      }
    } catch (err) {
      logger.error('Export failed:', err)
    } finally {
      setIsExporting(false)
    }
  }

  if (isLoading) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-sm text-secondary">Loading analytics...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center text-error">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>Failed to load analytics</p>
              <p className="text-sm text-secondary mt-1">{(error as Error).message}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className={className}>
      {/* Header with filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold heading-section">Checklist Failure Trend Analysis</h2>
          <p className="text-secondary mt-1">
            Identify recurring quality issues and improvement opportunities
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRangePreset)}>
            <SelectTrigger className="w-[160px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_7_days">Last 7 Days</SelectItem>
              <SelectItem value="last_30_days">Last 30 Days</SelectItem>
              <SelectItem value="last_90_days">Last 90 Days</SelectItem>
              <SelectItem value="last_6_months">Last 6 Months</SelectItem>
              <SelectItem value="last_year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isExporting || !data}>
                <Download className="mr-2 h-4 w-4" />
                {isExporting ? 'Exporting...' : 'Export'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <FileText className="mr-2 h-4 w-4" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <FileText className="mr-2 h-4 w-4" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          title="Total Failures"
          value={data.summary.totalFailures}
          trend={data.summary.trend}
          icon={<AlertCircle className="h-5 w-5" />}
          iconColor="text-error"
        />
        <SummaryCard
          title="Failure Rate"
          value={`${data.summary.failureRate}%`}
          trend={data.summary.trend}
          icon={<TrendingDown className="h-5 w-5" />}
          iconColor="text-orange-600"
        />
        <SummaryCard
          title="Unique Failed Items"
          value={data.summary.uniqueFailedItems}
          icon={<FileText className="h-5 w-5" />}
          iconColor="text-primary"
        />
        <SummaryCard
          title="Total Inspections"
          value={data.summary.totalExecutions}
          icon={<CheckCircle2 className="h-5 w-5" />}
          iconColor="text-success"
        />
      </div>

      {/* Tabs for Different Views */}
      <Tabs defaultValue="frequency" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="frequency">Top Failures</TabsTrigger>
          <TabsTrigger value="trends">Trends Over Time</TabsTrigger>
          <TabsTrigger value="temporal">Time Patterns</TabsTrigger>
          <TabsTrigger value="clusters">Item Clusters</TabsTrigger>
        </TabsList>

        <TabsContent value="frequency">
          <FailureFrequencyTable data={data.frequency} />
        </TabsContent>

        <TabsContent value="trends">
          <FailureTrendChart data={data.trends.data} movingAverage={data.trends.movingAverage} />
        </TabsContent>

        <TabsContent value="temporal">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Failures by Hour of Day</CardTitle>
              </CardHeader>
              <CardContent>
                <HourOfDayChart data={data.temporal.byHour} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Failures by Day of Week</CardTitle>
              </CardHeader>
              <CardContent>
                <DayOfWeekChart data={data.temporal.byDayOfWeek} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="clusters">
          <FailureClustersList data={data.clusters} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Supporting Components

interface SummaryCardProps {
  title: string
  value: string | number
  trend?: 'improving' | 'declining' | 'stable'
  icon: React.ReactNode
  iconColor?: string
}

function SummaryCard({ title, value, trend, icon, iconColor }: SummaryCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-secondary">{title}</p>
            <p className="text-2xl font-bold mt-2">{value}</p>
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                <TrendBadge trend={trend} />
              </div>
            )}
          </div>
          <div className={`${iconColor || 'text-disabled'}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function TrendBadge({ trend }: { trend: 'improving' | 'declining' | 'stable' }) {
  if (trend === 'improving') {
    return (
      <Badge variant="outline" className="text-success border-success">
        <TrendingUp className="h-3 w-3 mr-1" />
        Improving
      </Badge>
    )
  }

  if (trend === 'declining') {
    return (
      <Badge variant="outline" className="text-error border-error">
        <TrendingDown className="h-3 w-3 mr-1" />
        Declining
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="text-secondary border-gray-600">
      <Minus className="h-3 w-3 mr-1" />
      Stable
    </Badge>
  )
}

function FailureFrequencyTable({ data }: { data: FailureFrequency[] }) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-muted">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No failure data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Most Frequently Failed Items</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Section</TableHead>
              <TableHead className="text-right">Failures</TableHead>
              <TableHead className="text-right">Failure Rate</TableHead>
              <TableHead>Trend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.slice(0, 20).map((item) => (
              <TableRow key={item.templateItemId}>
                <TableCell className="font-medium">{item.itemLabel}</TableCell>
                <TableCell>{item.section}</TableCell>
                <TableCell className="text-right">{item.failureCount}</TableCell>
                <TableCell className="text-right">{item.failureRate.toFixed(1)}%</TableCell>
                <TableCell>
                  <TrendBadge trend={item.trend} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function FailureTrendChart({
  data,
  movingAverage,
}: {
  data: Array<{ date: string; count: number; rate: number }>
  movingAverage: number[]
}) {
  const chartData = data.map((d, index) => ({
    date: d.date,
    failures: d.count,
    rate: d.rate,
    movingAvg: movingAverage[index],
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Failure Trends Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="failures" stroke="#ef4444" name="Failures" />
            <Line
              type="monotone"
              dataKey="movingAvg"
              stroke="#3b82f6"
              strokeDasharray="5 5"
              name="Moving Average"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function HourOfDayChart({ data }: { data: Array<{ period: string | number; count: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="period" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="count" fill="#3b82f6" name="Failures" />
      </BarChart>
    </ResponsiveContainer>
  )
}

function DayOfWeekChart({ data }: { data: Array<{ period: string; count: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="period" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="count" fill="#10b981" name="Failures" />
      </BarChart>
    </ResponsiveContainer>
  )
}

function FailureClustersList({
  data,
}: {
  data: Array<{ items: string[]; coOccurrenceCount: number; coOccurrenceRate: number }>
}) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-muted">
            <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No failure clusters detected</p>
            <p className="text-sm mt-1">Items need to fail together at least 3 times</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Items That Frequently Fail Together</CardTitle>
        <p className="text-sm text-secondary mt-1">
          These items often fail in the same inspection, suggesting related issues
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((cluster, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-medium mb-2 heading-card">Cluster #{index + 1}</h4>
                  <div className="flex flex-wrap gap-2">
                    {cluster.items.map((item, i) => (
                      <Badge key={i} variant="secondary">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-2xl font-bold">{cluster.coOccurrenceCount}</div>
                  <div className="text-sm text-secondary">occurrences</div>
                  <div className="text-sm text-secondary mt-1">
                    {cluster.coOccurrenceRate.toFixed(1)}% rate
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
