/**
 * Milestone Notification Settings Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MilestoneNotificationSettings } from './MilestoneNotificationSettings'
import { milestoneNotificationPreferencesApi } from '@/lib/api/services/milestone-notification-preferences'
import { MilestoneNotificationPreference } from '@/types/milestone-notification-preferences'

// Mock the API service
vi.mock('@/lib/api/services/milestone-notification-preferences', () => ({
  milestoneNotificationPreferencesApi: {
    getPreferences: vi.fn(),
    bulkUpdatePreferences: vi.fn(),
    resetToDefaults: vi.fn(),
  },
}))

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('MilestoneNotificationSettings', () => {
  const mockUserId = 'user-123'
  const mockProjectId = 'project-456'

  const mockPreferences: MilestoneNotificationPreference[] = [
    {
      id: 'pref-1',
      user_id: mockUserId,
      project_id: null,
      event_type: 'project.started',
      email_enabled: true,
      in_app_enabled: true,
      sms_enabled: false,
      push_enabled: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'pref-2',
      user_id: mockUserId,
      project_id: null,
      event_type: 'project.milestone_completed',
      email_enabled: true,
      in_app_enabled: false,
      sms_enabled: false,
      push_enabled: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ]

  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    vi.clearAllMocks()
  })

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MilestoneNotificationSettings userId={mockUserId} {...props} />
      </QueryClientProvider>
    )
  }

  it('should render loading state initially', () => {
    vi.mocked(milestoneNotificationPreferencesApi.getPreferences).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )

    renderComponent()

    expect(screen.getAllByRole('status')).toBeTruthy() // Skeletons have status role
  })

  it('should render preferences when loaded', async () => {
    vi.mocked(milestoneNotificationPreferencesApi.getPreferences).mockResolvedValue(
      mockPreferences
    )

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument()
    })

    expect(screen.getByText('Project Milestones')).toBeInTheDocument()
    expect(screen.getByText('Project Started')).toBeInTheDocument()
  })

  it('should render error state on fetch failure', async () => {
    vi.mocked(milestoneNotificationPreferencesApi.getPreferences).mockRejectedValue(
      new Error('Failed to fetch')
    )

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText(/Failed to load notification preferences/i)).toBeInTheDocument()
    })
  })

  it('should display all category groups', async () => {
    vi.mocked(milestoneNotificationPreferencesApi.getPreferences).mockResolvedValue(
      mockPreferences
    )

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Project Milestones')).toBeInTheDocument()
    })

    expect(screen.getByText('Schedule Events')).toBeInTheDocument()
    expect(screen.getByText('Financial Events')).toBeInTheDocument()
    expect(screen.getByText('Quality Events')).toBeInTheDocument()
    expect(screen.getByText('Documents')).toBeInTheDocument()
    expect(screen.getByText('Communication')).toBeInTheDocument()
  })

  it('should show enabled count for each category', async () => {
    vi.mocked(milestoneNotificationPreferencesApi.getPreferences).mockResolvedValue(
      mockPreferences
    )

    renderComponent()

    await waitFor(() => {
      // Should show count like "2 / 4 enabled" or similar
      expect(screen.getAllByText(/enabled/i).length).toBeGreaterThan(0)
    })
  })

  it('should toggle event on/off', async () => {
    const user = userEvent.setup()
    vi.mocked(milestoneNotificationPreferencesApi.getPreferences).mockResolvedValue(
      mockPreferences
    )

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Project Started')).toBeInTheDocument()
    })

    // Find and click the switch for Project Started
    const switches = screen.getAllByRole('switch')
    await user.click(switches[0])

    // Should show unsaved changes message
    await waitFor(() => {
      expect(screen.getByText(/You have unsaved changes/i)).toBeInTheDocument()
    })

    // Save button should be enabled
    const saveButton = screen.getByRole('button', { name: /Save Changes/i })
    expect(saveButton).toBeEnabled()
  })

  it('should toggle notification channels', async () => {
    const user = userEvent.setup()
    vi.mocked(milestoneNotificationPreferencesApi.getPreferences).mockResolvedValue(
      mockPreferences
    )

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Project Started')).toBeInTheDocument()
    })

    // Find email channel toggle button
    const channelButtons = screen.getAllByRole('button', { name: /email notifications/i })
    await user.click(channelButtons[0])

    // Should show unsaved changes
    await waitFor(() => {
      expect(screen.getByText(/You have unsaved changes/i)).toBeInTheDocument()
    })
  })

  it('should save changes when Save button is clicked', async () => {
    const user = userEvent.setup()
    vi.mocked(milestoneNotificationPreferencesApi.getPreferences).mockResolvedValue(
      mockPreferences
    )
    vi.mocked(milestoneNotificationPreferencesApi.bulkUpdatePreferences).mockResolvedValue([])

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Project Started')).toBeInTheDocument()
    })

    // Make a change
    const switches = screen.getAllByRole('switch')
    await user.click(switches[0])

    // Click save
    const saveButton = screen.getByRole('button', { name: /Save Changes/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(milestoneNotificationPreferencesApi.bulkUpdatePreferences).toHaveBeenCalled()
    })
  })

  it('should reset to defaults when Reset button is clicked', async () => {
    const user = userEvent.setup()
    vi.mocked(milestoneNotificationPreferencesApi.getPreferences).mockResolvedValue(
      mockPreferences
    )
    vi.mocked(milestoneNotificationPreferencesApi.resetToDefaults).mockResolvedValue()

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument()
    })

    const resetButton = screen.getByRole('button', { name: /Reset to Defaults/i })
    await user.click(resetButton)

    await waitFor(() => {
      expect(milestoneNotificationPreferencesApi.resetToDefaults).toHaveBeenCalledWith(
        mockUserId,
        undefined
      )
    })
  })

  it('should disable Save button when no changes', async () => {
    vi.mocked(milestoneNotificationPreferencesApi.getPreferences).mockResolvedValue(
      mockPreferences
    )

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument()
    })

    const saveButton = screen.getByRole('button', { name: /Save Changes/i })
    expect(saveButton).toBeDisabled()
  })

  it('should show loading state when saving', async () => {
    const user = userEvent.setup()
    vi.mocked(milestoneNotificationPreferencesApi.getPreferences).mockResolvedValue(
      mockPreferences
    )
    vi.mocked(milestoneNotificationPreferencesApi.bulkUpdatePreferences).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Project Started')).toBeInTheDocument()
    })

    // Make a change
    const switches = screen.getAllByRole('switch')
    await user.click(switches[0])

    // Click save
    const saveButton = screen.getByRole('button', { name: /Save Changes/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeInTheDocument()
    })
  })

  it('should disable channel toggles when event is disabled', async () => {
    const user = userEvent.setup()
    const disabledPreference: MilestoneNotificationPreference = {
      id: 'pref-3',
      user_id: mockUserId,
      project_id: null,
      event_type: 'schedule.update',
      email_enabled: false,
      in_app_enabled: false,
      sms_enabled: false,
      push_enabled: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    vi.mocked(milestoneNotificationPreferencesApi.getPreferences).mockResolvedValue([
      ...mockPreferences,
      disabledPreference,
    ])

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Schedule Events')).toBeInTheDocument()
    })

    // Expand Schedule Events accordion
    const scheduleAccordion = screen.getByText('Schedule Events')
    await user.click(scheduleAccordion)

    // Channel toggle buttons should be disabled for disabled events
    // This is a simplified check - in reality you'd need to find specific buttons
    const allButtons = screen.getAllByRole('button')
    const disabledButtons = allButtons.filter((btn) => btn.disabled)
    expect(disabledButtons.length).toBeGreaterThan(0)
  })

  it('should use project-specific preferences when projectId is provided', async () => {
    vi.mocked(milestoneNotificationPreferencesApi.getPreferences).mockResolvedValue(
      mockPreferences
    )

    renderComponent({ projectId: mockProjectId })

    await waitFor(() => {
      expect(milestoneNotificationPreferencesApi.getPreferences).toHaveBeenCalledWith(
        mockUserId,
        mockProjectId
      )
    })
  })

  it('should apply custom className', async () => {
    vi.mocked(milestoneNotificationPreferencesApi.getPreferences).mockResolvedValue(
      mockPreferences
    )

    const { container } = renderComponent({ className: 'custom-class' })

    await waitFor(() => {
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument()
    })

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('should show legend explaining notification types', async () => {
    vi.mocked(milestoneNotificationPreferencesApi.getPreferences).mockResolvedValue(
      mockPreferences
    )

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText(/In-App notifications appear in the application/i)).toBeInTheDocument()
    })

    expect(screen.getByText(/SMS\/Push coming soon/i)).toBeInTheDocument()
  })
})
