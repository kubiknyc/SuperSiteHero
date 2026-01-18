/**
 * Dashboard Test Data Factory
 * Provides mock data for dashboard-related tests
 */

import type { DashboardStats, ActionItem } from '@/features/dashboard/hooks/useDashboardStats';

// ============================================================================
// Types
// ============================================================================

export interface DashboardStatsFactoryOptions {
  tasks?: Partial<DashboardStats['tasks']>;
  rfis?: Partial<DashboardStats['rfis']>;
  punchItems?: Partial<DashboardStats['punchItems']>;
  safety?: Partial<DashboardStats['safety']>;
  changeOrders?: Partial<DashboardStats['changeOrders']>;
  submittals?: Partial<DashboardStats['submittals']>;
}

export interface ActionItemFactoryOptions {
  id?: string;
  type?: ActionItem['type'];
  title?: string;
  description?: string;
  priority?: ActionItem['priority'];
  dueDate?: string | null;
  isOverdue?: boolean;
  projectId?: string;
  projectName?: string;
  link?: string;
  assignedTo?: string;
  ballInCourt?: string;
}

export interface ProjectStatsFactoryOptions {
  tasks?: number;
  rfis?: number;
  punchItems?: number;
  dailyReports?: number;
}

// ============================================================================
// Dashboard Stats Factory
// ============================================================================

/**
 * Creates a mock DashboardStats object
 */
export function createMockDashboardStats(
  options: DashboardStatsFactoryOptions = {}
): DashboardStats {
  return {
    tasks: {
      pending: 10,
      inProgress: 5,
      completed: 25,
      overdue: 2,
      total: 42,
      trend: [8, 9, 10, 11, 10],
      ...options.tasks,
    },
    rfis: {
      open: 8,
      pendingResponse: 3,
      responded: 12,
      overdue: 1,
      total: 24,
      trend: [6, 7, 8, 7, 8],
      ...options.rfis,
    },
    punchItems: {
      open: 15,
      inProgress: 8,
      completed: 45,
      verified: 30,
      total: 98,
      trend: [12, 14, 15, 16, 15],
      ...options.punchItems,
    },
    safety: {
      daysSinceIncident: 45,
      totalIncidents: 3,
      openIncidents: 0,
      oshaRecordable: 1,
      trend: [41, 42, 43, 44, 45],
      ...options.safety,
    },
    changeOrders: {
      pending: 4,
      approved: 8,
      rejected: 1,
      totalValue: 125000,
      trend: [3, 4, 5, 4, 4],
      ...options.changeOrders,
    },
    submittals: {
      pending: 12,
      approved: 35,
      rejected: 2,
      overdue: 3,
      total: 52,
      trend: [10, 11, 12, 13, 12],
      ...options.submittals,
    },
  };
}

/**
 * Creates dashboard stats with all zeros (empty project)
 */
export function createEmptyDashboardStats(): DashboardStats {
  return createMockDashboardStats({
    tasks: { pending: 0, inProgress: 0, completed: 0, overdue: 0, total: 0, trend: [0, 0, 0, 0, 0] },
    rfis: { open: 0, pendingResponse: 0, responded: 0, overdue: 0, total: 0, trend: [0, 0, 0, 0, 0] },
    punchItems: { open: 0, inProgress: 0, completed: 0, verified: 0, total: 0, trend: [0, 0, 0, 0, 0] },
    safety: { daysSinceIncident: 365, totalIncidents: 0, openIncidents: 0, oshaRecordable: 0, trend: [361, 362, 363, 364, 365] },
    changeOrders: { pending: 0, approved: 0, rejected: 0, totalValue: 0, trend: [0, 0, 0, 0, 0] },
    submittals: { pending: 0, approved: 0, rejected: 0, overdue: 0, total: 0, trend: [0, 0, 0, 0, 0] },
  });
}

/**
 * Creates dashboard stats with critical items (high overdue counts)
 */
export function createCriticalDashboardStats(): DashboardStats {
  return createMockDashboardStats({
    tasks: { pending: 25, overdue: 15 },
    rfis: { open: 20, overdue: 10 },
    punchItems: { open: 50 },
    safety: { daysSinceIncident: 5, openIncidents: 2 },
    submittals: { overdue: 8 },
  });
}

// ============================================================================
// Action Item Factory
// ============================================================================

let actionItemCounter = 0;

/**
 * Creates a mock ActionItem
 */
export function createMockDashboardActionItem(
  options: ActionItemFactoryOptions = {}
): ActionItem {
  const id = options.id || `action-${++actionItemCounter}`;
  const type = options.type || 'task';

  return {
    id,
    type,
    title: options.title || `${type.charAt(0).toUpperCase() + type.slice(1)} ${id}`,
    description: options.description || `Description for ${type} ${id}`,
    priority: options.priority || 'normal',
    dueDate: options.dueDate ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    isOverdue: options.isOverdue ?? false,
    projectId: options.projectId || 'project-1',
    projectName: options.projectName || 'Test Project',
    link: options.link || `/${type}s/${id}`,
    assignedTo: options.assignedTo,
    ballInCourt: options.ballInCourt,
  };
}

/**
 * Creates an overdue action item
 */
export function createOverdueActionItem(
  options: ActionItemFactoryOptions = {}
): ActionItem {
  return createMockDashboardActionItem({
    ...options,
    dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    isOverdue: true,
    priority: options.priority || 'high',
  });
}

/**
 * Creates an urgent action item
 */
export function createUrgentActionItem(
  options: ActionItemFactoryOptions = {}
): ActionItem {
  return createMockDashboardActionItem({
    ...options,
    priority: 'urgent',
    isOverdue: true,
    dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  });
}

/**
 * Creates multiple action items
 */
export function createMockDashboardActionItems(
  count: number,
  options: ActionItemFactoryOptions = {}
): ActionItem[] {
  return Array.from({ length: count }, () => createMockDashboardActionItem(options));
}

/**
 * Creates a diverse set of action items
 */
export function createMixedActionItems(): ActionItem[] {
  return [
    createOverdueActionItem({ type: 'task', title: 'Complete foundation inspection' }),
    createMockDashboardActionItem({ type: 'rfi', title: 'RFI: Steel beam specifications', ballInCourt: 'You' }),
    createMockDashboardActionItem({ type: 'punch_item', title: 'Verify: Drywall repair completion' }),
    createUrgentActionItem({ type: 'change_order', title: 'Approve CO: Emergency repair' }),
    createMockDashboardActionItem({ type: 'submittal', title: 'Review HVAC submittal' }),
  ];
}

// ============================================================================
// Project Stats Factory
// ============================================================================

/**
 * Creates mock project stats
 */
export function createMockProjectStats(
  options: ProjectStatsFactoryOptions = {}
): { tasks: number; rfis: number; punchItems: number; dailyReports: number } {
  return {
    tasks: options.tasks ?? 25,
    rfis: options.rfis ?? 12,
    punchItems: options.punchItems ?? 45,
    dailyReports: options.dailyReports ?? 30,
  };
}

/**
 * Creates empty project stats
 */
export function createEmptyProjectStats() {
  return createMockProjectStats({
    tasks: 0,
    rfis: 0,
    punchItems: 0,
    dailyReports: 0,
  });
}

// ============================================================================
// Supabase Response Mocks
// ============================================================================

/**
 * Creates a mock count response from Supabase
 */
export function createMockCountResponse(count: number) {
  return {
    count,
    data: null,
    error: null,
  };
}

/**
 * Creates mock data response from Supabase
 */
export function createMockDataResponse<T>(data: T[]) {
  return {
    data,
    error: null,
    count: data.length,
  };
}

/**
 * Creates an error response from Supabase
 */
export function createMockErrorResponse(message: string) {
  return {
    data: null,
    error: { message, code: 'PGRST116' },
    count: null,
  };
}

// ============================================================================
// Test Constants
// ============================================================================

export const TEST_DASHBOARD_STATS = {
  DEFAULT: createMockDashboardStats(),
  EMPTY: createEmptyDashboardStats(),
  CRITICAL: createCriticalDashboardStats(),
};

export const TEST_ACTION_ITEMS_DASHBOARD = {
  SINGLE: createMockDashboardActionItem(),
  OVERDUE: createOverdueActionItem(),
  URGENT: createUrgentActionItem(),
  MIXED: createMixedActionItems(),
};

export const TEST_PROJECT_STATS = {
  DEFAULT: createMockProjectStats(),
  EMPTY: createEmptyProjectStats(),
};
