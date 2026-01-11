// File: /src/features/documents/components/MarkupMigration.tsx
// Migrate markups from old drawing versions to new revisions

import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  GitPullRequest,
  ArrowRight,
  Check,
  X,
  Loader2,
  AlertTriangle,
  Eye,
  EyeOff,
  Undo,
  FileText,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Move,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { format, formatDistanceToNow } from 'date-fns'
import {
  useNewRevisionDetection,
  useMigratableMarkups,
  useMigrateMarkups,
} from '../hooks/useDrawingSetManagement'
import { useCompareVersions } from '../hooks/useDocumentComparison'
import type {
  MigratableMarkup,
  MarkupMigrationOptions,
  NewRevisionDetection,
  MarkupMigrationStatus,
} from '../types/drawing-set'

interface MarkupMigrationProps {
  projectId: string
  onMigrationComplete?: () => void
  className?: string
}

/**
 * MarkupMigration Component
 *
 * Detects new drawing revisions and offers to migrate markups including:
 * - Automatic detection of new versions
 * - Smart positioning for unchanged areas
 * - Review and adjustment for changed areas
 * - Batch migration with progress tracking
 */
export function MarkupMigration({
  projectId,
  onMigrationComplete,
  className = '',
}: MarkupMigrationProps) {
  // State
  const [selectedDetection, setSelectedDetection] = useState<NewRevisionDetection | null>(null)
  const [showMigrationDialog, setShowMigrationDialog] = useState(false)

  // Queries
  const { data: detections, isLoading } = useNewRevisionDetection(projectId)

  // Filter to only show pending migrations
  const pendingMigrations = useMemo(() => {
    return (detections || []).filter(d => d.hasMigratableMarkups)
  }, [detections])

  const handleMigrate = (detection: NewRevisionDetection) => {
    setSelectedDetection(detection)
    setShowMigrationDialog(true)
  }

  const handleClose = () => {
    setSelectedDetection(null)
    setShowMigrationDialog(false)
  }

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (pendingMigrations.length === 0) {
    return null
  }

  return (
    <>
      <Alert className={cn('border-primary/50 bg-primary/5', className)}>
        <GitPullRequest className="h-4 w-4" />
        <AlertTitle>Markup Migration Available</AlertTitle>
        <AlertDescription className="mt-2 space-y-3">
          <p>
            {pendingMigrations.length} drawing{pendingMigrations.length !== 1 ? 's have' : ' has'} new
            revisions with markups that can be migrated.
          </p>

          <div className="space-y-2">
            {pendingMigrations.slice(0, 3).map(detection => (
              <div
                key={detection.documentId}
                className="flex items-center justify-between p-2 bg-background rounded border"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{detection.documentName}</p>
                    <p className="text-xs text-muted-foreground">
                      v{detection.previousVersion} {'->'} v{detection.newVersion}
                      {' '} ({detection.markupCount} markups)
                    </p>
                  </div>
                </div>
                <Button size="sm" onClick={() => handleMigrate(detection)}>
                  Migrate
                </Button>
              </div>
            ))}
          </div>

          {pendingMigrations.length > 3 && (
            <p className="text-sm text-muted-foreground">
              + {pendingMigrations.length - 3} more
            </p>
          )}
        </AlertDescription>
      </Alert>

      {/* Migration Dialog */}
      {selectedDetection && (
        <MigrationDialog
          open={showMigrationDialog}
          onClose={handleClose}
          detection={selectedDetection}
          onComplete={onMigrationComplete}
        />
      )}
    </>
  )
}

// ============================================================
// Migration Dialog
// ============================================================

interface MigrationDialogProps {
  open: boolean
  onClose: () => void
  detection: NewRevisionDetection
  onComplete?: () => void
}

function MigrationDialog({
  open,
  onClose,
  detection,
  onComplete,
}: MigrationDialogProps) {
  // State
  const [step, setStep] = useState<'review' | 'options' | 'migrate'>('review')
  const [selectedMarkupIds, setSelectedMarkupIds] = useState<Set<string>>(new Set())
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['unchanged']))
  const [options, setOptions] = useState<MarkupMigrationOptions>({
    autoMigrateUnchanged: true,
    smartReposition: true,
    keepOriginalReference: true,
    skipOverlapping: false,
  })
  const [isComparing, setIsComparing] = useState(false)

  // Queries
  const { data: comparison } = useCompareVersions(
    detection.previousDocumentId,
    detection.documentId
  )

  const { data: markups, isLoading: loadingMarkups } = useMigratableMarkups(
    detection.previousDocumentId,
    detection.documentId,
    comparison?.changeRegions
  )

  // Mutations
  const migrateMarkups = useMigrateMarkups()

  // Initialize selection with all markups
  useEffect(() => {
    if (markups) {
      setSelectedMarkupIds(new Set(markups.map(m => m.id)))
    }
  }, [markups])

  // Group markups by change overlap
  const groupedMarkups = useMemo(() => {
    if (!markups) {return { unchanged: [], overlapping: [] }}
    return {
      unchanged: markups.filter(m => !m.overlapsChange),
      overlapping: markups.filter(m => m.overlapsChange),
    }
  }, [markups])

  // Toggle group
  const toggleGroup = useCallback((group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(group)) {
        next.delete(group)
      } else {
        next.add(group)
      }
      return next
    })
  }, [])

  // Toggle markup selection
  const toggleMarkup = useCallback((markupId: string) => {
    setSelectedMarkupIds(prev => {
      const next = new Set(prev)
      if (next.has(markupId)) {
        next.delete(markupId)
      } else {
        next.add(markupId)
      }
      return next
    })
  }, [])

  // Toggle all in group
  const toggleGroupSelection = useCallback((group: 'unchanged' | 'overlapping') => {
    const groupMarkups = groupedMarkups[group]
    const allSelected = groupMarkups.every(m => selectedMarkupIds.has(m.id))

    setSelectedMarkupIds(prev => {
      const next = new Set(prev)
      groupMarkups.forEach(m => {
        if (allSelected) {
          next.delete(m.id)
        } else {
          next.add(m.id)
        }
      })
      return next
    })
  }, [groupedMarkups, selectedMarkupIds])

  // Handle migration
  const handleMigrate = async () => {
    if (!markups) {return}

    const selectedMarkups = markups.filter(m => selectedMarkupIds.has(m.id))
    if (selectedMarkups.length === 0) {
      toast.error('No markups selected')
      return
    }

    setStep('migrate')

    try {
      const result = await migrateMarkups.mutateAsync({
        fromDocumentId: detection.previousDocumentId,
        toDocumentId: detection.documentId,
        markups: selectedMarkups,
        options,
      })

      if (result.success) {
        toast.success(
          `Successfully migrated ${result.migratedCount} markup(s)`
        )
        onComplete?.()
        onClose()
      } else {
        toast.error(
          `Migration completed with issues: ${result.failedCount} failed, ${result.skippedCount} skipped`
        )
      }
    } catch (error) {
      toast.error('Migration failed')
    } finally {
      setStep('review')
    }
  }

  // Stats
  const stats = useMemo(() => {
    if (!markups) {return { total: 0, selected: 0, unchanged: 0, overlapping: 0 }}
    return {
      total: markups.length,
      selected: selectedMarkupIds.size,
      unchanged: groupedMarkups.unchanged.length,
      overlapping: groupedMarkups.overlapping.length,
    }
  }, [markups, selectedMarkupIds, groupedMarkups])

  // Status icons
  const statusIcons: Record<MarkupMigrationStatus, React.ReactNode> = {
    pending: <Clock className="w-4 h-4 text-muted-foreground" />,
    migrated: <CheckCircle className="w-4 h-4 text-green-500" />,
    adjusted: <Move className="w-4 h-4 text-yellow-500" />,
    skipped: <AlertCircle className="w-4 h-4 text-muted-foreground" />,
    failed: <XCircle className="w-4 h-4 text-destructive" />,
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitPullRequest className="w-5 h-5" />
            Migrate Markups
          </DialogTitle>
          <DialogDescription>
            Migrate markups from v{detection.previousVersion} to v{detection.newVersion} of {detection.documentName}
          </DialogDescription>
        </DialogHeader>

        {/* Version Comparison Summary */}
        {comparison && (
          <div className="p-3 border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">v{detection.previousVersion}</Badge>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <Badge variant="default">v{detection.newVersion}</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {comparison.changeRegions.length} change regions detected
                ({comparison.overallChangePercentage.toFixed(1)}% changed)
              </div>
            </div>
          </div>
        )}

        {step === 'review' && (
          <>
            {/* Stats Bar */}
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                {stats.unchanged} unchanged
              </span>
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                {stats.overlapping} in change regions
              </span>
              <span className="flex items-center gap-1 ml-auto">
                {stats.selected}/{stats.total} selected
              </span>
            </div>

            {/* Markup List */}
            <ScrollArea className="h-[300px]">
              {loadingMarkups ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Unchanged Group */}
                  <MarkupGroup
                    title="Safe to Migrate"
                    subtitle="These markups are in unchanged areas"
                    icon={<CheckCircle className="w-4 h-4 text-green-500" />}
                    markups={groupedMarkups.unchanged}
                    isExpanded={expandedGroups.has('unchanged')}
                    selectedIds={selectedMarkupIds}
                    onToggle={() => toggleGroup('unchanged')}
                    onToggleAll={() => toggleGroupSelection('unchanged')}
                    onToggleMarkup={toggleMarkup}
                    statusIcons={statusIcons}
                  />

                  {/* Overlapping Group */}
                  {groupedMarkups.overlapping.length > 0 && (
                    <MarkupGroup
                      title="Review Required"
                      subtitle="These markups overlap with change regions"
                      icon={<AlertTriangle className="w-4 h-4 text-yellow-500" />}
                      markups={groupedMarkups.overlapping}
                      isExpanded={expandedGroups.has('overlapping')}
                      selectedIds={selectedMarkupIds}
                      onToggle={() => toggleGroup('overlapping')}
                      onToggleAll={() => toggleGroupSelection('overlapping')}
                      onToggleMarkup={toggleMarkup}
                      statusIcons={statusIcons}
                      showWarning
                    />
                  )}
                </div>
              )}
            </ScrollArea>
          </>
        )}

        {step === 'options' && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Migration Options</AlertTitle>
              <AlertDescription>
                Configure how markups should be migrated to the new version.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label className="text-base">Auto-migrate unchanged</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically migrate markups not in change regions
                  </p>
                </div>
                <Switch
                  checked={options.autoMigrateUnchanged}
                  onCheckedChange={(v) =>
                    setOptions({ ...options, autoMigrateUnchanged: v })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label className="text-base">Smart repositioning</Label>
                  <p className="text-sm text-muted-foreground">
                    Attempt to adjust positions for markups in changed areas
                  </p>
                </div>
                <Switch
                  checked={options.smartReposition}
                  onCheckedChange={(v) =>
                    setOptions({ ...options, smartReposition: v })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label className="text-base">Keep original reference</Label>
                  <p className="text-sm text-muted-foreground">
                    Store a link to the original markup
                  </p>
                </div>
                <Switch
                  checked={options.keepOriginalReference}
                  onCheckedChange={(v) =>
                    setOptions({ ...options, keepOriginalReference: v })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label className="text-base">Skip overlapping markups</Label>
                  <p className="text-sm text-muted-foreground">
                    Don't migrate markups in change regions
                  </p>
                </div>
                <Switch
                  checked={options.skipOverlapping}
                  onCheckedChange={(v) =>
                    setOptions({ ...options, skipOverlapping: v })
                  }
                />
              </div>
            </div>
          </div>
        )}

        {step === 'migrate' && (
          <div className="py-8 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-lg font-medium">Migrating markups...</p>
            <p className="text-sm text-muted-foreground mt-2">
              This may take a moment
            </p>
          </div>
        )}

        <DialogFooter>
          {step === 'review' && (
            <>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => setStep('options')}
              >
                Options
              </Button>
              <Button
                onClick={handleMigrate}
                disabled={selectedMarkupIds.size === 0 || migrateMarkups.isPending}
              >
                <GitPullRequest className="w-4 h-4 mr-2" />
                Migrate {selectedMarkupIds.size} Markups
              </Button>
            </>
          )}

          {step === 'options' && (
            <>
              <Button variant="outline" onClick={() => setStep('review')}>
                Back
              </Button>
              <Button onClick={handleMigrate} disabled={migrateMarkups.isPending}>
                <Check className="w-4 h-4 mr-2" />
                Continue with Migration
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Sub-components
// ============================================================

interface MarkupGroupProps {
  title: string
  subtitle: string
  icon: React.ReactNode
  markups: MigratableMarkup[]
  isExpanded: boolean
  selectedIds: Set<string>
  onToggle: () => void
  onToggleAll: () => void
  onToggleMarkup: (id: string) => void
  statusIcons: Record<MarkupMigrationStatus, React.ReactNode>
  showWarning?: boolean
}

function MarkupGroup({
  title,
  subtitle,
  icon,
  markups,
  isExpanded,
  selectedIds,
  onToggle,
  onToggleAll,
  onToggleMarkup,
  statusIcons,
  showWarning,
}: MarkupGroupProps) {
  const selectedCount = markups.filter(m => selectedIds.has(m.id)).length
  const allSelected = markups.length > 0 && selectedCount === markups.length

  if (markups.length === 0) {return null}

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 hover:text-foreground"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          {icon}
          <div className="text-left">
            <span className="font-medium">{title}</span>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <Badge variant="secondary" className="ml-2">
            {selectedCount}/{markups.length}
          </Badge>
        </button>
        <Checkbox
          checked={allSelected}
          onCheckedChange={onToggleAll}
        />
      </div>

      {isExpanded && (
        <div className="divide-y">
          {showWarning && (
            <div className="px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-yellow-700 dark:text-yellow-300">
                These markups may need manual adjustment after migration
              </span>
            </div>
          )}

          {markups.map(markup => (
            <div
              key={markup.id}
              className={cn(
                'flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors',
                selectedIds.has(markup.id) ? 'bg-primary/5' : 'hover:bg-muted/30'
              )}
              onClick={() => onToggleMarkup(markup.id)}
            >
              <Checkbox
                checked={selectedIds.has(markup.id)}
                className="pointer-events-none"
              />
              {statusIcons[markup.status]}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate capitalize">
                  {markup.markupType}
                </p>
                <p className="text-xs text-muted-foreground">
                  Page {markup.pageNumber}
                  {markup.positionConfidence !== undefined && (
                    <span className="ml-2">
                      ({Math.round(markup.positionConfidence * 100)}% confidence)
                    </span>
                  )}
                </p>
              </div>
              {markup.overlapsChange && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="w-4 h-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>This markup overlaps with a detected change in the drawing</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default MarkupMigration
