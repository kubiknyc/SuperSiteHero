// File: /src/pages/auth/MFAVerifyPage.tsx
// Multi-Factor Authentication verification page

import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { verifyMFACode, getMFAChallenge } from '@/lib/auth/mfa'
import { Button, Card, Input, Alert } from '@/components/ui'
import { Shield, ChevronLeft, AlertCircle, Loader2 } from 'lucide-react'
import { useToast } from '@/lib/notifications/ToastContext'

interface LocationState {
  from?: string
  factorId?: string
}

export function MFAVerifyPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { success, error: showError, info } = useToast()

  const state = location.state as LocationState
  const [verificationCode, setVerificationCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [challenge, setChallenge] = useState<{ factorId: string; challengeId?: string } | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [isBackupCode, setIsBackupCode] = useState(false)

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const maxAttempts = 5

  useEffect(() => {
    // Get MFA challenge if not provided
    if (!state?.factorId) {
      getMFAChallenge().then(challengeData => {
        if (challengeData) {
          setChallenge(challengeData)
        } else {
          // No MFA required, redirect
          navigate(state?.from || '/dashboard')
        }
      })
    } else {
      setChallenge({ factorId: state.factorId })
    }
  }, [state, navigate])

  useEffect(() => {
    // Focus first input
    inputRefs.current[0]?.focus()
  }, [])

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const pastedCode = value.slice(0, 6)
      setVerificationCode(pastedCode)

      // Focus last input
      const lastIndex = Math.min(pastedCode.length - 1, 5)
      inputRefs.current[lastIndex]?.focus()
    } else {
      // Handle single character input
      const newCode = verificationCode.split('')
      newCode[index] = value
      setVerificationCode(newCode.join(''))

      // Move to next input
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus()
      }
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      // Move to previous input on backspace
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'Enter' && verificationCode.length === 6) {
      handleVerify()
    }
  }

  const handleVerify = async () => {
    if (verificationCode.length !== 6 || !challenge) {return}

    setIsVerifying(true)
    setAttempts(prev => prev + 1)

    try {
      const response = await verifyMFACode(challenge.factorId, verificationCode)

      if (response.data) {
        success('Verification Successful', 'You have been successfully authenticated.')

        // Navigate to intended destination
        navigate(state?.from || '/dashboard', { replace: true })
      } else {
        throw new Error('Verification failed')
      }
    } catch (error) {
      if (attempts >= maxAttempts - 1) {
        showError('Too Many Attempts', 'Maximum verification attempts exceeded. Please try logging in again.')
        navigate('/login', { replace: true })
      } else {
        showError('Invalid Code', `The verification code is incorrect. ${maxAttempts - attempts - 1} attempts remaining.`)
        setVerificationCode('')
        inputRefs.current[0]?.focus()
      }
    } finally {
      setIsVerifying(false)
    }
  }

  const handleUseBackupCode = () => {
    setIsBackupCode(true)
    setVerificationCode('')
    info('Backup Code Mode', 'Enter one of your backup codes to sign in.')
  }

  const handleCancel = () => {
    navigate('/login', { replace: true })
  }

  if (!challenge) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-2 text-gray-600">Loading authentication challenge...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <Shield className="mx-auto h-12 w-12 text-blue-600" />
          <h2 className="mt-4 text-3xl font-bold text-gray-900">
            Two-Factor Authentication
          </h2>
          <p className="mt-2 text-gray-600">
            {isBackupCode
              ? 'Enter your backup code to continue'
              : 'Enter the code from your authenticator app'
            }
          </p>
        </div>

        <Card className="p-6">
          <div className="space-y-6">
            {attempts > 2 && (
              <Alert variant="warning">
                <AlertCircle className="h-4 w-4" />
                <div className="ml-2">
                  <p className="text-sm font-medium">
                    {maxAttempts - attempts} attempts remaining
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Too many failed attempts will require you to sign in again.
                  </p>
                </div>
              </Alert>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {isBackupCode ? 'Backup Code' : '6-Digit Code'}
              </label>

              {isBackupCode ? (
                <Input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="Enter backup code"
                  className="font-mono uppercase"
                  maxLength={10}
                />
              ) : (
                <div className="flex space-x-2 justify-center">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <Input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      value={verificationCode[index] || ''}
                      onChange={(e) => handleCodeChange(index, e.target.value.replace(/\D/g, ''))}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className="w-12 h-12 text-center text-xl font-mono"
                      maxLength={1}
                      inputMode="numeric"
                      pattern="[0-9]"
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleVerify}
                disabled={verificationCode.length < 6 || isVerifying}
                className="w-full"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify'
                )}
              </Button>

              {!isBackupCode && (
                <Button
                  onClick={handleUseBackupCode}
                  variant="outline"
                  className="w-full"
                >
                  Use Backup Code Instead
                </Button>
              )}

              <Button
                onClick={handleCancel}
                variant="ghost"
                className="w-full"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>

            <div className="text-center">
              <a
                href="/help/mfa"
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Having trouble? Get help
              </a>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}