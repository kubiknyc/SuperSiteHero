// File: /src/features/documents/components/markup/SymbolLibrary.tsx
// Symbol library component with pre-built construction symbols for markup annotations

import { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Shapes,
  Search,
  RotateCw,
  Compass,
  ArrowUp,
  Target,
  Triangle,
  Circle,
  Square,
  Hexagon,
  Minus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ConstructionSymbol, SymbolCategory, SymbolAnnotation } from '../../types/markup'

// ============================================================
// SYMBOL DEFINITIONS
// ============================================================

export const CONSTRUCTION_SYMBOLS: ConstructionSymbol[] = [
  // General Symbols
  {
    id: 'north-arrow-1',
    name: 'North Arrow (Simple)',
    category: 'general',
    svgPath: 'M12 2L8 10h3v10h2V10h3L12 2z',
    viewBox: '0 0 24 24',
    defaultWidth: 40,
    defaultHeight: 50,
    description: 'Simple north arrow indicator',
    tags: ['orientation', 'direction', 'compass'],
  },
  {
    id: 'north-arrow-2',
    name: 'North Arrow (Circle)',
    category: 'general',
    svgPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3l4 7h-3v6h-2v-6H8l4-7z',
    viewBox: '0 0 24 24',
    defaultWidth: 50,
    defaultHeight: 50,
    description: 'North arrow with circle',
    tags: ['orientation', 'direction', 'compass'],
  },
  {
    id: 'north-arrow-3',
    name: 'North Arrow (Decorative)',
    category: 'general',
    svgPath: 'M12 1L8 9h2v5l-3 3 3 3v2h4v-2l3-3-3-3V9h2L12 1zm0 3.5L14 8h-4l2-3.5z',
    viewBox: '0 0 24 24',
    defaultWidth: 45,
    defaultHeight: 55,
    description: 'Decorative north arrow',
    tags: ['orientation', 'direction', 'compass'],
  },
  {
    id: 'section-marker',
    name: 'Section Cut Marker',
    category: 'general',
    svgPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm0-14v12M2 12h20',
    viewBox: '0 0 24 24',
    defaultWidth: 40,
    defaultHeight: 40,
    description: 'Section cut reference marker',
    tags: ['section', 'cut', 'reference'],
  },
  {
    id: 'detail-bubble',
    name: 'Detail Bubble',
    category: 'general',
    svgPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z',
    viewBox: '0 0 24 24',
    defaultWidth: 50,
    defaultHeight: 50,
    description: 'Detail reference bubble',
    tags: ['detail', 'reference', 'callout'],
  },
  {
    id: 'elevation-marker',
    name: 'Elevation Marker',
    category: 'general',
    svgPath: 'M12 2L4 12h5v8h6v-8h5L12 2zm0 3l5 7h-3v6h-4v-6H7l5-7z',
    viewBox: '0 0 24 24',
    defaultWidth: 40,
    defaultHeight: 45,
    description: 'Elevation reference marker',
    tags: ['elevation', 'reference', 'height'],
  },
  {
    id: 'revision-triangle',
    name: 'Revision Triangle',
    category: 'general',
    svgPath: 'M12 2L2 22h20L12 2zm0 4l7.5 14h-15L12 6z',
    viewBox: '0 0 24 24',
    defaultWidth: 30,
    defaultHeight: 30,
    description: 'Revision marker triangle',
    tags: ['revision', 'change', 'update'],
  },
  {
    id: 'revision-cloud',
    name: 'Revision Cloud',
    category: 'general',
    svgPath: 'M4 12c0-2.2 1.8-4 4-4 .5 0 1 .1 1.4.3C10 6.3 11.9 5 14 5c2.8 0 5 2.2 5 5 0 .3 0 .6-.1.9 1.2.5 2.1 1.7 2.1 3.1 0 1.9-1.5 3.5-3.4 3.9-.5.1-1 .1-1.6.1H6c-2.2 0-4-1.8-4-4s1.8-4 4-4c0-1 .8-1.9 1.9-2H8c-2.2 0-4 1.8-4 4z',
    viewBox: '0 0 24 24',
    defaultWidth: 60,
    defaultHeight: 40,
    description: 'Revision cloud marker',
    tags: ['revision', 'change', 'cloud'],
  },
  {
    id: 'leader-arrow',
    name: 'Leader Line Arrow',
    category: 'general',
    svgPath: 'M4 12h14M14 7l5 5-5 5',
    viewBox: '0 0 24 24',
    defaultWidth: 80,
    defaultHeight: 20,
    description: 'Leader line with arrow',
    tags: ['leader', 'arrow', 'pointer'],
  },

  // Architectural Symbols
  {
    id: 'door-swing',
    name: 'Door Swing',
    category: 'architectural',
    svgPath: 'M4 4v16h2V4H4zm2 0c0 8.84 7.16 16 16 16v-2c-7.73 0-14-6.27-14-14H6z',
    viewBox: '0 0 24 24',
    defaultWidth: 45,
    defaultHeight: 45,
    description: 'Door swing indicator',
    tags: ['door', 'swing', 'opening'],
  },
  {
    id: 'window-tag',
    name: 'Window Tag',
    category: 'architectural',
    svgPath: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-7-2h2v-4h4v-2h-4V7h-2v4H8v2h4v4z',
    viewBox: '0 0 24 24',
    defaultWidth: 35,
    defaultHeight: 35,
    description: 'Window identification tag',
    tags: ['window', 'tag', 'identification'],
  },
  {
    id: 'column-grid',
    name: 'Column Grid Marker',
    category: 'architectural',
    svgPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z',
    viewBox: '0 0 24 24',
    defaultWidth: 30,
    defaultHeight: 30,
    description: 'Column grid line marker',
    tags: ['column', 'grid', 'structural'],
  },
  {
    id: 'stair-arrow',
    name: 'Stair Direction',
    category: 'architectural',
    svgPath: 'M4 18h4v-2H4v2zm0-4h8v-2H4v2zm0-4h12V8H4v2zm0-4h16V4H4v2zm14 12l4-4-4-4v8z',
    viewBox: '0 0 24 24',
    defaultWidth: 50,
    defaultHeight: 30,
    description: 'Stair direction arrow',
    tags: ['stair', 'direction', 'up', 'down'],
  },
  {
    id: 'room-tag',
    name: 'Room Tag',
    category: 'architectural',
    svgPath: 'M12 2L4 6v12l8 4 8-4V6l-8-4zm0 2.3L18 7v10l-6 3-6-3V7l6-2.7z',
    viewBox: '0 0 24 24',
    defaultWidth: 40,
    defaultHeight: 40,
    description: 'Room identification tag',
    tags: ['room', 'tag', 'identification', 'hexagon'],
  },

  // MEP Symbols
  {
    id: 'electrical-outlet',
    name: 'Electrical Outlet',
    category: 'mep',
    svgPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14H8v-4h2v4zm4 0h-2v-4h2v4z',
    viewBox: '0 0 24 24',
    defaultWidth: 25,
    defaultHeight: 25,
    description: 'Electrical outlet symbol',
    tags: ['electrical', 'outlet', 'power'],
  },
  {
    id: 'light-fixture',
    name: 'Light Fixture',
    category: 'mep',
    svgPath: 'M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z',
    viewBox: '0 0 24 24',
    defaultWidth: 25,
    defaultHeight: 30,
    description: 'Light fixture symbol',
    tags: ['light', 'fixture', 'electrical', 'lighting'],
  },
  {
    id: 'hvac-supply',
    name: 'HVAC Supply Diffuser',
    category: 'mep',
    svgPath: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-4-4h3V9h2v4h3l-4 4z',
    viewBox: '0 0 24 24',
    defaultWidth: 30,
    defaultHeight: 30,
    description: 'HVAC supply air diffuser',
    tags: ['hvac', 'supply', 'diffuser', 'mechanical'],
  },
  {
    id: 'hvac-return',
    name: 'HVAC Return Grille',
    category: 'mep',
    svgPath: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 4l4 4h-3v4h-2v-4H8l4-4z',
    viewBox: '0 0 24 24',
    defaultWidth: 30,
    defaultHeight: 30,
    description: 'HVAC return air grille',
    tags: ['hvac', 'return', 'grille', 'mechanical'],
  },
  {
    id: 'plumbing-fixture',
    name: 'Plumbing Fixture',
    category: 'mep',
    svgPath: 'M12 2C6.48 2 2 6.48 2 12v8h4v-6c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2v6h4v-8c0-5.52-4.48-10-10-10z',
    viewBox: '0 0 24 24',
    defaultWidth: 35,
    defaultHeight: 30,
    description: 'General plumbing fixture',
    tags: ['plumbing', 'fixture', 'sink'],
  },
  {
    id: 'fire-sprinkler',
    name: 'Fire Sprinkler',
    category: 'mep',
    svgPath: 'M12 3L4 9v12h16V9l-8-6zm0 2.5l6 4.5v9H6v-9l6-4.5zM12 12c-1.1 0-2 .9-2 2v2h4v-2c0-1.1-.9-2-2-2z',
    viewBox: '0 0 24 24',
    defaultWidth: 25,
    defaultHeight: 30,
    description: 'Fire sprinkler head',
    tags: ['fire', 'sprinkler', 'safety', 'protection'],
  },

  // Structural Symbols
  {
    id: 'structural-column',
    name: 'Structural Column',
    category: 'structural',
    svgPath: 'M6 4h12v2H6V4zm0 14h12v2H6v-2zm2-12v10h8V6H8zm2 2h4v6h-4V8z',
    viewBox: '0 0 24 24',
    defaultWidth: 30,
    defaultHeight: 40,
    description: 'Structural column marker',
    tags: ['column', 'structural', 'support'],
  },
  {
    id: 'beam-marker',
    name: 'Beam Marker',
    category: 'structural',
    svgPath: 'M2 12h20M6 8v8M18 8v8',
    viewBox: '0 0 24 24',
    defaultWidth: 60,
    defaultHeight: 25,
    description: 'Structural beam indicator',
    tags: ['beam', 'structural', 'framing'],
  },
  {
    id: 'footing-marker',
    name: 'Footing Marker',
    category: 'structural',
    svgPath: 'M4 18h16v2H4v-2zm2-4h12v2H6v-2zm2-4h8v2H8v-2zm2-4h4v2h-4V6z',
    viewBox: '0 0 24 24',
    defaultWidth: 40,
    defaultHeight: 35,
    description: 'Foundation footing marker',
    tags: ['footing', 'foundation', 'structural'],
  },
  {
    id: 'weld-symbol',
    name: 'Weld Symbol',
    category: 'structural',
    svgPath: 'M4 12h6l3-6 3 6h6M10 12v6M14 12v6',
    viewBox: '0 0 24 24',
    defaultWidth: 50,
    defaultHeight: 30,
    description: 'Welding symbol indicator',
    tags: ['weld', 'steel', 'connection'],
  },

  // Civil Symbols
  {
    id: 'bench-mark',
    name: 'Benchmark',
    category: 'civil',
    svgPath: 'M12 2L4 12l8 10 8-10L12 2zm0 4l5 6-5 6.5L7 12l5-6z',
    viewBox: '0 0 24 24',
    defaultWidth: 30,
    defaultHeight: 35,
    description: 'Survey benchmark',
    tags: ['benchmark', 'survey', 'elevation'],
  },
  {
    id: 'property-corner',
    name: 'Property Corner',
    category: 'civil',
    svgPath: 'M12 2L2 12l10 10 10-10L12 2zm0 3l7 7-7 7-7-7 7-7z',
    viewBox: '0 0 24 24',
    defaultWidth: 25,
    defaultHeight: 25,
    description: 'Property corner marker',
    tags: ['property', 'corner', 'survey', 'boundary'],
  },
  {
    id: 'manhole',
    name: 'Manhole',
    category: 'civil',
    svgPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-1-13h2v2h-2V7zm0 4h2v6h-2v-6z',
    viewBox: '0 0 24 24',
    defaultWidth: 30,
    defaultHeight: 30,
    description: 'Manhole cover',
    tags: ['manhole', 'utility', 'drainage'],
  },
  {
    id: 'catch-basin',
    name: 'Catch Basin',
    category: 'civil',
    svgPath: 'M4 4h16v16H4V4zm2 2v12h12V6H6zm2 2h8v8H8V8z',
    viewBox: '0 0 24 24',
    defaultWidth: 30,
    defaultHeight: 30,
    description: 'Catch basin/drain',
    tags: ['catch basin', 'drain', 'storm', 'utility'],
  },
  {
    id: 'contour-line',
    name: 'Contour Index',
    category: 'civil',
    svgPath: 'M2 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0',
    viewBox: '0 0 24 24',
    defaultWidth: 80,
    defaultHeight: 20,
    description: 'Contour line marker',
    tags: ['contour', 'elevation', 'topography'],
  },
]

// Category labels and icons
const CATEGORY_INFO: Record<SymbolCategory, { label: string; icon: React.ReactNode }> = {
  general: { label: 'General', icon: <Shapes className="w-4 h-4" /> },
  architectural: { label: 'Architectural', icon: <Square className="w-4 h-4" /> },
  mep: { label: 'MEP', icon: <Circle className="w-4 h-4" /> },
  structural: { label: 'Structural', icon: <Triangle className="w-4 h-4" /> },
  civil: { label: 'Civil', icon: <Hexagon className="w-4 h-4" /> },
}

// ============================================================
// COMPONENT
// ============================================================

interface SymbolLibraryProps {
  onSymbolSelect: (symbol: ConstructionSymbol, options: { width: number; height: number; rotation: number; color: string }) => void
  selectedColor?: string
  disabled?: boolean
  className?: string
}

export function SymbolLibrary({
  onSymbolSelect,
  selectedColor = '#000000',
  disabled = false,
  className,
}: SymbolLibraryProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<SymbolCategory | 'all'>('all')
  const [previewSymbol, setPreviewSymbol] = useState<ConstructionSymbol | null>(null)
  const [customWidth, setCustomWidth] = useState(40)
  const [customHeight, setCustomHeight] = useState(40)
  const [rotation, setRotation] = useState(0)
  const [symbolColor, setSymbolColor] = useState(selectedColor)

  // Filter symbols based on search and category
  const filteredSymbols = useMemo(() => {
    let symbols = CONSTRUCTION_SYMBOLS

    if (selectedCategory !== 'all') {
      symbols = symbols.filter(s => s.category === selectedCategory)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      symbols = symbols.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query) ||
        s.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }

    return symbols
  }, [selectedCategory, searchQuery])

  // Group symbols by category
  const symbolsByCategory = useMemo(() => {
    const grouped: Record<SymbolCategory, ConstructionSymbol[]> = {
      general: [],
      architectural: [],
      mep: [],
      structural: [],
      civil: [],
    }

    filteredSymbols.forEach(symbol => {
      grouped[symbol.category].push(symbol)
    })

    return grouped
  }, [filteredSymbols])

  // Handle symbol selection for preview
  const handleSymbolPreview = useCallback((symbol: ConstructionSymbol) => {
    setPreviewSymbol(symbol)
    setCustomWidth(symbol.defaultWidth)
    setCustomHeight(symbol.defaultHeight)
    setSymbolColor(selectedColor)
    setRotation(0)
  }, [selectedColor])

  // Handle final symbol placement
  const handlePlaceSymbol = useCallback(() => {
    if (!previewSymbol) return

    onSymbolSelect(previewSymbol, {
      width: customWidth,
      height: customHeight,
      rotation,
      color: symbolColor,
    })

    setIsOpen(false)
    setPreviewSymbol(null)
  }, [previewSymbol, customWidth, customHeight, rotation, symbolColor, onSymbolSelect])

  // Reset rotation helper
  const rotationPresets = [0, 45, 90, 135, 180, 225, 270, 315]

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn('flex items-center gap-2', className)}
        >
          <Shapes className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">Symbols</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="start">
        <div className="flex flex-col h-[500px]">
          {/* Header with search */}
          <div className="p-3 border-b space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Symbol Library</Label>
              {previewSymbol && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setPreviewSymbol(null)}
                  className="text-xs"
                >
                  Back to Library
                </Button>
              )}
            </div>
            {!previewSymbol && (
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search symbols..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
            )}
          </div>

          {/* Main content */}
          {previewSymbol ? (
            // Symbol customization view
            <div className="flex-1 p-4 space-y-4">
              <div className="flex items-center justify-center p-6 bg-muted rounded-lg">
                <svg
                  viewBox={previewSymbol.viewBox}
                  style={{
                    width: Math.min(customWidth * 2, 150),
                    height: Math.min(customHeight * 2, 150),
                    transform: `rotate(${rotation}deg)`,
                  }}
                  fill="none"
                  stroke={symbolColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={previewSymbol.svgPath} />
                </svg>
              </div>

              <div className="text-center">
                <p className="font-medium">{previewSymbol.name}</p>
                <p className="text-xs text-muted-foreground">{previewSymbol.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Width: {customWidth}px</Label>
                  <Slider
                    value={[customWidth]}
                    onValueChange={([v]) => setCustomWidth(v)}
                    min={10}
                    max={200}
                    step={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Height: {customHeight}px</Label>
                  <Slider
                    value={[customHeight]}
                    onValueChange={([v]) => setCustomHeight(v)}
                    min={10}
                    max={200}
                    step={5}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Rotation: {rotation} degrees</Label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[rotation]}
                    onValueChange={([v]) => setRotation(v)}
                    min={0}
                    max={360}
                    step={15}
                    className="flex-1"
                  />
                  <div className="flex gap-1">
                    {rotationPresets.slice(0, 4).map(deg => (
                      <Tooltip key={deg}>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant={rotation === deg ? 'default' : 'outline'}
                            className="w-8 h-8 p-0"
                            onClick={() => setRotation(deg)}
                          >
                            <RotateCw
                              className="w-3 h-3"
                              style={{ transform: `rotate(${deg}deg)` }}
                            />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{deg} deg</TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={symbolColor}
                    onChange={(e) => setSymbolColor(e.target.value)}
                    className="w-8 h-8 rounded border cursor-pointer"
                  />
                  <Input
                    value={symbolColor}
                    onChange={(e) => setSymbolColor(e.target.value)}
                    className="h-8 font-mono text-xs"
                    placeholder="#000000"
                  />
                </div>
              </div>

              <Button className="w-full" onClick={handlePlaceSymbol}>
                <Target className="w-4 h-4 mr-2" />
                Place Symbol on Drawing
              </Button>
            </div>
          ) : (
            // Symbol library view
            <>
              <Tabs
                value={selectedCategory}
                onValueChange={(v) => setSelectedCategory(v as SymbolCategory | 'all')}
                className="flex-1 flex flex-col"
              >
                <TabsList className="grid grid-cols-6 gap-1 m-2">
                  <TabsTrigger value="all" className="text-xs px-2">All</TabsTrigger>
                  {(Object.keys(CATEGORY_INFO) as SymbolCategory[]).map(cat => (
                    <Tooltip key={cat}>
                      <TooltipTrigger asChild>
                        <TabsTrigger value={cat} className="text-xs px-2">
                          {CATEGORY_INFO[cat].icon}
                        </TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent>{CATEGORY_INFO[cat].label}</TooltipContent>
                    </Tooltip>
                  ))}
                </TabsList>

                <TabsContent value={selectedCategory} className="flex-1 m-0">
                  <ScrollArea className="h-[350px]">
                    <div className="p-2 space-y-4">
                      {selectedCategory === 'all' ? (
                        // Show all categories
                        (Object.keys(symbolsByCategory) as SymbolCategory[]).map(cat => {
                          if (symbolsByCategory[cat].length === 0) return null
                          return (
                            <div key={cat} className="space-y-2">
                              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                {CATEGORY_INFO[cat].icon}
                                <span>{CATEGORY_INFO[cat].label}</span>
                              </div>
                              <div className="grid grid-cols-4 gap-2">
                                {symbolsByCategory[cat].map(symbol => (
                                  <SymbolButton
                                    key={symbol.id}
                                    symbol={symbol}
                                    onSelect={handleSymbolPreview}
                                    color={selectedColor}
                                  />
                                ))}
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        // Show single category
                        <div className="grid grid-cols-4 gap-2">
                          {filteredSymbols.map(symbol => (
                            <SymbolButton
                              key={symbol.id}
                              symbol={symbol}
                              onSelect={handleSymbolPreview}
                              color={selectedColor}
                            />
                          ))}
                        </div>
                      )}

                      {filteredSymbols.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <Shapes className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No symbols found</p>
                          <p className="text-xs">Try a different search term</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Individual symbol button component
interface SymbolButtonProps {
  symbol: ConstructionSymbol
  onSelect: (symbol: ConstructionSymbol) => void
  color: string
}

function SymbolButton({ symbol, onSelect, color }: SymbolButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => onSelect(symbol)}
          className="flex flex-col items-center justify-center p-2 rounded-lg border border-transparent hover:border-input hover:bg-muted transition-colors aspect-square"
        >
          <svg
            viewBox={symbol.viewBox}
            className="w-8 h-8"
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={symbol.svgPath} />
          </svg>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p className="font-medium">{symbol.name}</p>
        {symbol.description && (
          <p className="text-xs text-muted-foreground">{symbol.description}</p>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

export default SymbolLibrary
