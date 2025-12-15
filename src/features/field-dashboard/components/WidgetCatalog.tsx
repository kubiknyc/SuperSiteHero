/**
 * Widget Catalog Component
 * Dialog showing available widgets for adding to dashboard
 */

import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Badge,
} from '@/components/ui'
import { Input } from '@/components/ui/input'
import { Search, Plus, Check } from 'lucide-react'
import { getWidgetCategories, type WidgetDefinition } from '../widgets/registry'
import { cn } from '@/lib/utils'
import type { WidgetCategory } from '@/types/dashboard'

interface WidgetCatalogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  addedWidgetTypes: string[]
  onAddWidget: (widgetType: string) => void
}

export function WidgetCatalog({
  open,
  onOpenChange,
  addedWidgetTypes,
  onAddWidget,
}: WidgetCatalogProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<WidgetCategory | 'all'>('all')

  const categories = useMemo(() => getWidgetCategories(), [])

  const filteredWidgets = useMemo(() => {
    let widgets: WidgetDefinition[] = []

    if (selectedCategory === 'all') {
      widgets = categories.flatMap((cat) => cat.widgets)
    } else {
      const category = categories.find((cat) => cat.category === selectedCategory)
      widgets = category?.widgets || []
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      widgets = widgets.filter(
        (widget) =>
          widget.name.toLowerCase().includes(query) ||
          widget.description.toLowerCase().includes(query)
      )
    }

    return widgets
  }, [categories, selectedCategory, searchQuery])

  const handleAddWidget = (widgetType: string) => {
    onAddWidget(widgetType)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Widget</DialogTitle>
          <DialogDescription>
            Choose a widget to add to your dashboard
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search widgets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category filters */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
          >
            All
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.category}
              variant={selectedCategory === cat.category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat.category)}
            >
              {cat.label}
            </Button>
          ))}
        </div>

        {/* Widget list */}
        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          <div className="grid gap-3">
            {filteredWidgets.map((widget) => {
              const isAdded = addedWidgetTypes.includes(widget.id)

              return (
                <div
                  key={widget.id}
                  className={cn(
                    'flex items-start gap-4 p-4 rounded-lg border transition-colors',
                    isAdded
                      ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20'
                      : 'border-border hover:bg-muted/50'
                  )}
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    {widget.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{widget.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {widget.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {widget.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Size: {widget.defaultSize.w} x {widget.defaultSize.h}
                    </p>
                  </div>

                  {/* Action */}
                  <div className="flex-shrink-0">
                    {isAdded ? (
                      <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                        <Check className="h-4 w-4" />
                        Added
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleAddWidget(widget.id)}
                        className="gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        Add
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}

            {filteredWidgets.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No widgets found matching your search
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
