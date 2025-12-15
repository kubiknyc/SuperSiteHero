// File: /src/features/checklists/components/FailedItemsNotification.tsx
// Notification component for tracking and alerting about failed checklist items
// Enhancement: #6 - Notification System for Failed Items

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertTriangle,
  X,
  ChevronDown,
  ChevronUp,
  Eye,
  Bell,
  CheckCircle2,
} from 'lucide-react'
import type { ChecklistResponse, ChecklistExecution } from '@/types/checklists'
import { format } from 'date-fns'

interface FailedItemsNotificationProps {
  execution: ChecklistExecution
  responses: ChecklistResponse[]
  onDismiss?: () => void
  autoShow?: boolean
}

export function FailedItemsNotification({
  execution,
  responses,
  onDismiss,
  autoShow = true,
}: FailedItemsNotificationProps) {
  const navigate = useNavigate()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  // Filter failed items (score_value === 'fail')
  const failedItems = responses.filter(
    (r) => r.score_value === 'fail' && r.item_type === 'checkbox'
  )

  // Don't show if no failed items or dismissed
  useEffect(() => {
    if (failedItems.length === 0) {
      setIsDismissed(true)
    }
  }, [failedItems.length])

  if (failedItems.length === 0 || isDismissed) {
    return null
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  const handleViewExecution = () => {
    navigate(`/checklists/executions/${execution.id}`)
  }

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-red-100 p-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="text-red-900">Failed Items Detected</span>
                <Badge variant="destructive" className="ml-2">
                  {failedItems.length} {failedItems.length === 1 ? 'Item' : 'Items'}
                </Badge>
              </CardTitle>
              <p className="text-sm text-red-700 mt-1">
                {execution.name} has {failedItems.length} failed{' '}
                {failedItems.length === 1 ? 'item' : 'items'} requiring attention
              </p>
              <p className="text-xs text-red-600 mt-1">
                Completed: {format(new Date(execution.completed_at || execution.created_at), 'PPp')}
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-600 hover:text-red-800"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-600 hover:text-red-800"
              onClick={handleDismiss}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-2 mb-4">
            {failedItems.map((item, index) => (
              <div
                key={item.id}
                className="flex items-start justify-between p-3 bg-white rounded-md border border-red-200"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive" className="text-xs">
                      #{index + 1}
                    </Badge>
                    <span className="font-medium text-gray-900">{item.item_label}</span>
                  </div>
                  {item.notes && (
                    <p className="text-sm text-gray-600 mt-1 ml-12">{item.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleViewExecution} className="flex-1">
              <Eye className="w-4 h-4 mr-2" />
              View Full Report
            </Button>
            <Button variant="outline" onClick={handleDismiss}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Acknowledge
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

/**
 * Notification Badge Component
 * Shows a small badge indicator for failed items count
 */
interface FailedItemsBadgeProps {
  count: number
  onClick?: () => void
}

export function FailedItemsBadge({ count, onClick }: FailedItemsBadgeProps) {
  if (count === 0) {return null}

  return (
    <button
      onClick={onClick}
      className="relative inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
      aria-label={`${count} failed items`}
    >
      <Bell className="w-3 h-3" />
      <span className="text-xs font-semibold">{count}</span>
    </button>
  )
}

/**
 * Mini notification banner that can be placed at the top of pages
 */
interface FailedItemsBannerProps {
  executions: ChecklistExecution[]
  totalFailedCount: number
  onViewAll?: () => void
}

export function FailedItemsBanner({
  executions,
  totalFailedCount,
  onViewAll,
}: FailedItemsBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false)

  if (totalFailedCount === 0 || isDismissed) {return null}

  const affectedExecutions = executions.length

  return (
    <div className="bg-red-50 border-l-4 border-red-600 p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <div>
            <p className="text-sm font-medium text-red-900">
              {totalFailedCount} Failed {totalFailedCount === 1 ? 'Item' : 'Items'} Across{' '}
              {affectedExecutions} {affectedExecutions === 1 ? 'Checklist' : 'Checklists'}
            </p>
            <p className="text-xs text-red-700 mt-1">
              These items require immediate attention and corrective action
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {onViewAll && (
            <Button size="sm" variant="outline" onClick={onViewAll}>
              View Details
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsDismissed(true)}
            className="text-red-600 hover:text-red-800"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
