// File: /src/features/visual-search/components/MatchGallery.tsx
// Gallery for displaying visual search matches with selection/exclusion

import { useState, useMemo, useCallback } from 'react'
import {
  Check,
  X,
  ExternalLink,
  Filter,
  ChevronDown,
  ChevronUp,
  Image,
  FileImage,
  Percent,
  Layers,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Skeleton,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Checkbox,
  Slider,
  Label,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui'
import { cn } from '@/lib/utils'
import type { VisualSearchMatch, DrawingSheet } from '@/types/drawing-sheets'

interface MatchGalleryProps {
  matches: VisualSearchMatch[]
  sheets?: Map<string, DrawingSheet> // Optional sheet details lookup
  excludedIndexes: Set<string>
  onToggleExclusion: (index: number) => void
  onMatchClick?: (match: VisualSearchMatch, index: number) => void
  onViewSheet?: (sheetId: string) => void
  isLoading?: boolean
  className?: string
}

type SortBy = 'confidence' | 'sheet'
type FilterState = {
  minConfidence: number
  showExcluded: boolean
}

/**
 * MatchGallery Component
 *
 * Displays search results from AI visual pattern matching.
 * Users can review matches, exclude false positives, and navigate to sheets.
 *
 * Features:
 * - Grid/list view of matches with thumbnails
 * - Confidence scores with visual indicators
 * - Include/exclude toggle for each match
 * - Group by sheet with collapse/expand
 * - Filter by confidence threshold
 * - Click to navigate to source sheet
 */
export function MatchGallery({
  matches,
  sheets,
  excludedIndexes,
  onToggleExclusion,
  onMatchClick,
  onViewSheet,
  isLoading = false,
  className,
}: MatchGalleryProps) {
  // State
  const [sortBy, setSortBy] = useState<SortBy>('confidence')
  const [filter, setFilter] = useState<FilterState>({
    minConfidence: 0,
    showExcluded: true,
  })
  const [expandedSheets, setExpandedSheets] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)

  // Calculate stats
  const stats = useMemo(() => {
    const total = matches.length
    const excluded = excludedIndexes.size
    const included = total - excluded
    const avgConfidence =
      matches.length > 0
        ? matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length
        : 0
    const uniqueSheets = new Set(matches.map((m) => m.sheet_id)).size

    return { total, excluded, included, avgConfidence, uniqueSheets }
  }, [matches, excludedIndexes])

  // Filter and sort matches
  const displayedMatches = useMemo(() => {
    let result = matches.map((match, index) => ({
      match,
      index,
      isExcluded: excludedIndexes.has(`${index}`),
    }))

    // Apply filters
    if (filter.minConfidence > 0) {
      result = result.filter((item) => item.match.confidence >= filter.minConfidence / 100)
    }

    if (!filter.showExcluded) {
      result = result.filter((item) => !item.isExcluded)
    }

    // Sort
    if (sortBy === 'confidence') {
      result.sort((a, b) => b.match.confidence - a.match.confidence)
    } else if (sortBy === 'sheet') {
      result.sort((a, b) => {
        const sheetA = a.match.sheet_number || a.match.sheet_id
        const sheetB = b.match.sheet_number || b.match.sheet_id
        return sheetA.localeCompare(sheetB)
      })
    }

    return result
  }, [matches, excludedIndexes, sortBy, filter])

  // Group matches by sheet
  const groupedBySheet = useMemo(() => {
    const groups = new Map<
      string,
      { sheet: { id: string; number: string | null; title: string | null }; items: typeof displayedMatches }
    >()

    for (const item of displayedMatches) {
      const sheetId = item.match.sheet_id
      const existing = groups.get(sheetId)

      if (existing) {
        existing.items.push(item)
      } else {
        groups.set(sheetId, {
          sheet: {
            id: sheetId,
            number: item.match.sheet_number,
            title: item.match.sheet_title,
          },
          items: [item],
        })
      }
    }

    return groups
  }, [displayedMatches])

  // Toggle sheet expansion
  const toggleSheetExpansion = useCallback((sheetId: string) => {
    setExpandedSheets((prev) => {
      const next = new Set(prev)
      if (next.has(sheetId)) {
        next.delete(sheetId)
      } else {
        next.add(sheetId)
      }
      return next
    })
  }, [])

  // Expand/collapse all
  const expandAll = useCallback(() => {
    setExpandedSheets(new Set(groupedBySheet.keys()))
  }, [groupedBySheet])

  const collapseAll = useCallback(() => {
    setExpandedSheets(new Set())
  }, [])

  // Get confidence badge variant
  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.9) {
      return { variant: 'default' as const, label: 'High' }
    } else if (confidence >= 0.7) {
      return { variant: 'secondary' as const, label: 'Medium' }
    } else {
      return { variant: 'outline' as const, label: 'Low' }
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Search Results
          </CardTitle>
          <CardDescription>Searching for matches...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="w-20 h-20 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  // Empty state
  if (matches.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Search Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileImage className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium">No matches found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Try adjusting your selection or search on more sheets
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Search Results
            </CardTitle>
            <CardDescription className="mt-1">
              Found {stats.total} match{stats.total !== 1 ? 'es' : ''} across {stats.uniqueSheets} sheet
              {stats.uniqueSheets !== 1 ? 's' : ''}
            </CardDescription>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-1" />
            Filters
            {showFilters ? (
              <ChevronUp className="h-4 w-4 ml-1" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-1" />
            )}
          </Button>
        </div>

        {/* Stats bar */}
        <div className="flex flex-wrap gap-3 mt-3">
          <Badge variant="default" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {stats.included} included
          </Badge>
          {stats.excluded > 0 && (
            <Badge variant="secondary" className="gap-1">
              <XCircle className="h-3 w-3" />
              {stats.excluded} excluded
            </Badge>
          )}
          <Badge variant="outline" className="gap-1">
            <Percent className="h-3 w-3" />
            {Math.round(stats.avgConfidence * 100)}% avg confidence
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Layers className="h-3 w-3" />
            {stats.uniqueSheets} sheets
          </Badge>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="mt-4 p-4 border rounded-lg bg-muted/30 space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label className="text-xs">Minimum Confidence</Label>
                <div className="flex items-center gap-3 mt-1">
                  <Slider
                    value={[filter.minConfidence]}
                    onValueChange={([value]) =>
                      setFilter((prev) => ({ ...prev, minConfidence: value }))
                    }
                    min={0}
                    max={100}
                    step={5}
                    className="flex-1"
                  />
                  <Badge variant="outline" className="min-w-[50px] justify-center">
                    {filter.minConfidence}%
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="show-excluded"
                  checked={filter.showExcluded}
                  onCheckedChange={(checked) =>
                    setFilter((prev) => ({ ...prev, showExcluded: !!checked }))
                  }
                />
                <Label htmlFor="show-excluded" className="text-sm">
                  Show excluded
                </Label>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs">Sort by:</Label>
              <Button
                variant={sortBy === 'confidence' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSortBy('confidence')}
              >
                Confidence
              </Button>
              <Button
                variant={sortBy === 'sheet' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSortBy('sheet')}
              >
                Sheet
              </Button>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Group controls */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Showing {displayedMatches.length} of {matches.length} matches
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={expandAll}>
              Expand all
            </Button>
            <Button variant="ghost" size="sm" onClick={collapseAll}>
              Collapse all
            </Button>
          </div>
        </div>

        {/* Grouped matches */}
        <div className="space-y-3">
          {Array.from(groupedBySheet.entries()).map(([sheetId, { sheet, items }]) => (
            <Collapsible
              key={sheetId}
              open={expandedSheets.has(sheetId)}
              onOpenChange={() => toggleSheetExpansion(sheetId)}
            >
              <div className="border rounded-lg">
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2">
                      {expandedSheets.has(sheetId) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      <span className="font-medium">
                        {sheet.number || `Sheet ${sheetId.slice(0, 8)}`}
                      </span>
                      {sheet.title && (
                        <span className="text-muted-foreground">— {sheet.title}</span>
                      )}
                    </div>
                    <Badge variant="secondary">{items.length} match{items.length !== 1 ? 'es' : ''}</Badge>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="border-t p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {items.map(({ match, index, isExcluded }) => (
                      <MatchCard
                        key={index}
                        match={match}
                        index={index}
                        isExcluded={isExcluded}
                        onToggleExclusion={onToggleExclusion}
                        onClick={() => onMatchClick?.(match, index)}
                        onViewSheet={() => onViewSheet?.(match.sheet_id)}
                        getConfidenceBadge={getConfidenceBadge}
                      />
                    ))}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Individual match card component
interface MatchCardProps {
  match: VisualSearchMatch
  index: number
  isExcluded: boolean
  onToggleExclusion: (index: number) => void
  onClick?: () => void
  onViewSheet?: () => void
  getConfidenceBadge: (confidence: number) => { variant: 'default' | 'secondary' | 'outline'; label: string }
}

function MatchCard({
  match,
  index,
  isExcluded,
  onToggleExclusion,
  onClick,
  onViewSheet,
  getConfidenceBadge,
}: MatchCardProps) {
  const confidenceBadge = getConfidenceBadge(match.confidence)

  return (
    <div
      className={cn(
        'relative border rounded-lg overflow-hidden transition-all',
        isExcluded && 'opacity-50',
        onClick && 'cursor-pointer hover:ring-2 hover:ring-primary'
      )}
      onClick={onClick}
    >
      {/* Match thumbnail placeholder */}
      <div
        className="aspect-square bg-muted flex items-center justify-center relative"
        style={{
          backgroundImage: match.sheet_id ? undefined : 'none',
        }}
      >
        <Image className="h-8 w-8 text-muted-foreground" />

        {/* Position indicator overlay */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute border-2 border-primary bg-primary/20"
            style={{
              left: `${match.bounding_box.x}%`,
              top: `${match.bounding_box.y}%`,
              width: `${match.bounding_box.width}%`,
              height: `${match.bounding_box.height}%`,
            }}
          />
        </div>

        {/* Excluded overlay */}
        {isExcluded && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
            <XCircle className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Match info */}
      <div className="p-2 space-y-1.5">
        <div className="flex items-center justify-between">
          <Badge variant={confidenceBadge.variant} className="text-xs">
            {Math.round(match.confidence * 100)}%
          </Badge>
          <span className="text-xs text-muted-foreground">#{index + 1}</span>
        </div>

        <div className="text-xs text-muted-foreground">
          Position: {Math.round(match.bounding_box.x)}%, {Math.round(match.bounding_box.y)}%
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleExclusion(index)
                  }}
                >
                  {isExcluded ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isExcluded ? 'Include this match' : 'Exclude this match'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {onViewSheet && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation()
                      onViewSheet()
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View in sheet</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    </div>
  )
}

export default MatchGallery
