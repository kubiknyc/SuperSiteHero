/**
 * Schedule of Values (SOV) Component
 *
 * Full-featured SOV management with:
 * - Line item breakdown by CSI division
 * - Billing period tracking
 * - Retainage management
 * - Import from estimate
 */

import { useState, useMemo, useCallback } from 'react'
import {
  Plus,
  Trash2,
  Save,
  X,
  Edit2,
  GripVertical,
  Download,
  Upload,
  RefreshCw,
  FileText,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Lock,
  Unlock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import {
  useScheduleOfValues,
  useCreateSOV,
  useUpdateSOV,
  useAddSOVLineItem,
  useUpdateSOVLineItem,
  useUpdateSOVLineItemBilling,
  useDeleteSOVLineItem,
  useReorderSOVLineItems,
  useRollBillingForward,
  useCSIDivisions,
} from '../hooks/useScheduleOfValues'
import type { SOVLineItem, SOVLineItemInsert, ScheduleOfValues as SOVType } from '../types/sov'

// ============================================================================
// TYPES
// ============================================================================

interface ScheduleOfValuesProps {
  projectId: string
  isEditable?: boolean
  onCreatePaymentApplication?: () => void
  className?: string
}

interface LineItemFormData {
  item_number: string
  description: string
  scheduled_value: string
  retainage_percent: string
  cost_code: string
  spec_section: string
  subcontractor_id: string
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
      return 'default'
    case 'draft':
      return 'secondary'
    case 'locked':
      return 'destructive'
    case 'archived':
      return 'outline'
    default:
      return 'outline'
  }
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface SOVSummaryCardsProps {
  sov: SOVType
}

function SOVSummaryCards({ sov }: SOVSummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Contract Sum
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(sov.current_contract_sum)}</div>
          <p className="text-xs text-muted-foreground">
            Original: {formatCurrency(sov.original_contract_sum)}
            {sov.change_orders_total !== 0 && (
              <span className={sov.change_orders_total > 0 ? 'text-green-600' : 'text-red-600'}>
                {' '}({sov.change_orders_total > 0 ? '+' : ''}{formatCurrency(sov.change_orders_total)})
              </span>
            )}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Completed & Stored
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(sov.total_completed_and_stored)}
          </div>
          <div className="mt-2">
            <Progress value={sov.overall_percent_complete} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {formatPercent(sov.overall_percent_complete)} complete
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Retainage Held
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(sov.total_retainage_held)}</div>
          <p className="text-xs text-muted-foreground">
            Released: {formatCurrency(sov.total_retainage_released)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Balance to Finish
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(sov.total_balance_to_finish)}</div>
          <p className="text-xs text-muted-foreground">
            {sov.line_items?.length || 0} line items
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

interface CreateSOVDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function CreateSOVDialog({ projectId, open, onOpenChange }: CreateSOVDialogProps) {
  const [contractSum, setContractSum] = useState('')
  const [retainagePercent, setRetainagePercent] = useState('10')
  const createSOV = useCreateSOV()

  const handleCreate = async () => {
    await createSOV.mutateAsync({
      project_id: projectId,
      original_contract_sum: parseFloat(contractSum) || 0,
      retainage_percent: parseFloat(retainagePercent) || 10,
      status: 'draft',
    })
    onOpenChange(false)
    setContractSum('')
    setRetainagePercent('10')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Schedule of Values</DialogTitle>
          <DialogDescription>
            Set up the initial contract information for this project.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="contract-sum">Original Contract Sum</Label>
            <Input
              id="contract-sum"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={contractSum}
              onChange={(e) => setContractSum(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="retainage">Default Retainage %</Label>
            <Input
              id="retainage"
              type="number"
              step="0.5"
              min="0"
              max="100"
              value={retainagePercent}
              onChange={(e) => setRetainagePercent(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={createSOV.isPending}>
            {createSOV.isPending ? 'Creating...' : 'Create SOV'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ScheduleOfValues({
  projectId,
  isEditable = true,
  onCreatePaymentApplication,
  className,
}: ScheduleOfValuesProps) {
  const { data: sov, isLoading, error, refetch } = useScheduleOfValues(projectId)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [billingMode, setBillingMode] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const csiDivisions = useCSIDivisions()
  const addLineItem = useAddSOVLineItem()
  const updateLineItem = useUpdateSOVLineItem()
  const updateBilling = useUpdateSOVLineItemBilling()
  const deleteLineItem = useDeleteSOVLineItem()
  const reorderItems = useReorderSOVLineItems()
  const rollForward = useRollBillingForward()
  const updateSOV = useUpdateSOV()

  const defaultFormData: LineItemFormData = {
    item_number: '',
    description: '',
    scheduled_value: '0',
    retainage_percent: String(sov?.retainage_percent || 10),
    cost_code: '',
    spec_section: '',
    subcontractor_id: '',
  }

  const [formData, setFormData] = useState<LineItemFormData>(defaultFormData)
  const [billingUpdates, setBillingUpdates] = useState<Record<string, { work: string; materials: string }>>({})

  // Generate next item number
  const nextItemNumber = useMemo(() => {
    if (!sov?.line_items?.length) return '001'
    const maxNumber = Math.max(
      ...sov.line_items.map((li) => parseInt(li.item_number) || 0)
    )
    return String(maxNumber + 1).padStart(3, '0')
  }, [sov?.line_items])

  // Handle form change
  const handleFormChange = useCallback((field: keyof LineItemFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }, [])

  // Start editing
  const startEditing = useCallback((item: SOVLineItem) => {
    setEditingId(item.id)
    setFormData({
      item_number: item.item_number,
      description: item.description,
      scheduled_value: String(item.scheduled_value),
      retainage_percent: String(item.retainage_percent),
      cost_code: item.cost_code || '',
      spec_section: item.spec_section || '',
      subcontractor_id: item.subcontractor_id || '',
    })
  }, [])

  // Cancel editing
  const cancelEditing = useCallback(() => {
    setEditingId(null)
    setShowAddForm(false)
    setFormData({
      ...defaultFormData,
      item_number: nextItemNumber,
    })
  }, [defaultFormData, nextItemNumber])

  // Save line item
  const handleSave = async () => {
    if (!formData.description.trim() || !sov) return

    const itemData: SOVLineItemInsert = {
      sov_id: sov.id,
      item_number: formData.item_number || nextItemNumber,
      description: formData.description.trim(),
      scheduled_value: parseFloat(formData.scheduled_value) || 0,
      retainage_percent: parseFloat(formData.retainage_percent) || 10,
      cost_code: formData.cost_code.trim() || undefined,
      spec_section: formData.spec_section.trim() || undefined,
      subcontractor_id: formData.subcontractor_id || undefined,
    }

    if (editingId) {
      await updateLineItem.mutateAsync({ id: editingId, data: itemData })
    } else {
      await addLineItem.mutateAsync(itemData)
    }
    cancelEditing()
  }

  // Delete line item
  const handleDelete = async () => {
    if (!deleteConfirmId) return
    await deleteLineItem.mutateAsync(deleteConfirmId)
    setDeleteConfirmId(null)
  }

  // Save billing updates
  const handleSaveBilling = async () => {
    const updates = Object.entries(billingUpdates)
      .filter(([_, values]) => values.work !== '' || values.materials !== '')
      .map(([id, values]) => ({
        id,
        work_completed_this_period: values.work !== '' ? parseFloat(values.work) : undefined,
        materials_stored_this_period: values.materials !== '' ? parseFloat(values.materials) : undefined,
      }))

    if (updates.length > 0) {
      await updateBilling.mutateAsync(updates)
    }
    setBillingMode(false)
    setBillingUpdates({})
  }

  // Handle billing input change
  const handleBillingChange = (id: string, field: 'work' | 'materials', value: string) => {
    setBillingUpdates((prev) => ({
      ...prev,
      [id]: {
        ...prev[id] || { work: '', materials: '' },
        [field]: value,
      },
    }))
  }

  // Roll billing forward
  const handleRollForward = async () => {
    if (!sov) return
    await rollForward.mutateAsync(sov.id)
  }

  // Toggle row expansion
  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Lock/unlock SOV
  const handleToggleLock = async () => {
    if (!sov) return
    await updateSOV.mutateAsync({
      id: sov.id,
      data: { status: sov.status === 'locked' ? 'active' : 'locked' },
    })
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
          <p className="text-lg font-medium">Error loading Schedule of Values</p>
          <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
          <Button onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  // No SOV exists yet
  if (!sov) {
    return (
      <>
        <Card className={className}>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No Schedule of Values</p>
            <p className="text-sm text-muted-foreground mb-4">
              Create a Schedule of Values to track billing and progress.
            </p>
            {isEditable && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Schedule of Values
              </Button>
            )}
          </CardContent>
        </Card>
        <CreateSOVDialog
          projectId={projectId}
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
        />
      </>
    )
  }

  const isLocked = sov.status === 'locked'
  const canEdit = isEditable && !isLocked

  // Render form
  const renderForm = () => (
    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Item #</Label>
          <Input
            value={formData.item_number}
            onChange={(e) => handleFormChange('item_number', e.target.value)}
            placeholder={nextItemNumber}
          />
        </div>
        <div className="md:col-span-2">
          <Label>Description *</Label>
          <Input
            value={formData.description}
            onChange={(e) => handleFormChange('description', e.target.value)}
            placeholder="Enter item description..."
          />
        </div>
        <div>
          <Label>Scheduled Value ($)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.scheduled_value}
            onChange={(e) => handleFormChange('scheduled_value', e.target.value)}
          />
        </div>
        <div>
          <Label>Retainage (%)</Label>
          <Input
            type="number"
            step="0.5"
            min="0"
            max="100"
            value={formData.retainage_percent}
            onChange={(e) => handleFormChange('retainage_percent', e.target.value)}
          />
        </div>
        <div>
          <Label>Cost Code</Label>
          <Select
            value={formData.cost_code || '__none__'}
            onValueChange={(value) => handleFormChange('cost_code', value === '__none__' ? '' : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select division..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {csiDivisions.map((div) => (
                <SelectItem key={div.code} value={div.code}>
                  {div.code} - {div.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Spec Section</Label>
          <Input
            value={formData.spec_section}
            onChange={(e) => handleFormChange('spec_section', e.target.value)}
            placeholder="e.g., 03 30 00"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={cancelEditing}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!formData.description.trim() || addLineItem.isPending || updateLineItem.isPending}
        >
          <Save className="h-4 w-4 mr-2" />
          {addLineItem.isPending || updateLineItem.isPending ? 'Saving...' : editingId ? 'Update' : 'Add Item'}
        </Button>
      </div>
    </div>
  )

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Schedule of Values</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={getStatusBadgeVariant(sov.status)}>
              {sov.status.charAt(0).toUpperCase() + sov.status.slice(1)}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {sov.line_items?.length || 0} line items
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {isEditable && (
            <Button variant="outline" size="sm" onClick={handleToggleLock}>
              {isLocked ? (
                <>
                  <Unlock className="h-4 w-4 mr-2" />
                  Unlock
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Lock
                </>
              )}
            </Button>
          )}
          {onCreatePaymentApplication && sov.line_items && sov.line_items.length > 0 && (
            <Button onClick={onCreatePaymentApplication}>
              <FileText className="h-4 w-4 mr-2" />
              Create Pay App
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <SOVSummaryCards sov={sov} />

      {/* Line Items Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Line Items</CardTitle>
              <CardDescription>
                Track work completed and materials stored for each item
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {billingMode ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => { setBillingMode(false); setBillingUpdates({}) }}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveBilling} disabled={updateBilling.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    {updateBilling.isPending ? 'Saving...' : 'Save Billing'}
                  </Button>
                </>
              ) : (
                <>
                  {canEdit && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setBillingMode(true)}>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit Billing
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleRollForward} disabled={rollForward.isPending}>
                        <RefreshCw className={cn('h-4 w-4 mr-2', rollForward.isPending && 'animate-spin')} />
                        Roll Forward
                      </Button>
                      {!showAddForm && !editingId && (
                        <Button size="sm" onClick={() => { setShowAddForm(true); setFormData({ ...defaultFormData, item_number: nextItemNumber }) }}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Item
                        </Button>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Form */}
          {showAddForm && !editingId && renderForm()}

          {/* Items Table */}
          {sov.line_items && sov.line_items.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-8"></TableHead>
                    <TableHead className="w-16">Item #</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right w-28">Scheduled Value</TableHead>
                    <TableHead className="text-right w-24">Previous %</TableHead>
                    <TableHead className="text-right w-28">Previous $</TableHead>
                    <TableHead className="text-right w-24">This Period %</TableHead>
                    <TableHead className="text-right w-28">This Period $</TableHead>
                    <TableHead className="text-right w-20">Total %</TableHead>
                    <TableHead className="text-right w-28">Balance</TableHead>
                    {canEdit && <TableHead className="w-24"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sov.line_items.map((item) => {
                    const isExpanded = expandedRows.has(item.id)
                    const previousPercent = item.scheduled_value > 0
                      ? ((item.work_completed_previous + item.materials_stored_previous) / item.scheduled_value) * 100
                      : 0
                    const thisPeriodPercent = item.scheduled_value > 0
                      ? ((item.work_completed_this_period + item.materials_stored_this_period) / item.scheduled_value) * 100
                      : 0

                    if (editingId === item.id) {
                      return (
                        <TableRow key={item.id}>
                          <TableCell colSpan={canEdit ? 11 : 10}>
                            {renderForm()}
                          </TableCell>
                        </TableRow>
                      )
                    }

                    return (
                      <Collapsible key={item.id} asChild>
                        <>
                          <TableRow className="group">
                            <TableCell>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleRow(item.id)}>
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{item.item_number}</TableCell>
                            <TableCell>
                              <div className="font-medium">{item.description}</div>
                              {item.cost_code && (
                                <div className="text-xs text-muted-foreground">{item.cost_code}</div>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(item.scheduled_value)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatPercent(previousPercent)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(item.work_completed_previous + item.materials_stored_previous)}
                            </TableCell>
                            <TableCell className="text-right">
                              {billingMode ? (
                                <Input
                                  type="number"
                                  step="0.01"
                                  className="w-20 h-8 text-right"
                                  placeholder="0"
                                  value={billingUpdates[item.id]?.work || ''}
                                  onChange={(e) => handleBillingChange(item.id, 'work', e.target.value)}
                                />
                              ) : (
                                <span className="font-mono">{formatPercent(thisPeriodPercent)}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(item.work_completed_this_period + item.materials_stored_this_period)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Progress value={item.percent_complete} className="w-12 h-2" />
                                <span className="font-mono text-sm">{formatPercent(item.percent_complete)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(item.balance_to_finish)}
                            </TableCell>
                            {canEdit && (
                              <TableCell>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEditing(item)}>
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-600 hover:text-red-700"
                                    onClick={() => setDeleteConfirmId(item.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                          <CollapsibleContent asChild>
                            <TableRow className="bg-muted/30">
                              <TableCell colSpan={canEdit ? 11 : 10}>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-2 px-4">
                                  <div>
                                    <p className="text-xs text-muted-foreground">Work Completed</p>
                                    <p className="font-medium">{formatCurrency(item.work_completed_total)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Materials Stored</p>
                                    <p className="font-medium">{formatCurrency(item.materials_stored_total)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Retainage ({item.retainage_percent}%)</p>
                                    <p className="font-medium">{formatCurrency(item.retainage_amount)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Spec Section</p>
                                    <p className="font-medium">{item.spec_section || 'N/A'}</p>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          </CollapsibleContent>
                        </>
                      </Collapsible>
                    )
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-muted font-medium">
                    <TableCell colSpan={3} className="text-right">
                      Totals
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      {formatCurrency(sov.total_scheduled_value)}
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(
                        sov.line_items.reduce(
                          (sum, li) => sum + li.work_completed_previous + li.materials_stored_previous,
                          0
                        )
                      )}
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(
                        sov.line_items.reduce(
                          (sum, li) => sum + li.work_completed_this_period + li.materials_stored_this_period,
                          0
                        )
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      {formatPercent(sov.overall_percent_complete)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      {formatCurrency(sov.total_balance_to_finish)}
                    </TableCell>
                    {canEdit && <TableCell></TableCell>}
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-4">No line items yet</p>
              {canEdit && (
                <Button onClick={() => { setShowAddForm(true); setFormData({ ...defaultFormData, item_number: nextItemNumber }) }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Line Item
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Line Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this line item? This action cannot be undone and will affect any associated billing history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default ScheduleOfValues
