// File: /src/components/settings/MFABackupCodes.tsx
// MFA Backup Codes management component for Settings page

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import {
  Key,
  Copy,
  Download,
  RefreshCw,
  Shield,
  AlertTriangle,
  Check,
  Loader2
} from 'lucide-react'
import {
  generateBackupCodes,
  getBackupCodeStatus
} from '@/lib/auth/mfa'
import { logger } from '@/lib/utils/logger'

interface BackupCodeStatus {
  totalCodes: number
  usedCodes: number
  remainingCodes: number
  lastUsedAt: string | null
}

/**
 * MFA Backup Codes Component
 *
 * Features:
 * - Generate new backup codes
 * - Display codes in grid format
 * - Copy all codes to clipboard
 * - Download codes as text file
 * - Show remaining unused codes count
 * - Regenerate warning dialog
 */
export function MFABackupCodes() {
  const { toast } = useToast()
  const [status, setStatus] = useState<BackupCodeStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showCodesDialog, setShowCodesDialog] = useState(false)
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([])
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [allCopied, setAllCopied] = useState(false)

  // Load backup code status on mount
  useEffect(() => {
    loadStatus()
  }, [])

  const loadStatus = async () => {
    setIsLoading(true)
    try {
      const codeStatus = await getBackupCodeStatus()
      setStatus(codeStatus)
    } catch (_error) {
      logger.error('[MFABackupCodes] Failed to load status:', _error)
    } finally {
      setIsLoading(false)
    }
  }

  // Generate new backup codes
  const handleGenerateCodes = async () => {
    setIsGenerating(true)
    try {
      const codes = await generateBackupCodes()
      setGeneratedCodes(codes)
      setShowCodesDialog(true)

      // Refresh status
      await loadStatus()

      toast({
        title: 'Backup codes generated',
        description: 'Save these codes in a secure location. They will only be shown once.',
      })
    } catch (_error) {
      logger.error('[MFABackupCodes] Failed to generate codes:', _error)
      toast({
        title: 'Failed to generate codes',
        description: 'Please try again later.',
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Copy single code to clipboard
  const copyCode = async (code: string, index: number) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch {
      toast({
        title: 'Failed to copy',
        description: 'Please select and copy manually.',
        variant: 'destructive',
      })
    }
  }

  // Copy all codes to clipboard
  const copyAllCodes = async () => {
    try {
      const codesText = generatedCodes.join('\n')
      await navigator.clipboard.writeText(codesText)
      setAllCopied(true)
      setTimeout(() => setAllCopied(false), 2000)
      toast({
        title: 'All codes copied',
        description: 'Backup codes have been copied to clipboard.',
      })
    } catch {
      toast({
        title: 'Failed to copy',
        description: 'Please select and copy manually.',
        variant: 'destructive',
      })
    }
  }

  // Download codes as text file
  const downloadCodes = () => {
    const content = [
      'JobSight MFA Backup Codes',
      '========================',
      '',
      'Keep these codes in a safe place. Each code can only be used once.',
      '',
      ...generatedCodes.map((code, i) => `${i + 1}. ${code}`),
      '',
      `Generated: ${new Date().toLocaleString()}`,
    ].join('\n')

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'jobsight-backup-codes.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: 'Codes downloaded',
      description: 'Backup codes have been saved to a file.',
    })
  }

  // Format last used date
  const formatLastUsed = (dateStr: string | null) => {
    if (!dateStr) {return 'Never'}
    const date = new Date(dateStr)
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString()
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900">
              <Key className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">Backup Codes</CardTitle>
              <CardDescription>
                Use backup codes to sign in if you lose access to your authenticator app
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading status...</span>
            </div>
          ) : status ? (
            <>
              {/* Status Display */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Codes remaining</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Last used: {formatLastUsed(status.lastUsedAt)}
                  </p>
                </div>
                <div className="text-right">
                  <Badge
                    variant={status.remainingCodes <= 2 ? 'destructive' : 'secondary'}
                    className="text-lg px-3 py-1"
                  >
                    {status.remainingCodes} / {status.totalCodes}
                  </Badge>
                </div>
              </div>

              {/* Warning for low codes */}
              {status.remainingCodes <= 2 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
                  <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Running low on backup codes</p>
                    <p className="text-sm opacity-90">
                      Generate new codes to ensure you can recover your account.
                    </p>
                  </div>
                </div>
              )}

              {/* Regenerate Button with Confirmation */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Generate New Backup Codes
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Generate new backup codes?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will invalidate all your existing backup codes. You will need to save
                      the new codes in a secure location. Make sure you have access to your
                      authenticator app before proceeding.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleGenerateCodes}>
                      Generate New Codes
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            <>
              {/* No codes generated yet */}
              <div className="text-center py-6 space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <Key className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">No backup codes generated</p>
                  <p className="text-sm text-muted-foreground">
                    Generate backup codes as a fallback for MFA
                  </p>
                </div>
                <Button onClick={handleGenerateCodes} disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4 mr-2" />
                      Generate Backup Codes
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Codes Display Dialog */}
      <Dialog open={showCodesDialog} onOpenChange={setShowCodesDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Save Your Backup Codes</DialogTitle>
            <DialogDescription>
              Store these codes in a secure location. Each code can only be used once.
              You won&apos;t be able to see these codes again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Codes Grid */}
            <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
              {generatedCodes.map((code, index) => (
                <button
                  key={index}
                  onClick={() => copyCode(code, index)}
                  className="flex items-center justify-between p-2 rounded hover:bg-background transition-colors text-left"
                >
                  <span>{code}</span>
                  {copiedIndex === index ? (
                    <Check className="h-4 w-4 text-success flex-shrink-0" />
                  ) : (
                    <Copy className="h-3 w-3 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100" />
                  )}
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={copyAllCodes}
              >
                {allCopied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy All
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={downloadCodes}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 text-warning-foreground text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                These codes will not be shown again. Make sure to save them before closing.
              </span>
            </div>

            <Button
              className="w-full"
              onClick={() => setShowCodesDialog(false)}
            >
              I&apos;ve Saved My Codes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
