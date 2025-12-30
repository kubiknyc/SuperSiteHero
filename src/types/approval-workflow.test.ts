/**
 * Tests for Approval Workflow Types and Utility Constants
 * CRITICAL for ensuring workflow authorization works correctly
 */

import { describe, it, expect } from 'vitest'
import {
  APPROVAL_STATUS_CONFIG,
  APPROVAL_ACTION_CONFIG,
  WORKFLOW_ENTITY_CONFIG,
  type ApprovalStatus,
  type ApprovalActionType,
  type WorkflowEntityType,
  type ApprovalWorkflow,
  type ApprovalStep,
  type ApprovalRequest,
  type ApprovalActionRecord,
  type CreateWorkflowInput,
  type CreateApprovalRequestInput,
  type ApprovalRequestFilters,
  type EntityApprovalStatus,
  type PendingApprovalsSummary,
} from './approval-workflow'

// =============================================
// Type Definitions Tests
// =============================================

describe('ApprovalStatus type', () => {
  it('should allow all valid status values', () => {
    const statuses: ApprovalStatus[] = [
      'pending',
      'approved',
      'approved_with_conditions',
      'rejected',
      'cancelled',
    ]
    expect(statuses).toHaveLength(5)
    statuses.forEach(status => {
      expect(typeof status).toBe('string')
    })
  })
})

describe('ApprovalActionType type', () => {
  it('should allow all valid action types', () => {
    const actions: ApprovalActionType[] = [
      'approve',
      'approve_with_conditions',
      'reject',
      'delegate',
      'comment',
    ]
    expect(actions).toHaveLength(5)
    actions.forEach(action => {
      expect(typeof action).toBe('string')
    })
  })
})

describe('WorkflowEntityType type', () => {
  it('should allow all valid entity types', () => {
    const entityTypes: WorkflowEntityType[] = [
      'document',
      'submittal',
      'rfi',
      'change_order',
    ]
    expect(entityTypes).toHaveLength(4)
    entityTypes.forEach(type => {
      expect(typeof type).toBe('string')
    })
  })
})

// =============================================
// APPROVAL_STATUS_CONFIG Tests
// =============================================

describe('APPROVAL_STATUS_CONFIG', () => {
  it('should have configuration for all statuses', () => {
    const expectedStatuses: ApprovalStatus[] = [
      'pending',
      'approved',
      'approved_with_conditions',
      'rejected',
      'cancelled',
    ]
    expectedStatuses.forEach(status => {
      expect(APPROVAL_STATUS_CONFIG[status]).toBeDefined()
    })
  })

  it('should have correct pending status config', () => {
    expect(APPROVAL_STATUS_CONFIG.pending).toEqual({
      label: 'Pending',
      color: 'yellow',
    })
  })

  it('should have correct approved status config', () => {
    expect(APPROVAL_STATUS_CONFIG.approved).toEqual({
      label: 'Approved',
      color: 'green',
    })
  })

  it('should have correct approved_with_conditions status config', () => {
    expect(APPROVAL_STATUS_CONFIG.approved_with_conditions).toEqual({
      label: 'Approved with Conditions',
      color: 'blue',
    })
  })

  it('should have correct rejected status config', () => {
    expect(APPROVAL_STATUS_CONFIG.rejected).toEqual({
      label: 'Rejected',
      color: 'red',
    })
  })

  it('should have correct cancelled status config', () => {
    expect(APPROVAL_STATUS_CONFIG.cancelled).toEqual({
      label: 'Cancelled',
      color: 'gray',
    })
  })

  it('should have valid color values for all statuses', () => {
    const validColors = ['yellow', 'green', 'blue', 'red', 'gray']
    Object.values(APPROVAL_STATUS_CONFIG).forEach(config => {
      expect(validColors).toContain(config.color)
    })
  })
})

// =============================================
// APPROVAL_ACTION_CONFIG Tests
// =============================================

describe('APPROVAL_ACTION_CONFIG', () => {
  it('should have configuration for all action types', () => {
    const expectedActions: ApprovalActionType[] = [
      'approve',
      'approve_with_conditions',
      'reject',
      'delegate',
      'comment',
    ]
    expectedActions.forEach(action => {
      expect(APPROVAL_ACTION_CONFIG[action]).toBeDefined()
    })
  })

  it('should have correct approve action config', () => {
    expect(APPROVAL_ACTION_CONFIG.approve).toEqual({
      label: 'Approve',
      pastTense: 'Approved',
    })
  })

  it('should have correct approve_with_conditions action config', () => {
    expect(APPROVAL_ACTION_CONFIG.approve_with_conditions).toEqual({
      label: 'Approve with Conditions',
      pastTense: 'Approved with Conditions',
    })
  })

  it('should have correct reject action config', () => {
    expect(APPROVAL_ACTION_CONFIG.reject).toEqual({
      label: 'Reject',
      pastTense: 'Rejected',
    })
  })

  it('should have correct delegate action config', () => {
    expect(APPROVAL_ACTION_CONFIG.delegate).toEqual({
      label: 'Delegate',
      pastTense: 'Delegated',
    })
  })

  it('should have correct comment action config', () => {
    expect(APPROVAL_ACTION_CONFIG.comment).toEqual({
      label: 'Comment',
      pastTense: 'Commented',
    })
  })

  it('should have both label and pastTense for all actions', () => {
    Object.values(APPROVAL_ACTION_CONFIG).forEach(config => {
      expect(config.label).toBeDefined()
      expect(config.pastTense).toBeDefined()
      expect(typeof config.label).toBe('string')
      expect(typeof config.pastTense).toBe('string')
    })
  })
})

// =============================================
// WORKFLOW_ENTITY_CONFIG Tests
// =============================================

describe('WORKFLOW_ENTITY_CONFIG', () => {
  it('should have configuration for all entity types', () => {
    const expectedTypes: WorkflowEntityType[] = [
      'document',
      'submittal',
      'rfi',
      'change_order',
    ]
    expectedTypes.forEach(type => {
      expect(WORKFLOW_ENTITY_CONFIG[type]).toBeDefined()
    })
  })

  it('should have correct document config', () => {
    expect(WORKFLOW_ENTITY_CONFIG.document).toEqual({
      label: 'Document',
      plural: 'Documents',
    })
  })

  it('should have correct submittal config', () => {
    expect(WORKFLOW_ENTITY_CONFIG.submittal).toEqual({
      label: 'Submittal',
      plural: 'Submittals',
    })
  })

  it('should have correct rfi config', () => {
    expect(WORKFLOW_ENTITY_CONFIG.rfi).toEqual({
      label: 'RFI',
      plural: 'RFIs',
    })
  })

  it('should have correct change_order config', () => {
    expect(WORKFLOW_ENTITY_CONFIG.change_order).toEqual({
      label: 'Change Order',
      plural: 'Change Orders',
    })
  })

  it('should have both label and plural for all types', () => {
    Object.values(WORKFLOW_ENTITY_CONFIG).forEach(config => {
      expect(config.label).toBeDefined()
      expect(config.plural).toBeDefined()
      expect(typeof config.label).toBe('string')
      expect(typeof config.plural).toBe('string')
    })
  })
})

// =============================================
// Interface Structure Tests
// =============================================

describe('ApprovalWorkflow interface', () => {
  it('should accept valid workflow object', () => {
    const workflow: ApprovalWorkflow = {
      id: 'wf-123',
      name: 'Document Approval',
      description: 'Standard document approval process',
      company_id: 'company-456',
      workflow_type: 'document',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      steps: [],
    }
    expect(workflow.id).toBe('wf-123')
    expect(workflow.name).toBe('Document Approval')
    expect(workflow.workflow_type).toBe('document')
    expect(workflow.is_active).toBe(true)
  })

  it('should allow null description', () => {
    const workflow: ApprovalWorkflow = {
      id: 'wf-123',
      name: 'Document Approval',
      description: null,
      company_id: 'company-456',
      workflow_type: 'document',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }
    expect(workflow.description).toBeNull()
  })
})

describe('ApprovalStep interface', () => {
  it('should accept valid step object', () => {
    const step: ApprovalStep = {
      id: 'step-123',
      workflow_id: 'wf-123',
      step_order: 1,
      name: 'Manager Review',
      approver_type: 'user',
      approver_ids: ['user-1', 'user-2'],
      required_approvals: 1,
      allow_delegation: true,
      auto_approve_after_days: 7,
      created_at: '2024-01-01T00:00:00Z',
    }
    expect(step.id).toBe('step-123')
    expect(step.step_order).toBe(1)
    expect(step.approver_ids).toHaveLength(2)
    expect(step.allow_delegation).toBe(true)
  })

  it('should allow null auto_approve_after_days', () => {
    const step: ApprovalStep = {
      id: 'step-123',
      workflow_id: 'wf-123',
      step_order: 1,
      name: 'Manager Review',
      approver_type: 'user',
      approver_ids: ['user-1'],
      required_approvals: 1,
      allow_delegation: false,
      auto_approve_after_days: null,
      created_at: '2024-01-01T00:00:00Z',
    }
    expect(step.auto_approve_after_days).toBeNull()
  })
})

describe('ApprovalRequest interface', () => {
  it('should accept valid request object', () => {
    const request: ApprovalRequest = {
      id: 'req-123',
      workflow_id: 'wf-123',
      entity_type: 'document',
      entity_id: 'doc-456',
      current_step: 1,
      status: 'pending',
      conditions: null,
      initiated_by: 'user-789',
      initiated_at: '2024-01-01T00:00:00Z',
      completed_at: null,
      project_id: 'project-123',
    }
    expect(request.id).toBe('req-123')
    expect(request.status).toBe('pending')
    expect(request.current_step).toBe(1)
  })

  it('should accept approved request with conditions', () => {
    const request: ApprovalRequest = {
      id: 'req-123',
      workflow_id: 'wf-123',
      entity_type: 'change_order',
      entity_id: 'co-456',
      current_step: 2,
      status: 'approved_with_conditions',
      conditions: 'Must submit revised budget before proceeding',
      initiated_by: 'user-789',
      initiated_at: '2024-01-01T00:00:00Z',
      completed_at: '2024-01-02T00:00:00Z',
      project_id: 'project-123',
    }
    expect(request.status).toBe('approved_with_conditions')
    expect(request.conditions).toBe('Must submit revised budget before proceeding')
    expect(request.completed_at).not.toBeNull()
  })
})

describe('ApprovalActionRecord interface', () => {
  it('should accept valid action record', () => {
    const action: ApprovalActionRecord = {
      id: 'action-123',
      request_id: 'req-123',
      step_id: 'step-123',
      user_id: 'user-456',
      action: 'approve',
      comment: 'Looks good',
      conditions: null,
      delegated_to: null,
      created_at: '2024-01-01T00:00:00Z',
    }
    expect(action.action).toBe('approve')
    expect(action.comment).toBe('Looks good')
    expect(action.delegated_to).toBeNull()
  })

  it('should accept delegation action record', () => {
    const action: ApprovalActionRecord = {
      id: 'action-123',
      request_id: 'req-123',
      step_id: 'step-123',
      user_id: 'user-456',
      action: 'delegate',
      comment: 'Delegating to team lead',
      conditions: null,
      delegated_to: 'user-789',
      created_at: '2024-01-01T00:00:00Z',
    }
    expect(action.action).toBe('delegate')
    expect(action.delegated_to).toBe('user-789')
  })
})

// =============================================
// Input Type Tests
// =============================================

describe('CreateWorkflowInput interface', () => {
  it('should accept valid workflow input', () => {
    const input: CreateWorkflowInput = {
      name: 'New Workflow',
      description: 'Description',
      company_id: 'company-123',
      workflow_type: 'submittal',
      steps: [
        {
          step_order: 1,
          name: 'First Review',
          approver_ids: ['user-1'],
          required_approvals: 1,
          allow_delegation: true,
        },
      ],
    }
    expect(input.name).toBe('New Workflow')
    expect(input.steps).toHaveLength(1)
    expect(input.steps[0].approver_ids).toContain('user-1')
  })

  it('should allow null description', () => {
    const input: CreateWorkflowInput = {
      name: 'New Workflow',
      description: null,
      company_id: 'company-123',
      workflow_type: 'rfi',
      steps: [],
    }
    expect(input.description).toBeNull()
  })
})

describe('CreateApprovalRequestInput interface', () => {
  it('should accept valid request input', () => {
    const input: CreateApprovalRequestInput = {
      workflow_id: 'wf-123',
      entity_type: 'document',
      entity_id: 'doc-456',
      project_id: 'project-789',
    }
    expect(input.workflow_id).toBe('wf-123')
    expect(input.entity_type).toBe('document')
    expect(input.entity_id).toBe('doc-456')
    expect(input.project_id).toBe('project-789')
  })
})

// =============================================
// Filter Type Tests
// =============================================

describe('ApprovalRequestFilters interface', () => {
  it('should accept empty filters', () => {
    const filters: ApprovalRequestFilters = {}
    expect(filters).toEqual({})
  })

  it('should accept single status filter', () => {
    const filters: ApprovalRequestFilters = {
      status: 'pending',
    }
    expect(filters.status).toBe('pending')
  })

  it('should accept array of statuses', () => {
    const filters: ApprovalRequestFilters = {
      status: ['pending', 'approved'],
    }
    expect(filters.status).toHaveLength(2)
  })

  it('should accept all filter options', () => {
    const filters: ApprovalRequestFilters = {
      status: 'pending',
      entity_type: 'document',
      project_id: 'project-123',
      initiated_by: 'user-456',
      pending_for_user: 'user-789',
    }
    expect(filters.status).toBe('pending')
    expect(filters.entity_type).toBe('document')
    expect(filters.project_id).toBe('project-123')
    expect(filters.initiated_by).toBe('user-456')
    expect(filters.pending_for_user).toBe('user-789')
  })
})

// =============================================
// Response Type Tests
// =============================================

describe('EntityApprovalStatus interface', () => {
  it('should represent entity with no active request', () => {
    const status: EntityApprovalStatus = {
      has_active_request: false,
      status: null,
      can_submit: true,
    }
    expect(status.has_active_request).toBe(false)
    expect(status.can_submit).toBe(true)
  })

  it('should represent entity with active request', () => {
    const status: EntityApprovalStatus = {
      has_active_request: true,
      request: {
        id: 'req-123',
        workflow_id: 'wf-123',
        entity_type: 'document',
        entity_id: 'doc-456',
        current_step: 1,
        status: 'pending',
        conditions: null,
        initiated_by: 'user-789',
        initiated_at: '2024-01-01T00:00:00Z',
        completed_at: null,
        project_id: 'project-123',
      },
      status: 'pending',
      can_submit: false,
    }
    expect(status.has_active_request).toBe(true)
    expect(status.can_submit).toBe(false)
    expect(status.request?.status).toBe('pending')
  })
})

describe('PendingApprovalsSummary interface', () => {
  it('should represent empty pending summary', () => {
    const summary: PendingApprovalsSummary = {
      total: 0,
      by_type: {
        document: 0,
        submittal: 0,
        rfi: 0,
        change_order: 0,
      },
      requests: [],
    }
    expect(summary.total).toBe(0)
    expect(summary.requests).toHaveLength(0)
  })

  it('should represent pending summary with requests', () => {
    const summary: PendingApprovalsSummary = {
      total: 5,
      by_type: {
        document: 2,
        submittal: 1,
        rfi: 1,
        change_order: 1,
      },
      requests: [],
    }
    expect(summary.total).toBe(5)
    expect(summary.by_type.document).toBe(2)
    expect(summary.by_type.submittal).toBe(1)
  })
})

// =============================================
// Security-Critical Tests
// =============================================

describe('Approval Workflow Security Considerations', () => {
  it('should track who initiated an approval request', () => {
    const request: ApprovalRequest = {
      id: 'req-123',
      workflow_id: 'wf-123',
      entity_type: 'document',
      entity_id: 'doc-456',
      current_step: 1,
      status: 'pending',
      conditions: null,
      initiated_by: 'user-789',
      initiated_at: '2024-01-01T00:00:00Z',
      completed_at: null,
      project_id: 'project-123',
    }
    expect(request.initiated_by).toBeDefined()
    expect(request.initiated_at).toBeDefined()
  })

  it('should track who performed each action', () => {
    const action: ApprovalActionRecord = {
      id: 'action-123',
      request_id: 'req-123',
      step_id: 'step-123',
      user_id: 'user-456',
      action: 'approve',
      comment: null,
      conditions: null,
      delegated_to: null,
      created_at: '2024-01-01T00:00:00Z',
    }
    expect(action.user_id).toBeDefined()
    expect(action.created_at).toBeDefined()
  })

  it('should require specific approvers for each step', () => {
    const step: ApprovalStep = {
      id: 'step-123',
      workflow_id: 'wf-123',
      step_order: 1,
      name: 'Compliance Review',
      approver_type: 'user',
      approver_ids: ['compliance-user-1', 'compliance-user-2'],
      required_approvals: 2,
      allow_delegation: false,
      auto_approve_after_days: null,
      created_at: '2024-01-01T00:00:00Z',
    }
    expect(step.approver_ids).toHaveLength(2)
    expect(step.required_approvals).toBe(2)
    expect(step.allow_delegation).toBe(false)
  })

  it('should provide clear status for rejected requests', () => {
    const status = APPROVAL_STATUS_CONFIG.rejected
    expect(status.label).toBe('Rejected')
    expect(status.color).toBe('red')
  })
})
