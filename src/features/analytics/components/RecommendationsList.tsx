// File: /src/features/analytics/components/RecommendationsList.tsx
// Component for displaying AI-generated recommendations

import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  Button,
  Badge,
  Textarea,
} from '@/components/ui'
import {
  useRecommendations,
  useAcknowledgeRecommendation,
  useImplementRecommendation,
  useDismissRecommendation,
} from '../hooks/useAnalytics'
import type { AnalyticsRecommendation } from '@/types/analytics'

// Local type definitions for component config
type RecommendationCategory = 'budget' | 'schedule' | 'risk' | 'operational' | 'resource'
type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low'
type RecommendationStatus = 'pending' | 'acknowledged' | 'implemented' | 'dismissed'

interface RecommendationsListProps {
  projectId: string
  showFilters?: boolean
  maxItems?: number
  className?: string
}

// Category configuration
const CATEGORY_CONFIG: Record<RecommendationCategory, { icon: string; color: string }> = {
  budget: { icon: '💰', color: 'bg-emerald-100 text-emerald-700' },
  schedule: { icon: '📅', color: 'bg-info-light text-primary-hover' },
  risk: { icon: '⚠️', color: 'bg-amber-100 text-amber-700' },
  operational: { icon: '⚙️', color: 'bg-purple-100 text-purple-700' },
  resource: { icon: '👥', color: 'bg-cyan-100 text-cyan-700' },
}

// Priority configuration
const PRIORITY_CONFIG: Record<RecommendationPriority, { color: string; label: string }> = {
  critical: { color: 'bg-error-light text-error-dark border-red-200', label: 'Critical' },
  high: { color: 'bg-orange-100 text-orange-700 border-orange-200', label: 'High' },
  medium: { color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Medium' },
  low: { color: 'bg-muted text-secondary border-border', label: 'Low' },
}

// Status configuration
const STATUS_CONFIG: Record<RecommendationStatus, { color: string; label: string }> = {
  pending: { color: 'bg-blue-50 text-primary-hover', label: 'Pending' },
  acknowledged: { color: 'bg-warning-light text-amber-700', label: 'Acknowledged' },
  implemented: { color: 'bg-success-light text-success-dark', label: 'Implemented' },
  dismissed: { color: 'bg-surface text-muted', label: 'Dismissed' },
}

/**
 * RecommendationsList Component
 *
 * Displays AI-generated recommendations with:
 * - Category and priority badges
 * - Acknowledge/Implement/Dismiss actions
 * - Impact and effort indicators
 *
 * Usage:
 * ```tsx
 * <RecommendationsList projectId="proj-123" />
 * ```
 */
export function RecommendationsList({
  projectId,
  showFilters = true,
  maxItems,
  className,
}: RecommendationsListProps) {
  const [statusFilter, setStatusFilter] = useState<RecommendationStatus[]>(['pending', 'acknowledged'])
  // categoryFilter is used for API filtering; setCategoryFilter reserved for future category filter UI
  const [categoryFilter, _setCategoryFilter] = useState<RecommendationCategory[]>([])

  const { data: recommendations, isLoading, error } = useRecommendations(
    projectId,
    { statuses: statusFilter, categories: categoryFilter.length > 0 ? categoryFilter : undefined }
  )

  if (isLoading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardHeader>
          <CardTitle className="h-5 w-48 bg-muted rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 bg-surface rounded-lg">
                <div className="h-4 w-3/4 bg-muted rounded mb-2" />
                <div className="h-3 w-full bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn('border-red-200', className)}>
        <CardContent className="pt-6">
          <div className="text-center text-error">
            <p>Failed to load recommendations</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const displayRecommendations = maxItems
    ? recommendations?.slice(0, maxItems)
    : recommendations

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <span>💡</span>
            <span>AI Recommendations</span>
            {recommendations && (
              <Badge variant="outline" className="ml-2">
                {recommendations.length}
              </Badge>
            )}
          </CardTitle>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-2 mt-3">
            {/* Status filters */}
            <div className="flex gap-1">
              {(['pending', 'acknowledged', 'implemented', 'dismissed'] as RecommendationStatus[]).map(
                (status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      setStatusFilter((prev) =>
                        prev.includes(status)
                          ? prev.filter((s) => s !== status)
                          : [...prev, status]
                      )
                    }}
                    className={cn(
                      'px-2 py-1 text-xs rounded-full border transition-colors',
                      statusFilter.includes(status)
                        ? STATUS_CONFIG[status].color
                        : 'bg-card text-disabled border-border'
                    )}
                  >
                    {STATUS_CONFIG[status].label}
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {displayRecommendations?.length === 0 ? (
          <div className="text-center text-muted py-8">
            <span className="text-3xl">✨</span>
            <p className="mt-2">No recommendations</p>
            <p className="text-sm">No active recommendations for this project</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayRecommendations?.map((rec) => (
              <RecommendationItem key={rec.id} recommendation={rec} />
            ))}
          </div>
        )}

        {maxItems && recommendations && recommendations.length > maxItems && (
          <p className="text-xs text-disabled mt-4 text-center">
            Showing {maxItems} of {recommendations.length} recommendations
          </p>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Individual recommendation item
 */
interface RecommendationItemProps {
  recommendation: AnalyticsRecommendation
}

function RecommendationItem({ recommendation }: RecommendationItemProps) {
  const [showActions, setShowActions] = useState(false)
  const [dismissReason, setDismissReason] = useState('')
  const [showDismissForm, setShowDismissForm] = useState(false)

  const acknowledgeMutation = useAcknowledgeRecommendation()
  const implementMutation = useImplementRecommendation()
  const dismissMutation = useDismissRecommendation()

  const categoryConfig = CATEGORY_CONFIG[recommendation.category]
  const priorityConfig = PRIORITY_CONFIG[recommendation.priority]
  const statusConfig = STATUS_CONFIG[recommendation.status]

  const handleAcknowledge = () => {
    acknowledgeMutation.mutate({ recommendationId: recommendation.id })
  }

  const handleImplement = () => {
    implementMutation.mutate({ recommendationId: recommendation.id })
  }

  const handleDismiss = () => {
    if (dismissReason.trim()) {
      dismissMutation.mutate({
        recommendationId: recommendation.id,
        reason: dismissReason,
      })
      setShowDismissForm(false)
    }
  }

  const isPending = recommendation.status === 'pending'
  const isAcknowledged = recommendation.status === 'acknowledged'
  const isActionable = isPending || isAcknowledged

  return (
    <div
      className={cn(
        'p-4 rounded-lg border transition-colors',
        recommendation.status === 'dismissed'
          ? 'bg-surface border-border opacity-60'
          : recommendation.status === 'implemented'
          ? 'bg-success-light border-green-100'
          : 'bg-card border-border hover:border-input'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Category icon */}
        <span className="text-xl flex-shrink-0">{categoryConfig.icon}</span>

        <div className="flex-1 min-w-0">
          {/* Title and badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-sm text-foreground heading-card">
              {recommendation.title}
            </h4>
            <Badge variant="outline" className={cn('text-[10px]', priorityConfig.color)}>
              {priorityConfig.label}
            </Badge>
            <Badge variant="outline" className={cn('text-[10px]', statusConfig.color)}>
              {statusConfig.label}
            </Badge>
          </div>

          {/* Description */}
          <p className="text-sm text-secondary mt-1">{recommendation.description}</p>

          {/* Impact and effort */}
          {(recommendation.impact || recommendation.effort) && (
            <div className="flex items-center gap-4 mt-2 text-xs text-muted">
              {recommendation.impact && (
                <span>Impact: <strong>{recommendation.impact}</strong></span>
              )}
              {recommendation.effort && (
                <span>Effort: <strong>{recommendation.effort}</strong></span>
              )}
            </div>
          )}

          {/* Actions (for pending/acknowledged) */}
          {isActionable && showActions && !showDismissForm && (
            <div className="flex items-center gap-2 mt-3">
              {isPending && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAcknowledge}
                  disabled={acknowledgeMutation.isPending}
                >
                  {acknowledgeMutation.isPending ? 'Saving...' : 'Acknowledge'}
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleImplement}
                disabled={implementMutation.isPending}
              >
                {implementMutation.isPending ? 'Saving...' : 'Mark Implemented'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-muted"
                onClick={() => setShowDismissForm(true)}
              >
                Dismiss
              </Button>
            </div>
          )}

          {/* Dismiss form */}
          {showDismissForm && (
            <div className="mt-3 space-y-2">
              <Textarea
                placeholder="Reason for dismissing..."
                value={dismissReason}
                onChange={(e) => setDismissReason(e.target.value)}
                className="text-sm"
                rows={2}
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDismiss}
                  disabled={!dismissReason.trim() || dismissMutation.isPending}
                >
                  {dismissMutation.isPending ? 'Dismissing...' : 'Confirm Dismiss'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowDismissForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Timestamp */}
      <div className="mt-2 text-xs text-disabled">
        Created {new Date(recommendation.created_at).toLocaleDateString()}
        {recommendation.implemented_at && (
          <span>
            {' '}• Implemented {new Date(recommendation.implemented_at).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * Compact recommendation summary for widgets
 */
interface RecommendationSummaryProps {
  projectId: string
  className?: string
}

export function RecommendationSummary({ projectId, className }: RecommendationSummaryProps) {
  const { data: recommendations } = useRecommendations(projectId, { statuses: ['pending'] })

  if (!recommendations || recommendations.length === 0) {
    return null
  }

  const criticalCount = recommendations.filter((r) => r.priority === 'critical').length
  const highCount = recommendations.filter((r) => r.priority === 'high').length

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-sm">💡</span>
      <span className="text-sm text-secondary">
        {recommendations.length} pending
      </span>
      {criticalCount > 0 && (
        <Badge variant="outline" className="text-[10px] bg-error-light text-error-dark">
          {criticalCount} critical
        </Badge>
      )}
      {highCount > 0 && (
        <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700">
          {highCount} high
        </Badge>
      )}
    </div>
  )
}
