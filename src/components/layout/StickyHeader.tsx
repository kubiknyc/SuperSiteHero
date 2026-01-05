// File: /src/components/layout/StickyHeader.tsx
// Sticky header with inline stats, search, and action panel trigger
// Part of the v2 desktop layout redesign

import { useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth/AuthContext'
import { GlobalSearchBar } from '@/features/search/components/GlobalSearchBar'
import { useDashboardStats } from '@/features/dashboard/hooks/useDashboardStats'
import {
  ClipboardList,
  AlertCircle,
  ListChecks,
  Shield,
  Bell,
  Settings,
  Search,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface StickyHeaderProps {
  title: string
  subtitle?: string
  projectId?: string
  onActionPanelToggle?: () => void
  actionPanelOpen?: boolean
  showStats?: boolean
  className?: string
}

interface StatItem {
  label: string
  value: string | number
  icon: typeof ClipboardList
  color: string
  bgColor: string
  link: string
  trend?: 'up' | 'down'
  change?: string
}

export function StickyHeader({
  title,
  subtitle,
  projectId,
  onActionPanelToggle,
  actionPanelOpen,
  showStats = true,
  className,
}: StickyHeaderProps) {
  const { userProfile } = useAuth()
  const { data: dashboardStats, isLoading: statsLoading } = useDashboardStats(projectId)
  const [searchOpen, setSearchOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Animate in on mount
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(timer)
  }, [])

  // Build stats from real data
  const stats: StatItem[] = dashboardStats
    ? [
        {
          label: 'Tasks',
          value: dashboardStats.tasks.pending + dashboardStats.tasks.inProgress,
          icon: ClipboardList,
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-50 dark:bg-blue-950',
          link: '/tasks?status=pending',
          trend: 'up',
          change: '+2',
        },
        {
          label: 'RFIs',
          value: dashboardStats.rfis.open + dashboardStats.rfis.pendingResponse,
          icon: AlertCircle,
          color: 'text-amber-600 dark:text-amber-400',
          bgColor: 'bg-amber-50 dark:bg-amber-950',
          link: '/rfis?status=open',
          trend: 'down',
          change: '-1',
        },
        {
          label: 'Punch',
          value: dashboardStats.punchItems.open + dashboardStats.punchItems.inProgress,
          icon: ListChecks,
          color: 'text-purple-600 dark:text-purple-400',
          bgColor: 'bg-purple-50 dark:bg-purple-950',
          link: '/punch-lists?status=open',
          trend: 'up',
          change: '+3',
        },
        {
          label: 'Safe',
          value: `${dashboardStats.safety.daysSinceIncident}d`,
          icon: Shield,
          color: 'text-emerald-600 dark:text-emerald-400',
          bgColor: 'bg-emerald-50 dark:bg-emerald-950',
          link: '/safety',
          trend: 'up',
          change: '+1',
        },
      ]
    : []

  // Get initials for avatar
  const getInitials = () => {
    if (!userProfile) return '??'
    const first = userProfile.first_name?.[0] || ''
    const last = userProfile.last_name?.[0] || ''
    return `${first}${last}`.toUpperCase()
  }

  return (
    <TooltipProvider>
      <header
        className={cn(
          'sticky top-0 z-40',
          'h-16 px-6',
          'flex items-center justify-between gap-4',
          'bg-white/95 dark:bg-gray-900/95',
          'backdrop-blur-md',
          'border-b border-gray-200 dark:border-gray-800',
          'transition-all duration-200',
          className
        )}
      >
        {/* Left section: Title and stats */}
        <div className="flex items-center gap-6 min-w-0">
          {/* Page title */}
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {subtitle}
              </p>
            )}
          </div>

          {/* Inline stats - hidden on smaller screens */}
          {showStats && stats.length > 0 && (
            <div className="hidden lg:flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
              {stats.map((stat, index) => {
                const Icon = stat.icon
                const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown
                return (
                  <Tooltip key={stat.label}>
                    <TooltipTrigger asChild>
                      <Link
                        to={stat.link}
                        className={cn(
                          'flex items-center gap-2.5 px-3 py-2',
                          'bg-white dark:bg-gray-900 rounded-lg',
                          'border border-transparent',
                          'hover:border-primary/50 hover:shadow-sm',
                          'transition-all duration-200',
                          'group',
                          // Staggered animation
                          mounted
                            ? 'opacity-100 translate-y-0'
                            : 'opacity-0 translate-y-2'
                        )}
                        style={{
                          transitionDelay: `${index * 50}ms`,
                        }}
                      >
                        <div
                          className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center',
                            'transition-transform duration-200 group-hover:scale-110',
                            stat.bgColor
                          )}
                        >
                          <Icon className={cn('w-4 h-4', stat.color)} />
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1">
                            <span className="text-base font-bold text-gray-900 dark:text-white leading-none">
                              {statsLoading ? '-' : stat.value}
                            </span>
                            {stat.trend && stat.change && !statsLoading && (
                              <span
                                className={cn(
                                  'flex items-center text-[10px] font-medium',
                                  stat.trend === 'up'
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-rose-600 dark:text-rose-400'
                                )}
                              >
                                <TrendIcon className="w-2.5 h-2.5" />
                                {stat.change}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                            {stat.label}
                          </span>
                        </div>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>View {stat.label}</p>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          )}
        </div>

        {/* Right section: Search, notifications, avatar */}
        <div className="flex items-center gap-2">
          {/* Search trigger */}
          <div className="hidden sm:block">
            <GlobalSearchBar
              projectId={projectId}
              placeholder="Search..."
              compact
              className="w-48 lg:w-56"
            />
          </div>

          {/* Mobile search button */}
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Action panel toggle (notifications) */}
          {onActionPanelToggle && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onActionPanelToggle}
                  className={cn(
                    'relative text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
                    actionPanelOpen && 'bg-gray-100 dark:bg-gray-800'
                  )}
                >
                  <Bell className="h-5 w-5" />
                  {/* Notification badge */}
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-900" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Action Items</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Settings */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                asChild
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <Link to="/settings">
                  <Settings className="h-5 w-5" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Settings</p>
            </TooltipContent>
          </Tooltip>

          {/* User avatar */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/settings/profile"
                className={cn(
                  'w-9 h-9 rounded-lg',
                  'bg-gradient-to-br from-primary to-primary/80',
                  'flex items-center justify-center',
                  'text-white font-semibold text-sm',
                  'hover:shadow-md hover:scale-105',
                  'transition-all duration-150'
                )}
              >
                {getInitials()}
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>
                {userProfile?.first_name} {userProfile?.last_name}
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </header>
    </TooltipProvider>
  )
}
