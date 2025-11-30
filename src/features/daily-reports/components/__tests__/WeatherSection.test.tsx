import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WeatherSection } from '../WeatherSection'
import { useOfflineReportStore } from '../../store/offlineReportStore'

// Mock the store
vi.mock('../../store/offlineReportStore', () => ({
  useOfflineReportStore: vi.fn(),
}))

describe('WeatherSection', () => {
  const mockUpdateDraft = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useOfflineReportStore as any).mockReturnValue({
      draftReport: {
        weather_conditions: '',
        temperature_high: undefined,
        temperature_low: undefined,
        weather_notes: '',
      },
      updateDraft: mockUpdateDraft,
    })
  })

  it('should render all weather fields', () => {
    render(<WeatherSection />)

    expect(screen.getByLabelText(/Weather Condition/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/High Temperature/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Low Temperature/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Weather Notes/i)).toBeInTheDocument()
  })

  it('should show required indicator for weather_conditions', () => {
    render(<WeatherSection />)

    const label = screen.getByText(/Weather Condition/i)
    expect(label.querySelector('span.text-red-600')).toBeInTheDocument()
  })

  it('should update store when weather_conditions changes', () => {
    render(<WeatherSection />)

    const input = screen.getByLabelText(/Weather Condition/i)
    fireEvent.change(input, { target: { value: 'Sunny' } })

    expect(mockUpdateDraft).toHaveBeenCalledWith({ weather_conditions: 'Sunny' })
  })

  it('should validate weather_conditions on blur', async () => {
    render(<WeatherSection />)

    const input = screen.getByLabelText(/Weather Condition/i)
    fireEvent.blur(input)

    await waitFor(() => {
      expect(screen.getByText(/Weather condition is required/i)).toBeInTheDocument()
    })
  })

  it('should clear error when valid weather_conditions is entered', async () => {
    render(<WeatherSection />)

    const input = screen.getByLabelText(/Weather Condition/i)

    // First, trigger error
    fireEvent.blur(input)
    await waitFor(() => {
      expect(screen.getByText(/Weather condition is required/i)).toBeInTheDocument()
    })

    // Then, enter valid value
    fireEvent.change(input, { target: { value: 'Sunny' } })
    fireEvent.blur(input)

    await waitFor(() => {
      expect(screen.queryByText(/Weather condition is required/i)).not.toBeInTheDocument()
    })
  })

  it('should display character counter for weather_notes', () => {
    render(<WeatherSection />)

    expect(screen.getByText('0 / 500')).toBeInTheDocument()
  })

  it('should update character counter when typing in weather_notes', () => {
    ;(useOfflineReportStore as any).mockReturnValue({
      draftReport: {
        weather_conditions: 'Sunny',
        weather_notes: 'Clear skies all day',
      },
      updateDraft: mockUpdateDraft,
    })

    render(<WeatherSection />)

    expect(screen.getByText('20 / 500')).toBeInTheDocument()
  })

  it('should show yellow warning when notes are near limit', () => {
    const longNotes = 'x'.repeat(455) // 91% of 500
    ;(useOfflineReportStore as any).mockReturnValue({
      draftReport: {
        weather_conditions: 'Sunny',
        weather_notes: longNotes,
      },
      updateDraft: mockUpdateDraft,
    })

    render(<WeatherSection />)

    const counter = screen.getByText('455 / 500')
    expect(counter).toHaveClass('text-yellow-600')
  })

  it('should show red error when notes exceed limit', () => {
    const tooLongNotes = 'x'.repeat(505)
    ;(useOfflineReportStore as any).mockReturnValue({
      draftReport: {
        weather_conditions: 'Sunny',
        weather_notes: tooLongNotes,
      },
      updateDraft: mockUpdateDraft,
    })

    render(<WeatherSection />)

    const counter = screen.getByText('505 / 500')
    expect(counter).toHaveClass('text-red-600')
    expect(counter).toHaveClass('font-semibold')
  })

  it('should validate temperature_high on blur', async () => {
    render(<WeatherSection />)

    const input = screen.getByLabelText(/High Temperature/i)
    fireEvent.change(input, { target: { value: '200' } })
    fireEvent.blur(input)

    await waitFor(() => {
      expect(screen.getByText(/Invalid temperature/i)).toBeInTheDocument()
    })
  })

  it('should validate temperature_low on blur', async () => {
    render(<WeatherSection />)

    const input = screen.getByLabelText(/Low Temperature/i)
    fireEvent.change(input, { target: { value: '-100' } })
    fireEvent.blur(input)

    await waitFor(() => {
      expect(screen.getByText(/Invalid temperature/i)).toBeInTheDocument()
    })
  })

  it('should accept valid temperature ranges', async () => {
    render(<WeatherSection />)

    const highInput = screen.getByLabelText(/High Temperature/i)
    const lowInput = screen.getByLabelText(/Low Temperature/i)

    fireEvent.change(highInput, { target: { value: '75' } })
    fireEvent.blur(highInput)

    fireEvent.change(lowInput, { target: { value: '60' } })
    fireEvent.blur(lowInput)

    await waitFor(() => {
      expect(screen.queryByText(/Invalid temperature/i)).not.toBeInTheDocument()
    })
  })
})
