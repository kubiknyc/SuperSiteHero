// File: /src/components/layout/StickyHeader.tsx
// Premium sticky header with glass morphism, inline stats, and action panel
// Part of the v2 desktop layout redesign
// Enhanced with Industrial Precision design system

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth/AuthContext'
import { GlobalSearchBar } from '@/features/search/components/GlobalSearchBar'
import { useDashboardStats } from '@/features/dashboard/hooks/useDashboardStats'
import type { LucideIcon } from 'lucide-react'
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
  icon: LucideIcon
  color: string
  iconColor: string
  link: string
  trend?: 'up' | 'down'
  change?: string
}

// Stat skeleton for loading state - enhanced with premium styling
function StatPillSkeleton() {
  return (
    <div className={cn(
      'flex items-center gap-3 px-3.5 py-2.5',
      'bg-white/70 dark:bg-white/[0.04]',
      'rounded-xl',
      'ring-1 ring-gray-200/60 dark:ring-white/[0.06]',
      'shadow-sm'
    )}>
      <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent shimmer" />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="w-8 h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
        <div className="w-12 h-2.5 bg-gray-50 dark:bg-gray-800/60 rounded animate-pulse" />
      </div>
    </div>
  )
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
          color: 'bg-blue-500/10 dark:bg-blue-500/20',
          iconColor: '#3B82F6',
          link: '/tasks?status=pending',
          trend: 'up',
          change: '+2',
        },
        {
          label: 'RFIs',
          value: dashboardStats.rfis.open + dashboardStats.rfis.pendingResponse,
          icon: AlertCircle,
          color: 'bg-amber-500/10 dark:bg-amber-500/20',
          iconColor: '#F59E0B',
          link: '/rfis?status=open',
          trend: 'down',
          change: '-1',
        },
        {
          label: 'Punch',
          value: dashboardStats.punchItems.open + dashboardStats.punchItems.inProgress,
          icon: ListChecks,
          color: 'bg-purple-500/10 dark:bg-purple-500/20',
          iconColor: '#8B5CF6',
          link: '/punch-lists?status=open',
          trend: 'up',
          change: '+3',
        },
        {
          label: 'Safety',
          value: `${dashboardStats.safety.daysSinceIncident}d`,
          icon: Shield,
          color: 'bg-emerald-500/10 dark:bg-emerald-500/20',
          iconColor: '#10B981',
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
          // Position and sizing
          'sticky top-0 z-40',
          'h-[72px] px-6 lg:px-8',
          // Layout
          'flex items-center justify-between gap-8',
          // Premium glass morphism background
          'bg-white/80 dark:bg-slate-900/80',
          'backdrop-blur-xl',
          '[backdrop-filter:blur(20px)_saturate(180%)]',
          // Subtle bottom border with gradient
          'border-b border-gray-200/60 dark:border-white/[0.06]',
          // Layered shadow for depth
          'shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)]',
          'dark:shadow-[0_1px_3px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.15)]',
          // Smooth transitions
          'transition-all duration-200',
          className
        )}
      >
        {/* Subtle top highlight line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/5 to-transparent" />

        {/* Left section: Title and stats */}
        <div className="flex items-center gap-8 min-w-0">
          {/* Page title with refined typography */}
          <div className="min-w-0 flex-shrink-0">
            <h1 className="text-xl font-display font-semibold text-gray-900 dark:text-white truncate tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-gray-500 dark:text-slate-400 truncate font-medium mt-0.5">
                {subtitle}
              </p>
            )}
          </div>

          {/* Vertical divider with gradient */}
          {showStats && (
            <div className="hidden lg:block h-10 w-px bg-gradient-to-b from-transparent via-gray-300 dark:via-slate-600 to-transparent" />
          )}

          {/* Inline stats - hidden on smaller screens */}
          {showStats && (
            <div className="hidden lg:flex items-center gap-2">
              {statsLoading ? (
                // Loading skeletons
                <>
                  <StatPillSkeleton />
                  <StatPillSkeleton />
                  <StatPillSkeleton />
                  <StatPillSkeleton />
                </>
              ) : stats.length > 0 ? (
                // Actual stats with premium styling
                stats.map((stat, index) => {
                  const Icon = stat.icon
                  const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown
                  return (
                    <Tooltip key={stat.label}>
                      <TooltipTrigger asChild>
                        <Link
                          to={stat.link}
                          className={cn(
                            // Premium glass pill style
                            'relative flex items-center gap-3 px-3.5 py-2.5',
                            'bg-white/70 dark:bg-white/[0.04]',
                            'backdrop-blur-md',
                            'rounded-xl',
                            'ring-1 ring-gray-200/60 dark:ring-white/[0.06]',
                            // Layered shadow
                            'shadow-sm',
                            // Hover effects
                            'hover:bg-white/90 dark:hover:bg-white/[0.08]',
                            'hover:ring-gray-300/60 dark:hover:ring-white/[0.12]',
                            'hover:shadow-md hover:-translate-y-0.5',
                            // Focus visible styles for accessibility
                            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2',
                            // Smooth spring transitions
                            'transition-all duration-200',
                            '[transition-timing-function:cubic-bezier(0.32,0.72,0,1)]',
                            'group',
                            // Staggered animation
                            mounted
                              ? 'opacity-100 translate-y-0'
                              : 'opacity-0 translate-y-3'
                          )}
                          style={{
                            transitionDelay: `${index * 50}ms`,
                          }}
                        >
                          {/* Icon with colored background and glow */}
                          <div
                            className={cn(
                              'relative w-9 h-9 rounded-lg flex items-center justify-center',
                              'transition-all duration-200',
                              'group-hover:scale-110 group-hover:rotate-3',
                              stat.color
                            )}
                          >
                            <Icon
                              className="w-4.5 h-4.5 transition-all duration-200"
                              style={{ color: stat.iconColor }}
                            />
                            {/* Subtle glow effect */}
                            <div
                              className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                              style={{
                                boxShadow: `0 0 16px ${stat.iconColor}40`,
                              }}
                            />
                          </div>

                          {/* Value and label */}
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-gray-900 dark:text-white leading-none tabular-nums font-mono">
                                {stat.value}
                              </span>
                              {stat.trend && stat.change && (
                                <span
                                  className={cn(
                                    'flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                                    stat.trend === 'up'
                                      ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-500/20'
                                      : 'text-rose-700 dark:text-rose-400 bg-rose-100/80 dark:bg-rose-500/20'
                                  )}
                                >
                                  <TrendIcon className="w-2.5 h-2.5" />
                                  {stat.change}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
                              {stat.label}
                            </span>
                          </div>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" sideOffset={8} className="font-medium">
                        <p>View {stat.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  )
                })
              ) : null}
            </div>
          )}
        </div>

        {/* Right section: Search, notifications, avatar */}
        <div className="flex items-center gap-3">
          {/* Search trigger with enhanced styling */}
          <div className="hidden sm:block">
            <GlobalSearchBar
              projectId={projectId}
              placeholder="Search..."
              compact
              className="w-52 lg:w-60"
            />
          </div>

          {/* Mobile search button */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'sm:hidden w-10 h-10 rounded-xl',
              'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
              'hover:bg-gray-100/60 dark:hover:bg-white/[0.08]',
              'active:scale-95',
              'transition-all duration-200'
            )}
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Action panel toggle (notifications) with premium badge */}
          {onActionPanelToggle && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onActionPanelToggle}
                  className={cn(
                    'relative w-10 h-10 rounded-xl',
                    'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
                    'hover:bg-gray-100/60 dark:hover:bg-white/[0.08]',
                    'active:scale-95',
                    'transition-all duration-200',
                    actionPanelOpen && 'bg-gray-100/80 dark:bg-white/[0.1] ring-1 ring-gray-200/50 dark:ring-white/10'
                  )}
                >
                  <Bell className="h-5 w-5" />
                  {/* Enhanced notification badge with pulse */}
                  <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 ring-[2px] ring-white dark:ring-slate-900" />
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8} className="font-medium">
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
                className={cn(
                  'w-10 h-10 rounded-xl',
                  'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
                  'hover:bg-gray-100/60 dark:hover:bg-white/[0.08]',
                  'active:scale-95',
                  'transition-all duration-200'
                )}
              >
                <Link to="/settings">
                  <Settings className="h-5 w-5" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={8} className="font-medium">
              <p>Settings</p>
            </TooltipContent>
          </Tooltip>

          {/* User avatar with premium styling */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/settings/profile"
                className={cn(
                  'relative w-10 h-10 rounded-xl',
                  'bg-gradient-to-br from-primary via-primary to-primary/80',
                  'flex items-center justify-center',
                  'text-white font-semibold text-sm',
                  'shadow-md shadow-primary/20',
                  'hover:shadow-lg hover:shadow-primary/30',
                  'hover:scale-105',
                  'active:scale-95',
                  'transition-all duration-200',
                  '[transition-timing-function:cubic-bezier(0.32,0.72,0,1)]',
                  'ring-2 ring-white/20 dark:ring-white/10'
                )}
              >
                {getInitials()}
                {/* Shine effect */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/30 to-transparent pointer-events-none" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={8} className="font-medium">
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
