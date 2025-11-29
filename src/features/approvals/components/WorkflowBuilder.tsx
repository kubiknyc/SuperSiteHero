/**
 * Workflow Builder Component
 *
 * UI for creating and editing approval workflows with steps
 */

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type {
  CreateStepInput,
  CreateWorkflowInput,
  WorkflowEntityType,
  ApprovalWorkflow,
} from '@/types/approval-workflow'
import { WORKFLOW_ENTITY_CONFIG } from '@/types/approval-workflow'

interface WorkflowBuilderProps {
  initialData?: ApprovalWorkflow
  companyId: string
  onSave: (data: CreateWorkflowInput) => void
  onCancel: () => void
  isLoading?: boolean
  availableUsers: Array<{ id: string; full_name: string | null; email: string }>
}

export function WorkflowBuilder({
  initialData,
  companyId,
  onSave,
  onCancel,
  isLoading = false,
  availableUsers,
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
      approver_ids: s.approver_ids,
      required_approvals: s.required_approvals,
      allow_delegation: s.allow_delegation,
      auto_approve_after_days: s.auto_approve_after_days,
    })) || [
      {
        step_order: 1,
        name: 'Review',
        approver_ids: [],
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
        approver_ids: [],
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

  const handleSave = () => {
    if (!name.trim() || steps.some((s) => s.approver_ids.length === 0)) {
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

  const isValid = name.trim() && steps.every((s) => s.approver_ids.length > 0)

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Workflow Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Document Review Process"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description of this workflow..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={2}
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Applies To <span className="text-red-500">*</span>
          </label>
          <select
            value={workflowType}
            onChange={(e) => setWorkflowType(e.target.value as WorkflowEntityType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <h3 className="text-sm font-medium text-gray-700">Approval Steps</h3>
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
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  disabled,
}: StepEditorProps) {
  const hasError = step.approver_ids.length === 0

  return (
    <div
      className={cn(
        'border rounded-lg p-4',
        hasError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            {index + 1}
          </span>
          <input
            type="text"
            value={step.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Step name"
            className="font-medium text-gray-900 bg-transparent border-0 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1"
            disabled={disabled}
          />
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={disabled || index === 0}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
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
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
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
            className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-30"
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
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Approvers <span className="text-red-500">*</span>
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
            hasError ? 'border-red-300' : 'border-gray-300'
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
          <p className="text-xs text-red-600 mt-1">Select at least one approver</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
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
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            disabled={disabled}
          />
          <span className="text-gray-600">Allow delegation</span>
        </label>

        <div className="flex items-center gap-2">
          <label className="text-gray-600">Auto-approve after</label>
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
            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="days"
            disabled={disabled}
          />
          <span className="text-gray-600">days</span>
        </div>
      </div>
    </div>
  )
}

export default WorkflowBuilder
