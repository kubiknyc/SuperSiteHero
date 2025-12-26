// File: /src/features/punch-lists/components/QRCodeScanner.tsx
// QR Code scanner for quick punch item lookup

import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5QrcodeScanner, Html5QrcodeScanType, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Camera, X, ScanLine, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from '@/lib/notifications/ToastContext'
import { cn } from '@/lib/utils'
import { logger } from '../../../lib/utils/logger';


interface QRCodeScannerProps {
  onScanSuccess?: (punchItemId: string) => void
  buttonLabel?: string
  buttonVariant?: 'default' | 'outline' | 'ghost'
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

/**
 * Extract punch item ID from scanned URL
 * Expected format: /punch-lists/{id} or full URL with path
 */
function extractPunchItemId(scannedText: string): string | null {
  try {
    // Try parsing as URL
    const url = new URL(scannedText)
    const pathMatch = url.pathname.match(/\/punch-lists\/([a-zA-Z0-9-]+)/)
    if (pathMatch) {
      return pathMatch[1]
    }
  } catch {
    // Not a URL, try direct path match
    const pathMatch = scannedText.match(/\/punch-lists\/([a-zA-Z0-9-]+)/)
    if (pathMatch) {
      return pathMatch[1]
    }

    // Check if it's just a UUID
    const uuidMatch = scannedText.match(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i)
    if (uuidMatch) {
      return scannedText
    }
  }

  return null
}

export function QRCodeScanner({
  onScanSuccess,
  buttonLabel = 'Scan QR',
  buttonVariant = 'outline',
  buttonSize = 'default',
  className,
}: QRCodeScannerProps) {
  const navigate = useNavigate()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastScan, setLastScan] = useState<string | null>(null)
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Handle successful scan
  const handleScanSuccess = useCallback((decodedText: string) => {
    // Prevent duplicate scans
    if (decodedText === lastScan) {return}
    setLastScan(decodedText)

    const punchItemId = extractPunchItemId(decodedText)

    if (punchItemId) {
      // Stop scanner
      if (scannerRef.current) {
        scannerRef.current.clear()
        scannerRef.current = null
      }

      setIsScanning(false)
      setDialogOpen(false)

      // Callback or navigate
      if (onScanSuccess) {
        onScanSuccess(punchItemId)
      } else {
        navigate(`/punch-lists/${punchItemId}`)
      }

      toast.success('Punch item found!')
    } else {
      toast.error('Invalid QR code - not a punch item')
      setError('This QR code is not a valid punch item code')
    }
  }, [lastScan, navigate, onScanSuccess])

  // Handle scan error
  const handleScanError = useCallback((errorMessage: string) => {
    // Only log actual errors, not "no QR code found" messages
    if (!errorMessage.includes('No MultiFormat Readers')) {
      logger.warn('QR scan error:', errorMessage)
    }
  }, [])

  // Start scanner when dialog opens
  useEffect(() => {
    if (!dialogOpen || !containerRef.current) {return}

    setError(null)
    setLastScan(null)

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      if (!containerRef.current) {return}

      try {
        const scanner = new Html5QrcodeScanner(
          'qr-reader',
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            showTorchButtonIfSupported: true,
            showZoomSliderIfSupported: true,
            useBarCodeDetectorIfSupported: true,
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
            supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          },
          /* verbose= */ false
        )

        scanner.render(handleScanSuccess, handleScanError)
        scannerRef.current = scanner
        setIsScanning(true)
      } catch (err) {
        logger.error('Scanner initialization error:', err)
        setError('Failed to initialize camera. Please ensure camera permissions are granted.')
      }
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      if (scannerRef.current) {
        try {
          scannerRef.current.clear()
        } catch {
          // Ignore cleanup errors
        }
        scannerRef.current = null
      }
    }
  }, [dialogOpen, handleScanSuccess, handleScanError])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear()
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }, [])

  const handleRetry = () => {
    setError(null)
    setLastScan(null)

    if (scannerRef.current) {
      try {
        scannerRef.current.clear()
        scannerRef.current = null
      } catch {
        // Ignore errors
      }
    }

    // Re-trigger initialization
    setDialogOpen(false)
    setTimeout(() => setDialogOpen(true), 100)
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size={buttonSize} className={cn('gap-1', className)}>
          <ScanLine className="h-4 w-4" />
          {buttonSize !== 'icon' && buttonLabel}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scan Punch Item QR Code
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {error ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto text-error mb-4" />
              <p className="text-error mb-4">{error}</p>
              <Button onClick={handleRetry} variant="outline" className="gap-1">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            </div>
          ) : (
            <>
              {/* Scanner container */}
              <div
                ref={containerRef}
                id="qr-reader"
                className={cn(
                  'rounded-lg overflow-hidden',
                  '[&_#qr-reader__dashboard_section_csr]:mt-2',
                  '[&_#qr-reader__dashboard_section_csr_button]:bg-primary',
                  '[&_#qr-reader__dashboard_section_csr_button]:text-white',
                  '[&_#qr-reader__dashboard_section_csr_button]:rounded-lg',
                  '[&_#qr-reader__dashboard_section_csr_button]:px-4',
                  '[&_#qr-reader__dashboard_section_csr_button]:py-2',
                  '[&_#qr-reader__header_message]:hidden',
                  '[&_#qr-reader__status_span]:text-sm',
                  '[&_#qr-reader__status_span]:text-secondary',
                )}
              />

              {!isScanning && (
                <div className="text-center py-8">
                  <Camera className="h-12 w-12 mx-auto text-disabled mb-4" />
                  <p className="text-secondary">Initializing camera...</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="text-xs text-muted text-center border-t pt-3">
          Point your camera at a punch item QR code to quickly access it
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Floating scan button for mobile - fixed position
 */
interface FloatingScanButtonProps {
  onScanSuccess?: (punchItemId: string) => void
}

export function FloatingScanButton({ onScanSuccess }: FloatingScanButtonProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 md:hidden">
      <QRCodeScanner
        onScanSuccess={onScanSuccess}
        buttonLabel=""
        buttonVariant="default"
        buttonSize="lg"
        className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary-hover"
      />
    </div>
  )
}
