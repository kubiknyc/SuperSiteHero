/**
 * SubcontractList Component
 * Manage executed subcontracts with financial tracking
 */

import { useState, useMemo, useCallback } from 'react'
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  Calendar,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  DollarSign,
  Download,
  FileCheck,
  FileText,
  Filter,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Shield,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  useSubcontracts,
  useSubcontract,
  useSubcontractSummary,
  useSubcontractPayments,
  useSubcontractChangeOrders,
  useUpdateSubcontractStatus,
  formatContractValue,
  getSubcontractStatusVariant,
} from '../hooks'
import { SUBCONTRACT_STATUSES } from '@/features/bidding/types/bidding'
import type { SubcontractListItem, SubcontractFilters } from '../types'
import { cn } from '@/lib/utils'

interface SubcontractListProps {
  projectId?: string
  onCreateContract?: () => void
  onViewContract?: (id: string) => void
  onEditContract?: (id: string) => void
}

type ViewMode = 'all' | 'active' | 'pending' | 'completed'

export function SubcontractList({
  projectId,
  onCreateContract,
  onViewContract,
  onEditContract,
}: SubcontractListProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null)
  const [showStatusDialog, setShowStatusDialog] = useState<string | null>(null)

  // Build filters
  const filters: SubcontractFilters = useMemo(() => {
    const base: SubcontractFilters = {
      projectId,
      search: searchQuery || undefined,
    }

    switch (viewMode) {
      case 'active':
        base.status = ['executed', 'active']
        break
      case 'pending':
        base.status = ['draft', 'pending_review', 'sent_for_signature', 'partially_signed']
        break
      case 'completed':
        base.status = ['completed']
        break
    }

    return base
  }, [projectId, searchQuery, viewMode])

  const { data: contracts, isLoading } = useSubcontracts(filters)
  const { data: summary, isLoading: summaryLoading } = useSubcontractSummary(projectId)

  const updateStatusMutation = useUpdateSubcontractStatus()

  // Handle status change
  const handleStatusChange = useCallback(async (contractId: string, newStatus: string) => {
    await updateStatusMutation.mutateAsync({
      id: contractId,
      status: newStatus,
    })
    setShowStatusDialog(null)
  }, [updateStatusMutation])

  if (isLoading) {
    return <SubcontractListLoading />
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <SummaryCard
          title="Total Contracts"
          value={summary?.totalContracts || 0}
          icon={FileText}
          loading={summaryLoading}
        />
        <SummaryCard
          title="Original Value"
          value={formatContractValue(summary?.totalOriginalValue || 0)}
          icon={DollarSign}
          loading={summaryLoading}
        />
        <SummaryCard
          title="Current Value"
          value={formatContractValue(summary?.totalCurrentValue || 0)}
          icon={TrendingUp}
          loading={summaryLoading}
          trend={summary?.totalOriginalValue && summary?.totalCurrentValue
            ? ((summary.totalCurrentValue - summary.totalOriginalValue) / summary.totalOriginalValue) * 100
            : undefined}
        />
        <SummaryCard
          title="Approved COs"
          value={formatContractValue(summary?.totalApprovedCOs || 0)}
          icon={ClipboardList}
          loading={summaryLoading}
        />
        <SummaryCard
          title="Paid to Date"
          value={formatContractValue(summary?.totalPaid || 0)}
          icon={FileCheck}
          loading={summaryLoading}
        />
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Subcontracts
              </CardTitle>
              <CardDescription>
                Manage subcontract agreements and track payments
              </CardDescription>
            </div>
            <Button onClick={onCreateContract}>
              <Plus className="h-4 w-4 mr-2" />
              New Subcontract
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contracts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="active">
                  Active
                  {summary?.byStatus?.active || summary?.byStatus?.executed ? (
                    <Badge variant="secondary" className="ml-1">
                      {(summary.byStatus.active || 0) + (summary.byStatus.executed || 0)}
                    </Badge>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contract</TableHead>
                  <TableHead>Subcontractor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Contract Value</TableHead>
                  <TableHead className="text-right">Invoiced</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-center">Progress</TableHead>
                  <TableHead className="text-center">Compliance</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {!contracts || contracts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      {searchQuery
                        ? 'No contracts match your search'
                        : 'No subcontracts found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  contracts.map((contract) => (
                    <ContractRow
                      key={contract.id}
                      contract={contract}
                      onView={() => {
                        setSelectedContractId(contract.id)
                        onViewContract?.(contract.id)
                      }}
                      onEdit={() => onEditContract?.(contract.id)}
                      onChangeStatus={() => setShowStatusDialog(contract.id)}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Contract Detail Sheet */}
      <ContractDetailSheet
        contractId={selectedContractId}
        open={!!selectedContractId}
        onOpenChange={(open) => !open && setSelectedContractId(null)}
        onEdit={() => selectedContractId && onEditContract?.(selectedContractId)}
      />

      {/* Status Change Dialog */}
      <Dialog open={!!showStatusDialog} onOpenChange={(open) => !open && setShowStatusDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Contract Status</DialogTitle>
            <DialogDescription>
              Select the new status for this contract
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 py-4">
            {SUBCONTRACT_STATUSES.map((status) => (
              <Button
                key={status.value}
                variant="outline"
                className="justify-start"
                onClick={() => showStatusDialog && handleStatusChange(showStatusDialog, status.value)}
                disabled={updateStatusMutation.isPending}
              >
                <div className={cn('w-2 h-2 rounded-full mr-2', `bg-${status.color}-500`)} />
                {status.label}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(null)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =============================================
// Sub-components
// =============================================

interface SummaryCardProps {
  title: string
  value: string | number
  icon: typeof DollarSign
  loading?: boolean
  trend?: number
}

function SummaryCard({ title, value, icon: Icon, loading, trend }: SummaryCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-7 w-24 mt-1" />
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-xl font-bold">{value}</p>
                {trend !== undefined && (
                  <span className={cn(
                    'text-xs',
                    trend > 0 ? 'text-warning' : trend < 0 ? 'text-success' : 'text-muted-foreground'
                  )}>
                    {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="p-2 bg-muted rounded-lg">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface ContractRowProps {
  contract: SubcontractListItem
  onView: () => void
  onEdit: () => void
  onChangeStatus: () => void
}

function ContractRow({ contract, onView, onEdit, onChangeStatus }: ContractRowProps) {
  const complianceColors = {
    compliant: 'text-success',
    warning: 'text-warning',
    non_compliant: 'text-error',
  }

  return (
    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={onView}>
      <TableCell>
        <div>
          <p className="font-medium">{contract.contractNumber}</p>
          <p className="text-xs text-muted-foreground line-clamp-1">{contract.contractName}</p>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span>{contract.subcontractorName}</span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={getSubcontractStatusVariant(contract.status)}>
          {contract.status.replace(/_/g, ' ')}
        </Badge>
      </TableCell>
      <TableCell className="text-right font-mono">
        <div>
          <p>{formatContractValue(contract.currentValue)}</p>
          {contract.currentValue !== contract.originalValue && (
            <p className="text-xs text-muted-foreground">
              Orig: {formatContractValue(contract.originalValue)}
            </p>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right font-mono">
        {formatContractValue(contract.invoicedAmount)}
      </TableCell>
      <TableCell className="text-right font-mono">
        {formatContractValue(contract.paidAmount)}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Progress value={contract.percentComplete} className="h-2 w-16" />
          <span className="text-sm text-muted-foreground">{contract.percentComplete}%</span>
        </div>
      </TableCell>
      <TableCell className="text-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Shield className={cn('h-4 w-4', complianceColors[contract.complianceStatus])} />
            </TooltipTrigger>
            <TooltipContent>
              {contract.complianceStatus === 'compliant' && 'Insurance Compliant'}
              {contract.complianceStatus === 'warning' && 'Insurance Expiring Soon'}
              {contract.complianceStatus === 'non_compliant' && 'Insurance Non-Compliant'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onView}>
              <FileText className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Contract
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onChangeStatus}>
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Update Status
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Download className="h-4 w-4 mr-2" />
              Download Contract
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

interface ContractDetailSheetProps {
  contractId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: () => void
}

function ContractDetailSheet({ contractId, open, onOpenChange, onEdit }: ContractDetailSheetProps) {
  const { data: contract, isLoading } = useSubcontract(contractId || undefined)
  const { data: payments } = useSubcontractPayments(contractId || undefined)
  const { data: changeOrders } = useSubcontractChangeOrders(contractId || undefined)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{contract?.contract_number || 'Contract Details'}</SheetTitle>
          <SheetDescription>
            {contract?.contract_name || 'View contract details and history'}
          </SheetDescription>
        </SheetHeader>
        {isLoading ? (
          <div className="space-y-4 mt-6">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : contract ? (
          <ScrollArea className="h-[calc(100vh-200px)] mt-6 pr-4">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
                <TabsTrigger value="payments" className="flex-1">Payments</TabsTrigger>
                <TabsTrigger value="changes" className="flex-1">Changes</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-6">
                {/* Contract Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={getSubcontractStatusVariant(contract.status)} className="mt-1">
                      {contract.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Retention</p>
                    <p className="font-medium">{contract.retention_percent}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Start Date</p>
                    <p className="font-medium">
                      {contract.start_date
                        ? new Date(contract.start_date).toLocaleDateString()
                        : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Completion Date</p>
                    <p className="font-medium">
                      {contract.completion_date
                        ? new Date(contract.completion_date).toLocaleDateString()
                        : 'Not set'}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Financials */}
                <div>
                  <h4 className="font-medium mb-4">Financial Summary</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Original Contract</span>
                      <span className="font-mono">{formatContractValue(contract.original_contract_value)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Approved Change Orders</span>
                      <span className="font-mono text-warning">
                        +{formatContractValue(contract.approved_change_orders || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pending Change Orders</span>
                      <span className="font-mono text-muted-foreground">
                        +{formatContractValue(contract.pending_change_orders || 0)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-medium">
                      <span>Current Contract Value</span>
                      <span className="font-mono">{formatContractValue(contract.current_contract_value)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Invoiced to Date</span>
                      <span className="font-mono">{formatContractValue(contract.invoicedAmount || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Paid to Date</span>
                      <span className="font-mono">{formatContractValue(contract.paidAmount || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Retention Held</span>
                      <span className="font-mono">
                        {formatContractValue((contract.invoicedAmount || 0) * (contract.retention_percent / 100))}
                      </span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Remaining Balance</span>
                      <span className="font-mono">
                        {formatContractValue(contract.current_contract_value - (contract.paidAmount || 0))}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Subcontractor */}
                <div>
                  <h4 className="font-medium mb-4">Subcontractor</h4>
                  {contract.subcontractor && (
                    <div className="space-y-2 text-sm">
                      <p className="font-medium">{contract.subcontractor.company_name}</p>
                      <p className="text-muted-foreground">{contract.subcontractor.contact_name}</p>
                      <p className="text-muted-foreground">{contract.subcontractor.email}</p>
                      <p className="text-muted-foreground">{contract.subcontractor.phone}</p>
                    </div>
                  )}
                </div>

                {/* Scope */}
                {contract.scope_of_work && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-2">Scope of Work</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {contract.scope_of_work}
                      </p>
                    </div>
                  </>
                )}

                <Button className="w-full" onClick={onEdit}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Contract
                </Button>
              </TabsContent>

              <TabsContent value="payments" className="space-y-4 mt-6">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Payment History</h4>
                  <Badge variant="secondary">{payments?.length || 0} payments</Badge>
                </div>
                {payments && payments.length > 0 ? (
                  <div className="space-y-3">
                    {payments.map((payment) => (
                      <Card key={payment.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">Payment #{payment.paymentNumber}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(payment.applicationDate).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-mono">{formatContractValue(payment.netPaymentDue)}</p>
                              <Badge variant={
                                payment.status === 'paid' ? 'default' :
                                payment.status === 'approved' ? 'secondary' : 'outline'
                              }>
                                {payment.status}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No payments recorded</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="changes" className="space-y-4 mt-6">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Change Orders</h4>
                  <Badge variant="secondary">{changeOrders?.length || 0} change orders</Badge>
                </div>
                {changeOrders && changeOrders.length > 0 ? (
                  <div className="space-y-3">
                    {changeOrders.map((co) => (
                      <Card key={co.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{co.changeOrderNumber}: {co.title}</p>
                              {co.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                  {co.description}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className={cn(
                                'font-mono',
                                co.amount > 0 ? 'text-warning' : co.amount < 0 ? 'text-success' : ''
                              )}>
                                {co.amount > 0 ? '+' : ''}{formatContractValue(co.amount)}
                              </p>
                              <Badge variant={
                                co.status === 'approved' ? 'default' :
                                co.status === 'pending' ? 'secondary' : 'outline'
                              }>
                                {co.status}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No change orders</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </ScrollArea>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function SubcontractListLoading() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-7 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
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
    </div>
  )
}
