// File: /src/features/documents/components/index.ts
// Central export for all document components

export { DocumentsList } from './DocumentsList'
export { DocumentUpload } from './DocumentUpload'
export { DocumentList } from './DocumentList'
export { DocumentStatusBadge } from './DocumentStatusBadge'
export { DocumentTypeIcon } from './DocumentTypeIcon'
export { PDFViewer, ImageViewer, DocumentViewer } from './viewers'
export { DocumentSearchBar, DocumentFilters, type DocumentFiltersState } from './search'
export { DocumentVersionHistory } from './DocumentVersionHistory'
export { UploadDocumentVersion } from './UploadDocumentVersion'
export { BulkMarkupExportDialog } from './BulkMarkupExportDialog'
export * from './comparison'

// Drawing Packages components
export { DrawingPackageWizard } from './DrawingPackageWizard'
export { PackageCoverSheet, generateCoverSheetHTML } from './PackageCoverSheet'
export { PackageDistributionDialog } from './PackageDistributionDialog'

// Drawing Register and Transmittals
export { DrawingRegister } from './DrawingRegister'
export { TransmittalForm, TransmittalList, PrintableTransmittal } from './TransmittalForm'

// Drawing Pin Overlays (RFI/Submittal callouts on drawings)
export { DrawingPinOverlay } from './DrawingPinOverlay'
export { DrawingPinOverlayWithCreation } from './DrawingPinOverlayWithCreation'

// Field-Focused Features (Photo Pins, Voice Notes, QR Codes, GPS)
export { PhotoPinOverlay } from './PhotoPinOverlay'
export { VoiceNoteRecorder, VoiceNoteIndicator } from './VoiceNoteRecorder'
export { DrawingQRCode, parseDrawingQRUrl } from './DrawingQRCode'
export { GPSLocationOverlay } from './GPSLocationOverlay'
export { OfflineMarkupSync, SyncStatusIndicator } from './OfflineMarkupSync'

// Drawing Set Management
export { SheetHyperlinkManager } from './SheetHyperlinkManager'
export { RevisionCloudManager } from './RevisionCloudManager'
export { BulkMarkupApply } from './BulkMarkupApply'
export { MarkupMigration } from './MarkupMigration'
export { BookmarkManager } from './BookmarkManager'
export type { DrawingBookmark, Viewport } from './BookmarkManager'
export { DrawingIndexPanel } from './DrawingIndexPanel'
export { SheetReferenceOverlay } from './SheetReferenceOverlay'
