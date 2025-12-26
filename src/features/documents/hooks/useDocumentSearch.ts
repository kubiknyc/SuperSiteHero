// File: /src/features/documents/hooks/useDocumentSearch.ts
// Hook for full-text search across documents

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Document } from '@/types/database'
import { logger } from '../../../lib/utils/logger';


interface UseDocumentSearchOptions {
  enabled?: boolean
  projectId?: string
}

/**
 * useDocumentSearch Hook
 *
 * Performs full-text search across document names, descriptions, and metadata.
 * Uses PostgreSQL full-text search for efficient searching.
 *
 * Features:
 * - Debouncing handled by caller (use with useEffect + debounce)
 * - Full-text search with rank-based sorting
 * - Optional project filtering
 * - Searchable fields: name, description, drawing_number, specification_section
 *
 * @param searchTerm - Search query string (min 2 characters)
 * @param projectId - Optional project ID to filter results
 * @param options - Query options
 *
 * Usage:
 * ```tsx
 * const [searchTerm, setSearchTerm] = useState('')
 * const { data: results } = useDocumentSearch(searchTerm, projectId, {
 *   enabled: searchTerm.length >= 2
 * })
 * ```
 */
export function useDocumentSearch(
  searchTerm: string,
  projectId?: string,
  options: UseDocumentSearchOptions = {}
) {
  const { enabled = true, ...queryOptions } = options

  return useQuery<Document[]>({
    queryKey: ['documents', 'search', projectId, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('documents')
        .select('id, name, file_type, file_url, folder_id, project_id, created_at, drawing_number, description, specification_section')
        .is('deleted_at', null)
        .order('name', { ascending: true })
        .limit(50)

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      if (searchTerm && searchTerm.length >= 2) {
        const searchPattern = `%${searchTerm}%`
        query = query.or(
          `name.ilike.${searchPattern},description.ilike.${searchPattern},drawing_number.ilike.${searchPattern},specification_section.ilike.${searchPattern}`
        )
      }

      const { data, error } = await query

      if (error) {
        logger.error('Search error:', error)
        throw error
      }

      return data as Document[]
    },
    enabled: enabled && (searchTerm.length >= 2 || searchTerm === ''),
    staleTime: 1000 * 60 * 5,
    ...queryOptions,
  })
}

/**
 * Highlight search term in text
 */
export function highlightSearchTerm(
  text: string,
  searchTerm: string,
  className = 'bg-yellow-200'
): string {
  if (!searchTerm || searchTerm.length < 2) {
    return text
  }

  const regex = new RegExp(`(${searchTerm})`, 'gi')
  return text.replace(regex, `<mark class="${className}">$1</mark>`)
}

/**
 * Calculate search relevance score
 */
export function calculateRelevanceScore(
  document: Document,
  searchTerm: string
): number {
  let score = 0

  if (!searchTerm || searchTerm.length < 2) {
    return score
  }

  const term = searchTerm.toLowerCase()

  if (document.name.toLowerCase().includes(term)) {
    score += 100
    if (document.name.toLowerCase().startsWith(term)) {
      score += 50
    }
  }

  if (document.drawing_number?.toLowerCase().includes(term)) {
    score += 75
  }

  if (document.description?.toLowerCase().includes(term)) {
    score += 25
  }

  if (document.specification_section?.toLowerCase().includes(term)) {
    score += 50
  }

  return score
}
