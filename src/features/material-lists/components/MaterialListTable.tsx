// File: /src/features/material-lists/components/MaterialListTable.tsx
// Editable table for material list items with waste factors

import { useState, useMemo, useCallback } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import {
  Button,
  Input,
  Badge,
  Checkbox,
  NativeSelect,
  Skeleton,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui'
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  ChevronUp,
  ChevronDown,
  Download,
  Percent,
  Package,
  AlertTriangle,
  Calculator,
  Save,
  Undo,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MaterialList, MaterialListItem } from '@/types/drawing-sheets'

interface MaterialListTableProps {
  materialList: MaterialList
  onUpdateItems?: (items: MaterialListItem[]) => void
  onUpdateWasteFactors?: (wasteFactors: Record<string, number>) => void
  onExport?: (format: 'pdf' | 'excel' | 'csv') => void
  readOnly?: boolean
  isLoading?: boolean
  className?: string
}

type SortColumn = 'name' | 'quantity' | 'category' | 'order_quantity'
type SortDirection = 'asc' | 'desc'

interface EditingState {
  itemId: string | null
  field: keyof MaterialListItem | null
}

// Common units for materials
const UNIT_OPTIONS = [
  'EA', 'LF', 'SF', 'CY', 'GAL', 'LB', 'TON', 'BOX', 'BAG', 'ROLL', 'SHEET', 'SET', 'PAIR',
]

// Common material categories
const CATEGORY_OPTIONS = [
  'Electrical', 'Plumbing', 'HVAC', 'Structural', 'Finishes', 'Hardware', 'Equipment', 'Other',
]

/**
 * MaterialListTable Component
 *
 * Editable table for managing material list items with:
 * - Inline editing of quantities, units, waste factors
 * - Automatic order quantity calculations
 * - Sorting and filtering
 * - Category grouping
 * - Export options
 */
export function MaterialListTable({
  materialList,
  onUpdateItems,
  onUpdateWasteFactors,
  onExport,
  readOnly = false,
  isLoading = false,
  className,
}: MaterialListTableProps) {
  // State
  const [sortColumn, setSortColumn] = useState<SortColumn>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [editingState, setEditingState] = useState<EditingState>({
    itemId: null,
    field: null,
  })
  const [editValue, setEditValue] = useState('')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [showWasteFactors, setShowWasteFactors] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [localItems, setLocalItems] = useState<MaterialListItem[]>(materialList.items)

  // Sort items
  const sortedItems = useMemo(() => {
    const items = [...localItems]

    items.sort((a, b) => {
      let comparison = 0

      switch (sortColumn) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'quantity':
          comparison = a.quantity - b.quantity
          break
        case 'category':
          comparison = (a.category || '').localeCompare(b.category || '')
          break
        case 'order_quantity':
          comparison = a.order_quantity - b.order_quantity
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return items
  }, [localItems, sortColumn, sortDirection])

  // Group by category
  const groupedItems = useMemo(() => {
    const groups = new Map<string, MaterialListItem[]>()

    for (const item of sortedItems) {
      const category = item.category || 'Uncategorized'
      const existing = groups.get(category) || []
      existing.push(item)
      groups.set(category, existing)
    }

    return groups
  }, [sortedItems])

  // Calculate totals
  const totals = useMemo(() => {
    const totalItems = localItems.reduce((sum, item) => sum + item.quantity, 0)
    const totalOrderQuantity = localItems.reduce((sum, item) => sum + item.order_quantity, 0)
    const lineItems = localItems.length

    return { totalItems, totalOrderQuantity, lineItems }
  }, [localItems])

  // Handle sort
  const handleSort = useCallback((column: SortColumn) => {
    setSortColumn((prev) => {
      if (prev === column) {
        setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
        return column
      }
      setSortDirection('asc')
      return column
    })
  }, [])

  // Handle edit start
  const startEditing = useCallback((itemId: string, field: keyof MaterialListItem, currentValue: string | number) => {
    if (readOnly) {return}
    setEditingState({ itemId, field })
    setEditValue(String(currentValue))
  }, [readOnly])

  // Handle edit save
  const saveEdit = useCallback(() => {
    if (!editingState.itemId || !editingState.field) {return}

    setLocalItems((prev) =>
      prev.map((item) => {
        if (item.id !== editingState.itemId) {return item}

        const updated = { ...item }
        const field = editingState.field!

        if (field === 'quantity' || field === 'waste_factor') {
          const numValue = parseFloat(editValue) || 0
          ;(updated as any)[field] = numValue

          // Recalculate order quantity
          updated.order_quantity = Math.ceil(updated.quantity * (1 + updated.waste_factor))
        } else if (field === 'name' || field === 'unit' || field === 'category') {
          ;(updated as any)[field] = editValue
        }

        return updated
      })
    )

    setEditingState({ itemId: null, field: null })
    setEditValue('')
    setHasChanges(true)
  }, [editingState, editValue])

  // Handle edit cancel
  const cancelEdit = useCallback(() => {
    setEditingState({ itemId: null, field: null })
    setEditValue('')
  }, [])

  // Handle key press in edit
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        saveEdit()
      } else if (e.key === 'Escape') {
        cancelEdit()
      }
    },
    [saveEdit, cancelEdit]
  )

  // Handle item selection
  const toggleItemSelection = useCallback((itemId: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }, [])

  // Select all items
  const selectAll = useCallback(() => {
    setSelectedItems(new Set(localItems.map((item) => item.id)))
  }, [localItems])

  // Deselect all
  const deselectAll = useCallback(() => {
    setSelectedItems(new Set())
  }, [])

  // Delete selected items
  const deleteSelected = useCallback(() => {
    if (readOnly || selectedItems.size === 0) {return}

    setLocalItems((prev) => prev.filter((item) => !selectedItems.has(item.id)))
    setSelectedItems(new Set())
    setHasChanges(true)
  }, [readOnly, selectedItems])

  // Add new item
  const addItem = useCallback(() => {
    if (readOnly) {return}

    const newItem: MaterialListItem = {
      id: `item-${Date.now()}`,
      name: 'New Item',
      quantity: 1,
      unit: 'EA',
      waste_factor: 0.1,
      order_quantity: 2,
      category: null,
      source_takeoff_items: [],
    }

    setLocalItems((prev) => [...prev, newItem])
    setHasChanges(true)

    // Start editing the name immediately
    setTimeout(() => {
      startEditing(newItem.id, 'name', newItem.name)
    }, 100)
  }, [readOnly, startEditing])

  // Save changes
  const saveChanges = useCallback(() => {
    onUpdateItems?.(localItems)
    setHasChanges(false)
  }, [localItems, onUpdateItems])

  // Revert changes
  const revertChanges = useCallback(() => {
    setLocalItems(materialList.items)
    setHasChanges(false)
  }, [materialList.items])

  // Update global waste factor for a category
  const updateCategoryWasteFactor = useCallback(
    (category: string, factor: number) => {
      if (readOnly) {return}

      setLocalItems((prev) =>
        prev.map((item) => {
          if ((item.category || 'Uncategorized') !== category) {return item}

          const updated = { ...item, waste_factor: factor }
          updated.order_quantity = Math.ceil(updated.quantity * (1 + factor))
          return updated
        })
      )

      onUpdateWasteFactors?.({
        ...materialList.waste_factors,
        [category]: factor,
      })

      setHasChanges(true)
    },
    [readOnly, materialList.waste_factors, onUpdateWasteFactors]
  )

  // Get sort indicator - using render function instead of component to avoid recreating during render
  const renderSortIndicator = (column: SortColumn) => {
    if (sortColumn !== column) {
      return null
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-3 w-3 inline ml-1" />
    ) : (
      <ChevronDown className="h-3 w-3 inline ml-1" />
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {materialList.name}
            </CardTitle>
            <CardDescription>
              {materialList.description || 'Material procurement list'}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline">{materialList.status}</Badge>

            {hasChanges && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Unsaved
              </Badge>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            {!readOnly && (
              <>
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>

                {selectedItems.size > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={deleteSelected}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete ({selectedItems.size})
                  </Button>
                )}
              </>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowWasteFactors(!showWasteFactors)}
            >
              <Percent className="h-4 w-4 mr-1" />
              {showWasteFactors ? 'Hide' : 'Show'} Waste Factors
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {hasChanges && !readOnly && (
              <>
                <Button variant="ghost" size="sm" onClick={revertChanges}>
                  <Undo className="h-4 w-4 mr-1" />
                  Revert
                </Button>
                <Button size="sm" onClick={saveChanges}>
                  <Save className="h-4 w-4 mr-1" />
                  Save Changes
                </Button>
              </>
            )}

            {onExport && (
              <div className="flex border rounded-md">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-r-none"
                  onClick={() => onExport('pdf')}
                >
                  <Download className="h-4 w-4 mr-1" />
                  PDF
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-none border-x"
                  onClick={() => onExport('excel')}
                >
                  Excel
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-l-none"
                  onClick={() => onExport('csv')}
                >
                  CSV
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Waste factors panel */}
        {showWasteFactors && (
          <div className="mb-4 p-4 border rounded-lg bg-muted/30">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Category Waste Factors
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from(groupedItems.keys()).map((category) => (
                <div key={category} className="flex items-center gap-2">
                  <span className="text-sm">{category}:</span>
                  <Input
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    value={materialList.waste_factors[category] || 0.1}
                    onChange={(e) =>
                      updateCategoryWasteFactor(category, parseFloat(e.target.value) || 0)
                    }
                    disabled={readOnly}
                    className="w-20 h-8"
                  />
                  <span className="text-xs text-muted-foreground">
                    ({Math.round((materialList.waste_factors[category] || 0.1) * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                {!readOnly && (
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedItems.size === localItems.length && localItems.length > 0}
                      onCheckedChange={(checked) => (checked ? selectAll() : deselectAll())}
                    />
                  </TableHead>
                )}
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('name')}
                >
                  Item Name {renderSortIndicator('name')}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 text-right"
                  onClick={() => handleSort('quantity')}
                >
                  Quantity {renderSortIndicator('quantity')}
                </TableHead>
                <TableHead className="text-center">Unit</TableHead>
                <TableHead className="text-right">Waste %</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 text-right"
                  onClick={() => handleSort('order_quantity')}
                >
                  Order Qty {renderSortIndicator('order_quantity')}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('category')}
                >
                  Category {renderSortIndicator('category')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={readOnly ? 6 : 7} className="text-center py-8 text-muted-foreground">
                    No items in this material list
                  </TableCell>
                </TableRow>
              ) : (
                sortedItems.map((item) => (
                  <TableRow
                    key={item.id}
                    className={cn(selectedItems.has(item.id) && 'bg-muted/30')}
                  >
                    {!readOnly && (
                      <TableCell>
                        <Checkbox
                          checked={selectedItems.has(item.id)}
                          onCheckedChange={() => toggleItemSelection(item.id)}
                        />
                      </TableCell>
                    )}

                    {/* Name */}
                    <TableCell
                      className={cn(!readOnly && 'cursor-pointer hover:bg-muted/30')}
                      onClick={() => startEditing(item.id, 'name', item.name)}
                    >
                      {editingState.itemId === item.id && editingState.field === 'name' ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={handleKeyPress}
                          onBlur={saveEdit}
                          autoFocus
                          className="h-8"
                        />
                      ) : (
                        <span className="font-medium">{item.name}</span>
                      )}
                    </TableCell>

                    {/* Quantity */}
                    <TableCell
                      className={cn('text-right', !readOnly && 'cursor-pointer hover:bg-muted/30')}
                      onClick={() => startEditing(item.id, 'quantity', item.quantity)}
                    >
                      {editingState.itemId === item.id && editingState.field === 'quantity' ? (
                        <Input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={handleKeyPress}
                          onBlur={saveEdit}
                          autoFocus
                          className="h-8 w-20 text-right ml-auto"
                        />
                      ) : (
                        item.quantity.toLocaleString()
                      )}
                    </TableCell>

                    {/* Unit */}
                    <TableCell className="text-center">
                      {editingState.itemId === item.id && editingState.field === 'unit' ? (
                        <NativeSelect
                          value={editValue}
                          onChange={(e) => {
                            setEditValue(e.target.value)
                            saveEdit()
                          }}
                          onBlur={saveEdit}
                          autoFocus
                          className="h-8 w-20"
                        >
                          {UNIT_OPTIONS.map((unit) => (
                            <option key={unit} value={unit}>
                              {unit}
                            </option>
                          ))}
                        </NativeSelect>
                      ) : (
                        <Badge
                          variant="outline"
                          className={cn(!readOnly && 'cursor-pointer')}
                          onClick={() => startEditing(item.id, 'unit', item.unit)}
                        >
                          {item.unit}
                        </Badge>
                      )}
                    </TableCell>

                    {/* Waste Factor */}
                    <TableCell
                      className={cn('text-right', !readOnly && 'cursor-pointer hover:bg-muted/30')}
                      onClick={() => startEditing(item.id, 'waste_factor', item.waste_factor)}
                    >
                      {editingState.itemId === item.id && editingState.field === 'waste_factor' ? (
                        <Input
                          type="number"
                          min="0"
                          max="1"
                          step="0.01"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={handleKeyPress}
                          onBlur={saveEdit}
                          autoFocus
                          className="h-8 w-16 text-right ml-auto"
                        />
                      ) : (
                        <span className="text-muted-foreground">
                          {Math.round(item.waste_factor * 100)}%
                        </span>
                      )}
                    </TableCell>

                    {/* Order Quantity */}
                    <TableCell className="text-right font-medium">
                      {item.order_quantity.toLocaleString()}
                    </TableCell>

                    {/* Category */}
                    <TableCell>
                      {editingState.itemId === item.id && editingState.field === 'category' ? (
                        <NativeSelect
                          value={editValue || ''}
                          onChange={(e) => {
                            setEditValue(e.target.value)
                            saveEdit()
                          }}
                          onBlur={saveEdit}
                          autoFocus
                          className="h-8"
                        >
                          <option value="">Uncategorized</option>
                          {CATEGORY_OPTIONS.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </NativeSelect>
                      ) : (
                        <Badge
                          variant="secondary"
                          className={cn(!readOnly && 'cursor-pointer')}
                          onClick={() => startEditing(item.id, 'category', item.category || '')}
                        >
                          {item.category || 'Uncategorized'}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Footer with totals */}
      <CardFooter className="border-t bg-muted/30">
        <div className="flex items-center justify-between w-full text-sm">
          <div className="flex gap-6">
            <div>
              <span className="text-muted-foreground">Line Items:</span>{' '}
              <span className="font-medium">{totals.lineItems}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total Quantity:</span>{' '}
              <span className="font-medium">{totals.totalItems.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total Order Qty:</span>{' '}
              <span className="font-medium">{totals.totalOrderQuantity.toLocaleString()}</span>
            </div>
          </div>

          {materialList.export_history.length > 0 && (
            <div className="text-muted-foreground">
              Last exported:{' '}
              {new Date(materialList.export_history[0].exported_at).toLocaleDateString()}
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}

export default MaterialListTable
