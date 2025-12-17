// File: /src/pages/auth/LoginPage.tsx
// Login page for user authentication with biometric support

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/lib/notifications/ToastContext'
import { Fingerprint, Loader2 } from 'lucide-react'
import { AuthLogo } from '@/components/brand'
import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  authenticateWithBiometric,
  verifyBiometricAuthentication,
  setLastBiometricAuthTime,
} from '@/lib/auth/biometric'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [biometricLoading, setBiometricLoading] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [checkingBiometric, setCheckingBiometric] = useState(true)

  const { signIn } = useAuth()
  const navigate = useNavigate()
  const { success, error } = useToast()

  // Check if biometric authentication is available
  useEffect(() => {
    const checkBiometric = async () => {
      setCheckingBiometric(true)
      try {
        const webAuthnSupported = isWebAuthnSupported()
        const platformAvailable = await isPlatformAuthenticatorAvailable()
        setBiometricAvailable(webAuthnSupported && platformAvailable)
      } catch (err) {
        console.error('Error checking biometric availability:', err)
        setBiometricAvailable(false)
      } finally {
        setCheckingBiometric(false)
      }
    }

    checkBiometric()
  }, [])

  // Handle password login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await signIn(email, password)
      success('Success', 'You have been signed in successfully.')
      navigate('/')
    } catch (err) {
      error('Error', err instanceof Error ? err.message : 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  // Handle biometric login
  const handleBiometricLogin = useCallback(async () => {
    setBiometricLoading(true)

    try {
      // Attempt biometric authentication (discoverable credentials)
      const authResult = await authenticateWithBiometric()

      // Verify with backend
      const verificationResult = await verifyBiometricAuthentication(
        authResult.credentialId,
        authResult.authenticatorData,
        authResult.clientDataJSON,
        authResult.signature
      )

      if (verificationResult.token && verificationResult.userId) {
        // Mark biometric auth time
        setLastBiometricAuthTime()

        success('Success', 'Signed in with biometrics')

        // If we got an action link, use it for proper session establishment
        // For now, we'll show a message that the user should complete login
        // This is because WebAuthn doesn't directly create Supabase sessions

        // In a production implementation, you would:
        // 1. Use the returned token to establish a session
        // 2. Or implement a custom session mechanism
        // 3. Or use Supabase's custom access token feature

        // For now, prompt user to use password (biometric verified their identity)
        success(
          'Identity Verified',
          'Biometric authentication successful. Please enter your password to complete sign-in.'
        )
      } else {
        throw new Error('Verification failed - no token received')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Biometric authentication failed'
      error('Authentication Failed', errorMessage)
    } finally {
      setBiometricLoading(false)
    }
  }, [error, success])

  const isLoading = loading || biometricLoading

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <AuthLogo />
          <CardDescription className="text-center">
            Sign in to access your projects and daily reports
          </CardDescription>
        </CardHeader>

        {/* Biometric Login Option */}
        {biometricAvailable && !checkingBiometric && (
          <>
            <CardContent className="pb-0">
              <Button
                type="button"
                variant="outline"
                className="w-full h-14 text-base"
                onClick={handleBiometricLogin}
                disabled={isLoading}
              >
                {biometricLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Fingerprint className="h-5 w-5 mr-2" />
                    Sign in with Biometrics
                  </>
                )}
              </Button>
            </CardContent>

            <div className="px-6 py-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white dark:bg-gray-900 px-2 text-uppercase-label text-gray-500 dark:text-gray-400">or continue with email</span>
                </div>
              </div>
            </div>
          </>
        )}

        <form onSubmit={handleSubmit}>
          <CardContent className={`space-y-4 ${biometricAvailable && !checkingBiometric ? 'pt-0' : ''}`}>
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@company.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoComplete="email webauthn"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="body-small text-primary hover:text-primary/90 dark:text-primary-400 dark:hover:text-primary-300 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="current-password webauthn"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/80" disabled={isLoading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>

            <p className="body-small text-center text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="text-primary hover:text-primary/80 dark:text-primary-400 dark:hover:text-primary-300 hover:underline font-medium"
              >
                Sign up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
