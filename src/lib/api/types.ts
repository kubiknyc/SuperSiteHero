// File: /src/lib/api/types.ts
// Shared API types and error definitions

export interface ApiError {
  code: string
  message: string
  status?: number
  details?: any
}

export interface ApiResponse<T> {
  data: T
  error: null
}

export interface ApiErrorResponse {
  data: null
  error: ApiError
}

export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse

export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  pageCount: number
  currentPage: number
  pageSize: number
}

// Query filter types for common patterns
export interface QueryFilter {
  column: string
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in'
  value: any
}

export interface QueryOptions {
  select?: string
  filters?: QueryFilter[]
  orderBy?: {
    column: string
    ascending?: boolean
  }
  pagination?: PaginationParams
}
