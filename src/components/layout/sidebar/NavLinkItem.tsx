// File: src/components/layout/sidebar/NavLinkItem.tsx
// Reusable navigation link component for sidebar
// Extracted from CollapsibleSidebarV2 to eliminate code duplication

import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export interface NavItem {
  path: string
  label: string
  icon: LucideIcon
  badge?: number | React.ComponentType
  description?: string
}

interface NavLinkItemProps {
  item: NavItem
  isExpanded: boolean
  /** Whether this is a nested item (smaller sizing) */
  isNested?: boolean
  /** Additional classes for the link container */
  className?: string
}

/**
 * Check if a path is currently active
 */
function useIsPathActive(path: string): boolean {
  const location = useLocation()
  return location.pathname === path || location.pathname.startsWith(path + '/')
}

/**
 * Reusable navigation link component with tooltip support
 * Handles both expanded and collapsed sidebar states
 */
export function NavLinkItem({
  item,
  isExpanded,
  isNested = false,
  className,
}: NavLinkItemProps) {
  const isActive = useIsPathActive(item.path)
  const Icon = item.icon

  const linkContent = (
    <Link
      to={item.path}
      className={cn(
        'relative flex items-center gap-3 rounded-lg font-medium',
        'transition-all duration-200',
        // Sizing based on expanded/nested state
        isExpanded
          ? isNested
            ? 'px-3 py-2 ml-2'
            : 'px-3 py-2.5'
          : 'px-3 py-2.5 justify-center',
        // Active/inactive styling
        isActive
          ? 'bg-slate-800 text-white'
          : 'text-slate-400 hover:text-white hover:bg-slate-800/50',
        className
      )}
    >
      {/* Active indicator line */}
      {isActive && (
        <div
          className={cn(
            'absolute left-0 top-1/2 -translate-y-1/2 w-1 bg-primary rounded-r-full',
            isNested ? 'h-4' : 'h-5'
          )}
        />
      )}

      {/* Icon */}
      <Icon
        className={cn(
          'flex-shrink-0',
          isNested ? 'h-4 w-4' : 'h-5 w-5',
          isActive ? 'text-primary-400' : 'text-slate-500'
        )}
      />

      {/* Label and badge - only when expanded */}
      {isExpanded && (
        <>
          <span className="flex-1 text-sm whitespace-nowrap">{item.label}</span>
          {item.badge !== undefined && (typeof item.badge === 'number' ? item.badge > 0 : true) && (
            <span
              className={cn(
                'px-2 py-0.5 text-xs font-medium rounded-full',
                'bg-primary/20 text-primary-400',
                isNested && 'px-1.5'
              )}
            >
              {typeof item.badge === 'number' ? item.badge : <item.badge />}
            </span>
          )}
        </>
      )}

      {/* Badge dot when collapsed */}
      {!isExpanded && item.badge !== undefined && (typeof item.badge === 'number' ? item.badge > 0 : true) && (
        <span
          className={cn(
            'absolute bg-primary rounded-full',
            isNested ? 'top-1 right-1 w-1.5 h-1.5' : 'top-1.5 right-1.5 w-2 h-2'
          )}
        />
      )}
    </Link>
  )

  // Wrap with tooltip when collapsed
  if (!isExpanded) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={12}>
          <p className="flex items-center gap-2">
            {item.label}
            {item.badge !== undefined && (typeof item.badge === 'number' ? item.badge > 0 : true) && (
              <span className="px-1.5 py-0.5 text-xs bg-primary/20 text-primary-400 rounded">
                {typeof item.badge === 'number' ? item.badge : <item.badge />}
              </span>
            )}
          </p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return linkContent
}

/**
 * Quick action button with optional tooltip
 * Used in sidebar footer for notifications, help, settings
 */
interface QuickActionButtonProps {
  icon: LucideIcon
  label: string
  onClick?: () => void
  href?: string
  isExpanded: boolean
  className?: string
}

export function QuickActionButton({
  icon: Icon,
  label,
  onClick,
  href,
  isExpanded,
  className,
}: QuickActionButtonProps) {
  const buttonClasses = cn(
    'p-2 rounded-lg transition-colors duration-200',
    'text-slate-500 hover:text-white hover:bg-slate-800',
    className
  )

  const content = href ? (
    <Link to={href} className={buttonClasses}>
      <Icon className="h-5 w-5" />
    </Link>
  ) : (
    <button onClick={onClick} className={buttonClasses}>
      <Icon className="h-5 w-5" />
    </button>
  )

  if (!isExpanded) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={12}>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return content
}
