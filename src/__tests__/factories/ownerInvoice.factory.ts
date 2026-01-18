/**
 * Owner Invoice Test Data Factory
 * Provides mock data for owner invoice-related tests
 */

import type {
  OwnerInvoice,
  OwnerInvoiceLineItem,
  OwnerInvoicePayment,
  OwnerInvoiceWithDetails,
  InvoiceStats,
  InvoiceAgingSummary,
  InvoiceAgingItem,
  OwnerInvoiceStatus,
} from '@/types/owner-invoice';

// ============================================================================
// Types
// ============================================================================

export interface OwnerInvoiceFactoryOptions {
  id?: string;
  projectId?: string;
  companyId?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  status?: OwnerInvoiceStatus;
  billToName?: string;
  totalAmount?: number;
  amountPaid?: number;
  balanceDue?: number;
}

export interface LineItemFactoryOptions {
  id?: string;
  invoiceId?: string;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  amount?: number;
}

export interface PaymentFactoryOptions {
  id?: string;
  invoiceId?: string;
  paymentDate?: string;
  amount?: number;
  paymentMethod?: string;
}

export interface InvoiceStatsFactoryOptions {
  draftCount?: number;
  sentCount?: number;
  overdueCount?: number;
  paidCount?: number;
  totalDraft?: number;
  totalSent?: number;
  totalOverdue?: number;
  totalPaidThisMonth?: number;
  totalOutstanding?: number;
}

// ============================================================================
// Invoice Factory
// ============================================================================

let invoiceCounter = 0;

/**
 * Creates a mock OwnerInvoice object
 */
export function createMockOwnerInvoice(
  options: OwnerInvoiceFactoryOptions = {}
): OwnerInvoice {
  const id = options.id || `invoice-${++invoiceCounter}`;
  const now = new Date();
  const invoiceDate = options.invoiceDate || now.toISOString().split('T')[0];
  const dueDate = options.dueDate || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const totalAmount = options.totalAmount ?? 50000;
  const amountPaid = options.amountPaid ?? 0;

  return {
    id,
    projectId: options.projectId || 'project-1',
    companyId: options.companyId || 'company-1',
    invoiceNumber: options.invoiceNumber || `INV-${String(invoiceCounter).padStart(4, '0')}`,
    invoiceDate,
    dueDate,
    paymentApplicationId: null,
    billToName: options.billToName || 'Test Client',
    billToCompany: 'Test Company LLC',
    billToAddressLine1: '123 Main St',
    billToAddressLine2: null,
    billToCity: 'New York',
    billToState: 'NY',
    billToZip: '10001',
    billToEmail: 'client@example.com',
    billToPhone: '555-0123',
    fromName: 'Construction Co',
    fromCompany: 'Construction Co Inc',
    fromAddressLine1: '456 Builder Ave',
    fromAddressLine2: null,
    fromCity: 'New York',
    fromState: 'NY',
    fromZip: '10002',
    fromEmail: 'billing@construction.com',
    fromPhone: '555-0456',
    subtotal: totalAmount,
    taxRate: 0.08,
    taxAmount: totalAmount * 0.08,
    discountAmount: 0,
    totalAmount: totalAmount * 1.08,
    retainagePercent: 0.1,
    retainageAmount: totalAmount * 0.1,
    amountDue: totalAmount * 1.08,
    amountPaid,
    balanceDue: options.balanceDue ?? (totalAmount * 1.08 - amountPaid),
    paymentTerms: 'net_30',
    status: options.status || 'draft',
    sentAt: null,
    sentBy: null,
    sentVia: null,
    viewedAt: null,
    notes: null,
    publicNotes: null,
    termsAndConditions: 'Standard payment terms apply',
    poNumber: 'PO-12345',
    contractNumber: 'CNT-2024-001',
    projectPeriodFrom: null,
    projectPeriodTo: null,
    pdfUrl: null,
    pdfGeneratedAt: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    createdBy: 'user-1',
    deletedAt: null,
  };
}

/**
 * Creates a draft invoice
 */
export function createDraftInvoice(options: OwnerInvoiceFactoryOptions = {}): OwnerInvoice {
  return createMockOwnerInvoice({
    ...options,
    status: 'draft',
  });
}

/**
 * Creates a sent invoice
 */
export function createSentInvoice(options: OwnerInvoiceFactoryOptions = {}): OwnerInvoice {
  const now = new Date();
  return createMockOwnerInvoice({
    ...options,
    status: 'sent',
    sentAt: now.toISOString(),
    sentBy: 'user-1',
    sentVia: 'email',
  });
}

/**
 * Creates an overdue invoice
 */
export function createOverdueInvoice(options: OwnerInvoiceFactoryOptions = {}): OwnerInvoice {
  const pastDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  return createMockOwnerInvoice({
    ...options,
    status: 'overdue',
    invoiceDate: pastDate,
    dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });
}

/**
 * Creates a paid invoice
 */
export function createPaidInvoice(options: OwnerInvoiceFactoryOptions = {}): OwnerInvoice {
  const totalAmount = options.totalAmount ?? 50000;
  const fullAmount = totalAmount * 1.08;
  return createMockOwnerInvoice({
    ...options,
    status: 'paid',
    amountPaid: fullAmount,
    balanceDue: 0,
  });
}

/**
 * Creates multiple mock invoices
 */
export function createMockOwnerInvoices(
  count: number,
  options: OwnerInvoiceFactoryOptions = {}
): OwnerInvoice[] {
  return Array.from({ length: count }, () => createMockOwnerInvoice(options));
}

/**
 * Creates a diverse set of invoices
 */
export function createMixedInvoices(): OwnerInvoice[] {
  return [
    createDraftInvoice({ invoiceNumber: 'INV-1001' }),
    createSentInvoice({ invoiceNumber: 'INV-1002', totalAmount: 75000 }),
    createOverdueInvoice({ invoiceNumber: 'INV-1003', totalAmount: 100000 }),
    createPaidInvoice({ invoiceNumber: 'INV-1004', totalAmount: 60000 }),
  ];
}

// ============================================================================
// Invoice with Details Factory
// ============================================================================

/**
 * Creates a mock OwnerInvoiceWithDetails object
 */
export function createMockInvoiceWithDetails(
  options: OwnerInvoiceFactoryOptions = {}
): OwnerInvoiceWithDetails {
  const invoice = createMockOwnerInvoice(options);
  const dueDate = new Date(invoice.dueDate);
  const today = new Date();
  const daysDiff = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return {
    ...invoice,
    daysUntilDue: daysDiff,
    lineItemCount: 3,
    paymentCount: 0,
    project: {
      id: invoice.projectId,
      name: 'Test Project',
      projectNumber: 'PRJ-001',
    },
    paymentApplication: null,
    lineItems: [
      createMockLineItem({ invoiceId: invoice.id, description: 'Foundation Work' }),
      createMockLineItem({ invoiceId: invoice.id, description: 'Framing Labor' }),
      createMockLineItem({ invoiceId: invoice.id, description: 'Materials' }),
    ],
    payments: [],
  };
}

// ============================================================================
// Line Item Factory
// ============================================================================

let lineItemCounter = 0;

/**
 * Creates a mock OwnerInvoiceLineItem
 */
export function createMockLineItem(
  options: LineItemFactoryOptions = {}
): OwnerInvoiceLineItem {
  const id = options.id || `line-${++lineItemCounter}`;
  const quantity = options.quantity ?? 1;
  const unitPrice = options.unitPrice ?? 10000;
  const amount = options.amount ?? quantity * unitPrice;

  return {
    id,
    invoiceId: options.invoiceId || 'invoice-1',
    lineNumber: lineItemCounter,
    description: options.description || `Line Item ${lineItemCounter}`,
    costCodeId: null,
    costCode: '01-100',
    sovItemId: null,
    quantity,
    unit: 'LS',
    unitPrice,
    amount,
    laborAmount: amount * 0.6,
    materialAmount: amount * 0.3,
    equipmentAmount: amount * 0.1,
    subcontractorAmount: 0,
    otherAmount: 0,
    isTaxable: true,
    sortOrder: lineItemCounter,
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Creates multiple line items
 */
export function createMockLineItems(
  count: number,
  options: LineItemFactoryOptions = {}
): OwnerInvoiceLineItem[] {
  return Array.from({ length: count }, () => createMockLineItem(options));
}

// ============================================================================
// Payment Factory
// ============================================================================

let paymentCounter = 0;

/**
 * Creates a mock OwnerInvoicePayment
 */
export function createMockPayment(
  options: PaymentFactoryOptions = {}
): OwnerInvoicePayment {
  const id = options.id || `payment-${++paymentCounter}`;

  return {
    id,
    invoiceId: options.invoiceId || 'invoice-1',
    paymentDate: options.paymentDate || new Date().toISOString().split('T')[0],
    amount: options.amount ?? 25000,
    paymentMethod: (options.paymentMethod || 'check') as OwnerInvoicePayment['paymentMethod'],
    referenceNumber: `CHK-${String(paymentCounter).padStart(4, '0')}`,
    depositedToAccount: 'Operating Account',
    depositedAt: new Date().toISOString().split('T')[0],
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'user-1',
  };
}

/**
 * Creates multiple payments
 */
export function createMockPayments(
  count: number,
  options: PaymentFactoryOptions = {}
): OwnerInvoicePayment[] {
  return Array.from({ length: count }, () => createMockPayment(options));
}

// ============================================================================
// Invoice Statistics Factory
// ============================================================================

/**
 * Creates mock invoice statistics
 */
export function createMockInvoiceStats(
  options: InvoiceStatsFactoryOptions = {}
): InvoiceStats {
  return {
    draftCount: options.draftCount ?? 5,
    sentCount: options.sentCount ?? 12,
    overdueCount: options.overdueCount ?? 3,
    paidCount: options.paidCount ?? 45,
    totalDraft: options.totalDraft ?? 250000,
    totalSent: options.totalSent ?? 500000,
    totalOverdue: options.totalOverdue ?? 150000,
    totalPaidThisMonth: options.totalPaidThisMonth ?? 750000,
    totalOutstanding: options.totalOutstanding ?? 650000,
  };
}

/**
 * Creates empty invoice statistics
 */
export function createEmptyInvoiceStats(): InvoiceStats {
  return createMockInvoiceStats({
    draftCount: 0,
    sentCount: 0,
    overdueCount: 0,
    paidCount: 0,
    totalDraft: 0,
    totalSent: 0,
    totalOverdue: 0,
    totalPaidThisMonth: 0,
    totalOutstanding: 0,
  });
}

// ============================================================================
// Aging Report Factory
// ============================================================================

/**
 * Creates a mock aging item
 */
export function createMockAgingItem(
  options: Partial<InvoiceAgingItem> = {}
): InvoiceAgingItem {
  const daysOverdue = options.daysOverdue ?? 0;
  let agingBucket: InvoiceAgingItem['agingBucket'] = 'current';

  if (daysOverdue > 90) {
    agingBucket = '90+';
  } else if (daysOverdue > 60) {
    agingBucket = '61-90';
  } else if (daysOverdue > 30) {
    agingBucket = '31-60';
  } else if (daysOverdue > 0) {
    agingBucket = '1-30';
  }

  return {
    id: options.id || `invoice-aging-${++invoiceCounter}`,
    invoiceNumber: options.invoiceNumber || `INV-${String(invoiceCounter).padStart(4, '0')}`,
    invoiceDate: options.invoiceDate || new Date().toISOString().split('T')[0],
    dueDate: options.dueDate || new Date().toISOString().split('T')[0],
    projectId: options.projectId || 'project-1',
    projectName: options.projectName || 'Test Project',
    billToName: options.billToName || 'Test Client',
    billToCompany: options.billToCompany || 'Test Company LLC',
    totalAmount: options.totalAmount ?? 50000,
    amountPaid: options.amountPaid ?? 0,
    balanceDue: options.balanceDue ?? 50000,
    status: options.status || 'sent',
    daysOverdue,
    agingBucket,
  };
}

/**
 * Creates mock aging summary
 */
export function createMockAgingSummary(
  options: Partial<InvoiceAgingSummary> = {}
): InvoiceAgingSummary {
  return {
    totalOutstanding: options.totalOutstanding ?? 500000,
    current: options.current ?? 200000,
    days1To30: options.days1To30 ?? 150000,
    days31To60: options.days31To60 ?? 100000,
    days61To90: options.days61To90 ?? 30000,
    days90Plus: options.days90Plus ?? 20000,
    invoiceCount: options.invoiceCount ?? 25,
    overdueCount: options.overdueCount ?? 8,
  };
}

/**
 * Creates a diverse aging report
 */
export function createMockAgingReport(): {
  items: InvoiceAgingItem[];
  summary: InvoiceAgingSummary;
} {
  const items = [
    createMockAgingItem({ daysOverdue: 0, balanceDue: 200000 }),
    createMockAgingItem({ daysOverdue: 15, balanceDue: 150000 }),
    createMockAgingItem({ daysOverdue: 45, balanceDue: 100000 }),
    createMockAgingItem({ daysOverdue: 75, balanceDue: 30000 }),
    createMockAgingItem({ daysOverdue: 120, balanceDue: 20000 }),
  ];

  const summary = createMockAgingSummary({
    totalOutstanding: 500000,
    current: 200000,
    days1To30: 150000,
    days31To60: 100000,
    days61To90: 30000,
    days90Plus: 20000,
    invoiceCount: 5,
    overdueCount: 4,
  });

  return { items, summary };
}

// ============================================================================
// Supabase Response Mocks
// ============================================================================

/**
 * Creates a mock data response from Supabase
 */
export function createMockDataResponse<T>(data: T[]) {
  return {
    data,
    error: null,
    count: data.length,
  };
}

/**
 * Creates a mock single response from Supabase
 */
export function createMockSingleResponse<T>(data: T | null) {
  return {
    data,
    error: null,
  };
}

/**
 * Creates an error response from Supabase
 */
export function createMockErrorResponse(message: string, code = 'PGRST116') {
  return {
    data: null,
    error: { message, code },
    count: null,
  };
}

// ============================================================================
// Test Constants
// ============================================================================

export const TEST_INVOICES = {
  DRAFT: createDraftInvoice(),
  SENT: createSentInvoice(),
  OVERDUE: createOverdueInvoice(),
  PAID: createPaidInvoice(),
  MIXED: createMixedInvoices(),
};

export const TEST_INVOICE_STATS = {
  DEFAULT: createMockInvoiceStats(),
  EMPTY: createEmptyInvoiceStats(),
};

export const TEST_AGING_REPORT = createMockAgingReport();
