/**
 * Drawing Register Types
 * Track construction drawings, revisions, and distribution history
 */

// ============================================================================
// DRAWING TYPES
// ============================================================================

export type DrawingDiscipline =
  | 'architectural'
  | 'structural'
  | 'mechanical'
  | 'electrical'
  | 'plumbing'
  | 'civil'
  | 'landscape'
  | 'fire_protection'
  | 'other';

export type DrawingStatus = 'active' | 'superseded' | 'void' | 'for_reference_only';

export type RevisionType = 'standard' | 'asi' | 'bulletin' | 'addendum' | 'rfi_response';

export type MarkupType = 'comment' | 'cloud' | 'arrow' | 'dimension' | 'text' | 'highlight' | 'redline';

export type MarkupStatus = 'open' | 'resolved' | 'void';

export type DrawingSetStatus = 'draft' | 'issued' | 'superseded';

export type IssuePurpose = 'For Construction' | 'For Permit' | 'For Bid' | 'For Review' | 'For Coordination' | 'For Record';

export type SheetSize = 'A' | 'B' | 'C' | 'D' | 'E' | 'ARCH A' | 'ARCH B' | 'ARCH C' | 'ARCH D' | 'ARCH E';

// ============================================================================
// DRAWING INTERFACES
// ============================================================================

export interface Drawing {
  id: string;
  companyId: string;
  projectId: string;

  // Drawing identification
  drawingNumber: string;
  title: string;
  description?: string;

  // Discipline/Category
  discipline: DrawingDiscipline;
  subdiscipline?: string;
  sheetSize?: SheetSize;

  // Current revision info
  currentRevision?: string;
  currentRevisionId?: string;
  currentRevisionDate?: string;

  // Status
  status: DrawingStatus;
  isIssuedForConstruction: boolean;
  ifcDate?: string;

  // Document library link
  documentId?: string;
  folderId?: string;

  // Spec section reference
  specSection?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  deletedAt?: string;

  // Joined data
  currentFileUrl?: string;
  currentThumbnailUrl?: string;
  projectName?: string;
  companyName?: string;
  revisionCount?: number;
  lastTransmittalDate?: string;
}

export interface DrawingInsert {
  companyId: string;
  projectId: string;
  drawingNumber: string;
  title: string;
  description?: string;
  discipline: DrawingDiscipline;
  subdiscipline?: string;
  sheetSize?: SheetSize;
  status?: DrawingStatus;
  isIssuedForConstruction?: boolean;
  ifcDate?: string;
  documentId?: string;
  folderId?: string;
  specSection?: string;
}

export interface DrawingUpdate {
  drawingNumber?: string;
  title?: string;
  description?: string | null;
  discipline?: DrawingDiscipline;
  subdiscipline?: string | null;
  sheetSize?: SheetSize | null;
  status?: DrawingStatus;
  isIssuedForConstruction?: boolean;
  ifcDate?: string | null;
  documentId?: string | null;
  folderId?: string | null;
  specSection?: string | null;
}

// ============================================================================
// DRAWING REVISION INTERFACES
// ============================================================================

export interface DrawingRevision {
  id: string;
  drawingId: string;

  // Revision identification
  revision: string;
  revisionDate: string;
  revisionDescription?: string;

  // Source of revision
  revisionType: RevisionType;
  sourceReference?: string;

  // File information
  filePath?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  thumbnailUrl?: string;

  // Status
  isCurrent: boolean;
  isSuperseded: boolean;
  supersededDate?: string;
  supersededBy?: string;

  // Approval/Review
  reviewedBy?: string;
  reviewedAt?: string;
  approvedBy?: string;
  approvedAt?: string;

  // Distribution tracking
  firstIssuedDate?: string;
  firstIssuedVia?: string;

  // Metadata
  createdAt: string;
  createdBy?: string;
  notes?: string;

  // Joined data
  createdByName?: string;
}

export interface DrawingRevisionInsert {
  drawingId: string;
  revision: string;
  revisionDate: string;
  revisionDescription?: string;
  revisionType?: RevisionType;
  sourceReference?: string;
  filePath?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  thumbnailUrl?: string;
  isCurrent?: boolean;
  notes?: string;
}

export interface DrawingRevisionUpdate {
  revisionDescription?: string | null;
  revisionType?: RevisionType;
  sourceReference?: string | null;
  filePath?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  thumbnailUrl?: string | null;
  isCurrent?: boolean;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  notes?: string | null;
}

// ============================================================================
// DRAWING SET INTERFACES
// ============================================================================

export interface DrawingSet {
  id: string;
  companyId: string;
  projectId: string;

  // Set identification
  name: string;
  setNumber?: string;
  description?: string;

  // Set date
  setDate: string;
  issuePurpose?: string;

  // Status
  isCurrent: boolean;
  status: DrawingSetStatus;

  // Transmittal link
  transmittalId?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string;

  // Joined data
  itemCount?: number;
  items?: DrawingSetItem[];
}

export interface DrawingSetInsert {
  companyId: string;
  projectId: string;
  name: string;
  setNumber?: string;
  description?: string;
  setDate: string;
  issuePurpose?: string;
  isCurrent?: boolean;
  status?: DrawingSetStatus;
  transmittalId?: string;
}

export interface DrawingSetItem {
  id: string;
  drawingSetId: string;
  drawingId: string;
  revisionId: string;
  sortOrder: number;
  addedAt: string;
  addedBy?: string;

  // Joined data
  drawing?: Drawing;
  revision?: DrawingRevision;
}

export interface DrawingSetItemInsert {
  drawingSetId: string;
  drawingId: string;
  revisionId: string;
  sortOrder?: number;
}

// ============================================================================
// DRAWING TRANSMITTAL INTERFACES
// ============================================================================

export interface DrawingTransmittal {
  id: string;
  drawingId: string;
  revisionId: string;

  // Transmittal reference
  transmittalId?: string;
  transmittalNumber?: string;
  transmittalDate: string;

  // Recipient info
  recipientCompany?: string;
  recipientName?: string;
  recipientEmail?: string;

  // Copies
  copiesSent: number;
  format?: string;

  // Acknowledgment
  acknowledged: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;

  // Metadata
  createdAt: string;
  createdBy?: string;
  notes?: string;
}

export interface DrawingTransmittalInsert {
  drawingId: string;
  revisionId: string;
  transmittalId?: string;
  transmittalNumber?: string;
  transmittalDate: string;
  recipientCompany?: string;
  recipientName?: string;
  recipientEmail?: string;
  copiesSent?: number;
  format?: string;
  notes?: string;
}

// ============================================================================
// DRAWING MARKUP INTERFACES
// ============================================================================

export interface DrawingMarkup {
  id: string;
  drawingId: string;
  revisionId: string;

  // Markup identification
  markupNumber?: number;

  // Location on drawing
  pageNumber: number;
  xPosition?: number;
  yPosition?: number;
  width?: number;
  height?: number;

  // Markup content
  markupType: MarkupType;
  content?: string;
  color: string;

  // Markup data (for complex shapes)
  markupData?: Record<string, unknown>;

  // Status
  status: MarkupStatus;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;

  // Related items
  relatedRfiId?: string;
  relatedSubmittalId?: string;

  // Metadata
  createdAt: string;
  createdBy?: string;
}

export interface DrawingMarkupInsert {
  drawingId: string;
  revisionId: string;
  pageNumber?: number;
  xPosition?: number;
  yPosition?: number;
  width?: number;
  height?: number;
  markupType: MarkupType;
  content?: string;
  color?: string;
  markupData?: Record<string, unknown>;
  relatedRfiId?: string;
  relatedSubmittalId?: string;
}

export interface DrawingMarkupUpdate {
  content?: string | null;
  color?: string;
  status?: MarkupStatus;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  resolutionNotes?: string | null;
}

// ============================================================================
// FILTER & STATISTICS INTERFACES
// ============================================================================

export interface DrawingFilters {
  projectId: string;
  discipline?: DrawingDiscipline;
  status?: DrawingStatus;
  isIssuedForConstruction?: boolean;
  search?: string;
  specSection?: string;
}

export interface DrawingRegisterEntry {
  id: string;
  drawingNumber: string;
  title: string;
  discipline: DrawingDiscipline;
  currentRevision?: string;
  currentRevisionDate?: string;
  status: DrawingStatus;
  isIssuedForConstruction: boolean;
  revisionCount: number;
  lastTransmittalDate?: string;
}

export interface DisciplineSummary {
  discipline: DrawingDiscipline;
  totalDrawings: number;
  ifcDrawings: number;
  latestRevisionDate?: string;
}

export interface RevisionHistoryEntry {
  revision: string;
  revisionDate: string;
  revisionDescription?: string;
  revisionType: RevisionType;
  isCurrent: boolean;
  isSuperseded: boolean;
  fileUrl?: string;
  createdByName?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const DRAWING_DISCIPLINES: { value: DrawingDiscipline; label: string; prefix: string }[] = [
  { value: 'architectural', label: 'Architectural', prefix: 'A' },
  { value: 'structural', label: 'Structural', prefix: 'S' },
  { value: 'mechanical', label: 'Mechanical', prefix: 'M' },
  { value: 'electrical', label: 'Electrical', prefix: 'E' },
  { value: 'plumbing', label: 'Plumbing', prefix: 'P' },
  { value: 'civil', label: 'Civil', prefix: 'C' },
  { value: 'landscape', label: 'Landscape', prefix: 'L' },
  { value: 'fire_protection', label: 'Fire Protection', prefix: 'FP' },
  { value: 'other', label: 'Other', prefix: 'X' },
];

export const DRAWING_STATUSES: { value: DrawingStatus; label: string; color: string }[] = [
  { value: 'active', label: 'Active', color: 'green' },
  { value: 'superseded', label: 'Superseded', color: 'yellow' },
  { value: 'void', label: 'Void', color: 'red' },
  { value: 'for_reference_only', label: 'For Reference Only', color: 'gray' },
];

export const REVISION_TYPES: { value: RevisionType; label: string }[] = [
  { value: 'standard', label: 'Standard Revision' },
  { value: 'asi', label: "Architect's Supplemental Instruction (ASI)" },
  { value: 'bulletin', label: 'Bulletin' },
  { value: 'addendum', label: 'Addendum' },
  { value: 'rfi_response', label: 'RFI Response' },
];

export const SHEET_SIZES: { value: SheetSize; label: string; dimensions: string }[] = [
  { value: 'A', label: 'A (8.5 x 11)', dimensions: '8.5" x 11"' },
  { value: 'B', label: 'B (11 x 17)', dimensions: '11" x 17"' },
  { value: 'C', label: 'C (17 x 22)', dimensions: '17" x 22"' },
  { value: 'D', label: 'D (22 x 34)', dimensions: '22" x 34"' },
  { value: 'E', label: 'E (34 x 44)', dimensions: '34" x 44"' },
  { value: 'ARCH A', label: 'ARCH A (9 x 12)', dimensions: '9" x 12"' },
  { value: 'ARCH B', label: 'ARCH B (12 x 18)', dimensions: '12" x 18"' },
  { value: 'ARCH C', label: 'ARCH C (18 x 24)', dimensions: '18" x 24"' },
  { value: 'ARCH D', label: 'ARCH D (24 x 36)', dimensions: '24" x 36"' },
  { value: 'ARCH E', label: 'ARCH E (36 x 48)', dimensions: '36" x 48"' },
];

export const ISSUE_PURPOSES: { value: IssuePurpose; label: string }[] = [
  { value: 'For Construction', label: 'For Construction' },
  { value: 'For Permit', label: 'For Permit' },
  { value: 'For Bid', label: 'For Bid' },
  { value: 'For Review', label: 'For Review' },
  { value: 'For Coordination', label: 'For Coordination' },
  { value: 'For Record', label: 'For Record' },
];

export const MARKUP_TYPES: { value: MarkupType; label: string; icon: string }[] = [
  { value: 'comment', label: 'Comment', icon: 'MessageSquare' },
  { value: 'cloud', label: 'Revision Cloud', icon: 'Cloud' },
  { value: 'arrow', label: 'Arrow', icon: 'ArrowRight' },
  { value: 'dimension', label: 'Dimension', icon: 'Ruler' },
  { value: 'text', label: 'Text', icon: 'Type' },
  { value: 'highlight', label: 'Highlight', icon: 'Highlighter' },
  { value: 'redline', label: 'Redline', icon: 'Pen' },
];

// ============================================================================
// DRAWING PACKAGE TYPES
// ============================================================================

export type DrawingPackageType = 'bid' | 'submittal' | 'construction' | 'as_built';

export type DrawingPackageStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'distributed'
  | 'superseded'
  | 'archived';

export interface DrawingPackage {
  id: string;
  companyId: string;
  projectId: string;

  // Package identification
  packageNumber: string;
  name: string;
  description?: string;
  packageType: DrawingPackageType;

  // Version control
  version: number;
  supersedesPackageId?: string;

  // Status tracking
  status: DrawingPackageStatus;
  approvedBy?: string;
  approvedAt?: string;
  approvalNotes?: string;

  // Cover sheet information
  coverSheetTitle?: string;
  coverSheetSubtitle?: string;
  coverSheetLogoUrl?: string;
  coverSheetNotes?: string;
  includeCoverSheet: boolean;
  includeToc: boolean;
  includeRevisionHistory: boolean;

  // Distribution settings
  requireAcknowledgment: boolean;
  acknowledgmentDeadline?: string;
  allowDownload: boolean;
  downloadExpiresAt?: string;
  accessPassword?: string;

  // Generated files
  mergedPdfUrl?: string;
  mergedPdfGeneratedAt?: string;
  coverSheetPdfUrl?: string;
  tocPdfUrl?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  deletedAt?: string;

  // Joined data
  projectName?: string;
  companyName?: string;
  createdByName?: string;
  approvedByName?: string;
  itemCount?: number;
  items?: DrawingPackageItem[];
  recipients?: DrawingPackageRecipient[];
  statistics?: DrawingPackageStatistics;
}

export interface DrawingPackageInsert {
  companyId: string;
  projectId: string;
  packageNumber?: string;
  name: string;
  description?: string;
  packageType: DrawingPackageType;
  coverSheetTitle?: string;
  coverSheetSubtitle?: string;
  coverSheetLogoUrl?: string;
  coverSheetNotes?: string;
  includeCoverSheet?: boolean;
  includeToc?: boolean;
  includeRevisionHistory?: boolean;
  requireAcknowledgment?: boolean;
  acknowledgmentDeadline?: string;
  allowDownload?: boolean;
  downloadExpiresAt?: string;
  accessPassword?: string;
}

export interface DrawingPackageUpdate {
  name?: string;
  description?: string | null;
  packageType?: DrawingPackageType;
  status?: DrawingPackageStatus;
  coverSheetTitle?: string | null;
  coverSheetSubtitle?: string | null;
  coverSheetLogoUrl?: string | null;
  coverSheetNotes?: string | null;
  includeCoverSheet?: boolean;
  includeToc?: boolean;
  includeRevisionHistory?: boolean;
  requireAcknowledgment?: boolean;
  acknowledgmentDeadline?: string | null;
  allowDownload?: boolean;
  downloadExpiresAt?: string | null;
  accessPassword?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  approvalNotes?: string | null;
  mergedPdfUrl?: string | null;
  mergedPdfGeneratedAt?: string | null;
}

export interface DrawingPackageItem {
  id: string;
  packageId: string;
  drawingId: string;
  revisionId?: string;

  // Ordering and organization
  sortOrder: number;
  sectionName?: string;

  // Override display info
  displayNumber?: string;
  displayTitle?: string;

  // Inclusion status
  isIncluded: boolean;
  notes?: string;

  // Metadata
  addedAt: string;
  addedBy?: string;

  // Joined data
  drawing?: Drawing;
  revision?: DrawingRevision;
  addedByName?: string;
}

export interface DrawingPackageItemInsert {
  packageId: string;
  drawingId: string;
  revisionId?: string;
  sortOrder?: number;
  sectionName?: string;
  displayNumber?: string;
  displayTitle?: string;
  isIncluded?: boolean;
  notes?: string;
}

export interface DrawingPackageItemUpdate {
  revisionId?: string | null;
  sortOrder?: number;
  sectionName?: string | null;
  displayNumber?: string | null;
  displayTitle?: string | null;
  isIncluded?: boolean;
  notes?: string | null;
}

export interface DrawingPackageRecipient {
  id: string;
  packageId: string;

  // Recipient information
  recipientEmail: string;
  recipientName?: string;
  recipientCompany?: string;
  recipientRole?: string;

  // Distribution tracking
  distributionMethod: 'email' | 'link' | 'download';
  sentAt?: string;
  sentBy?: string;

  // Access tracking
  accessToken?: string;
  accessTokenExpiresAt?: string;
  firstAccessedAt?: string;
  lastAccessedAt?: string;
  accessCount: number;

  // Download tracking
  downloadedAt?: string;
  downloadCount: number;

  // Acknowledgment
  acknowledgedAt?: string;
  acknowledgmentNotes?: string;
  acknowledgmentIp?: string;

  // Notification preferences
  sendReminder: boolean;
  reminderSentAt?: string;

  // Metadata
  createdAt: string;

  // Joined data
  sentByName?: string;
}

export interface DrawingPackageRecipientInsert {
  packageId: string;
  recipientEmail: string;
  recipientName?: string;
  recipientCompany?: string;
  recipientRole?: string;
  distributionMethod?: 'email' | 'link' | 'download';
  sendReminder?: boolean;
}

export interface DrawingPackageRecipientUpdate {
  recipientName?: string | null;
  recipientCompany?: string | null;
  recipientRole?: string | null;
  distributionMethod?: 'email' | 'link' | 'download';
  sendReminder?: boolean;
  sentAt?: string | null;
  sentBy?: string | null;
  accessToken?: string | null;
  accessTokenExpiresAt?: string | null;
  firstAccessedAt?: string | null;
  lastAccessedAt?: string | null;
  accessCount?: number;
  downloadedAt?: string | null;
  downloadCount?: number;
  acknowledgedAt?: string | null;
  acknowledgmentNotes?: string | null;
}

export interface DrawingPackageActivity {
  id: string;
  packageId: string;
  recipientId?: string;

  // Activity details
  activityType: string;
  activityDescription?: string;
  activityMetadata?: Record<string, unknown>;

  // Actor information
  performedBy?: string;
  performedByEmail?: string;
  performedByIp?: string;

  // Metadata
  createdAt: string;

  // Joined data
  performedByName?: string;
  recipientEmail?: string;
}

export interface DrawingPackageStatistics {
  totalDrawings: number;
  includedDrawings: number;
  totalRecipients: number;
  sentCount: number;
  accessedCount: number;
  downloadedCount: number;
  acknowledgedCount: number;
  pendingAcknowledgments: number;
}

export interface DrawingPackageFilters {
  projectId: string;
  packageType?: DrawingPackageType;
  status?: DrawingPackageStatus;
  search?: string;
  includeArchived?: boolean;
}

// ============================================================================
// DRAWING PACKAGE CONSTANTS
// ============================================================================

export const DRAWING_PACKAGE_TYPES: { value: DrawingPackageType; label: string; description: string; color: string }[] = [
  { value: 'bid', label: 'Bid Package', description: 'For contractors bidding on work', color: 'blue' },
  { value: 'submittal', label: 'Submittal Package', description: 'For review by engineers/architects', color: 'purple' },
  { value: 'construction', label: 'Construction Package', description: 'For field teams during construction', color: 'green' },
  { value: 'as_built', label: 'As-Built Package', description: 'For project closeout', color: 'orange' },
];

export const DRAWING_PACKAGE_STATUSES: { value: DrawingPackageStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Draft', color: 'gray' },
  { value: 'pending_review', label: 'Pending Review', color: 'yellow' },
  { value: 'approved', label: 'Approved', color: 'blue' },
  { value: 'distributed', label: 'Distributed', color: 'green' },
  { value: 'superseded', label: 'Superseded', color: 'orange' },
  { value: 'archived', label: 'Archived', color: 'red' },
];
