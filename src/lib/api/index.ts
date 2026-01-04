// File: /src/lib/api/index.ts
// Central export for all API services and utilities

export { apiClient } from './client'
export { ApiErrorClass, withErrorHandling, getErrorMessage } from './errors'

// Base CRUD service utilities
export {
  createCrudService,
  createExtendedCrudService,
  validateRequired,
  validateRequiredFields,
  wrapServiceOperation,
  buildListFilters,
  getErrorCode,
  getUserDetails,
  getProjectName,
  getCompanyName,
  detectFieldChange,
  detectAssignmentChange,
} from './base-service'
export type {
  BaseEntity,
  CreateInput,
  UpdateInput,
  CrudServiceConfig,
  CrudQueryOptions,
  CrudService,
  ExtendedCrudService,
} from './base-service'
export { projectsApi } from './services/projects'
export { dailyReportsApi } from './services/daily-reports'
export { changeOrdersApi } from './services/change-orders'
export { tasksApi } from './services/tasks'
export { punchListsApi } from './services/punch-lists'
export { workflowsApi } from './services/workflows'
export { inspectionsApi } from './services/inspections'

export type { ApiError, ApiResponse, ApiErrorResponse, ApiResult, QueryOptions, QueryFilter } from './types'
export type { ChangeOrderWithRelations, ChangeOrderDetailWithRelations } from './services/change-orders'
