/**
 * Agent Message
 * Displays a single message in the chat interface with markdown, code blocks,
 * tool results, and interactive actions
 */

import React, { useState, useMemo, useCallback } from 'react'
import { format, isToday, isYesterday } from 'date-fns'
import {
  User,
  Sparkles,
  Wrench,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  RefreshCw,
  Edit2,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AgentToolResult } from './AgentToolResult'
import type { AgentMessage as AgentMessageType, ToolCall } from '../types/chat'

// ============================================================================
// Types
// ============================================================================

interface AgentMessageProps {
  message: AgentMessageType
  isStreaming?: boolean
  streamingContent?: string
  showFeedback?: boolean
  showTimestamp?: boolean
  showToolDetails?: boolean
  compact?: boolean
  onFeedback?: (messageId: string, type: 'positive' | 'negative') => void
  onRegenerate?: (messageId: string) => void
  onEdit?: (messageId: string, content: string) => void
  onDelete?: (messageId: string) => void
  onCopy?: (content: string) => void
}

// ============================================================================
// Component
// ============================================================================

export function AgentMessage({
  message,
  isStreaming = false,
  streamingContent,
  showFeedback = true,
  showTimestamp = true,
  showToolDetails = true,
  compact = false,
  onFeedback,
  onRegenerate,
  onEdit,
  onDelete,
  onCopy,
}: AgentMessageProps) {
  const [copied, setCopied] = useState(false)
  const [feedbackGiven, setFeedbackGiven] = useState<'positive' | 'negative' | null>(null)

  const isUser = message.role === 'user'
  const isTool = message.role === 'tool'
  const isAssistant = message.role === 'assistant'
  const isSystem = message.role === 'system'

  // Content to display (streaming or final)
  const displayContent = isStreaming && streamingContent ? streamingContent : message.content

  // Handle copy
  const handleCopy = useCallback(() => {
    const text = displayContent
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    onCopy?.(text)
  }, [displayContent, onCopy])

  // Handle feedback
  const handleFeedback = useCallback(
    (type: 'positive' | 'negative') => {
      setFeedbackGiven(type)
      onFeedback?.(message.id, type)
    },
    [message.id, onFeedback]
  )

  // Format timestamp
  const formattedTime = useMemo(() => {
    const date = new Date(message.created_at)
    if (isToday(date)) {
      return format(date, 'h:mm a')
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'h:mm a')}`
    }
    return format(date, 'MMM d, h:mm a')
  }, [message.created_at])

  // Tool result message
  if (isTool) {
    return (
      <div className="flex gap-3 py-2">
        <div className="w-8" /> {/* Spacer for avatar alignment */}
        <div className="flex-1 max-w-[90%]">
          <AgentToolResult
            toolName={message.tool_name || 'Unknown Tool'}
            input={message.tool_input || undefined}
            output={message.tool_output}
            error={message.tool_error}
            status={message.tool_error ? 'error' : 'success'}
            timestamp={message.created_at}
            showDetails={showToolDetails}
            compact={compact}
          />
        </div>
      </div>
    )
  }

  // System message
  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <div className="px-4 py-2 rounded-full bg-muted/50 text-sm text-muted-foreground">
          {displayContent}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'group flex gap-3 py-2',
        isUser ? 'flex-row-reverse' : 'flex-row',
        compact && 'py-1'
      )}
    >
      {/* Avatar */}
      <MessageAvatar role={message.role} compact={compact} />

      {/* Message Content */}
      <div
        className={cn(
          'flex flex-col max-w-[85%]',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        {/* Message Bubble */}
        <div
          className={cn(
            'relative rounded-2xl px-4 py-2.5',
            isUser
              ? 'bg-primary text-primary-foreground rounded-br-md'
              : 'bg-muted rounded-bl-md',
            compact && 'px-3 py-2',
            isStreaming && 'animate-pulse'
          )}
        >
          <MessageContent content={displayContent} isUser={isUser} />

          {/* Streaming cursor */}
          {isStreaming && (
            <span className="inline-block w-2 h-4 ml-0.5 bg-current animate-pulse rounded-sm" />
          )}
        </div>

        {/* Tool calls indicator */}
        {isAssistant && message.tool_calls && message.tool_calls.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {message.tool_calls.map((call, idx) => (
              <ToolCallBadge key={idx} toolCall={call} />
            ))}
          </div>
        )}

        {/* Footer */}
        <div
          className={cn(
            'flex items-center gap-2 mt-1 px-1',
            isUser ? 'flex-row-reverse' : 'flex-row',
            'opacity-0 group-hover:opacity-100 transition-opacity duration-200'
          )}
        >
          {/* Timestamp */}
          {showTimestamp && (
            <span className="text-xs text-muted-foreground">{formattedTime}</span>
          )}

          {/* Token count for assistant */}
          {isAssistant && message.tokens_used && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-muted-foreground/60">
                    {message.tokens_used} tokens
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Tokens used for this response</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Actions */}
          <MessageActions
            message={message}
            isUser={isUser}
            isAssistant={isAssistant}
            copied={copied}
            feedbackGiven={feedbackGiven}
            showFeedback={showFeedback}
            onCopy={handleCopy}
            onFeedback={handleFeedback}
            onRegenerate={onRegenerate}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

function MessageAvatar({ role, compact }: { role: string; compact?: boolean }) {
  const isUser = role === 'user'

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center shrink-0',
        isUser ? 'bg-primary text-primary-foreground' : 'bg-primary/10',
        compact ? 'h-6 w-6' : 'h-8 w-8'
      )}
    >
      {isUser ? (
        <User className={cn(compact ? 'h-3 w-3' : 'h-4 w-4')} />
      ) : (
        <Sparkles className={cn('text-primary', compact ? 'h-3 w-3' : 'h-4 w-4')} />
      )}
    </div>
  )
}

function MessageContent({ content, isUser }: { content: string; isUser: boolean }) {
  // Parse and render markdown-like content
  const renderedContent = useMemo(() => {
    return parseMessageContent(content, isUser)
  }, [content, isUser])

  return (
    <div
      className={cn(
        'text-sm whitespace-pre-wrap break-words',
        isUser ? 'text-primary-foreground' : 'text-foreground'
      )}
    >
      {renderedContent}
    </div>
  )
}

function parseMessageContent(content: string, isUser: boolean): React.ReactNode {
  if (!content) {return null}

  // Split content by code blocks
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {parseInlineContent(content.slice(lastIndex, match.index), isUser)}
        </span>
      )
    }

    // Add code block
    const language = match[1] || 'text'
    const code = match[2]
    parts.push(
      <CodeBlock key={`code-${match.index}`} language={language} code={code} />
    )

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(
      <span key={`text-${lastIndex}`}>
        {parseInlineContent(content.slice(lastIndex), isUser)}
      </span>
    )
  }

  return parts.length > 0 ? parts : parseInlineContent(content, isUser)
}

function parseInlineContent(content: string, isUser: boolean): React.ReactNode {
  const lines = content.split('\n')

  return lines.map((line, lineIdx) => {
    // Handle headers
    if (line.startsWith('### ')) {
      return (
        <h4 key={lineIdx} className="font-semibold mt-3 mb-1.5 text-base">
          {line.slice(4)}
        </h4>
      )
    }
    if (line.startsWith('## ')) {
      return (
        <h3 key={lineIdx} className="font-semibold text-base mt-4 mb-2">
          {line.slice(3)}
        </h3>
      )
    }
    if (line.startsWith('# ')) {
      return (
        <h2 key={lineIdx} className="font-bold text-lg mt-4 mb-2">
          {line.slice(2)}
        </h2>
      )
    }

    // Handle bullet points
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return (
        <div key={lineIdx} className="flex gap-2 pl-2 py-0.5">
          <span className={isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'}>
            -
          </span>
          <span>{parseInlineStyles(line.slice(2), isUser)}</span>
        </div>
      )
    }

    // Handle numbered lists
    const numberedMatch = line.match(/^(\d+)\.\s/)
    if (numberedMatch) {
      return (
        <div key={lineIdx} className="flex gap-2 pl-2 py-0.5">
          <span
            className={cn(
              'min-w-[1.5rem]',
              isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
            )}
          >
            {numberedMatch[1]}.
          </span>
          <span>{parseInlineStyles(line.slice(numberedMatch[0].length), isUser)}</span>
        </div>
      )
    }

    // Handle blockquotes
    if (line.startsWith('> ')) {
      return (
        <blockquote
          key={lineIdx}
          className={cn(
            'border-l-2 pl-3 py-1 my-1 italic',
            isUser ? 'border-primary-foreground/30' : 'border-muted-foreground/30'
          )}
        >
          {parseInlineStyles(line.slice(2), isUser)}
        </blockquote>
      )
    }

    // Handle horizontal rules
    if (line === '---' || line === '***') {
      return (
        <hr
          key={lineIdx}
          className={cn('my-3', isUser ? 'border-primary-foreground/20' : 'border-muted')}
        />
      )
    }

    // Regular paragraph
    return line ? (
      <p key={lineIdx} className="py-0.5">
        {parseInlineStyles(line, isUser)}
      </p>
    ) : (
      <br key={lineIdx} />
    )
  })
}

function parseInlineStyles(text: string, isUser: boolean): React.ReactNode {
  // Parse bold, italic, code, and links
  const parts: React.ReactNode[] = []

  // Simple regex-based parsing for inline styles
  // Bold: **text**
  // Italic: *text* or _text_
  // Code: `text`
  // Links: [text](url)

  const inlinePattern = /(\*\*.*?\*\*|\*.*?\*|_.*?_|`.*?`|\[.*?\]\(.*?\))/g
  let match
  let lastIndex = 0
  let key = 0

  while ((match = inlinePattern.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>)
    }

    const segment = match[0]

    // Bold
    if (segment.startsWith('**') && segment.endsWith('**')) {
      parts.push(
        <strong key={key++} className="font-semibold">
          {segment.slice(2, -2)}
        </strong>
      )
    }
    // Italic
    else if ((segment.startsWith('*') && segment.endsWith('*')) || (segment.startsWith('_') && segment.endsWith('_'))) {
      parts.push(
        <em key={key++} className="italic">
          {segment.slice(1, -1)}
        </em>
      )
    }
    // Inline code
    else if (segment.startsWith('`') && segment.endsWith('`')) {
      parts.push(
        <code
          key={key++}
          className={cn(
            'px-1.5 py-0.5 rounded text-xs font-mono',
            isUser
              ? 'bg-primary-foreground/20 text-primary-foreground'
              : 'bg-muted-foreground/10 text-foreground'
          )}
        >
          {segment.slice(1, -1)}
        </code>
      )
    }
    // Link
    else if (segment.startsWith('[')) {
      const linkMatch = segment.match(/\[(.*?)\]\((.*?)\)/)
      if (linkMatch) {
        parts.push(
          <a
            key={key++}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'underline underline-offset-2 hover:opacity-80',
              isUser ? 'text-primary-foreground' : 'text-primary'
            )}
          >
            {linkMatch[1]}
          </a>
        )
      }
    }

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIndex)}</span>)
  }

  return parts.length > 0 ? parts : text
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="my-2 rounded-lg overflow-hidden bg-gray-900 dark:bg-gray-950">
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800 dark:bg-gray-900">
        <span className="text-xs text-gray-400 font-mono">{language}</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-gray-400 hover:text-white"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-3 w-3 text-success" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{copied ? 'Copied!' : 'Copy code'}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <pre className="p-3 overflow-x-auto">
        <code className="text-sm font-mono text-gray-100">{code.trim()}</code>
      </pre>
    </div>
  )
}

function ToolCallBadge({ toolCall }: { toolCall: ToolCall }) {
  return (
    <Badge variant="outline" className="text-xs gap-1">
      <Wrench className="h-3 w-3" />
      {formatToolName(toolCall.name)}
    </Badge>
  )
}

function MessageActions({
  message,
  isUser,
  isAssistant,
  copied,
  feedbackGiven,
  showFeedback,
  onCopy,
  onFeedback,
  onRegenerate,
  onEdit,
  onDelete,
}: {
  message: AgentMessageType
  isUser: boolean
  isAssistant: boolean
  copied: boolean
  feedbackGiven: 'positive' | 'negative' | null
  showFeedback: boolean
  onCopy: () => void
  onFeedback: (type: 'positive' | 'negative') => void
  onRegenerate?: (messageId: string) => void
  onEdit?: (messageId: string, content: string) => void
  onDelete?: (messageId: string) => void
}) {
  return (
    <div className="flex items-center gap-0.5">
      {/* Copy button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onCopy}
            >
              {copied ? (
                <Check className="h-3 w-3 text-success" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{copied ? 'Copied!' : 'Copy message'}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Feedback for assistant messages */}
      {isAssistant && showFeedback && onFeedback && (
        <>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-6 w-6',
                    feedbackGiven === 'positive' && 'text-success'
                  )}
                  onClick={() => onFeedback('positive')}
                  disabled={feedbackGiven !== null}
                >
                  <ThumbsUp className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Helpful</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-6 w-6',
                    feedbackGiven === 'negative' && 'text-destructive'
                  )}
                  onClick={() => onFeedback('negative')}
                  disabled={feedbackGiven !== null}
                >
                  <ThumbsDown className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Not helpful</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </>
      )}

      {/* More actions dropdown */}
      {(onRegenerate || onEdit || onDelete) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isUser ? 'end' : 'start'}>
            {isAssistant && onRegenerate && (
              <DropdownMenuItem onClick={() => onRegenerate(message.id)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate
              </DropdownMenuItem>
            )}
            {isUser && onEdit && (
              <DropdownMenuItem onClick={() => onEdit(message.id, message.content)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
            )}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(message.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

// ============================================================================
// Typing Indicator
// ============================================================================

export function TypingIndicator() {
  return (
    <div className="flex gap-3 py-2">
      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Sparkles className="h-4 w-4 text-primary animate-pulse" />
      </div>
      <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Message Group
// ============================================================================

interface MessageGroupProps {
  messages: AgentMessageType[]
  showFeedback?: boolean
  showTimestamp?: boolean
  showToolDetails?: boolean
  compact?: boolean
  onFeedback?: (messageId: string, type: 'positive' | 'negative') => void
  onRegenerate?: (messageId: string) => void
  onEdit?: (messageId: string, content: string) => void
  onDelete?: (messageId: string) => void
}

export function MessageGroup({
  messages,
  showFeedback,
  showTimestamp,
  showToolDetails,
  compact,
  onFeedback,
  onRegenerate,
  onEdit,
  onDelete,
}: MessageGroupProps) {
  // Group consecutive messages from the same role
  const groups = useMemo(() => {
    const result: AgentMessageType[][] = []
    let currentGroup: AgentMessageType[] = []
    let currentRole: string | null = null

    messages.forEach((msg) => {
      if (msg.role !== currentRole) {
        if (currentGroup.length > 0) {
          result.push(currentGroup)
        }
        currentGroup = [msg]
        currentRole = msg.role
      } else {
        currentGroup.push(msg)
      }
    })

    if (currentGroup.length > 0) {
      result.push(currentGroup)
    }

    return result
  }, [messages])

  return (
    <div className="space-y-4">
      {groups.map((group, groupIdx) => (
        <div key={groupIdx} className="space-y-1">
          {group.map((message, msgIdx) => (
            <AgentMessage
              key={message.id}
              message={message}
              showFeedback={showFeedback && msgIdx === group.length - 1}
              showTimestamp={showTimestamp && msgIdx === group.length - 1}
              showToolDetails={showToolDetails}
              compact={compact && msgIdx > 0}
              onFeedback={onFeedback}
              onRegenerate={onRegenerate}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// Helpers
// ============================================================================

function formatToolName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
