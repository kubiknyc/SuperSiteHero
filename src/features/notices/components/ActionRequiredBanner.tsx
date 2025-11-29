// File: /src/features/notices/components/ActionRequiredBanner.tsx
// Banner showing overdue and upcoming response notices

import { AlertTriangle, Clock, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ActionRequiredBannerProps {
  overdueCount: number
  dueSoonCount: number
  onViewOverdue?: () => void
  onViewDueSoon?: () => void
  className?: string
}

export function ActionRequiredBanner({
  overdueCount,
  dueSoonCount,
  onViewOverdue,
  onViewDueSoon,
  className,
}: ActionRequiredBannerProps) {
  // Don't show if nothing requires action
  if (overdueCount === 0 && dueSoonCount === 0) {
    return null
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Overdue banner - red, prominent */}
      {overdueCount > 0 && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-full">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="font-medium text-red-800">
                {overdueCount} {overdueCount === 1 ? 'Response' : 'Responses'} Overdue
              </p>
              <p className="text-sm text-red-600">
                These notices have passed their response due date
              </p>
            </div>
          </div>
          {onViewOverdue && (
            <Button
              variant="outline"
              size="sm"
              onClick={onViewOverdue}
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              View All
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      )}

      {/* Due soon banner - orange/yellow, less prominent */}
      {dueSoonCount > 0 && (
        <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-full">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="font-medium text-orange-800">
                {dueSoonCount} {dueSoonCount === 1 ? 'Response' : 'Responses'} Due Within 7 Days
              </p>
              <p className="text-sm text-orange-600">
                Action needed to meet upcoming deadlines
              </p>
            </div>
          </div>
          {onViewDueSoon && (
            <Button
              variant="outline"
              size="sm"
              onClick={onViewDueSoon}
              className="border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              View All
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
