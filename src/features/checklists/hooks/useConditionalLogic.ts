/**
 * Conditional Logic Hook for Checklists
 *
 * Provides runtime evaluation of conditional visibility and branching
 * for checklist items, with support for complex logic chains.
 */

import { useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  ChecklistTemplateItem,
  ChecklistResponse,
  ItemConditions,
  ItemConditionRule,
  ConditionOperator,
} from '@/types/checklists'
import {
  evaluateItemVisibility,
  buildResponsesMap,
  getOperatorsForItemType,
  getOperatorLabel,
  getCheckboxConditionValues,
} from '../utils/conditionEvaluator'

// ============================================================================
// Types
// ============================================================================

export interface ConditionalItem extends ChecklistTemplateItem {
  isVisible: boolean
  dependsOn: string[]
  affectedBy: string[]
  branchDepth: number
}

export interface ConditionalLogicAnalysis {
  rootItems: ConditionalItem[]
  branchingItems: ConditionalItem[]
  hiddenItems: ConditionalItem[]
  visibleCount: number
  totalCount: number
  maxBranchDepth: number
}

export interface BranchPreview {
  itemId: string
  conditions: ItemConditions
  currentlyVisible: boolean
  dependencyChain: Array<{
    itemId: string
    itemTitle: string
    currentValue: string | number | boolean | null
    requiredValue: string | number | boolean | null
    isMet: boolean
  }>
}

// ============================================================================
// Helper Functions
// ============================================================================

function findDependencies(
  item: ChecklistTemplateItem,
  allItems: ChecklistTemplateItem[]
): string[] {
  const conditions = item.conditions as ItemConditions | null
  if (!conditions?.rules) return []

  return conditions.rules.map((rule) => rule.target_item_id)
}

function findAffectedItems(
  itemId: string,
  allItems: ChecklistTemplateItem[]
): string[] {
  return allItems
    .filter((item) => {
      const conditions = item.conditions as ItemConditions | null
      if (!conditions?.rules) return false
      return conditions.rules.some((rule) => rule.target_item_id === itemId)
    })
    .map((item) => item.id)
}

function calculateBranchDepth(
  itemId: string,
  allItems: ChecklistTemplateItem[],
  visited: Set<string> = new Set()
): number {
  if (visited.has(itemId)) return 0 // Prevent circular dependencies
  visited.add(itemId)

  const item = allItems.find((i) => i.id === itemId)
  if (!item) return 0

  const dependencies = findDependencies(item, allItems)
  if (dependencies.length === 0) return 0

  const maxParentDepth = Math.max(
    ...dependencies.map((depId) =>
      calculateBranchDepth(depId, allItems, visited)
    )
  )

  return maxParentDepth + 1
}

function extractResponseValue(
  response: ChecklistResponse | undefined
): string | number | boolean | null {
  if (!response?.response_data) return null

  const data = response.response_data as Record<string, unknown>

  if ('value' in data) {
    return data.value as string | number | boolean
  }
  if ('signature_url' in data) {
    return data.signature_url ? true : null
  }
  if ('photo_urls' in data) {
    const urls = data.photo_urls as string[] | undefined
    return (urls?.length ?? 0) > 0 ? true : null
  }

  return null
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Hook for evaluating and managing conditional logic in checklists
 */
export function useConditionalLogic(
  templateItems: ChecklistTemplateItem[],
  responses: ChecklistResponse[]
) {
  // Build response lookup map
  const responsesMap = useMemo(
    () => buildResponsesMap(responses),
    [responses]
  )

  // Analyze all items with conditional logic
  const analysis = useMemo((): ConditionalLogicAnalysis => {
    const conditionalItems: ConditionalItem[] = templateItems.map((item) => {
      const isVisible = evaluateItemVisibility(
        item.conditions as ItemConditions | null,
        responsesMap
      )
      const dependsOn = findDependencies(item, templateItems)
      const affectedBy = findAffectedItems(item.id, templateItems)
      const branchDepth = calculateBranchDepth(item.id, templateItems)

      return {
        ...item,
        isVisible,
        dependsOn,
        affectedBy,
        branchDepth,
      }
    })

    const rootItems = conditionalItems.filter((i) => i.dependsOn.length === 0)
    const branchingItems = conditionalItems.filter((i) => i.dependsOn.length > 0)
    const hiddenItems = conditionalItems.filter((i) => !i.isVisible)
    const maxBranchDepth = Math.max(...conditionalItems.map((i) => i.branchDepth), 0)

    return {
      rootItems,
      branchingItems,
      hiddenItems,
      visibleCount: conditionalItems.filter((i) => i.isVisible).length,
      totalCount: conditionalItems.length,
      maxBranchDepth,
    }
  }, [templateItems, responsesMap])

  // Get visibility for a specific item
  const isItemVisible = useCallback(
    (itemId: string): boolean => {
      const item = templateItems.find((i) => i.id === itemId)
      if (!item) return true

      return evaluateItemVisibility(
        item.conditions as ItemConditions | null,
        responsesMap
      )
    },
    [templateItems, responsesMap]
  )

  // Get visible items in order
  const visibleItems = useMemo(() => {
    return templateItems
      .filter((item) =>
        evaluateItemVisibility(
          item.conditions as ItemConditions | null,
          responsesMap
        )
      )
      .sort((a, b) => a.sort_order - b.sort_order)
  }, [templateItems, responsesMap])

  // Preview what would happen if a response changed
  const previewBranch = useCallback(
    (
      itemId: string,
      hypotheticalValue: string | number | boolean | null
    ): BranchPreview | null => {
      const item = templateItems.find((i) => i.id === itemId)
      if (!item) return null

      const conditions = item.conditions as ItemConditions | null
      if (!conditions?.rules) return null

      const dependencyChain = conditions.rules.map((rule) => {
        const targetItem = templateItems.find((i) => i.id === rule.target_item_id)
        const currentResponse = responsesMap.get(rule.target_item_id)
        const currentValue = extractResponseValue(currentResponse)

        // Simple evaluation for preview
        let isMet = false
        const checkValue =
          rule.target_item_id === itemId ? hypotheticalValue : currentValue

        switch (rule.operator) {
          case 'equals':
            isMet = checkValue === rule.value
            break
          case 'not_equals':
            isMet = checkValue !== rule.value
            break
          case 'is_empty':
            isMet = checkValue === null || checkValue === ''
            break
          case 'is_not_empty':
            isMet = checkValue !== null && checkValue !== ''
            break
          case 'greater_than':
            isMet =
              typeof checkValue === 'number' &&
              typeof rule.value === 'number' &&
              checkValue > rule.value
            break
          case 'less_than':
            isMet =
              typeof checkValue === 'number' &&
              typeof rule.value === 'number' &&
              checkValue < rule.value
            break
          default:
            isMet = false
        }

        return {
          itemId: rule.target_item_id,
          itemTitle: targetItem?.title || 'Unknown Item',
          currentValue,
          requiredValue: rule.value ?? null,
          isMet,
        }
      })

      // Determine if conditions are currently met
      let conditionsMet: boolean
      if (conditions.logic === 'AND') {
        conditionsMet = dependencyChain.every((d) => d.isMet)
      } else {
        conditionsMet = dependencyChain.some((d) => d.isMet)
      }

      const currentlyVisible =
        conditions.action === 'show' ? conditionsMet : !conditionsMet

      return {
        itemId: item.id,
        conditions,
        currentlyVisible,
        dependencyChain,
      }
    },
    [templateItems, responsesMap]
  )

  // Get items affected by changing a specific item's response
  const getAffectedItems = useCallback(
    (sourceItemId: string): ChecklistTemplateItem[] => {
      const affectedIds = findAffectedItems(sourceItemId, templateItems)
      return templateItems.filter((item) => affectedIds.includes(item.id))
    },
    [templateItems]
  )

  // Validate conditional logic configuration
  const validateConditions = useCallback(
    (conditions: ItemConditions): { valid: boolean; errors: string[] } => {
      const errors: string[] = []

      if (!conditions.rules || conditions.rules.length === 0) {
        errors.push('At least one condition rule is required')
      }

      for (const rule of conditions.rules || []) {
        const targetItem = templateItems.find((i) => i.id === rule.target_item_id)
        if (!targetItem) {
          errors.push(`Target item "${rule.target_item_id}" not found`)
        } else {
          const validOperators = getOperatorsForItemType(targetItem.item_type)
          if (!validOperators.includes(rule.operator)) {
            errors.push(
              `Operator "${rule.operator}" is not valid for item type "${targetItem.item_type}"`
            )
          }
        }
      }

      return {
        valid: errors.length === 0,
        errors,
      }
    },
    [templateItems]
  )

  return {
    analysis,
    visibleItems,
    isItemVisible,
    previewBranch,
    getAffectedItems,
    validateConditions,
    responsesMap,
  }
}

// ============================================================================
// Mutation Hook for Updating Conditions
// ============================================================================

/**
 * Hook for updating checklist item conditions
 */
export function useUpdateItemConditions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      itemId,
      conditions,
    }: {
      itemId: string
      conditions: ItemConditions | null
    }) => {
      const { data, error } = await supabase
        .from('checklist_template_items')
        .update({ conditions })
        .eq('id', itemId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['checklist-template-items'] })
      queryClient.invalidateQueries({
        queryKey: ['checklist-template', data.checklist_template_id],
      })
    },
  })
}

// ============================================================================
// Re-exports
// ============================================================================

export {
  evaluateItemVisibility,
  buildResponsesMap,
  getOperatorsForItemType,
  getOperatorLabel,
  getCheckboxConditionValues,
}
