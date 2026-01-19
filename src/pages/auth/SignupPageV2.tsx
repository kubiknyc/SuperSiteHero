// File: /src/pages/auth/SignupPageV2.tsx
// Premium signup page with construction industry aesthetic
// Matches LoginPageV2 design language

import { useState, useEffect, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/lib/notifications/ToastContext'
import {
  HardHat,
  Loader2,
  ArrowRight,
  Eye,
  EyeOff,
  Check,
  X,
  Users,
  FileText,
  Clock,
  Building2
} from 'lucide-react'
import { useRateLimit } from '@/lib/auth/rate-limiter'
import { RateLimitWarning } from '@/components/auth/RateLimitWarning'
import { cn } from '@/lib/utils'

// Features list for the hero panel
const platformFeatures = [
  { icon: FileText, title: 'Daily Reports', desc: 'Streamlined field documentation' },
  { icon: Users, title: 'Team Collaboration', desc: 'Real-time project updates' },
  { icon: Clock, title: 'Time Tracking', desc: 'Accurate labor management' },
  { icon: Building2, title: 'Multi-Project', desc: 'Manage all sites in one place' },
]

// Password requirements
const passwordRequirements = [
  { key: 'length', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { key: 'uppercase', label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { key: 'lowercase', label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { key: 'number', label: 'One number', test: (p: string) => /[0-9]/.test(p) },
  { key: 'special', label: 'One special character', test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
]

export function SignupPageV2() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    companyName: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  const navigate = useNavigate()
  const { success, error: showError } = useToast()

  // Mount animation
  useEffect(() => {
    setMounted(true)
  }, [])

  // Rate limiting
  const rateLimit = useRateLimit({
    action: 'signup',
    identifier: formData.email || undefined,
  })

  const isDisabled = loading || !rateLimit.isAllowed

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    const passed = passwordRequirements.filter(req => req.test(formData.password))
    return {
      score: passed.length,
      total: passwordRequirements.length,
      percentage: (passed.length / passwordRequirements.length) * 100,
      requirements: passwordRequirements.map(req => ({
        ...req,
        met: req.test(formData.password)
      }))
    }
  }, [formData.password])

  const passwordsMatch = formData.password && formData.confirmPassword &&
    formData.password === formData.confirmPassword

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!rateLimit.isAllowed) {
      showError('Too Many Attempts', `Please wait ${rateLimit.formattedLockoutTime} before trying again.`)
      return
    }

    setLoading(true)

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      showError('Passwords Don\'t Match', 'Please make sure both passwords are identical.')
      setLoading(false)
      return
    }

    // Validate password strength
    if (passwordStrength.score < passwordStrength.total) {
      showError('Weak Password', 'Please meet all password requirements.')
      setLoading(false)
      return
    }

    try {
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

      if (authError) { throw authError }

      rateLimit.reset()
      success('Account Created', 'Please check your email to verify your account.')
      navigate('/login')
    } catch (err) {
      const state = rateLimit.recordAttempt()
      if (state.isLocked) {
        showError('Too Many Attempts', `Please try again in ${rateLimit.formattedLockoutTime}.`)
      } else {
        showError('Registration Failed', err instanceof Error ? err.message : 'Failed to create account')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-950 overflow-hidden">
      {/* Left Panel - Hero/Features */}
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
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-transparent to-primary-950/50" />

        {/* Animated glow orbs */}
        <div className="absolute top-1/3 -right-20 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/3 -left-20 w-80 h-80 bg-indigo-600/15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1.5s' }} />

        {/* Content */}
        <div className={cn(
          "relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full",
          "transition-all duration-1000 ease-out",
          mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
        )}>
          {/* Logo & Tagline */}
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary/25">
                <HardHat className="w-7 h-7 text-white" />
              </div>
              <span className="text-2xl font-bold text-white tracking-tight">
                Job<span className="text-primary-400">Sight</span>
              </span>
            </div>

            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
              Start Building
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-info-400">
                Your Success.
              </span>
            </h1>

            <p className="text-lg text-slate-400 max-w-md leading-relaxed mb-12">
              Join thousands of construction professionals who trust JobSight
              to manage their projects efficiently.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-4 mt-auto">
            {platformFeatures.map((feature, index) => (
              <div
                key={feature.title}
                className={cn(
                  "group p-5 rounded-2xl transition-all duration-500",
                  "bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm",
                  "hover:bg-white/[0.06] hover:border-white/[0.1]",
                  mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                )}
                style={{ transitionDelay: `${300 + index * 100}ms` }}
              >
                <feature.icon className="w-6 h-6 text-primary-400 mb-3 transition-transform group-hover:scale-110" />
                <div className="text-sm font-semibold text-white mb-1">
                  {feature.title}
                </div>
                <div className="text-xs text-slate-500">
                  {feature.desc}
                </div>
              </div>
            ))}
          </div>

          {/* Trust badge */}
          <div className={cn(
            "mt-8 flex items-center gap-3 text-slate-500 text-sm",
            "transition-all duration-700 delay-700",
            mounted ? "opacity-100" : "opacity-0"
          )}>
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 border-2 border-slate-900 flex items-center justify-center text-xs font-medium text-white"
                >
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
            <span>Trusted by 2,400+ construction teams</span>
          </div>
        </div>
      </div>

      {/* Right Panel - Signup Form */}
      <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-6 sm:p-8 lg:p-12 overflow-y-auto">
        <div className={cn(
          "w-full max-w-md transition-all duration-700 ease-out",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}>
          {/* Mobile Logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <HardHat className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
              Job<span className="text-primary-400">Sight</span>
            </span>
          </div>

          {/* Form Header */}
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Create your account
            </h2>
            <p className="text-slate-400">
              Get started with your free trial today
            </p>
          </div>

          {/* Rate Limit Warning */}
          {rateLimit.state.isLocked && (
            <div className="mb-6">
              <RateLimitWarning state={rateLimit.state} action="signup" />
            </div>
          )}

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-sm font-medium text-slate-300">
                  First name
                </Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder="John"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  disabled={isDisabled}
                  className={cn(
                    "h-11 px-4",
                    "bg-white/[0.03] border-white/10 text-white placeholder:text-slate-600",
                    "focus:bg-white/[0.05] focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20",
                    "transition-all duration-200"
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-sm font-medium text-slate-300">
                  Last name
                </Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder="Doe"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  disabled={isDisabled}
                  className={cn(
                    "h-11 px-4",
                    "bg-white/[0.03] border-white/10 text-white placeholder:text-slate-600",
                    "focus:bg-white/[0.05] focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20",
                    "transition-all duration-200"
                  )}
                />
              </div>
            </div>

            {/* Company Name */}
            <div className="space-y-1.5">
              <Label htmlFor="companyName" className="text-sm font-medium text-slate-300">
                Company name
              </Label>
              <Input
                id="companyName"
                name="companyName"
                type="text"
                placeholder="ABC Construction"
                required
                value={formData.companyName}
                onChange={handleChange}
                disabled={isDisabled}
                className={cn(
                  "h-11 px-4",
                  "bg-white/[0.03] border-white/10 text-white placeholder:text-slate-600",
                  "focus:bg-white/[0.05] focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20",
                  "transition-all duration-200"
                )}
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-slate-300">
                Work email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@company.com"
                required
                value={formData.email}
                onChange={handleChange}
                disabled={isDisabled}
                className={cn(
                  "h-11 px-4",
                  "bg-white/[0.03] border-white/10 text-white placeholder:text-slate-600",
                  "focus:bg-white/[0.05] focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20",
                  "transition-all duration-200"
                )}
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-slate-300">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isDisabled}
                  className={cn(
                    "h-11 px-4 pr-12",
                    "bg-white/[0.03] border-white/10 text-white placeholder:text-slate-600",
                    "focus:bg-white/[0.05] focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20",
                    "transition-all duration-200"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-3 space-y-2">
                  {/* Strength bar */}
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-300 rounded-full",
                        passwordStrength.percentage <= 40 && "bg-red-500",
                        passwordStrength.percentage > 40 && passwordStrength.percentage <= 80 && "bg-yellow-500",
                        passwordStrength.percentage > 80 && "bg-emerald-500"
                      )}
                      style={{ width: `${passwordStrength.percentage}%` }}
                    />
                  </div>
                  {/* Requirements checklist */}
                  <div className="grid grid-cols-2 gap-1">
                    {passwordStrength.requirements.map((req) => (
                      <div
                        key={req.key}
                        className={cn(
                          "flex items-center gap-1.5 text-xs transition-colors",
                          req.met ? "text-emerald-400" : "text-slate-600"
                        )}
                      >
                        {req.met ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <X className="w-3 h-3" />
                        )}
                        {req.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-300">
                Confirm password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={isDisabled}
                  className={cn(
                    "h-11 px-4 pr-12",
                    "bg-white/[0.03] border-white/10 text-white placeholder:text-slate-600",
                    "focus:bg-white/[0.05] focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20",
                    "transition-all duration-200",
                    formData.confirmPassword && (
                      passwordsMatch
                        ? "border-emerald-500/50"
                        : "border-red-500/50"
                    )
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {formData.confirmPassword && !passwordsMatch && (
                <p className="text-xs text-red-400 mt-1">Passwords don't match</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isDisabled}
              className={cn(
                "w-full h-12 text-base font-semibold mt-6",
                "bg-gradient-to-r from-primary to-primary-700",
                "hover:from-primary-500 hover:to-primary-600",
                "shadow-lg shadow-primary/25 hover:shadow-primary/30",
                "border border-primary/20",
                "transition-all duration-200",
                "group"
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>

            {/* Terms */}
            <p className="text-xs text-slate-500 text-center">
              By creating an account, you agree to our{' '}
              <Link to="/terms" className="text-primary-400 hover:text-primary-300">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-primary-400 hover:text-primary-300">
                Privacy Policy
              </Link>
            </p>
          </form>

          {/* Sign In Link */}
          <p className="mt-8 text-center text-slate-500">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default SignupPageV2
