// File: /src/lib/api/index.ts
// Central export for all API services and utilities

export { apiClient } from './client'
export { ApiErrorClass, withErrorHandling, getErrorMessage } from './errors'
export { projectsApi } from './services/projects'
export { dailyReportsApi } from './services/daily-reports'
export { changeOrdersApi } from './services/change-orders'
export { tasksApi } from './services/tasks'
export { punchListsApi } from './services/punch-lists'
export { workflowsApi } from './services/workflows'
export { inspectionsApi } from './services/inspections'

export type { ApiError, ApiResponse, ApiErrorResponse, ApiResult, QueryOptions, QueryFilter } from './types'
export type { ChangeOrderWithRelations, ChangeOrderDetailWithRelations } from './services/change-orders'
