/**
 * Action Item Test Data Factory
 * Creates mock action items for testing
 */

import type {
  ActionItem,
  ActionItemWithContext,
  ActionItemProjectSummary,
  ActionItemsByAssignee,
  ActionItemStatus,
  ActionItemPriority,
  ActionItemCategory,
  UrgencyStatus,
  ActionItemResolutionType,
} from '@/types/action-items';

export type MockActionItem = ActionItem;
export type MockActionItemWithContext = ActionItemWithContext;
export type MockActionItemProjectSummary = ActionItemProjectSummary;
export type MockActionItemsByAssignee = ActionItemsByAssignee;

export interface ActionItemFactoryOptions {
  id?: string;
  meeting_id?: string;
  project_id?: string;
  title?: string;
  description?: string | null;
  assigned_to?: string | null;
  assigned_company?: string | null;
  due_date?: string | null;
  status?: ActionItemStatus;
  priority?: ActionItemPriority | null;
  category?: ActionItemCategory | null;
  task_id?: string | null;
  related_rfi_id?: string | null;
  constraint_id?: string | null;
  related_change_order_id?: string | null;
  related_submittal_id?: string | null;
  carried_from_meeting_id?: string | null;
  carried_to_meeting_id?: string | null;
  carryover_count?: number;
  escalation_level?: number;
  escalated_at?: string | null;
  escalated_to?: string | null;
  resolution_type?: ActionItemResolutionType | null;
  resolution_notes?: string | null;
  resolved_at?: string | null;
  resolved_by?: string | null;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
}

export interface ActionItemWithContextFactoryOptions extends ActionItemFactoryOptions {
  meeting_type?: string;
  meeting_date?: string;
  meeting_number?: number | null;
  meeting_title?: string;
  urgency_status?: UrgencyStatus;
  days_until_due?: number | null;
}

let actionItemCounter = 0;

/**
 * Create a mock action item
 */
export function createMockActionItem(
  options: ActionItemFactoryOptions = {}
): MockActionItem {
  const id = options.id ?? `action-item-${++actionItemCounter}`;
  const now = new Date().toISOString();

  return {
    id,
    meeting_id: options.meeting_id ?? 'meeting-1',
    project_id: options.project_id ?? 'project-1',
    title: options.title ?? `Action Item ${actionItemCounter}`,
    description: options.description ?? 'Test action item description',
    assigned_to: options.assigned_to ?? 'John Doe',
    assigned_company: options.assigned_company ?? 'ABC Construction',
    due_date: options.due_date ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: options.status ?? 'open',
    priority: options.priority ?? 'normal',
    category: options.category ?? 'coordination',
    task_id: options.task_id ?? null,
    related_rfi_id: options.related_rfi_id ?? null,
    constraint_id: options.constraint_id ?? null,
    related_change_order_id: options.related_change_order_id ?? null,
    related_submittal_id: options.related_submittal_id ?? null,
    carried_from_meeting_id: options.carried_from_meeting_id ?? null,
    carried_to_meeting_id: options.carried_to_meeting_id ?? null,
    carryover_count: options.carryover_count ?? 0,
    escalation_level: options.escalation_level ?? 0,
    escalated_at: options.escalated_at ?? null,
    escalated_to: options.escalated_to ?? null,
    resolution_type: options.resolution_type ?? null,
    resolution_notes: options.resolution_notes ?? null,
    resolved_at: options.resolved_at ?? null,
    resolved_by: options.resolved_by ?? null,
    created_at: options.created_at ?? now,
    updated_at: options.updated_at ?? now,
    created_by: options.created_by ?? 'user-1',
  };
}

/**
 * Create a mock action item with context
 */
export function createMockActionItemWithContext(
  options: ActionItemWithContextFactoryOptions = {}
): MockActionItemWithContext {
  const baseItem = createMockActionItem(options);
  const meetingDate = options.meeting_date ?? new Date().toISOString();

  return {
    ...baseItem,
    meeting_type: options.meeting_type ?? 'weekly',
    meeting_date: meetingDate,
    meeting_number: options.meeting_number ?? 1,
    meeting_title: options.meeting_title ?? 'Weekly Progress Meeting #1',
    urgency_status: options.urgency_status ?? 'on_track',
    days_until_due: options.days_until_due ?? 7,
  };
}

/**
 * Create a mock open action item
 */
export function createMockOpenActionItem(
  options: ActionItemWithContextFactoryOptions = {}
): MockActionItemWithContext {
  return createMockActionItemWithContext({
    ...options,
    status: 'open',
    urgency_status: options.urgency_status ?? 'on_track',
  });
}

/**
 * Create a mock overdue action item
 */
export function createMockOverdueActionItem(
  options: ActionItemWithContextFactoryOptions = {}
): MockActionItemWithContext {
  const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
  return createMockActionItemWithContext({
    ...options,
    status: 'open',
    due_date: options.due_date ?? pastDate,
    urgency_status: 'overdue',
    days_until_due: -5,
  });
}

/**
 * Create a mock due soon action item
 */
export function createMockDueSoonActionItem(
  options: ActionItemWithContextFactoryOptions = {}
): MockActionItemWithContext {
  const soonDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
  return createMockActionItemWithContext({
    ...options,
    status: 'open',
    due_date: options.due_date ?? soonDate,
    urgency_status: 'due_soon',
    days_until_due: 2,
  });
}

/**
 * Create a mock in progress action item
 */
export function createMockInProgressActionItem(
  options: ActionItemWithContextFactoryOptions = {}
): MockActionItemWithContext {
  return createMockActionItemWithContext({
    ...options,
    status: 'in_progress',
    urgency_status: options.urgency_status ?? 'on_track',
  });
}

/**
 * Create a mock completed action item
 */
export function createMockCompletedActionItem(
  options: ActionItemWithContextFactoryOptions = {}
): MockActionItemWithContext {
  const now = new Date().toISOString();
  return createMockActionItemWithContext({
    ...options,
    status: 'completed',
    urgency_status: 'completed',
    resolved_at: options.resolved_at ?? now,
    resolved_by: options.resolved_by ?? 'user-1',
    resolution_type: options.resolution_type ?? 'completed',
  });
}

/**
 * Create a mock escalated action item
 */
export function createMockEscalatedActionItem(
  options: ActionItemWithContextFactoryOptions = {}
): MockActionItemWithContext {
  const now = new Date().toISOString();
  return createMockActionItemWithContext({
    ...options,
    escalation_level: options.escalation_level ?? 1,
    escalated_at: options.escalated_at ?? now,
    escalated_to: options.escalated_to ?? 'Project Manager',
  });
}

/**
 * Create a mock chronic action item (3+ carryovers)
 */
export function createMockChronicActionItem(
  options: ActionItemWithContextFactoryOptions = {}
): MockActionItemWithContext {
  return createMockActionItemWithContext({
    ...options,
    carryover_count: options.carryover_count ?? 3,
  });
}

/**
 * Create multiple mock action items
 */
export function createMockActionItems(
  count: number,
  options: ActionItemWithContextFactoryOptions = {}
): MockActionItemWithContext[] {
  return Array.from({ length: count }, (_, index) =>
    createMockActionItemWithContext({
      ...options,
      id: `action-item-${actionItemCounter + index + 1}`,
      title: `Action Item ${actionItemCounter + index + 1}`,
    })
  );
}

/**
 * Create a mock action item project summary
 */
export function createMockActionItemProjectSummary(
  options: Partial<ActionItemProjectSummary> = {}
): MockActionItemProjectSummary {
  return {
    project_id: options.project_id ?? 'project-1',
    total_items: options.total_items ?? 25,
    open_items: options.open_items ?? 10,
    in_progress_items: options.in_progress_items ?? 5,
    completed_items: options.completed_items ?? 10,
    overdue_items: options.overdue_items ?? 3,
    escalated_items: options.escalated_items ?? 2,
    chronic_items: options.chronic_items ?? 1,
    completion_rate: options.completion_rate ?? 40,
  };
}

/**
 * Create mock action items by assignee
 */
export function createMockActionItemsByAssignee(
  options: Partial<ActionItemsByAssignee> = {}
): MockActionItemsByAssignee {
  return {
    project_id: options.project_id ?? 'project-1',
    assignee: options.assignee ?? 'John Doe',
    assigned_company: options.assigned_company ?? 'ABC Construction',
    total_items: options.total_items ?? 8,
    open_items: options.open_items ?? 5,
    overdue_items: options.overdue_items ?? 2,
    nearest_due_date: options.nearest_due_date ?? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Create multiple mock action items by assignee
 */
export function createMockActionItemsByAssignees(
  assignees: Array<{ assignee: string; assigned_company?: string }>,
  projectId = 'project-1'
): MockActionItemsByAssignee[] {
  return assignees.map((assignee) =>
    createMockActionItemsByAssignee({
      project_id: projectId,
      assignee: assignee.assignee,
      assigned_company: assignee.assigned_company,
    })
  );
}

/**
 * Test data sets
 */
export const TEST_ACTION_ITEMS = {
  open: createMockOpenActionItem({ id: 'ai-open-1', title: 'Review site plans' }),
  overdue: createMockOverdueActionItem({ id: 'ai-overdue-1', title: 'Submit material samples' }),
  dueSoon: createMockDueSoonActionItem({ id: 'ai-due-soon-1', title: 'Approve shop drawings' }),
  inProgress: createMockInProgressActionItem({ id: 'ai-in-progress-1', title: 'Coordinate with MEP' }),
  completed: createMockCompletedActionItem({ id: 'ai-completed-1', title: 'Update schedule' }),
  escalated: createMockEscalatedActionItem({ id: 'ai-escalated-1', title: 'Resolve foundation issue' }),
  chronic: createMockChronicActionItem({ id: 'ai-chronic-1', title: 'Obtain permits' }),
  withTask: createMockOpenActionItem({
    id: 'ai-with-task-1',
    title: 'Complete punch list',
    task_id: 'task-1',
  }),
  highPriority: createMockOpenActionItem({
    id: 'ai-high-priority-1',
    title: 'Emergency repair',
    priority: 'critical',
    category: 'safety',
  }),
};
