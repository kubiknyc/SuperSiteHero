/**
 * Constraints List Component
 * Display and manage constraints for look-ahead activities
 */

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  Link2,
  FileQuestion,
  FileCheck,
  Truck,
  GitBranch,
  ClipboardCheck,
  FileBadge,
  CloudSun,
  Users,
  UserCheck,
  PenTool,
  AlertCircle,
  Calendar,
  ExternalLink,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type LookAheadConstraintWithDetails,
  type ConstraintType,
  type ConstraintStatus,
  type CreateLookAheadConstraintDTO,
  getConstraintTypeConfig,
  CONSTRAINT_TYPE_CONFIG,
} from '@/types/look-ahead'

interface ConstraintsListProps {
  constraints: LookAheadConstraintWithDetails[]
  activityId: string
  projectId: string
  onAddConstraint?: (dto: CreateLookAheadConstraintDTO) => void
  onResolveConstraint?: (constraintId: string, notes?: string) => void
  onDeleteConstraint?: (constraintId: string) => void
  onViewLinkedEntity?: (type: 'rfi' | 'submittal', id: string) => void
  isLoading?: boolean
  className?: string
}

const constraintTypeIcons: Record<ConstraintType, React.ReactNode> = {
  rfi_pending: <FileQuestion className="h-4 w-4" />,
  submittal_pending: <FileCheck className="h-4 w-4" />,
  material_delivery: <Truck className="h-4 w-4" />,
  predecessor_activity: <GitBranch className="h-4 w-4" />,
  inspection_required: <ClipboardCheck className="h-4 w-4" />,
  permit_required: <FileBadge className="h-4 w-4" />,
  weather_dependent: <CloudSun className="h-4 w-4" />,
  resource_availability: <Users className="h-4 w-4" />,
  owner_decision: <UserCheck className="h-4 w-4" />,
  design_clarification: <PenTool className="h-4 w-4" />,
  other: <AlertCircle className="h-4 w-4" />,
}

const statusColors: Record<ConstraintStatus, { color: string; bgColor: string }> = {
  open: { color: 'text-error-dark', bgColor: 'bg-error-light' },
  resolved: { color: 'text-success-dark', bgColor: 'bg-success-light' },
  waived: { color: 'text-yellow-700', bgColor: 'bg-warning-light' },
  escalated: { color: 'text-purple-700', bgColor: 'bg-purple-100' },
}

export function ConstraintsList({
  constraints,
  activityId,
  projectId: _projectId,
  onAddConstraint,
  onResolveConstraint,
  onDeleteConstraint,
  onViewLinkedEntity,
  isLoading: _isLoading,
  className,
}: ConstraintsListProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showResolveDialog, setShowResolveDialog] = useState<string | null>(null)
  const [resolutionNotes, setResolutionNotes] = useState('')

  // New constraint form state
  const [newConstraint, setNewConstraint] = useState<Partial<CreateLookAheadConstraintDTO>>({
    activity_id: activityId,
    constraint_type: 'other',
    description: '',
  })

  const openConstraints = constraints.filter((c) => c.status === 'open')
  const resolvedConstraints = constraints.filter((c) => c.status !== 'open')

  const handleAddConstraint = () => {
    if (onAddConstraint && newConstraint.description) {
      onAddConstraint({
        activity_id: activityId,
        constraint_type: newConstraint.constraint_type || 'other',
        description: newConstraint.description,
        expected_resolution_date: newConstraint.expected_resolution_date,
        responsible_party: newConstraint.responsible_party,
      })
      setShowAddDialog(false)
      setNewConstraint({
        activity_id: activityId,
        constraint_type: 'other',
        description: '',
      })
    }
  }

  const handleResolve = (constraintId: string) => {
    if (onResolveConstraint) {
      onResolveConstraint(constraintId, resolutionNotes)
      setShowResolveDialog(null)
      setResolutionNotes('')
    }
  }

  const renderConstraintCard = (constraint: LookAheadConstraintWithDetails) => {
    const config = getConstraintTypeConfig(constraint.constraint_type)
    const statusStyle = statusColors[constraint.status]

    return (
      <Card key={constraint.id} className="mb-2">
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1">
              <div className={cn('mt-0.5', constraint.status === 'open' ? 'text-error' : 'text-disabled')}>
                {constraintTypeIcons[constraint.constraint_type]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {config.label}
                  </Badge>
                  <Badge className={cn('text-xs', statusStyle.color, statusStyle.bgColor)}>
                    {constraint.status}
                  </Badge>
                </div>
                <p className="text-sm">{constraint.description}</p>

                {/* Linked Entity */}
                {constraint.rfi_id && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs text-primary"
                    onClick={() => onViewLinkedEntity?.('rfi', constraint.rfi_id!)}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    RFI #{constraint.rfi_number}: {constraint.rfi_subject}
                  </Button>
                )}
                {constraint.submittal_id && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs text-primary"
                    onClick={() => onViewLinkedEntity?.('submittal', constraint.submittal_id!)}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Submittal #{constraint.submittal_number}: {constraint.submittal_title}
                  </Button>
                )}

                {/* Expected Resolution Date */}
                {constraint.expected_resolution_date && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Calendar className="h-3 w-3" />
                    Expected: {new Date(constraint.expected_resolution_date).toLocaleDateString()}
                  </div>
                )}

                {/* Delay Impact */}
                {constraint.delay_days > 0 && (
                  <div className="flex items-center gap-1 text-xs text-orange-600 mt-1">
                    <Clock className="h-3 w-3" />
                    {constraint.delay_days} day{constraint.delay_days > 1 ? 's' : ''} delay
                  </div>
                )}

                {/* Resolution Notes */}
                {constraint.resolution_notes && (
                  <div className="mt-2 p-2 bg-success-light rounded text-xs text-green-800">
                    <strong>Resolution:</strong> {constraint.resolution_notes}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            {constraint.status === 'open' && (
              <div className="flex flex-col gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setShowResolveDialog(constraint.id)}
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Resolve
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-error"
                  onClick={() => onDeleteConstraint?.(constraint.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          <h3 className="font-medium heading-subsection">Constraints</h3>
          {openConstraints.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {openConstraints.length} open
            </Badge>
          )}
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Constraint
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Constraint</DialogTitle>
              <DialogDescription>
                Add a constraint that may block or delay this activity.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Constraint Type</Label>
                <Select
                  value={newConstraint.constraint_type || 'other'}
                  onValueChange={(value) =>
                    setNewConstraint({ ...newConstraint, constraint_type: value as ConstraintType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONSTRAINT_TYPE_CONFIG).map(([type, config]) => (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          {constraintTypeIcons[type as ConstraintType]}
                          <span>{config.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Describe the constraint..."
                  value={newConstraint.description}
                  onChange={(e) =>
                    setNewConstraint({ ...newConstraint, description: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Expected Resolution Date</Label>
                <Input
                  type="date"
                  value={newConstraint.expected_resolution_date || ''}
                  onChange={(e) =>
                    setNewConstraint({ ...newConstraint, expected_resolution_date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Responsible Party</Label>
                <Input
                  placeholder="Who is responsible for resolving this?"
                  value={newConstraint.responsible_party || ''}
                  onChange={(e) =>
                    setNewConstraint({ ...newConstraint, responsible_party: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddConstraint} disabled={!newConstraint.description}>
                Add Constraint
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Open Constraints */}
      {openConstraints.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-error-dark mb-2 flex items-center gap-1 heading-card">
            <AlertTriangle className="h-4 w-4" />
            Open Constraints ({openConstraints.length})
          </h4>
          {openConstraints.map(renderConstraintCard)}
        </div>
      )}

      {/* Resolved Constraints */}
      {resolvedConstraints.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-success-dark mb-2 flex items-center gap-1 heading-card">
            <CheckCircle className="h-4 w-4" />
            Resolved ({resolvedConstraints.length})
          </h4>
          {resolvedConstraints.map(renderConstraintCard)}
        </div>
      )}

      {/* Empty State */}
      {constraints.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Link2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No constraints</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Constraint
          </Button>
        </div>
      )}

      {/* Resolve Dialog */}
      <Dialog open={!!showResolveDialog} onOpenChange={() => setShowResolveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Constraint</DialogTitle>
            <DialogDescription>Add notes about how this constraint was resolved.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Resolution Notes</Label>
            <Textarea
              placeholder="How was this resolved?"
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolveDialog(null)}>
              Cancel
            </Button>
            <Button onClick={() => showResolveDialog && handleResolve(showResolveDialog)}>
              <CheckCircle className="h-4 w-4 mr-1" />
              Mark Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ConstraintsList
