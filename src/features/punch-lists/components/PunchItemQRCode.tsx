// File: /src/features/punch-lists/components/PunchItemQRCode.tsx
// QR Code generation and display for punch items

import { useState, useMemo } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { QrCode, Download, Copy, Check, Printer, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from '@/lib/notifications/ToastContext'
import type { PunchItem } from '@/types/database'

interface PunchItemQRCodeProps {
  punchItem: PunchItem
  size?: 'sm' | 'md' | 'lg'
  showButton?: boolean
}

// QR code sizes
const QR_SIZES = {
  sm: 128,
  md: 200,
  lg: 280,
}

/**
 * Generate the URL that the QR code will encode
 * This URL will open the punch item detail page
 */
function getPunchItemUrl(punchItemId: string): string {
  // Use the current origin for the URL
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  return `${baseUrl}/punch-lists/${punchItemId}`
}

/**
 * Generate a shortened identifier for display
 */
function getShortId(punchItem: PunchItem): string {
  // Use punch number if available, otherwise first 8 chars of ID
  if (punchItem.number) {
    return `#${punchItem.number}`
  }
  return punchItem.id.slice(0, 8).toUpperCase()
}

// QR code display component
const QRCodeDisplay = ({
  punchItem,
  qrUrl,
  qrSize,
  shortId,
  showActions = false,
  handleCopy,
  handleDownload,
  handlePrint,
  handleShare,
  copied,
}: {
  punchItem: PunchItem;
  qrUrl: string;
  qrSize: number;
  shortId: string;
  showActions?: boolean;
  handleCopy: () => void;
  handleDownload: () => void;
  handlePrint: () => void;
  handleShare: () => void;
  copied: boolean;
}) => (
  <div className="flex flex-col items-center">
    <div className="bg-card p-4 rounded-lg border shadow-sm">
      <QRCodeSVG
        id={`qr-${punchItem.id}`}
        value={qrUrl}
        size={showActions ? QR_SIZES.lg : qrSize}
        level="H"
        includeMargin={false}
        bgColor="#ffffff"
        fgColor="#000000"
      />
    </div>

    <div className="mt-3 text-center">
      <p className="font-mono text-sm font-semibold text-secondary">{shortId}</p>
      <p className="text-xs text-muted mt-1 max-w-[200px] truncate">{punchItem.title}</p>
    </div>

    {showActions && (
      <div className="flex gap-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="gap-1"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied!' : 'Copy Link'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          className="gap-1"
        >
          <Download className="h-4 w-4" />
          Download
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrint}
          className="gap-1"
        >
          <Printer className="h-4 w-4" />
          Print
        </Button>
        {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="gap-1"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        )}
      </div>
    )}
  </div>
);

export function PunchItemQRCode({
  punchItem,
  size = 'md',
  showButton = true,
}: PunchItemQRCodeProps) {
  const [copied, setCopied] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Memoize to avoid calling impure function during render
  const qrUrl = useMemo(() => getPunchItemUrl(punchItem.id), [punchItem.id])
  const shortId = useMemo(() => getShortId(punchItem), [punchItem])
  const qrSize = QR_SIZES[size]

  // Copy URL to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrUrl)
      setCopied(true)
      toast.success('Link copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy link')
    }
  }

  // Download QR code as image
  const handleDownload = () => {
    const svg = document.getElementById(`qr-${punchItem.id}`)
    if (!svg) {return}

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {return}

    const svgData = new XMLSerializer().serializeToString(svg)
    const img = new Image()

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)

      const link = document.createElement('a')
      link.download = `punch-${shortId}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      toast.success('QR code downloaded')
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  // Print QR code
  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('Please allow popups to print')
      return
    }

    const svg = document.getElementById(`qr-${punchItem.id}`)
    if (!svg) {return}

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Punch Item ${shortId}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: system-ui, -apple-system, sans-serif;
            }
            .qr-container {
              text-align: center;
              padding: 2rem;
              border: 2px solid #000;
              border-radius: 8px;
            }
            .title {
              font-size: 1.5rem;
              font-weight: bold;
              margin-bottom: 1rem;
            }
            .details {
              font-size: 0.875rem;
              color: #666;
              margin-top: 1rem;
            }
            @media print {
              body { margin: 0; }
              .qr-container { border: none; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="title">Punch Item ${shortId}</div>
            ${svg.outerHTML}
            <div class="details">
              <div><strong>${punchItem.title}</strong></div>
              <div>Trade: ${punchItem.trade || 'N/A'}</div>
              ${punchItem.building || punchItem.floor || punchItem.room
                ? `<div>Location: ${[punchItem.building, punchItem.floor, punchItem.room].filter(Boolean).join(' / ')}</div>`
                : ''
              }
            </div>
          </div>
          <script>
            window.onload = () => {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  // Share via Web Share API
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Punch Item ${shortId}`,
          text: punchItem.title,
          url: qrUrl,
        })
      } catch (err) {
        // User cancelled share or error
        if ((err as Error).name !== 'AbortError') {
          toast.error('Failed to share')
        }
      }
    } else {
      handleCopy()
    }
  }

  if (!showButton) {
    return (
      <QRCodeDisplay
        punchItem={punchItem}
        qrUrl={qrUrl}
        qrSize={qrSize}
        shortId={shortId}
        showActions={false}
        handleCopy={handleCopy}
        handleDownload={handleDownload}
        handlePrint={handlePrint}
        handleShare={handleShare}
        copied={copied}
      />
    )
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <QrCode className="h-4 w-4" />
          QR Code
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Punch Item QR Code
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <QRCodeDisplay
            punchItem={punchItem}
            qrUrl={qrUrl}
            qrSize={qrSize}
            shortId={shortId}
            showActions={true}
            handleCopy={handleCopy}
            handleDownload={handleDownload}
            handlePrint={handlePrint}
            handleShare={handleShare}
            copied={copied}
          />
        </div>
        <div className="text-xs text-muted text-center">
          Scan this code to quickly access this punch item on any device
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Batch QR Code Generator for printing multiple punch items
 */
interface BatchQRCodeProps {
  punchItems: PunchItem[]
}

export function BatchQRCodePrint({ punchItems }: BatchQRCodeProps) {
  const handlePrintAll = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('Please allow popups to print')
      return
    }

    const qrCards = punchItems.map((item) => {
      const url = getPunchItemUrl(item.id)
      const shortId = getShortId(item)

      return `
        <div class="qr-card">
          <div class="qr-placeholder" data-url="${url}" data-id="${item.id}"></div>
          <div class="qr-info">
            <div class="qr-id">${shortId}</div>
            <div class="qr-title">${item.title}</div>
            <div class="qr-trade">${item.trade || 'N/A'}</div>
          </div>
        </div>
      `
    }).join('')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Punch Item QR Codes</title>
          <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 1rem;
              font-family: system-ui, -apple-system, sans-serif;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 1rem;
            }
            .qr-card {
              border: 1px solid #ccc;
              border-radius: 8px;
              padding: 1rem;
              text-align: center;
              page-break-inside: avoid;
            }
            .qr-placeholder canvas {
              max-width: 150px;
              height: auto;
            }
            .qr-info {
              margin-top: 0.5rem;
            }
            .qr-id {
              font-weight: bold;
              font-family: monospace;
              font-size: 1rem;
            }
            .qr-title {
              font-size: 0.75rem;
              color: #333;
              max-width: 150px;
              margin: 0.25rem auto;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            .qr-trade {
              font-size: 0.625rem;
              color: #666;
            }
            @media print {
              .grid { gap: 0.5rem; }
              .qr-card { border: 1px solid #000; }
            }
          </style>
        </head>
        <body>
          <div class="grid">${qrCards}</div>
          <script>
            document.querySelectorAll('.qr-placeholder').forEach(el => {
              const url = el.dataset.url;
              const canvas = document.createElement('canvas');
              QRCode.toCanvas(canvas, url, { width: 150, margin: 1 }, (err) => {
                if (!err) el.appendChild(canvas);
              });
            });
            setTimeout(() => {
              window.print();
              window.close();
            }, 1000);
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <Button variant="outline" onClick={handlePrintAll} className="gap-1">
      <Printer className="h-4 w-4" />
      Print All QR Codes ({punchItems.length})
    </Button>
  )
}
