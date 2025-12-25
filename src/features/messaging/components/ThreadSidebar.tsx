/**
 * ThreadSidebar Component
 *
 * Slide-out panel for viewing and replying to message threads:
 * - Shows parent message at top
 * - Lists all replies
 * - Input for sending new replies
 * - Closes with X button or clicking outside
 */

import { useState, useRef, useEffect } from 'react'
import { X, MessageSquare, Send, Paperclip, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import DOMPurify from 'dompurify'
import { Button, Input } from '@/components/ui'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth/AuthContext'
import {
  useParentMessage,
  useThreadMessages,
  useReplyCount,
  useSendReply,
} from '../hooks/useThread'
import { useTypingIndicator } from '../hooks/useRealtimeMessaging'
import type { Message } from '@/types/messaging'
import { formatMentionsForDisplay } from '@/types/messaging'

interface ThreadSidebarProps {
  /** ID of the parent message (thread root) */
  parentMessageId: string
  /** Conversation ID */
  conversationId: string
  /** Whether the sidebar is open */
  isOpen: boolean
  /** Callback when sidebar should close */
  onClose: () => void
  /** Additional CSS classes */
  className?: string
}

/**
 * Sanitize HTML content to prevent XSS attacks
 */
function sanitizeContent(content: string): string {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['span'],
    ALLOWED_ATTR: ['class'],
  })
}

/**
 * Single message in the thread
 */
function ThreadMessage({
  message,
  isOwnMessage,
}: {
  message: Message
  isOwnMessage: boolean
}) {
  return (
    <div
      className={cn(
        'flex gap-2 mb-3',
        isOwnMessage ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      {!isOwnMessage && (
        <div className="flex-shrink-0">
          {message.sender?.avatar_url ? (
            <img
              src={message.sender.avatar_url}
              alt=""
              className="h-7 w-7 rounded-full object-cover"
            />
          ) : (
            <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
              {message.sender?.full_name?.charAt(0) || '?'}
            </div>
          )}
        </div>
      )}

      <div
        className={cn(
          'max-w-[80%] flex flex-col',
          isOwnMessage ? 'items-end' : 'items-start'
        )}
      >
        {/* Sender name */}
        {!isOwnMessage && (
          <span className="text-xs text-muted-foreground mb-0.5">
            {message.sender?.full_name || message.sender?.email}
          </span>
        )}

        {/* Content */}
        <div
          className={cn(
            'rounded-xl px-3 py-2 text-sm',
            isOwnMessage
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted',
            message.deleted_at && 'opacity-50 italic'
          )}
        >
          <p
            className="whitespace-pre-wrap break-words"
            dangerouslySetInnerHTML={{
              __html: message.deleted_at
                ? 'This message was deleted'
                : sanitizeContent(formatMentionsForDisplay(message.content)),
            }}
          />
        </div>

        {/* Time */}
        <span className="text-xs text-muted-foreground mt-0.5">
          {format(new Date(message.created_at), 'h:mm a')}
        </span>
      </div>
    </div>
  )
}

export function ThreadSidebar({
  parentMessageId,
  conversationId,
  isOpen,
  onClose,
  className,
}: ThreadSidebarProps) {
  const { userProfile } = useAuth()
  const [replyContent, setReplyContent] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Fetch parent message
  const { data: parentMessage, isLoading: loadingParent } = useParentMessage(parentMessageId)

  // Fetch thread replies
  const { data: replies = [], isLoading: loadingReplies } = useThreadMessages(parentMessageId)

  // Get reply count
  const { data: replyCount = 0 } = useReplyCount(parentMessageId)

  // Typing indicator for the thread
  const { sendTyping, typingUsers, isTyping } = useTypingIndicator(conversationId)

  // Send reply mutation
  const sendReply = useSendReply()

  // Scroll to bottom when new replies arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [replies.length])

  // Focus input when sidebar opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200)
    }
  }, [isOpen])

  // Handle reply submission
  const handleSendReply = async () => {
    const trimmed = replyContent.trim()
    if (!trimmed) {return}

    try {
      await sendReply.mutateAsync({
        conversation_id: conversationId,
        content: trimmed,
        parent_message_id: parentMessageId,
      })
      setReplyContent('')
      sendTyping(false)
    } catch (error) {
      console.error('Failed to send reply:', error)
    }
  }

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendReply()
    }
  }

  // Handle input change with typing indicator
  const handleInputChange = (value: string) => {
    setReplyContent(value)
    if (value.length > 0) {
      sendTyping(true)
    }
  }

  if (!isOpen) {return null}

  const isLoading = loadingParent || loadingReplies

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={cn(
          'fixed right-0 top-0 bottom-0 w-full max-w-md bg-background border-l shadow-xl z-50',
          'flex flex-col animate-in slide-in-from-right duration-200',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold heading-section">Thread</h2>
            {replyCount > 0 && (
              <span className="text-sm text-muted-foreground">
                ({replyCount} {replyCount === 1 ? 'reply' : 'replies'})
              </span>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Parent message */}
              {parentMessage && (
                <div className="mb-4 pb-4 border-b">
                  <div className="flex items-start gap-2">
                    {parentMessage.sender?.avatar_url ? (
                      <img
                        src={parentMessage.sender.avatar_url}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        {parentMessage.sender?.full_name?.charAt(0) || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {parentMessage.sender?.full_name || parentMessage.sender?.email}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(parentMessage.created_at), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <p
                        className="text-sm mt-1 whitespace-pre-wrap break-words"
                        dangerouslySetInnerHTML={{
                          __html: sanitizeContent(formatMentionsForDisplay(parentMessage.content)),
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Replies */}
              {replies.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No replies yet</p>
                  <p className="text-sm">Start the thread with a reply</p>
                </div>
              ) : (
                replies.map((reply) => (
                  <ThreadMessage
                    key={reply.id}
                    message={reply}
                    isOwnMessage={reply.sender_id === userProfile?.id}
                  />
                ))
              )}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <div className="flex gap-0.5">
                    <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                  </div>
                  <span>
                    {typingUsers.length === 1
                      ? `${typingUsers[0]} is typing`
                      : `${typingUsers.length} people are typing`}
                  </span>
                </div>
              )}

              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Reply input */}
        <div className="border-t p-3">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={replyContent}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Reply to thread..."
                className={cn(
                  'w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm',
                  'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring',
                  'min-h-[40px] max-h-[120px]'
                )}
                rows={1}
              />
            </div>
            <Button
              size="sm"
              className="h-9 w-9 p-0"
              onClick={handleSendReply}
              disabled={sendReply.isPending || !replyContent.trim()}
            >
              {sendReply.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
