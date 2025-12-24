/**
 * Approval Workflows Settings Page
 *
 * Manage approval workflow templates for the company
 */

import * as React from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { WorkflowBuilder, WorkflowList } from '@/features/approvals/components'
import {
  useApprovalWorkflows,
  useApprovalWorkflow,
  useCreateWorkflow,
  useUpdateWorkflow,
  useDeleteWorkflow,
  useDuplicateWorkflow,
} from '@/features/approvals/hooks'
import { useAuth } from '@/lib/auth/AuthContext'
import type {
  WorkflowEntityType,
  CreateWorkflowInput,
  UpdateWorkflowInput,
  ApprovalWorkflow,
} from '@/types/approval-workflow'

type ViewMode = 'list' | 'create' | 'edit'

export function ApprovalWorkflowsPage() {
  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id

  const [viewMode, setViewMode] = React.useState<ViewMode>('list')
  const [editingWorkflowId, setEditingWorkflowId] = React.useState<string | null>(null)
  const [typeFilter, setTypeFilter] = React.useState<WorkflowEntityType | 'all'>('all')

  // Queries - useApprovalWorkflows takes positional params
  const { data: workflows, isLoading } = useApprovalWorkflows(companyId ?? undefined)
  const { data: editingWorkflow } = useApprovalWorkflow(editingWorkflowId || undefined)

  // Mutations
  const createMutation = useCreateWorkflow()
  const updateMutation = useUpdateWorkflow()
  const deleteMutation = useDeleteWorkflow()
  const duplicateMutation = useDuplicateWorkflow()

  const handleCreate = async (input: CreateWorkflowInput) => {
    if (!companyId) {return}
    try {
      await createMutation.mutateAsync({ ...input, company_id: companyId })
      setViewMode('list')
    } catch (error) {
      console.error('Failed to create workflow:', error)
    }
  }

  const handleUpdate = async (input: CreateWorkflowInput) => {
    if (!editingWorkflowId) {return}
    try {
      await updateMutation.mutateAsync({
        workflowId: editingWorkflowId,
        input: input as UpdateWorkflowInput,
      })
      setViewMode('list')
      setEditingWorkflowId(null)
    } catch (error) {
      console.error('Failed to update workflow:', error)
    }
  }

  const handleEdit = (workflow: ApprovalWorkflow) => {
    setEditingWorkflowId(workflow.id)
    setViewMode('edit')
  }

  const handleDelete = async (workflow: ApprovalWorkflow) => {
    if (!confirm('Are you sure you want to deactivate this workflow? It will no longer be available for new approval requests.')) {
      return
    }
    try {
      await deleteMutation.mutateAsync(workflow.id)
    } catch (error) {
      console.error('Failed to delete workflow:', error)
    }
  }

  const handleDuplicate = async (workflow: ApprovalWorkflow) => {
    const newName = prompt('Enter a name for the duplicated workflow:', `${workflow.name} (Copy)`)
    if (!newName?.trim()) {return}

    try {
      await duplicateMutation.mutateAsync({
        workflowId: workflow.id,
        newName: newName.trim(),
      })
    } catch (error) {
      console.error('Failed to duplicate workflow:', error)
    }
  }

  const handleCancel = () => {
    setViewMode('list')
    setEditingWorkflowId(null)
  }

  const handleTypeChange = (type: WorkflowEntityType | 'all') => {
    setTypeFilter(type)
  }

  if (!companyId) {
    return (
      <AppLayout>
        <div className="p-6 max-w-6xl mx-auto">
          <div className="text-center py-12 text-muted">
            Please log in to manage approval workflows.
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground" className="heading-page">
              Approval Workflows
            </h1>
            <p className="text-muted mt-1">
              Configure approval workflows for documents, submittals, RFIs, and change orders
            </p>
          </div>

          {viewMode === 'list' && (
            <Button onClick={() => setViewMode('create')}>
              Create Workflow
            </Button>
          )}
        </div>

        {/* Content */}
        {viewMode === 'list' && (
          <WorkflowList
            workflows={workflows || []}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            selectedType={typeFilter}
            onTypeChange={handleTypeChange}
          />
        )}

        {viewMode === 'create' && (
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4" className="heading-section">
              Create New Workflow
            </h2>
            <WorkflowBuilder
              companyId={companyId}
              onSave={handleCreate}
              onCancel={handleCancel}
              isLoading={createMutation.isPending}
              availableUsers={[]}
            />
          </div>
        )}

        {viewMode === 'edit' && editingWorkflow && (
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4" className="heading-section">
              Edit Workflow
            </h2>
            <WorkflowBuilder
              initialData={editingWorkflow}
              companyId={companyId}
              onSave={handleUpdate}
              onCancel={handleCancel}
              isLoading={updateMutation.isPending}
              availableUsers={[]}
            />
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default ApprovalWorkflowsPage
