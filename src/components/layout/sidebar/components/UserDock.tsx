// File: src/components/layout/sidebar/components/UserDock.tsx
// Footer zone of sidebar - user profile, settings, and portal links

import { memo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Settings,
  LogOut,
  UserCog,
  ChevronRight,
  HardHat,
  Briefcase,
  Moon,
  Sun,
  ExternalLink,
} from 'lucide-react'
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
import { userDockVariants } from '../hooks/useSidebarAnimation'

// ============================================================================
// TYPES
// ============================================================================

export interface UserDockProps {
  isExpanded: boolean
  user?: {
    name: string
    email: string
    role: string
    avatarUrl?: string
  }
  isAdmin?: boolean
  isDarkMode?: boolean
  onThemeToggle?: () => void
  onLogout?: () => void
  className?: string
}

// ============================================================================
// USER AVATAR
// ============================================================================

interface UserAvatarProps {
  name: string
  avatarUrl?: string
  size?: 'sm' | 'md'
}

const UserAvatar = memo(function UserAvatar({
  name,
  avatarUrl,
  size = 'md',
}: UserAvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 text-sm',
  }

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={cn(
          'rounded-lg object-cover',
          sizeClasses[size]
        )}
      />
    )
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-lg',
        'bg-blue-500/15 text-blue-400 font-display font-semibold',
        sizeClasses[size]
      )}
    >
      {initials}
    </div>
  )
})

// ============================================================================
// PORTAL LINKS
// ============================================================================

interface PortalLinksProps {
  isExpanded: boolean
}

const PortalLinks = memo(function PortalLinks({ isExpanded }: PortalLinksProps) {
  const portals = [
    {
      id: 'subcontractor-portal',
      label: 'Subcontractor Portal',
      path: '/sub',
      icon: HardHat,
    },
    {
      id: 'client-portal',
      label: 'Client Portal',
      path: '/client',
      icon: Briefcase,
    },
  ]

  if (!isExpanded) {
    return (
      <div className="flex flex-col gap-1">
        {portals.map((portal) => (
          <Tooltip key={portal.id}>
            <TooltipTrigger asChild>
              <Link
                to={portal.path}
                className={cn(
                  'flex items-center justify-center p-2 rounded-lg',
                  'text-slate-500 hover:text-slate-400 hover:bg-white/5',
                  'transition-colors duration-150'
                )}
              >
                <portal.icon className="h-4 w-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12}>
              {portal.label}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1 pt-2 border-t border-white/5">
      {portals.map((portal) => (
        <Link
          key={portal.id}
          to={portal.path}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg',
            'text-sm text-slate-500 hover:text-slate-400 hover:bg-white/5',
            'transition-colors duration-150'
          )}
        >
          <portal.icon className="h-4 w-4" />
          <span className="flex-1">{portal.label}</span>
          <ExternalLink className="h-3 w-3" />
        </Link>
      ))}
    </div>
  )
})

// ============================================================================
// USER DOCK COMPONENT
// ============================================================================

const UserDock = memo(function UserDock({
  isExpanded,
  user = {
    name: 'John Doe',
    email: 'john@example.com',
    role: 'Superintendent',
  },
  isAdmin = false,
  isDarkMode = true,
  onThemeToggle,
  onLogout,
  className,
}: UserDockProps) {
  const navigate = useNavigate()

  // User menu content
  const userMenuContent = (
    <DropdownMenuContent
      side={isExpanded ? 'top' : 'right'}
      align={isExpanded ? 'start' : 'start'}
      sideOffset={8}
      className="w-56"
    >
      <DropdownMenuLabel className="font-normal">
        <div className="flex flex-col space-y-1">
          <p className="text-sm font-medium">{user.name}</p>
          <p className="text-xs text-slate-500">{user.email}</p>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />

      <DropdownMenuItem
        onClick={() => navigate('/settings')}
        className="cursor-pointer"
      >
        <Settings className="mr-2 h-4 w-4" />
        Settings
      </DropdownMenuItem>

      {isAdmin && (
        <DropdownMenuItem
          onClick={() => navigate('/admin')}
          className="cursor-pointer"
        >
          <UserCog className="mr-2 h-4 w-4" />
          Admin Panel
        </DropdownMenuItem>
      )}

      <DropdownMenuItem onClick={onThemeToggle} className="cursor-pointer">
        {isDarkMode ? (
          <>
            <Sun className="mr-2 h-4 w-4" />
            Light Mode
          </>
        ) : (
          <>
            <Moon className="mr-2 h-4 w-4" />
            Dark Mode
          </>
        )}
      </DropdownMenuItem>

      <DropdownMenuSeparator />

      <DropdownMenuItem
        onClick={onLogout}
        className="cursor-pointer text-red-400 focus:text-red-400"
      >
        <LogOut className="mr-2 h-4 w-4" />
        Log out
      </DropdownMenuItem>
    </DropdownMenuContent>
  )

  // Collapsed state
  if (!isExpanded) {
    return (
      <div
        className={cn(
          'flex flex-col items-center gap-2 px-3 py-3',
          'border-t border-white/5',
          className
        )}
      >
        {/* Portal Links */}
        <PortalLinks isExpanded={false} />

        {/* Divider */}
        <div className="w-6 h-px bg-white/5 my-1" />

        {/* User Menu */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button className="focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 rounded-lg">
                  <UserAvatar
                    name={user.name}
                    avatarUrl={user.avatarUrl}
                    size="sm"
                  />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12}>
              {user.name}
            </TooltipContent>
          </Tooltip>
          {userMenuContent}
        </DropdownMenu>
      </div>
    )
  }

  // Expanded state
  return (
    <motion.div
      variants={userDockVariants}
      initial="collapsed"
      animate="expanded"
      className={cn(
        'flex flex-col gap-2 px-3 py-3',
        'border-t border-white/5',
        className
      )}
    >
      {/* Portal Links */}
      <PortalLinks isExpanded={true} />

      {/* User Profile */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              'flex items-center gap-3 w-full px-2 py-2 rounded-lg',
              'hover:bg-white/5 transition-colors duration-150',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50'
            )}
          >
            <UserAvatar name={user.name} avatarUrl={user.avatarUrl} />
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-slate-200 truncate">
                {user.name}
              </p>
              <p className="text-xs text-slate-500 truncate">{user.role}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </button>
        </DropdownMenuTrigger>
        {userMenuContent}
      </DropdownMenu>
    </motion.div>
  )
})

UserDock.displayName = 'UserDock'

export { UserDock }
export default UserDock
