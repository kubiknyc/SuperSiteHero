/**
 * Chart Builder Component
 *
 * Provides UI for configuring chart visualizations in reports.
 * Allows selection of chart type, fields, aggregation, and styling options.
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { BarChart3, LineChart, PieChart, AreaChart as AreaChartIcon, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  ChartConfiguration,
  ChartType,
  ChartColorScheme,
  ReportFieldDefinition,
  ReportAggregationType,
} from '@/types/report-builder'
import { CHART_TYPE_CONFIG, CHART_COLOR_SCHEMES, AGGREGATION_CONFIG } from '@/types/report-builder'
import { ChartRenderer } from './ChartRenderer'

interface ChartBuilderProps {
  availableFields: ReportFieldDefinition[]
  chartConfig: ChartConfiguration | null
  previewData?: Record<string, unknown>[]
  onConfigChange: (config: ChartConfiguration | null) => void
  className?: string
}

const CHART_ICONS: Record<ChartType, React.ComponentType<any>> = {
  bar: BarChart3,
  line: LineChart,
  pie: PieChart,
  area: AreaChartIcon,
}

export function ChartBuilder({
  availableFields,
  chartConfig,
  previewData = [],
  onConfigChange,
  className,
}: ChartBuilderProps) {
  const [localConfig, setLocalConfig] = useState<ChartConfiguration | null>(chartConfig)
  const [showPreview, setShowPreview] = useState(true)

  // Sync with parent when chartConfig changes
  useEffect(() => {
    setLocalConfig(chartConfig)
  }, [chartConfig])

  // Update parent when local config changes
  useEffect(() => {
    onConfigChange(localConfig)
  }, [localConfig, onConfigChange])

  // Get fields that can be used for grouping (categorical fields)
  const groupableFields = availableFields.filter(
    (f) => f.is_groupable && ['text', 'status', 'date', 'datetime', 'user', 'project', 'company'].includes(f.field_type)
  )

  // Get fields that can be used for values (numeric fields)
  const valueFields = availableFields.filter(
    (f) => ['number', 'currency'].includes(f.field_type)
  )

  // Get applicable aggregations for selected value field
  const applicableAggregations = localConfig?.valueField
    ? AGGREGATION_CONFIG.filter((agg) => {
        const field = availableFields.find((f) => f.field_name === localConfig.valueField)
        return field && agg.applicableTo.includes(field.field_type)
      })
    : AGGREGATION_CONFIG

  const handleTypeChange = (type: ChartType) => {
    setLocalConfig({
      ...localConfig,
      type,
      groupByField: localConfig?.groupByField || '',
      valueField: localConfig?.valueField || '',
      aggregation: localConfig?.aggregation || 'sum',
    })
  }

  const handleFieldChange = (field: 'groupByField' | 'valueField', value: string) => {
    if (!localConfig) {return}
    setLocalConfig({
      ...localConfig,
      [field]: value,
    })
  }

  const handleAggregationChange = (value: ReportAggregationType) => {
    if (!localConfig) {return}
    setLocalConfig({
      ...localConfig,
      aggregation: value,
    })
  }

  const handleColorSchemeChange = (value: ChartColorScheme) => {
    if (!localConfig) {return}
    setLocalConfig({
      ...localConfig,
      colorScheme: value,
      customColors: value === 'custom' ? localConfig.customColors : undefined,
    })
  }

  const handleOptionChange = (
    option: keyof ChartConfiguration,
    value: string | boolean | number
  ) => {
    if (!localConfig) {return}
    setLocalConfig({
      ...localConfig,
      [option]: value,
    })
  }

  const handleRemoveChart = () => {
    setLocalConfig(null)
  }

  const canCreateChart = localConfig && localConfig.groupByField && localConfig.valueField
  const canPreview = canCreateChart && previewData.length > 0

  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-2 gap-6', className)}>
      {/* Configuration Panel */}
      <div className="space-y-4">
        {/* Chart Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Chart Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {CHART_TYPE_CONFIG.map((type) => {
                const Icon = CHART_ICONS[type.value]
                const isSelected = localConfig?.type === type.value
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleTypeChange(type.value)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                      isSelected
                        ? 'border-blue-500 bg-blue-50 text-primary-hover'
                        : 'border-border hover:border-input text-secondary'
                    )}
                  >
                    <Icon className="h-8 w-8" />
                    <div className="text-center">
                      <p className="font-medium text-sm">{type.label}</p>
                      <p className="text-xs text-muted mt-1">{type.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Data Configuration */}
        {localConfig && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Data Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="groupBy">Group By (X-Axis)</Label>
                <Select
                  value={localConfig.groupByField}
                  onValueChange={(v) => handleFieldChange('groupByField', v)}
                >
                  <SelectTrigger id="groupBy">
                    <SelectValue placeholder="Select field..." />
                  </SelectTrigger>
                  <SelectContent>
                    {groupableFields.map((field) => (
                      <SelectItem key={field.field_name} value={field.field_name}>
                        {field.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted mt-1">
                  Field to group data by (categories)
                </p>
              </div>

              <div>
                <Label htmlFor="valueField">Value Field (Y-Axis)</Label>
                <Select
                  value={localConfig.valueField}
                  onValueChange={(v) => handleFieldChange('valueField', v)}
                >
                  <SelectTrigger id="valueField">
                    <SelectValue placeholder="Select field..." />
                  </SelectTrigger>
                  <SelectContent>
                    {valueFields.map((field) => (
                      <SelectItem key={field.field_name} value={field.field_name}>
                        {field.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted mt-1">
                  Numeric field to visualize
                </p>
              </div>

              <div>
                <Label htmlFor="aggregation">Aggregation</Label>
                <Select
                  value={localConfig.aggregation}
                  onValueChange={(v) => handleAggregationChange(v as ReportAggregationType)}
                >
                  <SelectTrigger id="aggregation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {applicableAggregations.map((agg) => (
                      <SelectItem key={agg.value} value={agg.value}>
                        {agg.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted mt-1">
                  How to aggregate values for each group
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Display Options */}
        {localConfig && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Display Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="chartTitle">Chart Title</Label>
                <Input
                  id="chartTitle"
                  value={localConfig.title || ''}
                  onChange={(e) => handleOptionChange('title', e.target.value)}
                  placeholder="Enter chart title..."
                />
              </div>

              <div>
                <Label htmlFor="xAxisLabel">X-Axis Label</Label>
                <Input
                  id="xAxisLabel"
                  value={localConfig.xAxisLabel || ''}
                  onChange={(e) => handleOptionChange('xAxisLabel', e.target.value)}
                  placeholder="Enter X-axis label..."
                />
              </div>

              <div>
                <Label htmlFor="yAxisLabel">Y-Axis Label</Label>
                <Input
                  id="yAxisLabel"
                  value={localConfig.yAxisLabel || ''}
                  onChange={(e) => handleOptionChange('yAxisLabel', e.target.value)}
                  placeholder="Enter Y-axis label..."
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Legend</Label>
                  <p className="text-xs text-muted">Display chart legend</p>
                </div>
                <Switch
                  checked={localConfig.showLegend !== false}
                  onCheckedChange={(v) => handleOptionChange('showLegend', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Grid</Label>
                  <p className="text-xs text-muted">Display grid lines</p>
                </div>
                <Switch
                  checked={localConfig.showGrid !== false}
                  onCheckedChange={(v) => handleOptionChange('showGrid', v)}
                />
              </div>

              {localConfig.type === 'pie' && (
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show Data Labels</Label>
                    <p className="text-xs text-muted">Display percentages on slices</p>
                  </div>
                  <Switch
                    checked={localConfig.showDataLabels !== false}
                    onCheckedChange={(v) => handleOptionChange('showDataLabels', v)}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Color Scheme */}
        {localConfig && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Color Scheme</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(CHART_COLOR_SCHEMES).map(([key, scheme]) => {
                  if (key === 'custom') {return null}
                  const isSelected = (localConfig.colorScheme || 'default') === key
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleColorSchemeChange(key as ChartColorScheme)}
                      className={cn(
                        'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all',
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-border hover:border-input'
                      )}
                    >
                      <div className="flex gap-1">
                        {scheme.colors.slice(0, 4).map((color, i) => (
                          <div
                            key={i}
                            className="w-4 h-4 rounded-sm"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-medium">{scheme.name}</span>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        {localConfig && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </Button>
            <Button variant="destructive" onClick={handleRemoveChart}>
              <Trash2 className="h-4 w-4 mr-2" />
              Remove Chart
            </Button>
          </div>
        )}
      </div>

      {/* Preview Panel */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Live Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {!localConfig ? (
              <div className="flex items-center justify-center h-64 text-muted">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 text-disabled" />
                  <p className="text-sm">Select a chart type to begin</p>
                </div>
              </div>
            ) : !canCreateChart ? (
              <div className="flex items-center justify-center h-64 text-muted">
                <div className="text-center">
                  <p className="text-sm">Configure group and value fields to preview</p>
                </div>
              </div>
            ) : !canPreview ? (
              <div className="flex items-center justify-center h-64 text-muted">
                <div className="text-center">
                  <p className="text-sm">No preview data available</p>
                  <p className="text-xs text-disabled mt-1">
                    Save and run the report to see the chart
                  </p>
                </div>
              </div>
            ) : showPreview ? (
              <ChartRenderer data={previewData} config={localConfig} />
            ) : (
              <div className="flex items-center justify-center h-64 text-muted">
                <p className="text-sm">Preview hidden</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ChartBuilder
