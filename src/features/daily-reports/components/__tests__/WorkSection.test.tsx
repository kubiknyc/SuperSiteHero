import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WorkSection } from '../WorkSection'
import type { DraftReport } from '../../store/offlineReportStore'

describe('WorkSection', () => {
  const mockOnToggle = vi.fn()
  const mockOnUpdate = vi.fn()

  const defaultDraft: DraftReport = {
    id: 'test-id',
    project_id: 'proj-1',
    report_date: '2024-01-15',
    work_performed: '',
    work_completed: '',
    work_planned: '',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render all work fields', () => {
    render(
      <WorkSection
        expanded={true}
        onToggle={mockOnToggle}
        draft={defaultDraft}
        onUpdate={mockOnUpdate}
      />
    )

    expect(screen.getByLabelText(/Work Performed/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Work Completed/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Work Planned/i)).toBeInTheDocument()
  })

  it('should show required indicator for work_performed', () => {
    render(
      <WorkSection
        expanded={true}
        onToggle={mockOnToggle}
        draft={defaultDraft}
        onUpdate={mockOnUpdate}
      />
    )

    // Check for the required asterisk using aria-label
    expect(screen.getByLabelText('required')).toBeInTheDocument()
  })

  it('should update store when work_performed changes', () => {
    render(
      <WorkSection
        expanded={true}
        onToggle={mockOnToggle}
        draft={defaultDraft}
        onUpdate={mockOnUpdate}
      />
    )

    const textarea = screen.getByLabelText(/Work Performed/i)
    fireEvent.change(textarea, { target: { value: 'Installed electrical panels' } })

    expect(mockOnUpdate).toHaveBeenCalledWith({ work_performed: 'Installed electrical panels' })
  })

  it('should validate work_performed on blur', async () => {
    render(
      <WorkSection
        expanded={true}
        onToggle={mockOnToggle}
        draft={defaultDraft}
        onUpdate={mockOnUpdate}
      />
    )

    const textarea = screen.getByLabelText(/Work Performed/i)
    fireEvent.blur(textarea)

    await waitFor(() => {
      expect(screen.getByText(/This field is required/i)).toBeInTheDocument()
    })
  })

  it('should clear error when valid work_performed is entered', async () => {
    const { rerender } = render(
      <WorkSection
        expanded={true}
        onToggle={mockOnToggle}
        draft={defaultDraft}
        onUpdate={mockOnUpdate}
      />
    )

    const textarea = screen.getByLabelText(/Work Performed/i)

    // First, trigger error
    fireEvent.blur(textarea)
    await waitFor(() => {
      expect(screen.getByText(/This field is required/i)).toBeInTheDocument()
    })

    // Then, enter valid value and rerender with updated draft
    fireEvent.change(textarea, { target: { value: 'Completed foundation work' } })

    rerender(
      <WorkSection
        expanded={true}
        onToggle={mockOnToggle}
        draft={{ ...defaultDraft, work_performed: 'Completed foundation work' }}
        onUpdate={mockOnUpdate}
      />
    )

    fireEvent.blur(textarea)

    await waitFor(() => {
      expect(screen.queryByText(/This field is required/i)).not.toBeInTheDocument()
    })
  })

  it('should display character counter for work_performed (2000 max)', () => {
    render(
      <WorkSection
        expanded={true}
        onToggle={mockOnToggle}
        draft={defaultDraft}
        onUpdate={mockOnUpdate}
      />
    )

    expect(screen.getByText('0 / 2000')).toBeInTheDocument()
  })

  it('should display character counter for work_completed (1000 max)', () => {
    render(
      <WorkSection
        expanded={true}
        onToggle={mockOnToggle}
        draft={defaultDraft}
        onUpdate={mockOnUpdate}
      />
    )

    // There are 2 counters with 1000 max (work_completed and work_planned)
    const counters = screen.getAllByText('0 / 1000')
    expect(counters.length).toBeGreaterThanOrEqual(1)
  })

  it('should display character counter for work_planned (1000 max)', () => {
    render(
      <WorkSection
        expanded={true}
        onToggle={mockOnToggle}
        draft={defaultDraft}
        onUpdate={mockOnUpdate}
      />
    )

    const counters = screen.getAllByText('0 / 1000')
    expect(counters).toHaveLength(2) // work_completed and work_planned
  })

  it('should update character counter when typing in work_performed', () => {
    const draftWithText: DraftReport = {
      ...defaultDraft,
      work_performed: 'Installed electrical panels and wiring',
    }

    render(
      <WorkSection
        expanded={true}
        onToggle={mockOnToggle}
        draft={draftWithText}
        onUpdate={mockOnUpdate}
      />
    )

    expect(screen.getByText('38 / 2000')).toBeInTheDocument()
  })

  it('should show yellow warning when work_performed is near limit', () => {
    const longText = 'x'.repeat(1850) // 92.5% of 2000
    const draftWithLongText: DraftReport = {
      ...defaultDraft,
      work_performed: longText,
    }

    render(
      <WorkSection
        expanded={true}
        onToggle={mockOnToggle}
        draft={draftWithLongText}
        onUpdate={mockOnUpdate}
      />
    )

    const counter = screen.getByText('1850 / 2000')
    expect(counter).toHaveClass('text-yellow-600')
  })

  it('should show red error when work_performed exceeds limit', () => {
    const tooLongText = 'x'.repeat(2005)
    const draftWithTooLongText: DraftReport = {
      ...defaultDraft,
      work_performed: tooLongText,
    }

    render(
      <WorkSection
        expanded={true}
        onToggle={mockOnToggle}
        draft={draftWithTooLongText}
        onUpdate={mockOnUpdate}
      />
    )

    const counter = screen.getByText('2005 / 2000')
    expect(counter).toHaveClass('text-red-600')
    expect(counter).toHaveClass('font-semibold')
  })

  it('should call onUpdate when work_completed changes', () => {
    render(
      <WorkSection
        expanded={true}
        onToggle={mockOnToggle}
        draft={defaultDraft}
        onUpdate={mockOnUpdate}
      />
    )

    const textarea = screen.getByLabelText(/Work Completed/i)
    fireEvent.change(textarea, { target: { value: 'Finished drywall installation' } })

    expect(mockOnUpdate).toHaveBeenCalledWith({ work_completed: 'Finished drywall installation' })
  })

  it('should call onUpdate when work_planned changes', () => {
    render(
      <WorkSection
        expanded={true}
        onToggle={mockOnToggle}
        draft={defaultDraft}
        onUpdate={mockOnUpdate}
      />
    )

    const textarea = screen.getByLabelText(/Work Planned/i)
    fireEvent.change(textarea, { target: { value: 'Start painting tomorrow' } })

    expect(mockOnUpdate).toHaveBeenCalledWith({ work_planned: 'Start painting tomorrow' })
  })

  it('should call onToggle when header is clicked', () => {
    render(
      <WorkSection
        expanded={true}
        onToggle={mockOnToggle}
        draft={defaultDraft}
        onUpdate={mockOnUpdate}
      />
    )

    const button = screen.getByRole('button', { name: /Work Progress/i })
    fireEvent.click(button)

    expect(mockOnToggle).toHaveBeenCalled()
  })

  it('should not render content when not expanded', () => {
    render(
      <WorkSection
        expanded={false}
        onToggle={mockOnToggle}
        draft={defaultDraft}
        onUpdate={mockOnUpdate}
      />
    )

    expect(screen.queryByLabelText(/Work Performed/i)).not.toBeInTheDocument()
  })
})
