// File: /src/features/documents/components/MarkupFilterPanel.tsx
// Filter panel for markup annotations

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Filter,
  User,
  Calendar,
  Layers,
  ArrowUpRight,
  Square,
  Circle,
  Type,
  Pencil,
  Cloud,
  Eye,
  EyeOff,
} from 'lucide-react'
import { format, subDays, subWeeks, subMonths } from 'date-fns'

export type MarkupType = 'arrow' | 'rectangle' | 'circle' | 'text' | 'freehand' | 'cloud'

export interface MarkupFilter {
  showMyMarkupsOnly: boolean
  creatorIds: string[]
  types: MarkupType[]
  dateRange: {
    start: Date | null
    end: Date | null
  }
  hiddenLayers: string[] // creator IDs whose markups are hidden
}

interface MarkupFilterPanelProps {
  filter: MarkupFilter
  onFilterChange: (filter: MarkupFilter) => void
  creators: { id: string; name: string }[]
  currentUserId?: string
  markupCounts?: Record<MarkupType, number>
}

const typeIcons: Record<MarkupType, React.ReactNode> = {
  arrow: <ArrowUpRight className="h-4 w-4" />,
  rectangle: <Square className="h-4 w-4" />,
  circle: <Circle className="h-4 w-4" />,
  text: <Type className="h-4 w-4" />,
  freehand: <Pencil className="h-4 w-4" />,
  cloud: <Cloud className="h-4 w-4" />,
}

const typeLabels: Record<MarkupType, string> = {
  arrow: 'Arrows',
  rectangle: 'Rectangles',
  circle: 'Circles',
  text: 'Text',
  freehand: 'Freehand',
  cloud: 'Clouds',
}

const datePresets = [
  { label: 'Today', getValue: () => ({ start: subDays(new Date(), 0), end: new Date() }) },
  { label: 'Last 7 days', getValue: () => ({ start: subWeeks(new Date(), 1), end: new Date() }) },
  { label: 'Last 30 days', getValue: () => ({ start: subMonths(new Date(), 1), end: new Date() }) },
  { label: 'All time', getValue: () => ({ start: null, end: null }) },
]

export function MarkupFilterPanel({
  filter,
  onFilterChange,
  creators,
  currentUserId,
  markupCounts = {} as Record<MarkupType, number>,
}: MarkupFilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false)

  const activeFilterCount = [
    filter.showMyMarkupsOnly,
    filter.types.length < 6,
    filter.dateRange.start !== null,
    filter.hiddenLayers.length > 0,
  ].filter(Boolean).length

  const handleToggleMyMarkups = () => {
    onFilterChange({
      ...filter,
      showMyMarkupsOnly: !filter.showMyMarkupsOnly,
    })
  }

  const handleToggleType = (type: MarkupType) => {
    const newTypes = filter.types.includes(type)
      ? filter.types.filter(t => t !== type)
      : [...filter.types, type]
    onFilterChange({
      ...filter,
      types: newTypes,
    })
  }

  const handleDatePreset = (preset: typeof datePresets[0]) => {
    const { start, end } = preset.getValue()
    onFilterChange({
      ...filter,
      dateRange: { start, end },
    })
  }

  const handleToggleLayer = (creatorId: string) => {
    const newHiddenLayers = filter.hiddenLayers.includes(creatorId)
      ? filter.hiddenLayers.filter(id => id !== creatorId)
      : [...filter.hiddenLayers, creatorId]
    onFilterChange({
      ...filter,
      hiddenLayers: newHiddenLayers,
    })
  }

  const handleResetFilters = () => {
    onFilterChange({
      showMyMarkupsOnly: false,
      creatorIds: [],
      types: ['arrow', 'rectangle', 'circle', 'text', 'freehand', 'cloud'],
      dateRange: { start: null, end: null },
      hiddenLayers: [],
    })
  }

  const allTypes: MarkupType[] = ['arrow', 'rectangle', 'circle', 'text', 'freehand', 'cloud']

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          Filter
          {activeFilterCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm" className="heading-card">Filter Markups</h4>
            <Button variant="ghost" size="sm" onClick={handleResetFilters}>
              Reset
            </Button>
          </div>

          {/* My Markups Only Toggle */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted" />
              <span className="text-sm font-medium">Creator</span>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="my-markups"
                checked={filter.showMyMarkupsOnly}
                onCheckedChange={handleToggleMyMarkups}
              />
              <label htmlFor="my-markups" className="text-sm cursor-pointer">
                Show my markups only
              </label>
            </div>
          </div>

          {/* Type Filters */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted" />
              <span className="text-sm font-medium">Types</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {allTypes.map(type => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`type-${type}`}
                    checked={filter.types.includes(type)}
                    onCheckedChange={() => handleToggleType(type)}
                  />
                  <label
                    htmlFor={`type-${type}`}
                    className="text-sm cursor-pointer flex items-center gap-1"
                  >
                    {typeIcons[type]}
                    <span>{typeLabels[type]}</span>
                    {markupCounts[type] !== undefined && (
                      <span className="text-disabled">({markupCounts[type]})</span>
                    )}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted" />
              <span className="text-sm font-medium">Date Range</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {datePresets.map(preset => (
                <Button
                  key={preset.label}
                  variant={
                    (preset.label === 'All time' && filter.dateRange.start === null) ||
                    (filter.dateRange.start &&
                      format(filter.dateRange.start, 'yyyy-MM-dd') ===
                        format(preset.getValue().start!, 'yyyy-MM-dd'))
                      ? 'default'
                      : 'outline'
                  }
                  size="sm"
                  onClick={() => handleDatePreset(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Layer Visibility */}
          {creators.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted" />
                <span className="text-sm font-medium">Layer Visibility</span>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {creators.map(creator => (
                  <div
                    key={creator.id}
                    className="flex items-center justify-between py-1 px-2 hover:bg-surface rounded cursor-pointer"
                    onClick={() => handleToggleLayer(creator.id)}
                  >
                    <span className="text-sm">
                      {creator.name}
                      {creator.id === currentUserId && (
                        <span className="text-disabled ml-1">(you)</span>
                      )}
                    </span>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      {filter.hiddenLayers.includes(creator.id) ? (
                        <EyeOff className="h-4 w-4 text-disabled" />
                      ) : (
                        <Eye className="h-4 w-4 text-primary" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default MarkupFilterPanel
