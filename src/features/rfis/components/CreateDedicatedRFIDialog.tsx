// @ts-nocheck
// File: /src/features/rfis/components/CreateDedicatedRFIDialog.tsx
// Dialog for creating a new RFI using the dedicated rfis table with ball-in-court tracking

import { useState, useEffect, useMemo } from 'react'
import { addDays, format } from 'date-fns'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import {
  Loader2,
  Calendar,
  AlertTriangle,
  DollarSign,
  Clock,
  FileText,
  Users,
  Search,
  X,
  Check,
  UserPlus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useCreateRFI,
  RFI_PRIORITIES,
  BALL_IN_COURT_ROLES,
} from '../hooks/useDedicatedRFIs'
import { RFIRoutingSuggestions } from './RFIRoutingSuggestions'
import { useProjectUsers } from '@/features/messaging/hooks/useProjectUsers'
import { useAuth } from '@/lib/auth/AuthContext'
import type { RFIPriority, BallInCourtRole } from '@/types/database-extensions'
import { logger } from '../../../lib/utils/logger';


// User interface for distribution list
interface DistributionUser {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  avatar_url: string | null
  company?: { name: string } | null
}

// Compute full name from first and last name
function getFullName(user: DistributionUser): string {
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`
  }
  return user.first_name || user.last_name || ''
}

interface CreateDedicatedRFIDialogProps {
  projectId: string | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

// Common disciplines in construction
const DISCIPLINES = [
  'Architectural',
  'Structural',
  'Mechanical',
  'Electrical',
  'Plumbing',
  'Civil',
  'Landscape',
  'Interior Design',
  'Fire Protection',
  'General',
  'Other',
]

export function CreateDedicatedRFIDialog({
  projectId,
  open,
  onOpenChange,
  onSuccess,
}: CreateDedicatedRFIDialogProps) {
  const { userProfile } = useAuth()

  // Form state
  const [subject, setSubject] = useState('')
  const [question, setQuestion] = useState('')
  const [drawingReference, setDrawingReference] = useState('')
  const [specSection, setSpecSection] = useState('')
  const [priority, setPriority] = useState<RFIPriority>('normal')
  const [discipline, setDiscipline] = useState('')
  const [dateRequired, setDateRequired] = useState('')
  const [ballInCourtRole, setBallInCourtRole] = useState<BallInCourtRole | ''>('')
  const [costImpact, setCostImpact] = useState<string>('')
  const [scheduleImpactDays, setScheduleImpactDays] = useState<string>('')

  // Distribution list state
  const [distributionList, setDistributionList] = useState<DistributionUser[]>([])
  const [showDistributionPicker, setShowDistributionPicker] = useState(false)
  const [distributionFilter, setDistributionFilter] = useState('')

  const createRFI = useCreateRFI()

  // Memoize today's date to avoid calling format(new Date()) during render
  const minDate = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])

  // Fetch project users for distribution list
  const { data: projectUsers = [], isLoading: isLoadingUsers } = useProjectUsers(projectId)

  // Filter out current user and apply search filter
  const availableUsers = useMemo(() => {
    return projectUsers.filter(pu => pu.user?.id !== userProfile?.id)
  }, [projectUsers, userProfile?.id])

  const filteredDistributionUsers = useMemo(() => {
    if (!distributionFilter.trim()) {return availableUsers}
    const search = distributionFilter.toLowerCase()
    return availableUsers.filter((pu) => {
      const user = pu.user
      if (!user) {return false}
      const name = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase()
      return name.includes(search) || user.email.toLowerCase().includes(search)
    })
  }, [availableUsers, distributionFilter])

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        // Set default due date to 7 days from now (common contract requirement)
        const defaultDueDate = addDays(new Date(), 7)
        setDateRequired(format(defaultDueDate, 'yyyy-MM-dd'))
        // Default ball-in-court to Architect
        setBallInCourtRole('architect')
      }, 0)
    }
  }, [open])

  const resetForm = () => {
    setSubject('')
    setQuestion('')
    setDrawingReference('')
    setSpecSection('')
    setPriority('normal')
    setDiscipline('')
    setDateRequired('')
    setBallInCourtRole('')
    setCostImpact('')
    setScheduleImpactDays('')
    setDistributionList([])
    setShowDistributionPicker(false)
    setDistributionFilter('')
  }

  // Toggle user in distribution list
  const toggleDistributionUser = (user: DistributionUser) => {
    setDistributionList((prev) => {
      const isSelected = prev.some((u) => u.id === user.id)
      if (isSelected) {
        return prev.filter((u) => u.id !== user.id)
      }
      return [...prev, user]
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!subject.trim() || !question.trim() || !projectId) {
      return
    }

    try {
      await createRFI.mutateAsync({
        project_id: projectId,
        subject: subject.trim(),
        question: question.trim(),
        drawing_reference: drawingReference.trim() || null,
        spec_section: specSection.trim() || null,
        priority,
        discipline: discipline || null,
        date_required: dateRequired || null,
        ball_in_court_role: ballInCourtRole || null,
        cost_impact: costImpact ? parseFloat(costImpact) : null,
        schedule_impact_days: scheduleImpactDays ? parseInt(scheduleImpactDays, 10) : null,
        status: 'draft',
        distribution_list: distributionList.map(u => u.id),
      })

      resetForm()
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      logger.error('Failed to create RFI:', error)
    }
  }

  const handleClose = () => {
    if (!createRFI.isPending) {
      resetForm()
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create RFI (Request for Information)</DialogTitle>
          <DialogDescription>
            Submit a request for clarification from the design team or owner
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject" className="flex items-center gap-1">
              Subject <span className="text-error">*</span>
            </Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief, descriptive subject for the RFI"
              required
              disabled={createRFI.isPending}
              maxLength={255}
            />
            <p className="text-xs text-muted">
              Be specific: "Foundation detail at grid B-5" vs "Foundation question"
            </p>
          </div>

          {/* Priority and Discipline Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as RFIPriority)}
                disabled={createRFI.isPending}
              >
                {RFI_PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </div>

            {/* Discipline */}
            <div className="space-y-2">
              <Label htmlFor="discipline">Discipline</Label>
              <Select
                id="discipline"
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value)}
                disabled={createRFI.isPending}
              >
                <option value="">Select discipline...</option>
                {DISCIPLINES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Drawing Reference and Spec Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="drawing-reference" className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-500" />
                Drawing Reference
              </Label>
              <Input
                id="drawing-reference"
                value={drawingReference}
                onChange={(e) => setDrawingReference(e.target.value)}
                placeholder="e.g., A-101, S-201, M-301"
                disabled={createRFI.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="spec-section" className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-500" />
                Spec Section
              </Label>
              <Input
                id="spec-section"
                value={specSection}
                onChange={(e) => setSpecSection(e.target.value)}
                placeholder="e.g., 03 30 00"
                disabled={createRFI.isPending}
              />
              <p className="text-xs text-muted">CSI MasterFormat section</p>
            </div>
          </div>

          {/* Date Required and Ball-in-Court */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date-required" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Response Required By
              </Label>
              <Input
                id="date-required"
                type="date"
                value={dateRequired}
                onChange={(e) => setDateRequired(e.target.value)}
                disabled={createRFI.isPending}
                min={minDate}
              />
              <p className="text-xs text-muted">
                Default is 7 days. Check your contract for required response times.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ball-in-court" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Ball-in-Court
              </Label>
              <Select
                id="ball-in-court"
                value={ballInCourtRole}
                onChange={(e) => setBallInCourtRole(e.target.value as BallInCourtRole)}
                disabled={createRFI.isPending}
              >
                <option value="">Select responsible party...</option>
                {BALL_IN_COURT_ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label} - {role.description}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted">Who is responsible for responding?</p>
            </div>
          </div>

          {/* Distribution List */}
          <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-800">
                <UserPlus className="h-4 w-4" />
                <span className="font-medium text-sm">Distribution List</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDistributionPicker(!showDistributionPicker)}
                disabled={createRFI.isPending}
                className="text-xs"
              >
                {showDistributionPicker ? 'Hide' : 'Add Recipients'}
              </Button>
            </div>
            <p className="text-xs text-primary-hover">
              Add team members who should receive copies of this RFI and its responses.
            </p>

            {/* Selected users display */}
            {distributionList.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {distributionList.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-1 bg-card border border-blue-200 rounded-full pl-1 pr-2 py-1"
                  >
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt=""
                        className="h-5 w-5 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-5 w-5 rounded-full bg-info-light flex items-center justify-center text-[10px] text-primary">
                        {getFullName(user).charAt(0) || '?'}
                      </div>
                    )}
                    <span className="text-sm text-blue-900">{getFullName(user) || user.email}</span>
                    <button
                      type="button"
                      onClick={() => toggleDistributionUser(user)}
                      className="text-blue-400 hover:text-primary ml-1"
                      disabled={createRFI.isPending}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* User picker */}
            {showDistributionPicker && (
              <div className="mt-2 space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search project members..."
                    value={distributionFilter}
                    onChange={(e) => setDistributionFilter(e.target.value)}
                    className="pl-9 bg-card"
                    disabled={createRFI.isPending}
                  />
                </div>

                <div className="max-h-[200px] overflow-auto bg-card border rounded-lg">
                  {isLoadingUsers ? (
                    <div className="py-4 text-center text-muted-foreground text-sm">
                      Loading project members...
                    </div>
                  ) : filteredDistributionUsers.length === 0 ? (
                    <div className="py-4 text-center text-muted-foreground text-sm">
                      {distributionFilter ? 'No matching members found' : 'No members in this project'}
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredDistributionUsers.map((projectUser) => {
                        const user = projectUser.user
                        if (!user) {return null}
                        const isSelected = distributionList.some((u) => u.id === user.id)
                        return (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => toggleDistributionUser(user as DistributionUser)}
                            disabled={createRFI.isPending}
                            className={cn(
                              'w-full flex items-center gap-3 p-2 text-left hover:bg-muted/50',
                              isSelected && 'bg-blue-50'
                            )}
                          >
                            {user.avatar_url ? (
                              <img
                                src={user.avatar_url}
                                alt=""
                                className="h-7 w-7 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs">
                                {getFullName(user as DistributionUser).charAt(0) || '?'}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {getFullName(user as DistributionUser) || 'Unknown User'}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {user.company?.name || user.email}
                              </p>
                            </div>
                            {projectUser.project_role && (
                              <span className="text-xs text-muted-foreground capitalize px-2 py-0.5 bg-muted rounded">
                                {projectUser.project_role.replace('_', ' ')}
                              </span>
                            )}
                            {isSelected && (
                              <Check className="h-4 w-4 text-primary flex-shrink-0" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Question */}
          <div className="space-y-2">
            <Label htmlFor="question" className="flex items-center gap-1">
              Question <span className="text-error">*</span>
            </Label>
            <Textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Detailed description of what information is being requested. Include:&#10;- Specific location (grid lines, rooms, elevations)&#10;- What clarification is needed&#10;- Any proposed solution for consideration"
              rows={5}
              required
              disabled={createRFI.isPending}
            />
          </div>

          {/* AI Routing Suggestions */}
          {(subject.trim() || question.trim()) && (
            <RFIRoutingSuggestions
              projectId={projectId}
              subject={subject}
              question={question}
              specSection={specSection}
              onRoleSelect={(role) => setBallInCourtRole(role)}
            />
          )}

          {/* Impact Assessment */}
          <div className="space-y-4 p-4 bg-warning-light border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium text-sm">Impact Assessment</span>
            </div>
            <p className="text-xs text-amber-700">
              Flag if this RFI may affect project cost or schedule. This helps prioritize responses.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cost-impact" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-success" />
                  Estimated Cost Impact
                </Label>
                <Input
                  id="cost-impact"
                  type="number"
                  min="0"
                  step="100"
                  value={costImpact}
                  onChange={(e) => setCostImpact(e.target.value)}
                  placeholder="0.00"
                  disabled={createRFI.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="schedule-impact" className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  Schedule Impact (Days)
                </Label>
                <Input
                  id="schedule-impact"
                  type="number"
                  min="0"
                  value={scheduleImpactDays}
                  onChange={(e) => setScheduleImpactDays(e.target.value)}
                  placeholder="0"
                  disabled={createRFI.isPending}
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createRFI.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!subject.trim() || !question.trim() || createRFI.isPending}
            >
              {createRFI.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {createRFI.isPending ? 'Creating...' : 'Create RFI'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default CreateDedicatedRFIDialog
