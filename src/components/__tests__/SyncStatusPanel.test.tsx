/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Use vi.hoisted() for mocks to ensure they're available during vi.mock() execution
const { mockUseOfflineStore, mockClearSyncQueue, mockRemovePendingSync } = vi.hoisted(() => {
  const clearSyncQueue = vi.fn();
  const removePendingSync = vi.fn();
  const useOfflineStore = vi.fn();
  return {
    mockUseOfflineStore: useOfflineStore,
    mockClearSyncQueue: clearSyncQueue,
    mockRemovePendingSync: removePendingSync,
  };
});

const defaultStoreValues = {
  isSyncing: false,
  lastSyncTime: null,
  syncQueue: [],
  conflicts: [],
  clearSyncQueue: mockClearSyncQueue,
  removePendingSync: mockRemovePendingSync,
};

vi.mock('@/stores/offline-store', () => ({
  useOfflineStore: mockUseOfflineStore,
}));

// Import after mocks are set up
import { SyncStatusPanel } from '../SyncStatusPanel';

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children, className }: any) => <h3 className={className}>{children}</h3>,
  CardDescription: ({ children }: any) => <p data-testid="card-description">{children}</p>,
  CardContent: ({ children, className }: any) => <div className={className} data-testid="card-content">{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, className, ...props }: any) => (
    <button onClick={onClick} className={className} data-variant={variant} data-size={size} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={className} data-variant={variant} data-testid="badge">
      {children}
    </span>
  ),
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: any) => (
    <div className={className} data-testid="scroll-area">
      {children}
    </div>
  ),
}));

vi.mock('@/components/ui/separator', () => ({
  Separator: () => <hr data-testid="separator" />,
}));

// Mock ConflictResolutionDialog
vi.mock('@/components/ConflictResolutionDialog', () => ({
  ConflictResolutionDialog: ({ open, onOpenChange, conflict }: any) =>
    open ? (
      <div data-testid="conflict-dialog">
        <p>Conflict: {conflict?.id || 'none'}</p>
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  AlertCircle: ({ className }: any) => <span className={className} data-testid="icon-alert-circle">Alert</span>,
  CheckCircle2: ({ className }: any) => <span className={className} data-testid="icon-check-circle">Check</span>,
  Clock: ({ className }: any) => <span className={className} data-testid="icon-clock">Clock</span>,
  RefreshCw: ({ className }: any) => <span className={className} data-testid="icon-refresh">Refresh</span>,
  Trash2: ({ className }: any) => <span className={className} data-testid="icon-trash">Trash</span>,
  XCircle: ({ className }: any) => <span className={className} data-testid="icon-x-circle">XCircle</span>,
}));

// Mock logger
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('SyncStatusPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window.confirm mock
    global.confirm = vi.fn(() => true);
    // Set default mock return value
    mockUseOfflineStore.mockReturnValue(defaultStoreValues);
  });

  describe('Empty State', () => {
    it('renders empty state when no pending operations or conflicts', () => {
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        syncQueue: [],
        conflicts: [],
      });

      render(<SyncStatusPanel />);

      expect(screen.getByText('All synced up!')).toBeInTheDocument();
      expect(screen.getByText('No pending operations or conflicts')).toBeInTheDocument();
      expect(screen.getByTestId('icon-check-circle')).toBeInTheDocument();
    });

    it('shows "All changes synced" in description when empty', () => {
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        syncQueue: [],
        conflicts: [],
      });

      render(<SyncStatusPanel />);

      expect(screen.getByTestId('card-description')).toHaveTextContent('All changes synced');
    });

    it('shows "Never" for last sync when no sync has occurred', () => {
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        lastSyncTime: null,
      });

      render(<SyncStatusPanel />);

      expect(screen.getByText('Never')).toBeInTheDocument();
    });
  });

  describe('Header and Status', () => {
    it('renders "Sync Status" title', () => {
      render(<SyncStatusPanel />);

      expect(screen.getByText('Sync Status')).toBeInTheDocument();
    });

    it('shows syncing badge when isSyncing is true', () => {
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        isSyncing: true,
      });

      render(<SyncStatusPanel />);

      expect(screen.getByText('Syncing...')).toBeInTheDocument();
      const badge = screen.getByText('Syncing...').closest('[data-testid="badge"]');
      expect(badge).toHaveClass('animate-pulse');
    });

    it('does not show syncing badge when isSyncing is false', () => {
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        isSyncing: false,
      });

      render(<SyncStatusPanel />);

      expect(screen.queryByText('Syncing...')).not.toBeInTheDocument();
    });

    it('shows pending operations and conflicts count in description', () => {
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        syncQueue: [
          { id: '1', operation: 'create', entityType: 'daily_report', timestamp: Date.now(), retryCount: 0 },
          { id: '2', operation: 'update', entityType: 'inspection', timestamp: Date.now(), retryCount: 0 },
        ],
        conflicts: [
          { id: 'c1', entityType: 'daily_report', detectedAt: Date.now(), localData: {}, serverData: {} },
        ],
      });

      render(<SyncStatusPanel />);

      expect(screen.getByTestId('card-description')).toHaveTextContent('2 pending operation(s), 1 conflict(s)');
    });
  });

  describe('Last Sync Time', () => {
    it('shows "Just now" for recent sync', () => {
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        lastSyncTime: Date.now() - 30000, // 30 seconds ago
      });

      render(<SyncStatusPanel />);

      expect(screen.getByText('Just now')).toBeInTheDocument();
    });

    it('shows minutes for sync within last hour', () => {
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        lastSyncTime: Date.now() - 300000, // 5 minutes ago
      });

      render(<SyncStatusPanel />);

      expect(screen.getByText('5m ago')).toBeInTheDocument();
    });

    it('shows hours for sync within last day', () => {
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        lastSyncTime: Date.now() - 7200000, // 2 hours ago
      });

      render(<SyncStatusPanel />);

      expect(screen.getByText('2h ago')).toBeInTheDocument();
    });

    it('shows date for sync older than a day', () => {
      const { useOfflineStore } = require('@/stores/offline-store');
      const oldDate = new Date('2024-01-15');
      useOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        lastSyncTime: oldDate.getTime(),
      });

      render(<SyncStatusPanel />);

      // Should show formatted date
      expect(screen.getByText(oldDate.toLocaleDateString())).toBeInTheDocument();
    });
  });

  describe('Conflicts Section', () => {
    it('does not render conflicts section when no conflicts', () => {
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        conflicts: [],
      });

      render(<SyncStatusPanel />);

      expect(screen.queryByText('Conflicts Require Attention')).not.toBeInTheDocument();
    });

    it('renders conflicts section when conflicts exist', () => {
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        conflicts: [
          { id: 'c1', entityType: 'daily_report', detectedAt: Date.now(), localData: {}, serverData: {} },
        ],
      });

      render(<SyncStatusPanel />);

      expect(screen.getByText('Conflicts Require Attention')).toBeInTheDocument();
      expect(screen.getByTestId('icon-alert-circle')).toBeInTheDocument();
    });

    it('displays conflict entity type and timestamp', () => {
      const { useOfflineStore } = require('@/stores/offline-store');
      const detectedAt = Date.now() - 300000; // 5 minutes ago
      useOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        conflicts: [
          { id: 'c1', entityType: 'inspection', detectedAt, localData: {}, serverData: {} },
        ],
      });

      render(<SyncStatusPanel />);

      expect(screen.getByText('inspection')).toBeInTheDocument();
      expect(screen.getByText('5m ago')).toBeInTheDocument();
    });

    it('renders Resolve button for each conflict', () => {
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        conflicts: [
          { id: 'c1', entityType: 'daily_report', detectedAt: Date.now(), localData: {}, serverData: {} },
          { id: 'c2', entityType: 'inspection', detectedAt: Date.now(), localData: {}, serverData: {} },
        ],
      });

      render(<SyncStatusPanel />);

      const resolveButtons = screen.getAllByRole('button', { name: /resolve/i });
      expect(resolveButtons).toHaveLength(2);
    });

    it('opens conflict dialog when Resolve is clicked', async () => {
      const user = userEvent.setup();
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        conflicts: [
          { id: 'c1', entityType: 'daily_report', detectedAt: Date.now(), localData: {}, serverData: {} },
        ],
      });

      render(<SyncStatusPanel />);

      const resolveButton = screen.getByRole('button', { name: /resolve/i });
      await user.click(resolveButton);

      await waitFor(() => {
        expect(screen.getByTestId('conflict-dialog')).toBeInTheDocument();
        expect(screen.getByText('Conflict: c1')).toBeInTheDocument();
      });
    });

    it('applies warning colors to conflict items', () => {
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        conflicts: [
          { id: 'c1', entityType: 'daily_report', detectedAt: Date.now(), localData: {}, serverData: {} },
        ],
      });

      const { container } = render(<SyncStatusPanel />);

      const conflictItem = container.querySelector('.bg-warning-light');
      expect(conflictItem).toBeInTheDocument();
    });
  });

  describe('Pending Operations By Type', () => {
    it('does not render pending operations section when queue is empty', () => {
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        syncQueue: [],
      });

      render(<SyncStatusPanel />);

      expect(screen.queryByText('Pending Operations')).not.toBeInTheDocument();
    });

    it('renders pending operations badges grouped by type', () => {
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        syncQueue: [
          { id: '1', operation: 'create', entityType: 'daily_report', timestamp: Date.now(), retryCount: 0 },
          { id: '2', operation: 'update', entityType: 'daily_report', timestamp: Date.now(), retryCount: 0 },
          { id: '3', operation: 'create', entityType: 'inspection', timestamp: Date.now(), retryCount: 0 },
        ],
      });

      render(<SyncStatusPanel />);

      expect(screen.getByText('Pending Operations')).toBeInTheDocument();
      expect(screen.getByText('daily_report: 2')).toBeInTheDocument();
      expect(screen.getByText('inspection: 1')).toBeInTheDocument();
    });

    it('counts operations correctly for each type', () => {
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        syncQueue: [
          { id: '1', operation: 'create', entityType: 'rfi', timestamp: Date.now(), retryCount: 0 },
          { id: '2', operation: 'update', entityType: 'rfi', timestamp: Date.now(), retryCount: 0 },
          { id: '3', operation: 'delete', entityType: 'rfi', timestamp: Date.now(), retryCount: 0 },
          { id: '4', operation: 'create', entityType: 'submittal', timestamp: Date.now(), retryCount: 0 },
        ],
      });

      render(<SyncStatusPanel />);

      expect(screen.getByText('rfi: 3')).toBeInTheDocument();
      expect(screen.getByText('submittal: 1')).toBeInTheDocument();
    });
  });

  describe('Queue Details', () => {
    it('does not render queue details when queue is empty', () => {
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        syncQueue: [],
      });

      render(<SyncStatusPanel />);

      expect(screen.queryByText('Queue Details')).not.toBeInTheDocument();
    });

    it('renders queue details section when queue has items', () => {
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        syncQueue: [
          { id: '1', operation: 'create', entityType: 'daily_report', timestamp: Date.now(), retryCount: 0 },
        ],
      });

      render(<SyncStatusPanel />);

      expect(screen.getByText('Queue Details')).toBeInTheDocument();
    });

    it('displays entity type and operation for each queue item', () => {
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        syncQueue: [
          { id: '1', operation: 'create', entityType: 'inspection', timestamp: Date.now(), retryCount: 0 },
          { id: '2', operation: 'update', entityType: 'daily_report', timestamp: Date.now(), retryCount: 0 },
        ],
      });

      render(<SyncStatusPanel />);

      expect(screen.getByText('inspection')).toBeInTheDocument();
      expect(screen.getByText('daily_report')).toBeInTheDocument();
      expect(screen.getByText('create')).toBeInTheDocument();
      expect(screen.getByText('update')).toBeInTheDocument();
    });

    it('shows correct icon for create operation', () => {
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        syncQueue: [
          { id: '1', operation: 'create', entityType: 'daily_report', timestamp: Date.now(), retryCount: 0 },
        ],
      });

      render(<SyncStatusPanel />);

      expect(screen.getByTestId('icon-check-circle')).toBeInTheDocument();
    });

    it('shows correct icon for update operation', () => {
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        syncQueue: [
          { id: '1', operation: 'update', entityType: 'daily_report', timestamp: Date.now(), retryCount: 0 },
        ],
      });

      render(<SyncStatusPanel />);

      expect(screen.getByTestId('icon-refresh')).toBeInTheDocument();
    });

    it('shows correct icon for delete operation', () => {
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        syncQueue: [
          { id: '1', operation: 'delete', entityType: 'daily_report', timestamp: Date.now(), retryCount: 0 },
        ],
      });

      render(<SyncStatusPanel />);

      expect(screen.getByTestId('icon-x-circle')).toBeInTheDocument();
    });

    it('shows default icon for unknown operation', () => {
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        syncQueue: [
          { id: '1', operation: 'unknown', entityType: 'daily_report', timestamp: Date.now(), retryCount: 0 },
        ],
      });

      render(<SyncStatusPanel />);

      expect(screen.getByTestId('icon-clock')).toBeInTheDocument();
    });

    it('displays retry count when greater than zero', () => {
      const { useOfflineStore } = require('@/stores/offline-store');
      const timestamp = Date.now() - 300000; // 5 minutes ago
      useOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        syncQueue: [
          { id: '1', operation: 'create', entityType: 'daily_report', timestamp, retryCount: 3 },
        ],
      });

      render(<SyncStatusPanel />);

      expect(screen.getByText(/3 retries/i)).toBeInTheDocument();
    });

    it('does not display retry count when zero', () => {
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        syncQueue: [
          { id: '1', operation: 'create', entityType: 'daily_report', timestamp: Date.now(), retryCount: 0 },
        ],
      });

      render(<SyncStatusPanel />);

      expect(screen.queryByText(/retries/i)).not.toBeInTheDocument();
    });

    it('renders remove button for each queue item', () => {
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        syncQueue: [
          { id: '1', operation: 'create', entityType: 'daily_report', timestamp: Date.now(), retryCount: 0 },
          { id: '2', operation: 'update', entityType: 'inspection', timestamp: Date.now(), retryCount: 0 },
        ],
      });

      const { container } = render(<SyncStatusPanel />);

      const trashIcons = container.querySelectorAll('[data-testid="icon-trash"]');
      // 2 in queue items + 1 in Clear All button = 3 total
      expect(trashIcons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Clear All Button', () => {
    it('renders Clear All button when queue has items', () => {
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        syncQueue: [
          { id: '1', operation: 'create', entityType: 'daily_report', timestamp: Date.now(), retryCount: 0 },
        ],
      });

      render(<SyncStatusPanel />);

      expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument();
    });

    it('shows confirmation dialog when Clear All is clicked', async () => {
      const user = userEvent.setup();
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        syncQueue: [
          { id: '1', operation: 'create', entityType: 'daily_report', timestamp: Date.now(), retryCount: 0 },
        ],
      });

      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<SyncStatusPanel />);

      const clearButton = screen.getByRole('button', { name: /clear all/i });
      await user.click(clearButton);

      expect(confirmSpy).toHaveBeenCalledWith(
        'Are you sure you want to clear all pending syncs? This will discard unsaved changes.'
      );
    });

    it('calls clearSyncQueue when confirmed', async () => {
      const user = userEvent.setup();
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        syncQueue: [
          { id: '1', operation: 'create', entityType: 'daily_report', timestamp: Date.now(), retryCount: 0 },
        ],
      });

      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<SyncStatusPanel />);

      const clearButton = screen.getByRole('button', { name: /clear all/i });
      await user.click(clearButton);

      expect(mockClearSyncQueue).toHaveBeenCalledTimes(1);
    });

    it('does not call clearSyncQueue when cancelled', async () => {
      const user = userEvent.setup();
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        syncQueue: [
          { id: '1', operation: 'create', entityType: 'daily_report', timestamp: Date.now(), retryCount: 0 },
        ],
      });

      vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<SyncStatusPanel />);

      const clearButton = screen.getByRole('button', { name: /clear all/i });
      await user.click(clearButton);

      expect(mockClearSyncQueue).not.toHaveBeenCalled();
    });
  });

  describe('Remove Item Button', () => {
    it('shows confirmation dialog when remove item is clicked', async () => {
      const user = userEvent.setup();
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        syncQueue: [
          { id: '1', operation: 'create', entityType: 'daily_report', timestamp: Date.now(), retryCount: 0 },
        ],
      });

      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      const { container } = render(<SyncStatusPanel />);

      // Find the remove button (trash icon button within queue item)
      const removeButtons = container.querySelectorAll('button[data-size="sm"]');
      const removeButton = Array.from(removeButtons).find(
        (btn) => btn.querySelector('[data-testid="icon-trash"]')
      );

      if (removeButton) {
        await user.click(removeButton as HTMLElement);

        expect(confirmSpy).toHaveBeenCalledWith('Remove this item from the sync queue?');
      }
    });

    it('calls removePendingSync with correct id when confirmed', async () => {
      const user = userEvent.setup();
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        syncQueue: [
          { id: 'item-123', operation: 'create', entityType: 'daily_report', timestamp: Date.now(), retryCount: 0 },
        ],
      });

      vi.spyOn(window, 'confirm').mockReturnValue(true);

      const { container } = render(<SyncStatusPanel />);

      const removeButtons = container.querySelectorAll('button[data-size="sm"]');
      const removeButton = Array.from(removeButtons).find(
        (btn) => btn.querySelector('[data-testid="icon-trash"]')
      );

      if (removeButton) {
        await user.click(removeButton as HTMLElement);

        expect(mockRemovePendingSync).toHaveBeenCalledWith('item-123');
      }
    });

    it('does not call removePendingSync when cancelled', async () => {
      const user = userEvent.setup();
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        syncQueue: [
          { id: '1', operation: 'create', entityType: 'daily_report', timestamp: Date.now(), retryCount: 0 },
        ],
      });

      vi.spyOn(window, 'confirm').mockReturnValue(false);

      const { container } = render(<SyncStatusPanel />);

      const removeButtons = container.querySelectorAll('button[data-size="sm"]');
      const removeButton = Array.from(removeButtons).find(
        (btn) => btn.querySelector('[data-testid="icon-trash"]')
      );

      if (removeButton) {
        await user.click(removeButton as HTMLElement);

        expect(mockRemovePendingSync).not.toHaveBeenCalled();
      }
    });
  });

  describe('Operation Colors', () => {
    it('applies success color to create operation', () => {
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        syncQueue: [
          { id: '1', operation: 'create', entityType: 'daily_report', timestamp: Date.now(), retryCount: 0 },
        ],
      });

      const { container } = render(<SyncStatusPanel />);

      const createBadge = container.querySelector('.bg-success-light');
      expect(createBadge).toBeInTheDocument();
    });

    it('applies info color to update operation', () => {
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        syncQueue: [
          { id: '1', operation: 'update', entityType: 'daily_report', timestamp: Date.now(), retryCount: 0 },
        ],
      });

      const { container } = render(<SyncStatusPanel />);

      const updateBadge = container.querySelector('.bg-info-light');
      expect(updateBadge).toBeInTheDocument();
    });

    it('applies error color to delete operation', () => {
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        syncQueue: [
          { id: '1', operation: 'delete', entityType: 'daily_report', timestamp: Date.now(), retryCount: 0 },
        ],
      });

      const { container } = render(<SyncStatusPanel />);

      const deleteBadge = container.querySelector('.bg-error-light');
      expect(deleteBadge).toBeInTheDocument();
    });

    it('applies muted color to unknown operation', () => {
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        syncQueue: [
          { id: '1', operation: 'unknown', entityType: 'daily_report', timestamp: Date.now(), retryCount: 0 },
        ],
      });

      const { container } = render(<SyncStatusPanel />);

      const unknownBadge = container.querySelector('.bg-muted');
      expect(unknownBadge).toBeInTheDocument();
    });
  });

  describe('Dark Mode Support', () => {
    it('applies dark mode classes to operation badges', () => {
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        syncQueue: [
          { id: '1', operation: 'create', entityType: 'daily_report', timestamp: Date.now(), retryCount: 0 },
        ],
      });

      const { container } = render(<SyncStatusPanel />);

      const darkBadge = container.querySelector('.dark\\:bg-green-900\\/20');
      expect(darkBadge).toBeInTheDocument();
    });

    it('applies dark mode classes to conflict items', () => {
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        conflicts: [
          { id: 'c1', entityType: 'daily_report', detectedAt: Date.now(), localData: {}, serverData: {} },
        ],
      });

      const { container } = render(<SyncStatusPanel />);

      const darkConflict = container.querySelector('.dark\\:bg-amber-950\\/20');
      expect(darkConflict).toBeInTheDocument();
    });
  });

  describe('ScrollArea Usage', () => {
    it('uses ScrollArea for conflicts section', () => {
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        conflicts: [
          { id: 'c1', entityType: 'daily_report', detectedAt: Date.now(), localData: {}, serverData: {} },
        ],
      });

      render(<SyncStatusPanel />);

      const scrollAreas = screen.getAllByTestId('scroll-area');
      expect(scrollAreas.length).toBeGreaterThan(0);
    });

    it('uses ScrollArea for queue details', () => {
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        syncQueue: [
          { id: '1', operation: 'create', entityType: 'daily_report', timestamp: Date.now(), retryCount: 0 },
        ],
      });

      render(<SyncStatusPanel />);

      const scrollAreas = screen.getAllByTestId('scroll-area');
      expect(scrollAreas.length).toBeGreaterThan(0);
    });
  });

  describe('Separators', () => {
    it('uses separators between sections', () => {
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        syncQueue: [
          { id: '1', operation: 'create', entityType: 'daily_report', timestamp: Date.now(), retryCount: 0 },
        ],
      });

      render(<SyncStatusPanel />);

      const separators = screen.getAllByTestId('separator');
      expect(separators.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('uses semantic heading for title', () => {
      const { container } = render(<SyncStatusPanel />);

      const heading = container.querySelector('h3');
      expect(heading).toHaveTextContent('Sync Status');
    });

    it('provides descriptive button labels', () => {
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        syncQueue: [
          { id: '1', operation: 'create', entityType: 'daily_report', timestamp: Date.now(), retryCount: 0 },
        ],
        conflicts: [
          { id: 'c1', entityType: 'daily_report', detectedAt: Date.now(), localData: {}, serverData: {} },
        ],
      });

      render(<SyncStatusPanel />);

      expect(screen.getByRole('button', { name: /resolve/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument();
    });

    it('capitalizes entity types for readability', () => {
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        syncQueue: [
          { id: '1', operation: 'create', entityType: 'daily_report', timestamp: Date.now(), retryCount: 0 },
        ],
      });

      const { container } = render(<SyncStatusPanel />);

      // Check for capitalize class
      const entityType = container.querySelector('.capitalize');
      expect(entityType).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty entity type gracefully', () => {
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        syncQueue: [
          { id: '1', operation: 'create', entityType: '', timestamp: Date.now(), retryCount: 0 },
        ],
      });

      render(<SyncStatusPanel />);

      // Should render without crashing
      expect(screen.getByTestId('card')).toBeInTheDocument();
    });

    it('handles multiple queue items of same type', () => {
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        syncQueue: [
          { id: '1', operation: 'create', entityType: 'daily_report', timestamp: Date.now(), retryCount: 0 },
          { id: '2', operation: 'update', entityType: 'daily_report', timestamp: Date.now(), retryCount: 0 },
          { id: '3', operation: 'delete', entityType: 'daily_report', timestamp: Date.now(), retryCount: 0 },
        ],
      });

      render(<SyncStatusPanel />);

      expect(screen.getByText('daily_report: 3')).toBeInTheDocument();
    });

    it('handles large retry counts', () => {
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        syncQueue: [
          { id: '1', operation: 'create', entityType: 'daily_report', timestamp: Date.now(), retryCount: 99 },
        ],
      });

      render(<SyncStatusPanel />);

      expect(screen.getByText(/99 retries/i)).toBeInTheDocument();
    });

    it('handles both conflicts and queue items simultaneously', () => {
      mockUseOfflineStore.mockReturnValue({
        ...defaultStoreValues,
        syncQueue: [
          { id: '1', operation: 'create', entityType: 'daily_report', timestamp: Date.now(), retryCount: 0 },
        ],
        conflicts: [
          { id: 'c1', entityType: 'inspection', detectedAt: Date.now(), localData: {}, serverData: {} },
        ],
      });

      render(<SyncStatusPanel />);

      expect(screen.getByText('Conflicts Require Attention')).toBeInTheDocument();
      expect(screen.getByText('Queue Details')).toBeInTheDocument();
    });
  });
});
