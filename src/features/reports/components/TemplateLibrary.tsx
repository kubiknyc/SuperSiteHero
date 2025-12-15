/**
 * Template Library Component
 *
 * Browse and select from pre-built industry-standard report templates.
 */

import * as React from 'react'
import { useState } from 'react'
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  Search,
  Filter,
  X,
  FileText,
  ChevronRight,
  Clock,
  Tag,
  Download,
  Eye,
  Play,
  Settings,
  HelpCircle,
  FileCheck,
  RefreshCw,
  DollarSign,
  AlertTriangle,
  ClipboardCheck,
  CheckSquare,
  CheckCircle,
  Users,
  File,
  Truck,
  Shield,
  MessageSquare,
  TrendingUp,
  Activity,
  BarChart2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  useStandardTemplates,
  useTemplateFilters,
  useTemplateSelection,
  useTemplatePreview,
} from '../hooks/useStandardTemplates'
import type { StandardTemplate, TemplateCategory } from '../services/standardTemplates'
import type { ReportDataSource } from '@/types/report-builder'
import { getDataSourceLabel } from '@/types/report-builder'

// ============================================================================
// Icon Mapping
// ============================================================================

const iconMap: Record<string, React.ElementType> = {
  Calendar,
  CalendarDays,
  CalendarRange,
  HelpCircle,
  FileCheck,
  RefreshCw,
  DollarSign,
  AlertTriangle,
  ClipboardCheck,
  CheckSquare,
  CheckCircle,
  Users,
  File,
  FileText,
  Truck,
  Shield,
  MessageSquare,
  TrendingUp,
  Activity,
  BarChart2,
  Settings,
}

function getIcon(iconName: string): React.ElementType {
  return iconMap[iconName] || FileText
}

// ============================================================================
// Category Badge Colors
// ============================================================================

const categoryColors: Record<TemplateCategory, string> = {
  daily: 'bg-blue-100 text-blue-800',
  weekly: 'bg-green-100 text-green-800',
  monthly: 'bg-purple-100 text-purple-800',
  custom: 'bg-gray-100 text-gray-800',
}

// ============================================================================
// Template Card Component
// ============================================================================

interface TemplateCardProps {
  template: StandardTemplate
  onSelect: (template: StandardTemplate) => void
  onPreview: (template: StandardTemplate) => void
  isSelected?: boolean
}

function TemplateCard({ template, onSelect, onPreview, isSelected }: TemplateCardProps) {
  const Icon = getIcon(template.icon)

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
      }`}
      onClick={() => onSelect(template)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100">
              <Icon className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <CardTitle className="text-base">{template.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className={categoryColors[template.category]}>
                  {template.category}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {getDataSourceLabel(template.data_source)}
                </span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onPreview(template)
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <CardDescription className="text-sm line-clamp-2">
          {template.description}
        </CardDescription>
        <div className="flex flex-wrap gap-1 mt-3">
          {template.tags.slice(0, 4).map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {template.tags.length > 4 && (
            <Badge variant="outline" className="text-xs">
              +{template.tags.length - 4}
            </Badge>
          )}
        </div>
        {template.recommended_frequency && (
          <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Recommended: {template.recommended_frequency}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Template Preview Dialog
// ============================================================================

interface TemplatePreviewDialogProps {
  template: StandardTemplate | null
  open: boolean
  onClose: () => void
  onUseTemplate: (template: StandardTemplate) => void
}

function TemplatePreviewDialog({ template, open, onClose, onUseTemplate }: TemplatePreviewDialogProps) {
  if (!template) {return null}

  const Icon = getIcon(template.icon)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-gray-100">
              <Icon className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <DialogTitle>{template.name}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className={categoryColors[template.category]}>
                  {template.category}
                </Badge>
                <span>{getDataSourceLabel(template.data_source)}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Description */}
          <div>
            <h4 className="font-medium mb-2">Description</h4>
            <p className="text-sm text-muted-foreground">{template.description}</p>
          </div>

          {/* Tags */}
          <div>
            <h4 className="font-medium mb-2">Tags</h4>
            <div className="flex flex-wrap gap-2">
              {template.tags.map(tag => (
                <Badge key={tag} variant="outline">
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Fields */}
          <div>
            <h4 className="font-medium mb-2">Included Fields ({template.fields.length})</h4>
            <div className="grid grid-cols-2 gap-2">
              {template.fields.map((field, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  <span>{field.display_name}</span>
                  <span className="text-xs text-muted-foreground">({field.field_type})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Default Format</h4>
              <Badge variant="secondary" className="uppercase">
                {template.default_format}
              </Badge>
            </div>
            <div>
              <h4 className="font-medium mb-2">Orientation</h4>
              <span className="text-sm capitalize">{template.page_orientation}</span>
            </div>
            <div>
              <h4 className="font-medium mb-2">Include Charts</h4>
              <span className="text-sm">{template.include_charts ? 'Yes' : 'No'}</span>
            </div>
            <div>
              <h4 className="font-medium mb-2">Include Summary</h4>
              <span className="text-sm">{template.include_summary ? 'Yes' : 'No'}</span>
            </div>
          </div>

          {/* Recommended Schedule */}
          {template.recommended_frequency && (
            <div>
              <h4 className="font-medium mb-2">Recommended Schedule</h4>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="capitalize">{template.recommended_frequency}</span>
                {template.recommended_day_of_week !== null && (
                  <span className="text-muted-foreground">
                    on {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][template.recommended_day_of_week]}
                  </span>
                )}
                {template.recommended_day_of_month !== null && (
                  <span className="text-muted-foreground">
                    on day {template.recommended_day_of_month}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Filters */}
          {template.filters.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Default Filters</h4>
              <div className="space-y-1">
                {template.filters.map((filter, index) => (
                  <div key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                    <Filter className="h-3 w-3" />
                    <span>{filter.field_name}</span>
                    <span>{filter.operator}</span>
                    {filter.is_relative_date && (
                      <span>last {filter.relative_date_value} {filter.relative_date_unit}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => onUseTemplate(template)}>
            <Play className="h-4 w-4 mr-2" />
            Use This Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Main Template Library Component
// ============================================================================

export interface TemplateLibraryProps {
  onSelectTemplate: (template: StandardTemplate) => void
  selectedTemplateId?: string | null
}

export function TemplateLibrary({ onSelectTemplate, selectedTemplateId }: TemplateLibraryProps) {
  const filters = useTemplateFilters()
  const { previewTemplate, openPreview, closePreview, isPreviewOpen } = useTemplatePreview()

  const { templates, counts, allTags } = useStandardTemplates({
    category: filters.category ?? undefined,
    dataSource: filters.dataSource ?? undefined,
    searchQuery: filters.searchQuery,
    tags: filters.selectedTags,
  })

  const handleSelectTemplate = (template: StandardTemplate) => {
    onSelectTemplate(template)
  }

  const handleUseTemplate = (template: StandardTemplate) => {
    closePreview()
    onSelectTemplate(template)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Report Templates</h2>
          <p className="text-muted-foreground">
            Browse pre-built industry-standard report templates
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={filters.searchQuery}
            onChange={(e) => filters.setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {filters.hasFilters && (
          <Button variant="outline" onClick={filters.clearFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Category Tabs */}
      <Tabs
        value={filters.category ?? 'all'}
        onValueChange={(value) => filters.setCategory(value === 'all' ? null : value as TemplateCategory)}
      >
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            <FileText className="h-4 w-4" />
            All ({counts.daily + counts.weekly + counts.monthly})
          </TabsTrigger>
          <TabsTrigger value="daily" className="gap-2">
            <Calendar className="h-4 w-4" />
            Daily ({counts.daily})
          </TabsTrigger>
          <TabsTrigger value="weekly" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            Weekly ({counts.weekly})
          </TabsTrigger>
          <TabsTrigger value="monthly" className="gap-2">
            <CalendarRange className="h-4 w-4" />
            Monthly ({counts.monthly})
          </TabsTrigger>
        </TabsList>

        {/* Tag Filters */}
        <div className="flex flex-wrap gap-2 mt-4">
          {allTags.slice(0, 15).map(tag => (
            <Badge
              key={tag}
              variant={filters.selectedTags.includes(tag) ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => filters.toggleTag(tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>

        {/* Template Grid */}
        <TabsContent value="all" className="mt-6">
          <TemplateGrid
            templates={templates}
            onSelect={handleSelectTemplate}
            onPreview={(t) => openPreview(t.id)}
            selectedId={selectedTemplateId}
          />
        </TabsContent>
        <TabsContent value="daily" className="mt-6">
          <TemplateGrid
            templates={templates}
            onSelect={handleSelectTemplate}
            onPreview={(t) => openPreview(t.id)}
            selectedId={selectedTemplateId}
          />
        </TabsContent>
        <TabsContent value="weekly" className="mt-6">
          <TemplateGrid
            templates={templates}
            onSelect={handleSelectTemplate}
            onPreview={(t) => openPreview(t.id)}
            selectedId={selectedTemplateId}
          />
        </TabsContent>
        <TabsContent value="monthly" className="mt-6">
          <TemplateGrid
            templates={templates}
            onSelect={handleSelectTemplate}
            onPreview={(t) => openPreview(t.id)}
            selectedId={selectedTemplateId}
          />
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <TemplatePreviewDialog
        template={previewTemplate}
        open={isPreviewOpen}
        onClose={closePreview}
        onUseTemplate={handleUseTemplate}
      />
    </div>
  )
}

// ============================================================================
// Template Grid Component
// ============================================================================

interface TemplateGridProps {
  templates: StandardTemplate[]
  onSelect: (template: StandardTemplate) => void
  onPreview: (template: StandardTemplate) => void
  selectedId?: string | null
}

function TemplateGrid({ templates, onSelect, onPreview, selectedId }: TemplateGridProps) {
  if (templates.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No templates found</h3>
        <p className="text-muted-foreground">
          Try adjusting your search or filters
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map(template => (
        <TemplateCard
          key={template.id}
          template={template}
          onSelect={onSelect}
          onPreview={onPreview}
          isSelected={selectedId === template.id}
        />
      ))}
    </div>
  )
}

export default TemplateLibrary
