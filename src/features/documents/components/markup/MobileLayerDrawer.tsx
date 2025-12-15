/**
 * MobileLayerDrawer
 *
 * Mobile-optimized drawer for managing markup layers.
 * Slides up from the bottom for easy thumb access.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Layers,
  Plus,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronUp,
  ChevronDown,
  Trash2,
  Edit2,
  Check,
  X,
  User,
} from 'lucide-react'
import type { MarkupLayer, LayerOrderAction } from '../../types/markup'

interface MobileLayerDrawerProps {
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
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
}

const LAYER_COLORS = [
  { name: 'Red', value: '#EF4444' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Orange', value: '#F59E0B' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Gray', value: '#6B7280' },
]

export function MobileLayerDrawer({
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
  open,
  onOpenChange,
  children,
}: MobileLayerDrawerProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [newLayerName, setNewLayerName] = useState('')
  const [selectedColor, setSelectedColor] = useState(LAYER_COLORS[0].value)
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  // Handle create layer
  const handleCreateLayer = () => {
    if (!newLayerName.trim()) {return}

    onCreateLayer({
      name: newLayerName.trim(),
      color: selectedColor,
      visible: true,
      locked: false,
      documentId: '', // Will be set by the hook
      order: 0, // Will be set by the hook
      createdBy: currentUserId,
    })

    setNewLayerName('')
    setIsCreating(false)
  }

  // Handle edit layer name
  const handleStartEdit = (layer: MarkupLayer) => {
    setEditingLayerId(layer.id)
    setEditingName(layer.name)
  }

  const handleSaveEdit = () => {
    if (editingLayerId && editingName.trim()) {
      onUpdateLayer(editingLayerId, { name: editingName.trim() })
    }
    setEditingLayerId(null)
    setEditingName('')
  }

  const handleCancelEdit = () => {
    setEditingLayerId(null)
    setEditingName('')
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {children && <SheetTrigger asChild>{children}</SheetTrigger>}
      <SheetContent side="bottom" className="h-[70vh] rounded-t-xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Layers
            </span>
            <Badge variant="secondary">{layers.length}</Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Create New Layer */}
          {isCreating ? (
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <Input
                placeholder="Layer name"
                value={newLayerName}
                onChange={(e) => setNewLayerName(e.target.value)}
                autoFocus
                className="h-12 text-base"
              />
              <div className="flex gap-2 overflow-x-auto pb-2">
                {LAYER_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={cn(
                      'w-10 h-10 rounded-full flex-shrink-0 border-2 transition-transform',
                      selectedColor === color.value ? 'border-gray-900 scale-110' : 'border-transparent'
                    )}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setSelectedColor(color.value)}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 h-12"
                  onClick={() => setIsCreating(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 h-12"
                  onClick={handleCreateLayer}
                  disabled={!newLayerName.trim()}
                >
                  Create Layer
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full h-14 text-base"
              onClick={() => setIsCreating(true)}
              disabled={disabled}
            >
              <Plus className="w-5 h-5 mr-2" />
              New Layer
            </Button>
          )}

          {/* Layer List */}
          <ScrollArea className="h-[calc(70vh-200px)]">
            {layers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-base">No layers yet</p>
                <p className="text-sm mt-1">Create a layer to organize your markups</p>
              </div>
            ) : (
              <div className="space-y-2">
                {layers.map((layer, index) => {
                  const isOwner = layer.createdBy === currentUserId
                  const isEditing = editingLayerId === layer.id
                  const isSelected = selectedLayerId === layer.id

                  return (
                    <div
                      key={layer.id}
                      className={cn(
                        'bg-white border rounded-lg p-3 transition-colors',
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200',
                        !layer.visible && 'opacity-60'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {/* Color indicator */}
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: layer.color }}
                        />

                        {/* Layer name / editing */}
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="h-10"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {handleSaveEdit()}
                                if (e.key === 'Escape') {handleCancelEdit()}
                              }}
                            />
                          ) : (
                            <button
                              type="button"
                              className="text-left w-full"
                              onClick={() => onSelectLayer(isSelected ? null : layer.id)}
                            >
                              <p className="font-medium truncate">{layer.name}</p>
                              {layer.createdBy && layer.createdBy !== currentUserId && (
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  Shared layer
                                </p>
                              )}
                            </button>
                          )}
                        </div>

                        {/* Edit actions */}
                        {isEditing ? (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-10 w-10 p-0"
                              onClick={handleCancelEdit}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-10 w-10 p-0 text-green-600"
                              onClick={handleSaveEdit}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            {/* Visibility toggle */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-10 w-10 p-0"
                              onClick={() => onToggleVisibility(layer.id)}
                              disabled={disabled}
                            >
                              {layer.visible ? (
                                <Eye className="w-4 h-4" />
                              ) : (
                                <EyeOff className="w-4 h-4 text-gray-400" />
                              )}
                            </Button>

                            {/* Lock toggle */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-10 w-10 p-0"
                              onClick={() => onToggleLock(layer.id)}
                              disabled={disabled || !isOwner}
                            >
                              {layer.locked ? (
                                <Lock className="w-4 h-4 text-amber-500" />
                              ) : (
                                <Unlock className="w-4 h-4 text-gray-400" />
                              )}
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Layer actions (shown when selected) */}
                      {isSelected && !isEditing && (
                        <div className="flex gap-2 mt-3 pt-3 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-10"
                            onClick={() => handleStartEdit(layer)}
                            disabled={disabled || !isOwner}
                          >
                            <Edit2 className="w-4 h-4 mr-1" />
                            Rename
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-10 px-3"
                            onClick={() => onReorderLayer(layer.id, 'move-up')}
                            disabled={disabled || index === 0}
                          >
                            <ChevronUp className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-10 px-3"
                            onClick={() => onReorderLayer(layer.id, 'move-down')}
                            disabled={disabled || index === layers.length - 1}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-10 px-3 text-red-600 hover:bg-red-50"
                            onClick={() => onDeleteLayer(layer.id)}
                            disabled={disabled || !isOwner}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default MobileLayerDrawer
