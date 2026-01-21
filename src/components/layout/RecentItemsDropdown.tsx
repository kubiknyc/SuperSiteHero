/**
 * RecentItemsDropdown Component
 *
 * Displays recently viewed items in a dropdown menu.
 * Groups items by type for easy navigation.
 *
 * Usage:
 * ```tsx
 * <RecentItemsDropdown />
 * ```
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Clock,
  FolderKanban,
  FileText,
  File,
  CheckSquare,
  HelpCircle,
  Send,
  FileEdit,
  AlertCircle,
  ClipboardCheck,
  ShieldAlert,
  Calendar,
  User,
  X,
  ChevronDown,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useRecentItemsStore,
  type RecentItem,
  type RecentItemType,
  getLabelForType,
} from '@/stores/recent-items-store'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// Icon mapping for item types
const typeIcons: Record<RecentItemType, typeof FolderKanban> = {
  'project': FolderKanban,
  'daily-report': FileText,
  'document': File,
  'task': CheckSquare,
  'rfi': HelpCircle,
  'submittal': Send,
  'change-order': FileEdit,
  'punch-item': AlertCircle,
  'inspection': ClipboardCheck,
  'safety-incident': ShieldAlert,
  'meeting': Calendar,
  'contact': User,
}

interface RecentItemsDropdownProps {
  /** Maximum items to show in dropdown */
  maxItems?: number
  /** Show grouped by type */
  grouped?: boolean
  /** Custom trigger element */
  trigger?: React.ReactNode
  /** Additional class names for trigger */
  triggerClassName?: string
  /** Alignment of dropdown */
  align?: 'start' | 'center' | 'end'
}

export function RecentItemsDropdown({
  maxItems = 10,
  grouped = false,
  trigger,
  triggerClassName,
  align = 'end',
}: RecentItemsDropdownProps) {
  const { items, removeItem, clearAll, getRecentItems } = useRecentItemsStore()
  const [isOpen, setIsOpen] = useState(false)

  const recentItems = getRecentItems(maxItems)
  const hasItems = recentItems.length > 0

  // Format relative time
  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) {return 'Just now'}
    if (minutes < 60) {return `${minutes}m ago`}
    if (hours < 24) {return `${hours}h ago`}
    if (days < 7) {return `${days}d ago`}
    return new Date(timestamp).toLocaleDateString()
  }

  // Group items by type
  const groupedItems = grouped
    ? recentItems.reduce<Record<RecentItemType, RecentItem[]>>((acc, item) => {
        if (!acc[item.type]) {
          acc[item.type] = []
        }
        acc[item.type].push(item)
        return acc
      }, {} as Record<RecentItemType, RecentItem[]>)
    : null

  const defaultTrigger = (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        'flex items-center gap-2 text-muted-foreground hover:text-foreground',
        triggerClassName
      )}
      aria-label="Recent items"
    >
      <Clock className="h-4 w-4" />
      <span className="hidden sm:inline">Recent</span>
      {hasItems && (
        <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
          {items.length}
        </Badge>
      )}
      <ChevronDown className="h-3 w-3 opacity-50" />
    </Button>
  )

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        {trigger || defaultTrigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className="w-80 max-h-[70vh] overflow-y-auto"
      >
        <DropdownMenuLabel className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Recently Viewed
          </span>
          {hasItems && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.preventDefault()
                clearAll()
              }}
              aria-label="Clear all recent items"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {!hasItems ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>No recent items</p>
            <p className="text-xs mt-1">Items you view will appear here</p>
          </div>
        ) : grouped && groupedItems ? (
          // Grouped view
          Object.entries(groupedItems).map(([type, typeItems]) => (
            <DropdownMenuGroup key={type}>
              <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
                {getLabelForType(type as RecentItemType)}s
              </DropdownMenuLabel>
              {typeItems.map((item) => (
                <RecentItemRow
                  key={`${item.type}-${item.id}`}
                  item={item}
                  onRemove={() => removeItem(item.id, item.type)}
                  formatTime={formatRelativeTime}
                  onNavigate={() => setIsOpen(false)}
                />
              ))}
              <DropdownMenuSeparator />
            </DropdownMenuGroup>
          ))
        ) : (
          // Flat list view
          recentItems.map((item) => (
            <RecentItemRow
              key={`${item.type}-${item.id}`}
              item={item}
              onRemove={() => removeItem(item.id, item.type)}
              formatTime={formatRelativeTime}
              onNavigate={() => setIsOpen(false)}
            />
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Individual recent item row
 */
function RecentItemRow({
  item,
  onRemove,
  formatTime,
  onNavigate,
}: {
  item: RecentItem
  onRemove: () => void
  formatTime: (timestamp: number) => string
  onNavigate: () => void
}) {
  const Icon = typeIcons[item.type] || File

  return (
    <DropdownMenuItem asChild className="group cursor-pointer">
      <Link
        to={item.href}
        onClick={onNavigate}
        className="flex items-start gap-3 py-2"
      >
        <div className="flex-shrink-0 mt-0.5">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{item.title}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{getLabelForType(item.type)}</span>
            {item.subtitle && (
              <>
                <span>·</span>
                <span className="truncate">{item.subtitle}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 flex items-center gap-1">
          <span className="text-xs text-muted-foreground">
            {formatTime(item.viewedAt)}
          </span>
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onRemove()
            }}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-opacity"
            aria-label={`Remove ${item.title} from recent items`}
          >
            <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      </Link>
    </DropdownMenuItem>
  )
}

/**
 * Compact version for sidebar
 */
export function RecentItemsCompact({
  maxItems = 5,
  className,
}: {
  maxItems?: number
  className?: string
}) {
  const { getRecentItems, removeItem } = useRecentItemsStore()
  const recentItems = getRecentItems(maxItems)

  if (recentItems.length === 0) {
    return null
  }

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <Clock className="h-3 w-3" />
        Recent
      </div>
      {recentItems.map((item) => {
        const Icon = typeIcons[item.type] || File
        return (
          <Link
            key={`${item.type}-${item.id}`}
            to={item.href}
            className={cn(
              'group flex items-center gap-3 px-3 py-2 rounded-md',
              'text-sm text-muted-foreground hover:text-foreground',
              'hover:bg-accent transition-colors'
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span className="truncate flex-1">{item.title}</span>
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                removeItem(item.id, item.type)
              }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-opacity"
              aria-label={`Remove ${item.title}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Link>
        )
      })}
    </div>
  )
}
