/**
 * Warranty Claims Component
 *
 * Manages warranty claim submission, tracking, and resolution.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  useWarrantyClaims,
  useWarrantyClaim,
  useCreateWarrantyClaim,
  useUpdateWarrantyClaim,
  useSubmitWarrantyClaim,
  useRecordContractorResponse,
  useResolveWarrantyClaim,
  useDenyWarrantyClaim,
  useOwnerSignOffClaim,
  useAddClaimActivity,
  useWarrantyClaimStatistics,
} from '../hooks/useWarrantyClaims'
import { useWarranties } from '../hooks/useCloseout'
import {
  WARRANTY_CLAIM_STATUSES,
  WARRANTY_CLAIM_PRIORITIES,
  type WarrantyClaimWithDetails,
  type WarrantyClaimStatus,
  type WarrantyClaimPriority,
} from '@/types/closeout-extended'
import {
  AlertTriangle,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Phone,
  Mail,
  Loader2,
  Eye,
  Camera,
  FileText,
  Calendar,
  Building,
  User,
  Send,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { format, formatDistanceToNow } from 'date-fns'

interface WarrantyClaimsProps {
  projectId: string
  className?: string
}

export function WarrantyClaims({ projectId, className }: WarrantyClaimsProps) {
  const [showNewClaim, setShowNewClaim] = React.useState(false)
  const [selectedClaimId, setSelectedClaimId] = React.useState<string | null>(null)
  const [showSubmitDialog, setShowSubmitDialog] = React.useState(false)
  const [showResponseDialog, setShowResponseDialog] = React.useState(false)
  const [showResolveDialog, setShowResolveDialog] = React.useState(false)
  const [showDenyDialog, setShowDenyDialog] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState('open')

  // Form state for new claim
  const [claimForm, setClaimForm] = React.useState({
    warranty_id: '',
    title: '',
    description: '',
    issue_date: new Date().toISOString().split('T')[0],
    issue_discovered_by: '',
    issue_location: '',
    priority: 'medium' as WarrantyClaimPriority,
  })

  // Submit dialog state
  const [submitForm, setSubmitForm] = React.useState({
    contact_name: '',
    contact_phone: '',
    contact_email: '',
  })

  // Response dialog state
  const [responseForm, setResponseForm] = React.useState({
    response: '',
    estimated_resolution_date: '',
  })

  // Resolve dialog state
  const [resolveForm, setResolveForm] = React.useState({
    resolution_description: '',
    resolution_satisfactory: true,
  })

  // Deny dialog state
  const [denyReason, setDenyReason] = React.useState('')

  // Activity note state
  const [activityNote, setActivityNote] = React.useState('')

  // Queries
  const { data: claims = [], isLoading } = useWarrantyClaims(projectId)
  const { data: selectedClaim } = useWarrantyClaim(selectedClaimId || undefined)
  const { data: warranties = [] } = useWarranties(projectId)
  const { data: statistics } = useWarrantyClaimStatistics(projectId)

  // Mutations
  const createClaim = useCreateWarrantyClaim()
  const submitClaim = useSubmitWarrantyClaim()
  const recordResponse = useRecordContractorResponse()
  const resolveClaim = useResolveWarrantyClaim()
  const denyClaim = useDenyWarrantyClaim()
  const ownerSignOff = useOwnerSignOffClaim()
  const addActivity = useAddClaimActivity()

  // Filter claims by status
  const openClaims = claims.filter((c) => c.status === 'open' || c.status === 'submitted')
  const inProgressClaims = claims.filter((c) =>
    ['in_progress', 'pending_parts', 'scheduled'].includes(c.status)
  )
  const resolvedClaims = claims.filter((c) => c.status === 'resolved' || c.status === 'closed')
  const deniedClaims = claims.filter((c) => c.status === 'denied')

  // Reset forms
  const resetClaimForm = () => {
    setClaimForm({
      warranty_id: '',
      title: '',
      description: '',
      issue_date: new Date().toISOString().split('T')[0],
      issue_discovered_by: '',
      issue_location: '',
      priority: 'medium',
    })
    setShowNewClaim(false)
  }

  // Handle create claim
  const handleCreateClaim = async () => {
    if (!claimForm.warranty_id || !claimForm.title.trim() || !claimForm.description.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      await createClaim.mutateAsync({
        project_id: projectId,
        warranty_id: claimForm.warranty_id,
        title: claimForm.title.trim(),
        description: claimForm.description.trim(),
        issue_date: claimForm.issue_date,
        issue_discovered_by: claimForm.issue_discovered_by.trim() || undefined,
        issue_location: claimForm.issue_location.trim() || undefined,
        priority: claimForm.priority,
      })
      toast.success('Warranty claim created')
      resetClaimForm()
    } catch {
      toast.error('Failed to create claim')
    }
  }

  // Handle submit to contractor
  const handleSubmitClaim = async () => {
    if (!selectedClaimId) return

    try {
      await submitClaim.mutateAsync({
        id: selectedClaimId,
        contactName: submitForm.contact_name.trim() || undefined,
        contactPhone: submitForm.contact_phone.trim() || undefined,
        contactEmail: submitForm.contact_email.trim() || undefined,
      })
      toast.success('Claim submitted to contractor')
      setShowSubmitDialog(false)
      setSubmitForm({ contact_name: '', contact_phone: '', contact_email: '' })
    } catch {
      toast.error('Failed to submit claim')
    }
  }

  // Handle record response
  const handleRecordResponse = async () => {
    if (!selectedClaimId || !responseForm.response.trim()) {
      toast.error('Please enter the contractor response')
      return
    }

    try {
      await recordResponse.mutateAsync({
        id: selectedClaimId,
        response: responseForm.response.trim(),
        estimatedResolutionDate: responseForm.estimated_resolution_date || undefined,
      })
      toast.success('Contractor response recorded')
      setShowResponseDialog(false)
      setResponseForm({ response: '', estimated_resolution_date: '' })
    } catch {
      toast.error('Failed to record response')
    }
  }

  // Handle resolve
  const handleResolveClaim = async () => {
    if (!selectedClaimId || !resolveForm.resolution_description.trim()) {
      toast.error('Please describe the resolution')
      return
    }

    try {
      await resolveClaim.mutateAsync({
        id: selectedClaimId,
        resolutionDescription: resolveForm.resolution_description.trim(),
        resolutionSatisfactory: resolveForm.resolution_satisfactory,
      })
      toast.success('Claim resolved')
      setShowResolveDialog(false)
      setResolveForm({ resolution_description: '', resolution_satisfactory: true })
    } catch {
      toast.error('Failed to resolve claim')
    }
  }

  // Handle deny
  const handleDenyClaim = async () => {
    if (!selectedClaimId || !denyReason.trim()) {
      toast.error('Please provide a denial reason')
      return
    }

    try {
      await denyClaim.mutateAsync({
        id: selectedClaimId,
        denialReason: denyReason.trim(),
      })
      toast.success('Claim denied')
      setShowDenyDialog(false)
      setDenyReason('')
    } catch {
      toast.error('Failed to deny claim')
    }
  }

  // Handle owner sign-off
  const handleOwnerSignOff = async () => {
    if (!selectedClaimId) return

    try {
      await ownerSignOff.mutateAsync(selectedClaimId)
      toast.success('Claim closed with owner sign-off')
    } catch {
      toast.error('Failed to sign off')
    }
  }

  // Handle add note
  const handleAddNote = async () => {
    if (!selectedClaimId || !activityNote.trim()) {
      toast.error('Please enter a note')
      return
    }

    try {
      await addActivity.mutateAsync({
        claimId: selectedClaimId,
        activityType: 'note_added',
        description: activityNote.trim(),
      })
      toast.success('Note added')
      setActivityNote('')
    } catch {
      toast.error('Failed to add note')
    }
  }

  // Get status badge
  const getStatusBadge = (status: WarrantyClaimStatus) => {
    const config = WARRANTY_CLAIM_STATUSES.find((s) => s.value === status)
    const colorClasses: Record<string, string> = {
      gray: 'bg-gray-100 text-gray-800',
      blue: 'bg-blue-100 text-blue-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      orange: 'bg-orange-100 text-orange-800',
      purple: 'bg-purple-100 text-purple-800',
      green: 'bg-green-100 text-green-800',
      red: 'bg-red-100 text-red-800',
      slate: 'bg-slate-100 text-slate-800',
    }
    return (
      <Badge className={colorClasses[config?.color || 'gray']}>
        {config?.label || status}
      </Badge>
    )
  }

  // Get priority badge
  const getPriorityBadge = (priority: WarrantyClaimPriority) => {
    const config = WARRANTY_CLAIM_PRIORITIES.find((p) => p.value === priority)
    const colorClasses: Record<string, string> = {
      slate: 'bg-slate-100 text-slate-800',
      blue: 'bg-blue-100 text-blue-800',
      orange: 'bg-orange-100 text-orange-800',
      red: 'bg-red-100 text-red-800',
    }
    return (
      <Badge variant="outline" className={colorClasses[config?.color || 'blue']}>
        {config?.label || priority}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">Loading warranty claims...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Statistics */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Warranty Claims
            </CardTitle>
            <Button size="sm" onClick={() => setShowNewClaim(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Claim
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Statistics */}
          {statistics && (
            <div className="grid grid-cols-5 gap-3">
              <div className="text-center p-2 bg-muted rounded-lg">
                <div className="text-xl font-bold">{statistics.total_claims}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="text-center p-2 bg-blue-50 rounded-lg">
                <div className="text-xl font-bold text-blue-700">{statistics.open_claims}</div>
                <div className="text-xs text-muted-foreground">Open</div>
              </div>
              <div className="text-center p-2 bg-yellow-50 rounded-lg">
                <div className="text-xl font-bold text-yellow-700">{statistics.in_progress_claims}</div>
                <div className="text-xs text-muted-foreground">In Progress</div>
              </div>
              <div className="text-center p-2 bg-green-50 rounded-lg">
                <div className="text-xl font-bold text-green-700">{statistics.resolved_claims}</div>
                <div className="text-xs text-muted-foreground">Resolved</div>
              </div>
              <div className="text-center p-2 bg-red-50 rounded-lg">
                <div className="text-xl font-bold text-red-700">{statistics.denied_claims}</div>
                <div className="text-xs text-muted-foreground">Denied</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Claims List */}
      {claims.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Warranty Claims</h3>
            <p className="text-muted-foreground mb-4">
              Submit a claim when you discover an issue covered by warranty.
            </p>
            <Button onClick={() => setShowNewClaim(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Submit First Claim
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="open">
                  Open ({openClaims.length})
                </TabsTrigger>
                <TabsTrigger value="in_progress">
                  In Progress ({inProgressClaims.length})
                </TabsTrigger>
                <TabsTrigger value="resolved">
                  Resolved ({resolvedClaims.length})
                </TabsTrigger>
                {deniedClaims.length > 0 && (
                  <TabsTrigger value="denied">
                    Denied ({deniedClaims.length})
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="open">
                <ClaimsList
                  claims={openClaims}
                  onSelect={setSelectedClaimId}
                  getStatusBadge={getStatusBadge}
                  getPriorityBadge={getPriorityBadge}
                />
              </TabsContent>

              <TabsContent value="in_progress">
                <ClaimsList
                  claims={inProgressClaims}
                  onSelect={setSelectedClaimId}
                  getStatusBadge={getStatusBadge}
                  getPriorityBadge={getPriorityBadge}
                />
              </TabsContent>

              <TabsContent value="resolved">
                <ClaimsList
                  claims={resolvedClaims}
                  onSelect={setSelectedClaimId}
                  getStatusBadge={getStatusBadge}
                  getPriorityBadge={getPriorityBadge}
                />
              </TabsContent>

              <TabsContent value="denied">
                <ClaimsList
                  claims={deniedClaims}
                  onSelect={setSelectedClaimId}
                  getStatusBadge={getStatusBadge}
                  getPriorityBadge={getPriorityBadge}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* New Claim Dialog */}
      <Dialog open={showNewClaim} onOpenChange={setShowNewClaim}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit Warranty Claim</DialogTitle>
            <DialogDescription>
              Report an issue covered by warranty.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Warranty *</label>
              <Select
                value={claimForm.warranty_id || 'none'}
                onValueChange={(v) => setClaimForm({ ...claimForm, warranty_id: v === 'none' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select warranty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select a warranty</SelectItem>
                  {warranties.filter((w) => w.status === 'active').map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Issue Title *</label>
              <Input
                value={claimForm.title}
                onChange={(e) => setClaimForm({ ...claimForm, title: e.target.value })}
                placeholder="Brief description of the issue"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description *</label>
              <Textarea
                value={claimForm.description}
                onChange={(e) => setClaimForm({ ...claimForm, description: e.target.value })}
                placeholder="Detailed description of the problem"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Issue Date</label>
                <Input
                  type="date"
                  value={claimForm.issue_date}
                  onChange={(e) => setClaimForm({ ...claimForm, issue_date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Priority</label>
                <Select
                  value={claimForm.priority}
                  onValueChange={(v) => setClaimForm({ ...claimForm, priority: v as WarrantyClaimPriority })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WARRANTY_CLAIM_PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Discovered By</label>
                <Input
                  value={claimForm.issue_discovered_by}
                  onChange={(e) => setClaimForm({ ...claimForm, issue_discovered_by: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Location</label>
                <Input
                  value={claimForm.issue_location}
                  onChange={(e) => setClaimForm({ ...claimForm, issue_location: e.target.value })}
                  placeholder="e.g., Room 201"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetClaimForm}>
              Cancel
            </Button>
            <Button onClick={handleCreateClaim} disabled={createClaim.isPending}>
              {createClaim.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Claim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Claim Details Dialog */}
      <Dialog open={!!selectedClaimId} onOpenChange={() => setSelectedClaimId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedClaim && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedClaim.claim_number && (
                    <span className="text-muted-foreground">{selectedClaim.claim_number}</span>
                  )}
                  {selectedClaim.title}
                </DialogTitle>
                <DialogDescription>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(selectedClaim.status)}
                    {getPriorityBadge(selectedClaim.priority)}
                  </div>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Warranty Info */}
                {selectedClaim.warranty && (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm font-medium">Warranty: {selectedClaim.warranty.title}</div>
                    <div className="text-xs text-muted-foreground">
                      Expires: {format(new Date(selectedClaim.warranty.end_date), 'MMM d, yyyy')}
                    </div>
                  </div>
                )}

                {/* Issue Details */}
                <div>
                  <h4 className="font-medium mb-2">Issue Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedClaim.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Issue Date: {format(new Date(selectedClaim.issue_date), 'MMM d, yyyy')}
                  </div>
                  {selectedClaim.issue_location && (
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      {selectedClaim.issue_location}
                    </div>
                  )}
                  {selectedClaim.issue_discovered_by && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      Discovered by: {selectedClaim.issue_discovered_by}
                    </div>
                  )}
                </div>

                {/* Contractor Response */}
                {selectedClaim.contractor_response && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Contractor Response</h4>
                    <p className="text-sm text-muted-foreground">{selectedClaim.contractor_response}</p>
                    {selectedClaim.estimated_resolution_date && (
                      <p className="text-sm mt-2">
                        Estimated resolution: {format(new Date(selectedClaim.estimated_resolution_date), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                )}

                {/* Resolution */}
                {selectedClaim.resolution_description && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      Resolution
                      {selectedClaim.resolution_satisfactory ? (
                        <ThumbsUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <ThumbsDown className="h-4 w-4 text-red-600" />
                      )}
                    </h4>
                    <p className="text-sm text-muted-foreground">{selectedClaim.resolution_description}</p>
                    {selectedClaim.resolution_date && (
                      <p className="text-sm mt-2">
                        Resolved: {format(new Date(selectedClaim.resolution_date), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                )}

                {/* Denial */}
                {selectedClaim.denial_reason && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2 text-red-700">Denial Reason</h4>
                    <p className="text-sm text-muted-foreground">{selectedClaim.denial_reason}</p>
                  </div>
                )}

                {/* Activity Log */}
                {selectedClaim.activities && selectedClaim.activities.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Activity Log</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedClaim.activities.map((activity) => (
                        <div key={activity.id} className="text-sm p-2 bg-muted rounded">
                          <div className="flex justify-between">
                            <span className="font-medium">{activity.created_by_name || 'System'}</span>
                            <span className="text-muted-foreground">
                              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          {activity.description && (
                            <p className="text-muted-foreground mt-1">{activity.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Note */}
                {selectedClaim.status !== 'closed' && selectedClaim.status !== 'denied' && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Add Note</h4>
                    <div className="flex gap-2">
                      <Input
                        value={activityNote}
                        onChange={(e) => setActivityNote(e.target.value)}
                        placeholder="Add a note..."
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        onClick={handleAddNote}
                        disabled={addActivity.isPending}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="flex-wrap gap-2">
                {/* Status Actions */}
                {selectedClaim.status === 'open' && (
                  <Button
                    variant="outline"
                    onClick={() => setShowSubmitDialog(true)}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Submit to Contractor
                  </Button>
                )}

                {selectedClaim.status === 'submitted' && (
                  <Button
                    variant="outline"
                    onClick={() => setShowResponseDialog(true)}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Record Response
                  </Button>
                )}

                {['in_progress', 'pending_parts', 'scheduled'].includes(selectedClaim.status) && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setShowResolveDialog(true)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Resolve
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowDenyDialog(true)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Mark Denied
                    </Button>
                  </>
                )}

                {selectedClaim.status === 'resolved' && !selectedClaim.owner_signed_off && (
                  <Button onClick={handleOwnerSignOff}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Owner Sign-Off
                  </Button>
                )}

                <Button variant="outline" onClick={() => setSelectedClaimId(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Submit to Contractor Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit to Contractor</DialogTitle>
            <DialogDescription>
              Enter contractor contact information for this claim.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Contact Name</label>
              <Input
                value={submitForm.contact_name}
                onChange={(e) => setSubmitForm({ ...submitForm, contact_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <Input
                  value={submitForm.contact_phone}
                  onChange={(e) => setSubmitForm({ ...submitForm, contact_phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input
                  type="email"
                  value={submitForm.contact_email}
                  onChange={(e) => setSubmitForm({ ...submitForm, contact_email: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitClaim} disabled={submitClaim.isPending}>
              {submitClaim.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Response Dialog */}
      <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Contractor Response</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Response *</label>
              <Textarea
                value={responseForm.response}
                onChange={(e) => setResponseForm({ ...responseForm, response: e.target.value })}
                placeholder="Contractor's response to the claim"
                rows={4}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Estimated Resolution Date</label>
              <Input
                type="date"
                value={responseForm.estimated_resolution_date}
                onChange={(e) => setResponseForm({ ...responseForm, estimated_resolution_date: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResponseDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordResponse} disabled={recordResponse.isPending}>
              {recordResponse.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Record Response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Claim</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Resolution Description *</label>
              <Textarea
                value={resolveForm.resolution_description}
                onChange={(e) => setResolveForm({ ...resolveForm, resolution_description: e.target.value })}
                placeholder="Describe how the issue was resolved"
                rows={4}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Was the resolution satisfactory?</label>
              <div className="flex gap-4">
                <Button
                  variant={resolveForm.resolution_satisfactory ? 'default' : 'outline'}
                  onClick={() => setResolveForm({ ...resolveForm, resolution_satisfactory: true })}
                >
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  Yes
                </Button>
                <Button
                  variant={!resolveForm.resolution_satisfactory ? 'default' : 'outline'}
                  onClick={() => setResolveForm({ ...resolveForm, resolution_satisfactory: false })}
                >
                  <ThumbsDown className="h-4 w-4 mr-2" />
                  No
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleResolveClaim} disabled={resolveClaim.isPending}>
              {resolveClaim.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Resolve Claim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deny Dialog */}
      <Dialog open={showDenyDialog} onOpenChange={setShowDenyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deny Claim</DialogTitle>
          </DialogHeader>

          <div>
            <label className="block text-sm font-medium mb-1">Denial Reason *</label>
            <Textarea
              value={denyReason}
              onChange={(e) => setDenyReason(e.target.value)}
              placeholder="Reason for denial"
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDenyDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDenyClaim} disabled={denyClaim.isPending}>
              {denyClaim.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Deny Claim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Claims List Helper Component
function ClaimsList({
  claims,
  onSelect,
  getStatusBadge,
  getPriorityBadge,
}: {
  claims: WarrantyClaimWithDetails[]
  onSelect: (id: string) => void
  getStatusBadge: (status: WarrantyClaimStatus) => React.ReactNode
  getPriorityBadge: (priority: WarrantyClaimPriority) => React.ReactNode
}) {
  if (claims.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No claims in this category
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {claims.map((claim) => (
        <div
          key={claim.id}
          className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
          onClick={() => onSelect(claim.id)}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {claim.claim_number && (
                  <span className="text-sm text-muted-foreground">{claim.claim_number}</span>
                )}
                <span className="font-medium">{claim.title}</span>
                {getStatusBadge(claim.status)}
                {getPriorityBadge(claim.priority)}
              </div>

              {claim.warranty && (
                <div className="text-sm text-muted-foreground mb-1">
                  Warranty: {claim.warranty.title}
                </div>
              )}

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(claim.issue_date), 'MMM d, yyyy')}
                </span>
                {claim.issue_location && (
                  <span className="flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    {claim.issue_location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(claim.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>

            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default WarrantyClaims
