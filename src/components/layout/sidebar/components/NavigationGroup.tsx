// File: src/components/layout/sidebar/components/NavigationGroup.tsx
// Collapsible navigation group with animated expand/collapse

import { memo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ChevronDown, LucideIcon } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { NavigationItem, NavigationItemProps } from './NavigationItem'
import {
  groupContainerVariants,
  groupItemVariants,
  chevronVariants,
  springConfig,
} from '../hooks/useSidebarAnimation'

// ============================================================================
// TYPES
// ============================================================================

export interface NavGroupItem {
  id: string
  path: string
  label: string
  icon: LucideIcon
  badge?: number | (() => number)
  description?: string
}

export interface NavigationGroupProps {
  id: string
  label: string
  icon: LucideIcon
  items: NavGroupItem[]
  isExpanded: boolean
  defaultOpen?: boolean
  onToggle?: (groupId: string, isOpen: boolean) => void
  className?: string
}

// ============================================================================
// GROUP HEADER COMPONENT
// ============================================================================

interface GroupHeaderProps {
  label: string
  icon: LucideIcon
  isExpanded: boolean
  isGroupOpen: boolean
  onToggle: () => void
  itemCount: number
  totalBadges: number
}

const GroupHeader = memo(function GroupHeader({
  label,
  icon: Icon,
  isExpanded,
  isGroupOpen,
  onToggle,
  itemCount,
  totalBadges,
}: GroupHeaderProps) {
  // When sidebar is collapsed, show icon only with tooltip
  if (!isExpanded) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onToggle}
            className={cn(
              'w-full flex items-center justify-center py-2',
              'text-slate-500 hover:text-slate-400',
              'transition-colors duration-150'
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={12}>
          <div className="flex items-center gap-2">
            <span>{label}</span>
            {totalBadges > 0 && (
              <span className="text-xs text-blue-400">({totalBadges})</span>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-full flex items-center justify-between px-3 py-2',
        'font-display text-[11px] font-semibold uppercase tracking-[0.08em]',
        'text-slate-500 hover:text-slate-400',
        'transition-colors duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 rounded'
      )}
      aria-expanded={isGroupOpen}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
        {totalBadges > 0 && (
          <span className="text-[10px] font-mono text-blue-400 tabular-nums">
            {totalBadges}
          </span>
        )}
      </div>
      <motion.div
        variants={chevronVariants}
        initial={false}
        animate={isGroupOpen ? 'expanded' : 'collapsed'}
      >
        <ChevronDown className="h-4 w-4" />
      </motion.div>
    </button>
  )
})

// ============================================================================
// NAVIGATION GROUP COMPONENT
// ============================================================================

const NavigationGroup = memo(function NavigationGroup({
  id,
  label,
  icon,
  items,
  isExpanded,
  defaultOpen = false,
  onToggle,
  className,
}: NavigationGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const handleToggle = useCallback(() => {
    const newState = !isOpen
    setIsOpen(newState)
    onToggle?.(id, newState)
  }, [id, isOpen, onToggle])

  // Calculate total badges for collapsed state
  const totalBadges = items.reduce((sum, item) => {
    const count = typeof item.badge === 'function' ? item.badge() : item.badge
    return sum + (count || 0)
  }, 0)

  return (
    <div className={cn('nav-group', className)} data-group-id={id}>
      {/* Group Header */}
      <GroupHeader
        label={label}
        icon={icon}
        isExpanded={isExpanded}
        isGroupOpen={isOpen}
        onToggle={handleToggle}
        itemCount={items.length}
        totalBadges={totalBadges}
      />

      {/* Group Items - Animated */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            variants={groupContainerVariants}
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-0.5 py-1">
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  variants={groupItemVariants}
                  custom={index}
                >
                  <NavigationItem
                    id={item.id}
                    path={item.path}
                    label={item.label}
                    icon={item.icon}
                    badge={item.badge}
                    description={item.description}
                    isExpanded={isExpanded}
                    isNested
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

NavigationGroup.displayName = 'NavigationGroup'

export { NavigationGroup }
export default NavigationGroup
