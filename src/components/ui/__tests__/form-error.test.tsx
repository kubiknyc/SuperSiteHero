import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FormError } from '../form-error'

describe('FormError', () => {
  it('should render error message when provided', () => {
    render(<FormError message="This is an error message" />)

    expect(screen.getByText('This is an error message')).toBeInTheDocument()
  })

  it('should not render when message is undefined', () => {
    const { container } = render(<FormError message={undefined} />)

    expect(container.firstChild).toBeNull()
  })

  it('should not render when message is empty string', () => {
    const { container } = render(<FormError message="" />)

    expect(container.firstChild).toBeNull()
  })

  it('should have ARIA alert role', () => {
    render(<FormError message="Error message" />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('should have aria-live="polite" attribute', () => {
    render(<FormError message="Error message" />)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveAttribute('aria-live', 'polite')
  })

  it('should display AlertCircle icon', () => {
    render(<FormError message="Error message" />)

    const container = screen.getByRole('alert')
    const icon = container.querySelector('svg')
    expect(icon).toBeInTheDocument()
  })

  it('should apply custom className when provided', () => {
    render(<FormError message="Error message" className="custom-class" />)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveClass('custom-class')
  })
})
