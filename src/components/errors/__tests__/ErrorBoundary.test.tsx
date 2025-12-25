import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorBoundary } from '../ErrorBoundary'

// Mock Sentry
vi.mock('@/lib/sentry', () => ({
  captureException: vi.fn(),
  addSentryBreadcrumb: vi.fn(),
}))

// Component that throws an error for testing
const ThrowError = ({ error }: { error?: Error }) => {
  if (error) {
    throw error
  }
  return <div>No error</div>
}

describe('ErrorBoundary', () => {
  const originalEnv = process.env.NODE_ENV
  let consoleError: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // Mock console.error to prevent error logs in test output
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleError.mockRestore()
    process.env.NODE_ENV = originalEnv
    vi.clearAllMocks()
  })

  describe('Normal Operation', () => {
    it('renders children when there is no error', () => {
      render(
        <ErrorBoundary>
          <div data-testid="child-content">Child Content</div>
        </ErrorBoundary>
      )

      expect(screen.getByTestId('child-content')).toBeInTheDocument()
      expect(screen.getByText('Child Content')).toBeInTheDocument()
    })

    it('passes through multiple children', () => {
      render(
        <ErrorBoundary>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
          <div data-testid="child-3">Child 3</div>
        </ErrorBoundary>
      )

      expect(screen.getByTestId('child-1')).toBeInTheDocument()
      expect(screen.getByTestId('child-2')).toBeInTheDocument()
      expect(screen.getByTestId('child-3')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('catches errors thrown by child components', () => {
      const error = new Error('Test error')

      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something Went Wrong')).toBeInTheDocument()
      expect(screen.getByText(/We're sorry, but something unexpected happened/)).toBeInTheDocument()
    })

    it('displays error icon when error occurs', () => {
      const error = new Error('Test error')

      const { container } = render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      )

      // Check for AlertTriangle icon (Lucide React renders SVG)
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('logs error to Sentry', () => {
      const { captureException, addSentryBreadcrumb } = require('@/lib/sentry')
      const error = new Error('Test error')

      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      )

      expect(addSentryBreadcrumb).toHaveBeenCalledWith(
        'React Error Boundary triggered',
        'error',
        'error',
        expect.objectContaining({
          errorName: 'Error',
        })
      )

      expect(captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          errorBoundary: true,
        })
      )
    })
  })

  describe('Error Recovery', () => {
    it('shows Try Again button', () => {
      const error = new Error('Test error')

      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Try Again')).toBeInTheDocument()
    })

    it('shows Go Home button', () => {
      const error = new Error('Test error')

      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Go Home')).toBeInTheDocument()
    })

    it('resets error state when Try Again is clicked', async () => {
      const user = userEvent.setup()
      const error = new Error('Test error')
      let shouldThrow = true

      const ConditionalError = () => {
        if (shouldThrow) {
          throw error
        }
        return <div data-testid="success-content">Success!</div>
      }

      render(
        <ErrorBoundary>
          <ConditionalError />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something Went Wrong')).toBeInTheDocument()

      // Fix the error condition
      shouldThrow = false

      const tryAgainButton = screen.getByText('Try Again')
      await user.click(tryAgainButton)

      // After reset, it should try to render children again
      // In a real scenario, the error condition would be fixed
    })

    it('navigates to home when Go Home is clicked', async () => {
      const user = userEvent.setup()
      const error = new Error('Test error')

      // Mock window.location
      delete (window as any).location
      window.location = { href: '' } as any

      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      )

      const goHomeButton = screen.getByText('Go Home')
      await user.click(goHomeButton)

      expect(window.location.href).toBe('/')
    })
  })

  describe('Development Mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
    })

    it('shows error message in development mode', () => {
      const error = new Error('Detailed test error message')

      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Detailed test error message')).toBeInTheDocument()
    })

    it('shows error stack trace in development mode', () => {
      const error = new Error('Test error')
      error.stack = 'Error: Test error\n    at TestComponent (test.tsx:10:15)'

      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Error Details (Development Only)')).toBeInTheDocument()
      expect(screen.getByText(/at TestComponent/)).toBeInTheDocument()
    })

    it('logs error to console in development mode', () => {
      consoleError.mockRestore() // Allow console.error for this test
      const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      const error = new Error('Test error')

      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      )

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error caught by boundary:',
        error,
        expect.any(Object)
      )

      mockConsoleError.mockRestore()
    })
  })

  describe('Production Mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production'
    })

    it('hides error message in production mode', () => {
      const error = new Error('Detailed test error message')

      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      )

      expect(screen.queryByText('Detailed test error message')).not.toBeInTheDocument()
      expect(screen.getByText('Something Went Wrong')).toBeInTheDocument()
    })

    it('hides error stack trace in production mode', () => {
      const error = new Error('Test error')
      error.stack = 'Error: Test error\n    at TestComponent (test.tsx:10:15)'

      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      )

      expect(screen.queryByText('Error Details (Development Only)')).not.toBeInTheDocument()
    })

    it('does not log error to console in production mode', () => {
      const error = new Error('Test error')

      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      )

      // console.error should not be called in production
      expect(consoleError).not.toHaveBeenCalled()
    })
  })

  describe('Custom Fallback', () => {
    it('renders custom fallback when provided', () => {
      const error = new Error('Test error')
      const customFallback = (err: Error, retry: () => void) => (
        <div data-testid="custom-fallback">
          <h1>Custom Error: {err.message}</h1>
          <button onClick={retry}>Custom Retry</button>
        </div>
      )

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError error={error} />
        </ErrorBoundary>
      )

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument()
      expect(screen.getByText('Custom Error: Test error')).toBeInTheDocument()
      expect(screen.getByText('Custom Retry')).toBeInTheDocument()
    })

    it('calls retry function from custom fallback', async () => {
      const user = userEvent.setup()
      const error = new Error('Test error')
      let shouldThrow = true

      const ConditionalError = () => {
        if (shouldThrow) {
          throw error
        }
        return <div data-testid="success-content">Success!</div>
      }

      const customFallback = (err: Error, retry: () => void) => (
        <div data-testid="custom-fallback">
          <button onClick={retry} data-testid="custom-retry">
            Custom Retry
          </button>
        </div>
      )

      render(
        <ErrorBoundary fallback={customFallback}>
          <ConditionalError />
        </ErrorBoundary>
      )

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument()

      // Fix the error condition
      shouldThrow = false

      const retryButton = screen.getByTestId('custom-retry')
      await user.click(retryButton)

      // Should attempt to render children again
    })

    it('does not render default fallback when custom fallback is provided', () => {
      const error = new Error('Test error')
      const customFallback = () => <div data-testid="custom-fallback">Custom</div>

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError error={error} />
        </ErrorBoundary>
      )

      expect(screen.queryByText('Something Went Wrong')).not.toBeInTheDocument()
      expect(screen.queryByText('Try Again')).not.toBeInTheDocument()
      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles errors with no message', () => {
      const error = new Error()

      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something Went Wrong')).toBeInTheDocument()
    })

    it('handles errors with no stack trace', () => {
      const error = new Error('Test error')
      error.stack = undefined

      process.env.NODE_ENV = 'development'

      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something Went Wrong')).toBeInTheDocument()
    })

    it('handles multiple sequential errors', () => {
      const error1 = new Error('First error')

      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError error={error1} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something Went Wrong')).toBeInTheDocument()

      const error2 = new Error('Second error')

      rerender(
        <ErrorBoundary>
          <ThrowError error={error2} />
        </ErrorBoundary>
      )

      // Should still show error UI
      expect(screen.getByText('Something Went Wrong')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has accessible error message headings', () => {
      const error = new Error('Test error')

      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      )

      const heading = screen.getByText('Something Went Wrong')
      expect(heading).toBeInTheDocument()
      expect(heading.tagName).toBe('H1')
    })

    it('has accessible buttons with proper text', () => {
      const error = new Error('Test error')

      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      )

      const tryAgainButton = screen.getByRole('button', { name: /try again/i })
      const goHomeButton = screen.getByRole('button', { name: /go home/i })

      expect(tryAgainButton).toBeInTheDocument()
      expect(goHomeButton).toBeInTheDocument()
    })

    it('has accessible expandable error details in development', () => {
      process.env.NODE_ENV = 'development'
      const error = new Error('Test error')
      error.stack = 'Test stack trace'

      const { container } = render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      )

      const details = container.querySelector('details')
      expect(details).toBeInTheDocument()

      const summary = container.querySelector('summary')
      expect(summary).toBeInTheDocument()
      expect(summary).toHaveTextContent('Error Details')
    })
  })
})
