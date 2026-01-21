/**
 * My Approvals Page
 *
 * A visually distinctive approvals hub with urgency-based design
 * Features: Hero stats, visual tabs, filter pills, animated cards
 */

import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { SmartLayout } from '@/components/layout/SmartLayout'
import { Button } from '@/components/ui/button'
import {
  ApprovalRequestCard,
  ApprovalsPageSkeleton,
} from '@/features/approvals/components'
import {
  useApprovalRequests,
  usePendingApprovals,
  useApproveRequest,
  useApproveWithConditions,
  useRejectRequest,
  useCancelApprovalRequest,
} from '@/features/approvals/hooks'
import { useAuth } from '@/lib/auth/AuthContext'
import { WORKFLOW_ENTITY_CONFIG, type WorkflowEntityType } from '@/types/approval-workflow'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/utils/logger'
import {
  FileText,
  FileCheck,
  MessageSquare,
  Receipt,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Inbox,
  Sparkles,
} from 'lucide-react'

type FilterTab = 'pending' | 'all'

// Entity type icons and colors
const ENTITY_CONFIG: Record<
  WorkflowEntityType,
  { icon: React.ElementType; color: string; bgColor: string }
> = {
  document: {
    icon: FileText,
    color: 'text-info',
    bgColor: 'bg-info/10',
  },
  submittal: {
    icon: FileCheck,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  rfi: {
    icon: MessageSquare,
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
  change_order: {
    icon: Receipt,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
  },
}

/**
 * Hero stat card for header
 */
function HeroStatCard({
  label,
  value,
  icon: Icon,
  variant = 'default',
}: {
  label: string
  value: number
  icon: React.ElementType
  variant?: 'default' | 'urgent' | 'success'
}) {
  const variantStyles = {
    default: 'bg-card/80 border-border/50',
    urgent: 'bg-warning/10 border-warning/30',
    success: 'bg-success/10 border-success/30',
  }

  const iconStyles = {
    default: 'text-muted-foreground',
    urgent: 'text-warning',
    success: 'text-success',
  }

  return (
    <div
      className={cn(
        'flex items-center gap-4 px-5 py-4 rounded-xl border backdrop-blur-sm transition-all duration-200',
        'hover:shadow-md hover:scale-[1.02]',
        variantStyles[variant]
      )}
    >
      <div className={cn('p-2.5 rounded-lg', variant === 'default' ? 'bg-muted' : 'bg-white/50')}>
        <Icon className={cn('h-5 w-5', iconStyles[variant])} />
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p className="stat-number text-2xl">{value}</p>
      </div>
    </div>
  )
}

/**
 * Enhanced empty state with personality
 */
function EmptyState({ tab }: { tab: FilterTab }) {
  const isPending = tab === 'pending'

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-border/50 bg-gradient-to-br from-card via-card to-muted/20 p-12">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-blueprint-grid-fine opacity-5" />

      <div className="relative flex flex-col items-center text-center">
        {/* Icon with animation */}
        <div
          className={cn(
            'w-20 h-20 rounded-2xl flex items-center justify-center mb-6',
            'bg-gradient-to-br shadow-lg',
            isPending
              ? 'from-success/20 to-success/5 shadow-success/10'
              : 'from-info/20 to-info/5 shadow-info/10'
          )}
        >
          {isPending ? (
            <div className="relative">
              <CheckCircle2 className="h-10 w-10 text-success" />
              <Sparkles className="h-4 w-4 text-warning absolute -top-1 -right-1 animate-pulse" />
            </div>
          ) : (
            <Inbox className="h-10 w-10 text-info" />
          )}
        </div>

        {/* Title */}
        <h3 className="heading-card text-foreground mb-2">
          {isPending ? 'All Caught Up!' : 'No Requests Yet'}
        </h3>

        {/* Description */}
        <p className="text-muted-foreground max-w-md">
          {isPending
            ? "Great news! There's nothing waiting for your approval right now. Take a moment to appreciate your productivity."
            : "You haven't submitted any items for approval yet. When you do, they'll appear here."}
        </p>

        {/* Optional action hint */}
        {!isPending && (
          <p className="text-sm text-muted-foreground/70 mt-4">
            Submit documents, RFIs, or change orders for approval to get started.
          </p>
        )}
      </div>
    </div>
  )
}

export function MyApprovalsPage() {
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const [activeTab, setActiveTab] = React.useState<FilterTab>('pending')
  const [typeFilter, setTypeFilter] = React.useState<WorkflowEntityType | 'all'>('all')

  // Queries
  const { data: pendingData, isLoading: pendingLoading } = usePendingApprovals(userProfile?.id)

  const { data: allRequests, isLoading: allLoading } = useApprovalRequests(
    activeTab === 'all' ? { initiated_by: userProfile?.id } : undefined
  )

  // Mutations
  const approveMutation = useApproveRequest()
  const approveWithConditionsMutation = useApproveWithConditions()
  const rejectMutation = useRejectRequest()
  const cancelMutation = useCancelApprovalRequest()

  const isLoading = activeTab === 'pending' ? pendingLoading : allLoading

  const requests = React.useMemo(() => {
    return activeTab === 'pending' ? pendingData?.requests || [] : allRequests || []
  }, [activeTab, pendingData?.requests, allRequests])

  const filteredRequests =
    typeFilter === 'all' ? requests : requests.filter((r) => r.entity_type === typeFilter)

  // Calculate stats by type
  const statsByType = React.useMemo(() => {
    const stats: Record<WorkflowEntityType, number> = {
      document: 0,
      submittal: 0,
      rfi: 0,
      change_order: 0,
    }
    requests.forEach((r) => {
      if (stats[r.entity_type] !== undefined) {
        stats[r.entity_type]++
      }
    })
    return stats
  }, [requests])

  const handleApprove = async (requestId: string, comment?: string) => {
    try {
      await approveMutation.mutateAsync({ requestId, comment })
    } catch (error) {
      logger.error('Failed to approve:', error)
    }
  }

  const handleApproveWithConditions = async (
    requestId: string,
    conditions: string,
    comment?: string
  ) => {
    try {
      await approveWithConditionsMutation.mutateAsync({
        requestId,
        conditions,
        comment,
      })
    } catch (error) {
      logger.error('Failed to approve with conditions:', error)
    }
  }

  const handleReject = async (requestId: string, comment: string) => {
    try {
      await rejectMutation.mutateAsync({ requestId, comment })
    } catch (error) {
      logger.error('Failed to reject:', error)
    }
  }

  const handleCancel = async (requestId: string) => {
    try {
      await cancelMutation.mutateAsync(requestId)
    } catch (error) {
      logger.error('Failed to cancel:', error)
    }
  }

  const handleViewDetails = (requestId: string) => {
    navigate(`/approvals/${requestId}`)
  }

  const isMutating =
    approveMutation.isPending ||
    approveWithConditionsMutation.isPending ||
    rejectMutation.isPending ||
    cancelMutation.isPending

  // Show skeleton while loading
  if (isLoading) {
    return (
      <SmartLayout title="Approvals" subtitle="Pending approvals">
        <ApprovalsPageSkeleton />
      </SmartLayout>
    )
  }

  return (
    <SmartLayout title="Approvals" subtitle="Pending approvals">
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-transparent to-primary/10 p-6 md:p-8 border border-primary/10">
          {/* Blueprint grid background */}
          <div className="absolute inset-0 bg-blueprint-grid-fine opacity-20" />

          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Title section */}
            <div>
              <h1 className="heading-page flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                Approvals
              </h1>
              <p className="text-muted-foreground mt-2 max-w-md">
                {activeTab === 'pending'
                  ? 'Items waiting for your review and approval'
                  : 'Track the status of your submitted requests'}
              </p>
            </div>

            {/* Stats cards */}
            <div className="flex gap-3 flex-wrap">
              {pendingData && pendingData.total > 0 && (
                <HeroStatCard
                  label="Pending"
                  value={pendingData.total}
                  icon={Clock}
                  variant="urgent"
                />
              )}
              {pendingData && pendingData.total === 0 && (
                <HeroStatCard
                  label="All Clear"
                  value={0}
                  icon={CheckCircle2}
                  variant="success"
                />
              )}
            </div>
          </div>
        </div>

        {/* Visual Tabs */}
        <div className="flex gap-2 p-1 bg-muted/50 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('pending')}
            className={cn(
              'relative px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
              activeTab === 'pending'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
            )}
          >
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Pending for Me
            </span>
            {pendingData && pendingData.total > 0 && (
              <span
                className={cn(
                  'absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5',
                  'flex items-center justify-center',
                  'text-xs font-semibold text-white',
                  'bg-destructive rounded-full',
                  'animate-pulse'
                )}
              >
                {pendingData.total}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              'px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
              activeTab === 'all'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
            )}
          >
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              My Requests
            </span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={typeFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('all')}
            className={cn(
              'rounded-full px-4 transition-all duration-200',
              typeFilter === 'all' && 'shadow-md'
            )}
          >
            All Types
            {requests.length > 0 && (
              <span className="ml-1.5 text-xs opacity-70">({requests.length})</span>
            )}
          </Button>
          {Object.entries(WORKFLOW_ENTITY_CONFIG).map(([type, config]) => {
            const entityConfig = ENTITY_CONFIG[type as WorkflowEntityType]
            const Icon = entityConfig.icon
            const count = statsByType[type as WorkflowEntityType]

            return (
              <Button
                key={type}
                variant={typeFilter === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter(type as WorkflowEntityType)}
                className={cn(
                  'rounded-full px-4 transition-all duration-200',
                  typeFilter === type && 'shadow-md',
                  typeFilter !== type && count > 0 && 'border-primary/30'
                )}
              >
                <Icon className={cn('h-3.5 w-3.5 mr-1.5', typeFilter !== type && entityConfig.color)} />
                {config.plural}
                {count > 0 && (
                  <span className="ml-1.5 text-xs opacity-70">({count})</span>
                )}
              </Button>
            )
          })}
        </div>

        {/* Empty State */}
        {filteredRequests.length === 0 && <EmptyState tab={activeTab} />}

        {/* Request Cards with staggered animation */}
        {filteredRequests.length > 0 && (
          <div className="space-y-4">
            {filteredRequests.map((request, index) => (
              <div
                key={request.id}
                className={cn('animate-fade-in-up', `stagger-${Math.min(index + 1, 4)}`)}
              >
                <ApprovalRequestCard
                  request={request}
                  currentUserId={userProfile?.id}
                  onApprove={handleApprove}
                  onApproveWithConditions={handleApproveWithConditions}
                  onReject={handleReject}
                  onCancel={handleCancel}
                  onViewDetails={handleViewDetails}
                  isLoading={isMutating}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </SmartLayout>
  )
}

export default MyApprovalsPage
