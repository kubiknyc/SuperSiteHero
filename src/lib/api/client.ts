// File: /src/lib/api/client.ts
// Base API client with Supabase integration and error handling

import { supabase } from '../supabase'
import type { ApiError, QueryFilter, QueryOptions } from './types'

class ApiClient {
  /**
   * Convert API error to standardized error object
   */
  private handleError(error: any): ApiError {
    // Handle Supabase errors
    if (error.code) {
      return {
        code: error.code,
        message: error.message || 'An unknown error occurred',
        status: error.status,
        details: error,
      }
    }

    // Handle generic errors
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An unexpected error occurred',
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
      let query = supabase.from(table).select(options?.select || '*')

      // Apply filters
      if (options?.filters) {
        for (const filter of options.filters) {
          switch (filter.operator) {
            case 'eq':
              query = query.eq(filter.column, filter.value)
              break
            case 'neq':
              query = query.neq(filter.column, filter.value)
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

      if (error) throw error
      return data as T[]
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
      const { data, error } = await supabase
        .from(table)
        .select(options?.select || '*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as T
    } catch (error) {
      throw this.handleError(error)
    }
  }

  /**
   * Insert a single record
   */
  async insert<T>(table: string, record: any): Promise<T> {
    try {
      const { data, error } = await supabase
        .from(table)
        .insert(record)
        .select()
        .single()

      if (error) throw error
      return data as T
    } catch (error) {
      throw this.handleError(error)
    }
  }

  /**
   * Insert multiple records
   */
  async insertMany<T>(table: string, records: any[]): Promise<T[]> {
    try {
      const { data, error } = await supabase
        .from(table)
        .insert(records)
        .select()

      if (error) throw error
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
    updates: any
  ): Promise<T> {
    try {
      const { data, error } = await supabase
        .from(table)
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
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
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      throw this.handleError(error)
    }
  }

  /**
   * Execute a custom query
   */
  async query<T>(
    table: string,
    callback: (query: any) => any
  ): Promise<T[]> {
    try {
      const query = supabase.from(table)
      const result = callback(query)
      const { data, error } = await result

      if (error) throw error
      return data as T[]
    } catch (error) {
      throw this.handleError(error)
    }
  }
}

export const apiClient = new ApiClient()
