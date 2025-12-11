// File: /src/features/checklists/utils/conditionEvaluator.ts
// Utility to evaluate conditional visibility for checklist items

import type {
  ItemConditions,
  ItemConditionRule,
  ConditionOperator,
  ChecklistResponse,
  ResponseData,
  CheckboxResponseData,
  TextResponseData,
  NumberResponseData,
} from '@/types/checklists'

/**
 * Extract the primary value from a response for comparison
 */
function extractResponseValue(response: ChecklistResponse | undefined): string | number | boolean | null {
  if (!response || !response.response_data) {
    return null
  }

  const data = response.response_data as ResponseData

  // Type guard checks
  if ('value' in data) {
    // Checkbox, Text, or Number response
    const typedData = data as CheckboxResponseData | TextResponseData | NumberResponseData
    return typedData.value
  }

  if ('signature_url' in data) {
    // Signature - consider "filled" if URL exists
    return data.signature_url ? true : null
  }

  if ('photo_urls' in data) {
    // Photo - consider count for "is_empty" / "is_not_empty"
    return (data.photo_urls?.length ?? 0) > 0 ? true : null
  }

  return null
}

/**
 * Evaluate a single condition rule against a response
 */
function evaluateRule(rule: ItemConditionRule, response: ChecklistResponse | undefined): boolean {
  const responseValue = extractResponseValue(response)
  const { operator, value: targetValue } = rule

  switch (operator) {
    case 'is_empty':
      return responseValue === null || responseValue === '' || responseValue === undefined

    case 'is_not_empty':
      return responseValue !== null && responseValue !== '' && responseValue !== undefined

    case 'equals':
      // Handle checkbox special values
      if (typeof responseValue === 'string' && typeof targetValue === 'string') {
        return responseValue.toLowerCase() === targetValue.toLowerCase()
      }
      return responseValue === targetValue

    case 'not_equals':
      if (typeof responseValue === 'string' && typeof targetValue === 'string') {
        return responseValue.toLowerCase() !== targetValue.toLowerCase()
      }
      return responseValue !== targetValue

    case 'contains':
      if (typeof responseValue === 'string' && typeof targetValue === 'string') {
        return responseValue.toLowerCase().includes(targetValue.toLowerCase())
      }
      return false

    case 'not_contains':
      if (typeof responseValue === 'string' && typeof targetValue === 'string') {
        return !responseValue.toLowerCase().includes(targetValue.toLowerCase())
      }
      return true

    case 'greater_than':
      if (typeof responseValue === 'number' && typeof targetValue === 'number') {
        return responseValue > targetValue
      }
      return false

    case 'less_than':
      if (typeof responseValue === 'number' && typeof targetValue === 'number') {
        return responseValue < targetValue
      }
      return false

    default:
      return false
  }
}

/**
 * Evaluate all conditions for an item to determine visibility
 *
 * @param conditions - The item's conditions configuration
 * @param responsesMap - Map of item ID to response for quick lookup
 * @returns true if item should be visible, false if hidden
 */
export function evaluateItemVisibility(
  conditions: ItemConditions | null | undefined,
  responsesMap: Map<string, ChecklistResponse>
): boolean {
  // No conditions = always visible
  if (!conditions || !conditions.rules || conditions.rules.length === 0) {
    return true
  }

  const { logic, rules, action } = conditions

  // Evaluate all rules
  const ruleResults = rules.map((rule) => {
    const response = responsesMap.get(rule.target_item_id)
    return evaluateRule(rule, response)
  })

  // Combine results based on logic operator
  let conditionsMet: boolean
  if (logic === 'AND') {
    conditionsMet = ruleResults.every(Boolean)
  } else {
    // OR
    conditionsMet = ruleResults.some(Boolean)
  }

  // Apply action
  if (action === 'show') {
    return conditionsMet
  } else {
    // 'hide'
    return !conditionsMet
  }
}

/**
 * Build a lookup map from template item ID to response
 */
export function buildResponsesMap(responses: ChecklistResponse[]): Map<string, ChecklistResponse> {
  const map = new Map<string, ChecklistResponse>()

  for (const response of responses) {
    if (response.checklist_template_item_id) {
      map.set(response.checklist_template_item_id, response)
    }
  }

  return map
}

/**
 * Get available operators for a given item type
 */
export function getOperatorsForItemType(itemType: string): ConditionOperator[] {
  switch (itemType) {
    case 'checkbox':
      return ['equals', 'not_equals', 'is_empty', 'is_not_empty']
    case 'text':
      return ['equals', 'not_equals', 'contains', 'not_contains', 'is_empty', 'is_not_empty']
    case 'number':
      return ['equals', 'not_equals', 'greater_than', 'less_than', 'is_empty', 'is_not_empty']
    case 'photo':
    case 'signature':
      return ['is_empty', 'is_not_empty']
    default:
      return ['is_empty', 'is_not_empty']
  }
}

/**
 * Get human-readable label for an operator
 */
export function getOperatorLabel(operator: ConditionOperator): string {
  switch (operator) {
    case 'equals':
      return 'equals'
    case 'not_equals':
      return 'does not equal'
    case 'contains':
      return 'contains'
    case 'not_contains':
      return 'does not contain'
    case 'greater_than':
      return 'is greater than'
    case 'less_than':
      return 'is less than'
    case 'is_empty':
      return 'is empty'
    case 'is_not_empty':
      return 'is not empty'
    default:
      return operator
  }
}

/**
 * Get possible values for checkbox item conditions
 */
export function getCheckboxConditionValues(): { value: string; label: string }[] {
  return [
    { value: 'pass', label: 'Pass' },
    { value: 'fail', label: 'Fail' },
    { value: 'na', label: 'N/A' },
    { value: 'checked', label: 'Checked' },
    { value: 'unchecked', label: 'Unchecked' },
  ]
}
