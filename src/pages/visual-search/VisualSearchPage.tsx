// File: /src/pages/visual-search/VisualSearchPage.tsx
// Visual Search interface for AI-powered pattern matching in construction drawings

import { useState, useMemo, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { LassoSelectTool, MatchGallery } from '@/features/visual-search'
import {
  useFindPatternMatches,
  useVisualSearchPatterns,
  useVisualSearchState,
  useCreatePattern,
  usePopularPatterns,
} from '@/features/visual-search/hooks'
import { useDrawingSheets } from '@/features/drawing-sheets/hooks'
import { useAuth } from '@/lib/auth/AuthContext'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
  Label,
  Badge,
  Slider,
  Checkbox,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Skeleton,
  Alert,
  AlertDescription,
} from '@/components/ui'
import {
  Search,
  Library,
  Target,
  Crosshair,
  Layers,
  SlidersHorizontal,
  Play,
  Save,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Grid3X3,
  X,
  RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VisualSearchPattern, DrawingSheet, SelectionRegion } from '@/types/drawing-sheets'

type PatternSource = 'library' | 'selection'

interface SheetSelectorProps {
  sheets: DrawingSheet[]
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
  isLoading?: boolean
}

function SheetSelector({
  sheets,
  selectedIds,
  onSelectionChange,
  isLoading,
}: SheetSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredSheets = useMemo(() => {
    if (!searchTerm) return sheets
    const term = searchTerm.toLowerCase()
    return sheets.filter(
      (s) =>
        s.sheet_number?.toLowerCase().includes(term) ||
        s.title?.toLowerCase().includes(term)
    )
  }, [sheets, searchTerm])

  const handleToggle = (sheetId: string) => {
    const next = new Set(selectedIds)
    if (next.has(sheetId)) {
      next.delete(sheetId)
    } else {
      next.add(sheetId)
    }
    onSelectionChange(next)
  }

  const handleSelectAll = () => {
    onSelectionChange(new Set(filteredSheets.map((s) => s.id)))
  }

  const handleClearAll = () => {
    onSelectionChange(new Set())
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter sheets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-background/50 border-border/50"
          />
        </div>
        <Button variant="ghost" size="sm" onClick={handleSelectAll}>
          Select All
        </Button>
        <Button variant="ghost" size="sm" onClick={handleClearAll}>
          Clear
        </Button>
      </div>

      <div className="max-h-[280px] overflow-y-auto space-y-1 pr-2 scrollbar-thin">
        {filteredSheets.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            {searchTerm ? 'No sheets match your filter' : 'No sheets available'}
          </div>
        ) : (
          filteredSheets.map((sheet) => (
            <label
              key={sheet.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all',
                'border border-transparent',
                'hover:bg-accent/30',
                selectedIds.has(sheet.id) &&
                  'bg-primary/5 border-primary/20 hover:bg-primary/10'
              )}
            >
              <Checkbox
                checked={selectedIds.has(sheet.id)}
                onCheckedChange={() => handleToggle(sheet.id)}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium">
                    {sheet.sheet_number || `Page ${sheet.page_number}`}
                  </span>
                  {sheet.discipline && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {sheet.discipline}
                    </Badge>
                  )}
                </div>
                {sheet.title && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {sheet.title}
                  </p>
                )}
              </div>
            </label>
          ))
        )}
      </div>

      <div className="pt-2 border-t border-border/50">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{selectedIds.size}</span> of{' '}
          {sheets.length} sheets selected
        </p>
      </div>
    </div>
  )
}

interface PatternGridProps {
  patterns: VisualSearchPattern[]
  selectedId: string | null
  onSelect: (pattern: VisualSearchPattern) => void
  isLoading?: boolean
}

function PatternGrid({ patterns, selectedId, onSelect, isLoading }: PatternGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    )
  }

  if (patterns.length === 0) {
    return (
      <div className="py-12 text-center">
        <Library className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground">No saved patterns yet</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Create a selection below to save your first pattern
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {patterns.map((pattern) => (
        <button
          key={pattern.id}
          onClick={() => onSelect(pattern)}
          className={cn(
            'group relative aspect-square rounded-lg overflow-hidden',
            'border-2 transition-all duration-200',
            'hover:scale-[1.02] hover:shadow-lg',
            selectedId === pattern.id
              ? 'border-primary ring-2 ring-primary/20'
              : 'border-border/50 hover:border-primary/50'
          )}
        >
          {/* Pattern thumbnail */}
          <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50">
            {pattern.pattern_image_url ? (
              <img
                src={pattern.pattern_image_url}
                alt={pattern.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Target className="h-8 w-8 text-muted-foreground/30" />
              </div>
            )}
          </div>

          {/* Overlay with pattern info */}
          <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 via-black/50 to-transparent">
            <p className="text-white text-xs font-medium truncate">{pattern.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 bg-white/20 text-white/80"
              >
                {pattern.usage_count} uses
              </Badge>
            </div>
          </div>

          {/* Selection indicator */}
          {selectedId === pattern.id && (
            <div className="absolute top-2 right-2">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
              </div>
            </div>
          )}
        </button>
      ))}
    </div>
  )
}

export function VisualSearchPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { userProfile } = useAuth()

  // State
  const [patternSource, setPatternSource] = useState<PatternSource>('library')
  const [selectedSheetIds, setSelectedSheetIds] = useState<Set<string>>(new Set())
  const [selectedPattern, setSelectedPattern] = useState<VisualSearchPattern | null>(null)
  const [matchTolerance, setMatchTolerance] = useState(0.75)
  const [showSelectionTool, setShowSelectionTool] = useState(false)
  const [selectedSheetForSelection, setSelectedSheetForSelection] = useState<DrawingSheet | null>(null)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [patternName, setPatternName] = useState('')
  const [patternDescription, setPatternDescription] = useState('')

  // Visual search state
  const searchState = useVisualSearchState()

  // Queries
  const { data: sheets, isLoading: sheetsLoading } = useDrawingSheets(projectId)
  const { data: patterns, isLoading: patternsLoading } = useVisualSearchPatterns(projectId)
  const { data: popularPatterns } = usePopularPatterns(userProfile?.company_id)

  // Mutations
  const findMatches = useFindPatternMatches()
  const createPattern = useCreatePattern()

  // Computed values
  const canSearch = useMemo(() => {
    const hasPattern = patternSource === 'library' ? !!selectedPattern : !!searchState.patternImageBase64
    return hasPattern && selectedSheetIds.size > 0
  }, [patternSource, selectedPattern, searchState.patternImageBase64, selectedSheetIds])

  const sheetsToSearch = useMemo(() => {
    if (!sheets) return []
    return sheets.filter((s) => s.full_image_url)
  }, [sheets])

  // Handlers
  const handlePatternSelect = useCallback((pattern: VisualSearchPattern) => {
    setSelectedPattern(pattern)
  }, [])

  const handleSelectionComplete = useCallback(
    (region: SelectionRegion, imageBase64: string) => {
      searchState.setSelectedRegion(region)
      searchState.setPatternImage(imageBase64)
      setShowSelectionTool(false)
      setPatternSource('selection')
    },
    [searchState]
  )

  const handleSearch = useCallback(async () => {
    if (!canSearch) return

    searchState.setSearching(true)

    try {
      const result = await findMatches.mutateAsync({
        patternId: patternSource === 'library' ? selectedPattern?.id : undefined,
        patternImageBase64: patternSource === 'selection' ? searchState.patternImageBase64 ?? undefined : undefined,
        sheetIds: Array.from(selectedSheetIds),
        matchTolerance,
      })

      searchState.setMatches(result.matches)
    } catch (error) {
      searchState.setSearchError(
        error instanceof Error ? error.message : 'Search failed'
      )
    }
  }, [canSearch, patternSource, selectedPattern, searchState, selectedSheetIds, matchTolerance, findMatches])

  const handleSavePattern = useCallback(async () => {
    if (!patternName.trim() || !searchState.patternImageBase64 || !projectId || !userProfile?.company_id) {
      return
    }

    try {
      await createPattern.mutateAsync({
        project_id: projectId,
        company_id: userProfile.company_id,
        name: patternName.trim(),
        description: patternDescription.trim() || null,
        pattern_image_url: `data:image/png;base64,${searchState.patternImageBase64}`,
        pattern_description: null,
        pattern_hash: null,
        match_tolerance: matchTolerance,
        default_assembly_id: null,
        created_by: userProfile.id,
        deleted_at: null,
      })

      setShowSaveDialog(false)
      setPatternName('')
      setPatternDescription('')
    } catch (error) {
      console.error('Failed to save pattern:', error)
    }
  }, [patternName, patternDescription, searchState.patternImageBase64, projectId, userProfile, matchTolerance, createPattern])

  const handleViewSheet = useCallback(
    (sheetId: string) => {
      navigate(`/projects/${projectId}/drawing-sheets/${sheetId}`)
    },
    [navigate, projectId]
  )

  const handleReset = useCallback(() => {
    searchState.reset()
    setSelectedPattern(null)
  }, [searchState])

  // Select first sheet for selection tool
  const handleOpenSelectionTool = useCallback(() => {
    if (sheets && sheets.length > 0) {
      // Prefer a sheet that's already selected, or use the first one with an image
      const sheetWithImage = sheets.find((s) => selectedSheetIds.has(s.id) && s.full_image_url) ||
        sheets.find((s) => s.full_image_url)
      if (sheetWithImage) {
        setSelectedSheetForSelection(sheetWithImage)
        setShowSelectionTool(true)
      }
    }
  }, [sheets, selectedSheetIds])

  return (
    <AppLayout>
      <div className="flex flex-col h-full bg-gradient-to-br from-background via-background to-muted/20">
        {/* Header with blueprint-inspired design */}
        <div className="flex-none border-b border-border/60 bg-background/95 backdrop-blur-sm">
          <div className="px-6 py-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                    <Crosshair className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Visual Search</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      AI-powered pattern matching across your drawing sheets
                    </p>
                  </div>
                </div>
              </div>
              <Link
                to={`/projects/${projectId}/visual-search/patterns`}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Library className="h-4 w-4" />
                Pattern Library
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Main content - split layout */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex">
            {/* Left panel - Configuration */}
            <div className="w-[420px] flex-none border-r border-border/60 bg-background/50 overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Sheet Selection */}
                <Card className="border-border/60 shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-sm font-medium">Sheets to Search</CardTitle>
                    </div>
                    <CardDescription className="text-xs">
                      Select which drawing sheets to scan for matches
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SheetSelector
                      sheets={sheetsToSearch}
                      selectedIds={selectedSheetIds}
                      onSelectionChange={setSelectedSheetIds}
                      isLoading={sheetsLoading}
                    />
                  </CardContent>
                </Card>

                {/* Pattern Source */}
                <Card className="border-border/60 shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-sm font-medium">Pattern Source</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Tabs
                      value={patternSource}
                      onValueChange={(v) => setPatternSource(v as PatternSource)}
                    >
                      <TabsList className="grid w-full grid-cols-2 h-10">
                        <TabsTrigger value="library" className="gap-2 text-xs">
                          <Library className="h-3.5 w-3.5" />
                          From Library
                        </TabsTrigger>
                        <TabsTrigger value="selection" className="gap-2 text-xs">
                          <Crosshair className="h-3.5 w-3.5" />
                          New Selection
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="library" className="mt-4 space-y-4">
                        {/* Popular patterns */}
                        {popularPatterns && popularPatterns.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                              <span className="text-xs font-medium text-muted-foreground">
                                Popular Patterns
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {popularPatterns.slice(0, 5).map((pattern) => (
                                <Button
                                  key={pattern.id}
                                  variant={selectedPattern?.id === pattern.id ? 'default' : 'outline'}
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => handlePatternSelect(pattern)}
                                >
                                  {pattern.name}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* All patterns grid */}
                        <PatternGrid
                          patterns={patterns || []}
                          selectedId={selectedPattern?.id || null}
                          onSelect={handlePatternSelect}
                          isLoading={patternsLoading}
                        />

                        {selectedPattern && (
                          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium">{selectedPattern.name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Tolerance: {Math.round(selectedPattern.match_tolerance * 100)}%
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setSelectedPattern(null)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="selection" className="mt-4 space-y-4">
                        {searchState.patternImageBase64 ? (
                          <div className="space-y-3">
                            <div className="relative aspect-square rounded-lg overflow-hidden border border-border/60 bg-muted">
                              <img
                                src={`data:image/png;base64,${searchState.patternImageBase64}`}
                                alt="Selected pattern"
                                className="w-full h-full object-contain"
                              />
                              <Button
                                variant="secondary"
                                size="icon"
                                className="absolute top-2 right-2 h-8 w-8"
                                onClick={() => {
                                  searchState.setPatternImage('')
                                  searchState.setSelectedRegion({ x: 0, y: 0, width: 0, height: 0 })
                                }}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            </div>
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() => setShowSaveDialog(true)}
                            >
                              <Save className="h-4 w-4 mr-2" />
                              Save as Pattern
                            </Button>
                          </div>
                        ) : (
                          <div className="py-8 text-center">
                            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                              <Grid3X3 className="h-7 w-7 text-muted-foreground/50" />
                            </div>
                            <p className="text-sm text-muted-foreground mb-4">
                              Select a region from a drawing sheet
                            </p>
                            <Button
                              onClick={handleOpenSelectionTool}
                              disabled={!sheets || sheets.length === 0}
                            >
                              <Crosshair className="h-4 w-4 mr-2" />
                              Open Selection Tool
                            </Button>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                {/* Search Settings */}
                <Card className="border-border/60 shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-sm font-medium">Search Settings</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Match Tolerance</Label>
                        <Badge variant="outline" className="font-mono text-xs">
                          {Math.round(matchTolerance * 100)}%
                        </Badge>
                      </div>
                      <Slider
                        value={[matchTolerance]}
                        onValueChange={([v]) => setMatchTolerance(v)}
                        min={0.5}
                        max={1}
                        step={0.05}
                        className="py-2"
                      />
                      <p className="text-xs text-muted-foreground">
                        Higher values require closer matches. Lower values find more results.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Execute Search Button */}
                <Button
                  size="lg"
                  className="w-full h-12 text-base font-medium shadow-lg shadow-primary/20"
                  onClick={handleSearch}
                  disabled={!canSearch || searchState.isSearching}
                >
                  {searchState.isSearching ? (
                    <>
                      <div className="h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Searching {selectedSheetIds.size} sheets...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Execute Search
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Right panel - Results */}
            <div className="flex-1 overflow-y-auto bg-muted/20">
              <div className="p-6">
                {searchState.searchError && (
                  <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{searchState.searchError}</AlertDescription>
                  </Alert>
                )}

                {searchState.matches.length > 0 ? (
                  <div className="space-y-4">
                    {/* Results header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div>
                          <h2 className="text-lg font-medium">Search Complete</h2>
                          <p className="text-sm text-muted-foreground">
                            Found {searchState.matches.length} matches across{' '}
                            {new Set(searchState.matches.map((m) => m.sheet_id)).size} sheets
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleReset}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        New Search
                      </Button>
                    </div>

                    {/* Match gallery */}
                    <MatchGallery
                      matches={searchState.matches}
                      excludedIndexes={searchState.excludedMatchIds}
                      onToggleExclusion={searchState.toggleMatchExclusion}
                      onViewSheet={handleViewSheet}
                      className="border-border/60"
                    />
                  </div>
                ) : searchState.isSearching ? (
                  <div className="flex flex-col items-center justify-center h-[400px]">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                      <Search className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-primary" />
                    </div>
                    <p className="mt-6 text-lg font-medium">Searching for patterns...</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Analyzing {selectedSheetIds.size} drawing sheets
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[400px] text-center">
                    <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mb-6">
                      <Search className="h-10 w-10 text-muted-foreground/30" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">Ready to Search</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Select a pattern from your library or create a new selection, choose the sheets
                      to search, and click "Execute Search" to find all matching occurrences.
                    </p>
                    <div className="flex items-center gap-6 mt-8 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>Results in seconds</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        <span>AI-powered matching</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        <span>Multi-sheet search</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Selection Tool Dialog */}
        {showSelectionTool && selectedSheetForSelection?.full_image_url && (
          <Dialog open={showSelectionTool} onOpenChange={setShowSelectionTool}>
            <DialogContent className="max-w-[90vw] h-[90vh] p-0">
              <LassoSelectTool
                imageUrl={selectedSheetForSelection.full_image_url}
                onSelectionComplete={handleSelectionComplete}
                onCancel={() => setShowSelectionTool(false)}
                className="h-full"
              />
            </DialogContent>
          </Dialog>
        )}

        {/* Save Pattern Dialog */}
        <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Pattern</DialogTitle>
              <DialogDescription>
                Save this selection to your pattern library for quick reuse.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="pattern-name">Pattern Name</Label>
                <Input
                  id="pattern-name"
                  placeholder="e.g., Duplex Outlet Symbol"
                  value={patternName}
                  onChange={(e) => setPatternName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pattern-description">Description (optional)</Label>
                <Input
                  id="pattern-description"
                  placeholder="Brief description of this pattern"
                  value={patternDescription}
                  onChange={(e) => setPatternDescription(e.target.value)}
                />
              </div>
              {searchState.patternImageBase64 && (
                <div className="rounded-lg border border-border overflow-hidden">
                  <img
                    src={`data:image/png;base64,${searchState.patternImageBase64}`}
                    alt="Pattern preview"
                    className="w-full h-32 object-contain bg-muted"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSavePattern}
                disabled={!patternName.trim() || createPattern.isPending}
              >
                {createPattern.isPending ? 'Saving...' : 'Save Pattern'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  )
}

export default VisualSearchPage
