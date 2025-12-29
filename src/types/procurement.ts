/**
 * Procurement Types
 *
 * Types for material procurement including vendors, purchase orders,
 * line items, and receiving tracking.
 */

// ============================================================================
// Enums / Status Types
// ============================================================================

/**
 * Vendor types
 */
export type VendorType = 'supplier' | 'manufacturer' | 'distributor';

/**
 * Purchase order status lifecycle
 */
export type POStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'ordered'
  | 'partially_received'
  | 'received'
  | 'closed'
  | 'cancelled';

/**
 * Line item status
 */
export type LineItemStatus =
  | 'pending'
  | 'ordered'
  | 'partially_received'
  | 'received'
  | 'cancelled';

/**
 * Material condition on receipt
 */
export type ReceiptCondition = 'good' | 'damaged' | 'partial' | 'rejected';

/**
 * Common unit types for materials
 */
export type MaterialUnit =
  | 'EA'  // Each
  | 'LF'  // Linear Feet
  | 'SF'  // Square Feet
  | 'CF'  // Cubic Feet
  | 'CY'  // Cubic Yards
  | 'TON'
  | 'LB'  // Pounds
  | 'GAL' // Gallons
  | 'BOX'
  | 'BAG'
  | 'ROLL'
  | 'PALLET'
  | 'LOT'
  | string; // Allow custom units

// ============================================================================
// Core Entities
// ============================================================================

/**
 * Vendor/Supplier
 */
export interface Vendor {
  id: string;
  company_id: string;
  name: string;
  code: string | null;
  vendor_type: VendorType;

  // Contact
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;

  // Address
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;

  // Business
  tax_id: string | null;
  payment_terms: string | null;
  account_number: string | null;

  // Status
  is_active: boolean;
  is_approved: boolean;
  notes: string | null;

  // Metadata
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

/**
 * Purchase Order
 */
export interface PurchaseOrder {
  id: string;
  company_id: string;
  project_id: string;
  vendor_id: string | null;
  po_number: string;
  status: POStatus;

  // Dates
  order_date: string | null;
  required_date: string | null;
  expected_delivery_date: string | null;

  // Amounts
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  total_amount: number;
  tax_rate: number;

  // Shipping
  ship_to_project: boolean;
  ship_to_address: string | null;
  shipping_method: string | null;
  tracking_number: string | null;

  // References
  cost_code_id: string | null;
  submittal_id: string | null;

  // Notes
  notes: string | null;
  terms_conditions: string | null;
  special_instructions: string | null;

  // Approval
  requires_approval: boolean;
  approval_threshold: number | null;
  approved_by: string | null;
  approved_at: string | null;

  // Metadata
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

/**
 * Purchase Order with related data
 */
export interface PurchaseOrderWithDetails extends PurchaseOrder {
  // Vendor info
  vendor_name: string | null;
  vendor_email: string | null;
  vendor_phone: string | null;
  vendor_contact: string | null;

  // Project info
  project_name: string | null;
  project_number: string | null;

  // Cost code
  cost_code: string | null;
  cost_code_name: string | null;

  // User info
  created_by_name: string | null;
  approved_by_name: string | null;

  // Counts
  line_item_count: number;
  received_line_count: number;

  // Related data
  line_items?: POLineItem[];
  vendor?: Vendor;
}

/**
 * Purchase Order Line Item
 */
export interface POLineItem {
  id: string;
  purchase_order_id: string;
  line_number: number;
  description: string;
  sku: string | null;
  part_number: string | null;

  // Quantities
  quantity: number;
  unit: MaterialUnit;
  unit_price: number;
  total_price: number; // Generated column

  // Receiving
  quantity_received: number;
  quantity_remaining: number; // Generated column

  // Status & References
  status: LineItemStatus;
  cost_code_id: string | null;
  material_received_id: string | null;
  notes: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
}

/**
 * Receipt against a PO line item
 */
export interface POReceipt {
  id: string;
  line_item_id: string;
  material_received_id: string | null;
  quantity_received: number;
  receipt_date: string;
  condition: ReceiptCondition;
  notes: string | null;
  received_by: string | null;
  created_at: string;

  // Joined data
  received_by_name?: string;
}

// ============================================================================
// Input DTOs
// ============================================================================

/**
 * Create vendor input
 */
export interface CreateVendorDTO {
  name: string;
  code?: string;
  vendor_type?: VendorType;
  contact_name?: string;
  email?: string;
  phone?: string;
  website?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  tax_id?: string;
  payment_terms?: string;
  account_number?: string;
  notes?: string;
}

/**
 * Update vendor input
 */
export interface UpdateVendorDTO extends Partial<CreateVendorDTO> {
  is_active?: boolean;
  is_approved?: boolean;
}

/**
 * Create purchase order input
 */
export interface CreatePurchaseOrderDTO {
  project_id: string;
  vendor_id?: string;
  order_date?: string;
  required_date?: string;
  expected_delivery_date?: string;
  tax_rate?: number;
  shipping_amount?: number;
  ship_to_project?: boolean;
  ship_to_address?: string;
  shipping_method?: string;
  cost_code_id?: string;
  submittal_id?: string;
  notes?: string;
  terms_conditions?: string;
  special_instructions?: string;
  requires_approval?: boolean;
  approval_threshold?: number;

  // Line items to create with PO
  line_items?: CreatePOLineItemDTO[];
}

/**
 * Update purchase order input
 */
export interface UpdatePurchaseOrderDTO extends Partial<Omit<CreatePurchaseOrderDTO, 'project_id' | 'line_items'>> {
  status?: POStatus;
  tracking_number?: string;
}

/**
 * Create line item input
 */
export interface CreatePOLineItemDTO {
  purchase_order_id?: string; // Required if not part of PO creation
  description: string;
  sku?: string;
  part_number?: string;
  quantity: number;
  unit?: MaterialUnit;
  unit_price: number;
  cost_code_id?: string;
  notes?: string;
}

/**
 * Update line item input
 */
export interface UpdatePOLineItemDTO {
  description?: string;
  sku?: string;
  part_number?: string;
  quantity?: number;
  unit?: MaterialUnit;
  unit_price?: number;
  cost_code_id?: string;
  notes?: string;
  status?: LineItemStatus;
}

/**
 * Create receipt input
 */
export interface CreatePOReceiptDTO {
  line_item_id: string;
  quantity_received: number;
  receipt_date?: string;
  condition?: ReceiptCondition;
  notes?: string;
  material_received_id?: string;
}

// ============================================================================
// Filter Types
// ============================================================================

/**
 * Vendor filters
 */
export interface VendorFilters {
  company_id?: string;
  search?: string;
  vendor_type?: VendorType;
  is_active?: boolean;
  is_approved?: boolean;
}

/**
 * Purchase order filters
 */
export interface PurchaseOrderFilters {
  project_id?: string;
  company_id?: string;
  vendor_id?: string;
  status?: POStatus | POStatus[];
  search?: string;
  from_date?: string;
  to_date?: string;
  cost_code_id?: string;
}

// ============================================================================
// Statistics Types
// ============================================================================

/**
 * Procurement statistics for dashboard
 */
export interface ProcurementStats {
  total_pos: number;
  total_value: number;
  this_month_value: number;
  by_status: {
    draft: number;
    pending_approval: number;
    approved: number;
    ordered: number;
    partially_received: number;
    received: number;
    closed: number;
    cancelled: number;
  };
  pending_delivery: number;
  awaiting_approval: number;
  unique_vendors: number;
}

// ============================================================================
// UI Config
// ============================================================================

/**
 * PO status display configuration
 */
export const PO_STATUS_CONFIG: Record<POStatus, { label: string; color: string; bgColor: string }> = {
  draft: { label: 'Draft', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  pending_approval: { label: 'Pending Approval', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  approved: { label: 'Approved', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  ordered: { label: 'Ordered', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  partially_received: { label: 'Partially Received', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  received: { label: 'Received', color: 'text-green-700', bgColor: 'bg-green-100' },
  closed: { label: 'Closed', color: 'text-gray-700', bgColor: 'bg-gray-200' },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bgColor: 'bg-red-100' },
};

/**
 * Common material units
 */
export const MATERIAL_UNITS: { value: MaterialUnit; label: string }[] = [
  { value: 'EA', label: 'Each' },
  { value: 'LF', label: 'Linear Feet' },
  { value: 'SF', label: 'Square Feet' },
  { value: 'CF', label: 'Cubic Feet' },
  { value: 'CY', label: 'Cubic Yards' },
  { value: 'TON', label: 'Ton' },
  { value: 'LB', label: 'Pounds' },
  { value: 'GAL', label: 'Gallons' },
  { value: 'BOX', label: 'Box' },
  { value: 'BAG', label: 'Bag' },
  { value: 'ROLL', label: 'Roll' },
  { value: 'PALLET', label: 'Pallet' },
  { value: 'LOT', label: 'Lot' },
];

/**
 * Vendor type configuration
 */
export const VENDOR_TYPE_CONFIG: Record<VendorType, { label: string }> = {
  supplier: { label: 'Supplier' },
  manufacturer: { label: 'Manufacturer' },
  distributor: { label: 'Distributor' },
};
