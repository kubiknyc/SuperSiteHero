/**
 * DedicatedSubmittalAnalytics Tests
 *
 * Tests for the Dedicated Submittal Analytics component.
 * Verifies chart rendering, metric calculations, and data display.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DedicatedSubmittalAnalytics } from './DedicatedSubmittalAnalytics'

// Mock recharts components to prevent rendering issues
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: () => <div data-testid="line" />,
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie">{children}</div>
  ),
  Cell: () => <div data-testid="cell" />,
}))

// Mock submittals data
const mockSubmittals = [
  {
    id: 'sub-1',
    project_id: 'proj-1',
    spec_section: '03 30 00',
    spec_section_title: 'Cast-in-Place Concrete',
    title: 'Concrete Mix Design',
    submittal_number: 'SUB-001',
    review_status: 'approved',
    date_submitted: '2024-01-01',
    date_returned: '2024-01-10',
    date_required: '2024-01-15',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'sub-2',
    project_id: 'proj-1',
    spec_section: '05 12 00',
    spec_section_title: 'Structural Steel',
    title: 'Steel Shop Drawings',
    submittal_number: 'SUB-002',
    review_status: 'under_review',
    date_submitted: '2024-01-15',
    date_returned: null,
    date_required: '2024-01-30',
    created_at: '2024-01-15T00:00:00Z',
  },
]

// Mock the useDedicatedSubmittals hook
vi.mock('../hooks/useDedicatedSubmittals', () => ({
  useProjectSubmittals: vi.fn(() => ({
    data: mockSubmittals,
    isLoading: false,
    error: null,
  })),
}))

describe('DedicatedSubmittalAnalytics', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
  })

  const renderWithProviders = (projectId: string = 'test-project-123') => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/projects/${projectId}/submittals`]}>
          <Routes>
            <Route
              path="/projects/:projectId/submittals"
              element={<DedicatedSubmittalAnalytics projectId={projectId} />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  describe('Rendering', () => {
    it('should render the analytics header', async () => {
      renderWithProviders()

      await waitFor(() => {
        expect(screen.getByText('Lead Time Analytics')).toBeInTheDocument()
      })
    })

    it('should render key metric cards', async () => {
      renderWithProviders()

      await waitFor(() => {
        expect(screen.getByText('Avg Lead Time')).toBeInTheDocument()
        expect(screen.getByText('Completed')).toBeInTheDocument()
        expect(screen.getByText('Pending Review')).toBeInTheDocument()
        expect(screen.getByText('Overdue')).toBeInTheDocument()
      })
    })

    it('should render tabs for different views', async () => {
      renderWithProviders()

      await waitFor(() => {
        expect(screen.getByText('Monthly Trends')).toBeInTheDocument()
        expect(screen.getByText('Lead Time')).toBeInTheDocument()
        expect(screen.getByText('By Status')).toBeInTheDocument()
        expect(screen.getByText('By Division')).toBeInTheDocument()
      })
    })
  })

  describe('Tab Navigation', () => {
    it('should switch to By Status tab when clicked', async () => {
      renderWithProviders()

      await waitFor(() => {
        expect(screen.getByText('By Status')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('By Status'))

      await waitFor(() => {
        expect(screen.getByText('Submittals by Status')).toBeInTheDocument()
      })
    })

    it('should switch to By Division tab when clicked', async () => {
      renderWithProviders()

      await waitFor(() => {
        expect(screen.getByText('By Division')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('By Division'))

      await waitFor(() => {
        expect(screen.getByText('Submittals by CSI Division')).toBeInTheDocument()
      })
    })
  })

  describe('Props Handling', () => {
    it('should accept projectId as prop', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <DedicatedSubmittalAnalytics projectId="custom-project-id" />
          </MemoryRouter>
        </QueryClientProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Lead Time Analytics')).toBeInTheDocument()
      })
    })
  })
})
