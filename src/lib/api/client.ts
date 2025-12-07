// File: /src/lib/api/client.ts
// Base API client with Supabase integration and error handling

import { supabase } from '../supabase'
import type { ApiError, QueryOptions } from './types'
import type { PostgrestError } from '@supabase/supabase-js'

class ApiClient {
  /**
   * Convert API error to standardized error object
   */
  private handleError(error: PostgrestError | Error | unknown): ApiError {
    // Type guard for PostgrestError (has 'code' property)
    if (error && typeof error === 'object' && 'code' in error) {
      const pgError = error as PostgrestError
      return {
        code: pgError.code || 'UNKNOWN_ERROR',
        message: pgError.message || 'An unknown error occurred',
        status: undefined,
        details: pgError,
      }
    }

    // Handle generic errors
    const genericError = error as Error
    return {
      code: 'UNKNOWN_ERROR',
      message: genericError?.message || 'An unexpected error occurred',
      details: error,
    }
  }

  /**
   * Fetch records from a table
   */
  async select<T>(
    table: string,
    options?: QueryOptions & { select?: string }
  ): Promise<T[]> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = supabase.from(table as any).select(options?.select || '*')

      // Apply filters
      if (options?.filters) {
        for (const filter of options.filters) {
          switch (filter.operator) {
            case 'eq':
              // Use .is() for null values, .eq() for others
              if (filter.value === null) {
                query = query.is(filter.column, null)
              } else {
                query = query.eq(filter.column, filter.value)
              }
              break
            case 'neq':
              // Use .not.is() for null values, .neq() for others
              if (filter.value === null) {
                query = query.not(filter.column, 'is', null)
              } else {
                query = query.neq(filter.column, filter.value)
              }
              break
            case 'gt':
              query = query.gt(filter.column, filter.value)
              break
            case 'gte':
              query = query.gte(filter.column, filter.value)
              break
            case 'lt':
              query = query.lt(filter.column, filter.value)
              break
            case 'lte':
              query = query.lte(filter.column, filter.value)
              break
            case 'like':
              query = query.like(filter.column, filter.value)
              break
            case 'ilike':
              query = query.ilike(filter.column, filter.value)
              break
            case 'in':
              query = query.in(filter.column, filter.value)
              break
          }
        }
      }

      // Apply ordering
      if (options?.orderBy) {
        query = query.order(options.orderBy.column, {
          ascending: options.orderBy.ascending !== false,
        })
      }

      // Apply pagination
      if (options?.pagination?.limit) {
        const offset = options.pagination.offset || (options.pagination.page || 0) * options.pagination.limit
        query = query.range(offset, offset + options.pagination.limit - 1)
      }

      const { data, error } = await query

      if (error) {throw error}
      return data as T[]
    } catch (error) {
      throw this.handleError(error)
    }
  }

  /**
   * Fetch records with total count for pagination
   * Phase 3: Server-side pagination support
   */
  async selectWithCount<T>(
    table: string,
    options?: QueryOptions & { select?: string }
  ): Promise<{ data: T[]; count: number }> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = supabase.from(table as any).select(options?.select || '*', { count: 'exact' })

      // Apply filters
      if (options?.filters) {
        for (const filter of options.filters) {
          switch (filter.operator) {
            case 'eq':
              // Use .is() for null values, .eq() for others
              if (filter.value === null) {
                query = query.is(filter.column, null)
              } else {
                query = query.eq(filter.column, filter.value)
              }
              break
            case 'neq':
              // Use .not.is() for null values, .neq() for others
              if (filter.value === null) {
                query = query.not(filter.column, 'is', null)
              } else {
                query = query.neq(filter.column, filter.value)
              }
              break
            case 'gt':
              query = query.gt(filter.column, filter.value)
              break
            case 'gte':
              query = query.gte(filter.column, filter.value)
              break
            case 'lt':
              query = query.lt(filter.column, filter.value)
              break
            case 'lte':
              query = query.lte(filter.column, filter.value)
              break
            case 'like':
              query = query.like(filter.column, filter.value)
              break
            case 'ilike':
              query = query.ilike(filter.column, filter.value)
              break
            case 'in':
              query = query.in(filter.column, filter.value)
              break
          }
        }
      }

      // Apply ordering
      if (options?.orderBy) {
        query = query.order(options.orderBy.column, {
          ascending: options.orderBy.ascending !== false,
        })
      }

      // Apply pagination
      if (options?.pagination?.limit) {
        const offset = options.pagination.offset || (options.pagination.page || 0) * options.pagination.limit
        query = query.range(offset, offset + options.pagination.limit - 1)
      }

      const { data, error, count } = await query

      if (error) {throw error}
      return { data: data as T[], count: count || 0 }
    } catch (error) {
      throw this.handleError(error)
    }
  }

  /**
   * Fetch a single record by ID
   */
  async selectOne<T>(
    table: string,
    id: string,
    options?: { select?: string }
  ): Promise<T> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase
        .from(table as any)
        .select(options?.select || '*')
        .eq('id', id)
        .single()

      if (error) {throw error}
      return data as T
    } catch (error) {
      throw this.handleError(error)
    }
  }

  /**
   * Insert a single record
   */
  async insert<T>(table: string, record: Partial<T>): Promise<T> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase
        .from(table as any)
        .insert(record as any)
        .select()
        .single()

      if (error) {throw error}
      return data as T
    } catch (error) {
      throw this.handleError(error)
    }
  }

  /**
   * Insert multiple records
   */
  async insertMany<T>(table: string, records: Partial<T>[]): Promise<T[]> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase
        .from(table as any)
        .insert(records as any[])
        .select()

      if (error) {throw error}
      return data as T[]
    } catch (error) {
      throw this.handleError(error)
    }
  }

  /**
   * Update a record by ID
   */
  async update<T>(
    table: string,
    id: string,
    updates: Partial<T>
  ): Promise<T> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase
        .from(table as any)
        .update(updates as any)
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
      return data as T
    } catch (error) {
      throw this.handleError(error)
    }
  }

  /**
   * Delete a record by ID
   */
  async delete(table: string, id: string): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase
        .from(table as any)
        .delete()
        .eq('id', id)

      if (error) {throw error}
    } catch (error) {
      throw this.handleError(error)
    }
  }

  /**
   * Execute a custom query
   * Note: The callback receives the Supabase query builder for the specified table
   */
  async query<T>(
    table: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    callback: (query: any) => any
  ): Promise<T[]> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const query = supabase.from(table as any)
      const result = callback(query)
      const { data, error } = await result

      if (error) {throw error}
      return data as T[]
    } catch (error) {
      throw this.handleError(error)
    }
  }
}

export const apiClient = new ApiClient()
