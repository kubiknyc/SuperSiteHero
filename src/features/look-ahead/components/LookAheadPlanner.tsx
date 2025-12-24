/**
 * LookAheadPlanner Component
 * Main 3-week look-ahead planning view
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Select,
  Input,
} from '@/components/ui'
import {
  Calendar,
  RefreshCw,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react'
import { WeekColumn } from './WeekColumn'
import {
  useActivitiesByWeek,
  usePPCMetrics,
  useProjectOpenConstraints,
} from '../hooks/useLookAhead'
import type {
  LookAheadActivityWithDetails,
  ConstructionTrade,
  LookAheadActivityStatus,
} from '@/types/look-ahead'
import { CONSTRUCTION_TRADES, ACTIVITY_STATUS_CONFIG } from '@/types/look-ahead'

interface LookAheadPlannerProps {
  projectId: string
  onActivityClick?: (activity: LookAheadActivityWithDetails) => void
  onAddActivity?: (weekNumber: number) => void
  className?: string
}

export function LookAheadPlanner({
  projectId,
  onActivityClick,
  onAddActivity,
  className,
}: LookAheadPlannerProps) {
  const [baseDate, setBaseDate] = useState(() => new Date())
  const [tradeFilter, setTradeFilter] = useState<ConstructionTrade | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<LookAheadActivityStatus | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Queries
  const {
    data: weekData,
    isLoading: activitiesLoading,
    refetch,
  } = useActivitiesByWeek(projectId, baseDate)
  const { data: ppcMetrics } = usePPCMetrics(projectId)
  const { data: openConstraints } = useProjectOpenConstraints(projectId)

  // Navigate weeks
  const goToPreviousWeek = () => {
    setBaseDate((prev) => {
      const newDate = new Date(prev)
      newDate.setDate(newDate.getDate() - 7)
      return newDate
    })
  }

  const goToNextWeek = () => {
    setBaseDate((prev) => {
      const newDate = new Date(prev)
      newDate.setDate(newDate.getDate() + 7)
      return newDate
    })
  }

  const goToToday = () => {
    setBaseDate(new Date())
  }

  // Filter activities
  const filterActivities = (activities: LookAheadActivityWithDetails[]) => {
    return activities.filter((activity) => {
      const tradeMatch = tradeFilter === 'all' || activity.trade === tradeFilter
      const statusMatch = statusFilter === 'all' || activity.status === statusFilter
      const searchMatch =
        !searchTerm ||
        activity.activity_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.subcontractor_name?.toLowerCase().includes(searchTerm.toLowerCase())

      return tradeMatch && statusMatch && searchMatch
    })
  }

  const weeks = weekData?.weeks || []
  const activities = weekData?.activities || { 1: [], 2: [], 3: [] }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with PPC Metrics */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              3-Week Look-Ahead Schedule
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* PPC Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-sm text-primary font-medium">Current PPC</div>
              <div className="text-2xl font-bold text-primary-hover">
                {ppcMetrics?.currentWeekPPC || 0}%
              </div>
              {ppcMetrics?.ppcChange !== undefined && ppcMetrics.ppcChange !== 0 && (
                <div
                  className={cn(
                    'flex items-center gap-1 text-xs mt-1',
                    ppcMetrics.ppcChange > 0 ? 'text-success' : 'text-error'
                  )}
                >
                  <TrendingUp
                    className={cn('w-3 h-3', ppcMetrics.ppcChange < 0 && 'rotate-180')}
                  />
                  {Math.abs(ppcMetrics.ppcChange)}% vs last week
                </div>
              )}
            </div>
            <div className="bg-success-light rounded-lg p-3">
              <div className="text-sm text-success font-medium">Completed</div>
              <div className="text-2xl font-bold text-success-dark">
                {ppcMetrics?.totalCompleted || 0}
              </div>
              <div className="text-xs text-success mt-1">activities</div>
            </div>
            <div className="bg-warning-light rounded-lg p-3">
              <div className="text-sm text-warning font-medium">In Progress</div>
              <div className="text-2xl font-bold text-yellow-700">
                {ppcMetrics?.totalPlanned || 0}
              </div>
              <div className="text-xs text-warning mt-1">planned activities</div>
            </div>
            <div className="bg-error-light rounded-lg p-3">
              <div className="text-sm text-error font-medium">Open Constraints</div>
              <div className="text-2xl font-bold text-error-dark">
                {openConstraints?.length || 0}
              </div>
              {openConstraints && openConstraints.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-error mt-1">
                  <AlertTriangle className="w-3 h-3" />
                  Needs attention
                </div>
              )}
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-3 p-3 bg-surface rounded-lg">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted" />
              <span className="text-sm text-secondary font-medium">Filters:</span>
            </div>
            <Select
              value={tradeFilter}
              onChange={(e) => setTradeFilter(e.target.value as ConstructionTrade | 'all')}
              className="w-40"
            >
              <option value="all">All Trades</option>
              {CONSTRUCTION_TRADES.map((trade) => (
                <option key={trade} value={trade}>
                  {trade}
                </option>
              ))}
            </Select>
            <Select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as LookAheadActivityStatus | 'all')
              }
              className="w-40"
            >
              <option value="all">All Statuses</option>
              {Object.entries(ACTIVITY_STATUS_CONFIG).map(([status, config]) => (
                <option key={status} value={status}>
                  {config.label}
                </option>
              ))}
            </Select>
            <Input
              type="text"
              placeholder="Search activities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48"
            />
          </div>
        </CardContent>
      </Card>

      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={goToNextWeek}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="text-sm text-secondary">
          Showing {weeks.length > 0 ? formatDateRange(weeks[0], weeks[weeks.length - 1]) : ''}
        </div>
      </div>

      {/* 3-Week Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {weeks.map((week) => (
          <WeekColumn
            key={week.weekNumber}
            week={week}
            activities={filterActivities(activities[week.weekNumber] || [])}
            isLoading={activitiesLoading}
            onAddActivity={() => onAddActivity?.(week.weekNumber)}
            onActivityClick={onActivityClick}
          />
        ))}
      </div>
    </div>
  )
}

function formatDateRange(
  startWeek: { weekStart: Date },
  endWeek: { weekEnd: Date }
): string {
  const start = startWeek.weekStart.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
  const end = endWeek.weekEnd.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `${start} - ${end}`
}
