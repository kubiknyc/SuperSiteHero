import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Loader2,
  ArrowLeft,
  Edit,
  Send,
  CheckCircle,
  Shield,
  XCircle,
  Calendar,
  User,
  Building2,
  FileText,
  Clock,
  MessageSquare,
  History,
  QrCode,
} from 'lucide-react'
import {
  useSiteInstruction,
  useIssueSiteInstruction,
  useAcknowledgeSiteInstruction,
  useStartSiteInstruction,
  useCompleteSiteInstruction,
  useVerifySiteInstruction,
  useVoidSiteInstruction,
  useDeleteSiteInstruction,
  useSiteInstructionHistory,
  useSiteInstructionComments,
  useAddSiteInstructionComment,
} from '@/features/site-instructions/hooks'
import {
  SiteInstructionStatusBadge,
  SiteInstructionPriorityBadge,
  AcknowledgmentDialog,
  VerificationDialog,
  CompletionDialog,
  QRCodeGenerator,
  AcknowledgmentsList,
} from '@/features/site-instructions/components'

export default function SiteInstructionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { addToast } = useToast()

  // State for dialogs
  const [showAcknowledge, setShowAcknowledge] = useState(false)
  const [showComplete, setShowComplete] = useState(false)
  const [showVerify, setShowVerify] = useState(false)
  const [showQRCode, setShowQRCode] = useState(false)
  const [newComment, setNewComment] = useState('')

  // Queries
  const { data: instruction, isLoading, error } = useSiteInstruction(id!)
  const { data: history = [] } = useSiteInstructionHistory(id!)
  const { data: comments = [] } = useSiteInstructionComments(id!)

  // Mutations
  const issueMutation = useIssueSiteInstruction()
  const acknowledgeMutation = useAcknowledgeSiteInstruction()
  const startMutation = useStartSiteInstruction()
  const completeMutation = useCompleteSiteInstruction()
  const verifyMutation = useVerifySiteInstruction()
  const voidMutation = useVoidSiteInstruction()
  const deleteMutation = useDeleteSiteInstruction()
  const addCommentMutation = useAddSiteInstructionComment()

  const handleIssue = async () => {
    try {
      await issueMutation.mutateAsync(id!)
      addToast({ title: 'Success', description: 'Site instruction issued successfully', variant: 'success' })
    } catch (_err) {
      addToast({ title: 'Error', description: 'Failed to issue instruction', variant: 'destructive' })
    }
  }

  const handleAcknowledge = async (data: { acknowledgedBy: string; signature?: string; notes?: string }) => {
    try {
      await acknowledgeMutation.mutateAsync({ id: id!, ...data })
      setShowAcknowledge(false)
      addToast({ title: 'Success', description: 'Acknowledgment recorded', variant: 'success' })
    } catch (_err) {
      addToast({ title: 'Error', description: 'Failed to record acknowledgment', variant: 'destructive' })
    }
  }

  const handleStart = async () => {
    try {
      await startMutation.mutateAsync(id!)
      addToast({ title: 'Success', description: 'Work started on instruction', variant: 'success' })
    } catch (_err) {
      addToast({ title: 'Error', description: 'Failed to start instruction', variant: 'destructive' })
    }
  }

  const handleComplete = async (data: { completedBy: string; notes?: string }) => {
    try {
      await completeMutation.mutateAsync({ id: id!, ...data })
      setShowComplete(false)
      addToast({ title: 'Success', description: 'Marked as complete', variant: 'success' })
    } catch (_err) {
      addToast({ title: 'Error', description: 'Failed to mark complete', variant: 'destructive' })
    }
  }

  const handleVerify = async (notes?: string) => {
    try {
      await verifyMutation.mutateAsync({ id: id!, notes })
      setShowVerify(false)
      addToast({ title: 'Success', description: 'Completion verified', variant: 'success' })
    } catch (_err) {
      addToast({ title: 'Error', description: 'Failed to verify completion', variant: 'destructive' })
    }
  }

  const handleVoid = async () => {
    try {
      await voidMutation.mutateAsync(id!)
      addToast({ title: 'Success', description: 'Instruction voided', variant: 'success' })
    } catch (_err) {
      addToast({ title: 'Error', description: 'Failed to void instruction', variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(id!)
      addToast({ title: 'Success', description: 'Instruction deleted', variant: 'success' })
      navigate('/site-instructions')
    } catch (_err) {
      addToast({ title: 'Error', description: 'Failed to delete instruction', variant: 'destructive' })
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) {return}
    try {
      await addCommentMutation.mutateAsync({
        siteInstructionId: id!,
        content: newComment.trim(),
      })
      setNewComment('')
      addToast({ title: 'Success', description: 'Comment added', variant: 'success' })
    } catch (_err) {
      addToast({ title: 'Error', description: 'Failed to add comment', variant: 'destructive' })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !instruction) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-destructive mb-4">Failed to load site instruction</p>
        <Button variant="outline" onClick={() => navigate('/site-instructions')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to List
        </Button>
      </div>
    )
  }

  const referenceNumber = instruction.reference_number || instruction.instruction_number || 'N/A'
  const status = instruction.status || 'draft'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <FileText className="h-4 w-4" />
            <span className="font-mono">{referenceNumber}</span>
          </div>
          <h1 className="text-2xl font-bold heading-page">{instruction.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <SiteInstructionStatusBadge status={status} />
          <SiteInstructionPriorityBadge priority={instruction.priority} />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {status === 'draft' && (
          <>
            <Button asChild variant="outline">
              <Link to={`/site-instructions/${id}/edit`}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
            <Button onClick={handleIssue} disabled={issueMutation.isPending}>
              {issueMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Issue Instruction
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <XCircle className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Site Instruction?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. The instruction will be permanently deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}

        {status === 'issued' && (
          <>
            <Button onClick={() => setShowAcknowledge(true)}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Acknowledge Receipt
            </Button>
            <Button variant="outline" onClick={() => setShowQRCode(true)}>
              <QrCode className="h-4 w-4 mr-2" />
              QR Code
            </Button>
          </>
        )}

        {status === 'acknowledged' && (
          <Button onClick={handleStart} disabled={startMutation.isPending}>
            {startMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Clock className="h-4 w-4 mr-2" />
            )}
            Start Work
          </Button>
        )}

        {status === 'in_progress' && (
          <Button onClick={() => setShowComplete(true)}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark Complete
          </Button>
        )}

        {status === 'completed' && (
          <Button onClick={() => setShowVerify(true)}>
            <Shield className="h-4 w-4 mr-2" />
            Verify Completion
          </Button>
        )}

        {!['verified', 'void'].includes(status) && status !== 'draft' && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">
                <XCircle className="h-4 w-4 mr-2" />
                Void
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Void Site Instruction?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will mark the instruction as void. This action can be undone by an administrator.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleVoid}>Void Instruction</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{instruction.description}</p>
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Comments ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {comments.length > 0 && (
                <div className="space-y-4">
                  {comments.map((comment: any) => (
                    <div key={comment.id} className="border-b pb-4 last:border-0">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <User className="h-3 w-3" />
                        <span>{comment.created_by_user?.full_name || 'Unknown'}</span>
                        <span>•</span>
                        <span>
                          {format(new Date(comment.created_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm">{comment.content}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />
                <Button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || addCommentMutation.isPending}
                  size="sm"
                >
                  {addCommentMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Add Comment
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No history recorded yet.</p>
              ) : (
                <div className="space-y-4">
                  {history.map((entry: any) => (
                    <div key={entry.id} className="flex items-start gap-3">
                      <div className="h-2 w-2 mt-2 rounded-full bg-primary" />
                      <div>
                        <p className="text-sm">
                          <span className="font-medium capitalize">{entry.action}</span>
                          {entry.old_status && entry.new_status && (
                            <span className="text-muted-foreground">
                              {' '}
                              ({entry.old_status} → {entry.new_status})
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entry.performed_by_user?.full_name || 'System'} •{' '}
                          {format(new Date(entry.performed_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Subcontractor</p>
                <div className="flex items-center gap-2 mt-1">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{instruction.subcontractor?.company_name || 'Not assigned'}</span>
                </div>
              </div>

              {instruction.due_date && (
                <div>
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(instruction.due_date), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              )}

              {instruction.issued_by_user && (
                <div>
                  <p className="text-sm text-muted-foreground">Issued By</p>
                  <div className="flex items-center gap-2 mt-1">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{instruction.issued_by_user.full_name}</span>
                  </div>
                  {instruction.issued_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(instruction.issued_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  )}
                </div>
              )}

              <Separator />

              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="text-sm">
                  {format(new Date(instruction.created_at!), 'MMM d, yyyy h:mm a')}
                </p>
                {instruction.created_by_user && (
                  <p className="text-xs text-muted-foreground">
                    by {instruction.created_by_user.full_name}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Acknowledgment Info */}
          {instruction.acknowledged && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-success" />
                  Acknowledged
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">By</p>
                  <p>{instruction.acknowledged_by || 'Unknown'}</p>
                </div>
                {instruction.acknowledged_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p>{format(new Date(instruction.acknowledged_at), 'MMM d, yyyy h:mm a')}</p>
                  </div>
                )}
                {instruction.acknowledgment_notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="text-sm">{instruction.acknowledgment_notes}</p>
                  </div>
                )}
                {instruction.acknowledgment_signature && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Signature</p>
                    <img
                      src={instruction.acknowledgment_signature}
                      alt="Signature"
                      className="border rounded bg-card max-h-20"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Completion Info */}
          {instruction.completed_at && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  Completed
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">By</p>
                  <p>{instruction.completed_by || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p>{format(new Date(instruction.completed_at), 'MMM d, yyyy h:mm a')}</p>
                </div>
                {instruction.completion_notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="text-sm">{instruction.completion_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Verification Info */}
          {instruction.verified_by && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-success" />
                  Verified
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {instruction.verified_by_user && (
                  <div>
                    <p className="text-sm text-muted-foreground">By</p>
                    <p>{instruction.verified_by_user.full_name}</p>
                  </div>
                )}
                {instruction.verification_notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="text-sm">{instruction.verification_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* QR Code Acknowledgments List (Milestone 1.2) */}
          {status !== 'draft' && (
            <AcknowledgmentsList instructionId={id!} />
          )}
        </div>
      </div>

      {/* Dialogs */}
      <AcknowledgmentDialog
        open={showAcknowledge}
        onOpenChange={setShowAcknowledge}
        onAcknowledge={handleAcknowledge}
        isSubmitting={acknowledgeMutation.isPending}
      />

      <CompletionDialog
        open={showComplete}
        onOpenChange={setShowComplete}
        onComplete={handleComplete}
        isSubmitting={completeMutation.isPending}
      />

      <VerificationDialog
        open={showVerify}
        onOpenChange={setShowVerify}
        onVerify={handleVerify}
        isSubmitting={verifyMutation.isPending}
      />

      {/* QR Code Generator Dialog (Milestone 1.2) */}
      <QRCodeGenerator
        instruction={instruction as any}
        open={showQRCode}
        onOpenChange={setShowQRCode}
      />
    </div>
  )
}
