/**
 * MentionInput Component
 *
 * Rich text input with @mention autocomplete support.
 * Features:
 * - Search users by name as you type @
 * - Display user avatar and name in dropdown
 * - Insert mention as special token [@Name](userId)
 * - Parse mentions on submit
 * - Highlighted mentions in display mode
 */

import { forwardRef, useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Loader2, AtSign, X } from 'lucide-react'
import { useMentions, type MentionUser, type ParsedMention } from '@/hooks/notifications/useMentions'

interface MentionInputProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value' | 'onSubmit'> {
  value: string
  onChange: (value: string) => void
  projectId?: string
  onMention?: (user: MentionUser) => void
  onSubmit?: (value: string, mentions: ParsedMention[]) => void
  showMentionCount?: boolean
  maxMentions?: number
  renderMode?: 'input' | 'display'
}

export const MentionInput = forwardRef<HTMLTextAreaElement, MentionInputProps>(
  ({
    value,
    onChange,
    projectId,
    onMention,
    onSubmit,
    showMentionCount = false,
    maxMentions,
    renderMode = 'input',
    className,
    placeholder = 'Type @ to mention someone...',
    ...props
  }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    const {
      isOpen,
      suggestions,
      selectedIndex,
      isLoading,
      handleInputChange,
      handleKeyDown,
      insertMention,
      setSelectedIndex,
      setIsOpen,
      parseMentions,
      toPlainText,
    } = useMentions({
      projectId,
      onMention,
      maxSuggestions: 8,
    })

    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })

    // Parse current mentions for display
    const currentMentions = useMemo(() => parseMentions(value), [value, parseMentions])

    // Check if max mentions reached
    const maxMentionsReached = maxMentions !== undefined && currentMentions.length >= maxMentions

    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      const cursorPosition = e.target.selectionStart

      // Don't allow new mentions if max reached
      if (maxMentionsReached && newValue.includes('@') && !value.includes('@')) {
        return
      }

      onChange(newValue)
      handleInputChange(newValue, cursorPosition)

      // Calculate dropdown position relative to cursor
      if (textareaRef.current && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect()
        const textareaRect = textareaRef.current.getBoundingClientRect()

        // Simple positioning below the textarea
        setDropdownPosition({
          top: textareaRect.height + 4,
          left: 0,
        })
      }
    }, [onChange, handleInputChange, value, maxMentionsReached])

    const handleKeyDownWrapper = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Handle submit on Ctrl/Cmd + Enter
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && onSubmit) {
        e.preventDefault()
        onSubmit(value, currentMentions)
        return
      }

      const handled = handleKeyDown(e, value, onChange)
      if (!handled && props.onKeyDown) {
        props.onKeyDown(e)
      }
    }, [handleKeyDown, value, onChange, props, onSubmit, currentMentions])

    const handleSuggestionClick = useCallback((user: MentionUser) => {
      const newValue = insertMention(user, value)
      onChange(newValue)
      textareaRef.current?.focus()
    }, [insertMention, value, onChange])

    // Remove a specific mention
    const removeMention = useCallback((mention: ParsedMention) => {
      const newValue = value.slice(0, mention.start_index) + value.slice(mention.end_index)
      onChange(newValue.trim())
    }, [value, onChange])

    // Close dropdown on click outside
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(e.target as Node) &&
          textareaRef.current &&
          !textareaRef.current.contains(e.target as Node)
        ) {
          setIsOpen(false)
        }
      }
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [setIsOpen])

    // Scroll selected item into view
    useEffect(() => {
      if (isOpen && dropdownRef.current) {
        const selectedElement = dropdownRef.current.querySelector('[data-selected="true"]')
        if (selectedElement) {
          selectedElement.scrollIntoView({ block: 'nearest' })
        }
      }
    }, [selectedIndex, isOpen])

    // Display mode - render mentions as highlighted text
    if (renderMode === 'display') {
      return (
        <div className={cn('text-sm', className)}>
          <MentionHighlighter text={value} mentions={currentMentions} />
        </div>
      )
    }

    return (
      <div ref={containerRef} className="relative">
        {/* Mention count and tags */}
        {showMentionCount && currentMentions.length > 0 && (
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <AtSign className="h-3 w-3" />
              {currentMentions.length} mention{currentMentions.length !== 1 ? 's' : ''}
              {maxMentions && ` (max ${maxMentions})`}
            </span>
            <div className="flex gap-1 flex-wrap">
              {currentMentions.map((mention) => (
                <Badge
                  key={mention.id}
                  variant="secondary"
                  className="text-xs gap-1 py-0"
                >
                  @{mention.display_name}
                  <button
                    type="button"
                    onClick={() => removeMention(mention)}
                    className="hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={(el) => {
            textareaRef.current = el
            if (typeof ref === 'function') ref(el)
            else if (ref) ref.current = el
          }}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDownWrapper}
          placeholder={placeholder}
          className={cn(
            'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
            'ring-offset-background placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'resize-none',
            className
          )}
          {...props}
        />

        {/* Suggestions Dropdown */}
        {isOpen && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-72 max-h-64 overflow-auto rounded-md border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95"
            style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
          >
            {/* Loading state */}
            {isLoading && suggestions.length === 0 && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
              </div>
            )}

            {/* No results */}
            {!isLoading && suggestions.length === 0 && (
              <div className="py-4 text-center text-sm text-muted-foreground">
                No users found
              </div>
            )}

            {/* Suggestions list */}
            {suggestions.length > 0 && (
              <div className="p-1">
                {suggestions.map((user, index) => (
                  <button
                    key={user.id}
                    type="button"
                    data-selected={index === selectedIndex}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-sm px-2 py-2 text-left text-sm',
                      'hover:bg-accent hover:text-accent-foreground',
                      'focus:bg-accent focus:text-accent-foreground focus:outline-none',
                      index === selectedIndex && 'bg-accent text-accent-foreground'
                    )}
                    onClick={() => handleSuggestionClick(user)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url} alt={user.display_name} />
                      <AvatarFallback className="text-xs">
                        {user.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{user.display_name}</p>
                      {user.email && (
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      )}
                    </div>
                    {user.score !== undefined && user.score > 0.8 && (
                      <Badge variant="outline" className="text-xs">
                        Recent
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Keyboard hints */}
            <div className="border-t px-2 py-1.5 text-xs text-muted-foreground flex items-center justify-between">
              <span>Use arrow keys to navigate</span>
              <span>Enter to select</span>
            </div>
          </div>
        )}

        {/* Max mentions warning */}
        {maxMentionsReached && (
          <p className="text-xs text-amber-600 mt-1">
            Maximum of {maxMentions} mentions reached
          </p>
        )}
      </div>
    )
  }
)

MentionInput.displayName = 'MentionInput'

/**
 * MentionHighlighter - Renders text with highlighted mentions
 */
interface MentionHighlighterProps {
  text: string
  mentions: ParsedMention[]
  className?: string
  onMentionClick?: (mention: ParsedMention) => void
}

export function MentionHighlighter({
  text,
  mentions,
  className,
  onMentionClick,
}: MentionHighlighterProps) {
  if (mentions.length === 0) {
    return <span className={className}>{text}</span>
  }

  // Sort mentions by start index
  const sortedMentions = [...mentions].sort((a, b) => a.start_index - b.start_index)

  const parts: React.ReactNode[] = []
  let lastIndex = 0

  sortedMentions.forEach((mention, i) => {
    // Add text before mention
    if (mention.start_index > lastIndex) {
      parts.push(
        <span key={`text-${i}`}>
          {text.slice(lastIndex, mention.start_index)}
        </span>
      )
    }

    // Add mention as highlighted link
    parts.push(
      <button
        key={mention.id}
        type="button"
        onClick={() => onMentionClick?.(mention)}
        className={cn(
          'inline-flex items-center px-1 py-0.5 rounded text-primary bg-primary/10',
          'hover:bg-primary/20 transition-colors font-medium',
          onMentionClick && 'cursor-pointer'
        )}
      >
        @{mention.display_name}
      </button>
    )

    lastIndex = mention.end_index
  })

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(
      <span key="text-end">
        {text.slice(lastIndex)}
      </span>
    )
  }

  return <span className={className}>{parts}</span>
}

/**
 * MentionPreview - Preview component for displaying parsed mentions
 */
interface MentionPreviewProps {
  value: string
  className?: string
}

export function MentionPreview({ value, className }: MentionPreviewProps) {
  const { parseMentions, toPlainText } = useMentions()
  const mentions = parseMentions(value)

  return (
    <div className={cn('text-sm', className)}>
      <MentionHighlighter text={value} mentions={mentions} />
    </div>
  )
}

export default MentionInput
