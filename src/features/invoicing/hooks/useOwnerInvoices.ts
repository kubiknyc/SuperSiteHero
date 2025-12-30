/**
 * React Query hooks for Owner Invoices
 * Provides data fetching, mutations, and caching for invoice operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ownerInvoicesApi } from '@/lib/api/services/owner-invoices';
import type {
  OwnerInvoiceFilters,
  CreateOwnerInvoiceDTO,
  UpdateOwnerInvoiceDTO,
  CreateLineItemDTO,
  UpdateLineItemDTO,
  RecordPaymentDTO,
} from '@/types/owner-invoice';

// =============================================
// Query Keys
// =============================================

export const invoiceKeys = {
  all: ['owner-invoices'] as const,
  lists: () => [...invoiceKeys.all, 'list'] as const,
  list: (filters: OwnerInvoiceFilters) => [...invoiceKeys.lists(), filters] as const,
  details: () => [...invoiceKeys.all, 'detail'] as const,
  detail: (id: string) => [...invoiceKeys.details(), id] as const,
  lineItems: (invoiceId: string) => [...invoiceKeys.all, 'lineItems', invoiceId] as const,
  payments: (invoiceId: string) => [...invoiceKeys.all, 'payments', invoiceId] as const,
  stats: (projectId?: string) => [...invoiceKeys.all, 'stats', projectId] as const,
  aging: (projectId?: string) => [...invoiceKeys.all, 'aging', projectId] as const,
};

// =============================================
// Invoice Queries
// =============================================

/**
 * Get all invoices with optional filters
 */
export function useOwnerInvoices(filters: OwnerInvoiceFilters = {}) {
  return useQuery({
    queryKey: invoiceKeys.list(filters),
    queryFn: () => ownerInvoicesApi.getInvoices(filters),
  });
}

/**
 * Get invoices for a specific project
 */
export function useProjectInvoices(projectId: string | undefined) {
  return useQuery({
    queryKey: invoiceKeys.list({ projectId: projectId || '' }),
    queryFn: () => ownerInvoicesApi.getInvoices({ projectId }),
    enabled: !!projectId,
  });
}

/**
 * Get a single invoice by ID
 */
export function useOwnerInvoice(id: string | undefined) {
  return useQuery({
    queryKey: invoiceKeys.detail(id || ''),
    queryFn: () => ownerInvoicesApi.getInvoice(id!),
    enabled: !!id,
  });
}

/**
 * Get invoice with all details (line items, payments, etc.)
 */
export function useOwnerInvoiceWithDetails(id: string | undefined) {
  return useQuery({
    queryKey: invoiceKeys.detail(id || ''),
    queryFn: () => ownerInvoicesApi.getInvoiceWithDetails(id!),
    enabled: !!id,
  });
}

/**
 * Get invoice line items
 */
export function useInvoiceLineItems(invoiceId: string | undefined) {
  return useQuery({
    queryKey: invoiceKeys.lineItems(invoiceId || ''),
    queryFn: () => ownerInvoicesApi.getLineItems(invoiceId!),
    enabled: !!invoiceId,
  });
}

/**
 * Get invoice payments
 */
export function useInvoicePayments(invoiceId: string | undefined) {
  return useQuery({
    queryKey: invoiceKeys.payments(invoiceId || ''),
    queryFn: () => ownerInvoicesApi.getPayments(invoiceId!),
    enabled: !!invoiceId,
  });
}

/**
 * Get invoice statistics
 */
export function useInvoiceStats(projectId?: string) {
  return useQuery({
    queryKey: invoiceKeys.stats(projectId),
    queryFn: () => ownerInvoicesApi.getInvoiceStats(projectId),
  });
}

/**
 * Get aging report
 */
export function useInvoiceAgingReport(projectId?: string) {
  return useQuery({
    queryKey: invoiceKeys.aging(projectId),
    queryFn: () => ownerInvoicesApi.getAgingReport(projectId),
  });
}

// =============================================
// Invoice Mutations
// =============================================

/**
 * Create a new invoice
 */
export function useCreateOwnerInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateOwnerInvoiceDTO) => ownerInvoicesApi.createInvoice(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.stats() });
      queryClient.setQueryData(invoiceKeys.detail(data.id), data);
    },
  });
}

/**
 * Update an invoice
 */
export function useUpdateOwnerInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateOwnerInvoiceDTO }) =>
      ownerInvoicesApi.updateInvoice(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(data.id) });
    },
  });
}

/**
 * Delete an invoice
 */
export function useDeleteOwnerInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ownerInvoicesApi.deleteInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.stats() });
    },
  });
}

/**
 * Void an invoice
 */
export function useVoidOwnerInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ownerInvoicesApi.voidInvoice(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.stats() });
    },
  });
}

/**
 * Send an invoice
 */
export function useSendOwnerInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, sentVia }: { id: string; sentVia?: string }) =>
      ownerInvoicesApi.sendInvoice(id, sentVia),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.stats() });
    },
  });
}

/**
 * Mark invoice as viewed
 */
export function useMarkInvoiceViewed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ownerInvoicesApi.markInvoiceViewed(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(data.id) });
    },
  });
}

/**
 * Mark invoice as disputed
 */
export function useMarkInvoiceDisputed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      ownerInvoicesApi.markInvoiceDisputed(id, notes),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.stats() });
    },
  });
}

// =============================================
// Line Item Mutations
// =============================================

/**
 * Create a line item
 */
export function useCreateLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateLineItemDTO) => ownerInvoicesApi.createLineItem(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lineItems(data.invoiceId) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(data.invoiceId) });
    },
  });
}

/**
 * Update a line item
 */
export function useUpdateLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      dto,
      invoiceId: _invoiceId,
    }: {
      id: string;
      dto: UpdateLineItemDTO;
      invoiceId: string;
    }) => ownerInvoicesApi.updateLineItem(id, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lineItems(variables.invoiceId) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(variables.invoiceId) });
    },
  });
}

/**
 * Delete a line item
 */
export function useDeleteLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, invoiceId: _invoiceId }: { id: string; invoiceId: string }) =>
      ownerInvoicesApi.deleteLineItem(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lineItems(variables.invoiceId) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(variables.invoiceId) });
    },
  });
}

/**
 * Reorder line items
 */
export function useReorderLineItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ invoiceId, itemIds }: { invoiceId: string; itemIds: string[] }) =>
      ownerInvoicesApi.reorderLineItems(invoiceId, itemIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lineItems(variables.invoiceId) });
    },
  });
}

// =============================================
// Payment Mutations
// =============================================

/**
 * Record a payment
 */
export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: RecordPaymentDTO) => ownerInvoicesApi.recordPayment(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.payments(data.invoiceId) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(data.invoiceId) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.stats() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.aging() });
    },
  });
}

/**
 * Delete a payment
 */
export function useDeletePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, invoiceId: _invoiceId }: { id: string; invoiceId: string }) =>
      ownerInvoicesApi.deletePayment(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.payments(variables.invoiceId) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(variables.invoiceId) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.stats() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.aging() });
    },
  });
}

// =============================================
// Special Mutations
// =============================================

/**
 * Create invoice from payment application
 */
export function useCreateInvoiceFromPaymentApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      paymentApplicationId,
      billToInfo,
    }: {
      paymentApplicationId: string;
      billToInfo: {
        billToName: string;
        billToCompany?: string;
        billToEmail?: string;
        billToAddressLine1?: string;
        billToCity?: string;
        billToState?: string;
        billToZip?: string;
      };
    }) =>
      ownerInvoicesApi.createInvoiceFromPaymentApplication(paymentApplicationId, billToInfo),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.stats() });
      queryClient.setQueryData(invoiceKeys.detail(data.id), data);
    },
  });
}

/**
 * Mark overdue invoices (admin/scheduled task)
 */
export function useMarkOverdueInvoices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => ownerInvoicesApi.markOverdueInvoices(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.stats() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.aging() });
    },
  });
}
