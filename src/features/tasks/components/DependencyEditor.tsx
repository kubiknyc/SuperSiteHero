/**
 * Dependency Editor Component
 *
 * Dialog for managing predecessor relationships with:
 * - Dependency type selection (FS, SS, FF, SF)
 * - Lag/Lead time input
 * - Constraint type selection
 * - Visual dependency preview
 */

import { useState, useCallback, useMemo } from 'react'
import { format, addDays, parseISO } from 'date-fns'
import {
  ArrowRight,
  ArrowRightLeft,
  Link2,
  Unlink,
  Plus,
  Trash2,
  AlertTriangle,
  Lock,
  Clock,
  Target,
  ChevronDown,
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

import type {
  EnhancedGanttTask,
  TaskDependency,
  DependencyType,
  ConstraintType,
} from '../types/gantt'
import {
  DEPENDENCY_TYPE_LABELS,
  CONSTRAINT_TYPE_LABELS,
  CONSTRAINT_TYPE_SHORT_LABELS,
  formatLag,
} from '../types/gantt'

// ============================================================================
// Props
// ============================================================================

interface DependencyEditorProps {
  task: EnhancedGanttTask
  allTasks: EnhancedGanttTask[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (updates: {
    dependencies: TaskDependency[]
    constraintType?: ConstraintType
    constraintDate?: Date | null
  }) => void
}

// ============================================================================
// Dependency Type Icons
// ============================================================================

function DependencyTypeIcon({ type }: { type: DependencyType }) {
  const icons = {
    FS: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="4" width="8" height="6" rx="1" />
        <rect x="14" y="14" width="8" height="6" rx="1" />
        <path d="M10 7 H12 V17 H14" strokeLinecap="round" strokeLinejoin="round" />
        <polygon points="14,17 12,15 12,19" fill="currentColor" />
      </svg>
    ),
    SS: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="6" y="4" width="8" height="6" rx="1" />
        <rect x="6" y="14" width="8" height="6" rx="1" />
        <path d="M6 7 H4 V17 H6" strokeLinecap="round" strokeLinejoin="round" />
        <polygon points="6,17 4,15 4,19" fill="currentColor" />
      </svg>
    ),
    FF: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="6" y="4" width="8" height="6" rx="1" />
        <rect x="6" y="14" width="8" height="6" rx="1" />
        <path d="M14 7 H16 V17 H14" strokeLinecap="round" strokeLinejoin="round" />
        <polygon points="14,17 16,15 16,19" fill="currentColor" />
      </svg>
    ),
    SF: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="14" y="4" width="8" height="6" rx="1" />
        <rect x="2" y="14" width="8" height="6" rx="1" />
        <path d="M14 7 H12 V17 H10" strokeLinecap="round" strokeLinejoin="round" />
        <polygon points="10,17 12,15 12,19" fill="currentColor" />
      </svg>
    ),
  }

  return icons[type] || icons.FS
}

// ============================================================================
// Component
// ============================================================================

export function DependencyEditor({
  task,
  allTasks,
  open,
  onOpenChange,
  onSave,
}: DependencyEditorProps) {
  // State
  const [dependencies, setDependencies] = useState<TaskDependency[]>(
    task.dependencies || []
  )
  const [constraintType, setConstraintType] = useState<ConstraintType>(
    task.constraintType || 'as_soon_as_possible'
  )
  const [constraintDate, setConstraintDate] = useState<string>(
    task.constraintDate
      ? typeof task.constraintDate === 'string'
        ? task.constraintDate.split('T')[0]
        : format(task.constraintDate, 'yyyy-MM-dd')
      : format(new Date(), 'yyyy-MM-dd')
  )
  const [predecessorSearchOpen, setPredecessorSearchOpen] = useState(false)
  const [predecessorSearch, setPredecessorSearch] = useState('')

  // Available predecessors (exclude self and circular dependencies)
  const availablePredecessors = useMemo(() => {
    const existingPredIds = new Set(dependencies.map(d => d.predecessorId))
    return allTasks.filter(t => t.id !== task.id && !existingPredIds.has(t.id))
  }, [allTasks, task.id, dependencies])

  // Filter predecessors based on search
  const filteredPredecessors = useMemo(() => {
    if (!predecessorSearch.trim()) {return availablePredecessors}
    const search = predecessorSearch.toLowerCase()
    return availablePredecessors.filter(t =>
      t.title.toLowerCase().includes(search) ||
      t.activityCode?.toLowerCase().includes(search)
    )
  }, [availablePredecessors, predecessorSearch])

  // Get task by ID
  const getTaskById = useCallback(
    (id: string) => allTasks.find(t => t.id === id),
    [allTasks]
  )

  // Add dependency
  const handleAddDependency = useCallback((predecessorId: string) => {
    setDependencies(prev => [
      ...prev,
      {
        predecessorId,
        type: 'FS',
        lag: 0,
        lagUnit: 'days',
      },
    ])
    setPredecessorSearchOpen(false)
  }, [])

  // Remove dependency
  const handleRemoveDependency = useCallback((predecessorId: string) => {
    setDependencies(prev => prev.filter(d => d.predecessorId !== predecessorId))
  }, [])

  // Update dependency
  const handleUpdateDependency = useCallback(
    (predecessorId: string, updates: Partial<TaskDependency>) => {
      setDependencies(prev =>
        prev.map(d => (d.predecessorId === predecessorId ? { ...d, ...updates } : d))
      )
    },
    []
  )

  // Needs constraint date
  const needsConstraintDate = useMemo(() => {
    return [
      'must_start_on',
      'must_finish_on',
      'start_no_earlier_than',
      'start_no_later_than',
      'finish_no_earlier_than',
      'finish_no_later_than',
    ].includes(constraintType)
  }, [constraintType])

  // Handle save
  const handleSave = useCallback(() => {
    onSave({
      dependencies,
      constraintType,
      constraintDate: needsConstraintDate ? parseISO(constraintDate) : null,
    })
    onOpenChange(false)
  }, [dependencies, constraintType, constraintDate, needsConstraintDate, onSave, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Edit Dependencies: {task.title}
          </DialogTitle>
          <DialogDescription>
            Configure predecessor relationships and schedule constraints for this task.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Predecessors Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4" />
                  Predecessors
                </Label>
                <Popover open={predecessorSearchOpen} onOpenChange={setPredecessorSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Plus className="h-4 w-4" />
                      Add Predecessor
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-2 w-80" align="end">
                    <div className="space-y-2">
                      <Input
                        placeholder="Search tasks..."
                        value={predecessorSearch}
                        onChange={e => setPredecessorSearch(e.target.value)}
                        className="h-8"
                      />
                      <ScrollArea className="h-64">
                        {filteredPredecessors.length === 0 ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            No tasks found.
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                              Available Tasks
                            </p>
                            {filteredPredecessors.map(t => (
                              <button
                                key={t.id}
                                onClick={() => {
                                  handleAddDependency(t.id)
                                  setPredecessorSearch('')
                                }}
                                className="w-full px-2 py-1.5 text-left rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
                              >
                                <div className="flex flex-col">
                                  <span className="text-sm">{t.title}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {t.startDate &&
                                      format(
                                        typeof t.startDate === 'string'
                                          ? parseISO(t.startDate)
                                          : t.startDate,
                                        'MMM d'
                                      )}{' '}
                                    -{' '}
                                    {t.endDate &&
                                      format(
                                        typeof t.endDate === 'string'
                                          ? parseISO(t.endDate)
                                          : t.endDate,
                                        'MMM d, yyyy'
                                      )}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {dependencies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg">
                  <Unlink className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No predecessors defined</p>
                  <p className="text-sm">This task can start at any time</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dependencies.map(dep => {
                    const predTask = getTaskById(dep.predecessorId)
                    if (!predTask) {return null}

                    return (
                      <div
                        key={dep.predecessorId}
                        className="border rounded-lg p-3 bg-card hover:bg-accent/5 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <DependencyTypeIcon type={dep.type} />
                              <span className="font-medium truncate">{predTask.title}</span>
                              {dep.isDriving && (
                                <Badge variant="destructive" className="text-[10px]">
                                  Driving
                                </Badge>
                              )}
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              {/* Dependency Type */}
                              <div>
                                <Label className="text-xs text-muted-foreground">Type</Label>
                                <Select
                                  value={dep.type}
                                  onValueChange={(value: DependencyType) =>
                                    handleUpdateDependency(dep.predecessorId, { type: value })
                                  }
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(DEPENDENCY_TYPE_LABELS).map(([type, label]) => (
                                      <SelectItem key={type} value={type}>
                                        <span className="flex items-center gap-2">
                                          <DependencyTypeIcon type={type as DependencyType} />
                                          <span>{label}</span>
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Lag/Lead */}
                              <div>
                                <Label className="text-xs text-muted-foreground">Lag/Lead</Label>
                                <div className="flex gap-1">
                                  <Input
                                    type="number"
                                    value={dep.lag}
                                    onChange={e =>
                                      handleUpdateDependency(dep.predecessorId, {
                                        lag: parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    className="h-8 text-xs w-16"
                                  />
                                  <Select
                                    value={dep.lagUnit}
                                    onValueChange={(value: 'days' | 'hours' | 'percent') =>
                                      handleUpdateDependency(dep.predecessorId, { lagUnit: value })
                                    }
                                  >
                                    <SelectTrigger className="h-8 text-xs w-20">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="days">Days</SelectItem>
                                      <SelectItem value="hours">Hours</SelectItem>
                                      <SelectItem value="percent">%</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              {/* Date info */}
                              <div>
                                <Label className="text-xs text-muted-foreground">Dates</Label>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {predTask.endDate &&
                                    format(
                                      typeof predTask.endDate === 'string'
                                        ? parseISO(predTask.endDate)
                                        : predTask.endDate,
                                      'MMM d, yyyy'
                                    )}
                                </p>
                              </div>
                            </div>

                            {/* Visual representation */}
                            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <div className="w-16 h-2 bg-blue-200 rounded" />
                                <span>Pred</span>
                              </div>
                              <ArrowRight className="h-3 w-3" />
                              {dep.lag !== 0 && (
                                <Badge variant="outline" className="text-[10px]">
                                  {formatLag(dep.lag, dep.lagUnit)}
                                </Badge>
                              )}
                              <ArrowRight className="h-3 w-3" />
                              <div className="flex items-center gap-1">
                                <div className="w-16 h-2 bg-green-200 rounded" />
                                <span>This task</span>
                              </div>
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoveDependency(dep.predecessorId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <Separator />

            {/* Constraints Section */}
            <div>
              <Label className="text-base font-semibold flex items-center gap-2 mb-3">
                <Lock className="h-4 w-4" />
                Schedule Constraint
              </Label>

              <div className="grid gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Constraint Type</Label>
                  <Select
                    value={constraintType}
                    onValueChange={(value: ConstraintType) => setConstraintType(value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CONSTRAINT_TYPE_LABELS).map(([type, label]) => (
                        <SelectItem key={type} value={type}>
                          <span className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {CONSTRAINT_TYPE_SHORT_LABELS[type as ConstraintType]}
                            </Badge>
                            <span>{label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {needsConstraintDate && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Constraint Date</Label>
                    <Input
                      type="date"
                      value={constraintDate}
                      onChange={e => setConstraintDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                )}

                {/* Constraint explanation */}
                <div className="bg-muted/30 rounded-lg p-3 text-sm text-muted-foreground">
                  {constraintType === 'as_soon_as_possible' && (
                    <p>
                      <strong>ASAP:</strong> Task will start as early as possible based on its
                      predecessors. This is the default constraint.
                    </p>
                  )}
                  {constraintType === 'as_late_as_possible' && (
                    <p>
                      <strong>ALAP:</strong> Task will start as late as possible without delaying
                      its successors.
                    </p>
                  )}
                  {constraintType === 'must_start_on' && (
                    <p>
                      <strong>MSO:</strong> Task must start exactly on the specified date. This is a
                      hard constraint.
                    </p>
                  )}
                  {constraintType === 'must_finish_on' && (
                    <p>
                      <strong>MFO:</strong> Task must finish exactly on the specified date. This is
                      a hard constraint.
                    </p>
                  )}
                  {constraintType === 'start_no_earlier_than' && (
                    <p>
                      <strong>SNET:</strong> Task cannot start before the specified date, but can
                      start later if predecessors require it.
                    </p>
                  )}
                  {constraintType === 'start_no_later_than' && (
                    <p>
                      <strong>SNLT:</strong> Task must start on or before the specified date. A
                      warning will be shown if this conflicts with predecessors.
                    </p>
                  )}
                  {constraintType === 'finish_no_earlier_than' && (
                    <p>
                      <strong>FNET:</strong> Task cannot finish before the specified date.
                    </p>
                  )}
                  {constraintType === 'finish_no_later_than' && (
                    <p>
                      <strong>FNLT:</strong> Task must finish on or before the specified date. Often
                      used for deadlines.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Dependency Type Reference */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="reference">
                <AccordionTrigger className="text-sm">
                  <span className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Dependency Type Reference
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-3 text-sm">
                    <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
                      <DependencyTypeIcon type="FS" />
                      <div>
                        <p className="font-medium">Finish to Start (FS)</p>
                        <p className="text-muted-foreground text-xs">
                          Successor can start after predecessor finishes. Most common type.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
                      <DependencyTypeIcon type="SS" />
                      <div>
                        <p className="font-medium">Start to Start (SS)</p>
                        <p className="text-muted-foreground text-xs">
                          Successor can start after predecessor starts. Good for parallel work.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
                      <DependencyTypeIcon type="FF" />
                      <div>
                        <p className="font-medium">Finish to Finish (FF)</p>
                        <p className="text-muted-foreground text-xs">
                          Successor can finish after predecessor finishes. Links completion dates.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
                      <DependencyTypeIcon type="SF" />
                      <div>
                        <p className="font-medium">Start to Finish (SF)</p>
                        <p className="text-muted-foreground text-xs">
                          Successor finish depends on predecessor start. Rarely used.
                        </p>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DependencyEditor
