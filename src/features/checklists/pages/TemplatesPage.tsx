// File: /src/features/checklists/pages/TemplatesPage.tsx
// Main page for browsing and managing checklist templates
// Phase: 2.1 - Template List/Grid View

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { SmartLayout } from '@/components/layout/SmartLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Plus,
  Search,
  Grid3x3,
  List,
  X,
  CheckSquare,
  BarChart3,
  FileText,
} from 'lucide-react'
import { TemplateCard } from '../components/TemplateCard'
import { TemplateBuilderDialog } from '../components/TemplateBuilderDialog'
import { useTemplates, useDeleteTemplate, useDuplicateTemplate, useCreateTemplate, useUpdateTemplate } from '../hooks/useTemplates'
import type { ChecklistTemplate, TemplateFilters, CreateChecklistTemplateDTO } from '@/types/checklists'

type ViewMode = 'grid' | 'list'
type CategoryFilter = 'all' | 'Pre-Pour' | 'Framing' | 'MEP' | 'Finishes' | 'Safety' | 'QA/QC'

/**
 * Skeleton loader for stat cards
 */
function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-card rounded-lg shadow p-4 border border-border">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton loader for template cards (grid view)
 */
function TemplateCardSkeleton() {
  return (
    <div className="bg-card rounded-lg shadow border border-border p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-5 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2 mb-1" />
          <Skeleton className="h-3 w-full" />
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <div className="flex justify-between mt-4 pt-4 border-t border-border">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  )
}

/**
 * Skeleton loader for template list view
 */
function TemplateListSkeleton() {
  return (
    <div className="bg-card rounded-lg shadow border border-border p-4 flex items-center gap-4">
      <Skeleton className="h-10 w-10 rounded-lg" />
      <div className="flex-1">
        <Skeleton className="h-5 w-1/3 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
      <Skeleton className="h-8 w-24" />
    </div>
  )
}

/**
 * TemplatesPage Component
 *
 * Main page for browsing and managing checklist templates
 * Features:
 * - Grid/list view toggle
 * - Search and filter functionality
 * - Template CRUD operations
 * - System and custom template display
 * - Quick stats dashboard
 */
export function TemplatesPage() {
  const navigate = useNavigate()

  // State management
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [showSystemTemplates, setShowSystemTemplates] = useState(true)
  const [showCustomTemplates, setShowCustomTemplates] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ChecklistTemplate | null>(null)

  // Build filters object
  const filters: TemplateFilters = useMemo(() => {
    const f: TemplateFilters = {}

    if (searchQuery.trim()) {
      f.search = searchQuery.trim()
    }

    if (categoryFilter !== 'all') {
      f.category = categoryFilter
    }

    return f
  }, [searchQuery, categoryFilter])

  // Data hooks
  const { data: allTemplates = [], isLoading } = useTemplates(filters)
  const { mutate: deleteTemplate } = useDeleteTemplate()
  const { mutate: duplicateTemplate } = useDuplicateTemplate()
  const { mutate: createTemplate, isPending: isCreating } = useCreateTemplate()
  const { mutate: updateTemplate, isPending: isUpdating } = useUpdateTemplate()

  // Filter templates by type (system vs custom)
  const filteredTemplates = useMemo(() => {
    let result = allTemplates

    if (!showSystemTemplates) {
      result = result.filter(t => !t.is_system_template)
    }

    if (!showCustomTemplates) {
      result = result.filter(t => t.is_system_template)
    }

    return result
  }, [allTemplates, showSystemTemplates, showCustomTemplates])

  // Statistics
  const stats = useMemo(() => {
    const total = allTemplates.length
    const system = allTemplates.filter(t => t.is_system_template).length
    const custom = allTemplates.filter(t => !t.is_system_template).length
    const categories = new Set(allTemplates.map(t => t.category).filter(Boolean)).size

    return { total, system, custom, categories }
  }, [allTemplates])

  // Categories for filter (extracted from templates)
  const availableCategories = useMemo(() => {
    const cats = new Set(allTemplates.map(t => t.category).filter((c): c is string => Boolean(c)))
    return Array.from(cats).sort()
  }, [allTemplates])

  // Handlers
  const handleCreateTemplate = () => {
    setEditingTemplate(null)
    setIsDialogOpen(true)
  }

  const handleViewTemplate = (template: ChecklistTemplate) => {
    navigate(`/checklists/templates/${template.id}`)
  }

  const handleEditTemplate = (template: ChecklistTemplate) => {
    setEditingTemplate(template)
    setIsDialogOpen(true)
  }

  const handleEditItems = (template: ChecklistTemplate) => {
    navigate(`/checklists/templates/${template.id}/items`)
  }

  const handleSaveTemplate = async (data: CreateChecklistTemplateDTO) => {
    if (editingTemplate) {
      // Update existing template
      updateTemplate(
        { id: editingTemplate.id, ...data },
        {
          onSuccess: () => {
            setIsDialogOpen(false)
            setEditingTemplate(null)
          },
        }
      )
    } else {
      // Create new template
      createTemplate(data, {
        onSuccess: () => {
          setIsDialogOpen(false)
        },
      })
    }
  }

  const handleDuplicateTemplate = (template: ChecklistTemplate) => {
    const newName = `${template.name} (Copy)`
    duplicateTemplate({ templateId: template.id, newName })
  }

  const handleDeleteTemplate = (template: ChecklistTemplate) => {
    if (template.is_system_template) {
      // System templates cannot be deleted
      return
    }
    deleteTemplate(template.id)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setCategoryFilter('all')
    setShowSystemTemplates(true)
    setShowCustomTemplates(true)
  }

  const hasActiveFilters = searchQuery || categoryFilter !== 'all' || !showSystemTemplates || !showCustomTemplates

  return (
    <SmartLayout title="Inspection Checklists" subtitle="Create and manage inspection templates">
      <div className="min-h-screen bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2 heading-page">Inspection Checklists</h1>
              <p className="text-secondary">
                Create and manage inspection checklist templates for your projects
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/checklists/dashboard')}>
                <BarChart3 className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
              <Button variant="outline" onClick={() => navigate('/checklists/executions')}>
                <FileText className="w-4 h-4 mr-2" />
                Executions
              </Button>
              <Button onClick={handleCreateTemplate} size="lg">
                <Plus className="w-5 h-5 mr-2" />
                New Template
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Dashboard */}
        {isLoading ? (
          <StatsSkeleton />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-card rounded-lg shadow p-4 border border-border">
              <div className="text-sm font-medium text-secondary">Total Templates</div>
              <div className="text-3xl font-bold text-foreground mt-1">{stats.total}</div>
            </div>
            <div className="bg-card rounded-lg shadow p-4 border border-border">
              <div className="text-sm font-medium text-secondary">System Templates</div>
              <div className="text-3xl font-bold text-primary mt-1">{stats.system}</div>
            </div>
            <div className="bg-card rounded-lg shadow p-4 border border-border">
              <div className="text-sm font-medium text-secondary">Custom Templates</div>
              <div className="text-3xl font-bold text-success mt-1">{stats.custom}</div>
            </div>
            <div className="bg-card rounded-lg shadow p-4 border border-border">
              <div className="text-sm font-medium text-secondary">Categories</div>
              <div className="text-3xl font-bold text-purple-600 mt-1">{stats.categories}</div>
            </div>
          </div>
        )}

        {/* Filters and View Controls */}
        <div className="bg-card rounded-lg shadow mb-6 p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-disabled" />
              <Input
                type="text"
                placeholder="Search templates by name, description, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
              className="flex h-10 w-full lg:w-48 items-center justify-between rounded-md border border-input bg-card px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="all">All Categories</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* View Mode Toggle */}
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('list')}
                aria-label="List view"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Template Type Filters */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
            <span className="text-sm font-medium text-secondary">Show:</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showSystemTemplates}
                onChange={(e) => setShowSystemTemplates(e.target.checked)}
                className="rounded border-input text-primary focus:ring-blue-500"
              />
              <span className="text-sm text-secondary">System Templates</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showCustomTemplates}
                onChange={(e) => setShowCustomTemplates(e.target.checked)}
                className="rounded border-input text-primary focus:ring-blue-500"
              />
              <span className="text-sm text-secondary">Custom Templates</span>
            </label>
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="mt-4 flex items-center gap-2 text-sm text-secondary">
              <span className="font-medium">Active filters:</span>
              {searchQuery && (
                <Badge variant="secondary">
                  Search: "{searchQuery}"
                </Badge>
              )}
              {categoryFilter !== 'all' && (
                <Badge variant="secondary">
                  Category: {categoryFilter}
                </Badge>
              )}
              {!showSystemTemplates && (
                <Badge variant="secondary">
                  Hide System
                </Badge>
              )}
              {!showCustomTemplates && (
                <Badge variant="secondary">
                  Hide Custom
                </Badge>
              )}
              <button
                onClick={clearFilters}
                className="text-primary hover:text-blue-800 text-xs font-medium flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Templates Grid/List */}
        {isLoading ? (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                : 'space-y-4'
            }
          >
            {viewMode === 'grid' ? (
              <>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <TemplateCardSkeleton key={i} />
                ))}
              </>
            ) : (
              <>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TemplateListSkeleton key={i} />
                ))}
              </>
            )}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="bg-card rounded-lg shadow p-12 text-center">
            <div className="text-disabled mb-4">
              <CheckSquare className="mx-auto h-12 w-12" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1 heading-subsection">
              {allTemplates.length === 0 ? 'No templates yet' : 'No templates match your filters'}
            </h3>
            <p className="text-secondary mb-4">
              {allTemplates.length === 0
                ? 'Get started by creating your first checklist template or browse system templates.'
                : 'Try adjusting your search and filter criteria.'}
            </p>
            {allTemplates.length === 0 && (
              <Button onClick={handleCreateTemplate}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Template
              </Button>
            )}
            {allTemplates.length > 0 && (
              <Button variant="outline" onClick={clearFilters}>
                <X className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                : 'space-y-4'
            }
          >
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                viewMode={viewMode}
                onView={handleViewTemplate}
                onEdit={handleEditTemplate}
                onEditItems={handleEditItems}
                onDuplicate={handleDuplicateTemplate}
                onDelete={handleDeleteTemplate}
              />
            ))}
          </div>
        )}
      </div>

        {/* Template Builder Dialog */}
        <TemplateBuilderDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          template={editingTemplate}
          onSave={handleSaveTemplate}
          isLoading={isCreating || isUpdating}
        />
        </div>
      </div>
    </SmartLayout>
  )
}

export default TemplatesPage
