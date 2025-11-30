import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WeatherSection } from '../WeatherSection'
import type { DraftReport } from '../../store/offlineReportStore'

describe('WeatherSection', () => {
  const mockOnToggle = vi.fn()
  const mockOnUpdate = vi.fn()

  const defaultDraft: DraftReport = {
    id: 'test-id',
    project_id: 'proj-1',
    report_date: '2024-01-15',
    weather_conditions: '',
    temperature_high: undefined,
    temperature_low: undefined,
    weather_notes: '',
    weather_delays: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render all weather fields', () => {
    render(
      <WeatherSection
        expanded={true}
        onToggle={mockOnToggle}
        draft={defaultDraft}
        onUpdate={mockOnUpdate}
      />
    )

    expect(screen.getByLabelText(/Weather Condition/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/High Temperature/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Low Temperature/i)).toBeInTheDocument()
  })

  it('should show required indicator for weather_conditions', () => {
    render(
      <WeatherSection
        expanded={true}
        onToggle={mockOnToggle}
        draft={defaultDraft}
        onUpdate={mockOnUpdate}
      />
    )

    // Check for the required asterisk using aria-label
    expect(screen.getByLabelText('required')).toBeInTheDocument()
  })

  it('should update store when weather_conditions changes', () => {
    render(
      <WeatherSection
        expanded={true}
        onToggle={mockOnToggle}
        draft={defaultDraft}
        onUpdate={mockOnUpdate}
      />
    )

    const input = screen.getByLabelText(/Weather Condition/i)
    fireEvent.change(input, { target: { value: 'Sunny' } })

    expect(mockOnUpdate).toHaveBeenCalledWith({ weather_conditions: 'Sunny' })
  })

  it('should validate weather_conditions on blur', async () => {
    render(
      <WeatherSection
        expanded={true}
        onToggle={mockOnToggle}
        draft={defaultDraft}
        onUpdate={mockOnUpdate}
      />
    )

    const input = screen.getByLabelText(/Weather Condition/i)
    fireEvent.blur(input)

    await waitFor(() => {
      expect(screen.getByText(/This field is required/i)).toBeInTheDocument()
    })
  })

  it('should clear error when valid weather_conditions is entered', async () => {
    const { rerender } = render(
      <WeatherSection
        expanded={true}
        onToggle={mockOnToggle}
        draft={defaultDraft}
        onUpdate={mockOnUpdate}
      />
    )

    const input = screen.getByLabelText(/Weather Condition/i)

    // First, trigger error
    fireEvent.blur(input)
    await waitFor(() => {
      expect(screen.getByText(/This field is required/i)).toBeInTheDocument()
    })

    // Then, enter valid value
    fireEvent.change(input, { target: { value: 'Sunny' } })

    rerender(
      <WeatherSection
        expanded={true}
        onToggle={mockOnToggle}
        draft={{ ...defaultDraft, weather_conditions: 'Sunny' }}
        onUpdate={mockOnUpdate}
      />
    )

    fireEvent.blur(input)

    await waitFor(() => {
      expect(screen.queryByText(/This field is required/i)).not.toBeInTheDocument()
    })
  })

  it('should display character counter for weather_notes', () => {
    const draftWithDelays: DraftReport = {
      ...defaultDraft,
      weather_delays: true,
      weather_notes: '',
    }

    render(
      <WeatherSection
        expanded={true}
        onToggle={mockOnToggle}
        draft={draftWithDelays}
        onUpdate={mockOnUpdate}
      />
    )

    expect(screen.getByText('0 / 500')).toBeInTheDocument()
  })

  it('should update character counter when typing in weather_notes', () => {
    const draftWithNotes: DraftReport = {
      ...defaultDraft,
      weather_conditions: 'Sunny',
      weather_delays: true,
      weather_notes: 'Clear skies all day', // 19 characters
    }

    render(
      <WeatherSection
        expanded={true}
        onToggle={mockOnToggle}
        draft={draftWithNotes}
        onUpdate={mockOnUpdate}
      />
    )

    expect(screen.getByText('19 / 500')).toBeInTheDocument()
  })

  it('should show yellow warning when notes are near limit', () => {
    const longNotes = 'x'.repeat(455) // 91% of 500
    const draftWithLongNotes: DraftReport = {
      ...defaultDraft,
      weather_conditions: 'Sunny',
      weather_delays: true,
      weather_notes: longNotes,
    }

    render(
      <WeatherSection
        expanded={true}
        onToggle={mockOnToggle}
        draft={draftWithLongNotes}
        onUpdate={mockOnUpdate}
      />
    )

    const counter = screen.getByText('455 / 500')
    expect(counter).toHaveClass('text-yellow-600')
  })

  it('should show red error when notes exceed limit', () => {
    const tooLongNotes = 'x'.repeat(505)
    const draftWithTooLongNotes: DraftReport = {
      ...defaultDraft,
      weather_conditions: 'Sunny',
      weather_delays: true,
      weather_notes: tooLongNotes,
    }

    render(
      <WeatherSection
        expanded={true}
        onToggle={mockOnToggle}
        draft={draftWithTooLongNotes}
        onUpdate={mockOnUpdate}
      />
    )

    const counter = screen.getByText('505 / 500')
    expect(counter).toHaveClass('text-red-600')
    expect(counter).toHaveClass('font-semibold')
  })

  it('should call onUpdate when temperature_high changes', () => {
    render(
      <WeatherSection
        expanded={true}
        onToggle={mockOnToggle}
        draft={defaultDraft}
        onUpdate={mockOnUpdate}
      />
    )

    const input = screen.getByLabelText(/High Temperature/i)
    fireEvent.change(input, { target: { value: '75' } })

    expect(mockOnUpdate).toHaveBeenCalledWith({ temperature_high: 75 })
  })

  it('should call onUpdate when temperature_low changes', () => {
    render(
      <WeatherSection
        expanded={true}
        onToggle={mockOnToggle}
        draft={defaultDraft}
        onUpdate={mockOnUpdate}
      />
    )

    const input = screen.getByLabelText(/Low Temperature/i)
    fireEvent.change(input, { target: { value: '60' } })

    expect(mockOnUpdate).toHaveBeenCalledWith({ temperature_low: 60 })
  })

  it('should call onToggle when header is clicked', () => {
    render(
      <WeatherSection
        expanded={true}
        onToggle={mockOnToggle}
        draft={defaultDraft}
        onUpdate={mockOnUpdate}
      />
    )

    const button = screen.getByRole('button', { name: /Weather Conditions/i })
    fireEvent.click(button)

    expect(mockOnToggle).toHaveBeenCalled()
  })

  it('should not render content when not expanded', () => {
    render(
      <WeatherSection
        expanded={false}
        onToggle={mockOnToggle}
        draft={defaultDraft}
        onUpdate={mockOnUpdate}
      />
    )

    expect(screen.queryByLabelText(/Weather Condition/i)).not.toBeInTheDocument()
  })
})
