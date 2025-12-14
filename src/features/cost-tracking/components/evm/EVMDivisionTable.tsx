/**
 * EVM Division Breakdown Table
 *
 * Shows EVM metrics broken down by CSI cost code division
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { EVMByDivision, EVMPerformanceStatus } from '@/types/cost-tracking'

interface EVMDivisionTableProps {
  data: EVMByDivision[] | undefined
  isLoading?: boolean
}

const STATUS_COLORS: Record<EVMPerformanceStatus | 'unknown', string> = {
  excellent: 'bg-emerald-100 text-emerald-700',
  good: 'bg-green-100 text-green-700',
  fair: 'bg-yellow-100 text-yellow-700',
  poor: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
  unknown: 'bg-gray-100 text-gray-700',
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: value >= 1000000 ? 'compact' : 'standard',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatIndex(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '—'
  return value.toFixed(2)
}

function IndexBadge({ value, type }: { value: number | null | undefined; type: 'cpi' | 'spi' }) {
  if (value === null || value === undefined || isNaN(value)) {
    return <span className="text-muted-foreground">—</span>
  }

  let status: EVMPerformanceStatus
  if (value >= 1.05) status = 'excellent'
  else if (value >= 1.0) status = 'good'
  else if (value >= 0.95) status = 'fair'
  else if (value >= 0.90) status = 'poor'
  else status = 'critical'

  return (
    <Badge variant="secondary" className={cn('font-mono', STATUS_COLORS[status])}>
      {value.toFixed(2)}
    </Badge>
  )
}

function TableRowSkeleton() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
    </TableRow>
  )
}

export function EVMDivisionTable({ data, isLoading }: EVMDivisionTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Division</TableHead>
                <TableHead className="text-right">BAC</TableHead>
                <TableHead className="text-right">AC</TableHead>
                <TableHead className="text-right">CPI</TableHead>
                <TableHead className="text-right">SPI</TableHead>
                <TableHead className="text-right">CV</TableHead>
                <TableHead className="text-right">EAC</TableHead>
                <TableHead>Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRowSkeleton key={i} />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    )
  }

  if (!data?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">EVM by Division</CardTitle>
          <CardDescription>Performance breakdown by cost code division</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No division breakdown available</p>
          <p className="text-xs mt-1">Assign cost codes to budget items to see division analysis</p>
        </CardContent>
      </Card>
    )
  }

  // Calculate totals
  const totals = data.reduce(
    (acc, div) => ({
      BAC: acc.BAC + div.BAC,
      AC: acc.AC + div.AC,
      EV: acc.EV + div.EV,
      CV: acc.CV + div.CV,
      EAC: acc.EAC + div.EAC,
    }),
    { BAC: 0, AC: 0, EV: 0, CV: 0, EAC: 0 }
  )

  const totalCPI = totals.AC > 0 ? totals.EV / totals.AC : 0
  const totalProgress = totals.BAC > 0 ? (totals.EV / totals.BAC) * 100 : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">EVM by Division</CardTitle>
        <CardDescription>Performance breakdown by CSI cost code division</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Division</TableHead>
                <TableHead className="text-right">BAC</TableHead>
                <TableHead className="text-right">Actual Cost</TableHead>
                <TableHead className="text-right">CPI</TableHead>
                <TableHead className="text-right">SPI</TableHead>
                <TableHead className="text-right">Cost Variance</TableHead>
                <TableHead className="text-right">EAC</TableHead>
                <TableHead className="min-w-[120px]">Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((division) => (
                <TableRow key={division.division}>
                  <TableCell>
                    <div>
                      <span className="font-medium">
                        {division.division} - {division.division_name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatCurrency(division.BAC)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatCurrency(division.AC)}
                  </TableCell>
                  <TableCell className="text-right">
                    <IndexBadge value={division.CPI} type="cpi" />
                  </TableCell>
                  <TableCell className="text-right">
                    <IndexBadge value={division.SPI} type="spi" />
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right font-mono text-sm',
                      division.CV >= 0 ? 'text-green-600' : 'text-red-600'
                    )}
                  >
                    {division.CV >= 0 ? '+' : ''}
                    {formatCurrency(division.CV)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatCurrency(division.EAC)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={Math.min(100, division.percent_complete)}
                        className="h-2 flex-1"
                      />
                      <span className="text-xs font-mono w-12 text-right">
                        {division.percent_complete.toFixed(0)}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {/* Totals row */}
              <TableRow className="bg-muted/50 font-medium">
                <TableCell>Total</TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatCurrency(totals.BAC)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatCurrency(totals.AC)}
                </TableCell>
                <TableCell className="text-right">
                  <IndexBadge value={totalCPI} type="cpi" />
                </TableCell>
                <TableCell className="text-right">—</TableCell>
                <TableCell
                  className={cn(
                    'text-right font-mono text-sm',
                    totals.CV >= 0 ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {totals.CV >= 0 ? '+' : ''}
                  {formatCurrency(totals.CV)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatCurrency(totals.EAC)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={Math.min(100, totalProgress)}
                      className="h-2 flex-1"
                    />
                    <span className="text-xs font-mono w-12 text-right">
                      {totalProgress.toFixed(0)}%
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

export default EVMDivisionTable
