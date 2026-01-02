import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { NewDailyReportPage } from '../NewDailyReportPage'
import { useProjects } from '../../../features/projects/hooks/useProjects'
import { useOfflineReportStore } from '../../../features/daily-reports/store/offlineReportStore'
import { toast } from 'sonner'

// Mock dependencies
vi.mock('../../../features/projects/hooks/useProjects')
vi.mock('../../../features/daily-reports/store/offlineReportStore')
vi.mock('react-hot-toast')
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

const mockProjects = [
  { id: 'proj-1', name: 'Project Alpha', status: 'active' },
  { id: 'proj-2', name: 'Project Beta', status: 'active' },
]

describe('NewDailyReportPage', () => {
  const mockInitializeDraft = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useProjects as any).mockReturnValue({
      data: mockProjects,
      isLoading: false,
      error: null,
    })
    ;(useOfflineReportStore as any).mockReturnValue({
      initializeDraft: mockInitializeDraft,
    })
  })

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <NewDailyReportPage />
      </BrowserRouter>
    )
  }

  it('should render project selection', () => {
    renderComponent()

    expect(screen.getByLabelText(/Select Project/i)).toBeInTheDocument()
  })

  it('should render date selection', () => {
    renderComponent()

    expect(screen.getByLabelText(/Report Date/i)).toBeInTheDocument()
  })

  it('should show validation error when submitting without project', async () => {
    renderComponent()

    const continueButton = screen.getByText(/Continue to Form/i)
    fireEvent.click(continueButton)

    await waitFor(() => {
      expect(screen.getByText(/Please select a project/i)).toBeInTheDocument()
    })

    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('validation errors'))
  })

  it('should show validation error when submitting without date', async () => {
    renderComponent()

    const projectSelect = screen.getByLabelText(/Select Project/i)
    fireEvent.change(projectSelect, { target: { value: 'proj-1' } })

    const continueButton = screen.getByText(/Continue to Form/i)
    fireEvent.click(continueButton)

    await waitFor(() => {
      expect(screen.getByText(/Please select a date/i)).toBeInTheDocument()
    })
  })

  it('should show validation error when selecting future date', async () => {
    renderComponent()

    const projectSelect = screen.getByLabelText(/Select Project/i)
    fireEvent.change(projectSelect, { target: { value: 'proj-1' } })

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const futureDate = tomorrow.toISOString().split('T')[0]

    const dateInput = screen.getByLabelText(/Report Date/i)
    fireEvent.change(dateInput, { target: { value: futureDate } })

    const continueButton = screen.getByText(/Continue to Form/i)
    fireEvent.click(continueButton)

    await waitFor(() => {
      expect(screen.getByText(/Report date cannot be in the future/i)).toBeInTheDocument()
    })
  })

  it('should allow navigation when all fields are valid', async () => {
    renderComponent()

    const projectSelect = screen.getByLabelText(/Select Project/i)
    fireEvent.change(projectSelect, { target: { value: 'proj-1' } })

    const today = new Date().toISOString().split('T')[0]
    const dateInput = screen.getByLabelText(/Report Date/i)
    fireEvent.change(dateInput, { target: { value: today } })

    const continueButton = screen.getByText(/Continue to Form/i)
    fireEvent.click(continueButton)

    await waitFor(() => {
      expect(mockInitializeDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          project_id: 'proj-1',
          report_date: today,
        })
      )
    })
  })
})
