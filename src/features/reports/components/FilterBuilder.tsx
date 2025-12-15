/**
 * Filter Builder Component
 *
 * Allows users to create and manage report filters with:
 * - Add/remove filter rows
 * - Field selector
 * - Operator selector (context-aware based on field type)
 * - Value input (text, number, date)
 * - Relative date options
 * - Filter groups (AND/OR logic)
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Filter, Calendar, Hash, Type, ToggleLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  ReportTemplateFilterInput,
  ReportFilterOperator,
  ReportFieldType,
  FieldDefinition,
} from '@/types/report-builder'

// =============================================
// Types
// =============================================

interface FilterBuilderProps {
  filters: ReportTemplateFilterInput[]
  onFiltersChange: (filters: ReportTemplateFilterInput[]) => void
  availableFields: FieldDefinition[]
  className?: string
}

// =============================================
// Operator Config
// =============================================

interface OperatorConfig {
  value: ReportFilterOperator
  label: string
  fieldTypes: ReportFieldType[]
  requiresValue: boolean
}

const OPERATORS: OperatorConfig[] = [
  { value: 'equals', label: 'Equals', fieldTypes: ['text', 'number', 'currency', 'date', 'datetime', 'boolean', 'status', 'user', 'project', 'company'], requiresValue: true },
  { value: 'not_equals', label: 'Does not equal', fieldTypes: ['text', 'number', 'currency', 'date', 'datetime', 'boolean', 'status', 'user', 'project', 'company'], requiresValue: true },
  { value: 'contains', label: 'Contains', fieldTypes: ['text'], requiresValue: true },
  { value: 'not_contains', label: 'Does not contain', fieldTypes: ['text'], requiresValue: true },
  { value: 'starts_with', label: 'Starts with', fieldTypes: ['text'], requiresValue: true },
  { value: 'ends_with', label: 'Ends with', fieldTypes: ['text'], requiresValue: true },
  { value: 'greater_than', label: 'Greater than', fieldTypes: ['number', 'currency', 'date', 'datetime'], requiresValue: true },
  { value: 'less_than', label: 'Less than', fieldTypes: ['number', 'currency', 'date', 'datetime'], requiresValue: true },
  { value: 'greater_or_equal', label: 'Greater or equal', fieldTypes: ['number', 'currency', 'date', 'datetime'], requiresValue: true },
  { value: 'less_or_equal', label: 'Less or equal', fieldTypes: ['number', 'currency', 'date', 'datetime'], requiresValue: true },
  { value: 'between', label: 'Between', fieldTypes: ['number', 'currency', 'date', 'datetime'], requiresValue: true },
  { value: 'is_null', label: 'Is empty', fieldTypes: ['text', 'number', 'currency', 'date', 'datetime', 'status', 'user', 'project', 'company'], requiresValue: false },
  { value: 'is_not_null', label: 'Is not empty', fieldTypes: ['text', 'number', 'currency', 'date', 'datetime', 'status', 'user', 'project', 'company'], requiresValue: false },
]

// Relative date presets
const RELATIVE_DATE_PRESETS = [
  { label: 'Today', value: 0, unit: 'days' as const },
  { label: 'Last 7 days', value: 7, unit: 'days' as const },
  { label: 'Last 14 days', value: 14, unit: 'days' as const },
  { label: 'Last 30 days', value: 30, unit: 'days' as const },
  { label: 'Last 60 days', value: 60, unit: 'days' as const },
  { label: 'Last 90 days', value: 90, unit: 'days' as const },
  { label: 'This week', value: 1, unit: 'weeks' as const },
  { label: 'Last week', value: 1, unit: 'weeks' as const },
  { label: 'This month', value: 1, unit: 'months' as const },
  { label: 'Last month', value: 1, unit: 'months' as const },
  { label: 'Last 3 months', value: 3, unit: 'months' as const },
  { label: 'Last 6 months', value: 6, unit: 'months' as const },
  { label: 'This year', value: 12, unit: 'months' as const },
]

// =============================================
// Helper Functions
// =============================================

function getOperatorsForFieldType(fieldType: ReportFieldType): OperatorConfig[] {
  return OPERATORS.filter(op => op.fieldTypes.includes(fieldType))
}

function getFieldTypeIcon(fieldType: ReportFieldType) {
  switch (fieldType) {
    case 'date':
    case 'datetime':
      return <Calendar className="h-4 w-4" />
    case 'number':
    case 'currency':
      return <Hash className="h-4 w-4" />
    case 'boolean':
      return <ToggleLeft className="h-4 w-4" />
    default:
      return <Type className="h-4 w-4" />
  }
}

function isDateField(fieldType: ReportFieldType): boolean {
  return fieldType === 'date' || fieldType === 'datetime'
}

// =============================================
// Filter Row Component
// =============================================

interface FilterRowProps {
  filter: ReportTemplateFilterInput
  index: number
  availableFields: FieldDefinition[]
  onUpdate: (index: number, filter: ReportTemplateFilterInput) => void
  onRemove: (index: number) => void
  showGroupSeparator: boolean
  isFirstInGroup: boolean
}

function FilterRow({
  filter,
  index,
  availableFields,
  onUpdate,
  onRemove,
  showGroupSeparator,
  isFirstInGroup,
}: FilterRowProps) {
  const selectedField = availableFields.find(f => f.field_name === filter.field_name)
  const fieldType = selectedField?.field_type || 'text'
  const operators = getOperatorsForFieldType(fieldType)
  const selectedOperator = OPERATORS.find(op => op.value === filter.operator)
  const showDatePresets = isDateField(fieldType) && selectedOperator?.requiresValue

  const handleFieldChange = (fieldName: string) => {
    const field = availableFields.find(f => f.field_name === fieldName)
    const newOperators = field ? getOperatorsForFieldType(field.field_type) : []
    const defaultOperator = newOperators[0]?.value || 'equals'

    onUpdate(index, {
      ...filter,
      field_name: fieldName,
      operator: defaultOperator,
      filter_value: undefined,
      is_relative_date: false,
      relative_date_value: null,
      relative_date_unit: null,
    })
  }

  const handleOperatorChange = (operator: ReportFilterOperator) => {
    const op = OPERATORS.find(o => o.value === operator)
    onUpdate(index, {
      ...filter,
      operator,
      filter_value: op?.requiresValue ? filter.filter_value : undefined,
    })
  }

  const handleValueChange = (value: string) => {
    onUpdate(index, {
      ...filter,
      filter_value: value,
      is_relative_date: false,
      relative_date_value: null,
      relative_date_unit: null,
    })
  }

  const handleRelativeDateChange = (preset: typeof RELATIVE_DATE_PRESETS[0]) => {
    onUpdate(index, {
      ...filter,
      is_relative_date: true,
      relative_date_value: preset.value,
      relative_date_unit: preset.unit,
      filter_value: `Last ${preset.value} ${preset.unit}`,
    })
  }

  const handleToggleRelativeDate = (isRelative: boolean) => {
    if (isRelative) {
      // Switch to relative date mode with default "Last 30 days"
      onUpdate(index, {
        ...filter,
        is_relative_date: true,
        relative_date_value: 30,
        relative_date_unit: 'days',
        filter_value: 'Last 30 days',
      })
    } else {
      // Switch to absolute date mode
      onUpdate(index, {
        ...filter,
        is_relative_date: false,
        relative_date_value: null,
        relative_date_unit: null,
        filter_value: '',
      })
    }
  }

  return (
    <div className="space-y-2">
      {/* Group separator (AND) */}
      {showGroupSeparator && !isFirstInGroup && (
        <div className="flex items-center gap-2 py-1">
          <div className="flex-1 h-px bg-gray-200" />
          <Badge variant="secondary" className="text-xs">AND</Badge>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
      )}

      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
        {/* Row number */}
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
          {index + 1}
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
          {/* Field selector */}
          <div className="md:col-span-4">
            <Label className="text-xs text-gray-500 mb-1 block">Field</Label>
            <Select value={filter.field_name} onValueChange={handleFieldChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select field..." />
              </SelectTrigger>
              <SelectContent>
                {availableFields.map((field) => (
                  <SelectItem key={field.field_name} value={field.field_name}>
                    <span className="flex items-center gap-2">
                      {getFieldTypeIcon(field.field_type)}
                      {field.display_name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Operator selector */}
          <div className="md:col-span-3">
            <Label className="text-xs text-gray-500 mb-1 block">Condition</Label>
            <Select
              value={filter.operator}
              onValueChange={(v) => handleOperatorChange(v as ReportFilterOperator)}
              disabled={!filter.field_name}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {operators.map((op) => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Value input */}
          {selectedOperator?.requiresValue && (
            <div className="md:col-span-4">
              <Label className="text-xs text-gray-500 mb-1 block">Value</Label>

              {showDatePresets ? (
                <div className="space-y-2">
                  {/* Toggle between relative and absolute */}
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={filter.is_relative_date || false}
                      onCheckedChange={handleToggleRelativeDate}
                      id={`relative-${index}`}
                    />
                    <Label htmlFor={`relative-${index}`} className="text-xs">
                      Relative date
                    </Label>
                  </div>

                  {filter.is_relative_date ? (
                    <Select
                      value={`${filter.relative_date_value}-${filter.relative_date_unit}`}
                      onValueChange={(v) => {
                        const preset = RELATIVE_DATE_PRESETS.find(
                          p => `${p.value}-${p.unit}` === v
                        )
                        if (preset) {handleRelativeDateChange(preset)}
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RELATIVE_DATE_PRESETS.map((preset) => (
                          <SelectItem
                            key={`${preset.value}-${preset.unit}`}
                            value={`${preset.value}-${preset.unit}`}
                          >
                            {preset.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type="date"
                      value={typeof filter.filter_value === 'string' ? filter.filter_value : ''}
                      onChange={(e) => handleValueChange(e.target.value)}
                    />
                  )}
                </div>
              ) : fieldType === 'boolean' ? (
                <Select
                  value={String(filter.filter_value)}
                  onValueChange={(v) =>
                    onUpdate(index, { ...filter, filter_value: v === 'true' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              ) : fieldType === 'number' || fieldType === 'currency' ? (
                <Input
                  type="number"
                  value={typeof filter.filter_value === 'number' ? filter.filter_value : ''}
                  onChange={(e) => onUpdate(index, { ...filter, filter_value: parseFloat(e.target.value) || 0 })}
                  placeholder="Enter value..."
                />
              ) : (
                <Input
                  type="text"
                  value={typeof filter.filter_value === 'string' ? filter.filter_value : ''}
                  onChange={(e) => handleValueChange(e.target.value)}
                  placeholder="Enter value..."
                />
              )}
            </div>
          )}
        </div>

        {/* Remove button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(index)}
          className="flex-shrink-0 text-gray-400 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// =============================================
// Main Component
// =============================================

export function FilterBuilder({
  filters,
  onFiltersChange,
  availableFields,
  className,
}: FilterBuilderProps) {
  // Track which filter group we're in (for AND/OR display)
  const [showGroupHint, setShowGroupHint] = useState(false)

  const handleAddFilter = () => {
    const defaultField = availableFields[0]
    const defaultOperator = defaultField
      ? getOperatorsForFieldType(defaultField.field_type)[0]?.value || 'equals'
      : 'equals'

    const newFilter: ReportTemplateFilterInput = {
      field_name: defaultField?.field_name || '',
      operator: defaultOperator,
      filter_value: undefined,
      is_relative_date: false,
      relative_date_value: null,
      relative_date_unit: null,
      filter_group: 0, // All in same group = AND logic
      display_order: filters.length,
    }

    onFiltersChange([...filters, newFilter])
  }

  const handleUpdateFilter = (index: number, updatedFilter: ReportTemplateFilterInput) => {
    const newFilters = [...filters]
    newFilters[index] = updatedFilter
    onFiltersChange(newFilters)
  }

  const handleRemoveFilter = (index: number) => {
    onFiltersChange(filters.filter((_, i) => i !== index))
  }

  const handleClearAll = () => {
    onFiltersChange([])
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter Data
            </CardTitle>
            <CardDescription>
              Add conditions to narrow down the data in your report
            </CardDescription>
          </div>
          {filters.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClearAll}>
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filter rows */}
        {filters.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
            <Filter className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">
              No filters applied. All data will be included in the report.
            </p>
            <Button onClick={handleAddFilter}>
              <Plus className="h-4 w-4 mr-2" />
              Add Filter
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {filters.map((filter, index) => (
              <FilterRow
                key={index}
                filter={filter}
                index={index}
                availableFields={availableFields}
                onUpdate={handleUpdateFilter}
                onRemove={handleRemoveFilter}
                showGroupSeparator={filters.length > 1}
                isFirstInGroup={index === 0 || filter.filter_group !== filters[index - 1]?.filter_group}
              />
            ))}

            {/* Add filter button */}
            <Button variant="outline" onClick={handleAddFilter} className="w-full mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Add Filter
            </Button>
          </div>
        )}

        {/* Help text */}
        {filters.length > 1 && (
          <p className="text-xs text-gray-500 mt-4">
            Multiple filters are combined using AND logic. All conditions must be met.
          </p>
        )}

        {/* Filter summary */}
        {filters.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700 font-medium">
              {filters.length} filter{filters.length !== 1 ? 's' : ''} applied
            </p>
            <p className="text-xs text-blue-600 mt-1">
              {filters
                .filter(f => f.field_name)
                .map(f => {
                  const field = availableFields.find(af => af.field_name === f.field_name)
                  const op = OPERATORS.find(o => o.value === f.operator)
                  return `${field?.display_name || f.field_name} ${op?.label.toLowerCase() || f.operator}`
                })
                .join(', ')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default FilterBuilder
