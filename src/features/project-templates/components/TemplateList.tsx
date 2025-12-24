/**
 * Template List Component
 *
 * Displays a filterable list of project templates
 */

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, LayoutGrid, List, SlidersHorizontal } from 'lucide-react'
import { TemplateCard } from './TemplateCard'
import type { ProjectTemplate, TemplateCategory } from '@/types/project-template'
import { TEMPLATE_CATEGORIES } from '@/types/project-template'

interface TemplateListProps {
  templates: ProjectTemplate[]
  isLoading?: boolean
  onEdit?: (template: ProjectTemplate) => void
  onDuplicate?: (template: ProjectTemplate) => void
  onDelete?: (template: ProjectTemplate) => void
  onPreview?: (template: ProjectTemplate) => void
  selectedCategory?: TemplateCategory | 'all'
  onCategoryChange?: (category: TemplateCategory | 'all') => void
  emptyMessage?: string
}

export function TemplateList({
  templates,
  isLoading,
  onEdit,
  onDuplicate,
  onDelete,
  onPreview,
  selectedCategory = 'all',
  onCategoryChange,
  emptyMessage = 'No templates found',
}: TemplateListProps) {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('list')

  // Filter templates
  const filteredTemplates = React.useMemo(() => {
    let result = templates

    // Filter by category
    if (selectedCategory !== 'all') {
      result = result.filter((t) => t.category === selectedCategory)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.tags?.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    return result
  }, [templates, selectedCategory, searchQuery])

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-disabled" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category Filter */}
        {onCategoryChange && (
          <Select
            value={selectedCategory}
            onValueChange={(value) => onCategoryChange(value as TemplateCategory | 'all')}
          >
            <SelectTrigger className="w-[180px]">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {TEMPLATE_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* View Toggle */}
        <div className="flex items-center border rounded-lg">
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            className="rounded-r-none"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            className="rounded-l-none"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted">
        {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
        {searchQuery && ` matching "${searchQuery}"`}
      </div>

      {/* Template List */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-surface">
          <p className="text-muted">{emptyMessage}</p>
          {searchQuery && (
            <Button
              variant="link"
              onClick={() => setSearchQuery('')}
              className="mt-2"
            >
              Clear search
            </Button>
          )}
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-3">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={onEdit}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              onPreview={onPreview}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={onEdit}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              onPreview={onPreview}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default TemplateList
