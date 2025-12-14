/**
 * Drawing Packages Hooks Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useDrawingPackages,
  useDrawingPackage,
  useCreateDrawingPackage,
  useUpdateDrawingPackage,
  useDeleteDrawingPackage,
  useApproveDrawingPackage,
  useAddPackageItem,
  useAddMultiplePackageItems,
  useAddPackageRecipient,
  useDistributePackage,
  usePackageTypeInfo,
  usePackageStatusInfo,
} from './useDrawingPackages';
import type {
  DrawingPackage,
  DrawingPackageItem,
  DrawingPackageRecipient,
  DrawingPackageFilters,
} from '@/types/drawing';

// Mock the API service
vi.mock('@/lib/api/services/drawing-packages', () => ({
  getDrawingPackages: vi.fn(),
  getDrawingPackage: vi.fn(),
  createDrawingPackage: vi.fn(),
  updateDrawingPackage: vi.fn(),
  deleteDrawingPackage: vi.fn(),
  approveDrawingPackage: vi.fn(),
  createNewVersion: vi.fn(),
  addItemToPackage: vi.fn(),
  addMultipleItemsToPackage: vi.fn(),
  updatePackageItem: vi.fn(),
  removeItemFromPackage: vi.fn(),
  reorderPackageItems: vi.fn(),
  addRecipientToPackage: vi.fn(),
  addMultipleRecipientsToPackage: vi.fn(),
  updatePackageRecipient: vi.fn(),
  removeRecipientFromPackage: vi.fn(),
  distributePackage: vi.fn(),
  generateShareableLink: vi.fn(),
  getPackageActivity: vi.fn(),
  recordRecipientAccess: vi.fn(),
  recordRecipientDownload: vi.fn(),
  recordRecipientAcknowledgment: vi.fn(),
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Import mocked functions
import * as drawingPackagesApi from '@/lib/api/services/drawing-packages';
import { toast } from 'react-hot-toast';

// Test data
const mockPackage: DrawingPackage = {
  id: 'pkg-1',
  companyId: 'company-1',
  projectId: 'project-1',
  packageNumber: 'CON-0001',
  name: 'Construction Package Phase 1',
  description: 'All architectural and structural drawings for Phase 1',
  packageType: 'construction',
  version: 1,
  status: 'draft',
  includeCoverSheet: true,
  includeToc: true,
  includeRevisionHistory: true,
  requireAcknowledgment: false,
  allowDownload: true,
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
  createdBy: 'user-1',
};

const mockPackageItem: DrawingPackageItem = {
  id: 'item-1',
  packageId: 'pkg-1',
  drawingId: 'drawing-1',
  sortOrder: 0,
  isIncluded: true,
  addedAt: '2024-01-15T10:00:00Z',
};

const mockRecipient: DrawingPackageRecipient = {
  id: 'recipient-1',
  packageId: 'pkg-1',
  recipientEmail: 'contractor@example.com',
  recipientName: 'John Contractor',
  recipientCompany: 'ABC Construction',
  recipientRole: 'Contractor',
  distributionMethod: 'email',
  accessCount: 0,
  downloadCount: 0,
  sendReminder: true,
  createdAt: '2024-01-15T10:00:00Z',
};

// Helper to create wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useDrawingPackages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Query Hooks', () => {
    it('should fetch drawing packages for a project', async () => {
      const mockPackages = [mockPackage];
      vi.mocked(drawingPackagesApi.getDrawingPackages).mockResolvedValue(mockPackages);

      const filters: DrawingPackageFilters = { projectId: 'project-1' };
      const { result } = renderHook(() => useDrawingPackages(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPackages);
      expect(drawingPackagesApi.getDrawingPackages).toHaveBeenCalledWith(filters);
    });

    it('should fetch a single drawing package', async () => {
      vi.mocked(drawingPackagesApi.getDrawingPackage).mockResolvedValue(mockPackage);

      const { result } = renderHook(() => useDrawingPackage('pkg-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPackage);
      expect(drawingPackagesApi.getDrawingPackage).toHaveBeenCalledWith('pkg-1');
    });

    it('should not fetch when packageId is undefined', () => {
      const { result } = renderHook(() => useDrawingPackage(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('Mutation Hooks', () => {
    it('should create a drawing package', async () => {
      vi.mocked(drawingPackagesApi.createDrawingPackage).mockResolvedValue(mockPackage);

      const { result } = renderHook(() => useCreateDrawingPackage(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync({
        companyId: 'company-1',
        projectId: 'project-1',
        name: 'Test Package',
        packageType: 'construction',
      });

      expect(drawingPackagesApi.createDrawingPackage).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Drawing package created successfully');
    });

    it('should update a drawing package', async () => {
      vi.mocked(drawingPackagesApi.updateDrawingPackage).mockResolvedValue({
        ...mockPackage,
        name: 'Updated Package',
      });

      const { result } = renderHook(() => useUpdateDrawingPackage(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync({
        id: 'pkg-1',
        updates: { name: 'Updated Package' },
      });

      expect(drawingPackagesApi.updateDrawingPackage).toHaveBeenCalledWith('pkg-1', {
        name: 'Updated Package',
      });
      expect(toast.success).toHaveBeenCalledWith('Package updated successfully');
    });

    it('should delete a drawing package', async () => {
      vi.mocked(drawingPackagesApi.deleteDrawingPackage).mockResolvedValue();

      const { result } = renderHook(() => useDeleteDrawingPackage(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync('pkg-1');

      expect(drawingPackagesApi.deleteDrawingPackage).toHaveBeenCalledWith('pkg-1');
      expect(toast.success).toHaveBeenCalledWith('Package deleted successfully');
    });

    it('should approve a drawing package', async () => {
      vi.mocked(drawingPackagesApi.approveDrawingPackage).mockResolvedValue({
        ...mockPackage,
        status: 'approved',
        approvedBy: 'user-1',
        approvedAt: '2024-01-15T12:00:00Z',
      });

      const { result } = renderHook(() => useApproveDrawingPackage(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync({
        id: 'pkg-1',
        notes: 'Approved for distribution',
      });

      expect(drawingPackagesApi.approveDrawingPackage).toHaveBeenCalledWith(
        'pkg-1',
        'Approved for distribution'
      );
      expect(toast.success).toHaveBeenCalledWith('Package approved successfully');
    });

    it('should add an item to a package', async () => {
      vi.mocked(drawingPackagesApi.addItemToPackage).mockResolvedValue(mockPackageItem);

      const { result } = renderHook(() => useAddPackageItem(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync({
        packageId: 'pkg-1',
        drawingId: 'drawing-1',
      });

      expect(drawingPackagesApi.addItemToPackage).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Drawing added to package');
    });

    it('should add multiple items to a package', async () => {
      vi.mocked(drawingPackagesApi.addMultipleItemsToPackage).mockResolvedValue([
        mockPackageItem,
        { ...mockPackageItem, id: 'item-2', drawingId: 'drawing-2' },
      ]);

      const { result } = renderHook(() => useAddMultiplePackageItems(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync({
        packageId: 'pkg-1',
        drawingIds: ['drawing-1', 'drawing-2'],
      });

      expect(drawingPackagesApi.addMultipleItemsToPackage).toHaveBeenCalledWith('pkg-1', [
        'drawing-1',
        'drawing-2',
      ]);
      expect(toast.success).toHaveBeenCalledWith('2 drawings added to package');
    });

    it('should add a recipient to a package', async () => {
      vi.mocked(drawingPackagesApi.addRecipientToPackage).mockResolvedValue(mockRecipient);

      const { result } = renderHook(() => useAddPackageRecipient(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync({
        packageId: 'pkg-1',
        recipientEmail: 'contractor@example.com',
        recipientName: 'John Contractor',
      });

      expect(drawingPackagesApi.addRecipientToPackage).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Recipient added');
    });

    it('should distribute a package', async () => {
      vi.mocked(drawingPackagesApi.distributePackage).mockResolvedValue();

      const { result } = renderHook(() => useDistributePackage(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync({
        packageId: 'pkg-1',
        recipientIds: ['recipient-1'],
      });

      expect(drawingPackagesApi.distributePackage).toHaveBeenCalledWith('pkg-1', [
        'recipient-1',
      ]);
      expect(toast.success).toHaveBeenCalledWith('Package distributed successfully');
    });
  });

  describe('Error Handling', () => {
    it('should handle create package error', async () => {
      const error = new Error('Failed to create package');
      vi.mocked(drawingPackagesApi.createDrawingPackage).mockRejectedValue(error);

      const { result } = renderHook(() => useCreateDrawingPackage(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.mutateAsync({
          companyId: 'company-1',
          projectId: 'project-1',
          name: 'Test Package',
          packageType: 'construction',
        })
      ).rejects.toThrow('Failed to create package');

      expect(toast.error).toHaveBeenCalledWith(
        'Failed to create package: Failed to create package'
      );
    });

    it('should handle distribute package error', async () => {
      const error = new Error('Distribution failed');
      vi.mocked(drawingPackagesApi.distributePackage).mockRejectedValue(error);

      const { result } = renderHook(() => useDistributePackage(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.mutateAsync({ packageId: 'pkg-1' })
      ).rejects.toThrow('Distribution failed');

      expect(toast.error).toHaveBeenCalledWith(
        'Failed to distribute package: Distribution failed'
      );
    });
  });

  describe('Utility Hooks', () => {
    it('should return correct package type info', () => {
      const { result: bidResult } = renderHook(() => usePackageTypeInfo('bid'), {
        wrapper: createWrapper(),
      });
      expect(bidResult.current.label).toBe('Bid Package');
      expect(bidResult.current.color).toBe('blue');

      const { result: constructionResult } = renderHook(
        () => usePackageTypeInfo('construction'),
        { wrapper: createWrapper() }
      );
      expect(constructionResult.current.label).toBe('Construction Package');
      expect(constructionResult.current.color).toBe('green');

      const { result: submittalResult } = renderHook(
        () => usePackageTypeInfo('submittal'),
        { wrapper: createWrapper() }
      );
      expect(submittalResult.current.label).toBe('Submittal Package');
      expect(submittalResult.current.color).toBe('purple');

      const { result: asBuiltResult } = renderHook(
        () => usePackageTypeInfo('as_built'),
        { wrapper: createWrapper() }
      );
      expect(asBuiltResult.current.label).toBe('As-Built Package');
      expect(asBuiltResult.current.color).toBe('orange');
    });

    it('should return correct package status info', () => {
      const { result: draftResult } = renderHook(() => usePackageStatusInfo('draft'), {
        wrapper: createWrapper(),
      });
      expect(draftResult.current.label).toBe('Draft');
      expect(draftResult.current.color).toBe('gray');

      const { result: approvedResult } = renderHook(
        () => usePackageStatusInfo('approved'),
        { wrapper: createWrapper() }
      );
      expect(approvedResult.current.label).toBe('Approved');
      expect(approvedResult.current.color).toBe('blue');

      const { result: distributedResult } = renderHook(
        () => usePackageStatusInfo('distributed'),
        { wrapper: createWrapper() }
      );
      expect(distributedResult.current.label).toBe('Distributed');
      expect(distributedResult.current.color).toBe('green');
    });
  });
});
