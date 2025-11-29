// File: /src/features/notices/components/NoticesList.tsx
// List view of notices with cards

import { FileText } from 'lucide-react'
import { NoticeCard } from './NoticeCard'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import type { Notice } from '../types'

interface NoticesListProps {
  notices: Notice[]
  isLoading?: boolean
  emptyMessage?: string
}

function NoticeCardSkeleton() {
  return (
    <Card className="p-4 border-l-4 border-l-gray-200">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-9 w-20" />
      </div>
    </Card>
  )
}

export function NoticesList({
  notices,
  isLoading,
  emptyMessage = 'No notices found',
}: NoticesListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <NoticeCardSkeleton />
        <NoticeCardSkeleton />
        <NoticeCardSkeleton />
      </div>
    )
  }

  if (notices.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {notices.map((notice) => (
        <NoticeCard key={notice.id} notice={notice} />
      ))}
    </div>
  )
}
