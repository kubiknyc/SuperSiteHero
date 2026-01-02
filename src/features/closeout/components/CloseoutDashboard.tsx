/**
 * Closeout Progress Dashboard Component
 *
 * Comprehensive dashboard showing overall closeout progress,
 * milestone tracking, outstanding items, and owner sign-offs.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
  useCloseoutMilestones,
  useCompleteMilestone,
  useOwnerSignOffMilestone,
  useInitializeCloseoutMilestones,
  useCloseoutProgressSummary,
} from '../hooks/useCloseoutProgress'
import {
  CLOSEOUT_MILESTONE_TYPES,
  type CloseoutMilestoneWithDetails,
  type CloseoutMilestoneType,
} from '@/types/closeout-extended'
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Flag,
  FileCheck,
  GraduationCap,
  Shield,
  Package,
  Building,
  DollarSign,
  Key,
  Loader2,
  RefreshCw,
  ClipboardCheck,
  ChevronRight,
  AlertCircle,
  TrendingUp,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface CloseoutDashboardProps {
  projectId: string
  className?: string
}

export function CloseoutDashboard({ projectId, className }: CloseoutDashboardProps) {
  const [selectedMilestone, setSelectedMilestone] = React.useState<CloseoutMilestoneWithDetails | null>(null)
  const [showCompleteDialog, setShowCompleteDialog] = React.useState(false)
  const [showSignOffDialog, setShowSignOffDialog] = React.useState(false)
  const [completionNotes, setCompletionNotes] = React.useState('')
  const [signOffNotes, setSignOffNotes] = React.useState('')

  // Queries
  const { data: milestones = [], isLoading: milestonesLoading } = useCloseoutMilestones(projectId)
  const { data: summary, isLoading: summaryLoading } = useCloseoutProgressSummary(projectId)

  // Mutations
  const completeMilestone = useCompleteMilestone()
  const ownerSignOff = useOwnerSignOffMilestone()
  const initializeMilestones = useInitializeCloseoutMilestones()

  const isLoading = milestonesLoading || summaryLoading

  // Handle complete milestone
  const handleCompleteMilestone = async () => {
    if (!selectedMilestone) return

    try {
      await completeMilestone.mutateAsync({
        id: selectedMilestone.id,
        notes: completionNotes.trim() || undefined,
      })
      toast.success('Milestone completed')
      setShowCompleteDialog(false)
      setCompletionNotes('')
      setSelectedMilestone(null)
    } catch {
      toast.error('Failed to complete milestone')
    }
  }

  // Handle owner sign-off
  const handleOwnerSignOff = async () => {
    if (!selectedMilestone) return

    try {
      await ownerSignOff.mutateAsync({
        id: selectedMilestone.id,
        notes: signOffNotes.trim() || undefined,
      })
      toast.success('Owner sign-off recorded')
      setShowSignOffDialog(false)
      setSignOffNotes('')
      setSelectedMilestone(null)
    } catch {
      toast.error('Failed to record sign-off')
    }
  }

  // Handle initialize milestones
  const handleInitializeMilestones = async () => {
    try {
      await initializeMilestones.mutateAsync(projectId)
      toast.success('Default milestones created')
    } catch {
      toast.error('Failed to initialize milestones')
    }
  }

  // Get milestone icon
  const getMilestoneIcon = (type: CloseoutMilestoneType) => {
    const icons: Record<CloseoutMilestoneType, React.ReactNode> = {
      substantial_completion: <Flag className="h-4 w-4" />,
      punch_list_complete: <CheckCircle2 className="h-4 w-4" />,
      training_complete: <GraduationCap className="h-4 w-4" />,
      om_manuals_delivered: <FileCheck className="h-4 w-4" />,
      warranties_collected: <Shield className="h-4 w-4" />,
      attic_stock_delivered: <Package className="h-4 w-4" />,
      final_inspection: <ClipboardCheck className="h-4 w-4" />,
      certificate_of_occupancy: <Building className="h-4 w-4" />,
      final_payment_released: <DollarSign className="h-4 w-4" />,
      project_closed: <Key className="h-4 w-4" />,
    }
    return icons[type] || <Circle className="h-4 w-4" />
  }

  // Get overall status color
  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500'
    if (percentage >= 50) return 'bg-yellow-500'
    if (percentage >= 25) return 'bg-orange-500'
    return 'bg-red-500'
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">Loading closeout progress...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Overall Progress Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Closeout Progress
            </CardTitle>
            {summary?.final_payment_criteria_met && (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Ready for Final Payment
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {summary && (
            <div className="space-y-6">
              {/* Overall Progress */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Overall Completion</span>
                  <span className="text-2xl font-bold">{summary.overall_percentage}%</span>
                </div>
                <Progress
                  value={summary.overall_percentage}
                  className="h-4"
                />
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">
                    {summary.milestones_completed}/{summary.milestones_total}
                  </div>
                  <div className="text-xs text-muted-foreground">Milestones</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">
                    {summary.documents_approved}/{summary.documents_total}
                  </div>
                  <div className="text-xs text-muted-foreground">Documents</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">
                    {summary.punch_list_status.verified}/{summary.punch_list_status.total}
                  </div>
                  <div className="text-xs text-muted-foreground">Punch List</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">
                    {summary.owner_signoffs_complete}/{summary.owner_signoffs_required}
                  </div>
                  <div className="text-xs text-muted-foreground">Owner Sign-offs</div>
                </div>
              </div>

              {/* Status Indicators */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <StatusIndicator
                  label="Training"
                  complete={summary.training_complete}
                />
                <StatusIndicator
                  label="Warranties"
                  complete={summary.warranties_collected}
                />
                <StatusIndicator
                  label="Attic Stock"
                  complete={summary.attic_stock_delivered}
                />
                <StatusIndicator
                  label="Certificate of Occupancy"
                  complete={summary.certificate_of_occupancy}
                />
                <StatusIndicator
                  label="Final Payment Ready"
                  complete={summary.final_payment_criteria_met}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Milestones */}
      {milestones.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Flag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Milestones Set</h3>
            <p className="text-muted-foreground mb-4">
              Initialize default closeout milestones to track project completion.
            </p>
            <Button onClick={handleInitializeMilestones}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Initialize Milestones
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Milestones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {milestones
                .sort((a, b) => {
                  const orderA = CLOSEOUT_MILESTONE_TYPES.find((t) => t.value === a.milestone_type)?.order || 0
                  const orderB = CLOSEOUT_MILESTONE_TYPES.find((t) => t.value === b.milestone_type)?.order || 0
                  return orderA - orderB
                })
                .map((milestone) => (
                  <div
                    key={milestone.id}
                    className={cn(
                      'flex items-center gap-4 p-3 border rounded-lg transition-colors',
                      milestone.is_complete ? 'bg-green-50 border-green-200' : 'hover:bg-muted/50'
                    )}
                  >
                    <div className={cn(
                      'flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center',
                      milestone.is_complete ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
                    )}>
                      {getMilestoneIcon(milestone.milestone_type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'font-medium',
                          milestone.is_complete && 'text-green-700'
                        )}>
                          {milestone.title}
                        </span>
                        {milestone.requires_owner_signoff && (
                          <Badge variant="outline" className="text-xs">
                            Owner Sign-off Required
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {milestone.is_complete ? (
                          <>
                            Completed {milestone.actual_date && format(new Date(milestone.actual_date), 'MMM d, yyyy')}
                            {milestone.completed_by_user && ` by ${milestone.completed_by_user.full_name}`}
                          </>
                        ) : milestone.target_date ? (
                          <>Target: {format(new Date(milestone.target_date), 'MMM d, yyyy')}</>
                        ) : (
                          'No target date set'
                        )}
                      </div>
                      {milestone.requires_owner_signoff && milestone.is_complete && (
                        <div className="text-sm mt-1">
                          {milestone.owner_signed_off ? (
                            <span className="text-green-600 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Signed off by {milestone.owner_sign_off_by_user?.full_name || 'Owner'}
                            </span>
                          ) : (
                            <span className="text-orange-600 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Pending owner sign-off
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!milestone.is_complete && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedMilestone(milestone)
                            setShowCompleteDialog(true)
                          }}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                      )}
                      {milestone.is_complete && milestone.requires_owner_signoff && !milestone.owner_signed_off && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedMilestone(milestone)
                            setShowSignOffDialog(true)
                          }}
                        >
                          <ClipboardCheck className="h-4 w-4 mr-1" />
                          Sign Off
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Outstanding Items */}
      {summary && summary.outstanding_items.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Outstanding Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary.outstanding_items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg text-sm"
                >
                  <AlertCircle className="h-4 w-4 text-orange-600 flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Complete Milestone Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Milestone</DialogTitle>
            <DialogDescription>
              Mark "{selectedMilestone?.title}" as complete.
            </DialogDescription>
          </DialogHeader>

          <div>
            <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
            <Textarea
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              placeholder="Any notes about the completion"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCompleteMilestone} disabled={completeMilestone.isPending}>
              {completeMilestone.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Complete Milestone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Owner Sign-Off Dialog */}
      <Dialog open={showSignOffDialog} onOpenChange={setShowSignOffDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Owner Sign-Off</DialogTitle>
            <DialogDescription>
              Confirm owner sign-off for "{selectedMilestone?.title}".
            </DialogDescription>
          </DialogHeader>

          <div>
            <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
            <Textarea
              value={signOffNotes}
              onChange={(e) => setSignOffNotes(e.target.value)}
              placeholder="Any notes from the owner"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSignOffDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleOwnerSignOff} disabled={ownerSignOff.isPending}>
              {ownerSignOff.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Confirm Sign-Off
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Status Indicator Helper Component
function StatusIndicator({ label, complete }: { label: string; complete: boolean }) {
  return (
    <div className={cn(
      'flex items-center gap-2 p-2 rounded-lg text-sm',
      complete ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'
    )}>
      {complete ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : (
        <Circle className="h-4 w-4" />
      )}
      <span className="truncate">{label}</span>
    </div>
  )
}

export default CloseoutDashboard
