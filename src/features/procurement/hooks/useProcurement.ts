/**
 * Procurement React Query Hooks
 *
 * Query and mutation hooks for vendors, purchase orders, and receiving.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { procurementApi } from '@/lib/api/services/procurement';
import { useToast } from '@/components/ui/use-toast';
import type {
  VendorFilters,
  PurchaseOrderFilters,
  CreateVendorDTO,
  UpdateVendorDTO,
  CreatePurchaseOrderDTO,
  UpdatePurchaseOrderDTO,
  UpdatePOLineItemDTO,
  CreatePOReceiptDTO,
} from '@/types/procurement';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const procurementKeys = {
  all: ['procurement'] as const,

  // Vendors
  vendors: () => [...procurementKeys.all, 'vendors'] as const,
  vendorList: (filters: VendorFilters) => [...procurementKeys.vendors(), 'list', filters] as const,
  vendorDetail: (id: string) => [...procurementKeys.vendors(), 'detail', id] as const,

  // Purchase Orders
  purchaseOrders: () => [...procurementKeys.all, 'purchase-orders'] as const,
  poList: (filters: PurchaseOrderFilters) => [...procurementKeys.purchaseOrders(), 'list', filters] as const,
  poDetail: (id: string) => [...procurementKeys.purchaseOrders(), 'detail', id] as const,
  poLineItems: (poId: string) => [...procurementKeys.purchaseOrders(), 'line-items', poId] as const,

  // Receipts
  receipts: (lineItemId: string) => [...procurementKeys.all, 'receipts', lineItemId] as const,

  // Stats
  stats: () => [...procurementKeys.all, 'stats'] as const,
  projectStats: (projectId: string) => [...procurementKeys.stats(), 'project', projectId] as const,
};

// ============================================================================
// VENDOR HOOKS
// ============================================================================

/**
 * Get all vendors with filters
 */
export function useVendors(filters: VendorFilters = {}) {
  return useQuery({
    queryKey: procurementKeys.vendorList(filters),
    queryFn: () => procurementApi.vendors.getVendors(filters),
    enabled: !!filters.company_id,
  });
}

/**
 * Get a single vendor
 */
export function useVendor(id: string | undefined) {
  return useQuery({
    queryKey: procurementKeys.vendorDetail(id || ''),
    queryFn: () => procurementApi.vendors.getVendor(id!),
    enabled: !!id,
  });
}

/**
 * Create a vendor
 */
export function useCreateVendor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ companyId, dto }: { companyId: string; dto: CreateVendorDTO }) =>
      procurementApi.vendors.createVendor(companyId, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: procurementKeys.vendors() });
      toast({
        title: 'Vendor created',
        description: `${data.name} has been added to your vendor list.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create vendor.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Update a vendor
 */
export function useUpdateVendor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateVendorDTO }) =>
      procurementApi.vendors.updateVendor(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: procurementKeys.vendors() });
      queryClient.invalidateQueries({ queryKey: procurementKeys.vendorDetail(data.id) });
      toast({
        title: 'Vendor updated',
        description: 'Vendor information has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update vendor.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Delete a vendor
 */
export function useDeleteVendor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => procurementApi.vendors.deleteVendor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: procurementKeys.vendors() });
      toast({
        title: 'Vendor deleted',
        description: 'Vendor has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete vendor.',
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// PURCHASE ORDER HOOKS
// ============================================================================

/**
 * Get purchase orders with filters
 */
export function usePurchaseOrders(filters: PurchaseOrderFilters = {}) {
  return useQuery({
    queryKey: procurementKeys.poList(filters),
    queryFn: () => procurementApi.purchaseOrders.getPurchaseOrders(filters),
    enabled: !!filters.project_id || !!filters.company_id,
  });
}

/**
 * Get purchase orders for a specific project
 */
export function useProjectPurchaseOrders(projectId: string | undefined) {
  return useQuery({
    queryKey: procurementKeys.poList({ project_id: projectId }),
    queryFn: () => procurementApi.purchaseOrders.getPurchaseOrders({ project_id: projectId }),
    enabled: !!projectId,
  });
}

/**
 * Get a single purchase order
 */
export function usePurchaseOrder(id: string | undefined) {
  return useQuery({
    queryKey: procurementKeys.poDetail(id || ''),
    queryFn: () => procurementApi.purchaseOrders.getPurchaseOrder(id!),
    enabled: !!id,
  });
}

/**
 * Create a purchase order
 */
export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ companyId, dto }: { companyId: string; dto: CreatePurchaseOrderDTO }) =>
      procurementApi.purchaseOrders.createPurchaseOrder(companyId, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: procurementKeys.purchaseOrders() });
      queryClient.invalidateQueries({ queryKey: procurementKeys.stats() });
      toast({
        title: 'Purchase order created',
        description: `PO ${data.po_number} has been created.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create purchase order.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Update a purchase order
 */
export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdatePurchaseOrderDTO }) =>
      procurementApi.purchaseOrders.updatePurchaseOrder(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: procurementKeys.purchaseOrders() });
      queryClient.invalidateQueries({ queryKey: procurementKeys.poDetail(data.id) });
      toast({
        title: 'Purchase order updated',
        description: 'PO has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update purchase order.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Submit PO for approval
 */
export function useSubmitPOForApproval() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => procurementApi.purchaseOrders.submitForApproval(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: procurementKeys.purchaseOrders() });
      queryClient.invalidateQueries({ queryKey: procurementKeys.poDetail(data.id) });
      toast({
        title: 'Submitted for approval',
        description: `PO ${data.po_number} is pending approval.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit for approval.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Approve a PO
 */
export function useApprovePO() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) =>
      procurementApi.purchaseOrders.approvePO(id, userId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: procurementKeys.purchaseOrders() });
      queryClient.invalidateQueries({ queryKey: procurementKeys.poDetail(data.id) });
      queryClient.invalidateQueries({ queryKey: procurementKeys.stats() });
      toast({
        title: 'PO approved',
        description: `PO ${data.po_number} has been approved.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve PO.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Mark PO as ordered
 */
export function useMarkPOAsOrdered() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => procurementApi.purchaseOrders.markAsOrdered(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: procurementKeys.purchaseOrders() });
      queryClient.invalidateQueries({ queryKey: procurementKeys.poDetail(data.id) });
      queryClient.invalidateQueries({ queryKey: procurementKeys.stats() });
      toast({
        title: 'PO ordered',
        description: `PO ${data.po_number} has been marked as ordered.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark as ordered.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Cancel a PO
 */
export function useCancelPO() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => procurementApi.purchaseOrders.cancelPO(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: procurementKeys.purchaseOrders() });
      queryClient.invalidateQueries({ queryKey: procurementKeys.stats() });
      toast({
        title: 'PO cancelled',
        description: `PO ${data.po_number} has been cancelled.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel PO.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Close a PO
 */
export function useClosePO() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => procurementApi.purchaseOrders.closePO(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: procurementKeys.purchaseOrders() });
      queryClient.invalidateQueries({ queryKey: procurementKeys.stats() });
      toast({
        title: 'PO closed',
        description: `PO ${data.po_number} has been closed.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to close PO.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Delete a PO
 */
export function useDeletePO() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => procurementApi.purchaseOrders.deletePO(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: procurementKeys.purchaseOrders() });
      queryClient.invalidateQueries({ queryKey: procurementKeys.stats() });
      toast({
        title: 'PO deleted',
        description: 'Purchase order has been deleted.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete PO.',
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// LINE ITEM HOOKS
// ============================================================================

/**
 * Get line items for a PO
 */
export function usePOLineItems(purchaseOrderId: string | undefined) {
  return useQuery({
    queryKey: procurementKeys.poLineItems(purchaseOrderId || ''),
    queryFn: () => procurementApi.lineItems.getLineItems(purchaseOrderId!),
    enabled: !!purchaseOrderId,
  });
}

/**
 * Add a line item
 */
export function useAddLineItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ purchaseOrderId, dto }: { purchaseOrderId: string; dto: CreatePOLineItemDTO }) =>
      procurementApi.lineItems.addLineItem(purchaseOrderId, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: procurementKeys.poLineItems(data.purchase_order_id) });
      queryClient.invalidateQueries({ queryKey: procurementKeys.poDetail(data.purchase_order_id) });
      toast({
        title: 'Line item added',
        description: 'Item has been added to the purchase order.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add line item.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Update a line item
 */
export function useUpdateLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { id: string; purchaseOrderId: string; dto: UpdatePOLineItemDTO }) =>
      procurementApi.lineItems.updateLineItem(params.id, params.dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: procurementKeys.poLineItems(data.purchase_order_id) });
      queryClient.invalidateQueries({ queryKey: procurementKeys.poDetail(data.purchase_order_id) });
    },
  });
}

/**
 * Delete a line item
 */
export function useDeleteLineItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: { id: string; purchaseOrderId: string }) =>
      procurementApi.lineItems.deleteLineItem(params.id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: procurementKeys.poLineItems(variables.purchaseOrderId) });
      queryClient.invalidateQueries({ queryKey: procurementKeys.poDetail(variables.purchaseOrderId) });
      toast({
        title: 'Line item removed',
        description: 'Item has been removed from the purchase order.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove line item.',
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// RECEIPT HOOKS
// ============================================================================

/**
 * Get receipts for a line item
 */
export function usePOReceipts(lineItemId: string | undefined) {
  return useQuery({
    queryKey: procurementKeys.receipts(lineItemId || ''),
    queryFn: () => procurementApi.receipts.getReceipts(lineItemId!),
    enabled: !!lineItemId,
  });
}

/**
 * Record a receipt
 */
export function useRecordReceipt() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ dto, userId }: { dto: CreatePOReceiptDTO; userId: string }) =>
      procurementApi.receipts.recordReceipt(dto, userId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: procurementKeys.receipts(data.line_item_id) });
      queryClient.invalidateQueries({ queryKey: procurementKeys.purchaseOrders() });
      queryClient.invalidateQueries({ queryKey: procurementKeys.stats() });
      toast({
        title: 'Receipt recorded',
        description: `${data.quantity_received} units have been received.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to record receipt.',
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// STATISTICS HOOKS
// ============================================================================

/**
 * Get procurement statistics for a project
 */
export function useProjectProcurementStats(projectId: string | undefined) {
  return useQuery({
    queryKey: procurementKeys.projectStats(projectId || ''),
    queryFn: () => procurementApi.stats.getProjectStats(projectId!),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
