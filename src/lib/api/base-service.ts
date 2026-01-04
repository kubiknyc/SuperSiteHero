/**
 * Base CRUD Service
 * Generic service wrapper that reduces boilerplate across API services
 *
 * Provides:
 * - Standard CRUD operations with type safety
 * - Consistent error handling with proper error codes
 * - Required field validation
 * - Parent entity filtering (company_id, project_id)
 * - Soft delete support
 * - Hook points for custom logic (notifications, etc.)
 *
 * @example
 * // Create a typed service for Tasks
 * const taskService = createCrudService<Task>({
 *   tableName: 'tasks',
 *   entityName: 'Task',
 *   idField: 'id',
 *   softDelete: true,
 *   defaultOrderBy: { column: 'created_at', ascending: false },
 * })
 *
 * // Use the service
 * const tasks = await taskService.getAll({ filters: [...] })
 * const task = await taskService.getById('task-id')
 * const newTask = await taskService.create({ title: 'New Task', ... })
 */

import { apiClient } from './client'
import { ApiErrorClass } from './errors'
import type { QueryOptions, QueryFilter } from './types'

// ============================================================================
// Types
// ============================================================================

/**
 * Base entity interface - all entities should have these fields
 */
export interface BaseEntity {
  id: string
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

/**
 * Create input type - excludes auto-generated fields
 */
export type CreateInput<T extends BaseEntity> = Omit<
  T,
  'id' | 'created_at' | 'updated_at' | 'deleted_at'
>

/**
 * Update input type - partial entity without auto-generated fields
 */
export type UpdateInput<T extends BaseEntity> = Partial<
  Omit<T, 'id' | 'created_at' | 'updated_at'>
>

/**
 * Service configuration options
 */
export interface CrudServiceConfig<T extends BaseEntity> {
  /** Database table name */
  tableName: string
  /** Human-readable entity name (for error messages) */
  entityName: string
  /** Primary key field (default: 'id') */
  idField?: keyof T & string
  /** Enable soft delete (default: false) */
  softDelete?: boolean
  /** Default ordering for lists */
  defaultOrderBy?: { column: keyof T & string; ascending?: boolean }
  /** Default select statement (for joins, etc.) */
  defaultSelect?: string
  /** Hook called before create */
  beforeCreate?: (data: CreateInput<T>) => CreateInput<T> | Promise<CreateInput<T>>
  /** Hook called after create */
  afterCreate?: (entity: T) => void | Promise<void>
  /** Hook called before update */
  beforeUpdate?: (id: string, data: UpdateInput<T>) => UpdateInput<T> | Promise<UpdateInput<T>>
  /** Hook called after update */
  afterUpdate?: (entity: T, oldEntity: T) => void | Promise<void>
  /** Hook called before delete */
  beforeDelete?: (id: string, entity: T) => void | Promise<void>
  /** Hook called after delete */
  afterDelete?: (entity: T) => void | Promise<void>
}

/**
 * Extended query options with parent filtering
 */
export interface CrudQueryOptions extends QueryOptions {
  /** Include soft-deleted records */
  includeDeleted?: boolean
  /** Parent entity ID for filtering (e.g., project_id) */
  parentId?: string
  /** Parent entity field name (e.g., 'project_id') */
  parentField?: string
}

/**
 * Generic CRUD service interface
 */
export interface CrudService<T extends BaseEntity> {
  /** Get all entities with optional filtering */
  getAll(options?: CrudQueryOptions): Promise<T[]>
  /** Get entities by parent (e.g., project, company) */
  getByParent(parentField: string, parentId: string, options?: CrudQueryOptions): Promise<T[]>
  /** Get a single entity by ID */
  getById(id: string): Promise<T>
  /** Create a new entity */
  create(data: CreateInput<T>): Promise<T>
  /** Create multiple entities */
  createMany(data: CreateInput<T>[]): Promise<T[]>
  /** Update an entity */
  update(id: string, data: UpdateInput<T>): Promise<T>
  /** Delete an entity (soft or hard based on config) */
  delete(id: string): Promise<void>
  /** Hard delete an entity (bypasses soft delete) */
  hardDelete(id: string): Promise<void>
  /** Restore a soft-deleted entity */
  restore(id: string): Promise<T>
  /** Count entities matching filters */
  count(options?: CrudQueryOptions): Promise<number>
  /** Check if entity exists */
  exists(id: string): Promise<boolean>
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate that a required field is present
 * @throws ApiErrorClass if validation fails
 */
export function validateRequired(
  value: unknown,
  fieldName: string,
  entityName: string
): asserts value is string {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    const code = `${entityName.toUpperCase().replace(/\s+/g, '_')}_${fieldName.toUpperCase()}_REQUIRED`
    throw new ApiErrorClass({
      code,
      message: `${fieldName} is required`,
    })
  }
}

/**
 * Validate multiple required fields
 * @throws ApiErrorClass if any validation fails
 */
export function validateRequiredFields(
  data: Record<string, unknown>,
  requiredFields: string[],
  entityName: string
): void {
  for (const field of requiredFields) {
    validateRequired(data[field], field, entityName)
  }
}

// ============================================================================
// Error Helpers
// ============================================================================

/**
 * Generate error code from entity name and operation
 */
export function getErrorCode(
  entityName: string,
  operation: 'FETCH' | 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'COUNT'
): string {
  return `${operation}_${entityName.toUpperCase().replace(/\s+/g, '_')}_ERROR`
}

/**
 * Wrap service operation with consistent error handling
 */
export async function wrapServiceOperation<T>(
  operation: () => Promise<T>,
  entityName: string,
  operationType: 'FETCH' | 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'COUNT',
  customMessage?: string
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof ApiErrorClass) {
      throw error
    }
    throw new ApiErrorClass({
      code: getErrorCode(entityName, operationType),
      message: customMessage || `Failed to ${operationType.toLowerCase()} ${entityName.toLowerCase()}`,
      details: error,
    })
  }
}

// ============================================================================
// Filter Helpers
// ============================================================================

/**
 * Build common filters for list queries
 */
export function buildListFilters(
  options?: CrudQueryOptions,
  softDeleteField = 'deleted_at'
): QueryFilter[] {
  const filters: QueryFilter[] = [...(options?.filters || [])]

  // Add soft delete filter if not including deleted
  if (!options?.includeDeleted) {
    filters.push({
      column: softDeleteField,
      operator: 'eq',
      value: null,
    })
  }

  // Add parent filter if specified
  if (options?.parentId && options?.parentField) {
    filters.push({
      column: options.parentField,
      operator: 'eq',
      value: options.parentId,
    })
  }

  return filters
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a typed CRUD service for an entity
 *
 * @example
 * const taskService = createCrudService<Task>({
 *   tableName: 'tasks',
 *   entityName: 'Task',
 *   softDelete: true,
 * })
 */
export function createCrudService<T extends BaseEntity>(
  config: CrudServiceConfig<T>
): CrudService<T> {
  const {
    tableName,
    entityName,
    idField = 'id' as keyof T & string,
    softDelete = false,
    defaultOrderBy,
    defaultSelect,
    beforeCreate,
    afterCreate,
    beforeUpdate,
    afterUpdate,
    beforeDelete,
    afterDelete,
  } = config

  return {
    // -------------------------------------------------------------------------
    // Read Operations
    // -------------------------------------------------------------------------

    async getAll(options?: CrudQueryOptions): Promise<T[]> {
      return wrapServiceOperation(
        async () => {
          const filters = buildListFilters(options, softDelete ? 'deleted_at' : undefined)

          return apiClient.select<T>(tableName, {
            select: options?.select || defaultSelect,
            filters,
            orderBy: options?.orderBy || defaultOrderBy,
            pagination: options?.pagination,
          })
        },
        entityName,
        'FETCH',
        `Failed to fetch ${entityName.toLowerCase()} list`
      )
    },

    async getByParent(
      parentField: string,
      parentId: string,
      options?: CrudQueryOptions
    ): Promise<T[]> {
      validateRequired(parentId, parentField, entityName)

      return this.getAll({
        ...options,
        parentField,
        parentId,
      })
    },

    async getById(id: string): Promise<T> {
      validateRequired(id, idField, entityName)

      return wrapServiceOperation(
        () => apiClient.selectOne<T>(tableName, id),
        entityName,
        'FETCH',
        `Failed to fetch ${entityName.toLowerCase()}`
      )
    },

    // -------------------------------------------------------------------------
    // Write Operations
    // -------------------------------------------------------------------------

    async create(data: CreateInput<T>): Promise<T> {
      return wrapServiceOperation(
        async () => {
          // Apply before hook
          const processedData = beforeCreate ? await beforeCreate(data) : data

          const result = await apiClient.insert<T>(tableName, processedData as Record<string, unknown>)

          // Apply after hook (fire and forget for notifications)
          if (afterCreate) {
            afterCreate(result).catch((err) => {
              console.error(`[${entityName}Service] afterCreate hook failed:`, err)
            })
          }

          return result
        },
        entityName,
        'CREATE',
        `Failed to create ${entityName.toLowerCase()}`
      )
    },

    async createMany(data: CreateInput<T>[]): Promise<T[]> {
      return wrapServiceOperation(
        async () => {
          // Apply before hook to all items
          const processedData = beforeCreate
            ? await Promise.all(data.map((item) => beforeCreate(item)))
            : data

          const results = await apiClient.insertMany<T>(
            tableName,
            processedData as Record<string, unknown>[]
          )

          // Apply after hook to all items
          if (afterCreate) {
            Promise.all(results.map((result) => afterCreate(result))).catch((err) => {
              console.error(`[${entityName}Service] afterCreate hook failed:`, err)
            })
          }

          return results
        },
        entityName,
        'CREATE',
        `Failed to create ${entityName.toLowerCase()} batch`
      )
    },

    async update(id: string, data: UpdateInput<T>): Promise<T> {
      validateRequired(id, idField, entityName)

      return wrapServiceOperation(
        async () => {
          // Get existing entity for hooks
          let oldEntity: T | undefined
          if (afterUpdate) {
            oldEntity = await this.getById(id)
          }

          // Apply before hook
          const processedData = beforeUpdate ? await beforeUpdate(id, data) : data

          const result = await apiClient.update<T>(
            tableName,
            id,
            processedData as Record<string, unknown>
          )

          // Apply after hook
          if (afterUpdate && oldEntity) {
            afterUpdate(result, oldEntity).catch((err) => {
              console.error(`[${entityName}Service] afterUpdate hook failed:`, err)
            })
          }

          return result
        },
        entityName,
        'UPDATE',
        `Failed to update ${entityName.toLowerCase()}`
      )
    },

    // -------------------------------------------------------------------------
    // Delete Operations
    // -------------------------------------------------------------------------

    async delete(id: string): Promise<void> {
      validateRequired(id, idField, entityName)

      return wrapServiceOperation(
        async () => {
          // Get entity for hooks
          const entity = await this.getById(id)

          // Apply before hook
          if (beforeDelete) {
            await beforeDelete(id, entity)
          }

          if (softDelete) {
            // Soft delete
            await apiClient.update(tableName, id, { deleted_at: new Date().toISOString() })
          } else {
            // Hard delete
            await apiClient.delete(tableName, id)
          }

          // Apply after hook
          if (afterDelete) {
            afterDelete(entity).catch((err) => {
              console.error(`[${entityName}Service] afterDelete hook failed:`, err)
            })
          }
        },
        entityName,
        'DELETE',
        `Failed to delete ${entityName.toLowerCase()}`
      )
    },

    async hardDelete(id: string): Promise<void> {
      validateRequired(id, idField, entityName)

      return wrapServiceOperation(
        async () => {
          const entity = await this.getById(id)

          if (beforeDelete) {
            await beforeDelete(id, entity)
          }

          await apiClient.delete(tableName, id)

          if (afterDelete) {
            afterDelete(entity).catch((err) => {
              console.error(`[${entityName}Service] afterDelete hook failed:`, err)
            })
          }
        },
        entityName,
        'DELETE',
        `Failed to permanently delete ${entityName.toLowerCase()}`
      )
    },

    async restore(id: string): Promise<T> {
      validateRequired(id, idField, entityName)

      if (!softDelete) {
        throw new ApiErrorClass({
          code: `RESTORE_${entityName.toUpperCase()}_NOT_SUPPORTED`,
          message: `${entityName} does not support soft delete/restore`,
        })
      }

      return wrapServiceOperation(
        () => apiClient.update<T>(tableName, id, { deleted_at: null } as Record<string, unknown>),
        entityName,
        'RESTORE',
        `Failed to restore ${entityName.toLowerCase()}`
      )
    },

    // -------------------------------------------------------------------------
    // Utility Operations
    // -------------------------------------------------------------------------

    async count(options?: CrudQueryOptions): Promise<number> {
      return wrapServiceOperation(
        async () => {
          const filters = buildListFilters(options, softDelete ? 'deleted_at' : undefined)
          return apiClient.count(tableName, { filters })
        },
        entityName,
        'COUNT',
        `Failed to count ${entityName.toLowerCase()} records`
      )
    },

    async exists(id: string): Promise<boolean> {
      try {
        await this.getById(id)
        return true
      } catch {
        return false
      }
    },
  }
}

// ============================================================================
// Extended Service Factory (with common helpers)
// ============================================================================

/**
 * Extended service with additional helper methods
 */
export interface ExtendedCrudService<T extends BaseEntity> extends CrudService<T> {
  /** Get entities for a specific project */
  getByProject(projectId: string, options?: CrudQueryOptions): Promise<T[]>
  /** Get entities for a specific company */
  getByCompany(companyId: string, options?: CrudQueryOptions): Promise<T[]>
  /** Search entities by a text field */
  search(field: string, query: string, options?: CrudQueryOptions): Promise<T[]>
}

/**
 * Create an extended CRUD service with common helper methods
 */
export function createExtendedCrudService<T extends BaseEntity>(
  config: CrudServiceConfig<T>
): ExtendedCrudService<T> {
  const baseService = createCrudService<T>(config)

  return {
    ...baseService,

    async getByProject(projectId: string, options?: CrudQueryOptions): Promise<T[]> {
      return baseService.getByParent('project_id', projectId, options)
    },

    async getByCompany(companyId: string, options?: CrudQueryOptions): Promise<T[]> {
      return baseService.getByParent('company_id', companyId, options)
    },

    async search(
      field: string,
      query: string,
      options?: CrudQueryOptions
    ): Promise<T[]> {
      const searchFilter: QueryFilter = {
        column: field,
        operator: 'ilike',
        value: `%${query}%`,
      }

      return baseService.getAll({
        ...options,
        filters: [...(options?.filters || []), searchFilter],
      })
    },
  }
}

// ============================================================================
// Shared Helpers (previously duplicated across services)
// ============================================================================

import { supabase } from '../supabase'

/**
 * Get user details by ID (consolidated from rfis.ts, punch-lists.ts)
 */
export async function getUserDetails(
  userId: string
): Promise<{ email: string; full_name: string | null } | null> {
  if (!userId) return null

  const { data } = await supabase
    .from('users')
    .select('email, full_name')
    .eq('id', userId)
    .single()

  return data
}

/**
 * Get project name by ID (consolidated from rfis.ts, punch-lists.ts)
 */
export async function getProjectName(projectId: string): Promise<string> {
  if (!projectId) return 'Unknown Project'

  const { data } = await supabase
    .from('projects')
    .select('name')
    .eq('id', projectId)
    .single()

  return data?.name || 'Unknown Project'
}

/**
 * Get company name by ID
 */
export async function getCompanyName(companyId: string): Promise<string> {
  if (!companyId) return 'Unknown Company'

  const { data } = await supabase
    .from('companies')
    .select('name')
    .eq('id', companyId)
    .single()

  return data?.name || 'Unknown Company'
}

/**
 * Detect if a specific field changed between old and new values
 */
export function detectFieldChange<T>(
  oldValue: T | undefined | null,
  newValue: T | undefined | null
): boolean {
  // Both are null/undefined - no change
  if (oldValue == null && newValue == null) return false
  // One is null/undefined, other isn't - change
  if (oldValue == null || newValue == null) return true
  // Both have values - compare
  return oldValue !== newValue
}

/**
 * Detect assignment change (useful for notification triggers)
 */
export function detectAssignmentChange(
  oldAssignee: string | null | undefined,
  newAssignee: string | null | undefined
): { changed: boolean; wasAssigned: boolean; isNowAssigned: boolean } {
  const wasAssigned = !!oldAssignee
  const isNowAssigned = !!newAssignee

  return {
    changed: detectFieldChange(oldAssignee, newAssignee),
    wasAssigned,
    isNowAssigned,
  }
}
