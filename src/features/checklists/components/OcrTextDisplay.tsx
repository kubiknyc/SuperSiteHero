// File: /src/features/checklists/components/OcrTextDisplay.tsx
// Component for displaying OCR extracted text with confidence scores and actions

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Copy,
  FileText,
  FileJson,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react'
import type { OcrResult } from '@/types/ocr'
import {
  formatConfidence,
  hasLowConfidence,
  getLowConfidenceWords,
  copyToClipboard,
  downloadAsTextFile,
  downloadAsJsonFile,
} from '../utils/ocrUtils'
import { toast } from 'sonner'
import { logger } from '../../../lib/utils/logger';


interface OcrTextDisplayProps {
  result: OcrResult
  onClose?: () => void
}

export function OcrTextDisplay({ result, onClose }: OcrTextDisplayProps) {
  const [showDetails, setShowDetails] = useState(false)

  const lowConfidence = hasLowConfidence(result)
  const lowConfidenceWords = getLowConfidenceWords(result)

  const handleCopy = async () => {
    try {
      await copyToClipboard(result)
      toast.success('Text copied to clipboard')
    } catch (error) {
      toast.error('Failed to copy text')
      logger.error(error)
    }
  }

  const handleDownloadText = () => {
    try {
      const timestamp = new Date(result.extractedAt).toISOString().replace(/:/g, '-').split('.')[0]
      downloadAsTextFile(result, `ocr-text-${timestamp}.txt`)
      toast.success('Text file downloaded')
    } catch (error) {
      toast.error('Failed to download text file')
      logger.error(error)
    }
  }

  const handleDownloadJson = () => {
    try {
      const timestamp = new Date(result.extractedAt).toISOString().replace(/:/g, '-').split('.')[0]
      downloadAsJsonFile(result, `ocr-data-${timestamp}.json`)
      toast.success('JSON file downloaded')
    } catch (error) {
      toast.error('Failed to download JSON file')
      logger.error(error)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header with confidence badge */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Label className="text-sm font-medium text-secondary">Extracted Text</Label>
          <div className="flex items-center gap-2">
            <Badge
              variant={lowConfidence ? 'outline' : 'default'}
              className={lowConfidence ? 'border-orange-500 text-orange-700' : 'bg-success'}
            >
              {lowConfidence ? (
                <AlertCircle className="w-3 h-3 mr-1" />
              ) : (
                <CheckCircle className="w-3 h-3 mr-1" />
              )}
              {formatConfidence(result.confidence)} Confidence
            </Badge>
            <Badge variant="outline" className="text-xs text-secondary">
              <Clock className="w-3 h-3 mr-1" />
              {(result.processingTime / 1000).toFixed(1)}s
            </Badge>
            <Badge variant="outline" className="text-xs text-secondary">
              {result.words.length} words
            </Badge>
          </div>
        </div>
      </div>

      {/* Warning for low confidence */}
      {lowConfidence && (
        <Card className="p-3 bg-orange-50 border-orange-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-orange-900">Low Confidence Detection</p>
              <p className="text-orange-700 mt-1">
                The extracted text may not be fully accurate. {lowConfidenceWords.length} words have
                low confidence. Please review carefully.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Extracted text */}
      <Card className="p-4">
        <div className="space-y-3">
          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap break-words font-sans text-sm text-foreground bg-surface p-3 rounded border border-border">
              {result.text || '(No text detected)'}
            </pre>
          </div>

          {/* Character and word count */}
          <div className="flex items-center gap-4 text-xs text-secondary pt-2 border-t border-border">
            <span>{result.text.length} characters</span>
            <span>{result.words.length} words</span>
            <span>{result.lines.length} lines</span>
            <span>{result.blocks.length} blocks</span>
          </div>
        </div>
      </Card>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={handleCopy}>
          <Copy className="w-4 h-4 mr-2" />
          Copy Text
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={handleDownloadText}>
          <FileText className="w-4 h-4 mr-2" />
          Download TXT
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={handleDownloadJson}>
          <FileJson className="w-4 h-4 mr-2" />
          Download JSON
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </Button>
      </div>

      {/* Detailed OCR data */}
      {showDetails && (
        <Card className="p-4 bg-surface">
          <Label className="text-xs font-medium text-secondary mb-3 block">Detailed OCR Data</Label>

          <div className="space-y-4">
            {/* Metadata */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-secondary">Language:</span>
                <span className="ml-2 font-medium">{result.language}</span>
              </div>
              <div>
                <span className="text-secondary">Extracted:</span>
                <span className="ml-2 font-medium">
                  {new Date(result.extractedAt).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-secondary">Processing Time:</span>
                <span className="ml-2 font-medium">{(result.processingTime / 1000).toFixed(2)}s</span>
              </div>
              <div>
                <span className="text-secondary">Overall Confidence:</span>
                <span className="ml-2 font-medium">{formatConfidence(result.confidence)}</span>
              </div>
            </div>

            {/* Low confidence words */}
            {lowConfidenceWords.length > 0 && (
              <div className="pt-3 border-t border-input">
                <Label className="text-xs font-medium text-secondary mb-2 block">
                  Low Confidence Words ({lowConfidenceWords.length})
                </Label>
                <div className="flex flex-wrap gap-2">
                  {lowConfidenceWords.slice(0, 20).map((word, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs text-orange-700 border-orange-300">
                      {word.text} ({formatConfidence(word.confidence)})
                    </Badge>
                  ))}
                  {lowConfidenceWords.length > 20 && (
                    <span className="text-xs text-secondary">+{lowConfidenceWords.length - 20} more</span>
                  )}
                </div>
              </div>
            )}

            {/* Text blocks */}
            <div className="pt-3 border-t border-input">
              <Label className="text-xs font-medium text-secondary mb-2 block">
                Text Blocks ({result.blocks.length})
              </Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {result.blocks.map((block, idx) => (
                  <Card key={idx} className="p-2 bg-card">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs text-foreground flex-1">{block.text}</p>
                      <Badge variant="outline" className="text-xs">
                        {formatConfidence(block.confidence)}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Close button */}
      {onClose && (
        <div className="flex justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      )}
    </div>
  )
}
