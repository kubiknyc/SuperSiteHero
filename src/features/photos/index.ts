/**
 * Photos Feature Exports
 *
 * Camera & Photo Management feature for construction site documentation.
 */

// Components
export { CameraCapture, CameraTrigger } from './components/CameraCapture'
export { PhotoGrid } from './components/PhotoGrid'
export { PhotoTimeline } from './components/PhotoTimeline'
export { PhotoDetailDialog } from './components/PhotoDetailDialog'
export { PhotoComparison, CreateComparisonDialog } from './components/PhotoComparison'
export { LocationBrowser } from './components/LocationBrowser'

// Pages
export { PhotoOrganizerPage } from './pages/PhotoOrganizerPage'

// Hooks
export {
  // Photo queries
  usePhotos,
  usePhoto,
  usePhotoStats,
  usePhotoFilterOptions,
  usePhotosNearLocation,
  useLocationClusters,
  usePhotoAnnotations,
  usePhotoAccessLogs,
  // Photo mutations
  useCreatePhoto,
  useUpdatePhoto,
  useDeletePhoto,
  useBulkDeletePhotos,
  useLinkPhotoToEntity,
  useUnlinkPhotoFromEntity,
  useCreateAnnotation,
  useDeleteAnnotation,
  // Collection queries
  useCollections,
  useCollection,
  useCollectionPhotos,
  // Collection mutations
  useCreateCollection,
  useUpdateCollection,
  useDeleteCollection,
  useAddPhotoToCollection,
  useRemovePhotoFromCollection,
  useReorderCollectionPhotos,
  // Comparison queries
  useComparisons,
  useComparison,
  // Comparison mutations
  useCreateComparison,
  useCompleteComparison,
} from './hooks/usePhotos'
