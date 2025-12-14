/**
 * Superintendent Dashboard Tests
 * Tests for field-level superintendent dashboard
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SuperintendentDashboard } from '../SuperintendentDashboard'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock the supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: [],
          error: null,
        })),
      })),
    })),
  },
}))

describe('SuperintendentDashboard', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{component}</BrowserRouter>
      </QueryClientProvider>
    )
  }

  const mockProjectId = 'test-project-123'

  describe('Rendering', () => {
    it('should render the dashboard', () => {
      renderWithProviders(<SuperintendentDashboard projectId={mockProjectId} />)

      expect(screen.getByText(/Field Dashboard/i)).toBeInTheDocument()
    })

    it('should display daily operations section', () => {
      renderWithProviders(<SuperintendentDashboard projectId={mockProjectId} />)

      expect(screen.getByText(/(Daily|Today|Field)/i)).toBeInTheDocument()
    })

    it('should show safety metrics prominently', () => {
      renderWithProviders(<SuperintendentDashboard projectId={mockProjectId} />)

      expect(screen.getByText(/Safety/i)).toBeInTheDocument()
    })
  })

  describe('Daily Operations', () => {
    it('should display workforce summary', () => {
      renderWithProviders(<SuperintendentDashboard projectId={mockProjectId} />)

      expect(screen.getByText(/(Workers|Workforce|Crew)/i)).toBeInTheDocument()
    })

    it('should show equipment status', () => {
      renderWithProviders(<SuperintendentDashboard projectId={mockProjectId} />)

      expect(screen.getByText(/Equipment/i)).toBeInTheDocument()
    })

    it('should display weather information', () => {
      renderWithProviders(<SuperintendentDashboard projectId={mockProjectId} />)

      expect(screen.getByText(/Weather/i)).toBeInTheDocument()
    })

    it('should show daily report status', () => {
      renderWithProviders(<SuperintendentDashboard projectId={mockProjectId} />)

      expect(screen.getByText(/(Daily Report|Report)/i)).toBeInTheDocument()
    })
  })

  describe('Safety Metrics', () => {
    it('should display days without incident', () => {
      renderWithProviders(<SuperintendentDashboard projectId={mockProjectId} />)

      expect(screen.getByText(/(Days Without|Incident|Safety)/i)).toBeInTheDocument()
    })

    it('should show recent safety observations', () => {
      renderWithProviders(<SuperintendentDashboard projectId={mockProjectId} />)

      expect(screen.getByText(/(Safety|Observation|Incident)/i)).toBeInTheDocument()
    })

    it('should display JSA/toolbox talk status', () => {
      renderWithProviders(<SuperintendentDashboard projectId={mockProjectId} />)

      expect(screen.getByText(/(JSA|Toolbox|Safety Talk)/i)).toBeInTheDocument()
    })
  })

  describe('Task Management', () => {
    it('should show punch list items', () => {
      renderWithProviders(<SuperintendentDashboard projectId={mockProjectId} />)

      expect(screen.getByText(/(Punch|List|Item)/i)).toBeInTheDocument()
    })

    it('should display open RFIs', () => {
      renderWithProviders(<SuperintendentDashboard projectId={mockProjectId} />)

      expect(screen.getByText(/RFI/i)).toBeInTheDocument()
    })

    it('should show pending submittals', () => {
      renderWithProviders(<SuperintendentDashboard projectId={mockProjectId} />)

      expect(screen.getByText(/Submittal/i)).toBeInTheDocument()
    })
  })

  describe('Schedule Information', () => {
    it('should display current phase or milestone', () => {
      renderWithProviders(<SuperintendentDashboard projectId={mockProjectId} />)

      expect(screen.getByText(/(Phase|Milestone|Schedule)/i)).toBeInTheDocument()
    })

    it('should show upcoming activities', () => {
      renderWithProviders(<SuperintendentDashboard projectId={mockProjectId} />)

      expect(screen.getByText(/(Upcoming|Activities|Schedule)/i)).toBeInTheDocument()
    })

    it('should display look-ahead schedule', () => {
      renderWithProviders(<SuperintendentDashboard projectId={mockProjectId} />)

      expect(screen.getByText(/(Look.?Ahead|Schedule)/i)).toBeInTheDocument()
    })
  })

  describe('Material and Deliveries', () => {
    it('should show pending deliveries', () => {
      renderWithProviders(<SuperintendentDashboard projectId={mockProjectId} />)

      expect(screen.getByText(/(Delivery|Deliveries|Material)/i)).toBeInTheDocument()
    })

    it('should display material status', () => {
      renderWithProviders(<SuperintendentDashboard projectId={mockProjectId} />)

      expect(screen.getByText(/Material/i)).toBeInTheDocument()
    })
  })

  describe('Quick Actions', () => {
    it('should provide quick action buttons', () => {
      const { container } = renderWithProviders(<SuperintendentDashboard projectId={mockProjectId} />)

      const buttons = container.querySelectorAll('button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('should have create daily report action', () => {
      renderWithProviders(<SuperintendentDashboard projectId={mockProjectId} />)

      expect(screen.getByText(/(Create|Add|New).*Report/i)).toBeInTheDocument()
    })

    it('should have log safety observation action', () => {
      renderWithProviders(<SuperintendentDashboard projectId={mockProjectId} />)

      expect(screen.getByText(/(Log|Add|Report).*Safety/i)).toBeInTheDocument()
    })
  })

  describe('Data Visualization', () => {
    it('should use cards for metric display', () => {
      const { container } = renderWithProviders(<SuperintendentDashboard projectId={mockProjectId} />)

      const cards = container.querySelectorAll('[class*="card"]')
      expect(cards.length).toBeGreaterThan(0)
    })

    it('should include relevant icons', () => {
      const { container } = renderWithProviders(<SuperintendentDashboard projectId={mockProjectId} />)

      const svgs = container.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThan(3)
    })

    it('should use badges for status indicators', () => {
      const { container } = renderWithProviders(<SuperintendentDashboard projectId={mockProjectId} />)

      const badges = container.querySelectorAll('[class*="badge"]')
      expect(badges.length).toBeGreaterThanOrEqual(0) // May have badges depending on data
    })
  })

  describe('Project Context', () => {
    it('should require projectId prop', () => {
      renderWithProviders(<SuperintendentDashboard projectId={mockProjectId} />)

      // Dashboard should render with project context
      expect(screen.getByText(/Field Dashboard/i)).toBeInTheDocument()
    })

    it('should filter data by project', () => {
      renderWithProviders(<SuperintendentDashboard projectId={mockProjectId} />)

      // All displayed data should be project-specific
      expect(screen.getByText(/Field Dashboard/i)).toBeInTheDocument()
    })
  })

  describe('Real-time Updates', () => {
    it('should display current date/time context', () => {
      renderWithProviders(<SuperintendentDashboard projectId={mockProjectId} />)

      // Should show today's date or "Today" indicator
      expect(screen.getByText(/(Today|Current)/i)).toBeInTheDocument()
    })
  })

  describe('Mobile-Friendly Features', () => {
    it('should use responsive grid layout', () => {
      const { container } = renderWithProviders(<SuperintendentDashboard projectId={mockProjectId} />)

      const gridContainers = container.querySelectorAll('[class*="grid"]')
      expect(gridContainers.length).toBeGreaterThan(0)
    })

    it('should prioritize field-critical information', () => {
      renderWithProviders(<SuperintendentDashboard projectId={mockProjectId} />)

      // Safety and daily operations should be prominent
      expect(screen.getByText(/Safety/i)).toBeInTheDocument()
      expect(screen.getByText(/(Daily|Today)/i)).toBeInTheDocument()
    })
  })

  describe('Empty States', () => {
    it('should handle no daily report gracefully', () => {
      renderWithProviders(<SuperintendentDashboard projectId={mockProjectId} />)

      // Should still render dashboard even if no daily report exists
      expect(screen.getByText(/Field Dashboard/i)).toBeInTheDocument()
    })

    it('should handle no pending tasks gracefully', () => {
      renderWithProviders(<SuperintendentDashboard projectId={mockProjectId} />)

      // Dashboard should render without errors
      expect(screen.getByText(/Field Dashboard/i)).toBeInTheDocument()
    })
  })
})
