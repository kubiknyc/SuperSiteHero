/**
 * RFI Factory
 * Creates mock RFI (workflow_items) data for testing
 */

import { faker } from '@faker-js/faker';
import type { WorkflowItem, WorkflowItemComment, WorkflowItemHistory, WorkflowType } from '@/types/database';

// Factory options
export interface RFIFactoryOptions {
  id?: string;
  project_id?: string;
  workflow_type_id?: string;
  number?: number;
  title?: string;
  description?: string;
  status?: 'pending' | 'submitted' | 'approved' | 'rejected' | 'closed';
  priority?: 'low' | 'normal' | 'high';
  due_date?: string | null;
  assignees?: string[];
  raised_by?: string;
  created_by?: string;
}

export interface RFICommentFactoryOptions {
  id?: string;
  workflow_item_id?: string;
  comment?: string;
  created_by?: string;
  mentioned_users?: string[];
}

export interface RFIHistoryFactoryOptions {
  id?: string;
  workflow_item_id?: string;
  field_name?: string;
  old_value?: string | null;
  new_value?: string | null;
  changed_by?: string;
}

export interface WorkflowTypeFactoryOptions {
  id?: string;
  company_id?: string;
  name_singular?: string;
  name_plural?: string;
  prefix?: string;
}

/**
 * Create a mock RFI (WorkflowItem)
 */
export function createMockRFI(options: RFIFactoryOptions = {}): WorkflowItem {
  const id = options.id ?? faker.string.uuid();
  const projectId = options.project_id ?? faker.string.uuid();
  const workflowTypeId = options.workflow_type_id ?? faker.string.uuid();
  const createdAt = faker.date.past().toISOString();
  const raisedBy = options.raised_by ?? faker.string.uuid();

  return {
    id,
    project_id: projectId,
    workflow_type_id: workflowTypeId,
    number: options.number ?? faker.number.int({ min: 1, max: 999 }),
    title: options.title ?? `RFI: ${faker.lorem.sentence(5)}`,
    description: options.description ?? faker.lorem.paragraph(),
    more_information: faker.lorem.paragraph(2),
    status: options.status ?? 'pending',
    priority: options.priority ?? 'normal',
    discipline: faker.helpers.arrayElement(['Structural', 'MEP', 'Civil', 'Architectural', 'General']),
    due_date: options.due_date !== undefined ? options.due_date : faker.date.future().toISOString().split('T')[0],
    assignees: options.assignees ?? [faker.string.uuid(), faker.string.uuid()],
    raised_by: raisedBy,
    created_by: options.created_by ?? raisedBy,
    opened_date: null,
    closed_date: null,
    deleted_at: null,
    response_required_date: null,
    responded_date: null,
    response_type: null,
    resolution: null,
    estimated_cost_impact: null,
    estimated_schedule_impact: null,
    tags: [],
    custom_fields: {},
    company_id: faker.string.uuid(),
    created_at: createdAt,
    updated_at: faker.date.between({ from: createdAt, to: new Date() }).toISOString(),
  } as WorkflowItem;
}

/**
 * Create a pending RFI
 */
export function createMockPendingRFI(options: Omit<RFIFactoryOptions, 'status'> = {}): WorkflowItem {
  return createMockRFI({ ...options, status: 'pending' });
}

/**
 * Create a submitted RFI with opened_date set
 */
export function createMockSubmittedRFI(options: Omit<RFIFactoryOptions, 'status'> = {}): WorkflowItem {
  const rfi = createMockRFI({ ...options, status: 'submitted' });
  return {
    ...rfi,
    opened_date: faker.date.recent({ days: 7 }).toISOString(),
  };
}

/**
 * Create an approved RFI
 */
export function createMockApprovedRFI(options: Omit<RFIFactoryOptions, 'status'> = {}): WorkflowItem {
  const rfi = createMockRFI({ ...options, status: 'approved' });
  return {
    ...rfi,
    opened_date: faker.date.recent({ days: 14 }).toISOString(),
    responded_date: faker.date.recent({ days: 3 }).toISOString(),
    response_type: 'approved',
    resolution: faker.lorem.paragraph(),
  };
}

/**
 * Create a rejected RFI
 */
export function createMockRejectedRFI(options: Omit<RFIFactoryOptions, 'status'> = {}): WorkflowItem {
  const rfi = createMockRFI({ ...options, status: 'rejected' });
  return {
    ...rfi,
    opened_date: faker.date.recent({ days: 14 }).toISOString(),
    responded_date: faker.date.recent({ days: 3 }).toISOString(),
    response_type: 'rejected',
    resolution: faker.lorem.paragraph(),
  };
}

/**
 * Create a closed RFI
 */
export function createMockClosedRFI(options: Omit<RFIFactoryOptions, 'status'> = {}): WorkflowItem {
  const rfi = createMockRFI({ ...options, status: 'closed' });
  return {
    ...rfi,
    opened_date: faker.date.recent({ days: 30 }).toISOString(),
    responded_date: faker.date.recent({ days: 10 }).toISOString(),
    closed_date: faker.date.recent({ days: 2 }).toISOString(),
    response_type: 'approved',
    resolution: faker.lorem.paragraph(),
  };
}

/**
 * Create a high priority RFI
 */
export function createMockHighPriorityRFI(options: Omit<RFIFactoryOptions, 'priority'> = {}): WorkflowItem {
  return createMockRFI({ ...options, priority: 'high' });
}

/**
 * Create an overdue RFI (due_date in the past)
 */
export function createMockOverdueRFI(options: RFIFactoryOptions = {}): WorkflowItem {
  return createMockRFI({
    ...options,
    due_date: faker.date.past({ years: 0.1 }).toISOString().split('T')[0],
    status: options.status ?? 'submitted',
  });
}

/**
 * Create an RFI with empty assignees array
 */
export function createMockUnassignedRFI(options: Omit<RFIFactoryOptions, 'assignees'> = {}): WorkflowItem {
  return createMockRFI({ ...options, assignees: [] });
}

/**
 * Create an RFI with no due date
 */
export function createMockRFIWithoutDueDate(options: Omit<RFIFactoryOptions, 'due_date'> = {}): WorkflowItem {
  return createMockRFI({ ...options, due_date: null });
}

/**
 * Create multiple RFIs
 */
export function createMockRFIs(count: number, options: RFIFactoryOptions = {}): WorkflowItem[] {
  return Array.from({ length: count }, (_, index) =>
    createMockRFI({ ...options, number: options.number ?? index + 1 })
  );
}

/**
 * Create an RFI comment
 */
export function createMockRFIComment(options: RFICommentFactoryOptions = {}): WorkflowItemComment {
  const id = options.id ?? faker.string.uuid();
  const createdAt = faker.date.past().toISOString();

  return {
    id,
    workflow_item_id: options.workflow_item_id ?? faker.string.uuid(),
    comment: options.comment ?? faker.lorem.sentence(10),
    mentioned_users: options.mentioned_users ?? [],
    created_by: options.created_by ?? faker.string.uuid(),
    created_at: createdAt,
    updated_at: createdAt,
    deleted_at: null,
  } as WorkflowItemComment;
}

/**
 * Create multiple RFI comments
 */
export function createMockRFIComments(
  count: number,
  workflowItemId: string,
  options: Omit<RFICommentFactoryOptions, 'workflow_item_id'> = {}
): WorkflowItemComment[] {
  return Array.from({ length: count }, () =>
    createMockRFIComment({ ...options, workflow_item_id: workflowItemId })
  );
}

/**
 * Create an RFI history entry
 */
export function createMockRFIHistory(options: RFIHistoryFactoryOptions = {}): WorkflowItemHistory {
  const id = options.id ?? faker.string.uuid();
  const fieldName = options.field_name ?? faker.helpers.arrayElement(['status', 'priority', 'assignees', 'title', 'due_date']);

  return {
    id,
    workflow_item_id: options.workflow_item_id ?? faker.string.uuid(),
    field_name: fieldName,
    old_value: options.old_value !== undefined ? options.old_value : faker.lorem.word(),
    new_value: options.new_value !== undefined ? options.new_value : faker.lorem.word(),
    changed_by: options.changed_by ?? faker.string.uuid(),
    changed_at: faker.date.recent().toISOString(),
  } as WorkflowItemHistory;
}

/**
 * Create a status change history entry
 */
export function createMockStatusChangeHistory(
  workflowItemId: string,
  oldStatus: string,
  newStatus: string,
  changedBy: string
): WorkflowItemHistory {
  return createMockRFIHistory({
    workflow_item_id: workflowItemId,
    field_name: 'status',
    old_value: oldStatus,
    new_value: newStatus,
    changed_by: changedBy,
  });
}

/**
 * Create multiple RFI history entries
 */
export function createMockRFIHistoryEntries(
  count: number,
  workflowItemId: string,
  options: Omit<RFIHistoryFactoryOptions, 'workflow_item_id'> = {}
): WorkflowItemHistory[] {
  return Array.from({ length: count }, () =>
    createMockRFIHistory({ ...options, workflow_item_id: workflowItemId })
  );
}

/**
 * Create an RFI workflow type configuration
 */
export function createMockRFIWorkflowType(options: WorkflowTypeFactoryOptions = {}): WorkflowType {
  return {
    id: options.id ?? faker.string.uuid(),
    company_id: options.company_id ?? faker.string.uuid(),
    name_singular: options.name_singular ?? 'RFI',
    name_plural: options.name_plural ?? 'RFIs',
    prefix: options.prefix ?? 'RFI',
    description: 'Request for Information',
    icon: 'MessageSquare',
    color: '#3b82f6',
    is_active: true,
    default_status: 'pending',
    status_workflow: ['pending', 'submitted', 'approved', 'rejected', 'closed'],
    allowed_transitions: {
      pending: ['submitted', 'closed'],
      submitted: ['approved', 'rejected', 'closed'],
      approved: ['closed'],
      rejected: ['closed'],
      closed: [],
    },
    required_fields: ['title', 'description'],
    optional_fields: ['more_information', 'discipline', 'priority', 'due_date'],
    custom_fields_schema: {},
    default_priority: 'normal',
    auto_numbering: true,
    numbering_pattern: '{prefix}-{project_number}-{item_number}',
    notification_settings: {
      on_create: ['assignees'],
      on_status_change: ['created_by', 'assignees'],
      on_comment: ['created_by', 'assignees', 'mentioned_users'],
    },
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
  } as WorkflowType;
}

/**
 * Create RFI with all related data (comments and history)
 */
export function createMockRFIWithContext(
  options: RFIFactoryOptions = {}
): {
  rfi: WorkflowItem;
  comments: WorkflowItemComment[];
  history: WorkflowItemHistory[];
} {
  const rfi = createMockRFI(options);
  const comments = createMockRFIComments(3, rfi.id);
  const history = createMockRFIHistoryEntries(5, rfi.id);

  return { rfi, comments, history };
}

// Default test RFIs for consistent testing
export const TEST_RFIS = {
  pending: createMockPendingRFI({
    id: 'test-rfi-pending',
    project_id: 'test-project-1',
    workflow_type_id: 'test-workflow-type-rfi',
    number: 1,
    title: 'Test Pending RFI',
  }),
  submitted: createMockSubmittedRFI({
    id: 'test-rfi-submitted',
    project_id: 'test-project-1',
    workflow_type_id: 'test-workflow-type-rfi',
    number: 2,
    title: 'Test Submitted RFI',
  }),
  approved: createMockApprovedRFI({
    id: 'test-rfi-approved',
    project_id: 'test-project-1',
    workflow_type_id: 'test-workflow-type-rfi',
    number: 3,
    title: 'Test Approved RFI',
  }),
  closed: createMockClosedRFI({
    id: 'test-rfi-closed',
    project_id: 'test-project-1',
    workflow_type_id: 'test-workflow-type-rfi',
    number: 4,
    title: 'Test Closed RFI',
  }),
  highPriority: createMockHighPriorityRFI({
    id: 'test-rfi-high-priority',
    project_id: 'test-project-1',
    workflow_type_id: 'test-workflow-type-rfi',
    number: 5,
    title: 'Test High Priority RFI',
  }),
  overdue: createMockOverdueRFI({
    id: 'test-rfi-overdue',
    project_id: 'test-project-1',
    workflow_type_id: 'test-workflow-type-rfi',
    number: 6,
    title: 'Test Overdue RFI',
  }),
};
