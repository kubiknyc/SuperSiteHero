// File: src/components/layout/sidebar/components/NavigationItem.tsx
// Individual navigation item with active state, animations, and tooltips

import { memo, forwardRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { LucideIcon } from 'lucide-react'
import {
  activeIndicatorVariants,
  iconVariants,
  badgeVariants,
} from '../hooks/useSidebarAnimation'

// ============================================================================
// TYPES
// ============================================================================

export interface NavigationItemProps {
  id: string
  path: string
  label: string
  icon: LucideIcon
  badge?: number | (() => number)
  description?: string
  isExpanded: boolean
  isNested?: boolean
  className?: string
  onClick?: () => void
}

// ============================================================================
// BADGE COMPONENT
// ============================================================================

interface BadgeProps {
  count: number
  isUrgent?: boolean
}

const Badge = memo(function Badge({ count, isUrgent = false }: BadgeProps) {
  if (count <= 0) {
    return null
  }

  return (
    <motion.span
      variants={badgeVariants}
      initial="initial"
      animate="animate"
      className={cn(
        'flex-shrink-0 min-w-[18px] h-[18px] px-[5px]',
        'flex items-center justify-center',
        'font-mono text-[10px] font-medium tabular-nums',
        'rounded-[9px]',
        isUrgent
          ? 'bg-amber-500 text-slate-900'
          : 'bg-blue-500/15 text-blue-400 dark:bg-blue-400/15 dark:text-blue-300'
      )}
    >
      {count > 99 ? '99+' : count}
    </motion.span>
  )
})

// ============================================================================
// NAVIGATION ITEM COMPONENT
// ============================================================================

const NavigationItem = memo(
  forwardRef<HTMLAnchorElement, NavigationItemProps>(function NavigationItem(
    {
      id: _id,
      path,
      label,
      icon: Icon,
      badge,
      description: _description,
      isExpanded,
      isNested = false,
      className,
      onClick,
    },
    ref
  ) {
    const location = useLocation()
    const isActive = location.pathname === path || location.pathname.startsWith(`${path}/`)

    // Resolve badge count if it's a function
    const badgeCount = typeof badge === 'function' ? badge() : badge

    // Link content (shared between tooltip and regular render)
    const linkContent = (
      <Link
        ref={ref}
        to={path}
        onClick={onClick}
        className={cn(
          'relative flex items-center gap-3 rounded-lg font-medium',
          'transition-colors duration-150',
          isExpanded ? 'px-3 py-2.5' : 'px-3 py-2.5 justify-center',
          isNested && isExpanded && 'pl-5',
          isActive
            ? 'bg-blue-500/10 text-slate-50 dark:bg-blue-400/15'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5',
          className
        )}
        data-active={isActive}
        data-nested={isNested}
      >
        {/* Active indicator bar */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              variants={activeIndicatorVariants}
              initial="inactive"
              animate="active"
              exit="inactive"
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-500 rounded-r-full origin-center"
            />
          )}
        </AnimatePresence>

        {/* Icon */}
        <motion.div
          variants={iconVariants}
          initial="idle"
          whileHover="hover"
          animate={isActive ? 'active' : 'idle'}
          className="flex-shrink-0"
        >
          <Icon
            className={cn(
              'h-5 w-5 transition-colors duration-150',
              isActive ? 'text-blue-400' : 'text-slate-500'
            )}
          />
        </motion.div>

        {/* Label (hidden when collapsed) */}
        {isExpanded && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.08, duration: 0.15 }}
            className="flex-1 text-sm whitespace-nowrap overflow-hidden text-ellipsis"
          >
            {label}
          </motion.span>
        )}

        {/* Badge (hidden when collapsed) */}
        {isExpanded && badgeCount !== undefined && badgeCount > 0 && (
          <Badge count={badgeCount} isUrgent={badgeCount > 10} />
        )}
      </Link>
    )

    // When collapsed, wrap in tooltip
    if (!isExpanded) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent
            side="right"
            sideOffset={12}
            className="flex items-center gap-2"
          >
            <span>{label}</span>
            {badgeCount !== undefined && badgeCount > 0 && (
              <span className="text-xs text-blue-400">({badgeCount})</span>
            )}
          </TooltipContent>
        </Tooltip>
      )
    }

    return linkContent
  })
)

NavigationItem.displayName = 'NavigationItem'

export { NavigationItem }
export default NavigationItem
