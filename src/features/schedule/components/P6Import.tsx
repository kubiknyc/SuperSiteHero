/**
 * P6/Primavera Import Component
 *
 * Full-featured import dialog for Primavera P6 XER and XML files.
 * Features file upload, field mapping, preview, and progress tracking.
 */

import * as React from 'react'
import { format, parseISO } from 'date-fns'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
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
} from '@/components/ui/table'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Upload,
  FileText,
  FileX,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Hash,
  Loader2,
  Flag,
  Clock,
  Settings2,
  ArrowRight,
  Users,
  Calendar,
  Link2,
  RefreshCw,
  ChevronRight,
} from 'lucide-react'
import {
  useP6Import,
  DEFAULT_FIELD_MAPPING,
  DEFAULT_IMPORT_OPTIONS,
  type P6FieldMapping,
  type P6ImportOptions,
} from '../hooks/useP6Import'
import type { ParsedP6Data } from '../utils/p6Parser'

// =============================================
// Types
// =============================================

type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete'

// =============================================
// Helper Functions
// =============================================

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) {return '-'}
  try {
    return format(parseISO(dateString), 'MMM d, yyyy')
  } catch {
    return dateString
  }
}

// =============================================
// Sub-Components
// =============================================

interface FileDropZoneProps {
  onFileSelect: (file: File) => void
  isLoading: boolean
}

function FileDropZone({ onFileSelect, isLoading }: FileDropZoneProps) {
  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    accept: {
      'application/x-xer': ['.xer'],
      'text/xml': ['.xml'],
      'application/xml': ['.xml'],
      'text/plain': ['.xer'],
    },
    maxFiles: 1,
    disabled: isLoading,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0])
      }
    },
  })

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
        transition-colors duration-200
        ${isDragActive && !isDragReject ? 'border-primary bg-primary/5' : ''}
        ${isDragReject ? 'border-destructive bg-destructive/5' : ''}
        ${!isDragActive ? 'border-muted-foreground/25 hover:border-primary/50' : ''}
        ${isLoading ? 'opacity-50 cursor-wait' : ''}
      `}
    >
      <input {...getInputProps()} />
      {isLoading ? (
        <div className="space-y-3">
          <Loader2 className="h-12 w-12 mx-auto text-muted-foreground animate-spin" />
          <p className="text-sm text-muted-foreground">Parsing P6 file...</p>
        </div>
      ) : (
        <div className="space-y-3">
          <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
          <div>
            <p className="font-medium">
              {isDragActive ? 'Drop the P6 file here' : 'Drag & drop a Primavera P6 file'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to browse
            </p>
          </div>
          <div className="flex justify-center gap-2">
            <Badge variant="secondary" className="bg-warning-light dark:bg-warning/20 text-warning-dark dark:text-warning">.xer</Badge>
            <Badge variant="secondary">.xml</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Primavera P6 XER and PMXML export formats
          </p>
        </div>
      )}
    </div>
  )
}

interface ImportSummaryProps {
  summary: ReturnType<typeof useP6Import>['summary']
  fileName: string | null
}

function ImportSummary({ summary, fileName }: ImportSummaryProps) {
  if (!summary) {return null}

  return (
    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-warning" />
        <span className="font-medium">{fileName}</span>
        <Badge variant="outline" className="bg-warning-light dark:bg-warning/20 text-warning-dark dark:text-warning border-warning/30">
          Primavera P6
        </Badge>
      </div>

      {summary.projectName && (
        <p className="text-sm text-muted-foreground">
          Project: <span className="font-medium text-foreground">{summary.projectName}</span>
          {summary.dataDate && (
            <span className="ml-2">
              (Data Date: {formatDate(summary.dataDate)})
            </span>
          )}
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div className="bg-background rounded-md p-2 text-center">
          <div className="text-lg font-semibold">{summary.totalActivities}</div>
          <div className="text-xs text-muted-foreground">Activities</div>
        </div>
        <div className="bg-background rounded-md p-2 text-center">
          <div className="text-lg font-semibold">{summary.milestones}</div>
          <div className="text-xs text-muted-foreground">Milestones</div>
        </div>
        <div className="bg-background rounded-md p-2 text-center">
          <div className="text-lg font-semibold">{summary.predecessors}</div>
          <div className="text-xs text-muted-foreground">Dependencies</div>
        </div>
        <div className="bg-background rounded-md p-2 text-center">
          <div className="text-lg font-semibold">{summary.resources}</div>
          <div className="text-xs text-muted-foreground">Resources</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-background rounded-md p-2">
          <div className="text-xs text-muted-foreground">WBS Elements</div>
          <div className="font-medium">{summary.wbsElements}</div>
        </div>
        <div className="bg-background rounded-md p-2">
          <div className="text-xs text-muted-foreground">Calendars</div>
          <div className="font-medium">{summary.calendars}</div>
        </div>
      </div>

      {summary.dateRange.start && summary.dateRange.end && (
        <div className="text-xs text-muted-foreground pt-2 border-t">
          Project Date Range: {formatDate(summary.dateRange.start)} to {formatDate(summary.dateRange.end)}
        </div>
      )}
    </div>
  )
}

interface FieldMappingPanelProps {
  fieldMapping: P6FieldMapping
  onFieldMappingChange: (mapping: P6FieldMapping) => void
}

function FieldMappingPanel({ fieldMapping, onFieldMappingChange }: FieldMappingPanelProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Configure how P6 fields map to JobSight fields. Default mappings work for most schedules.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Activity ID Source</Label>
          <Select
            value={fieldMapping.activityId}
            onValueChange={(value) => onFieldMappingChange({
              ...fieldMapping,
              activityId: value as 'task_code' | 'task_id'
            })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="task_code">Activity Code (task_code)</SelectItem>
              <SelectItem value="task_id">Activity ID (task_id)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Which P6 field to use as the activity identifier
          </p>
        </div>

        <div className="space-y-2">
          <Label>WBS Code Source</Label>
          <Select
            value={fieldMapping.wbsCode}
            onValueChange={(value) => onFieldMappingChange({
              ...fieldMapping,
              wbsCode: value as 'wbs_code' | 'wbs_name' | 'none'
            })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="wbs_code">WBS Code (wbs_short_name)</SelectItem>
              <SelectItem value="wbs_name">WBS Name (wbs_name)</SelectItem>
              <SelectItem value="none">Do not import WBS</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Date Source</Label>
          <Select
            value={fieldMapping.startDate}
            onValueChange={(value) => onFieldMappingChange({
              ...fieldMapping,
              startDate: value as 'target_start_date' | 'early_start_date',
              finishDate: value === 'target_start_date' ? 'target_end_date' : 'early_end_date'
            })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="target_start_date">Target Dates</SelectItem>
              <SelectItem value="early_start_date">Early Dates</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Use target (baseline) or calculated early dates
          </p>
        </div>

        <div className="space-y-2">
          <Label>Notes Source</Label>
          <Select
            value={fieldMapping.notes}
            onValueChange={(value) => onFieldMappingChange({
              ...fieldMapping,
              notes: value as 'task_comments' | 'none'
            })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="task_comments">Task Comments</SelectItem>
              <SelectItem value="none">Do not import notes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

interface ImportOptionsPanel {
  importOptions: P6ImportOptions
  onOptionsChange: (options: P6ImportOptions) => void
}

function ImportOptionsPanel({ importOptions, onOptionsChange }: ImportOptionsPanel) {
  const updateOption = <K extends keyof P6ImportOptions>(key: K, value: P6ImportOptions[K]) => {
    onOptionsChange({ ...importOptions, [key]: value })
  }

  return (
    <div className="space-y-4">
      <Accordion type="single" collapsible defaultValue="data">
        <AccordionItem value="data">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Data to Import
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="importActivities"
                  checked={importOptions.importActivities}
                  onCheckedChange={(checked) => updateOption('importActivities', checked === true)}
                />
                <label htmlFor="importActivities" className="text-sm cursor-pointer">
                  Import Activities
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="importDependencies"
                  checked={importOptions.importDependencies}
                  onCheckedChange={(checked) => updateOption('importDependencies', checked === true)}
                />
                <label htmlFor="importDependencies" className="text-sm cursor-pointer">
                  Import Dependencies
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="importResources"
                  checked={importOptions.importResources}
                  onCheckedChange={(checked) => updateOption('importResources', checked === true)}
                />
                <label htmlFor="importResources" className="text-sm cursor-pointer">
                  Import Resources
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="importCalendars"
                  checked={importOptions.importCalendars}
                  onCheckedChange={(checked) => updateOption('importCalendars', checked === true)}
                />
                <label htmlFor="importCalendars" className="text-sm cursor-pointer">
                  Import Calendars
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="importResourceAssignments"
                  checked={importOptions.importResourceAssignments}
                  onCheckedChange={(checked) => updateOption('importResourceAssignments', checked === true)}
                />
                <label htmlFor="importResourceAssignments" className="text-sm cursor-pointer">
                  Import Resource Assignments
                </label>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="filters">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Activity Filters
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeMilestones"
                  checked={importOptions.includeMilestones}
                  onCheckedChange={(checked) => updateOption('includeMilestones', checked === true)}
                />
                <label htmlFor="includeMilestones" className="text-sm cursor-pointer">
                  Include Milestones
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeLOE"
                  checked={importOptions.includeLOE}
                  onCheckedChange={(checked) => updateOption('includeLOE', checked === true)}
                />
                <label htmlFor="includeLOE" className="text-sm cursor-pointer">
                  Include Level of Effort (LOE) Activities
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeWBSSummaries"
                  checked={importOptions.includeWBSSummaries}
                  onCheckedChange={(checked) => updateOption('includeWBSSummaries', checked === true)}
                />
                <label htmlFor="includeWBSSummaries" className="text-sm cursor-pointer">
                  Include WBS Summary Tasks
                </label>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="conflict">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Conflict Resolution
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <div className="space-y-4">
              <RadioGroup
                value={importOptions.conflictResolution}
                onValueChange={(value) => updateOption('conflictResolution', value as 'skip' | 'update' | 'replace')}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="skip" id="skip" />
                  <Label htmlFor="skip" className="font-normal cursor-pointer">
                    Skip existing activities
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="update" id="update" />
                  <Label htmlFor="update" className="font-normal cursor-pointer">
                    Update existing activities with new data
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="replace" id="replace" />
                  <Label htmlFor="replace" className="font-normal cursor-pointer">
                    Replace existing activities
                  </Label>
                </div>
              </RadioGroup>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="clearExistingActivities"
                    checked={importOptions.clearExistingActivities}
                    onCheckedChange={(checked) => updateOption('clearExistingActivities', checked === true)}
                  />
                  <label htmlFor="clearExistingActivities" className="text-sm cursor-pointer">
                    Clear all existing activities before import
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="clearExistingDependencies"
                    checked={importOptions.clearExistingDependencies}
                    onCheckedChange={(checked) => updateOption('clearExistingDependencies', checked === true)}
                  />
                  <label htmlFor="clearExistingDependencies" className="text-sm cursor-pointer">
                    Clear all existing dependencies before import
                  </label>
                </div>
              </div>

              {importOptions.clearExistingActivities && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Warning</AlertTitle>
                  <AlertDescription>
                    This will delete all existing schedule activities. This action cannot be undone.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

interface ActivityPreviewTableProps {
  data: ParsedP6Data
}

function ActivityPreviewTable({ data }: ActivityPreviewTableProps) {
  const displayActivities = data.activities.slice(0, 100)
  const hasMore = data.activities.length > 100

  return (
    <div className="space-y-2">
      <ScrollArea className="h-[300px] border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Activity ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-[100px]">Start</TableHead>
              <TableHead className="w-[100px]">Finish</TableHead>
              <TableHead className="w-[80px] text-center">Days</TableHead>
              <TableHead className="w-[60px] text-center">%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayActivities.map((activity, index) => {
              const isMilestone = activity.task_type === 'TT_Mile' ||
                activity.task_type === 'StartMilestone' ||
                activity.task_type === 'FinishMilestone'
              return (
                <TableRow key={index}>
                  <TableCell className="font-mono text-xs">
                    <div className="flex items-center gap-1">
                      {isMilestone && (
                        <Flag className="h-3 w-3 text-warning" />
                      )}
                      {activity.is_critical && (
                        <span className="w-1.5 h-1.5 bg-destructive rounded-full" />
                      )}
                      {activity.task_code || activity.task_id}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="truncate max-w-[200px]" title={activity.task_name}>
                      {activity.task_name}
                    </div>
                    {activity.wbs_code && (
                      <div className="text-xs text-muted-foreground">
                        WBS: {activity.wbs_code}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {formatDate(activity.target_start_date)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {formatDate(activity.target_end_date)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      {isMilestone ? 0 : Math.round(activity.target_drtn_hr_cnt / 8)}
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-xs">
                    {activity.phys_complete_pct}%
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </ScrollArea>
      {hasMore && (
        <p className="text-xs text-muted-foreground text-center">
          Showing first 100 of {data.activities.length} activities
        </p>
      )}
    </div>
  )
}

interface ErrorWarningListProps {
  errors: string[]
  warnings: string[]
}

function ErrorWarningList({ errors, warnings }: ErrorWarningListProps) {
  if (errors.length === 0 && warnings.length === 0) {
    return (
      <Alert>
        <CheckCircle2 className="h-4 w-4" />
        <AlertTitle>Validation Passed</AlertTitle>
        <AlertDescription>
          No issues found in the P6 schedule data.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-3">
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Errors ({errors.length})</AlertTitle>
          <AlertDescription>
            <ScrollArea className="h-[100px] mt-2">
              <ul className="list-disc list-inside space-y-1 text-sm">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </ScrollArea>
          </AlertDescription>
        </Alert>
      )}

      {warnings.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertTitle>Warnings ({warnings.length})</AlertTitle>
          <AlertDescription>
            <ScrollArea className="h-[100px] mt-2">
              <ul className="list-disc list-inside space-y-1 text-sm">
                {warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </ScrollArea>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

// =============================================
// Main Component
// =============================================

interface P6ImportProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  companyId: string
  onImportComplete?: (count: number) => void
}

export function P6Import({
  open,
  onOpenChange,
  projectId,
  companyId,
  onImportComplete,
}: P6ImportProps) {
  const [step, setStep] = React.useState<ImportStep>('upload')

  const {
    parsedData,
    fileName,
    fieldMapping,
    importOptions,
    progress,
    importResult,
    summary,
    parseFile,
    setFieldMapping,
    setImportOptions,
    runImport,
    reset,
    isParsing,
    isImporting,
    isComplete,
    hasData,
    hasBlockingErrors,
  } = useP6Import(projectId, companyId)

  // Reset when dialog closes
  React.useEffect(() => {
    if (!open) {
      setStep('upload')
      reset()
    }
  }, [open, reset])

  // Handle file selection
  const handleFileSelect = React.useCallback(async (file: File) => {
    try {
      await parseFile(file)
      setStep('mapping')
    } catch {
      // Error handled in hook
    }
  }, [parseFile])

  // Handle import
  const handleImport = React.useCallback(() => {
    setStep('importing')
    runImport()
  }, [runImport])

  // Watch for completion
  React.useEffect(() => {
    if (isComplete && importResult) {
      setStep('complete')
      onImportComplete?.(importResult.activitiesImported)
    }
  }, [isComplete, importResult, onImportComplete])

  // Step indicators
  const steps = [
    { key: 'upload', label: 'Upload', icon: Upload },
    { key: 'mapping', label: 'Configure', icon: Settings2 },
    { key: 'preview', label: 'Preview', icon: FileText },
    { key: 'importing', label: 'Import', icon: Loader2 },
  ]

  const currentStepIndex = steps.findIndex((s) => s.key === step)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-warning" />
            Import from Primavera P6
          </DialogTitle>
          <DialogDescription>
            Import schedule data from Primavera P6 XER or XML export files
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center py-2 px-4 bg-muted/30 rounded-lg mb-4">
          {steps.map((s, index) => (
            <React.Fragment key={s.key}>
              <div className={`
                flex items-center gap-2 px-3 py-1 rounded-md text-sm
                ${index <= currentStepIndex
                  ? 'text-primary font-medium'
                  : 'text-muted-foreground'}
                ${step === s.key ? 'bg-primary/10' : ''}
              `}>
                <s.icon className={`h-4 w-4 ${step === 'importing' && s.key === 'importing' ? 'animate-spin' : ''}`} />
                {s.label}
              </div>
              {index < steps.length - 1 && (
                <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground" />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="flex-1 overflow-auto py-2">
          {/* Upload Step */}
          {step === 'upload' && (
            <div className="space-y-4">
              <FileDropZone onFileSelect={handleFileSelect} isLoading={isParsing} />

              {progress.stage === 'error' && (
                <Alert variant="destructive">
                  <FileX className="h-4 w-4" />
                  <AlertTitle>Parse Error</AlertTitle>
                  <AlertDescription>{progress.message}</AlertDescription>
                </Alert>
              )}

              <div className="bg-muted/30 rounded-lg p-4 text-sm space-y-2">
                <p className="font-medium">Supported P6 Formats:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>
                    <strong>XER Format (.xer)</strong> - Primavera P6 native export via
                    File &rarr; Export &rarr; Primavera PM
                  </li>
                  <li>
                    <strong>PMXML Format (.xml)</strong> - Primavera P6 XML export via
                    File &rarr; Export &rarr; Primavera P6 (XML)
                  </li>
                </ul>
                <p className="text-xs text-muted-foreground mt-3">
                  Includes activities, WBS, calendars, resources, and dependencies.
                </p>
              </div>
            </div>
          )}

          {/* Mapping Step */}
          {step === 'mapping' && parsedData && (
            <div className="space-y-4">
              <ImportSummary summary={summary} fileName={fileName} />

              <Separator />

              <Tabs defaultValue="options" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="options">Import Options</TabsTrigger>
                  <TabsTrigger value="mapping">Field Mapping</TabsTrigger>
                </TabsList>

                <TabsContent value="options" className="mt-4">
                  <ImportOptionsPanel
                    importOptions={importOptions}
                    onOptionsChange={setImportOptions}
                  />
                </TabsContent>

                <TabsContent value="mapping" className="mt-4">
                  <FieldMappingPanel
                    fieldMapping={fieldMapping}
                    onFieldMappingChange={setFieldMapping}
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Preview Step */}
          {step === 'preview' && parsedData && (
            <div className="space-y-4">
              <ImportSummary summary={summary} fileName={fileName} />

              <Tabs defaultValue="activities" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="activities" className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Activities
                  </TabsTrigger>
                  <TabsTrigger value="resources" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Resources
                  </TabsTrigger>
                  <TabsTrigger value="dependencies" className="flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    Links
                  </TabsTrigger>
                  <TabsTrigger value="validation" className="flex items-center gap-2">
                    {parsedData.errors.length > 0 ? (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    ) : parsedData.warnings.length > 0 ? (
                      <AlertTriangle className="h-4 w-4 text-warning" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    )}
                    Issues
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="activities" className="mt-4">
                  <ActivityPreviewTable data={parsedData} />
                </TabsContent>

                <TabsContent value="resources" className="mt-4">
                  <ScrollArea className="h-[300px] border rounded-md p-4">
                    {parsedData.resources.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No resources found in the P6 file
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {parsedData.resources.map((resource) => (
                          <div key={resource.rsrc_id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                            <div>
                              <p className="font-medium text-sm">{resource.rsrc_name}</p>
                              <p className="text-xs text-muted-foreground">{resource.rsrc_short_name}</p>
                            </div>
                            <Badge variant="outline">{resource.rsrc_type.replace('RT_', '')}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="dependencies" className="mt-4">
                  <ScrollArea className="h-[300px] border rounded-md p-4">
                    {parsedData.predecessors.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No dependencies found in the P6 file
                      </p>
                    ) : (
                      <div className="text-sm">
                        <p className="text-muted-foreground mb-2">
                          {parsedData.predecessors.length} dependency relationships found
                        </p>
                        <div className="space-y-1">
                          {parsedData.predecessors.slice(0, 50).map((pred, index) => (
                            <div key={index} className="flex items-center gap-2 text-xs">
                              <span className="font-mono">{pred.pred_task_id}</span>
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              <span className="font-mono">{pred.task_id}</span>
                              <Badge variant="outline" className="text-[10px]">
                                {pred.pred_type.replace('PR_', '')}
                              </Badge>
                              {pred.lag_hr_cnt !== 0 && (
                                <span className="text-muted-foreground">
                                  +{Math.round(pred.lag_hr_cnt / 8)}d
                                </span>
                              )}
                            </div>
                          ))}
                          {parsedData.predecessors.length > 50 && (
                            <p className="text-muted-foreground pt-2">
                              ...and {parsedData.predecessors.length - 50} more
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="validation" className="mt-4">
                  <ErrorWarningList
                    errors={parsedData.errors}
                    warnings={parsedData.warnings}
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Importing Step */}
          {step === 'importing' && (
            <div className="space-y-4 py-8">
              <div className="flex justify-center">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
              </div>
              <div className="text-center">
                <p className="font-medium">{progress.message}</p>
                {progress.subMessage && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {progress.subMessage}
                  </p>
                )}
              </div>
              <Progress value={progress.current} max={progress.total} className="h-2" />
            </div>
          )}

          {/* Complete Step */}
          {step === 'complete' && importResult && (
            <div className="space-y-6 py-4">
              <div className="text-center">
                {importResult.errors.length > 0 ? (
                  <AlertCircle className="h-16 w-16 text-warning mx-auto" />
                ) : (
                  <CheckCircle2 className="h-16 w-16 text-success mx-auto" />
                )}
                <h3 className="text-lg font-semibold mt-4">
                  {importResult.errors.length > 0
                    ? 'Import Completed with Errors'
                    : 'Import Successful'}
                </h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-primary">
                    {importResult.activitiesImported}
                  </div>
                  <div className="text-xs text-muted-foreground">Activities</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-primary">
                    {importResult.dependenciesImported}
                  </div>
                  <div className="text-xs text-muted-foreground">Dependencies</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-primary">
                    {importResult.resourcesImported}
                  </div>
                  <div className="text-xs text-muted-foreground">Resources</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-muted-foreground">
                    {importResult.skipped}
                  </div>
                  <div className="text-xs text-muted-foreground">Skipped</div>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Import Errors ({importResult.errors.length})</AlertTitle>
                  <AlertDescription>
                    <ScrollArea className="h-[100px] mt-2">
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {importResult.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-center">
                <Button onClick={() => onOpenChange(false)}>Close</Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {(step === 'upload' || step === 'mapping' || step === 'preview') && (
          <DialogFooter className="gap-2">
            {step === 'mapping' && (
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
            )}
            {step === 'preview' && (
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Back
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {step === 'mapping' && hasData && (
              <Button onClick={() => setStep('preview')}>
                Preview Import
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === 'preview' && hasData && (
              <Button
                onClick={handleImport}
                disabled={hasBlockingErrors || isImporting}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import {parsedData?.activities.length || 0} Activities
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default P6Import
