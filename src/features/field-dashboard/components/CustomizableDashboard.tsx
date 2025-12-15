/**
 * Customizable Dashboard Component
 * Main dashboard with drag-drop widget support
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { Card, CardContent, Button, Badge } from '@/components/ui'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Plus,
  Settings,
  LayoutGrid,
  Save,
  RotateCcw,
  Loader2,
} from 'lucide-react'
import { useDefaultLayout, useSaveWidgetPositions, useAddWidget, useRemoveWidget } from '../hooks/useDashboardLayout'
import { getWidget, getDefaultWidgetLayout } from '../widgets/registry'
import { WidgetCatalog } from './WidgetCatalog'
import { SortableWidget } from './SortableWidget'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { WidgetPosition, DraggableWidget } from '@/types/dashboard'

interface CustomizableDashboardProps {
  projectId: string
  layoutId?: string
  className?: string
}

export function CustomizableDashboard({
  projectId,
  layoutId: _layoutId,
  className,
}: CustomizableDashboardProps) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [showCatalog, setShowCatalog] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [localWidgets, setLocalWidgets] = useState<DraggableWidget[]>([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Fetch default layout
  const {
    data: layout,
    isLoading: layoutLoading,
    refetch: refetchLayout,
  } = useDefaultLayout({ projectId })

  // Mutations
  const savePositionsMutation = useSaveWidgetPositions()
  const addWidgetMutation = useAddWidget()
  const removeWidgetMutation = useRemoveWidget()

  // Sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Convert widget preferences to draggable widgets
  useEffect(() => {
    if (layout?.widgets) {
      const widgets: DraggableWidget[] = layout.widgets.map((w) => ({
        id: w.id,
        widgetType: w.widget_type,
        position: w.position as WidgetPosition,
        config: w.widget_config,
        isVisible: w.is_visible,
        refreshInterval: w.refresh_interval,
      }))
      setLocalWidgets(widgets)
      setHasUnsavedChanges(false)
    } else if (!layout && !layoutLoading) {
      // Create default widgets if no layout exists
      const defaultWidgets = getDefaultWidgetLayout().map((w, idx) => ({
        id: `temp-${idx}`,
        widgetType: w.widgetType,
        position: w.position,
        config: {},
        isVisible: true,
        refreshInterval: null,
      }))
      setLocalWidgets(defaultWidgets)
    }
  }, [layout, layoutLoading])

  // Get sorted widget IDs
  const widgetIds = useMemo(() => localWidgets.map((w) => w.id), [localWidgets])

  // Get added widget types
  const addedWidgetTypes = useMemo(
    () => localWidgets.map((w) => w.widgetType),
    [localWidgets]
  )

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setLocalWidgets((widgets) => {
        const oldIndex = widgets.findIndex((w) => w.id === active.id)
        const newIndex = widgets.findIndex((w) => w.id === over.id)
        const newWidgets = arrayMove(widgets, oldIndex, newIndex)

        // Update positions based on new order
        return newWidgets.map((widget, idx) => ({
          ...widget,
          position: {
            ...widget.position,
            y: Math.floor(idx / 3) * 4,
            x: (idx % 3) * 4,
          },
        }))
      })
      setHasUnsavedChanges(true)
    }

    setActiveId(null)
  }, [])

  // Handle adding a widget
  const handleAddWidget = useCallback(
    async (widgetType: string) => {
      if (!layout?.id) {
        // If no layout, add locally
        const widgetDef = getWidget(widgetType)
        if (!widgetDef) {return}

        const newWidget: DraggableWidget = {
          id: `temp-${Date.now()}`,
          widgetType,
          position: {
            x: 0,
            y: localWidgets.length * 4,
            w: widgetDef.defaultSize.w,
            h: widgetDef.defaultSize.h,
          },
          config: widgetDef.defaultConfig,
          isVisible: true,
          refreshInterval: null,
        }

        setLocalWidgets((widgets) => [...widgets, newWidget])
        setHasUnsavedChanges(true)
        toast.success(`Added ${widgetDef.name} widget`)
        return
      }

      try {
        const widgetDef = getWidget(widgetType)
        if (!widgetDef) {return}

        await addWidgetMutation.mutateAsync({
          layout_id: layout.id,
          widget_type: widgetType,
          position: {
            x: 0,
            y: localWidgets.length * 4,
            w: widgetDef.defaultSize.w,
            h: widgetDef.defaultSize.h,
          },
          widget_config: widgetDef.defaultConfig,
        })

        await refetchLayout()
        toast.success(`Added ${widgetDef.name} widget`)
      } catch (error) {
        toast.error('Failed to add widget')
        console.error(error)
      }
    },
    [layout?.id, localWidgets.length, addWidgetMutation, refetchLayout]
  )

  // Handle removing a widget
  const handleRemoveWidget = useCallback(
    async (widgetId: string) => {
      const widget = localWidgets.find((w) => w.id === widgetId)
      const widgetDef = widget ? getWidget(widget.widgetType) : null

      // Remove locally first
      setLocalWidgets((widgets) => widgets.filter((w) => w.id !== widgetId))
      setHasUnsavedChanges(true)

      if (!layout?.id || widgetId.startsWith('temp-')) {
        toast.success(`Removed ${widgetDef?.name || 'widget'}`)
        return
      }

      try {
        await removeWidgetMutation.mutateAsync({
          widgetId,
          layoutId: layout.id,
        })
        toast.success(`Removed ${widgetDef?.name || 'widget'}`)
      } catch (error) {
        // Re-add on error
        if (widget) {
          setLocalWidgets((widgets) => [...widgets, widget])
        }
        toast.error('Failed to remove widget')
        console.error(error)
      }
    },
    [layout?.id, localWidgets, removeWidgetMutation]
  )

  // Save changes
  const handleSaveChanges = useCallback(async () => {
    if (!layout?.id) {
      toast.error('Create a layout first to save changes')
      return
    }

    try {
      await savePositionsMutation.mutateAsync({
        layoutId: layout.id,
        widgets: localWidgets
          .filter((w) => !w.id.startsWith('temp-'))
          .map((w) => ({
            id: w.id,
            position: w.position,
          })),
      })
      setHasUnsavedChanges(false)
      toast.success('Dashboard saved')
    } catch (error) {
      toast.error('Failed to save changes')
      console.error(error)
    }
  }, [layout?.id, localWidgets, savePositionsMutation])

  // Reset changes
  const handleResetChanges = useCallback(() => {
    if (layout?.widgets) {
      const widgets: DraggableWidget[] = layout.widgets.map((w) => ({
        id: w.id,
        widgetType: w.widget_type,
        position: w.position as WidgetPosition,
        config: w.widget_config,
        isVisible: w.is_visible,
        refreshInterval: w.refresh_interval,
      }))
      setLocalWidgets(widgets)
      setHasUnsavedChanges(false)
      toast.success('Changes reset')
    }
  }, [layout?.widgets])

  // Get active widget for drag overlay
  const activeWidget = activeId
    ? localWidgets.find((w) => w.id === activeId)
    : null

  if (layoutLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Dashboard</h2>
          {hasUnsavedChanges && (
            <Badge variant="outline" className="text-amber-600">
              Unsaved
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isEditMode && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCatalog(true)}
                className="gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Widget
              </Button>

              {hasUnsavedChanges && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetChanges}
                    className="gap-1"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveChanges}
                    disabled={savePositionsMutation.isPending}
                    className="gap-1"
                  >
                    {savePositionsMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save
                  </Button>
                </>
              )}
            </>
          )}

          <Button
            variant={isEditMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIsEditMode(!isEditMode)}
            className="gap-1"
          >
            <Settings className="h-4 w-4" />
            {isEditMode ? 'Done' : 'Edit'}
          </Button>
        </div>
      </div>

      {/* Widgets Grid */}
      {localWidgets.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={widgetIds} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {localWidgets.map((widget) => (
                <SortableWidget
                  key={widget.id}
                  widget={widget}
                  projectId={projectId}
                  isEditMode={isEditMode}
                  onRemove={() => handleRemoveWidget(widget.id)}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeWidget ? (
              <WidgetOverlay widget={activeWidget} />
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <Card className="py-12">
          <CardContent className="text-center">
            <LayoutGrid className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No widgets yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add widgets to customize your dashboard
            </p>
            <Button onClick={() => setShowCatalog(true)} className="gap-1">
              <Plus className="h-4 w-4" />
              Add Widget
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Widget Catalog Dialog */}
      <WidgetCatalog
        open={showCatalog}
        onOpenChange={setShowCatalog}
        addedWidgetTypes={addedWidgetTypes}
        onAddWidget={handleAddWidget}
      />
    </div>
  )
}

/**
 * Widget overlay for drag preview
 */
function WidgetOverlay({ widget }: { widget: DraggableWidget }) {
  const widgetDef = getWidget(widget.widgetType)

  return (
    <Card className="opacity-80 shadow-lg cursor-grabbing h-48">
      <CardContent className="p-4 h-full flex items-center justify-center">
        <div className="text-center">
          {widgetDef?.icon}
          <p className="text-sm font-medium mt-2">{widgetDef?.name}</p>
        </div>
      </CardContent>
    </Card>
  )
}
