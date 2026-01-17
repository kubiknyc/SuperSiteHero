// File: src/components/layout/sidebar/components/CommandStrip.tsx
// Top zone of sidebar - search trigger, quick create, and notifications

import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Search, Plus, Bell, Command } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { getQuickCreateActions } from '@/config/navigation-sidebar'
import { searchTriggerVariants, badgeVariants } from '../hooks/useSidebarAnimation'

// ============================================================================
// TYPES
// ============================================================================

export interface CommandStripProps {
  isExpanded: boolean
  onSearchTrigger?: () => void
  notificationCount?: number
  className?: string
}

// ============================================================================
// SEARCH TRIGGER
// ============================================================================

interface SearchTriggerProps {
  isExpanded: boolean
  onTrigger?: () => void
}

const SearchTrigger = memo(function SearchTrigger({
  isExpanded,
  onTrigger,
}: SearchTriggerProps) {
  const content = (
    <motion.button
      variants={searchTriggerVariants}
      initial="idle"
      whileHover="hover"
      whileFocus="focus"
      onClick={onTrigger}
      className={cn(
        'flex items-center gap-2 rounded-lg',
        'text-slate-400 hover:text-slate-300',
        'transition-colors duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        isExpanded
          ? 'w-full px-3 py-2 bg-white/5 hover:bg-white/8'
          : 'p-2.5 hover:bg-white/5'
      )}
    >
      <Search className="h-4 w-4 flex-shrink-0" />
      {isExpanded && (
        <>
          <span className="flex-1 text-left text-sm">Search...</span>
          <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-500 bg-slate-800 rounded">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </>
      )}
    </motion.button>
  )

  if (!isExpanded) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={12}>
          <div className="flex items-center gap-2">
            <span>Search</span>
            <kbd className="text-[10px] font-mono text-slate-400">⌘K</kbd>
          </div>
        </TooltipContent>
      </Tooltip>
    )
  }

  return content
})

// ============================================================================
// QUICK CREATE BUTTON
// ============================================================================

interface QuickCreateProps {
  isExpanded: boolean
}

const QuickCreate = memo(function QuickCreate({ isExpanded }: QuickCreateProps) {
  const navigate = useNavigate()
  const quickActions = getQuickCreateActions()

  const button = (
    <DropdownMenuTrigger asChild>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          'flex items-center justify-center rounded-lg',
          'bg-primary hover:bg-primary/90 text-white',
          'transition-colors duration-150',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          isExpanded ? 'p-2' : 'p-2.5'
        )}
      >
        <Plus className="h-4 w-4" />
      </motion.button>
    </DropdownMenuTrigger>
  )

  return (
    <DropdownMenu>
      {!isExpanded ? (
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={12}>
            Quick Create
          </TooltipContent>
        </Tooltip>
      ) : (
        button
      )}
      <DropdownMenuContent
        side="right"
        align="start"
        sideOffset={8}
        className="w-56"
      >
        <DropdownMenuLabel className="text-xs text-slate-500 uppercase tracking-wider">
          Quick Create
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {quickActions.map((action) => (
          <DropdownMenuItem
            key={action.id}
            onClick={() => navigate(action.path)}
            className="flex items-center gap-3 cursor-pointer"
          >
            <action.icon className="h-4 w-4 text-slate-400" />
            <div className="flex flex-col">
              <span className="text-sm">{action.label}</span>
              {action.description && (
                <span className="text-xs text-slate-500">
                  {action.description}
                </span>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
})

// ============================================================================
// NOTIFICATION BELL
// ============================================================================

interface NotificationBellProps {
  isExpanded: boolean
  count?: number
}

const NotificationBell = memo(function NotificationBell({
  isExpanded,
  count = 0,
}: NotificationBellProps) {
  const navigate = useNavigate()

  const button = (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => navigate('/notifications')}
      className={cn(
        'relative flex items-center justify-center rounded-lg',
        'text-slate-400 hover:text-slate-300 hover:bg-white/5',
        'transition-colors duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        isExpanded ? 'p-2' : 'p-2.5'
      )}
    >
      <Bell className="h-4 w-4" />
      <AnimatePresence>
        {count > 0 && (
          <motion.span
            variants={badgeVariants}
            initial="initial"
            animate="animate"
            exit="initial"
            className={cn(
              'absolute -top-0.5 -right-0.5',
              'min-w-[16px] h-4 px-1',
              'flex items-center justify-center',
              'text-[10px] font-mono font-medium tabular-nums',
              'bg-amber-500 text-slate-900 rounded-full'
            )}
          >
            {count > 99 ? '99+' : count}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )

  if (!isExpanded) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={12}>
          <div className="flex items-center gap-2">
            <span>Notifications</span>
            {count > 0 && (
              <span className="text-xs text-amber-400">({count})</span>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    )
  }

  return button
})

// ============================================================================
// COMMAND STRIP COMPONENT
// ============================================================================

const CommandStrip = memo(function CommandStrip({
  isExpanded,
  onSearchTrigger,
  notificationCount = 0,
  className,
}: CommandStripProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-3',
        'border-b border-white/5',
        isExpanded ? 'flex-row' : 'flex-col',
        className
      )}
    >
      {/* Search Trigger */}
      <div className={cn(isExpanded && 'flex-1')}>
        <SearchTrigger isExpanded={isExpanded} onTrigger={onSearchTrigger} />
      </div>

      {/* Actions */}
      <div className={cn('flex items-center gap-1', !isExpanded && 'flex-col')}>
        <QuickCreate isExpanded={isExpanded} />
        <NotificationBell isExpanded={isExpanded} count={notificationCount} />
      </div>
    </div>
  )
})

CommandStrip.displayName = 'CommandStrip'

export { CommandStrip }
export default CommandStrip
