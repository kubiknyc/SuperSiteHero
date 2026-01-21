/**
 * MobileWorkflowToolbar Component
 *
 * A mobile-friendly floating action toolbar for workflow items (RFIs, Submittals, Change Orders).
 * Provides quick access to common actions:
 * - Add Comment/Respond
 * - Attach Files
 * - Review/Approve (with A/B/C/D codes for submittals)
 * - Share/Discuss
 * - Download PDF
 */

import { useState, useCallback, memo } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  MessageSquare,
  Paperclip,
  CheckCircle2,
  Share2,
  Download,
  MoreHorizontal,
  Send,
  X,
  Loader2,
  CheckCheck,
  AlertCircle,
  Edit3,
  RefreshCw,
} from 'lucide-react'

export type WorkflowEntityType = 'rfi' | 'submittal' | 'change_order'

export interface ApprovalCodeOption {
  code: 'A' | 'B' | 'C' | 'D'
  label: string
  description: string
  color: string
  bgColor: string
}

const APPROVAL_CODES: ApprovalCodeOption[] = [
  {
    code: 'A',
    label: 'Approved',
    description: 'No exceptions taken',
    color: 'text-success-dark dark:text-success',
    bgColor: 'bg-success-light dark:bg-success/20 hover:bg-success/30',
  },
  {
    code: 'B',
    label: 'Approved as Noted',
    description: 'Approved with minor changes',
    color: 'text-success-dark dark:text-success',
    bgColor: 'bg-success-light dark:bg-success/20 hover:bg-success/30',
  },
  {
    code: 'C',
    label: 'Revise & Resubmit',
    description: 'Corrections required',
    color: 'text-warning-dark dark:text-warning',
    bgColor: 'bg-warning-light dark:bg-warning/20 hover:bg-warning/30',
  },
  {
    code: 'D',
    label: 'Rejected',
    description: 'Not approved',
    color: 'text-error-dark dark:text-error',
    bgColor: 'bg-error-light dark:bg-error/20 hover:bg-error/30',
  },
]

export interface MobileWorkflowToolbarProps {
  entityType: WorkflowEntityType
  entityNumber: string
  entityTitle: string
  currentStatus: string
  canReview?: boolean
  canComment?: boolean
  canAttach?: boolean
  canShare?: boolean
  canDownload?: boolean
  onComment?: (comment: string) => Promise<void>
  onAttach?: () => void
  onReview?: (status: string, comments?: string) => Promise<void>
  onApprovalCode?: (code: 'A' | 'B' | 'C' | 'D', comments?: string) => Promise<void>
  onShare?: () => void
  onDownload?: () => void
  onDiscuss?: () => void
  isProcessing?: boolean
  className?: string
}

export const MobileWorkflowToolbar = memo(function MobileWorkflowToolbar({
  entityType,
  entityNumber,
  entityTitle,
  currentStatus,
  canReview = true,
  canComment = true,
  canAttach = true,
  canShare = true,
  canDownload = true,
  onComment,
  onAttach,
  onReview,
  onApprovalCode,
  onShare,
  onDownload,
  onDiscuss,
  isProcessing = false,
  className,
}: MobileWorkflowToolbarProps) {
  const [showCommentSheet, setShowCommentSheet] = useState(false)
  const [showReviewSheet, setShowReviewSheet] = useState(false)
  const [comment, setComment] = useState('')
  const [reviewComment, setReviewComment] = useState('')
  const [isSending, setIsSending] = useState(false)

  const handleSendComment = useCallback(async () => {
    if (!comment.trim() || !onComment) {return}

    setIsSending(true)
    try {
      await onComment(comment.trim())
      setComment('')
      setShowCommentSheet(false)
    } finally {
      setIsSending(false)
    }
  }, [comment, onComment])

  const handleApprovalCode = useCallback(async (code: 'A' | 'B' | 'C' | 'D') => {
    if (!onApprovalCode) {return}

    setIsSending(true)
    try {
      await onApprovalCode(code, reviewComment.trim() || undefined)
      setReviewComment('')
      setShowReviewSheet(false)
    } finally {
      setIsSending(false)
    }
  }, [onApprovalCode, reviewComment])

  const getEntityLabel = () => {
    switch (entityType) {
      case 'rfi':
        return 'RFI'
      case 'submittal':
        return 'Submittal'
      case 'change_order':
        return 'Change Order'
      default:
        return 'Item'
    }
  }

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase()
    if (statusLower.includes('approved') || statusLower === 'closed') {
      return 'bg-success-light dark:bg-success/20 text-success-dark dark:text-success'
    }
    if (statusLower.includes('reject') || statusLower.includes('void')) {
      return 'bg-error-light dark:bg-error/20 text-error-dark dark:text-error'
    }
    if (statusLower.includes('revise') || statusLower.includes('pending')) {
      return 'bg-warning-light dark:bg-warning/20 text-warning-dark dark:text-warning'
    }
    if (statusLower.includes('review') || statusLower.includes('submitted')) {
      return 'bg-info-light dark:bg-info/20 text-info-dark dark:text-info'
    }
    return 'bg-muted text-muted-foreground'
  }

  return (
    <>
      {/* Floating Toolbar - Only visible on mobile */}
      <div
        className={cn(
          'md:hidden fixed bottom-20 left-4 right-4 z-40',
          'bg-card border border-border rounded-2xl shadow-lg',
          'safe-area-bottom',
          className
        )}
      >
        {/* Entity Info Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="font-semibold text-sm text-muted-foreground">
              {getEntityLabel()} {entityNumber}
            </span>
            <Badge className={cn('text-xs', getStatusColor(currentStatus))}>
              {currentStatus.replace(/_/g, ' ')}
            </Badge>
          </div>
          {isProcessing && (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-around p-2 gap-1">
          {/* Comment Button */}
          {canComment && onComment && (
            <Sheet open={showCommentSheet} onOpenChange={setShowCommentSheet}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-col gap-1 h-auto py-2 px-3"
                >
                  <MessageSquare className="h-5 w-5" />
                  <span className="text-[10px]">Comment</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[50vh]">
                <SheetHeader>
                  <SheetTitle>Add Comment</SheetTitle>
                  <SheetDescription>
                    Add a comment to {getEntityLabel()} {entityNumber}
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                  <Textarea
                    placeholder="Type your comment..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="min-h-[120px]"
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setShowCommentSheet(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSendComment}
                      disabled={!comment.trim() || isSending}
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Send
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          )}

          {/* Attach Button */}
          {canAttach && onAttach && (
            <Button
              variant="ghost"
              size="sm"
              className="flex-col gap-1 h-auto py-2 px-3"
              onClick={onAttach}
            >
              <Paperclip className="h-5 w-5" />
              <span className="text-[10px]">Attach</span>
            </Button>
          )}

          {/* Review/Approve Button */}
          {canReview && (entityType === 'submittal' ? onApprovalCode : onReview) && (
            entityType === 'submittal' ? (
              <Sheet open={showReviewSheet} onOpenChange={setShowReviewSheet}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-col gap-1 h-auto py-2 px-3 text-primary"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-[10px]">Review</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[70vh]">
                  <SheetHeader>
                    <SheetTitle>Review Submittal</SheetTitle>
                    <SheetDescription>
                      Select approval code for {entityNumber}
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-4 space-y-4">
                    {/* Approval Code Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                      {APPROVAL_CODES.map((option) => (
                        <button
                          key={option.code}
                          onClick={() => handleApprovalCode(option.code)}
                          disabled={isSending}
                          className={cn(
                            'flex flex-col items-start p-4 rounded-lg border-2 transition-all',
                            option.bgColor,
                            'border-transparent hover:border-current',
                            'disabled:opacity-50 disabled:cursor-not-allowed'
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {option.code === 'A' && <CheckCheck className={cn('h-5 w-5', option.color)} />}
                            {option.code === 'B' && <Edit3 className={cn('h-5 w-5', option.color)} />}
                            {option.code === 'C' && <RefreshCw className={cn('h-5 w-5', option.color)} />}
                            {option.code === 'D' && <X className={cn('h-5 w-5', option.color)} />}
                            <span className={cn('font-bold text-lg', option.color)}>
                              {option.code}
                            </span>
                          </div>
                          <span className={cn('font-semibold text-sm', option.color)}>
                            {option.label}
                          </span>
                          <span className="text-xs text-muted-foreground mt-1">
                            {option.description}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Optional Comment */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        Review Comments (Optional)
                      </label>
                      <Textarea
                        placeholder="Add review comments..."
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        className="min-h-[80px]"
                      />
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="flex-col gap-1 h-auto py-2 px-3 text-primary"
                onClick={() => onReview?.('responded')}
              >
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-[10px]">Respond</span>
              </Button>
            )
          )}

          {/* Share/Discuss Button */}
          {canShare && (onShare || onDiscuss) && (
            <Button
              variant="ghost"
              size="sm"
              className="flex-col gap-1 h-auto py-2 px-3"
              onClick={onDiscuss || onShare}
            >
              <Share2 className="h-5 w-5" />
              <span className="text-[10px]">Share</span>
            </Button>
          )}

          {/* More Options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex-col gap-1 h-auto py-2 px-3"
              >
                <MoreHorizontal className="h-5 w-5" />
                <span className="text-[10px]">More</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {canDownload && onDownload && (
                <DropdownMenuItem onClick={onDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </DropdownMenuItem>
              )}
              {onShare && (
                <DropdownMenuItem onClick={onShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Link
                </DropdownMenuItem>
              )}
              {onDiscuss && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onDiscuss}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Start Discussion
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Spacer to prevent content from being hidden behind toolbar */}
      <div className="md:hidden h-32" aria-hidden="true" />
    </>
  )
})

export default MobileWorkflowToolbar
