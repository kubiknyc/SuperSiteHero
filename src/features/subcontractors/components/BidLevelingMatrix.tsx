/**
 * BidLevelingMatrix Component
 * Spreadsheet-style comparison of bids with line item detail
 */

import { useState, useMemo, useCallback } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Award,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Filter,
  Flag,
  Loader2,
  Minus,
  TrendingDown,
  TrendingUp,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useBidLevelingMatrix,
  useBidRecommendation,
  useExportBidLeveling,
  formatBidCurrency,
  getPriceVarianceStatus,
} from '../hooks'
import type { BidLevelingMatrix as BidLevelingMatrixType, BidLevelingLineItem } from '../types'
import { cn } from '@/lib/utils'

interface BidLevelingMatrixProps {
  packageId: string
  onAwardBid?: (submissionId: string) => void
  canAward?: boolean
}

type ViewMode = 'summary' | 'detailed'

export function BidLevelingMatrix({
  packageId,
  onAwardBid,
  canAward = false,
}: BidLevelingMatrixProps) {
  const { data: matrix, isLoading } = useBidLevelingMatrix(packageId)
  const { data: recommendation } = useBidRecommendation(packageId)
  const exportMutation = useExportBidLeveling()

  const [viewMode, setViewMode] = useState<ViewMode>('summary')
  const [showExclusions, setShowExclusions] = useState(true)
  const [highlightVariance, setHighlightVariance] = useState(10)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [selectedBidders, setSelectedBidders] = useState<Set<string>>(new Set())

  // Toggle row expansion
  const toggleRow = useCallback((rowId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(rowId)) {
        next.delete(rowId)
      } else {
        next.add(rowId)
      }
      return next
    })
  }, [])

  // Toggle bidder selection
  const toggleBidder = useCallback((bidderId: string) => {
    setSelectedBidders((prev) => {
      const next = new Set(prev)
      if (next.has(bidderId)) {
        next.delete(bidderId)
      } else {
        next.add(bidderId)
      }
      return next
    })
  }, [])

  // Filter bidders
  const visibleSubmissions = useMemo(() => {
    if (!matrix) return []
    if (selectedBidders.size === 0) return matrix.submissions
    return matrix.submissions.filter((s) => selectedBidders.has(s.id))
  }, [matrix, selectedBidders])

  // Handle export
  const handleExport = useCallback((format: 'xlsx' | 'csv' | 'pdf') => {
    exportMutation.mutate({
      packageId,
      options: {
        format,
        includeLineItems: viewMode === 'detailed',
        includeAlternates: true,
        includeExclusions: showExclusions,
        includeCharts: format === 'pdf',
      },
    })
  }, [packageId, viewMode, showExclusions, exportMutation])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!matrix || matrix.submissions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bid Leveling Matrix
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No bids available for leveling</p>
            <p className="text-sm mt-1">Bids will appear here once received</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bid Leveling Matrix
          </CardTitle>
          <CardDescription>
            Compare {matrix.summary.totalBids} bids for {matrix.packageName}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex rounded-md border">
            <Button
              variant={viewMode === 'summary' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-r-none"
              onClick={() => setViewMode('summary')}
            >
              Summary
            </Button>
            <Button
              variant={viewMode === 'detailed' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-l-none"
              onClick={() => setViewMode('detailed')}
            >
              Detailed
            </Button>
          </div>

          {/* Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Show Bidders</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {matrix.submissions.map((sub) => (
                <DropdownMenuItem
                  key={sub.id}
                  onSelect={(e) => {
                    e.preventDefault()
                    toggleBidder(sub.id)
                  }}
                >
                  <Checkbox
                    checked={selectedBidders.size === 0 || selectedBidders.has(sub.id)}
                    className="mr-2"
                  />
                  {sub.bidderName}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setSelectedBidders(new Set())}>
                Show All
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <StatCard
            label="Low Bid"
            value={formatBidCurrency(matrix.summary.lowBid)}
            variant="success"
          />
          <StatCard
            label="High Bid"
            value={formatBidCurrency(matrix.summary.highBid)}
            variant="error"
          />
          <StatCard
            label="Average"
            value={formatBidCurrency(matrix.summary.averageBid)}
          />
          <StatCard
            label="Spread"
            value={`${matrix.summary.spreadPercent.toFixed(1)}%`}
            variant={matrix.summary.spreadPercent > 20 ? 'warning' : 'default'}
          />
          {matrix.summary.estimatedValue && (
            <StatCard
              label="Estimate"
              value={formatBidCurrency(matrix.summary.estimatedValue)}
              variant="info"
            />
          )}
          {matrix.summary.varianceFromEstimate !== null && (
            <StatCard
              label="vs Estimate"
              value={`${matrix.summary.varianceFromEstimate > 0 ? '+' : ''}${matrix.summary.varianceFromEstimate.toFixed(1)}%`}
              variant={matrix.summary.varianceFromEstimate < 0 ? 'success' : 'error'}
              icon={matrix.summary.varianceFromEstimate < 0 ? TrendingDown : TrendingUp}
            />
          )}
        </div>

        {/* Recommendation */}
        {recommendation && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Award className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Award Recommendation</p>
                  <p className="text-sm text-muted-foreground">
                    {recommendation.bidderName}: {recommendation.reason}
                  </p>
                </div>
                {canAward && onAwardBid && (
                  <Button
                    size="sm"
                    className="ml-auto"
                    onClick={() => onAwardBid(recommendation.submissionId)}
                  >
                    Award Bid
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Matrix Table */}
        <ScrollArea className="w-full">
          <div className="min-w-[800px]">
            {viewMode === 'summary' ? (
              <SummaryView
                matrix={matrix}
                visibleSubmissions={visibleSubmissions}
                onAwardBid={onAwardBid}
                canAward={canAward}
              />
            ) : (
              <DetailedView
                matrix={matrix}
                visibleSubmissions={visibleSubmissions}
                expandedRows={expandedRows}
                onToggleRow={toggleRow}
                highlightVariance={highlightVariance}
              />
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Exclusions */}
        {showExclusions && matrix.exclusions.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Flag className="h-4 w-4 text-warning" />
                  Scope Exclusions ({matrix.exclusions.length} bidders)
                </span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <div className="grid gap-4 md:grid-cols-2">
                {matrix.exclusions.map((exc) => (
                  <Card key={exc.submissionId}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{exc.bidderName}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-sm space-y-1">
                        {exc.exclusions.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <XCircle className="h-3 w-3 mt-1 text-error shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  )
}

// =============================================
// Sub-components
// =============================================

interface StatCardProps {
  label: string
  value: string
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info'
  icon?: typeof TrendingUp
}

function StatCard({ label, value, variant = 'default', icon: Icon }: StatCardProps) {
  const variantClasses = {
    default: '',
    success: 'text-success',
    error: 'text-error',
    warning: 'text-warning',
    info: 'text-primary',
  }

  return (
    <div className="bg-muted/50 rounded-lg p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('text-lg font-semibold flex items-center gap-1', variantClasses[variant])}>
        {Icon && <Icon className="h-4 w-4" />}
        {value}
      </p>
    </div>
  )
}

interface SummaryViewProps {
  matrix: BidLevelingMatrixType
  visibleSubmissions: BidLevelingMatrixType['submissions']
  onAwardBid?: (submissionId: string) => void
  canAward: boolean
}

function SummaryView({ matrix, visibleSubmissions, onAwardBid, canAward }: SummaryViewProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">Rank</TableHead>
          <TableHead>Bidder</TableHead>
          <TableHead className="text-right">Base Bid</TableHead>
          <TableHead className="text-right">Alternates</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead className="text-right">vs Low</TableHead>
          {matrix.summary.estimatedValue && (
            <TableHead className="text-right">vs Estimate</TableHead>
          )}
          <TableHead className="text-center">Status</TableHead>
          {canAward && <TableHead className="w-24" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {visibleSubmissions.map((sub) => (
          <TableRow
            key={sub.id}
            className={cn(sub.rank === 1 && 'bg-success/5')}
          >
            <TableCell>
              <RankBadge rank={sub.rank} />
            </TableCell>
            <TableCell>
              <div>
                <p className="font-medium">{sub.bidderName}</p>
                {sub.bidderContact && (
                  <p className="text-xs text-muted-foreground">{sub.bidderContact}</p>
                )}
              </div>
            </TableCell>
            <TableCell className={cn('text-right font-mono', sub.rank === 1 && 'text-success font-semibold')}>
              {formatBidCurrency(sub.baseBidAmount)}
            </TableCell>
            <TableCell className="text-right font-mono text-muted-foreground">
              {sub.alternatesTotal > 0 ? formatBidCurrency(sub.alternatesTotal) : '-'}
            </TableCell>
            <TableCell className="text-right font-mono">
              {formatBidCurrency(sub.totalBidAmount)}
            </TableCell>
            <TableCell className={cn('text-right', getVarianceColorClass(sub.varianceFromLow))}>
              {sub.varianceFromLow > 0 ? `+${sub.varianceFromLow.toFixed(1)}%` : '-'}
            </TableCell>
            {matrix.summary.estimatedValue && (
              <TableCell className={cn('text-right', sub.varianceFromEstimate !== null && (sub.varianceFromEstimate < 0 ? 'text-success' : 'text-error'))}>
                {sub.varianceFromEstimate !== null
                  ? `${sub.varianceFromEstimate > 0 ? '+' : ''}${sub.varianceFromEstimate.toFixed(1)}%`
                  : '-'}
              </TableCell>
            )}
            <TableCell className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Badge variant={sub.isQualified ? 'default' : 'secondary'}>
                  {sub.status}
                </Badge>
                {sub.isLate && <Badge variant="destructive">Late</Badge>}
              </div>
            </TableCell>
            {canAward && (
              <TableCell>
                {sub.status !== 'awarded' && onAwardBid && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAwardBid(sub.id)}
                  >
                    Award
                  </Button>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

interface DetailedViewProps {
  matrix: BidLevelingMatrixType
  visibleSubmissions: BidLevelingMatrixType['submissions']
  expandedRows: Set<string>
  onToggleRow: (id: string) => void
  highlightVariance: number
}

function DetailedView({
  matrix,
  visibleSubmissions,
  expandedRows,
  onToggleRow,
  highlightVariance,
}: DetailedViewProps) {
  if (matrix.lineItems.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No line items defined for detailed comparison
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8" />
          <TableHead className="w-16">Item</TableHead>
          <TableHead className="min-w-[200px]">Description</TableHead>
          <TableHead className="w-16">Unit</TableHead>
          <TableHead className="w-16 text-right">Qty</TableHead>
          {visibleSubmissions.map((sub) => (
            <TableHead key={sub.id} className="text-right min-w-[120px]">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="font-medium">
                    {sub.bidderName.length > 15
                      ? `${sub.bidderName.substring(0, 15)}...`
                      : sub.bidderName}
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{sub.bidderName}</p>
                    <p className="text-xs text-muted-foreground">Rank #{sub.rank}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TableHead>
          ))}
          <TableHead className="text-right w-24">Low</TableHead>
          <TableHead className="text-right w-24">High</TableHead>
          <TableHead className="text-right w-24">Avg</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {matrix.lineItems.map((item) => (
          <LineItemRow
            key={item.id}
            item={item}
            submissions={visibleSubmissions}
            isExpanded={expandedRows.has(item.id)}
            onToggle={() => onToggleRow(item.id)}
            highlightVariance={highlightVariance}
          />
        ))}
        {/* Totals Row */}
        <TableRow className="bg-muted/50 font-semibold">
          <TableCell />
          <TableCell />
          <TableCell>TOTAL</TableCell>
          <TableCell />
          <TableCell />
          {visibleSubmissions.map((sub) => (
            <TableCell key={sub.id} className={cn('text-right font-mono', sub.rank === 1 && 'text-success')}>
              {formatBidCurrency(sub.baseBidAmount)}
            </TableCell>
          ))}
          <TableCell className="text-right font-mono text-success">
            {formatBidCurrency(matrix.summary.lowBid)}
          </TableCell>
          <TableCell className="text-right font-mono text-error">
            {formatBidCurrency(matrix.summary.highBid)}
          </TableCell>
          <TableCell className="text-right font-mono">
            {formatBidCurrency(matrix.summary.averageBid)}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  )
}

interface LineItemRowProps {
  item: BidLevelingLineItem
  submissions: BidLevelingMatrixType['submissions']
  isExpanded: boolean
  onToggle: () => void
  highlightVariance: number
}

function LineItemRow({
  item,
  submissions,
  isExpanded,
  onToggle,
  highlightVariance,
}: LineItemRowProps) {
  return (
    <>
      <TableRow className="hover:bg-muted/30">
        <TableCell>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onToggle}>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </TableCell>
        <TableCell className="font-mono text-xs">{item.itemNumber}</TableCell>
        <TableCell>
          <span className="line-clamp-2">{item.description}</span>
        </TableCell>
        <TableCell className="text-muted-foreground">{item.unit || '-'}</TableCell>
        <TableCell className="text-right font-mono text-muted-foreground">
          {item.quantity || '-'}
        </TableCell>
        {submissions.map((sub) => {
          const cellData = item.submissions.find((s) => s.submissionId === sub.id)
          return (
            <TableCell key={sub.id} className="text-right">
              <LineItemCell
                data={cellData}
                highlightVariance={highlightVariance}
              />
            </TableCell>
          )
        })}
        <TableCell className="text-right font-mono text-success">
          {item.lowestPrice !== null ? formatBidCurrency(item.lowestPrice) : '-'}
        </TableCell>
        <TableCell className="text-right font-mono text-error">
          {item.highestPrice !== null ? formatBidCurrency(item.highestPrice) : '-'}
        </TableCell>
        <TableCell className="text-right font-mono text-muted-foreground">
          {item.averagePrice !== null ? formatBidCurrency(item.averagePrice) : '-'}
        </TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow className="bg-muted/20">
          <TableCell colSpan={5 + submissions.length + 3} className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {item.estimatedPrice && (
                <div>
                  <p className="text-muted-foreground">Estimated Price</p>
                  <p className="font-medium">{formatBidCurrency(item.estimatedPrice)}</p>
                </div>
              )}
              {item.submissions.some((s) => s.notes) && (
                <div className="col-span-2">
                  <p className="text-muted-foreground mb-1">Bidder Notes</p>
                  {item.submissions
                    .filter((s) => s.notes)
                    .map((s) => (
                      <p key={s.submissionId} className="text-xs">
                        <span className="font-medium">{s.bidderName}:</span> {s.notes}
                      </p>
                    ))}
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

interface LineItemCellProps {
  data?: BidLevelingLineItem['submissions'][0]
  highlightVariance: number
}

function LineItemCell({ data, highlightVariance }: LineItemCellProps) {
  if (!data) return <span className="text-muted-foreground">-</span>

  if (!data.isIncluded) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="outline" className="text-warning border-warning">
              Excl
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Not included in scope</p>
            {data.notes && <p className="text-xs mt-1">{data.notes}</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  if (data.totalPrice === null) {
    return <span className="text-muted-foreground">-</span>
  }

  const varianceStatus = getPriceVarianceStatus(data.varianceFromLowest)

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <span
            className={cn(
              'font-mono',
              data.isLowest && 'text-success font-semibold',
              data.isHighest && 'text-error',
              varianceStatus === 'high' && data.varianceFromLowest > highlightVariance && 'text-warning',
              varianceStatus === 'extreme' && 'text-error'
            )}
          >
            {formatBidCurrency(data.totalPrice)}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p>{data.bidderName}</p>
            {data.unitPrice && (
              <p className="text-xs">Unit: {formatBidCurrency(data.unitPrice)}</p>
            )}
            {data.varianceFromLowest > 0 && (
              <p className="text-xs text-muted-foreground">
                +{data.varianceFromLowest.toFixed(1)}% from low
              </p>
            )}
            {data.notes && <p className="text-xs italic">{data.notes}</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <Badge className="bg-success text-success-foreground">
        1st
      </Badge>
    )
  }
  if (rank === 2) {
    return <Badge variant="secondary">2nd</Badge>
  }
  if (rank === 3) {
    return <Badge variant="outline">3rd</Badge>
  }
  return <span className="text-sm text-muted-foreground">#{rank}</span>
}

function getVarianceColorClass(variance: number): string {
  if (variance <= 0) return ''
  if (variance <= 5) return 'text-muted-foreground'
  if (variance <= 10) return 'text-warning'
  if (variance <= 20) return 'text-orange-600'
  return 'text-error'
}
