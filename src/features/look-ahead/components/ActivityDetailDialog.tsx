/**
 * Activity Detail Dialog Component
 * Full form for creating/editing look-ahead activities
 */

import { useState, useEffect } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Loader2, Save, Calendar, MapPin, Users, Clock, HardHat } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ConstraintsList } from './ConstraintsList'
import {
  type LookAheadActivityWithDetails,
  type LookAheadActivityStatus,
  type CreateLookAheadActivityDTO,
  type UpdateLookAheadActivityDTO,
  type CreateLookAheadConstraintDTO,
  type LookAheadConstraintWithDetails,
  CONSTRUCTION_TRADES,
  ACTIVITY_STATUS_CONFIG,
  calculateDurationDays,
} from '@/types/look-ahead'

interface ActivityDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activity?: LookAheadActivityWithDetails | null
  projectId: string
  weekNumber?: number
  weekStartDate?: string
  constraints?: LookAheadConstraintWithDetails[]
  subcontractors?: { id: string; name: string }[]
  onSave: (dto: CreateLookAheadActivityDTO | UpdateLookAheadActivityDTO) => void
  onAddConstraint?: (dto: CreateLookAheadConstraintDTO) => void
  onResolveConstraint?: (constraintId: string, notes?: string) => void
  onDeleteConstraint?: (constraintId: string) => void
  isLoading?: boolean
}

export function ActivityDetailDialog({
  open,
  onOpenChange,
  activity,
  projectId,
  weekNumber = 1,
  weekStartDate,
  constraints = [],
  subcontractors = [],
  onSave,
  onAddConstraint,
  onResolveConstraint,
  onDeleteConstraint,
  isLoading,
}: ActivityDetailDialogProps) {
  const isEditing = !!activity

  // Form state
  const [formData, setFormData] = useState<Partial<CreateLookAheadActivityDTO>>({
    project_id: projectId,
    activity_name: '',
    description: '',
    location: '',
    trade: '',
    subcontractor_id: '',
    planned_start_date: weekStartDate || new Date().toISOString().split('T')[0],
    planned_end_date: weekStartDate || new Date().toISOString().split('T')[0],
    status: 'planned',
    percent_complete: 0,
    estimated_labor_hours: undefined,
    estimated_crew_size: undefined,
    priority: 50,
    notes: '',
  })

  // Reset form when activity changes
  useEffect(() => {
    if (activity) {
      setFormData({
        project_id: activity.project_id,
        activity_name: activity.activity_name,
        description: activity.description || '',
        location: activity.location || '',
        trade: activity.trade || '',
        subcontractor_id: activity.subcontractor_id || '',
        planned_start_date: activity.planned_start_date,
        planned_end_date: activity.planned_end_date,
        status: activity.status,
        percent_complete: activity.percent_complete,
        estimated_labor_hours: activity.estimated_labor_hours || undefined,
        estimated_crew_size: activity.estimated_crew_size || undefined,
        priority: activity.priority,
        notes: activity.notes || '',
      })
    } else {
      setFormData({
        project_id: projectId,
        activity_name: '',
        description: '',
        location: '',
        trade: '',
        subcontractor_id: '',
        planned_start_date: weekStartDate || new Date().toISOString().split('T')[0],
        planned_end_date: weekStartDate || new Date().toISOString().split('T')[0],
        status: 'planned',
        percent_complete: 0,
        priority: 50,
        notes: '',
      })
    }
  }, [activity, projectId, weekStartDate])

  const handleChange = (field: keyof CreateLookAheadActivityDTO, value: string | number | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = () => {
    if (!formData.activity_name || !formData.planned_start_date || !formData.planned_end_date) {
      return
    }

    if (isEditing) {
      const updateDto: UpdateLookAheadActivityDTO = {
        activity_name: formData.activity_name,
        description: formData.description,
        location: formData.location,
        trade: formData.trade,
        subcontractor_id: formData.subcontractor_id || undefined,
        planned_start_date: formData.planned_start_date,
        planned_end_date: formData.planned_end_date,
        status: formData.status as LookAheadActivityStatus,
        percent_complete: formData.percent_complete,
        estimated_labor_hours: formData.estimated_labor_hours,
        estimated_crew_size: formData.estimated_crew_size,
        priority: formData.priority,
        notes: formData.notes,
      }
      onSave(updateDto)
    } else {
      const createDto: CreateLookAheadActivityDTO = {
        project_id: projectId,
        activity_name: formData.activity_name!,
        description: formData.description,
        location: formData.location,
        trade: formData.trade,
        subcontractor_id: formData.subcontractor_id || undefined,
        planned_start_date: formData.planned_start_date!,
        planned_end_date: formData.planned_end_date!,
        status: (formData.status as LookAheadActivityStatus) || 'planned',
        percent_complete: formData.percent_complete || 0,
        week_number: weekNumber,
        week_start_date: weekStartDate,
        estimated_labor_hours: formData.estimated_labor_hours,
        estimated_crew_size: formData.estimated_crew_size,
        priority: formData.priority || 50,
        notes: formData.notes,
      }
      onSave(createDto)
    }
  }

  const durationDays =
    formData.planned_start_date && formData.planned_end_date
      ? calculateDurationDays(formData.planned_start_date, formData.planned_end_date)
      : 1

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Activity' : 'New Activity'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the activity details and constraints'
              : `Add a new activity for Week ${weekNumber}`}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="constraints" disabled={!isEditing}>
              Constraints ({constraints.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            {/* Activity Name */}
            <div className="space-y-2">
              <Label htmlFor="activity_name">Activity Name *</Label>
              <Input
                id="activity_name"
                placeholder="Enter activity name"
                value={formData.activity_name}
                onChange={(e) => handleChange('activity_name', e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the work to be done..."
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={2}
              />
            </div>

            {/* Location & Trade */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">
                  <MapPin className="h-3 w-3 inline mr-1" />
                  Location
                </Label>
                <Input
                  id="location"
                  placeholder="Area or zone"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  <HardHat className="h-3 w-3 inline mr-1" />
                  Trade
                </Label>
                <Select value={formData.trade || ''} onValueChange={(v) => handleChange('trade', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select trade" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONSTRUCTION_TRADES.map((trade) => (
                      <SelectItem key={trade} value={trade}>
                        {trade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Subcontractor */}
            {subcontractors.length > 0 && (
              <div className="space-y-2">
                <Label>
                  <Users className="h-3 w-3 inline mr-1" />
                  Subcontractor
                </Label>
                <Select
                  value={formData.subcontractor_id || ''}
                  onValueChange={(v) => handleChange('subcontractor_id', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subcontractor" />
                  </SelectTrigger>
                  <SelectContent>
                    {subcontractors.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="planned_start_date">
                  <Calendar className="h-3 w-3 inline mr-1" />
                  Start Date *
                </Label>
                <Input
                  id="planned_start_date"
                  type="date"
                  value={formData.planned_start_date}
                  onChange={(e) => handleChange('planned_start_date', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="planned_end_date">
                  <Calendar className="h-3 w-3 inline mr-1" />
                  End Date *
                </Label>
                <Input
                  id="planned_end_date"
                  type="date"
                  value={formData.planned_end_date}
                  onChange={(e) => handleChange('planned_end_date', e.target.value)}
                  min={formData.planned_start_date}
                />
              </div>
            </div>

            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Duration: {durationDays} day{durationDays > 1 ? 's' : ''}
            </div>

            {/* Status & Progress (only for editing) */}
            {isEditing && (
              <>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status || 'planned'}
                    onValueChange={(v) => handleChange('status', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ACTIVITY_STATUS_CONFIG).map(([status, config]) => (
                        <SelectItem key={status} value={status}>
                          <div className="flex items-center gap-2">
                            <div className={cn('w-2 h-2 rounded-full', config.bgColor)} />
                            {config.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Progress</Label>
                    <span className="text-sm font-medium">{formData.percent_complete}%</span>
                  </div>
                  <Slider
                    value={[formData.percent_complete || 0]}
                    onValueChange={([value]) => handleChange('percent_complete', value)}
                    max={100}
                    step={5}
                  />
                </div>
              </>
            )}

            {/* Resources */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estimated_crew_size">Crew Size</Label>
                <Input
                  id="estimated_crew_size"
                  type="number"
                  min={1}
                  placeholder="Number of workers"
                  value={formData.estimated_crew_size || ''}
                  onChange={(e) =>
                    handleChange('estimated_crew_size', e.target.value ? parseInt(e.target.value) : undefined)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimated_labor_hours">Labor Hours</Label>
                <Input
                  id="estimated_labor_hours"
                  type="number"
                  min={0}
                  step={0.5}
                  placeholder="Total hours"
                  value={formData.estimated_labor_hours || ''}
                  onChange={(e) =>
                    handleChange('estimated_labor_hours', e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                />
              </div>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Priority</Label>
                <Badge variant="outline">{formData.priority}</Badge>
              </div>
              <Slider
                value={[formData.priority || 50]}
                onValueChange={([value]) => handleChange('priority', value)}
                max={100}
                min={1}
                step={1}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Low</span>
                <span>Medium</span>
                <span>High</span>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes..."
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={2}
              />
            </div>
          </TabsContent>

          <TabsContent value="constraints" className="mt-4">
            {isEditing && activity && (
              <ConstraintsList
                constraints={constraints}
                activityId={activity.id}
                projectId={projectId}
                onAddConstraint={onAddConstraint}
                onResolveConstraint={onResolveConstraint}
                onDeleteConstraint={onDeleteConstraint}
              />
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !formData.activity_name}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEditing ? 'Update' : 'Create'} Activity
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ActivityDetailDialog
