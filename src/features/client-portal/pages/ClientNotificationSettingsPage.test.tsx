/**
 * Client Notification Settings Page Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClientNotificationSettingsPage } from './ClientNotificationSettingsPage'
import { AuthContext } from '@/contexts/AuthContext'

// Mock the MilestoneNotificationSettings component
vi.mock('../components/MilestoneNotificationSettings', () => ({
  MilestoneNotificationSettings: ({ userId, projectId }: any) => (
    <div data-testid="milestone-notification-settings">
      Settings for user: {userId}, project: {projectId || 'none'}
    </div>
  ),
}))

describe('ClientNotificationSettingsPage', () => {
  let queryClient: QueryClient

  const mockUser = {
    id: 'user-123',
    email: 'client@example.com',
    name: 'Test Client',
  }

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
  })

  const renderWithAuth = (user: any = mockUser, route = '/client/settings/notifications') => {
    const mockAuthValue = {
      user,
      isAuthenticated: !!user,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
    }

    return render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={mockAuthValue}>
          <MemoryRouter initialEntries={[route]}>
            <Routes>
              <Route
                path="/client/settings/notifications"
                element={<ClientNotificationSettingsPage />}
              />
              <Route
                path="/client/projects/:projectId/settings/notifications"
                element={<ClientNotificationSettingsPage />}
              />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </QueryClientProvider>
    )
  }

  it('should render page title and breadcrumb', () => {
    renderWithAuth()

    expect(screen.getByText('Notification Settings')).toBeInTheDocument()
    expect(screen.getByText('Back to Dashboard')).toBeInTheDocument()
  })

  it('should render help section', () => {
    renderWithAuth()

    expect(screen.getByText('About Notification Preferences')).toBeInTheDocument()
    expect(
      screen.getByText(/Customize which project milestone events/i)
    ).toBeInTheDocument()
  })

  it('should describe notification channels', () => {
    renderWithAuth()

    expect(screen.getByText(/Email:/)).toBeInTheDocument()
    expect(screen.getByText(/In-App:/)).toBeInTheDocument()
    expect(screen.getByText(/SMS & Push:/)).toBeInTheDocument()
  })

  it('should render MilestoneNotificationSettings component with user ID', () => {
    renderWithAuth()

    const settings = screen.getByTestId('milestone-notification-settings')
    expect(settings).toBeInTheDocument()
    expect(settings).toHaveTextContent(`user: ${mockUser.id}`)
  })

  it('should pass null projectId when not in project context', () => {
    renderWithAuth()

    const settings = screen.getByTestId('milestone-notification-settings')
    expect(settings).toHaveTextContent('project: none')
  })

  it('should pass projectId when in project context', () => {
    const projectId = 'project-456'
    renderWithAuth(mockUser, `/client/projects/${projectId}/settings/notifications`)

    const settings = screen.getByTestId('milestone-notification-settings')
    expect(settings).toHaveTextContent(`project: ${projectId}`)
  })

  it('should show project breadcrumb when projectId is present', () => {
    const projectId = 'project-456'
    renderWithAuth(mockUser, `/client/projects/${projectId}/settings/notifications`)

    expect(screen.getByText('Project')).toBeInTheDocument()
    const projectLink = screen.getByText('Project').closest('a')
    expect(projectLink).toHaveAttribute('href', `/client/projects/${projectId}`)
  })

  it('should not show project breadcrumb when projectId is absent', () => {
    renderWithAuth()

    expect(screen.queryByText('Project')).not.toBeInTheDocument()
  })

  it('should render additional help section', () => {
    renderWithAuth()

    expect(screen.getByText('Need Help?')).toBeInTheDocument()
    expect(
      screen.getByText(/Your email address is correct in your profile settings/i)
    ).toBeInTheDocument()
  })

  it('should include support email link', () => {
    renderWithAuth()

    const supportLink = screen.getByText('support@example.com')
    expect(supportLink).toBeInTheDocument()
    expect(supportLink).toHaveAttribute('href', 'mailto:support@example.com')
  })

  it('should show login prompt when user is not authenticated', () => {
    renderWithAuth(null)

    expect(screen.getByText(/Please log in to manage notification settings/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Log In/i })).toBeInTheDocument()
  })

  it('should have back to dashboard link', () => {
    renderWithAuth()

    const backLink = screen.getByText('Back to Dashboard')
    expect(backLink.closest('a')).toHaveAttribute('href', '/client/dashboard')
  })

  it('should render all help text sections', () => {
    renderWithAuth()

    // Main help section
    expect(
      screen.getByText(/You can enable or disable individual notification types/i)
    ).toBeInTheDocument()

    // Troubleshooting help
    expect(
      screen.getByText(/Email notifications aren't being filtered as spam/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/You have enabled at least one notification channel/i)
    ).toBeInTheDocument()
  })

  it('should have accessible navigation structure', () => {
    renderWithAuth()

    const nav = screen.getByRole('navigation')
    expect(nav).toBeInTheDocument()
  })

  it('should display settings icon in breadcrumb', () => {
    const { container } = renderWithAuth()

    // Check for Settings icon in breadcrumb
    const breadcrumb = screen.getByText('Notification Settings')
    expect(breadcrumb.querySelector('svg')).toBeInTheDocument()
  })

  it('should display help section with blue styling', () => {
    const { container } = renderWithAuth()

    const helpCard = screen.getByText('About Notification Preferences').closest('div')
    expect(helpCard?.parentElement).toHaveClass('bg-blue-50')
  })

  it('should list all notification troubleshooting tips', () => {
    renderWithAuth()

    expect(
      screen.getByText(/Your email address is correct in your profile settings/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Email notifications aren't being filtered as spam/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/You have enabled at least one notification channel/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Your browser allows in-app notifications/i)
    ).toBeInTheDocument()
  })

  it('should explain how preferences are saved', () => {
    renderWithAuth()

    expect(
      screen.getByText(/Your preferences are saved automatically when you click "Save Changes"/i)
    ).toBeInTheDocument()
  })
})
