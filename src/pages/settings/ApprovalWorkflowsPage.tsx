/**
 * Approval Workflows Settings Page
 *
 * Manage approval workflow templates for the company
 */

import * as React from 'react'
import { SmartLayout } from '@/components/layout/SmartLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { WorkflowList } from '@/features/approvals/components'
import {
  useApprovalWorkflows,
  useApprovalWorkflow,
  useCreateWorkflow,
  useUpdateWorkflow,
  useDeleteWorkflow,
  useDuplicateWorkflow,
} from '@/features/approvals/hooks'
import { useAuth } from '@/lib/auth/AuthContext'
import { cn } from '@/lib/utils'
import {
  WORKFLOW_ENTITY_CONFIG,
  type WorkflowEntityType,
  type CreateWorkflowInput,
  type UpdateWorkflowInput,
  type ApprovalWorkflow,
  type CreateStepInput,
} from '@/types/approval-workflow'
import { logger } from '../../lib/utils/logger'

type ViewMode = 'list' | 'create' | 'edit'

// Workflow templates for common approval patterns
interface WorkflowTemplate {
  id: string
  name: string
  description: string
  steps: CreateStepInput[]
  icon: React.ReactNode
}

const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'single-approver',
    name: 'Single Approver',
    description: 'Simple one-step approval by a single person',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    steps: [
      {
        step_order: 1,
        name: 'Approval',
        approver_type: 'user',
        approver_ids: [],
        required_approvals: 1,
        allow_delegation: true,
        auto_approve_after_days: null,
      },
    ],
  },
  {
    id: 'two-tier',
    name: 'Two-Tier Approval',
    description: 'Review then final approval (e.g., PM then Director)',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    steps: [
      {
        step_order: 1,
        name: 'Initial Review',
        approver_type: 'user',
        approver_ids: [],
        required_approvals: 1,
        allow_delegation: true,
        auto_approve_after_days: null,
      },
      {
        step_order: 2,
        name: 'Final Approval',
        approver_type: 'user',
        approver_ids: [],
        required_approvals: 1,
        allow_delegation: false,
        auto_approve_after_days: null,
      },
    ],
  },
  {
    id: 'three-tier',
    name: 'Three-Tier Approval',
    description: 'Technical review, PM approval, then executive sign-off',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    steps: [
      {
        step_order: 1,
        name: 'Technical Review',
        approver_type: 'user',
        approver_ids: [],
        required_approvals: 1,
        allow_delegation: true,
        auto_approve_after_days: 3,
      },
      {
        step_order: 2,
        name: 'Project Manager Approval',
        approver_type: 'user',
        approver_ids: [],
        required_approvals: 1,
        allow_delegation: true,
        auto_approve_after_days: null,
      },
      {
        step_order: 3,
        name: 'Executive Sign-off',
        approver_type: 'user',
        approver_ids: [],
        required_approvals: 1,
        allow_delegation: false,
        auto_approve_after_days: null,
      },
    ],
  },
  {
    id: 'parallel',
    name: 'Parallel Approval',
    description: 'Multiple approvers must all approve at the same step',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    ),
    steps: [
      {
        step_order: 1,
        name: 'Committee Approval',
        approver_type: 'user',
        approver_ids: [],
        required_approvals: 2,
        allow_delegation: true,
        auto_approve_after_days: null,
      },
    ],
  },
]

// Mock function to get documents using a workflow (in real app, this would be a query)
function getWorkflowUsage(workflowId: string): { type: string; count: number }[] {
  // This would be replaced with actual data from useQuery
  // For now, return mock data based on workflow ID to simulate the feature
  const mockUsage: Record<string, { type: string; count: number }[]> = {}
  return mockUsage[workflowId] || []
}

export function ApprovalWorkflowsPage() {
  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id

  const [viewMode, setViewMode] = React.useState<ViewMode>('list')
  const [editingWorkflowId, setEditingWorkflowId] = React.useState<string | null>(null)
  const [typeFilter, setTypeFilter] = React.useState<WorkflowEntityType | 'all'>('all')

  // Dialog states
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [workflowToDelete, setWorkflowToDelete] = React.useState<ApprovalWorkflow | null>(null)
  const [showDuplicateDialog, setShowDuplicateDialog] = React.useState(false)
  const [workflowToDuplicate, setWorkflowToDuplicate] = React.useState<ApprovalWorkflow | null>(null)
  const [duplicateName, setDuplicateName] = React.useState('')
  const [showTemplateDialog, setShowTemplateDialog] = React.useState(false)
  const [selectedTemplate, setSelectedTemplate] = React.useState<WorkflowTemplate | null>(null)
  const [showPreviewDialog, setShowPreviewDialog] = React.useState(false)
  const [previewWorkflow, setPreviewWorkflow] = React.useState<CreateWorkflowInput | null>(null)
  const [pendingSave, setPendingSave] = React.useState<(() => void) | null>(null)

  // Queries - useApprovalWorkflows takes positional params
  const { data: workflows, isLoading } = useApprovalWorkflows(companyId ?? undefined)
  const { data: editingWorkflow } = useApprovalWorkflow(editingWorkflowId || undefined)

  // Mutations
  const createMutation = useCreateWorkflow()
  const updateMutation = useUpdateWorkflow()
  const deleteMutation = useDeleteWorkflow()
  const duplicateMutation = useDuplicateWorkflow()

  // Get workflow usage for delete confirmation
  const workflowUsage = workflowToDelete ? getWorkflowUsage(workflowToDelete.id) : []

  const handleCreate = async (input: CreateWorkflowInput) => {
    if (!companyId) {
      return
    }
    try {
      await createMutation.mutateAsync({ ...input, company_id: companyId })
      setViewMode('list')
    } catch (error) {
      logger.error('Failed to create workflow:', error)
    }
  }

  const handleUpdate = async (input: CreateWorkflowInput) => {
    if (!editingWorkflowId) {
      return
    }
    try {
      await updateMutation.mutateAsync({
        workflowId: editingWorkflowId,
        input: input as UpdateWorkflowInput,
      })
      setViewMode('list')
      setEditingWorkflowId(null)
    } catch (error) {
      logger.error('Failed to update workflow:', error)
    }
  }

  const handleEdit = (workflow: ApprovalWorkflow) => {
    setEditingWorkflowId(workflow.id)
    setViewMode('edit')
  }

  // Delete workflow with AlertDialog
  const handleDeleteClick = (workflow: ApprovalWorkflow) => {
    setWorkflowToDelete(workflow)
    setShowDeleteDialog(true)
  }

  const handleConfirmDelete = async () => {
    if (!workflowToDelete) {
      return
    }
    try {
      await deleteMutation.mutateAsync(workflowToDelete.id)
      setShowDeleteDialog(false)
      setWorkflowToDelete(null)
    } catch (error) {
      logger.error('Failed to delete workflow:', error)
    }
  }

  // Duplicate workflow with Dialog
  const handleDuplicateClick = (workflow: ApprovalWorkflow) => {
    setWorkflowToDuplicate(workflow)
    setDuplicateName(`${workflow.name} (Copy)`)
    setShowDuplicateDialog(true)
  }

  const handleConfirmDuplicate = async () => {
    if (!workflowToDuplicate || !duplicateName.trim()) {
      return
    }
    try {
      await duplicateMutation.mutateAsync({
        workflowId: workflowToDuplicate.id,
        newName: duplicateName.trim(),
      })
      setShowDuplicateDialog(false)
      setWorkflowToDuplicate(null)
      setDuplicateName('')
    } catch (error) {
      logger.error('Failed to duplicate workflow:', error)
    }
  }

  // Template selection
  const handleSelectTemplate = (template: WorkflowTemplate) => {
    setSelectedTemplate(template)
    setShowTemplateDialog(false)
    setViewMode('create')
  }

  // Preview before save
  const handlePreviewAndSave = (input: CreateWorkflowInput, saveCallback: () => void) => {
    setPreviewWorkflow(input)
    setPendingSave(() => saveCallback)
    setShowPreviewDialog(true)
  }

  const handleConfirmSave = () => {
    if (pendingSave) {
      pendingSave()
    }
    setShowPreviewDialog(false)
    setPreviewWorkflow(null)
    setPendingSave(null)
  }

  const handleCancel = () => {
    setViewMode('list')
    setEditingWorkflowId(null)
    setSelectedTemplate(null)
  }

  const handleTypeChange = (type: WorkflowEntityType | 'all') => {
    setTypeFilter(type)
  }

  const handleStartCreate = () => {
    setShowTemplateDialog(true)
  }

  const handleStartFromScratch = () => {
    setSelectedTemplate(null)
    setShowTemplateDialog(false)
    setViewMode('create')
  }

  if (!companyId) {
    return (
      <SmartLayout title="Approval Workflows" subtitle="Workflow configuration">
        <div className="p-6 max-w-6xl mx-auto">
          <div className="text-center py-12 text-muted">
            Please log in to manage approval workflows.
          </div>
        </div>
      </SmartLayout>
    )
  }

  return (
    <SmartLayout title="Approval Workflows" subtitle="Workflow configuration">
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground heading-page">
              Approval Workflows
            </h1>
            <p className="text-muted mt-1">
              Configure approval workflows for documents, submittals, RFIs, and change orders
            </p>
          </div>

          {viewMode === 'list' && (
            <Button onClick={handleStartCreate}>
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
            onDelete={handleDeleteClick}
            onDuplicate={handleDuplicateClick}
            selectedType={typeFilter}
            onTypeChange={handleTypeChange}
          />
        )}

        {viewMode === 'create' && (
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground heading-section">
                Create New Workflow
              </h2>
              {selectedTemplate && (
                <span className="text-sm text-muted bg-surface px-3 py-1 rounded-full">
                  Template: {selectedTemplate.name}
                </span>
              )}
            </div>
            <WorkflowBuilderWithPreview
              companyId={companyId}
              onSave={handleCreate}
              onCancel={handleCancel}
              isLoading={createMutation.isPending}
              availableUsers={[]}
              initialTemplate={selectedTemplate}
              onPreviewAndSave={handlePreviewAndSave}
            />
          </div>
        )}

        {viewMode === 'edit' && editingWorkflow && (
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 heading-section">
              Edit Workflow
            </h2>
            <WorkflowBuilderWithPreview
              initialData={editingWorkflow}
              companyId={companyId}
              onSave={handleUpdate}
              onCancel={handleCancel}
              isLoading={updateMutation.isPending}
              availableUsers={[]}
              onPreviewAndSave={handlePreviewAndSave}
            />
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deactivate Workflow</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to deactivate "{workflowToDelete?.name}"?
                It will no longer be available for new approval requests.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {/* Show workflow usage */}
            {workflowUsage.length > 0 && (
              <div className="my-4 p-3 bg-warning-light border border-warning rounded-md">
                <p className="text-sm font-medium text-warning-dark mb-2">
                  This workflow is currently in use:
                </p>
                <ul className="text-sm text-secondary space-y-1">
                  {workflowUsage.map((usage, index) => (
                    <li key={index}>
                      {usage.count} active {usage.type}{usage.count !== 1 ? 's' : ''}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted mt-2">
                  Existing approval requests will continue to use this workflow until completed.
                </p>
              </div>
            )}

            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? 'Deactivating...' : 'Deactivate'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Duplicate Dialog */}
        <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Duplicate Workflow</DialogTitle>
              <DialogDescription>
                Enter a name for the duplicated workflow.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <label className="block text-sm font-medium text-secondary mb-2">
                Workflow Name
              </label>
              <Input
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
                placeholder="Enter workflow name"
                autoFocus
              />
              {!duplicateName.trim() && (
                <p className="text-xs text-error mt-1">Name is required</p>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDuplicateDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDuplicate}
                disabled={!duplicateName.trim() || duplicateMutation.isPending}
              >
                {duplicateMutation.isPending ? 'Duplicating...' : 'Duplicate'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Template Selection Dialog */}
        <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Choose a Template</DialogTitle>
              <DialogDescription>
                Start with a pre-built template or create from scratch.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {WORKFLOW_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className="p-4 border rounded-lg text-left hover:border-primary hover:bg-surface transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-info-light text-primary rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      {template.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground">{template.name}</h3>
                      <p className="text-sm text-muted mt-1">{template.description}</p>
                      <p className="text-xs text-disabled mt-2">
                        {template.steps.length} step{template.steps.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowTemplateDialog(false)}
              >
                Cancel
              </Button>
              <Button variant="ghost" onClick={handleStartFromScratch}>
                Start from Scratch
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Workflow Preview</DialogTitle>
              <DialogDescription>
                Review your workflow before saving.
              </DialogDescription>
            </DialogHeader>
            {previewWorkflow && (
              <div className="py-4">
                <WorkflowPreview workflow={previewWorkflow} />
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowPreviewDialog(false)}
              >
                Go Back
              </Button>
              <Button onClick={handleConfirmSave}>
                Save Workflow
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SmartLayout>
  )
}

// Workflow Preview Component
interface WorkflowPreviewProps {
  workflow: CreateWorkflowInput
}

function WorkflowPreview({ workflow }: WorkflowPreviewProps) {
  const entityConfig = WORKFLOW_ENTITY_CONFIG[workflow.workflow_type]

  return (
    <div className="space-y-4">
      {/* Basic Info */}
      <div className="bg-surface rounded-lg p-4">
        <h4 className="font-medium text-foreground">{workflow.name}</h4>
        {workflow.description && (
          <p className="text-sm text-muted mt-1">{workflow.description}</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-info-light text-primary">
            {entityConfig.plural}
          </span>
          <span className="text-xs text-disabled">
            {workflow.steps.length} step{workflow.steps.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Visual Flow */}
      <div className="space-y-0">
        {workflow.steps.map((step, index) => (
          <div key={index} className="relative">
            {/* Connector line */}
            {index > 0 && (
              <div className="absolute left-5 -top-2 w-0.5 h-4 bg-border" />
            )}

            <div className="flex items-start gap-3 py-2">
              {/* Step number */}
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium text-sm">
                {index + 1}
              </div>

              {/* Step details */}
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{step.name}</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className="text-xs text-muted">
                    {step.required_approvals} approval{step.required_approvals !== 1 ? 's' : ''} required
                  </span>
                  {step.allow_delegation && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-muted text-secondary">
                      Delegation allowed
                    </span>
                  )}
                  {step.auto_approve_after_days && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-warning-light text-warning-dark">
                      Auto-approve after {step.auto_approve_after_days} days
                    </span>
                  )}
                </div>
                {step.approver_ids.length === 0 && (
                  <p className="text-xs text-error mt-1">No approvers selected</p>
                )}
              </div>
            </div>

            {/* Arrow to next */}
            {index < workflow.steps.length - 1 && (
              <div className="absolute left-5 bottom-0 w-0.5 h-2 bg-border" />
            )}
          </div>
        ))}
      </div>

      {/* Validation summary */}
      <ValidationSummary workflow={workflow} />
    </div>
  )
}

// Validation Summary Component
interface ValidationSummaryProps {
  workflow: CreateWorkflowInput
}

function ValidationSummary({ workflow }: ValidationSummaryProps) {
  const issues: string[] = []

  if (!workflow.name.trim()) {
    issues.push('Workflow name is required')
  }

  if (workflow.steps.length === 0) {
    issues.push('At least one approval step is required')
  }

  workflow.steps.forEach((step, index) => {
    if (step.approver_ids.length === 0) {
      issues.push(`Step ${index + 1} "${step.name}" has no approvers selected`)
    }
    if (!step.name.trim()) {
      issues.push(`Step ${index + 1} has no name`)
    }
  })

  if (issues.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3 bg-success-light rounded-lg">
        <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span className="text-sm font-medium text-green-800">Workflow is valid and ready to save</span>
      </div>
    )
  }

  return (
    <div className="p-3 bg-error-light rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <svg className="w-5 h-5 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span className="text-sm font-medium text-error">Issues found:</span>
      </div>
      <ul className="list-disc list-inside text-sm text-error space-y-1">
        {issues.map((issue, index) => (
          <li key={index}>{issue}</li>
        ))}
      </ul>
    </div>
  )
}

// Extended WorkflowBuilder with real-time validation and preview support
interface WorkflowBuilderWithPreviewProps {
  initialData?: ApprovalWorkflow
  companyId: string
  onSave: (data: CreateWorkflowInput) => void
  onCancel: () => void
  isLoading?: boolean
  availableUsers: Array<{ id: string; full_name: string | null; email: string }>
  initialTemplate?: WorkflowTemplate | null
  onPreviewAndSave?: (input: CreateWorkflowInput, saveCallback: () => void) => void
}

function WorkflowBuilderWithPreview({
  initialData,
  companyId,
  onSave,
  onCancel,
  isLoading = false,
  availableUsers,
  initialTemplate,
  onPreviewAndSave,
}: WorkflowBuilderWithPreviewProps) {
  const [name, setName] = React.useState(initialData?.name || '')
  const [description, setDescription] = React.useState(initialData?.description || '')
  const [workflowType, setWorkflowType] = React.useState<WorkflowEntityType>(
    initialData?.workflow_type || 'document'
  )
  const [steps, setSteps] = React.useState<CreateStepInput[]>(
    initialData?.steps?.map((s) => ({
      step_order: s.step_order,
      name: s.name,
      approver_type: s.approver_type || 'user',
      approver_ids: s.approver_ids,
      required_approvals: s.required_approvals,
      allow_delegation: s.allow_delegation,
      auto_approve_after_days: s.auto_approve_after_days,
    })) ||
      initialTemplate?.steps ||
      [
        {
          step_order: 1,
          name: 'Review',
          approver_type: 'user',
          approver_ids: [],
          required_approvals: 1,
          allow_delegation: false,
          auto_approve_after_days: null,
        },
      ]
  )

  // Real-time validation
  const [touched, setTouched] = React.useState({
    name: false,
    steps: false,
  })

  const validationErrors = React.useMemo(() => {
    const errors: Record<string, string> = {}

    if (touched.name && !name.trim()) {
      errors.name = 'Workflow name is required'
    }

    steps.forEach((step, index) => {
      if (touched.steps && step.approver_ids.length === 0) {
        errors[`step_${index}_approvers`] = 'At least one approver is required'
      }
      if (touched.steps && !step.name.trim()) {
        errors[`step_${index}_name`] = 'Step name is required'
      }
    })

    return errors
  }, [name, steps, touched])

  const hasErrors = Object.keys(validationErrors).length > 0
  const isValid = name.trim() && steps.every((s) => s.approver_ids.length > 0 && s.name.trim())

  const handleAddStep = () => {
    setSteps([
      ...steps,
      {
        step_order: steps.length + 1,
        name: `Step ${steps.length + 1}`,
        approver_type: 'user',
        approver_ids: [],
        required_approvals: 1,
        allow_delegation: false,
        auto_approve_after_days: null,
      },
    ])
    setTouched((prev) => ({ ...prev, steps: true }))
  }

  const handleRemoveStep = (index: number) => {
    if (steps.length <= 1) {
      return
    }
    const newSteps = steps.filter((_, i) => i !== index)
    setSteps(newSteps.map((step, i) => ({ ...step, step_order: i + 1 })))
  }

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === steps.length - 1)
    ) {
      return
    }

    const newSteps = [...steps]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    ;[newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]]
    setSteps(newSteps.map((step, i) => ({ ...step, step_order: i + 1 })))
  }

  const handleUpdateStep = (index: number, updates: Partial<CreateStepInput>) => {
    setSteps(steps.map((step, i) => (i === index ? { ...step, ...updates } : step)))
    setTouched((prev) => ({ ...prev, steps: true }))
  }

  const buildWorkflowInput = (): CreateWorkflowInput => ({
    name: name.trim(),
    description: description.trim() || null,
    company_id: companyId,
    workflow_type: workflowType,
    steps,
  })

  const handleSave = () => {
    if (!isValid) {
      setTouched({ name: true, steps: true })
      return
    }

    const input = buildWorkflowInput()

    if (onPreviewAndSave) {
      onPreviewAndSave(input, () => onSave(input))
    } else {
      onSave(input)
    }
  }

  return (
    <div className="space-y-6">
      {/* Basic Info with real-time validation */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-secondary mb-1">
            Workflow Name <span className="text-error">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
            placeholder="e.g., Document Review Process"
            className={cn(
              'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
              validationErrors.name ? 'border-red-300 bg-error-light' : 'border-input'
            )}
            disabled={isLoading}
          />
          {validationErrors.name && (
            <p className="text-xs text-error mt-1 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {validationErrors.name}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description of this workflow..."
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={2}
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary mb-1">
            Applies To <span className="text-error">*</span>
          </label>
          <select
            value={workflowType}
            onChange={(e) => setWorkflowType(e.target.value as WorkflowEntityType)}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading || !!initialData}
          >
            {Object.entries(WORKFLOW_ENTITY_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.plural}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Steps with enhanced validation feedback */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-secondary heading-subsection">Approval Steps</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddStep}
            disabled={isLoading}
          >
            Add Step
          </Button>
        </div>

        <div className="space-y-3">
          {steps.map((step, index) => (
            <StepEditorWithValidation
              key={index}
              step={step}
              index={index}
              totalSteps={steps.length}
              availableUsers={availableUsers}
              onUpdate={(updates) => handleUpdateStep(index, updates)}
              onRemove={() => handleRemoveStep(index)}
              onMoveUp={() => handleMoveStep(index, 'up')}
              onMoveDown={() => handleMoveStep(index, 'down')}
              disabled={isLoading}
              showErrors={touched.steps}
              errors={{
                approvers: validationErrors[`step_${index}_approvers`],
                name: validationErrors[`step_${index}_name`],
              }}
            />
          ))}
        </div>
      </div>

      {/* Validation summary */}
      {touched.name && touched.steps && hasErrors && (
        <div className="flex items-center gap-2 p-3 bg-error-light rounded-lg">
          <svg className="w-5 h-5 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm text-error">Please fix the validation errors above before saving.</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? 'Saving...' : initialData ? 'Update Workflow' : 'Preview & Save'}
        </Button>
      </div>
    </div>
  )
}

// Step Editor with validation display
interface StepEditorWithValidationProps {
  step: CreateStepInput
  index: number
  totalSteps: number
  availableUsers: Array<{ id: string; full_name: string | null; email: string }>
  onUpdate: (updates: Partial<CreateStepInput>) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  disabled?: boolean
  showErrors?: boolean
  errors?: {
    approvers?: string
    name?: string
  }
}

function StepEditorWithValidation({
  step,
  index,
  totalSteps,
  availableUsers,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  disabled,
  showErrors = false,
  errors = {},
}: StepEditorWithValidationProps) {
  const hasApproverError = showErrors && step.approver_ids.length === 0
  const hasNameError = showErrors && !step.name.trim()
  const hasAnyError = hasApproverError || hasNameError

  return (
    <div
      className={cn(
        'border rounded-lg p-4 transition-colors',
        hasAnyError ? 'border-red-300 bg-error-light' : 'border-border bg-card'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 bg-info-light text-primary-hover rounded-full text-xs font-medium">
            {index + 1}
          </span>
          <div>
            <input
              type="text"
              value={step.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="Step name"
              className={cn(
                'font-medium text-foreground bg-transparent border-0 border-b border-transparent hover:border-input focus:border-blue-500 focus:outline-none px-1',
                hasNameError && 'border-red-300'
              )}
              disabled={disabled}
            />
            {hasNameError && (
              <p className="text-xs text-error mt-0.5">{errors.name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={disabled || index === 0}
            className="p-1 text-disabled hover:text-secondary disabled:opacity-30"
            title="Move up"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={disabled || index === totalSteps - 1}
            className="p-1 text-disabled hover:text-secondary disabled:opacity-30"
            title="Move down"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled || totalSteps <= 1}
            className="p-1 text-disabled hover:text-error disabled:opacity-30"
            title="Remove step"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Approvers */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-secondary mb-1">
          Approvers <span className="text-error">*</span>
        </label>
        <select
          multiple
          value={step.approver_ids}
          onChange={(e) => {
            const selected = Array.from(e.target.selectedOptions, (option) => option.value)
            onUpdate({ approver_ids: selected })
          }}
          className={cn(
            'w-full px-2 py-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
            hasApproverError ? 'border-red-300' : 'border-input'
          )}
          size={Math.min(3, availableUsers.length || 3)}
          disabled={disabled}
        >
          {availableUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.full_name || user.email}
            </option>
          ))}
        </select>
        {hasApproverError && (
          <p className="text-xs text-error mt-1 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {errors.approvers || 'Select at least one approver'}
          </p>
        )}
        <p className="text-xs text-muted mt-1">
          Hold Ctrl/Cmd to select multiple approvers
        </p>
      </div>

      {/* Options */}
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={step.allow_delegation}
            onChange={(e) => onUpdate({ allow_delegation: e.target.checked })}
            className="rounded border-input text-primary focus:ring-blue-500"
            disabled={disabled}
          />
          <span className="text-secondary">Allow delegation</span>
        </label>

        <div className="flex items-center gap-2">
          <label className="text-secondary">Auto-approve after</label>
          <input
            type="number"
            min="0"
            max="30"
            value={step.auto_approve_after_days || ''}
            onChange={(e) =>
              onUpdate({
                auto_approve_after_days: e.target.value ? parseInt(e.target.value) : null,
              })
            }
            className="w-16 px-2 py-1 border border-input rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="days"
            disabled={disabled}
          />
          <span className="text-secondary">days</span>
        </div>
      </div>
    </div>
  )
}

export default ApprovalWorkflowsPage
