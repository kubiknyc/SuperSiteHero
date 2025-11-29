// File: /src/pages/auth/ForgotPasswordPage.tsx
// Password reset request page

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { HardHat, ArrowLeft } from 'lucide-react'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const { addToast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {throw error}

      setSubmitted(true)
      addToast({
        title: 'Success',
        description: 'Password reset link sent to your email',
        variant: 'success',
      })
    } catch (err) {
      addToast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to send reset link',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-blue-100 p-3">
              <HardHat className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Reset your password</CardTitle>
          <CardDescription className="text-center">
            {submitted
              ? 'Check your email for a password reset link'
              : 'Enter your email address and we\'ll send you a link to reset your password'}
          </CardDescription>
        </CardHeader>

        {!submitted ? (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
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
                  disabled={loading}
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending...' : 'Send reset link'}
              </Button>

              <Link
                to="/login"
                className="flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </CardFooter>
          </form>
        ) : (
          <CardFooter className="flex flex-col space-y-4">
            <p className="text-sm text-center text-gray-600">
              Didn't receive an email?{' '}
              <button
                onClick={() => setSubmitted(false)}
                className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
              >
                Try again
              </button>
            </p>

            <Link
              to="/login"
              className="flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
