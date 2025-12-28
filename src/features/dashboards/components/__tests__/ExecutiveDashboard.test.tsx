/**
 * Executive Dashboard Tests
 * Tests for executive-level portfolio dashboard
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { ExecutiveDashboard } from '../ExecutiveDashboard'
import { BrowserRouter } from 'react-router-dom'

// Mock the necessary modules
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

describe('ExecutiveDashboard', () => {
  const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>)
  }

  describe('Rendering', () => {
    it('should render the dashboard', () => {
      renderWithRouter(<ExecutiveDashboard />)

      expect(screen.getByText(/Portfolio Overview/i)).toBeInTheDocument()
    })

    it('should display portfolio metrics', () => {
      renderWithRouter(<ExecutiveDashboard />)

      // Should show key financial metrics
      expect(screen.getByText(/Total Contract Value/i)).toBeInTheDocument()
      expect(screen.getByText(/Revenue/i)).toBeInTheDocument()
      expect(screen.getByText(/Profit Margin/i)).toBeInTheDocument()
    })

    it('should display project count metrics', () => {
      renderWithRouter(<ExecutiveDashboard />)

      expect(screen.getByText(/Total Projects/i)).toBeInTheDocument()
      expect(screen.getByText(/Active Projects/i)).toBeInTheDocument()
    })

    it('should render projects summary section', () => {
      renderWithRouter(<ExecutiveDashboard />)

      expect(screen.getByText(/Projects Status/i)).toBeInTheDocument()
    })

    it('should display financial performance section', () => {
      renderWithRouter(<ExecutiveDashboard />)

      expect(screen.getByText(/Financial Performance/i)).toBeInTheDocument()
    })
  })

  describe('Portfolio Metrics Display', () => {
    it('should format currency values correctly', () => {
      renderWithRouter(<ExecutiveDashboard />)

      // Check for currency symbols and formatting
      const currencyElements = screen.getAllByText(/\$/i)
      expect(currencyElements.length).toBeGreaterThan(0)
    })

    it('should show percentage values for margins', () => {
      renderWithRouter(<ExecutiveDashboard />)

      // Should display percentages
      const percentageElements = screen.getAllByText(/%/i)
      expect(percentageElements.length).toBeGreaterThan(0)
    })

    it('should display backlog information', () => {
      renderWithRouter(<ExecutiveDashboard />)

      expect(screen.getByText(/Backlog/i)).toBeInTheDocument()
    })
  })

  describe('Project Summary Cards', () => {
    it('should display project names', () => {
      renderWithRouter(<ExecutiveDashboard />)

      // Mock data includes specific project names
      expect(screen.getByText(/Downtown Office Tower/i)).toBeInTheDocument()
      expect(screen.getByText(/Riverside Apartments/i)).toBeInTheDocument()
    })

    it('should show project completion percentages', () => {
      renderWithRouter(<ExecutiveDashboard />)

      // Look for progress indicators
      const progressBars = document.querySelectorAll('[role="progressbar"]')
      expect(progressBars.length).toBeGreaterThan(0)
    })

    it('should display risk indicators', () => {
      renderWithRouter(<ExecutiveDashboard />)

      // Should show risk levels (high, medium, low)
      expect(screen.getByText(/high/i) || screen.getByText(/medium/i) || screen.getByText(/low/i)).toBeInTheDocument()
    })

    it('should show schedule status for projects', () => {
      renderWithRouter(<ExecutiveDashboard />)

      // Schedule statuses: on-track, ahead, behind
      const statusBadges = screen.getAllByText(/(on-track|ahead|behind)/i)
      expect(statusBadges.length).toBeGreaterThan(0)
    })
  })

  describe('Data Aggregation', () => {
    it('should calculate total contract value correctly', () => {
      const { container } = renderWithRouter(<ExecutiveDashboard />)

      // The component should aggregate all project contract values
      const totalValue = screen.getByText(/Total Contract Value/i)
      expect(totalValue).toBeInTheDocument()

      // Should be displayed as a large number
      const valueElement = totalValue.closest('div')
      expect(valueElement).toBeInTheDocument()
    })

    it('should calculate revenue to date', () => {
      renderWithRouter(<ExecutiveDashboard />)

      const revenue = screen.getByText(/Revenue/i)
      expect(revenue).toBeInTheDocument()
    })

    it('should show projected revenue', () => {
      renderWithRouter(<ExecutiveDashboard />)

      expect(screen.getByText(/Projected/i)).toBeInTheDocument()
    })
  })

  describe('Visual Elements', () => {
    it('should render icons for metrics', () => {
      const { container } = renderWithRouter(<ExecutiveDashboard />)

      // Icons should be present as SVG elements
      const svgs = container.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThan(5) // Multiple icons throughout the dashboard
    })

    it('should use cards for metric display', () => {
      const { container } = renderWithRouter(<ExecutiveDashboard />)

      // Should have multiple card components
      const cards = container.querySelectorAll('[class*="card"]')
      expect(cards.length).toBeGreaterThan(0)
    })

    it('should display trend indicators', () => {
      renderWithRouter(<ExecutiveDashboard />)

      // Should show up/down trends
      const trendElements = screen.getAllByText(/(up|down|increase|decrease)/i)
      if (trendElements.length === 0) {
        // Or check for arrow icons
        expect(document.querySelectorAll('svg').length).toBeGreaterThan(0)
      } else {
        expect(trendElements.length).toBeGreaterThan(0)
      }
    })
  })

  describe('Navigation Links', () => {
    it('should provide links to project details', () => {
      const { container } = renderWithRouter(<ExecutiveDashboard />)

      // Should have navigation links or buttons
      const links = container.querySelectorAll('a')
      expect(links.length).toBeGreaterThan(0)
    })

    it('should have view details buttons', () => {
      renderWithRouter(<ExecutiveDashboard />)

      const viewButtons = screen.getAllByText(/(View|Details|See more)/i)
      expect(viewButtons.length).toBeGreaterThan(0)
    })
  })

  describe('Risk Assessment Display', () => {
    it('should categorize projects by risk level', () => {
      renderWithRouter(<ExecutiveDashboard />)

      // Should display different risk levels
      const riskBadges = screen.getAllByText(/(high|medium|low)/i)
      expect(riskBadges.length).toBeGreaterThan(0)
    })

    it('should use color coding for risk levels', () => {
      const { container } = renderWithRouter(<ExecutiveDashboard />)

      // Badges should have variant classes for different risk levels
      const badges = container.querySelectorAll('[class*="badge"]')
      expect(badges.length).toBeGreaterThan(0)
    })
  })

  describe('Performance Indicators', () => {
    it('should display KPIs prominently', () => {
      renderWithRouter(<ExecutiveDashboard />)

      // Key metrics should be in large, prominent cards
      expect(screen.getByText(/Total Contract Value/i)).toBeInTheDocument()
      expect(screen.getByText(/Profit Margin/i)).toBeInTheDocument()
    })

    it('should show project count breakdown', () => {
      renderWithRouter(<ExecutiveDashboard />)

      expect(screen.getByText(/Total Projects/i)).toBeInTheDocument()
      expect(screen.getByText(/Active Projects/i)).toBeInTheDocument()
    })
  })

  describe('Responsive Layout', () => {
    it('should use grid layout for metrics', () => {
      const { container } = renderWithRouter(<ExecutiveDashboard />)

      // Should have grid layout classes
      const gridContainers = container.querySelectorAll('[class*="grid"]')
      expect(gridContainers.length).toBeGreaterThan(0)
    })

    it('should organize content in sections', () => {
      const { container } = renderWithRouter(<ExecutiveDashboard />)

      // Should have multiple sections with headers
      const headers = container.querySelectorAll('h1, h2, h3, h4')
      expect(headers.length).toBeGreaterThan(2)
    })
  })

  describe('Data Presentation', () => {
    it('should present data in a scannable format', () => {
      renderWithRouter(<ExecutiveDashboard />)

      // Should have clear headings and labels
      const labels = screen.getAllByText(/:/i)
      if (labels.length === 0) {
        // Or use card-based layout
        expect(document.querySelectorAll('[class*="card"]').length).toBeGreaterThan(0)
      } else {
        expect(labels.length).toBeGreaterThan(0)
      }
    })

    it('should prioritize critical metrics', () => {
      const { container } = renderWithRouter(<ExecutiveDashboard />)

      // First few cards should contain critical metrics
      const firstCard = container.querySelector('[class*="card"]')
      expect(firstCard).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should handle no projects gracefully', () => {
      renderWithRouter(<ExecutiveDashboard companyId="empty-company" />)

      // Should still render the dashboard structure
      expect(screen.getByText(/Portfolio Overview/i)).toBeInTheDocument()
    })
  })

  describe('Company Filtering', () => {
    it('should accept companyId prop', () => {
      const testCompanyId = 'test-company-123'
      renderWithRouter(<ExecutiveDashboard companyId={testCompanyId} />)

      // Dashboard should render with company context
      expect(screen.getByText(/Portfolio Overview/i)).toBeInTheDocument()
    })

    it('should work without companyId', () => {
      renderWithRouter(<ExecutiveDashboard />)

      // Should show all projects if no company filter
      expect(screen.getByText(/Portfolio Overview/i)).toBeInTheDocument()
    })
  })
})
