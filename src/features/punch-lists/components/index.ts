// File: /src/features/punch-lists/components/index.ts
// Central export for all punch list components

export { PunchListsProjectView } from './PunchListsProjectView'
export { CreatePunchItemDialog } from './CreatePunchItemDialog'
export { EditPunchItemDialog } from './EditPunchItemDialog'
export { DeletePunchItemConfirmation } from './DeletePunchItemConfirmation'
export { PunchItemStatusBadge } from './PunchItemStatusBadge'
export { PunchByAreaReport } from './PunchByAreaReport'
export { QuickPunchMode } from './QuickPunchMode'
export { SwipeablePunchItem } from './SwipeablePunchItem'
export { BeforeAfterPhotos, PhotoComparison, PhotoStatusButton } from './BeforeAfterPhotos'
export type { PunchPhoto } from './BeforeAfterPhotos'
export {
  PhotoComparisonViewer,
  CompactPhotoComparison,
  PhotoThumbnailStrip
} from './PhotoComparisonViewer'
export type { ComparisonPhoto } from './PhotoComparisonViewer'
export { FloorPlanPinDrop } from './FloorPlanPinDrop'
export { LazyFloorPlanPinDrop } from './LazyFloorPlanPinDrop'
export { PunchItemQRCode } from './PunchItemQRCode'
export { QRCodeScanner } from './QRCodeScanner'

// Touch-friendly components
export { PunchListItem } from './PunchListItem'
export type { PunchListItemData, PunchListItemProps } from './PunchListItem'

// Escalation Management
export { PunchListEscalationPanel } from './PunchListEscalationPanel'
