/**
 * Submit for Approval Button Component
 *
 * Reusable button that opens a workflow selector and submits for approval
 */

import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ApprovalStatusBadge } from './ApprovalStatusBadge'
import { useActiveWorkflowsByType } from '../hooks/useApprovalWorkflows'
import {
  useEntityApprovalStatus,
  useCreateApprovalRequest,
} from '../hooks/useApprovalRequests'
import { useAuth } from '@/lib/auth/AuthContext'
import type { WorkflowEntityType, ApprovalWorkflow } from '@/types/approval-workflow'
import { WORKFLOW_ENTITY_CONFIG } from '@/types/approval-workflow'
import { cn } from '@/lib/utils'

export interface SubmitForApprovalButtonProps {
  entityType: WorkflowEntityType
  entityId: string
  projectId: string
  companyId?: string
  entityName?: string | null // For display purposes
  onSuccess?: () => void
  onError?: (error: Error) => void
  className?: string
  disabled?: boolean
}

export function SubmitForApprovalButton({
  entityType,
  entityId,
  projectId,
  companyId: providedCompanyId,
  entityName,
  onSuccess,
  onError,
  className,
  disabled,
}: SubmitForApprovalButtonProps) {
  const { userProfile } = useAuth()
  const companyId = providedCompanyId ?? userProfile?.company_id ?? ''
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [selectedWorkflow, setSelectedWorkflow] = React.useState<string>('')

  // Check current approval status
  const { data: status, isLoading: statusLoading } = useEntityApprovalStatus(
    entityType,
    entityId
  )

  // Get available workflows
  const { data: workflows, isLoading: workflowsLoading } = useActiveWorkflowsByType(
    companyId,
    entityType
  )

  // Create request mutation
  const createRequest = useCreateApprovalRequest()

  const entityConfig = WORKFLOW_ENTITY_CONFIG[entityType]

  // If already has approval status, show badge instead
  if (status?.has_active_request || status?.status === 'approved' || status?.status === 'approved_with_conditions') {
    return (
      <ApprovalStatusBadge
        status={status.status!}
        conditions={status.request?.conditions}
        showConditions
        className={className}
      />
    )
  }

  const handleSubmit = async () => {
    if (!selectedWorkflow) return

    try {
      await createRequest.mutateAsync({
        workflow_id: selectedWorkflow,
        entity_type: entityType,
        entity_id: entityId,
        project_id: projectId,
      })
      setDialogOpen(false)
      setSelectedWorkflow('')
      onSuccess?.()
    } catch (error) {
      onError?.(error as Error)
    }
  }

  const isLoading = statusLoading || workflowsLoading || createRequest.isPending

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setDialogOpen(true)}
        disabled={disabled || !status?.can_submit || isLoading}
        className={cn('gap-2', className)}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Submit for Approval
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit {entityConfig.label} for Approval</DialogTitle>
            <DialogDescription>
              Select an approval workflow to begin the approval process.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {workflowsLoading ? (
              <div className="text-center py-4 text-gray-500">
                Loading workflows...
              </div>
            ) : !workflows || workflows.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-500 mb-2">
                  No approval workflows available for {entityConfig.plural.toLowerCase()}.
                </p>
                <p className="text-sm text-gray-400">
                  Contact your administrator to set up approval workflows.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Workflow
                </label>
                {workflows.map((workflow) => (
                  <WorkflowOption
                    key={workflow.id}
                    workflow={workflow}
                    selected={selectedWorkflow === workflow.id}
                    onSelect={() => setSelectedWorkflow(workflow.id)}
                  />
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={createRequest.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedWorkflow || createRequest.isPending}
            >
              {createRequest.isPending ? 'Submitting...' : 'Submit for Approval'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

interface WorkflowOptionProps {
  workflow: ApprovalWorkflow
  selected: boolean
  onSelect: () => void
}

function WorkflowOption({ workflow, selected, onSelect }: WorkflowOptionProps) {
  const stepCount = workflow.steps?.length || 0

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full text-left p-3 rounded-lg border-2 transition-colors',
        selected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 hover:border-gray-300 bg-white'
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium text-gray-900">{workflow.name}</div>
          {workflow.description && (
            <div className="text-sm text-gray-500 mt-0.5">
              {workflow.description}
            </div>
          )}
          <div className="text-xs text-gray-400 mt-1">
            {stepCount} approval step{stepCount !== 1 ? 's' : ''}
          </div>
        </div>
        {selected && (
          <svg
            className="w-5 h-5 text-blue-500 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
    </button>
  )
}

export default SubmitForApprovalButton
