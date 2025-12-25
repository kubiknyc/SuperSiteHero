/**
 * My Approvals Page
 *
 * Lists all pending approvals for the current user
 */

import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import {
  ApprovalRequestCard,
  ApprovalStatusBadge,
} from '@/features/approvals/components'
import {
  useApprovalRequests,
  usePendingApprovals,
} from '@/features/approvals/hooks'
import {
  useApproveRequest,
  useApproveWithConditions,
  useRejectRequest,
  useCancelApprovalRequest,
} from '@/features/approvals/hooks'
import { useAuth } from '@/lib/auth/AuthContext'
import type { ApprovalStatus, WorkflowEntityType } from '@/types/approval-workflow'
import { WORKFLOW_ENTITY_CONFIG } from '@/types/approval-workflow'
import { cn } from '@/lib/utils'

type FilterTab = 'pending' | 'all'

export function MyApprovalsPage() {
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const [activeTab, setActiveTab] = React.useState<FilterTab>('pending')
  const [typeFilter, setTypeFilter] = React.useState<WorkflowEntityType | 'all'>('all')

  // Queries
  const { data: pendingData, isLoading: pendingLoading } = usePendingApprovals(
    userProfile?.id
  )

  const { data: allRequests, isLoading: allLoading } = useApprovalRequests(
    activeTab === 'all' ? { initiated_by: userProfile?.id } : undefined
  )

  // Mutations
  const approveMutation = useApproveRequest()
  const approveWithConditionsMutation = useApproveWithConditions()
  const rejectMutation = useRejectRequest()
  const cancelMutation = useCancelApprovalRequest()

  const isLoading = activeTab === 'pending' ? pendingLoading : allLoading
  const requests =
    activeTab === 'pending'
      ? pendingData?.requests || []
      : allRequests || []

  const filteredRequests =
    typeFilter === 'all'
      ? requests
      : requests.filter((r) => r.entity_type === typeFilter)

  const handleApprove = async (requestId: string, comment?: string) => {
    try {
      await approveMutation.mutateAsync({ requestId, comment })
    } catch (error) {
      console.error('Failed to approve:', error)
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
      console.error('Failed to approve with conditions:', error)
    }
  }

  const handleReject = async (requestId: string, comment: string) => {
    try {
      await rejectMutation.mutateAsync({ requestId, comment })
    } catch (error) {
      console.error('Failed to reject:', error)
    }
  }

  const handleCancel = async (requestId: string) => {
    try {
      await cancelMutation.mutateAsync(requestId)
    } catch (error) {
      console.error('Failed to cancel:', error)
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

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground heading-page">Approvals</h1>
            <p className="text-muted mt-1">
              {activeTab === 'pending'
                ? 'Items waiting for your approval'
                : 'All approval requests you initiated'}
            </p>
          </div>
          {pendingData && pendingData.total > 0 && (
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">
                {pendingData.total}
              </div>
              <div className="text-sm text-muted">pending</div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b mb-6">
          <button
            onClick={() => setActiveTab('pending')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'pending'
                ? 'border-blue-500 text-primary'
                : 'border-transparent text-muted hover:text-secondary'
            )}
          >
            Pending for Me
            {pendingData && pendingData.total > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-error-light text-error">
                {pendingData.total}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'all'
                ? 'border-blue-500 text-primary'
                : 'border-transparent text-muted hover:text-secondary'
            )}
          >
            My Requests
          </button>
        </div>

        {/* Type filter */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={typeFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('all')}
          >
            All Types
          </Button>
          {Object.entries(WORKFLOW_ENTITY_CONFIG).map(([type, config]) => (
            <Button
              key={type}
              variant={typeFilter === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter(type as WorkflowEntityType)}
            >
              {config.plural}
            </Button>
          ))}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-12 text-muted">
            Loading approvals...
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filteredRequests.length === 0 && (
          <div className="text-center py-12 bg-surface rounded-lg border border-dashed">
            <svg
              className="mx-auto h-12 w-12 text-disabled"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-foreground heading-subsection">
              {activeTab === 'pending'
                ? 'No pending approvals'
                : 'No approval requests'}
            </h3>
            <p className="mt-1 text-sm text-muted">
              {activeTab === 'pending'
                ? "You're all caught up! Nothing requires your approval right now."
                : "You haven't submitted any items for approval yet."}
            </p>
          </div>
        )}

        {/* Request cards */}
        {!isLoading && filteredRequests.length > 0 && (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <ApprovalRequestCard
                key={request.id}
                request={request}
                currentUserId={userProfile?.id}
                onApprove={handleApprove}
                onApproveWithConditions={handleApproveWithConditions}
                onReject={handleReject}
                onCancel={handleCancel}
                onViewDetails={handleViewDetails}
                isLoading={isMutating}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default MyApprovalsPage
