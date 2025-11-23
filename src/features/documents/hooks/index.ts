// File: /src/features/documents/hooks/index.ts
// Central export for all document hooks

export { useDocuments, useFolders } from './useDocuments'
export {
  useCreateDocumentWithNotification,
  useCreateFolderWithNotification,
  useUpdateDocumentWithNotification,
  useDeleteDocumentWithNotification,
  useUpdateFolderWithNotification,
  useDeleteFolderWithNotification,
} from './useDocumentsMutations'
export { useDocumentSearch, highlightSearchTerm, calculateRelevanceScore } from './useDocumentSearch'
export {
  useDocumentFilters,
  useAvailableDisciplines,
  useDocumentStats,
  type DocumentFiltersInput,
  type DocumentStats,
} from './useDocumentFilters'
