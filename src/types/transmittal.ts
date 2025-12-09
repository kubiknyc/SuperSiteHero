/**
 * Transmittal Types
 * Types for document transmittals for RFIs, Submittals, Drawings, and other documents
 * Aligned with migration 086_transmittals.sql
 */

// =============================================
// Enums and Constants
// =============================================

export type TransmittalStatus = 'draft' | 'sent' | 'received' | 'acknowledged' | 'void';

export type TransmissionMethod = 'email' | 'mail' | 'hand_delivery' | 'courier' | 'pickup';

export type TransmittalItemType =
  | 'document'
  | 'rfi'
  | 'submittal'
  | 'drawing'
  | 'shop_drawing'
  | 'specification'
  | 'report'
  | 'other';

export type ItemActionRequired =
  | 'for_approval'
  | 'for_review'
  | 'for_information'
  | 'for_record'
  | 'as_requested'
  | 'for_signature';

export type ItemFormat = 'pdf' | 'hard_copy' | 'both' | 'original' | 'copy';

export type ItemStatus = 'included' | 'pending' | 'returned' | 'missing';

export const TRANSMITTAL_STATUSES: { value: TransmittalStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Draft', color: 'gray' },
  { value: 'sent', label: 'Sent', color: 'blue' },
  { value: 'received', label: 'Received', color: 'green' },
  { value: 'acknowledged', label: 'Acknowledged', color: 'emerald' },
  { value: 'void', label: 'Void', color: 'red' },
];

export const TRANSMISSION_METHODS: { value: TransmissionMethod; label: string }[] = [
  { value: 'email', label: 'Email' },
  { value: 'mail', label: 'Mail' },
  { value: 'hand_delivery', label: 'Hand Delivery' },
  { value: 'courier', label: 'Courier' },
  { value: 'pickup', label: 'Pickup' },
];

export const TRANSMITTAL_ITEM_TYPES: { value: TransmittalItemType; label: string }[] = [
  { value: 'document', label: 'Document' },
  { value: 'rfi', label: 'RFI' },
  { value: 'submittal', label: 'Submittal' },
  { value: 'drawing', label: 'Drawing' },
  { value: 'shop_drawing', label: 'Shop Drawing' },
  { value: 'specification', label: 'Specification' },
  { value: 'report', label: 'Report' },
  { value: 'other', label: 'Other' },
];

export const ITEM_ACTIONS: { value: ItemActionRequired; label: string; description: string }[] = [
  { value: 'for_approval', label: 'For Approval', description: 'Requires formal approval' },
  { value: 'for_review', label: 'For Review', description: 'Review and comment' },
  { value: 'for_information', label: 'For Information', description: 'FYI only' },
  { value: 'for_record', label: 'For Record', description: 'Maintain on file' },
  { value: 'as_requested', label: 'As Requested', description: 'Per previous request' },
  { value: 'for_signature', label: 'For Signature', description: 'Requires signature' },
];

export const ITEM_FORMATS: { value: ItemFormat; label: string }[] = [
  { value: 'pdf', label: 'PDF' },
  { value: 'hard_copy', label: 'Hard Copy' },
  { value: 'both', label: 'PDF + Hard Copy' },
  { value: 'original', label: 'Original' },
  { value: 'copy', label: 'Copy' },
];

// =============================================
// Core Types (Database Schema)
// =============================================

/**
 * Transmittal
 */
export interface Transmittal {
  id: string;
  company_id: string;
  project_id: string;

  // Identification
  transmittal_number: string;
  revision_number: number;

  // Dates
  date_sent: string | null;
  date_due: string | null;

  // Sender
  from_company: string;
  from_contact: string | null;
  from_email: string | null;
  from_phone: string | null;

  // Recipient
  to_company: string;
  to_contact: string | null;
  to_email: string | null;
  to_phone: string | null;

  // Content
  subject: string;
  remarks: string | null;
  cover_letter: string | null;

  // Transmission
  transmission_method: TransmissionMethod;
  tracking_number: string | null;

  // Distribution
  distribution_list_id: string | null;
  cc_list: string[] | null;
  cc_external: ExternalContact[] | null;

  // Status
  status: TransmittalStatus;
  sent_by: string | null;
  sent_at: string | null;

  // Receipt
  received_by: string | null;
  received_date: string | null;
  acknowledgment_notes: string | null;
  acknowledgment_signature: string | null;

  // Response
  response_required: boolean;
  response_due_date: string | null;
  response_received: boolean;
  response_date: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/**
 * Transmittal Item
 */
export interface TransmittalItem {
  id: string;
  transmittal_id: string;

  // Identification
  item_number: number;
  item_type: TransmittalItemType;

  // Reference
  reference_id: string | null;
  reference_number: string | null;

  // Details
  description: string;
  specification_section: string | null;
  drawing_number: string | null;

  // Copies
  copies: number;
  format: ItemFormat;

  // Action
  action_required: ItemActionRequired;
  status: ItemStatus;

  // Metadata
  created_at: string;
  notes: string | null;
}

/**
 * Transmittal Attachment
 */
export interface TransmittalAttachment {
  id: string;
  transmittal_id: string;
  item_id: string | null;

  // File info
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;

  // Metadata
  uploaded_at: string;
  uploaded_by: string | null;
}

/**
 * External contact for CC
 */
export interface ExternalContact {
  email: string;
  name?: string;
  company?: string;
}

// =============================================
// Extended Types with Relations
// =============================================

/**
 * Transmittal with project details
 */
export interface TransmittalWithProject extends Transmittal {
  project?: {
    id: string;
    name: string;
    project_number?: string;
  };
}

/**
 * Transmittal with items
 */
export interface TransmittalWithItems extends Transmittal {
  items: TransmittalItem[];
}

/**
 * Transmittal with attachments
 */
export interface TransmittalWithAttachments extends Transmittal {
  attachments: TransmittalAttachment[];
}

/**
 * Transmittal with all relations
 */
export interface TransmittalWithDetails extends Transmittal {
  project?: {
    id: string;
    name: string;
    project_number?: string;
  };
  items: TransmittalItem[];
  attachments: TransmittalAttachment[];
  created_by_user?: {
    id: string;
    full_name: string;
    email: string;
  };
  sent_by_user?: {
    id: string;
    full_name: string;
    email: string;
  };
  distribution_list?: {
    id: string;
    name: string;
  };
}

/**
 * Item with reference details (RFI, Submittal, etc.)
 */
export interface TransmittalItemWithReference extends TransmittalItem {
  reference?: {
    id: string;
    number: string;
    title: string;
    status: string;
  };
}

// =============================================
// DTO Types (Data Transfer Objects)
// =============================================

/**
 * Create Transmittal input
 */
export interface CreateTransmittalDTO {
  project_id: string;
  transmittal_number?: string; // Auto-generated if omitted

  // Dates
  date_sent?: string;
  date_due?: string;

  // Sender (defaults to company info)
  from_company: string;
  from_contact?: string;
  from_email?: string;
  from_phone?: string;

  // Recipient
  to_company: string;
  to_contact?: string;
  to_email?: string;
  to_phone?: string;

  // Content
  subject: string;
  remarks?: string;
  cover_letter?: string;

  // Transmission
  transmission_method?: TransmissionMethod;
  tracking_number?: string;

  // Distribution
  distribution_list_id?: string;
  cc_list?: string[];
  cc_external?: ExternalContact[];

  // Response
  response_required?: boolean;
  response_due_date?: string;

  // Items to add
  items?: CreateTransmittalItemDTO[];
}

/**
 * Update Transmittal input
 */
export interface UpdateTransmittalDTO {
  date_sent?: string;
  date_due?: string;

  from_company?: string;
  from_contact?: string;
  from_email?: string;
  from_phone?: string;

  to_company?: string;
  to_contact?: string;
  to_email?: string;
  to_phone?: string;

  subject?: string;
  remarks?: string;
  cover_letter?: string;

  transmission_method?: TransmissionMethod;
  tracking_number?: string;

  distribution_list_id?: string | null;
  cc_list?: string[];
  cc_external?: ExternalContact[];

  status?: TransmittalStatus;

  received_by?: string;
  received_date?: string;
  acknowledgment_notes?: string;
  acknowledgment_signature?: string;

  response_required?: boolean;
  response_due_date?: string;
  response_received?: boolean;
  response_date?: string;
}

/**
 * Create Transmittal Item input
 */
export interface CreateTransmittalItemDTO {
  transmittal_id?: string; // Optional if creating with transmittal
  item_type: TransmittalItemType;
  reference_id?: string;
  reference_number?: string;
  description: string;
  specification_section?: string;
  drawing_number?: string;
  copies?: number;
  format?: ItemFormat;
  action_required?: ItemActionRequired;
  notes?: string;
}

/**
 * Update Transmittal Item input
 */
export interface UpdateTransmittalItemDTO {
  item_type?: TransmittalItemType;
  reference_id?: string;
  reference_number?: string;
  description?: string;
  specification_section?: string;
  drawing_number?: string;
  copies?: number;
  format?: ItemFormat;
  action_required?: ItemActionRequired;
  status?: ItemStatus;
  notes?: string;
}

// =============================================
// Filter Types
// =============================================

export interface TransmittalFilters {
  projectId?: string;
  status?: TransmittalStatus;
  toCompany?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  responseRequired?: boolean;
}

// =============================================
// Utility Functions
// =============================================

/**
 * Get status badge color
 */
export function getTransmittalStatusColor(status: TransmittalStatus): string {
  const config = TRANSMITTAL_STATUSES.find(s => s.value === status);
  return config?.color || 'gray';
}

/**
 * Get status label
 */
export function getTransmittalStatusLabel(status: TransmittalStatus): string {
  const config = TRANSMITTAL_STATUSES.find(s => s.value === status);
  return config?.label || status;
}

/**
 * Get item type label
 */
export function getItemTypeLabel(type: TransmittalItemType): string {
  const config = TRANSMITTAL_ITEM_TYPES.find(t => t.value === type);
  return config?.label || type;
}

/**
 * Get action required label
 */
export function getActionLabel(action: ItemActionRequired): string {
  const config = ITEM_ACTIONS.find(a => a.value === action);
  return config?.label || action;
}

/**
 * Get format label
 */
export function getFormatLabel(format: ItemFormat): string {
  const config = ITEM_FORMATS.find(f => f.value === format);
  return config?.label || format;
}

/**
 * Get transmission method label
 */
export function getTransmissionMethodLabel(method: TransmissionMethod): string {
  const config = TRANSMISSION_METHODS.find(m => m.value === method);
  return config?.label || method;
}

/**
 * Check if transmittal can be edited
 */
export function canEditTransmittal(transmittal: Transmittal): boolean {
  return transmittal.status === 'draft';
}

/**
 * Check if transmittal can be sent
 */
export function canSendTransmittal(transmittal: TransmittalWithItems): boolean {
  return transmittal.status === 'draft' && transmittal.items.length > 0;
}

/**
 * Check if transmittal can be acknowledged
 */
export function canAcknowledgeTransmittal(transmittal: Transmittal): boolean {
  return transmittal.status === 'sent' || transmittal.status === 'received';
}

/**
 * Format transmittal number for display
 */
export function formatTransmittalNumber(number: string, revision?: number): string {
  if (revision && revision > 0) {
    return `${number} Rev. ${revision}`;
  }
  return number;
}

/**
 * Get item count by type
 */
export function getItemCountsByType(items: TransmittalItem[]): Record<TransmittalItemType, number> {
  const counts: Partial<Record<TransmittalItemType, number>> = {};
  items.forEach(item => {
    counts[item.item_type] = (counts[item.item_type] || 0) + 1;
  });
  return counts as Record<TransmittalItemType, number>;
}

/**
 * Calculate total copies
 */
export function getTotalCopies(items: TransmittalItem[]): number {
  return items.reduce((sum, item) => sum + item.copies, 0);
}
