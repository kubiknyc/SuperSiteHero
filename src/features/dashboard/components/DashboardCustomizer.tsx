/**
 * Dashboard Customizer
 * Panel for customizing dashboard widgets and preferences
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Settings,
  GripVertical,
  Eye,
  EyeOff,
  RotateCcw,
  Loader2,
  Check,
  LayoutGrid,
  Clock,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useDashboardPreferences,
  WIDGET_LABELS,
  type WidgetId,
} from '../hooks/useDashboardPreferences'

interface DashboardCustomizerProps {
  className?: string
}

export function DashboardCustomizer({ className }: DashboardCustomizerProps) {
  const {
    preferences,
    loading,
    saving,
    savePreferences,
    toggleWidget,
    reorderWidgets,
    resetToDefaults,
    visibleWidgets,
  } = useDashboardPreferences()

  const [open, setOpen] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // Handle drag start
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    reorderWidgets(draggedIndex, index)
    setDraggedIndex(index)
  }

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  if (loading) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Loader2 className="h-5 w-5 animate-spin" />
      </Button>
    )
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className={cn('gap-2', className)}>
          <Settings className="h-4 w-4" />
          Customize
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5" />
            Customize Dashboard
          </SheetTitle>
          <SheetDescription>
            Show, hide, and reorder widgets. Drag to reorder visible widgets.
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Display Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Display Settings</h3>

            <div className="grid gap-4">
              {/* Theme */}
              <div className="flex items-center justify-between">
                <Label htmlFor="theme" className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                  Layout Density
                </Label>
                <Select
                  value={preferences.theme}
                  onValueChange={(value) =>
                    savePreferences({ theme: value as 'compact' | 'comfortable' | 'spacious' })
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">Compact</SelectItem>
                    <SelectItem value="comfortable">Comfortable</SelectItem>
                    <SelectItem value="spacious">Spacious</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Refresh Interval */}
              <div className="flex items-center justify-between">
                <Label htmlFor="refresh" className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Auto Refresh
                </Label>
                <Select
                  value={preferences.refreshInterval.toString()}
                  onValueChange={(value) =>
                    savePreferences({ refreshInterval: parseInt(value) })
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Manual</SelectItem>
                    <SelectItem value="30">30 seconds</SelectItem>
                    <SelectItem value="60">1 minute</SelectItem>
                    <SelectItem value="300">5 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Show Sparklines */}
              <div className="flex items-center justify-between">
                <Label htmlFor="sparklines" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  Show Sparklines
                </Label>
                <Switch
                  id="sparklines"
                  checked={preferences.showSparklines}
                  onCheckedChange={(checked) =>
                    savePreferences({ showSparklines: checked })
                  }
                />
              </div>

              {/* Show Trends */}
              <div className="flex items-center justify-between">
                <Label htmlFor="trends" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  Show Trend Indicators
                </Label>
                <Switch
                  id="trends"
                  checked={preferences.showTrends}
                  onCheckedChange={(checked) =>
                    savePreferences({ showTrends: checked })
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Widget Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Widgets</h3>
              <Badge variant="secondary" className="text-xs">
                {visibleWidgets.length} visible
              </Badge>
            </div>

            <div className="space-y-2">
              {preferences.widgets.map((widget, index) => {
                const config = WIDGET_LABELS[widget.id]
                return (
                  <Card
                    key={widget.id}
                    draggable={widget.visible}
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      'transition-all',
                      draggedIndex === index && 'opacity-50 scale-95',
                      !widget.visible && 'opacity-60'
                    )}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      {/* Drag Handle */}
                      <div
                        className={cn(
                          'cursor-grab active:cursor-grabbing',
                          !widget.visible && 'invisible'
                        )}
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      </div>

                      {/* Widget Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{config.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {config.description}
                        </p>
                      </div>

                      {/* Size Selector */}
                      <Select
                        value={widget.size}
                        onValueChange={(value) =>
                          savePreferences({
                            widgets: preferences.widgets.map((w) =>
                              w.id === widget.id
                                ? { ...w, size: value as 'small' | 'medium' | 'large' }
                                : w
                            ),
                          })
                        }
                        disabled={!widget.visible}
                      >
                        <SelectTrigger className="w-20 h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Small</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="large">Large</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Visibility Toggle */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleWidget(widget.id)}
                      >
                        {widget.visible ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </div>

        <SheetFooter className="flex-col gap-2 sm:flex-col">
          <Button
            variant="outline"
            onClick={resetToDefaults}
            className="w-full gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Defaults
          </Button>
          <Button onClick={() => setOpen(false)} className="w-full gap-2">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {saving ? 'Saving...' : 'Done'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export default DashboardCustomizer
