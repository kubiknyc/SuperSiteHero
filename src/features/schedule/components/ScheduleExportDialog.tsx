/**
 * Schedule Export Dialog
 *
 * Dialog for exporting schedule data to MS Project XML, Primavera P6 XER, or CSV.
 * Supports filtering by date range, activity type, and other options.
 */

import { useState, useMemo, useEffect } from 'react'
import { format, subMonths, addMonths } from 'date-fns'
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileCode,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Filter,
  Info,
  XCircle,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
// Note: Using custom radio implementation since RadioGroup component is not available
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  useScheduleExport,
  type ExportOptions,
} from '../hooks/useScheduleExport'
import { estimateExportSize, MAX_EXPORT_ACTIVITIES } from '../utils/scheduleExport'

// =============================================
// Types
// =============================================

interface ScheduleExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectName?: string
  projectNumber?: string
  activityCount?: number
  milestonesCount?: number
  criticalCount?: number
}

type ExportFormat = 'ms_project_xml' | 'primavera_xer' | 'csv'
type FilterType = 'all' | 'milestones' | 'critical_path'

const FORMAT_INFO: Record<
  ExportFormat,
  { label: string; description: string; icon: typeof FileCode; extension: string }
> = {
  ms_project_xml: {
    label: 'MS Project XML',
    description: 'Compatible with Microsoft Project 2010 and later',
    icon: FileCode,
    extension: '.xml',
  },
  primavera_xer: {
    label: 'Primavera P6 XER',
    description: 'Compatible with Oracle Primavera P6',
    icon: FileText,
    extension: '.xer',
  },
  csv: {
    label: 'CSV Spreadsheet',
    description: 'Open in Excel, Google Sheets, or other spreadsheet apps',
    icon: FileSpreadsheet,
    extension: '.csv',
  },
}

// =============================================
// Component
// =============================================

export function ScheduleExportDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  projectNumber,
  activityCount = 0,
  milestonesCount = 0,
  criticalCount = 0,
}: ScheduleExportDialogProps) {
  // Export hook
  const {
    isExporting,
    progress,
    currentStep,
    error,
    exportAndDownload,
    cancelExport,
    resetState,
    getRateLimitStatus,
  } = useScheduleExport({
    projectId,
    projectName,
    projectNumber,
  })

  // Form state
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('ms_project_xml')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [includeCompleted, setIncludeCompleted] = useState(true)
  const [includeDependencies, setIncludeDependencies] = useState(true)

  // Rate limit status
  const rateLimitStatus = getRateLimitStatus()

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      resetState()
    }
  }, [open, resetState])

  // Estimated export count based on filter
  const estimatedCount = useMemo(() => {
    switch (filterType) {
      case 'milestones':
        return milestonesCount
      case 'critical_path':
        return criticalCount
      case 'all':
      default:
        return activityCount
    }
  }, [filterType, activityCount, milestonesCount, criticalCount])

  // Size estimate
  const sizeEstimate = useMemo(() => {
    return estimateExportSize(estimatedCount, selectedFormat)
  }, [estimatedCount, selectedFormat])

  // Validation
  const validationError = useMemo(() => {
    if (dateFrom && dateTo && dateFrom > dateTo) {
      return 'Start date must be before end date'
    }
    if (estimatedCount > MAX_EXPORT_ACTIVITIES) {
      return `Cannot export more than ${MAX_EXPORT_ACTIVITIES.toLocaleString()} activities`
    }
    if (estimatedCount === 0) {
      return 'No activities to export with current filters'
    }
    return null
  }, [dateFrom, dateTo, estimatedCount])

  // Handle export
  const handleExport = async () => {
    const options: ExportOptions = {
      format: selectedFormat,
      filterType,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      includeCompleted,
      includeDependencies,
      projectName,
      projectNumber,
    }

    await exportAndDownload(options)
  }

  // Handle cancel
  const handleCancel = () => {
    if (isExporting) {
      cancelExport()
    } else {
      onOpenChange(false)
    }
  }

  // Quick date presets
  const setDatePreset = (preset: 'all' | '3months' | '6months' | 'year') => {
    const now = new Date()
    switch (preset) {
      case 'all':
        setDateFrom('')
        setDateTo('')
        break
      case '3months':
        setDateFrom(format(subMonths(now, 1), 'yyyy-MM-dd'))
        setDateTo(format(addMonths(now, 2), 'yyyy-MM-dd'))
        break
      case '6months':
        setDateFrom(format(subMonths(now, 2), 'yyyy-MM-dd'))
        setDateTo(format(addMonths(now, 4), 'yyyy-MM-dd'))
        break
      case 'year':
        setDateFrom(format(subMonths(now, 3), 'yyyy-MM-dd'))
        setDateTo(format(addMonths(now, 9), 'yyyy-MM-dd'))
        break
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Schedule
          </DialogTitle>
          <DialogDescription>
            Export your schedule to MS Project, Primavera P6, or CSV format.
          </DialogDescription>
        </DialogHeader>

        {isExporting ? (
          // Export in progress
          <div className="py-8 space-y-6">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <p className="mt-4 text-sm text-secondary">{currentStep}</p>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="text-center">
              <Button variant="outline" onClick={cancelExport}>
                Cancel Export
              </Button>
            </div>
          </div>
        ) : error ? (
          // Error state
          <div className="py-6">
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Export Failed</AlertTitle>
              <AlertDescription>{error.details || error.message}</AlertDescription>
            </Alert>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={resetState}>
                Try Again
              </Button>
              <Button onClick={() => onOpenChange(false)}>Close</Button>
            </div>
          </div>
        ) : (
          // Export form
          <div className="space-y-6 py-2">
            {/* Rate limit warning */}
            {!rateLimitStatus.allowed && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Export limit reached</AlertTitle>
                <AlertDescription>
                  You have reached the maximum of 10 exports per hour. Please try again
                  after {rateLimitStatus.resetAt.toLocaleTimeString()}.
                </AlertDescription>
              </Alert>
            )}

            {/* Format selection */}
            <div className="space-y-3" role="radiogroup" aria-label="Export Format">
              <Label className="text-sm font-medium">Export Format</Label>
              <div className="grid grid-cols-1 gap-3">
                {Object.entries(FORMAT_INFO).map(([key, info]) => {
                  const Icon = info.icon
                  const isSelected = selectedFormat === key
                  return (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setSelectedFormat(key as ExportFormat)}
                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors text-left w-full ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-border hover:bg-surface'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-input'
                        }`}
                      >
                        {isSelected && (
                          <div className="w-2 h-2 bg-card rounded-full" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-secondary" />
                          <span className="font-medium text-sm">{info.label}</span>
                          <Badge variant="outline" className="text-xs">
                            {info.extension}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted mt-0.5">
                          {info.description}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <Separator />

            {/* Filter options */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Activity Filter
              </Label>
              <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <span className="flex items-center gap-2">
                      All Activities ({activityCount.toLocaleString()})
                    </span>
                  </SelectItem>
                  <SelectItem value="milestones">
                    <span className="flex items-center gap-2">
                      Milestones Only ({milestonesCount.toLocaleString()})
                    </span>
                  </SelectItem>
                  <SelectItem value="critical_path">
                    <span className="flex items-center gap-2">
                      Critical Path Only ({criticalCount.toLocaleString()})
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date range filter */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date Range (Optional)
                </Label>
                <div className="flex gap-1">
                  {(['all', '3months', '6months', 'year'] as const).map((preset) => (
                    <Button
                      key={preset}
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={() => setDatePreset(preset)}
                    >
                      {preset === 'all'
                        ? 'All'
                        : preset === '3months'
                          ? '3 mo'
                          : preset === '6months'
                            ? '6 mo'
                            : '1 yr'}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted">From</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted">To</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Additional options */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Options</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={includeCompleted}
                    onCheckedChange={(v) => setIncludeCompleted(v === true)}
                  />
                  <span className="text-sm">Include completed activities</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={includeDependencies}
                    onCheckedChange={(v) => setIncludeDependencies(v === true)}
                  />
                  <span className="text-sm">Include dependencies (predecessor links)</span>
                </label>
              </div>
            </div>

            {/* Validation error */}
            {validationError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}

            {/* Export summary */}
            <div className="bg-surface rounded-lg p-3">
              <div className="flex items-start gap-2 text-sm">
                <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p>
                    <strong>{estimatedCount.toLocaleString()}</strong> activities will be
                    exported
                  </p>
                  <p className="text-muted">
                    Estimated file size: ~{sizeEstimate.formatted}
                  </p>
                  {rateLimitStatus.allowed && (
                    <p className="text-muted">
                      {rateLimitStatus.remaining} exports remaining this hour
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {!isExporting && !error && (
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={!rateLimitStatus.allowed || !!validationError || estimatedCount === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ScheduleExportDialog
