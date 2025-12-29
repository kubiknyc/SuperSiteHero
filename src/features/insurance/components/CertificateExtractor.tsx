// File: /src/features/insurance/components/CertificateExtractor.tsx
// AI/OCR Certificate extraction component for automatic data parsing

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Save,
  RotateCcw,
} from 'lucide-react'
import { INSURANCE_TYPE_LABELS, type InsuranceType } from '@/types/insurance'
import { logger } from '@/lib/utils/logger'

// Extracted data structure from OCR
interface ExtractedCertificateData {
  carrier_name?: string
  policy_number?: string
  effective_date?: string
  expiration_date?: string
  insurance_type?: InsuranceType
  limits: {
    each_occurrence?: number
    general_aggregate?: number
    products_completed_ops?: number
    personal_adv_injury?: number
    damage_to_rented?: number
    medical_expense?: number
    combined_single_limit?: number
    umbrella_occurrence?: number
    umbrella_aggregate?: number
  }
  endorsements: {
    additional_insured?: boolean
    waiver_of_subrogation?: boolean
    primary_noncontributory?: boolean
  }
  confidence: {
    overall: number
    fields: Record<string, number>
  }
}

interface CertificateExtractorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onExtracted: (data: ExtractedCertificateData, file: File) => void
  subcontractorId?: string
  projectId?: string
}

type ExtractionStatus = 'idle' | 'uploading' | 'processing' | 'reviewing' | 'complete' | 'error'

/**
 * Certificate Extractor Component
 *
 * Features:
 * - File upload dropzone (PDF, images)
 * - OCR processing with progress
 * - Extracted data preview with confidence scores
 * - Field mapping and manual correction UI
 * - Save and create certificate button
 */
export function CertificateExtractor({
  open,
  onOpenChange,
  onExtracted,
}: CertificateExtractorProps) {
  const { toast } = useToast()
  const [status, setStatus] = useState<ExtractionStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [_extractedData, setExtractedData] = useState<ExtractedCertificateData | null>(null)
  const [editedData, setEditedData] = useState<ExtractedCertificateData | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Reset state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setStatus('idle')
      setProgress(0)
      setSelectedFile(null)
      setExtractedData(null)
      setEditedData(null)
      setError(null)
    }
    onOpenChange(newOpen)
  }

  // Process file with OCR - moved before onDrop that uses it
  const processFile = async (_file: File) => {
    setStatus('uploading')
    setProgress(10)

    try {
      // Simulate upload progress
      await new Promise(r => setTimeout(r, 500))
      setProgress(30)
      setStatus('processing')

      // In production, this would call the OCR edge function
      // For now, simulate OCR extraction
      await new Promise(r => setTimeout(r, 1000))
      setProgress(60)

      // Simulate extracted data (in production, this comes from Tesseract.js or API)
      const mockExtracted: ExtractedCertificateData = {
        carrier_name: 'Example Insurance Co.',
        policy_number: 'GL-2025-001234',
        effective_date: '2025-01-01',
        expiration_date: '2026-01-01',
        insurance_type: 'general_liability',
        limits: {
          each_occurrence: 1000000,
          general_aggregate: 2000000,
          products_completed_ops: 2000000,
          personal_adv_injury: 1000000,
          damage_to_rented: 100000,
          medical_expense: 5000,
        },
        endorsements: {
          additional_insured: true,
          waiver_of_subrogation: false,
          primary_noncontributory: true,
        },
        confidence: {
          overall: 0.87,
          fields: {
            carrier_name: 0.95,
            policy_number: 0.92,
            effective_date: 0.88,
            expiration_date: 0.88,
            insurance_type: 0.75,
            each_occurrence: 0.90,
            general_aggregate: 0.85,
          },
        },
      }

      setProgress(90)
      await new Promise(r => setTimeout(r, 300))

      setExtractedData(mockExtracted)
      setEditedData(mockExtracted)
      setProgress(100)
      setStatus('reviewing')

      logger.log('[CertificateExtractor] Extraction complete', {
        confidence: mockExtracted.confidence.overall,
      })
    } catch (err) {
      logger.error('[CertificateExtractor] Extraction failed:', err)
      setError('Failed to extract certificate data. Please try again or enter manually.')
      setStatus('error')
    }
  }

  // Handle file drop
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) {return}

    const file = acceptedFiles[0]
    setSelectedFile(file)
    setError(null)

    // Start extraction process
    await processFile(file)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  })

  // Update edited field
  const updateField = (field: string, value: unknown) => {
    if (!editedData) {return}

    if (field.startsWith('limits.')) {
      const limitField = field.replace('limits.', '')
      setEditedData({
        ...editedData,
        limits: {
          ...editedData.limits,
          [limitField]: value,
        },
      })
    } else if (field.startsWith('endorsements.')) {
      const endField = field.replace('endorsements.', '')
      setEditedData({
        ...editedData,
        endorsements: {
          ...editedData.endorsements,
          [endField]: value,
        },
      })
    } else {
      setEditedData({
        ...editedData,
        [field]: value,
      })
    }
  }

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) {return 'text-success'}
    if (confidence >= 0.7) {return 'text-warning'}
    return 'text-destructive'
  }

  // Save and create certificate
  const handleSave = () => {
    if (!editedData || !selectedFile) {return}

    onExtracted(editedData, selectedFile)
    handleOpenChange(false)

    toast({
      title: 'Certificate data extracted',
      description: 'Review and save the certificate to complete.',
    })
  }

  // Retry extraction
  const handleRetry = () => {
    if (selectedFile) {
      processFile(selectedFile)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Certificate Extraction
          </DialogTitle>
          <DialogDescription>
            Upload an insurance certificate and we&apos;ll automatically extract the data using AI.
          </DialogDescription>
        </DialogHeader>

        {/* Upload State */}
        {(status === 'idle' || status === 'error') && (
          <div className="space-y-4">
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50'
              )}
            >
              <input {...getInputProps()} />
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              {isDragActive ? (
                <p className="text-primary font-medium">Drop the certificate here...</p>
              ) : (
                <>
                  <p className="font-medium">
                    Drag and drop a certificate, or click to browse
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Supports PDF, PNG, JPG (max 10MB)
                  </p>
                </>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Extraction Failed</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Processing State */}
        {(status === 'uploading' || status === 'processing') && (
          <div className="py-8 space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="font-medium">
                {status === 'uploading' ? 'Uploading file...' : 'Extracting data with AI...'}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
            {selectedFile && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>{selectedFile.name}</span>
              </div>
            )}
          </div>
        )}

        {/* Review State */}
        {status === 'reviewing' && editedData && (
          <div className="space-y-6">
            {/* Confidence Score */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span className="font-medium">Extraction Complete</span>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  'font-mono',
                  getConfidenceColor(editedData.confidence.overall)
                )}
              >
                {Math.round(editedData.confidence.overall * 100)}% confidence
              </Badge>
            </div>

            {/* Extracted Fields */}
            <div className="grid gap-4">
              {/* Basic Info */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 pt-0">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center justify-between">
                        <span>Insurance Carrier</span>
                        <ConfidenceBadge value={editedData.confidence.fields.carrier_name} />
                      </Label>
                      <Input
                        value={editedData.carrier_name || ''}
                        onChange={(e) => updateField('carrier_name', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center justify-between">
                        <span>Policy Number</span>
                        <ConfidenceBadge value={editedData.confidence.fields.policy_number} />
                      </Label>
                      <Input
                        value={editedData.policy_number || ''}
                        onChange={(e) => updateField('policy_number', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Insurance Type</Label>
                      <Select
                        value={editedData.insurance_type}
                        onValueChange={(v) => updateField('insurance_type', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(INSURANCE_TYPE_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Effective Date</Label>
                      <Input
                        type="date"
                        value={editedData.effective_date || ''}
                        onChange={(e) => updateField('effective_date', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Expiration Date</Label>
                      <Input
                        type="date"
                        value={editedData.expiration_date || ''}
                        onChange={(e) => updateField('expiration_date', e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Coverage Limits */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Coverage Limits</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 pt-0">
                  <div className="space-y-2">
                    <Label>Each Occurrence</Label>
                    <Input
                      type="number"
                      value={editedData.limits.each_occurrence || ''}
                      onChange={(e) =>
                        updateField('limits.each_occurrence', parseInt(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>General Aggregate</Label>
                    <Input
                      type="number"
                      value={editedData.limits.general_aggregate || ''}
                      onChange={(e) =>
                        updateField('limits.general_aggregate', parseInt(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Products/Completed Ops</Label>
                    <Input
                      type="number"
                      value={editedData.limits.products_completed_ops || ''}
                      onChange={(e) =>
                        updateField('limits.products_completed_ops', parseInt(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Personal/Adv Injury</Label>
                    <Input
                      type="number"
                      value={editedData.limits.personal_adv_injury || ''}
                      onChange={(e) =>
                        updateField('limits.personal_adv_injury', parseInt(e.target.value) || 0)
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Endorsements */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Endorsements</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2 pt-0">
                  <EndorsementToggle
                    label="Additional Insured"
                    checked={editedData.endorsements.additional_insured || false}
                    onCheckedChange={(checked) =>
                      updateField('endorsements.additional_insured', checked)
                    }
                  />
                  <EndorsementToggle
                    label="Waiver of Subrogation"
                    checked={editedData.endorsements.waiver_of_subrogation || false}
                    onCheckedChange={(checked) =>
                      updateField('endorsements.waiver_of_subrogation', checked)
                    }
                  />
                  <EndorsementToggle
                    label="Primary & Non-Contributory"
                    checked={editedData.endorsements.primary_noncontributory || false}
                    onCheckedChange={(checked) =>
                      updateField('endorsements.primary_noncontributory', checked)
                    }
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {status === 'reviewing' && (
            <>
              <Button variant="outline" onClick={handleRetry}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Re-extract
              </Button>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Use Extracted Data
              </Button>
            </>
          )}
          {(status === 'idle' || status === 'error') && (
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Confidence badge component
function ConfidenceBadge({ value }: { value?: number }) {
  if (!value) {return null}

  const percentage = Math.round(value * 100)
  const color =
    percentage >= 90
      ? 'bg-success/10 text-success'
      : percentage >= 70
      ? 'bg-warning/10 text-warning'
      : 'bg-destructive/10 text-destructive'

  return (
    <span className={cn('text-xs px-1.5 py-0.5 rounded font-mono', color)}>
      {percentage}%
    </span>
  )
}

// Endorsement toggle button
function EndorsementToggle({
  label,
  checked,
  onCheckedChange,
}: {
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
        checked
          ? 'bg-success/10 text-success border border-success/20'
          : 'bg-muted text-muted-foreground border border-transparent hover:bg-muted/80'
      )}
    >
      {checked && <CheckCircle2 className="h-3.5 w-3.5 inline mr-1.5" />}
      {label}
    </button>
  )
}
