// File: /src/features/notices/components/NoticesSummaryCards.tsx
// Summary statistics cards for notices

import { Card, CardContent } from '@/components/ui/card'
import { FileText, AlertTriangle, Clock, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface NoticeStats {
  total: number
  critical: number
  awaitingResponse: number
  overdue: number
  sentThisMonth: number
}

interface NoticesSummaryCardsProps {
  stats?: NoticeStats
  isLoading?: boolean
  className?: string
}

interface StatCardProps {
  title: string
  value: number
  icon: React.ElementType
  iconColor: string
  highlight?: boolean
  onClick?: () => void
}

function StatCard({
  title,
  value,
  icon: Icon,
  iconColor,
  highlight,
  onClick,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer hover:shadow-md transition-shadow',
        highlight && 'border-red-200 bg-red-50'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className={cn(
              'text-2xl font-bold',
              highlight ? 'text-red-600' : 'text-gray-900'
            )}>
              {value}
            </p>
          </div>
          <div className={cn('p-3 rounded-full', iconColor)}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-12" />
          </div>
          <Skeleton className="h-11 w-11 rounded-full" />
        </div>
      </CardContent>
    </Card>
  )
}

export function NoticesSummaryCards({
  stats,
  isLoading,
  className,
}: NoticesSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    )
  }

  const safeStats: NoticeStats = stats || {
    total: 0,
    critical: 0,
    awaitingResponse: 0,
    overdue: 0,
    sentThisMonth: 0,
  }

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
      <StatCard
        title="Total Active"
        value={safeStats.total}
        icon={FileText}
        iconColor="bg-blue-500"
      />
      <StatCard
        title="Awaiting Response"
        value={safeStats.awaitingResponse}
        icon={Clock}
        iconColor="bg-yellow-500"
      />
      <StatCard
        title="Critical"
        value={safeStats.critical}
        icon={AlertTriangle}
        iconColor="bg-red-500"
        highlight={safeStats.critical > 0}
      />
      <StatCard
        title="Sent This Month"
        value={safeStats.sentThisMonth}
        icon={Send}
        iconColor="bg-green-500"
      />
    </div>
  )
}
