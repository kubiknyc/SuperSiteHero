/**
 * Owner Invoice Types
 * Types for billing project owners/clients
 * Aligned with migration 158_owner_invoices.sql
 */

// =============================================
// Enums and Constants
// =============================================

export type OwnerInvoiceStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'void'
  | 'disputed';

export const OWNER_INVOICE_STATUSES: Array<{
  value: OwnerInvoiceStatus;
  label: string;
  color: string;
  description: string;
}> = [
  { value: 'draft', label: 'Draft', color: 'gray', description: 'Invoice being prepared' },
  { value: 'sent', label: 'Sent', color: 'blue', description: 'Sent to client' },
  { value: 'viewed', label: 'Viewed', color: 'purple', description: 'Client has viewed invoice' },
  { value: 'partially_paid', label: 'Partially Paid', color: 'yellow', description: 'Partial payment received' },
  { value: 'paid', label: 'Paid', color: 'green', description: 'Fully paid' },
  { value: 'overdue', label: 'Overdue', color: 'red', description: 'Past due date' },
  { value: 'void', label: 'Void', color: 'gray', description: 'Invoice voided' },
  { value: 'disputed', label: 'Disputed', color: 'orange', description: 'Client disputes invoice' },
];

export type PaymentMethod =
  | 'check'
  | 'wire'
  | 'ach'
  | 'credit_card'
  | 'cash'
  | 'other';

export const PAYMENT_METHODS: Array<{
  value: PaymentMethod;
  label: string;
}> = [
  { value: 'check', label: 'Check' },
  { value: 'wire', label: 'Wire Transfer' },
  { value: 'ach', label: 'ACH' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
];

export type PaymentTerms =
  | 'due_on_receipt'
  | 'net_15'
  | 'net_30'
  | 'net_45'
  | 'net_60'
  | 'net_90';

export const PAYMENT_TERMS_OPTIONS: Array<{
  value: PaymentTerms;
  label: string;
  days: number;
}> = [
  { value: 'due_on_receipt', label: 'Due on Receipt', days: 0 },
  { value: 'net_15', label: 'Net 15', days: 15 },
  { value: 'net_30', label: 'Net 30', days: 30 },
  { value: 'net_45', label: 'Net 45', days: 45 },
  { value: 'net_60', label: 'Net 60', days: 60 },
  { value: 'net_90', label: 'Net 90', days: 90 },
];

export const LINE_ITEM_UNITS = [
  { value: 'LS', label: 'Lump Sum' },
  { value: 'EA', label: 'Each' },
  { value: 'SF', label: 'Square Feet' },
  { value: 'LF', label: 'Linear Feet' },
  { value: 'CY', label: 'Cubic Yards' },
  { value: 'HR', label: 'Hours' },
  { value: 'DAY', label: 'Days' },
  { value: 'TON', label: 'Tons' },
  { value: 'GAL', label: 'Gallons' },
  { value: 'PCT', label: 'Percent' },
];

// =============================================
// Core Types (Database Schema)
// =============================================

/**
 * Owner Invoice - Main invoice record
 */
export interface OwnerInvoice {
  id: string;
  projectId: string;
  companyId: string;

  // Invoice Identification
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;

  // Link to Payment Application
  paymentApplicationId: string | null;

  // Bill To Information
  billToName: string;
  billToCompany: string | null;
  billToAddressLine1: string | null;
  billToAddressLine2: string | null;
  billToCity: string | null;
  billToState: string | null;
  billToZip: string | null;
  billToEmail: string | null;
  billToPhone: string | null;

  // From Information
  fromName: string | null;
  fromCompany: string | null;
  fromAddressLine1: string | null;
  fromAddressLine2: string | null;
  fromCity: string | null;
  fromState: string | null;
  fromZip: string | null;
  fromEmail: string | null;
  fromPhone: string | null;

  // Amounts (computed fields are also stored for quick access)
  subtotal: number;
  taxRate: number | null;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  retainagePercent: number;
  retainageAmount: number;
  amountDue: number;
  amountPaid: number;
  balanceDue: number;

  // Payment Terms
  paymentTerms: string;

  // Status
  status: OwnerInvoiceStatus;

  // Communication
  sentAt: string | null;
  sentBy: string | null;
  sentVia: string | null;
  viewedAt: string | null;

  // Notes
  notes: string | null;
  publicNotes: string | null;
  termsAndConditions: string | null;

  // References
  poNumber: string | null;
  contractNumber: string | null;
  projectPeriodFrom: string | null;
  projectPeriodTo: string | null;

  // PDF
  pdfUrl: string | null;
  pdfGeneratedAt: string | null;

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  deletedAt: string | null;
}

/**
 * Owner Invoice Line Item
 */
export interface OwnerInvoiceLineItem {
  id: string;
  invoiceId: string;

  // Line Item Details
  lineNumber: number;
  description: string;

  // Cost Code Reference
  costCodeId: string | null;
  costCode: string | null;

  // SOV Item Reference
  sovItemId: string | null;

  // Quantities and Amounts
  quantity: number;
  unit: string | null;
  unitPrice: number;
  amount: number;

  // Optional breakdown
  laborAmount: number;
  materialAmount: number;
  equipmentAmount: number;
  subcontractorAmount: number;
  otherAmount: number;

  // Taxable flag
  isTaxable: boolean;

  // Sort Order
  sortOrder: number;

  // Notes
  notes: string | null;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

/**
 * Owner Invoice Payment
 */
export interface OwnerInvoicePayment {
  id: string;
  invoiceId: string;

  // Payment Details
  paymentDate: string;
  amount: number;

  // Payment Method
  paymentMethod: PaymentMethod | null;
  referenceNumber: string | null;

  // Bank Details
  depositedToAccount: string | null;
  depositedAt: string | null;

  // Notes
  notes: string | null;

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
}

/**
 * Invoice Email Log
 */
export interface InvoiceEmailLog {
  id: string;
  invoiceId: string;

  // Email Details
  recipientEmail: string;
  recipientName: string | null;
  ccEmails: string[] | null;
  bccEmails: string[] | null;

  // Email Content
  subject: string | null;
  bodyPreview: string | null;

  // Delivery Status
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'bounced' | 'failed';

  // Tracking
  sentAt: string | null;
  deliveredAt: string | null;
  openedAt: string | null;
  bouncedAt: string | null;
  bounceReason: string | null;

  // External Reference
  emailProvider: string | null;
  externalMessageId: string | null;

  // Metadata
  createdAt: string;
  createdBy: string | null;
}

// =============================================
// Extended Types with Relations
// =============================================

/**
 * Owner Invoice with all related data
 */
export interface OwnerInvoiceWithDetails extends OwnerInvoice {
  // Computed fields from view
  daysUntilDue: number | null;
  lineItemCount: number;
  paymentCount: number;

  // Project info
  project?: {
    id: string;
    name: string;
    projectNumber: string | null;
  } | null;

  // Payment application info
  paymentApplication?: {
    id: string;
    applicationNumber: number;
    periodTo: string;
  } | null;

  // Related data
  lineItems?: OwnerInvoiceLineItem[];
  payments?: OwnerInvoicePayment[];
  emailLogs?: InvoiceEmailLog[];

  // User info
  createdByUser?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  sentByUser?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
}

/**
 * Invoice Line Item with cost code details
 */
export interface LineItemWithCostCode extends OwnerInvoiceLineItem {
  costCodeDetails?: {
    id: string;
    code: string;
    name: string;
    division: string | null;
  } | null;
}

// =============================================
// DTO Types (Data Transfer Objects)
// =============================================

/**
 * Create Owner Invoice input
 */
export interface CreateOwnerInvoiceDTO {
  projectId: string;
  invoiceDate?: string;
  dueDate?: string;
  paymentApplicationId?: string;

  // Bill To Information
  billToName: string;
  billToCompany?: string;
  billToAddressLine1?: string;
  billToAddressLine2?: string;
  billToCity?: string;
  billToState?: string;
  billToZip?: string;
  billToEmail?: string;
  billToPhone?: string;

  // Optional settings
  taxRate?: number;
  retainagePercent?: number;
  paymentTerms?: string;
  poNumber?: string;
  contractNumber?: string;
  projectPeriodFrom?: string;
  projectPeriodTo?: string;
  publicNotes?: string;
  termsAndConditions?: string;
  notes?: string;
}

/**
 * Update Owner Invoice input
 */
export interface UpdateOwnerInvoiceDTO {
  invoiceDate?: string;
  dueDate?: string;

  // Bill To Information
  billToName?: string;
  billToCompany?: string;
  billToAddressLine1?: string;
  billToAddressLine2?: string;
  billToCity?: string;
  billToState?: string;
  billToZip?: string;
  billToEmail?: string;
  billToPhone?: string;

  // Settings
  taxRate?: number;
  discountAmount?: number;
  retainagePercent?: number;
  retainageAmount?: number;
  paymentTerms?: string;
  poNumber?: string;
  contractNumber?: string;
  projectPeriodFrom?: string;
  projectPeriodTo?: string;
  publicNotes?: string;
  termsAndConditions?: string;
  notes?: string;
}

/**
 * Create Line Item input
 */
export interface CreateLineItemDTO {
  invoiceId: string;
  description: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  costCodeId?: string;
  costCode?: string;
  sovItemId?: string;
  laborAmount?: number;
  materialAmount?: number;
  equipmentAmount?: number;
  subcontractorAmount?: number;
  otherAmount?: number;
  isTaxable?: boolean;
  sortOrder?: number;
  notes?: string;
}

/**
 * Update Line Item input
 */
export interface UpdateLineItemDTO {
  description?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  costCodeId?: string;
  costCode?: string;
  laborAmount?: number;
  materialAmount?: number;
  equipmentAmount?: number;
  subcontractorAmount?: number;
  otherAmount?: number;
  isTaxable?: boolean;
  sortOrder?: number;
  notes?: string;
}

/**
 * Record Payment input
 */
export interface RecordPaymentDTO {
  invoiceId: string;
  paymentDate?: string;
  amount: number;
  paymentMethod?: PaymentMethod;
  referenceNumber?: string;
  depositedToAccount?: string;
  depositedAt?: string;
  notes?: string;
}

/**
 * Send Invoice input
 */
export interface SendInvoiceDTO {
  invoiceId: string;
  recipientEmail: string;
  recipientName?: string;
  ccEmails?: string[];
  bccEmails?: string[];
  subject?: string;
  message?: string;
  attachPdf?: boolean;
}

// =============================================
// Filter Types
// =============================================

export interface OwnerInvoiceFilters {
  projectId?: string;
  status?: OwnerInvoiceStatus | OwnerInvoiceStatus[];
  dateFrom?: string;
  dateTo?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  search?: string;
  isOverdue?: boolean;
  minAmount?: number;
  maxAmount?: number;
}

// =============================================
// Statistics and Reports
// =============================================

/**
 * Invoice aging bucket
 */
export type InvoiceAgingBucket = 'current' | '1-30' | '31-60' | '61-90' | '90+';

/**
 * Invoice aging item from view
 */
export interface InvoiceAgingItem {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  projectId: string;
  projectName: string;
  billToName: string;
  billToCompany: string | null;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  status: OwnerInvoiceStatus;
  daysOverdue: number;
  agingBucket: InvoiceAgingBucket;
}

/**
 * Invoice aging summary
 */
export interface InvoiceAgingSummary {
  totalOutstanding: number;
  current: number;
  days1To30: number;
  days31To60: number;
  days61To90: number;
  days90Plus: number;
  invoiceCount: number;
  overdueCount: number;
}

/**
 * Invoice statistics for dashboard
 */
export interface InvoiceStats {
  draftCount: number;
  sentCount: number;
  overdueCount: number;
  paidCount: number;
  totalDraft: number;
  totalSent: number;
  totalOverdue: number;
  totalPaidThisMonth: number;
  totalOutstanding: number;
}

/**
 * Project invoice summary
 */
export interface ProjectInvoiceSummary {
  projectId: string;
  projectName: string;
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  invoiceCount: number;
  paidCount: number;
  overdueCount: number;
  lastInvoiceDate: string | null;
  lastPaymentDate: string | null;
}

// =============================================
// Form Types
// =============================================

/**
 * Invoice form data
 */
export interface InvoiceFormData {
  invoiceDate: string;
  dueDate: string;
  billToName: string;
  billToCompany: string;
  billToAddressLine1: string;
  billToAddressLine2: string;
  billToCity: string;
  billToState: string;
  billToZip: string;
  billToEmail: string;
  billToPhone: string;
  taxRate: string;
  discountAmount: string;
  retainagePercent: string;
  paymentTerms: string;
  poNumber: string;
  contractNumber: string;
  projectPeriodFrom: string;
  projectPeriodTo: string;
  publicNotes: string;
  termsAndConditions: string;
  notes: string;
}

/**
 * Line Item form data (for inline editing)
 */
export interface LineItemFormData {
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  costCode: string;
  notes: string;
}

/**
 * Payment form data
 */
export interface PaymentFormData {
  paymentDate: string;
  amount: string;
  paymentMethod: PaymentMethod | '';
  referenceNumber: string;
  depositedToAccount: string;
  depositedAt: string;
  notes: string;
}

// =============================================
// Database Row Types (for Supabase)
// =============================================

/**
 * Database row type for owner_invoices table
 */
export interface OwnerInvoiceRow {
  id: string;
  project_id: string;
  company_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  payment_application_id: string | null;
  bill_to_name: string;
  bill_to_company: string | null;
  bill_to_address_line1: string | null;
  bill_to_address_line2: string | null;
  bill_to_city: string | null;
  bill_to_state: string | null;
  bill_to_zip: string | null;
  bill_to_email: string | null;
  bill_to_phone: string | null;
  from_name: string | null;
  from_company: string | null;
  from_address_line1: string | null;
  from_address_line2: string | null;
  from_city: string | null;
  from_state: string | null;
  from_zip: string | null;
  from_email: string | null;
  from_phone: string | null;
  subtotal: number;
  tax_rate: number | null;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  retainage_percent: number;
  retainage_amount: number;
  amount_due: number;
  amount_paid: number;
  balance_due: number;
  payment_terms: string;
  status: OwnerInvoiceStatus;
  sent_at: string | null;
  sent_by: string | null;
  sent_via: string | null;
  viewed_at: string | null;
  notes: string | null;
  public_notes: string | null;
  terms_and_conditions: string | null;
  po_number: string | null;
  contract_number: string | null;
  project_period_from: string | null;
  project_period_to: string | null;
  pdf_url: string | null;
  pdf_generated_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  deleted_at: string | null;
}

/**
 * Database row type for owner_invoice_line_items table
 */
export interface OwnerInvoiceLineItemRow {
  id: string;
  invoice_id: string;
  line_number: number;
  description: string;
  cost_code_id: string | null;
  cost_code: string | null;
  sov_item_id: string | null;
  quantity: number;
  unit: string | null;
  unit_price: number;
  amount: number;
  labor_amount: number;
  material_amount: number;
  equipment_amount: number;
  subcontractor_amount: number;
  other_amount: number;
  is_taxable: boolean;
  sort_order: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Database row type for owner_invoice_payments table
 */
export interface OwnerInvoicePaymentRow {
  id: string;
  invoice_id: string;
  payment_date: string;
  amount: number;
  payment_method: string | null;
  reference_number: string | null;
  deposited_to_account: string | null;
  deposited_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// =============================================
// Utility Functions
// =============================================

/**
 * Convert database row to OwnerInvoice type
 */
export function mapRowToOwnerInvoice(row: OwnerInvoiceRow): OwnerInvoice {
  return {
    id: row.id,
    projectId: row.project_id,
    companyId: row.company_id,
    invoiceNumber: row.invoice_number,
    invoiceDate: row.invoice_date,
    dueDate: row.due_date,
    paymentApplicationId: row.payment_application_id,
    billToName: row.bill_to_name,
    billToCompany: row.bill_to_company,
    billToAddressLine1: row.bill_to_address_line1,
    billToAddressLine2: row.bill_to_address_line2,
    billToCity: row.bill_to_city,
    billToState: row.bill_to_state,
    billToZip: row.bill_to_zip,
    billToEmail: row.bill_to_email,
    billToPhone: row.bill_to_phone,
    fromName: row.from_name,
    fromCompany: row.from_company,
    fromAddressLine1: row.from_address_line1,
    fromAddressLine2: row.from_address_line2,
    fromCity: row.from_city,
    fromState: row.from_state,
    fromZip: row.from_zip,
    fromEmail: row.from_email,
    fromPhone: row.from_phone,
    subtotal: row.subtotal,
    taxRate: row.tax_rate,
    taxAmount: row.tax_amount,
    discountAmount: row.discount_amount,
    totalAmount: row.total_amount,
    retainagePercent: row.retainage_percent,
    retainageAmount: row.retainage_amount,
    amountDue: row.amount_due,
    amountPaid: row.amount_paid,
    balanceDue: row.balance_due,
    paymentTerms: row.payment_terms,
    status: row.status,
    sentAt: row.sent_at,
    sentBy: row.sent_by,
    sentVia: row.sent_via,
    viewedAt: row.viewed_at,
    notes: row.notes,
    publicNotes: row.public_notes,
    termsAndConditions: row.terms_and_conditions,
    poNumber: row.po_number,
    contractNumber: row.contract_number,
    projectPeriodFrom: row.project_period_from,
    projectPeriodTo: row.project_period_to,
    pdfUrl: row.pdf_url,
    pdfGeneratedAt: row.pdf_generated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    deletedAt: row.deleted_at,
  };
}

/**
 * Convert database row to OwnerInvoiceLineItem type
 */
export function mapRowToLineItem(row: OwnerInvoiceLineItemRow): OwnerInvoiceLineItem {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    lineNumber: row.line_number,
    description: row.description,
    costCodeId: row.cost_code_id,
    costCode: row.cost_code,
    sovItemId: row.sov_item_id,
    quantity: row.quantity,
    unit: row.unit,
    unitPrice: row.unit_price,
    amount: row.amount,
    laborAmount: row.labor_amount,
    materialAmount: row.material_amount,
    equipmentAmount: row.equipment_amount,
    subcontractorAmount: row.subcontractor_amount,
    otherAmount: row.other_amount,
    isTaxable: row.is_taxable,
    sortOrder: row.sort_order,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Convert database row to OwnerInvoicePayment type
 */
export function mapRowToPayment(row: OwnerInvoicePaymentRow): OwnerInvoicePayment {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    paymentDate: row.payment_date,
    amount: row.amount,
    paymentMethod: row.payment_method as PaymentMethod | null,
    referenceNumber: row.reference_number,
    depositedToAccount: row.deposited_to_account,
    depositedAt: row.deposited_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
  };
}

/**
 * Get status badge variant
 */
export function getInvoiceStatusBadgeVariant(
  status: OwnerInvoiceStatus
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'paid':
      return 'default';
    case 'sent':
    case 'viewed':
      return 'secondary';
    case 'overdue':
    case 'void':
    case 'disputed':
      return 'destructive';
    default:
      return 'outline';
  }
}

/**
 * Calculate due date from invoice date and payment terms
 */
export function calculateDueDate(invoiceDate: string, paymentTerms: PaymentTerms): string {
  const term = PAYMENT_TERMS_OPTIONS.find((t) => t.value === paymentTerms);
  const days = term?.days ?? 30;
  const date = new Date(invoiceDate);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}
