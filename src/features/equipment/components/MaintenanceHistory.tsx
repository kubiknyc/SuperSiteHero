/**
 * Maintenance History Component
 * Phase 5.2: Equipment Maintenance Alerts
 *
 * Timeline view of equipment maintenance records with filtering and export
 */

import React, { useState, useMemo } from 'react'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  History,
  Wrench,
  Clock,
  User,
  DollarSign,
  Package,
  FileText,
  Download,
  Plus,
  Filter,
  Calendar,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Building,
  Loader2,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'
import type { Equipment } from '@/types/equipment'
import { cn, formatCurrency } from '@/lib/utils'

// =============================================================================
// TYPES
// =============================================================================

interface MaintenanceRecord {
  id: string
  equipment_id: string
  schedule_id: string | null
  performed_at: string
  performed_by: string | null
  hours_at_maintenance: number | null
  miles_at_maintenance: number | null
  maintenance_type: string
  description: string | null
  work_performed: string | null
  parts_used: string[] | null
  labor_cost: number | null
  parts_cost: number | null
  total_cost: number | null
  service_provider: string | null
  technician_name: string | null
  invoice_number: string | null
  next_due_at: string | null
  next_due_hours: number | null
  notes: string | null
  attachments: { file_url: string; file_name: string }[] | null
  created_at: string
  // Joined data
  performed_by_user?: {
    id: string
    full_name: string
    email: string
  } | null
}

interface RecordMaintenanceInput {
  equipment_id: string
  schedule_id?: string
  maintenance_type: string
  description?: string
  work_performed?: string
  hours_at_maintenance?: number
  miles_at_maintenance?: number
  parts_used?: string[]
  labor_cost?: number
  parts_cost?: number
  service_provider?: string
  technician_name?: string
  invoice_number?: string
  notes?: string
}

// =============================================================================
// API HOOKS
// =============================================================================

function useMaintenanceHistory(equipmentId: string | undefined) {
  return useQuery({
    queryKey: ['maintenance-records', equipmentId],
    queryFn: async (): Promise<MaintenanceRecord[]> => {
      if (!equipmentId) return []

      const { data, error } = await supabase
        .from('equipment_maintenance_records')
        .select(`
          *,
          performed_by_user:profiles!equipment_maintenance_records_performed_by_fkey(
            id, full_name, email
          )
        `)
        .eq('equipment_id', equipmentId)
        .order('performed_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!equipmentId,
  })
}

function useCreateMaintenanceRecord() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (input: RecordMaintenanceInput) => {
      const { data: user } = await supabase.auth.getUser()

      const totalCost =
        (input.labor_cost || 0) + (input.parts_cost || 0) || null

      const { data, error } = await supabase
        .from('equipment_maintenance_records')
        .insert({
          equipment_id: input.equipment_id,
          schedule_id: input.schedule_id || null,
          performed_at: new Date().toISOString(),
          performed_by: user?.user?.id || null,
          maintenance_type: input.maintenance_type,
          description: input.description || null,
          work_performed: input.work_performed || null,
          hours_at_maintenance: input.hours_at_maintenance || null,
          miles_at_maintenance: input.miles_at_maintenance || null,
          parts_used: input.parts_used || null,
          labor_cost: input.labor_cost || null,
          parts_cost: input.parts_cost || null,
          total_cost: totalCost,
          service_provider: input.service_provider || null,
          technician_name: input.technician_name || null,
          invoice_number: input.invoice_number || null,
          notes: input.notes || null,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['maintenance-records', variables.equipment_id],
      })
      queryClient.invalidateQueries({
        queryKey: ['maintenance-schedules'],
      })
      toast({
        title: 'Maintenance recorded',
        description: 'Maintenance record has been added to history.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to record maintenance.',
        variant: 'destructive',
      })
    },
  })
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface MaintenanceHistoryProps {
  equipment: Equipment
  className?: string
}

export function MaintenanceHistory({ equipment, className }: MaintenanceHistoryProps) {
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set())

  const { data: records, isLoading } = useMaintenanceHistory(equipment.id)

  // Get unique maintenance types for filter
  const maintenanceTypes = useMemo(() => {
    if (!records) return []
    const types = [...new Set(records.map((r) => r.maintenance_type))]
    return types.sort()
  }, [records])

  // Filter records
  const filteredRecords = useMemo(() => {
    if (!records) return []
    if (typeFilter === 'all') return records
    return records.filter((r) => r.maintenance_type === typeFilter)
  }, [records, typeFilter])

  // Calculate stats
  const stats = useMemo(() => {
    if (!records || records.length === 0) {
      return { totalRecords: 0, totalCost: 0, lastMaintenance: null }
    }

    return {
      totalRecords: records.length,
      totalCost: records.reduce((sum, r) => sum + (r.total_cost || 0), 0),
      lastMaintenance: records[0]?.performed_at || null,
    }
  }, [records])

  const toggleExpanded = (recordId: string) => {
    setExpandedRecords((prev) => {
      const next = new Set(prev)
      if (next.has(recordId)) {
        next.delete(recordId)
      } else {
        next.add(recordId)
      }
      return next
    })
  }

  const handleExportCSV = () => {
    if (!filteredRecords.length) return

    const headers = [
      'Date',
      'Type',
      'Description',
      'Work Performed',
      'Hours',
      'Labor Cost',
      'Parts Cost',
      'Total Cost',
      'Service Provider',
      'Technician',
      'Invoice #',
      'Notes',
    ]

    const rows = filteredRecords.map((r) => [
      r.performed_at ? format(parseISO(r.performed_at), 'yyyy-MM-dd') : '',
      r.maintenance_type,
      r.description || '',
      r.work_performed || '',
      r.hours_at_maintenance?.toString() || '',
      r.labor_cost?.toString() || '',
      r.parts_cost?.toString() || '',
      r.total_cost?.toString() || '',
      r.service_provider || '',
      r.technician_name || '',
      r.invoice_number || '',
      r.notes || '',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${equipment.equipment_number}_maintenance_history.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-disabled" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-info-light rounded-lg">
              <History className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Maintenance History</CardTitle>
              <CardDescription>
                {stats.totalRecords} records
                {stats.lastMaintenance && (
                  <> | Last maintenance {formatDistanceToNow(parseISO(stats.lastMaintenance), { addSuffix: true })}</>
                )}
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddDialog(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Record
            </Button>
          </div>
        </div>

        {/* Stats and Filters */}
        <div className="flex flex-wrap items-center gap-4 pt-4">
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-muted" />
            <span className="font-medium">
              {formatCurrency(stats.totalCost)}
            </span>
            <span className="text-muted">total cost</span>
          </div>

          <div className="flex-1" />

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px] h-9">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {maintenanceTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={!filteredRecords.length}
          >
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {filteredRecords.length === 0 ? (
          <div className="text-center py-8 text-muted">
            <History className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No maintenance records</p>
            <p className="text-sm">
              Records will appear here after maintenance is performed
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRecords.map((record, index) => (
              <MaintenanceRecordCard
                key={record.id}
                record={record}
                isExpanded={expandedRecords.has(record.id)}
                onToggleExpand={() => toggleExpanded(record.id)}
                isFirst={index === 0}
                isLast={index === filteredRecords.length - 1}
              />
            ))}
          </div>
        )}
      </CardContent>

      {/* Add Record Dialog */}
      <AddMaintenanceRecordDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        equipment={equipment}
      />
    </Card>
  )
}

// =============================================================================
// RECORD CARD COMPONENT
// =============================================================================

interface MaintenanceRecordCardProps {
  record: MaintenanceRecord
  isExpanded: boolean
  onToggleExpand: () => void
  isFirst: boolean
  isLast: boolean
}

function MaintenanceRecordCard({
  record,
  isExpanded,
  onToggleExpand,
  isFirst,
  isLast,
}: MaintenanceRecordCardProps) {
  return (
    <div className="relative">
      {/* Timeline connector */}
      {!isFirst && (
        <div className="absolute left-4 -top-4 w-0.5 h-4 bg-muted" />
      )}
      {!isLast && (
        <div className="absolute left-4 bottom-0 w-0.5 h-4 bg-muted" />
      )}

      <div
        className={cn(
          'flex items-start gap-4 p-4 rounded-lg border bg-card transition-colors',
          isExpanded ? 'border-blue-200 bg-blue-50/50' : 'hover:bg-surface'
        )}
      >
        {/* Timeline dot */}
        <div className="relative z-10 flex-shrink-0">
          <div className="w-8 h-8 bg-success-light rounded-full flex items-center justify-center">
            <CheckCircle className="h-4 w-4 text-success" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-medium text-foreground" className="heading-card">
                {record.maintenance_type.replace(/_/g, ' ')}
              </h4>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {format(parseISO(record.performed_at), 'MMM d, yyyy')}
                </span>
                {record.hours_at_maintenance && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {record.hours_at_maintenance.toFixed(1)} hrs
                  </span>
                )}
                {record.performed_by_user && (
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {record.performed_by_user.full_name}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {record.total_cost && record.total_cost > 0 && (
                <Badge variant="outline" className="font-mono">
                  {formatCurrency(record.total_cost)}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleExpand}
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {record.description && (
            <p className="text-sm text-secondary mt-2 line-clamp-2">
              {record.description}
            </p>
          )}

          {/* Expanded details */}
          {isExpanded && (
            <div className="mt-4 pt-4 border-t space-y-3">
              {record.work_performed && (
                <div>
                  <Label className="text-xs text-muted">Work Performed</Label>
                  <p className="text-sm">{record.work_performed}</p>
                </div>
              )}

              {record.parts_used && record.parts_used.length > 0 && (
                <div>
                  <Label className="text-xs text-muted flex items-center gap-1">
                    <Package className="h-3.5 w-3.5" />
                    Parts Used
                  </Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {record.parts_used.map((part, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {part}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {record.labor_cost !== null && (
                  <div>
                    <Label className="text-xs text-muted">Labor Cost</Label>
                    <p className="text-sm font-medium">
                      {formatCurrency(record.labor_cost)}
                    </p>
                  </div>
                )}
                {record.parts_cost !== null && (
                  <div>
                    <Label className="text-xs text-muted">Parts Cost</Label>
                    <p className="text-sm font-medium">
                      {formatCurrency(record.parts_cost)}
                    </p>
                  </div>
                )}
                {record.service_provider && (
                  <div>
                    <Label className="text-xs text-muted flex items-center gap-1">
                      <Building className="h-3.5 w-3.5" />
                      Service Provider
                    </Label>
                    <p className="text-sm">{record.service_provider}</p>
                  </div>
                )}
                {record.technician_name && (
                  <div>
                    <Label className="text-xs text-muted">Technician</Label>
                    <p className="text-sm">{record.technician_name}</p>
                  </div>
                )}
              </div>

              {record.invoice_number && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-disabled" />
                  <span className="text-sm text-secondary">
                    Invoice: {record.invoice_number}
                  </span>
                </div>
              )}

              {record.notes && (
                <div className="p-3 bg-muted rounded-lg">
                  <Label className="text-xs text-muted">Notes</Label>
                  <p className="text-sm mt-1">{record.notes}</p>
                </div>
              )}

              {record.next_due_at && (
                <div className="flex items-center gap-2 text-sm text-orange-600">
                  <AlertCircle className="h-4 w-4" />
                  Next due: {format(parseISO(record.next_due_at), 'MMM d, yyyy')}
                  {record.next_due_hours && (
                    <span className="text-muted">
                      or at {record.next_due_hours.toFixed(0)} hrs
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// ADD RECORD DIALOG
// =============================================================================

interface AddMaintenanceRecordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  equipment: Equipment
}

function AddMaintenanceRecordDialog({
  open,
  onOpenChange,
  equipment,
}: AddMaintenanceRecordDialogProps) {
  const createRecord = useCreateMaintenanceRecord()

  const [formData, setFormData] = useState<Partial<RecordMaintenanceInput>>({
    equipment_id: equipment.id,
    maintenance_type: '',
    hours_at_maintenance: equipment.current_hours || undefined,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.maintenance_type) return

    await createRecord.mutateAsync({
      equipment_id: equipment.id,
      maintenance_type: formData.maintenance_type,
      description: formData.description,
      work_performed: formData.work_performed,
      hours_at_maintenance: formData.hours_at_maintenance,
      parts_used: formData.parts_used,
      labor_cost: formData.labor_cost,
      parts_cost: formData.parts_cost,
      service_provider: formData.service_provider,
      technician_name: formData.technician_name,
      invoice_number: formData.invoice_number,
      notes: formData.notes,
    })

    setFormData({
      equipment_id: equipment.id,
      maintenance_type: '',
      hours_at_maintenance: equipment.current_hours || undefined,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Record Maintenance
          </DialogTitle>
          <DialogDescription>
            {equipment.equipment_number} - {equipment.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Maintenance Type */}
          <div className="space-y-2">
            <Label htmlFor="maintenance_type">Maintenance Type *</Label>
            <Input
              id="maintenance_type"
              placeholder="e.g., Oil Change, Filter Replacement"
              value={formData.maintenance_type || ''}
              onChange={(e) =>
                setFormData({ ...formData, maintenance_type: e.target.value })
              }
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the maintenance..."
              value={formData.description || ''}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={2}
            />
          </div>

          {/* Work Performed */}
          <div className="space-y-2">
            <Label htmlFor="work_performed">Work Performed</Label>
            <Textarea
              id="work_performed"
              placeholder="Detailed description of work done..."
              value={formData.work_performed || ''}
              onChange={(e) =>
                setFormData({ ...formData, work_performed: e.target.value })
              }
              rows={3}
            />
          </div>

          {/* Hours and Miles */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hours">Hours at Maintenance</Label>
              <Input
                id="hours"
                type="number"
                step="0.1"
                placeholder={equipment.current_hours?.toString()}
                value={formData.hours_at_maintenance || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    hours_at_maintenance: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="miles">Miles at Maintenance</Label>
              <Input
                id="miles"
                type="number"
                placeholder={equipment.current_miles?.toString()}
                value={formData.miles_at_maintenance || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    miles_at_maintenance: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
                  })
                }
              />
            </div>
          </div>

          {/* Parts Used */}
          <div className="space-y-2">
            <Label htmlFor="parts">Parts Used (comma-separated)</Label>
            <Input
              id="parts"
              placeholder="e.g., Oil Filter, 10W-40 Oil (5qt)"
              value={formData.parts_used?.join(', ') || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  parts_used: e.target.value
                    .split(',')
                    .map((p) => p.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>

          {/* Costs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="labor_cost">Labor Cost ($)</Label>
              <Input
                id="labor_cost"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.labor_cost || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    labor_cost: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parts_cost">Parts Cost ($)</Label>
              <Input
                id="parts_cost"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.parts_cost || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    parts_cost: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
                  })
                }
              />
            </div>
          </div>

          {/* Service Provider */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="provider">Service Provider</Label>
              <Input
                id="provider"
                placeholder="Company name"
                value={formData.service_provider || ''}
                onChange={(e) =>
                  setFormData({ ...formData, service_provider: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="technician">Technician</Label>
              <Input
                id="technician"
                placeholder="Name"
                value={formData.technician_name || ''}
                onChange={(e) =>
                  setFormData({ ...formData, technician_name: e.target.value })
                }
              />
            </div>
          </div>

          {/* Invoice */}
          <div className="space-y-2">
            <Label htmlFor="invoice">Invoice Number</Label>
            <Input
              id="invoice"
              placeholder="INV-12345"
              value={formData.invoice_number || ''}
              onChange={(e) =>
                setFormData({ ...formData, invoice_number: e.target.value })
              }
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes..."
              value={formData.notes || ''}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createRecord.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!formData.maintenance_type || createRecord.isPending}
            >
              {createRecord.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Record Maintenance
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default MaintenanceHistory
