/**
 * Dashboard Stats Component
 * Displays key metrics for the subcontractor dashboard
 */

import { Card, CardContent } from '@/components/ui/card'
import {
  FolderOpen,
  FileText,
  ClipboardList,
  CheckSquare,
  AlertTriangle,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SubcontractorStats } from '@/types/subcontractor-portal'

interface StatCardProps {
  title: string
  value: number
  icon: React.ReactNode
  variant?: 'default' | 'warning' | 'danger'
  description?: string
}

function StatCard({ title, value, icon, variant = 'default', description }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground heading-subsection">{title}</p>
            <p
              className={cn(
                'mt-1 heading-page',
                variant === 'warning' && 'text-warning',
                variant === 'danger' && 'text-destructive'
              )}
            >
              {value}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div
            className={cn(
              'p-3 rounded-full',
              variant === 'default' && 'bg-primary/10 text-primary',
              variant === 'warning' && 'bg-warning/10 text-warning',
              variant === 'danger' && 'bg-destructive/10 text-destructive'
            )}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface DashboardStatsProps {
  stats: SubcontractorStats
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <StatCard
        title="Active Projects"
        value={stats.total_projects}
        icon={<FolderOpen className="h-5 w-5" />}
      />
      <StatCard
        title="Pending Bids"
        value={stats.pending_bids}
        icon={<FileText className="h-5 w-5" />}
        variant={stats.pending_bids > 0 ? 'warning' : 'default'}
        description={stats.pending_bids > 0 ? 'Awaiting your response' : undefined}
      />
      <StatCard
        title="Punch Items"
        value={stats.open_punch_items}
        icon={<ClipboardList className="h-5 w-5" />}
      />
      <StatCard
        title="Open Tasks"
        value={stats.open_tasks}
        icon={<CheckSquare className="h-5 w-5" />}
      />
      <StatCard
        title="Expiring Docs"
        value={stats.expiring_documents}
        icon={<AlertTriangle className="h-5 w-5" />}
        variant={stats.expiring_documents > 0 ? 'warning' : 'default'}
        description={stats.expiring_documents > 0 ? 'Within 30 days' : undefined}
      />
      <StatCard
        title="Overdue Items"
        value={stats.overdue_items}
        icon={<Clock className="h-5 w-5" />}
        variant={stats.overdue_items > 0 ? 'danger' : 'default'}
        description={stats.overdue_items > 0 ? 'Requires attention' : undefined}
      />
    </div>
  )
}

export default DashboardStats
