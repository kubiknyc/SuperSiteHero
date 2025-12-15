/**
 * Notification Channel Toggle Component Tests
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  NotificationChannelToggle,
  NotificationChannelToggleWithLabels,
} from './NotificationChannelToggle'
import { NotificationChannel } from '@/types/milestone-notification-preferences'

describe('NotificationChannelToggle', () => {
  const defaultProps = {
    enabledChannels: {
      email: true,
      in_app: true,
      sms: false,
      push: false,
    },
    availableChannels: ['email', 'in_app', 'sms', 'push'] as NotificationChannel[],
    onChange: vi.fn(),
  }

  it('should render all channel buttons', () => {
    render(<NotificationChannelToggle {...defaultProps} />)

    expect(screen.getByLabelText(/email notifications/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/in-app notifications/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/sms notifications/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/push notifications/i)).toBeInTheDocument()
  })

  it('should show enabled state for active channels', () => {
    render(<NotificationChannelToggle {...defaultProps} />)

    const emailButton = screen.getByLabelText(/disable email notifications/i)
    const smsButton = screen.getByLabelText(/enable sms notifications/i)

    expect(emailButton).toHaveClass('bg-blue-50', 'border-blue-500')
    expect(smsButton).toHaveClass('bg-gray-50', 'border-gray-300')
  })

  it('should call onChange when clicking a channel button', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<NotificationChannelToggle {...defaultProps} onChange={onChange} />)

    const emailButton = screen.getByLabelText(/disable email notifications/i)
    await user.click(emailButton)

    expect(onChange).toHaveBeenCalledWith('email', false)
  })

  it('should toggle channel state on click', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<NotificationChannelToggle {...defaultProps} onChange={onChange} />)

    // Click to disable email
    const emailButton = screen.getByLabelText(/disable email notifications/i)
    await user.click(emailButton)
    expect(onChange).toHaveBeenCalledWith('email', false)

    // Click to enable SMS
    const smsButton = screen.getByLabelText(/enable sms notifications/i)
    await user.click(smsButton)
    expect(onChange).toHaveBeenCalledWith('sms', true)
  })

  it('should disable unavailable channels', () => {
    render(
      <NotificationChannelToggle
        {...defaultProps}
        availableChannels={['email', 'in_app']}
      />
    )

    const smsButton = screen.getByLabelText(/sms/i)
    const pushButton = screen.getByLabelText(/push/i)

    expect(smsButton).toBeDisabled()
    expect(pushButton).toBeDisabled()
    expect(smsButton).toHaveClass('opacity-50', 'cursor-not-allowed')
  })

  it('should not call onChange for unavailable channels', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <NotificationChannelToggle
        {...defaultProps}
        availableChannels={['email', 'in_app']}
        onChange={onChange}
      />
    )

    const smsButton = screen.getByLabelText(/sms/i)
    await user.click(smsButton)

    expect(onChange).not.toHaveBeenCalled()
  })

  it('should disable all channels when disabled prop is true', () => {
    render(<NotificationChannelToggle {...defaultProps} disabled />)

    const buttons = screen.getAllByRole('button')
    buttons.forEach((button) => {
      expect(button).toBeDisabled()
      expect(button).toHaveClass('opacity-40')
    })
  })

  it('should not call onChange when disabled', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<NotificationChannelToggle {...defaultProps} onChange={onChange} disabled />)

    const emailButton = screen.getByLabelText(/email/i)
    await user.click(emailButton)

    expect(onChange).not.toHaveBeenCalled()
  })

  it('should apply custom className', () => {
    const { container } = render(
      <NotificationChannelToggle {...defaultProps} className="custom-class" />
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('should have proper ARIA attributes', () => {
    render(<NotificationChannelToggle {...defaultProps} />)

    const emailButton = screen.getByLabelText(/disable email notifications/i)
    const smsButton = screen.getByLabelText(/enable sms notifications/i)

    expect(emailButton).toHaveAttribute('aria-pressed', 'true')
    expect(smsButton).toHaveAttribute('aria-pressed', 'false')
  })
})

describe('NotificationChannelToggleWithLabels', () => {
  const defaultProps = {
    enabledChannels: {
      email: true,
      in_app: true,
      sms: false,
      push: false,
    },
    availableChannels: ['email', 'in_app', 'sms'] as NotificationChannel[],
    onChange: vi.fn(),
  }

  it('should render channel labels when showLabels is true', () => {
    render(<NotificationChannelToggleWithLabels {...defaultProps} showLabels />)

    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('In-App')).toBeInTheDocument()
    expect(screen.getByText('SMS')).toBeInTheDocument()
  })

  it('should not render channel labels when showLabels is false', () => {
    render(<NotificationChannelToggleWithLabels {...defaultProps} showLabels={false} />)

    expect(screen.queryByText('Email')).not.toBeInTheDocument()
    expect(screen.queryByText('In-App')).not.toBeInTheDocument()
  })

  it('should only render available channels', () => {
    render(<NotificationChannelToggleWithLabels {...defaultProps} />)

    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('In-App')).toBeInTheDocument()
    expect(screen.getByText('SMS')).toBeInTheDocument()
    expect(screen.queryByText('Push')).not.toBeInTheDocument()
  })

  it('should apply horizontal layout by default', () => {
    const { container } = render(<NotificationChannelToggleWithLabels {...defaultProps} />)

    const wrapper = container.firstChild
    expect(wrapper).toHaveClass('flex-row')
    expect(wrapper).not.toHaveClass('flex-col')
  })

  it('should apply vertical layout when specified', () => {
    const { container } = render(
      <NotificationChannelToggleWithLabels {...defaultProps} layout="vertical" />
    )

    const wrapper = container.firstChild
    expect(wrapper).toHaveClass('flex-col')
    expect(wrapper).not.toHaveClass('flex-row')
  })

  it('should show enabled state with proper styling', () => {
    render(<NotificationChannelToggleWithLabels {...defaultProps} />)

    const emailButton = screen.getByLabelText(/disable email notifications/i)
    const smsButton = screen.getByLabelText(/enable sms notifications/i)

    expect(emailButton).toHaveClass('bg-blue-50', 'border-blue-500', 'text-blue-700')
    expect(smsButton).toHaveClass('bg-gray-50', 'border-gray-300', 'text-gray-600')
  })

  it('should call onChange when clicking a channel', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<NotificationChannelToggleWithLabels {...defaultProps} onChange={onChange} />)

    const emailButton = screen.getByLabelText(/disable email notifications/i)
    await user.click(emailButton)

    expect(onChange).toHaveBeenCalledWith('email', false)
  })

  it('should disable all channels when disabled prop is true', () => {
    render(<NotificationChannelToggleWithLabels {...defaultProps} disabled />)

    const buttons = screen.getAllByRole('button')
    buttons.forEach((button) => {
      expect(button).toBeDisabled()
    })
  })

  it('should apply custom className', () => {
    const { container } = render(
      <NotificationChannelToggleWithLabels {...defaultProps} className="custom-class" />
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('should have keyboard accessibility', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<NotificationChannelToggleWithLabels {...defaultProps} onChange={onChange} />)

    const emailButton = screen.getByLabelText(/disable email notifications/i)

    // Focus the button
    await user.tab()
    expect(emailButton).toHaveFocus()

    // Activate with Enter key
    await user.keyboard('{Enter}')
    expect(onChange).toHaveBeenCalledWith('email', false)
  })
})
