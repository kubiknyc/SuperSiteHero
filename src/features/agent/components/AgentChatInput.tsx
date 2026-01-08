/**
 * Agent Chat Input
 * Text input component with @ mentions and / commands support
 */

import React, { useState, useRef, useCallback, KeyboardEvent } from 'react'
import { Send, Paperclip, Mic } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// ============================================================================
// Types
// ============================================================================

interface AgentChatInputProps {
  onSend: (message: string) => void
  isDisabled?: boolean
  placeholder?: string
}

// ============================================================================
// Component
// ============================================================================

export function AgentChatInput({ onSend, isDisabled, placeholder }: AgentChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = useCallback(() => {
    if (!value.trim() || isDisabled) return

    onSend(value.trim())
    setValue('')

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, isDisabled, onSend])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)

    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`
  }

  return (
    <div className="relative">
      <div className="flex items-end gap-2">
        {/* Input area */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || 'Type a message...'}
            disabled={isDisabled}
            className={cn(
              'min-h-[44px] max-h-[150px] resize-none pr-10',
              'scrollbar-thin scrollbar-thumb-muted-foreground/20',
              isDisabled && 'opacity-50 cursor-not-allowed'
            )}
            rows={1}
          />

          {/* Character indicator for long messages */}
          {value.length > 500 && (
            <span className="absolute bottom-2 right-2 text-xs text-muted-foreground">
              {value.length}/2000
            </span>
          )}
        </div>

        {/* Send button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleSubmit}
                disabled={!value.trim() || isDisabled}
                size="icon"
                className="h-11 w-11 shrink-0"
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

      {/* Helper text */}
      <div className="flex items-center justify-between mt-2 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Press Enter to send, Shift+Enter for new line
          </span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled
                >
                  <Paperclip className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Attach file (coming soon)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Command Suggestions Component
// ============================================================================

interface CommandSuggestion {
  command: string
  description: string
}

const COMMANDS: CommandSuggestion[] = [
  { command: '/summarize', description: 'Summarize a report or time period' },
  { command: '/search', description: 'Search project data' },
  { command: '/route', description: 'Get RFI routing suggestion' },
  { command: '/draft', description: 'Draft an RFI response' },
  { command: '/weekly', description: 'Generate weekly status' },
  { command: '/help', description: 'Show available commands' },
]

export function CommandSuggestions({
  filter,
  onSelect,
}: {
  filter: string
  onSelect: (command: string) => void
}) {
  const filtered = COMMANDS.filter(
    (c) =>
      c.command.toLowerCase().includes(filter.toLowerCase()) ||
      c.description.toLowerCase().includes(filter.toLowerCase())
  )

  if (filtered.length === 0) return null

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-popover border rounded-lg shadow-lg overflow-hidden">
      <div className="p-2 text-xs text-muted-foreground border-b">Commands</div>
      <div className="max-h-[200px] overflow-y-auto">
        {filtered.map((cmd) => (
          <button
            key={cmd.command}
            onClick={() => onSelect(cmd.command)}
            className="w-full px-3 py-2 text-left hover:bg-muted flex items-center justify-between"
          >
            <span className="font-mono text-sm">{cmd.command}</span>
            <span className="text-xs text-muted-foreground">{cmd.description}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
