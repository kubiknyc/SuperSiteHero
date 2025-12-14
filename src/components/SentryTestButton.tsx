/**
 * Sentry Test Button Component
 *
 * This is a temporary component to test Sentry error tracking.
 * Add this to any page to verify Sentry is capturing errors.
 *
 * Usage:
 * import { SentryTestButton } from '@/components/SentryTestButton'
 *
 * function YourPage() {
 *   return (
 *     <div>
 *       <SentryTestButton />
 *       // ... rest of your page
 *     </div>
 *   )
 * }
 *
 * After clicking the button, check your Sentry dashboard at:
 * https://sentry.io/organizations/your-org/issues/
 *
 * IMPORTANT: Remove this component before deploying to production!
 */

import { Button } from '@/components/ui/button'
import { captureException, captureMessage, addSentryBreadcrumb } from '@/lib/sentry'

export function SentryTestButton() {
  const testError = () => {
    addSentryBreadcrumb(
      'User clicked Sentry test button',
      'user-action',
      'info'
    )

    try {
      throw new Error('Test error from JobSight construction platform')
    } catch (error) {
      captureException(error as Error, {
        module: 'testing',
        feature: 'sentry-integration',
        environment: import.meta.env.MODE,
      })

      alert('Test error sent to Sentry! Check your Sentry dashboard.')
    }
  }

  const testMessage = () => {
    addSentryBreadcrumb(
      'User clicked test message button',
      'user-action',
      'info'
    )

    captureMessage(
      'Test message from JobSight - This is a manual message capture',
      'info',
      {
        module: 'testing',
        feature: 'sentry-integration',
      }
    )

    alert('Test message sent to Sentry! Check your Sentry dashboard.')
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 p-4 bg-white border border-gray-200 rounded-lg shadow-lg">
      <p className="text-xs font-semibold text-gray-700 mb-2">
        🧪 Sentry Testing (Dev Only)
      </p>

      <Button
        onClick={testError}
        variant="destructive"
        size="sm"
        className="text-xs"
      >
        Test Error Capture
      </Button>

      <Button
        onClick={testMessage}
        variant="outline"
        size="sm"
        className="text-xs"
      >
        Test Message Capture
      </Button>

      <p className="text-xs text-gray-500 mt-2">
        Remove before production!
      </p>
    </div>
  )
}

/**
 * Hook version for programmatic testing
 */
export function useSentryTest() {
  const testError = () => {
    try {
      throw new Error('Programmatic test error')
    } catch (error) {
      captureException(error as Error, { source: 'hook' })
    }
  }

  const testMessage = (message: string) => {
    captureMessage(message, 'info', { source: 'hook' })
  }

  return { testError, testMessage }
}
