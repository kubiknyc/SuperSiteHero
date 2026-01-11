/**
 * Agent Chat Input
 * Rich text input with @ mentions, / commands, voice input, and file attachments
 */

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  KeyboardEvent,
  useMemo,
} from 'react'
import {
  Send,
  Paperclip,
  Mic,
  MicOff,
  X,
  AtSign,
  Hash,
  User,
  FileText,
  FolderOpen,
  Building2,
  Loader2,
  Image,
  File,
  Sparkles,
  Command,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useChatStore } from '../state/chat-store'
import { useMentionSuggestions, useChatCommands } from '../hooks/useAgentChat'
import type { Mention, Attachment } from '../types/chat'

// ============================================================================
// Types
// ============================================================================

interface AgentChatInputProps {
  onSend: (message: string, mentions?: Mention[], attachments?: Attachment[]) => void
  isDisabled?: boolean
  placeholder?: string
  projectId?: string
  showVoiceInput?: boolean
  showAttachments?: boolean
  maxLength?: number
}

interface CommandSuggestion {
  name: string
  description: string
  usage?: string
}

// ============================================================================
// Constants
// ============================================================================

const COMMANDS: CommandSuggestion[] = [
  { name: 'summarize', description: 'Summarize reports or time period', usage: '/summarize [today|week]' },
  { name: 'search', description: 'Search project data', usage: '/search <query>' },
  { name: 'route', description: 'Get RFI routing suggestion', usage: '/route <rfi-id>' },
  { name: 'draft', description: 'Draft an RFI response', usage: '/draft <rfi-id>' },
  { name: 'weekly', description: 'Generate weekly status report', usage: '/weekly' },
  { name: 'classify', description: 'Classify a document', usage: '/classify <doc-id>' },
  { name: 'risk', description: 'Assess project risks', usage: '/risk' },
  { name: 'budget', description: 'Analyze budget variance', usage: '/budget' },
  { name: 'help', description: 'Show available commands', usage: '/help' },
  { name: 'clear', description: 'Clear chat history', usage: '/clear' },
]

// ============================================================================
// Component
// ============================================================================

export function AgentChatInput({
  onSend,
  isDisabled,
  placeholder,
  projectId,
  showVoiceInput = true,
  showAttachments = true,
  maxLength = 4000,
}: AgentChatInputProps) {
  // Local state
  const [value, setValue] = useState('')
  const [mentions, setMentions] = useState<Mention[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [showCommands, setShowCommands] = useState(false)
  const [showMentions, setShowMentions] = useState(false)
  const [commandFilter, setCommandFilter] = useState('')
  const [mentionFilter, setMentionFilter] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isRecording, setIsRecording] = useState(false)

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Hooks
  const { suggestions: mentionSuggestions, isLoading: isLoadingMentions, searchMentions } = useMentionSuggestions(projectId)
  const { getCommandSuggestions } = useChatCommands()

  // Filter commands
  const filteredCommands = useMemo(() => {
    if (!commandFilter) {return COMMANDS.slice(0, 6)}
    return COMMANDS.filter(
      (cmd) =>
        cmd.name.toLowerCase().includes(commandFilter.toLowerCase()) ||
        cmd.description.toLowerCase().includes(commandFilter.toLowerCase())
    ).slice(0, 6)
  }, [commandFilter])

  // Handle input change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      setValue(newValue)

      // Auto-resize textarea
      const textarea = e.target
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`

      // Check for command trigger
      if (newValue.startsWith('/')) {
        setShowCommands(true)
        setShowMentions(false)
        setCommandFilter(newValue.slice(1).split(' ')[0])
        setSelectedIndex(0)
      } else {
        setShowCommands(false)
      }

      // Check for mention trigger
      const lastAtIndex = newValue.lastIndexOf('@')
      if (lastAtIndex !== -1) {
        const afterAt = newValue.slice(lastAtIndex + 1)
        if (!afterAt.includes(' ') && afterAt.length > 0) {
          setShowMentions(true)
          setShowCommands(false)
          setMentionFilter(afterAt)
          searchMentions(afterAt)
          setSelectedIndex(0)
        } else if (afterAt === '') {
          setShowMentions(true)
          setShowCommands(false)
          setMentionFilter('')
          searchMentions('')
          setSelectedIndex(0)
        } else {
          setShowMentions(false)
        }
      } else {
        setShowMentions(false)
      }
    },
    [searchMentions]
  )

  // Handle submit
  const handleSubmit = useCallback(() => {
    if (!value.trim() || isDisabled) {return}

    onSend(value.trim(), mentions, attachments)
    setValue('')
    setMentions([])
    setAttachments([])
    setShowCommands(false)
    setShowMentions(false)

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, isDisabled, onSend, mentions, attachments])

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Handle command/mention selection
      if (showCommands || showMentions) {
        const items = showCommands ? filteredCommands : mentionSuggestions

        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1))
          return
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          setSelectedIndex((prev) => Math.max(prev - 1, 0))
          return
        }
        if (e.key === 'Tab' || e.key === 'Enter') {
          e.preventDefault()
          if (showCommands && filteredCommands[selectedIndex]) {
            handleSelectCommand(filteredCommands[selectedIndex])
          } else if (showMentions && mentionSuggestions[selectedIndex]) {
            handleSelectMention(mentionSuggestions[selectedIndex])
          }
          return
        }
        if (e.key === 'Escape') {
          setShowCommands(false)
          setShowMentions(false)
          return
        }
      }

      // Submit on Enter (without Shift)
      if (e.key === 'Enter' && !e.shiftKey && !showCommands && !showMentions) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [showCommands, showMentions, filteredCommands, mentionSuggestions, selectedIndex, handleSubmit]
  )

  // Handle command selection
  const handleSelectCommand = useCallback((command: CommandSuggestion) => {
    setValue(`/${command.name} `)
    setShowCommands(false)
    setCommandFilter('')
    textareaRef.current?.focus()
  }, [])

  // Handle mention selection
  const handleSelectMention = useCallback(
    (suggestion: { type: string; id: string; name: string }) => {
      const lastAtIndex = value.lastIndexOf('@')
      const beforeAt = value.slice(0, lastAtIndex)
      const newValue = `${beforeAt}@${suggestion.name} `
      setValue(newValue)

      // Add to mentions list
      const newMention: Mention = {
        type: suggestion.type as Mention['type'],
        id: suggestion.id,
        name: suggestion.name,
        startIndex: lastAtIndex,
        endIndex: lastAtIndex + suggestion.name.length + 1,
      }
      setMentions((prev) => [...prev, newMention])

      setShowMentions(false)
      setMentionFilter('')
      textareaRef.current?.focus()
    },
    [value]
  )

  // Handle file attachment
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) {return}

    const newAttachments: Attachment[] = []
    Array.from(files).forEach((file) => {
      const attachment: Attachment = {
        id: `${Date.now()}-${file.name}`,
        type: file.type.startsWith('image/') ? 'image' : 'file',
        name: file.name,
        file,
      }
      newAttachments.push(attachment)
    })

    setAttachments((prev) => [...prev, ...newAttachments])

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  // Remove attachment
  const handleRemoveAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }, [])

  // Remove mention
  const handleRemoveMention = useCallback((id: string) => {
    setMentions((prev) => prev.filter((m) => m.id !== id))
  }, [])

  // Voice input toggle (placeholder - needs actual implementation)
  const handleVoiceToggle = useCallback(() => {
    setIsRecording((prev) => !prev)
    // TODO: Implement voice input using Web Speech API
  }, [])

  return (
    <div className="relative">
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((attachment) => (
            <AttachmentPreview
              key={attachment.id}
              attachment={attachment}
              onRemove={() => handleRemoveAttachment(attachment.id)}
            />
          ))}
        </div>
      )}

      {/* Mentions Preview */}
      {mentions.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {mentions.map((mention) => (
            <Badge key={mention.id} variant="secondary" className="gap-1 pr-1">
              <MentionIcon type={mention.type} />
              {mention.name}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 ml-1 hover:bg-destructive/20"
                onClick={() => handleRemoveMention(mention.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Command Suggestions */}
      {showCommands && filteredCommands.length > 0 && (
        <CommandSuggestions
          commands={filteredCommands}
          selectedIndex={selectedIndex}
          onSelect={handleSelectCommand}
        />
      )}

      {/* Mention Suggestions */}
      {showMentions && (
        <MentionSuggestions
          suggestions={mentionSuggestions}
          isLoading={isLoadingMentions}
          selectedIndex={selectedIndex}
          onSelect={handleSelectMention}
        />
      )}

      {/* Input Area */}
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || 'Ask me anything... (@ to mention, / for commands)'}
            disabled={isDisabled}
            className={cn(
              'min-h-[44px] max-h-[150px] resize-none pr-10',
              'scrollbar-thin scrollbar-thumb-muted-foreground/20',
              isDisabled && 'opacity-50 cursor-not-allowed'
            )}
            rows={1}
          />

          {/* Character count for long messages */}
          {value.length > maxLength * 0.8 && (
            <span
              className={cn(
                'absolute bottom-2 right-2 text-xs',
                value.length > maxLength ? 'text-destructive' : 'text-muted-foreground'
              )}
            >
              {value.length}/{maxLength}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {/* Attachment Button */}
          {showAttachments && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isDisabled}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Attach file</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Voice Input Button */}
          {showVoiceInput && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isRecording ? 'destructive' : 'ghost'}
                    size="icon"
                    className={cn('h-10 w-10 shrink-0', isRecording && 'animate-pulse')}
                    onClick={handleVoiceToggle}
                    disabled={isDisabled}
                  >
                    {isRecording ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isRecording ? 'Stop recording' : 'Voice input'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Send Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleSubmit}
                  disabled={!value.trim() || isDisabled || value.length > maxLength}
                  size="icon"
                  className="h-10 w-10 shrink-0"
                >
                  <Send className="h-4 w-4" />
                  <span className="sr-only">Send message</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Send message (Enter)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Helper text */}
      <div className="flex items-center justify-between mt-2 px-1">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Command className="h-3 w-3" />
            <span>Enter to send</span>
          </span>
          <span className="flex items-center gap-1">
            <AtSign className="h-3 w-3" />
            <span>@ to mention</span>
          </span>
          <span className="flex items-center gap-1">
            <Hash className="h-3 w-3" />
            <span>/ for commands</span>
          </span>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        onChange={handleFileSelect}
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
      />
    </div>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

function CommandSuggestions({
  commands,
  selectedIndex,
  onSelect,
}: {
  commands: CommandSuggestion[]
  selectedIndex: number
  onSelect: (command: CommandSuggestion) => void
}) {
  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-popover border rounded-lg shadow-lg overflow-hidden z-[70]">
      <div className="p-2 text-xs text-muted-foreground border-b flex items-center gap-2">
        <Sparkles className="h-3 w-3" />
        Commands
      </div>
      <div className="max-h-[250px] overflow-y-auto">
        {commands.map((cmd, idx) => (
          <button
            key={cmd.name}
            onClick={() => onSelect(cmd)}
            className={cn(
              'w-full px-3 py-2 text-left flex items-center justify-between',
              'hover:bg-muted transition-colors',
              idx === selectedIndex && 'bg-muted'
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-primary font-mono text-sm">/{cmd.name}</span>
              <span className="text-xs text-muted-foreground">{cmd.description}</span>
            </div>
            {cmd.usage && (
              <span className="text-[10px] text-muted-foreground/60 font-mono">
                {cmd.usage}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

function MentionSuggestions({
  suggestions,
  isLoading,
  selectedIndex,
  onSelect,
}: {
  suggestions: Array<{ type: string; id: string; name: string; subtitle?: string }>
  isLoading: boolean
  selectedIndex: number
  onSelect: (suggestion: { type: string; id: string; name: string }) => void
}) {
  if (isLoading) {
    return (
      <div className="absolute bottom-full left-0 right-0 mb-2 bg-popover border rounded-lg shadow-lg overflow-hidden z-[70]">
        <div className="p-4 flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (suggestions.length === 0) {
    return (
      <div className="absolute bottom-full left-0 right-0 mb-2 bg-popover border rounded-lg shadow-lg overflow-hidden z-[70]">
        <div className="p-3 text-sm text-muted-foreground text-center">
          No matches found
        </div>
      </div>
    )
  }

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-popover border rounded-lg shadow-lg overflow-hidden z-[70]">
      <div className="p-2 text-xs text-muted-foreground border-b flex items-center gap-2">
        <AtSign className="h-3 w-3" />
        Mentions
      </div>
      <div className="max-h-[250px] overflow-y-auto">
        {suggestions.map((suggestion, idx) => (
          <button
            key={`${suggestion.type}-${suggestion.id}`}
            onClick={() => onSelect(suggestion)}
            className={cn(
              'w-full px-3 py-2 text-left flex items-center gap-3',
              'hover:bg-muted transition-colors',
              idx === selectedIndex && 'bg-muted'
            )}
          >
            <MentionIcon type={suggestion.type} />
            <div className="flex flex-col">
              <span className="text-sm font-medium">{suggestion.name}</span>
              {suggestion.subtitle && (
                <span className="text-xs text-muted-foreground">{suggestion.subtitle}</span>
              )}
            </div>
            <Badge variant="secondary" className="ml-auto text-[10px]">
              {suggestion.type}
            </Badge>
          </button>
        ))}
      </div>
    </div>
  )
}

function MentionIcon({ type }: { type: string }) {
  const iconClass = 'h-4 w-4 text-muted-foreground'

  switch (type) {
    case 'user':
      return <User className={iconClass} />
    case 'project':
      return <Building2 className={iconClass} />
    case 'rfi':
    case 'workflow_item':
      return <FileText className={iconClass} />
    case 'document':
      return <FolderOpen className={iconClass} />
    default:
      return <Hash className={iconClass} />
  }
}

function AttachmentPreview({
  attachment,
  onRemove,
}: {
  attachment: Attachment
  onRemove: () => void
}) {
  const isImage = attachment.type === 'image'

  return (
    <div className="relative group">
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/50',
          'max-w-[200px]'
        )}
      >
        {isImage ? (
          <Image className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <File className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <span className="text-sm truncate">{attachment.name}</span>
      </div>
      <Button
        variant="destructive"
        size="icon"
        className={cn(
          'absolute -top-2 -right-2 h-5 w-5 rounded-full',
          'opacity-0 group-hover:opacity-100 transition-opacity'
        )}
        onClick={onRemove}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}

// ============================================================================
// Exports
// ============================================================================

export { CommandSuggestions, MentionSuggestions }
