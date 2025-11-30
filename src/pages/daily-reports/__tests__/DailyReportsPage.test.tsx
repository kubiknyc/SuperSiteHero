import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { DailyReportsPage } from '../DailyReportsPage'
import { useMyProjects } from '@/features/projects/hooks/useProjects'
import { useDailyReports } from '@/features/daily-reports/hooks/useDailyReports'
import type { DailyReport } from '@/types/database'

// Mock modules
vi.mock('@/features/projects/hooks/useProjects')
vi.mock('@/features/daily-reports/hooks/useDailyReports')

const mockProjects = [
  { id: 'proj-1', name: 'Project Alpha', status: 'active' },
  { id: 'proj-2', name: 'Project Beta', status: 'active' },
]

const mockReports: DailyReport[] = [
  {
    id: 'report-1',
    report_number: 'DR-001',
    project_id: 'proj-1',
    report_date: '2025-01-15',
    weather_condition: 'Sunny',
    temperature_high: 75,
    temperature_low: 60,
    total_workers: 25,
    work_completed: 'Foundation work completed',
    issues: 'Minor delay due to equipment',
    observations: 'Good progress overall',
    comments: 'Team performed well',
    status: 'submitted',
    created_by: 'john@example.com',
    reporter_id: 'user-1',
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
    approved_at: null,
    approved_by: null,
    deleted_at: null,
    pdf_generated_at: null,
    pdf_url: null,
    precipitation: null,
    production_data: null,
    reviewer_id: null,
    submitted_at: '2025-01-15T12:00:00Z',
    weather_delay_notes: null,
    weather_delays: false,
    weather_source: null,
    wind_speed: null,
  },
  {
    id: 'report-2',
    report_number: 'DR-002',
    project_id: 'proj-1',
    report_date: '2025-01-20',
    weather_condition: 'Cloudy',
    temperature_high: 68,
    temperature_low: 55,
    total_workers: 30,
    work_completed: 'Framing started',
    issues: null,
    observations: 'Weather cleared up',
    comments: null,
    status: 'draft',
    created_by: 'jane@example.com',
    reporter_id: 'user-2',
    created_at: '2025-01-20T10:00:00Z',
    updated_at: '2025-01-20T10:00:00Z',
    approved_at: null,
    approved_by: null,
    deleted_at: null,
    pdf_generated_at: null,
    pdf_url: null,
    precipitation: null,
    production_data: null,
    reviewer_id: null,
    submitted_at: null,
    weather_delay_notes: null,
    weather_delays: false,
    weather_source: null,
    wind_speed: null,
  },
  {
    id: 'report-3',
    report_number: 'DR-003',
    project_id: 'proj-1',
    report_date: '2025-01-25',
    weather_condition: 'Rainy',
    temperature_high: 62,
    temperature_low: 50,
    total_workers: 10,
    work_completed: 'Waterproofing applied',
    issues: 'Rain caused delays',
    observations: 'Need better cover',
    comments: null,
    status: 'approved',
    created_by: 'john@example.com',
    reporter_id: 'user-1',
    created_at: '2025-01-25T10:00:00Z',
    updated_at: '2025-01-25T16:00:00Z',
    approved_at: '2025-01-25T16:00:00Z',
    approved_by: 'manager@example.com',
    deleted_at: null,
    pdf_generated_at: null,
    pdf_url: null,
    precipitation: 0.5,
    production_data: null,
    reviewer_id: 'manager-1',
    submitted_at: '2025-01-25T14:00:00Z',
    weather_delay_notes: 'Heavy rain in afternoon',
    weather_delays: true,
    weather_source: null,
    wind_speed: null,
  },
  {
    id: 'report-4',
    report_number: 'DR-004',
    project_id: 'proj-1',
    report_date: '2025-02-01',
    weather_condition: 'Sunny',
    temperature_high: 72,
    temperature_low: 58,
    total_workers: 35,
    work_completed: 'Electrical rough-in completed',
    issues: null,
    observations: 'Ahead of schedule',
    comments: 'Great teamwork',
    status: 'in_review',
    created_by: 'bob@example.com',
    reporter_id: 'user-3',
    created_at: '2025-02-01T10:00:00Z',
    updated_at: '2025-02-01T10:00:00Z',
    approved_at: null,
    approved_by: null,
    deleted_at: null,
    pdf_generated_at: null,
    pdf_url: null,
    precipitation: null,
    production_data: null,
    reviewer_id: 'manager-1',
    submitted_at: '2025-02-01T11:00:00Z',
    weather_delay_notes: null,
    weather_delays: false,
    weather_source: null,
    wind_speed: null,
  },
  {
    id: 'report-5',
    report_number: 'DR-005',
    project_id: 'proj-2',
    report_date: '2025-01-18',
    weather_condition: 'Sunny',
    temperature_high: 70,
    temperature_low: 56,
    total_workers: 20,
    work_completed: 'Site preparation',
    issues: null,
    observations: 'Good start',
    comments: null,
    status: 'submitted',
    created_by: 'jane@example.com',
    reporter_id: 'user-2',
    created_at: '2025-01-18T10:00:00Z',
    updated_at: '2025-01-18T10:00:00Z',
    approved_at: null,
    approved_by: null,
    deleted_at: null,
    pdf_generated_at: null,
    pdf_url: null,
    precipitation: null,
    production_data: null,
    reviewer_id: null,
    submitted_at: '2025-01-18T12:00:00Z',
    weather_delay_notes: null,
    weather_delays: false,
    weather_source: null,
    wind_speed: null,
  },
  {
    id: 'report-6',
    report_number: 'DR-006',
    project_id: 'proj-1',
    report_date: '2025-01-22',
    weather_condition: null,
    temperature_high: null,
    temperature_low: null,
    total_workers: 28,
    work_completed: 'HVAC installation',
    issues: null,
    observations: null,
    comments: null,
    status: 'draft',
    created_by: null,
    reporter_id: 'user-1',
    created_at: '2025-01-22T10:00:00Z',
    updated_at: '2025-01-22T10:00:00Z',
    approved_at: null,
    approved_by: null,
    deleted_at: null,
    pdf_generated_at: null,
    pdf_url: null,
    precipitation: null,
    production_data: null,
    reviewer_id: null,
    submitted_at: null,
    weather_delay_notes: null,
    weather_delays: false,
    weather_source: null,
    wind_speed: null,
  },
  {
    id: 'report-7',
    report_number: 'DR-007',
    project_id: 'proj-1',
    report_date: '2025-01-28',
    weather_condition: 'Cloudy',
    temperature_high: 65,
    temperature_low: 52,
    total_workers: 50,
    work_completed: 'Drywall installation',
    issues: null,
    observations: 'Large crew today',
    comments: null,
    status: 'submitted',
    created_by: 'john@example.com',
    reporter_id: 'user-1',
    created_at: '2025-01-28T10:00:00Z',
    updated_at: '2025-01-28T10:00:00Z',
    approved_at: null,
    approved_by: null,
    deleted_at: null,
    pdf_generated_at: null,
    pdf_url: null,
    precipitation: null,
    production_data: null,
    reviewer_id: null,
    submitted_at: '2025-01-28T12:00:00Z',
    weather_delay_notes: null,
    weather_delays: false,
    weather_source: null,
    wind_speed: null,
  },
  {
    id: 'report-8',
    report_number: 'DR-008',
    project_id: 'proj-1',
    report_date: '2025-01-30',
    weather_condition: 'Sunny',
    temperature_high: 73,
    temperature_low: 59,
    total_workers: 0,
    work_completed: 'Weekend - no work',
    issues: null,
    observations: 'Day off',
    comments: null,
    status: 'approved',
    created_by: 'john@example.com',
    reporter_id: 'user-1',
    created_at: '2025-01-30T10:00:00Z',
    updated_at: '2025-01-30T16:00:00Z',
    approved_at: '2025-01-30T16:00:00Z',
    approved_by: 'manager@example.com',
    deleted_at: null,
    pdf_generated_at: null,
    pdf_url: null,
    precipitation: null,
    production_data: null,
    reviewer_id: 'manager-1',
    submitted_at: '2025-01-30T11:00:00Z',
    weather_delay_notes: null,
    weather_delays: false,
    weather_source: null,
    wind_speed: null,
  },
  {
    id: 'report-9',
    report_number: 'DR-009',
    project_id: 'proj-1',
    report_date: '2025-02-05',
    weather_condition: 'Sunny',
    temperature_high: 76,
    temperature_low: 61,
    total_workers: 32,
    work_completed: 'Painting started',
    issues: null,
    observations: 'Good conditions',
    comments: null,
    status: 'draft',
    created_by: 'jane@example.com',
    reporter_id: 'user-2',
    created_at: '2025-02-05T10:00:00Z',
    updated_at: '2025-02-05T10:00:00Z',
    approved_at: null,
    approved_by: null,
    deleted_at: null,
    pdf_generated_at: null,
    pdf_url: null,
    precipitation: null,
    production_data: null,
    reviewer_id: null,
    submitted_at: null,
    weather_delay_notes: null,
    weather_delays: false,
    weather_source: null,
    wind_speed: null,
  },
  {
    id: 'report-10',
    report_number: 'DR-010',
    project_id: 'proj-1',
    report_date: '2025-01-05',
    weather_condition: 'Rainy',
    temperature_high: 60,
    temperature_low: 48,
    total_workers: 15,
    work_completed: 'Site survey',
    issues: 'Muddy conditions',
    observations: 'Rain expected all week',
    comments: null,
    status: 'approved',
    created_by: 'bob@example.com',
    reporter_id: 'user-3',
    created_at: '2025-01-05T10:00:00Z',
    updated_at: '2025-01-05T16:00:00Z',
    approved_at: '2025-01-05T16:00:00Z',
    approved_by: 'manager@example.com',
    deleted_at: null,
    pdf_generated_at: null,
    pdf_url: null,
    precipitation: 0.8,
    production_data: null,
    reviewer_id: 'manager-1',
    submitted_at: '2025-01-05T11:00:00Z',
    weather_delay_notes: null,
    weather_delays: false,
    weather_source: null,
    wind_speed: null,
  },
]

describe('DailyReportsPage', () => {
  const renderPage = (initialUrl = '/daily-reports') => {
    return render(
      <MemoryRouter initialEntries={[initialUrl]}>
        <DailyReportsPage />
      </MemoryRouter>
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useMyProjects as any).mockReturnValue({
      data: mockProjects,
      isLoading: false,
      error: null,
    })
    ;(useDailyReports as any).mockReturnValue({
      data: mockReports,
      isLoading: false,
      error: null,
    })
  })

  // Helper functions
  const openMultiSelectFilter = async (filterLabel: string) => {
    const user = userEvent.setup()
    const button = screen.getByRole('button', { name: new RegExp(filterLabel, 'i') })
    await user.click(button)
  }

  const selectFilterOption = async (optionLabel: string) => {
    const user = userEvent.setup()
    const option = screen.getByRole('option', { name: optionLabel })
    await user.click(option)
  }

  const expectReportVisible = (reportNumber: string) => {
    expect(screen.getByText(reportNumber)).toBeInTheDocument()
  }

  const expectReportNotVisible = (reportNumber: string) => {
    expect(screen.queryByText(reportNumber)).not.toBeInTheDocument()
  }

  describe('Initial Rendering', () => {
    it('should render page title and "New Report" button', () => {
      renderPage()

      expect(screen.getByText('Daily Reports')).toBeInTheDocument()
      expect(screen.getByText('New Report')).toBeInTheDocument()
    })

    it('should render search input', () => {
      renderPage()

      expect(
        screen.getByPlaceholderText('Search reports by number, work completed, issues...')
      ).toBeInTheDocument()
    })

    it('should render Status and Weather multi-select filters', () => {
      renderPage()

      expect(screen.getByRole('button', { name: /status/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /weather/i })).toBeInTheDocument()
    })

    it('should render "Show Advanced" button', () => {
      renderPage()

      expect(screen.getByRole('button', { name: /show advanced/i })).toBeInTheDocument()
    })
  })

  describe('Search Functionality', () => {
    it('should filter reports by search query (report number)', async () => {
      const user = userEvent.setup()
      renderPage()

      const searchInput = screen.getByPlaceholderText(
        'Search reports by number, work completed, issues...'
      )
      await user.type(searchInput, 'DR-001')

      await waitFor(() => {
        expectReportVisible('DR-001')
        expectReportNotVisible('DR-002')
        expectReportNotVisible('DR-003')
      })
    })

    it('should filter reports by work completed text', async () => {
      const user = userEvent.setup()
      renderPage()

      const searchInput = screen.getByPlaceholderText(
        'Search reports by number, work completed, issues...'
      )
      await user.type(searchInput, 'Foundation')

      await waitFor(() => {
        expectReportVisible('DR-001')
        expectReportNotVisible('DR-002')
      })
    })

    it('should filter reports by issues text', async () => {
      const user = userEvent.setup()
      renderPage()

      const searchInput = screen.getByPlaceholderText(
        'Search reports by number, work completed, issues...'
      )
      await user.type(searchInput, 'equipment')

      await waitFor(() => {
        expectReportVisible('DR-001')
        expectReportNotVisible('DR-003')
      })
    })

    it('should search case-insensitively', async () => {
      const user = userEvent.setup()
      renderPage()

      const searchInput = screen.getByPlaceholderText(
        'Search reports by number, work completed, issues...'
      )
      await user.type(searchInput, 'FOUNDATION')

      await waitFor(() => {
        expectReportVisible('DR-001')
      })
    })

    it('should show "Clear" button when search active', async () => {
      const user = userEvent.setup()
      renderPage()

      expect(screen.queryByText(/clear/i)).not.toBeInTheDocument()

      const searchInput = screen.getByPlaceholderText(
        'Search reports by number, work completed, issues...'
      )
      await user.type(searchInput, 'test')

      await waitFor(() => {
        expect(screen.getByText(/clear \(1\)/i)).toBeInTheDocument()
      })
    })
  })

  describe('Status Filter', () => {
    it('should filter by single status', async () => {
      renderPage()

      await openMultiSelectFilter('Status')
      await selectFilterOption('Draft')

      await waitFor(() => {
        expectReportVisible('DR-002') // draft
        expectReportVisible('DR-006') // draft
        expectReportNotVisible('DR-001') // submitted
      })
    })

    it('should filter by multiple statuses', async () => {
      renderPage()

      await openMultiSelectFilter('Status')
      await selectFilterOption('Draft')
      await selectFilterOption('Submitted')

      await waitFor(() => {
        expectReportVisible('DR-001') // submitted
        expectReportVisible('DR-002') // draft
        expectReportNotVisible('DR-003') // approved
      })
    })

    it('should show count badge on status filter', async () => {
      renderPage()

      await openMultiSelectFilter('Status')
      await selectFilterOption('Draft')

      await waitFor(() => {
        const statusButton = screen.getByRole('button', { name: /status/i })
        expect(within(statusButton).getByText('1')).toBeInTheDocument()
      })
    })

    it('should include status filter in active count', async () => {
      renderPage()

      await openMultiSelectFilter('Status')
      await selectFilterOption('Draft')
      await selectFilterOption('Submitted')

      await waitFor(() => {
        expect(screen.getByText(/clear \(2\)/i)).toBeInTheDocument()
      })
    })
  })

  describe('Date Range Filter', () => {
    it('should show advanced filters panel when toggled', async () => {
      const user = userEvent.setup()
      renderPage()

      expect(screen.queryByText('Date Range')).not.toBeInTheDocument()

      const advancedButton = screen.getByRole('button', { name: /show advanced/i })
      await user.click(advancedButton)

      expect(screen.getByText('Date Range')).toBeInTheDocument()
    })

    it('should filter by date range (from date)', async () => {
      const user = userEvent.setup()
      renderPage()

      const advancedButton = screen.getByRole('button', { name: /show advanced/i })
      await user.click(advancedButton)

      const dateInputs = screen.getAllByPlaceholderText('From')
      await user.type(dateInputs[0], '2025-01-20')

      await waitFor(() => {
        expectReportNotVisible('DR-001') // 2025-01-15
        expectReportVisible('DR-002') // 2025-01-20
        expectReportVisible('DR-003') // 2025-01-25
      })
    })

    it('should filter by date range (to date)', async () => {
      const user = userEvent.setup()
      renderPage()

      const advancedButton = screen.getByRole('button', { name: /show advanced/i })
      await user.click(advancedButton)

      const dateInputs = screen.getAllByPlaceholderText('To')
      await user.type(dateInputs[0], '2025-01-20')

      await waitFor(() => {
        expectReportVisible('DR-001') // 2025-01-15
        expectReportVisible('DR-002') // 2025-01-20
        expectReportNotVisible('DR-003') // 2025-01-25
      })
    })

    it('should filter by complete date range (from and to)', async () => {
      const user = userEvent.setup()
      renderPage()

      const advancedButton = screen.getByRole('button', { name: /show advanced/i })
      await user.click(advancedButton)

      const fromInputs = screen.getAllByPlaceholderText('From')
      const toInputs = screen.getAllByPlaceholderText('To')
      await user.type(fromInputs[0], '2025-01-15')
      await user.type(toInputs[0], '2025-01-25')

      await waitFor(() => {
        expectReportVisible('DR-001') // 2025-01-15
        expectReportVisible('DR-002') // 2025-01-20
        expectReportVisible('DR-003') // 2025-01-25
        expectReportNotVisible('DR-004') // 2025-02-01
      })
    })

    it('should persist advanced panel state', async () => {
      const user = userEvent.setup()
      renderPage()

      const advancedButton = screen.getByRole('button', { name: /show advanced/i })
      await user.click(advancedButton)

      expect(screen.getByText(/hide advanced/i)).toBeInTheDocument()
    })
  })

  describe('Weather Filter', () => {
    it('should populate weather options from reports', async () => {
      renderPage()

      await openMultiSelectFilter('Weather')

      expect(screen.getByRole('option', { name: 'Sunny' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Cloudy' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Rainy' })).toBeInTheDocument()
    })

    it('should filter by single weather condition', async () => {
      renderPage()

      await openMultiSelectFilter('Weather')
      await selectFilterOption('Sunny')

      await waitFor(() => {
        expectReportVisible('DR-001') // Sunny
        expectReportNotVisible('DR-002') // Cloudy
      })
    })

    it('should filter by multiple weather conditions', async () => {
      renderPage()

      await openMultiSelectFilter('Weather')
      await selectFilterOption('Sunny')
      await selectFilterOption('Rainy')

      await waitFor(() => {
        expectReportVisible('DR-001') // Sunny
        expectReportVisible('DR-003') // Rainy
        expectReportNotVisible('DR-002') // Cloudy
      })
    })

    it('should not show weather filter if no weather data', () => {
      (useDailyReports as any).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      })

      renderPage()

      expect(screen.queryByRole('button', { name: /weather/i })).not.toBeInTheDocument()
    })
  })

  describe('Worker Count Filter', () => {
    it('should filter by minimum worker count', async () => {
      const user = userEvent.setup()
      renderPage()

      const advancedButton = screen.getByRole('button', { name: /show advanced/i })
      await user.click(advancedButton)

      const minInputs = screen.getAllByPlaceholderText('Min')
      await user.type(minInputs[0], '30')

      await waitFor(() => {
        expectReportNotVisible('DR-001') // 25 workers
        expectReportVisible('DR-002') // 30 workers
        expectReportVisible('DR-004') // 35 workers
      })
    })

    it('should filter by maximum worker count', async () => {
      const user = userEvent.setup()
      renderPage()

      const advancedButton = screen.getByRole('button', { name: /show advanced/i })
      await user.click(advancedButton)

      const maxInputs = screen.getAllByPlaceholderText('Max')
      await user.type(maxInputs[0], '25')

      await waitFor(() => {
        expectReportVisible('DR-001') // 25 workers
        expectReportVisible('DR-003') // 10 workers
        expectReportNotVisible('DR-002') // 30 workers
      })
    })

    it('should filter by worker count range (min and max)', async () => {
      const user = userEvent.setup()
      renderPage()

      const advancedButton = screen.getByRole('button', { name: /show advanced/i })
      await user.click(advancedButton)

      const minInputs = screen.getAllByPlaceholderText('Min')
      const maxInputs = screen.getAllByPlaceholderText('Max')
      await user.type(minInputs[0], '20')
      await user.type(maxInputs[0], '30')

      await waitFor(() => {
        expectReportVisible('DR-001') // 25 workers
        expectReportVisible('DR-002') // 30 workers
        expectReportNotVisible('DR-003') // 10 workers
        expectReportNotVisible('DR-004') // 35 workers
      })
    })

    it('should handle empty worker count gracefully', async () => {
      const user = userEvent.setup()
      renderPage()

      const advancedButton = screen.getByRole('button', { name: /show advanced/i })
      await user.click(advancedButton)

      const minInputs = screen.getAllByPlaceholderText('Min')
      await user.type(minInputs[0], '5')

      await waitFor(() => {
        expectReportVisible('DR-008') // 0 workers should still be visible if min is 0 or empty
      })
    })
  })

  describe('Created By Filter', () => {
    it('should populate creator options from reports', async () => {
      const user = userEvent.setup()
      renderPage()

      const advancedButton = screen.getByRole('button', { name: /show advanced/i })
      await user.click(advancedButton)

      const createdBySelect = screen.getByRole('combobox', { name: /created by/i })
      expect(createdBySelect).toBeInTheDocument()

      const options = within(createdBySelect).getAllByRole('option')
      const optionTexts = options.map(opt => opt.textContent)
      expect(optionTexts).toContain('john@example.com')
      expect(optionTexts).toContain('jane@example.com')
      expect(optionTexts).toContain('bob@example.com')
    })

    it('should filter by selected creator', async () => {
      const user = userEvent.setup()
      renderPage()

      const advancedButton = screen.getByRole('button', { name: /show advanced/i })
      await user.click(advancedButton)

      const createdBySelect = screen.getByRole('combobox', { name: /created by/i })
      await user.selectOptions(createdBySelect, 'john@example.com')

      await waitFor(() => {
        expectReportVisible('DR-001') // john
        expectReportNotVisible('DR-002') // jane
      })
    })

    it('should not show creator filter if no creators', () => {
      (useDailyReports as any).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      })

      renderPage()

      const advancedButton = screen.getByRole('button', { name: /show advanced/i })
      fireEvent.click(advancedButton)

      expect(screen.queryByRole('combobox', { name: /created by/i })).not.toBeInTheDocument()
    })

    it('should handle null created_by values', async () => {
      const user = userEvent.setup()
      renderPage()

      const advancedButton = screen.getByRole('button', { name: /show advanced/i })
      await user.click(advancedButton)

      const createdBySelect = screen.getByRole('combobox', { name: /created by/i })
      await user.selectOptions(createdBySelect, 'john@example.com')

      await waitFor(() => {
        expectReportNotVisible('DR-006') // null creator
      })
    })
  })

  describe('Combined Filters', () => {
    it('should apply multiple filters simultaneously', async () => {
      const user = userEvent.setup()
      renderPage()

      // Search filter
      const searchInput = screen.getByPlaceholderText(
        'Search reports by number, work completed, issues...'
      )
      await user.type(searchInput, 'work')

      // Status filter
      await openMultiSelectFilter('Status')
      await selectFilterOption('Submitted')

      await waitFor(() => {
        expectReportVisible('DR-001') // submitted, has "work" in work_completed
        expectReportNotVisible('DR-002') // draft
      })
    })

    it('should show correct active filter count', async () => {
      const user = userEvent.setup()
      renderPage()

      const searchInput = screen.getByPlaceholderText(
        'Search reports by number, work completed, issues...'
      )
      await user.type(searchInput, 'test')

      await openMultiSelectFilter('Status')
      await selectFilterOption('Draft')
      await selectFilterOption('Submitted')

      await waitFor(() => {
        expect(screen.getByText(/clear \(3\)/i)).toBeInTheDocument()
      })
    })

    it('should maintain all filters when adding new filter', async () => {
      const user = userEvent.setup()
      renderPage()

      const searchInput = screen.getByPlaceholderText(
        'Search reports by number, work completed, issues...'
      )
      await user.type(searchInput, 'Foundation')

      await openMultiSelectFilter('Status')
      await selectFilterOption('Submitted')

      await openMultiSelectFilter('Weather')
      await selectFilterOption('Sunny')

      await waitFor(() => {
        expect(screen.getByText(/clear \(3\)/i)).toBeInTheDocument()
        expectReportVisible('DR-001')
      })
    })

    it('should update results when removing filter', async () => {
      const user = userEvent.setup()
      renderPage()

      await openMultiSelectFilter('Status')
      await selectFilterOption('Draft')

      await waitFor(() => {
        expectReportNotVisible('DR-001')
      })

      // Remove filter
      await openMultiSelectFilter('Status')
      await selectFilterOption('Draft')

      await waitFor(() => {
        expectReportVisible('DR-001')
      })
    })

    it('should show empty state when no results match', async () => {
      const user = userEvent.setup()
      renderPage()

      const searchInput = screen.getByPlaceholderText(
        'Search reports by number, work completed, issues...'
      )
      await user.type(searchInput, 'NONEXISTENT_SEARCH_TERM_12345')

      await waitFor(() => {
        expect(
          screen.getByText(/no reports match your current filters/i)
        ).toBeInTheDocument()
      })
    })
  })

  describe('Clear Filters', () => {
    it('should clear all filters when button clicked', async () => {
      const user = userEvent.setup()
      renderPage()

      const searchInput = screen.getByPlaceholderText(
        'Search reports by number, work completed, issues...'
      )
      await user.type(searchInput, 'test')

      await openMultiSelectFilter('Status')
      await selectFilterOption('Draft')

      const clearButton = screen.getByText(/clear \(2\)/i)
      await user.click(clearButton)

      await waitFor(() => {
        expect(screen.queryByText(/clear/i)).not.toBeInTheDocument()
        expect(searchInput).toHaveValue('')
      })
    })

    it('should reset active filter count to 0', async () => {
      const user = userEvent.setup()
      renderPage()

      const searchInput = screen.getByPlaceholderText(
        'Search reports by number, work completed, issues...'
      )
      await user.type(searchInput, 'test')

      const clearButton = screen.getByText(/clear \(1\)/i)
      await user.click(clearButton)

      await waitFor(() => {
        expect(screen.queryByText(/clear/i)).not.toBeInTheDocument()
      })
    })

    it('should close advanced panel when clearing', async () => {
      const user = userEvent.setup()
      renderPage()

      const advancedButton = screen.getByRole('button', { name: /show advanced/i })
      await user.click(advancedButton)

      const searchInput = screen.getByPlaceholderText(
        'Search reports by number, work completed, issues...'
      )
      await user.type(searchInput, 'test')

      const clearButton = screen.getByText(/clear \(1\)/i)
      await user.click(clearButton)

      await waitFor(() => {
        expect(screen.queryByText('Date Range')).not.toBeInTheDocument()
      })
    })
  })

  describe('Empty States', () => {
    it('should show empty state with no reports', () => {
      (useDailyReports as any).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      })

      renderPage()

      expect(screen.getByText('No daily reports yet')).toBeInTheDocument()
      expect(screen.getByText('Create First Report')).toBeInTheDocument()
    })

    it('should show "no matches" message when filters active', async () => {
      const user = userEvent.setup()
      renderPage()

      const searchInput = screen.getByPlaceholderText(
        'Search reports by number, work completed, issues...'
      )
      await user.type(searchInput, 'NONEXISTENT')

      await waitFor(() => {
        expect(
          screen.getByText(/no reports match your current filters/i)
        ).toBeInTheDocument()
      })
    })

    it('should show "Create First Report" button appropriately', () => {
      (useDailyReports as any).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      })

      renderPage()

      expect(screen.getByText('Create First Report')).toBeInTheDocument()
    })
  })

  describe('Project Selection', () => {
    it('should load reports for selected project', () => {
      renderPage()

      expect(screen.getByText('Project Alpha')).toBeInTheDocument()
      expect(screen.getByText('Project Beta')).toBeInTheDocument()
    })

    it('should show "All projects" option', () => {
      renderPage()

      const projectSelect = screen.getByRole('combobox', { name: /project/i })
      const options = within(projectSelect).getAllByRole('option')
      const optionTexts = options.map(opt => opt.textContent)

      expect(optionTexts).toContain('All projects')
    })

    it('should filter reports by project', async () => {
      const user = userEvent.setup()
      ;(useDailyReports as any).mockReturnValue({
        data: mockReports.filter(r => r.project_id === 'proj-2'),
        isLoading: false,
        error: null,
      })

      renderPage()

      const projectSelect = screen.getByRole('combobox', { name: /project/i })
      await user.selectOptions(projectSelect, 'proj-2')

      await waitFor(() => {
        expectReportVisible('DR-005') // proj-2
        expectReportNotVisible('DR-001') // proj-1
      })
    })
  })

  describe('Loading & Error States', () => {
    it('should show loading state while fetching', () => {
      (useDailyReports as any).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      })

      renderPage()

      expect(screen.getByText('Loading daily reports...')).toBeInTheDocument()
    })

    it('should show error state when fetch fails', () => {
      (useDailyReports as any).mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch reports'),
      })

      renderPage()

      expect(screen.getByText(/error loading daily reports/i)).toBeInTheDocument()
    })

    it('should handle empty data gracefully', () => {
      (useDailyReports as any).mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      })

      renderPage()

      expect(screen.getByText('No daily reports yet')).toBeInTheDocument()
    })
  })
})
