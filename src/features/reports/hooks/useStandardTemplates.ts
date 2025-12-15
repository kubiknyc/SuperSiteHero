/**
 * Standard Templates Hooks
 *
 * React hooks for accessing the standard report templates library.
 */

import { useMemo, useState, useCallback } from 'react'
import {
  getAllStandardTemplates,
  getTemplatesByCategory,
  getTemplatesByDataSource,
  getTemplateById,
  searchTemplates,
  getTemplateCounts,
  getAllTags,
  filterByTags,
  type StandardTemplate,
  type TemplateCategory,
} from '../services/standardTemplates'
import type { ReportDataSource } from '@/types/report-builder'

// ============================================================================
// Hook: useStandardTemplates
// ============================================================================

export interface UseStandardTemplatesOptions {
  category?: TemplateCategory
  dataSource?: ReportDataSource
  searchQuery?: string
  tags?: string[]
}

export interface UseStandardTemplatesResult {
  templates: StandardTemplate[]
  isFiltered: boolean
  counts: Record<TemplateCategory, number>
  allTags: string[]
}

/**
 * Hook to access and filter standard report templates
 */
export function useStandardTemplates(options: UseStandardTemplatesOptions = {}): UseStandardTemplatesResult {
  const { category, dataSource, searchQuery, tags = [] } = options

  const templates = useMemo(() => {
    let result = getAllStandardTemplates()

    // Filter by category
    if (category) {
      result = result.filter(t => t.category === category)
    }

    // Filter by data source
    if (dataSource) {
      result = result.filter(t => t.data_source === dataSource)
    }

    // Filter by search query
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    // Filter by tags
    if (tags.length > 0) {
      result = result.filter(t =>
        tags.some(tag => t.tags.includes(tag))
      )
    }

    return result
  }, [category, dataSource, searchQuery, tags])

  const isFiltered = !!(category || dataSource || searchQuery || tags.length > 0)
  const counts = useMemo(() => getTemplateCounts(), [])
  const allTags = useMemo(() => getAllTags(), [])

  return {
    templates,
    isFiltered,
    counts,
    allTags,
  }
}

// ============================================================================
// Hook: useTemplateSelection
// ============================================================================

export interface UseTemplateSelectionResult {
  selectedTemplate: StandardTemplate | null
  selectTemplate: (templateId: string) => void
  clearSelection: () => void
  isSelected: (templateId: string) => boolean
}

/**
 * Hook to manage template selection state
 */
export function useTemplateSelection(): UseTemplateSelectionResult {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId) {return null}
    return getTemplateById(selectedTemplateId) ?? null
  }, [selectedTemplateId])

  const selectTemplate = useCallback((templateId: string) => {
    setSelectedTemplateId(templateId)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedTemplateId(null)
  }, [])

  const isSelected = useCallback((templateId: string) => {
    return selectedTemplateId === templateId
  }, [selectedTemplateId])

  return {
    selectedTemplate,
    selectTemplate,
    clearSelection,
    isSelected,
  }
}

// ============================================================================
// Hook: useTemplateFilters
// ============================================================================

export interface UseTemplateFiltersResult {
  category: TemplateCategory | null
  dataSource: ReportDataSource | null
  searchQuery: string
  selectedTags: string[]
  setCategory: (category: TemplateCategory | null) => void
  setDataSource: (dataSource: ReportDataSource | null) => void
  setSearchQuery: (query: string) => void
  toggleTag: (tag: string) => void
  clearFilters: () => void
  hasFilters: boolean
}

/**
 * Hook to manage template filtering state
 */
export function useTemplateFilters(): UseTemplateFiltersResult {
  const [category, setCategory] = useState<TemplateCategory | null>(null)
  const [dataSource, setDataSource] = useState<ReportDataSource | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }, [])

  const clearFilters = useCallback(() => {
    setCategory(null)
    setDataSource(null)
    setSearchQuery('')
    setSelectedTags([])
  }, [])

  const hasFilters = !!(category || dataSource || searchQuery || selectedTags.length > 0)

  return {
    category,
    dataSource,
    searchQuery,
    selectedTags,
    setCategory,
    setDataSource,
    setSearchQuery,
    toggleTag,
    clearFilters,
    hasFilters,
  }
}

// ============================================================================
// Hook: useTemplatePreview
// ============================================================================

export interface UseTemplatePreviewResult {
  previewTemplate: StandardTemplate | null
  openPreview: (templateId: string) => void
  closePreview: () => void
  isPreviewOpen: boolean
}

/**
 * Hook to manage template preview modal state
 */
export function useTemplatePreview(): UseTemplatePreviewResult {
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null)

  const previewTemplate = useMemo(() => {
    if (!previewTemplateId) {return null}
    return getTemplateById(previewTemplateId) ?? null
  }, [previewTemplateId])

  const openPreview = useCallback((templateId: string) => {
    setPreviewTemplateId(templateId)
  }, [])

  const closePreview = useCallback(() => {
    setPreviewTemplateId(null)
  }, [])

  return {
    previewTemplate,
    openPreview,
    closePreview,
    isPreviewOpen: !!previewTemplateId,
  }
}
