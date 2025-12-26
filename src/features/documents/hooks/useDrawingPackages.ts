/**
 * Drawing Packages Hooks
 * React Query hooks for drawing package management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  drawingPackagesApi,
  getDrawingPackages,
  getDrawingPackage,
  createDrawingPackage,
  updateDrawingPackage,
  deleteDrawingPackage,
  approveDrawingPackage,
  createNewVersion,
  addItemToPackage,
  addMultipleItemsToPackage,
  updatePackageItem,
  removeItemFromPackage,
  reorderPackageItems,
  addRecipientToPackage,
  addMultipleRecipientsToPackage,
  updatePackageRecipient,
  removeRecipientFromPackage,
  distributePackage,
  generateShareableLink,
  getPackageActivity,
  recordRecipientAccess,
  recordRecipientDownload,
  recordRecipientAcknowledgment,
} from '@/lib/api/services/drawing-packages';
import type {
  DrawingPackage,
  DrawingPackageInsert,
  DrawingPackageUpdate,
  DrawingPackageItem,
  DrawingPackageItemInsert,
  DrawingPackageItemUpdate,
  DrawingPackageRecipient,
  DrawingPackageRecipientInsert,
  DrawingPackageRecipientUpdate,
  DrawingPackageActivity,
  DrawingPackageFilters,
  DrawingPackageType,
  DrawingPackageStatus,
} from '@/types/drawing';
import { logger } from '../../../lib/utils/logger';


// Query keys
const PACKAGE_KEYS = {
  all: ['drawing-packages'] as const,
  lists: () => [...PACKAGE_KEYS.all, 'list'] as const,
  list: (filters: DrawingPackageFilters) => [...PACKAGE_KEYS.lists(), filters] as const,
  details: () => [...PACKAGE_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...PACKAGE_KEYS.details(), id] as const,
  activity: (id: string) => [...PACKAGE_KEYS.all, 'activity', id] as const,
};

// ============================================================================
// PACKAGE QUERIES
// ============================================================================

/**
 * Fetch all drawing packages for a project
 */
export function useDrawingPackages(filters: DrawingPackageFilters) {
  return useQuery({
    queryKey: PACKAGE_KEYS.list(filters),
    queryFn: () => getDrawingPackages(filters),
    enabled: !!filters.projectId,
  });
}

/**
 * Fetch a single drawing package with items and recipients
 */
export function useDrawingPackage(packageId: string | undefined) {
  return useQuery({
    queryKey: PACKAGE_KEYS.detail(packageId || ''),
    queryFn: () => getDrawingPackage(packageId!),
    enabled: !!packageId,
  });
}

/**
 * Fetch package activity log
 */
export function usePackageActivity(packageId: string | undefined, limit: number = 50) {
  return useQuery({
    queryKey: PACKAGE_KEYS.activity(packageId || ''),
    queryFn: () => getPackageActivity(packageId!, limit),
    enabled: !!packageId,
  });
}

// ============================================================================
// PACKAGE MUTATIONS
// ============================================================================

/**
 * Create a new drawing package
 */
export function useCreateDrawingPackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DrawingPackageInsert) => createDrawingPackage(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PACKAGE_KEYS.lists() });
      toast.success('Drawing package created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create package: ${error.message}`);
    },
  });
}

/**
 * Update a drawing package
 */
export function useUpdateDrawingPackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: DrawingPackageUpdate }) =>
      updateDrawingPackage(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PACKAGE_KEYS.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: PACKAGE_KEYS.lists() });
      toast.success('Package updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update package: ${error.message}`);
    },
  });
}

/**
 * Delete a drawing package
 */
export function useDeleteDrawingPackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteDrawingPackage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PACKAGE_KEYS.lists() });
      toast.success('Package deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete package: ${error.message}`);
    },
  });
}

/**
 * Approve a drawing package
 */
export function useApproveDrawingPackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      approveDrawingPackage(id, notes),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PACKAGE_KEYS.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: PACKAGE_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: PACKAGE_KEYS.activity(data.id) });
      toast.success('Package approved successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve package: ${error.message}`);
    },
  });
}

/**
 * Create a new version of a package
 */
export function useCreatePackageVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => createNewVersion(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PACKAGE_KEYS.lists() });
      toast.success(`New version v${data.version} created`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create new version: ${error.message}`);
    },
  });
}

// ============================================================================
// PACKAGE ITEM MUTATIONS
// ============================================================================

/**
 * Add a drawing to a package
 */
export function useAddPackageItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (item: DrawingPackageItemInsert) => addItemToPackage(item),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PACKAGE_KEYS.detail(data.packageId) });
      toast.success('Drawing added to package');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add drawing: ${error.message}`);
    },
  });
}

/**
 * Add multiple drawings to a package
 */
export function useAddMultiplePackageItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ packageId, drawingIds }: { packageId: string; drawingIds: string[] }) =>
      addMultipleItemsToPackage(packageId, drawingIds),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: PACKAGE_KEYS.detail(variables.packageId) });
      toast.success(`${data.length} drawings added to package`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to add drawings: ${error.message}`);
    },
  });
}

/**
 * Update a package item
 */
export function useUpdatePackageItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      packageId,
      updates,
    }: {
      id: string;
      packageId: string;
      updates: DrawingPackageItemUpdate;
    }) => updatePackageItem(id, updates),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: PACKAGE_KEYS.detail(variables.packageId) });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update item: ${error.message}`);
    },
  });
}

/**
 * Remove a drawing from a package
 */
export function useRemovePackageItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, packageId }: { id: string; packageId: string }) =>
      removeItemFromPackage(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PACKAGE_KEYS.detail(variables.packageId) });
      toast.success('Drawing removed from package');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove drawing: ${error.message}`);
    },
  });
}

/**
 * Reorder package items
 */
export function useReorderPackageItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ packageId, itemIds }: { packageId: string; itemIds: string[] }) =>
      reorderPackageItems(packageId, itemIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PACKAGE_KEYS.detail(variables.packageId) });
    },
    onError: (error: Error) => {
      toast.error(`Failed to reorder items: ${error.message}`);
    },
  });
}

// ============================================================================
// RECIPIENT MUTATIONS
// ============================================================================

/**
 * Add a recipient to a package
 */
export function useAddPackageRecipient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recipient: DrawingPackageRecipientInsert) => addRecipientToPackage(recipient),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PACKAGE_KEYS.detail(data.packageId) });
      toast.success('Recipient added');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add recipient: ${error.message}`);
    },
  });
}

/**
 * Add multiple recipients to a package
 */
export function useAddMultiplePackageRecipients() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      packageId,
      recipients,
    }: {
      packageId: string;
      recipients: Omit<DrawingPackageRecipientInsert, 'packageId'>[];
    }) => addMultipleRecipientsToPackage(packageId, recipients),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: PACKAGE_KEYS.detail(variables.packageId) });
      toast.success(`${data.length} recipients added`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to add recipients: ${error.message}`);
    },
  });
}

/**
 * Update a package recipient
 */
export function useUpdatePackageRecipient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      packageId,
      updates,
    }: {
      id: string;
      packageId: string;
      updates: DrawingPackageRecipientUpdate;
    }) => updatePackageRecipient(id, updates),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: PACKAGE_KEYS.detail(variables.packageId) });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update recipient: ${error.message}`);
    },
  });
}

/**
 * Remove a recipient from a package
 */
export function useRemovePackageRecipient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, packageId }: { id: string; packageId: string }) =>
      removeRecipientFromPackage(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PACKAGE_KEYS.detail(variables.packageId) });
      toast.success('Recipient removed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove recipient: ${error.message}`);
    },
  });
}

// ============================================================================
// DISTRIBUTION MUTATIONS
// ============================================================================

/**
 * Distribute a package to recipients
 */
export function useDistributePackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ packageId, recipientIds }: { packageId: string; recipientIds?: string[] }) =>
      distributePackage(packageId, recipientIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PACKAGE_KEYS.detail(variables.packageId) });
      queryClient.invalidateQueries({ queryKey: PACKAGE_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: PACKAGE_KEYS.activity(variables.packageId) });
      toast.success('Package distributed successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to distribute package: ${error.message}`);
    },
  });
}

/**
 * Generate a shareable link for a package
 */
export function useGenerateShareableLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ packageId, expiresInDays }: { packageId: string; expiresInDays?: number }) =>
      generateShareableLink(packageId, expiresInDays),
    onSuccess: (link, variables) => {
      queryClient.invalidateQueries({ queryKey: PACKAGE_KEYS.detail(variables.packageId) });
      // Copy to clipboard
      navigator.clipboard.writeText(link).then(() => {
        toast.success('Shareable link copied to clipboard');
      });
      return link;
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate link: ${error.message}`);
    },
  });
}

// ============================================================================
// ACCESS TRACKING HOOKS (for recipient-facing pages)
// ============================================================================

/**
 * Record when a recipient accesses a package
 */
export function useRecordPackageAccess() {
  return useMutation({
    mutationFn: (accessToken: string) => recordRecipientAccess(accessToken),
    onError: (error: Error) => {
      logger.error('Failed to record access:', error);
    },
  });
}

/**
 * Record when a recipient downloads a package
 */
export function useRecordPackageDownload() {
  return useMutation({
    mutationFn: (accessToken: string) => recordRecipientDownload(accessToken),
    onSuccess: () => {
      toast.success('Download started');
    },
    onError: (error: Error) => {
      toast.error(`Download failed: ${error.message}`);
    },
  });
}

/**
 * Record when a recipient acknowledges a package
 */
export function useAcknowledgePackage() {
  return useMutation({
    mutationFn: ({
      accessToken,
      notes,
      ipAddress,
    }: {
      accessToken: string;
      notes?: string;
      ipAddress?: string;
    }) => recordRecipientAcknowledgment(accessToken, notes, ipAddress),
    onSuccess: () => {
      toast.success('Package acknowledged successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to acknowledge: ${error.message}`);
    },
  });
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Get package type label and color
 */
export function usePackageTypeInfo(packageType: DrawingPackageType) {
  const typeInfo: Record<
    DrawingPackageType,
    { label: string; description: string; color: string }
  > = {
    bid: { label: 'Bid Package', description: 'For contractors bidding on work', color: 'blue' },
    submittal: {
      label: 'Submittal Package',
      description: 'For review by engineers/architects',
      color: 'purple',
    },
    construction: {
      label: 'Construction Package',
      description: 'For field teams during construction',
      color: 'green',
    },
    as_built: { label: 'As-Built Package', description: 'For project closeout', color: 'orange' },
  };

  return typeInfo[packageType];
}

/**
 * Get package status label and color
 */
export function usePackageStatusInfo(status: DrawingPackageStatus) {
  const statusInfo: Record<DrawingPackageStatus, { label: string; color: string }> = {
    draft: { label: 'Draft', color: 'gray' },
    pending_review: { label: 'Pending Review', color: 'yellow' },
    approved: { label: 'Approved', color: 'blue' },
    distributed: { label: 'Distributed', color: 'green' },
    superseded: { label: 'Superseded', color: 'orange' },
    archived: { label: 'Archived', color: 'red' },
  };

  return statusInfo[status];
}
