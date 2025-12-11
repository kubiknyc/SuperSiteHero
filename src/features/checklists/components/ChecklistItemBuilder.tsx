// File: /src/features/checklists/components/ChecklistItemBuilder.tsx
// Checklist item builder with drag-and-drop reordering

import { useState } from 'react'
import { GripVertical, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ItemConditionEditor } from './ItemConditionEditor'
import type {
  ChecklistTemplateItem,
  ChecklistItemType,
  CreateChecklistTemplateItemDTO,
  CheckboxItemConfig,
  TextItemConfig,
  NumberItemConfig,
  PhotoItemConfig,
  SignatureItemConfig,
} from '@/types/checklists'

interface ChecklistItemBuilderProps {
  items: ChecklistTemplateItem[]
  onItemsChange: (items: ChecklistTemplateItem[]) => void
  onAddItem: (item: Omit<CreateChecklistTemplateItemDTO, 'checklist_template_id' | 'sort_order'>) => void
  onUpdateItem: (itemId: string, updates: Partial<ChecklistTemplateItem>) => void
  onDeleteItem: (itemId: string) => void
  onReorderItems: (items: ChecklistTemplateItem[]) => void
}

const ITEM_TYPES: { value: ChecklistItemType; label: string }[] = [
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'text', label: 'Text Input' },
  { value: 'number', label: 'Number Input' },
  { value: 'photo', label: 'Photo Upload' },
  { value: 'signature', label: 'Signature' },
]

export function ChecklistItemBuilder({
  items,
  onItemsChange,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onReorderItems,
}: ChecklistItemBuilderProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [newItem, setNewItem] = useState<{
    label: string
    item_type: ChecklistItemType
    section?: string
    is_required: boolean
    config: Record<string, any>
  }>({
    label: '',
    item_type: 'checkbox',
    is_required: false,
    config: {},
  })

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) {return}

    const newItems = [...items]
    const draggedItem = newItems[draggedIndex]
    newItems.splice(draggedIndex, 1)
    newItems.splice(index, 0, draggedItem)

    // Update sort_order for all items
    const reorderedItems = newItems.map((item, idx) => ({
      ...item,
      sort_order: idx,
    }))

    onItemsChange(reorderedItems)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    if (draggedIndex !== null) {
      onReorderItems(items)
    }
    setDraggedIndex(null)
  }

  const handleAddItem = () => {
    if (!newItem.label.trim()) {return}

    onAddItem({
      label: newItem.label,
      item_type: newItem.item_type,
      section: newItem.section || undefined,
      is_required: newItem.is_required,
      config: newItem.config,
    })

    // Reset form
    setNewItem({
      label: '',
      item_type: 'checkbox',
      is_required: false,
      config: {},
    })
  }

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedItems(newExpanded)
  }

  const getItemTypeIcon = (type: ChecklistItemType) => {
    switch (type) {
      case 'checkbox':
        return '☑'
      case 'text':
        return '📝'
      case 'number':
        return '🔢'
      case 'photo':
        return '📷'
      case 'signature':
        return '✍️'
      default:
        return '📋'
    }
  }

  const renderItemConfig = (item: ChecklistTemplateItem) => {
    switch (item.item_type) {
      case 'checkbox':
        const checkboxConfig = item.config as CheckboxItemConfig
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id={`${item.id}-default`}
                checked={checkboxConfig.default_value === 'pass'}
                onCheckedChange={(checked) =>
                  onUpdateItem(item.id, {
                    config: { ...checkboxConfig, default_value: checked ? 'pass' : null },
                  })
                }
              />
              <Label htmlFor={`${item.id}-default`}>Default checked</Label>
            </div>
          </div>
        )

      case 'text':
        const textConfig = item.config as TextItemConfig
        return (
          <div className="space-y-2">
            <div>
              <Label htmlFor={`${item.id}-placeholder`}>Placeholder</Label>
              <Input
                id={`${item.id}-placeholder`}
                value={textConfig.placeholder || ''}
                onChange={(e) =>
                  onUpdateItem(item.id, {
                    config: { ...textConfig, placeholder: e.target.value },
                  })
                }
                placeholder="Enter placeholder text"
              />
            </div>
            <div>
              <Label htmlFor={`${item.id}-maxlength`}>Max Length</Label>
              <Input
                id={`${item.id}-maxlength`}
                type="number"
                value={textConfig.max_length || ''}
                onChange={(e) =>
                  onUpdateItem(item.id, {
                    config: {
                      ...textConfig,
                      max_length: e.target.value ? parseInt(e.target.value) : undefined,
                    },
                  })
                }
                placeholder="No limit"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id={`${item.id}-multiline`}
                checked={textConfig.multiline || false}
                onCheckedChange={(checked) =>
                  onUpdateItem(item.id, {
                    config: { ...textConfig, multiline: checked as boolean },
                  })
                }
              />
              <Label htmlFor={`${item.id}-multiline`}>Multiline (textarea)</Label>
            </div>
          </div>
        )

      case 'number':
        const numberConfig = item.config as NumberItemConfig
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor={`${item.id}-min`}>Min Value</Label>
                <Input
                  id={`${item.id}-min`}
                  type="number"
                  value={numberConfig.min ?? ''}
                  onChange={(e) =>
                    onUpdateItem(item.id, {
                      config: {
                        ...numberConfig,
                        min: e.target.value ? parseFloat(e.target.value) : undefined,
                      },
                    })
                  }
                  placeholder="No minimum"
                />
              </div>
              <div>
                <Label htmlFor={`${item.id}-max`}>Max Value</Label>
                <Input
                  id={`${item.id}-max`}
                  type="number"
                  value={numberConfig.max ?? ''}
                  onChange={(e) =>
                    onUpdateItem(item.id, {
                      config: {
                        ...numberConfig,
                        max: e.target.value ? parseFloat(e.target.value) : undefined,
                      },
                    })
                  }
                  placeholder="No maximum"
                />
              </div>
            </div>
            <div>
              <Label htmlFor={`${item.id}-units`}>Units</Label>
              <Input
                id={`${item.id}-units`}
                value={numberConfig.units || ''}
                onChange={(e) =>
                  onUpdateItem(item.id, {
                    config: { ...numberConfig, units: e.target.value },
                  })
                }
                placeholder="e.g., ft, lbs, psi"
              />
            </div>
            <div>
              <Label htmlFor={`${item.id}-decimals`}>Decimal Places</Label>
              <Input
                id={`${item.id}-decimals`}
                type="number"
                min="0"
                max="10"
                value={numberConfig.decimal_places ?? ''}
                onChange={(e) =>
                  onUpdateItem(item.id, {
                    config: {
                      ...numberConfig,
                      decimal_places: e.target.value ? parseInt(e.target.value) : undefined,
                    },
                  })
                }
                placeholder="2"
              />
            </div>
          </div>
        )

      case 'photo':
        const photoConfig = item.config as PhotoItemConfig
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor={`${item.id}-minphotos`}>Min Photos</Label>
                <Input
                  id={`${item.id}-minphotos`}
                  type="number"
                  min="0"
                  value={photoConfig.min_photos || 0}
                  onChange={(e) =>
                    onUpdateItem(item.id, {
                      config: {
                        ...photoConfig,
                        min_photos: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor={`${item.id}-maxphotos`}>Max Photos</Label>
                <Input
                  id={`${item.id}-maxphotos`}
                  type="number"
                  min="1"
                  value={photoConfig.max_photos || 10}
                  onChange={(e) =>
                    onUpdateItem(item.id, {
                      config: {
                        ...photoConfig,
                        max_photos: parseInt(e.target.value) || 10,
                      },
                    })
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id={`${item.id}-requiredfail`}
                checked={photoConfig.required_if_fail || false}
                onCheckedChange={(checked) =>
                  onUpdateItem(item.id, {
                    config: { ...photoConfig, required_if_fail: checked as boolean },
                  })
                }
              />
              <Label htmlFor={`${item.id}-requiredfail`}>Required if item fails</Label>
            </div>
          </div>
        )

      case 'signature':
        const signatureConfig = item.config as SignatureItemConfig
        return (
          <div className="space-y-2">
            <div>
              <Label htmlFor={`${item.id}-signerrole`}>Signer Role</Label>
              <Input
                id={`${item.id}-signerrole`}
                value={signatureConfig.role || ''}
                onChange={(e) =>
                  onUpdateItem(item.id, {
                    config: { ...signatureConfig, role: e.target.value },
                  })
                }
                placeholder="e.g., Inspector, Supervisor"
              />
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      {/* Existing Items */}
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
            <p>No items yet. Add your first checklist item below.</p>
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`border rounded-lg bg-white ${
                draggedIndex === index ? 'opacity-50' : ''
              }`}
            >
              <div className="p-3 flex items-center gap-3">
                <div className="cursor-move text-gray-400">
                  <GripVertical className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getItemTypeIcon(item.item_type)}</span>
                    <Input
                      value={item.label}
                      onChange={(e) => onUpdateItem(item.id, { label: e.target.value })}
                      className="font-medium"
                      placeholder="Item label"
                    />
                    {item.is_required && (
                      <span className="text-red-500 text-sm">*</span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpanded(item.id)}
                >
                  {expandedItems.has(item.id) ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteItem(item.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {expandedItems.has(item.id) && (
                <div className="px-3 pb-3 pt-0 space-y-3 border-t bg-gray-50">
                  <div className="grid grid-cols-2 gap-3 pt-3">
                    <div>
                      <Label htmlFor={`${item.id}-section`}>Section (optional)</Label>
                      <Input
                        id={`${item.id}-section`}
                        value={item.section || ''}
                        onChange={(e) =>
                          onUpdateItem(item.id, { section: e.target.value || undefined })
                        }
                        placeholder="e.g., Foundation, Framing"
                      />
                    </div>
                    <div className="flex items-end">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`${item.id}-required`}
                          checked={item.is_required}
                          onCheckedChange={(checked) =>
                            onUpdateItem(item.id, { is_required: checked as boolean })
                          }
                        />
                        <Label htmlFor={`${item.id}-required`}>Required</Label>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">
                      {ITEM_TYPES.find((t) => t.value === item.item_type)?.label} Settings
                    </Label>
                    <div className="mt-2">{renderItemConfig(item)}</div>
                  </div>

                  {/* Conditional Visibility */}
                  <ItemConditionEditor
                    item={item}
                    allItems={items}
                    onUpdateConditions={(conditions) =>
                      onUpdateItem(item.id, { conditions })
                    }
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add New Item Form */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Add New Item
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="new-item-label">Label *</Label>
            <Input
              id="new-item-label"
              value={newItem.label}
              onChange={(e) => setNewItem({ ...newItem, label: e.target.value })}
              placeholder="e.g., Check rebar spacing"
            />
          </div>
          <div>
            <Label htmlFor="new-item-type">Type *</Label>
            <Select
              id="new-item-type"
              value={newItem.item_type}
              onChange={(e) =>
                setNewItem({
                  ...newItem,
                  item_type: e.target.value as ChecklistItemType,
                  config: {},
                })
              }
            >
              {ITEM_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="new-item-section">Section (optional)</Label>
            <Input
              id="new-item-section"
              value={newItem.section || ''}
              onChange={(e) => setNewItem({ ...newItem, section: e.target.value })}
              placeholder="e.g., Foundation"
            />
          </div>
          <div className="flex items-end">
            <div className="flex items-center gap-2">
              <Checkbox
                id="new-item-required"
                checked={newItem.is_required}
                onCheckedChange={(checked) =>
                  setNewItem({ ...newItem, is_required: checked as boolean })
                }
              />
              <Label htmlFor="new-item-required">Required</Label>
            </div>
          </div>
        </div>
        <div className="mt-3">
          <Button onClick={handleAddItem} disabled={!newItem.label.trim()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>
    </div>
  )
}
