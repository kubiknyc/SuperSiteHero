import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WorkSection } from '../WorkSection'
import { useOfflineReportStore } from '../../store/offlineReportStore'

// Mock the store
vi.mock('../../store/offlineReportStore', () => ({
  useOfflineReportStore: vi.fn(),
}))

describe('WorkSection', () => {
  const mockUpdateDraft = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useOfflineReportStore as any).mockReturnValue({
      draftReport: {
        work_performed: '',
        work_completed: '',
        work_planned: '',
      },
      updateDraft: mockUpdateDraft,
    })
  })

  it('should render all work fields', () => {
    render(<WorkSection />)

    expect(screen.getByLabelText(/Work Performed/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Work Completed/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Work Planned/i)).toBeInTheDocument()
  })

  it('should show required indicator for work_performed', () => {
    render(<WorkSection />)

    const label = screen.getByText(/Work Performed/i)
    expect(label.querySelector('span.text-red-600')).toBeInTheDocument()
  })

  it('should update store when work_performed changes', () => {
    render(<WorkSection />)

    const textarea = screen.getByLabelText(/Work Performed/i)
    fireEvent.change(textarea, { target: { value: 'Installed electrical panels' } })

    expect(mockUpdateDraft).toHaveBeenCalledWith({ work_performed: 'Installed electrical panels' })
  })

  it('should validate work_performed on blur', async () => {
    render(<WorkSection />)

    const textarea = screen.getByLabelText(/Work Performed/i)
    fireEvent.blur(textarea)

    await waitFor(() => {
      expect(screen.getByText(/Work performed is required/i)).toBeInTheDocument()
    })
  })

  it('should clear error when valid work_performed is entered', async () => {
    render(<WorkSection />)

    const textarea = screen.getByLabelText(/Work Performed/i)

    // First, trigger error
    fireEvent.blur(textarea)
    await waitFor(() => {
      expect(screen.getByText(/Work performed is required/i)).toBeInTheDocument()
    })

    // Then, enter valid value
    fireEvent.change(textarea, { target: { value: 'Completed foundation work' } })
    fireEvent.blur(textarea)

    await waitFor(() => {
      expect(screen.queryByText(/Work performed is required/i)).not.toBeInTheDocument()
    })
  })

  it('should display character counter for work_performed (2000 max)', () => {
    render(<WorkSection />)

    expect(screen.getByText('0 / 2000')).toBeInTheDocument()
  })

  it('should display character counter for work_completed (1000 max)', () => {
    render(<WorkSection />)

    expect(screen.getByText('0 / 1000')).toBeInTheDocument()
  })

  it('should display character counter for work_planned (1000 max)', () => {
    render(<WorkSection />)

    const counters = screen.getAllByText('0 / 1000')
    expect(counters).toHaveLength(2) // work_completed and work_planned
  })

  it('should update character counter when typing in work_performed', () => {
    ;(useOfflineReportStore as any).mockReturnValue({
      draftReport: {
        work_performed: 'Installed electrical panels and wiring',
      },
      updateDraft: mockUpdateDraft,
    })

    render(<WorkSection />)

    expect(screen.getByText('40 / 2000')).toBeInTheDocument()
  })

  it('should show yellow warning when work_performed is near limit', () => {
    const longText = 'x'.repeat(1850) // 92.5% of 2000
    ;(useOfflineReportStore as any).mockReturnValue({
      draftReport: {
        work_performed: longText,
      },
      updateDraft: mockUpdateDraft,
    })

    render(<WorkSection />)

    const counter = screen.getByText('1850 / 2000')
    expect(counter).toHaveClass('text-yellow-600')
  })

  it('should show red error when work_performed exceeds limit', () => {
    const tooLongText = 'x'.repeat(2005)
    ;(useOfflineReportStore as any).mockReturnValue({
      draftReport: {
        work_performed: tooLongText,
      },
      updateDraft: mockUpdateDraft,
    })

    render(<WorkSection />)

    const counter = screen.getByText('2005 / 2000')
    expect(counter).toHaveClass('text-red-600')
    expect(counter).toHaveClass('font-semibold')
  })

  it('should validate work_performed character limit on blur', async () => {
    render(<WorkSection />)

    const textarea = screen.getByLabelText(/Work Performed/i)
    fireEvent.change(textarea, { target: { value: 'x'.repeat(2005) } })
    fireEvent.blur(textarea)

    await waitFor(() => {
      expect(screen.getByText(/Maximum 2000 characters/i)).toBeInTheDocument()
    })
  })

  it('should validate work_completed character limit on blur', async () => {
    render(<WorkSection />)

    const textarea = screen.getByLabelText(/Work Completed/i)
    fireEvent.change(textarea, { target: { value: 'x'.repeat(1005) } })
    fireEvent.blur(textarea)

    await waitFor(() => {
      expect(screen.getByText(/Maximum 1000 characters/i)).toBeInTheDocument()
    })
  })
})
