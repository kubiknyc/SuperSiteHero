/**
 * QuickBooks OAuth Callback Page
 *
 * Handles the OAuth redirect from QuickBooks after user authorization.
 */

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, XCircle, ArrowRight } from 'lucide-react'
import { useCompleteQBConnection } from '@/features/quickbooks/hooks/useQuickBooks'
import { toast } from 'sonner'

type CallbackState = 'processing' | 'success' | 'error'

export function QuickBooksCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const completeConnection = useCompleteQBConnection()

  const [state, setState] = useState<CallbackState>('processing')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState<string | null>(null)

  useEffect(() => {
    const processCallback = async () => {
      // Get OAuth parameters from URL
      const code = searchParams.get('code')
      const realmId = searchParams.get('realmId')
      const stateParam = searchParams.get('state')
      const error = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')

      // Check for OAuth error
      if (error) {
        setState('error')
        setErrorMessage(errorDescription || `OAuth Error: ${error}`)
        return
      }

      // Validate required parameters
      if (!code || !realmId || !stateParam) {
        setState('error')
        setErrorMessage('Missing required OAuth parameters. Please try connecting again.')
        return
      }

      try {
        const connection = await completeConnection.mutateAsync({
          code,
          realm_id: realmId,
          state: stateParam,
        })

        setState('success')
        setCompanyName(connection.company_name)
        toast.success('Successfully connected to QuickBooks!')
      } catch (err: any) {
        setState('error')
        setErrorMessage(
          err?.message || 'Failed to complete QuickBooks connection. Please try again.'
        )
      }
    }

    processCallback()
  }, [searchParams, completeConnection])

  const handleContinue = () => {
    navigate('/settings/quickbooks')
  }

  const handleRetry = () => {
    navigate('/settings/quickbooks')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {state === 'processing' && (
              <div className="w-16 h-16 rounded-full bg-info-light flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            )}
            {state === 'success' && (
              <div className="w-16 h-16 rounded-full bg-success-light flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
            )}
            {state === 'error' && (
              <div className="w-16 h-16 rounded-full bg-error-light flex items-center justify-center">
                <XCircle className="h-8 w-8 text-error" />
              </div>
            )}
          </div>

          <CardTitle>
            {state === 'processing' && 'Connecting to QuickBooks...'}
            {state === 'success' && 'Connection Successful!'}
            {state === 'error' && 'Connection Failed'}
          </CardTitle>

          <CardDescription>
            {state === 'processing' && 'Please wait while we complete the connection.'}
            {state === 'success' && (
              <>
                Your QuickBooks account
                {companyName && <strong> ({companyName})</strong>} is now connected.
              </>
            )}
            {state === 'error' && errorMessage}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {state === 'processing' && (
            <div className="text-center text-sm text-muted-foreground">
              <p>This may take a few seconds...</p>
            </div>
          )}

          {state === 'success' && (
            <>
              <div className="bg-success-light border border-green-200 rounded-lg p-4 text-sm">
                <h4 className="font-medium text-green-800 mb-2 heading-card">What's Next?</h4>
                <ul className="text-success-dark space-y-1">
                  <li>• Set up account mappings for cost codes</li>
                  <li>• Configure automatic sync settings</li>
                  <li>• Start syncing vendors and invoices</li>
                </ul>
              </div>

              <Button onClick={handleContinue} className="w-full">
                Continue to Settings
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          )}

          {state === 'error' && (
            <>
              <div className="bg-error-light border border-red-200 rounded-lg p-4 text-sm">
                <h4 className="font-medium text-red-800 mb-2 heading-card">Troubleshooting</h4>
                <ul className="text-error-dark space-y-1">
                  <li>• Make sure you authorized the correct QuickBooks company</li>
                  <li>• Check that your QuickBooks subscription is active</li>
                  <li>• Try clearing your browser cache and trying again</li>
                </ul>
              </div>

              <Button onClick={handleRetry} variant="outline" className="w-full">
                Try Again
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
