// File: /src/features/documents/components/markup/index.ts
// Export all markup components

// Original components
export { MarkupToolbar } from './MarkupToolbar'
export { UnifiedDrawingCanvas } from './UnifiedDrawingCanvas'
export { LazyUnifiedDrawingCanvas } from './LazyUnifiedDrawingCanvas'

// Enhanced components
export { ColorPicker } from './ColorPicker'
export { LayerManager } from './LayerManager'
export { MeasurementTools, UNIT_CONVERSION, calculateVolume, convertVolume, formatVolume } from './MeasurementTools'
export { MarkupHistoryPanel } from './MarkupHistoryPanel'
export { StampTools, getStampColor } from './StampTools'
export { MarkupSharingDialog } from './MarkupSharingDialog'
export { EnhancedMarkupToolbar } from './EnhancedMarkupToolbar'

// New measurement components
export { CountTool, CountMarkerDisplay } from './CountTool'
export { AngleMeasurement, AngleDisplay, calculateAngle, snapToCommonAngle, snapToIncrement, getAngles } from './AngleMeasurement'
export { MobileMeasurementToolbar } from './MobileMeasurementToolbar'

// Smart markup features
export { SymbolLibrary, CONSTRUCTION_SYMBOLS } from './SymbolLibrary'
export { MarkupTemplateManager } from './MarkupTemplateManager'
export { AutoNumberingControls } from './AutoNumberingControls'

// Field-focused features (re-exported from parent for convenience)
export { PhotoPinOverlay } from '../PhotoPinOverlay'
export { VoiceNoteRecorder, VoiceNoteIndicator } from '../VoiceNoteRecorder'
export { DrawingQRCode, parseDrawingQRUrl } from '../DrawingQRCode'
export { GPSLocationOverlay } from '../GPSLocationOverlay'
export { OfflineMarkupSync, SyncStatusIndicator } from '../OfflineMarkupSync'
