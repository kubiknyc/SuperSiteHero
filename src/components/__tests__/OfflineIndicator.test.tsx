import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OfflineIndicator } from '../OfflineIndicator'
import { OfflineClient } from '@/lib/api/offline-client'

// Mock offline store
const mockOfflineStore = {
  isOnline: true,
  pendingSyncs: 0,
  isSyncing: false,
  lastSyncTime: Date.now(),
  conflictCount: 0,
  storageQuota: null,
  updatePendingSyncs: vi.fn(),
  updateConflictCount: vi.fn(),
}

vi.mock('@/stores/offline-store', () => ({
  useIsOnline: vi.fn(() => mockOfflineStore.isOnline),
  usePendingSyncs: vi.fn(() => mockOfflineStore.pendingSyncs),
  useIsSyncing: vi.fn(() => mockOfflineStore.isSyncing),
  useLastSyncTime: vi.fn(() => mockOfflineStore.lastSyncTime),
  useConflictCount: vi.fn(() => mockOfflineStore.conflictCount),
  useStorageQuota: vi.fn(() => mockOfflineStore.storageQuota),
  useOfflineStore: {
    getState: vi.fn(() => mockOfflineStore),
  },
}))

vi.mock('@/lib/api/offline-client', () => ({
  OfflineClient: {
    processSyncQueue: vi.fn(),
  },
}))

vi.mock('@/components/SyncStatusPanel', () => ({
  SyncStatusPanel: () => <div data-testid="sync-status-panel">Sync Status Panel</div>,
}))

describe('OfflineIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
    mockOfflineStore.isOnline = true
    mockOfflineStore.pendingSyncs = 0
    mockOfflineStore.isSyncing = false
    mockOfflineStore.lastSyncTime = Date.now()
    mockOfflineStore.conflictCount = 0
    mockOfflineStore.storageQuota = null
  })

  describe('Status Display', () => {
    it('shows offline status when not online', () => {
      mockOfflineStore.isOnline = false

      render(<OfflineIndicator />)

      const button = screen.getByTitle(/offline/i)
      expect(button).toBeInTheDocument()
    })

    it('shows syncing status when pending syncs exist', () => {
      mockOfflineStore.pendingSyncs = 3

      render(<OfflineIndicator />)

      const button = screen.getByTitle(/syncing/i)
      expect(button).toBeInTheDocument()
    })

    it('shows conflict status when conflicts exist', () => {
      mockOfflineStore.conflictCount = 2

      render(<OfflineIndicator />)

      const button = screen.getByTitle(/conflicts/i)
      expect(button).toBeInTheDocument()
    })

    it('shows online status when everything is synced', () => {
      render(<OfflineIndicator />)

      const button = screen.getByTitle(/online/i)
      expect(button).toBeInTheDocument()
    })
  })

  describe('Badges', () => {
    it('displays pending syncs count', () => {
      mockOfflineStore.pendingSyncs = 5

      render(<OfflineIndicator />)

      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('displays conflict count', () => {
      mockOfflineStore.conflictCount = 3

      render(<OfflineIndicator />)

      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('shows spinner when syncing', () => {
      mockOfflineStore.isSyncing = true

      const { container } = render(<OfflineIndicator />)

      const spinner = container.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('does not show badges when counts are zero', () => {
      render(<OfflineIndicator />)

      const badges = screen.queryAllByRole('status')
      expect(badges.length).toBe(0)
    })
  })

  describe('Status Dialog', () => {
    it('opens dialog when button is clicked', async () => {
      const user = userEvent.setup()

      render(<OfflineIndicator />)

      const button = screen.getByTitle(/online/i)
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })

    it('displays connection status in dialog', async () => {
      const user = userEvent.setup()

      render(<OfflineIndicator />)

      const button = screen.getByTitle(/online/i)
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText('Connected to server')).toBeInTheDocument()
      })
    })

    it('displays offline message in dialog when offline', async () => {
      const user = userEvent.setup()
      mockOfflineStore.isOnline = false

      render(<OfflineIndicator />)

      const button = screen.getByTitle(/offline/i)
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText('Working offline')).toBeInTheDocument()
      })
    })

    it('displays pending syncs count in dialog', async () => {
      const user = userEvent.setup()
      mockOfflineStore.pendingSyncs = 7

      render(<OfflineIndicator />)

      const button = screen.getByTitle(/syncing/i)
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText('Pending syncs')).toBeInTheDocument()
        expect(screen.getByText('7')).toBeInTheDocument()
      })
    })

    it('displays last sync time in dialog', async () => {
      const user = userEvent.setup()
      const oneHourAgo = Date.now() - 60 * 60 * 1000
      mockOfflineStore.lastSyncTime = oneHourAgo

      render(<OfflineIndicator />)

      const button = screen.getByTitle(/online/i)
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText('Last sync')).toBeInTheDocument()
        expect(screen.getByText('1h ago')).toBeInTheDocument()
      })
    })

    it('displays "Just now" for recent sync', async () => {
      const user = userEvent.setup()
      mockOfflineStore.lastSyncTime = Date.now() - 30 * 1000

      render(<OfflineIndicator />)

      const button = screen.getByTitle(/online/i)
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText('Just now')).toBeInTheDocument()
      })
    })

    it('displays "Never" when no sync has occurred', async () => {
      const user = userEvent.setup()
      mockOfflineStore.lastSyncTime = null

      render(<OfflineIndicator />)

      const button = screen.getByTitle(/online/i)
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText('Never')).toBeInTheDocument()
      })
    })

    it('displays conflicts count in dialog', async () => {
      const user = userEvent.setup()
      mockOfflineStore.conflictCount = 4

      render(<OfflineIndicator />)

      const button = screen.getByTitle(/conflicts/i)
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText('Conflicts')).toBeInTheDocument()
        const conflictBadge = screen.getAllByText('4')[0]
        expect(conflictBadge).toBeInTheDocument()
      })
    })

    it('shows syncing indicator in dialog', async () => {
      const user = userEvent.setup()
      mockOfflineStore.isSyncing = true

      render(<OfflineIndicator />)

      const button = screen.getByTitle(/syncing/i)
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText('Syncing changes...')).toBeInTheDocument()
      })
    })
  })

  describe('Manual Sync', () => {
    it('shows sync button when pending syncs exist and online', async () => {
      const user = userEvent.setup()
      mockOfflineStore.pendingSyncs = 3

      render(<OfflineIndicator />)

      const button = screen.getByTitle(/syncing/i)
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText('Sync Now')).toBeInTheDocument()
      })
    })

    it('does not show sync button when offline', async () => {
      const user = userEvent.setup()
      mockOfflineStore.isOnline = false
      mockOfflineStore.pendingSyncs = 3

      render(<OfflineIndicator />)

      const button = screen.getByTitle(/offline/i)
      await user.click(button)

      await waitFor(() => {
        expect(screen.queryByText('Sync Now')).not.toBeInTheDocument()
      })
    })

    it('does not show sync button when no pending syncs', async () => {
      const user = userEvent.setup()

      render(<OfflineIndicator />)

      const button = screen.getByTitle(/online/i)
      await user.click(button)

      await waitFor(() => {
        expect(screen.queryByText('Sync Now')).not.toBeInTheDocument()
      })
    })

    it('triggers sync when sync button is clicked', async () => {
      const user = userEvent.setup()
      mockOfflineStore.pendingSyncs = 3
      vi.mocked(OfflineClient.processSyncQueue).mockResolvedValue({ success: true } as any)

      render(<OfflineIndicator />)

      const button = screen.getByTitle(/syncing/i)
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText('Sync Now')).toBeInTheDocument()
      })

      const syncButton = screen.getByText('Sync Now')
      await user.click(syncButton)

      expect(OfflineClient.processSyncQueue).toHaveBeenCalledTimes(1)
    })

    it('shows syncing state during manual sync', async () => {
      const user = userEvent.setup()
      mockOfflineStore.pendingSyncs = 3

      let resolveSync: () => void
      const syncPromise = new Promise((resolve) => {
        resolveSync = resolve as () => void
      })
      vi.mocked(OfflineClient.processSyncQueue).mockReturnValue(syncPromise as any)

      render(<OfflineIndicator />)

      const button = screen.getByTitle(/syncing/i)
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText('Sync Now')).toBeInTheDocument()
      })

      const syncButton = screen.getByText('Sync Now')
      await user.click(syncButton)

      await waitFor(() => {
        expect(screen.getByText('Syncing...')).toBeInTheDocument()
      })

      resolveSync!()
    })

    it('disables sync button while syncing', async () => {
      const user = userEvent.setup()
      mockOfflineStore.pendingSyncs = 3
      mockOfflineStore.isSyncing = true

      render(<OfflineIndicator />)

      const button = screen.getByTitle(/syncing/i)
      await user.click(button)

      await waitFor(() => {
        const syncButton = screen.getByText('Syncing...')
        expect(syncButton).toBeDisabled()
      })
    })
  })

  describe('Storage Quota', () => {
    it('displays storage quota when available', async () => {
      const user = userEvent.setup()
      mockOfflineStore.storageQuota = {
        used: 50 * 1024 * 1024, // 50 MB
        total: 100 * 1024 * 1024, // 100 MB
        warning: false,
        critical: false,
      }

      render(<OfflineIndicator />)

      const button = screen.getByTitle(/online/i)
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText(/Storage used/)).toBeInTheDocument()
        expect(screen.getByText(/50 MB/)).toBeInTheDocument()
        expect(screen.getByText(/100 MB/)).toBeInTheDocument()
      })
    })

    it('shows warning when storage is low', async () => {
      const user = userEvent.setup()
      mockOfflineStore.storageQuota = {
        used: 92 * 1024 * 1024,
        total: 100 * 1024 * 1024,
        warning: true,
        critical: false,
      }

      render(<OfflineIndicator />)

      const button = screen.getByTitle(/online/i)
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText(/Storage running low/)).toBeInTheDocument()
      })
    })

    it('shows critical warning when storage is critically low', async () => {
      const user = userEvent.setup()
      mockOfflineStore.storageQuota = {
        used: 97 * 1024 * 1024,
        total: 100 * 1024 * 1024,
        warning: true,
        critical: true,
      }

      render(<OfflineIndicator />)

      const button = screen.getByTitle(/online/i)
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText(/Storage critically low/)).toBeInTheDocument()
      })
    })

    it('formats bytes correctly', async () => {
      const user = userEvent.setup()
      mockOfflineStore.storageQuota = {
        used: 1536, // 1.5 KB
        total: 2048, // 2 KB
        warning: false,
        critical: false,
      }

      render(<OfflineIndicator />)

      const button = screen.getByTitle(/online/i)
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText(/1.5 KB/)).toBeInTheDocument()
        expect(screen.getByText(/2 KB/)).toBeInTheDocument()
      })
    })
  })

  describe('Offline Mode Info', () => {
    it('shows offline info message when offline', async () => {
      const user = userEvent.setup()
      mockOfflineStore.isOnline = false

      render(<OfflineIndicator />)

      const button = screen.getByTitle(/offline/i)
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText(/You're working offline/)).toBeInTheDocument()
      })
    })

    it('does not show offline info when online', async () => {
      const user = userEvent.setup()

      render(<OfflineIndicator />)

      const button = screen.getByTitle(/online/i)
      await user.click(button)

      await waitFor(() => {
        expect(screen.queryByText(/You're working offline/)).not.toBeInTheDocument()
      })
    })
  })

  describe('Sync Details Button', () => {
    it('shows sync details button when pending syncs exist', () => {
      mockOfflineStore.pendingSyncs = 2

      render(<OfflineIndicator />)

      expect(screen.getByTitle('View detailed sync status')).toBeInTheDocument()
    })

    it('shows sync details button when conflicts exist', () => {
      mockOfflineStore.conflictCount = 1

      render(<OfflineIndicator />)

      expect(screen.getByTitle('View detailed sync status')).toBeInTheDocument()
    })

    it('does not show sync details button when no issues', () => {
      render(<OfflineIndicator />)

      expect(screen.queryByTitle('View detailed sync status')).not.toBeInTheDocument()
    })

    it('opens sync status panel when clicked', async () => {
      const user = userEvent.setup()
      mockOfflineStore.pendingSyncs = 2

      render(<OfflineIndicator />)

      const button = screen.getByTitle('View detailed sync status')
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByTestId('sync-status-panel')).toBeInTheDocument()
      })
    })
  })

  describe('Periodic Updates', () => {
    it('updates pending syncs periodically when online', () => {
      vi.useFakeTimers()

      render(<OfflineIndicator />)

      expect(mockOfflineStore.updatePendingSyncs).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(10000)

      expect(mockOfflineStore.updatePendingSyncs).toHaveBeenCalledTimes(2)

      vi.useRealTimers()
    })

    it('updates conflict count periodically when online', () => {
      vi.useFakeTimers()

      render(<OfflineIndicator />)

      expect(mockOfflineStore.updateConflictCount).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(10000)

      expect(mockOfflineStore.updateConflictCount).toHaveBeenCalledTimes(2)

      vi.useRealTimers()
    })

    it('does not update when offline', () => {
      vi.useFakeTimers()
      mockOfflineStore.isOnline = false

      render(<OfflineIndicator />)

      // Initial call should not happen when offline
      expect(mockOfflineStore.updatePendingSyncs).not.toHaveBeenCalled()

      vi.advanceTimersByTime(10000)

      expect(mockOfflineStore.updatePendingSyncs).not.toHaveBeenCalled()

      vi.useRealTimers()
    })
  })

  describe('Error Handling', () => {
    it('handles sync errors gracefully', async () => {
      const user = userEvent.setup()
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockOfflineStore.pendingSyncs = 3
      vi.mocked(OfflineClient.processSyncQueue).mockRejectedValue(new Error('Sync failed'))

      render(<OfflineIndicator />)

      const button = screen.getByTitle(/syncing/i)
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText('Sync Now')).toBeInTheDocument()
      })

      const syncButton = screen.getByText('Sync Now')
      await user.click(syncButton)

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          '[OfflineIndicator] Sync failed:',
          expect.any(Error)
        )
      })

      consoleError.mockRestore()
    })
  })

  describe('Accessibility', () => {
    it('has accessible button with title', () => {
      render(<OfflineIndicator />)

      const button = screen.getByTitle(/online.*click for details/i)
      expect(button).toBeInTheDocument()
    })

    it('dialog has proper accessibility attributes', async () => {
      const user = userEvent.setup()

      render(<OfflineIndicator />)

      const button = screen.getByTitle(/online/i)
      await user.click(button)

      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        expect(dialog).toBeInTheDocument()
      })
    })

    it('sync details button has descriptive title', () => {
      mockOfflineStore.pendingSyncs = 2

      render(<OfflineIndicator />)

      const button = screen.getByTitle('View detailed sync status')
      expect(button).toBeInTheDocument()
    })
  })
})
