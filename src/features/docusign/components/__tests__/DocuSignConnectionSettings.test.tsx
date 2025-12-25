/**
 * DocuSignConnectionSettings Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DocuSignConnectionSettings } from '../DocuSignConnectionSettings'
import type { DSConnectionStatus } from '@/types/docusign'

// Mock the hooks
vi.mock('../../hooks/useDocuSign', () => ({
  useDocuSignConnectionStatus: vi.fn(),
  useInitiateDocuSignConnection: vi.fn(),
  useDisconnectDocuSign: vi.fn(),
  useRefreshDocuSignToken: vi.fn(),
}))

// Import the mocked hooks
import {
  useDocuSignConnectionStatus,
  useInitiateDocuSignConnection,
  useDisconnectDocuSign,
  useRefreshDocuSignToken,
} from '../../hooks/useDocuSign'

// Test data
const mockConnectionStatus: DSConnectionStatus = {
  isConnected: true,
  connectionId: 'conn-123',
  accountId: 'acc-123',
  accountName: 'Test Account',
  isDemo: false,
  lastConnectedAt: '2024-01-15T10:00:00Z',
  tokenExpiresAt: '2024-01-20T10:00:00Z',
  isTokenExpired: false,
  needsReauth: false,
  connectionError: null,
}

// Create test wrapper
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('DocuSignConnectionSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('should show loading state', () => {
      vi.mocked(useDocuSignConnectionStatus).mockReturnValue({
        data: undefined,
        isLoading: true,
      } as any)
      vi.mocked(useInitiateDocuSignConnection).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any)
      vi.mocked(useDisconnectDocuSign).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any)
      vi.mocked(useRefreshDocuSignToken).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any)

      render(<DocuSignConnectionSettings />, { wrapper: createWrapper() })

      expect(screen.getByText('Loading DocuSign settings...')).toBeInTheDocument()
    })
  })

  describe('Connection Status Display', () => {
    beforeEach(() => {
      vi.mocked(useInitiateDocuSignConnection).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any)
      vi.mocked(useDisconnectDocuSign).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any)
      vi.mocked(useRefreshDocuSignToken).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any)
    })

    it('should show connected status when connected', () => {
      vi.mocked(useDocuSignConnectionStatus).mockReturnValue({
        data: mockConnectionStatus,
        isLoading: false,
      } as any)

      render(<DocuSignConnectionSettings />, { wrapper: createWrapper() })

      expect(screen.getByText('Connected')).toBeInTheDocument()
    })

    it('should show not connected status when not connected', () => {
      vi.mocked(useDocuSignConnectionStatus).mockReturnValue({
        data: { ...mockConnectionStatus, isConnected: false },
        isLoading: false,
      } as any)

      render(<DocuSignConnectionSettings />, { wrapper: createWrapper() })

      expect(screen.getByText('Not Connected')).toBeInTheDocument()
    })

    it('should show production badge when not demo', () => {
      vi.mocked(useDocuSignConnectionStatus).mockReturnValue({
        data: mockConnectionStatus,
        isLoading: false,
      } as any)

      render(<DocuSignConnectionSettings />, { wrapper: createWrapper() })

      expect(screen.getByText('Production')).toBeInTheDocument()
    })

    it('should show demo account badge when demo', () => {
      vi.mocked(useDocuSignConnectionStatus).mockReturnValue({
        data: { ...mockConnectionStatus, isDemo: true },
        isLoading: false,
      } as any)

      render(<DocuSignConnectionSettings />, { wrapper: createWrapper() })

      expect(screen.getByText('Demo Account')).toBeInTheDocument()
    })

    it('should display account name', () => {
      vi.mocked(useDocuSignConnectionStatus).mockReturnValue({
        data: mockConnectionStatus,
        isLoading: false,
      } as any)

      render(<DocuSignConnectionSettings />, { wrapper: createWrapper() })

      expect(screen.getByText(/Account: Test Account/)).toBeInTheDocument()
    })

    it('should display account ID', () => {
      vi.mocked(useDocuSignConnectionStatus).mockReturnValue({
        data: mockConnectionStatus,
        isLoading: false,
      } as any)

      render(<DocuSignConnectionSettings />, { wrapper: createWrapper() })

      expect(screen.getByText('Account ID')).toBeInTheDocument()
      expect(screen.getByText('acc-123')).toBeInTheDocument()
    })

    it('should display last connected date', () => {
      vi.mocked(useDocuSignConnectionStatus).mockReturnValue({
        data: mockConnectionStatus,
        isLoading: false,
      } as any)

      render(<DocuSignConnectionSettings />, { wrapper: createWrapper() })

      expect(screen.getByText('Last Connected')).toBeInTheDocument()
    })

    it('should display token expiration date', () => {
      vi.mocked(useDocuSignConnectionStatus).mockReturnValue({
        data: mockConnectionStatus,
        isLoading: false,
      } as any)

      render(<DocuSignConnectionSettings />, { wrapper: createWrapper() })

      expect(screen.getByText('Token Expires')).toBeInTheDocument()
    })
  })

  describe('Token Status Indicators', () => {
    beforeEach(() => {
      vi.mocked(useInitiateDocuSignConnection).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any)
      vi.mocked(useDisconnectDocuSign).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any)
      vi.mocked(useRefreshDocuSignToken).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any)
    })

    it('should show token expiring badge when needs reauth', () => {
      vi.mocked(useDocuSignConnectionStatus).mockReturnValue({
        data: {
          ...mockConnectionStatus,
          needsReauth: true,
          isTokenExpired: false,
        },
        isLoading: false,
      } as any)

      render(<DocuSignConnectionSettings />, { wrapper: createWrapper() })

      expect(screen.getByText('Token Expiring')).toBeInTheDocument()
    })

    it('should show token expired badge when expired', () => {
      vi.mocked(useDocuSignConnectionStatus).mockReturnValue({
        data: {
          ...mockConnectionStatus,
          isTokenExpired: true,
        },
        isLoading: false,
      } as any)

      render(<DocuSignConnectionSettings />, { wrapper: createWrapper() })

      expect(screen.getByText('Token Expired')).toBeInTheDocument()
    })

    it('should show connection error when present', () => {
      vi.mocked(useDocuSignConnectionStatus).mockReturnValue({
        data: {
          ...mockConnectionStatus,
          connectionError: 'Failed to refresh token',
        },
        isLoading: false,
      } as any)

      render(<DocuSignConnectionSettings />, { wrapper: createWrapper() })

      expect(screen.getByText(/Error:/)).toBeInTheDocument()
      expect(screen.getByText(/Failed to refresh token/)).toBeInTheDocument()
    })
  })

  describe('Connect Flow', () => {
    let mockInitiateMutate: ReturnType<typeof vi.fn>

    beforeEach(() => {
      mockInitiateMutate = vi.fn()
      vi.mocked(useDocuSignConnectionStatus).mockReturnValue({
        data: { ...mockConnectionStatus, isConnected: false },
        isLoading: false,
      } as any)
      vi.mocked(useInitiateDocuSignConnection).mockReturnValue({
        mutate: mockInitiateMutate,
        isPending: false,
      } as any)
      vi.mocked(useDisconnectDocuSign).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any)
      vi.mocked(useRefreshDocuSignToken).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any)
    })

    it('should show connect button when not connected', () => {
      render(<DocuSignConnectionSettings />, { wrapper: createWrapper() })

      expect(
        screen.getByRole('button', { name: /connect docusign account/i })
      ).toBeInTheDocument()
    })

    it('should show demo mode toggle when not connected', () => {
      render(<DocuSignConnectionSettings />, { wrapper: createWrapper() })

      expect(screen.getByText('Demo Mode')).toBeInTheDocument()
      expect(
        screen.getByText(/Use DocuSign sandbox environment/)
      ).toBeInTheDocument()
    })

    it('should toggle demo mode', async () => {
      const user = userEvent.setup()
      render(<DocuSignConnectionSettings />, { wrapper: createWrapper() })

      const demoToggle = screen.getByRole('switch', { name: /demo-mode/i })
      expect(demoToggle).not.toBeChecked()

      await user.click(demoToggle)

      expect(demoToggle).toBeChecked()
    })

    it('should call initiate connection with demo mode off by default', async () => {
      const user = userEvent.setup()
      render(<DocuSignConnectionSettings />, { wrapper: createWrapper() })

      const connectButton = screen.getByRole('button', {
        name: /connect docusign account/i,
      })
      await user.click(connectButton)

      expect(mockInitiateMutate).toHaveBeenCalledWith({
        is_demo: false,
        return_url: expect.any(String),
      })
    })

    it('should call initiate connection with demo mode on when toggled', async () => {
      const user = userEvent.setup()
      render(<DocuSignConnectionSettings />, { wrapper: createWrapper() })

      // Toggle demo mode on
      const demoToggle = screen.getByRole('switch', { name: /demo-mode/i })
      await user.click(demoToggle)

      // Click connect
      const connectButton = screen.getByRole('button', {
        name: /connect docusign account/i,
      })
      await user.click(connectButton)

      expect(mockInitiateMutate).toHaveBeenCalledWith({
        is_demo: true,
        return_url: expect.any(String),
      })
    })

    it('should disable connect button while connecting', () => {
      vi.mocked(useInitiateDocuSignConnection).mockReturnValue({
        mutate: mockInitiateMutate,
        isPending: true,
      } as any)

      render(<DocuSignConnectionSettings />, { wrapper: createWrapper() })

      const connectButton = screen.getByRole('button', {
        name: /connect docusign account/i,
      })
      expect(connectButton).toBeDisabled()
    })

    it('should show loading state while connecting', () => {
      vi.mocked(useInitiateDocuSignConnection).mockReturnValue({
        mutate: mockInitiateMutate,
        isPending: true,
      } as any)

      render(<DocuSignConnectionSettings />, { wrapper: createWrapper() })

      expect(screen.getByRole('button', { name: /connect docusign account/i }))
        .toBeInTheDocument()
    })
  })

  describe('Disconnect Flow', () => {
    let mockDisconnectMutate: ReturnType<typeof vi.fn>

    beforeEach(() => {
      mockDisconnectMutate = vi.fn()
      vi.mocked(useDocuSignConnectionStatus).mockReturnValue({
        data: mockConnectionStatus,
        isLoading: false,
      } as any)
      vi.mocked(useInitiateDocuSignConnection).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any)
      vi.mocked(useDisconnectDocuSign).mockReturnValue({
        mutate: mockDisconnectMutate,
        isPending: false,
      } as any)
      vi.mocked(useRefreshDocuSignToken).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any)
    })

    it('should show disconnect button when connected', () => {
      render(<DocuSignConnectionSettings />, { wrapper: createWrapper() })

      expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument()
    })

    it('should show disconnect confirmation dialog when disconnect clicked', async () => {
      const user = userEvent.setup()
      render(<DocuSignConnectionSettings />, { wrapper: createWrapper() })

      const disconnectButton = screen.getByRole('button', { name: /disconnect/i })
      await user.click(disconnectButton)

      await waitFor(() => {
        expect(screen.getByText('Disconnect DocuSign?')).toBeInTheDocument()
      })
    })

    it('should show warning message in disconnect dialog', async () => {
      const user = userEvent.setup()
      render(<DocuSignConnectionSettings />, { wrapper: createWrapper() })

      const disconnectButton = screen.getByRole('button', { name: /disconnect/i })
      await user.click(disconnectButton)

      await waitFor(() => {
        expect(
          screen.getByText(/This will remove the DocuSign integration/)
        ).toBeInTheDocument()
      })
    })

    it('should cancel disconnect when cancel clicked', async () => {
      const user = userEvent.setup()
      render(<DocuSignConnectionSettings />, { wrapper: createWrapper() })

      // Open dialog
      const disconnectButton = screen.getByRole('button', { name: /disconnect/i })
      await user.click(disconnectButton)

      // Cancel
      await waitFor(async () => {
        const cancelButton = screen.getByRole('button', { name: /cancel/i })
        await user.click(cancelButton)
      })

      await waitFor(() => {
        expect(screen.queryByText('Disconnect DocuSign?')).not.toBeInTheDocument()
      })

      expect(mockDisconnectMutate).not.toHaveBeenCalled()
    })

    it('should call disconnect mutation when confirmed', async () => {
      const user = userEvent.setup()
      render(<DocuSignConnectionSettings />, { wrapper: createWrapper() })

      // Open dialog
      const disconnectButton = screen.getByRole('button', { name: /disconnect/i })
      await user.click(disconnectButton)

      // Confirm
      await waitFor(async () => {
        const confirmButtons = screen.getAllByRole('button', { name: /disconnect/i })
        // The second one is in the dialog
        await user.click(confirmButtons[1])
      })

      expect(mockDisconnectMutate).toHaveBeenCalledWith('conn-123', expect.any(Object))
    })

    it('should show loading state during disconnect', () => {
      vi.mocked(useDisconnectDocuSign).mockReturnValue({
        mutate: mockDisconnectMutate,
        isPending: true,
      } as any)

      render(<DocuSignConnectionSettings />, { wrapper: createWrapper() })

      // Dialog would be open in this state
      expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument()
    })
  })

  describe('Token Refresh', () => {
    let mockRefreshMutate: ReturnType<typeof vi.fn>

    beforeEach(() => {
      mockRefreshMutate = vi.fn()
      vi.mocked(useDocuSignConnectionStatus).mockReturnValue({
        data: mockConnectionStatus,
        isLoading: false,
      } as any)
      vi.mocked(useInitiateDocuSignConnection).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any)
      vi.mocked(useDisconnectDocuSign).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any)
      vi.mocked(useRefreshDocuSignToken).mockReturnValue({
        mutate: mockRefreshMutate,
        isPending: false,
      } as any)
    })

    it('should show refresh token button when connected', () => {
      render(<DocuSignConnectionSettings />, { wrapper: createWrapper() })

      expect(screen.getByRole('button', { name: /refresh token/i })).toBeInTheDocument()
    })

    it('should call refresh token mutation when clicked', async () => {
      const user = userEvent.setup()
      render(<DocuSignConnectionSettings />, { wrapper: createWrapper() })

      const refreshButton = screen.getByRole('button', { name: /refresh token/i })
      await user.click(refreshButton)

      expect(mockRefreshMutate).toHaveBeenCalledWith('conn-123')
    })

    it('should disable refresh button while refreshing', () => {
      vi.mocked(useRefreshDocuSignToken).mockReturnValue({
        mutate: mockRefreshMutate,
        isPending: true,
      } as any)

      render(<DocuSignConnectionSettings />, { wrapper: createWrapper() })

      const refreshButton = screen.getByRole('button', { name: /refresh token/i })
      expect(refreshButton).toBeDisabled()
    })

    it('should show loading state while refreshing', () => {
      vi.mocked(useRefreshDocuSignToken).mockReturnValue({
        mutate: mockRefreshMutate,
        isPending: true,
      } as any)

      render(<DocuSignConnectionSettings />, { wrapper: createWrapper() })

      expect(screen.getByRole('button', { name: /refresh token/i })).toBeInTheDocument()
    })
  })

  describe('Features Information', () => {
    beforeEach(() => {
      vi.mocked(useDocuSignConnectionStatus).mockReturnValue({
        data: { ...mockConnectionStatus, isConnected: false },
        isLoading: false,
      } as any)
      vi.mocked(useInitiateDocuSignConnection).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any)
      vi.mocked(useDisconnectDocuSign).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any)
      vi.mocked(useRefreshDocuSignToken).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any)
    })

    it('should show features section', () => {
      render(<DocuSignConnectionSettings />, { wrapper: createWrapper() })

      expect(screen.getByText('What you can do with DocuSign')).toBeInTheDocument()
    })

    it('should show payment applications feature', () => {
      render(<DocuSignConnectionSettings />, { wrapper: createWrapper() })

      expect(screen.getByText('Payment Applications')).toBeInTheDocument()
      expect(
        screen.getByText(/Send G702\/G703 for contractor, architect, and owner signatures/)
      ).toBeInTheDocument()
    })

    it('should show change orders feature', () => {
      render(<DocuSignConnectionSettings />, { wrapper: createWrapper() })

      expect(screen.getByText('Change Orders')).toBeInTheDocument()
      expect(
        screen.getByText(/Get owner approval signatures on change orders/)
      ).toBeInTheDocument()
    })

    it('should show lien waivers feature', () => {
      render(<DocuSignConnectionSettings />, { wrapper: createWrapper() })

      expect(screen.getByText('Lien Waivers')).toBeInTheDocument()
      expect(
        screen.getByText(/Collect claimant signatures with optional notarization/)
      ).toBeInTheDocument()
    })

    it('should show help link', () => {
      render(<DocuSignConnectionSettings />, { wrapper: createWrapper() })

      const helpLink = screen.getByText('Learn more about DocuSign')
      expect(helpLink).toBeInTheDocument()
      expect(helpLink.closest('a')).toHaveAttribute(
        'href',
        'https://developers.docusign.com/docs'
      )
      expect(helpLink.closest('a')).toHaveAttribute('target', '_blank')
      expect(helpLink.closest('a')).toHaveAttribute('rel', 'noopener noreferrer')
    })
  })

  describe('UI States', () => {
    beforeEach(() => {
      vi.mocked(useInitiateDocuSignConnection).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any)
      vi.mocked(useDisconnectDocuSign).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any)
      vi.mocked(useRefreshDocuSignToken).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any)
    })

    it('should not show demo toggle when connected', () => {
      vi.mocked(useDocuSignConnectionStatus).mockReturnValue({
        data: mockConnectionStatus,
        isLoading: false,
      } as any)

      render(<DocuSignConnectionSettings />, { wrapper: createWrapper() })

      expect(screen.queryByText('Demo Mode')).not.toBeInTheDocument()
    })

    it('should not show connect button when connected', () => {
      vi.mocked(useDocuSignConnectionStatus).mockReturnValue({
        data: mockConnectionStatus,
        isLoading: false,
      } as any)

      render(<DocuSignConnectionSettings />, { wrapper: createWrapper() })

      expect(
        screen.queryByRole('button', { name: /connect docusign account/i })
      ).not.toBeInTheDocument()
    })

    it('should not show refresh/disconnect buttons when not connected', () => {
      vi.mocked(useDocuSignConnectionStatus).mockReturnValue({
        data: { ...mockConnectionStatus, isConnected: false },
        isLoading: false,
      } as any)

      render(<DocuSignConnectionSettings />, { wrapper: createWrapper() })

      expect(
        screen.queryByRole('button', { name: /refresh token/i })
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /disconnect/i })
      ).not.toBeInTheDocument()
    })

    it('should show authorization redirect message', () => {
      vi.mocked(useDocuSignConnectionStatus).mockReturnValue({
        data: { ...mockConnectionStatus, isConnected: false },
        isLoading: false,
      } as any)

      render(<DocuSignConnectionSettings />, { wrapper: createWrapper() })

      expect(
        screen.getByText(/You will be redirected to DocuSign to authorize access/)
      ).toBeInTheDocument()
    })
  })

  describe('Component Title and Description', () => {
    beforeEach(() => {
      vi.mocked(useDocuSignConnectionStatus).mockReturnValue({
        data: { ...mockConnectionStatus, isConnected: false },
        isLoading: false,
      } as any)
      vi.mocked(useInitiateDocuSignConnection).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any)
      vi.mocked(useDisconnectDocuSign).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any)
      vi.mocked(useRefreshDocuSignToken).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any)
    })

    it('should show component title', () => {
      render(<DocuSignConnectionSettings />, { wrapper: createWrapper() })

      expect(screen.getByText('DocuSign Integration')).toBeInTheDocument()
    })

    it('should show component description', () => {
      render(<DocuSignConnectionSettings />, { wrapper: createWrapper() })

      expect(
        screen.getByText(
          /Enable electronic signatures for payment applications, change orders, and lien waivers/
        )
      ).toBeInTheDocument()
    })
  })
})
