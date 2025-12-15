/**
 * Hours Worked Tracker Component
 *
 * Track employee hours worked for OSHA rate calculations.
 * Supports:
 * - Manual entry
 * - Bulk import
 * - Period-based tracking (weekly, monthly, quarterly)
 * - Hours estimation from employee count
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  RadixSelect as Select,
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
import {
  Clock,
  Plus,
  Edit2,
  Trash2,
  Users,
  Calendar,
  AlertCircle,
  Upload,
  Calculator,
} from 'lucide-react'
import {
  useHoursWorked,
  useCreateHoursWorked,
  useUpdateHoursWorked,
  useDeleteHoursWorked,
} from '../hooks/useSafetyMetrics'
import type {
  EmployeeHoursWorked,
  EmployeeHoursWorkedInput,
  MetricsPeriodType,
  HoursSource,
} from '@/types/safety-metrics'
import {
  formatHours,
  estimateHoursFromEmployees,
  calculateFTE,
  validateHoursWorked,
} from '../utils/safetyCalculations'

// ============================================================================
// Props
// ============================================================================

interface HoursWorkedTrackerProps {
  companyId: string
  projectId: string
  year?: number
  onHoursUpdated?: () => void
  className?: string
}

// ============================================================================
// Hours Entry Dialog
// ============================================================================

interface HoursEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
  projectId: string
  editRecord?: EmployeeHoursWorked | null
  onSuccess?: () => void
}

function HoursEntryDialog({
  open,
  onOpenChange,
  companyId,
  projectId,
  editRecord,
  onSuccess,
}: HoursEntryDialogProps) {
  const createHours = useCreateHoursWorked()
  const updateHours = useUpdateHoursWorked()

  const [periodType, setPeriodType] = React.useState<MetricsPeriodType>(
    editRecord?.period_type || 'monthly'
  )
  const [periodStart, setPeriodStart] = React.useState(
    editRecord?.period_start || ''
  )
  const [periodEnd, setPeriodEnd] = React.useState(
    editRecord?.period_end || ''
  )
  const [totalHours, setTotalHours] = React.useState(
    editRecord?.total_hours?.toString() || ''
  )
  const [regularHours, setRegularHours] = React.useState(
    editRecord?.regular_hours?.toString() || ''
  )
  const [overtimeHours, setOvertimeHours] = React.useState(
    editRecord?.overtime_hours?.toString() || ''
  )
  const [averageEmployees, setAverageEmployees] = React.useState(
    editRecord?.average_employees?.toString() || ''
  )
  const [source, setSource] = React.useState<HoursSource>(
    editRecord?.source || 'manual'
  )
  const [notes, setNotes] = React.useState(editRecord?.notes || '')
  const [error, setError] = React.useState<string | null>(null)

  // Calculate estimated hours when employee count changes
  const estimatedHours = averageEmployees
    ? estimateHoursFromEmployees(
        parseFloat(averageEmployees) || 0,
        periodType as 'monthly' | 'quarterly' | 'yearly'
      )
    : 0

  // Auto-fill period dates based on period type
  React.useEffect(() => {
    if (!periodStart || editRecord) {return}

    const start = new Date(periodStart)
    let end: Date

    switch (periodType) {
      case 'weekly':
        end = new Date(start)
        end.setDate(start.getDate() + 6)
        break
      case 'monthly':
        end = new Date(start.getFullYear(), start.getMonth() + 1, 0)
        break
      case 'quarterly':
        end = new Date(start.getFullYear(), start.getMonth() + 3, 0)
        break
      case 'yearly':
        end = new Date(start.getFullYear(), 11, 31)
        break
      default:
        return
    }

    setPeriodEnd(end.toISOString().split('T')[0])
  }, [periodStart, periodType, editRecord])

  const handleSubmit = async () => {
    setError(null)

    // Validate
    if (!periodStart || !periodEnd) {
      setError('Please select the period dates')
      return
    }

    const hours = parseFloat(totalHours) || 0
    const validation = validateHoursWorked(hours)
    if (!validation.valid) {
      setError(validation.message || 'Invalid hours value')
      return
    }

    const input: EmployeeHoursWorkedInput = {
      project_id: projectId,
      company_id: companyId,
      period_type: periodType,
      period_start: periodStart,
      period_end: periodEnd,
      total_hours: hours,
      regular_hours: parseFloat(regularHours) || null,
      overtime_hours: parseFloat(overtimeHours) || null,
      average_employees: parseInt(averageEmployees) || null,
      full_time_equivalent: hours ? calculateFTE(hours, 1) : null,
      source,
      notes: notes || null,
    }

    try {
      if (editRecord) {
        await updateHours.mutateAsync({ id: editRecord.id, data: input })
      } else {
        await createHours.mutateAsync(input)
      }

      onOpenChange(false)
      onSuccess?.()

      // Reset form
      if (!editRecord) {
        setPeriodStart('')
        setPeriodEnd('')
        setTotalHours('')
        setRegularHours('')
        setOvertimeHours('')
        setAverageEmployees('')
        setNotes('')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save hours')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editRecord ? 'Edit Hours Record' : 'Add Hours Worked'}
          </DialogTitle>
          <DialogDescription>
            Record employee hours worked for safety rate calculations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Period Type</Label>
              <Select value={periodType} onValueChange={(v) => setPeriodType(v as MetricsPeriodType)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Source</Label>
              <Select value={source} onValueChange={(v) => setSource(v as HoursSource)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Entry</SelectItem>
                  <SelectItem value="payroll">Payroll System</SelectItem>
                  <SelectItem value="timesheet">Timesheet</SelectItem>
                  <SelectItem value="estimate">Estimate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Period Start</Label>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Period End</Label>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg space-y-4">
            <div>
              <Label>Total Hours Worked</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  value={totalHours}
                  onChange={(e) => setTotalHours(e.target.value)}
                  placeholder="0"
                  min="0"
                />
                {estimatedHours > 0 && !totalHours && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTotalHours(estimatedHours.toString())}
                  >
                    Use Estimate
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-gray-600">Regular Hours (optional)</Label>
                <Input
                  type="number"
                  value={regularHours}
                  onChange={(e) => setRegularHours(e.target.value)}
                  placeholder="0"
                  min="0"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm text-gray-600">Overtime Hours (optional)</Label>
                <Input
                  type="number"
                  value={overtimeHours}
                  onChange={(e) => setOvertimeHours(e.target.value)}
                  placeholder="0"
                  min="0"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <div>
            <Label>Average Number of Employees</Label>
            <Input
              type="number"
              value={averageEmployees}
              onChange={(e) => setAverageEmployees(e.target.value)}
              placeholder="0"
              min="0"
              className="mt-1"
            />
            {averageEmployees && (
              <p className="mt-1 text-xs text-gray-500">
                Estimated hours: {formatHours(estimatedHours)} (based on 2,000 hrs/employee/year)
              </p>
            )}
          </div>

          <div>
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this hours record..."
              className="mt-1"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createHours.isPending || updateHours.isPending}
          >
            {editRecord ? 'Update' : 'Add'} Hours
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Hours Record Card
// ============================================================================

interface HoursRecordCardProps {
  record: EmployeeHoursWorked
  onEdit: () => void
  onDelete: () => void
}

function HoursRecordCard({ record, onEdit, onDelete }: HoursRecordCardProps) {
  const deleteHours = useDeleteHoursWorked()

  const getPeriodLabel = () => {
    const start = new Date(record.period_start)
    const end = new Date(record.period_end)

    switch (record.period_type) {
      case 'monthly':
        return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      case 'quarterly':
        return `Q${Math.ceil((start.getMonth() + 1) / 3)} ${start.getFullYear()}`
      case 'yearly':
        return start.getFullYear().toString()
      default:
        return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
    }
  }

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this hours record?')) {
      await deleteHours.mutateAsync(record.id)
    }
  }

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
      <div className="flex items-center gap-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Clock className="h-5 w-5 text-blue-600" />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{getPeriodLabel()}</span>
            <Badge variant="outline" className="text-xs capitalize">
              {record.period_type}
            </Badge>
            <Badge variant="outline" className="text-xs capitalize">
              {record.source}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
            <span className="font-medium text-gray-900">
              {formatHours(record.total_hours)} hours
            </span>
            {record.average_employees && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {record.average_employees} employees
              </span>
            )}
            {record.full_time_equivalent && (
              <span>{record.full_time_equivalent} FTE</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={deleteHours.isPending}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function HoursWorkedTracker({
  companyId,
  projectId,
  year = new Date().getFullYear(),
  onHoursUpdated,
  className,
}: HoursWorkedTrackerProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editRecord, setEditRecord] = React.useState<EmployeeHoursWorked | null>(null)

  const startDate = `${year}-01-01`
  const endDate = `${year}-12-31`

  const { data: hoursRecords, isLoading, refetch } = useHoursWorked({
    project_id: projectId,
    company_id: companyId,
    start_date: startDate,
    end_date: endDate,
  })

  // Calculate totals
  const totalHours = hoursRecords?.reduce((sum, r) => sum + r.total_hours, 0) || 0
  const avgEmployees = hoursRecords?.length
    ? Math.round(hoursRecords.reduce((sum, r) => sum + (r.average_employees || 0), 0) / hoursRecords.length)
    : 0

  const handleEdit = (record: EmployeeHoursWorked) => {
    setEditRecord(record)
    setDialogOpen(true)
  }

  const handleAdd = () => {
    setEditRecord(null)
    setDialogOpen(true)
  }

  const handleSuccess = () => {
    refetch()
    onHoursUpdated?.()
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Hours Worked Tracker
            </CardTitle>
            <CardDescription>
              Track employee hours for {year} safety rate calculations
            </CardDescription>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" />
            Add Hours
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600">Total Hours ({year})</p>
            <p className="text-2xl font-bold text-blue-700">{formatHours(totalHours)}</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600">Avg Employees</p>
            <p className="text-2xl font-bold text-green-700">{avgEmployees || 'N/A'}</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-gray-600">Records</p>
            <p className="text-2xl font-bold text-purple-700">{hoursRecords?.length || 0}</p>
          </div>
        </div>

        {/* Records List */}
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading hours records...</div>
        ) : !hoursRecords || hoursRecords.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed rounded-lg">
            <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No hours records for {year}</p>
            <Button variant="outline" onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-1" />
              Add First Record
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {hoursRecords.map((record) => (
              <HoursRecordCard
                key={record.id}
                record={record}
                onEdit={() => handleEdit(record)}
                onDelete={handleSuccess}
              />
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="bg-gray-50 border-t">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Calculator className="h-4 w-4" />
          <span>
            Hours worked are used to calculate TRIR, DART, and other OSHA safety rates.
            Standard calculation uses 2,000 hours per FTE per year.
          </span>
        </div>
      </CardFooter>

      {/* Entry Dialog */}
      <HoursEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        companyId={companyId}
        projectId={projectId}
        editRecord={editRecord}
        onSuccess={handleSuccess}
      />
    </Card>
  )
}

export default HoursWorkedTracker
