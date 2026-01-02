/**
 * Alert System Widget
 * Shows prioritized alerts from multiple sources:
 * - Overdue items (RFIs, submittals, tasks)
 * - Expiring insurance/certifications
 * - Budget warnings
 * - Safety incidents
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAlertSystem, type AlertCategory, type AlertSeverity } from '../hooks/useAlertSystem'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Clock,
  Shield,
  DollarSign,
  FileWarning,
  Calendar,
  ChevronRight,
  Filter,
  CheckCircle2,
  XCircle,
  Building2,
  Info,
  Loader2,
} from 'lucide-react'

interface AlertSystemWidgetProps {
  projectId?: string
  className?: string
  maxItems?: number
}

// Category icons
const categoryIcons: Record<AlertCategory, typeof AlertTriangle> = {
  overdue: Clock,
  expiring: Calendar,
  budget: DollarSign,
  safety: Shield,
  compliance: FileWarning,
  schedule: Calendar,
  weather: AlertCircle,
}

// Category labels
const categoryLabels: Record<AlertCategory, string> = {
  overdue: 'Overdue Items',
  expiring: 'Expiring Soon',
  budget: 'Budget Warnings',
  safety: 'Safety Incidents',
  compliance: 'Compliance',
  schedule: 'Schedule',
  weather: 'Weather',
}

// Severity styles
const severityStyles: Record<AlertSeverity, { bg: string; text: string; icon: string; badge: string }> = {
  critical: {
    bg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
    text: 'text-red-700 dark:text-red-300',
    icon: 'text-red-600 dark:text-red-400',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
    text: 'text-amber-700 dark:text-amber-300',
    icon: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-300',
    icon: 'text-blue-600 dark:text-blue-400',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  },
}

export function AlertSystemWidget({ projectId, className, maxItems = 10 }: AlertSystemWidgetProps) {
  const { data, isLoading, error } = useAlertSystem(projectId)
  const [categoryFilter, setCategoryFilter] = useState<AlertCategory | 'all'>('all')
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'all'>('all')

  if (isLoading) {
    return (
      <div className={cn('bg-white rounded-xl border border-slate-200 p-6', className)}>
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="w-6 h-6 rounded" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('bg-white rounded-xl border border-slate-200 p-6', className)}>
        <div className="text-center py-8">
          <XCircle className="w-10 h-10 mx-auto text-red-500 mb-2" />
          <p className="text-sm text-slate-600 dark:text-slate-400">Failed to load alerts</p>
        </div>
      </div>
    )
  }

  const { alerts, summary } = data || { alerts: [], summary: { total: 0, critical: 0, warning: 0, info: 0, byCategory: {} } }

  // Filter alerts
  let filteredAlerts = alerts
  if (categoryFilter !== 'all') {
    filteredAlerts = filteredAlerts.filter((a) => a.category === categoryFilter)
  }
  if (severityFilter !== 'all') {
    filteredAlerts = filteredAlerts.filter((a) => a.severity === severityFilter)
  }
  filteredAlerts = filteredAlerts.slice(0, maxItems)

  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            {summary.critical > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Alerts
          </h3>
          {summary.total > 0 && (
            <Badge variant="secondary" className="text-xs">
              {summary.total}
            </Badge>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {/* Category Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                <Filter className="w-3 h-3 mr-1" />
                {categoryFilter === 'all' ? 'All' : categoryLabels[categoryFilter]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setCategoryFilter('all')}>
                All Categories
              </DropdownMenuItem>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <DropdownMenuItem key={key} onClick={() => setCategoryFilter(key as AlertCategory)}>
                  {label}
                  {summary.byCategory[key as AlertCategory] > 0 && (
                    <Badge variant="secondary" className="ml-2 text-[10px]">
                      {summary.byCategory[key as AlertCategory]}
                    </Badge>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Summary Bar */}
      {summary.total > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
          {summary.critical > 0 && (
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              <span className="text-xs font-medium text-red-700 dark:text-red-400">
                {summary.critical} Critical
              </span>
            </div>
          )}
          {summary.warning > 0 && (
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                {summary.warning} Warning
              </span>
            </div>
          )}
          {summary.info > 0 && (
            <div className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                {summary.info} Info
              </span>
            </div>
          )}
        </div>
      )}

      {/* Alerts List */}
      <ScrollArea className="h-[300px]">
        <div className="p-3 space-y-2">
          {filteredAlerts.length > 0 ? (
            filteredAlerts.map((alert) => {
              const styles = severityStyles[alert.severity]
              const CategoryIcon = categoryIcons[alert.category]
              const SeverityIcon = alert.severity === 'critical' ? AlertTriangle :
                alert.severity === 'warning' ? AlertCircle : Info

              return (
                <Link
                  key={alert.id}
                  to={alert.link || '#'}
                  className={cn(
                    'block p-3 rounded-lg border transition-all hover:shadow-sm group',
                    styles.bg
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Severity Icon */}
                    <div className={cn('mt-0.5 flex-shrink-0', styles.icon)}>
                      <SeverityIcon className="w-5 h-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn('text-sm font-semibold', styles.text)}>
                          {alert.title}
                        </span>
                        <Badge className={cn('text-[10px]', styles.badge)}>
                          {alert.category.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className={cn('text-xs line-clamp-2', styles.text.replace('700', '600'))}>
                        {alert.message}
                      </p>

                      {/* Meta info */}
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
                        {alert.projectName && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {alert.projectName}
                          </span>
                        )}
                        {alert.daysOverdue !== undefined && alert.daysOverdue > 0 && (
                          <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                            <Clock className="w-3 h-3" />
                            {alert.daysOverdue} days overdue
                          </span>
                        )}
                        {alert.daysUntilDue !== undefined && alert.daysUntilDue > 0 && (
                          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                            <Calendar className="w-3 h-3" />
                            {alert.daysUntilDue} days left
                          </span>
                        )}
                        {alert.value !== undefined && (
                          <span className="flex items-center gap-1 font-medium">
                            <DollarSign className="w-3 h-3" />
                            ${Math.abs(alert.value).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
                  </div>
                </Link>
              )
            })
          ) : (
            <div className="text-center py-12">
              <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-3" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                No Active Alerts
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                All systems are operating normally.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      {alerts.length > maxItems && (
        <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <Link
            to="/alerts"
            className="text-sm text-primary hover:text-primary-600 font-medium flex items-center justify-center gap-1"
          >
            View all {summary.total} alerts
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  )
}

export default AlertSystemWidget
