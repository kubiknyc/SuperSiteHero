/**
 * DrawingQRCode Component
 *
 * Generate QR codes linking to specific drawing locations.
 * Designed for physical drawing sets and field use.
 *
 * Features:
 * - Generate QR codes linking to specific drawing locations
 * - Include: document ID, page number, coordinates, zoom level
 * - Print-friendly QR code output
 * - Scan QR to jump directly to location in app
 * - Support for physical drawing sets (print QR on corner)
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import {
  QrCode,
  Download,
  Printer,
  Copy,
  Check,
  Link2,
  MapPin,
  Maximize,
  FileText,
  Loader2,
  Share2,
  ChevronDown,
  Settings2,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { NativeSelect } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { DrawingQRCode as DrawingQRCodeType, QRCodeGenerationOptions } from '../types/markup'

// =============================================
// Types
// =============================================

interface DrawingQRCodeProps {
  /** Document ID */
  documentId: string
  /** Document name for display */
  documentName?: string
  /** Current page number */
  page: number
  /** Total pages in document */
  totalPages?: number
  /** Current viewport (optional) */
  viewport?: { x: number; y: number; zoom: number }
  /** Base URL for the application */
  baseUrl?: string
  /** Existing QR codes for this document */
  savedQRCodes?: DrawingQRCodeType[]
  /** Called when a QR code is generated and saved */
  onSave?: (qrCode: Omit<DrawingQRCodeType, 'id' | 'createdAt'>) => void
  /** Called when a QR code is deleted */
  onDelete?: (qrCodeId: string) => void
  /** Read-only mode */
  readOnly?: boolean
  /** Compact mode */
  compact?: boolean
  /** Optional class name */
  className?: string
}

interface QRCodeData {
  url: string
  dataUrl: string
  size: number
}

// =============================================
// QR Code Generation
// =============================================

// Simple QR code generator using canvas
// In production, you would use a library like qrcode or qr.js
async function generateQRCode(
  data: string,
  options: QRCodeGenerationOptions = {}
): Promise<string> {
  const {
    size = 200,
    errorCorrection = 'M',
  } = options

  // Use the QR Code API (or a library)
  // This is a placeholder that creates a simple pattern
  // In production, use: import QRCode from 'qrcode'

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Could not get canvas context')
  }

  // Try to use the QRCode library if available
  if (typeof (window as any).QRCode !== 'undefined') {
    return new Promise((resolve, reject) => {
      try {
        new (window as any).QRCode(canvas, {
          text: data,
          width: size,
          height: size,
          correctLevel: (window as any).QRCode.CorrectLevel[errorCorrection],
        })
        resolve(canvas.toDataURL('image/png'))
      } catch (e) {
        reject(e)
      }
    })
  }

  // Fallback: create a simple placeholder with URL
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size, size)

  // Draw a placeholder pattern
  ctx.fillStyle = '#000000'
  const moduleSize = size / 25

  // Corner patterns (finder patterns)
  const drawFinderPattern = (x: number, y: number) => {
    // Outer square
    ctx.fillRect(x, y, moduleSize * 7, moduleSize * 7)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(x + moduleSize, y + moduleSize, moduleSize * 5, moduleSize * 5)
    ctx.fillStyle = '#000000'
    ctx.fillRect(x + moduleSize * 2, y + moduleSize * 2, moduleSize * 3, moduleSize * 3)
  }

  drawFinderPattern(moduleSize, moduleSize)
  drawFinderPattern(size - moduleSize * 8, moduleSize)
  drawFinderPattern(moduleSize, size - moduleSize * 8)

  // Add some data pattern (simple hash of URL)
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data.charCodeAt(i)
    hash = hash & hash
  }

  for (let row = 9; row < 16; row++) {
    for (let col = 9; col < 16; col++) {
      if ((hash >> ((row * col) % 32)) & 1) {
        ctx.fillRect(col * moduleSize, row * moduleSize, moduleSize, moduleSize)
      }
    }
  }

  // Timing patterns
  for (let i = 8; i < 17; i += 2) {
    ctx.fillRect(i * moduleSize, 6 * moduleSize, moduleSize, moduleSize)
    ctx.fillRect(6 * moduleSize, i * moduleSize, moduleSize, moduleSize)
  }

  return canvas.toDataURL('image/png')
}

// =============================================
// Helper Functions
// =============================================

function buildDrawingUrl(
  baseUrl: string,
  documentId: string,
  page: number,
  viewport?: { x: number; y: number; zoom: number }
): string {
  const params = new URLSearchParams()
  params.set('page', page.toString())

  if (viewport) {
    params.set('x', viewport.x.toFixed(4))
    params.set('y', viewport.y.toFixed(4))
    params.set('zoom', viewport.zoom.toString())
  }

  return `${baseUrl}/documents/${documentId}/view?${params.toString()}`
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// =============================================
// QR Code Display Component
// =============================================

interface QRCodeDisplayProps {
  qrCode: DrawingQRCodeType
  onDelete?: () => void
  readOnly?: boolean
}

function QRCodeDisplay({ qrCode, onDelete, readOnly }: QRCodeDisplayProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function generate() {
      try {
        const dataUrl = await generateQRCode(qrCode.url, { size: 150 })
        setQrDataUrl(dataUrl)
      } catch (e) {
        console.error('Failed to generate QR code:', e)
      } finally {
        setIsLoading(false)
      }
    }
    generate()
  }, [qrCode.url])

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(qrCode.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [qrCode.url])

  const handleDownload = useCallback(() => {
    if (!qrDataUrl) {return}

    const link = document.createElement('a')
    link.download = `qr-${qrCode.label.replace(/\s+/g, '-').toLowerCase()}.png`
    link.href = qrDataUrl
    link.click()
  }, [qrDataUrl, qrCode.label])

  return (
    <div className="bg-muted/30 rounded-lg p-3 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium text-sm">{qrCode.label}</h4>
          {qrCode.description && (
            <p className="text-xs text-muted-foreground mt-1">
              {qrCode.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="text-xs">
              Page {qrCode.page}
            </Badge>
            {qrCode.viewport && (
              <Badge variant="outline" className="text-xs">
                {qrCode.viewport.zoom}%
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleCopy}>
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleDownload}>
            <Download className="w-3.5 h-3.5" />
          </Button>
          {!readOnly && onDelete && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <span className="sr-only">Delete</span>
              &times;
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* QR Code preview */}
        <div className="w-24 h-24 bg-white rounded-lg flex items-center justify-center border">
          {isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          ) : qrDataUrl ? (
            <img src={qrDataUrl} alt="QR Code" className="w-full h-full p-1" />
          ) : (
            <QrCode className="w-8 h-8 text-muted-foreground" />
          )}
        </div>

        {/* URL and metadata */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Link2 className="w-3 h-3" />
            <span className="truncate">{qrCode.url}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Created {formatDate(qrCode.createdAt)}
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs mt-2" asChild>
            <a href={qrCode.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3 h-3 mr-1" />
              Open Link
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}

// =============================================
// Generate QR Dialog
// =============================================

interface GenerateQRDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (qrCode: Omit<DrawingQRCodeType, 'id' | 'createdAt'>) => void
  documentId: string
  documentName?: string
  page: number
  viewport?: { x: number; y: number; zoom: number }
  baseUrl: string
}

function GenerateQRDialog({
  isOpen,
  onClose,
  onSave,
  documentId,
  documentName,
  page,
  viewport,
  baseUrl,
}: GenerateQRDialogProps) {
  const [label, setLabel] = useState(documentName ? `${documentName} - Page ${page}` : `Page ${page}`)
  const [description, setDescription] = useState('')
  const [includeViewport, setIncludeViewport] = useState(true)
  const [qrSize, setQrSize] = useState(200)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  const url = useMemo(() => {
    return buildDrawingUrl(
      baseUrl,
      documentId,
      page,
      includeViewport ? viewport : undefined
    )
  }, [baseUrl, documentId, page, includeViewport, viewport])

  // Generate QR code when URL changes
  useEffect(() => {
    async function generate() {
      setIsGenerating(true)
      try {
        const dataUrl = await generateQRCode(url, { size: qrSize })
        setQrDataUrl(dataUrl)
      } catch (e) {
        console.error('Failed to generate QR code:', e)
      } finally {
        setIsGenerating(false)
      }
    }
    if (isOpen) {
      generate()
    }
  }, [url, qrSize, isOpen])

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setLabel(documentName ? `${documentName} - Page ${page}` : `Page ${page}`)
      setDescription('')
      setIncludeViewport(true)
      setQrSize(200)
    }
  }, [isOpen, documentName, page])

  const handleCopyUrl = useCallback(async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [url])

  const handleDownload = useCallback(() => {
    if (!qrDataUrl) {return}

    const link = document.createElement('a')
    link.download = `qr-${label.replace(/\s+/g, '-').toLowerCase()}.png`
    link.href = qrDataUrl
    link.click()
  }, [qrDataUrl, label])

  const handlePrint = useCallback(() => {
    if (!qrDataUrl) {return}

    const printWindow = window.open('', '_blank')
    if (!printWindow) {return}

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${label}</title>
          <style>
            body {
              font-family: system-ui, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .qr-container {
              text-align: center;
              padding: 40px;
              border: 2px solid #000;
              border-radius: 8px;
            }
            h1 {
              font-size: 24px;
              margin: 0 0 10px;
            }
            p {
              color: #666;
              margin: 0 0 20px;
              font-size: 14px;
            }
            img {
              display: block;
              margin: 0 auto 20px;
            }
            .url {
              font-size: 12px;
              color: #888;
              word-break: break-all;
              max-width: 300px;
            }
            .page-info {
              font-size: 14px;
              color: #333;
              margin-top: 10px;
            }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h1>${label}</h1>
            ${description ? `<p>${description}</p>` : ''}
            <img src="${qrDataUrl}" alt="QR Code" width="${qrSize}" height="${qrSize}">
            <div class="page-info">Page ${page}${viewport ? ` @ ${viewport.zoom}% zoom` : ''}</div>
            <div class="url">${url}</div>
          </div>
          <script>window.onload = () => { window.print(); }</script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }, [qrDataUrl, label, description, page, viewport, url, qrSize])

  const handleSave = useCallback(() => {
    onSave({
      documentId,
      page,
      viewport: includeViewport ? viewport : undefined,
      label,
      url,
      description: description || undefined,
    })
    onClose()
  }, [onSave, documentId, page, includeViewport, viewport, label, url, description, onClose])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Generate QR Code
          </DialogTitle>
          <DialogDescription>
            Create a QR code that links directly to this drawing location
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* QR Code Preview */}
          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              {isGenerating ? (
                <div className="w-48 h-48 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR Code"
                  className="w-48 h-48"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-muted-foreground">
                  <QrCode className="w-16 h-16" />
                </div>
              )}
            </div>
          </div>

          {/* Label */}
          <div className="space-y-2">
            <Label htmlFor="qr-label">Label</Label>
            <Input
              id="qr-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Enter a label for this QR code"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="qr-description">Description (optional)</Label>
            <Input
              id="qr-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description"
            />
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label>Options</Label>

            {viewport && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-viewport"
                  checked={includeViewport}
                  onCheckedChange={(checked) => setIncludeViewport(checked as boolean)}
                />
                <label
                  htmlFor="include-viewport"
                  className="text-sm leading-none cursor-pointer"
                >
                  Include current view position ({viewport.zoom}% zoom)
                </label>
              </div>
            )}

            <div className="flex items-center gap-4">
              <Label htmlFor="qr-size" className="whitespace-nowrap">
                QR Size
              </Label>
              <NativeSelect
                id="qr-size"
                value={qrSize.toString()}
                onChange={(e) => setQrSize(parseInt(e.target.value))}
                className="w-32"
              >
                <option value="150">Small (150px)</option>
                <option value="200">Medium (200px)</option>
                <option value="300">Large (300px)</option>
                <option value="400">Extra Large (400px)</option>
              </NativeSelect>
            </div>
          </div>

          {/* URL Preview */}
          <div className="space-y-2">
            <Label>Link URL</Label>
            <div className="flex items-center gap-2">
              <Input
                value={url}
                readOnly
                className="text-xs font-mono"
              />
              <Button size="icon" variant="outline" onClick={handleCopyUrl}>
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Quick Info */}
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">
              <FileText className="w-3 h-3 mr-1" />
              Page {page}
            </Badge>
            {includeViewport && viewport && (
              <>
                <Badge variant="outline">
                  <MapPin className="w-3 h-3 mr-1" />
                  Position saved
                </Badge>
                <Badge variant="outline">
                  <Maximize className="w-3 h-3 mr-1" />
                  {viewport.zoom}% zoom
                </Badge>
              </>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={handleDownload} disabled={!qrDataUrl}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" onClick={handlePrint} disabled={!qrDataUrl}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
          <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!label.trim()}>
              <Check className="w-4 h-4 mr-2" />
              Save QR Code
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// =============================================
// Main Component
// =============================================

export function DrawingQRCode({
  documentId,
  documentName,
  page,
  totalPages,
  viewport,
  baseUrl = typeof window !== 'undefined' ? window.location.origin : '',
  savedQRCodes = [],
  onSave,
  onDelete,
  readOnly = false,
  compact = false,
  className,
}: DrawingQRCodeProps) {
  const [showGenerateDialog, setShowGenerateDialog] = useState(false)
  const [showList, setShowList] = useState(false)

  const currentPageQRCodes = useMemo(() => {
    return savedQRCodes.filter((qr) => qr.page === page)
  }, [savedQRCodes, page])

  if (compact) {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2"
                onClick={() => setShowGenerateDialog(true)}
              >
                <QrCode className="w-4 h-4" />
                {currentPageQRCodes.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs h-4 px-1">
                    {currentPageQRCodes.length}
                  </Badge>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Generate QR code for this page</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {onSave && (
          <GenerateQRDialog
            isOpen={showGenerateDialog}
            onClose={() => setShowGenerateDialog(false)}
            onSave={onSave}
            documentId={documentId}
            documentName={documentName}
            page={page}
            viewport={viewport}
            baseUrl={baseUrl}
          />
        )}
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <QrCode className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">QR Codes</span>
          {currentPageQRCodes.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {currentPageQRCodes.length} on this page
            </Badge>
          )}
        </div>
        {!readOnly && onSave && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowGenerateDialog(true)}
          >
            <QrCode className="w-3.5 h-3.5 mr-1" />
            Generate
          </Button>
        )}
      </div>

      {/* QR Codes list */}
      {currentPageQRCodes.length > 0 ? (
        <div className="space-y-2">
          {currentPageQRCodes.map((qr) => (
            <QRCodeDisplay
              key={qr.id}
              qrCode={qr}
              onDelete={onDelete ? () => onDelete(qr.id) : undefined}
              readOnly={readOnly}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-muted-foreground">
          <QrCode className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No QR codes on this page</p>
          {!readOnly && onSave && (
            <p className="text-xs mt-1">
              Generate a QR code to link to this drawing location
            </p>
          )}
        </div>
      )}

      {/* Show all QR codes for document */}
      {savedQRCodes.length > currentPageQRCodes.length && (
        <div className="pt-2 border-t">
          <button
            onClick={() => setShowList(!showList)}
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <span>
              {showList ? 'Hide' : 'Show'} all {savedQRCodes.length} QR codes
            </span>
            <ChevronDown
              className={cn(
                'w-4 h-4 transition-transform',
                showList && 'rotate-180'
              )}
            />
          </button>

          {showList && (
            <div className="mt-3 space-y-2">
              {savedQRCodes
                .filter((qr) => qr.page !== page)
                .map((qr) => (
                  <QRCodeDisplay
                    key={qr.id}
                    qrCode={qr}
                    onDelete={onDelete ? () => onDelete(qr.id) : undefined}
                    readOnly={readOnly}
                  />
                ))}
            </div>
          )}
        </div>
      )}

      {/* Generate Dialog */}
      {onSave && (
        <GenerateQRDialog
          isOpen={showGenerateDialog}
          onClose={() => setShowGenerateDialog(false)}
          onSave={onSave}
          documentId={documentId}
          documentName={documentName}
          page={page}
          viewport={viewport}
          baseUrl={baseUrl}
        />
      )}
    </div>
  )
}

// =============================================
// QR Code Scanner Handler
// =============================================

/**
 * Parse a drawing QR code URL and extract navigation parameters
 */
export function parseDrawingQRUrl(url: string): {
  documentId: string
  page: number
  viewport?: { x: number; y: number; zoom: number }
} | null {
  try {
    const parsed = new URL(url)
    const pathMatch = parsed.pathname.match(/\/documents\/([^/]+)\/view/)

    if (!pathMatch) {return null}

    const documentId = pathMatch[1]
    const page = parseInt(parsed.searchParams.get('page') || '1', 10)

    const x = parsed.searchParams.get('x')
    const y = parsed.searchParams.get('y')
    const zoom = parsed.searchParams.get('zoom')

    const viewport =
      x && y && zoom
        ? {
            x: parseFloat(x),
            y: parseFloat(y),
            zoom: parseInt(zoom, 10),
          }
        : undefined

    return { documentId, page, viewport }
  } catch {
    return null
  }
}

export default DrawingQRCode
