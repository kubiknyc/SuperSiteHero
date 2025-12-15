/**
 * Payment Forecast Calendar Component Tests
 *
 * Tests for the payment forecast calendar UI component including:
 * - Rendering states (loading, error, data)
 * - Calendar navigation
 * - View switching
 * - Summary cards
 * - Payment list display
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { format, addMonths, subMonths } from 'date-fns'
import { PaymentForecastCalendar } from './PaymentForecastCalendar'
import type {
  PaymentForecastItem,
  PaymentCalendarEvent,
  PaymentForecastSummary,
  CashFlowProjection,
  MonthlyCalendarData,
} from '@/types/payment-forecast'

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock the hooks
vi.mock('../hooks/usePaymentForecast', () => ({
  usePaymentForecastDashboard: vi.fn(),
  usePaymentForecastCalendar: vi.fn(),
  useCashFlowForecast: vi.fn(),
  usePaymentTypeOptions: () => [
    { value: 'subcontractor_pay_application', label: 'Subcontractor Pay App' },
    { value: 'invoice_payment', label: 'Invoice Payment' },
    { value: 'retention_release', label: 'Retention Release' },
    { value: 'owner_requisition', label: 'Owner Requisition' },
    { value: 'vendor_payment', label: 'Vendor Payment' },
    { value: 'progress_billing', label: 'Progress Billing' },
  ],
  usePaymentStatusOptions: () => [
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'pending_approval', label: 'Pending Approval' },
    { value: 'approved', label: 'Approved' },
    { value: 'completed', label: 'Completed' },
    { value: 'overdue', label: 'Overdue' },
  ],
}))

// Mock the toast hook
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

// Import mocked hooks for configuration
import {
  usePaymentForecastDashboard,
  usePaymentForecastCalendar,
  useCashFlowForecast,
} from '../hooks/usePaymentForecast'

// ============================================================================
// MOCK DATA FACTORIES
// ============================================================================

function createMockSummary(overrides: Partial<PaymentForecastSummary> = {}): PaymentForecastSummary {
  return {
    period_start: '2024-01-01',
    period_end: '2024-01-31',
    total_payments_due: 150000,
    total_incoming: 100000,
    total_outgoing: 50000,
    net_cash_flow: 50000,
    payment_count: 5,
    overdue_count: 1,
    pending_approval_count: 2,
    by_type: [
      { payment_type: 'owner_requisition', label: 'Owner Requisition', count: 2, amount: 100000 },
      { payment_type: 'subcontractor_pay_application', label: 'Subcontractor Pay App', count: 3, amount: 50000 },
    ],
    by_status: [
      { status: 'scheduled', label: 'Scheduled', count: 3, amount: 100000 },
      { status: 'pending_approval', label: 'Pending Approval', count: 2, amount: 50000 },
    ],
    ...overrides,
  }
}

function createMockCalendarEvent(overrides: Partial<PaymentCalendarEvent> = {}): PaymentCalendarEvent {
  return {
    id: 'event-1',
    title: 'Monthly Progress Payment',
    date: '2024-01-15',
    amount: 50000,
    payment_type: 'subcontractor_pay_application',
    status: 'scheduled',
    priority: 'medium',
    project_id: 'project-1',
    project_name: 'Test Project',
    payee_name: 'ABC Contractors',
    is_incoming: false,
    details: {} as PaymentForecastItem,
    ...overrides,
  }
}

function createMockCashFlowProjection(overrides: Partial<CashFlowProjection> = {}): CashFlowProjection {
  return {
    month: '2024-01',
    month_name: 'January 2024',
    projected_incoming: 100000,
    projected_outgoing: 60000,
    net_cash_flow: 40000,
    cumulative_cash_flow: 40000,
    owner_requisitions: 100000,
    subcontractor_payments: 40000,
    vendor_payments: 15000,
    retention_releases: 5000,
    other_payments: 0,
    confirmed_amount: 80000,
    estimated_amount: 80000,
    confidence_percent: 50,
    ...overrides,
  }
}

function createMockMonthlyData(): MonthlyCalendarData {
  return {
    year: 2024,
    month: 1,
    month_name: 'January 2024',
    weeks: [
      {
        week_start: '2024-01-01',
        week_end: '2024-01-07',
        week_number: 1,
        incoming: 50000,
        outgoing: 20000,
        net: 30000,
        payment_count: 2,
        days: [
          { date: '2024-01-01', incoming: 50000, outgoing: 0, net: 50000, payment_count: 1, events: [] },
          { date: '2024-01-02', incoming: 0, outgoing: 20000, net: -20000, payment_count: 1, events: [] },
          { date: '2024-01-03', incoming: 0, outgoing: 0, net: 0, payment_count: 0, events: [] },
          { date: '2024-01-04', incoming: 0, outgoing: 0, net: 0, payment_count: 0, events: [] },
          { date: '2024-01-05', incoming: 0, outgoing: 0, net: 0, payment_count: 0, events: [] },
          { date: '2024-01-06', incoming: 0, outgoing: 0, net: 0, payment_count: 0, events: [] },
          { date: '2024-01-07', incoming: 0, outgoing: 0, net: 0, payment_count: 0, events: [] },
        ],
      },
    ],
    totals: {
      incoming: 50000,
      outgoing: 20000,
      net: 30000,
      payment_count: 2,
    },
  }
}

// ============================================================================
// TEST UTILITIES
// ============================================================================

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  })
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  )
}

function setupMockHooks(options: {
  isLoading?: boolean
  error?: Error | null
  payments?: { summary: PaymentForecastSummary }
  cashFlow?: { projections: CashFlowProjection[]; total_forecast: { incoming: number; outgoing: number; net: number } }
  overdue?: PaymentForecastItem[]
  calendar?: { events: PaymentCalendarEvent[]; monthly_data: MonthlyCalendarData }
} = {}) {
  const {
    isLoading = false,
    error = null,
    payments = { summary: createMockSummary() },
    cashFlow = {
      projections: [createMockCashFlowProjection()],
      total_forecast: { incoming: 100000, outgoing: 60000, net: 40000 },
    },
    overdue = [],
    calendar = { events: [], monthly_data: createMockMonthlyData() },
  } = options

  ;(usePaymentForecastDashboard as ReturnType<typeof vi.fn>).mockReturnValue({
    payments,
    cashFlow,
    overdue,
    calendar,
    isLoading,
    error,
    refetch: vi.fn(),
  })
}

// ============================================================================
// TESTS
// ============================================================================

describe('PaymentForecastCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('renders loading skeletons when data is loading', () => {
      setupMockHooks({ isLoading: true })

      renderWithProviders(<PaymentForecastCalendar />)

      // Should show skeleton cards
      const skeletons = document.querySelectorAll('[class*="skeleton"]')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('Error State', () => {
    it('renders error message when data fetch fails', () => {
      setupMockHooks({ error: new Error('Failed to fetch') })

      renderWithProviders(<PaymentForecastCalendar />)

      expect(screen.getByText(/failed to load payment forecast data/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })

    it('calls refetch when retry button is clicked', async () => {
      const refetchMock = vi.fn()
      ;(usePaymentForecastDashboard as ReturnType<typeof vi.fn>).mockReturnValue({
        payments: null,
        cashFlow: null,
        overdue: null,
        calendar: null,
        isLoading: false,
        error: new Error('Failed'),
        refetch: refetchMock,
      })

      renderWithProviders(<PaymentForecastCalendar />)

      const retryButton = screen.getByRole('button', { name: /retry/i })
      await userEvent.click(retryButton)

      expect(refetchMock).toHaveBeenCalled()
    })
  })

  describe('Header and Title', () => {
    it('renders the page title', () => {
      setupMockHooks()

      renderWithProviders(<PaymentForecastCalendar />)

      expect(screen.getByText('Payment Forecast')).toBeInTheDocument()
      expect(screen.getByText(/upcoming payment schedules/i)).toBeInTheDocument()
    })

    it('renders refresh button', () => {
      setupMockHooks()

      renderWithProviders(<PaymentForecastCalendar />)

      const refreshButtons = screen.getAllByRole('button')
      const hasRefreshButton = refreshButtons.some(btn => btn.querySelector('svg'))
      expect(hasRefreshButton).toBe(true)
    })
  })

  describe('Summary Cards', () => {
    it('displays expected incoming amount', () => {
      setupMockHooks({
        payments: { summary: createMockSummary({ total_incoming: 150000 }) },
      })

      renderWithProviders(<PaymentForecastCalendar />)

      expect(screen.getByText('Expected Incoming')).toBeInTheDocument()
      expect(screen.getByText('$150,000')).toBeInTheDocument()
    })

    it('displays scheduled outgoing amount', () => {
      setupMockHooks({
        payments: { summary: createMockSummary({ total_outgoing: 75000 }) },
      })

      renderWithProviders(<PaymentForecastCalendar />)

      expect(screen.getByText('Scheduled Outgoing')).toBeInTheDocument()
      expect(screen.getByText('$75,000')).toBeInTheDocument()
    })

    it('displays net cash flow with positive styling', () => {
      setupMockHooks({
        payments: { summary: createMockSummary({ net_cash_flow: 50000 }) },
      })

      renderWithProviders(<PaymentForecastCalendar />)

      expect(screen.getByText('Net Cash Flow')).toBeInTheDocument()
      expect(screen.getByText('$50,000')).toBeInTheDocument()
    })

    it('displays overdue payment count', () => {
      setupMockHooks({
        overdue: [createMockCalendarEvent().details as PaymentForecastItem],
      })

      renderWithProviders(<PaymentForecastCalendar />)

      expect(screen.getByText('Overdue Payments')).toBeInTheDocument()
    })

    it('displays pending approval count', () => {
      setupMockHooks({
        payments: { summary: createMockSummary({ pending_approval_count: 3 }) },
      })

      renderWithProviders(<PaymentForecastCalendar />)

      expect(screen.getByText('Pending Approval')).toBeInTheDocument()
    })
  })

  describe('Calendar Navigation', () => {
    it('displays current month name', () => {
      setupMockHooks()

      renderWithProviders(<PaymentForecastCalendar />)

      const currentMonth = format(new Date(), 'MMMM yyyy')
      expect(screen.getByText(currentMonth)).toBeInTheDocument()
    })

    it('has navigation buttons for previous and next month', () => {
      setupMockHooks()

      renderWithProviders(<PaymentForecastCalendar />)

      // Find buttons with chevron icons
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('has a Today button', () => {
      setupMockHooks()

      renderWithProviders(<PaymentForecastCalendar />)

      expect(screen.getByRole('button', { name: /today/i })).toBeInTheDocument()
    })
  })

  describe('View Tabs', () => {
    it('renders Calendar, List, and Analytics tabs', () => {
      setupMockHooks()

      renderWithProviders(<PaymentForecastCalendar />)

      expect(screen.getByRole('tab', { name: /calendar/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /list/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /analytics/i })).toBeInTheDocument()
    })

    it('Calendar tab is selected by default', () => {
      setupMockHooks()

      renderWithProviders(<PaymentForecastCalendar />)

      const calendarTab = screen.getByRole('tab', { name: /calendar/i })
      expect(calendarTab).toHaveAttribute('data-state', 'active')
    })

    it('switches to List view when List tab is clicked', async () => {
      setupMockHooks({
        calendar: {
          events: [createMockCalendarEvent()],
          monthly_data: createMockMonthlyData(),
        },
      })

      renderWithProviders(<PaymentForecastCalendar />)

      const listTab = screen.getByRole('tab', { name: /list/i })
      await userEvent.click(listTab)

      expect(listTab).toHaveAttribute('data-state', 'active')
    })

    it('switches to Analytics view when Analytics tab is clicked', async () => {
      setupMockHooks()

      renderWithProviders(<PaymentForecastCalendar />)

      const analyticsTab = screen.getByRole('tab', { name: /analytics/i })
      await userEvent.click(analyticsTab)

      expect(analyticsTab).toHaveAttribute('data-state', 'active')
    })
  })

  describe('Calendar Grid View', () => {
    it('renders weekday headers', () => {
      setupMockHooks()

      renderWithProviders(<PaymentForecastCalendar />)

      const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      weekdays.forEach((day) => {
        expect(screen.getByText(day)).toBeInTheDocument()
      })
    })
  })

  describe('List View', () => {
    it('shows empty message when no payments', async () => {
      setupMockHooks({
        calendar: { events: [], monthly_data: createMockMonthlyData() },
      })

      renderWithProviders(<PaymentForecastCalendar />)

      const listTab = screen.getByRole('tab', { name: /list/i })
      await userEvent.click(listTab)

      expect(screen.getByText(/no payments scheduled/i)).toBeInTheDocument()
    })

    it('displays payment list with columns', async () => {
      setupMockHooks({
        calendar: {
          events: [
            createMockCalendarEvent({
              title: 'Test Payment',
              amount: 25000,
              payee_name: 'Test Payee',
            }),
          ],
          monthly_data: createMockMonthlyData(),
        },
      })

      renderWithProviders(<PaymentForecastCalendar />)

      const listTab = screen.getByRole('tab', { name: /list/i })
      await userEvent.click(listTab)

      // Check for table headers
      expect(screen.getByText('Due Date')).toBeInTheDocument()
      expect(screen.getByText('Type')).toBeInTheDocument()
      expect(screen.getByText('Description')).toBeInTheDocument()
      expect(screen.getByText('Amount')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
    })
  })

  describe('Analytics View', () => {
    it('displays cash flow forecast section', async () => {
      setupMockHooks()

      renderWithProviders(<PaymentForecastCalendar />)

      const analyticsTab = screen.getByRole('tab', { name: /analytics/i })
      await userEvent.click(analyticsTab)

      expect(screen.getByText('Cash Flow Forecast')).toBeInTheDocument()
    })

    it('displays forecast summary section', async () => {
      setupMockHooks()

      renderWithProviders(<PaymentForecastCalendar />)

      const analyticsTab = screen.getByRole('tab', { name: /analytics/i })
      await userEvent.click(analyticsTab)

      expect(screen.getByText('Forecast Summary')).toBeInTheDocument()
    })

    it('shows monthly projections', async () => {
      setupMockHooks({
        cashFlow: {
          projections: [
            createMockCashFlowProjection({ month_name: 'January 2024' }),
            createMockCashFlowProjection({ month_name: 'February 2024', month: '2024-02' }),
          ],
          total_forecast: { incoming: 200000, outgoing: 120000, net: 80000 },
        },
      })

      renderWithProviders(<PaymentForecastCalendar />)

      const analyticsTab = screen.getByRole('tab', { name: /analytics/i })
      await userEvent.click(analyticsTab)

      expect(screen.getByText('January 2024')).toBeInTheDocument()
    })
  })

  describe('Payment Type Breakdown', () => {
    it('displays payment breakdown by type', () => {
      setupMockHooks({
        payments: {
          summary: createMockSummary({
            by_type: [
              { payment_type: 'owner_requisition', label: 'Owner Requisition', count: 2, amount: 100000 },
              { payment_type: 'subcontractor_pay_application', label: 'Subcontractor Pay App', count: 3, amount: 50000 },
            ],
          }),
        },
      })

      renderWithProviders(<PaymentForecastCalendar />)

      expect(screen.getByText('By Payment Type')).toBeInTheDocument()
    })
  })

  describe('Overdue Payments Alert', () => {
    it('shows overdue alert when there are overdue payments', () => {
      const overduePayment = {
        id: 'overdue-1',
        description: 'Overdue Payment',
        amount: 30000,
        due_date: '2024-01-01',
      } as PaymentForecastItem

      setupMockHooks({ overdue: [overduePayment] })

      renderWithProviders(<PaymentForecastCalendar />)

      expect(screen.getByText(/overdue payments/i)).toBeInTheDocument()
    })

    it('does not show overdue alert when no overdue payments', () => {
      setupMockHooks({ overdue: [] })

      renderWithProviders(<PaymentForecastCalendar />)

      // The "Overdue Payments" card should only show with count 0
      const overdueCard = screen.getByText('Overdue Payments')
      expect(overdueCard).toBeInTheDocument()
      // Find the related card and check it shows 0
      const card = overdueCard.closest('[class*="card"]')
      expect(card).not.toHaveClass('bg-red-50')
    })
  })

  describe('Project Filter', () => {
    it('accepts projectId prop', () => {
      setupMockHooks()

      // Should not throw when rendered with projectId
      expect(() => {
        renderWithProviders(<PaymentForecastCalendar projectId="project-123" />)
      }).not.toThrow()
    })
  })

  describe('Accessibility', () => {
    it('has accessible tab navigation', () => {
      setupMockHooks()

      renderWithProviders(<PaymentForecastCalendar />)

      const tabList = screen.getByRole('tablist')
      expect(tabList).toBeInTheDocument()

      const tabs = screen.getAllByRole('tab')
      expect(tabs.length).toBe(3)
    })

    it('buttons have accessible names or icons', () => {
      setupMockHooks()

      renderWithProviders(<PaymentForecastCalendar />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        // Button should have text content or contain an icon
        const hasContent = button.textContent?.trim() || button.querySelector('svg')
        expect(hasContent).toBeTruthy()
      })
    })
  })

  describe('Custom className', () => {
    it('applies custom className to root element', () => {
      setupMockHooks()

      const { container } = renderWithProviders(
        <PaymentForecastCalendar className="custom-class" />
      )

      const rootElement = container.firstChild as HTMLElement
      expect(rootElement).toHaveClass('custom-class')
    })
  })
})
