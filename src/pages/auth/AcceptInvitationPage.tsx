/**
 * Accept Invitation Page
 * Page for subcontractors to accept portal invitations
 */

import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth/AuthContext'
import { useValidateInvitation, useAcceptInvitation } from '@/features/subcontractor-portal/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Building2,
  CheckCircle,
  XCircle,
  LogIn,
  UserPlus,
  Loader2,
  ArrowRight,
} from 'lucide-react'

function InvitationSkeleton() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full mt-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  )
}

export function AcceptInvitationPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [accepted, setAccepted] = useState(false)

  const { data: validation, isLoading: validating, isError } = useValidateInvitation(token)
  const acceptInvitation = useAcceptInvitation()

  // Auto-accept if user is logged in and invitation is valid
  useEffect(() => {
    if (user && validation?.is_valid && token && !accepted) {
      handleAccept()
    }
  }, [user, validation, token, accepted])

  const handleAccept = async () => {
    if (!token || !user?.id) return

    acceptInvitation.mutate(
      { token, userId: user.id },
      {
        onSuccess: () => {
          setAccepted(true)
          // Redirect to portal after a brief delay
          setTimeout(() => {
            navigate('/portal')
          }, 2000)
        },
      }
    )
  }

  // Show loading state
  if (authLoading || validating) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <InvitationSkeleton />
      </div>
    )
  }

  // Invalid or expired invitation
  if (isError || !validation?.is_valid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              {validation?.error || 'This invitation link is invalid or has expired.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Please contact the project administrator to request a new invitation.
            </p>
            <Button asChild variant="outline">
              <Link to="/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Successfully accepted
  if (accepted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle>Welcome to the Portal!</CardTitle>
            <CardDescription>
              Your invitation has been accepted successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="rounded-lg bg-green-50 p-4">
              <p className="text-sm text-green-800">
                You now have access to the subcontractor portal for{' '}
                <strong>{validation.project?.name}</strong>.
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Redirecting you to the portal...
            </p>
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show invitation details (user not logged in)
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Portal Invitation</CardTitle>
          <CardDescription>
            You've been invited to access the subcontractor portal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Invitation Details */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Company
              </p>
              <p className="font-medium">{validation.subcontractor?.company_name}</p>
              <p className="text-sm text-muted-foreground">
                {validation.subcontractor?.trade}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Project
              </p>
              <p className="font-medium">{validation.project?.name}</p>
              {validation.project?.address && (
                <p className="text-sm text-muted-foreground">{validation.project.address}</p>
              )}
            </div>
          </div>

          {/* Auth Options */}
          {user ? (
            // User is logged in - show accept button
            <div className="space-y-3">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Signed in as {user.email}</AlertTitle>
                <AlertDescription>
                  Click below to accept the invitation and access the portal.
                </AlertDescription>
              </Alert>
              <Button
                className="w-full"
                onClick={handleAccept}
                disabled={acceptInvitation.isPending}
              >
                {acceptInvitation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  <>
                    Accept Invitation
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          ) : (
            // User not logged in - show login/signup options
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">
                Sign in or create an account to accept this invitation
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button asChild variant="outline">
                  <Link to={`/login?redirect=/invite/${token}`}>
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In
                  </Link>
                </Button>
                <Button asChild>
                  <Link to={`/signup?redirect=/invite/${token}&email=${validation.invitation?.email || ''}`}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Sign Up
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default AcceptInvitationPage
