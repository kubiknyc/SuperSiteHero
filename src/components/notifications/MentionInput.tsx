/**
 * MentionInput Component
 * 
 * Input field with @mention autocomplete support
 */

import { forwardRef, useState, useCallback, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useMentions, type MentionUser } from '@/hooks/notifications/useMentions'

interface MentionInputProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string
  onChange: (value: string) => void
  projectId?: string
  onMention?: (user: MentionUser) => void
}

export const MentionInput = forwardRef<HTMLTextAreaElement, MentionInputProps>(
  ({ value, onChange, projectId, onMention, className, ...props }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)
    
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
    } = useMentions({ projectId, onMention })

    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })

    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      const cursorPosition = e.target.selectionStart
      onChange(newValue)
      handleInputChange(newValue, cursorPosition)

      // Calculate dropdown position
      if (textareaRef.current) {
        const rect = textareaRef.current.getBoundingClientRect()
        setDropdownPosition({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
        })
      }
    }, [onChange, handleInputChange])

    const handleKeyDownWrapper = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const handled = handleKeyDown(e, value, onChange)
      if (!handled && props.onKeyDown) {
        props.onKeyDown(e)
      }
    }, [handleKeyDown, value, onChange, props])

    const handleSuggestionClick = useCallback((user: MentionUser) => {
      const newValue = insertMention(user, value)
      onChange(newValue)
      textareaRef.current?.focus()
    }, [insertMention, value, onChange])

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

    return (
      <div className="relative">
        <textarea
          ref={(el) => {
            textareaRef.current = el
            if (typeof ref === 'function') ref(el)
            else if (ref) ref.current = el
          }}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDownWrapper}
          className={cn(
            'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
            'ring-offset-background placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          {...props}
        />

        {isOpen && suggestions.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-64 max-h-48 overflow-auto rounded-md border bg-popover p-1 shadow-md"
            style={{ top: '100%', left: 0, marginTop: 4 }}
          >
            {suggestions.map((user, index) => (
              <button
                key={user.id}
                type="button"
                className={cn(
                  'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-left',
                  'hover:bg-accent hover:text-accent-foreground',
                  index === selectedIndex && 'bg-accent text-accent-foreground'
                )}
                onClick={() => handleSuggestionClick(user)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {user.display_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{user.display_name}</p>
                  {user.email && (
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  )}
                </div>
              </button>
            ))}
            {isLoading && (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading...</div>
            )}
          </div>
        )}
      </div>
    )
  }
)

MentionInput.displayName = 'MentionInput'

export default MentionInput
