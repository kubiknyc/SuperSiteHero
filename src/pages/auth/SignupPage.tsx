// File: /src/pages/auth/SignupPage.tsx
// Signup page for new user registration with rate limiting

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/lib/notifications/ToastContext'
import { HardHat, Loader2 } from 'lucide-react'
import { useRateLimit } from '@/lib/auth/rate-limiter'
import { RateLimitWarning } from '@/components/auth/RateLimitWarning'

export function SignupPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    companyName: '',
  })
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()
  const { success, error: showError } = useToast()

  // Rate limiting for signup attempts
  const rateLimit = useRateLimit({
    action: 'signup',
    identifier: formData.email || undefined,
  })

  const isDisabled = loading || !rateLimit.isAllowed

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Check rate limit
    if (!rateLimit.isAllowed) {
      showError('Too Many Attempts', `Please wait ${rateLimit.formattedLockoutTime} before trying again.`)
      return
    }

    setLoading(true)

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      showError('Error', 'Passwords do not match')
      setLoading(false)
      return
    }

    // Validate password strength
    const validatePassword = (password: string): { valid: boolean; error?: string } => {
      if (password.length < 8) {
        return { valid: false, error: 'Password must be at least 8 characters long' }
      }
      if (!/[A-Z]/.test(password)) {
        return { valid: false, error: 'Password must contain at least one uppercase letter' }
      }
      if (!/[a-z]/.test(password)) {
        return { valid: false, error: 'Password must contain at least one lowercase letter' }
      }
      if (!/[0-9]/.test(password)) {
        return { valid: false, error: 'Password must contain at least one number' }
      }
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        return { valid: false, error: 'Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)' }
      }
      return { valid: true }
    }

    const passwordValidation = validatePassword(formData.password)
    if (!passwordValidation.valid) {
      showError('Error', passwordValidation.error)
      setLoading(false)
      return
    }

    try {
      // Sign up the user
      const { error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            company_name: formData.companyName,
          },
        },
      })

      if (authError) {throw authError}

      // Reset rate limit on success
      rateLimit.reset()
      success('Success', 'Account created successfully. Please check your email to verify your account.')

      // Redirect to login page
      navigate('/login')
    } catch (err) {
      // Record failed attempt
      const state = rateLimit.recordAttempt()

      if (state.isLocked) {
        showError('Too Many Attempts', `Please try again in ${rateLimit.formattedLockoutTime}.`)
      } else {
        showError('Error', err instanceof Error ? err.message : 'Failed to create account')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface dark:bg-background px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary-100 dark:bg-primary-950 p-3">
              <HardHat className="h-8 w-8 text-primary dark:text-primary-400" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Create your account</CardTitle>
          <CardDescription className="text-center">
            Get started with Construction Management Platform
          </CardDescription>
        </CardHeader>

        {/* Rate Limit Warning */}
        <CardContent className="pb-0">
          <RateLimitWarning state={rateLimit.state} action="signup" />
        </CardContent>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder="John"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  disabled={isDisabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder="Doe"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  disabled={isDisabled}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName">Company name</Label>
              <Input
                id="companyName"
                name="companyName"
                type="text"
                placeholder="ABC Construction"
                required
                value={formData.companyName}
                onChange={handleChange}
                disabled={isDisabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@company.com"
                required
                value={formData.email}
                onChange={handleChange}
                disabled={isDisabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                value={formData.password}
                onChange={handleChange}
                disabled={isDisabled}
              />
              <p className="text-caption text-muted dark:text-disabled">Must be at least 8 characters with uppercase, lowercase, number, and special character</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={isDisabled}
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isDisabled}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </Button>

            <p className="body-small text-center text-secondary dark:text-disabled">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-primary hover:text-primary/90 dark:text-primary-400 dark:hover:text-primary-300 hover:underline font-medium"
              >
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
