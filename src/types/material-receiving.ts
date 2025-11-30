/**
 * Material Receiving Types
 * Types for tracking material deliveries, photos, and status workflow
 */

// =============================================
// Enums and Constants
// =============================================

export type MaterialCondition = 'good' | 'damaged' | 'partial' | 'rejected';

export type MaterialStatus = 'received' | 'inspected' | 'stored' | 'issued' | 'returned';

export type MaterialPhotoType = 'delivery' | 'ticket' | 'damage' | 'storage' | 'other';

export const MATERIAL_CONDITIONS: { value: MaterialCondition; label: string; color: string }[] = [
  { value: 'good', label: 'Good', color: 'green' },
  { value: 'damaged', label: 'Damaged', color: 'red' },
  { value: 'partial', label: 'Partial Delivery', color: 'yellow' },
  { value: 'rejected', label: 'Rejected', color: 'red' },
];

export const MATERIAL_STATUSES: { value: MaterialStatus; label: string; color: string }[] = [
  { value: 'received', label: 'Received', color: 'blue' },
  { value: 'inspected', label: 'Inspected', color: 'purple' },
  { value: 'stored', label: 'Stored', color: 'green' },
  { value: 'issued', label: 'Issued', color: 'orange' },
  { value: 'returned', label: 'Returned', color: 'gray' },
];

export const MATERIAL_PHOTO_TYPES: { value: MaterialPhotoType; label: string }[] = [
  { value: 'delivery', label: 'Delivery Photo' },
  { value: 'ticket', label: 'Delivery Ticket' },
  { value: 'damage', label: 'Damage Documentation' },
  { value: 'storage', label: 'Storage Location' },
  { value: 'other', label: 'Other' },
];

// =============================================
// Core Types
// =============================================

export interface MaterialReceived {
  id: string;
  project_id: string;

  // Delivery Info
  delivery_date: string;
  delivery_time: string | null;
  delivery_ticket_number: string | null;

  // Material Info
  material_description: string;
  quantity: string | null;
  unit: string | null;

  // Vendor
  vendor: string | null;
  vendor_contact: string | null;

  // Links
  submittal_procurement_id: string | null;
  daily_report_delivery_id: string | null;

  // Storage
  storage_location: string | null;

  // Tracking
  po_number: string | null;

  // Receiver
  received_by: string | null;

  // Inspection
  inspected_by: string | null;
  inspected_at: string | null;

  // Condition
  condition: MaterialCondition;
  condition_notes: string | null;

  // Status
  status: MaterialStatus;
  notes: string | null;

  // Standard fields
  created_at: string;
  updated_at: string;
  created_by: string;
  deleted_at: string | null;
}

export interface MaterialReceivedPhoto {
  id: string;
  material_received_id: string;

  // Photo Info
  photo_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  photo_type: MaterialPhotoType;

  // Metadata
  taken_at: string | null;
  taken_by: string | null;

  // GPS Location
  latitude: number | null;
  longitude: number | null;

  // Standard fields
  created_at: string;
  created_by: string | null;
  deleted_at: string | null;
}

// =============================================
// Extended Types with Relations
// =============================================

export interface MaterialReceivedWithDetails extends MaterialReceived {
  received_by_name: string | null;
  received_by_email: string | null;
  inspected_by_name: string | null;
  inspected_by_email: string | null;
  created_by_name: string | null;
  project_name: string;
  project_number: string | null;
  submittal_id: string | null;
  submittal_number: string | null;
  submittal_title: string | null;
  daily_report_id: string | null;
  daily_report_date: string | null;
  photo_count: number;
}

export interface MaterialReceivedWithPhotos extends MaterialReceived {
  photos: MaterialReceivedPhoto[];
}

// =============================================
// DTO Types (Data Transfer Objects)
// =============================================

export interface CreateMaterialReceivedDTO {
  project_id: string;
  delivery_date: string;
  delivery_time?: string | null;
  delivery_ticket_number?: string | null;
  material_description: string;
  quantity?: string | null;
  unit?: string | null;
  vendor?: string | null;
  vendor_contact?: string | null;
  submittal_procurement_id?: string | null;
  daily_report_delivery_id?: string | null;
  storage_location?: string | null;
  po_number?: string | null;
  received_by?: string | null;
  condition?: MaterialCondition;
  condition_notes?: string | null;
  status?: MaterialStatus;
  notes?: string | null;
}

export interface UpdateMaterialReceivedDTO {
  delivery_date?: string;
  delivery_time?: string | null;
  delivery_ticket_number?: string | null;
  material_description?: string;
  quantity?: string | null;
  unit?: string | null;
  vendor?: string | null;
  vendor_contact?: string | null;
  submittal_procurement_id?: string | null;
  daily_report_delivery_id?: string | null;
  storage_location?: string | null;
  po_number?: string | null;
  received_by?: string | null;
  inspected_by?: string | null;
  inspected_at?: string | null;
  condition?: MaterialCondition;
  condition_notes?: string | null;
  status?: MaterialStatus;
  notes?: string | null;
}

export interface CreateMaterialPhotoDTO {
  material_received_id: string;
  photo_url: string;
  thumbnail_url?: string | null;
  caption?: string | null;
  photo_type?: MaterialPhotoType;
  taken_at?: string | null;
  taken_by?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface UpdateMaterialPhotoDTO {
  caption?: string | null;
  photo_type?: MaterialPhotoType;
}

// =============================================
// Filter Types
// =============================================

export interface MaterialReceivedFilters {
  projectId: string;
  status?: MaterialStatus;
  condition?: MaterialCondition;
  vendor?: string;
  dateFrom?: string;
  dateTo?: string;
  storageLocation?: string;
  hasSubmittal?: boolean;
  hasDailyReport?: boolean;
  search?: string;
}

// =============================================
// Statistics Types
// =============================================

export interface MaterialReceivingStats {
  total_deliveries: number;
  this_week: number;
  this_month: number;
  pending_inspection: number;
  with_issues: number;
  by_status: {
    received: number;
    inspected: number;
    stored: number;
    issued: number;
    returned: number;
  };
  by_condition: {
    good: number;
    damaged: number;
    partial: number;
    rejected: number;
  };
  unique_vendors: number;
}

// =============================================
// Form Types
// =============================================

export interface MaterialReceivedFormData {
  delivery_date: string;
  delivery_time: string;
  delivery_ticket_number: string;
  material_description: string;
  quantity: string;
  unit: string;
  vendor: string;
  vendor_contact: string;
  storage_location: string;
  po_number: string;
  condition: MaterialCondition;
  condition_notes: string;
  status: MaterialStatus;
  notes: string;
  submittal_procurement_id: string;
}
