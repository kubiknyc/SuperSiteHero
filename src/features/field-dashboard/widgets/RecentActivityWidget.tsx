/**
 * Recent Activity Widget
 * Displays latest project updates and activities
 */

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Activity,
  FileText,
  ClipboardCheck,
  HardHat,
  Camera,
  MessageSquare,
  CheckCircle2,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import type { WidgetProps } from '@/types/dashboard'

interface ActivityItem {
  id: string
  type: 'daily_report' | 'punch_item' | 'inspection' | 'safety' | 'photo' | 'rfi'
  title: string
  description: string | null
  created_at: string
  status?: string
}

export function RecentActivityWidget({
  projectId,
  config: _config,
  className,
}: WidgetProps) {
  const navigate = useNavigate()

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['recent-activity', projectId],
    queryFn: async () => {
      // Fetch recent items from multiple tables
      const [
        dailyReports,
        punchItems,
        inspections,
        observations,
      ] = await Promise.all([
        supabase
          .from('daily_reports')
          .select('id, report_date, status, created_at')
          .eq('project_id', projectId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('punch_items')
          .select('id, title, status, created_at')
          .eq('project_id', projectId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('inspections')
          .select('id, inspection_type, status, created_at')
          .eq('project_id', projectId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('safety_observations')
          .select('id, observation_type, status, created_at')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
          .limit(3),
      ])

      const items: ActivityItem[] = []

      // Process daily reports
      dailyReports.data?.forEach((report) => {
        items.push({
          id: report.id,
          type: 'daily_report',
          title: `Daily Report - ${new Date(report.report_date).toLocaleDateString()}`,
          description: null,
          created_at: report.created_at,
          status: report.status,
        })
      })

      // Process punch items
      punchItems.data?.forEach((item) => {
        items.push({
          id: item.id,
          type: 'punch_item',
          title: item.title || 'Punch Item',
          description: null,
          created_at: item.created_at,
          status: item.status,
        })
      })

      // Process inspections
      inspections.data?.forEach((inspection) => {
        items.push({
          id: inspection.id,
          type: 'inspection',
          title: inspection.inspection_type
            ?.replace(/_/g, ' ')
            .replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Inspection',
          description: null,
          created_at: inspection.created_at,
          status: inspection.status,
        })
      })

      // Process safety observations
      observations.data?.forEach((obs) => {
        items.push({
          id: obs.id,
          type: 'safety',
          title: obs.observation_type
            ?.replace(/_/g, ' ')
            .replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Safety Observation',
          description: null,
          created_at: obs.created_at,
          status: obs.status,
        })
      })

      // Sort by created_at and limit to 6
      return items
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 6)
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'daily_report':
        return FileText
      case 'punch_item':
        return ClipboardCheck
      case 'inspection':
        return CheckCircle2
      case 'safety':
        return HardHat
      case 'photo':
        return Camera
      case 'rfi':
        return MessageSquare
      default:
        return Activity
    }
  }

  const getActivityPath = (item: ActivityItem) => {
    switch (item.type) {
      case 'daily_report':
        return `/projects/${projectId}/daily-reports/${item.id}`
      case 'punch_item':
        return `/projects/${projectId}/punch-lists/${item.id}`
      case 'inspection':
        return `/projects/${projectId}/inspections/${item.id}`
      case 'safety':
        return `/projects/${projectId}/safety/observations/${item.id}`
      default:
        return `/projects/${projectId}`
    }
  }

  if (isLoading) {
    return (
      <Card className={cn('h-full', className)}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-28" />
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {activities.length > 0 ? (
          activities.map((item) => {
            const Icon = getActivityIcon(item.type)
            return (
              <button
                key={`${item.type}-${item.id}`}
                onClick={() => navigate(getActivityPath(item))}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </p>
                </div>
                {item.status && (
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    {item.status.replace(/_/g, ' ')}
                  </Badge>
                )}
              </button>
            )
          })
        ) : (
          <div className="text-center py-8">
            <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No recent activity</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
