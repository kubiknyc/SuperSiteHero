/**
 * Query Key Factory
 *
 * Centralized query key management for React Query.
 * Provides type-safe, consistent query keys across the application.
 *
 * @example
 * // In a hook:
 * const { data } = useQuery({
 *   queryKey: queryKeys.projects.list({ organizationId }),
 *   queryFn: () => fetchProjects(organizationId),
 * })
 *
 * // Invalidating queries:
 * queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
 * queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) })
 */

// ============================================================================
// Types
// ============================================================================

export type QueryKeyScope = 'all' | 'lists' | 'list' | 'details' | 'detail'

// Helper type for query key arrays
type QueryKey = readonly unknown[]

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a query key factory for a specific domain
 */
function createQueryKeys<T extends string>(domain: T) {
  return {
    /** All keys in this domain - use for broad invalidation */
    all: [domain] as const,

    /** All list keys in this domain */
    lists: () => [domain, 'list'] as const,

    /** Specific list with filters */
    list: <F extends Record<string, unknown>>(filters?: F) =>
      filters
        ? ([domain, 'list', filters] as const)
        : ([domain, 'list'] as const),

    /** All detail keys in this domain */
    details: () => [domain, 'detail'] as const,

    /** Specific detail by ID */
    detail: (id: string) => [domain, 'detail', id] as const,

    /** Custom sub-key */
    custom: <K extends QueryKey>(...keys: K) => [domain, ...keys] as const,
  }
}

// ============================================================================
// Domain-Specific Query Keys
// ============================================================================

export const queryKeys = {
  // -------------------------------------------------------------------------
  // Core Domains
  // -------------------------------------------------------------------------

  /** Project queries */
  projects: {
    ...createQueryKeys('projects'),
    byOrganization: (orgId: string) => ['projects', 'org', orgId] as const,
    stats: (projectId: string) => ['projects', 'stats', projectId] as const,
    members: (projectId: string) => ['projects', 'members', projectId] as const,
  },

  /** Organization queries */
  organizations: {
    ...createQueryKeys('organizations'),
    members: (orgId: string) => ['organizations', 'members', orgId] as const,
    invites: (orgId: string) => ['organizations', 'invites', orgId] as const,
  },

  /** User queries */
  users: {
    ...createQueryKeys('users'),
    profile: (userId: string) => ['users', 'profile', userId] as const,
    profiles: (userIds: string[]) =>
      ['users', 'profiles', userIds.sort().join(',')] as const,
    current: () => ['users', 'current'] as const,
    preferences: (userId: string) => ['users', 'preferences', userId] as const,
  },

  // -------------------------------------------------------------------------
  // Feature Domains
  // -------------------------------------------------------------------------

  /** Daily reports */
  dailyReports: {
    ...createQueryKeys('daily-reports'),
    byProject: (projectId: string) =>
      ['daily-reports', 'project', projectId] as const,
    byDate: (projectId: string, date: string) =>
      ['daily-reports', 'project', projectId, 'date', date] as const,
    templates: () => ['daily-reports', 'templates'] as const,
    template: (templateId: string) =>
      ['daily-reports', 'templates', templateId] as const,
  },

  /** RFIs */
  rfis: {
    ...createQueryKeys('rfis'),
    byProject: (projectId: string) => ['rfis', 'project', projectId] as const,
    ballInCourt: (projectId: string) =>
      ['rfis', 'project', projectId, 'ball-in-court'] as const,
  },

  /** Submittals */
  submittals: {
    ...createQueryKeys('submittals'),
    byProject: (projectId: string) =>
      ['submittals', 'project', projectId] as const,
    register: (projectId: string) =>
      ['submittals', 'project', projectId, 'register'] as const,
  },

  /** Punch lists */
  punchLists: {
    ...createQueryKeys('punch-lists'),
    byProject: (projectId: string) =>
      ['punch-lists', 'project', projectId] as const,
    stats: (projectId: string) =>
      ['punch-lists', 'project', projectId, 'stats'] as const,
  },

  /** Checklists */
  checklists: {
    ...createQueryKeys('checklists'),
    templates: () => ['checklists', 'templates'] as const,
    template: (templateId: string) =>
      ['checklists', 'templates', templateId] as const,
    executions: (projectId: string) =>
      ['checklists', 'executions', projectId] as const,
    execution: (executionId: string) =>
      ['checklists', 'execution', executionId] as const,
    schedules: (projectId: string) =>
      ['checklists', 'schedules', projectId] as const,
  },

  /** Safety */
  safety: {
    ...createQueryKeys('safety'),
    incidents: (projectId: string) =>
      ['safety', 'incidents', projectId] as const,
    observations: (projectId: string) =>
      ['safety', 'observations', projectId] as const,
    certifications: (projectId?: string) =>
      projectId
        ? (['safety', 'certifications', projectId] as const)
        : (['safety', 'certifications'] as const),
    toolboxTalks: (projectId: string) =>
      ['safety', 'toolbox-talks', projectId] as const,
  },

  /** Documents */
  documents: {
    ...createQueryKeys('documents'),
    byProject: (projectId: string) =>
      ['documents', 'project', projectId] as const,
    byFolder: (projectId: string, folderId?: string) =>
      ['documents', 'project', projectId, 'folder', folderId ?? 'root'] as const,
    drawings: (projectId: string) =>
      ['documents', 'drawings', projectId] as const,
    specs: (projectId: string) => ['documents', 'specs', projectId] as const,
  },

  /** Meetings */
  meetings: {
    ...createQueryKeys('meetings'),
    byProject: (projectId: string) =>
      ['meetings', 'project', projectId] as const,
    attendees: (meetingId: string) =>
      ['meetings', 'attendees', meetingId] as const,
    actionItems: (meetingId: string) =>
      ['meetings', 'action-items', meetingId] as const,
  },

  /** Tasks / Action Items */
  tasks: {
    ...createQueryKeys('tasks'),
    byProject: (projectId: string) => ['tasks', 'project', projectId] as const,
    byAssignee: (userId: string) => ['tasks', 'assignee', userId] as const,
    myTasks: () => ['tasks', 'my-tasks'] as const,
  },

  /** Change Orders */
  changeOrders: {
    ...createQueryKeys('change-orders'),
    byProject: (projectId: string) =>
      ['change-orders', 'project', projectId] as const,
    summary: (projectId: string) =>
      ['change-orders', 'project', projectId, 'summary'] as const,
  },

  /** Payment Applications */
  paymentApplications: {
    ...createQueryKeys('payment-applications'),
    byProject: (projectId: string) =>
      ['payment-applications', 'project', projectId] as const,
    current: (projectId: string) =>
      ['payment-applications', 'project', projectId, 'current'] as const,
  },

  /** Invoices */
  invoices: {
    ...createQueryKeys('invoices'),
    byProject: (projectId: string) =>
      ['invoices', 'project', projectId] as const,
    byVendor: (vendorId: string) => ['invoices', 'vendor', vendorId] as const,
  },

  /** Contacts */
  contacts: {
    ...createQueryKeys('contacts'),
    byProject: (projectId: string) =>
      ['contacts', 'project', projectId] as const,
  },

  /** Workflows */
  workflows: {
    ...createQueryKeys('workflows'),
    byProject: (projectId: string) =>
      ['workflows', 'project', projectId] as const,
    items: (workflowId: string) =>
      ['workflows', 'items', workflowId] as const,
  },

  // -------------------------------------------------------------------------
  // Supporting Domains
  // -------------------------------------------------------------------------

  /** Notifications */
  notifications: {
    ...createQueryKeys('notifications'),
    unread: () => ['notifications', 'unread'] as const,
    preferences: (userId: string) =>
      ['notifications', 'preferences', userId] as const,
    batchConfig: (userId: string) =>
      ['notifications', 'batch-config', userId] as const,
  },

  /** Webhooks */
  webhooks: {
    ...createQueryKeys('webhooks'),
    byOrganization: (orgId: string) =>
      ['webhooks', 'org', orgId] as const,
    deliveries: (webhookId: string) =>
      ['webhooks', 'deliveries', webhookId] as const,
  },

  /** Mentions */
  mentions: {
    users: (query: string, projectId?: string) =>
      ['mention-users', query, projectId] as const,
  },

  /** Analytics */
  analytics: {
    ...createQueryKeys('analytics'),
    dashboard: (projectId: string, range?: string) =>
      ['analytics', 'dashboard', projectId, range ?? 'week'] as const,
    reports: (projectId: string) =>
      ['analytics', 'reports', projectId] as const,
  },

  /** Cost Estimates / Takeoffs */
  estimates: {
    ...createQueryKeys('estimates'),
    byProject: (projectId: string) =>
      ['estimates', 'project', projectId] as const,
    takeoffs: (projectId: string) =>
      ['estimates', 'takeoffs', projectId] as const,
    assemblies: () => ['estimates', 'assemblies'] as const,
  },

  /** Gantt / Schedule */
  schedule: {
    ...createQueryKeys('schedule'),
    byProject: (projectId: string) =>
      ['schedule', 'project', projectId] as const,
    items: (projectId: string) =>
      ['schedule', 'items', projectId] as const,
    dependencies: (projectId: string) =>
      ['schedule', 'dependencies', projectId] as const,
  },

  /** Weather */
  weather: {
    current: (location: string) => ['weather', 'current', location] as const,
    forecast: (location: string, days?: number) =>
      ['weather', 'forecast', location, days ?? 7] as const,
  },
} as const

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the base key for invalidation
 * @example
 * getBaseKey(queryKeys.projects.detail('123')) // ['projects']
 */
export function getBaseKey(queryKey: QueryKey): QueryKey {
  return [queryKey[0]]
}

/**
 * Create invalidation patterns for a domain
 * @example
 * const invalidate = createInvalidator(queryClient, 'projects')
 * invalidate.all() // invalidates all project queries
 * invalidate.detail('123') // invalidates specific project
 */
export function createInvalidator(
  queryClient: { invalidateQueries: (options: { queryKey: QueryKey }) => void },
  domain: keyof typeof queryKeys
) {
  const keys = queryKeys[domain]

  return {
    all: () => queryClient.invalidateQueries({ queryKey: keys.all }),
    lists: () => queryClient.invalidateQueries({ queryKey: keys.lists() }),
    details: () => queryClient.invalidateQueries({ queryKey: keys.details() }),
    detail: (id: string) =>
      queryClient.invalidateQueries({ queryKey: keys.detail(id) }),
  }
}

export type QueryKeys = typeof queryKeys
