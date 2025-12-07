/**
 * EmojiPicker Component
 *
 * Full emoji picker for message input and reactions:
 * - Search functionality
 * - Category navigation
 * - Recent emojis
 * - Skin tone selector
 */

import { useState, useCallback, lazy, Suspense } from 'react'
import { Smile, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

// Lazy load emoji picker for better initial bundle size
const Picker = lazy(() => import('emoji-picker-react'))

export interface EmojiClickData {
  emoji: string
  names: string[]
  unified: string
}

interface EmojiPickerProps {
  /** Callback when an emoji is selected */
  onEmojiSelect: (emoji: string) => void
  /** Custom trigger element (defaults to smile icon button) */
  trigger?: React.ReactNode
  /** Position of the popover */
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** Alignment of the popover */
  align?: 'start' | 'center' | 'end'
  /** Additional CSS classes for the trigger button */
  className?: string
  /** Whether the picker is disabled */
  disabled?: boolean
}

export function EmojiPicker({
  onEmojiSelect,
  trigger,
  side = 'top',
  align = 'end',
  className,
  disabled = false,
}: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleEmojiClick = useCallback(
    (emojiData: EmojiClickData) => {
      onEmojiSelect(emojiData.emoji)
      setIsOpen(false)
    },
    [onEmojiSelect]
  )

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8', className)}
            disabled={disabled}
          >
            <Smile className="h-5 w-5 text-muted-foreground" />
            <span className="sr-only">Add emoji</span>
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        className="w-auto p-0 border-none"
      >
        <Suspense
          fallback={
            <div className="flex items-center justify-center w-[350px] h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <Picker
            onEmojiClick={handleEmojiClick}
            width={350}
            height={400}
            searchPlaceholder="Search emojis..."
            previewConfig={{ showPreview: false }}
            lazyLoadEmojis
          />
        </Suspense>
      </PopoverContent>
    </Popover>
  )
}

/**
 * Quick emoji reactions component
 * Shows a row of common reaction emojis
 */
interface QuickReactionsProps {
  /** Callback when an emoji is selected */
  onSelect: (emoji: string) => void
  /** Additional CSS classes */
  className?: string
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '🔥']

export function QuickReactions({ onSelect, className }: QuickReactionsProps) {
  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {QUICK_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onSelect(emoji)}
          className="p-1.5 hover:bg-muted rounded transition-colors text-lg leading-none"
          title={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  )
}

/**
 * Combined emoji picker with quick reactions
 * Shows quick reactions + "more" button to open full picker
 */
interface EmojiReactionPickerProps {
  /** Callback when an emoji is selected */
  onSelect: (emoji: string) => void
  /** Additional CSS classes */
  className?: string
}

export function EmojiReactionPicker({ onSelect, className }: EmojiReactionPickerProps) {
  return (
    <div className={cn('flex items-center gap-1 p-1', className)}>
      <QuickReactions onSelect={onSelect} />
      <div className="w-px h-6 bg-border mx-1" />
      <EmojiPicker
        onEmojiSelect={onSelect}
        side="top"
        align="end"
        trigger={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
          >
            More
          </Button>
        }
      />
    </div>
  )
}
