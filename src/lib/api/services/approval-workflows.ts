/**
 * Approval Workflows API Service
 *
 * Manages approval workflow templates (CRUD operations)
 */

import { supabase } from '@/lib/supabase'
import { ApiErrorClass } from '../errors'
import type {
  ApprovalWorkflow,
  ApprovalStep,
  CreateWorkflowInput,
  UpdateWorkflowInput,
  ApprovalWorkflowFilters,
  WorkflowEntityType,
} from '@/types/approval-workflow'

// Note: Using extended Database types from database-extensions.ts
// Once migration 023 is applied to remote database, regenerate types and switch back to database.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export const approvalWorkflowsApi = {
  /**
   * Fetch all workflows for a company, optionally filtered by type
   */
  async getWorkflows(filters: ApprovalWorkflowFilters): Promise<ApprovalWorkflow[]> {
    try {
      if (!filters.company_id) {
        throw new ApiErrorClass({
          code: 'COMPANY_ID_REQUIRED',
          message: 'Company ID is required',
        })
      }

      let query = db
        .from('approval_workflows')
        .select(`
          *,
          steps:approval_steps(*)
        `)
        .eq('company_id', filters.company_id)
        .order('created_at', { ascending: false })

      if (filters.workflow_type) {
        query = query.eq('workflow_type', filters.workflow_type)
      }

      if (filters.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active)
      }

      const { data, error } = await query

      if (error) throw error

      // Sort steps by step_order within each workflow
      return (data || []).map((workflow: ApprovalWorkflow) => ({
        ...workflow,
        steps: (workflow.steps || []).sort((a: ApprovalStep, b: ApprovalStep) =>
          a.step_order - b.step_order
        ),
      })) as ApprovalWorkflow[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_WORKFLOWS_ERROR',
            message: 'Failed to fetch approval workflows',
            details: error,
          })
    }
  },

  /**
   * Fetch a single workflow with its steps
   */
  async getWorkflow(workflowId: string): Promise<ApprovalWorkflow> {
    try {
      if (!workflowId) {
        throw new ApiErrorClass({
          code: 'WORKFLOW_ID_REQUIRED',
          message: 'Workflow ID is required',
        })
      }

      const { data, error } = await db
        .from('approval_workflows')
        .select(`
          *,
          steps:approval_steps(*)
        `)
        .eq('id', workflowId)
        .single()

      if (error) throw error
      if (!data) {
        throw new ApiErrorClass({
          code: 'WORKFLOW_NOT_FOUND',
          message: 'Approval workflow not found',
        })
      }

      // Sort steps by step_order
      return {
        ...data,
        steps: (data.steps || []).sort((a: ApprovalStep, b: ApprovalStep) =>
          a.step_order - b.step_order
        ),
      } as ApprovalWorkflow
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_WORKFLOW_ERROR',
            message: 'Failed to fetch approval workflow',
            details: error,
          })
    }
  },

  /**
   * Create a new workflow with steps
   * Uses a transaction-like approach (workflow first, then steps)
   */
  async createWorkflow(input: CreateWorkflowInput): Promise<ApprovalWorkflow> {
    try {
      // Validate input
      if (!input.company_id) {
        throw new ApiErrorClass({
          code: 'COMPANY_ID_REQUIRED',
          message: 'Company ID is required',
        })
      }

      if (!input.name?.trim()) {
        throw new ApiErrorClass({
          code: 'NAME_REQUIRED',
          message: 'Workflow name is required',
        })
      }

      if (!input.workflow_type) {
        throw new ApiErrorClass({
          code: 'WORKFLOW_TYPE_REQUIRED',
          message: 'Workflow type is required',
        })
      }

      if (!input.steps || input.steps.length === 0) {
        throw new ApiErrorClass({
          code: 'STEPS_REQUIRED',
          message: 'At least one approval step is required',
        })
      }

      // Create workflow
      const { data: workflow, error: workflowError } = await db
        .from('approval_workflows')
        .insert({
          name: input.name.trim(),
          description: input.description || null,
          company_id: input.company_id,
          workflow_type: input.workflow_type,
          is_active: true,
        })
        .select()
        .single()

      if (workflowError) throw workflowError

      // Create steps
      const stepsToInsert = input.steps.map((step, index) => ({
        workflow_id: workflow.id,
        step_order: step.step_order ?? index + 1,
        name: step.name,
        approver_type: 'user' as const, // Only user-based for now
        approver_ids: step.approver_ids,
        required_approvals: step.required_approvals ?? 1,
        allow_delegation: step.allow_delegation ?? false,
        auto_approve_after_days: step.auto_approve_after_days ?? null,
      }))

      const { data: steps, error: stepsError } = await db
        .from('approval_steps')
        .insert(stepsToInsert)
        .select()

      if (stepsError) {
        // Rollback: delete the workflow if steps failed
        await db.from('approval_workflows').delete().eq('id', workflow.id)
        throw stepsError
      }

      // TODO: Trigger email notification when Email Integration is implemented

      return {
        ...workflow,
        steps: (steps || []).sort((a: ApprovalStep, b: ApprovalStep) => a.step_order - b.step_order),
      } as ApprovalWorkflow
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_WORKFLOW_ERROR',
            message: 'Failed to create approval workflow',
            details: error,
          })
    }
  },

  /**
   * Update an existing workflow and optionally replace its steps
   */
  async updateWorkflow(
    workflowId: string,
    input: UpdateWorkflowInput
  ): Promise<ApprovalWorkflow> {
    try {
      if (!workflowId) {
        throw new ApiErrorClass({
          code: 'WORKFLOW_ID_REQUIRED',
          message: 'Workflow ID is required',
        })
      }

      // Build update object
      const updates: Record<string, any> = {}
      if (input.name !== undefined) updates.name = input.name.trim()
      if (input.description !== undefined) updates.description = input.description
      if (input.is_active !== undefined) updates.is_active = input.is_active

      // Update workflow if there are field updates
      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await db
          .from('approval_workflows')
          .update(updates)
          .eq('id', workflowId)

        if (updateError) throw updateError
      }

      // Replace steps if provided
      if (input.steps) {
        // Delete existing steps
        const { error: deleteError } = await db
          .from('approval_steps')
          .delete()
          .eq('workflow_id', workflowId)

        if (deleteError) throw deleteError

        // Insert new steps
        if (input.steps.length > 0) {
          const stepsToInsert = input.steps.map((step, index) => ({
            workflow_id: workflowId,
            step_order: step.step_order ?? index + 1,
            name: step.name,
            approver_type: 'user' as const,
            approver_ids: step.approver_ids,
            required_approvals: step.required_approvals ?? 1,
            allow_delegation: step.allow_delegation ?? false,
            auto_approve_after_days: step.auto_approve_after_days ?? null,
          }))

          const { error: insertError } = await db
            .from('approval_steps')
            .insert(stepsToInsert)

          if (insertError) throw insertError
        }
      }

      // Fetch and return updated workflow
      return this.getWorkflow(workflowId)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_WORKFLOW_ERROR',
            message: 'Failed to update approval workflow',
            details: error,
          })
    }
  },

  /**
   * Soft delete a workflow (set is_active to false)
   * Preserves history for existing requests
   */
  async deleteWorkflow(workflowId: string): Promise<void> {
    try {
      if (!workflowId) {
        throw new ApiErrorClass({
          code: 'WORKFLOW_ID_REQUIRED',
          message: 'Workflow ID is required',
        })
      }

      const { error } = await db
        .from('approval_workflows')
        .update({ is_active: false })
        .eq('id', workflowId)

      if (error) throw error
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DELETE_WORKFLOW_ERROR',
            message: 'Failed to delete approval workflow',
            details: error,
          })
    }
  },

  /**
   * Duplicate an existing workflow with a new name
   */
  async duplicateWorkflow(
    workflowId: string,
    newName: string
  ): Promise<ApprovalWorkflow> {
    try {
      if (!workflowId) {
        throw new ApiErrorClass({
          code: 'WORKFLOW_ID_REQUIRED',
          message: 'Workflow ID is required',
        })
      }

      if (!newName?.trim()) {
        throw new ApiErrorClass({
          code: 'NAME_REQUIRED',
          message: 'New workflow name is required',
        })
      }

      // Fetch existing workflow
      const existing = await this.getWorkflow(workflowId)

      // Create new workflow with same configuration
      return this.createWorkflow({
        name: newName.trim(),
        description: existing.description,
        company_id: existing.company_id,
        workflow_type: existing.workflow_type,
        steps: (existing.steps || []).map(step => ({
          step_order: step.step_order,
          name: step.name,
          approver_ids: step.approver_ids,
          required_approvals: step.required_approvals,
          allow_delegation: step.allow_delegation,
          auto_approve_after_days: step.auto_approve_after_days,
        })),
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DUPLICATE_WORKFLOW_ERROR',
            message: 'Failed to duplicate approval workflow',
            details: error,
          })
    }
  },

  /**
   * Get active workflows by type for a company
   * Useful for workflow selection dropdowns
   */
  async getActiveWorkflowsByType(
    companyId: string,
    workflowType: WorkflowEntityType
  ): Promise<ApprovalWorkflow[]> {
    return this.getWorkflows({
      company_id: companyId,
      workflow_type: workflowType,
      is_active: true,
    })
  },
}
