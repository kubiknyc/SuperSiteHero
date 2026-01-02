/**
 * Morning Briefing Widget
 * A comprehensive "My Work Today" summary including:
 * - Today's weather forecast
 * - Tasks due today
 * - Items requiring attention
 * - Recent activity summary
 */

import { Link } from 'react-router-dom'
import { useMorningBriefing, getTimeOfDayGreeting, getPriorityColor } from '../hooks/useMorningBriefing'
import { useProjectWeather } from '../hooks/useWeatherForecast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Wind,
  CloudFog,
  Thermometer,
  Droplets,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ClipboardList,
  FileText,
  AlertCircle,
  ListChecks,
  Calendar,
  User,
  Loader2,
} from 'lucide-react'
import type { WeatherIcon } from '../hooks/useWeatherForecast'

interface MorningBriefingWidgetProps {
  projectId?: string
  className?: string
}

// Weather icon mapping
function WeatherIconComponent({ icon, className }: { icon: WeatherIcon; className?: string }) {
  const iconClass = cn('w-8 h-8', className)
  switch (icon) {
    case 'clear-day':
    case 'clear-night':
      return <Sun className={cn(iconClass, 'text-yellow-500')} />
    case 'partly-cloudy-day':
    case 'partly-cloudy-night':
      return <Cloud className={cn(iconClass, 'text-gray-400')} />
    case 'cloudy':
      return <Cloud className={cn(iconClass, 'text-gray-500')} />
    case 'rain':
    case 'showers':
      return <CloudRain className={cn(iconClass, 'text-blue-500')} />
    case 'snow':
      return <CloudSnow className={cn(iconClass, 'text-blue-300')} />
    case 'thunderstorm':
      return <CloudLightning className={cn(iconClass, 'text-purple-500')} />
    case 'fog':
      return <CloudFog className={cn(iconClass, 'text-gray-400')} />
    case 'wind':
      return <Wind className={cn(iconClass, 'text-gray-500')} />
    default:
      return <Sun className={cn(iconClass, 'text-yellow-500')} />
  }
}

// Item type icon
function ItemTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'task':
      return <ClipboardList className="w-4 h-4 text-blue-600" />
    case 'rfi':
      return <AlertCircle className="w-4 h-4 text-orange-600" />
    case 'submittal':
      return <FileText className="w-4 h-4 text-cyan-600" />
    case 'punch_item':
      return <ListChecks className="w-4 h-4 text-purple-600" />
    case 'change_order':
      return <FileText className="w-4 h-4 text-red-600" />
    default:
      return <ClipboardList className="w-4 h-4 text-gray-600" />
  }
}

export function MorningBriefingWidget({ projectId, className }: MorningBriefingWidgetProps) {
  const { data: briefing, isLoading: briefingLoading } = useMorningBriefing(projectId)
  const { data: weather, isLoading: weatherLoading } = useProjectWeather(projectId)

  const greeting = getTimeOfDayGreeting()
  const isLoading = briefingLoading || weatherLoading

  if (isLoading) {
    return (
      <div className={cn('bg-white rounded-xl border border-slate-200 p-6', className)}>
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="w-16 h-16 rounded-lg" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    )
  }

  const { todaysTasks, itemsDueToday, pendingApprovals, summary } = briefing || {
    todaysTasks: [],
    itemsDueToday: [],
    pendingApprovals: [],
    summary: { totalTasks: 0, overdueItems: 0, pendingApprovalCount: 0, criticalItems: 0 },
  }

  // Combine items for the briefing list
  const allItems = [
    ...itemsDueToday.slice(0, 5),
    ...pendingApprovals.slice(0, 3).map((a) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      dueDate: null,
      projectName: a.projectName,
      priority: a.priority,
      isOverdue: false,
      status: 'pending_approval',
      daysUntilDue: 0,
    })),
  ].slice(0, 8)

  return (
    <div
      className={cn(
        'bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 shadow-sm overflow-hidden',
        className
      )}
    >
      {/* Header with Weather */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-950 dark:to-blue-950 p-6 border-b border-slate-200">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">
              {greeting}!
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>

          {/* Weather Summary */}
          {weather && (
            <div className="flex items-center gap-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur rounded-lg px-4 py-2 shadow-sm">
              <WeatherIconComponent icon={weather.current.icon} className="w-10 h-10" />
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {Math.round(weather.current.temperature)}°
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {weather.current.condition}
                </p>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 ml-2 space-y-1">
                <div className="flex items-center gap-1">
                  <Thermometer className="w-3 h-3" />
                  Feels {Math.round(weather.current.feelsLike)}°
                </div>
                <div className="flex items-center gap-1">
                  <Wind className="w-3 h-3" />
                  {Math.round(weather.current.windSpeed)} mph
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{summary.totalTasks}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400">Tasks Today</p>
          </div>
          <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-3 text-center">
            <p className={cn('text-2xl font-bold', summary.overdueItems > 0 ? 'text-red-600' : 'text-slate-900 dark:text-slate-100')}>
              {summary.overdueItems}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">Overdue</p>
          </div>
          <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-3 text-center">
            <p className={cn('text-2xl font-bold', summary.pendingApprovalCount > 0 ? 'text-orange-600' : 'text-slate-900 dark:text-slate-100')}>
              {summary.pendingApprovalCount}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">Approvals</p>
          </div>
          <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-3 text-center">
            <p className={cn('text-2xl font-bold', summary.criticalItems > 0 ? 'text-red-600' : 'text-slate-900 dark:text-slate-100')}>
              {summary.criticalItems}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">Critical</p>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Today's Focus
          </h3>
          <Link
            to="/tasks"
            className="text-xs text-primary hover:text-primary-600 font-medium flex items-center gap-1"
          >
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {allItems.length > 0 ? (
          <div className="space-y-2">
            {allItems.map((item) => {
              const linkPath = item.type === 'task' ? `/tasks/${item.id}` :
                item.type === 'rfi' ? `/rfis/${item.id}` :
                item.type === 'submittal' ? `/submittals/${item.id}` :
                item.type === 'punch_item' ? `/punch-lists/${item.id}` :
                item.type === 'change_order' ? `/change-orders/${item.id}` :
                '#'

              return (
                <Link
                  key={`${item.type}-${item.id}`}
                  to={linkPath}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                >
                  <div className="flex-shrink-0">
                    <ItemTypeIcon type={item.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate group-hover:text-primary">
                      {item.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {item.projectName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.isOverdue && (
                      <Badge variant="destructive" className="text-[10px]">
                        Overdue
                      </Badge>
                    )}
                    {item.priority && (
                      <Badge
                        variant="outline"
                        className={cn('text-[10px]', getPriorityColor(item.priority))}
                      >
                        {item.priority}
                      </Badge>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-primary" />
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-2" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              You're all caught up!
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No items need your attention today.
            </p>
          </div>
        )}
      </div>

      {/* Weather Alerts (if any) */}
      {weather && weather.alerts.length > 0 && (
        <div className="px-4 pb-4">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Weather Advisory
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                  {weather.alerts[0].description}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MorningBriefingWidget
