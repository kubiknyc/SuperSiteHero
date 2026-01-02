/**
 * BidLevelingMatrix Component
 * Side-by-side bid comparison with scope normalization and award recommendations
 */

import { useState, useCallback, useMemo } from 'react'
import { format } from 'date-fns'
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Award,
  BarChart3,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Copy,
  Download,
  Edit,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  HelpCircle,
  Info,
  Layers,
  ListChecks,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Percent,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  Star,
  StarOff,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  TrendingDown,
  TrendingUp,
  UserPlus,
  X,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
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
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import {
  useBidLevelingMatrix,
  useBidRecommendation,
  useExportBidLeveling,
  useNormalizeBids,
  calculateScopeGapScore,
  getPriceVarianceStatus,
  formatBidCurrency,
} from '@/features/subcontractors/hooks'
import type {
  BidLevelingMatrix as BidLevelingMatrixType,
  BidSubmission,
  BidLineItem,
  BidRecommendation,
  ScopeClarification,
} from '@/features/subcontractors/types'
import { cn } from '@/lib/utils'

interface BidLevelingMatrixProps {
  bidPackageId: string
  onClose?: () => void
  onAwardBid?: (submissionId: string) => void
}

export function BidLevelingMatrix({
  bidPackageId,
  onClose,
  onAwardBid,
}: BidLevelingMatrixProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'line-items' | 'alternates' | 'exclusions'>('summary')
  const [selectedBidders, setSelectedBidders] = useState<Set<string>>(new Set())
  const [showRecommendationDialog, setShowRecommendationDialog] = useState(false)
  const [showNotesDialog, setShowNotesDialog] = useState(false)
  const [editingNote, setEditingNote] = useState<{ submissionId: string; itemId?: string } | null>(null)
  const [highlightMode, setHighlightMode] = useState<'none' | 'low' | 'high' | 'variance'>('variance')

  // Queries
  const { data: matrix, isLoading, refetch } = useBidLevelingMatrix(bidPackageId)
  const { data: recommendation, isLoading: recommendationLoading } = useBidRecommendation(bidPackageId)

  // Mutations
  const exportMutation = useExportBidLeveling()
  const normalizeMutation = useNormalizeBids()

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

  // Filter visible submissions
  const visibleSubmissions = useMemo(() => {
    if (!matrix?.submissions) return []
    if (selectedBidders.size === 0) return matrix.submissions
    return matrix.submissions.filter((s) => selectedBidders.has(s.id))
  }, [matrix?.submissions, selectedBidders])

  // Export handler
  const handleExport = useCallback(async (format: 'excel' | 'pdf') => {
    await exportMutation.mutateAsync({
      packageId: bidPackageId,
      format,
      includeNotes: true,
    })
  }, [bidPackageId, exportMutation])

  if (isLoading) {
    return <BidLevelingMatrixLoading />
  }

  if (!matrix) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="font-medium">No bid data available</h3>
          <p className="text-sm text-muted-foreground mt-1">
            There are no submissions for this bid package
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Bid Leveling Matrix
          </h2>
          <p className="text-muted-foreground">
            Compare and analyze {matrix.submissions.length} bids for {matrix.packageName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('excel')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export to Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <FileText className="h-4 w-4 mr-2" />
                Export to PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="default"
            onClick={() => setShowRecommendationDialog(true)}
          >
            <Award className="h-4 w-4 mr-2" />
            Make Recommendation
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <StatCard
          title="Bids Received"
          value={matrix.summary.totalBids}
          icon={FileText}
        />
        <StatCard
          title="Low Bid"
          value={formatBidCurrency(matrix.summary.lowBid)}
          icon={TrendingDown}
          color="text-success"
        />
        <StatCard
          title="High Bid"
          value={formatBidCurrency(matrix.summary.highBid)}
          icon={TrendingUp}
          color="text-error"
        />
        <StatCard
          title="Average"
          value={formatBidCurrency(matrix.summary.averageBid)}
          icon={BarChart3}
        />
        <StatCard
          title="Spread"
          value={`${matrix.summary.spreadPercent.toFixed(1)}%`}
          icon={Percent}
          color={matrix.summary.spreadPercent > 20 ? 'text-warning' : undefined}
        />
        <StatCard
          title="vs Estimate"
          value={matrix.summary.varianceFromEstimate
            ? `${matrix.summary.varianceFromEstimate > 0 ? '+' : ''}${matrix.summary.varianceFromEstimate.toFixed(1)}%`
            : 'N/A'
          }
          icon={CircleDollarSign}
          color={matrix.summary.varianceFromEstimate
            ? matrix.summary.varianceFromEstimate > 5 ? 'text-error'
              : matrix.summary.varianceFromEstimate < -5 ? 'text-success'
              : undefined
            : undefined
          }
        />
      </div>

      {/* Recommendation Alert */}
      {recommendation && (
        <Alert className={cn(
          recommendation.confidence === 'high' && 'border-success bg-success/10',
          recommendation.confidence === 'medium' && 'border-warning bg-warning/10',
          recommendation.confidence === 'low' && 'border-error bg-error/10',
        )}>
          <Award className="h-4 w-4" />
          <AlertTitle>Award Recommendation: {recommendation.recommendedBidder}</AlertTitle>
          <AlertDescription>
            <p>{recommendation.reason}</p>
            <div className="flex items-center gap-4 mt-2">
              <Badge variant={recommendation.confidence === 'high' ? 'default' : 'secondary'}>
                {recommendation.confidence} confidence
              </Badge>
              <span className="text-sm">
                Score: {recommendation.score}/100
              </span>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Bidder Filter */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Bidder Selection</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedBidders(new Set(matrix.submissions.map((s) => s.id)))}
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedBidders(new Set())}
              >
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {matrix.submissions.map((sub, index) => (
              <Button
                key={sub.id}
                variant={selectedBidders.has(sub.id) || selectedBidders.size === 0 ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleBidder(sub.id)}
                className="gap-2"
              >
                <span className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold',
                  index === 0 && 'bg-success text-success-foreground',
                  index === matrix.submissions.length - 1 && matrix.submissions.length > 1 && 'bg-error text-error-foreground',
                  index > 0 && index < matrix.submissions.length - 1 && 'bg-muted'
                )}>
                  {index + 1}
                </span>
                {sub.bidderName}
                <span className="font-mono text-xs">
                  {formatBidCurrency(sub.baseBidAmount)}
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Comparison Tabs */}
      <Card>
        <CardHeader>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="line-items">Line Items</TabsTrigger>
                <TabsTrigger value="alternates">Alternates</TabsTrigger>
                <TabsTrigger value="exclusions">Exclusions</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">Highlight:</Label>
                <Select value={highlightMode} onValueChange={(v) => setHighlightMode(v as typeof highlightMode)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="low">Low Prices</SelectItem>
                    <SelectItem value="high">High Prices</SelectItem>
                    <SelectItem value="variance">Variance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Tabs>
        </CardHeader>
        <CardContent>
          <TabsContent value="summary" className="mt-0">
            <BidSummaryTable
              submissions={visibleSubmissions}
              estimatedValue={matrix.summary.estimatedValue}
              onAddNote={(submissionId) => {
                setEditingNote({ submissionId })
                setShowNotesDialog(true)
              }}
            />
          </TabsContent>

          <TabsContent value="line-items" className="mt-0">
            <LineItemsComparison
              lineItems={matrix.lineItems}
              submissions={visibleSubmissions}
              highlightMode={highlightMode}
              onAddNote={(submissionId, itemId) => {
                setEditingNote({ submissionId, itemId })
                setShowNotesDialog(true)
              }}
            />
          </TabsContent>

          <TabsContent value="alternates" className="mt-0">
            <AlternatesComparison
              alternates={matrix.alternates}
              submissions={visibleSubmissions}
            />
          </TabsContent>

          <TabsContent value="exclusions" className="mt-0">
            <ExclusionsComparison
              submissions={visibleSubmissions}
            />
          </TabsContent>
        </CardContent>
      </Card>

      {/* Recommendation Dialog */}
      <RecommendationDialog
        open={showRecommendationDialog}
        onOpenChange={setShowRecommendationDialog}
        submissions={matrix.submissions}
        recommendation={recommendation}
        onAward={onAwardBid}
      />

      {/* Notes Dialog */}
      <NotesDialog
        open={showNotesDialog}
        onOpenChange={setShowNotesDialog}
        editingNote={editingNote}
        onClose={() => setEditingNote(null)}
      />
    </div>
  )
}

// =============================================
// Sub-components
// =============================================

interface StatCardProps {
  title: string
  value: string | number
  icon: typeof BarChart3
  color?: string
}

function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className={cn('text-xl font-bold font-mono', color)}>{value}</p>
          </div>
          <Icon className={cn('h-5 w-5 text-muted-foreground', color)} />
        </div>
      </CardContent>
    </Card>
  )
}

interface BidSummaryTableProps {
  submissions: BidSubmission[]
  estimatedValue?: number
  onAddNote: (submissionId: string) => void
}

function BidSummaryTable({ submissions, estimatedValue, onAddNote }: BidSummaryTableProps) {
  const lowBid = Math.min(...submissions.map((s) => s.baseBidAmount))

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-background z-10">Bidder</TableHead>
            <TableHead className="text-right">Base Bid</TableHead>
            <TableHead className="text-right">Alternates</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">vs Low</TableHead>
            {estimatedValue && <TableHead className="text-right">vs Estimate</TableHead>}
            <TableHead>Status</TableHead>
            <TableHead>Schedule</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {submissions.map((sub, index) => {
            const vsLow = ((sub.baseBidAmount - lowBid) / lowBid * 100)
            const vsEstimate = estimatedValue
              ? ((sub.baseBidAmount - estimatedValue) / estimatedValue * 100)
              : null

            return (
              <TableRow key={sub.id}>
                <TableCell className="sticky left-0 bg-background z-10">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                      index === 0 && 'bg-success text-success-foreground',
                      index === submissions.length - 1 && submissions.length > 1 && 'bg-error text-error-foreground',
                      index > 0 && index < submissions.length - 1 && 'bg-muted'
                    )}>
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium">{sub.bidderName}</p>
                      <p className="text-xs text-muted-foreground">{sub.bidderEmail}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatBidCurrency(sub.baseBidAmount)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {sub.alternatesTotal ? formatBidCurrency(sub.alternatesTotal) : '-'}
                </TableCell>
                <TableCell className="text-right font-mono font-bold">
                  {formatBidCurrency(sub.totalBidAmount || sub.baseBidAmount)}
                </TableCell>
                <TableCell className="text-right">
                  {index === 0 ? (
                    <Badge variant="default" className="gap-1">
                      <Award className="h-3 w-3" />
                      Low
                    </Badge>
                  ) : (
                    <span className={cn(
                      'font-mono',
                      vsLow > 10 && 'text-error',
                      vsLow <= 5 && 'text-success'
                    )}>
                      +{vsLow.toFixed(1)}%
                    </span>
                  )}
                </TableCell>
                {estimatedValue && (
                  <TableCell className="text-right">
                    <span className={cn(
                      'font-mono',
                      vsEstimate && vsEstimate > 5 && 'text-error',
                      vsEstimate && vsEstimate < -5 && 'text-success'
                    )}>
                      {vsEstimate !== null && (
                        <>
                          {vsEstimate > 0 ? '+' : ''}
                          {vsEstimate.toFixed(1)}%
                        </>
                      )}
                    </span>
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant={sub.status === 'qualified' ? 'default' : 'secondary'}>
                      {sub.status}
                    </Badge>
                    {sub.isLate && (
                      <Badge variant="destructive" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        Late
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {sub.proposedStartDate && (
                      <p>Start: {format(new Date(sub.proposedStartDate), 'MMM d')}</p>
                    )}
                    {sub.proposedDuration && (
                      <p className="text-muted-foreground">{sub.proposedDuration} days</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onAddNote(sub.id)}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

interface LineItemsComparisonProps {
  lineItems: BidLineItem[]
  submissions: BidSubmission[]
  highlightMode: 'none' | 'low' | 'high' | 'variance'
  onAddNote: (submissionId: string, itemId: string) => void
}

function LineItemsComparison({
  lineItems,
  submissions,
  highlightMode,
  onAddNote,
}: LineItemsComparisonProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const toggleItem = (itemId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }

  return (
    <ScrollArea className="w-full">
      <div className="rounded-md border min-w-[800px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background z-10 w-64">Item</TableHead>
              <TableHead className="text-right">Estimate</TableHead>
              {submissions.map((sub) => (
                <TableHead key={sub.id} className="text-right min-w-[120px]">
                  {sub.bidderName}
                </TableHead>
              ))}
              <TableHead className="text-right">Low</TableHead>
              <TableHead className="text-right">Avg</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lineItems.map((item) => {
              const isExpanded = expandedItems.has(item.itemId)
              const prices = item.submissions
                .filter((s) => s.isIncluded && s.totalPrice)
                .map((s) => s.totalPrice!)

              const lowPrice = prices.length > 0 ? Math.min(...prices) : null
              const highPrice = prices.length > 0 ? Math.max(...prices) : null
              const avgPrice = prices.length > 0
                ? prices.reduce((a, b) => a + b, 0) / prices.length
                : null

              return (
                <TableRow key={item.itemId} className={cn(item.isAlternate && 'bg-muted/50')}>
                  <TableCell className="sticky left-0 bg-background z-10">
                    <button
                      onClick={() => toggleItem(item.itemId)}
                      className="flex items-center gap-2 text-left w-full"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">
                            {item.itemNumber}
                          </span>
                          {item.isAlternate && (
                            <Badge variant="secondary" className="text-xs">Alt</Badge>
                          )}
                        </div>
                        <p className="text-sm line-clamp-1">{item.description}</p>
                        {item.unit && (
                          <p className="text-xs text-muted-foreground">
                            {item.quantity} {item.unit}
                          </p>
                        )}
                      </div>
                    </button>
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {item.estimatedTotal ? formatBidCurrency(item.estimatedTotal) : '-'}
                  </TableCell>
                  {submissions.map((sub) => {
                    const submissionData = item.submissions.find((s) => s.submissionId === sub.id)
                    const price = submissionData?.totalPrice

                    const isLow = price && lowPrice && price === lowPrice
                    const isHigh = price && highPrice && price === highPrice
                    const variance = avgPrice && price
                      ? ((price - avgPrice) / avgPrice * 100)
                      : null

                    let cellClass = ''
                    if (highlightMode === 'low' && isLow) cellClass = 'bg-success/20 text-success'
                    if (highlightMode === 'high' && isHigh) cellClass = 'bg-error/20 text-error'
                    if (highlightMode === 'variance' && variance !== null) {
                      if (variance < -10) cellClass = 'bg-success/20 text-success'
                      if (variance > 10) cellClass = 'bg-error/20 text-error'
                    }

                    return (
                      <TableCell key={sub.id} className={cn('text-right font-mono', cellClass)}>
                        {submissionData?.isIncluded === false ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="outline" className="text-xs">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Excl
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                {submissionData.notes || 'Item excluded from bid'}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : price ? (
                          <div className="flex items-center justify-end gap-1">
                            {isLow && <ArrowDown className="h-3 w-3 text-success" />}
                            {isHigh && <ArrowUp className="h-3 w-3 text-error" />}
                            {formatBidCurrency(price)}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    )
                  })}
                  <TableCell className="text-right font-mono text-success">
                    {lowPrice ? formatBidCurrency(lowPrice) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {avgPrice ? formatBidCurrency(avgPrice) : '-'}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}

interface AlternatesComparisonProps {
  alternates: BidLevelingMatrixType['alternates']
  submissions: BidSubmission[]
}

function AlternatesComparison({ alternates, submissions }: AlternatesComparisonProps) {
  if (!alternates || alternates.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <ListChecks className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No alternates in this bid package</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-64">Alternate</TableHead>
            {submissions.map((sub) => (
              <TableHead key={sub.id} className="text-right">
                {sub.bidderName}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {alternates.map((alt) => (
            <TableRow key={alt.alternateNumber}>
              <TableCell>
                <div>
                  <p className="font-medium">Alt #{alt.alternateNumber}</p>
                  <p className="text-sm text-muted-foreground">{alt.description}</p>
                </div>
              </TableCell>
              {submissions.map((sub) => {
                const subData = alt.submissions.find((s) => s.submissionId === sub.id)
                return (
                  <TableCell key={sub.id} className="text-right font-mono">
                    {subData?.isIncluded ? (
                      subData.amount ? formatBidCurrency(subData.amount) : 'Included'
                    ) : (
                      <Badge variant="outline">Not Included</Badge>
                    )}
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

interface ExclusionsComparisonProps {
  submissions: BidSubmission[]
}

function ExclusionsComparison({ submissions }: ExclusionsComparisonProps) {
  const [view, setView] = useState<'exclusions' | 'clarifications' | 'assumptions'>('exclusions')

  return (
    <div className="space-y-4">
      <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
        <TabsList>
          <TabsTrigger value="exclusions">Exclusions</TabsTrigger>
          <TabsTrigger value="clarifications">Clarifications</TabsTrigger>
          <TabsTrigger value="assumptions">Assumptions</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {submissions.map((sub) => {
          const items = view === 'exclusions' ? sub.exclusions
            : view === 'clarifications' ? sub.clarifications
            : sub.assumptions

          const itemList = items?.split('\n').filter(Boolean) || []

          return (
            <Card key={sub.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{sub.bidderName}</CardTitle>
              </CardHeader>
              <CardContent>
                {itemList.length > 0 ? (
                  <ul className="space-y-1">
                    {itemList.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <XCircle className="h-3 w-3 mt-1 shrink-0 text-error" />
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No {view} listed</p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

interface RecommendationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  submissions: BidSubmission[]
  recommendation?: BidRecommendation
  onAward?: (submissionId: string) => void
}

function RecommendationDialog({
  open,
  onOpenChange,
  submissions,
  recommendation,
  onAward,
}: RecommendationDialogProps) {
  const [selectedBidder, setSelectedBidder] = useState<string>(
    recommendation?.submissionId || submissions[0]?.id || ''
  )
  const [notes, setNotes] = useState('')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Award Recommendation</DialogTitle>
          <DialogDescription>
            Select the bidder to recommend for award
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {recommendation && (
            <Alert className="border-success bg-success/10">
              <Award className="h-4 w-4" />
              <AlertTitle>System Recommendation</AlertTitle>
              <AlertDescription>
                <p>{recommendation.recommendedBidder}</p>
                <p className="text-sm mt-1">{recommendation.reason}</p>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Select Bidder</Label>
            <Select value={selectedBidder} onValueChange={setSelectedBidder}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {submissions.map((sub, index) => (
                  <SelectItem key={sub.id} value={sub.id}>
                    <div className="flex items-center gap-2">
                      <span>#{index + 1}</span>
                      <span>{sub.bidderName}</span>
                      <span className="font-mono text-muted-foreground">
                        {formatBidCurrency(sub.baseBidAmount)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Recommendation Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter reason for recommendation..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => {
            onAward?.(selectedBidder)
            onOpenChange(false)
          }}>
            <Award className="h-4 w-4 mr-2" />
            Make Recommendation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface NotesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingNote: { submissionId: string; itemId?: string } | null
  onClose: () => void
}

function NotesDialog({ open, onOpenChange, editingNote, onClose }: NotesDialogProps) {
  const [noteType, setNoteType] = useState<'general' | 'clarification' | 'concern' | 'recommendation'>('general')
  const [noteText, setNoteText] = useState('')

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen)
      if (!isOpen) onClose()
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Note</DialogTitle>
          <DialogDescription>
            Add a scope clarification or note for this {editingNote?.itemId ? 'line item' : 'bidder'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Note Type</Label>
            <Select value={noteType} onValueChange={(v) => setNoteType(v as typeof noteType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Note</SelectItem>
                <SelectItem value="clarification">Clarification Needed</SelectItem>
                <SelectItem value="concern">Concern</SelectItem>
                <SelectItem value="recommendation">Recommendation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Note</Label>
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Enter your note..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => {
            // Save note logic here
            onOpenChange(false)
          }}>
            <Save className="h-4 w-4 mr-2" />
            Save Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function BidLevelingMatrixLoading() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
      <div className="grid grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-[500px]" />
    </div>
  )
}
