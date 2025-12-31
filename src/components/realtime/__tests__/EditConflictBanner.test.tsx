/**
 * Unit Tests for EditConflictBanner Component
 *
 * Tests the conflict warning banner that appears when
 * another user updates a record while editing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EditConflictBanner, EditConflictInline } from '../EditConflictBanner'

describe('EditConflictBanner', () => {
  const defaultProps = {
    onAcceptServer: vi.fn(),
    onKeepLocal: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render with default message', () => {
      render(<EditConflictBanner {...defaultProps} />)

      expect(
        screen.getByText('This record was updated by another user')
      ).toBeInTheDocument()
    })

    it('should render with custom message', () => {
      render(
        <EditConflictBanner
          {...defaultProps}
          message="This RFI was updated by another user"
        />
      )

      expect(
        screen.getByText('This RFI was updated by another user')
      ).toBeInTheDocument()
    })

    it('should display updated by user when provided', () => {
      render(
        <EditConflictBanner {...defaultProps} updatedBy="John Smith" />
      )

      expect(screen.getByText(/Updated by John Smith/)).toBeInTheDocument()
    })

    it('should not display updated by when not provided', () => {
      render(<EditConflictBanner {...defaultProps} />)

      expect(screen.queryByText(/Updated by/)).not.toBeInTheDocument()
    })

    it('should have role="alert" for accessibility', () => {
      render(<EditConflictBanner {...defaultProps} />)

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      render(
        <EditConflictBanner {...defaultProps} className="custom-class" />
      )

      const alert = screen.getByRole('alert')
      expect(alert).toHaveClass('custom-class')
    })
  })

  describe('action buttons', () => {
    it('should render Load Latest button', () => {
      render(<EditConflictBanner {...defaultProps} />)

      expect(
        screen.getByRole('button', { name: /Load Latest/i })
      ).toBeInTheDocument()
    })

    it('should render Keep Mine button', () => {
      render(<EditConflictBanner {...defaultProps} />)

      expect(
        screen.getByRole('button', { name: /Keep Mine/i })
      ).toBeInTheDocument()
    })

    it('should call onAcceptServer when Load Latest is clicked', () => {
      render(<EditConflictBanner {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /Load Latest/i }))

      expect(defaultProps.onAcceptServer).toHaveBeenCalledTimes(1)
    })

    it('should call onKeepLocal when Keep Mine is clicked', () => {
      render(<EditConflictBanner {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /Keep Mine/i }))

      expect(defaultProps.onKeepLocal).toHaveBeenCalledTimes(1)
    })
  })

  describe('dismiss button', () => {
    it('should not render dismiss button when onDismiss is not provided', () => {
      render(<EditConflictBanner {...defaultProps} />)

      expect(
        screen.queryByRole('button', { name: /Dismiss/i })
      ).not.toBeInTheDocument()
    })

    it('should render dismiss button when onDismiss is provided', () => {
      const onDismiss = vi.fn()
      render(<EditConflictBanner {...defaultProps} onDismiss={onDismiss} />)

      expect(
        screen.getByRole('button', { name: /Dismiss/i })
      ).toBeInTheDocument()
    })

    it('should call onDismiss when dismiss button is clicked', () => {
      const onDismiss = vi.fn()
      render(<EditConflictBanner {...defaultProps} onDismiss={onDismiss} />)

      fireEvent.click(screen.getByRole('button', { name: /Dismiss/i }))

      expect(onDismiss).toHaveBeenCalledTimes(1)
    })
  })

  describe('button types', () => {
    it('should have type="button" to prevent form submission', () => {
      const onDismiss = vi.fn()
      render(<EditConflictBanner {...defaultProps} onDismiss={onDismiss} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('type', 'button')
      })
    })
  })
})

describe('EditConflictInline', () => {
  const defaultProps = {
    onAcceptServer: vi.fn(),
    onKeepLocal: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render compact message', () => {
    render(<EditConflictInline {...defaultProps} />)

    expect(screen.getByText('Updated by another user')).toBeInTheDocument()
  })

  it('should call onAcceptServer when Refresh is clicked', () => {
    render(<EditConflictInline {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /Refresh/i }))

    expect(defaultProps.onAcceptServer).toHaveBeenCalledTimes(1)
  })

  it('should call onKeepLocal when keep yours is clicked', () => {
    render(<EditConflictInline {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /keep yours/i }))

    expect(defaultProps.onKeepLocal).toHaveBeenCalledTimes(1)
  })

  it('should apply custom className', () => {
    const { container } = render(
      <EditConflictInline {...defaultProps} className="custom-inline-class" />
    )

    expect(container.firstChild).toHaveClass('custom-inline-class')
  })
})
