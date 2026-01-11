/**
 * Conditional Logic Builder Component
 *
 * UI for configuring conditional visibility rules on checklist items.
 * Allows building complex branching logic with AND/OR conditions.
 */

import { useState, useMemo } from 'react'
import {
  GitBranch,
  Plus,
  Trash2,
  ChevronDown,
  AlertCircle,
  Eye,
  EyeOff,
  Info,
  Check,
  X,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
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

// ============================================================================
// Types
// ============================================================================

interface ConditionalLogicBuilderProps {
  currentItem: ChecklistTemplateItem
  allItems: ChecklistTemplateItem[]
  conditions: ItemConditions | null
  onChange: (conditions: ItemConditions | null) => void
  disabled?: boolean
}

interface ConditionRuleRowProps {
  rule: ItemConditionRule
  index: number
  availableItems: ChecklistTemplateItem[]
  onUpdate: (rule: ItemConditionRule) => void
  onRemove: () => void
  disabled?: boolean
}

// ============================================================================
// Helper Functions
// ============================================================================

function getDefaultValue(itemType: string): string | number | null {
  switch (itemType) {
    case 'checkbox':
      return 'pass'
    case 'number':
      return 0
    case 'text':
      return ''
    default:
      return null
  }
}

function needsValueInput(operator: ConditionOperator): boolean {
  return !['is_empty', 'is_not_empty'].includes(operator)
}

// ============================================================================
// Sub-Components
// ============================================================================

function ConditionRuleRow({
  rule,
  index,
  availableItems,
  onUpdate,
  onRemove,
  disabled,
}: ConditionRuleRowProps) {
  const targetItem = availableItems.find((i) => i.id === rule.target_item_id)
  const operators = targetItem
    ? getOperatorsForItemType(targetItem.item_type)
    : []
  const checkboxValues = getCheckboxConditionValues()

  const handleTargetChange = (targetItemId: string) => {
    const newTarget = availableItems.find((i) => i.id === targetItemId)
    const newOperators = newTarget
      ? getOperatorsForItemType(newTarget.item_type)
      : []
    const newOperator = newOperators[0] || 'equals'

    onUpdate({
      ...rule,
      target_item_id: targetItemId,
      operator: newOperator,
      value: getDefaultValue(newTarget?.item_type || 'text'),
    })
  }

  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border">
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
        {/* Target Item Selector */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">When item</Label>
          <Select
            value={rule.target_item_id}
            onChange={(e) => handleTargetChange(e.target.value)}
            disabled={disabled}
            className="text-sm"
          >
            <option value="">Select item...</option>
            {availableItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </Select>
        </div>

        {/* Operator Selector */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Condition</Label>
          <Select
            value={rule.operator}
            onChange={(e) =>
              onUpdate({
                ...rule,
                operator: e.target.value as ConditionOperator,
              })
            }
            disabled={disabled || !targetItem}
            className="text-sm"
          >
            {operators.map((op) => (
              <option key={op} value={op}>
                {getOperatorLabel(op)}
              </option>
            ))}
          </Select>
        </div>

        {/* Value Input */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Value</Label>
          {needsValueInput(rule.operator) ? (
            targetItem?.item_type === 'checkbox' ? (
              <Select
                value={String(rule.value || '')}
                onChange={(e) =>
                  onUpdate({ ...rule, value: e.target.value })
                }
                disabled={disabled}
                className="text-sm"
              >
                {checkboxValues.map((cv) => (
                  <option key={cv.value} value={cv.value}>
                    {cv.label}
                  </option>
                ))}
              </Select>
            ) : targetItem?.item_type === 'number' ? (
              <Input
                type="number"
                value={rule.value as number || 0}
                onChange={(e) =>
                  onUpdate({ ...rule, value: parseFloat(e.target.value) || 0 })
                }
                disabled={disabled}
                className="text-sm"
              />
            ) : (
              <Input
                type="text"
                value={String(rule.value || '')}
                onChange={(e) =>
                  onUpdate({ ...rule, value: e.target.value })
                }
                disabled={disabled}
                placeholder="Enter value..."
                className="text-sm"
              />
            )
          ) : (
            <div className="h-9 flex items-center text-sm text-muted-foreground">
              (no value needed)
            </div>
          )}
        </div>
      </div>

      {/* Remove Button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 mt-6"
        onClick={onRemove}
        disabled={disabled}
      >
        <Trash2 className="h-4 w-4 text-error" />
      </Button>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function ConditionalLogicBuilder({
  currentItem,
  allItems,
  conditions,
  onChange,
  disabled = false,
}: ConditionalLogicBuilderProps) {
  const [isExpanded, setIsExpanded] = useState(!!conditions)

  // Get available items (exclude current item and items that depend on current)
  const availableItems = useMemo(() => {
    return allItems.filter((item) => {
      // Exclude self
      if (item.id === currentItem.id) {return false}

      // Exclude items that come after in sort order (prevent circular)
      if (item.sort_order > currentItem.sort_order) {return false}

      return true
    })
  }, [allItems, currentItem])

  // Initialize conditions if needed
  const handleEnable = () => {
    setIsExpanded(true)
    if (!conditions) {
      onChange({
        logic: 'AND',
        rules: [],
        action: 'show',
      })
    }
  }

  const handleDisable = () => {
    setIsExpanded(false)
    onChange(null)
  }

  const handleAddRule = () => {
    if (!conditions) {return}

    const defaultTarget = availableItems[0]
    const newRule: ItemConditionRule = {
      target_item_id: defaultTarget?.id || '',
      operator: 'equals',
      value: getDefaultValue(defaultTarget?.item_type || 'text'),
    }

    onChange({
      ...conditions,
      rules: [...conditions.rules, newRule],
    })
  }

  const handleUpdateRule = (index: number, rule: ItemConditionRule) => {
    if (!conditions) {return}

    const newRules = [...conditions.rules]
    newRules[index] = rule

    onChange({
      ...conditions,
      rules: newRules,
    })
  }

  const handleRemoveRule = (index: number) => {
    if (!conditions) {return}

    const newRules = conditions.rules.filter((_, i) => i !== index)

    if (newRules.length === 0) {
      // No rules left, disable conditional logic
      handleDisable()
    } else {
      onChange({
        ...conditions,
        rules: newRules,
      })
    }
  }

  // Validate current configuration
  const validationErrors = useMemo(() => {
    if (!conditions) {return []}

    const errors: string[] = []

    if (conditions.rules.length === 0) {
      errors.push('Add at least one condition')
    }

    for (let i = 0; i < conditions.rules.length; i++) {
      const rule = conditions.rules[i]
      if (!rule.target_item_id) {
        errors.push(`Rule ${i + 1}: Select a target item`)
      }
    }

    return errors
  }, [conditions])

  if (!isExpanded && !conditions) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <GitBranch className="h-4 w-4" />
              <span className="text-sm">No conditional logic</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleEnable}
              disabled={disabled || availableItems.length === 0}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Add Condition
            </Button>
          </div>
          {availableItems.length === 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              No items available for conditions. Add items before this one first.
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <GitBranch className="h-5 w-5 text-primary" />
              Conditional Visibility
            </CardTitle>
            <CardDescription>
              Show or hide this item based on responses to other items
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDisable}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Action Selection */}
        <div className="flex items-center gap-4 p-3 rounded-lg border bg-background">
          <Label className="text-sm font-medium">Action:</Label>
          <RadioGroup
            value={conditions?.action || 'show'}
            onValueChange={(value) =>
              conditions &&
              onChange({ ...conditions, action: value as 'show' | 'hide' })
            }
            disabled={disabled}
            className="flex gap-4"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="show" id="action-show" />
              <Label htmlFor="action-show" className="flex items-center gap-1 cursor-pointer">
                <Eye className="h-4 w-4 text-green-600" />
                Show
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="hide" id="action-hide" />
              <Label htmlFor="action-hide" className="flex items-center gap-1 cursor-pointer">
                <EyeOff className="h-4 w-4 text-red-600" />
                Hide
              </Label>
            </div>
          </RadioGroup>
          <span className="text-sm text-muted-foreground">
            when conditions are met
          </span>
        </div>

        {/* Logic Selection */}
        {conditions && conditions.rules.length > 1 && (
          <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
            <Label className="text-sm">Combine rules with:</Label>
            <RadioGroup
              value={conditions.logic}
              onValueChange={(value) =>
                onChange({ ...conditions, logic: value as 'AND' | 'OR' })
              }
              disabled={disabled}
              className="flex gap-3"
            >
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="AND" id="logic-and" />
                <Label htmlFor="logic-and" className="cursor-pointer">
                  <Badge variant="outline" className="font-mono">AND</Badge>
                  <span className="text-xs text-muted-foreground ml-1">(all must match)</span>
                </Label>
              </div>
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="OR" id="logic-or" />
                <Label htmlFor="logic-or" className="cursor-pointer">
                  <Badge variant="outline" className="font-mono">OR</Badge>
                  <span className="text-xs text-muted-foreground ml-1">(any can match)</span>
                </Label>
              </div>
            </RadioGroup>
          </div>
        )}

        {/* Condition Rules */}
        <div className="space-y-2">
          {conditions?.rules.map((rule, index) => (
            <ConditionRuleRow
              key={index}
              rule={rule}
              index={index}
              availableItems={availableItems}
              onUpdate={(updatedRule) => handleUpdateRule(index, updatedRule)}
              onRemove={() => handleRemoveRule(index)}
              disabled={disabled}
            />
          ))}
        </div>

        {/* Add Rule Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddRule}
          disabled={disabled}
          className="w-full gap-1"
        >
          <Plus className="h-4 w-4" />
          Add Condition Rule
        </Button>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside text-sm">
                {validationErrors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Preview */}
        {conditions && conditions.rules.length > 0 && validationErrors.length === 0 && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Info className="h-4 w-4" />
              Logic Preview
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              This item will be{' '}
              <strong>{conditions.action === 'show' ? 'shown' : 'hidden'}</strong>
              {' '}when{' '}
              {conditions.logic === 'AND' ? (
                <span>
                  <em>all</em> of the following conditions are met
                </span>
              ) : (
                <span>
                  <em>any</em> of the following conditions are met
                </span>
              )}
              .
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ConditionalLogicBuilder
