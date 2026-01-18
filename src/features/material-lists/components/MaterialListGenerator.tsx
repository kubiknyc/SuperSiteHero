// File: /src/features/material-lists/components/MaterialListGenerator.tsx
// Component for generating material lists from takeoff data

import { useState, useMemo, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import {
  Button,
  Input,
  Badge,
  Checkbox,
  NativeSelect,
  Textarea,
  Label,
  Slider,
  Skeleton,
  Alert,
  AlertDescription,
} from '@/components/ui'
import {
  Package,
  Plus,
  ListFilter,
  Calculator,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Settings,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  MaterialList,
  MaterialListInsert,
  MaterialListItem,
  MaterialListStatus,
} from '@/types/drawing-sheets'

// Mock takeoff item type - would come from takeoffs feature
interface TakeoffItem {
  id: string
  name: string
  quantity: number
  unit: string
  category: string | null
  assemblyId: string | null
  sheetId: string | null
}

interface MaterialListGeneratorProps {
  projectId: string
  companyId: string
  takeoffId?: string
  takeoffItems?: TakeoffItem[]
  onGenerate: (materialList: MaterialListInsert) => Promise<void>
  onCancel?: () => void
  className?: string
}

type Step = 'source' | 'configure' | 'review' | 'complete'

// Default waste factors by category
const DEFAULT_WASTE_FACTORS: Record<string, number> = {
  Electrical: 0.1,
  Plumbing: 0.1,
  HVAC: 0.1,
  Structural: 0.05,
  Finishes: 0.15,
  Hardware: 0.05,
  Equipment: 0.02,
  Other: 0.1,
}

/**
 * MaterialListGenerator Component
 *
 * Multi-step wizard for generating material lists from takeoff data.
 *
 * Steps:
 * 1. Source Selection - Choose takeoff items to include
 * 2. Configuration - Set waste factors, name, description
 * 3. Review - Preview generated list
 * 4. Complete - Success confirmation
 */
export function MaterialListGenerator({
  projectId,
  companyId,
  takeoffId,
  takeoffItems = [],
  onGenerate,
  onCancel,
  className,
}: MaterialListGeneratorProps) {
  // Step state
  const [currentStep, setCurrentStep] = useState<Step>('source')

  // Source selection state
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(
    new Set(takeoffItems.map((item) => item.id))
  )
  const [filterCategory, setFilterCategory] = useState<string>('')

  // Configuration state
  const [listName, setListName] = useState('')
  const [listDescription, setListDescription] = useState('')
  const [wasteFactors, setWasteFactors] = useState<Record<string, number>>(DEFAULT_WASTE_FACTORS)
  const [globalWasteFactor, setGlobalWasteFactor] = useState(0.1)
  const [useGlobalWaste, setUseGlobalWaste] = useState(false)

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedList, setGeneratedList] = useState<MaterialListInsert | null>(null)

  // Get unique categories from takeoff items
  const categories = useMemo(() => {
    const cats = new Set<string>()
    takeoffItems.forEach((item) => {
      if (item.category) {cats.add(item.category)}
    })
    return Array.from(cats).sort()
  }, [takeoffItems])

  // Filter takeoff items
  const filteredItems = useMemo(() => {
    if (!filterCategory) {return takeoffItems}
    return takeoffItems.filter((item) => item.category === filterCategory)
  }, [takeoffItems, filterCategory])

  // Get selected items
  const selectedItems = useMemo(() => {
    return takeoffItems.filter((item) => selectedItemIds.has(item.id))
  }, [takeoffItems, selectedItemIds])

  // Toggle item selection
  const toggleItem = useCallback((itemId: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }, [])

  // Select all visible items
  const selectAll = useCallback(() => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev)
      filteredItems.forEach((item) => next.add(item.id))
      return next
    })
  }, [filteredItems])

  // Deselect all visible items
  const deselectAll = useCallback(() => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev)
      filteredItems.forEach((item) => next.delete(item.id))
      return next
    })
  }, [filteredItems])

  // Update category waste factor
  const updateCategoryWasteFactor = useCallback((category: string, factor: number) => {
    setWasteFactors((prev) => ({ ...prev, [category]: factor }))
  }, [])

  // Generate material list items
  const generateListItems = useCallback((): MaterialListItem[] => {
    // Group selected items by name and unit to aggregate
    const aggregated = new Map<string, MaterialListItem>()

    for (const item of selectedItems) {
      const key = `${item.name}|${item.unit}`
      const existing = aggregated.get(key)

      const wasteFactor = useGlobalWaste
        ? globalWasteFactor
        : wasteFactors[item.category || 'Other'] || 0.1

      if (existing) {
        // Aggregate quantities
        existing.quantity += item.quantity
        existing.order_quantity = Math.ceil(existing.quantity * (1 + wasteFactor))
        existing.source_takeoff_items.push(item.id)
      } else {
        const orderQty = Math.ceil(item.quantity * (1 + wasteFactor))

        aggregated.set(key, {
          id: `ml-item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          waste_factor: wasteFactor,
          order_quantity: orderQty,
          category: item.category,
          source_takeoff_items: [item.id],
        })
      }
    }

    return Array.from(aggregated.values())
  }, [selectedItems, wasteFactors, globalWasteFactor, useGlobalWaste])

  // Calculate totals for preview
  const previewTotals = useMemo(() => {
    const items = generateListItems()
    return {
      lineItems: items.length,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      totalOrderQuantity: items.reduce((sum, item) => sum + item.order_quantity, 0),
      byCategory: items.reduce(
        (acc, item) => {
          const cat = item.category || 'Uncategorized'
          acc[cat] = (acc[cat] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      ),
    }
  }, [generateListItems])

  // Handle step navigation
  const goToStep = useCallback((step: Step) => {
    setError(null)
    setCurrentStep(step)
  }, [])

  // Handle generate
  const handleGenerate = useCallback(async () => {
    if (!listName.trim()) {
      setError('Please enter a name for the material list')
      return
    }

    if (selectedItemIds.size === 0) {
      setError('Please select at least one item')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const items = generateListItems()

      const materialList: MaterialListInsert = {
        project_id: projectId,
        company_id: companyId,
        name: listName.trim(),
        description: listDescription.trim() || null,
        status: 'draft' as MaterialListStatus,
        takeoff_id: takeoffId || null,
        items,
        waste_factors: useGlobalWaste
          ? { global: globalWasteFactor }
          : wasteFactors,
        totals: {
          by_category: previewTotals.byCategory,
          total_items: previewTotals.totalQuantity,
          total_line_items: previewTotals.lineItems,
        },
        export_history: [],
        created_by: null, // Will be set by the API
        deleted_at: null,
      }

      await onGenerate(materialList)
      setGeneratedList(materialList)
      setCurrentStep('complete')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate material list')
    } finally {
      setIsGenerating(false)
    }
  }, [
    listName,
    listDescription,
    selectedItemIds,
    projectId,
    companyId,
    takeoffId,
    generateListItems,
    wasteFactors,
    globalWasteFactor,
    useGlobalWaste,
    previewTotals,
    onGenerate,
  ])

  // Render step indicator
  const renderStepIndicator = () => {
    const steps: { key: Step; label: string }[] = [
      { key: 'source', label: 'Select Items' },
      { key: 'configure', label: 'Configure' },
      { key: 'review', label: 'Review' },
      { key: 'complete', label: 'Complete' },
    ]

    const currentIndex = steps.findIndex((s) => s.key === currentStep)

    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {steps.map((step, index) => (
          <div key={step.key} className="flex items-center">
            <div
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors',
                index < currentIndex && 'bg-primary text-primary-foreground',
                index === currentIndex && 'bg-primary text-primary-foreground ring-2 ring-offset-2 ring-primary',
                index > currentIndex && 'bg-muted text-muted-foreground'
              )}
            >
              {index < currentIndex ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
            </div>
            <span
              className={cn(
                'ml-2 text-sm hidden sm:inline',
                index === currentIndex && 'font-medium'
              )}
            >
              {step.label}
            </span>
            {index < steps.length - 1 && (
              <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <Card className={cn('max-w-3xl mx-auto', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Generate Material List
        </CardTitle>
        <CardDescription>
          Create a procurement-ready material list from your takeoff data
        </CardDescription>
      </CardHeader>

      <CardContent>
        {renderStepIndicator()}

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Source Selection */}
        {currentStep === 'source' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <NativeSelect
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-40"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </NativeSelect>

                <span className="text-sm text-muted-foreground">
                  {selectedItemIds.size} of {takeoffItems.length} selected
                </span>
              </div>

              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAll}>
                  Deselect All
                </Button>
              </div>
            </div>

            <div className="border rounded-lg max-h-[400px] overflow-y-auto">
              {filteredItems.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No takeoff items available
                </div>
              ) : (
                <div className="divide-y">
                  {filteredItems.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedItemIds.has(item.id)}
                        onCheckedChange={() => toggleItem(item.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.quantity} {item.unit}
                          {item.category && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              {item.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Configuration */}
        {currentStep === 'configure' && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="list-name">List Name *</Label>
                <Input
                  id="list-name"
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  placeholder="e.g., Phase 1 Materials"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="list-description">Description</Label>
                <Textarea
                  id="list-description"
                  value={listDescription}
                  onChange={(e) => setListDescription(e.target.value)}
                  placeholder="Optional description for this material list"
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium flex items-center gap-2 mb-4">
                <Calculator className="h-4 w-4" />
                Waste Factors
              </h4>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="use-global"
                    checked={useGlobalWaste}
                    onCheckedChange={(checked) => setUseGlobalWaste(!!checked)}
                  />
                  <Label htmlFor="use-global">Use single waste factor for all items</Label>
                </div>

                {useGlobalWaste ? (
                  <div className="flex items-center gap-4">
                    <Label className="text-sm">Global Waste Factor:</Label>
                    <Slider
                      value={[globalWasteFactor * 100]}
                      onValueChange={([value]) => setGlobalWasteFactor(value / 100)}
                      min={0}
                      max={50}
                      step={1}
                      className="w-40"
                    />
                    <Badge variant="outline">{Math.round(globalWasteFactor * 100)}%</Badge>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {categories.map((category) => (
                      <div key={category} className="flex items-center gap-2">
                        <span className="text-sm w-24 truncate">{category}:</span>
                        <Input
                          type="number"
                          min="0"
                          max="0.5"
                          step="0.01"
                          value={wasteFactors[category] || 0.1}
                          onChange={(e) =>
                            updateCategoryWasteFactor(category, parseFloat(e.target.value) || 0)
                          }
                          className="w-20 h-8"
                        />
                        <span className="text-xs text-muted-foreground">
                          ({Math.round((wasteFactors[category] || 0.1) * 100)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {currentStep === 'review' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">List Name</div>
                <div className="font-medium">{listName || 'Untitled'}</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">Items Selected</div>
                <div className="font-medium">{selectedItemIds.size}</div>
              </div>
            </div>

            <div className="p-4 border rounded-lg space-y-3">
              <h4 className="font-medium">Summary</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Line Items</div>
                  <div className="text-2xl font-bold">{previewTotals.lineItems}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Total Quantity</div>
                  <div className="text-2xl font-bold">
                    {previewTotals.totalQuantity.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Order Quantity</div>
                  <div className="text-2xl font-bold text-primary">
                    {previewTotals.totalOrderQuantity.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">By Category</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(previewTotals.byCategory).map(([category, count]) => (
                  <Badge key={category} variant="secondary">
                    {category}: {count}
                  </Badge>
                ))}
              </div>
            </div>

            {listDescription && (
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-1">Description</h4>
                <p className="text-sm text-muted-foreground">{listDescription}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Complete */}
        {currentStep === 'complete' && generatedList && (
          <div className="text-center py-8">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Material List Created!</h3>
            <p className="text-muted-foreground mb-6">
              "{generatedList.name}" has been created with {generatedList.items.length} items
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={onCancel}>
                Create Another
              </Button>
              <Button>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                View Material List
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {currentStep !== 'complete' && (
        <CardFooter className="flex justify-between border-t">
          <Button
            variant="ghost"
            onClick={() => {
              if (currentStep === 'source') {
                onCancel?.()
              } else if (currentStep === 'configure') {
                goToStep('source')
              } else if (currentStep === 'review') {
                goToStep('configure')
              }
            }}
          >
            {currentStep === 'source' ? 'Cancel' : 'Back'}
          </Button>

          {currentStep === 'source' && (
            <Button
              onClick={() => goToStep('configure')}
              disabled={selectedItemIds.size === 0}
            >
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}

          {currentStep === 'configure' && (
            <Button onClick={() => goToStep('review')} disabled={!listName.trim()}>
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}

          {currentStep === 'review' && (
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Material List
                </>
              )}
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  )
}

export default MaterialListGenerator
