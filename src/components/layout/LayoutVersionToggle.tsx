// File: /src/components/layout/LayoutVersionToggle.tsx
// Toggle switch for switching between layout versions
// Can be added to settings page or as a floating dev tool

import { cn } from '@/lib/utils'
import { useLayoutVersion } from '@/hooks/useLayoutVersion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Layout, Sparkles, Columns, PanelLeft } from 'lucide-react'

interface LayoutVersionToggleProps {
  className?: string
  showCard?: boolean
}

export function LayoutVersionToggle({
  className,
  showCard = true,
}: LayoutVersionToggleProps) {
  const { layoutVersion, setLayoutVersion, isV2 } = useLayoutVersion()

  if (!showCard) {
    // Simple switch version
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <Label
          htmlFor="layout-toggle"
          className="text-sm text-gray-600 dark:text-gray-400"
        >
          Use new layout
        </Label>
        <Switch
          id="layout-toggle"
          checked={isV2}
          onCheckedChange={(checked) => setLayoutVersion(checked ? 'v2' : 'v1')}
        />
        {isV2 && (
          <Badge variant="secondary" className="text-xs">
            <Sparkles className="w-3 h-3 mr-1" />
            New
          </Badge>
        )}
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Layout className="w-5 h-5" />
          Layout Version
        </CardTitle>
        <CardDescription>
          Choose between the classic and new desktop layout
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Layout Options */}
        <div className="grid grid-cols-2 gap-3">
          {/* V1 Option */}
          <button
            onClick={() => setLayoutVersion('v1')}
            className={cn(
              'p-4 rounded-xl border-2 text-left transition-all',
              layoutVersion === 'v1'
                ? 'border-primary bg-primary/5'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <PanelLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="font-medium text-gray-900 dark:text-white">
                Classic
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Fixed sidebar with all navigation visible
            </p>
            {/* Mini preview */}
            <div className="mt-3 h-16 bg-gray-100 dark:bg-gray-800 rounded-md flex overflow-hidden">
              <div className="w-1/4 bg-gray-300 dark:bg-gray-700" />
              <div className="flex-1 p-2">
                <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded mb-1 w-1/2" />
                <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded w-3/4" />
              </div>
            </div>
          </button>

          {/* V2 Option */}
          <button
            onClick={() => setLayoutVersion('v2')}
            className={cn(
              'p-4 rounded-xl border-2 text-left transition-all relative',
              layoutVersion === 'v2'
                ? 'border-primary bg-primary/5'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            )}
          >
            <Badge
              variant="secondary"
              className="absolute -top-2 -right-2 text-[10px]"
            >
              <Sparkles className="w-3 h-3 mr-0.5" />
              New
            </Badge>
            <div className="flex items-center gap-2 mb-2">
              <Columns className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="font-medium text-gray-900 dark:text-white">
                Modern
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Collapsible rail with sticky header
            </p>
            {/* Mini preview */}
            <div className="mt-3 h-16 bg-gray-100 dark:bg-gray-800 rounded-md flex overflow-hidden">
              <div className="w-3 bg-gray-300 dark:bg-gray-700" />
              <div className="flex-1">
                <div className="h-3 bg-gray-200 dark:bg-gray-600 flex items-center px-1">
                  <div className="h-1.5 bg-gray-300 dark:bg-gray-500 rounded w-1/4" />
                </div>
                <div className="p-2">
                  <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded w-3/4" />
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Feature comparison */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            What's new in Modern layout:
          </h4>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Collapsible sidebar (hover to expand)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Sticky header with inline stats
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Quick action buttons
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Slide-out action panel
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              More content space
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

// Floating toggle for development/testing
export function FloatingLayoutToggle() {
  const { layoutVersion, toggleLayoutVersion } = useLayoutVersion()

  return (
    <Button
      onClick={toggleLayoutVersion}
      variant="outline"
      size="sm"
      className={cn(
        'fixed bottom-4 right-4 z-[200]',
        'bg-white dark:bg-gray-900 shadow-lg',
        'border-gray-200 dark:border-gray-700'
      )}
    >
      <Layout className="w-4 h-4 mr-2" />
      Layout: {layoutVersion.toUpperCase()}
    </Button>
  )
}
