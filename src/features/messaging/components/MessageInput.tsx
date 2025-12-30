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
import { Send, Paperclip, X, Loader2, Zap, AlertTriangle, AlertCircle, Mic, MicOff } from 'lucide-react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui'
import { useSendMessage, useTypingIndicator, useMessageDraft, useConversation } from '../hooks'
import { useAuth } from '@/lib/auth/AuthContext'
import {
  createMention,
  isValidMessageContent,
  MESSAGE_PRIORITY_CONFIG,
  type SendMessageDTO,
  type MessageAttachment,
  type ConversationParticipant,
  type MessagePriority,
} from '@/types/messaging'

// Note: setContent is from the useMessageDraft hook and is stable, but we include it in deps for completeness
import { cn } from '@/lib/utils'
import { uploadMessageAttachments } from '@/lib/storage/message-uploads'
import { toast } from '@/lib/notifications/ToastContext'
import { useVoiceToText } from '@/hooks/useVoiceToText'
import { logger } from '../../../lib/utils/logger';


interface MessageInputProps {
  conversationId: string
  className?: string
  onSent?: () => void
}

// Allowed MIME types for file attachments
const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Text
  'text/plain',
  'text/csv',
  // Archives (common in construction)
  'application/zip',
  'application/x-zip-compressed',
])

// Max file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024

// Construction-specific quick message templates
const CONSTRUCTION_TEMPLATES = [
  { label: "When complete?", value: "When will this be complete?" },
  { label: "Send photos", value: "Please send photos when this is complete." },
  { label: "Materials on site?", value: "Do you have the required materials on site?" },
  { label: "Crew size?", value: "What's your crew size for tomorrow?" },
  { label: "Safety concern", value: "⚠️ Safety concern - please address immediately." },
  { label: "Weather delay", value: "Weather delay today. Will update on schedule impact." },
  { label: "Need shop drawing", value: "Can you send me the shop drawing for review?" },
  { label: "Schedule conflict", value: "I see a potential schedule conflict. Can we discuss?" },
]

/**
 * Validate a file's type and size
 * Returns error message if invalid, null if valid
 */
function validateFile(file: File): string | null {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return `"${file.name}" has an unsupported file type (${file.type || 'unknown'})`
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
    return `"${file.name}" is too large (${sizeMB}MB). Maximum size is 50MB`
  }

  return null
}

export function MessageInput({ conversationId, className, onSent }: MessageInputProps) {
  const { userProfile } = useAuth()
  const [attachments, setAttachments] = useState<MessageAttachment[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [showMentions, setShowMentions] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const [mentionIndex, setMentionIndex] = useState(0)
  const [priority, setPriority] = useState<MessagePriority>('normal')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Message draft persistence - auto-saves to localStorage
  const { draft: content, saveDraft: setContent, clearDraft } = useMessageDraft(conversationId)

  // Get conversation participants for @mentions
  const { data: conversation } = useConversation(conversationId)
  const participants = conversation?.participants || []

  // Typing indicator
  const { sendTyping } = useTypingIndicator(conversationId)

  // Send message mutation
  const sendMessage = useSendMessage()

  // Voice-to-text for hands-free messaging
  const {
    isListening,
    isSupported: voiceSupported,
    startListening,
    stopListening,
  } = useVoiceToText({
    onTranscript: (text, isFinal) => {
      if (isFinal) {
        // Append voice transcript to existing content
        const newContent = content ? `${content} ${text}` : text
        setContent(newContent)
      }
    },
  })

  // Filter participants for mention autocomplete
  const filteredParticipants = participants.filter((p) => {
    if (p.user_id === userProfile?.id) {return false}
    if (!mentionSearch) {return true}

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
    [showMentions, sendTyping, setContent]
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
    [content, setContent]
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
    if (!files || files.length === 0) {return}

    // Validate file count (max 10 files per message)
    if (files.length > 10) {
      toast.error('Maximum 10 files allowed per message')
      return
    }

    // Validate each file's type and size
    const fileArray = Array.from(files)
    const validationErrors: string[] = []
    const validFiles: File[] = []

    for (const file of fileArray) {
      const error = validateFile(file)
      if (error) {
        validationErrors.push(error)
      } else {
        validFiles.push(file)
      }
    }

    // Show validation errors
    if (validationErrors.length > 0) {
      // Show first 3 errors to avoid toast spam
      const errorsToShow = validationErrors.slice(0, 3)
      errorsToShow.forEach((error) => toast.error(error))
      if (validationErrors.length > 3) {
        toast.error(`...and ${validationErrors.length - 3} more file(s) rejected`)
      }
    }

    // If no valid files, exit early
    if (validFiles.length === 0) {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    setIsUploading(true)

    try {
      // Upload only valid files to Supabase Storage
      const uploadedAttachments = await uploadMessageAttachments(
        conversationId,
        userProfile!.id,
        validFiles
      )

      setAttachments((prev) => [...prev, ...uploadedAttachments])
      toast.success(`${uploadedAttachments.length} file(s) uploaded`)
    } catch (error) {
      logger.error('File upload failed:', error)
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

    if (!trimmedContent && attachments.length === 0) {return}
    if (!isValidMessageContent(trimmedContent) && attachments.length === 0) {return}

    const messageData: SendMessageDTO = {
      conversation_id: conversationId,
      content: trimmedContent,
      message_type: attachments.length > 0 ? 'file' : 'text',
      priority: priority !== 'normal' ? priority : undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
    }

    try {
      await sendMessage.mutateAsync(messageData)
      clearDraft() // Clear the draft from localStorage
      setAttachments([])
      setPriority('normal') // Reset priority after sending
      sendTyping(false)
      onSent?.()
    } catch (error) {
      logger.error('Failed to send message:', error)
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

        {/* Voice input button */}
        {voiceSupported && (
          <Button
            type="button"
            variant={isListening ? 'destructive' : 'ghost'}
            size="sm"
            className={cn(
              'h-9 w-9 p-0 flex-shrink-0',
              isListening && 'animate-pulse'
            )}
            onClick={isListening ? stopListening : startListening}
            title={isListening ? 'Stop recording' : 'Voice input (tap to speak)'}
          >
            {isListening ? (
              <MicOff className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </Button>
        )}

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

        {/* Quick message templates */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 flex-shrink-0"
              title="Quick messages"
            >
              <Zap className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Quick Messages</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {CONSTRUCTION_TEMPLATES.map((t) => (
              <DropdownMenuItem
                key={t.value}
                onClick={() => setContent(t.value)}
              >
                {t.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Priority selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant={priority === 'normal' ? 'ghost' : 'outline'}
              size="sm"
              className={cn(
                'h-9 w-9 p-0 flex-shrink-0',
                priority === 'high' && 'text-warning border-amber-300 bg-warning-light hover:bg-amber-100',
                priority === 'urgent' && 'text-error border-red-300 bg-error-light hover:bg-error-light'
              )}
              title={`Priority: ${MESSAGE_PRIORITY_CONFIG[priority].label}`}
            >
              {priority === 'normal' ? (
                <AlertTriangle className="h-5 w-5 text-muted-foreground" />
              ) : priority === 'high' ? (
                <AlertTriangle className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Message Priority</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setPriority('normal')}
              className={cn(priority === 'normal' && 'bg-muted')}
            >
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-gray-400" />
                Normal
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setPriority('high')}
              className={cn(priority === 'high' && 'bg-muted')}
            >
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                High Priority
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setPriority('urgent')}
              className={cn(priority === 'urgent' && 'bg-muted')}
            >
              <span className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-error" />
                Urgent - Safety
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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
