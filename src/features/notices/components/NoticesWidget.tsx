// File: /src/features/notices/components/NoticesWidget.tsx
// Dashboard widget showing notice summary

import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useNoticeStats, useOverdueNotices, useNoticesDueSoon } from '../hooks'
import {
  Mail,
  AlertTriangle,
  Clock,
  ChevronRight,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NoticesWidgetProps {
  projectId: string | undefined
  className?: string
}

export function NoticesWidget({ projectId, className }: NoticesWidgetProps) {
  const { data: stats, isLoading: statsLoading } = useNoticeStats(projectId)
  const { data: overdueNotices } = useOverdueNotices(projectId)
  const { data: dueSoonNotices } = useNoticesDueSoon(projectId, 7)

  const overdueCount = overdueNotices?.length || 0
  const dueSoonCount = dueSoonNotices?.length || 0

  if (statsLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Notices
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Notices
          </CardTitle>
          <Link to="/notices">
            <Button variant="ghost" size="sm">
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Overdue alert */}
        {overdueCount > 0 && (
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">
              {overdueCount} response{overdueCount !== 1 ? 's' : ''} overdue
            </span>
          </div>
        )}

        {/* Due soon alert */}
        {dueSoonCount > 0 && (
          <div className="flex items-center gap-2 text-orange-600">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">
              {dueSoonCount} due within 7 days
            </span>
          </div>
        )}

        {/* Stats summary */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-gray-600">
            Total Active: <span className="font-medium text-gray-900">{stats?.total || 0}</span>
          </div>
          <div className="text-gray-600">
            Critical: <span className={cn(
              'font-medium',
              (stats?.critical || 0) > 0 ? 'text-red-600' : 'text-gray-900'
            )}>
              {stats?.critical || 0}
            </span>
          </div>
          <div className="text-gray-600">
            Awaiting Response: <span className="font-medium text-gray-900">{stats?.awaitingResponse || 0}</span>
          </div>
          <div className="text-gray-600">
            Sent This Month: <span className="font-medium text-gray-900">{stats?.sentThisMonth || 0}</span>
          </div>
        </div>

        {/* No alerts message */}
        {overdueCount === 0 && dueSoonCount === 0 && (stats?.total || 0) === 0 && (
          <p className="text-sm text-gray-500">No notices for this project</p>
        )}

        {/* Quick action */}
        {projectId && (
          <Link to="/notices" className="block">
            <Button variant="outline" size="sm" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              New Notice
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
