/**
 * Search Feature
 * Natural language search with LLM query expansion
 */

// Components
export * from './components'

// Re-export types and hooks from AI feature
export {
  useSemanticSearch,
  semanticSearchQueryKeys,
  type SearchEntityType,
  type SearchResult,
  type DateRange,
} from '@/features/ai/hooks/useSemanticSearch'
