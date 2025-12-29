/**
 * CategoryManager Component
 *
 * CRUD operations for report template categories with drag-drop reordering,
 * color/icon customization, and usage count display.
 */

import React, { useState, useCallback, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  Loader2,
  FolderOpen,
  Calendar,
  CalendarDays,
  CalendarRange,
  Settings,
  FileText,
  BarChart2,
  Shield,
  AlertTriangle,
  Truck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

// ============================================================================
// Types
// ============================================================================

export interface TemplateCategory {
  id: string
  name: string
  description: string
  color: string
  icon: string
  sortOrder: number
  templateCount: number
  createdAt: string
  updatedAt: string
}

export interface CategoryManagerProps {
  categories: TemplateCategory[]
  onCategoryCreate: (category: Omit<TemplateCategory, 'id' | 'templateCount' | 'createdAt' | 'updatedAt'>) => Promise<void>
  onCategoryUpdate: (id: string, updates: Partial<TemplateCategory>) => Promise<void>
  onCategoryDelete: (id: string) => Promise<void>
  onCategoryReorder: (categories: { id: string; sortOrder: number }[]) => Promise<void>
  isLoading?: boolean
  className?: string
}

// ============================================================================
// Constants
// ============================================================================

const CATEGORY_COLORS = [
  { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { value: 'green', label: 'Green', class: 'bg-green-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { value: 'red', label: 'Red', class: 'bg-red-500' },
  { value: 'yellow', label: 'Yellow', class: 'bg-warning' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
  { value: 'teal', label: 'Teal', class: 'bg-teal-500' },
  { value: 'indigo', label: 'Indigo', class: 'bg-indigo-500' },
  { value: 'gray', label: 'Gray', class: 'bg-gray-500' },
]

const CATEGORY_ICONS = [
  { value: 'Calendar', label: 'Calendar', Icon: Calendar },
  { value: 'CalendarDays', label: 'Calendar Days', Icon: CalendarDays },
  { value: 'CalendarRange', label: 'Calendar Range', Icon: CalendarRange },
  { value: 'Settings', label: 'Settings', Icon: Settings },
  { value: 'FileText', label: 'File Text', Icon: FileText },
  { value: 'BarChart2', label: 'Bar Chart', Icon: BarChart2 },
  { value: 'Shield', label: 'Shield', Icon: Shield },
  { value: 'AlertTriangle', label: 'Alert', Icon: AlertTriangle },
  { value: 'Truck', label: 'Truck', Icon: Truck },
  { value: 'FolderOpen', label: 'Folder', Icon: FolderOpen },
]

// ============================================================================
// Helper Functions
// ============================================================================

function getColorClass(color: string): string {
  const found = CATEGORY_COLORS.find(c => c.value === color)
  return found?.class || 'bg-gray-500'
}

// ============================================================================
// Category Icon Component - renders icon by name using a switch statement
// to avoid dynamic component creation during render
// ============================================================================

interface CategoryIconProps {
  iconName: string
  className?: string
}

const CategoryIcon = React.memo(({ iconName, className }: CategoryIconProps) => {
  switch (iconName) {
    case 'Calendar':
      return <Calendar className={className} />
    case 'CalendarDays':
      return <CalendarDays className={className} />
    case 'CalendarRange':
      return <CalendarRange className={className} />
    case 'Settings':
      return <Settings className={className} />
    case 'FileText':
      return <FileText className={className} />
    case 'BarChart2':
      return <BarChart2 className={className} />
    case 'Shield':
      return <Shield className={className} />
    case 'AlertTriangle':
      return <AlertTriangle className={className} />
    case 'Truck':
      return <Truck className={className} />
    case 'FolderOpen':
    default:
      return <FolderOpen className={className} />
  }
})
CategoryIcon.displayName = 'CategoryIcon'

// ============================================================================
// Sortable Category Item Component
// ============================================================================

interface SortableCategoryItemProps {
  category: TemplateCategory
  onEdit: (category: TemplateCategory) => void
  onDelete: (category: TemplateCategory) => void
  isDragging?: boolean
}

function SortableCategoryItem({
  category,
  onEdit,
  onDelete,
  isDragging,
}: SortableCategoryItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: category.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 p-3 bg-card border rounded-lg',
        'hover:bg-surface transition-colors',
        isDragging && 'opacity-50 shadow-lg'
      )}
    >
      <button
        className="cursor-grab touch-none text-disabled hover:text-secondary"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <div
        className={cn(
          'flex items-center justify-center h-8 w-8 rounded-md',
          getColorClass(category.color)
        )}
      >
        <CategoryIcon iconName={category.icon} className="h-4 w-4 text-white" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground truncate">
            {category.name}
          </span>
          <Badge variant="secondary" className="text-xs">
            {category.templateCount} template{category.templateCount !== 1 ? 's' : ''}
          </Badge>
        </div>
        {category.description && (
          <p className="text-sm text-muted truncate mt-0.5">
            {category.description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(category)}
          className="h-8 w-8 p-0"
        >
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Edit</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(category)}
          className="h-8 w-8 p-0 text-error hover:text-error-dark hover:bg-error-light"
          disabled={category.templateCount > 0}
          title={category.templateCount > 0 ? 'Cannot delete category with templates' : 'Delete category'}
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete</span>
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// Category Form Dialog
// ============================================================================

interface CategoryFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: TemplateCategory | null
  onSubmit: (data: {
    name: string
    description: string
    color: string
    icon: string
  }) => Promise<void>
  isSubmitting: boolean
}

function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  onSubmit,
  isSubmitting,
}: CategoryFormDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('blue')
  const [icon, setIcon] = useState('Calendar')

  const isEditing = !!category

  useEffect(() => {
    setTimeout(() => {
      if (category) {
        setName(category.name)
        setDescription(category.description)
        setColor(category.color)
        setIcon(category.icon)
      } else {
        setName('')
        setDescription('')
        setColor('blue')
        setIcon('Calendar')
      }
    }, 0)
  }, [category, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Category name is required')
      return
    }
    await onSubmit({ name: name.trim(), description: description.trim(), color, icon })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit Category' : 'Add Category'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Update the category details below.'
                : 'Create a new category for organizing templates.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Weekly Reports"
                disabled={isSubmitting}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Reports generated weekly"
                disabled={isSubmitting}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="color">Color</Label>
                <Select value={color} onValueChange={setColor} disabled={isSubmitting}>
                  <SelectTrigger>
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <div className={cn('h-4 w-4 rounded', getColorClass(color))} />
                        {CATEGORY_COLORS.find(c => c.value === color)?.label}
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_COLORS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        <div className="flex items-center gap-2">
                          <div className={cn('h-4 w-4 rounded', c.class)} />
                          {c.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="icon">Icon</Label>
                <Select value={icon} onValueChange={setIcon} disabled={isSubmitting}>
                  <SelectTrigger>
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <CategoryIcon iconName={icon} className="h-4 w-4" />
                        {CATEGORY_ICONS.find(i => i.value === icon)?.label}
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_ICONS.map((i) => (
                      <SelectItem key={i.value} value={i.value}>
                        <div className="flex items-center gap-2">
                          <i.Icon className="h-4 w-4" />
                          {i.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-2 p-4 border rounded-lg bg-surface">
              <p className="text-sm text-muted mb-2">Preview</p>
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex items-center justify-center h-10 w-10 rounded-lg',
                    getColorClass(color)
                  )}
                >
                  <CategoryIcon iconName={icon} className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium">{name || 'Category Name'}</p>
                  {description && (
                    <p className="text-sm text-muted">{description}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Add Category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function CategoryManager({
  categories,
  onCategoryCreate,
  onCategoryUpdate,
  onCategoryDelete,
  onCategoryReorder,
  isLoading = false,
  className,
}: CategoryManagerProps) {
  const [localCategories, setLocalCategories] = useState<TemplateCategory[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<TemplateCategory | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<TemplateCategory | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  // Sync local categories with prop
  useEffect(() => {
    setLocalCategories([...categories].sort((a, b) => a.sortOrder - b.sortOrder))
  }, [categories])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = useCallback((event: { active: { id: string | number } }) => {
    setActiveId(String(event.active.id))
  }, [])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (over && active.id !== over.id) {
      const oldIndex = localCategories.findIndex((c) => c.id === active.id)
      const newIndex = localCategories.findIndex((c) => c.id === over.id)

      const reordered = arrayMove(localCategories, oldIndex, newIndex)
      setLocalCategories(reordered)

      try {
        await onCategoryReorder(
          reordered.map((c, i) => ({ id: c.id, sortOrder: i }))
        )
        toast.success('Categories reordered')
      } catch {
        // Revert on error
        setLocalCategories([...categories].sort((a, b) => a.sortOrder - b.sortOrder))
        toast.error('Failed to reorder categories')
      }
    }
  }, [localCategories, categories, onCategoryReorder])

  const handleAdd = useCallback(() => {
    setEditingCategory(null)
    setDialogOpen(true)
  }, [])

  const handleEdit = useCallback((category: TemplateCategory) => {
    setEditingCategory(category)
    setDialogOpen(true)
  }, [])

  const handleDelete = useCallback((category: TemplateCategory) => {
    if (category.templateCount > 0) {
      toast.error('Cannot delete category with templates. Move or delete templates first.')
      return
    }
    setDeletingCategory(category)
  }, [])

  const handleSubmit = useCallback(async (data: {
    name: string
    description: string
    color: string
    icon: string
  }) => {
    setIsSubmitting(true)
    try {
      if (editingCategory) {
        await onCategoryUpdate(editingCategory.id, data)
        toast.success('Category updated')
      } else {
        await onCategoryCreate({
          ...data,
          sortOrder: localCategories.length,
        })
        toast.success('Category created')
      }
      setDialogOpen(false)
      setEditingCategory(null)
    } catch {
      toast.error(editingCategory ? 'Failed to update category' : 'Failed to create category')
    } finally {
      setIsSubmitting(false)
    }
  }, [editingCategory, localCategories.length, onCategoryCreate, onCategoryUpdate])

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingCategory) {return}

    setIsSubmitting(true)
    try {
      await onCategoryDelete(deletingCategory.id)
      toast.success('Category deleted')
      setDeletingCategory(null)
    } catch {
      toast.error('Failed to delete category')
    } finally {
      setIsSubmitting(false)
    }
  }, [deletingCategory, onCategoryDelete])

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center h-48', className)}>
        <Loader2 className="h-8 w-8 animate-spin text-disabled" />
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium heading-subsection">Categories</h3>
          <p className="text-sm text-muted">
            Organize your report templates into categories
          </p>
        </div>
        <Button onClick={handleAdd} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Category
        </Button>
      </div>

      {localCategories.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-surface">
          <FolderOpen className="h-12 w-12 mx-auto text-disabled mb-3" />
          <p className="text-secondary font-medium">No categories yet</p>
          <p className="text-sm text-muted mb-4">
            Create categories to organize your templates
          </p>
          <Button onClick={handleAdd} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add First Category
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={localCategories.map(c => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {localCategories.map((category) => (
                <SortableCategoryItem
                  key={category.id}
                  category={category}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  isDragging={activeId === category.id}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <CategoryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editingCategory}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />

      <AlertDialog
        open={!!deletingCategory}
        onOpenChange={(open) => !open && setDeletingCategory(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingCategory?.name}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isSubmitting}
              className="bg-error hover:bg-red-700"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default CategoryManager
