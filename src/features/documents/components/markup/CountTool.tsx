// File: /src/features/documents/components/markup/CountTool.tsx
// Count tool component for placing and managing count markers on drawings

import { useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Hash,
  Plus,
  Trash2,
  Download,
  Copy,
  Check,
  Edit2,
  ChevronDown,
  ChevronUp,
  X,
  DoorOpen,
  LayoutGrid,
  Zap,
  ToggleLeft,
  Lightbulb,
  Droplets,
  Wind,
  Flame,
  Circle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  CountMarker,
  CountCategory,
} from '../../types/markup'
import { DEFAULT_COUNT_CATEGORIES } from '../../types/markup'

interface CountToolProps {
  isActive: boolean
  onActiveChange: (active: boolean) => void
  activeCategory: CountCategory | null
  onCategoryChange: (category: CountCategory | null) => void
  markers: CountMarker[]
  categories: CountCategory[]
  onAddMarker: (marker: Omit<CountMarker, 'id' | 'createdAt' | 'createdBy'>) => void
  onDeleteMarker: (id: string) => void
  onClearMarkers: (categoryId?: string) => void
  onUpdateCategory: (category: CountCategory) => void
  onAddCategory: (category: Omit<CountCategory, 'count'>) => void
  onDeleteCategory: (categoryId: string) => void
  onExportCounts: () => void
  disabled?: boolean
  className?: string
}

// Icon mapping for categories
const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  door: DoorOpen,
  window: LayoutGrid,
  outlet: Zap,
  switch: ToggleLeft,
  light: Lightbulb,
  plumbing: Droplets,
  hvac: Wind,
  fire: Flame,
  custom: Circle,
}

function CategoryIcon({ icon, className }: { icon?: string; className?: string }) {
  const Icon = icon && CATEGORY_ICONS[icon] ? CATEGORY_ICONS[icon] : Circle
  return <Icon className={className} />
}

export function CountTool({
  isActive,
  onActiveChange,
  activeCategory,
  onCategoryChange,
  markers,
  categories,
  onAddMarker: _onAddMarker,
  onDeleteMarker,
  onClearMarkers,
  onUpdateCategory,
  onAddCategory,
  onDeleteCategory,
  onExportCounts,
  disabled = false,
  className,
}: CountToolProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false)
  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CountCategory | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState('#9B59B6')
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Calculate counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    markers.forEach((marker) => {
      counts[marker.categoryId] = (counts[marker.categoryId] || 0) + 1
    })
    return counts
  }, [markers])

  // Get categories with counts
  const categoriesWithCounts = useMemo(() => {
    return categories.map((cat) => ({
      ...cat,
      count: categoryCounts[cat.id] || 0,
    }))
  }, [categories, categoryCounts])

  // Total count
  const totalCount = markers.length

  const handleCategorySelect = useCallback((category: CountCategory) => {
    if (activeCategory?.id === category.id) {
      onCategoryChange(null)
      onActiveChange(false)
    } else {
      onCategoryChange(category)
      onActiveChange(true)
    }
  }, [activeCategory, onCategoryChange, onActiveChange])

  const handleAddCategory = useCallback(() => {
    if (!newCategoryName.trim()) {return}

    const newCategory: Omit<CountCategory, 'count'> = {
      id: `custom-${Date.now()}`,
      name: newCategoryName.trim(),
      color: newCategoryColor,
      icon: 'custom',
    }

    onAddCategory(newCategory)
    setNewCategoryName('')
    setNewCategoryColor('#9B59B6')
    setIsAddCategoryOpen(false)
  }, [newCategoryName, newCategoryColor, onAddCategory])

  const handleEditCategory = useCallback(() => {
    if (!editingCategory || !newCategoryName.trim()) {return}

    onUpdateCategory({
      ...editingCategory,
      name: newCategoryName.trim(),
      color: newCategoryColor,
    })
    setEditingCategory(null)
    setNewCategoryName('')
    setNewCategoryColor('#9B59B6')
    setIsEditCategoryOpen(false)
  }, [editingCategory, newCategoryName, newCategoryColor, onUpdateCategory])

  const handleCopyCount = useCallback((categoryName: string, count: number) => {
    const text = `${categoryName}: ${count}`
    navigator.clipboard.writeText(text)
    setCopiedId(categoryName)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const handleCopyAllCounts = useCallback(() => {
    const lines = categoriesWithCounts
      .filter((cat) => cat.count > 0)
      .map((cat) => `${cat.name}: ${cat.count}`)
    lines.push(`\nTotal: ${totalCount}`)
    navigator.clipboard.writeText(lines.join('\n'))
    setCopiedId('all')
    setTimeout(() => setCopiedId(null), 2000)
  }, [categoriesWithCounts, totalCount])

  const openEditDialog = useCallback((category: CountCategory) => {
    setEditingCategory(category)
    setNewCategoryName(category.name)
    setNewCategoryColor(category.color)
    setIsEditCategoryOpen(true)
  }, [])

  // Color presets for new categories
  const colorPresets = [
    '#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3',
    '#F38181', '#3D5A80', '#00CC66', '#FF0000',
    '#9B59B6', '#E67E22', '#3498DB', '#1ABC9C',
  ]

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className={cn(
              'flex items-center gap-2',
              isActive && 'bg-purple-50 border-purple-500 dark:bg-purple-900/20 dark:border-purple-400',
              className
            )}
          >
            <Hash className="w-4 h-4" />
            <span className="text-xs">Count</span>
            {totalCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full dark:bg-purple-800 dark:text-purple-200">
                {totalCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          {/* Header */}
          <div className="p-3 border-b bg-surface dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-sm">Count Tool</h3>
                <p className="text-xs text-secondary dark:text-gray-400">
                  Click to place count markers
                </p>
              </div>
              <Button
                size="sm"
                variant={isActive ? 'default' : 'outline'}
                onClick={() => onActiveChange(!isActive)}
                disabled={disabled || !activeCategory}
              >
                {isActive ? 'Active' : 'Inactive'}
              </Button>
            </div>
          </div>

          {/* Categories Section */}
          <div className="p-3 border-b">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-medium text-secondary dark:text-gray-400">Categories</Label>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsAddCategoryOpen(true)}
                className="h-6 text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add
              </Button>
            </div>

            <div className="space-y-1 max-h-48 overflow-y-auto">
              {categoriesWithCounts.map((category) => (
                <div key={category.id}>
                  <div
                    className={cn(
                      'flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors',
                      activeCategory?.id === category.id
                        ? 'bg-purple-50 border border-purple-300 dark:bg-purple-900/30 dark:border-purple-600'
                        : 'hover:bg-surface dark:hover:bg-gray-700',
                      disabled && 'opacity-50 pointer-events-none'
                    )}
                    onClick={() => handleCategorySelect(category)}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: category.color }}
                      >
                        <CategoryIcon icon={category.icon} className="w-2.5 h-2.5 text-white" />
                      </div>
                      <span className="text-sm font-medium dark:text-gray-200">{category.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                        {category.count}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setExpandedCategory(
                            expandedCategory === category.id ? null : category.id
                          )
                        }}
                        className="p-1 hover:bg-muted rounded dark:hover:bg-gray-600"
                      >
                        {expandedCategory === category.id ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Category Actions */}
                  {expandedCategory === category.id && (
                    <div className="ml-6 mt-1 p-2 bg-surface rounded-md space-y-1 dark:bg-gray-700">
                      <button
                        onClick={() => handleCopyCount(category.name, category.count)}
                        className="flex items-center gap-2 w-full p-1 text-xs hover:bg-muted rounded dark:hover:bg-gray-600"
                      >
                        {copiedId === category.name ? (
                          <Check className="w-3 h-3 text-success" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        Copy count
                      </button>
                      <button
                        onClick={() => openEditDialog(category)}
                        className="flex items-center gap-2 w-full p-1 text-xs hover:bg-muted rounded dark:hover:bg-gray-600"
                      >
                        <Edit2 className="w-3 h-3" />
                        Edit category
                      </button>
                      {category.count > 0 && (
                        <button
                          onClick={() => onClearMarkers(category.id)}
                          className="flex items-center gap-2 w-full p-1 text-xs text-orange-600 hover:bg-orange-50 rounded dark:text-orange-400 dark:hover:bg-orange-900/20"
                        >
                          <Trash2 className="w-3 h-3" />
                          Clear markers ({category.count})
                        </button>
                      )}
                      {!DEFAULT_COUNT_CATEGORIES.some((c) => c.id === category.id) && (
                        <button
                          onClick={() => onDeleteCategory(category.id)}
                          className="flex items-center gap-2 w-full p-1 text-xs text-error hover:bg-red-50 rounded dark:hover:bg-red-900/20"
                        >
                          <X className="w-3 h-3" />
                          Delete category
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Summary Section */}
          <div className="p-3 border-b bg-surface dark:bg-gray-800">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-medium text-secondary dark:text-gray-400">Summary</Label>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleCopyAllCounts}
                  className="p-1 hover:bg-muted rounded dark:hover:bg-gray-600"
                  title="Copy all counts"
                >
                  {copiedId === 'all' ? (
                    <Check className="w-3 h-3 text-success" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
                <button
                  onClick={onExportCounts}
                  className="p-1 hover:bg-muted rounded dark:hover:bg-gray-600"
                  title="Export to CSV"
                  disabled={totalCount === 0}
                >
                  <Download className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {categoriesWithCounts
                .filter((cat) => cat.count > 0)
                .map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center gap-1 p-1 bg-card rounded dark:bg-gray-700"
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="truncate dark:text-gray-300">{cat.name}</span>
                    <span className="font-bold ml-auto dark:text-gray-200">{cat.count}</span>
                  </div>
                ))}
            </div>

            <div className="mt-2 pt-2 border-t flex items-center justify-between dark:border-gray-600">
              <span className="text-sm font-medium dark:text-gray-200">Total Count</span>
              <span className="text-lg font-bold text-purple-600 dark:text-purple-400">{totalCount}</span>
            </div>
          </div>

          {/* Actions Footer */}
          <div className="p-2 flex items-center justify-between">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onClearMarkers()}
              disabled={disabled || totalCount === 0}
              className="text-xs text-error hover:text-error-dark"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Clear All
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onExportCounts}
              disabled={disabled || totalCount === 0}
              className="text-xs"
            >
              <Download className="w-3 h-3 mr-1" />
              Export CSV
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Add Category Dialog */}
      <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Count Category</DialogTitle>
            <DialogDescription>
              Create a new category for counting items on drawings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Category Name</Label>
              <Input
                id="category-name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g., Smoke Detectors"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {colorPresets.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewCategoryColor(color)}
                    className={cn(
                      'w-8 h-8 rounded-full border-2 transition-transform',
                      newCategoryColor === color
                        ? 'border-gray-900 scale-110 dark:border-white'
                        : 'border-transparent hover:scale-105'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Label>Preview:</Label>
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{ backgroundColor: `${newCategoryColor}20` }}
              >
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: newCategoryColor }}
                >
                  <Circle className="w-2.5 h-2.5 text-white" />
                </div>
                <span className="text-sm font-medium" style={{ color: newCategoryColor }}>
                  {newCategoryName || 'Category Name'}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddCategoryOpen(false)
                setNewCategoryName('')
                setNewCategoryColor('#9B59B6')
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddCategory} disabled={!newCategoryName.trim()}>
              Add Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditCategoryOpen} onOpenChange={setIsEditCategoryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update the category name and color.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-category-name">Category Name</Label>
              <Input
                id="edit-category-name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {colorPresets.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewCategoryColor(color)}
                    className={cn(
                      'w-8 h-8 rounded-full border-2 transition-transform',
                      newCategoryColor === color
                        ? 'border-gray-900 scale-110 dark:border-white'
                        : 'border-transparent hover:scale-105'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditCategoryOpen(false)
                setEditingCategory(null)
                setNewCategoryName('')
                setNewCategoryColor('#9B59B6')
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleEditCategory} disabled={!newCategoryName.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Count Marker Component for rendering on canvas
export interface CountMarkerDisplayProps {
  marker: CountMarker
  category: CountCategory
  isSelected?: boolean
  onSelect?: (id: string) => void
  onDelete?: (id: string) => void
  scale?: number
}

export function CountMarkerDisplay({
  marker,
  category,
  isSelected = false,
  onSelect,
  onDelete,
  scale = 1,
}: CountMarkerDisplayProps) {
  const size = 24 / scale
  const fontSize = 12 / scale

  return (
    <g
      transform={`translate(${marker.position.x}, ${marker.position.y})`}
      style={{ cursor: 'pointer' }}
      onClick={() => onSelect?.(marker.id)}
    >
      {/* Background circle */}
      <circle
        r={size / 2}
        fill={category.color}
        stroke={isSelected ? '#000' : 'white'}
        strokeWidth={isSelected ? 3 / scale : 2 / scale}
      />
      {/* Number label */}
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize={fontSize}
        fontWeight="bold"
      >
        {marker.number}
      </text>
      {/* Delete button on hover/select */}
      {isSelected && onDelete && (
        <g
          transform={`translate(${size / 2}, ${-size / 2})`}
          onClick={(e) => {
            e.stopPropagation()
            onDelete(marker.id)
          }}
        >
          <circle r={8 / scale} fill="#EF4444" />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
            fontSize={10 / scale}
          >
            x
          </text>
        </g>
      )}
      {/* Optional label */}
      {marker.label && (
        <text
          y={size / 2 + 12 / scale}
          textAnchor="middle"
          fill={category.color}
          fontSize={10 / scale}
          fontWeight="500"
        >
          {marker.label}
        </text>
      )}
    </g>
  )
}

export default CountTool
