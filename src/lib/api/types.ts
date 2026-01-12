// File: /src/lib/api/types.ts
// Shared API types and error definitions

import type { PostgrestError } from '@supabase/supabase-js'

/**
 * Structured error details from API responses
 */
export interface ApiErrorDetails {
  hint?: string
  message?: string
  code?: string
  [key: string]: unknown
}

export interface ApiError {
  code: string
  message: string
  status?: number
  details?: ApiErrorDetails | PostgrestError | Error
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
/**
 * Valid filter values for Supabase queries
 */
export type FilterValue = string | number | boolean | null | string[] | number[]

export interface QueryFilter {
  column: string
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in'
  value: FilterValue
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
