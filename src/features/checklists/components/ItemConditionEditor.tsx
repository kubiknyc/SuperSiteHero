// File: /src/features/checklists/components/ItemConditionEditor.tsx
// Editor for conditional visibility rules on checklist items

import { useState } from 'react'
import { Plus, Trash2, Link, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import type {
  ChecklistTemplateItem,
  ItemConditions,
  ItemConditionRule,
  ConditionOperator,
} from '@/types/checklists'
import {
  getOperatorsForItemType,
  getOperatorLabel,
  getCheckboxConditionValues,
} from '../utils/conditionEvaluator'

interface ItemConditionEditorProps {
  item: ChecklistTemplateItem
  allItems: ChecklistTemplateItem[]
  onUpdateConditions: (conditions: ItemConditions | null) => void
}

export function ItemConditionEditor({
  item,
  allItems,
  onUpdateConditions,
}: ItemConditionEditorProps) {
  // Get items that can be targets (items before this one in the list)
  const availableTargetItems = allItems.filter(
    (other) => other.id !== item.id && other.sort_order < item.sort_order
  )

  // Local state for editing
  const [conditions, setConditions] = useState<ItemConditions | null>(
    item.conditions || null
  )

  // Initialize with default if adding first condition
  const initializeConditions = (): ItemConditions => ({
    logic: 'AND',
    action: 'show',
    rules: [],
  })

  const handleAddRule = () => {
    if (!conditions) {
      setConditions({
        ...initializeConditions(),
        rules: [{ target_item_id: '', operator: 'equals', value: '' }],
      })
    } else {
      setConditions({
        ...conditions,
        rules: [
          ...conditions.rules,
          { target_item_id: '', operator: 'equals', value: '' },
        ],
      })
    }
  }

  const handleUpdateRule = (
    index: number,
    updates: Partial<ItemConditionRule>
  ) => {
    if (!conditions) return

    const newRules = [...conditions.rules]
    newRules[index] = { ...newRules[index], ...updates }
    setConditions({ ...conditions, rules: newRules })
  }

  const handleDeleteRule = (index: number) => {
    if (!conditions) return

    const newRules = conditions.rules.filter((_, i) => i !== index)
    if (newRules.length === 0) {
      setConditions(null)
    } else {
      setConditions({ ...conditions, rules: newRules })
    }
  }

  const handleSave = () => {
    // Validate rules before saving
    if (conditions && conditions.rules.length > 0) {
      const validRules = conditions.rules.filter(
        (rule) => rule.target_item_id && rule.operator
      )
      if (validRules.length === 0) {
        onUpdateConditions(null)
      } else {
        onUpdateConditions({ ...conditions, rules: validRules })
      }
    } else {
      onUpdateConditions(null)
    }
  }

  const handleClear = () => {
    setConditions(null)
    onUpdateConditions(null)
  }

  // Get the target item for a rule
  const getTargetItem = (targetId: string) => {
    return allItems.find((i) => i.id === targetId)
  }

  // Render value input based on target item type
  const renderValueInput = (rule: ItemConditionRule, index: number) => {
    const targetItem = getTargetItem(rule.target_item_id)
    if (!targetItem) return null

    // For is_empty / is_not_empty, no value needed
    if (rule.operator === 'is_empty' || rule.operator === 'is_not_empty') {
      return null
    }

    if (targetItem.item_type === 'checkbox') {
      const options = getCheckboxConditionValues()
      return (
        <Select
          value={rule.value?.toString() || ''}
          onChange={(e) =>
            handleUpdateRule(index, { value: e.target.value })
          }
          className="w-32"
        >
          <option value="">Select value...</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      )
    }

    if (targetItem.item_type === 'number') {
      return (
        <Input
          type="number"
          value={rule.value?.toString() || ''}
          onChange={(e) =>
            handleUpdateRule(index, {
              value: e.target.value ? parseFloat(e.target.value) : undefined,
            })
          }
          placeholder="Enter value"
          className="w-24"
        />
      )
    }

    // Default text input
    return (
      <Input
        type="text"
        value={rule.value?.toString() || ''}
        onChange={(e) =>
          handleUpdateRule(index, { value: e.target.value })
        }
        placeholder="Enter value"
        className="w-32"
      />
    )
  }

  const hasConditions = conditions && conditions.rules.length > 0

  return (
    <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold flex items-center gap-2">
          <Link className="h-4 w-4 text-blue-600" />
          Conditional Visibility
        </Label>
        {hasConditions && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-gray-500 hover:text-red-600 h-7 px-2"
          >
            Clear All
          </Button>
        )}
      </div>

      {availableTargetItems.length === 0 ? (
        <p className="text-xs text-gray-500">
          No items above this one to create conditions from. Add items before this one first.
        </p>
      ) : (
        <>
          {hasConditions && (
            <>
              {/* Logic and Action selectors */}
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-600">
                  {conditions.action === 'show' ? (
                    <Eye className="h-4 w-4 inline mr-1" />
                  ) : (
                    <EyeOff className="h-4 w-4 inline mr-1" />
                  )}
                </span>
                <Select
                  value={conditions.action}
                  onChange={(e) =>
                    setConditions({
                      ...conditions,
                      action: e.target.value as 'show' | 'hide',
                    })
                  }
                  className="w-24"
                >
                  <option value="show">Show</option>
                  <option value="hide">Hide</option>
                </Select>
                <span className="text-gray-600">this item when</span>
                {conditions.rules.length > 1 && (
                  <Select
                    value={conditions.logic}
                    onChange={(e) =>
                      setConditions({
                        ...conditions,
                        logic: e.target.value as 'AND' | 'OR',
                      })
                    }
                    className="w-20"
                  >
                    <option value="AND">ALL</option>
                    <option value="OR">ANY</option>
                  </Select>
                )}
                {conditions.rules.length > 1 && (
                  <span className="text-gray-600">of these rules match:</span>
                )}
              </div>

              {/* Rules */}
              <div className="space-y-2">
                {conditions.rules.map((rule, index) => {
                  const targetItem = getTargetItem(rule.target_item_id)
                  const operators: ConditionOperator[] = targetItem
                    ? getOperatorsForItemType(targetItem.item_type)
                    : ['equals', 'not_equals', 'is_empty', 'is_not_empty']

                  return (
                    <div
                      key={index}
                      className="flex items-center gap-2 flex-wrap bg-white p-2 rounded border"
                    >
                      <Select
                        value={rule.target_item_id}
                        onChange={(e) =>
                          handleUpdateRule(index, {
                            target_item_id: e.target.value,
                            operator: 'equals',
                            value: undefined,
                          })
                        }
                        className="flex-1 min-w-[150px]"
                      >
                        <option value="">Select item...</option>
                        {availableTargetItems.map((targetItem) => (
                          <option key={targetItem.id} value={targetItem.id}>
                            {targetItem.label}
                          </option>
                        ))}
                      </Select>

                      <Select
                        value={rule.operator}
                        onChange={(e) =>
                          handleUpdateRule(index, {
                            operator: e.target.value as ConditionOperator,
                          })
                        }
                        className="w-36"
                      >
                        {operators.map((op) => (
                          <option key={op} value={op}>
                            {getOperatorLabel(op)}
                          </option>
                        ))}
                      </Select>

                      {renderValueInput(rule, index)}

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteRule(index)}
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* Add Rule Button */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddRule}
              className="text-blue-600 border-blue-300 hover:bg-blue-50"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Rule
            </Button>
            {hasConditions && (
              <Button variant="default" size="sm" onClick={handleSave}>
                Save Conditions
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
