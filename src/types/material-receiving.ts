/**
 * Material Receiving Types
 * Types for tracking material deliveries, photos, and status workflow
 * Aligned with migration 043_material_receiving.sql
 */

// =============================================
// Enums and Constants
// =============================================

export type DeliveryStatus = 'scheduled' | 'received' | 'partially_received' | 'rejected' | 'back_ordered';

export type ConditionStatus = 'good' | 'damaged' | 'defective' | 'incorrect';

export type MaterialCondition = ConditionStatus; // Alias for backwards compatibility

export type MaterialStatus = 'received' | 'inspected' | 'stored' | 'issued' | 'returned';

export type MaterialPhotoType = 'delivery_ticket' | 'material_condition' | 'storage_location' | 'damage' | 'packaging' | 'other';

export type MaterialCategory =
  | 'lumber'
  | 'concrete'
  | 'steel'
  | 'drywall'
  | 'plumbing'
  | 'electrical'
  | 'hvac'
  | 'roofing'
  | 'insulation'
  | 'flooring'
  | 'windows_doors'
  | 'fixtures'
  | 'hardware'
  | 'paint_finishes'
  | 'other';

export type UnitOfMeasure =
  | 'ea'    // Each
  | 'lf'    // Linear Feet
  | 'sf'    // Square Feet
  | 'cy'    // Cubic Yards
  | 'ton'   // Tons
  | 'lbs'   // Pounds
  | 'gal'   // Gallons
  | 'box'   // Box
  | 'pallet' // Pallet
  | 'bundle' // Bundle
  | 'set'   // Set
  | 'roll'  // Roll
  | 'sheet'; // Sheet

export const DELIVERY_STATUSES: { value: DeliveryStatus; label: string }[] = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'received', label: 'Received' },
  { value: 'partially_received', label: 'Partially Received' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'back_ordered', label: 'Back Ordered' },
];

export const CONDITION_STATUSES: { value: ConditionStatus; label: string }[] = [
  { value: 'good', label: 'Good' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'defective', label: 'Defective' },
  { value: 'incorrect', label: 'Incorrect' },
];

export const MATERIAL_CONDITIONS: { value: MaterialCondition; label: string; color: string }[] = [
  { value: 'good', label: 'Good', color: 'green' },
  { value: 'damaged', label: 'Damaged', color: 'red' },
  { value: 'defective', label: 'Defective', color: 'red' },
  { value: 'incorrect', label: 'Incorrect', color: 'orange' },
];

export const MATERIAL_STATUSES: { value: MaterialStatus; label: string; color: string }[] = [
  { value: 'received', label: 'Received', color: 'blue' },
  { value: 'inspected', label: 'Inspected', color: 'purple' },
  { value: 'stored', label: 'Stored', color: 'green' },
  { value: 'issued', label: 'Issued', color: 'orange' },
  { value: 'returned', label: 'Returned', color: 'gray' },
];

export const MATERIAL_CATEGORIES: { value: MaterialCategory; label: string }[] = [
  { value: 'lumber', label: 'Lumber' },
  { value: 'concrete', label: 'Concrete' },
  { value: 'steel', label: 'Steel' },
  { value: 'drywall', label: 'Drywall' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'insulation', label: 'Insulation' },
  { value: 'flooring', label: 'Flooring' },
  { value: 'windows_doors', label: 'Windows & Doors' },
  { value: 'fixtures', label: 'Fixtures' },
  { value: 'hardware', label: 'Hardware' },
  { value: 'paint_finishes', label: 'Paint & Finishes' },
  { value: 'other', label: 'Other' },
];

export const UNITS_OF_MEASURE: { value: UnitOfMeasure; label: string }[] = [
  { value: 'ea', label: 'Each (EA)' },
  { value: 'lf', label: 'Linear Feet (LF)' },
  { value: 'sf', label: 'Square Feet (SF)' },
  { value: 'cy', label: 'Cubic Yards (CY)' },
  { value: 'ton', label: 'Tons (TON)' },
  { value: 'lbs', label: 'Pounds (LBS)' },
  { value: 'gal', label: 'Gallons (GAL)' },
  { value: 'box', label: 'Box (BOX)' },
  { value: 'pallet', label: 'Pallet (PALLET)' },
  { value: 'bundle', label: 'Bundle (BUNDLE)' },
  { value: 'set', label: 'Set (SET)' },
  { value: 'roll', label: 'Roll (ROLL)' },
  { value: 'sheet', label: 'Sheet (SHEET)' },
];

export const MATERIAL_PHOTO_TYPES: { value: MaterialPhotoType; label: string }[] = [
  { value: 'delivery_ticket', label: 'Delivery Ticket' },
  { value: 'material_condition', label: 'Material Condition' },
  { value: 'storage_location', label: 'Storage Location' },
  { value: 'damage', label: 'Damage Documentation' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'other', label: 'Other' },
];

// =============================================
// Core Types (Database Schema)
// =============================================

/**
 * Main material delivery record - matches material_deliveries table
 */
export interface MaterialDelivery {
  id: string;
  company_id: string;
  project_id: string;

  // Delivery Information
  delivery_date: string; // ISO date string
  delivery_time?: string | null; // HH:MM:SS format
  delivery_ticket_number?: string | null;

  // Vendor Information
  vendor_name: string;
  vendor_contact_name?: string | null;
  vendor_contact_phone?: string | null;
  vendor_contact_email?: string | null;

  // Material Information
  material_name: string;
  material_description?: string | null;
  material_category?: MaterialCategory | string | null;

  // Quantity & Units
  quantity_ordered?: number | null;
  quantity_delivered: number;
  quantity_accepted?: number | null;
  quantity_rejected?: number | null;
  unit_of_measure: UnitOfMeasure | string;

  // Storage & Location
  storage_location?: string | null;
  storage_bin_number?: string | null;
  storage_notes?: string | null;

  // Status & Condition
  delivery_status: DeliveryStatus;
  condition_status: ConditionStatus;
  condition_notes?: string | null;
  notes?: string | null;

  // Receiving Information
  received_by_user_id?: string | null;
  received_by_name?: string | null;
  inspector_notes?: string | null;

  // Integration Links
  submittal_id?: string | null;
  submittal_number?: string | null;
  daily_report_id?: string | null;
  purchase_order_number?: string | null;

  // Product Details
  manufacturer?: string | null;
  model_number?: string | null;
  serial_number?: string | null;
  warranty_info?: string | null;

  // Cost Tracking (optional)
  unit_cost?: number | null;
  total_cost?: number | null;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  deleted_at?: string | null;
}

/**
 * Legacy interface - kept for backwards compatibility
 */
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

/**
 * Delivery photo record - matches material_delivery_photos table
 */
export interface MaterialDeliveryPhoto {
  id: string;
  delivery_id: string;

  // Photo Information
  photo_url: string;
  photo_type?: string | null;
  caption?: string | null;
  display_order: number;

  // Metadata
  created_at: string;
  created_by?: string | null;
}

/**
 * Legacy interface - kept for backwards compatibility
 */
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

/**
 * Create delivery input - matches material_deliveries insert
 */
export interface CreateMaterialDeliveryDTO {
  project_id: string;

  // Delivery Information
  delivery_date: string;
  delivery_time?: string;
  delivery_ticket_number?: string;

  // Vendor Information
  vendor_name: string;
  vendor_contact_name?: string;
  vendor_contact_phone?: string;
  vendor_contact_email?: string;

  // Material Information
  material_name: string;
  material_description?: string;
  material_category?: MaterialCategory | string;

  // Quantity & Units
  quantity_ordered?: number;
  quantity_delivered: number;
  quantity_rejected?: number;
  unit_of_measure: UnitOfMeasure | string;

  // Storage & Location
  storage_location?: string;
  storage_bin_number?: string;
  storage_notes?: string;

  // Status & Condition
  delivery_status?: DeliveryStatus;
  condition_status?: ConditionStatus;
  condition_notes?: string;
  notes?: string;

  // Receiving Information
  received_by_user_id?: string;
  received_by_name?: string;
  inspector_notes?: string;

  // Integration Links
  submittal_id?: string;
  daily_report_id?: string;
  purchase_order_number?: string;

  // Cost Tracking
  unit_cost?: number;
  total_cost?: number;
}

/**
 * Update delivery input - all fields optional except id
 */
export interface UpdateMaterialDeliveryDTO {
  id: string;

  // Delivery Information
  delivery_date?: string;
  delivery_time?: string;
  delivery_ticket_number?: string;

  // Vendor Information
  vendor_name?: string;
  vendor_contact_name?: string;
  vendor_contact_phone?: string;
  vendor_contact_email?: string;

  // Material Information
  material_name?: string;
  material_description?: string;
  material_category?: MaterialCategory | string;

  // Quantity & Units
  quantity_ordered?: number;
  quantity_delivered?: number;
  quantity_rejected?: number;
  unit_of_measure?: UnitOfMeasure | string;

  // Storage & Location
  storage_location?: string;
  storage_bin_number?: string;
  storage_notes?: string;

  // Status & Condition
  delivery_status?: DeliveryStatus;
  condition_status?: ConditionStatus;
  condition_notes?: string;
  notes?: string;

  // Receiving Information
  received_by_user_id?: string;
  received_by_name?: string;
  inspector_notes?: string;

  // Integration Links
  submittal_id?: string;
  daily_report_id?: string;
  purchase_order_number?: string;

  // Cost Tracking
  unit_cost?: number;
  total_cost?: number;
}

/**
 * Create photo input
 */
export interface CreateMaterialDeliveryPhotoDTO {
  delivery_id: string;
  photo_url: string;
  photo_type: MaterialPhotoType;
  caption?: string;
  file_name?: string;
  file_size?: number;
}

/**
 * Update photo input
 */
export interface UpdateMaterialDeliveryPhotoDTO {
  id: string;
  caption?: string;
  photo_type?: MaterialPhotoType;
}

// =============================================
// Legacy DTO Types (backwards compatibility)
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
// Populated/Joined Types
// =============================================

/**
 * Delivery with photos included
 */
export interface MaterialDeliveryWithPhotos extends MaterialDelivery {
  photos: MaterialDeliveryPhoto[];
}

/**
 * Delivery with all related entities
 */
export interface MaterialDeliveryWithRelations extends MaterialDelivery {
  photos: MaterialDeliveryPhoto[];
  submittal?: {
    id: string;
    title: string;
    status: string;
  } | null;
  daily_report?: {
    id: string;
    report_date: string;
  } | null;
  received_by_user?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

// =============================================
// Statistics Types
// =============================================

/**
 * Delivery statistics for a project - matches get_delivery_stats_by_project function
 */
export interface DeliveryStatistics {
  total_deliveries: number;
  total_items_received: number;
  total_items_rejected: number;
  deliveries_this_week: number;
  deliveries_this_month: number;
  unique_vendors: number;
  unique_categories: number;
  damaged_deliveries: number;
}

/**
 * Legacy statistics interface
 */
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
