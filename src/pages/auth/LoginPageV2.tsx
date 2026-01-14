// File: /src/pages/auth/LoginPageV2.tsx
// Premium login page with construction industry aesthetic
// Features: Blueprint grid, industrial styling, dramatic animations

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/lib/notifications/ToastContext'
import {
  Fingerprint,
  Loader2,
  HardHat,
  Shield,
  Building2,
  ArrowRight,
  Eye,
  EyeOff
} from 'lucide-react'
import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  authenticateWithBiometric,
  verifyBiometricAuthentication,
  setLastBiometricAuthTime,
} from '@/lib/auth/biometric'
import { useRateLimit } from '@/lib/auth/rate-limiter'
import { RateLimitWarning } from '@/components/auth/RateLimitWarning'
import { logger } from '@/lib/utils/logger'
import { cn } from '@/lib/utils'

// Construction stats for the hero panel
const constructionStats = [
  { label: 'Projects Managed', value: '2,400+', icon: Building2 },
  { label: 'Daily Reports', value: '50K+', icon: HardHat },
  { label: 'Enterprise Ready', value: '99.9%', icon: Shield },
]

export function LoginPageV2() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [biometricLoading, setBiometricLoading] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [checkingBiometric, setCheckingBiometric] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [showSlowWarning, setShowSlowWarning] = useState(false)

  // Track mounted state for safe state updates
  const mountedRef = useRef(true)

  const { signIn } = useAuth()
  const navigate = useNavigate()
  const { success, error } = useToast()

  // Mount animation and cleanup
  useEffect(() => {
    setMounted(true)
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Show slow warning after 5 seconds of loading
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        if (mountedRef.current) {
          setShowSlowWarning(true)
        }
      }, 5000)
      return () => clearTimeout(timer)
    }
    setShowSlowWarning(false)
  }, [loading])

  // Rate limiting
  const rateLimit = useRateLimit({
    action: 'login',
    identifier: email || undefined,
    onLockoutExpired: () => {
      logger.log('[LoginPageV2] Rate limit lockout expired')
    },
  })

  // Check biometric availability
  useEffect(() => {
    const checkBiometric = async () => {
      setCheckingBiometric(true)
      try {
        const webAuthnSupported = isWebAuthnSupported()
        const platformAvailable = await isPlatformAuthenticatorAvailable()
        setBiometricAvailable(webAuthnSupported && platformAvailable)
      } catch (err) {
        logger.error('Error checking biometric:', err)
        setBiometricAvailable(false)
      } finally {
        setCheckingBiometric(false)
      }
    }
    checkBiometric()
  }, [])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!rateLimit.isAllowed) {
      error('Too Many Attempts', `Please wait ${rateLimit.formattedLockoutTime} before trying again.`)
      return
    }

    setLoading(true)

    // Create timeout promise to prevent indefinite waiting
    const SIGN_IN_TIMEOUT_MS = 30000
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Sign in timed out. Please check your connection and try again.'))
      }, SIGN_IN_TIMEOUT_MS)
    })

    try {
      // Race between sign-in and timeout
      await Promise.race([signIn(email, password), timeoutPromise])

      // Only update state if still mounted
      if (!mountedRef.current) {return}

      rateLimit.reset()
      success('Welcome back', 'You have been signed in successfully.')
      navigate('/')
    } catch (err) {
      // Only update state if still mounted
      if (!mountedRef.current) {return}

      const state = rateLimit.recordAttempt()
      if (state.isLocked) {
        error('Account Locked', `Too many failed attempts. Try again in ${rateLimit.formattedLockoutTime}.`)
      } else {
        error('Sign In Failed', err instanceof Error ? err.message : 'Invalid credentials')
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }

  // Handle biometric login
  const handleBiometricLogin = useCallback(async () => {
    setBiometricLoading(true)

    try {
      const authResult = await authenticateWithBiometric()
      const verificationResult = await verifyBiometricAuthentication(
        authResult.credentialId,
        authResult.authenticatorData,
        authResult.clientDataJSON,
        authResult.signature
      )

      if (verificationResult.token && verificationResult.userId) {
        setLastBiometricAuthTime()
        success('Identity Verified', 'Biometric authentication successful.')
      } else {
        throw new Error('Verification failed')
      }
    } catch (err) {
      error('Authentication Failed', err instanceof Error ? err.message : 'Biometric authentication failed')
    } finally {
      setBiometricLoading(false)
    }
  }, [error, success])

  const isLoading = loading || biometricLoading
  const isDisabled = isLoading || !rateLimit.isAllowed

  return (
    <div className="min-h-screen flex bg-slate-950 overflow-hidden">
      {/* Left Panel - Hero/Branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden">
        {/* Blueprint Grid Background */}
        <div className="absolute inset-0 bg-slate-900">
          {/* Primary grid */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `
                linear-gradient(rgba(30, 64, 175, 0.4) 1px, transparent 1px),
                linear-gradient(90deg, rgba(30, 64, 175, 0.4) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px',
            }}
          />
          {/* Secondary fine grid */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `
                linear-gradient(rgba(30, 64, 175, 0.3) 1px, transparent 1px),
                linear-gradient(90deg, rgba(30, 64, 175, 0.3) 1px, transparent 1px)
              `,
              backgroundSize: '12px 12px',
            }}
          />
          {/* Diagonal accent lines */}
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `repeating-linear-gradient(
                45deg,
                transparent,
                transparent 100px,
                rgba(59, 130, 246, 0.5) 100px,
                rgba(59, 130, 246, 0.5) 101px
              )`,
            }}
          />
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-transparent to-blue-950/50" />

        {/* Animated glow orbs */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-indigo-600/15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />

        {/* Content */}
        <div className={cn(
          "relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full",
          "transition-all duration-1000 ease-out",
          mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
        )}>
          {/* Logo & Tagline */}
          <div>
            <div className="mb-8">
              <img
                src="/jobsight-logo.png"
                alt="JobSight"
                className="h-14 object-contain drop-shadow-lg"
              />
            </div>

            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
              Build Smarter.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                Manage Better.
              </span>
            </h1>

            <p className="text-lg text-slate-400 max-w-md leading-relaxed">
              The field management platform trusted by construction professionals
              to streamline daily reports, RFIs, and project workflows.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-6 mt-auto">
            {constructionStats.map((stat, index) => (
              <div
                key={stat.label}
                className={cn(
                  "group relative p-5 rounded-2xl transition-all duration-500",
                  "bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm",
                  "hover:bg-white/[0.06] hover:border-white/[0.1] hover:shadow-lg hover:shadow-blue-500/5",
                  mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                )}
                style={{ transitionDelay: `${300 + index * 100}ms` }}
              >
                <stat.icon className="w-5 h-5 text-blue-400 mb-3 transition-transform group-hover:scale-110" />
                <div className="text-2xl font-bold text-white mb-1 font-mono tracking-tight">
                  {stat.value}
                </div>
                <div className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Blueprint corner accent */}
          <div className="absolute bottom-0 right-0 w-64 h-64 opacity-10">
            <svg viewBox="0 0 100 100" className="w-full h-full text-blue-400">
              <defs>
                <pattern id="corner-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#corner-grid)" />
              <circle cx="0" cy="100" r="80" fill="none" stroke="currentColor" strokeWidth="0.5" />
              <circle cx="0" cy="100" r="60" fill="none" stroke="currentColor" strokeWidth="0.5" />
              <circle cx="0" cy="100" r="40" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </svg>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-6 sm:p-8 lg:p-12">
        <div className={cn(
          "w-full max-w-md transition-all duration-700 ease-out",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}>
          {/* Mobile Logo */}
          <div className="mb-8 lg:hidden">
            <img
              src="/jobsight-logo.png"
              alt="JobSight"
              className="h-10 object-contain"
            />
          </div>

          {/* Form Header */}
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Welcome back
            </h2>
            <p className="text-slate-400">
              Sign in to continue to your dashboard
            </p>
          </div>

          {/* Rate Limit Warning */}
          {rateLimit.state.isLocked && (
            <div className="mb-6">
              <RateLimitWarning state={rateLimit.state} action="login" />
            </div>
          )}

          {/* Biometric Login */}
          {biometricAvailable && !checkingBiometric && !rateLimit.state.isLocked && (
            <div className="mb-6">
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full h-14 text-base font-medium",
                  "bg-white/[0.03] border-white/10 text-white",
                  "hover:bg-white/[0.06] hover:border-white/20",
                  "transition-all duration-200"
                )}
                onClick={handleBiometricLogin}
                disabled={isDisabled}
              >
                {biometricLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Fingerprint className="h-5 w-5 mr-3" />
                    Sign in with Biometrics
                  </>
                )}
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-4 text-xs uppercase tracking-wider text-slate-600 bg-slate-950">
                    or continue with email
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-slate-300"
              >
                Email address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@company.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isDisabled}
                autoComplete="email webauthn"
                className={cn(
                  "h-12 px-4 text-base",
                  "bg-white/[0.03] border-white/10 text-white placeholder:text-slate-600",
                  "focus:bg-white/[0.05] focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20",
                  "transition-all duration-200"
                )}
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-slate-300"
                >
                  Password
                </Label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isDisabled}
                  autoComplete="current-password webauthn"
                  className={cn(
                    "h-12 px-4 pr-12 text-base",
                    "bg-white/[0.03] border-white/10 text-white placeholder:text-slate-600",
                    "focus:bg-white/[0.05] focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20",
                    "transition-all duration-200"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Slow Connection Warning */}
            {loading && showSlowWarning && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-sm text-yellow-400 text-center">
                  This is taking longer than expected. Please check your connection.
                </p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isDisabled}
              className={cn(
                "w-full h-12 text-base font-semibold",
                "bg-gradient-to-r from-blue-600 to-blue-700",
                "hover:from-blue-500 hover:to-blue-600",
                "shadow-lg shadow-blue-600/25 hover:shadow-blue-500/30",
                "border border-blue-500/20",
                "transition-all duration-200",
                "group"
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </form>

          {/* Sign Up Link */}
          <p className="mt-8 text-center text-slate-500">
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Create account
            </Link>
          </p>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-slate-800/50">
            <div className="flex items-center justify-center gap-6 text-xs text-slate-600">
              <Link to="/privacy" className="hover:text-slate-400 transition-colors">
                Privacy Policy
              </Link>
              <span>•</span>
              <Link to="/terms" className="hover:text-slate-400 transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPageV2
