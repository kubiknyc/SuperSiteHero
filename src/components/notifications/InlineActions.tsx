/**
 * InlineActions Component
 * 
 * Inline action buttons for notifications (approve, reject, snooze, reply)
 */

import { useState } from 'react'
import { Check, X, Clock, MessageSquare, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface InlineActionsProps {
  notificationId: string
  showApproval?: boolean
  showSnooze?: boolean
  showReply?: boolean
  onApprove?: () => Promise<void>
  onReject?: () => Promise<void>
  onSnooze?: (minutes: number) => Promise<void>
  onReply?: (message: string) => Promise<void>
  isLoading?: boolean
}

export function InlineActions({
  notificationId: _notificationId,
  showApproval = false,
  showSnooze = true,
  showReply = false,
  onApprove,
  onReject,
  onSnooze,
  onReply,
  isLoading = false,
}: InlineActionsProps) {
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyMessage, setReplyMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleReplySubmit = async () => {
    if (!replyMessage.trim() || !onReply) {
      return
    }
    setIsSubmitting(true)
    try {
      await onReply(replyMessage)
      setReplyMessage('')
      setReplyOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex items-center gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
      {showApproval && onApprove && onReject && (
        <>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={onApprove}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs text-destructive hover:text-destructive"
            onClick={onReject}
            disabled={isLoading}
          >
            <X className="h-3 w-3 mr-1" />
            Reject
          </Button>
        </>
      )}

      {showSnooze && onSnooze && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Snooze
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => onSnooze(30)}>
              30 minutes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSnooze(60)}>
              1 hour
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSnooze(240)}>
              4 hours
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSnooze(1440)}>
              Tomorrow
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {showReply && onReply && (
        <>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => setReplyOpen(true)}
          >
            <MessageSquare className="h-3 w-3 mr-1" />
            Reply
          </Button>

          <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Quick Reply</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <Input
                  placeholder="Type your reply..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleReplySubmit()
                    }
                  }}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setReplyOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleReplySubmit} disabled={!replyMessage.trim() || isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Send
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}

export default InlineActions
