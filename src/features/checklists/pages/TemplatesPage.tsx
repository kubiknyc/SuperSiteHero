// File: /src/features/checklists/pages/TemplatesPage.tsx
// Main page for browsing and managing checklist templates
// Phase: 2.1 - Template List/Grid View

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Search,
  Grid3x3,
  List,
  Filter,
  X,
  CheckSquare,
  BarChart3,
  FileText,
} from 'lucide-react'
import { TemplateCard } from '../components/TemplateCard'
import { TemplateBuilderDialog } from '../components/TemplateBuilderDialog'
import { useTemplates, useDeleteTemplate, useDuplicateTemplate, useCreateTemplate, useUpdateTemplate } from '../hooks/useTemplates'
import type { ChecklistTemplate, TemplateFilters, CreateChecklistTemplateDTO } from '@/types/checklists'
import { useAuth } from '@/lib/auth/AuthContext'

type ViewMode = 'grid' | 'list'
type CategoryFilter = 'all' | 'Pre-Pour' | 'Framing' | 'MEP' | 'Finishes' | 'Safety' | 'QA/QC'

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
  const { user } = useAuth()

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Inspection Checklists</h1>
              <p className="text-gray-600">
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
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <div className="text-sm font-medium text-gray-600">Total Templates</div>
            <div className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <div className="text-sm font-medium text-gray-600">System Templates</div>
            <div className="text-3xl font-bold text-blue-600 mt-1">{stats.system}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <div className="text-sm font-medium text-gray-600">Custom Templates</div>
            <div className="text-3xl font-bold text-green-600 mt-1">{stats.custom}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <div className="text-sm font-medium text-gray-600">Categories</div>
            <div className="text-3xl font-bold text-purple-600 mt-1">{stats.categories}</div>
          </div>
        </div>

        {/* Filters and View Controls */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
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
              className="flex h-10 w-full lg:w-48 items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-200">
            <span className="text-sm font-medium text-gray-700">Show:</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showSystemTemplates}
                onChange={(e) => setShowSystemTemplates(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">System Templates</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showCustomTemplates}
                onChange={(e) => setShowCustomTemplates(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Custom Templates</span>
            </label>
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
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
                className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Templates Grid/List */}
        {isLoading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <p className="mt-4 text-gray-600">Loading templates...</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 mb-4">
              <CheckSquare className="mx-auto h-12 w-12" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              {allTemplates.length === 0 ? 'No templates yet' : 'No templates match your filters'}
            </h3>
            <p className="text-gray-600 mb-4">
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
  )
}

export default TemplatesPage
