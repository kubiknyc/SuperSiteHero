// File: /src/features/submittals/components/SubmittalItemsEditor.tsx
// Component for managing submittal line items (CRUD operations)

import { useState } from 'react'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Loader2, Package } from 'lucide-react'
import {
  useSubmittalItems,
  useAddSubmittalItem,
  useUpdateSubmittalItem,
  useDeleteSubmittalItem,
} from '../hooks/useDedicatedSubmittals'
import type { SubmittalItem } from '@/types/database'

interface SubmittalItemsEditorProps {
  submittalId: string
  readOnly?: boolean
}

interface ItemFormData {
  description: string
  manufacturer: string
  model_number: string
  quantity: string
  unit: string
}

const defaultFormData: ItemFormData = {
  description: '',
  manufacturer: '',
  model_number: '',
  quantity: '',
  unit: '',
}

export function SubmittalItemsEditor({
  submittalId,
  readOnly = false,
}: SubmittalItemsEditorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<SubmittalItem | null>(null)
  const [formData, setFormData] = useState<ItemFormData>(defaultFormData)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<SubmittalItem | null>(null)

  const { data: items = [], isLoading } = useSubmittalItems(submittalId)
  const addItem = useAddSubmittalItem()
  const updateItem = useUpdateSubmittalItem()
  const deleteItem = useDeleteSubmittalItem()

  const handleOpenDialog = (item?: SubmittalItem) => {
    if (item) {
      setEditingItem(item)
      setFormData({
        description: item.description || '',
        manufacturer: item.manufacturer || '',
        model_number: item.model_number || '',
        quantity: item.quantity?.toString() || '',
        unit: item.unit || '',
      })
    } else {
      setEditingItem(null)
      setFormData(defaultFormData)
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingItem(null)
    setFormData(defaultFormData)
  }

  const handleSave = async () => {
    if (!formData.description.trim()) {return}

    try {
      if (editingItem) {
        await updateItem.mutateAsync({
          itemId: editingItem.id,
          submittalId,
          description: formData.description.trim(),
          manufacturer: formData.manufacturer.trim() || undefined,
          model_number: formData.model_number.trim() || undefined,
          quantity: formData.quantity ? parseInt(formData.quantity) : undefined,
          unit: formData.unit.trim() || undefined,
        })
      } else {
        await addItem.mutateAsync({
          submittalId,
          description: formData.description.trim(),
          manufacturer: formData.manufacturer.trim() || undefined,
          model_number: formData.model_number.trim() || undefined,
          quantity: formData.quantity ? parseInt(formData.quantity) : undefined,
          unit: formData.unit.trim() || undefined,
        })
      }
      handleCloseDialog()
    } catch (_error) {
      // Error handled by React Query
    }
  }

  const handleDeleteClick = (item: SubmittalItem) => {
    setItemToDelete(item)
    setShowDeleteDialog(true)
  }

  const handleDelete = async () => {
    if (!itemToDelete) {return}

    try {
      await deleteItem.mutateAsync({
        itemId: itemToDelete.id,
        submittalId,
      })
    } catch (_error) {
      // Error handled by React Query
    } finally {
      setShowDeleteDialog(false)
      setItemToDelete(null)
    }
  }

  const isSaving = addItem.isPending || updateItem.isPending

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Submittal Items
            </CardTitle>
            <CardDescription>
              {items.length} item{items.length !== 1 ? 's' : ''} in this submittal
            </CardDescription>
          </div>
          {!readOnly && (
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No items added yet</p>
            {!readOnly && (
              <Button variant="outline" className="mt-4" onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Item
              </Button>
            )}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">#</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead>Model #</TableHead>
                  <TableHead className="w-[80px]">Qty</TableHead>
                  <TableHead className="w-[80px]">Unit</TableHead>
                  {!readOnly && <TableHead className="w-[100px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">
                      {item.item_number}
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.description}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.manufacturer || '-'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {item.model_number || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.quantity || '-'}
                    </TableCell>
                    <TableCell>{item.unit || '-'}</TableCell>
                    {!readOnly && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(item)}
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(item)}
                            disabled={deleteItem.isPending}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            {deleteItem.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Edit Item' : 'Add New Item'}
              </DialogTitle>
              <DialogDescription>
                {editingItem
                  ? 'Update the item details below'
                  : 'Enter the details for the new submittal item'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="description">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="description"
                  placeholder="Item description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                  <Input
                    id="manufacturer"
                    placeholder="Manufacturer name"
                    value={formData.manufacturer}
                    onChange={(e) =>
                      setFormData({ ...formData, manufacturer: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model_number">Model Number</Label>
                  <Input
                    id="model_number"
                    placeholder="Model/Part #"
                    value={formData.model_number}
                    onChange={(e) =>
                      setFormData({ ...formData, model_number: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    placeholder="0"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Input
                    id="unit"
                    placeholder="ea, sf, lf, etc."
                    value={formData.unit}
                    onChange={(e) =>
                      setFormData({ ...formData, unit: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!formData.description.trim() || isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : editingItem ? (
                  'Update Item'
                ) : (
                  'Add Item'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Item</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this item? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}

export default SubmittalItemsEditor
