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
  useEnhancedMeasurements,
  useCountMarkers,
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

// Drawing Revisions and Transmittals hooks
export {
  useDrawingRegister,
  useDrawingRevisionHistory,
  useDocumentRevisions,
  useCreateDocumentRevision,
  useTransmittals,
  useTransmittal,
  useCreateTransmittal,
  useUpdateTransmittalStatus,
  useDrawingsAffectedByASI,
  useProjectASIs,
  useCompareRevisions,
  useRevisionStats,
  useBulkCreateRevisions,
  DRAWING_DISCIPLINES,
  DOCUMENT_SETS,
  type DrawingDocument,
  type DocumentRevision,
  type DocumentTransmittal,
  type TransmittalItem,
  type RevisionComparison,
} from './useDrawingRevisions'

// Smart markup features - Auto-numbering
export {
  useAutoNumbering,
  NUMBERING_PREFIX_OPTIONS,
} from './useAutoNumbering'

// Smart markup features - Templates
export {
  useMarkupTemplates,
  useMarkupTemplate,
  useTemplateCategoryOptions,
  markupTemplateKeys,
} from './useMarkupTemplates'

// Drawing Set Management hooks
export {
  // Sheet reference/hyperlink hooks
  useSheetReferences,
  useSheetBacklinks,
  useCreateSheetReference,
  useDeleteSheetReference,
  useAutoDetectSheetReferences,
  // Revision cloud hooks
  useRevisionClouds,
  useCreateRevisionCloud,
  useDeleteRevisionCloud,
  useGenerateRevisionClouds,
  // Bulk markup hooks
  useBulkApplyMarkups,
  // Migration hooks
  useNewRevisionDetection,
  useMigratableMarkups,
  useMigrateMarkups,
  // Comparison state hook
  useDrawingComparisonState,
  // Index hooks
  useDrawingSetIndex,
  useDrawingSetStats,
  // Utilities
  parseDrawingReferences,
  getDrawingDiscipline,
} from './useDrawingSetManagement'

// Sheet Navigation History hooks
export {
  useSheetNavigationHistory,
  type SheetNavigationHistoryHook,
} from './useSheetNavigationHistory'

// Drawing Bookmarks hooks
export {
  useDrawingBookmarks,
  useDrawingBookmark,
  useBookmarkFolders,
  useCreateDrawingBookmark,
  useUpdateDrawingBookmark,
  useDeleteDrawingBookmark,
  useDrawingBookmarksWithUtilities,
  drawingBookmarkKeys,
  type DrawingBookmarksHook,
  type DrawingBookmarksWithUtilitiesHook,
} from './useDrawingBookmarks'

// Offline sync
export * from './useDocumentSync'
export * from './useDocumentsOffline'
