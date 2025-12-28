/**
 * Biometric Settings Component
 *
 * Settings page integration for biometric authentication.
 * Shows device compatibility check and provides access to full setup.
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Fingerprint,
  Shield,
  Smartphone,
  Check,
  X,
  AlertTriangle,
  Info,
  ChevronRight,
} from 'lucide-react'
import { BiometricSetup } from '@/features/auth/components/BiometricSetup'
import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  isConditionalMediationAvailable,
} from '@/lib/auth/biometric'

interface CompatibilityStatus {
  webAuthn: boolean
  platformAuth: boolean
  conditionalUI: boolean
  checking: boolean
}

interface CompatibilityItemProps {
  label: string
  supported: boolean
  description: string
}

function CompatibilityItem({ label, supported, description }: CompatibilityItemProps) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className={`mt-0.5 ${supported ? 'text-success' : 'text-disabled'}`}>
        {supported ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
      </div>
      <div>
        <p className={`font-medium ${supported ? 'text-foreground' : 'text-muted'}`}>
          {label}
        </p>
        <p className="text-sm text-muted">{description}</p>
      </div>
    </div>
  )
}

export function BiometricSettings() {
  const [compatibility, setCompatibility] = useState<CompatibilityStatus>({
    webAuthn: false,
    platformAuth: false,
    conditionalUI: false,
    checking: true,
  })
  const [showFullSetup, setShowFullSetup] = useState(false)

  useEffect(() => {
    const checkCompatibility = async () => {
      const webAuthn = isWebAuthnSupported()
      const platformAuth = await isPlatformAuthenticatorAvailable()
      const conditionalUI = await isConditionalMediationAvailable()

      setCompatibility({
        webAuthn,
        platformAuth,
        conditionalUI,
        checking: false,
      })
    }

    checkCompatibility()
  }, [])

  if (compatibility.checking) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Biometric Authentication
          </CardTitle>
          <CardDescription>Checking device compatibility...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const isFullySupported = compatibility.webAuthn && compatibility.platformAuth

  return (
    <div className="space-y-6">
      {/* Compatibility Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${isFullySupported ? 'bg-success-light' : 'bg-warning-light'}`}>
                <Fingerprint className={`h-6 w-6 ${isFullySupported ? 'text-success' : 'text-warning'}`} />
              </div>
              <div>
                <CardTitle>Biometric Authentication</CardTitle>
                <CardDescription>
                  Secure login using fingerprint, Face ID, or Windows Hello
                </CardDescription>
              </div>
            </div>
            <Badge variant={isFullySupported ? 'default' : 'secondary'}>
              {isFullySupported ? 'Available' : 'Limited Support'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Compatibility Checks */}
          <div className="border-b pb-4 mb-4">
            <h4 className="text-sm font-medium text-secondary mb-3 heading-card">Device Compatibility</h4>
            <CompatibilityItem
              label="WebAuthn API"
              supported={compatibility.webAuthn}
              description="Browser supports the Web Authentication API"
            />
            <CompatibilityItem
              label="Platform Authenticator"
              supported={compatibility.platformAuth}
              description="Device has biometric hardware (fingerprint, Face ID, Windows Hello)"
            />
            <CompatibilityItem
              label="Passkey Autofill"
              supported={compatibility.conditionalUI}
              description="Browser supports passkey suggestions in login forms"
            />
          </div>

          {/* Status Messages */}
          {!compatibility.webAuthn && (
            <Alert variant="warning" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Browser Not Supported</AlertTitle>
              <AlertDescription>
                Your browser does not support WebAuthn. Please update to a modern browser:
                Chrome 67+, Firefox 60+, Safari 13+, or Edge 18+.
              </AlertDescription>
            </Alert>
          )}

          {compatibility.webAuthn && !compatibility.platformAuth && (
            <Alert className="mb-4">
              <Info className="h-4 w-4" />
              <AlertTitle>Biometric Hardware Not Detected</AlertTitle>
              <AlertDescription>
                Your device does not have biometric authentication available.
                To use this feature, you need a device with:
                <ul className="list-disc ml-4 mt-2">
                  <li>Fingerprint sensor</li>
                  <li>Face ID (iOS/Mac)</li>
                  <li>Windows Hello (Windows 10/11)</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Browser Support Info */}
          <div className="bg-surface rounded-lg p-4">
            <h4 className="text-sm font-medium text-secondary mb-2 flex items-center gap-2 heading-card">
              <Shield className="h-4 w-4" />
              Supported Browsers
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-secondary">Chrome</span>
                <Badge variant="outline" className="text-xs">67+</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-secondary">Firefox</span>
                <Badge variant="outline" className="text-xs">60+</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-secondary">Safari</span>
                <Badge variant="outline" className="text-xs">13+</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-secondary">Edge</span>
                <Badge variant="outline" className="text-xs">18+</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Biometric Setup (only show if supported) */}
      {isFullySupported && <BiometricSetup />}

      {/* Help Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-info-light rounded-full flex items-center justify-center text-primary font-semibold">
              1
            </div>
            <div>
              <p className="font-medium text-foreground">Register Your Device</p>
              <p className="text-sm text-muted">
                Use your device's biometric sensor to create a secure credential
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-info-light rounded-full flex items-center justify-center text-primary font-semibold">
              2
            </div>
            <div>
              <p className="font-medium text-foreground">Secure Storage</p>
              <p className="text-sm text-muted">
                Your biometric data stays on your device. Only a public key is stored on our servers.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-info-light rounded-full flex items-center justify-center text-primary font-semibold">
              3
            </div>
            <div>
              <p className="font-medium text-foreground">Quick Login</p>
              <p className="text-sm text-muted">
                Sign in instantly with your fingerprint or face - no password needed
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
