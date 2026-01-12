// File: /src/lib/api/client.ts
// Base API client with Supabase integration and error handling

import { supabase } from '../supabase'
import type { ApiError, QueryOptions, QueryFilter } from './types'
import type { PostgrestError } from '@supabase/supabase-js'
import { captureException, addSentryBreadcrumb } from '../sentry'

/**
 * Supported filter operators
 */
const VALID_OPERATORS = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'in'] as const
type FilterOperator = typeof VALID_OPERATORS[number]

/**
 * Error codes that should not be reported to Sentry
 * - PGRST116: Row not found (expected in many queries)
 * - 42501: Insufficient privilege (RLS working as intended)
 */
const EXPECTED_ERROR_CODES = ['PGRST116', '42501'] as const

class ApiClient {
  /**
   * Convert API error to standardized error object
   * @param error - The error to handle
   * @param context - Additional context for debugging (table name, operation, etc.)
   */
  private handleError(
    error: PostgrestError | Error | unknown,
    context?: { table?: string; operation?: string }
  ): ApiError {
    // Type guard for PostgrestError (has 'code' property)
    if (error && typeof error === 'object' && 'code' in error) {
      const pgError = error as PostgrestError
      const apiError: ApiError = {
        code: pgError.code || 'UNKNOWN_ERROR',
        message: pgError.message || 'An unknown error occurred',
        status: undefined,
        details: pgError,
      }

      // Capture database errors in Sentry (skip auth/expected errors)
      if (pgError.code && !EXPECTED_ERROR_CODES.includes(pgError.code as any)) {
        addSentryBreadcrumb(
          `Database error: ${pgError.message}`,
          'api',
          'error',
          { code: pgError.code, ...context }
        )
        captureException(new Error(`Database error: ${pgError.message}`), {
          errorCode: pgError.code,
          ...context,
        })
      }

      return apiError
    }

    // Handle generic errors
    const genericError = error as Error
    const apiError: ApiError = {
      code: 'UNKNOWN_ERROR',
      message: genericError?.message || 'An unexpected error occurred',
      details: error,
    }

    // Capture unexpected errors in Sentry
    if (genericError instanceof Error) {
      captureException(genericError, context)
    }

    return apiError
  }

  /**
   * Apply filters to a Supabase query
   * Handles null values correctly by using .is() instead of .eq()
   * @private
   */
  private applyFilters<Q extends { eq: Function; is: Function; not: Function; neq: Function; gt: Function; gte: Function; lt: Function; lte: Function; like: Function; ilike: Function; in: Function }>(
    query: Q,
    filters: QueryFilter[]
  ): Q {
    let modifiedQuery = query

    for (const filter of filters) {
      // Validate operator
      if (!VALID_OPERATORS.includes(filter.operator as FilterOperator)) {
        throw new Error(`Invalid filter operator: ${filter.operator}`)
      }

      switch (filter.operator) {
        case 'eq':
          // Use .is() for null values, .eq() for others
          modifiedQuery = filter.value === null
            ? modifiedQuery.is(filter.column, null)
            : modifiedQuery.eq(filter.column, filter.value)
          break

        case 'neq':
          // Use .not.is() for null values, .neq() for others
          modifiedQuery = filter.value === null
            ? modifiedQuery.not(filter.column, 'is', null)
            : modifiedQuery.neq(filter.column, filter.value)
          break

        case 'gt':
          modifiedQuery = modifiedQuery.gt(filter.column, filter.value)
          break

        case 'gte':
          modifiedQuery = modifiedQuery.gte(filter.column, filter.value)
          break

        case 'lt':
          modifiedQuery = modifiedQuery.lt(filter.column, filter.value)
          break

        case 'lte':
          modifiedQuery = modifiedQuery.lte(filter.column, filter.value)
          break

        case 'like':
          modifiedQuery = modifiedQuery.like(filter.column, filter.value)
          break

        case 'ilike':
          modifiedQuery = modifiedQuery.ilike(filter.column, filter.value)
          break

        case 'in':
          modifiedQuery = modifiedQuery.in(filter.column, filter.value)
          break

        default:
          // TypeScript should prevent this, but handle defensively
          throw new Error(`Unhandled filter operator: ${filter.operator}`)
      }
    }

    return modifiedQuery
  }

  /**
   * Apply ordering to a Supabase query
   * @private
   */
  private applyOrdering<Q extends { order: Function }>(
    query: Q,
    orderBy: { column: string; ascending?: boolean }
  ): Q {
    return query.order(orderBy.column, {
      ascending: orderBy.ascending !== false,
    })
  }

  /**
   * Apply pagination to a Supabase query
   * Supports both offset-based and page-based pagination
   * @private
   */
  private applyPagination<Q extends { range: Function }>(
    query: Q,
    pagination: { page?: number; limit?: number; offset?: number }
  ): Q {
    if (!pagination.limit) {
      return query
    }
    const offset = pagination.offset ?? (pagination.page ?? 0) * pagination.limit
    const rangeEnd = offset + pagination.limit - 1
    return query.range(offset, rangeEnd)
  }

  /**
   * Build a Supabase query with all options applied
   * @private
   */
  private buildQuery(
    table: string,
    options?: QueryOptions & { select?: string; count?: boolean }
  ) {
     
    const selectParam = options?.select || '*'
    const countParam = options?.count ? { count: 'exact' as const } : undefined

    let query = supabase.from(table as any).select(selectParam, countParam)

    // Apply filters
    if (options?.filters && options.filters.length > 0) {
      query = this.applyFilters(query, options.filters)
    }

    // Apply ordering
    if (options?.orderBy) {
      query = this.applyOrdering(query, options.orderBy)
    }

    // Apply pagination
    if (options?.pagination?.limit) {
      query = this.applyPagination(query, options.pagination)
    }

    return query
  }

  /**
   * Fetch records from a table
   * @param table - The table name
   * @param options - Query options (filters, ordering, pagination, select)
   * @returns Array of records
   */
  async select<T>(
    table: string,
    options?: QueryOptions & { select?: string }
  ): Promise<T[]> {
    try {
      const query = this.buildQuery<T>(table, options)
      const { data, error } = await query

      if (error) {throw error}
      return (data as T[]) || []
    } catch (error) {
      throw this.handleError(error, { table, operation: 'select' })
    }
  }

  /**
   * Fetch records with total count for pagination
   * @param table - The table name
   * @param options - Query options (filters, ordering, pagination, select)
   * @returns Object with data array and total count
   */
  async selectWithCount<T>(
    table: string,
    options?: QueryOptions & { select?: string }
  ): Promise<{ data: T[]; count: number }> {
    try {
      const query = this.buildQuery<T>(table, { ...options, count: true })
      const { data, error, count } = await query

      if (error) {throw error}
      return {
        data: (data as T[]) || [],
        count: count ?? 0,
      }
    } catch (error) {
      throw this.handleError(error, { table, operation: 'selectWithCount' })
    }
  }

  /**
   * Fetch a single record by ID
   * @param table - The table name
   * @param id - The record ID
   * @param options - Query options (select)
   * @returns Single record
   * @throws Error if record not found or multiple records found
   */
  async selectOne<T>(
    table: string,
    id: string,
    options?: { select?: string }
  ): Promise<T> {
    try {
      const { data, error } = await supabase
        .from(table as any)
        .select(options?.select || '*')
        .eq('id', id)
        .single()

      if (error) {throw error}
      return data as T
    } catch (error) {
      throw this.handleError(error, { table, operation: 'selectOne' })
    }
  }

  /**
   * Insert a single record
   * @param table - The table name
   * @param record - The record to insert
   * @returns The inserted record
   */
  async insert<T>(table: string, record: Partial<T>): Promise<T> {
    try {
      const { data, error } = await supabase
        .from(table as any)
        .insert(record as any)
        .select()
        .single()

      if (error) {throw error}
      return data as T
    } catch (error) {
      throw this.handleError(error, { table, operation: 'insert' })
    }
  }

  /**
   * Insert multiple records
   * @param table - The table name
   * @param records - The records to insert
   * @returns The inserted records
   */
  async insertMany<T>(table: string, records: Partial<T>[]): Promise<T[]> {
    try {
      if (records.length === 0) {
        return []
      }

      const { data, error } = await supabase
        .from(table as any)
        .insert(records as any[])
        .select()

      if (error) {throw error}
      return (data as T[]) || []
    } catch (error) {
      throw this.handleError(error, { table, operation: 'insertMany' })
    }
  }

  /**
   * Update a record by ID
   * @param table - The table name
   * @param id - The record ID
   * @param updates - The fields to update
   * @returns The updated record
   */
  async update<T>(
    table: string,
    id: string,
    updates: Partial<T>
  ): Promise<T> {
    try {
      const { data, error } = await supabase
        .from(table as any)
        .update(updates as any)
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
      return data as T
    } catch (error) {
      throw this.handleError(error, { table, operation: 'update' })
    }
  }

  /**
   * Delete a record by ID
   * @param table - The table name
   * @param id - The record ID
   */
  async delete(table: string, id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(table as any)
        .delete()
        .eq('id', id)

      if (error) {throw error}
    } catch (error) {
      throw this.handleError(error, { table, operation: 'delete' })
    }
  }

  /**
   * Execute a custom query
   *
   * ⚠️ WARNING: This method bypasses all helper validations. Use with caution.
   * Only use when helper methods are insufficient for your query needs.
   *
   * The callback receives the Supabase query builder for the specified table.
   * Always ensure you're using Supabase's query builder methods (not raw SQL).
   *
   * @example
   * // ✅ Safe usage - using query builder
   * await apiClient.query('project_users', (query) =>
   *   query
   *     .select('project:projects(*)')
   *     .eq('user_id', userId)
   * )
   *
   * @example
   * // ❌ NEVER do this - string interpolation
   * await apiClient.query('projects', (q) =>
   *   q.select(`* where id='${userInput}'`)  // SQL injection risk!
   * )
   *
   * @param table - The table name
   * @param callback - Function that receives the query builder
   * @returns Array of records
   */
  async query<T>(
    table: string,
    callback: (query: any) => any
  ): Promise<T[]> {
    try {
      const query = supabase.from(table as any)
      const result = callback(query)
      const { data, error } = await result

      if (error) {throw error}
      return (data as T[]) || []
    } catch (error) {
      throw this.handleError(error, { table, operation: 'customQuery' })
    }
  }
}

export const apiClient = new ApiClient()
