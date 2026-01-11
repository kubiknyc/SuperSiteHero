/**
 * SubcontractManager Component
 * Comprehensive subcontract management with amendments, billing, and lien waivers
 */

import { useState, useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format, formatDistanceToNow, differenceInDays } from 'date-fns'
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Clock,
  DollarSign,
  Download,
  Edit,
  ExternalLink,
  Eye,
  FileCheck,
  FileContract,
  FileEdit,
  FilePlus,
  FileText,
  FileWarning,
  Filter,
  History,
  Loader2,
  MoreHorizontal,
  Pause,
  PenSquare,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Send,
  Settings,
  Shield,
  Stamp,
  Trash2,
  TrendingUp,
  UserCheck,
  X,
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
} from '@/components/ui/dropdown-menu'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
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
} from '@/components/ui/sheet'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  useSubcontracts,
  useSubcontract,
  useSubcontractSummary,
  useSubcontractAmendments,
  useSubcontractPayments,
  useCreateSubcontract,
  useUpdateSubcontract,
  useUpdateSubcontractStatus,
  useCreateAmendment,
  useExecuteAmendment,
  useDeleteSubcontract,
  getSubcontractStatusVariant,
  formatContractValue,
  calculatePercentComplete,
} from '../hooks'
import type {
  Subcontract,
  SubcontractWithDetails,
  SubcontractAmendment,
  SubcontractPayment,
  LienWaiver,
  SubcontractStatus,
} from '../types'
import { cn } from '@/lib/utils'

// Status configuration
const STATUS_CONFIG: Record<SubcontractStatus, { label: string; icon: typeof FileContract; color: string }> = {
  draft: { label: 'Draft', icon: FileEdit, color: 'bg-muted text-muted-foreground' },
  pending_signature: { label: 'Pending Signature', icon: PenSquare, color: 'bg-warning/10 text-warning' },
  executed: { label: 'Executed', icon: FileCheck, color: 'bg-success/10 text-success' },
  in_progress: { label: 'In Progress', icon: Clock, color: 'bg-primary/10 text-primary' },
  complete: { label: 'Complete', icon: Check, color: 'bg-success/10 text-success' },
  closed: { label: 'Closed', icon: FileText, color: 'bg-muted text-muted-foreground' },
  terminated: { label: 'Terminated', icon: X, color: 'bg-error/10 text-error' },
  suspended: { label: 'Suspended', icon: Pause, color: 'bg-warning/10 text-warning' },
}

// Form schemas
const subcontractSchema = z.object({
  subcontractorId: z.string().min(1, 'Subcontractor is required'),
  projectId: z.string().min(1, 'Project is required'),
  contractNumber: z.string().min(1, 'Contract number is required'),
  description: z.string().min(1, 'Description is required'),
  scopeOfWork: z.string().min(1, 'Scope of work is required'),
  originalContractValue: z.number().min(0, 'Contract value must be positive'),
  retentionPercent: z.number().min(0).max(100).default(10),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  paymentTerms: z.string().optional(),
  specialConditions: z.string().optional(),
})

const amendmentSchema = z.object({
  amendmentNumber: z.string().min(1, 'Amendment number is required'),
  description: z.string().min(1, 'Description is required'),
  changeAmount: z.number(),
  newContractValue: z.number(),
  changeType: z.enum(['addition', 'deduction', 'time_extension', 'scope_change']),
  reason: z.string().min(1, 'Reason is required'),
  effectiveDate: z.string().min(1, 'Effective date is required'),
  daysAdded: z.number().optional(),
})

type SubcontractFormValues = z.infer<typeof subcontractSchema>
type AmendmentFormValues = z.infer<typeof amendmentSchema>

interface SubcontractManagerProps {
  projectId?: string
  subcontractorId?: string
  onViewSubcontractor?: (id: string) => void
}

export function SubcontractManager({
  projectId,
  subcontractorId,
  onViewSubcontractor,
}: SubcontractManagerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<SubcontractStatus | 'all'>('all')
  const [selectedSubcontractId, setSelectedSubcontractId] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showAmendmentDialog, setShowAmendmentDialog] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'active' | 'completed'>('all')

  // Queries - always call useSubcontracts with optional projectId filter
  const { data: subcontracts, isLoading } = useSubcontracts(
    projectId ? { projectId } : {}
  )
  const { data: summary } = useSubcontractSummary(projectId)
  const { data: selectedSubcontract } = useSubcontract(selectedSubcontractId || undefined)
  const { data: amendments } = useSubcontractAmendments(selectedSubcontractId || undefined)
  const { data: payments } = useSubcontractPayments(selectedSubcontractId || undefined)

  // Mutations
  const createMutation = useCreateSubcontract()
  const updateMutation = useUpdateSubcontract()
  const updateStatusMutation = useUpdateSubcontractStatus()
  const createAmendmentMutation = useCreateAmendment()
  const executeAmendmentMutation = useExecuteAmendment()
  const deleteMutation = useDeleteSubcontract()

  // Filter subcontracts
  const filteredSubcontracts = useMemo(() => {
    if (!subcontracts) {return []}

    return subcontracts.filter((sub) => {
      // Status filter
      if (statusFilter !== 'all' && sub.status !== statusFilter) {return false}

      // Tab filter
      if (activeTab === 'pending' && sub.status !== 'pending_signature') {return false}
      if (activeTab === 'active' && !['executed', 'in_progress'].includes(sub.status)) {return false}
      if (activeTab === 'completed' && !['complete', 'closed'].includes(sub.status)) {return false}

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          sub.contractNumber.toLowerCase().includes(query) ||
          sub.description.toLowerCase().includes(query) ||
          sub.subcontractorName?.toLowerCase().includes(query)
        )
      }

      return true
    })
  }, [subcontracts, statusFilter, activeTab, searchQuery])

  // Handle status change
  const handleStatusChange = useCallback(async (id: string, status: SubcontractStatus) => {
    await updateStatusMutation.mutateAsync({ id, status })
  }, [updateStatusMutation])

  if (isLoading) {
    return <SubcontractManagerLoading />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileContract className="h-6 w-6" />
            Subcontracts
          </h2>
          <p className="text-muted-foreground">
            Manage subcontract agreements, amendments, and payments
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Subcontract
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <SummaryCard
            title="Total Subcontracts"
            value={summary.totalSubcontracts}
            icon={FileContract}
            color="bg-primary/10 text-primary"
          />
          <SummaryCard
            title="Original Value"
            value={formatContractValue(summary.originalContractValue)}
            icon={DollarSign}
            color="bg-muted text-muted-foreground"
            isMonetary
          />
          <SummaryCard
            title="Current Value"
            value={formatContractValue(summary.currentContractValue)}
            icon={TrendingUp}
            color="bg-primary/10 text-primary"
            isMonetary
          />
          <SummaryCard
            title="Billed to Date"
            value={formatContractValue(summary.billedToDate)}
            icon={Receipt}
            color="bg-success/10 text-success"
            isMonetary
          />
          <SummaryCard
            title="Remaining"
            value={formatContractValue(summary.remainingValue)}
            icon={CircleDollarSign}
            color="bg-warning/10 text-warning"
            isMonetary
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Subcontracts List */}
        <div className="flex-1">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
                  <TabsList>
                    <TabsTrigger value="all">
                      All
                      <Badge variant="secondary" className="ml-1">
                        {subcontracts?.length || 0}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="active">Active</TabsTrigger>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as SubcontractStatus | 'all')}>
                    <SelectTrigger className="w-40">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contract #</TableHead>
                      <TableHead>Subcontractor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead className="text-right">Billed</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubcontracts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                          {searchQuery || statusFilter !== 'all'
                            ? 'No subcontracts match your filters'
                            : 'No subcontracts found'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSubcontracts.map((sub) => (
                        <SubcontractRow
                          key={sub.id}
                          subcontract={sub}
                          isSelected={selectedSubcontractId === sub.id}
                          onSelect={() => setSelectedSubcontractId(sub.id)}
                          onStatusChange={handleStatusChange}
                          onViewSubcontractor={onViewSubcontractor}
                        />
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detail Panel */}
        {selectedSubcontract && (
          <SubcontractDetailPanel
            subcontract={selectedSubcontract}
            amendments={amendments || []}
            payments={payments || []}
            onClose={() => setSelectedSubcontractId(null)}
            onAddAmendment={() => setShowAmendmentDialog(true)}
            onExecuteAmendment={executeAmendmentMutation.mutateAsync}
          />
        )}
      </div>

      {/* Create Subcontract Dialog */}
      <CreateSubcontractDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={createMutation.mutateAsync}
        isLoading={createMutation.isPending}
        projectId={projectId}
      />

      {/* Create Amendment Dialog */}
      {selectedSubcontract && (
        <CreateAmendmentDialog
          open={showAmendmentDialog}
          onOpenChange={setShowAmendmentDialog}
          onSubmit={(data) => createAmendmentMutation.mutateAsync({
            subcontractId: selectedSubcontract.id,
            ...data,
          })}
          isLoading={createAmendmentMutation.isPending}
          currentValue={selectedSubcontract.currentContractValue}
          amendmentCount={(amendments?.length || 0) + 1}
        />
      )}
    </div>
  )
}

// =============================================
// Sub-components
// =============================================

interface SummaryCardProps {
  title: string
  value: string | number
  icon: typeof FileContract
  color: string
  isMonetary?: boolean
}

function SummaryCard({ title, value, icon: Icon, color, isMonetary }: SummaryCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={cn('text-xl font-bold', isMonetary && 'font-mono')}>
              {value}
            </p>
          </div>
          <div className={cn('p-2 rounded-lg', color)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface SubcontractRowProps {
  subcontract: SubcontractWithDetails
  isSelected: boolean
  onSelect: () => void
  onStatusChange: (id: string, status: SubcontractStatus) => void
  onViewSubcontractor?: (id: string) => void
}

function SubcontractRow({
  subcontract,
  isSelected,
  onSelect,
  onStatusChange,
  onViewSubcontractor,
}: SubcontractRowProps) {
  const statusConfig = STATUS_CONFIG[subcontract.status]
  const StatusIcon = statusConfig.icon
  const percentComplete = calculatePercentComplete(
    subcontract.billedToDate,
    subcontract.currentContractValue
  )

  return (
    <TableRow
      className={cn('cursor-pointer', isSelected && 'bg-muted/50')}
      onClick={onSelect}
    >
      <TableCell>
        <div>
          <p className="font-medium font-mono">{subcontract.contractNumber}</p>
          <p className="text-xs text-muted-foreground">{subcontract.description}</p>
        </div>
      </TableCell>
      <TableCell>
        <Button
          variant="link"
          className="p-0 h-auto"
          onClick={(e) => {
            e.stopPropagation()
            onViewSubcontractor?.(subcontract.subcontractorId)
          }}
        >
          {subcontract.subcontractorName}
        </Button>
      </TableCell>
      <TableCell>
        <Badge className={statusConfig.color}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {statusConfig.label}
        </Badge>
      </TableCell>
      <TableCell className="text-right font-mono">
        {formatContractValue(subcontract.currentContractValue)}
        {subcontract.amendments && subcontract.amendments > 0 && (
          <div className="text-xs text-muted-foreground">
            ({subcontract.amendments} amendments)
          </div>
        )}
      </TableCell>
      <TableCell className="text-right font-mono">
        {formatContractValue(subcontract.billedToDate)}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Progress value={percentComplete} className="h-2 w-16" />
          <span className="text-sm text-muted-foreground">{percentComplete}%</span>
        </div>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelect() }}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Change Status</DropdownMenuLabel>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <DropdownMenuItem
                key={key}
                onClick={(e) => {
                  e.stopPropagation()
                  onStatusChange(subcontract.id, key as SubcontractStatus)
                }}
                disabled={subcontract.status === key}
              >
                <config.icon className="h-4 w-4 mr-2" />
                {config.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

interface SubcontractDetailPanelProps {
  subcontract: SubcontractWithDetails
  amendments: SubcontractAmendment[]
  payments: SubcontractPayment[]
  onClose: () => void
  onAddAmendment: () => void
  onExecuteAmendment: (data: { amendmentId: string }) => Promise<any>
}

function SubcontractDetailPanel({
  subcontract,
  amendments,
  payments,
  onClose,
  onAddAmendment,
  onExecuteAmendment,
}: SubcontractDetailPanelProps) {
  const statusConfig = STATUS_CONFIG[subcontract.status]
  const StatusIcon = statusConfig.icon
  const percentComplete = calculatePercentComplete(
    subcontract.billedToDate,
    subcontract.currentContractValue
  )

  // Lien waiver tracking
  const lienWaivers: LienWaiver[] = subcontract.lienWaivers || []
  const currentPeriodWaiver = lienWaivers.find((w) => !w.isFinal && w.status === 'pending')

  return (
    <Card className="lg:w-[420px] shrink-0">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-mono">{subcontract.contractNumber}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Building2 className="h-3 w-3" />
              {subcontract.subcontractorName}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Badge className={cn('w-fit mt-2', statusConfig.color)}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {statusConfig.label}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Contract Value Summary */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Original Value</span>
            <span className="font-mono">{formatContractValue(subcontract.originalContractValue)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Change Orders</span>
            <span className="font-mono">
              {formatContractValue(subcontract.currentContractValue - subcontract.originalContractValue)}
            </span>
          </div>
          <Separator />
          <div className="flex justify-between font-medium">
            <span>Current Value</span>
            <span className="font-mono">{formatContractValue(subcontract.currentContractValue)}</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Billed to Date</span>
              <span className="font-mono">{formatContractValue(subcontract.billedToDate)}</span>
            </div>
            <Progress value={percentComplete} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{percentComplete}% complete</span>
              <span>
                Remaining: {formatContractValue(subcontract.currentContractValue - subcontract.billedToDate)}
              </span>
            </div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Retention ({subcontract.retentionPercent || 10}%)</span>
            <span className="font-mono text-warning">
              {formatContractValue(subcontract.retentionHeld || 0)}
            </span>
          </div>
        </div>

        <Separator />

        {/* Tabs */}
        <Tabs defaultValue="amendments">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="amendments">
              Amendments
              {amendments.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {amendments.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="waivers">Waivers</TabsTrigger>
          </TabsList>

          <TabsContent value="amendments" className="mt-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-sm">Contract Amendments</h4>
                <Button variant="outline" size="sm" onClick={onAddAmendment}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {amendments.map((amendment) => (
                    <div
                      key={amendment.id}
                      className={cn(
                        'p-3 rounded-lg border',
                        amendment.status === 'executed' && 'bg-success/5 border-success/20',
                        amendment.status === 'pending' && 'bg-warning/5 border-warning/20'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm">{amendment.amendmentNumber}</span>
                        <Badge
                          variant={amendment.status === 'executed' ? 'default' : 'secondary'}
                        >
                          {amendment.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                        {amendment.description}
                      </p>
                      <div className="flex justify-between items-center mt-2">
                        <span className={cn(
                          'font-mono text-sm',
                          amendment.changeAmount > 0 ? 'text-error' : 'text-success'
                        )}>
                          {amendment.changeAmount > 0 ? '+' : ''}
                          {formatContractValue(amendment.changeAmount)}
                        </span>
                        {amendment.status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onExecuteAmendment({ amendmentId: amendment.id })}
                          >
                            <Stamp className="h-3 w-3 mr-1" />
                            Execute
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {amendments.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      <FileEdit className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No amendments yet</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="billing" className="mt-4">
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Payment History</h4>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {payments.map((payment) => (
                    <div key={payment.id} className="p-3 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Pay App #{payment.payAppNumber}</span>
                        <Badge variant={
                          payment.status === 'paid' ? 'default' :
                          payment.status === 'approved' ? 'secondary' : 'outline'
                        }>
                          {payment.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center mt-2 text-sm">
                        <span className="text-muted-foreground">
                          {format(new Date(payment.periodEndDate), 'MMM d, yyyy')}
                        </span>
                        <span className="font-mono">
                          {formatContractValue(payment.amountRequested)}
                        </span>
                      </div>
                      {payment.amountPaid && payment.amountPaid !== payment.amountRequested && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Approved: {formatContractValue(payment.amountPaid)}
                        </div>
                      )}
                    </div>
                  ))}
                  {payments.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No payments yet</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="waivers" className="mt-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-sm">Lien Waivers</h4>
                {currentPeriodWaiver && (
                  <Badge variant="secondary" className="text-xs">
                    Pending
                  </Badge>
                )}
              </div>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {lienWaivers.map((waiver) => (
                    <div
                      key={waiver.id}
                      className={cn(
                        'p-3 rounded-lg border',
                        waiver.status === 'received' && 'bg-success/5 border-success/20',
                        waiver.status === 'pending' && 'bg-warning/5 border-warning/20'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {waiver.isFinal ? 'Final' : 'Partial'} Waiver
                          </span>
                          {waiver.isConditional && (
                            <Badge variant="outline" className="text-xs">Conditional</Badge>
                          )}
                        </div>
                        <Badge variant={waiver.status === 'received' ? 'default' : 'secondary'}>
                          {waiver.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center mt-2 text-sm">
                        <span className="text-muted-foreground">
                          Through {format(new Date(waiver.throughDate), 'MMM d, yyyy')}
                        </span>
                        <span className="font-mono">
                          {formatContractValue(waiver.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {lienWaivers.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      <FileCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No lien waivers yet</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" className="flex-1">
            <History className="h-4 w-4 mr-2" />
            Audit Log
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

interface CreateSubcontractDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: any) => Promise<any>
  isLoading: boolean
  projectId?: string
}

function CreateSubcontractDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  projectId,
}: CreateSubcontractDialogProps) {
  const form = useForm<SubcontractFormValues>({
    resolver: zodResolver(subcontractSchema),
    defaultValues: {
      projectId: projectId || '',
      retentionPercent: 10,
      startDate: format(new Date(), 'yyyy-MM-dd'),
    },
  })

  const handleSubmit = async (data: SubcontractFormValues) => {
    await onSubmit(data)
    onOpenChange(false)
    form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Subcontract</DialogTitle>
          <DialogDescription>
            Create a new subcontract agreement
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contractNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract Number *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., SC-2025-001" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subcontractorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subcontractor *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select subcontractor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {/* This would be populated from subcontractors list */}
                        <SelectItem value="sub-1">ABC Electric Co.</SelectItem>
                        <SelectItem value="sub-2">XYZ Plumbing</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Brief description of work" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="scopeOfWork"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scope of Work *</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={4} placeholder="Detailed scope of work..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="originalContractValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract Value *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          {...field}
                          type="number"
                          className="pl-9"
                          placeholder="0.00"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="retentionPercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Retention %</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        max="100"
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date *</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Completion Date</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="paymentTerms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Terms</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Net 30" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="specialConditions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Special Conditions</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} placeholder="Any special terms or conditions..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Subcontract'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

interface CreateAmendmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: any) => Promise<any>
  isLoading: boolean
  currentValue: number
  amendmentCount: number
}

function CreateAmendmentDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  currentValue,
  amendmentCount,
}: CreateAmendmentDialogProps) {
  const form = useForm<AmendmentFormValues>({
    resolver: zodResolver(amendmentSchema),
    defaultValues: {
      amendmentNumber: `AMD-${String(amendmentCount).padStart(3, '0')}`,
      changeAmount: 0,
      newContractValue: currentValue,
      changeType: 'addition',
      effectiveDate: format(new Date(), 'yyyy-MM-dd'),
    },
  })

  const changeAmount = form.watch('changeAmount')
  const changeType = form.watch('changeType')

  // Update new contract value when change amount changes
  const handleChangeAmountChange = (value: number) => {
    form.setValue('changeAmount', value)
    const multiplier = changeType === 'deduction' ? -1 : 1
    form.setValue('newContractValue', currentValue + (value * multiplier))
  }

  const handleSubmit = async (data: AmendmentFormValues) => {
    await onSubmit(data)
    onOpenChange(false)
    form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Amendment</DialogTitle>
          <DialogDescription>
            Create a contract amendment for change order
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amendmentNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amendment #</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="changeType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="addition">Addition</SelectItem>
                        <SelectItem value="deduction">Deduction</SelectItem>
                        <SelectItem value="time_extension">Time Extension</SelectItem>
                        <SelectItem value="scope_change">Scope Change</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Reason for change" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="changeAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Change Amount</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          {...field}
                          type="number"
                          className="pl-9"
                          onChange={(e) => handleChangeAmountChange(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="newContractValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Contract Value</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          {...field}
                          type="number"
                          className="pl-9"
                          disabled
                          value={field.value}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="effectiveDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Effective Date *</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="daysAdded"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Days Added</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="p-3 rounded-lg bg-muted text-sm">
              <div className="flex justify-between">
                <span>Current Value:</span>
                <span className="font-mono">{formatContractValue(currentValue)}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span>Change:</span>
                <span className={cn(
                  'font-mono',
                  changeType === 'deduction' ? 'text-success' : 'text-error'
                )}>
                  {changeType === 'deduction' ? '-' : '+'}
                  {formatContractValue(Math.abs(changeAmount))}
                </span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-medium">
                <span>New Value:</span>
                <span className="font-mono">
                  {formatContractValue(form.watch('newContractValue'))}
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Amendment'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function SubcontractManagerLoading() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="grid grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-[500px]" />
    </div>
  )
}
