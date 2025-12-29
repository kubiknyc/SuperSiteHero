/**
 * Owner Invoice API Service
 * CRUD operations for owner/client invoicing
 */

import { supabase } from '@/lib/supabase';
import type {
  OwnerInvoice,
  OwnerInvoiceLineItem,
  OwnerInvoicePayment,
  OwnerInvoiceWithDetails,
  OwnerInvoiceFilters,
  CreateOwnerInvoiceDTO,
  UpdateOwnerInvoiceDTO,
  CreateLineItemDTO,
  UpdateLineItemDTO,
  RecordPaymentDTO,
  InvoiceAgingItem,
  InvoiceAgingSummary,
  InvoiceStats,
  OwnerInvoiceRow,
  OwnerInvoiceLineItemRow,
  OwnerInvoicePaymentRow,
  mapRowToOwnerInvoice,
  mapRowToLineItem,
  mapRowToPayment,
  OwnerInvoiceStatus,
} from '@/types/owner-invoice';

// =============================================
// Invoice CRUD Operations
// =============================================

/**
 * Get all invoices for a project with optional filters
 */
export async function getInvoices(
  filters: OwnerInvoiceFilters = {}
): Promise<OwnerInvoice[]> {
  let query = supabase
    .from('owner_invoices')
    .select('*')
    .is('deleted_at', null)
    .order('invoice_date', { ascending: false });

  if (filters.projectId) {
    query = query.eq('project_id', filters.projectId);
  }

  if (filters.status) {
    if (Array.isArray(filters.status)) {
      query = query.in('status', filters.status);
    } else {
      query = query.eq('status', filters.status);
    }
  }

  if (filters.dateFrom) {
    query = query.gte('invoice_date', filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte('invoice_date', filters.dateTo);
  }

  if (filters.dueDateFrom) {
    query = query.gte('due_date', filters.dueDateFrom);
  }

  if (filters.dueDateTo) {
    query = query.lte('due_date', filters.dueDateTo);
  }

  if (filters.search) {
    query = query.or(
      `invoice_number.ilike.%${filters.search}%,bill_to_name.ilike.%${filters.search}%,bill_to_company.ilike.%${filters.search}%`
    );
  }

  if (filters.isOverdue) {
    query = query.eq('status', 'overdue');
  }

  if (filters.minAmount !== undefined) {
    query = query.gte('total_amount', filters.minAmount);
  }

  if (filters.maxAmount !== undefined) {
    query = query.lte('total_amount', filters.maxAmount);
  }

  const { data, error } = await query;

  if (error) {throw error;}
  return (data as OwnerInvoiceRow[]).map(mapRowToOwnerInvoice);
}

/**
 * Get a single invoice by ID
 */
export async function getInvoice(id: string): Promise<OwnerInvoice | null> {
  const { data, error } = await supabase
    .from('owner_invoices')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {return null;}
    throw error;
  }
  return mapRowToOwnerInvoice(data as OwnerInvoiceRow);
}

/**
 * Get invoice with all related data (line items, payments, project info)
 */
export async function getInvoiceWithDetails(
  id: string
): Promise<OwnerInvoiceWithDetails | null> {
  const { data, error } = await supabase
    .from('owner_invoice_summary')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {return null;}
    throw error;
  }

  // Get line items
  const { data: lineItems, error: lineItemsError } = await supabase
    .from('owner_invoice_line_items')
    .select('*')
    .eq('invoice_id', id)
    .order('sort_order', { ascending: true });

  if (lineItemsError) {throw lineItemsError;}

  // Get payments
  const { data: payments, error: paymentsError } = await supabase
    .from('owner_invoice_payments')
    .select('*')
    .eq('invoice_id', id)
    .order('payment_date', { ascending: false });

  if (paymentsError) {throw paymentsError;}

  const invoice = mapRowToOwnerInvoice(data as OwnerInvoiceRow);

  return {
    ...invoice,
    daysUntilDue: data.days_until_due,
    lineItemCount: data.line_item_count,
    paymentCount: data.payment_count,
    project: data.project_name
      ? {
          id: data.project_id,
          name: data.project_name,
          projectNumber: data.project_number,
        }
      : null,
    paymentApplication: data.application_number
      ? {
          id: data.payment_application_id,
          applicationNumber: data.application_number,
          periodTo: data.pay_app_period,
        }
      : null,
    lineItems: (lineItems as OwnerInvoiceLineItemRow[]).map(mapRowToLineItem),
    payments: (payments as OwnerInvoicePaymentRow[]).map(mapRowToPayment),
  };
}

/**
 * Create a new invoice
 */
export async function createInvoice(
  dto: CreateOwnerInvoiceDTO
): Promise<OwnerInvoice> {
  // Get the current user's company ID
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
    .single();

  if (userError) {throw userError;}

  // Get next invoice number
  const { data: invoiceNumber, error: numError } = await supabase.rpc(
    'get_next_invoice_number',
    { p_company_id: userData.company_id }
  );

  if (numError) {throw numError;}

  // Get company info for "from" fields
  const { data: companyData, error: companyError } = await supabase
    .from('companies')
    .select('name, address_line_1, address_line_2, city, state, zip, phone, email')
    .eq('id', userData.company_id)
    .single();

  if (companyError) {throw companyError;}

  // Calculate due date if not provided
  const invoiceDate = dto.invoiceDate || new Date().toISOString().split('T')[0];
  let dueDate = dto.dueDate;
  if (!dueDate) {
    const terms = dto.paymentTerms || 'Net 30';
    const days = terms === 'Due on Receipt' ? 0 : parseInt(terms.replace('Net ', '')) || 30;
    const date = new Date(invoiceDate);
    date.setDate(date.getDate() + days);
    dueDate = date.toISOString().split('T')[0];
  }

  const insertData = {
    project_id: dto.projectId,
    company_id: userData.company_id,
    invoice_number: invoiceNumber,
    invoice_date: invoiceDate,
    due_date: dueDate,
    payment_application_id: dto.paymentApplicationId || null,
    bill_to_name: dto.billToName,
    bill_to_company: dto.billToCompany || null,
    bill_to_address_line1: dto.billToAddressLine1 || null,
    bill_to_address_line2: dto.billToAddressLine2 || null,
    bill_to_city: dto.billToCity || null,
    bill_to_state: dto.billToState || null,
    bill_to_zip: dto.billToZip || null,
    bill_to_email: dto.billToEmail || null,
    bill_to_phone: dto.billToPhone || null,
    from_name: companyData?.name || null,
    from_company: companyData?.name || null,
    from_address_line1: companyData?.address_line_1 || null,
    from_address_line2: companyData?.address_line_2 || null,
    from_city: companyData?.city || null,
    from_state: companyData?.state || null,
    from_zip: companyData?.zip || null,
    from_email: companyData?.email || null,
    from_phone: companyData?.phone || null,
    tax_rate: dto.taxRate ?? 0,
    retainage_percent: dto.retainagePercent ?? 0,
    payment_terms: dto.paymentTerms || 'Net 30',
    po_number: dto.poNumber || null,
    contract_number: dto.contractNumber || null,
    project_period_from: dto.projectPeriodFrom || null,
    project_period_to: dto.projectPeriodTo || null,
    public_notes: dto.publicNotes || null,
    terms_and_conditions: dto.termsAndConditions || null,
    notes: dto.notes || null,
    created_by: (await supabase.auth.getUser()).data.user?.id,
  };

  const { data, error } = await supabase
    .from('owner_invoices')
    .insert(insertData)
    .select()
    .single();

  if (error) {throw error;}
  return mapRowToOwnerInvoice(data as OwnerInvoiceRow);
}

/**
 * Update an invoice
 */
export async function updateInvoice(
  id: string,
  dto: UpdateOwnerInvoiceDTO
): Promise<OwnerInvoice> {
  const updateData: Record<string, unknown> = {};

  if (dto.invoiceDate !== undefined) {updateData.invoice_date = dto.invoiceDate;}
  if (dto.dueDate !== undefined) {updateData.due_date = dto.dueDate;}
  if (dto.billToName !== undefined) {updateData.bill_to_name = dto.billToName;}
  if (dto.billToCompany !== undefined) {updateData.bill_to_company = dto.billToCompany;}
  if (dto.billToAddressLine1 !== undefined) {updateData.bill_to_address_line1 = dto.billToAddressLine1;}
  if (dto.billToAddressLine2 !== undefined) {updateData.bill_to_address_line2 = dto.billToAddressLine2;}
  if (dto.billToCity !== undefined) {updateData.bill_to_city = dto.billToCity;}
  if (dto.billToState !== undefined) {updateData.bill_to_state = dto.billToState;}
  if (dto.billToZip !== undefined) {updateData.bill_to_zip = dto.billToZip;}
  if (dto.billToEmail !== undefined) {updateData.bill_to_email = dto.billToEmail;}
  if (dto.billToPhone !== undefined) {updateData.bill_to_phone = dto.billToPhone;}
  if (dto.taxRate !== undefined) {updateData.tax_rate = dto.taxRate;}
  if (dto.discountAmount !== undefined) {updateData.discount_amount = dto.discountAmount;}
  if (dto.retainagePercent !== undefined) {updateData.retainage_percent = dto.retainagePercent;}
  if (dto.retainageAmount !== undefined) {updateData.retainage_amount = dto.retainageAmount;}
  if (dto.paymentTerms !== undefined) {updateData.payment_terms = dto.paymentTerms;}
  if (dto.poNumber !== undefined) {updateData.po_number = dto.poNumber;}
  if (dto.contractNumber !== undefined) {updateData.contract_number = dto.contractNumber;}
  if (dto.projectPeriodFrom !== undefined) {updateData.project_period_from = dto.projectPeriodFrom;}
  if (dto.projectPeriodTo !== undefined) {updateData.project_period_to = dto.projectPeriodTo;}
  if (dto.publicNotes !== undefined) {updateData.public_notes = dto.publicNotes;}
  if (dto.termsAndConditions !== undefined) {updateData.terms_and_conditions = dto.termsAndConditions;}
  if (dto.notes !== undefined) {updateData.notes = dto.notes;}

  const { data, error } = await supabase
    .from('owner_invoices')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {throw error;}
  return mapRowToOwnerInvoice(data as OwnerInvoiceRow);
}

/**
 * Delete (soft delete) an invoice
 */
export async function deleteInvoice(id: string): Promise<void> {
  const { error } = await supabase
    .from('owner_invoices')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {throw error;}
}

/**
 * Void an invoice
 */
export async function voidInvoice(id: string): Promise<OwnerInvoice> {
  const { data, error } = await supabase
    .from('owner_invoices')
    .update({ status: 'void' })
    .eq('id', id)
    .select()
    .single();

  if (error) {throw error;}
  return mapRowToOwnerInvoice(data as OwnerInvoiceRow);
}

/**
 * Send an invoice (update status to sent)
 */
export async function sendInvoice(
  id: string,
  sentVia: string = 'email'
): Promise<OwnerInvoice> {
  const user = (await supabase.auth.getUser()).data.user;

  const { data, error } = await supabase
    .from('owner_invoices')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      sent_by: user?.id,
      sent_via: sentVia,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {throw error;}
  return mapRowToOwnerInvoice(data as OwnerInvoiceRow);
}

/**
 * Mark invoice as viewed
 */
export async function markInvoiceViewed(id: string): Promise<OwnerInvoice> {
  const { data, error } = await supabase
    .from('owner_invoices')
    .update({
      status: 'viewed',
      viewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'sent') // Only update if currently sent
    .select()
    .single();

  if (error) {throw error;}
  return mapRowToOwnerInvoice(data as OwnerInvoiceRow);
}

/**
 * Mark invoice as disputed
 */
export async function markInvoiceDisputed(
  id: string,
  notes?: string
): Promise<OwnerInvoice> {
  const updateData: Record<string, unknown> = { status: 'disputed' };
  if (notes) {updateData.notes = notes;}

  const { data, error } = await supabase
    .from('owner_invoices')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {throw error;}
  return mapRowToOwnerInvoice(data as OwnerInvoiceRow);
}

// =============================================
// Line Item Operations
// =============================================

/**
 * Get all line items for an invoice
 */
export async function getLineItems(invoiceId: string): Promise<OwnerInvoiceLineItem[]> {
  const { data, error } = await supabase
    .from('owner_invoice_line_items')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('sort_order', { ascending: true });

  if (error) {throw error;}
  return (data as OwnerInvoiceLineItemRow[]).map(mapRowToLineItem);
}

/**
 * Create a line item
 */
export async function createLineItem(dto: CreateLineItemDTO): Promise<OwnerInvoiceLineItem> {
  // Get the next line number
  const { data: maxLine } = await supabase
    .from('owner_invoice_line_items')
    .select('line_number')
    .eq('invoice_id', dto.invoiceId)
    .order('line_number', { ascending: false })
    .limit(1)
    .single();

  const lineNumber = (maxLine?.line_number ?? 0) + 1;

  const insertData = {
    invoice_id: dto.invoiceId,
    line_number: lineNumber,
    description: dto.description,
    quantity: dto.quantity ?? 1,
    unit: dto.unit || null,
    unit_price: dto.unitPrice ?? 0,
    cost_code_id: dto.costCodeId || null,
    cost_code: dto.costCode || null,
    sov_item_id: dto.sovItemId || null,
    labor_amount: dto.laborAmount ?? 0,
    material_amount: dto.materialAmount ?? 0,
    equipment_amount: dto.equipmentAmount ?? 0,
    subcontractor_amount: dto.subcontractorAmount ?? 0,
    other_amount: dto.otherAmount ?? 0,
    is_taxable: dto.isTaxable ?? true,
    sort_order: dto.sortOrder ?? lineNumber,
    notes: dto.notes || null,
  };

  const { data, error } = await supabase
    .from('owner_invoice_line_items')
    .insert(insertData)
    .select()
    .single();

  if (error) {throw error;}
  return mapRowToLineItem(data as OwnerInvoiceLineItemRow);
}

/**
 * Update a line item
 */
export async function updateLineItem(
  id: string,
  dto: UpdateLineItemDTO
): Promise<OwnerInvoiceLineItem> {
  const updateData: Record<string, unknown> = {};

  if (dto.description !== undefined) {updateData.description = dto.description;}
  if (dto.quantity !== undefined) {updateData.quantity = dto.quantity;}
  if (dto.unit !== undefined) {updateData.unit = dto.unit;}
  if (dto.unitPrice !== undefined) {updateData.unit_price = dto.unitPrice;}
  if (dto.costCodeId !== undefined) {updateData.cost_code_id = dto.costCodeId;}
  if (dto.costCode !== undefined) {updateData.cost_code = dto.costCode;}
  if (dto.laborAmount !== undefined) {updateData.labor_amount = dto.laborAmount;}
  if (dto.materialAmount !== undefined) {updateData.material_amount = dto.materialAmount;}
  if (dto.equipmentAmount !== undefined) {updateData.equipment_amount = dto.equipmentAmount;}
  if (dto.subcontractorAmount !== undefined) {updateData.subcontractor_amount = dto.subcontractorAmount;}
  if (dto.otherAmount !== undefined) {updateData.other_amount = dto.otherAmount;}
  if (dto.isTaxable !== undefined) {updateData.is_taxable = dto.isTaxable;}
  if (dto.sortOrder !== undefined) {updateData.sort_order = dto.sortOrder;}
  if (dto.notes !== undefined) {updateData.notes = dto.notes;}

  const { data, error } = await supabase
    .from('owner_invoice_line_items')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {throw error;}
  return mapRowToLineItem(data as OwnerInvoiceLineItemRow);
}

/**
 * Delete a line item
 */
export async function deleteLineItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('owner_invoice_line_items')
    .delete()
    .eq('id', id);

  if (error) {throw error;}
}

/**
 * Reorder line items
 */
export async function reorderLineItems(
  invoiceId: string,
  itemIds: string[]
): Promise<void> {
  const updates = itemIds.map((id, index) => ({
    id,
    sort_order: index + 1,
  }));

  for (const update of updates) {
    const { error } = await supabase
      .from('owner_invoice_line_items')
      .update({ sort_order: update.sort_order })
      .eq('id', update.id)
      .eq('invoice_id', invoiceId);

    if (error) {throw error;}
  }
}

// =============================================
// Payment Operations
// =============================================

/**
 * Get all payments for an invoice
 */
export async function getPayments(invoiceId: string): Promise<OwnerInvoicePayment[]> {
  const { data, error } = await supabase
    .from('owner_invoice_payments')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('payment_date', { ascending: false });

  if (error) {throw error;}
  return (data as OwnerInvoicePaymentRow[]).map(mapRowToPayment);
}

/**
 * Record a payment
 */
export async function recordPayment(dto: RecordPaymentDTO): Promise<OwnerInvoicePayment> {
  const user = (await supabase.auth.getUser()).data.user;

  const insertData = {
    invoice_id: dto.invoiceId,
    payment_date: dto.paymentDate || new Date().toISOString().split('T')[0],
    amount: dto.amount,
    payment_method: dto.paymentMethod || null,
    reference_number: dto.referenceNumber || null,
    deposited_to_account: dto.depositedToAccount || null,
    deposited_at: dto.depositedAt || null,
    notes: dto.notes || null,
    created_by: user?.id,
  };

  const { data, error } = await supabase
    .from('owner_invoice_payments')
    .insert(insertData)
    .select()
    .single();

  if (error) {throw error;}
  return mapRowToPayment(data as OwnerInvoicePaymentRow);
}

/**
 * Delete a payment
 */
export async function deletePayment(id: string): Promise<void> {
  const { error } = await supabase
    .from('owner_invoice_payments')
    .delete()
    .eq('id', id);

  if (error) {throw error;}
}

// =============================================
// Statistics and Reports
// =============================================

/**
 * Get invoice statistics for dashboard
 */
export async function getInvoiceStats(projectId?: string): Promise<InvoiceStats> {
  let query = supabase
    .from('owner_invoices')
    .select('status, total_amount, amount_paid, balance_due, paid_at')
    .is('deleted_at', null);

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query;

  if (error) {throw error;}

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const stats: InvoiceStats = {
    draftCount: 0,
    sentCount: 0,
    overdueCount: 0,
    paidCount: 0,
    totalDraft: 0,
    totalSent: 0,
    totalOverdue: 0,
    totalPaidThisMonth: 0,
    totalOutstanding: 0,
  };

  for (const invoice of data || []) {
    switch (invoice.status as OwnerInvoiceStatus) {
      case 'draft':
        stats.draftCount++;
        stats.totalDraft += invoice.total_amount || 0;
        break;
      case 'sent':
      case 'viewed':
        stats.sentCount++;
        stats.totalSent += invoice.balance_due || 0;
        stats.totalOutstanding += invoice.balance_due || 0;
        break;
      case 'overdue':
        stats.overdueCount++;
        stats.totalOverdue += invoice.balance_due || 0;
        stats.totalOutstanding += invoice.balance_due || 0;
        break;
      case 'paid':
        stats.paidCount++;
        if (invoice.paid_at && new Date(invoice.paid_at) >= startOfMonth) {
          stats.totalPaidThisMonth += invoice.amount_paid || 0;
        }
        break;
      case 'partially_paid':
        stats.sentCount++;
        stats.totalOutstanding += invoice.balance_due || 0;
        break;
    }
  }

  return stats;
}

/**
 * Get aging report
 */
export async function getAgingReport(projectId?: string): Promise<{
  items: InvoiceAgingItem[];
  summary: InvoiceAgingSummary;
}> {
  let query = supabase.from('invoice_aging_report').select('*');

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query.order('days_overdue', { ascending: false });

  if (error) {throw error;}

  const items: InvoiceAgingItem[] = (data || []).map((row) => ({
    id: row.id,
    invoiceNumber: row.invoice_number,
    invoiceDate: row.invoice_date,
    dueDate: row.due_date,
    projectId: row.project_id,
    projectName: row.project_name,
    billToName: row.bill_to_name,
    billToCompany: row.bill_to_company,
    totalAmount: row.total_amount,
    amountPaid: row.amount_paid,
    balanceDue: row.balance_due,
    status: row.status,
    daysOverdue: row.days_overdue,
    agingBucket: row.aging_bucket,
  }));

  const summary: InvoiceAgingSummary = {
    totalOutstanding: 0,
    current: 0,
    days1To30: 0,
    days31To60: 0,
    days61To90: 0,
    days90Plus: 0,
    invoiceCount: items.length,
    overdueCount: 0,
  };

  for (const item of items) {
    summary.totalOutstanding += item.balanceDue;
    if (item.daysOverdue > 0) {summary.overdueCount++;}

    switch (item.agingBucket) {
      case 'current':
        summary.current += item.balanceDue;
        break;
      case '1-30':
        summary.days1To30 += item.balanceDue;
        break;
      case '31-60':
        summary.days31To60 += item.balanceDue;
        break;
      case '61-90':
        summary.days61To90 += item.balanceDue;
        break;
      case '90+':
        summary.days90Plus += item.balanceDue;
        break;
    }
  }

  return { items, summary };
}

/**
 * Mark overdue invoices (called periodically)
 */
export async function markOverdueInvoices(): Promise<number> {
  const { data, error } = await supabase.rpc('mark_overdue_invoices');

  if (error) {throw error;}
  return data || 0;
}

// =============================================
// Create Invoice from Payment Application
// =============================================

/**
 * Create an invoice from a payment application
 */
export async function createInvoiceFromPaymentApplication(
  paymentApplicationId: string,
  billToInfo: {
    billToName: string;
    billToCompany?: string;
    billToEmail?: string;
    billToAddressLine1?: string;
    billToCity?: string;
    billToState?: string;
    billToZip?: string;
  }
): Promise<OwnerInvoice> {
  // Get the payment application with SOV items
  const { data: payApp, error: payAppError } = await supabase
    .from('payment_applications')
    .select(`
      *,
      projects (id, name, project_number)
    `)
    .eq('id', paymentApplicationId)
    .single();

  if (payAppError) {throw payAppError;}

  // Create the invoice
  const invoice = await createInvoice({
    projectId: payApp.project_id,
    paymentApplicationId: paymentApplicationId,
    billToName: billToInfo.billToName,
    billToCompany: billToInfo.billToCompany,
    billToEmail: billToInfo.billToEmail,
    billToAddressLine1: billToInfo.billToAddressLine1,
    billToCity: billToInfo.billToCity,
    billToState: billToInfo.billToState,
    billToZip: billToInfo.billToZip,
    retainagePercent: payApp.retainage_percent,
    projectPeriodTo: payApp.period_to,
  });

  // Get SOV items and create line items
  const { data: sovItems, error: sovError } = await supabase
    .from('schedule_of_values')
    .select('*')
    .eq('payment_application_id', paymentApplicationId)
    .order('sort_order', { ascending: true });

  if (sovError) {throw sovError;}

  // Create line items from SOV items
  for (const sov of sovItems || []) {
    if (sov.work_completed_this_period > 0 || sov.materials_stored > 0) {
      await createLineItem({
        invoiceId: invoice.id,
        description: sov.description,
        quantity: 1,
        unit: 'LS',
        unitPrice: sov.work_completed_this_period + sov.materials_stored,
        costCodeId: sov.cost_code_id,
        costCode: sov.cost_code,
        sovItemId: sov.id,
        sortOrder: sov.sort_order,
      });
    }
  }

  // Return the updated invoice with totals
  const updated = await getInvoice(invoice.id);
  return updated!;
}

// Export all functions
export const ownerInvoicesApi = {
  // Invoice CRUD
  getInvoices,
  getInvoice,
  getInvoiceWithDetails,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  voidInvoice,
  sendInvoice,
  markInvoiceViewed,
  markInvoiceDisputed,

  // Line Items
  getLineItems,
  createLineItem,
  updateLineItem,
  deleteLineItem,
  reorderLineItems,

  // Payments
  getPayments,
  recordPayment,
  deletePayment,

  // Statistics
  getInvoiceStats,
  getAgingReport,
  markOverdueInvoices,

  // From Payment Application
  createInvoiceFromPaymentApplication,
};
