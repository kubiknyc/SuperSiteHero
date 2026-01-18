/**
 * Procurement Test Data Factory
 * Provides mock data for procurement-related tests
 */

import type {
  Vendor,
  PurchaseOrderWithDetails,
  POLineItem,
  POReceipt,
  VendorFilters,
  PurchaseOrderFilters,
  CreateVendorDTO,
  UpdateVendorDTO,
  CreatePurchaseOrderDTO,
  UpdatePurchaseOrderDTO,
  CreatePOLineItemDTO,
  UpdatePOLineItemDTO,
  CreatePOReceiptDTO,
  ProcurementStats,
  POStatus,
  VendorType,
  LineItemStatus,
  ReceiptCondition,
} from '@/types/procurement';

// ============================================================================
// Factory Options
// ============================================================================

export interface VendorFactoryOptions {
  id?: string;
  company_id?: string;
  name?: string;
  code?: string | null;
  vendor_type?: VendorType;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  is_active?: boolean;
  is_approved?: boolean;
}

export interface PurchaseOrderFactoryOptions {
  id?: string;
  company_id?: string;
  project_id?: string;
  vendor_id?: string | null;
  po_number?: string;
  status?: POStatus;
  total_amount?: number;
  vendor_name?: string | null;
  project_name?: string | null;
  line_items?: POLineItem[];
}

export interface POLineItemFactoryOptions {
  id?: string;
  purchase_order_id?: string;
  line_number?: number;
  description?: string;
  quantity?: number;
  unit_price?: number;
  quantity_received?: number;
  status?: LineItemStatus;
}

export interface POReceiptFactoryOptions {
  id?: string;
  line_item_id?: string;
  quantity_received?: number;
  receipt_date?: string;
  condition?: ReceiptCondition;
  received_by?: string | null;
  received_by_name?: string;
}

export interface ProcurementStatsFactoryOptions {
  total_pos?: number;
  total_value?: number;
  this_month_value?: number;
  pending_delivery?: number;
  awaiting_approval?: number;
  unique_vendors?: number;
}

// ============================================================================
// Counters for unique IDs
// ============================================================================

let vendorCounter = 0;
let poCounter = 0;
let lineItemCounter = 0;
let receiptCounter = 0;

// ============================================================================
// Vendor Factories
// ============================================================================

/**
 * Creates a mock Vendor object
 */
export function createMockVendor(options: VendorFactoryOptions = {}): Vendor {
  const id = options.id || `vendor-${++vendorCounter}`;
  const name = options.name || `Test Vendor ${vendorCounter}`;

  return {
    id,
    company_id: options.company_id || 'company-123',
    name,
    code: options.code !== undefined ? options.code : `VEN-${vendorCounter.toString().padStart(4, '0')}`,
    vendor_type: options.vendor_type || 'supplier',
    contact_name: options.contact_name !== undefined ? options.contact_name : `Contact for ${name}`,
    email: options.email !== undefined ? options.email : `vendor${vendorCounter}@example.com`,
    phone: options.phone !== undefined ? options.phone : '(555) 123-4567',
    website: null,
    address_line1: '123 Main St',
    address_line2: null,
    city: 'Springfield',
    state: 'IL',
    postal_code: '62701',
    country: 'USA',
    tax_id: null,
    payment_terms: 'Net 30',
    account_number: null,
    is_active: options.is_active ?? true,
    is_approved: options.is_approved ?? true,
    notes: null,
    created_at: new Date().toISOString(),
    created_by: 'user-123',
    updated_at: new Date().toISOString(),
  };
}

/**
 * Creates multiple vendors
 */
export function createMockVendors(count: number, options: VendorFactoryOptions = {}): Vendor[] {
  return Array.from({ length: count }, () => createMockVendor(options));
}

/**
 * Creates an inactive vendor
 */
export function createInactiveVendor(options: VendorFactoryOptions = {}): Vendor {
  return createMockVendor({
    ...options,
    is_active: false,
  });
}

/**
 * Creates an unapproved vendor
 */
export function createUnapprovedVendor(options: VendorFactoryOptions = {}): Vendor {
  return createMockVendor({
    ...options,
    is_approved: false,
  });
}

// ============================================================================
// Purchase Order Factories
// ============================================================================

/**
 * Creates a mock Purchase Order with details
 */
export function createMockPurchaseOrder(options: PurchaseOrderFactoryOptions = {}): PurchaseOrderWithDetails {
  const id = options.id || `po-${++poCounter}`;
  const poNumber = options.po_number || `PO-${poCounter.toString().padStart(5, '0')}`;
  const totalAmount = options.total_amount || 5000.00;

  return {
    id,
    company_id: options.company_id || 'company-123',
    project_id: options.project_id || 'project-456',
    vendor_id: options.vendor_id !== undefined ? options.vendor_id : 'vendor-1',
    po_number: poNumber,
    status: options.status || 'draft',
    order_date: null,
    required_date: null,
    expected_delivery_date: null,
    subtotal: totalAmount * 0.9,
    tax_amount: totalAmount * 0.1,
    shipping_amount: 0,
    total_amount: totalAmount,
    tax_rate: 0.1,
    ship_to_project: true,
    ship_to_address: null,
    shipping_method: null,
    tracking_number: null,
    cost_code_id: null,
    submittal_id: null,
    notes: null,
    terms_conditions: null,
    special_instructions: null,
    requires_approval: true,
    approval_threshold: 10000,
    approved_by: null,
    approved_at: null,
    created_at: new Date().toISOString(),
    created_by: 'user-123',
    updated_at: new Date().toISOString(),
    // Details fields
    vendor_name: options.vendor_name !== undefined ? options.vendor_name : 'Test Vendor',
    vendor_email: 'vendor@example.com',
    vendor_phone: '(555) 123-4567',
    vendor_contact: 'Vendor Contact',
    project_name: options.project_name !== undefined ? options.project_name : 'Test Project',
    project_number: 'PROJ-001',
    cost_code: null,
    cost_code_name: null,
    created_by_name: 'Test User',
    approved_by_name: null,
    line_item_count: options.line_items?.length || 0,
    received_line_count: 0,
    line_items: options.line_items || [],
  };
}

/**
 * Creates multiple purchase orders
 */
export function createMockPurchaseOrders(count: number, options: PurchaseOrderFactoryOptions = {}): PurchaseOrderWithDetails[] {
  return Array.from({ length: count }, () => createMockPurchaseOrder(options));
}

/**
 * Creates a draft PO
 */
export function createDraftPO(options: PurchaseOrderFactoryOptions = {}): PurchaseOrderWithDetails {
  return createMockPurchaseOrder({
    ...options,
    status: 'draft',
  });
}

/**
 * Creates an approved PO
 */
export function createApprovedPO(options: PurchaseOrderFactoryOptions = {}): PurchaseOrderWithDetails {
  return createMockPurchaseOrder({
    ...options,
    status: 'approved',
    approved_by: 'user-456',
    approved_at: new Date().toISOString(),
  });
}

/**
 * Creates an ordered PO
 */
export function createOrderedPO(options: PurchaseOrderFactoryOptions = {}): PurchaseOrderWithDetails {
  return createMockPurchaseOrder({
    ...options,
    status: 'ordered',
    order_date: new Date().toISOString().split('T')[0],
  });
}

/**
 * Creates a cancelled PO
 */
export function createCancelledPO(options: PurchaseOrderFactoryOptions = {}): PurchaseOrderWithDetails {
  return createMockPurchaseOrder({
    ...options,
    status: 'cancelled',
  });
}

// ============================================================================
// Line Item Factories
// ============================================================================

/**
 * Creates a mock PO Line Item
 */
export function createMockPOLineItem(options: POLineItemFactoryOptions = {}): POLineItem {
  const id = options.id || `line-${++lineItemCounter}`;
  const quantity = options.quantity || 100;
  const unitPrice = options.unit_price || 25.50;

  return {
    id,
    purchase_order_id: options.purchase_order_id || 'po-1',
    line_number: options.line_number || lineItemCounter,
    description: options.description || `Line item ${lineItemCounter} description`,
    sku: `SKU-${lineItemCounter}`,
    part_number: `PN-${lineItemCounter}`,
    quantity,
    unit: 'EA',
    unit_price: unitPrice,
    total_price: quantity * unitPrice,
    quantity_received: options.quantity_received || 0,
    quantity_remaining: quantity - (options.quantity_received || 0),
    status: options.status || 'pending',
    cost_code_id: null,
    material_received_id: null,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Creates multiple line items
 */
export function createMockPOLineItems(count: number, options: POLineItemFactoryOptions = {}): POLineItem[] {
  return Array.from({ length: count }, (_, index) =>
    createMockPOLineItem({ ...options, line_number: index + 1 })
  );
}

/**
 * Creates a partially received line item
 */
export function createPartiallyReceivedLineItem(options: POLineItemFactoryOptions = {}): POLineItem {
  const quantity = options.quantity || 100;
  return createMockPOLineItem({
    ...options,
    quantity,
    quantity_received: Math.floor(quantity * 0.5),
    status: 'partially_received',
  });
}

/**
 * Creates a fully received line item
 */
export function createReceivedLineItem(options: POLineItemFactoryOptions = {}): POLineItem {
  const quantity = options.quantity || 100;
  return createMockPOLineItem({
    ...options,
    quantity,
    quantity_received: quantity,
    status: 'received',
  });
}

// ============================================================================
// Receipt Factories
// ============================================================================

/**
 * Creates a mock PO Receipt
 */
export function createMockPOReceipt(options: POReceiptFactoryOptions = {}): POReceipt {
  const id = options.id || `receipt-${++receiptCounter}`;

  return {
    id,
    line_item_id: options.line_item_id || 'line-1',
    material_received_id: null,
    quantity_received: options.quantity_received || 50,
    receipt_date: options.receipt_date || new Date().toISOString().split('T')[0],
    condition: options.condition || 'good',
    notes: null,
    received_by: options.received_by !== undefined ? options.received_by : 'user-123',
    created_at: new Date().toISOString(),
    received_by_name: options.received_by_name || 'Test User',
  };
}

/**
 * Creates multiple receipts
 */
export function createMockPOReceipts(count: number, options: POReceiptFactoryOptions = {}): POReceipt[] {
  return Array.from({ length: count }, () => createMockPOReceipt(options));
}

/**
 * Creates a damaged receipt
 */
export function createDamagedReceipt(options: POReceiptFactoryOptions = {}): POReceipt {
  return createMockPOReceipt({
    ...options,
    condition: 'damaged',
  });
}

// ============================================================================
// Statistics Factories
// ============================================================================

/**
 * Creates mock procurement statistics
 */
export function createMockProcurementStats(options: ProcurementStatsFactoryOptions = {}): ProcurementStats {
  return {
    total_pos: options.total_pos ?? 45,
    total_value: options.total_value ?? 500000,
    this_month_value: options.this_month_value ?? 75000,
    by_status: {
      draft: 5,
      pending_approval: 3,
      approved: 8,
      ordered: 12,
      partially_received: 6,
      received: 8,
      closed: 2,
      cancelled: 1,
    },
    pending_delivery: options.pending_delivery ?? 18,
    awaiting_approval: options.awaiting_approval ?? 3,
    unique_vendors: options.unique_vendors ?? 12,
  };
}

/**
 * Creates empty procurement statistics
 */
export function createEmptyProcurementStats(): ProcurementStats {
  return createMockProcurementStats({
    total_pos: 0,
    total_value: 0,
    this_month_value: 0,
    pending_delivery: 0,
    awaiting_approval: 0,
    unique_vendors: 0,
  });
}

// ============================================================================
// DTO Factories
// ============================================================================

/**
 * Creates a CreateVendorDTO
 */
export function createVendorDTO(options: Partial<CreateVendorDTO> = {}): CreateVendorDTO {
  return {
    name: options.name || 'New Vendor',
    code: options.code || 'VEN-NEW',
    vendor_type: options.vendor_type || 'supplier',
    email: options.email || 'new@vendor.com',
    phone: options.phone || '(555) 000-0000',
    ...options,
  };
}

/**
 * Creates an UpdateVendorDTO
 */
export function createUpdateVendorDTO(options: Partial<UpdateVendorDTO> = {}): UpdateVendorDTO {
  return {
    name: options.name,
    is_active: options.is_active,
    ...options,
  };
}

/**
 * Creates a CreatePurchaseOrderDTO
 */
export function createPurchaseOrderDTO(options: Partial<CreatePurchaseOrderDTO> = {}): CreatePurchaseOrderDTO {
  return {
    project_id: options.project_id || 'project-123',
    vendor_id: options.vendor_id || 'vendor-123',
    tax_rate: options.tax_rate || 0.1,
    ...options,
  };
}

/**
 * Creates an UpdatePurchaseOrderDTO
 */
export function createUpdatePurchaseOrderDTO(options: Partial<UpdatePurchaseOrderDTO> = {}): UpdatePurchaseOrderDTO {
  return {
    status: options.status,
    notes: options.notes,
    ...options,
  };
}

/**
 * Creates a CreatePOLineItemDTO
 */
export function createLineItemDTO(options: Partial<CreatePOLineItemDTO> = {}): CreatePOLineItemDTO {
  return {
    description: options.description || 'New line item',
    quantity: options.quantity || 100,
    unit_price: options.unit_price || 10.00,
    unit: options.unit || 'EA',
    ...options,
  };
}

/**
 * Creates an UpdatePOLineItemDTO
 */
export function createUpdateLineItemDTO(options: Partial<UpdatePOLineItemDTO> = {}): UpdatePOLineItemDTO {
  return {
    quantity: options.quantity,
    unit_price: options.unit_price,
    ...options,
  };
}

/**
 * Creates a CreatePOReceiptDTO
 */
export function createReceiptDTO(options: Partial<CreatePOReceiptDTO> = {}): CreatePOReceiptDTO {
  return {
    line_item_id: options.line_item_id || 'line-123',
    quantity_received: options.quantity_received || 50,
    condition: options.condition || 'good',
    ...options,
  };
}

// ============================================================================
// Filter Factories
// ============================================================================

/**
 * Creates VendorFilters
 */
export function createVendorFilters(options: Partial<VendorFilters> = {}): VendorFilters {
  return {
    company_id: options.company_id,
    search: options.search,
    vendor_type: options.vendor_type,
    is_active: options.is_active,
    is_approved: options.is_approved,
  };
}

/**
 * Creates PurchaseOrderFilters
 */
export function createPurchaseOrderFilters(options: Partial<PurchaseOrderFilters> = {}): PurchaseOrderFilters {
  return {
    project_id: options.project_id,
    company_id: options.company_id,
    vendor_id: options.vendor_id,
    status: options.status,
    search: options.search,
    from_date: options.from_date,
    to_date: options.to_date,
    cost_code_id: options.cost_code_id,
  };
}

// ============================================================================
// Test Constants
// ============================================================================

export const TEST_PROCUREMENT_DATA = {
  VENDOR: createMockVendor(),
  VENDORS: createMockVendors(5),
  PO: createMockPurchaseOrder(),
  POS: createMockPurchaseOrders(3),
  LINE_ITEM: createMockPOLineItem(),
  LINE_ITEMS: createMockPOLineItems(5),
  RECEIPT: createMockPOReceipt(),
  RECEIPTS: createMockPOReceipts(3),
  STATS: createMockProcurementStats(),
};
