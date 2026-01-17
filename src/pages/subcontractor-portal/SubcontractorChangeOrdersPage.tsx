/**
 * Subcontractor Change Orders Page
 * Displays change orders impacting the subcontractor's contract (P1-2 Feature)
 */

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import {
  useSubcontractorChangeOrders,
  useChangeOrderSummary,
  useChangeOrderItems,
  getChangeOrderStatusLabel,
  getChangeOrderStatusVariant,
  getChangeOrderTypeLabel,
  getChangeOrderTypeColor,
  getDisplayNumber,
  formatAmount,
  formatDaysImpact,
  isPending,
} from '@/features/subcontractor-portal/hooks'
import type {
  SubcontractorChangeOrder,
  SubcontractorChangeOrderItem,
  ChangeOrderStatus,
} from '@/features/subcontractor-portal/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  FileEdit,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  XCircle,
  Building2,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  FileText,
  ArrowRightLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'

function ChangeOrdersSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-32" />
      ))}
    </div>
  )
}

type TabValue = 'all' | 'pending' | 'approved' | 'rejected'

export function SubcontractorChangeOrdersPage() {
  const [activeTab, setActiveTab] = useState<TabValue>('all')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [expandedCO, setExpandedCO] = useState<string | null>(null)

  const { data: changeOrders, isLoading, isError } = useSubcontractorChangeOrders()
  const { data: summary } = useChangeOrderSummary()

  // Get unique projects for filter
  const projects = useMemo(() => {
    if (!changeOrders) { return [] }
    const uniqueProjects = new Map<string, string>()
    changeOrders.forEach((co) => {
      if (!uniqueProjects.has(co.project_id)) {
        uniqueProjects.set(co.project_id, co.project_name)
      }
    })
    return Array.from(uniqueProjects.entries()).map(([id, name]) => ({ id, name }))
  }, [changeOrders])

  // Filter change orders
  const filteredChangeOrders = useMemo(() => {
    if (!changeOrders) { return [] }

    let filtered = changeOrders

    // Apply tab filter
    switch (activeTab) {
      case 'pending':
        filtered = filtered.filter((co) => isPending(co.status))
        break
      case 'approved':
        filtered = filtered.filter((co) => co.status === 'approved')
        break
      case 'rejected':
        filtered = filtered.filter((co) => ['rejected', 'void'].includes(co.status))
        break
    }

    // Apply project filter
    if (projectFilter !== 'all') {
      filtered = filtered.filter((co) => co.project_id === projectFilter)
    }

    return filtered
  }, [changeOrders, activeTab, projectFilter])

  // Calculate tab counts
  const counts = useMemo(() => {
    if (!changeOrders) { return { all: 0, pending: 0, approved: 0, rejected: 0 } }

    return {
      all: changeOrders.length,
      pending: changeOrders.filter((co) => isPending(co.status)).length,
      approved: changeOrders.filter((co) => co.status === 'approved').length,
      rejected: changeOrders.filter((co) => ['rejected', 'void'].includes(co.status)).length,
    }
  }, [changeOrders])

  const toggleExpanded = (coId: string) => {
    setExpandedCO(expandedCO === coId ? null : coId)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 heading-page">
            <FileEdit className="h-6 w-6" />
            Change Orders
          </h1>
          <p className="text-muted-foreground">
            Track change orders impacting your contract and billing.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="heading-section">{summary.total_count}</p>
                  <p className="text-xs text-muted-foreground">Total COs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-warning" />
                <div>
                  <p className="text-warning heading-section">{summary.pending_count}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                {summary.net_contract_impact >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-success" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-destructive" />
                )}
                <div>
                  <p className={cn(
                    "heading-section",
                    summary.net_contract_impact >= 0 ? "text-success" : "text-destructive"
                  )}>
                    {formatAmount(summary.net_contract_impact)}
                  </p>
                  <p className="text-xs text-muted-foreground">Contract Impact</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="heading-section">
                    {formatDaysImpact(summary.total_days_impact)}
                  </p>
                  <p className="text-xs text-muted-foreground">Schedule Impact</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Contract Impact Summary */}
      {summary && summary.total_count > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Proposed vs Approved</span>
              <span className="text-sm text-muted-foreground">
                {formatAmount(summary.total_approved_amount)} of {formatAmount(summary.total_proposed_amount)} approved
              </span>
            </div>
            <Progress
              value={summary.total_proposed_amount > 0
                ? (summary.total_approved_amount / summary.total_proposed_amount) * 100
                : 0}
              className="h-2"
            />
          </CardContent>
        </Card>
      )}

      {/* Pending Alert */}
      {summary && summary.pending_count > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Pending Change Orders</AlertTitle>
          <AlertDescription>
            You have {summary.pending_count} change order(s) awaiting approval with a total proposed
            value of {formatAmount(summary.total_proposed_amount - summary.total_approved_amount)}.
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        {projects.length > 1 && (
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="pending" className="text-warning">
            Pending ({counts.pending})
          </TabsTrigger>
          <TabsTrigger value="approved">Approved ({counts.approved})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({counts.rejected})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <ChangeOrdersSkeleton />
          ) : isError ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Failed to load change orders
              </CardContent>
            </Card>
          ) : filteredChangeOrders.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileEdit className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="mb-2 heading-subsection">
                  {activeTab === 'all'
                    ? 'No Change Orders'
                    : activeTab === 'pending'
                      ? 'No Pending Change Orders'
                      : activeTab === 'approved'
                        ? 'No Approved Change Orders'
                        : 'No Rejected Change Orders'}
                </h3>
                <p className="text-muted-foreground">
                  {activeTab === 'all'
                    ? 'Change orders affecting your contract will appear here.'
                    : 'No change orders match this filter.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredChangeOrders.map((co) => (
                <ChangeOrderCard
                  key={co.id}
                  changeOrder={co}
                  isExpanded={expandedCO === co.id}
                  onToggle={() => toggleExpanded(co.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface ChangeOrderCardProps {
  changeOrder: SubcontractorChangeOrder
  isExpanded: boolean
  onToggle: () => void
}

function ChangeOrderCard({ changeOrder, isExpanded, onToggle }: ChangeOrderCardProps) {
  const co = changeOrder
  const { data: items } = useChangeOrderItems(isExpanded ? co.id : '')

  const amount = co.status === 'approved' && co.approved_amount != null
    ? co.approved_amount
    : co.proposed_amount

  return (
    <Card className={cn(isPending(co.status) && 'border-warning/50')}>
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <CardTitle className="heading-card">
                    {getDisplayNumber(co)}
                  </CardTitle>
                  <Badge variant={getChangeOrderStatusVariant(co.status)}>
                    {getChangeOrderStatusLabel(co.status)}
                  </Badge>
                  <Badge variant="outline" className={getChangeOrderTypeColor(co.change_type)}>
                    {getChangeOrderTypeLabel(co.change_type)}
                  </Badge>
                </div>
                <CardDescription className="line-clamp-1">{co.title}</CardDescription>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {co.project_name}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(co.created_at), 'MMM d, yyyy')}
                  </span>
                  {co.line_item_count > 0 && (
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {co.line_item_count} item{co.line_item_count !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className={cn(
                    "text-lg font-semibold",
                    amount >= 0 ? "text-success" : "text-destructive"
                  )}>
                    {formatAmount(amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {co.status === 'approved' ? 'Approved' : 'Proposed'}
                  </p>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-6">
            <Separator />

            {/* Description */}
            {co.description && (
              <div>
                <h4 className="font-medium mb-2 text-sm">Description</h4>
                <p className="text-sm text-muted-foreground">{co.description}</p>
              </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Proposed Amount</p>
                <p className="font-medium">{formatAmount(co.proposed_amount)}</p>
              </div>
              {co.approved_amount != null && (
                <div>
                  <p className="text-muted-foreground">Approved Amount</p>
                  <p className="font-medium text-success">{formatAmount(co.approved_amount)}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">Time Impact</p>
                <p className="font-medium">
                  {co.status === 'approved'
                    ? formatDaysImpact(co.approved_days)
                    : formatDaysImpact(co.proposed_days)}
                </p>
              </div>
              {co.original_contract_amount != null && (
                <div>
                  <p className="text-muted-foreground">Original Contract</p>
                  <p className="font-medium">{formatAmount(co.original_contract_amount)}</p>
                </div>
              )}
              {co.revised_contract_amount != null && (
                <div>
                  <p className="text-muted-foreground">Revised Contract</p>
                  <p className="font-medium">{formatAmount(co.revised_contract_amount)}</p>
                </div>
              )}
            </div>

            {/* Related Items */}
            {(co.related_rfi_number || co.related_submittal_number) && (
              <>
                <Separator />
                <div className="flex flex-wrap gap-4 text-sm">
                  {co.related_rfi_number && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <ArrowRightLeft className="h-4 w-4" />
                      Related to RFI #{co.related_rfi_number}
                    </div>
                  )}
                  {co.related_submittal_number && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <ArrowRightLeft className="h-4 w-4" />
                      Related to Submittal #{co.related_submittal_number}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Status Timeline */}
            {(co.submitted_at || co.internally_approved_at || co.owner_approved_at) && (
              <>
                <Separator />
                <div className="flex flex-wrap gap-4 text-sm">
                  {co.submitted_at && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Submitted: {format(new Date(co.submitted_at), 'MMM d, yyyy')}
                    </div>
                  )}
                  {co.internally_approved_at && (
                    <div className="flex items-center gap-1 text-primary">
                      <CheckCircle className="h-4 w-4" />
                      Internal: {format(new Date(co.internally_approved_at), 'MMM d, yyyy')}
                    </div>
                  )}
                  {co.owner_approved_at && (
                    <div className="flex items-center gap-1 text-success">
                      <CheckCircle className="h-4 w-4" />
                      Owner Approved: {format(new Date(co.owner_approved_at), 'MMM d, yyyy')}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Rejection Reason */}
            {co.status === 'rejected' && co.rejection_reason && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Rejected</AlertTitle>
                <AlertDescription>{co.rejection_reason}</AlertDescription>
              </Alert>
            )}

            {/* Owner Comments */}
            {co.owner_comments && (
              <div>
                <h4 className="font-medium mb-2 text-sm">Owner Comments</h4>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                  {co.owner_comments}
                </p>
              </div>
            )}

            {/* Line Items Table */}
            {items && items.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="mb-3 flex items-center gap-2 heading-subsection">
                    <FileText className="h-4 w-4" />
                    Cost Breakdown ({items.length} items)
                  </h4>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[60px]">#</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="w-[100px]">Cost Code</TableHead>
                          <TableHead className="text-right w-[100px]">Labor</TableHead>
                          <TableHead className="text-right w-[100px]">Material</TableHead>
                          <TableHead className="text-right w-[100px]">Subcontract</TableHead>
                          <TableHead className="text-right w-[100px]">Markup</TableHead>
                          <TableHead className="text-right w-[100px]">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono text-sm">{item.item_number}</TableCell>
                            <TableCell className="max-w-[200px] truncate" title={item.description}>
                              {item.description}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {item.cost_code || '-'}
                            </TableCell>
                            <TableCell className="text-right">{formatAmount(item.labor_amount)}</TableCell>
                            <TableCell className="text-right">{formatAmount(item.material_amount)}</TableCell>
                            <TableCell className="text-right">{formatAmount(item.subcontract_amount)}</TableCell>
                            <TableCell className="text-right">{formatAmount(item.markup_amount)}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatAmount(item.total_amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* Totals Row */}
                        <TableRow className="font-medium bg-muted/50">
                          <TableCell colSpan={3}>Totals</TableCell>
                          <TableCell className="text-right">
                            {formatAmount(items.reduce((s, i) => s + i.labor_amount, 0))}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatAmount(items.reduce((s, i) => s + i.material_amount, 0))}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatAmount(items.reduce((s, i) => s + i.subcontract_amount, 0))}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatAmount(items.reduce((s, i) => s + i.markup_amount, 0))}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatAmount(items.reduce((s, i) => s + i.total_amount, 0))}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

export default SubcontractorChangeOrdersPage
