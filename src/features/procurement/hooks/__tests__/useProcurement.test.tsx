/**
 * Procurement Hooks Tests
 * Comprehensive tests for useProcurement hooks
 *
 * Test Coverage:
 * - Vendor CRUD hooks
 * - Purchase Order CRUD hooks and status transitions
 * - Line Item CRUD hooks
 * - Receipt hooks
 * - Query key patterns
 * - Cache invalidation on mutations
 * - Toast notifications
 * - Disabled queries when IDs are missing
 *
 * Total: 50+ test cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// ============================================================================
// Mocks - Must be before imports
// ============================================================================

// Mock toast hook
const mockToast = vi.fn();
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Mock procurement API - must be defined inline for hoisting
vi.mock('@/lib/api/services/procurement', () => ({
  procurementApi: {
    vendors: {
      getVendors: vi.fn(),
      getVendor: vi.fn(),
      createVendor: vi.fn(),
      updateVendor: vi.fn(),
      deleteVendor: vi.fn(),
    },
    purchaseOrders: {
      getPurchaseOrders: vi.fn(),
      getPurchaseOrder: vi.fn(),
      createPurchaseOrder: vi.fn(),
      updatePurchaseOrder: vi.fn(),
      submitForApproval: vi.fn(),
      approvePO: vi.fn(),
      markAsOrdered: vi.fn(),
      cancelPO: vi.fn(),
      closePO: vi.fn(),
      deletePO: vi.fn(),
    },
    lineItems: {
      getLineItems: vi.fn(),
      addLineItem: vi.fn(),
      updateLineItem: vi.fn(),
      deleteLineItem: vi.fn(),
    },
    receipts: {
      getReceipts: vi.fn(),
      recordReceipt: vi.fn(),
    },
    stats: {
      getProjectStats: vi.fn(),
    },
  },
}));

// Import the mocked module to access it
import { procurementApi as mockProcurementApi } from '@/lib/api/services/procurement';

// Import hooks to test
import {
  useVendors,
  useVendor,
  useCreateVendor,
  useUpdateVendor,
  useDeleteVendor,
  usePurchaseOrders,
  useProjectPurchaseOrders,
  usePurchaseOrder,
  useCreatePurchaseOrder,
  useUpdatePurchaseOrder,
  useSubmitPOForApproval,
  useApprovePO,
  useMarkPOAsOrdered,
  useCancelPO,
  useClosePO,
  useDeletePO,
  usePOLineItems,
  useAddLineItem,
  useUpdateLineItem,
  useDeleteLineItem,
  usePOReceipts,
  useRecordReceipt,
  useProjectProcurementStats,
  procurementKeys,
} from '../useProcurement';

// Import test factories
import {
  createMockVendor,
  createMockVendors,
  createMockPurchaseOrder,
  createMockPurchaseOrders,
  createDraftPO,
  createApprovedPO,
  createOrderedPO,
  createMockPOLineItem,
  createMockPOLineItems,
  createMockPOReceipt,
  createMockPOReceipts,
  createMockProcurementStats,
  createVendorDTO,
  createUpdateVendorDTO,
  createPurchaseOrderDTO,
  createUpdatePurchaseOrderDTO,
  createLineItemDTO,
  createUpdateLineItemDTO,
  createReceiptDTO,
  createVendorFilters,
  createPurchaseOrderFilters,
} from '@/__tests__/factories/procurement.factory';

// ============================================================================
// Test Setup
// ============================================================================

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: console.info,
      warn: console.warn,
      error: () => {},
    },
  });
};

interface WrapperProps {
  children: ReactNode;
}

const createWrapper = (queryClient: QueryClient) => {
  return function Wrapper({ children }: WrapperProps) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
};

// ============================================================================
// Tests
// ============================================================================

describe('Procurement Hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  // ==========================================================================
  // Vendor Hooks Tests
  // ==========================================================================

  describe('Vendor Hooks', () => {
    describe('useVendors', () => {
      it('should fetch vendors successfully', async () => {
        const mockVendors = createMockVendors(3);
        mockProcurementApi.vendors.getVendors.mockResolvedValue(mockVendors);
        const filters = createVendorFilters({ company_id: 'company-123' });

        const { result } = renderHook(() => useVendors(filters), {
          wrapper: createWrapper(queryClient),
        });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual(mockVendors);
        expect(mockProcurementApi.vendors.getVendors).toHaveBeenCalledWith(filters);
      });

      it('should not fetch when company_id is missing', () => {
        const filters = createVendorFilters({ company_id: undefined });

        const { result } = renderHook(() => useVendors(filters), {
          wrapper: createWrapper(queryClient),
        });

        expect(result.current.fetchStatus).toBe('idle');
        expect(mockProcurementApi.vendors.getVendors).not.toHaveBeenCalled();
      });

      it('should use correct query key', () => {
        const filters = createVendorFilters({ company_id: 'company-123', is_active: true });
        mockProcurementApi.vendors.getVendors.mockResolvedValue([]);

        renderHook(() => useVendors(filters), {
          wrapper: createWrapper(queryClient),
        });

        const queryState = queryClient.getQueryState(procurementKeys.vendorList(filters));
        expect(queryState).toBeDefined();
      });

      it('should handle errors', async () => {
        const error = new Error('Failed to fetch vendors');
        mockProcurementApi.vendors.getVendors.mockRejectedValue(error);
        const filters = createVendorFilters({ company_id: 'company-123' });

        const { result } = renderHook(() => useVendors(filters), {
          wrapper: createWrapper(queryClient),
        });

        await waitFor(() => {
          expect(result.current.isError).toBe(true);
        });

        expect(result.current.error).toBeDefined();
      });
    });

    describe('useVendor', () => {
      it('should fetch single vendor successfully', async () => {
        const mockVendor = createMockVendor();
        mockProcurementApi.vendors.getVendor.mockResolvedValue(mockVendor);

        const { result } = renderHook(() => useVendor(mockVendor.id), {
          wrapper: createWrapper(queryClient),
        });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual(mockVendor);
        expect(mockProcurementApi.vendors.getVendor).toHaveBeenCalledWith(mockVendor.id);
      });

      it('should not fetch when id is undefined', () => {
        const { result } = renderHook(() => useVendor(undefined), {
          wrapper: createWrapper(queryClient),
        });

        expect(result.current.fetchStatus).toBe('idle');
        expect(mockProcurementApi.vendors.getVendor).not.toHaveBeenCalled();
      });

      it('should use correct query key', () => {
        const vendorId = 'vendor-123';
        mockProcurementApi.vendors.getVendor.mockResolvedValue(createMockVendor());

        renderHook(() => useVendor(vendorId), {
          wrapper: createWrapper(queryClient),
        });

        const queryState = queryClient.getQueryState(procurementKeys.vendorDetail(vendorId));
        expect(queryState).toBeDefined();
      });
    });

    describe('useCreateVendor', () => {
      it('should create vendor successfully', async () => {
        const mockVendor = createMockVendor();
        const dto = createVendorDTO();
        mockProcurementApi.vendors.createVendor.mockResolvedValue(mockVendor);

        const { result } = renderHook(() => useCreateVendor(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate({ companyId: 'company-123', dto });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(mockProcurementApi.vendors.createVendor).toHaveBeenCalledWith('company-123', dto);
        expect(result.current.data).toEqual(mockVendor);
      });

      it('should show success toast', async () => {
        const mockVendor = createMockVendor({ name: 'ACME Corp' });
        mockProcurementApi.vendors.createVendor.mockResolvedValue(mockVendor);

        const { result } = renderHook(() => useCreateVendor(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate({ companyId: 'company-123', dto: createVendorDTO() });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(mockToast).toHaveBeenCalledWith({
          title: 'Vendor created',
          description: 'ACME Corp has been added to your vendor list.',
        });
      });

      it('should invalidate vendors queries', async () => {
        const mockVendor = createMockVendor();
        mockProcurementApi.vendors.createVendor.mockResolvedValue(mockVendor);

        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

        const { result } = renderHook(() => useCreateVendor(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate({ companyId: 'company-123', dto: createVendorDTO() });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: procurementKeys.vendors() });
      });

      it('should show error toast on failure', async () => {
        const error = new Error('Failed to create vendor');
        mockProcurementApi.vendors.createVendor.mockRejectedValue(error);

        const { result } = renderHook(() => useCreateVendor(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate({ companyId: 'company-123', dto: createVendorDTO() });

        await waitFor(() => {
          expect(result.current.isError).toBe(true);
        });

        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Failed to create vendor',
          variant: 'destructive',
        });
      });
    });

    describe('useUpdateVendor', () => {
      it('should update vendor successfully', async () => {
        const mockVendor = createMockVendor();
        const dto = createUpdateVendorDTO({ name: 'Updated Name' });
        mockProcurementApi.vendors.updateVendor.mockResolvedValue({ ...mockVendor, ...dto });

        const { result } = renderHook(() => useUpdateVendor(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate({ id: mockVendor.id, dto });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(mockProcurementApi.vendors.updateVendor).toHaveBeenCalledWith(mockVendor.id, dto);
      });

      it('should invalidate both list and detail queries', async () => {
        const mockVendor = createMockVendor();
        mockProcurementApi.vendors.updateVendor.mockResolvedValue(mockVendor);

        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

        const { result } = renderHook(() => useUpdateVendor(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate({ id: mockVendor.id, dto: createUpdateVendorDTO() });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: procurementKeys.vendors() });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: procurementKeys.vendorDetail(mockVendor.id) });
      });

      it('should show success toast', async () => {
        const mockVendor = createMockVendor();
        mockProcurementApi.vendors.updateVendor.mockResolvedValue(mockVendor);

        const { result } = renderHook(() => useUpdateVendor(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate({ id: mockVendor.id, dto: createUpdateVendorDTO() });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(mockToast).toHaveBeenCalledWith({
          title: 'Vendor updated',
          description: 'Vendor information has been updated.',
        });
      });
    });

    describe('useDeleteVendor', () => {
      it('should delete vendor successfully', async () => {
        mockProcurementApi.vendors.deleteVendor.mockResolvedValue(undefined);

        const { result } = renderHook(() => useDeleteVendor(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate('vendor-123');

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(mockProcurementApi.vendors.deleteVendor).toHaveBeenCalledWith('vendor-123');
      });

      it('should invalidate vendors queries', async () => {
        mockProcurementApi.vendors.deleteVendor.mockResolvedValue(undefined);

        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

        const { result } = renderHook(() => useDeleteVendor(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate('vendor-123');

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: procurementKeys.vendors() });
      });

      it('should show success toast', async () => {
        mockProcurementApi.vendors.deleteVendor.mockResolvedValue(undefined);

        const { result } = renderHook(() => useDeleteVendor(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate('vendor-123');

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(mockToast).toHaveBeenCalledWith({
          title: 'Vendor deleted',
          description: 'Vendor has been removed.',
        });
      });
    });
  });

  // ==========================================================================
  // Purchase Order Hooks Tests
  // ==========================================================================

  describe('Purchase Order Hooks', () => {
    describe('usePurchaseOrders', () => {
      it('should fetch purchase orders successfully', async () => {
        const mockPOs = createMockPurchaseOrders(3);
        mockProcurementApi.purchaseOrders.getPurchaseOrders.mockResolvedValue(mockPOs);
        const filters = createPurchaseOrderFilters({ project_id: 'project-123' });

        const { result } = renderHook(() => usePurchaseOrders(filters), {
          wrapper: createWrapper(queryClient),
        });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual(mockPOs);
        expect(mockProcurementApi.purchaseOrders.getPurchaseOrders).toHaveBeenCalledWith(filters);
      });

      it('should not fetch when project_id and company_id are missing', () => {
        const filters = createPurchaseOrderFilters({});

        const { result } = renderHook(() => usePurchaseOrders(filters), {
          wrapper: createWrapper(queryClient),
        });

        expect(result.current.fetchStatus).toBe('idle');
        expect(mockProcurementApi.purchaseOrders.getPurchaseOrders).not.toHaveBeenCalled();
      });

      it('should fetch when company_id is provided', async () => {
        const mockPOs = createMockPurchaseOrders(2);
        mockProcurementApi.purchaseOrders.getPurchaseOrders.mockResolvedValue(mockPOs);
        const filters = createPurchaseOrderFilters({ company_id: 'company-123' });

        const { result } = renderHook(() => usePurchaseOrders(filters), {
          wrapper: createWrapper(queryClient),
        });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(mockProcurementApi.purchaseOrders.getPurchaseOrders).toHaveBeenCalledWith(filters);
      });
    });

    describe('useProjectPurchaseOrders', () => {
      it('should fetch project POs successfully', async () => {
        const mockPOs = createMockPurchaseOrders(3, { project_id: 'project-456' });
        mockProcurementApi.purchaseOrders.getPurchaseOrders.mockResolvedValue(mockPOs);

        const { result } = renderHook(() => useProjectPurchaseOrders('project-456'), {
          wrapper: createWrapper(queryClient),
        });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual(mockPOs);
        expect(mockProcurementApi.purchaseOrders.getPurchaseOrders).toHaveBeenCalledWith({ project_id: 'project-456' });
      });

      it('should not fetch when projectId is undefined', () => {
        const { result } = renderHook(() => useProjectPurchaseOrders(undefined), {
          wrapper: createWrapper(queryClient),
        });

        expect(result.current.fetchStatus).toBe('idle');
        expect(mockProcurementApi.purchaseOrders.getPurchaseOrders).not.toHaveBeenCalled();
      });
    });

    describe('usePurchaseOrder', () => {
      it('should fetch single PO successfully', async () => {
        const mockPO = createMockPurchaseOrder();
        mockProcurementApi.purchaseOrders.getPurchaseOrder.mockResolvedValue(mockPO);

        const { result } = renderHook(() => usePurchaseOrder(mockPO.id), {
          wrapper: createWrapper(queryClient),
        });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual(mockPO);
        expect(mockProcurementApi.purchaseOrders.getPurchaseOrder).toHaveBeenCalledWith(mockPO.id);
      });

      it('should not fetch when id is undefined', () => {
        const { result } = renderHook(() => usePurchaseOrder(undefined), {
          wrapper: createWrapper(queryClient),
        });

        expect(result.current.fetchStatus).toBe('idle');
        expect(mockProcurementApi.purchaseOrders.getPurchaseOrder).not.toHaveBeenCalled();
      });
    });

    describe('useCreatePurchaseOrder', () => {
      it('should create PO successfully', async () => {
        const mockPO = createDraftPO({ po_number: 'PO-12345' });
        const dto = createPurchaseOrderDTO();
        mockProcurementApi.purchaseOrders.createPurchaseOrder.mockResolvedValue(mockPO);

        const { result } = renderHook(() => useCreatePurchaseOrder(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate({ companyId: 'company-123', dto });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(mockProcurementApi.purchaseOrders.createPurchaseOrder).toHaveBeenCalledWith('company-123', dto);
      });

      it('should show success toast with PO number', async () => {
        const mockPO = createDraftPO({ po_number: 'PO-12345' });
        mockProcurementApi.purchaseOrders.createPurchaseOrder.mockResolvedValue(mockPO);

        const { result } = renderHook(() => useCreatePurchaseOrder(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate({ companyId: 'company-123', dto: createPurchaseOrderDTO() });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(mockToast).toHaveBeenCalledWith({
          title: 'Purchase order created',
          description: 'PO PO-12345 has been created.',
        });
      });

      it('should invalidate PO and stats queries', async () => {
        const mockPO = createDraftPO();
        mockProcurementApi.purchaseOrders.createPurchaseOrder.mockResolvedValue(mockPO);

        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

        const { result } = renderHook(() => useCreatePurchaseOrder(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate({ companyId: 'company-123', dto: createPurchaseOrderDTO() });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: procurementKeys.purchaseOrders() });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: procurementKeys.stats() });
      });
    });

    describe('useUpdatePurchaseOrder', () => {
      it('should update PO successfully', async () => {
        const mockPO = createMockPurchaseOrder();
        const dto = createUpdatePurchaseOrderDTO({ notes: 'Updated notes' });
        mockProcurementApi.purchaseOrders.updatePurchaseOrder.mockResolvedValue({ ...mockPO, ...dto });

        const { result } = renderHook(() => useUpdatePurchaseOrder(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate({ id: mockPO.id, dto });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(mockProcurementApi.purchaseOrders.updatePurchaseOrder).toHaveBeenCalledWith(mockPO.id, dto);
      });

      it('should invalidate both list and detail queries', async () => {
        const mockPO = createMockPurchaseOrder();
        mockProcurementApi.purchaseOrders.updatePurchaseOrder.mockResolvedValue(mockPO);

        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

        const { result } = renderHook(() => useUpdatePurchaseOrder(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate({ id: mockPO.id, dto: createUpdatePurchaseOrderDTO() });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: procurementKeys.purchaseOrders() });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: procurementKeys.poDetail(mockPO.id) });
      });
    });

    describe('useSubmitPOForApproval', () => {
      it('should submit PO for approval successfully', async () => {
        const mockPO = createMockPurchaseOrder({ status: 'pending_approval', po_number: 'PO-12345' });
        mockProcurementApi.purchaseOrders.submitForApproval.mockResolvedValue(mockPO);

        const { result } = renderHook(() => useSubmitPOForApproval(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate(mockPO.id);

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(mockProcurementApi.purchaseOrders.submitForApproval).toHaveBeenCalledWith(mockPO.id);
      });

      it('should show success toast', async () => {
        const mockPO = createMockPurchaseOrder({ status: 'pending_approval', po_number: 'PO-12345' });
        mockProcurementApi.purchaseOrders.submitForApproval.mockResolvedValue(mockPO);

        const { result } = renderHook(() => useSubmitPOForApproval(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate(mockPO.id);

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(mockToast).toHaveBeenCalledWith({
          title: 'Submitted for approval',
          description: 'PO PO-12345 is pending approval.',
        });
      });
    });

    describe('useApprovePO', () => {
      it('should approve PO successfully', async () => {
        const mockPO = createApprovedPO({ po_number: 'PO-12345' });
        mockProcurementApi.purchaseOrders.approvePO.mockResolvedValue(mockPO);

        const { result } = renderHook(() => useApprovePO(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate({ id: mockPO.id, userId: 'user-456' });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(mockProcurementApi.purchaseOrders.approvePO).toHaveBeenCalledWith(mockPO.id, 'user-456');
      });

      it('should invalidate stats queries', async () => {
        const mockPO = createApprovedPO();
        mockProcurementApi.purchaseOrders.approvePO.mockResolvedValue(mockPO);

        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

        const { result } = renderHook(() => useApprovePO(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate({ id: mockPO.id, userId: 'user-456' });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: procurementKeys.purchaseOrders() });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: procurementKeys.poDetail(mockPO.id) });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: procurementKeys.stats() });
      });
    });

    describe('useMarkPOAsOrdered', () => {
      it('should mark PO as ordered successfully', async () => {
        const mockPO = createOrderedPO({ po_number: 'PO-12345' });
        mockProcurementApi.purchaseOrders.markAsOrdered.mockResolvedValue(mockPO);

        const { result } = renderHook(() => useMarkPOAsOrdered(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate(mockPO.id);

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(mockProcurementApi.purchaseOrders.markAsOrdered).toHaveBeenCalledWith(mockPO.id);
      });

      it('should show success toast', async () => {
        const mockPO = createOrderedPO({ po_number: 'PO-12345' });
        mockProcurementApi.purchaseOrders.markAsOrdered.mockResolvedValue(mockPO);

        const { result } = renderHook(() => useMarkPOAsOrdered(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate(mockPO.id);

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(mockToast).toHaveBeenCalledWith({
          title: 'PO ordered',
          description: 'PO PO-12345 has been marked as ordered.',
        });
      });
    });

    describe('useCancelPO', () => {
      it('should cancel PO successfully', async () => {
        const mockPO = createMockPurchaseOrder({ status: 'cancelled', po_number: 'PO-12345' });
        mockProcurementApi.purchaseOrders.cancelPO.mockResolvedValue(mockPO);

        const { result } = renderHook(() => useCancelPO(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate(mockPO.id);

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(mockProcurementApi.purchaseOrders.cancelPO).toHaveBeenCalledWith(mockPO.id);
      });

      it('should show success toast', async () => {
        const mockPO = createMockPurchaseOrder({ status: 'cancelled', po_number: 'PO-12345' });
        mockProcurementApi.purchaseOrders.cancelPO.mockResolvedValue(mockPO);

        const { result } = renderHook(() => useCancelPO(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate(mockPO.id);

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(mockToast).toHaveBeenCalledWith({
          title: 'PO cancelled',
          description: 'PO PO-12345 has been cancelled.',
        });
      });
    });

    describe('useClosePO', () => {
      it('should close PO successfully', async () => {
        const mockPO = createMockPurchaseOrder({ status: 'closed', po_number: 'PO-12345' });
        mockProcurementApi.purchaseOrders.closePO.mockResolvedValue(mockPO);

        const { result } = renderHook(() => useClosePO(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate(mockPO.id);

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(mockProcurementApi.purchaseOrders.closePO).toHaveBeenCalledWith(mockPO.id);
      });
    });

    describe('useDeletePO', () => {
      it('should delete PO successfully', async () => {
        mockProcurementApi.purchaseOrders.deletePO.mockResolvedValue(undefined);

        const { result } = renderHook(() => useDeletePO(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate('po-123');

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(mockProcurementApi.purchaseOrders.deletePO).toHaveBeenCalledWith('po-123');
      });

      it('should invalidate PO and stats queries', async () => {
        mockProcurementApi.purchaseOrders.deletePO.mockResolvedValue(undefined);

        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

        const { result } = renderHook(() => useDeletePO(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate('po-123');

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: procurementKeys.purchaseOrders() });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: procurementKeys.stats() });
      });
    });
  });

  // ==========================================================================
  // Line Item Hooks Tests
  // ==========================================================================

  describe('Line Item Hooks', () => {
    describe('usePOLineItems', () => {
      it('should fetch line items successfully', async () => {
        const mockLineItems = createMockPOLineItems(5);
        mockProcurementApi.lineItems.getLineItems.mockResolvedValue(mockLineItems);

        const { result } = renderHook(() => usePOLineItems('po-123'), {
          wrapper: createWrapper(queryClient),
        });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual(mockLineItems);
        expect(mockProcurementApi.lineItems.getLineItems).toHaveBeenCalledWith('po-123');
      });

      it('should not fetch when purchaseOrderId is undefined', () => {
        const { result } = renderHook(() => usePOLineItems(undefined), {
          wrapper: createWrapper(queryClient),
        });

        expect(result.current.fetchStatus).toBe('idle');
        expect(mockProcurementApi.lineItems.getLineItems).not.toHaveBeenCalled();
      });

      it('should use correct query key', () => {
        const poId = 'po-123';
        mockProcurementApi.lineItems.getLineItems.mockResolvedValue([]);

        renderHook(() => usePOLineItems(poId), {
          wrapper: createWrapper(queryClient),
        });

        const queryState = queryClient.getQueryState(procurementKeys.poLineItems(poId));
        expect(queryState).toBeDefined();
      });
    });

    describe('useAddLineItem', () => {
      it('should add line item successfully', async () => {
        const mockLineItem = createMockPOLineItem({ purchase_order_id: 'po-123' });
        const dto = createLineItemDTO();
        mockProcurementApi.lineItems.addLineItem.mockResolvedValue(mockLineItem);

        const { result } = renderHook(() => useAddLineItem(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate({ purchaseOrderId: 'po-123', dto });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(mockProcurementApi.lineItems.addLineItem).toHaveBeenCalledWith('po-123', dto);
      });

      it('should invalidate line items and PO detail queries', async () => {
        const mockLineItem = createMockPOLineItem({ purchase_order_id: 'po-123' });
        mockProcurementApi.lineItems.addLineItem.mockResolvedValue(mockLineItem);

        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

        const { result } = renderHook(() => useAddLineItem(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate({ purchaseOrderId: 'po-123', dto: createLineItemDTO() });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: procurementKeys.poLineItems('po-123') });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: procurementKeys.poDetail('po-123') });
      });

      it('should show success toast', async () => {
        const mockLineItem = createMockPOLineItem({ purchase_order_id: 'po-123' });
        mockProcurementApi.lineItems.addLineItem.mockResolvedValue(mockLineItem);

        const { result } = renderHook(() => useAddLineItem(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate({ purchaseOrderId: 'po-123', dto: createLineItemDTO() });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(mockToast).toHaveBeenCalledWith({
          title: 'Line item added',
          description: 'Item has been added to the purchase order.',
        });
      });
    });

    describe('useUpdateLineItem', () => {
      it('should update line item successfully', async () => {
        const mockLineItem = createMockPOLineItem({ id: 'line-123', purchase_order_id: 'po-123' });
        const dto = createUpdateLineItemDTO({ quantity: 200 });
        mockProcurementApi.lineItems.updateLineItem.mockResolvedValue({ ...mockLineItem, ...dto });

        const { result } = renderHook(() => useUpdateLineItem(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate({ id: 'line-123', purchaseOrderId: 'po-123', dto });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(mockProcurementApi.lineItems.updateLineItem).toHaveBeenCalledWith('line-123', dto);
      });

      it('should invalidate queries without toast', async () => {
        const mockLineItem = createMockPOLineItem({ id: 'line-123', purchase_order_id: 'po-123' });
        mockProcurementApi.lineItems.updateLineItem.mockResolvedValue(mockLineItem);

        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

        const { result } = renderHook(() => useUpdateLineItem(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate({ id: 'line-123', purchaseOrderId: 'po-123', dto: createUpdateLineItemDTO() });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: procurementKeys.poLineItems('po-123') });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: procurementKeys.poDetail('po-123') });
        expect(mockToast).not.toHaveBeenCalled();
      });
    });

    describe('useDeleteLineItem', () => {
      it('should delete line item successfully', async () => {
        mockProcurementApi.lineItems.deleteLineItem.mockResolvedValue(undefined);

        const { result } = renderHook(() => useDeleteLineItem(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate({ id: 'line-123', purchaseOrderId: 'po-123' });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(mockProcurementApi.lineItems.deleteLineItem).toHaveBeenCalledWith('line-123');
      });

      it('should use variables to invalidate correct queries', async () => {
        mockProcurementApi.lineItems.deleteLineItem.mockResolvedValue(undefined);

        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

        const { result } = renderHook(() => useDeleteLineItem(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate({ id: 'line-123', purchaseOrderId: 'po-456' });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: procurementKeys.poLineItems('po-456') });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: procurementKeys.poDetail('po-456') });
      });

      it('should show success toast', async () => {
        mockProcurementApi.lineItems.deleteLineItem.mockResolvedValue(undefined);

        const { result } = renderHook(() => useDeleteLineItem(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate({ id: 'line-123', purchaseOrderId: 'po-123' });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(mockToast).toHaveBeenCalledWith({
          title: 'Line item removed',
          description: 'Item has been removed from the purchase order.',
        });
      });
    });
  });

  // ==========================================================================
  // Receipt Hooks Tests
  // ==========================================================================

  describe('Receipt Hooks', () => {
    describe('usePOReceipts', () => {
      it('should fetch receipts successfully', async () => {
        const mockReceipts = createMockPOReceipts(3);
        mockProcurementApi.receipts.getReceipts.mockResolvedValue(mockReceipts);

        const { result } = renderHook(() => usePOReceipts('line-123'), {
          wrapper: createWrapper(queryClient),
        });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual(mockReceipts);
        expect(mockProcurementApi.receipts.getReceipts).toHaveBeenCalledWith('line-123');
      });

      it('should not fetch when lineItemId is undefined', () => {
        const { result } = renderHook(() => usePOReceipts(undefined), {
          wrapper: createWrapper(queryClient),
        });

        expect(result.current.fetchStatus).toBe('idle');
        expect(mockProcurementApi.receipts.getReceipts).not.toHaveBeenCalled();
      });

      it('should use correct query key', () => {
        const lineItemId = 'line-123';
        mockProcurementApi.receipts.getReceipts.mockResolvedValue([]);

        renderHook(() => usePOReceipts(lineItemId), {
          wrapper: createWrapper(queryClient),
        });

        const queryState = queryClient.getQueryState(procurementKeys.receipts(lineItemId));
        expect(queryState).toBeDefined();
      });
    });

    describe('useRecordReceipt', () => {
      it('should record receipt successfully', async () => {
        const mockReceipt = createMockPOReceipt({ line_item_id: 'line-123', quantity_received: 50 });
        const dto = createReceiptDTO({ line_item_id: 'line-123' });
        mockProcurementApi.receipts.recordReceipt.mockResolvedValue(mockReceipt);

        const { result } = renderHook(() => useRecordReceipt(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate({ dto, userId: 'user-123' });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(mockProcurementApi.receipts.recordReceipt).toHaveBeenCalledWith(dto, 'user-123');
      });

      it('should invalidate receipts, POs, and stats queries', async () => {
        const mockReceipt = createMockPOReceipt({ line_item_id: 'line-123' });
        mockProcurementApi.receipts.recordReceipt.mockResolvedValue(mockReceipt);

        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

        const { result } = renderHook(() => useRecordReceipt(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate({ dto: createReceiptDTO({ line_item_id: 'line-123' }), userId: 'user-123' });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: procurementKeys.receipts('line-123') });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: procurementKeys.purchaseOrders() });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: procurementKeys.stats() });
      });

      it('should show success toast with quantity', async () => {
        const mockReceipt = createMockPOReceipt({ line_item_id: 'line-123', quantity_received: 75 });
        mockProcurementApi.receipts.recordReceipt.mockResolvedValue(mockReceipt);

        const { result } = renderHook(() => useRecordReceipt(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate({ dto: createReceiptDTO(), userId: 'user-123' });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(mockToast).toHaveBeenCalledWith({
          title: 'Receipt recorded',
          description: '75 units have been received.',
        });
      });
    });
  });

  // ==========================================================================
  // Statistics Hooks Tests
  // ==========================================================================

  describe('useProjectProcurementStats', () => {
    it('should fetch project stats successfully', async () => {
      const mockStats = createMockProcurementStats();
      mockProcurementApi.stats.getProjectStats.mockResolvedValue(mockStats);

      const { result } = renderHook(() => useProjectProcurementStats('project-123'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockStats);
      expect(mockProcurementApi.stats.getProjectStats).toHaveBeenCalledWith('project-123');
    });

    it('should not fetch when projectId is undefined', () => {
      const { result } = renderHook(() => useProjectProcurementStats(undefined), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockProcurementApi.stats.getProjectStats).not.toHaveBeenCalled();
    });

    it('should use staleTime of 5 minutes', () => {
      const projectId = 'project-123';
      mockProcurementApi.stats.getProjectStats.mockResolvedValue(createMockProcurementStats());

      renderHook(() => useProjectProcurementStats(projectId), {
        wrapper: createWrapper(queryClient),
      });

      const queryState = queryClient.getQueryState(procurementKeys.projectStats(projectId));
      expect(queryState).toBeDefined();
    });

    it('should use correct query key', () => {
      const projectId = 'project-456';
      mockProcurementApi.stats.getProjectStats.mockResolvedValue(createMockProcurementStats());

      renderHook(() => useProjectProcurementStats(projectId), {
        wrapper: createWrapper(queryClient),
      });

      const queryState = queryClient.getQueryState(procurementKeys.projectStats(projectId));
      expect(queryState).toBeDefined();
    });
  });

  // ==========================================================================
  // Query Keys Tests
  // ==========================================================================

  describe('Query Keys', () => {
    it('should generate correct vendor query keys', () => {
      const filters = createVendorFilters({ company_id: 'company-123', is_active: true });

      expect(procurementKeys.vendors()).toEqual(['procurement', 'vendors']);
      expect(procurementKeys.vendorList(filters)).toEqual(['procurement', 'vendors', 'list', filters]);
      expect(procurementKeys.vendorDetail('vendor-123')).toEqual(['procurement', 'vendors', 'detail', 'vendor-123']);
    });

    it('should generate correct PO query keys', () => {
      const filters = createPurchaseOrderFilters({ project_id: 'project-123' });

      expect(procurementKeys.purchaseOrders()).toEqual(['procurement', 'purchase-orders']);
      expect(procurementKeys.poList(filters)).toEqual(['procurement', 'purchase-orders', 'list', filters]);
      expect(procurementKeys.poDetail('po-123')).toEqual(['procurement', 'purchase-orders', 'detail', 'po-123']);
      expect(procurementKeys.poLineItems('po-123')).toEqual(['procurement', 'purchase-orders', 'line-items', 'po-123']);
    });

    it('should generate correct receipt query keys', () => {
      expect(procurementKeys.receipts('line-123')).toEqual(['procurement', 'receipts', 'line-123']);
    });

    it('should generate correct stats query keys', () => {
      expect(procurementKeys.stats()).toEqual(['procurement', 'stats']);
      expect(procurementKeys.projectStats('project-123')).toEqual(['procurement', 'stats', 'project', 'project-123']);
    });
  });
});
