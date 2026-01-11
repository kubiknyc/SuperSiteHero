/**
 * useScopeTemplates Hook
 * React Query hooks for scope template management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import type {
  ScopeTemplate,
  ScopeTemplateItem,
  CreateScopeTemplateDTO,
  ApplyTemplateResult,
  TradeCode,
  TRADE_CODES,
  ScopeTemplateWithStats,
  ScopeTemplateLibrary,
} from '../types'

// Use any for tables not in generated types
const db = supabase as any

// Query keys
export const scopeTemplateKeys = {
  all: ['scopeTemplates'] as const,
  lists: () => [...scopeTemplateKeys.all, 'list'] as const,
  list: (filters: { tradeCode?: string; search?: string }) =>
    [...scopeTemplateKeys.lists(), filters] as const,
  detail: (id: string) => [...scopeTemplateKeys.all, 'detail', id] as const,
  items: (id: string) => [...scopeTemplateKeys.all, 'items', id] as const,
  library: () => [...scopeTemplateKeys.all, 'library'] as const,
  byTrade: (tradeCode: string) => [...scopeTemplateKeys.all, 'byTrade', tradeCode] as const,
}

// =============================================
// Template Queries
// =============================================

/**
 * Get all scope templates
 */
export function useScopeTemplates(filters: { tradeCode?: string; search?: string } = {}) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: scopeTemplateKeys.list(filters),
    queryFn: async () => {
      let query = db
        .from('scope_templates')
        .select(`
          *,
          items:scope_template_items(count),
          created_by_user:users!created_by(id, full_name)
        `)
        .or(`company_id.eq.${userProfile?.company_id},is_public.eq.true`)
        .is('deleted_at', null)

      if (filters.tradeCode) {
        query = query.eq('trade_code', filters.tradeCode)
      }

      if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`)
      }

      query = query.order('is_default', { ascending: false })
        .order('name', { ascending: true })

      const { data, error } = await query

      if (error) {throw error}
      return data as ScopeTemplate[]
    },
    enabled: !!userProfile?.company_id,
  })
}

/**
 * Get single template with items
 */
export function useScopeTemplate(id: string | undefined) {
  return useQuery({
    queryKey: scopeTemplateKeys.detail(id || ''),
    queryFn: async () => {
      const { data, error } = await db
        .from('scope_templates')
        .select(`
          *,
          items:scope_template_items(*)
        `)
        .eq('id', id)
        .single()

      if (error) {throw error}

      // Sort items by sort_order
      if (data.items) {
        data.items.sort((a: ScopeTemplateItem, b: ScopeTemplateItem) => a.sortOrder - b.sortOrder)
      }

      return data as ScopeTemplate
    },
    enabled: !!id,
  })
}

/**
 * Get template library with stats
 */
export function useScopeTemplateLibrary() {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: scopeTemplateKeys.library(),
    queryFn: async (): Promise<ScopeTemplateLibrary> => {
      // Get templates with usage count
      const { data: templates, error: tempError } = await db
        .from('scope_templates')
        .select(`
          id,
          name,
          description,
          trade_code,
          division,
          is_default,
          is_public,
          created_at,
          updated_at,
          items:scope_template_items(count),
          usage:bid_package_scope_templates(count)
        `)
        .or(`company_id.eq.${userProfile?.company_id},is_public.eq.true`)
        .is('deleted_at', null)
        .order('name', { ascending: true })

      if (tempError) {throw tempError}

      // Group by trade
      const tradeGroups: Record<string, number> = {}
      const templatesWithStats: ScopeTemplateWithStats[] = templates.map((t: any) => {
        const tradeCode = t.trade_code || 'general'
        tradeGroups[tradeCode] = (tradeGroups[tradeCode] || 0) + 1

        return {
          id: t.id,
          name: t.name,
          description: t.description,
          tradeCode,
          tradeName: getTradeLabel(tradeCode as TradeCode),
          division: t.division,
          itemCount: t.items?.[0]?.count || 0,
          usageCount: t.usage?.[0]?.count || 0,
          isDefault: t.is_default,
          isPublic: t.is_public,
          createdAt: t.created_at,
          updatedAt: t.updated_at,
        }
      })

      const trades = Object.entries(tradeGroups).map(([code, count]) => ({
        code,
        name: getTradeLabel(code as TradeCode),
        count,
      }))

      return {
        templates: templatesWithStats,
        trades: trades.sort((a, b) => b.count - a.count),
      }
    },
    enabled: !!userProfile?.company_id,
  })
}

/**
 * Get templates by trade
 */
export function useScopeTemplatesByTrade(tradeCode: string | undefined) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: scopeTemplateKeys.byTrade(tradeCode || ''),
    queryFn: async () => {
      const { data, error } = await db
        .from('scope_templates')
        .select('*')
        .eq('trade_code', tradeCode)
        .or(`company_id.eq.${userProfile?.company_id},is_public.eq.true`)
        .is('deleted_at', null)
        .order('is_default', { ascending: false })
        .order('name', { ascending: true })

      if (error) {throw error}
      return data as ScopeTemplate[]
    },
    enabled: !!tradeCode && !!userProfile?.company_id,
  })
}

// =============================================
// Mutations
// =============================================

/**
 * Create a new scope template
 */
export function useCreateScopeTemplate() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (dto: CreateScopeTemplateDTO) => {
      // Create template
      const { data: template, error: tempError } = await db
        .from('scope_templates')
        .insert({
          company_id: userProfile?.company_id,
          name: dto.name,
          description: dto.description,
          trade_code: dto.tradeCode,
          division: dto.division,
          is_default: dto.isDefault || false,
          common_exclusions: dto.commonExclusions || [],
          common_inclusions: dto.commonInclusions || [],
          required_documents: dto.requiredDocuments || [],
          special_conditions: dto.specialConditions,
          created_by: userProfile?.id,
        })
        .select()
        .single()

      if (tempError) {throw tempError}

      // Create items if provided
      if (dto.scopeItems && dto.scopeItems.length > 0) {
        const items = dto.scopeItems.map((item, index) => ({
          template_id: template.id,
          item_number: item.itemNumber,
          description: item.description,
          unit: item.unit,
          is_required: item.isRequired ?? true,
          is_alternate: item.isAlternate ?? false,
          alternate_group: item.alternateGroup,
          estimated_quantity: item.estimatedQuantity,
          estimated_unit_price: item.estimatedUnitPrice,
          notes: item.notes,
          sort_order: index + 1,
        }))

        const { error: itemsError } = await db
          .from('scope_template_items')
          .insert(items)

        if (itemsError) {throw itemsError}
      }

      return template
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scopeTemplateKeys.lists() })
      queryClient.invalidateQueries({ queryKey: scopeTemplateKeys.library() })
      toast.success('Template created')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create template: ${error.message}`)
    },
  })
}

/**
 * Update a scope template
 */
export function useUpdateScopeTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      updates: Partial<CreateScopeTemplateDTO>
    }) => {
      const { data, error } = await db
        .from('scope_templates')
        .update({
          name: updates.name,
          description: updates.description,
          trade_code: updates.tradeCode,
          division: updates.division,
          is_default: updates.isDefault,
          common_exclusions: updates.commonExclusions,
          common_inclusions: updates.commonInclusions,
          required_documents: updates.requiredDocuments,
          special_conditions: updates.specialConditions,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: scopeTemplateKeys.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: scopeTemplateKeys.lists() })
      toast.success('Template updated')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update template: ${error.message}`)
    },
  })
}

/**
 * Delete a scope template
 */
export function useDeleteScopeTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from('scope_templates')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) {throw error}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scopeTemplateKeys.lists() })
      queryClient.invalidateQueries({ queryKey: scopeTemplateKeys.library() })
      toast.success('Template deleted')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete template: ${error.message}`)
    },
  })
}

/**
 * Duplicate a scope template
 */
export function useDuplicateScopeTemplate() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      templateId,
      newName,
    }: {
      templateId: string
      newName: string
    }) => {
      // Get original template
      const { data: original, error: origError } = await db
        .from('scope_templates')
        .select(`
          *,
          items:scope_template_items(*)
        `)
        .eq('id', templateId)
        .single()

      if (origError) {throw origError}

      // Create new template
      const { data: newTemplate, error: newError } = await db
        .from('scope_templates')
        .insert({
          company_id: userProfile?.company_id,
          name: newName,
          description: original.description,
          trade_code: original.trade_code,
          division: original.division,
          is_default: false,
          is_public: false,
          common_exclusions: original.common_exclusions,
          common_inclusions: original.common_inclusions,
          required_documents: original.required_documents,
          special_conditions: original.special_conditions,
          created_by: userProfile?.id,
        })
        .select()
        .single()

      if (newError) {throw newError}

      // Duplicate items
      if (original.items && original.items.length > 0) {
        const items = original.items.map((item: any) => ({
          template_id: newTemplate.id,
          item_number: item.item_number,
          description: item.description,
          unit: item.unit,
          is_required: item.is_required,
          is_alternate: item.is_alternate,
          alternate_group: item.alternate_group,
          estimated_quantity: item.estimated_quantity,
          estimated_unit_price: item.estimated_unit_price,
          notes: item.notes,
          sort_order: item.sort_order,
        }))

        await db.from('scope_template_items').insert(items)
      }

      return newTemplate
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scopeTemplateKeys.lists() })
      toast.success('Template duplicated')
    },
    onError: (error: Error) => {
      toast.error(`Failed to duplicate template: ${error.message}`)
    },
  })
}

/**
 * Apply template to bid package
 */
export function useApplyScopeTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      templateId,
      packageId,
      options,
    }: {
      templateId: string
      packageId: string
      options?: {
        includeItems?: boolean
        includeExclusions?: boolean
        includeInclusions?: boolean
        includeDocuments?: boolean
      }
    }): Promise<ApplyTemplateResult> => {
      const opts = {
        includeItems: true,
        includeExclusions: true,
        includeInclusions: true,
        includeDocuments: true,
        ...options,
      }

      // Get template
      const { data: template, error: tempError } = await db
        .from('scope_templates')
        .select(`
          *,
          items:scope_template_items(*)
        `)
        .eq('id', templateId)
        .single()

      if (tempError) {throw tempError}

      let itemsAdded = 0

      // Apply items to bid package
      if (opts.includeItems && template.items) {
        // Get existing item count for sort_order
        const { count: existingCount } = await db
          .from('bid_package_items')
          .select('*', { count: 'exact', head: true })
          .eq('bid_package_id', packageId)

        const items = template.items.map((item: any, index: number) => ({
          bid_package_id: packageId,
          item_number: item.item_number,
          description: item.description,
          unit: item.unit,
          quantity: item.estimated_quantity,
          estimated_unit_price: item.estimated_unit_price,
          is_required: item.is_required,
          is_alternate: item.is_alternate,
          alternate_group: item.alternate_group,
          notes: item.notes,
          sort_order: (existingCount || 0) + index + 1,
        }))

        const { data: insertedItems } = await db
          .from('bid_package_items')
          .insert(items)
          .select()

        itemsAdded = insertedItems?.length || 0
      }

      // Update bid package with exclusions/inclusions
      const updates: Record<string, any> = {}

      if (opts.includeExclusions && template.common_exclusions?.length > 0) {
        updates.standard_exclusions = template.common_exclusions
      }

      if (opts.includeInclusions && template.common_inclusions?.length > 0) {
        updates.standard_inclusions = template.common_inclusions
      }

      if (opts.includeDocuments && template.required_documents?.length > 0) {
        updates.required_documents = template.required_documents
      }

      if (template.special_conditions) {
        updates.special_conditions = template.special_conditions
      }

      if (Object.keys(updates).length > 0) {
        await db
          .from('bid_packages')
          .update(updates)
          .eq('id', packageId)
      }

      // Track template usage
      await db.from('bid_package_scope_templates').insert({
        bid_package_id: packageId,
        scope_template_id: templateId,
        applied_at: new Date().toISOString(),
      })

      return {
        itemsAdded,
        exclusionsAdded: opts.includeExclusions ? template.common_exclusions || [] : [],
        inclusionsAdded: opts.includeInclusions ? template.common_inclusions || [] : [],
      }
    },
    onSuccess: (result, { packageId }) => {
      queryClient.invalidateQueries({ queryKey: ['bidPackages', 'items', packageId] })
      queryClient.invalidateQueries({ queryKey: ['bidPackages', 'detail', packageId] })
      toast.success(`Applied template: ${result.itemsAdded} items added`)
    },
    onError: (error: Error) => {
      toast.error(`Failed to apply template: ${error.message}`)
    },
  })
}

// =============================================
// Template Item Mutations
// =============================================

/**
 * Add item to template
 */
export function useAddTemplateItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      templateId,
      item,
    }: {
      templateId: string
      item: Omit<ScopeTemplateItem, 'id' | 'templateId'>
    }) => {
      // Get next sort order
      const { count } = await db
        .from('scope_template_items')
        .select('*', { count: 'exact', head: true })
        .eq('template_id', templateId)

      const { data, error } = await db
        .from('scope_template_items')
        .insert({
          template_id: templateId,
          item_number: item.itemNumber,
          description: item.description,
          unit: item.unit,
          is_required: item.isRequired,
          is_alternate: item.isAlternate,
          alternate_group: item.alternateGroup,
          estimated_quantity: item.estimatedQuantity,
          estimated_unit_price: item.estimatedUnitPrice,
          notes: item.notes,
          sort_order: (count || 0) + 1,
        })
        .select()
        .single()

      if (error) {throw error}
      return { item: data, templateId }
    },
    onSuccess: ({ templateId }) => {
      queryClient.invalidateQueries({ queryKey: scopeTemplateKeys.detail(templateId) })
      toast.success('Item added')
    },
    onError: (error: Error) => {
      toast.error(`Failed to add item: ${error.message}`)
    },
  })
}

/**
 * Update template item
 */
export function useUpdateTemplateItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      itemId,
      templateId,
      updates,
    }: {
      itemId: string
      templateId: string
      updates: Partial<ScopeTemplateItem>
    }) => {
      const { data, error } = await db
        .from('scope_template_items')
        .update({
          item_number: updates.itemNumber,
          description: updates.description,
          unit: updates.unit,
          is_required: updates.isRequired,
          is_alternate: updates.isAlternate,
          alternate_group: updates.alternateGroup,
          estimated_quantity: updates.estimatedQuantity,
          estimated_unit_price: updates.estimatedUnitPrice,
          notes: updates.notes,
        })
        .eq('id', itemId)
        .select()
        .single()

      if (error) {throw error}
      return { item: data, templateId }
    },
    onSuccess: ({ templateId }) => {
      queryClient.invalidateQueries({ queryKey: scopeTemplateKeys.detail(templateId) })
      toast.success('Item updated')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update item: ${error.message}`)
    },
  })
}

/**
 * Delete template item
 */
export function useDeleteTemplateItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      itemId,
      templateId,
    }: {
      itemId: string
      templateId: string
    }) => {
      const { error } = await db
        .from('scope_template_items')
        .delete()
        .eq('id', itemId)

      if (error) {throw error}
      return { templateId }
    },
    onSuccess: ({ templateId }) => {
      queryClient.invalidateQueries({ queryKey: scopeTemplateKeys.detail(templateId) })
      toast.success('Item deleted')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete item: ${error.message}`)
    },
  })
}

/**
 * Reorder template items
 */
export function useReorderTemplateItems() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      templateId,
      itemIds,
    }: {
      templateId: string
      itemIds: string[]
    }) => {
      // Update sort_order for each item
      const updates = itemIds.map((id, index) =>
        db
          .from('scope_template_items')
          .update({ sort_order: index + 1 })
          .eq('id', id)
      )

      await Promise.all(updates)

      return { templateId }
    },
    onSuccess: ({ templateId }) => {
      queryClient.invalidateQueries({ queryKey: scopeTemplateKeys.detail(templateId) })
    },
    onError: (error: Error) => {
      toast.error(`Failed to reorder items: ${error.message}`)
    },
  })
}

// =============================================
// Utility Functions
// =============================================

/**
 * Get trade label from code
 */
export function getTradeLabel(code: TradeCode): string {
  const trade = TRADE_CODES?.find((t) => t.value === code)
  return trade?.label || code
}

/**
 * Get division from trade code
 */
export function getTradeDivision(code: TradeCode): string {
  const trade = TRADE_CODES?.find((t) => t.value === code)
  return trade?.division || ''
}

/**
 * Format template for export
 */
export function formatTemplateForExport(template: ScopeTemplate): string {
  const lines: string[] = []

  lines.push(`Template: ${template.name}`)
  lines.push(`Trade: ${getTradeLabel(template.tradeCode as TradeCode)}`)
  if (template.description) {lines.push(`Description: ${template.description}`)}
  lines.push('')

  if (template.scopeItems && template.scopeItems.length > 0) {
    lines.push('Scope Items:')
    template.scopeItems.forEach((item) => {
      lines.push(`  ${item.itemNumber}. ${item.description}`)
      if (item.unit) {lines.push(`      Unit: ${item.unit}`)}
      if (item.notes) {lines.push(`      Notes: ${item.notes}`)}
    })
    lines.push('')
  }

  if (template.commonInclusions && template.commonInclusions.length > 0) {
    lines.push('Standard Inclusions:')
    template.commonInclusions.forEach((inc) => lines.push(`  - ${inc}`))
    lines.push('')
  }

  if (template.commonExclusions && template.commonExclusions.length > 0) {
    lines.push('Standard Exclusions:')
    template.commonExclusions.forEach((exc) => lines.push(`  - ${exc}`))
  }

  return lines.join('\n')
}
