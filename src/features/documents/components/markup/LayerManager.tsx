// File: /src/features/documents/components/markup/LayerManager.tsx
// Layer management component for organizing and controlling markup visibility

import { useState } from 'react'
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Layers,
  Plus,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Edit2,
  ChevronUp,
  ChevronDown,
  MoreVertical,
  Check,
  GripVertical,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MarkupLayer, LayerOrderAction } from '../../types/markup'

interface LayerManagerProps {
  layers: MarkupLayer[]
  selectedLayerId: string | null
  onSelectLayer: (layerId: string | null) => void
  onCreateLayer: (layer: Omit<MarkupLayer, 'id' | 'createdAt' | 'updatedAt'>) => void
  onUpdateLayer: (layerId: string, updates: Partial<MarkupLayer>) => void
  onDeleteLayer: (layerId: string) => void
  onReorderLayer: (layerId: string, action: LayerOrderAction) => void
  onToggleVisibility: (layerId: string) => void
  onToggleLock: (layerId: string) => void
  currentUserId: string
  disabled?: boolean
  className?: string
}

const DEFAULT_LAYER_COLORS = [
  '#FF0000', '#0066FF', '#00CC66', '#FFCC00', '#9933FF',
  '#FF6600', '#00CCFF', '#FF66CC', '#996633', '#808080'
]

export function LayerManager({
  layers,
  selectedLayerId,
  onSelectLayer,
  onCreateLayer,
  onUpdateLayer,
  onDeleteLayer,
  onReorderLayer,
  onToggleVisibility,
  onToggleLock,
  currentUserId,
  disabled = false,
  className,
}: LayerManagerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingLayer, setEditingLayer] = useState<MarkupLayer | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [layerToDelete, setLayerToDelete] = useState<MarkupLayer | null>(null)

  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: '',
    color: DEFAULT_LAYER_COLORS[0],
    description: '',
  })

  const sortedLayers = [...layers].sort((a, b) => b.order - a.order)

  const handleCreateLayer = () => {
    if (!formData.name.trim()) {return}

    onCreateLayer({
      documentId: '', // Will be set by parent
      name: formData.name.trim(),
      color: formData.color,
      visible: true,
      locked: false,
      order: layers.length,
      createdBy: currentUserId,
      description: formData.description,
    })

    setFormData({ name: '', color: DEFAULT_LAYER_COLORS[0], description: '' })
    setIsCreateDialogOpen(false)
  }

  const handleEditLayer = () => {
    if (!editingLayer || !formData.name.trim()) {return}

    onUpdateLayer(editingLayer.id, {
      name: formData.name.trim(),
      color: formData.color,
      description: formData.description,
    })

    setEditingLayer(null)
    setFormData({ name: '', color: DEFAULT_LAYER_COLORS[0], description: '' })
    setIsEditDialogOpen(false)
  }

  const openEditDialog = (layer: MarkupLayer) => {
    setEditingLayer(layer)
    setFormData({
      name: layer.name,
      color: layer.color,
      description: layer.description || '',
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (layer: MarkupLayer) => {
    setLayerToDelete(layer)
    setShowDeleteDialog(true)
  }

  const handleDeleteLayer = () => {
    if (layerToDelete) {
      onDeleteLayer(layerToDelete.id)
      setLayerToDelete(null)
    }
    setShowDeleteDialog(false)
  }

  const visibleLayersCount = layers.filter(l => l.visible).length
  const totalMarkupsLabel = `${visibleLayersCount}/${layers.length} visible`

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className={cn('flex items-center gap-2', className)}
          >
            <Layers className="w-4 h-4" />
            <span className="text-xs">{totalMarkupsLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-3 border-b bg-surface">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm heading-card">Markup Layers</h4>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setFormData({ name: '', color: DEFAULT_LAYER_COLORS[layers.length % DEFAULT_LAYER_COLORS.length], description: '' })
                  setIsCreateDialogOpen(true)
                }}
                disabled={disabled}
                className="h-7 text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Layer
              </Button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {sortedLayers.length === 0 ? (
              <div className="p-4 text-center text-muted text-sm">
                <Layers className="w-8 h-8 mx-auto mb-2 text-disabled" />
                <p>No layers yet</p>
                <p className="text-xs mt-1">Create a layer to organize your markups</p>
              </div>
            ) : (
              <div className="divide-y">
                {sortedLayers.map((layer, index) => (
                  <div
                    key={layer.id}
                    className={cn(
                      'flex items-center gap-2 p-2 hover:bg-surface transition-colors',
                      selectedLayerId === layer.id && 'bg-blue-50 border-l-2 border-blue-500',
                      layer.locked && 'opacity-60'
                    )}
                  >
                    {/* Drag Handle */}
                    <div className="cursor-move text-disabled hover:text-secondary">
                      <GripVertical className="w-4 h-4" />
                    </div>

                    {/* Color Indicator */}
                    <div
                      className="w-3 h-3 rounded-full border border-input flex-shrink-0"
                      style={{ backgroundColor: layer.color }}
                    />

                    {/* Layer Name - Clickable to select */}
                    <button
                      className="flex-1 text-left text-sm truncate hover:text-primary"
                      onClick={() => onSelectLayer(selectedLayerId === layer.id ? null : layer.id)}
                      disabled={disabled}
                    >
                      {layer.name}
                      {selectedLayerId === layer.id && (
                        <Check className="w-3 h-3 inline ml-1 text-primary" />
                      )}
                    </button>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-1">
                      {/* Visibility Toggle */}
                      <button
                        onClick={() => onToggleVisibility(layer.id)}
                        disabled={disabled}
                        className="p-1 hover:bg-muted rounded transition-colors"
                        title={layer.visible ? 'Hide layer' : 'Show layer'}
                      >
                        {layer.visible ? (
                          <Eye className="w-4 h-4 text-secondary" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-disabled" />
                        )}
                      </button>

                      {/* Lock Toggle */}
                      <button
                        onClick={() => onToggleLock(layer.id)}
                        disabled={disabled}
                        className="p-1 hover:bg-muted rounded transition-colors"
                        title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                      >
                        {layer.locked ? (
                          <Lock className="w-4 h-4 text-warning" />
                        ) : (
                          <Unlock className="w-4 h-4 text-disabled" />
                        )}
                      </button>

                      {/* More Options */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            className="p-1 hover:bg-muted rounded transition-colors"
                            disabled={disabled}
                          >
                            <MoreVertical className="w-4 h-4 text-muted" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-40 p-1" align="end">
                          <button
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted rounded"
                            onClick={() => openEditDialog(layer)}
                          >
                            <Edit2 className="w-3 h-3" />
                            Edit
                          </button>
                          <button
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted rounded"
                            onClick={() => onReorderLayer(layer.id, 'bring-to-front')}
                            disabled={index === 0}
                          >
                            <ChevronUp className="w-3 h-3" />
                            Bring to Front
                          </button>
                          <button
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted rounded"
                            onClick={() => onReorderLayer(layer.id, 'send-to-back')}
                            disabled={index === sortedLayers.length - 1}
                          >
                            <ChevronDown className="w-3 h-3" />
                            Send to Back
                          </button>
                          {!layer.isDefault && (
                            <button
                              className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-error hover:bg-error-light rounded"
                              onClick={() => openDeleteDialog(layer)}
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          )}
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions Footer */}
          <div className="p-2 border-t bg-surface flex items-center justify-between text-xs text-muted">
            <button
              className="hover:text-primary"
              onClick={() => {
                layers.forEach(l => {
                  if (!l.visible) {onToggleVisibility(l.id)}
                })
              }}
              disabled={disabled}
            >
              Show All
            </button>
            <button
              className="hover:text-primary"
              onClick={() => {
                layers.forEach(l => {
                  if (l.visible) {onToggleVisibility(l.id)}
                })
              }}
              disabled={disabled}
            >
              Hide All
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Create Layer Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Layer</DialogTitle>
            <DialogDescription>
              Add a new layer to organize your markups. Each layer can have its own color and visibility settings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="layer-name">Layer Name *</Label>
              <Input
                id="layer-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Electrical Notes"
              />
            </div>

            <div className="space-y-2">
              <Label>Layer Color</Label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_LAYER_COLORS.map((color) => (
                  <button
                    key={color}
                    className={cn(
                      'w-8 h-8 rounded-full border-2 transition-all hover:scale-110',
                      formData.color === color
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-input'
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                    type="button"
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="layer-description">Description (optional)</Label>
              <Input
                id="layer-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this layer"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateLayer} disabled={!formData.name.trim()}>
              Create Layer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Layer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Layer</DialogTitle>
            <DialogDescription>
              Update layer properties and settings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-layer-name">Layer Name *</Label>
              <Input
                id="edit-layer-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Layer Color</Label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_LAYER_COLORS.map((color) => (
                  <button
                    key={color}
                    className={cn(
                      'w-8 h-8 rounded-full border-2 transition-all hover:scale-110',
                      formData.color === color
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-input'
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                    type="button"
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-layer-description">Description</Label>
              <Input
                id="edit-layer-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditLayer} disabled={!formData.name.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Layer Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Layer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete layer "{layerToDelete?.name}"? This will not delete the markups on this layer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLayer}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default LayerManager
