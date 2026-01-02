// File: /src/features/checklists/components/PhotoWithOcrCard.tsx
// Photo card component with OCR status and text extraction capabilities

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  Trash2,
  Eye,
} from 'lucide-react'
import type { PhotoOcrData, OcrProgress } from '@/types/ocr'
import { extractTextFromUrl, formatConfidence } from '../utils/ocrUtils'
import { OcrTextDisplay } from './OcrTextDisplay'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { logger } from '../../../lib/utils/logger';


interface PhotoWithOcrCardProps {
  photoUrl: string
  ocrData?: PhotoOcrData
  onOcrComplete?: (ocrData: PhotoOcrData) => void
  onDelete?: () => void
  showOcrButton?: boolean
}

export function PhotoWithOcrCard({
  photoUrl,
  ocrData,
  onOcrComplete,
  onDelete,
  showOcrButton = true,
}: PhotoWithOcrCardProps) {
  const [isExtracting, setIsExtracting] = useState(false)
  const [progress, setProgress] = useState<OcrProgress | null>(null)
  const [showOcrDialog, setShowOcrDialog] = useState(false)

  const status = ocrData?.status || 'pending'
  const result = ocrData?.result

  const handleExtractText = async () => {
    setIsExtracting(true)
    setProgress(null)

    try {
      const result = await extractTextFromUrl(
        photoUrl,
        {},
        (progress) => {
          setProgress(progress)
        }
      )

      const newOcrData: PhotoOcrData = {
        status: 'completed',
        result,
        lastProcessedAt: Date.now(),
      }

      onOcrComplete?.(newOcrData)
      toast.success(`Extracted ${result.words.length} words from photo`)
      setShowOcrDialog(true)
    } catch (error) {
      logger.error('OCR extraction failed:', error)

      const errorData: PhotoOcrData = {
        status: 'failed',
        error: error instanceof Error ? error.message : 'OCR extraction failed',
        lastProcessedAt: Date.now(),
      }

      onOcrComplete?.(errorData)
      toast.error('Failed to extract text from photo')
    } finally {
      setIsExtracting(false)
      setProgress(null)
    }
  }

  return (
    <>
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        {/* Photo thumbnail */}
        <div className="relative aspect-video bg-muted">
          <img
            src={photoUrl}
            alt="Checklist photo"
            className="w-full h-full object-cover"
          />

          {/* OCR Status Badge */}
          {status !== 'pending' && (
            <div className="absolute top-2 right-2">
              {status === 'processing' && (
                <Badge className="bg-primary">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Processing...
                </Badge>
              )}
              {status === 'completed' && result && (
                <Badge className="bg-success">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {formatConfidence(result.confidence)}
                </Badge>
              )}
              {status === 'failed' && (
                <Badge variant="destructive">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Failed
                </Badge>
              )}
            </div>
          )}

          {/* Processing overlay */}
          {isExtracting && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <p className="text-sm font-medium">Extracting text...</p>
              {progress && (
                <p className="text-xs mt-1 opacity-80">
                  {progress.status} ({Math.round(progress.progress * 100)}%)
                </p>
              )}
            </div>
          )}
        </div>

        {/* Photo info and actions */}
        <div className="p-3 space-y-2">
          {/* OCR text preview */}
          {result && result.text && (
            <div className="bg-surface p-2 rounded border border-border">
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-xs font-medium text-secondary">Extracted Text:</span>
                <Badge variant="outline" className="text-xs">
                  {result.words.length} words
                </Badge>
              </div>
              <p className="text-xs text-foreground line-clamp-3">
                {result.text}
              </p>
            </div>
          )}

          {/* Error message */}
          {status === 'failed' && ocrData?.error && (
            <div className="bg-error-light p-2 rounded border border-red-200">
              <p className="text-xs text-error-dark">{ocrData.error}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 flex-1">
              {/* Extract text button */}
              {showOcrButton && status !== 'processing' && (
                <Button
                  type="button"
                  size="sm"
                  variant={status === 'completed' ? 'outline' : 'default'}
                  onClick={handleExtractText}
                  disabled={isExtracting}
                  className="flex-1"
                >
                  {isExtracting ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4 mr-1" />
                  )}
                  {status === 'completed' ? 'Re-extract' : 'Extract Text'}
                </Button>
              )}

              {/* View extracted text */}
              {result && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowOcrDialog(true)}
                  className="flex-1"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View Text
                </Button>
              )}
            </div>

            {/* Delete photo */}
            {onDelete && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onDelete}
                className="px-2"
              >
                <Trash2 className="w-4 h-4 text-error" />
              </Button>
            )}
          </div>

          {/* Last processed timestamp */}
          {ocrData?.lastProcessedAt && (
            <div className="flex items-center gap-1 text-xs text-secondary">
              <Clock className="w-3 h-3" />
              <span>
                Processed {new Date(ocrData.lastProcessedAt).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* OCR Result Dialog */}
      {result && (
        <Dialog open={showOcrDialog} onOpenChange={setShowOcrDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Extracted Text from Photo</DialogTitle>
            </DialogHeader>
            <OcrTextDisplay result={result} onClose={() => setShowOcrDialog(false)} />
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
