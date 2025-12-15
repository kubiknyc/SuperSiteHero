import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SyncStatusBanner } from './SyncStatusBanner';
import userEvent from '@testing-library/user-event';

// Mock the useOnlineStatus hook
vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: vi.fn(() => ({
    isOnline: true,
    networkQuality: { type: 'online' },
    lastOnlineAt: Date.now(),
    lastOfflineAt: null,
  })),
}));

import { useOnlineStatus } from '@/hooks/useOnlineStatus';

describe('SyncStatusBanner', () => {
  const mockUseOnlineStatus = useOnlineStatus as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Offline Mode', () => {
    it('should show offline banner when offline', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: false,
        networkQuality: { type: 'offline' },
        lastOnlineAt: null,
        lastOfflineAt: Date.now(),
      });

      render(<SyncStatusBanner pendingSyncs={0} />);

      expect(screen.getByText("You're offline")).toBeInTheDocument();
      expect(screen.getByText(/changes will sync automatically/i)).toBeInTheDocument();
    });

    it('should show pending sync count when offline', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: false,
        networkQuality: { type: 'offline' },
        lastOnlineAt: null,
        lastOfflineAt: Date.now(),
      });

      render(<SyncStatusBanner pendingSyncs={5} />);

      expect(screen.getByText(/5 pending/i)).toBeInTheDocument();
    });

    it('should allow dismissing offline banner', async () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: false,
        networkQuality: { type: 'offline' },
        lastOnlineAt: null,
        lastOfflineAt: Date.now(),
      });

      const onDismiss = vi.fn();
      render(<SyncStatusBanner pendingSyncs={0} onDismiss={onDismiss} />);

      const dismissButton = screen.getByText('Dismiss');
      await userEvent.click(dismissButton);

      expect(onDismiss).toHaveBeenCalledOnce();
    });
  });

  describe('Slow Connection', () => {
    it('should show slow connection warning', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: true,
        networkQuality: { type: 'slow', effectiveType: '2g' },
        lastOnlineAt: Date.now(),
        lastOfflineAt: null,
      });

      render(<SyncStatusBanner />);

      expect(screen.getByText('Slow connection detected')).toBeInTheDocument();
      expect(screen.getByText(/syncing may take longer/i)).toBeInTheDocument();
    });
  });

  describe('Syncing in Progress', () => {
    it('should show syncing banner with item count', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: true,
        networkQuality: { type: 'online' },
        lastOnlineAt: Date.now(),
        lastOfflineAt: null,
      });

      render(<SyncStatusBanner pendingSyncs={3} isSyncing={true} />);

      expect(screen.getByText('Syncing 3 changes...')).toBeInTheDocument();
      expect(screen.getByText(/please don't close the app/i)).toBeInTheDocument();
    });

    it('should show singular form for single item', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: true,
        networkQuality: { type: 'online' },
        lastOnlineAt: Date.now(),
        lastOfflineAt: null,
      });

      render(<SyncStatusBanner pendingSyncs={1} isSyncing={true} />);

      expect(screen.getByText('Syncing 1 change...')).toBeInTheDocument();
    });
  });

  describe('Sync Error', () => {
    it('should show error banner with message', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: true,
        networkQuality: { type: 'online' },
        lastOnlineAt: Date.now(),
        lastOfflineAt: null,
      });

      render(<SyncStatusBanner syncError="Network timeout" />);

      expect(screen.getByText('Sync failed')).toBeInTheDocument();
      expect(screen.getByText('Network timeout')).toBeInTheDocument();
    });

    it('should show retry button when onRetrySync provided', async () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: true,
        networkQuality: { type: 'online' },
        lastOnlineAt: Date.now(),
        lastOfflineAt: null,
      });

      const onRetrySync = vi.fn();
      render(<SyncStatusBanner syncError="Error" onRetrySync={onRetrySync} />);

      const retryButton = screen.getByText('Retry');
      await userEvent.click(retryButton);

      expect(onRetrySync).toHaveBeenCalledOnce();
    });
  });

  describe('Sync Success', () => {
    it('should show success banner after sync completes', async () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: true,
        networkQuality: { type: 'online' },
        lastOnlineAt: Date.now(),
        lastOfflineAt: null,
      });

      const { rerender } = render(<SyncStatusBanner pendingSyncs={1} isSyncing={true} />);

      // Complete sync
      rerender(<SyncStatusBanner pendingSyncs={0} isSyncing={false} />);

      await waitFor(() => {
        expect(screen.getByText('All changes synced')).toBeInTheDocument();
      });
    });

    it('should auto-dismiss success banner after 5 seconds', async () => {
      vi.useFakeTimers();

      mockUseOnlineStatus.mockReturnValue({
        isOnline: true,
        networkQuality: { type: 'online' },
        lastOnlineAt: Date.now(),
        lastOfflineAt: null,
      });

      const { rerender } = render(<SyncStatusBanner pendingSyncs={1} isSyncing={true} />);

      // Complete sync
      rerender(<SyncStatusBanner pendingSyncs={0} isSyncing={false} />);

      // Fast-forward 5 seconds
      vi.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(screen.queryByText('All changes synced')).not.toBeInTheDocument();
      });

      vi.useRealTimers();
    });
  });

  describe('Visibility Rules', () => {
    it('should not render when everything is ok and dismissed', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: true,
        networkQuality: { type: 'online' },
        lastOnlineAt: Date.now(),
        lastOfflineAt: null,
      });

      const { container } = render(<SyncStatusBanner pendingSyncs={0} />);

      expect(container.firstChild).toBeNull();
    });

    it('should re-appear when going offline after being dismissed', async () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: true,
        networkQuality: { type: 'online' },
        lastOnlineAt: Date.now(),
        lastOfflineAt: null,
      });

      const { rerender } = render(<SyncStatusBanner />);

      // Go offline
      mockUseOnlineStatus.mockReturnValue({
        isOnline: false,
        networkQuality: { type: 'offline' },
        lastOnlineAt: null,
        lastOfflineAt: Date.now(),
      });

      rerender(<SyncStatusBanner />);

      expect(screen.getByText("You're offline")).toBeInTheDocument();
    });
  });
});
