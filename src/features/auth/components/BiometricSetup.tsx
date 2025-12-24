/**
 * Biometric Setup Component
 *
 * Provides UI for setting up and managing biometric authentication (WebAuthn).
 * Includes device registration, device management, and re-authentication settings.
 */

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Fingerprint,
  Smartphone,
  Trash2,
  Plus,
  Loader2,
  CheckCircle,
  XCircle,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Info,
} from 'lucide-react'
import { useAuth } from '@/lib/auth/AuthContext'
import { useToast } from '@/lib/notifications/ToastContext'
import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  registerBiometricCredential,
  deleteBiometricCredential,
  getBiometricSettings,
  updateBiometricSettings,
  getDeviceInfo,
  REAUTH_INTERVALS,
  type BiometricCredential,
  type BiometricSettings,
  type ReauthInterval,
} from '@/lib/auth/biometric'

interface BiometricSetupProps {
  onSetupComplete?: () => void
  compact?: boolean
}

export function BiometricSetup({ onSetupComplete, compact = false }: BiometricSetupProps) {
  const { user } = useAuth()
  const { success, error: showError } = useToast()

  // State
  const [isLoading, setIsLoading] = useState(true)
  const [isRegistering, setIsRegistering] = useState(false)
  const [settings, setSettings] = useState<BiometricSettings | null>(null)
  const [compatibility, setCompatibility] = useState({
    webAuthnSupported: false,
    platformAvailable: false,
  })
  const [deviceToDelete, setDeviceToDelete] = useState<BiometricCredential | null>(null)
  const [customDeviceName, setCustomDeviceName] = useState('')
  const [showDeviceNameDialog, setShowDeviceNameDialog] = useState(false)

  // Check browser compatibility
  useEffect(() => {
    const checkCompatibility = async () => {
      const webAuthnSupported = isWebAuthnSupported()
      const platformAvailable = await isPlatformAuthenticatorAvailable()

      setCompatibility({
        webAuthnSupported,
        platformAvailable,
      })
    }

    checkCompatibility()
  }, [])

  // Load settings
  const loadSettings = useCallback(async () => {
    if (!user?.id) return

    setIsLoading(true)
    try {
      const biometricSettings = await getBiometricSettings(user.id)
      setSettings(biometricSettings)
    } catch (err) {
      console.error('Error loading biometric settings:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // Handle toggle biometric enabled
  const handleToggleEnabled = async (enabled: boolean) => {
    if (!user?.id || !settings) return

    try {
      await updateBiometricSettings(user.id, { enabled })
      setSettings({ ...settings, enabled })
      success('Settings Updated', `Biometric authentication ${enabled ? 'enabled' : 'disabled'}`)
    } catch (err) {
      showError('Error', 'Failed to update biometric settings')
    }
  }

  // Handle re-auth interval change
  const handleReauthIntervalChange = async (interval: ReauthInterval) => {
    if (!user?.id || !settings) return

    try {
      await updateBiometricSettings(user.id, { reauthInterval: interval })
      setSettings({ ...settings, reauthInterval: interval })
      success('Settings Updated', `Re-authentication interval set to ${REAUTH_INTERVALS[interval].label}`)
    } catch (err) {
      showError('Error', 'Failed to update re-authentication interval')
    }
  }

  // Handle device registration
  const handleRegisterDevice = async () => {
    if (!user?.id || !user?.email) {
      showError('Error', 'User not authenticated')
      return
    }

    setIsRegistering(true)
    try {
      const deviceName = customDeviceName || getDeviceInfo()
      await registerBiometricCredential(user.id, user.email, deviceName)

      success('Device Registered', 'Biometric authentication has been set up successfully')
      setShowDeviceNameDialog(false)
      setCustomDeviceName('')
      await loadSettings()

      // Enable biometric if this is the first credential
      if (settings && settings.credentials.length === 0) {
        await updateBiometricSettings(user.id, { enabled: true })
      }

      onSetupComplete?.()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to register device'
      showError('Registration Failed', errorMessage)
    } finally {
      setIsRegistering(false)
    }
  }

  // Handle device deletion
  const handleDeleteDevice = async () => {
    if (!deviceToDelete) return

    try {
      await deleteBiometricCredential(deviceToDelete.id)
      success('Device Removed', `${deviceToDelete.deviceName} has been removed`)
      setDeviceToDelete(null)
      await loadSettings()
    } catch (err) {
      showError('Error', 'Failed to remove device')
    }
  }

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Render compatibility check
  if (!compatibility.webAuthnSupported) {
    return (
      <Alert variant="warning">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Browser Not Supported</AlertTitle>
        <AlertDescription>
          Your browser does not support biometric authentication (WebAuthn).
          Please use a modern browser like Chrome 67+, Firefox 60+, Safari 13+, or Edge 18+.
        </AlertDescription>
      </Alert>
    )
  }

  if (!compatibility.platformAvailable) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Biometric Not Available</AlertTitle>
        <AlertDescription>
          Platform biometric authentication is not available on this device.
          You may need to set up fingerprint, Face ID, or Windows Hello first.
        </AlertDescription>
      </Alert>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Compact view for setup wizard
  if (compact) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
          <div className="p-2 bg-info-light rounded-full">
            <Fingerprint className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-foreground" className="heading-subsection">Enable Biometric Login</h3>
            <p className="text-sm text-secondary">
              Use fingerprint or Face ID for quick, secure access
            </p>
          </div>
        </div>

        <Button
          onClick={() => setShowDeviceNameDialog(true)}
          disabled={isRegistering}
          className="w-full"
        >
          {isRegistering ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Setting up...
            </>
          ) : (
            <>
              <Fingerprint className="h-4 w-4 mr-2" />
              Set Up Biometric Login
            </>
          )}
        </Button>

        {/* Device Name Dialog */}
        <AlertDialog open={showDeviceNameDialog} onOpenChange={setShowDeviceNameDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Register Device</AlertDialogTitle>
              <AlertDialogDescription>
                Give this device a name to identify it later. Your biometric data never leaves your device.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Label htmlFor="deviceName">Device Name (optional)</Label>
              <input
                id="deviceName"
                type="text"
                value={customDeviceName}
                onChange={(e) => setCustomDeviceName(e.target.value)}
                placeholder={getDeviceInfo()}
                className="w-full mt-2 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRegisterDevice} disabled={isRegistering}>
                {isRegistering ? 'Registering...' : 'Continue'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }

  // Full settings view
  return (
    <div className="space-y-6">
      {/* Main Toggle Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-info-light rounded-full">
              <Fingerprint className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Biometric Authentication</CardTitle>
              <CardDescription>
                Use fingerprint, Face ID, or Windows Hello for quick login
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="biometric-enabled" className="text-base">
                Enable Biometric Login
              </Label>
              <p className="text-sm text-muted">
                Allow signing in with biometrics on registered devices
              </p>
            </div>
            <Switch
              id="biometric-enabled"
              checked={settings?.enabled ?? false}
              onCheckedChange={handleToggleEnabled}
              disabled={!settings || settings.credentials.length === 0}
            />
          </div>

          {settings?.credentials.length === 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Register at least one device to enable biometric authentication.
              </AlertDescription>
            </Alert>
          )}

          {/* Re-authentication Interval */}
          {settings?.enabled && (
            <>
              <div className="border-t pt-6">
                <Label className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Re-authentication Interval
                </Label>
                <p className="text-sm text-muted mb-4">
                  How often to require biometric verification for sensitive operations
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {(Object.entries(REAUTH_INTERVALS) as [ReauthInterval, { label: string; ms: number }][]).map(
                    ([key, { label }]) => (
                      <Button
                        key={key}
                        variant={settings?.reauthInterval === key ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleReauthIntervalChange(key)}
                        className="w-full"
                      >
                        {label}
                      </Button>
                    )
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Registered Devices Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Registered Devices</CardTitle>
              <CardDescription>
                Devices that can use biometric authentication
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowDeviceNameDialog(true)}
              disabled={isRegistering}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Device
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {settings?.credentials.length === 0 ? (
            <div className="text-center py-8 text-muted">
              <Smartphone className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No devices registered</p>
              <p className="text-sm">Add a device to enable biometric login</p>
            </div>
          ) : (
            <div className="space-y-3">
              {settings?.credentials.map((credential) => (
                <div
                  key={credential.id}
                  className="flex items-center justify-between p-4 bg-surface rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-5 w-5 text-secondary" />
                    <div>
                      <p className="font-medium text-foreground">{credential.deviceName}</p>
                      <div className="flex items-center gap-3 text-sm text-muted">
                        <span>Added {formatDate(credential.createdAt)}</span>
                        {credential.lastUsed && (
                          <>
                            <span>|</span>
                            <span>Last used {formatDate(credential.lastUsed)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-success-light text-success-dark border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeviceToDelete(credential)}
                      className="text-error hover:text-error-dark hover:bg-error-light"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-success" />
            Security Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-secondary">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-4 w-4 text-success mt-0.5" />
            <p>Your biometric data (fingerprint, face) never leaves your device</p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-4 w-4 text-success mt-0.5" />
            <p>Only a cryptographic key is stored on our servers</p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-4 w-4 text-success mt-0.5" />
            <p>Each device has a unique credential that can be revoked independently</p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-4 w-4 text-success mt-0.5" />
            <p>You can always fall back to password authentication</p>
          </div>
        </CardContent>
      </Card>

      {/* Device Name Dialog */}
      <AlertDialog open={showDeviceNameDialog} onOpenChange={setShowDeviceNameDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Register New Device</AlertDialogTitle>
            <AlertDialogDescription>
              Give this device a name to identify it later. You will be prompted to verify your identity using biometrics.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="deviceNameFull">Device Name (optional)</Label>
            <input
              id="deviceNameFull"
              type="text"
              value={customDeviceName}
              onChange={(e) => setCustomDeviceName(e.target.value)}
              placeholder={getDeviceInfo()}
              className="w-full mt-2 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRegisterDevice} disabled={isRegistering}>
              {isRegistering ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Registering...
                </>
              ) : (
                'Register Device'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deviceToDelete} onOpenChange={() => setDeviceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Device</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{deviceToDelete?.deviceName}"? You will no longer be able to use biometric authentication from this device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDevice}
              className="bg-error hover:bg-red-700"
            >
              Remove Device
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
