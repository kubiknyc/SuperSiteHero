/**
 * MessageInput Component
 *
 * Text input for sending messages with:
 * - @mentions autocomplete
 * - File attachments
 * - Typing indicators
 * - Send on Enter (Shift+Enter for new line)
 */

import { useState, useRef, useCallback, useEffect, KeyboardEvent } from 'react'
import { Send, Paperclip, Smile, X, AtSign, Loader2 } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { useSendMessage, useTypingIndicator } from '../hooks'
import { useConversation } from '../hooks'
import { useAuth } from '@/lib/auth/AuthContext'
import type { SendMessageDTO, MessageAttachment, ConversationParticipant } from '@/types/messaging'
import { createMention, isValidMessageContent } from '@/types/messaging'
import { cn } from '@/lib/utils'
import { uploadMessageAttachments } from '@/lib/storage/message-uploads'
import { toast } from '@/lib/notifications/ToastContext'

interface MessageInputProps {
  conversationId: string
  className?: string
  onSent?: () => void
}

export function MessageInput({ conversationId, className, onSent }: MessageInputProps) {
  const { userProfile } = useAuth()
  const [content, setContent] = useState('')
  const [attachments, setAttachments] = useState<MessageAttachment[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [showMentions, setShowMentions] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const [mentionIndex, setMentionIndex] = useState(0)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Get conversation participants for @mentions
  const { data: conversation } = useConversation(conversationId)
  const participants = conversation?.participants || []

  // Typing indicator
  const { sendTyping } = useTypingIndicator(conversationId)

  // Send message mutation
  const sendMessage = useSendMessage()

  // Filter participants for mention autocomplete
  const filteredParticipants = participants.filter((p) => {
    if (p.user_id === userProfile?.id) return false
    if (!mentionSearch) return true

    const name = p.user?.full_name?.toLowerCase() || ''
    const email = p.user?.email?.toLowerCase() || ''
    const search = mentionSearch.toLowerCase()

    return name.includes(search) || email.includes(search)
  })

  // Handle input change with typing indicator
  const handleChange = useCallback(
    (value: string) => {
      setContent(value)

      // Check for @ mention trigger
      const lastAtIndex = value.lastIndexOf('@')
      if (lastAtIndex !== -1 && lastAtIndex === value.length - 1) {
        setShowMentions(true)
        setMentionSearch('')
        setMentionIndex(0)
      } else if (showMentions) {
        const textAfterAt = value.slice(lastAtIndex + 1)
        if (textAfterAt.includes(' ') || lastAtIndex === -1) {
          setShowMentions(false)
        } else {
          setMentionSearch(textAfterAt)
          setMentionIndex(0)
        }
      }

      // Send typing indicator
      if (value.length > 0) {
        sendTyping(true)
      }
    },
    [showMentions, sendTyping]
  )

  // Insert mention
  const insertMention = useCallback(
    (participant: ConversationParticipant) => {
      const lastAtIndex = content.lastIndexOf('@')
      const beforeAt = content.slice(0, lastAtIndex)
      const mention = createMention(
        participant.user_id,
        participant.user?.full_name || participant.user?.email || 'User'
      )

      setContent(beforeAt + mention + ' ')
      setShowMentions(false)
      setMentionSearch('')
      inputRef.current?.focus()
    },
    [content]
  )

  // Handle keyboard navigation in mentions
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions && filteredParticipants.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMentionIndex((prev) =>
          prev < filteredParticipants.length - 1 ? prev + 1 : 0
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMentionIndex((prev) =>
          prev > 0 ? prev - 1 : filteredParticipants.length - 1
        )
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        insertMention(filteredParticipants[mentionIndex])
      } else if (e.key === 'Escape') {
        setShowMentions(false)
      }
      return
    }

    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Handle file selection and upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // Validate file count (max 10 files per message)
    if (files.length > 10) {
      toast.error('Maximum 10 files allowed per message')
      return
    }

    setIsUploading(true)

    try {
      // Upload files to Supabase Storage
      const uploadedAttachments = await uploadMessageAttachments(
        conversationId,
        userProfile!.id,
        Array.from(files)
      )

      setAttachments((prev) => [...prev, ...uploadedAttachments])
      toast.success(`${uploadedAttachments.length} file(s) uploaded`)
    } catch (error) {
      console.error('File upload failed:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload files')
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  // Send message
  const handleSend = async () => {
    const trimmedContent = content.trim()

    if (!trimmedContent && attachments.length === 0) return
    if (!isValidMessageContent(trimmedContent) && attachments.length === 0) return

    const messageData: SendMessageDTO = {
      conversation_id: conversationId,
      content: trimmedContent,
      message_type: attachments.length > 0 ? 'file' : 'text',
      attachments: attachments.length > 0 ? attachments : undefined,
    }

    try {
      await sendMessage.mutateAsync(messageData)
      setContent('')
      setAttachments([])
      sendTyping(false)
      onSent?.()
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 150)}px`
    }
  }, [content])

  return (
    <div className={cn('border-t bg-background', className)}>
      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 border-b">
          {attachments.map((attachment, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5 text-sm"
            >
              <Paperclip className="h-4 w-4" />
              <span className="max-w-[150px] truncate">{attachment.name}</span>
              <button
                onClick={() => removeAttachment(index)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Mention suggestions */}
      {showMentions && filteredParticipants.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-1 mx-4 bg-popover border rounded-lg shadow-lg max-h-48 overflow-auto">
          {filteredParticipants.map((participant, index) => (
            <button
              key={participant.id}
              onClick={() => insertMention(participant)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted',
                index === mentionIndex && 'bg-muted'
              )}
            >
              {participant.user?.avatar_url ? (
                <img
                  src={participant.user.avatar_url}
                  alt=""
                  className="h-6 w-6 rounded-full object-cover"
                />
              ) : (
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs">
                  {participant.user?.full_name?.charAt(0) || '?'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {participant.user?.full_name || 'Unknown User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {participant.user?.email}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2 p-3">
        {/* Attachment button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 flex-shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Paperclip className="h-5 w-5" />
          )}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        />

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={content}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (@ to mention)"
            className={cn(
              'w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm',
              'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring',
              'min-h-[40px] max-h-[150px]'
            )}
            rows={1}
          />
        </div>

        {/* Send button */}
        <Button
          type="button"
          size="sm"
          className="h-9 w-9 p-0 flex-shrink-0"
          onClick={handleSend}
          disabled={
            sendMessage.isPending ||
            (!content.trim() && attachments.length === 0)
          }
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
