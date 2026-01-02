/**
 * BulkActionToolbar Component
 *
 * Toolbar for bulk operations on report templates:
 * - Bulk delete
 * - Bulk category change
 * - Bulk export
 */

import React, { useState, useCallback } from 'react'
import {
  Trash2,
  FolderInput,
  Download,
  X,
  Loader2,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ============================================================================
// Types
// ============================================================================

export interface Category {
  id: string
  name: string
  color?: string
}

export interface BulkActionToolbarProps {
  /** Number of selected items */
  selectedCount: number
  /** IDs of selected templates */
  selectedIds: string[]
  /** Available categories for category change */
  categories: Category[]
  /** Callback when selection is cleared */
  onClearSelection: () => void
  /** Callback for bulk delete */
  onBulkDelete: (ids: string[]) => Promise<void>
  /** Callback for bulk category change */
  onBulkCategoryChange: (ids: string[], categoryId: string | null) => Promise<void>
  /** Callback for bulk clone */
  onBulkClone?: (ids: string[]) => Promise<void>
  /** Callback for bulk export */
  onBulkExport?: (ids: string[], format: 'json' | 'csv') => Promise<void>
  /** Whether any bulk operation is in progress */
  isLoading?: boolean
  /** Additional class name */
  className?: string
}

// ============================================================================
// Component
// ============================================================================

export function BulkActionToolbar({
  selectedCount,
  selectedIds,
  categories,
  onClearSelection,
  onBulkDelete,
  onBulkCategoryChange,
  onBulkClone,
  onBulkExport,
  isLoading = false,
  className,
}: BulkActionToolbarProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [operationInProgress, setOperationInProgress] = useState<string | null>(null)

  // Handle bulk delete
  const handleDelete = useCallback(async () => {
    setOperationInProgress('delete')
    try {
      await onBulkDelete(selectedIds)
      setDeleteDialogOpen(false)
      onClearSelection()
      toast.success(`Deleted ${selectedCount} template${selectedCount > 1 ? 's' : ''}`)
    } catch (_error) {
      toast.error('Failed to delete templates')
    } finally {
      setOperationInProgress(null)
    }
  }, [selectedIds, selectedCount, onBulkDelete, onClearSelection])

  // Handle category change
  const handleCategoryChange = useCallback(async () => {
    setOperationInProgress('category')
    try {
      await onBulkCategoryChange(selectedIds, selectedCategory)
      setCategoryDialogOpen(false)
      onClearSelection()
      toast.success(
        selectedCategory
          ? `Moved ${selectedCount} template${selectedCount > 1 ? 's' : ''} to category`
          : `Removed ${selectedCount} template${selectedCount > 1 ? 's' : ''} from category`
      )
    } catch (_error) {
      toast.error('Failed to change category')
    } finally {
      setOperationInProgress(null)
    }
  }, [selectedIds, selectedCategory, selectedCount, onBulkCategoryChange, onClearSelection])

  // Handle bulk clone
  const handleClone = useCallback(async () => {
    if (!onBulkClone) {return}

    setOperationInProgress('clone')
    try {
      await onBulkClone(selectedIds)
      onClearSelection()
    } catch (_error) {
      toast.error('Failed to clone templates')
    } finally {
      setOperationInProgress(null)
    }
  }, [selectedIds, onBulkClone, onClearSelection])

  // Handle export
  const handleExport = useCallback(async (format: 'json' | 'csv') => {
    if (!onBulkExport) {return}

    setOperationInProgress('export')
    try {
      await onBulkExport(selectedIds, format)
      toast.success(`Exported ${selectedCount} template${selectedCount > 1 ? 's' : ''} as ${format.toUpperCase()}`)
    } catch (_error) {
      toast.error('Failed to export templates')
    } finally {
      setOperationInProgress(null)
    }
  }, [selectedIds, selectedCount, onBulkExport])

  if (selectedCount === 0) {
    return null
  }

  const isProcessing = isLoading || operationInProgress !== null

  return (
    <>
      <div
        className={cn(
          'fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50',
          'bg-card border rounded-lg shadow-lg',
          'flex items-center gap-3 px-4 py-3',
          'animate-in slide-in-from-bottom-5 duration-200',
          className
        )}
      >
        <div className="flex items-center gap-2 pr-3 border-r">
          <Badge variant="secondary" className="px-2.5 py-1">
            {selectedCount}
          </Badge>
          <span className="text-sm text-secondary">
            template{selectedCount > 1 ? 's' : ''} selected
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Clone Button */}
          {onBulkClone && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClone}
              disabled={isProcessing}
              className="gap-1.5"
            >
              {operationInProgress === 'clone' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Clone
            </Button>
          )}

          {/* Category Change Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCategoryDialogOpen(true)}
            disabled={isProcessing}
            className="gap-1.5"
          >
            <FolderInput className="h-4 w-4" />
            Move to...
          </Button>

          {/* Export Dropdown */}
          {onBulkExport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" disabled={isProcessing} className="gap-1.5">
                  {operationInProgress === 'export' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Export Format</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport('json')}>
                  Export as JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  Export as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Delete Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={isProcessing}
            className="gap-1.5 text-error hover:text-error-dark hover:bg-error-light"
          >
            {operationInProgress === 'delete' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Delete
          </Button>
        </div>

        <div className="pl-3 border-l">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            disabled={isProcessing}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Clear selection</span>
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-error" />
              Delete {selectedCount} Template{selectedCount > 1 ? 's' : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All selected templates and their configurations
              will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={operationInProgress === 'delete'}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={operationInProgress === 'delete'}
              className="bg-error hover:bg-red-700"
            >
              {operationInProgress === 'delete' && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Category Change Dialog */}
      <AlertDialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Move {selectedCount} Template{selectedCount > 1 ? 's' : ''} to Category
            </AlertDialogTitle>
            <AlertDialogDescription>
              Select a category to move the selected templates to, or remove them from any category.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <Select
              value={selectedCategory || 'none'}
              onValueChange={(value) => setSelectedCategory(value === 'none' ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted">No category</span>
                </SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={operationInProgress === 'category'}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCategoryChange}
              disabled={operationInProgress === 'category'}
            >
              {operationInProgress === 'category' && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Check className="mr-2 h-4 w-4" />
              Move
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default BulkActionToolbar
