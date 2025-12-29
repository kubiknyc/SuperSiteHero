/**
 * Workflow Builder Component
 *
 * UI for creating and editing approval workflows with steps
 * Supports user-based, role-based, custom role, and any project member approvers
 */

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type {
  CreateStepInput,
  CreateWorkflowInput,
  WorkflowEntityType,
  ApprovalWorkflow,
  ApproverType,
  DefaultRole,
  CustomRole,
} from '@/types/approval-workflow'
import { WORKFLOW_ENTITY_CONFIG, DEFAULT_ROLE_CONFIG } from '@/types/approval-workflow'

interface WorkflowBuilderProps {
  initialData?: ApprovalWorkflow
  companyId: string
  onSave: (data: CreateWorkflowInput) => void
  onCancel: () => void
  isLoading?: boolean
  availableUsers: Array<{ id: string; full_name: string | null; email: string }>
  availableCustomRoles?: CustomRole[]
}

const APPROVER_TYPE_OPTIONS: Array<{ value: ApproverType; label: string; description: string }> = [
  { value: 'user', label: 'Specific Users', description: 'Select specific team members' },
  { value: 'role', label: 'By Role', description: 'Anyone with a specific role' },
  { value: 'custom_role', label: 'Custom Role', description: 'Company-defined custom role' },
  { value: 'any', label: 'Any Project Member', description: 'Any user assigned to the project' },
]

const DEFAULT_ROLES: DefaultRole[] = [
  'owner',
  'admin',
  'project_manager',
  'superintendent',
  'foreman',
  'worker',
]

export function WorkflowBuilder({
  initialData,
  companyId,
  onSave,
  onCancel,
  isLoading = false,
  availableUsers,
  availableCustomRoles = [],
}: WorkflowBuilderProps) {
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
      approver_ids: s.approver_ids || [],
      approver_role: s.approver_role || null,
      approver_custom_role_id: s.approver_custom_role_id || null,
      required_approvals: s.required_approvals,
      allow_delegation: s.allow_delegation,
      auto_approve_after_days: s.auto_approve_after_days,
    })) || [
      {
        step_order: 1,
        name: 'Review',
        approver_type: 'user',
        approver_ids: [],
        approver_role: null,
        approver_custom_role_id: null,
        required_approvals: 1,
        allow_delegation: false,
        auto_approve_after_days: null,
      },
    ]
  )

  const handleAddStep = () => {
    setSteps([
      ...steps,
      {
        step_order: steps.length + 1,
        name: `Step ${steps.length + 1}`,
        approver_type: 'user',
        approver_ids: [],
        approver_role: null,
        approver_custom_role_id: null,
        required_approvals: 1,
        allow_delegation: false,
        auto_approve_after_days: null,
      },
    ])
  }

  const handleRemoveStep = (index: number) => {
    if (steps.length <= 1) {return}
    const newSteps = steps.filter((_, i) => i !== index)
    // Reorder steps
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
    // Reorder steps
    setSteps(newSteps.map((step, i) => ({ ...step, step_order: i + 1 })))
  }

  const handleUpdateStep = (index: number, updates: Partial<CreateStepInput>) => {
    setSteps(steps.map((step, i) => (i === index ? { ...step, ...updates } : step)))
  }

  const isStepValid = (step: CreateStepInput): boolean => {
    switch (step.approver_type) {
      case 'user':
        return (step.approver_ids?.length ?? 0) > 0
      case 'role':
        return !!step.approver_role
      case 'custom_role':
        return !!step.approver_custom_role_id
      case 'any':
        return true // Any project member is always valid
      default:
        return false
    }
  }

  const handleSave = () => {
    if (!name.trim() || steps.some((s) => !isStepValid(s))) {
      return
    }

    onSave({
      name: name.trim(),
      description: description.trim() || null,
      company_id: companyId,
      workflow_type: workflowType,
      steps,
    })
  }

  const isValid = name.trim() && steps.every(isStepValid)

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-secondary mb-1">
            Workflow Name <span className="text-error">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Document Review Process"
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
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

      {/* Steps */}
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
            <StepEditor
              key={index}
              step={step}
              index={index}
              totalSteps={steps.length}
              availableUsers={availableUsers}
              availableCustomRoles={availableCustomRoles}
              onUpdate={(updates) => handleUpdateStep(index, updates)}
              onRemove={() => handleRemoveStep(index)}
              onMoveUp={() => handleMoveStep(index, 'up')}
              onMoveDown={() => handleMoveStep(index, 'down')}
              disabled={isLoading}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!isValid || isLoading}>
          {isLoading ? 'Saving...' : initialData ? 'Update Workflow' : 'Create Workflow'}
        </Button>
      </div>
    </div>
  )
}

interface StepEditorProps {
  step: CreateStepInput
  index: number
  totalSteps: number
  availableUsers: Array<{ id: string; full_name: string | null; email: string }>
  availableCustomRoles: CustomRole[]
  onUpdate: (updates: Partial<CreateStepInput>) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  disabled?: boolean
}

function StepEditor({
  step,
  index,
  totalSteps,
  availableUsers,
  availableCustomRoles,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  disabled,
}: StepEditorProps) {
  const isStepValid = (): boolean => {
    switch (step.approver_type) {
      case 'user':
        return (step.approver_ids?.length ?? 0) > 0
      case 'role':
        return !!step.approver_role
      case 'custom_role':
        return !!step.approver_custom_role_id
      case 'any':
        return true
      default:
        return false
    }
  }

  const hasError = !isStepValid()

  const handleApproverTypeChange = (newType: ApproverType) => {
    // Reset approver-specific fields when changing type
    onUpdate({
      approver_type: newType,
      approver_ids: newType === 'user' ? [] : undefined,
      approver_role: newType === 'role' ? null : null,
      approver_custom_role_id: newType === 'custom_role' ? null : null,
    })
  }

  return (
    <div
      className={cn(
        'border rounded-lg p-4',
        hasError ? 'border-red-300 bg-error-light' : 'border-border bg-card'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 bg-info-light text-primary-hover rounded-full text-xs font-medium">
            {index + 1}
          </span>
          <input
            type="text"
            value={step.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Step name"
            className="font-medium text-foreground bg-transparent border-0 border-b border-transparent hover:border-input focus:border-blue-500 focus:outline-none px-1"
            disabled={disabled}
          />
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

      {/* Approver Type Selection */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-secondary mb-1">
          Approver Type <span className="text-error">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {APPROVER_TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleApproverTypeChange(option.value)}
              disabled={disabled || (option.value === 'custom_role' && availableCustomRoles.length === 0)}
              className={cn(
                'px-3 py-2 text-xs rounded-md border transition-colors text-left',
                step.approver_type === option.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-input hover:border-gray-400 text-secondary',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              title={option.description}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Approver Selection based on type */}
      <div className="mb-3">
        {step.approver_type === 'user' && (
          <>
            <label className="block text-xs font-medium text-secondary mb-1">
              Select Users <span className="text-error">*</span>
            </label>
            <select
              multiple
              value={step.approver_ids || []}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, (option) => option.value)
                onUpdate({ approver_ids: selected })
              }}
              className={cn(
                'w-full px-2 py-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
                hasError ? 'border-red-300' : 'border-input'
              )}
              size={Math.min(3, availableUsers.length)}
              disabled={disabled}
            >
              {availableUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.email}
                </option>
              ))}
            </select>
            {hasError && (
              <p className="text-xs text-error mt-1">Select at least one approver</p>
            )}
            <p className="text-xs text-muted mt-1">
              Hold Ctrl/Cmd to select multiple approvers
            </p>
          </>
        )}

        {step.approver_type === 'role' && (
          <>
            <label className="block text-xs font-medium text-secondary mb-1">
              Select Role <span className="text-error">*</span>
            </label>
            <select
              value={step.approver_role || ''}
              onChange={(e) => onUpdate({ approver_role: e.target.value as DefaultRole })}
              className={cn(
                'w-full px-2 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
                hasError ? 'border-red-300' : 'border-input'
              )}
              disabled={disabled}
            >
              <option value="">Select a role...</option>
              {DEFAULT_ROLES.map((role) => (
                <option key={role} value={role}>
                  {DEFAULT_ROLE_CONFIG[role].label}
                </option>
              ))}
            </select>
            {hasError && (
              <p className="text-xs text-error mt-1">Select a role</p>
            )}
            <p className="text-xs text-muted mt-1">
              Any user with this role on the project can approve
            </p>
          </>
        )}

        {step.approver_type === 'custom_role' && (
          <>
            <label className="block text-xs font-medium text-secondary mb-1">
              Select Custom Role <span className="text-error">*</span>
            </label>
            <select
              value={step.approver_custom_role_id || ''}
              onChange={(e) => onUpdate({ approver_custom_role_id: e.target.value })}
              className={cn(
                'w-full px-2 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
                hasError ? 'border-red-300' : 'border-input'
              )}
              disabled={disabled}
            >
              <option value="">Select a custom role...</option>
              {availableCustomRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            {hasError && (
              <p className="text-xs text-error mt-1">Select a custom role</p>
            )}
            <p className="text-xs text-muted mt-1">
              Users assigned this custom role can approve
            </p>
          </>
        )}

        {step.approver_type === 'any' && (
          <div className="px-3 py-2 bg-info-light rounded-md">
            <p className="text-sm text-info-text">
              Any team member assigned to the project can approve this step.
            </p>
          </div>
        )}
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

export default WorkflowBuilder
