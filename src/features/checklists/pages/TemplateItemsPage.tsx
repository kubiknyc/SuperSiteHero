// File: /src/features/checklists/pages/TemplateItemsPage.tsx
// Template items management page with drag-and-drop builder

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Eye, Trash2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { ChecklistItemBuilder } from '../components/ChecklistItemBuilder'
import { useTemplateWithItems } from '../hooks/useTemplates'
import {
  useCreateTemplateItem,
  useUpdateTemplateItem,
  useDeleteTemplateItem,
  useReorderTemplateItems,
} from '../hooks/useTemplateItems'
import type { ChecklistTemplateItem, CreateChecklistTemplateItemDTO } from '@/types/checklists'
import toast from 'react-hot-toast'
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

export function TemplateItemsPage() {
  const { templateId } = useParams<{ templateId: string }>()
  const navigate = useNavigate()

  const { data: template, isLoading } = useTemplateWithItems(templateId!)
  const createItem = useCreateTemplateItem()
  const updateItem = useUpdateTemplateItem()
  const deleteItem = useDeleteTemplateItem()
  const reorderItems = useReorderTemplateItems()

  const [localItems, setLocalItems] = useState<ChecklistTemplateItem[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Sync local items with fetched data
  useEffect(() => {
    setTimeout(() => {
      if (template?.template_items) {
        setLocalItems(template.template_items)
      }
    }, 0);
  }, [template])

  const handleAddItem = async (
    item: Omit<CreateChecklistTemplateItemDTO, 'checklist_template_id' | 'sort_order'>
  ) => {
    if (!templateId) {return}

    try {
      const newItem = await createItem.mutateAsync({
        checklist_template_id: templateId,
        label: item.label,
        item_type: item.item_type,
        section: item.section,
        is_required: item.is_required,
        config: item.config,
        sort_order: localItems.length,
      })

      setLocalItems([...localItems, newItem])
      toast.success('Item added successfully')
    } catch (_error) {
      toast.error('Failed to add item')
    }
  }

  const handleUpdateItem = async (itemId: string, updates: Partial<ChecklistTemplateItem>) => {
    try {
      await updateItem.mutateAsync({ id: itemId, ...updates })

      setLocalItems(
        localItems.map((item) => (item.id === itemId ? { ...item, ...updates } : item))
      )
    } catch (_error) {
      toast.error('Failed to update item')
    }
  }

  const handleDeleteClick = (itemId: string) => {
    setItemToDelete(itemId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!itemToDelete || !templateId) {
      return
    }

    setIsDeleting(true)
    try {
      await deleteItem.mutateAsync({ itemId: itemToDelete, templateId })
      setLocalItems(localItems.filter((item) => item.id !== itemToDelete))
      toast.success('Item deleted successfully')
      setDeleteDialogOpen(false)
      setItemToDelete(null)
    } catch (_error) {
      toast.error('Failed to delete item')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleReorderItems = async (items: ChecklistTemplateItem[]) => {
    if (!templateId) {return}

    try {
      await reorderItems.mutateAsync({
        templateId,
        items: items.map((item, index) => ({
          id: item.id,
          sort_order: index,
        })),
      })
      toast.success('Items reordered successfully')
    } catch (_error) {
      toast.error('Failed to reorder items')
    }
  }

  const handleItemsChange = (items: ChecklistTemplateItem[]) => {
    setLocalItems(items)
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-secondary">Loading template...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!template) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-secondary">Template not found</p>
            <Button
              variant="outline"
              onClick={() => navigate('/checklists/templates')}
              className="mt-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Templates
            </Button>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/checklists/templates')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold heading-page">{template.name}</h1>
              <p className="text-secondary">{template.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate(`/checklists/preview/${templateId}`)}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button onClick={() => navigate('/checklists/templates')}>
              <Save className="h-4 w-4 mr-2" />
              Done
            </Button>
          </div>
        </div>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Template Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-secondary">Category:</span>
                <p className="font-medium">{template.category || 'Uncategorized'}</p>
              </div>
              <div>
                <span className="text-secondary">Level:</span>
                <p className="font-medium capitalize">{template.template_level || 'project'}</p>
              </div>
              <div>
                <span className="text-secondary">Duration:</span>
                <p className="font-medium">
                  {template.estimated_duration_minutes
                    ? `${template.estimated_duration_minutes} min`
                    : 'Not set'}
                </p>
              </div>
              <div>
                <span className="text-secondary">Scoring:</span>
                <p className="font-medium">{template.scoring_enabled ? 'Enabled' : 'Disabled'}</p>
              </div>
            </div>
            {template.tags && template.tags.length > 0 && (
              <div className="mt-4">
                <span className="text-secondary text-sm">Tags:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {template.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-muted text-secondary rounded-md text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Item Builder */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Checklist Items ({localItems.length})</CardTitle>
              <span className="text-sm text-secondary">
                Drag items to reorder • Click to expand settings
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <ChecklistItemBuilder
              items={localItems}
              onItemsChange={handleItemsChange}
              onAddItem={handleAddItem}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteClick}
              onReorderItems={handleReorderItems}
            />
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-error" />
              Delete Checklist Item
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this checklist item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} onClick={() => setItemToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-error hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  )
}
