// File: /src/pages/site-instructions/SiteInstructionAcknowledgePage.tsx
// Mobile-optimized page for acknowledging site instructions via QR code
// Milestone 1.2: Site Instructions QR Code Workflow

import { useParams, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, AlertCircle, ArrowLeft, QrCode, Clock, ShieldAlert } from 'lucide-react'
import { useInstructionByQRToken } from '@/features/site-instructions/hooks'
import { MobileAcknowledgmentForm } from '@/features/site-instructions/components'
import { useAuth } from '@/lib/auth/AuthContext'
import { format, parseISO, isPast } from 'date-fns'

export function SiteInstructionAcknowledgePage() {
  const { token } = useParams<{ token: string }>()
  const { user, isLoading: authLoading } = useAuth()

  const {
    data: instruction,
    isLoading,
    error,
    isError,
  } = useInstructionByQRToken(token || '')

  // Determine if user is anonymous (via QR code without login)
  const isAnonymous = !authLoading && !user

  // Loading state
  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12">
            <div className="flex flex-col items-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading instruction...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state - Invalid or expired token
  if (isError || !instruction) {
    const errorMessage = error instanceof Error ? error.message : 'Invalid or expired QR code'
    const isExpired = errorMessage.toLowerCase().includes('expired')

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12">
            <div className="flex flex-col items-center text-center">
              {isExpired ? (
                <Clock className="h-16 w-16 text-amber-500 mb-4" />
              ) : (
                <AlertCircle className="h-16 w-16 text-destructive mb-4" />
              )}
              <h2 className="text-xl font-semibold mb-2">
                {isExpired ? 'QR Code Expired' : 'Invalid QR Code'}
              </h2>
              <p className="text-muted-foreground mb-6">
                {isExpired
                  ? 'This QR code has expired. Please contact the project manager for a new one.'
                  : 'This QR code is not valid. Please scan a valid site instruction QR code.'}
              </p>
              <div className="space-y-2 w-full max-w-xs">
                {user ? (
                  <Button asChild className="w-full">
                    <Link to="/site-instructions">Go to Site Instructions</Link>
                  </Button>
                ) : (
                  <Button asChild className="w-full">
                    <Link to="/login">Sign In</Link>
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.location.reload()}
                >
                  <QrCode className="mr-2 h-4 w-4" />
                  Scan Another Code
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if QR code is about to expire (within 24 hours)
  const expiresAt = instruction.qr_code_expires_at
    ? parseISO(instruction.qr_code_expires_at)
    : null
  const isExpiringSoon =
    expiresAt && !isPast(expiresAt) && expiresAt.getTime() - Date.now() < 24 * 60 * 60 * 1000

  const handleSuccess = () => {
    // Could navigate to a success page or just show success state in form
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          {user ? (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/site-instructions">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Link>
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              <span className="font-semibold">Site Instruction</span>
            </div>
          )}
          <div className="flex-1" />
          {isAnonymous && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Expiring Soon Warning */}
        {isExpiringSoon && expiresAt && (
          <div className="mb-4 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
            <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">QR Code Expiring Soon</p>
              <p className="text-amber-700">
                This QR code expires on {format(expiresAt, 'MMMM d, yyyy \'at\' h:mm a')}.
              </p>
            </div>
          </div>
        )}

        {/* Anonymous User Notice */}
        {isAnonymous && (
          <div className="mb-4 flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
            <ShieldAlert className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Guest Acknowledgment</p>
              <p className="text-blue-700">
                You're acknowledging as a guest.{' '}
                <Link to="/login" className="underline hover:text-blue-900">
                  Sign in
                </Link>{' '}
                to link this to your account.
              </p>
            </div>
          </div>
        )}

        {/* Acknowledgment Form */}
        <MobileAcknowledgmentForm
          instruction={instruction}
          onSuccess={handleSuccess}
          isAnonymous={isAnonymous}
        />
      </main>

      {/* Footer */}
      <footer className="max-w-lg mx-auto px-4 py-6 text-center text-xs text-muted-foreground">
        <p>
          By acknowledging, you confirm receipt and understanding of this site instruction.
        </p>
        {instruction.project?.name && (
          <p className="mt-1">Project: {instruction.project.name}</p>
        )}
      </footer>
    </div>
  )
}

export default SiteInstructionAcknowledgePage
