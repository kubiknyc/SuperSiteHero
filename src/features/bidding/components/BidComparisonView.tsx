/**
 * BidComparisonView
 * Bid leveling and comparison visualization
 */

import { useState, useMemo } from 'react'
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Check,
  DollarSign,
  Download,
  Loader2,
  Medal,
  Minus,
  Star,
  TrendingDown,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useBidSubmissions } from '@/features/bidding/hooks/useBidding'
import {
  formatBidAmount,
  calculateBidSpread,
  type BidSubmission,
  type BidSubmissionWithDetails,
} from '@/types/bidding'
import { cn } from '@/lib/utils'

interface BidComparisonViewProps {
  packageId: string
  estimatedValue?: number | null
  onAwardBid?: (submissionId: string) => void
  canAward?: boolean
}

type SortField = 'amount' | 'rank' | 'company' | 'variance'
type SortDirection = 'asc' | 'desc'

function getRankIcon(rank: number) {
  if (rank === 1) {return <Trophy className="w-4 h-4 text-warning" />}
  if (rank === 2) {return <Medal className="w-4 h-4 text-disabled" />}
  if (rank === 3) {return <Medal className="w-4 h-4 text-warning" />}
  return <span className="text-sm font-medium">#{rank}</span>
}

function getVarianceColor(variance: number): string {
  if (variance <= 0) {return 'text-success'}
  if (variance <= 5) {return 'text-warning'}
  if (variance <= 10) {return 'text-orange-600'}
  return 'text-error'
}

interface BidBarProps {
  submission: BidSubmissionWithDetails
  maxBid: number
  lowBid: number
  estimatedValue?: number | null
}

function BidBar({ submission, maxBid, lowBid, estimatedValue }: BidBarProps) {
  const percentage = maxBid > 0 ? (submission.base_bid_amount / maxBid) * 100 : 0
  const isLow = submission.base_bid_amount === lowBid
  const varianceFromLow = lowBid > 0
    ? ((submission.base_bid_amount - lowBid) / lowBid) * 100
    : 0
  const varianceFromEstimate = estimatedValue
    ? ((submission.base_bid_amount - estimatedValue) / estimatedValue) * 100
    : null

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className={cn('font-medium', isLow && 'text-success')}>
            {submission.bidder_company_name}
          </span>
          {isLow && <Badge variant="default" className="text-xs bg-success">Low Bid</Badge>}
          {submission.is_late && <Badge variant="destructive" className="text-xs">Late</Badge>}
        </div>
        <div className="flex items-center gap-4 text-muted-foreground">
          <span className={cn('font-semibold', isLow ? 'text-success' : 'text-foreground')}>
            {formatBidAmount(submission.base_bid_amount)}
          </span>
          {varianceFromLow > 0 && (
            <span className={cn('text-xs', getVarianceColor(varianceFromLow))}>
              +{varianceFromLow.toFixed(1)}%
            </span>
          )}
        </div>
      </div>
      <div className="relative">
        <Progress value={percentage} className="h-6" />
        {estimatedValue && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-blue-500"
            style={{ left: `${Math.min((estimatedValue / maxBid) * 100, 100)}%` }}
            title={`Estimate: ${formatBidAmount(estimatedValue)}`}
          />
        )}
      </div>
    </div>
  )
}

interface BidSortIconProps {
  field: SortField
  sortField: SortField
  sortDirection: SortDirection
}

function BidSortIcon({ field, sortField, sortDirection }: BidSortIconProps) {
  if (sortField !== field) {return <Minus className="w-3 h-3 opacity-30" />}
  return sortDirection === 'asc' ? (
    <ArrowUp className="w-3 h-3" />
  ) : (
    <ArrowDown className="w-3 h-3" />
  )
}

export function BidComparisonView({
  packageId,
  estimatedValue,
  onAwardBid,
  canAward = false,
}: BidComparisonViewProps) {
  const { data: submissions, isLoading } = useBidSubmissions(packageId)
  const [sortField, setSortField] = useState<SortField>('amount')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table')

  // Filter to only qualified bids
  const qualifiedBids = useMemo(() => {
    if (!submissions) {return []}
    return submissions.filter((s) =>
      ['received', 'under_review', 'qualified', 'shortlisted'].includes(s.status)
    )
  }, [submissions])

  // Calculate statistics
  const stats = useMemo(() => {
    if (qualifiedBids.length === 0) {return null}

    const amounts = qualifiedBids.map((b) => b.base_bid_amount)
    const low = Math.min(...amounts)
    const high = Math.max(...amounts)
    const average = amounts.reduce((a, b) => a + b, 0) / amounts.length
    const spread = calculateBidSpread(low, high)

    return { low, high, average, spread, count: qualifiedBids.length }
  }, [qualifiedBids])

  // Sort submissions
  const sortedBids = useMemo(() => {
    if (qualifiedBids.length === 0) {return []}

    const sorted = [...qualifiedBids]

    // Add rank based on bid amount
    sorted.sort((a, b) => a.base_bid_amount - b.base_bid_amount)
    const withRank = sorted.map((bid, index) => ({
      ...bid,
      rank: index + 1,
      varianceFromLow: stats ? ((bid.base_bid_amount - stats.low) / stats.low) * 100 : 0,
      varianceFromEstimate: estimatedValue
        ? ((bid.base_bid_amount - estimatedValue) / estimatedValue) * 100
        : null,
    }))

    // Re-sort by selected field
    return withRank.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'amount':
          comparison = a.base_bid_amount - b.base_bid_amount
          break
        case 'rank':
          comparison = a.rank - b.rank
          break
        case 'company':
          comparison = a.bidder_company_name.localeCompare(b.bidder_company_name)
          break
        case 'variance':
          comparison = a.varianceFromLow - b.varianceFromLow
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [qualifiedBids, sortField, sortDirection, stats, estimatedValue])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!qualifiedBids || qualifiedBids.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Bid Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No bids available for comparison</p>
            <p className="text-sm mt-1">Bids will appear here once received</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Bid Comparison
          </CardTitle>
          <CardDescription>
            Compare and analyze {stats?.count} received bids
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select value={viewMode} onValueChange={(v) => setViewMode(v as 'table' | 'chart')}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="table">Table View</SelectItem>
              <SelectItem value="chart">Chart View</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Low Bid</div>
                <div className="text-xl font-semibold text-success">
                  {formatBidAmount(stats.low)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">High Bid</div>
                <div className="text-xl font-semibold text-error">
                  {formatBidAmount(stats.high)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Average</div>
                <div className="text-xl font-semibold">
                  {formatBidAmount(stats.average)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Spread</div>
                <div className="text-xl font-semibold">
                  {stats.spread.toFixed(1)}%
                </div>
              </CardContent>
            </Card>
            {estimatedValue && (
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">vs Estimate</div>
                  <div className={cn(
                    'text-xl font-semibold flex items-center gap-1',
                    stats.low < estimatedValue ? 'text-success' : 'text-error'
                  )}>
                    {stats.low < estimatedValue ? (
                      <TrendingDown className="w-4 h-4" />
                    ) : (
                      <TrendingUp className="w-4 h-4" />
                    )}
                    {(((stats.low - estimatedValue) / estimatedValue) * 100).toFixed(1)}%
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Chart View */}
        {viewMode === 'chart' && stats && (
          <div className="space-y-4">
            {estimatedValue && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-4 h-0.5 bg-blue-500" />
                <span>Estimated Value: {formatBidAmount(estimatedValue)}</span>
              </div>
            )}
            {sortedBids.map((bid) => (
              <BidBar
                key={bid.id}
                submission={bid}
                maxBid={stats.high}
                lowBid={stats.low}
                estimatedValue={estimatedValue}
              />
            ))}
          </div>
        )}

        {/* Table View */}
        {viewMode === 'table' && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 w-16"
                  onClick={() => handleSort('rank')}
                >
                  <div className="flex items-center gap-1">
                    Rank
                    <BidSortIcon field="rank" sortField={sortField} sortDirection={sortDirection} />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('company')}
                >
                  <div className="flex items-center gap-1">
                    Bidder
                    <BidSortIcon field="company" sortField={sortField} sortDirection={sortDirection} />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 text-right"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Base Bid
                    <BidSortIcon field="amount" sortField={sortField} sortDirection={sortDirection} />
                  </div>
                </TableHead>
                <TableHead className="text-right">Alternates</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 text-right"
                  onClick={() => handleSort('variance')}
                >
                  <div className="flex items-center justify-end gap-1">
                    vs Low
                    <BidSortIcon field="variance" sortField={sortField} sortDirection={sortDirection} />
                  </div>
                </TableHead>
                {estimatedValue && <TableHead className="text-right">vs Estimate</TableHead>}
                <TableHead className="text-center">Status</TableHead>
                {canAward && <TableHead className="w-24"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedBids.map((bid) => (
                <TableRow key={bid.id} className={cn(bid.rank === 1 && 'bg-success-light')}>
                  <TableCell>
                    <div className="flex items-center justify-center">
                      {getRankIcon(bid.rank)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{bid.bidder_company_name}</div>
                      {bid.bidder_contact_name && (
                        <div className="text-xs text-muted-foreground">
                          {bid.bidder_contact_name}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className={cn('text-right font-mono', bid.rank === 1 && 'text-success font-semibold')}>
                    {formatBidAmount(bid.base_bid_amount)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {bid.alternates_total ? formatBidAmount(bid.alternates_total) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {bid.total_bid_amount ? formatBidAmount(bid.total_bid_amount) : formatBidAmount(bid.base_bid_amount)}
                  </TableCell>
                  <TableCell className={cn('text-right', getVarianceColor(bid.varianceFromLow))}>
                    {bid.varianceFromLow > 0 ? `+${bid.varianceFromLow.toFixed(1)}%` : '-'}
                  </TableCell>
                  {estimatedValue && (
                    <TableCell className={cn(
                      'text-right',
                      bid.varianceFromEstimate !== null && bid.varianceFromEstimate < 0
                        ? 'text-success'
                        : 'text-error'
                    )}>
                      {bid.varianceFromEstimate !== null
                        ? `${bid.varianceFromEstimate > 0 ? '+' : ''}${bid.varianceFromEstimate.toFixed(1)}%`
                        : '-'}
                    </TableCell>
                  )}
                  <TableCell className="text-center">
                    <Badge
                      variant={
                        bid.status === 'awarded' ? 'default' :
                        bid.status === 'qualified' ? 'secondary' :
                        bid.status === 'shortlisted' ? 'outline' :
                        'secondary'
                      }
                      className={cn(bid.status === 'awarded' && 'bg-success')}
                    >
                      {bid.status}
                    </Badge>
                    {bid.is_late && (
                      <Badge variant="destructive" className="ml-1 text-xs">Late</Badge>
                    )}
                  </TableCell>
                  {canAward && (
                    <TableCell>
                      {bid.status !== 'awarded' && onAwardBid && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onAwardBid(bid.id)}
                        >
                          <Trophy className="w-3 h-3 mr-1" />
                          Award
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
