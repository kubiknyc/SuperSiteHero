// File: /src/lib/supabase-typed.ts
// Type-safe Supabase client helpers for extended tables

import { supabase } from './supabase'
import type { PostgrestError, PostgrestSingleResponse, PostgrestResponse } from '@supabase/supabase-js'
import type { ExtendedTables, ExtendedTableName } from '@/types/database-extensions'

/**
 * Type-safe query builder for extended tables not in generated types.
 *
 * Usage:
 * ```typescript
 * // Select
 * const { data, error } = await fromExtended('docusign_connections')
 *   .select('*')
 *   .eq('company_id', companyId)
 *
 * // Insert
 * const { data, error } = await fromExtended('docusign_connections')
 *   .insert({ company_id: '...', account_id: '...' })
 *   .select()
 *   .single()
 *
 * // Update
 * const { error } = await fromExtended('docusign_connections')
 *   .update({ is_active: false })
 *   .eq('id', connectionId)
 *
 * // Delete
 * const { error } = await fromExtended('docusign_connections')
 *   .delete()
 *   .eq('id', connectionId)
 * ```
 */
export function fromExtended<T extends ExtendedTableName>(table: T) {
  type Row = ExtendedTables[T]['Row']
  type Insert = ExtendedTables[T]['Insert']
  type Update = ExtendedTables[T]['Update']

  // Cast to provide type hints while maintaining Supabase functionality
  return supabase.from(table) as unknown as ExtendedTableQueryBuilder<Row, Insert, Update>
}

/**
 * Query builder interface that mirrors Supabase's PostgrestQueryBuilder
 * but with proper types for extended tables.
 */
interface ExtendedTableQueryBuilder<Row, Insert, Update> {
  select<Columns extends string = '*'>(
    columns?: Columns
  ): ExtendedTableFilterBuilder<Row>

  insert(
    values: Insert | Insert[]
  ): ExtendedTableModifyBuilder<Row>

  update(
    values: Update
  ): ExtendedTableFilterBuilder<Row>

  delete(): ExtendedTableFilterBuilder<Row>

  upsert(
    values: Insert | Insert[],
    options?: { onConflict?: string; ignoreDuplicates?: boolean }
  ): ExtendedTableModifyBuilder<Row>
}

/**
 * Filter builder for chaining query conditions
 */
interface ExtendedTableFilterBuilder<Row> {
  eq(column: string, value: unknown): ExtendedTableFilterBuilder<Row>
  neq(column: string, value: unknown): ExtendedTableFilterBuilder<Row>
  gt(column: string, value: unknown): ExtendedTableFilterBuilder<Row>
  gte(column: string, value: unknown): ExtendedTableFilterBuilder<Row>
  lt(column: string, value: unknown): ExtendedTableFilterBuilder<Row>
  lte(column: string, value: unknown): ExtendedTableFilterBuilder<Row>
  like(column: string, pattern: string): ExtendedTableFilterBuilder<Row>
  ilike(column: string, pattern: string): ExtendedTableFilterBuilder<Row>
  is(column: string, value: boolean | null): ExtendedTableFilterBuilder<Row>
  in(column: string, values: unknown[]): ExtendedTableFilterBuilder<Row>
  contains(column: string, value: unknown): ExtendedTableFilterBuilder<Row>
  containedBy(column: string, value: unknown): ExtendedTableFilterBuilder<Row>
  range(column: string, range: string): ExtendedTableFilterBuilder<Row>
  or(filters: string): ExtendedTableFilterBuilder<Row>
  not(column: string, operator: string, value: unknown): ExtendedTableFilterBuilder<Row>
  match(query: Record<string, unknown>): ExtendedTableFilterBuilder<Row>
  filter(column: string, operator: string, value: unknown): ExtendedTableFilterBuilder<Row>

  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }): ExtendedTableFilterBuilder<Row>
  limit(count: number): ExtendedTableFilterBuilder<Row>
  range(from: number, to: number): ExtendedTableFilterBuilder<Row>

  select(columns?: string): ExtendedTableFilterBuilder<Row>
  single(): PromiseLike<PostgrestSingleResponse<Row>>
  maybeSingle(): PromiseLike<PostgrestSingleResponse<Row | null>>

  then<TResult1 = PostgrestResponse<Row>, TResult2 = never>(
    onfulfilled?: ((value: PostgrestResponse<Row>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2>
}

/**
 * Modify builder for insert/upsert operations
 */
interface ExtendedTableModifyBuilder<Row> {
  select(columns?: string): ExtendedTableFilterBuilder<Row>
  single(): PromiseLike<PostgrestSingleResponse<Row>>

  then<TResult1 = PostgrestResponse<Row>, TResult2 = never>(
    onfulfilled?: ((value: PostgrestResponse<Row>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2>
}

/**
 * Type guard to check if a table name is an extended table
 */
export function isExtendedTable(table: string): table is ExtendedTableName {
  const extendedTables: ExtendedTableName[] = [
    'action_items_with_context',
    'action_item_summary_by_project',
    'action_items_by_assignee',
    'client_project_summary',
    'client_portal_settings',
    'docusign_connections',
    'docusign_envelopes',
    'docusign_envelope_recipients',
    'docusign_envelope_events',
    'docusign_oauth_states',
    'lien_waivers',
    'lien_waiver_templates',
    'lien_waiver_requirements',
    'lien_waiver_history',
    'drawing_bookmarks',
    'approval_workflows',
    'approval_steps',
    'approval_requests',
    'approval_actions',
    'weather_logs',
    'daily_report_templates',
    'daily_report_versions',
    'cost_estimates',
    'cost_estimate_items',
    'takeoff_templates'
  ]
  return extendedTables.includes(table as ExtendedTableName)
}

/**
 * Helper to get row type for an extended table
 */
export type ExtendedTableRow<T extends ExtendedTableName> = ExtendedTables[T]['Row']

/**
 * Helper to get insert type for an extended table
 */
export type ExtendedTableInsert<T extends ExtendedTableName> = ExtendedTables[T]['Insert']

/**
 * Helper to get update type for an extended table
 */
export type ExtendedTableUpdate<T extends ExtendedTableName> = ExtendedTables[T]['Update']
