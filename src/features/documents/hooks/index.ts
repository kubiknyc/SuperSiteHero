// File: /src/features/documents/hooks/index.ts
// Central export for all document hooks

export { useDocuments, useFolders, useDocument, useDocumentVersions } from './useDocuments'
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
export {
  useDocumentComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
  buildCommentTree,
  countCommentsWithReplies,
  type DocumentComment,
  type CommentThread,
} from './useDocumentComments'

// Layer hooks
export {
  useDocumentLayers,
  useCreateLayer,
  useUpdateLayer,
  useDeleteLayer,
  useToggleLayerVisibility,
  useToggleLayerLock,
  useReorderLayer,
} from './useLayers'

// Measurement hooks
export {
  useMeasurements,
  useAllMeasurements,
  useCreateMeasurement,
  useUpdateMeasurement,
  useDeleteMeasurement,
  useClearMeasurements,
} from './useMeasurements'

// Document comparison hooks
export {
  useScaleCalibration,
  useSaveScaleCalibration,
  useDocumentVersionsForComparison,
} from './useDocumentComparison'

// Enhanced markup state hook
export { useEnhancedMarkupState, type Tool } from './useEnhancedMarkupState'

// Markup collaboration hooks
export {
  useMarkupCollaboration,
  useCollaboratorColor,
  useDebouncedTransformBroadcast,
} from './useMarkupCollaboration'

// Bulk markup export hook
export { useBulkMarkupExport, type BulkMarkupExportHook, type BulkMarkupExportState } from './useBulkMarkupExport'

// Drawing Packages hooks
export {
  useDrawingPackages,
  useDrawingPackage,
  usePackageActivity,
  useCreateDrawingPackage,
  useUpdateDrawingPackage,
  useDeleteDrawingPackage,
  useApproveDrawingPackage,
  useCreatePackageVersion,
  useAddPackageItem,
  useAddMultiplePackageItems,
  useUpdatePackageItem,
  useRemovePackageItem,
  useReorderPackageItems,
  useAddPackageRecipient,
  useAddMultiplePackageRecipients,
  useUpdatePackageRecipient,
  useRemovePackageRecipient,
  useDistributePackage,
  useGenerateShareableLink,
  useRecordPackageAccess,
  useRecordPackageDownload,
  useAcknowledgePackage,
  usePackageTypeInfo,
  usePackageStatusInfo,
} from './useDrawingPackages'
