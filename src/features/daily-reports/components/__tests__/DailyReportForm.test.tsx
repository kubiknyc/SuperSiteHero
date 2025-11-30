import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DailyReportForm } from '../DailyReportForm'
import { useOfflineReportStore } from '../../store/offlineReportStore'
import toast from 'react-hot-toast'

// Mock dependencies
vi.mock('../../store/offlineReportStore', () => ({
  useOfflineReportStore: vi.fn(),
}))

vi.mock('react-hot-toast')

describe('DailyReportForm', () => {
  const mockOnSubmit = vi.fn()
  const mockOnSave = vi.fn()
  const mockUpdateDraft = vi.fn()
  const mockClearDraft = vi.fn()

  const defaultDraftReport = {
    project_id: 'proj-1',
    report_date: '2024-01-15',
    weather_conditions: 'Sunny',
    work_performed: 'Completed foundation work',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useOfflineReportStore as any).mockReturnValue({
      draftReport: defaultDraftReport,
      updateDraft: mockUpdateDraft,
      clearDraft: mockClearDraft,
    })
  })

  it('should render all form sections', () => {
    render(
      <DailyReportForm
        projectId="proj-1"
        onSubmit={mockOnSubmit}
        onSave={mockOnSave}
      />
    )

    expect(screen.getByText(/Weather Information/i)).toBeInTheDocument()
    expect(screen.getByText(/Work Performed/i)).toBeInTheDocument()
    expect(screen.getByText(/Issues & Notes/i)).toBeInTheDocument()
    expect(screen.getByText(/Workforce/i)).toBeInTheDocument()
    expect(screen.getByText(/Equipment/i)).toBeInTheDocument()
    expect(screen.getByText(/Deliveries/i)).toBeInTheDocument()
    expect(screen.getByText(/Visitors/i)).toBeInTheDocument()
    expect(screen.getByText(/Photos/i)).toBeInTheDocument()
  })

  it('should render submit and save draft buttons', () => {
    render(
      <DailyReportForm
        projectId="proj-1"
        onSubmit={mockOnSubmit}
        onSave={mockOnSave}
      />
    )

    expect(screen.getByText('Submit Report')).toBeInTheDocument()
    expect(screen.getByText('Save Draft')).toBeInTheDocument()
  })

  it('should call onSave when Save Draft is clicked', () => {
    render(
      <DailyReportForm
        projectId="proj-1"
        onSubmit={mockOnSubmit}
        onSave={mockOnSave}
      />
    )

    const saveDraftButton = screen.getByText('Save Draft')
    fireEvent.click(saveDraftButton)

    expect(mockOnSave).toHaveBeenCalled()
  })

  it('should validate form before submitting', async () => {
    // Empty draft report should fail validation
    ;(useOfflineReportStore as any).mockReturnValue({
      draftReport: { project_id: 'proj-1', report_date: '2024-01-15' },
      updateDraft: mockUpdateDraft,
      clearDraft: mockClearDraft,
    })

    render(
      <DailyReportForm
        projectId="proj-1"
        onSubmit={mockOnSubmit}
        onSave={mockOnSave}
      />
    )

    const submitButton = screen.getByText('Submit Report')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('validation errors'))
    })

    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('should display validation error summary when validation fails', async () => {
    ;(useOfflineReportStore as any).mockReturnValue({
      draftReport: { project_id: 'proj-1', report_date: '2024-01-15' },
      updateDraft: mockUpdateDraft,
      clearDraft: mockClearDraft,
    })

    render(
      <DailyReportForm
        projectId="proj-1"
        onSubmit={mockOnSubmit}
        onSave={mockOnSave}
      />
    )

    const submitButton = screen.getByText('Submit Report')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/Validation Errors/i)).toBeInTheDocument()
    })
  })

  it('should call onSubmit when form is valid', async () => {
    render(
      <DailyReportForm
        projectId="proj-1"
        onSubmit={mockOnSubmit}
        onSave={mockOnSave}
      />
    )

    const submitButton = screen.getByText('Submit Report')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
        project_id: 'proj-1',
        report_date: '2024-01-15',
        weather_conditions: 'Sunny',
        work_performed: 'Completed foundation work',
      }))
    })
  })

  it('should disable submit button when isLoading is true', () => {
    render(
      <DailyReportForm
        projectId="proj-1"
        onSubmit={mockOnSubmit}
        onSave={mockOnSave}
        isLoading={true}
      />
    )

    const submitButton = screen.getByText('Submit Report')
    expect(submitButton).toBeDisabled()
  })
})
