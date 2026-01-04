/**
 * Global Keyboard Shortcuts Help Overlay
 * Displays all available keyboard shortcuts in a modal dialog
 *
 * Opens with `?` key press globally
 */

import { Fragment, useMemo, useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Keyboard, Search, X, Command, Globe, Zap, Eye, Edit3, HelpCircle } from 'lucide-react'
import {
  type GlobalShortcut,
  type ShortcutCategory,
  formatKeyCombo,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
} from '@/hooks/useGlobalKeyboardShortcuts'

// ============================================================================
// Types
// ============================================================================

interface KeyboardShortcutsHelpProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void
  /** All registered shortcuts */
  shortcuts: GlobalShortcut[]
  /** Shortcuts grouped by category */
  shortcutsByCategory: Record<ShortcutCategory, GlobalShortcut[]>
}

// ============================================================================
// Category Icons
// ============================================================================

const CATEGORY_ICONS: Record<ShortcutCategory, React.ElementType> = {
  navigation: Globe,
  actions: Zap,
  views: Eye,
  editing: Edit3,
  help: HelpCircle,
}

// ============================================================================
// Key Badge Component
// ============================================================================

interface KeyBadgeProps {
  keys: string[]
  className?: string
}

function KeyBadge({ keys, className }: KeyBadgeProps) {
  const formatted = formatKeyCombo(keys)
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)

  // Split for better visual representation
  const keyParts = isMac
    ? formatted.split('')
    : formatted.split('+')

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {keyParts.map((key, index) => (
        <Fragment key={index}>
          <kbd
            className={cn(
              'inline-flex h-6 min-w-[24px] items-center justify-center rounded border',
              'bg-muted px-1.5 font-mono text-xs font-medium text-muted-foreground',
              'border-border shadow-sm'
            )}
          >
            {key}
          </kbd>
          {!isMac && index < keyParts.length - 1 && (
            <span className="text-muted-foreground text-xs">+</span>
          )}
        </Fragment>
      ))}
    </div>
  )
}

// ============================================================================
// Shortcut Row Component
// ============================================================================

interface ShortcutRowProps {
  shortcut: GlobalShortcut
  isHighlighted?: boolean
}

function ShortcutRow({ shortcut, isHighlighted }: ShortcutRowProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between py-2 px-3 rounded-md transition-colors',
        isHighlighted && 'bg-primary/5'
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {shortcut.label}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {shortcut.description}
        </p>
      </div>
      <KeyBadge keys={shortcut.keys} className="ml-4 flex-shrink-0" />
    </div>
  )
}

// ============================================================================
// Category Section Component
// ============================================================================

interface CategorySectionProps {
  category: ShortcutCategory
  shortcuts: GlobalShortcut[]
  searchQuery: string
}

function CategorySection({ category, shortcuts, searchQuery }: CategorySectionProps) {
  const Icon = CATEGORY_ICONS[category]
  const filteredShortcuts = useMemo(() => {
    if (!searchQuery) return shortcuts
    const query = searchQuery.toLowerCase()
    return shortcuts.filter(
      (s) =>
        s.label.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query) ||
        s.keys.some((k) => k.toLowerCase().includes(query))
    )
  }, [shortcuts, searchQuery])

  if (filteredShortcuts.length === 0) return null

  return (
    <div className="mb-6 last:mb-0">
      <div className="flex items-center gap-2 mb-3 px-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {CATEGORY_LABELS[category]}
        </h3>
        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
          {filteredShortcuts.length}
        </Badge>
      </div>
      <div className="space-y-1">
        {filteredShortcuts.map((shortcut) => (
          <ShortcutRow
            key={shortcut.id}
            shortcut={shortcut}
            isHighlighted={
              searchQuery.length > 0 &&
              (shortcut.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                shortcut.keys.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase())))
            }
          />
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function KeyboardShortcutsHelp({
  open,
  onOpenChange,
  shortcuts,
  shortcutsByCategory,
}: KeyboardShortcutsHelpProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // Reset search when dialog opens
  useEffect(() => {
    if (open) {
      setSearchQuery('')
    }
  }, [open])

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onOpenChange(false)
      }
    },
    [onOpenChange]
  )

  // Count total shortcuts
  const totalCount = shortcuts.length

  // Count filtered shortcuts
  const filteredCount = useMemo(() => {
    if (!searchQuery) return totalCount
    const query = searchQuery.toLowerCase()
    return shortcuts.filter(
      (s) =>
        s.label.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query) ||
        s.keys.some((k) => k.toLowerCase().includes(query))
    ).length
  }, [shortcuts, searchQuery, totalCount])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg p-0 gap-0"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Keyboard className="h-5 w-5" />
              Keyboard Shortcuts
            </DialogTitle>
            <Badge variant="outline" className="text-xs">
              {filteredCount} / {totalCount}
            </Badge>
          </div>

          {/* Search Input */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search shortcuts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          <div className="p-4">
            {CATEGORY_ORDER.map((category) => (
              <CategorySection
                key={category}
                category={category}
                shortcuts={shortcutsByCategory[category] || []}
                searchQuery={searchQuery}
              />
            ))}

            {/* No results */}
            {searchQuery && filteredCount === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No shortcuts found for "{searchQuery}"</p>
                <p className="text-xs mt-1">Try a different search term</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/30">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <Command className="h-3 w-3" />
                <span>= {typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform) ? '⌘ Command' : 'Ctrl'}</span>
              </span>
            </div>
            <span>
              Press <KeyBadge keys={['?']} className="inline-flex mx-1" /> anytime to show this
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Quick Shortcut Display (for tooltips/inline)
// ============================================================================

interface QuickShortcutProps {
  keys: string[]
  className?: string
}

export function QuickShortcut({ keys, className }: QuickShortcutProps) {
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-muted-foreground', className)}>
      {keys.map((key, index) => (
        <kbd
          key={index}
          className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border bg-muted px-1 font-mono text-[10px] font-medium"
        >
          {formatKeyCombo([key])}
        </kbd>
      ))}
    </span>
  )
}

// ============================================================================
// Shortcut Hint (for use in buttons/labels)
// ============================================================================

interface ShortcutHintProps {
  keys: string[]
  className?: string
}

export function ShortcutHint({ keys, className }: ShortcutHintProps) {
  return (
    <span className={cn('ml-auto text-muted-foreground opacity-60', className)}>
      <KeyBadge keys={keys} />
    </span>
  )
}

export default KeyboardShortcutsHelp
