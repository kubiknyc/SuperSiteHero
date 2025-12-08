/**
 * Field Picker Component
 *
 * Allows users to select and reorder fields for their report.
 * Uses drag-and-drop for ordering selected fields.
 */

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  GripVertical,
  Search,
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  X,
} from 'lucide-react'
import type {
  ReportFieldDefinition,
  ReportTemplateFieldInput,
  ReportFieldType,
} from '@/types/report-builder'

interface FieldPickerProps {
  availableFields: ReportFieldDefinition[]
  selectedFields: ReportTemplateFieldInput[]
  onFieldsChange: (fields: ReportTemplateFieldInput[]) => void
  className?: string
}

/**
 * Get field type badge color
 */
function getFieldTypeColor(type: ReportFieldType): string {
  const colors: Record<ReportFieldType, string> = {
    text: 'bg-gray-100 text-gray-800',
    number: 'bg-blue-100 text-blue-800',
    currency: 'bg-green-100 text-green-800',
    date: 'bg-purple-100 text-purple-800',
    datetime: 'bg-purple-100 text-purple-800',
    boolean: 'bg-yellow-100 text-yellow-800',
    status: 'bg-orange-100 text-orange-800',
    user: 'bg-cyan-100 text-cyan-800',
    project: 'bg-indigo-100 text-indigo-800',
    company: 'bg-pink-100 text-pink-800',
  }
  return colors[type] || 'bg-gray-100 text-gray-800'
}

export function FieldPicker({
  availableFields,
  selectedFields,
  onFieldsChange,
  className,
}: FieldPickerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // Group available fields by category
  const groupedFields = useMemo(() => {
    const groups: Record<string, ReportFieldDefinition[]> = {}
    availableFields.forEach((field) => {
      const category = field.category || 'Other'
      if (!groups[category]) groups[category] = []
      groups[category].push(field)
    })
    return groups
  }, [availableFields])

  // Filter fields by search
  const filteredGroups = useMemo(() => {
    if (!searchTerm) return groupedFields
    const term = searchTerm.toLowerCase()
    const filtered: Record<string, ReportFieldDefinition[]> = {}
    Object.entries(groupedFields).forEach(([category, fields]) => {
      const matchingFields = fields.filter(
        (f) =>
          f.display_name.toLowerCase().includes(term) ||
          f.field_name.toLowerCase().includes(term) ||
          f.description?.toLowerCase().includes(term)
      )
      if (matchingFields.length > 0) {
        filtered[category] = matchingFields
      }
    })
    return filtered
  }, [groupedFields, searchTerm])

  // Selected field names set for quick lookup
  const selectedFieldNames = useMemo(
    () => new Set(selectedFields.map((f) => f.field_name)),
    [selectedFields]
  )

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    const next = new Set(expandedCategories)
    if (next.has(category)) {
      next.delete(category)
    } else {
      next.add(category)
    }
    setExpandedCategories(next)
  }

  // Add field to selection
  const addField = (field: ReportFieldDefinition) => {
    if (selectedFieldNames.has(field.field_name)) return

    const newField: ReportTemplateFieldInput = {
      field_name: field.field_name,
      display_name: field.display_name,
      field_type: field.field_type,
      display_order: selectedFields.length,
      is_visible: true,
      aggregation: 'none',
    }
    onFieldsChange([...selectedFields, newField])
  }

  // Remove field from selection
  const removeField = (fieldName: string) => {
    const updated = selectedFields
      .filter((f) => f.field_name !== fieldName)
      .map((f, index) => ({ ...f, display_order: index }))
    onFieldsChange(updated)
  }

  // Toggle field visibility
  const toggleVisibility = (fieldName: string) => {
    const updated = selectedFields.map((f) =>
      f.field_name === fieldName ? { ...f, is_visible: !f.is_visible } : f
    )
    onFieldsChange(updated)
  }

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const updated = [...selectedFields]
    const [draggedItem] = updated.splice(draggedIndex, 1)
    updated.splice(index, 0, draggedItem)

    // Update display order
    updated.forEach((f, i) => (f.display_order = i))
    onFieldsChange(updated)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  // Select all / deselect all
  const selectAll = () => {
    const newFields = availableFields.map((f, index) => ({
      field_name: f.field_name,
      display_name: f.display_name,
      field_type: f.field_type,
      display_order: index,
      is_visible: true,
      aggregation: 'none' as const,
    }))
    onFieldsChange(newFields)
  }

  const deselectAll = () => {
    onFieldsChange([])
  }

  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-2 gap-4', className)}>
      {/* Available Fields */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Available Fields</span>
            <Badge variant="secondary">{availableFields.length}</Badge>
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search fields..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="max-h-[400px] overflow-y-auto">
          {Object.entries(filteredGroups).length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No fields found
            </p>
          ) : (
            <div className="space-y-2">
              {Object.entries(filteredGroups).map(([category, fields]) => (
                <div key={category}>
                  <button
                    type="button"
                    className="flex items-center w-full text-left py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900"
                    onClick={() => toggleCategory(category)}
                  >
                    {expandedCategories.has(category) ? (
                      <ChevronDown className="h-4 w-4 mr-1" />
                    ) : (
                      <ChevronRight className="h-4 w-4 mr-1" />
                    )}
                    {category}
                    <Badge variant="outline" className="ml-2 text-xs">
                      {fields.length}
                    </Badge>
                  </button>
                  {expandedCategories.has(category) && (
                    <div className="ml-5 space-y-1 mt-1">
                      {fields.map((field) => {
                        const isSelected = selectedFieldNames.has(field.field_name)
                        return (
                          <div
                            key={field.field_name}
                            className={cn(
                              'flex items-center gap-2 p-2 rounded-md text-sm cursor-pointer',
                              isSelected
                                ? 'bg-blue-50 border border-blue-200'
                                : 'hover:bg-gray-50 border border-transparent'
                            )}
                            onClick={() =>
                              isSelected
                                ? removeField(field.field_name)
                                : addField(field)
                            }
                          >
                            <Checkbox checked={isSelected} className="pointer-events-none" />
                            <div className="flex-1 min-w-0">
                              <span className="font-medium">{field.display_name}</span>
                              {field.description && (
                                <p className="text-xs text-gray-500 truncate">
                                  {field.description}
                                </p>
                              )}
                            </div>
                            <Badge
                              variant="outline"
                              className={cn('text-xs shrink-0', getFieldTypeColor(field.field_type))}
                            >
                              {field.field_type}
                            </Badge>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Fields */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Selected Fields</span>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{selectedFields.length}</Badge>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={selectAll}
              >
                All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={deselectAll}
              >
                None
              </Button>
            </div>
          </CardTitle>
          <p className="text-xs text-gray-500">
            Drag to reorder columns in your report
          </p>
        </CardHeader>
        <CardContent className="max-h-[400px] overflow-y-auto">
          {selectedFields.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              Click fields on the left to add them to your report
            </p>
          ) : (
            <div className="space-y-1">
              {selectedFields.map((field, index) => (
                <div
                  key={field.field_name}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-md text-sm bg-white border',
                    draggedIndex === index ? 'opacity-50' : '',
                    'hover:border-gray-300 cursor-move'
                  )}
                >
                  <GripVertical className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="text-xs text-gray-400 w-5">{index + 1}</span>
                  <div className="flex-1 min-w-0">
                    <span
                      className={cn(
                        'font-medium',
                        !field.is_visible && 'text-gray-400'
                      )}
                    >
                      {field.display_name}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn('text-xs shrink-0', getFieldTypeColor(field.field_type))}
                  >
                    {field.field_type}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => toggleVisibility(field.field_name)}
                    title={field.is_visible ? 'Hide column' : 'Show column'}
                  >
                    {field.is_visible ? (
                      <Eye className="h-4 w-4 text-gray-500" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                    onClick={() => removeField(field.field_name)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default FieldPicker
