import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Unmock the DailyReportForm for this test file (it's mocked globally in setup.tsx)
vi.unmock('@/features/daily-reports/components/DailyReportForm')

import { DailyReportForm } from '../DailyReportForm'
import { useOfflineReportStore } from '../../store/offlineReportStore'
import toast from 'react-hot-toast'

// Mock dependencies
vi.mock('../../store/offlineReportStore', () => ({
  useOfflineReportStore: vi.fn(),
}))

vi.mock('../../hooks/useOfflineSync', () => ({
  useOfflineSync: vi.fn(() => ({
    syncStatus: 'idle',
    syncError: null,
    isOnline: true,
    hasPendingSync: false,
    pendingSyncCount: 0,
    manualSync: vi.fn(),
  })),
}))

vi.mock('react-hot-toast')

describe('DailyReportForm', () => {
  const mockOnSubmit = vi.fn()
  const mockOnSave = vi.fn()
  const mockUpdateDraft = vi.fn()
  const mockClearDraft = vi.fn()
  const mockInitializeDraft = vi.fn()
  const mockSetSyncStatus = vi.fn()
  const mockAddToSyncQueue = vi.fn()

  const defaultDraftReport = {
    id: 'test-draft-id',
    project_id: 'proj-1',
    report_date: '2024-01-15',
    weather_conditions: 'Sunny',
    work_performed: 'Completed foundation work',
    status: 'draft' as const,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useOfflineReportStore as any).mockReturnValue({
      draftReport: defaultDraftReport,
      updateDraft: mockUpdateDraft,
      clearDraft: mockClearDraft,
      initializeDraft: mockInitializeDraft,
      setSyncStatus: mockSetSyncStatus,
      addToSyncQueue: mockAddToSyncQueue,
      workforce: [],
      equipment: [],
      deliveries: [],
      visitors: [],
      photos: [],
      syncQueue: [],
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

    expect(screen.getByText(/Weather Conditions/i)).toBeInTheDocument()
    expect(screen.getByText(/Work Progress/i)).toBeInTheDocument()
    expect(screen.getByText(/Issues & Observations/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Workforce/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Equipment/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Deliveries/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Visitors/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Photos/i).length).toBeGreaterThanOrEqual(1)
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

  it('should set sync status when Save Draft is clicked', () => {
    render(
      <DailyReportForm
        projectId="proj-1"
        onSubmit={mockOnSubmit}
        onSave={mockOnSave}
      />
    )

    const saveDraftButton = screen.getByText('Save Draft')
    fireEvent.click(saveDraftButton)

    expect(mockSetSyncStatus).toHaveBeenCalledWith('success')
  })

  it('should validate form before submitting', async () => {
    // Empty draft report should fail validation
    ;(useOfflineReportStore as any).mockReturnValue({
      draftReport: { id: 'test-id', project_id: 'proj-1', report_date: '2024-01-15', status: 'draft' },
      updateDraft: mockUpdateDraft,
      clearDraft: mockClearDraft,
      initializeDraft: mockInitializeDraft,
      setSyncStatus: mockSetSyncStatus,
      addToSyncQueue: mockAddToSyncQueue,
      workforce: [],
      equipment: [],
      deliveries: [],
      visitors: [],
      photos: [],
      syncQueue: [],
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
      draftReport: { id: 'test-id', project_id: 'proj-1', report_date: '2024-01-15', status: 'draft' },
      updateDraft: mockUpdateDraft,
      clearDraft: mockClearDraft,
      initializeDraft: mockInitializeDraft,
      setSyncStatus: mockSetSyncStatus,
      addToSyncQueue: mockAddToSyncQueue,
      workforce: [],
      equipment: [],
      deliveries: [],
      visitors: [],
      photos: [],
      syncQueue: [],
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

  it('should add to sync queue and call onSave when form is valid', async () => {
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
      expect(mockAddToSyncQueue).toHaveBeenCalled()
      expect(mockUpdateDraft).toHaveBeenCalledWith({ status: 'submitted' })
      expect(mockOnSave).toHaveBeenCalled()
    })
  })

  it('should render submit button as enabled', () => {
    render(
      <DailyReportForm
        projectId="proj-1"
        onSubmit={mockOnSubmit}
        onSave={mockOnSave}
      />
    )

    const submitButton = screen.getByText('Submit Report')
    expect(submitButton).toBeEnabled()
  })
})
