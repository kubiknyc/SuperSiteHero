/**
 * Workflow List Component
 *
 * Displays a table of approval workflows with actions
 */

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { WORKFLOW_ENTITY_CONFIG, type ApprovalWorkflow, type WorkflowEntityType } from '@/types/approval-workflow'

interface WorkflowListProps {
  workflows: ApprovalWorkflow[]
  isLoading?: boolean
  onEdit?: (workflow: ApprovalWorkflow) => void
  onDuplicate?: (workflow: ApprovalWorkflow) => void
  onDelete?: (workflow: ApprovalWorkflow) => void
  onToggleActive?: (workflow: ApprovalWorkflow) => void
  selectedType?: WorkflowEntityType | 'all'
  onTypeChange?: (type: WorkflowEntityType | 'all') => void
}

export function WorkflowList({
  workflows,
  isLoading = false,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleActive,
  selectedType = 'all',
  onTypeChange,
}: WorkflowListProps) {
  const filteredWorkflows =
    selectedType === 'all'
      ? workflows
      : workflows.filter((w) => w.workflow_type === selectedType)

  return (
    <div>
      {/* Type filter tabs */}
      {onTypeChange && (
        <div className="flex gap-1 mb-4 border-b">
          <TypeTab
            label="All"
            value="all"
            selected={selectedType === 'all'}
            count={workflows.length}
            onClick={() => onTypeChange('all')}
          />
          {Object.entries(WORKFLOW_ENTITY_CONFIG).map(([type, config]) => {
            const count = workflows.filter((w) => w.workflow_type === type).length
            return (
              <TypeTab
                key={type}
                label={config.plural}
                value={type as WorkflowEntityType}
                selected={selectedType === type}
                count={count}
                onClick={() => onTypeChange(type as WorkflowEntityType)}
              />
            )
          })}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-8 text-muted">Loading workflows...</div>
      )}

      {/* Empty state */}
      {!isLoading && filteredWorkflows.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted">No approval workflows found.</p>
          <p className="text-sm text-disabled mt-1">
            Create a workflow to start defining approval processes.
          </p>
        </div>
      )}

      {/* Workflow table */}
      {!isLoading && filteredWorkflows.length > 0 && (
        <div className="overflow-hidden border rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-surface">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Workflow
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Steps
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-gray-200">
              {filteredWorkflows.map((workflow) => (
                <WorkflowRow
                  key={workflow.id}
                  workflow={workflow}
                  onEdit={onEdit}
                  onDuplicate={onDuplicate}
                  onDelete={onDelete}
                  onToggleActive={onToggleActive}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

interface TypeTabProps {
  label: string
  value: WorkflowEntityType | 'all'
  selected: boolean
  count: number
  onClick: () => void
}

function TypeTab({ label, value: _value, selected, count, onClick }: TypeTabProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
        selected
          ? 'border-blue-500 text-primary'
          : 'border-transparent text-muted hover:text-secondary hover:border-input'
      )}
    >
      {label}
      <span
        className={cn(
          'ml-2 px-2 py-0.5 text-xs rounded-full',
          selected ? 'bg-info-light text-primary' : 'bg-muted text-secondary'
        )}
      >
        {count}
      </span>
    </button>
  )
}

interface WorkflowRowProps {
  workflow: ApprovalWorkflow
  onEdit?: (workflow: ApprovalWorkflow) => void
  onDuplicate?: (workflow: ApprovalWorkflow) => void
  onDelete?: (workflow: ApprovalWorkflow) => void
  onToggleActive?: (workflow: ApprovalWorkflow) => void
}

function WorkflowRow({
  workflow,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleActive,
}: WorkflowRowProps) {
  const entityConfig = WORKFLOW_ENTITY_CONFIG[workflow.workflow_type]
  const stepCount = workflow.steps?.length || 0

  return (
    <tr className="hover:bg-surface">
      <td className="px-4 py-3">
        <div className="font-medium text-foreground">{workflow.name}</div>
        {workflow.description && (
          <div className="text-sm text-muted truncate max-w-xs">
            {workflow.description}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-foreground">
          {entityConfig.plural}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-muted">
        {stepCount} step{stepCount !== 1 ? 's' : ''}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onToggleActive?.(workflow)}
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
            workflow.is_active
              ? 'bg-success-light text-green-800 hover:bg-green-200'
              : 'bg-muted text-secondary hover:bg-muted'
          )}
        >
          {workflow.is_active ? 'Active' : 'Inactive'}
        </button>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-1">
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(workflow)}
              title="Edit"
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
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </Button>
          )}
          {onDuplicate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDuplicate(workflow)}
              title="Duplicate"
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
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(workflow)}
              title="Delete"
              className="text-error hover:text-error-dark hover:bg-error-light"
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </Button>
          )}
        </div>
      </td>
    </tr>
  )
}

export default WorkflowList
