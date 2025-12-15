/**
 * Sortable Widget Component
 * Draggable wrapper for dashboard widgets
 */

import React, { useMemo, Component, ErrorInfo, ReactNode } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent, Button } from '@/components/ui'
import { GripVertical, X, AlertCircle } from 'lucide-react'
import { getWidget } from '../widgets/registry'
import { cn } from '@/lib/utils'
import type { DraggableWidget, WidgetProps } from '@/types/dashboard'

interface SortableWidgetProps {
  widget: DraggableWidget
  projectId: string
  isEditMode: boolean
  onRemove: () => void
}

/**
 * Error Boundary for widgets
 */
interface WidgetErrorBoundaryProps {
  children: ReactNode
  fallback: ReactNode
}

interface WidgetErrorBoundaryState {
  hasError: boolean
}

class WidgetErrorBoundary extends Component<WidgetErrorBoundaryProps, WidgetErrorBoundaryState> {
  constructor(props: WidgetErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): WidgetErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Widget error:', error, errorInfo)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback
    }

    return this.props.children
  }
}

export function SortableWidget({
  widget,
  projectId,
  isEditMode,
  onRemove,
}: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: widget.id,
    disabled: !isEditMode,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const widgetDef = useMemo(() => getWidget(widget.widgetType), [widget.widgetType])

  if (!widgetDef) {
    return (
      <Card
        ref={setNodeRef}
        style={style}
        className={cn(
          'relative h-48',
          isDragging && 'opacity-50'
        )}
      >
        <CardContent className="p-4 h-full flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">Unknown widget: {widget.widgetType}</p>
          </div>
        </CardContent>
        {isEditMode && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7 hover:bg-destructive/20 hover:text-destructive"
            onClick={onRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </Card>
    )
  }

  const WidgetComponent = widgetDef.component

  const widgetProps: WidgetProps = {
    projectId,
    widgetId: widget.id,
    config: widget.config,
    isEditing: isEditMode,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group',
        isDragging && 'z-50'
      )}
    >
      {/* Drag handle and remove button overlay */}
      {isEditMode && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className={cn(
              'absolute top-2 left-2 h-7 w-7 rounded bg-muted/80 hover:bg-muted',
              'flex items-center justify-center cursor-grab active:cursor-grabbing',
              'pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity',
              'focus:opacity-100 focus:ring-2 focus:ring-primary'
            )}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Remove button */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'absolute top-2 right-2 h-7 w-7',
              'hover:bg-destructive/20 hover:text-destructive',
              'pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity',
              'focus:opacity-100'
            )}
            onClick={onRemove}
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Edit mode border indicator */}
          <div className={cn(
            'absolute inset-0 rounded-lg border-2 border-dashed',
            'border-transparent group-hover:border-primary/50 transition-colors'
          )} />
        </div>
      )}

      {/* Widget content */}
      <WidgetErrorBoundary
        fallback={
          <Card className="h-48">
            <CardContent className="p-4 h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">Widget failed to load</p>
              </div>
            </CardContent>
          </Card>
        }
      >
        <WidgetComponent {...widgetProps} />
      </WidgetErrorBoundary>
    </div>
  )
}
