// File: src/features/gantt/components/ImportScheduleDialog.tsx
// Dialog for importing MS Project XML schedules

import { useState, useCallback, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Upload,
  FileText,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Loader2,
  X,
} from 'lucide-react'
import { importFromFile, type ParsedSchedule } from '../utils/msProjectImport'

interface ImportScheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (
    tasks: ParsedSchedule['tasks'],
    dependencies: ParsedSchedule['dependencies'],
    clearExisting: boolean
  ) => Promise<void>
  isImporting?: boolean
}

export function ImportScheduleDialog({
  open,
  onOpenChange,
  onImport,
  isImporting = false,
}: ImportScheduleDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedSchedule | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [clearExisting, setClearExisting] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile)
    setParsedData(null)
    setParseError(null)
    setIsParsing(true)

    try {
      const result = await importFromFile(selectedFile)
      setParsedData(result)
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Failed to parse file')
    } finally {
      setIsParsing(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile && droppedFile.name.toLowerCase().endsWith('.xml')) {
        handleFileSelect(droppedFile)
      } else {
        setParseError('Please drop an XML file')
      }
    },
    [handleFileSelect]
  )

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0]
      if (selectedFile) {
        handleFileSelect(selectedFile)
      }
    },
    [handleFileSelect]
  )

  const handleImport = useCallback(async () => {
    if (!parsedData) {return}

    await onImport(parsedData.tasks, parsedData.dependencies, clearExisting)
    onOpenChange(false)
    // Reset state
    setFile(null)
    setParsedData(null)
    setClearExisting(false)
  }, [parsedData, clearExisting, onImport, onOpenChange])

  const handleClose = useCallback(() => {
    onOpenChange(false)
    setFile(null)
    setParsedData(null)
    setParseError(null)
    setClearExisting(false)
  }, [onOpenChange])

  const hasErrors = parsedData && parsedData.errors.length > 0
  const hasWarnings = parsedData && parsedData.warnings.length > 0
  const canImport = parsedData && parsedData.tasks.length > 0 && !hasErrors && !isImporting

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Schedule from MS Project</DialogTitle>
          <DialogDescription>
            Upload a Microsoft Project XML export file to import tasks and dependencies.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File drop zone */}
          <div
            className={`
              border-2 border-dashed rounded-lg p-8
              transition-colors cursor-pointer
              ${file ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'}
            `}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml"
              onChange={handleInputChange}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-2 text-center">
              {isParsing ? (
                <>
                  <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
                  <p className="text-sm text-gray-600">Parsing file...</p>
                </>
              ) : file ? (
                <>
                  <FileText className="h-10 w-10 text-green-500" />
                  <p className="font-medium text-gray-700">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setFile(null)
                      setParsedData(null)
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    Drop MS Project XML file here or click to browse
                  </p>
                  <p className="text-xs text-gray-400">
                    Supports .xml exports from Microsoft Project
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Parse error */}
          {parseError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Failed to parse file</p>
                <p className="text-xs text-red-600">{parseError}</p>
              </div>
            </div>
          )}

          {/* Parsed results */}
          {parsedData && (
            <div className="space-y-3">
              {/* Summary */}
              <div className="flex items-center gap-4 p-3 rounded-lg bg-gray-50">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium">{parsedData.tasks.length} tasks</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{parsedData.dependencies.length} dependencies</Badge>
                </div>
                {parsedData.tasks.filter(t => t.is_milestone).length > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {parsedData.tasks.filter(t => t.is_milestone).length} milestones
                    </Badge>
                  </div>
                )}
              </div>

              {/* Errors */}
              {hasErrors && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-red-800">
                      {parsedData.errors.length} Error{parsedData.errors.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <ul className="text-xs text-red-600 space-y-1 max-h-24 overflow-y-auto">
                    {parsedData.errors.map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings */}
              {hasWarnings && !hasErrors && (
                <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">
                      {parsedData.warnings.length} Warning{parsedData.warnings.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <ul className="text-xs text-yellow-700 space-y-1 max-h-24 overflow-y-auto">
                    {parsedData.warnings.map((warning, i) => (
                      <li key={i}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview tasks */}
              {parsedData.tasks.length > 0 && (
                <div className="border rounded-lg max-h-48 overflow-y-auto">
                  <div className="p-2 bg-gray-50 border-b text-xs font-medium text-gray-600 sticky top-0">
                    Preview (first 10 tasks)
                  </div>
                  <div className="divide-y">
                    {parsedData.tasks.slice(0, 10).map((task, i) => (
                      <div key={i} className="px-3 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {task.is_milestone && (
                            <span className="text-violet-500">◆</span>
                          )}
                          <span className="text-sm">{task.task_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{task.start_date}</span>
                          <span>→</span>
                          <span>{task.finish_date}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {task.percent_complete}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {parsedData.tasks.length > 10 && (
                      <div className="px-3 py-2 text-xs text-gray-500 text-center">
                        ...and {parsedData.tasks.length - 10} more tasks
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Options */}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50">
                <Checkbox
                  id="clear-existing"
                  checked={clearExisting}
                  onCheckedChange={(checked) => setClearExisting(checked === true)}
                />
                <Label htmlFor="clear-existing" className="text-sm cursor-pointer">
                  Clear existing schedule before import
                </Label>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!canImport}>
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import {parsedData?.tasks.length || 0} Tasks
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
