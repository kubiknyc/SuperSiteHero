// File: /src/features/site-instructions/components/QRCodeGenerator.tsx
// QR Code generator component for site instructions
// Milestone 1.2: Site Instructions QR Code Workflow

import { useState, useRef, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/lib/notifications/ToastContext'
import {
  Download,
  Copy,
  RefreshCw,
  QrCode,
  Clock,
  Link2,
  Loader2,
  Share2,
  Printer,
} from 'lucide-react'
import { useGenerateQRCodeToken } from '../hooks/useSiteInstructionAcknowledgment'
import type { SiteInstructionWithRelations } from '../hooks/useSiteInstructions'
import { format, parseISO, isPast } from 'date-fns'

interface QRCodeGeneratorProps {
  instruction: SiteInstructionWithRelations & {
    qr_code_token?: string | null
    qr_code_expires_at?: string | null
  }
  open: boolean
  onOpenChange: (open: boolean) => void
}

const EXPIRATION_OPTIONS = [
  { value: '7', label: '7 days' },
  { value: '14', label: '14 days' },
  { value: '30', label: '30 days' },
  { value: '60', label: '60 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: '1 year' },
]

export function QRCodeGenerator({
  instruction,
  open,
  onOpenChange,
}: QRCodeGeneratorProps) {
  const { showToast } = useToast()
  const qrRef = useRef<HTMLDivElement>(null)
  const [expirationDays, setExpirationDays] = useState('30')

  const generateToken = useGenerateQRCodeToken()

  // Build the acknowledgment URL
  const baseUrl = window.location.origin
  const acknowledgmentUrl = instruction.qr_code_token
    ? `${baseUrl}/site-instructions/acknowledge/${instruction.qr_code_token}`
    : null

  const isExpired = instruction.qr_code_expires_at
    ? isPast(parseISO(instruction.qr_code_expires_at))
    : false

  const handleGenerateQRCode = useCallback(async () => {
    try {
      await generateToken.mutateAsync({
        instructionId: instruction.id,
        expiresInDays: parseInt(expirationDays, 10),
      })
      showToast({
        title: 'QR Code Generated',
        description: 'A new QR code has been generated successfully.',
        type: 'success',
      })
    } catch (_error) {
      showToast({
        title: 'Error',
        description: 'Failed to generate QR code. Please try again.',
        type: 'error',
      })
    }
  }, [generateToken, instruction.id, expirationDays, showToast])

  const handleCopyLink = useCallback(async () => {
    if (!acknowledgmentUrl) {return}

    try {
      await navigator.clipboard.writeText(acknowledgmentUrl)
      showToast({
        title: 'Link Copied',
        description: 'The acknowledgment link has been copied to your clipboard.',
        type: 'success',
      })
    } catch (_error) {
      showToast({
        title: 'Error',
        description: 'Failed to copy link. Please try manually.',
        type: 'error',
      })
    }
  }, [acknowledgmentUrl, showToast])

  const handleDownloadQRCode = useCallback(() => {
    if (!qrRef.current) {return}

    const svg = qrRef.current.querySelector('svg')
    if (!svg) {return}

    // Create canvas from SVG
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {return}

    const svgData = new XMLSerializer().serializeToString(svg)
    const img = new Image()

    img.onload = () => {
      canvas.width = img.width * 2 // Higher resolution
      canvas.height = img.height * 2
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      // Download
      const link = document.createElement('a')
      link.download = `SI-${instruction.reference_number || instruction.id}-QR.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }, [instruction.reference_number, instruction.id])

  const handlePrint = useCallback(() => {
    if (!qrRef.current) {return}

    const printWindow = window.open('', '_blank')
    if (!printWindow) {return}

    const svg = qrRef.current.querySelector('svg')
    if (!svg) {return}

    const svgData = new XMLSerializer().serializeToString(svg)

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Site Instruction QR Code - ${instruction.reference_number || instruction.title}</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              box-sizing: border-box;
            }
            .container {
              text-align: center;
              max-width: 400px;
            }
            .qr-code {
              margin: 20px 0;
            }
            .qr-code svg {
              width: 200px;
              height: 200px;
            }
            h1 {
              font-size: 18px;
              margin-bottom: 8px;
            }
            .ref {
              color: #666;
              font-size: 14px;
              margin-bottom: 16px;
            }
            .instruction {
              font-size: 12px;
              color: #888;
              margin-top: 16px;
            }
            .expires {
              font-size: 11px;
              color: #999;
              margin-top: 8px;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 className="heading-page">${instruction.title}</h1>
            <div class="ref">${instruction.reference_number || ''}</div>
            <div class="qr-code">${svgData}</div>
            <p class="instruction">Scan this QR code to acknowledge receipt of this site instruction</p>
            ${instruction.qr_code_expires_at ? `<p class="expires">Expires: ${format(parseISO(instruction.qr_code_expires_at), 'PPP')}</p>` : ''}
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }, [instruction])

  const handleShare = useCallback(async () => {
    if (!acknowledgmentUrl) {return}

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Site Instruction: ${instruction.title}`,
          text: `Please acknowledge receipt of this site instruction: ${instruction.reference_number || instruction.title}`,
          url: acknowledgmentUrl,
        })
      } catch (error) {
        // User cancelled or share failed
        if ((error as Error).name !== 'AbortError') {
          handleCopyLink()
        }
      }
    } else {
      handleCopyLink()
    }
  }, [acknowledgmentUrl, instruction, handleCopyLink])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Code for Acknowledgment
          </DialogTitle>
          <DialogDescription>
            Generate a QR code that subcontractors can scan to acknowledge this site instruction.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* QR Code Display */}
          {acknowledgmentUrl && !isExpired ? (
            <Card>
              <CardContent className="flex flex-col items-center py-6">
                <div ref={qrRef} className="bg-card p-4 rounded-lg">
                  <QRCodeSVG
                    value={acknowledgmentUrl}
                    size={200}
                    level="H"
                    includeMargin
                    imageSettings={{
                      src: '/favicon.ico',
                      x: undefined,
                      y: undefined,
                      height: 24,
                      width: 24,
                      excavate: true,
                    }}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  {instruction.reference_number || instruction.title}
                </p>
                {instruction.qr_code_expires_at && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                    <Clock className="h-3 w-3" />
                    <span>
                      Expires: {format(parseISO(instruction.qr_code_expires_at), 'PPP')}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center py-8">
                {isExpired ? (
                  <>
                    <Clock className="h-12 w-12 text-warning mb-4" />
                    <p className="text-center text-muted-foreground mb-4">
                      The QR code has expired. Generate a new one to continue accepting
                      acknowledgments.
                    </p>
                  </>
                ) : (
                  <>
                    <QrCode className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-center text-muted-foreground mb-4">
                      No QR code generated yet. Choose an expiration period and generate one.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Expiration Selector */}
          <div className="space-y-2">
            <Label htmlFor="expiration">QR Code Expiration</Label>
            <Select value={expirationDays} onValueChange={setExpirationDays}>
              <SelectTrigger id="expiration">
                <SelectValue placeholder="Select expiration" />
              </SelectTrigger>
              <SelectContent>
                {EXPIRATION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerateQRCode}
            disabled={generateToken.isPending}
            className="w-full"
          >
            {generateToken.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {acknowledgmentUrl && !isExpired ? 'Regenerate QR Code' : 'Generate QR Code'}
          </Button>

          {/* Action Buttons */}
          {acknowledgmentUrl && !isExpired && (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={handleCopyLink}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Link
              </Button>
              <Button variant="outline" onClick={handleDownloadQRCode}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
              <Button variant="outline" onClick={handleShare}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>
          )}

          {/* Link Preview */}
          {acknowledgmentUrl && !isExpired && (
            <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
              <Link2 className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <span className="text-xs text-muted-foreground truncate">
                {acknowledgmentUrl}
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
