// File: /src/features/documents/components/comparison/ChangeNavigator.tsx
// Component for navigating between detected change regions in document comparison

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ChevronUp,
  ChevronDown,
  X,
  ChevronRight,
  ChevronLeft,
  List,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChangeRegion } from '../../types/markup'

interface ChangeNavigatorProps {
  changeRegions: ChangeRegion[]
  currentIndex: number
  onNavigate: (index: number) => void
  onJumpToRegion: (region: ChangeRegion) => void
  className?: string
  compact?: boolean
}

/**
 * Change Navigator - allows navigation between detected change regions
 */
export function ChangeNavigator({
  changeRegions,
  currentIndex,
  onNavigate,
  onJumpToRegion,
  className,
  compact = false,
}: ChangeNavigatorProps) {
  const [isExpanded, setIsExpanded] = useState(!compact)

  if (changeRegions.length === 0) {
    return null
  }

  const handlePrevious = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : changeRegions.length - 1
    onNavigate(newIndex)
    onJumpToRegion(changeRegions[newIndex])
  }

  const handleNext = () => {
    const newIndex = currentIndex < changeRegions.length - 1 ? currentIndex + 1 : 0
    onNavigate(newIndex)
    onJumpToRegion(changeRegions[newIndex])
  }

  const handleSelectRegion = (index: number) => {
    onNavigate(index)
    onJumpToRegion(changeRegions[index])
  }

  // Group regions by type
  const addedRegions = changeRegions.filter(r => r.changeType === 'added')
  const removedRegions = changeRegions.filter(r => r.changeType === 'removed')
  const modifiedRegions = changeRegions.filter(r => r.changeType === 'modified')

  const getChangeTypeColor = (type: ChangeRegion['changeType']) => {
    switch (type) {
      case 'added':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'removed':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'modified':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getChangeTypeLabel = (type: ChangeRegion['changeType']) => {
    switch (type) {
      case 'added':
        return 'Added'
      case 'removed':
        return 'Removed'
      case 'modified':
        return 'Modified'
      default:
        return 'Changed'
    }
  }

  return (
    <div
      className={cn(
        'bg-white border rounded-lg shadow-sm',
        className
      )}
    >
      {/* Header with navigation controls */}
      <div className="flex items-center justify-between p-2 border-b">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-7 px-2"
          >
            <List className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium">
            Change {currentIndex + 1} of {changeRegions.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={handlePrevious}
            disabled={changeRegions.length <= 1}
            className="h-7 px-2"
            title="Previous change (P)"
          >
            <ChevronUp className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleNext}
            disabled={changeRegions.length <= 1}
            className="h-7 px-2"
            title="Next change (N)"
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Expanded list of changes */}
      {isExpanded && (
        <div className="max-h-64 overflow-y-auto">
          {/* Summary by type */}
          <div className="p-2 border-b bg-gray-50 text-xs flex gap-3">
            {addedRegions.length > 0 && (
              <span className="text-green-700">{addedRegions.length} added</span>
            )}
            {removedRegions.length > 0 && (
              <span className="text-red-700">{removedRegions.length} removed</span>
            )}
            {modifiedRegions.length > 0 && (
              <span className="text-yellow-700">{modifiedRegions.length} modified</span>
            )}
          </div>

          {/* Change list */}
          <div className="divide-y">
            {changeRegions.map((region, index) => (
              <button
                key={region.id}
                onClick={() => handleSelectRegion(index)}
                className={cn(
                  'w-full p-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-2',
                  index === currentIndex && 'bg-blue-50'
                )}
              >
                <Badge
                  variant="outline"
                  className={cn('text-xs', getChangeTypeColor(region.changeType))}
                >
                  {getChangeTypeLabel(region.changeType)}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">
                    {region.description || `Region ${index + 1}`}
                  </p>
                  <p className="text-xs text-gray-500">
                    {region.width}x{region.height}px at ({region.x}, {region.y})
                  </p>
                </div>
                {index === currentIndex && (
                  <ChevronRight className="w-4 h-4 text-blue-500 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Compact version for inline use
 */
export function ChangeNavigatorCompact({
  changeRegions,
  currentIndex,
  onNavigate,
  onJumpToRegion,
}: Omit<ChangeNavigatorProps, 'compact' | 'className'>) {
  if (changeRegions.length === 0) {
    return null
  }

  const handlePrevious = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : changeRegions.length - 1
    onNavigate(newIndex)
    onJumpToRegion(changeRegions[newIndex])
  }

  const handleNext = () => {
    const newIndex = currentIndex < changeRegions.length - 1 ? currentIndex + 1 : 0
    onNavigate(newIndex)
    onJumpToRegion(changeRegions[newIndex])
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={handlePrevious}
        disabled={changeRegions.length <= 1}
        className="h-7 px-2"
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <span className="text-sm">
        {currentIndex + 1}/{changeRegions.length}
      </span>
      <Button
        size="sm"
        variant="outline"
        onClick={handleNext}
        disabled={changeRegions.length <= 1}
        className="h-7 px-2"
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  )
}

export default ChangeNavigator
