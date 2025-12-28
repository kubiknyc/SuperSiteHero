/**
 * DocuSign OAuth Callback Page
 *
 * Handles the OAuth redirect from DocuSign after user authorization.
 * Completes the OAuth flow and redirects to DocuSign settings.
 */

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCompleteDocuSignConnection } from '@/features/docusign/hooks/useDocuSign'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, XCircle, FileSignature } from 'lucide-react'

type CallbackStatus = 'processing' | 'success' | 'error'

export function DocuSignCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const completeMutation = useCompleteDocuSignConnection()

  const [status, setStatus] = useState<CallbackStatus>('processing')
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    const handleCallback = async () => {
      // Get OAuth parameters from URL
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      const error = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')

      // Handle OAuth errors
      if (error) {
        setStatus('error')
        setErrorMessage(errorDescription || `OAuth error: ${error}`)
        return
      }

      // Validate required parameters
      if (!code) {
        setStatus('error')
        setErrorMessage('Authorization code missing from callback')
        return
      }

      if (!state) {
        setStatus('error')
        setErrorMessage('State parameter missing from callback')
        return
      }

      try {
        // Complete the OAuth flow
        await completeMutation.mutateAsync({
          code,
          state,
        })

        setStatus('success')

        // Redirect to DocuSign settings after a brief delay
        setTimeout(() => {
          navigate('/settings/docusign', { replace: true })
        }, 2000)
      } catch (err) {
        setStatus('error')
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Failed to complete DocuSign connection'
        )
      }
    }

    handleCallback()
  }, [searchParams, completeMutation, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          {status === 'processing' && (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center">
                <div className="relative">
                  <FileSignature className="h-16 w-16 text-primary" />
                  <Loader2 className="h-6 w-6 animate-spin text-primary absolute -bottom-1 -right-1" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Connecting DocuSign
                </h2>
                <p className="text-secondary mt-2">
                  Please wait while we complete the connection...
                </p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center">
                <div className="h-16 w-16 rounded-full bg-success-light flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-success" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  DocuSign Connected!
                </h2>
                <p className="text-secondary mt-2">
                  Your DocuSign account has been successfully connected.
                  Redirecting to settings...
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center">
                <div className="h-16 w-16 rounded-full bg-error-light flex items-center justify-center">
                  <XCircle className="h-10 w-10 text-error" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Connection Failed
                </h2>
                <p className="text-error mt-2">{errorMessage}</p>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => navigate('/settings/docusign', { replace: true })}
                  variant="outline"
                >
                  Go to DocuSign Settings
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  variant="ghost"
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default DocuSignCallbackPage
