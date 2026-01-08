/**
 * Agent Message
 * Displays a single message in the chat interface
 */

import React from 'react'
import { format } from 'date-fns'
import {
  User,
  Sparkles,
  Wrench,
  CheckCircle,
  XCircle,
  ExternalLink,
  Copy,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import type { AgentMessage as AgentMessageType } from '../types/chat'

// ============================================================================
// Types
// ============================================================================

interface AgentMessageProps {
  message: AgentMessageType
  showFeedback?: boolean
  onFeedback?: (messageId: string, type: 'positive' | 'negative') => void
}

// ============================================================================
// Component
// ============================================================================

export function AgentMessage({ message, showFeedback = true, onFeedback }: AgentMessageProps) {
  const isUser = message.role === 'user'
  const isTool = message.role === 'tool'
  const isAssistant = message.role === 'assistant'

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
  }

  // Tool result message
  if (isTool) {
    return (
      <ToolResultMessage
        toolName={message.tool_name || 'Unknown Tool'}
        output={message.tool_output}
        error={message.tool_error}
        timestamp={message.created_at}
      />
    )
  }

  return (
    <div
      className={cn(
        'flex gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-primary/10'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Sparkles className="h-4 w-4 text-primary" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          'flex flex-col max-w-[85%]',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5',
            isUser
              ? 'bg-primary text-primary-foreground rounded-br-md'
              : 'bg-muted rounded-bl-md'
          )}
        >
          <MessageContent content={message.content} />
        </div>

        {/* Tool calls indicator */}
        {isAssistant && message.tool_calls && message.tool_calls.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {message.tool_calls.map((call, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                <Wrench className="h-3 w-3 mr-1" />
                {formatToolName(call.name)}
              </Badge>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2 mt-1 px-1">
          <span className="text-xs text-muted-foreground">
            {format(new Date(message.created_at), 'h:mm a')}
          </span>

          {/* Actions for assistant messages */}
          {isAssistant && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={handleCopy}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {showFeedback && onFeedback && (
                <>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => onFeedback(message.id, 'positive')}
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
                          className="h-6 w-6"
                          onClick={() => onFeedback(message.id, 'negative')}
                        >
                          <ThumbsDown className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Not helpful</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

function MessageContent({ content }: { content: string }) {
  // Simple markdown-like rendering
  // TODO: Use proper markdown renderer

  const lines = content.split('\n')

  return (
    <div className="text-sm whitespace-pre-wrap break-words">
      {lines.map((line, idx) => {
        // Handle headers
        if (line.startsWith('### ')) {
          return (
            <h4 key={idx} className="font-semibold mt-2 mb-1">
              {line.slice(4)}
            </h4>
          )
        }
        if (line.startsWith('## ')) {
          return (
            <h3 key={idx} className="font-semibold text-base mt-3 mb-1">
              {line.slice(3)}
            </h3>
          )
        }

        // Handle bullet points
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={idx} className="flex gap-2 pl-2">
              <span>•</span>
              <span>{line.slice(2)}</span>
            </div>
          )
        }

        // Handle numbered lists
        const numberedMatch = line.match(/^(\d+)\.\s/)
        if (numberedMatch) {
          return (
            <div key={idx} className="flex gap-2 pl-2">
              <span>{numberedMatch[1]}.</span>
              <span>{line.slice(numberedMatch[0].length)}</span>
            </div>
          )
        }

        // Regular paragraph
        return line ? <p key={idx}>{line}</p> : <br key={idx} />
      })}
    </div>
  )
}

function ToolResultMessage({
  toolName,
  output,
  error,
  timestamp,
}: {
  toolName: string
  output: unknown
  error: string | null
  timestamp: string
}) {
  const isSuccess = !error
  const displayName = formatToolName(toolName)

  return (
    <div className="flex gap-3">
      <div
        className={cn(
          'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
          isSuccess ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
        )}
      >
        {isSuccess ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <XCircle className="h-4 w-4 text-red-600" />
        )}
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">{displayName}</span>
          <Badge variant={isSuccess ? 'default' : 'destructive'} className="text-xs">
            {isSuccess ? 'Completed' : 'Failed'}
          </Badge>
        </div>

        {error ? (
          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
            {error}
          </div>
        ) : output ? (
          <ToolOutput output={output} />
        ) : null}

        <span className="text-xs text-muted-foreground mt-1 block">
          {format(new Date(timestamp), 'h:mm a')}
        </span>
      </div>
    </div>
  )
}

function ToolOutput({ output }: { output: unknown }) {
  // Handle different output types
  if (typeof output === 'string') {
    return (
      <div className="text-sm bg-muted rounded-lg p-3">
        {output}
      </div>
    )
  }

  if (typeof output === 'object' && output !== null) {
    const obj = output as Record<string, unknown>

    // Try to render structured output
    return (
      <div className="bg-muted rounded-lg p-3 space-y-2">
        {Object.entries(obj).map(([key, value]) => {
          // Skip internal fields
          if (key.startsWith('_')) return null

          // Handle arrays
          if (Array.isArray(value)) {
            return (
              <div key={key}>
                <span className="text-xs text-muted-foreground capitalize">
                  {key.replace(/_/g, ' ')}
                </span>
                <ul className="text-sm pl-4 mt-1">
                  {value.slice(0, 5).map((item, idx) => (
                    <li key={idx} className="list-disc list-inside">
                      {typeof item === 'string' ? item : JSON.stringify(item)}
                    </li>
                  ))}
                  {value.length > 5 && (
                    <li className="text-muted-foreground">
                      ...and {value.length - 5} more
                    </li>
                  )}
                </ul>
              </div>
            )
          }

          // Handle simple values
          return (
            <div key={key} className="flex items-start gap-2">
              <span className="text-xs text-muted-foreground capitalize min-w-[80px]">
                {key.replace(/_/g, ' ')}:
              </span>
              <span className="text-sm">
                {typeof value === 'boolean'
                  ? value
                    ? 'Yes'
                    : 'No'
                  : String(value)}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  return null
}

// ============================================================================
// Helpers
// ============================================================================

function formatToolName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
