/**
 * Schedule Import Dialog
 *
 * Enhanced import dialog supporting MS Project XML and Primavera P6 XER formats.
 * Features drag-drop upload, preview with validation, and progress tracking.
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
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
  Upload,
  FileText,
  FileX,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Calendar,
  Hash,
  Loader2,
  XCircle,
  Flag,
  Clock,
} from 'lucide-react'
import {
  parseScheduleFile,
  getImportSummary,
  convertToActivityDTOs,
  type ParsedScheduleData,
  type ImportedActivity,
} from '../utils/scheduleImport'
import { useImportScheduleActivities } from '../hooks/useScheduleActivities'

// =============================================
// Types
// =============================================

type ImportStep = 'upload' | 'preview' | 'importing' | 'complete'

interface ImportResults {
  imported: number
  skipped: number
  errors: string[]
}

// =============================================
// Helper Functions
// =============================================

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) {return '—'}
  try {
    return format(parseISO(dateString), 'MMM d, yyyy')
  } catch {
    return dateString
  }
}

function getSourceSystemLabel(source: 'ms_project' | 'primavera_p6'): string {
  return source === 'ms_project' ? 'MS Project' : 'Primavera P6'
}

function getSourceSystemIcon(source: 'ms_project' | 'primavera_p6') {
  return source === 'ms_project' ? (
    <FileText className="h-4 w-4 text-blue-500" />
  ) : (
    <FileText className="h-4 w-4 text-orange-500" />
  )
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
      'text/xml': ['.xml'],
      'application/xml': ['.xml'],
      'application/x-xer': ['.xer'],
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
          <p className="text-sm text-muted-foreground">Parsing file...</p>
        </div>
      ) : (
        <div className="space-y-3">
          <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
          <div>
            <p className="font-medium">
              {isDragActive ? 'Drop the file here' : 'Drag & drop a schedule file'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to browse
            </p>
          </div>
          <div className="flex justify-center gap-2">
            <Badge variant="secondary">.xml</Badge>
            <Badge variant="secondary">.xer</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Supports MS Project XML and Primavera P6 XER formats
          </p>
        </div>
      )}
    </div>
  )
}

interface ImportSummaryCardProps {
  parsed: ParsedScheduleData
  fileName: string
}

function ImportSummaryCard({ parsed, fileName }: ImportSummaryCardProps) {
  const summary = getImportSummary(parsed)

  return (
    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        {getSourceSystemIcon(parsed.sourceSystem)}
        <span className="font-medium">{fileName}</span>
        <Badge variant="outline">{getSourceSystemLabel(parsed.sourceSystem)}</Badge>
      </div>

      {parsed.projectName && (
        <p className="text-sm text-muted-foreground">
          Project: {parsed.projectName}
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
          <div className="text-lg font-semibold">{summary.tasksWithPredecessors}</div>
          <div className="text-xs text-muted-foreground">With Links</div>
        </div>
        <div className="bg-background rounded-md p-2 text-center">
          <div className="text-xs text-muted-foreground">Date Range</div>
          <div className="text-xs font-medium mt-1">
            {summary.dateRange.start && summary.dateRange.end ? (
              <>
                {formatDate(summary.dateRange.start)}
                <br />
                to {formatDate(summary.dateRange.end)}
              </>
            ) : (
              '—'
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface ActivityPreviewTableProps {
  activities: ImportedActivity[]
}

function ActivityPreviewTable({ activities }: ActivityPreviewTableProps) {
  const displayActivities = activities.slice(0, 100)
  const hasMore = activities.length > 100

  return (
    <div className="space-y-2">
      <ScrollArea className="h-[300px] border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-[100px]">Start</TableHead>
              <TableHead className="w-[100px]">Finish</TableHead>
              <TableHead className="w-[80px] text-center">Days</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayActivities.map((activity, index) => (
              <TableRow key={index}>
                <TableCell className="font-mono text-xs">
                  <div className="flex items-center gap-1">
                    {activity.is_milestone && (
                      <Flag className="h-3 w-3 text-orange-500" />
                    )}
                    {activity.activity_id}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="truncate max-w-[200px]" title={activity.name}>
                    {activity.name}
                  </div>
                  {activity.wbs_code && (
                    <div className="text-xs text-muted-foreground">
                      WBS: {activity.wbs_code}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  {formatDate(activity.planned_start)}
                </TableCell>
                <TableCell className="text-xs">
                  {formatDate(activity.planned_finish)}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    {activity.planned_duration}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
      {hasMore && (
        <p className="text-xs text-muted-foreground text-center">
          Showing first 100 of {activities.length} activities
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
          No issues found in the imported schedule data.
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
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
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

interface ImportProgressProps {
  current: number
  total: number
  status: string
}

function ImportProgress({ current, total, status }: ImportProgressProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <div className="space-y-4 py-8">
      <div className="flex justify-center">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
      </div>
      <div className="text-center">
        <p className="font-medium">{status}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {current} of {total} activities
        </p>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  )
}

interface ImportCompleteProps {
  results: ImportResults
  onClose: () => void
}

function ImportComplete({ results, onClose }: ImportCompleteProps) {
  const hasErrors = results.errors.length > 0

  return (
    <div className="space-y-6 py-4">
      <div className="text-center">
        {hasErrors ? (
          <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto" />
        ) : (
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
        )}
        <h3 className="text-lg font-semibold mt-4">
          {hasErrors ? 'Import Completed with Errors' : 'Import Successful'}
        </h3>
        <p className="text-muted-foreground mt-1">
          {results.imported} activities imported
          {results.skipped > 0 && `, ${results.skipped} skipped`}
        </p>
      </div>

      {hasErrors && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Import Errors</AlertTitle>
          <AlertDescription>
            <ScrollArea className="h-[100px] mt-2">
              <ul className="list-disc list-inside space-y-1 text-sm">
                {results.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </ScrollArea>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-center">
        <Button onClick={onClose}>Close</Button>
      </div>
    </div>
  )
}

// =============================================
// Component Props
// =============================================

interface ScheduleImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  companyId: string
  onImportComplete?: (count: number) => void
}

// =============================================
// Main Component
// =============================================

export function ScheduleImportDialog({
  open,
  onOpenChange,
  projectId,
  companyId,
  onImportComplete,
}: ScheduleImportDialogProps) {
  // State
  const [step, setStep] = React.useState<ImportStep>('upload')
  const [file, setFile] = React.useState<File | null>(null)
  const [parsedData, setParsedData] = React.useState<ParsedScheduleData | null>(null)
  const [parseError, setParseError] = React.useState<string | null>(null)
  const [isParsing, setIsParsing] = React.useState(false)
  const [clearExisting, setClearExisting] = React.useState(false)
  const [importProgress, setImportProgress] = React.useState({ current: 0, total: 0 })
  const [importResults, setImportResults] = React.useState<ImportResults | null>(null)

  // Hooks
  const importMutation = useImportScheduleActivities()

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setStep('upload')
      setFile(null)
      setParsedData(null)
      setParseError(null)
      setIsParsing(false)
      setClearExisting(false)
      setImportProgress({ current: 0, total: 0 })
      setImportResults(null)
    }
  }, [open])

  // Handle file selection
  const handleFileSelect = React.useCallback(async (selectedFile: File) => {
    setFile(selectedFile)
    setParseError(null)
    setIsParsing(true)

    try {
      const parsed = await parseScheduleFile(selectedFile)
      setParsedData(parsed)
      setStep('preview')
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Failed to parse file')
    } finally {
      setIsParsing(false)
    }
  }, [])

  // Handle import
  const handleImport = React.useCallback(async () => {
    if (!parsedData || !file) {return}

    setStep('importing')
    setImportProgress({ current: 0, total: parsedData.activities.length })

    try {
      const activities = convertToActivityDTOs(parsedData.activities, projectId, companyId)

      const result = await importMutation.mutateAsync({
        projectId,
        companyId,
        activities,
        fileName: file.name,
        fileType: file.name.endsWith('.xml') ? 'xml' : 'xer',
        sourceSystem: parsedData.sourceSystem,
        clearExisting,
      })

      setImportResults({
        imported: result.imported,
        skipped: (result as any).skipped || 0,
        errors: result.errors || [],
      })
      setStep('complete')
      onImportComplete?.(result.imported)
    } catch (error) {
      setImportResults({
        imported: 0,
        skipped: 0,
        errors: [error instanceof Error ? error.message : 'Import failed'],
      })
      setStep('complete')
    }
  }, [parsedData, file, projectId, companyId, clearExisting, importMutation, onImportComplete])

  // Handle back to upload
  const handleBack = React.useCallback(() => {
    setStep('upload')
    setFile(null)
    setParsedData(null)
    setParseError(null)
  }, [])

  // Determine if import is blocked by errors
  const hasBlockingErrors = parsedData?.errors.some(
    (e) => e.includes('No tasks found') || e.includes('No valid tasks')
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Schedule
          </DialogTitle>
          <DialogDescription>
            Import activities from MS Project XML or Primavera P6 XER files
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4">
          {/* Upload Step */}
          {step === 'upload' && (
            <div className="space-y-4">
              <FileDropZone onFileSelect={handleFileSelect} isLoading={isParsing} />

              {parseError && (
                <Alert variant="destructive">
                  <FileX className="h-4 w-4" />
                  <AlertTitle>Parse Error</AlertTitle>
                  <AlertDescription>{parseError}</AlertDescription>
                </Alert>
              )}

              <div className="bg-muted/30 rounded-lg p-4 text-sm space-y-2">
                <p className="font-medium">Supported Formats:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>
                    <strong>MS Project XML (.xml)</strong> — Export from Microsoft Project
                    via File → Save As → XML Format
                  </li>
                  <li>
                    <strong>Primavera P6 XER (.xer)</strong> — Export from Primavera P6
                    via File → Export → Primavera PM
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Preview Step */}
          {step === 'preview' && parsedData && file && (
            <div className="space-y-4">
              <ImportSummaryCard parsed={parsedData} fileName={file.name} />

              <Tabs defaultValue="activities" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="activities" className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Activities ({parsedData.activities.length})
                  </TabsTrigger>
                  <TabsTrigger value="validation" className="flex items-center gap-2">
                    {parsedData.errors.length > 0 ? (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    ) : parsedData.warnings.length > 0 ? (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                    Validation
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="activities" className="mt-4">
                  <ActivityPreviewTable activities={parsedData.activities} />
                </TabsContent>

                <TabsContent value="validation" className="mt-4">
                  <ErrorWarningList
                    errors={parsedData.errors}
                    warnings={parsedData.warnings}
                  />
                </TabsContent>
              </Tabs>

              <Separator />

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="clearExisting"
                  checked={clearExisting}
                  onCheckedChange={(checked) => setClearExisting(checked === true)}
                />
                <label
                  htmlFor="clearExisting"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  Clear existing activities before import
                </label>
              </div>

              {clearExisting && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Warning</AlertTitle>
                  <AlertDescription>
                    This will delete all existing schedule activities for this project
                    before importing. This action cannot be undone.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Importing Step */}
          {step === 'importing' && (
            <ImportProgress
              current={importProgress.current}
              total={importProgress.total}
              status="Importing activities..."
            />
          )}

          {/* Complete Step */}
          {step === 'complete' && importResults && (
            <ImportComplete
              results={importResults}
              onClose={() => onOpenChange(false)}
            />
          )}
        </div>

        {/* Footer */}
        {(step === 'upload' || step === 'preview') && (
          <DialogFooter className="gap-2">
            {step === 'preview' && (
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            {step === 'preview' && (
              <Button
                onClick={handleImport}
                disabled={
                  !parsedData ||
                  parsedData.activities.length === 0 ||
                  hasBlockingErrors ||
                  importMutation.isPending
                }
              >
                {importMutation.isPending ? (
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
