// File: /src/features/visual-search/components/SearchSettingsPanel.tsx
// Settings panel for configuring visual search parameters

import { useMemo } from 'react'
import {
  Settings2,
  HelpCircle,
  Clock,
  Layers,
  Target,
  Info,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
  Label,
  Checkbox,
  Slider,
  Badge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui'
import { cn } from '@/lib/utils'

export interface SearchSettings {
  matchTolerance: number // 0.50 - 1.00
  maxResults: number
  includeAllDisciplines: boolean
}

interface SearchSettingsPanelProps {
  settings: SearchSettings
  onSettingsChange: (settings: SearchSettings) => void
  selectedSheetCount: number
  className?: string
}

// Default settings
export const DEFAULT_SEARCH_SETTINGS: SearchSettings = {
  matchTolerance: 0.80,
  maxResults: 50,
  includeAllDisciplines: true,
}

/**
 * SearchSettingsPanel Component
 *
 * Settings panel for configuring visual search parameters.
 *
 * Features:
 * - Match tolerance slider (0.50 - 1.00, default 0.80)
 * - Tooltip explaining tolerance
 * - Max results input (default: 50)
 * - Include all disciplines checkbox
 * - Shows estimated search time based on sheet count
 */
export function SearchSettingsPanel({
  settings,
  onSettingsChange,
  selectedSheetCount,
  className,
}: SearchSettingsPanelProps) {
  // Calculate estimated search time based on sheet count
  // Rough estimate: ~2 seconds per sheet for AI visual search
  const estimatedSearchTime = useMemo(() => {
    if (selectedSheetCount === 0) return null

    // Base time + time per sheet
    const baseTimeSeconds = 3
    const timePerSheetSeconds = 2
    const totalSeconds = baseTimeSeconds + (selectedSheetCount * timePerSheetSeconds)

    if (totalSeconds < 60) {
      return `${totalSeconds} seconds`
    } else {
      const minutes = Math.ceil(totalSeconds / 60)
      return `${minutes} minute${minutes > 1 ? 's' : ''}`
    }
  }, [selectedSheetCount])

  // Get tolerance description based on value
  const getToleranceDescription = (value: number): string => {
    if (value >= 0.95) return 'Very strict - Only near-exact matches'
    if (value >= 0.85) return 'Strict - High confidence matches only'
    if (value >= 0.75) return 'Balanced - Good mix of precision and recall'
    if (value >= 0.65) return 'Relaxed - More results, may include variations'
    return 'Very relaxed - Many results, lower confidence'
  }

  // Get tolerance badge variant based on value
  const getToleranceBadgeVariant = (value: number): 'default' | 'secondary' | 'outline' => {
    if (value >= 0.85) return 'default'
    if (value >= 0.70) return 'secondary'
    return 'outline'
  }

  const updateSetting = <K extends keyof SearchSettings>(
    key: K,
    value: SearchSettings[K]
  ) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    })
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Search Settings</CardTitle>
        </div>
        <CardDescription>
          Configure how the visual pattern search operates
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Match Tolerance */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="match-tolerance" className="text-sm font-medium">
                Match Tolerance
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <HelpCircle className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs p-3">
                    <p className="text-sm">
                      <strong>Match Tolerance</strong> controls how similar a pattern
                      must be to be considered a match.
                    </p>
                    <ul className="mt-2 text-xs space-y-1">
                      <li><strong>Higher (0.90+):</strong> Stricter matching, fewer false positives</li>
                      <li><strong>Medium (0.75-0.85):</strong> Balanced approach</li>
                      <li><strong>Lower (0.50-0.70):</strong> More results, may include variations</li>
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <Badge variant={getToleranceBadgeVariant(settings.matchTolerance)}>
              {Math.round(settings.matchTolerance * 100)}%
            </Badge>
          </div>

          <Slider
            id="match-tolerance"
            value={[settings.matchTolerance * 100]}
            onValueChange={([value]) => updateSetting('matchTolerance', value / 100)}
            min={50}
            max={100}
            step={5}
            className="w-full"
          />

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>More Results</span>
            <span>Stricter</span>
          </div>

          <p className="text-xs text-muted-foreground flex items-start gap-1.5 bg-muted/50 p-2 rounded">
            <Target className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            {getToleranceDescription(settings.matchTolerance)}
          </p>
        </div>

        {/* Max Results */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="max-results" className="text-sm font-medium">
              Maximum Results
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">
                    Limits the number of matches returned. Higher values may increase
                    search time but ensure you see all potential matches.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <Input
            id="max-results"
            type="number"
            min={10}
            max={500}
            value={settings.maxResults}
            onChange={(e) =>
              updateSetting('maxResults', Math.max(10, Math.min(500, parseInt(e.target.value) || 50)))
            }
            className="w-24"
          />

          <p className="text-xs text-muted-foreground">
            Recommended: 50-100 for most takeoffs
          </p>
        </div>

        {/* Include All Disciplines */}
        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox
              id="include-all-disciplines"
              checked={settings.includeAllDisciplines}
              onCheckedChange={(checked) =>
                updateSetting('includeAllDisciplines', !!checked)
              }
              touchFriendly={false}
            />
            <div>
              <span className="text-sm font-medium">Search all disciplines</span>
              <p className="text-xs text-muted-foreground mt-0.5">
                When enabled, searches all sheets regardless of discipline.
                Disable to only search sheets matching the source pattern's discipline.
              </p>
            </div>
          </label>
        </div>

        {/* Estimated Search Time */}
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Estimated time:</span>
            </div>

            {selectedSheetCount > 0 ? (
              <span className="text-sm font-medium">{estimatedSearchTime}</span>
            ) : (
              <span className="text-sm text-muted-foreground">Select sheets first</span>
            )}
          </div>

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2 text-sm">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Sheets to search:</span>
            </div>

            <Badge variant={selectedSheetCount > 0 ? 'secondary' : 'outline'}>
              {selectedSheetCount} sheet{selectedSheetCount !== 1 ? 's' : ''}
            </Badge>
          </div>

          {selectedSheetCount > 50 && (
            <div className="mt-3 flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded text-xs text-amber-700 dark:text-amber-400">
              <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>
                Searching many sheets may take several minutes. Consider narrowing
                your selection for faster results.
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default SearchSettingsPanel
