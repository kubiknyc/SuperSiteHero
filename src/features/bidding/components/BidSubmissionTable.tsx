/**
 * BidSubmissionTable Component
 * Table for viewing and comparing bid submissions
 */

import { useState } from 'react'
import { format } from 'date-fns'
import {
  ArrowUpDown,
  Building2,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  Eye,
  FileText,
  MoreHorizontal,
  Shield,
  Star,
  Trophy,
  XCircle,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { BidSubmissionStatusBadge } from './BidPackageStatusBadge'
import type { BidSubmissionWithDetails } from '@/types/bidding'
import { formatBidAmount } from '@/types/bidding'

type SortField = 'bidder' | 'amount' | 'date' | 'rank'
type SortDirection = 'asc' | 'desc'

interface BidSubmissionTableProps {
  submissions: BidSubmissionWithDetails[]
  estimatedValue?: number | null
  isLoading?: boolean
  onViewSubmission?: (id: string) => void
  onAwardBid?: (id: string) => void
  onDisqualify?: (id: string) => void
  showAwardAction?: boolean
}

export function BidSubmissionTable({
  submissions,
  estimatedValue,
  isLoading,
  onViewSubmission,
  onAwardBid,
  onDisqualify,
  showAwardAction = true,
}: BidSubmissionTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('amount')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Calculate stats
  const qualifiedSubmissions = submissions.filter(
    (s) => !['disqualified', 'withdrawn'].includes(s.status)
  )
  const amounts = qualifiedSubmissions.map((s) => s.base_bid_amount)
  const lowBid = amounts.length > 0 ? Math.min(...amounts) : null
  const highBid = amounts.length > 0 ? Math.max(...amounts) : null
  const avgBid = amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : null

  // Sort and filter
  const filteredSubmissions = submissions
    .filter((s) => {
      if (!searchTerm) return true
      const search = searchTerm.toLowerCase()
      return (
        s.bidder_company_name.toLowerCase().includes(search) ||
        s.bidder_contact_name?.toLowerCase().includes(search)
      )
    })
    .sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'bidder':
          comparison = a.bidder_company_name.localeCompare(b.bidder_company_name)
          break
        case 'amount':
          comparison = a.base_bid_amount - b.base_bid_amount
          break
        case 'date':
          comparison = new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
          break
        case 'rank':
          comparison = (a.price_rank || 999) - (b.price_rank || 999)
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getVarianceFromEstimate = (amount: number) => {
    if (!estimatedValue) return null
    return ((amount - estimatedValue) / estimatedValue) * 100
  }

  const getVarianceColor = (variance: number) => {
    if (variance <= -10) return 'text-green-600'
    if (variance <= 0) return 'text-green-500'
    if (variance <= 10) return 'text-yellow-600'
    return 'text-red-600'
  }

  const isLowBid = (amount: number) => lowBid !== null && amount === lowBid

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border bg-card">
          <div className="text-sm text-muted-foreground">Total Bids</div>
          <div className="text-2xl font-bold">{submissions.length}</div>
          <div className="text-xs text-muted-foreground">
            {qualifiedSubmissions.length} qualified
          </div>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <div className="text-sm text-muted-foreground">Low Bid</div>
          <div className="text-2xl font-bold text-green-600">
            {lowBid ? formatBidAmount(lowBid) : '-'}
          </div>
          {estimatedValue && lowBid && (
            <div className={`text-xs ${getVarianceColor(getVarianceFromEstimate(lowBid) || 0)}`}>
              {getVarianceFromEstimate(lowBid)?.toFixed(1)}% vs estimate
            </div>
          )}
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <div className="text-sm text-muted-foreground">High Bid</div>
          <div className="text-2xl font-bold">{highBid ? formatBidAmount(highBid) : '-'}</div>
          {lowBid && highBid && (
            <div className="text-xs text-muted-foreground">
              Spread: {(((highBid - lowBid) / lowBid) * 100).toFixed(1)}%
            </div>
          )}
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <div className="text-sm text-muted-foreground">Average Bid</div>
          <div className="text-2xl font-bold">{avgBid ? formatBidAmount(avgBid) : '-'}</div>
          {estimatedValue && (
            <div className="text-xs text-muted-foreground">
              Est: {formatBidAmount(estimatedValue)}
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search bidders..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Table */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('bidder')}
                  className="-ml-3"
                >
                  Bidder
                  <ArrowUpDown className="w-4 h-4 ml-2" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('amount')}
                  className="-ml-3"
                >
                  Base Bid
                  <ArrowUpDown className="w-4 h-4 ml-2" />
                </Button>
              </TableHead>
              <TableHead>Alternates</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('date')}
                  className="-ml-3"
                >
                  Submitted
                  <ArrowUpDown className="w-4 h-4 ml-2" />
                </Button>
              </TableHead>
              <TableHead>Requirements</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSubmissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No bids received yet
                </TableCell>
              </TableRow>
            ) : (
              filteredSubmissions.map((submission, index) => {
                const variance = getVarianceFromEstimate(submission.base_bid_amount)
                const isLow = isLowBid(submission.base_bid_amount)
                const isAwarded = submission.is_awarded

                return (
                  <TableRow
                    key={submission.id}
                    className={
                      isAwarded
                        ? 'bg-green-50'
                        : isLow
                        ? 'bg-yellow-50'
                        : ''
                    }
                  >
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {isAwarded ? (
                          <Trophy className="w-4 h-4 text-green-600" />
                        ) : isLow ? (
                          <Star className="w-4 h-4 text-yellow-500" />
                        ) : (
                          <span className="text-muted-foreground">{index + 1}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{submission.bidder_company_name}</span>
                        </div>
                        {submission.bidder_contact_name && (
                          <div className="text-xs text-muted-foreground">
                            {submission.bidder_contact_name}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className={`font-semibold ${isLow ? 'text-green-600' : ''}`}>
                          {formatBidAmount(submission.base_bid_amount)}
                        </div>
                        {variance !== null && (
                          <div className={`text-xs ${getVarianceColor(variance)}`}>
                            {variance > 0 ? '+' : ''}
                            {variance.toFixed(1)}% vs est
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {submission.alternates_total > 0 ? (
                        formatBidAmount(submission.alternates_total)
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {formatBidAmount(submission.total_bid_amount || submission.base_bid_amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <BidSubmissionStatusBadge status={submission.status} />
                      {submission.is_late && (
                        <Badge variant="outline" className="ml-2 text-orange-600 border-orange-200">
                          Late
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(submission.submitted_at), 'MMM d, yyyy')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(submission.submitted_at), 'h:mm a')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <div
                                className={`p-1 rounded ${
                                  submission.bid_bond_included
                                    ? 'bg-green-100 text-green-600'
                                    : 'bg-gray-100 text-gray-400'
                                }`}
                              >
                                <Shield className="w-4 h-4" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              {submission.bid_bond_included
                                ? `Bid bond: ${formatBidAmount(submission.bid_bond_amount)}`
                                : 'No bid bond'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <div
                                className={`p-1 rounded ${
                                  submission.insurance_cert_included
                                    ? 'bg-green-100 text-green-600'
                                    : 'bg-gray-100 text-gray-400'
                                }`}
                              >
                                <FileText className="w-4 h-4" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              {submission.insurance_cert_included
                                ? 'Insurance certificate included'
                                : 'No insurance certificate'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onViewSubmission?.(submission.id)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {submission.bid_form_url && (
                            <DropdownMenuItem asChild>
                              <a href={submission.bid_form_url} target="_blank" rel="noopener noreferrer">
                                <Download className="w-4 h-4 mr-2" />
                                Download Bid Form
                              </a>
                            </DropdownMenuItem>
                          )}
                          {showAwardAction && !submission.is_awarded && submission.status !== 'disqualified' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => onAwardBid?.(submission.id)}
                                className="text-green-600"
                              >
                                <Trophy className="w-4 h-4 mr-2" />
                                Award Contract
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => onDisqualify?.(submission.id)}
                                className="text-red-600"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Disqualify
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
