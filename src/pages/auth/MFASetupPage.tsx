// File: /src/pages/auth/MFASetupPage.tsx
// Multi-Factor Authentication setup page

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DOMPurify from 'dompurify'
import { useAuth } from '@/lib/auth/AuthContext'
import { enrollMFA, verifyMFAEnrollment, formatTOTPSecret, generateBackupCodes, updateUserMFAPreferences } from '@/lib/auth/mfa'
import { Button, Card, Input, Alert, Badge } from '@/components/ui'
import { Shield, Smartphone, Copy, Check, ChevronLeft, Download, AlertTriangle } from 'lucide-react'
import { useToast } from '@/lib/notifications/ToastContext'

export function MFASetupPage() {
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const { success, error: showError, info } = useToast()

  const [step, setStep] = useState<'intro' | 'scan' | 'verify' | 'backup' | 'complete'>('intro')
  const [enrollmentData, setEnrollmentData] = useState<{
    qr: string
    secret: string
    uri: string
    factorId: string
  } | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [secretCopied, setSecretCopied] = useState(false)

  const handleStartEnrollment = async () => {
    try {
      const data = await enrollMFA(`${userProfile?.first_name}'s Device`)
      setEnrollmentData(data)
      setStep('scan')
    } catch (error) {
      showError('Enrollment Failed', 'Failed to start MFA enrollment. Please try again.')
    }
  }

  const handleVerifyCode = async () => {
    if (!enrollmentData || verificationCode.length !== 6) {return}

    setIsVerifying(true)
    try {
      const verified = await verifyMFAEnrollment(enrollmentData.factorId, verificationCode)

      if (verified) {
        // Generate backup codes
        const codes = await generateBackupCodes()
        setBackupCodes(codes)

        // Update user preferences
        if (userProfile?.id) {
          await updateUserMFAPreferences(userProfile.id, {
            mfaEnabled: true,
            mfaEnforcedAt: new Date().toISOString()
          })
        }

        setStep('backup')
        success('MFA Enabled', 'Two-factor authentication has been successfully enabled.')
      } else {
        showError('Invalid Code', 'The verification code is incorrect. Please try again.')
      }
    } catch (error) {
      showError('Verification Failed', 'Failed to verify the code. Please try again.')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleCopySecret = () => {
    if (enrollmentData?.secret) {
      navigator.clipboard.writeText(enrollmentData.secret)
      setSecretCopied(true)
      setTimeout(() => setSecretCopied(false), 2000)
      info('Copied', 'Secret key copied to clipboard')
    }
  }

  const handleDownloadBackupCodes = () => {
    const content = `JobSight Backup Codes
Generated: ${new Date().toLocaleString()}
User: ${userProfile?.email}

IMPORTANT: Store these codes in a safe place. Each code can only be used once.

${backupCodes.map((code, index) => `${index + 1}. ${code}`).join('\n')}

Use these codes if you lose access to your authenticator app.
`

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'supersitehero-backup-codes.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    success('Downloaded', 'Backup codes have been downloaded')
  }

  const handleComplete = () => {
    navigate('/profile')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <Shield className="mx-auto h-12 w-12 text-blue-600" />
          <h2 className="mt-4 text-3xl font-bold text-gray-900">
            Set Up Two-Factor Authentication
          </h2>
          <p className="mt-2 text-gray-600">
            Add an extra layer of security to your account
          </p>
        </div>

        {step === 'intro' && (
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Smartphone className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold">How it works</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    You'll use an authenticator app on your phone to generate
                    time-based verification codes when signing in.
                  </p>
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <div className="ml-2">
                  <p className="text-sm font-medium">Requirements</p>
                  <p className="text-sm text-gray-600 mt-1">
                    You'll need an authenticator app like Google Authenticator,
                    Microsoft Authenticator, or Authy installed on your phone.
                  </p>
                </div>
              </Alert>

              <div className="pt-4 space-y-3">
                <Button
                  onClick={handleStartEnrollment}
                  className="w-full"
                >
                  Continue Setup
                </Button>
                <Button
                  onClick={() => navigate('/profile')}
                  variant="outline"
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}

        {step === 'scan' && enrollmentData && (
          <Card className="p-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Scan QR Code</h3>
              <p className="text-sm text-gray-600">
                Open your authenticator app and scan this QR code to add your account.
              </p>

              <div className="bg-white p-4 rounded-lg border flex justify-center">
                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(enrollmentData.qr, { USE_PROFILES: { svg: true } }) }} />
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Can't scan? Enter this code manually:
                </p>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 bg-gray-100 px-3 py-2 rounded text-sm font-mono">
                    {formatTOTPSecret(enrollmentData.secret)}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopySecret}
                  >
                    {secretCopied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                onClick={() => setStep('verify')}
                className="w-full"
              >
                I've Added the Account
              </Button>
            </div>
          </Card>
        )}

        {step === 'verify' && (
          <Card className="p-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Verify Setup</h3>
              <p className="text-sm text-gray-600">
                Enter the 6-digit code from your authenticator app to verify setup.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Code
                </label>
                <Input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="text-center text-2xl font-mono tracking-wider"
                  maxLength={6}
                />
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleVerifyCode}
                  disabled={verificationCode.length !== 6 || isVerifying}
                  className="w-full"
                >
                  {isVerifying ? 'Verifying...' : 'Verify Code'}
                </Button>
                <Button
                  onClick={() => setStep('scan')}
                  variant="outline"
                  className="w-full"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back to QR Code
                </Button>
              </div>
            </div>
          </Card>
        )}

        {step === 'backup' && (
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-lg">Save Backup Codes</h3>
              </div>

              <Alert variant="warning">
                <AlertTriangle className="h-4 w-4" />
                <div className="ml-2">
                  <p className="text-sm font-medium">Important</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Save these backup codes in a safe place. You can use them to
                    access your account if you lose your phone.
                  </p>
                </div>
              </Alert>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, index) => (
                    <div key={index} className="font-mono text-sm">
                      {index + 1}. {code}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleDownloadBackupCodes}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Backup Codes
                </Button>
                <Button
                  onClick={() => setStep('complete')}
                  className="w-full"
                >
                  I've Saved My Codes
                </Button>
              </div>
            </div>
          </Card>
        )}

        {step === 'complete' && (
          <Card className="p-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="bg-green-100 rounded-full p-3">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg">Setup Complete!</h3>
                <p className="text-sm text-gray-600 mt-2">
                  Two-factor authentication is now enabled for your account.
                </p>
              </div>

              <Badge variant="success" className="mx-auto">
                MFA Enabled
              </Badge>

              <Button
                onClick={handleComplete}
                className="w-full"
              >
                Return to Profile
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}