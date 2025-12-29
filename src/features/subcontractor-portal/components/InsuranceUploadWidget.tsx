/**
 * Insurance Upload Widget Component
 * Specialized widget for subcontractors to upload insurance certificates
 * Includes OCR preview, compliance status, and project requirements display
 */

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Eye,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import {
  useSubcontractorComplianceStatus,
  useProjectInsuranceRequirements,
  useCreateInsuranceCertificate,
} from '@/features/insurance/hooks/useInsurance'
import { INSURANCE_TYPE_LABELS, formatInsuranceLimit, type InsuranceType } from '@/types/insurance'
import { cn } from '@/lib/utils'

interface InsuranceUploadWidgetProps {
  subcontractorId: string
  subcontractorName?: string
  projectId?: string
  companyId: string
  onUploadComplete?: () => void
}

interface OcrExtractionResult {
  carrier_name: string | null
  policy_number: string | null
  effective_date: string | null
  expiration_date: string | null
  each_occurrence_limit: number | null
  general_aggregate_limit: number | null
  combined_single_limit: number | null
  umbrella_each_occurrence: number | null
  workers_comp_each_accident: number | null
  additional_insured: boolean
  waiver_of_subrogation: boolean
  primary_noncontributory: boolean
  confidence: number
  needs_review: boolean
  form_type: string
}

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'review' | 'complete' | 'error'

export function InsuranceUploadWidget({
  subcontractorId,
  subcontractorName: _subcontractorName,
  projectId,
  companyId,
  onUploadComplete,
}: InsuranceUploadWidgetProps) {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [extractedData, setExtractedData] = useState<OcrExtractionResult | null>(null)
  const [editedData, setEditedData] = useState<Partial<OcrExtractionResult>>({})
  const [selectedInsuranceType, setSelectedInsuranceType] = useState<InsuranceType>('general_liability')
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: complianceStatus, refetch: refetchCompliance } = useSubcontractorComplianceStatus(
    subcontractorId,
    projectId
  )
  const { data: projectRequirements } = useProjectInsuranceRequirements(projectId || '')
  const createCertificate = useCreateInsuranceCertificate()

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) {return}

    const file = acceptedFiles[0]
    setError(null)
    setUploadStatus('uploading')
    setUploadProgress(0)

    try {
      // Step 1: Upload file to storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${subcontractorId}/${Date.now()}.${fileExt}`
      const filePath = `insurance-certificates/${fileName}`

      setUploadProgress(20)

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {throw uploadError}

      setUploadProgress(40)

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      setUploadedFileUrl(urlData.publicUrl)
      setUploadProgress(50)

      // Step 2: Send to OCR processing
      setUploadStatus('processing')

      const { data: processResult, error: processError } = await supabase.functions.invoke(
        'process-insurance-certificate',
        {
          body: {
            file_url: urlData.publicUrl,
            file_type: file.type,
            project_id: projectId,
            subcontractor_id: subcontractorId,
            company_id: companyId,
            validate_against_requirements: !!projectId,
          },
        }
      )

      setUploadProgress(80)

      if (processError) {
        console.warn('OCR processing error:', processError)
        // Allow manual entry even if OCR fails
        setExtractedData(null)
      } else if (processResult?.extracted_data) {
        const data = processResult.extracted_data
        setExtractedData({
          carrier_name: data.carrier_name,
          policy_number: data.policy_number,
          effective_date: data.effective_date,
          expiration_date: data.expiration_date,
          each_occurrence_limit: data.general_liability?.each_occurrence,
          general_aggregate_limit: data.general_liability?.general_aggregate,
          combined_single_limit: data.auto_liability?.combined_single_limit,
          umbrella_each_occurrence: data.umbrella_excess?.each_occurrence,
          workers_comp_each_accident: data.workers_comp?.each_accident,
          additional_insured: data.endorsements?.additional_insured || false,
          waiver_of_subrogation: data.endorsements?.waiver_of_subrogation || false,
          primary_noncontributory: data.endorsements?.primary_noncontributory || false,
          confidence: data.confidence?.overall || 0,
          needs_review: processResult.needs_review || false,
          form_type: data.form_type || 'unknown',
        })
      }

      setUploadProgress(100)
      setUploadStatus('review')
      setShowReviewDialog(true)
    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'Upload failed')
      setUploadStatus('error')
    }
  }, [subcontractorId, projectId, companyId])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
    },
    maxFiles: 1,
    disabled: uploadStatus !== 'idle' && uploadStatus !== 'error' && uploadStatus !== 'complete',
  })

  const handleSaveCertificate = async () => {
    if (!uploadedFileUrl) {
      toast.error('No file uploaded')
      return
    }

    try {
      const data = { ...extractedData, ...editedData }

      await createCertificate.mutateAsync({
        company_id: companyId,
        subcontractor_id: subcontractorId,
        project_id: projectId || null,
        insurance_type: selectedInsuranceType,
        carrier_name: data.carrier_name || 'Unknown Carrier',
        policy_number: data.policy_number || 'Unknown',
        certificate_number: `CERT-${Date.now()}`,
        effective_date: data.effective_date || new Date().toISOString().split('T')[0],
        expiration_date: data.expiration_date || '',
        each_occurrence_limit: data.each_occurrence_limit || null,
        general_aggregate_limit: data.general_aggregate_limit || null,
        combined_single_limit: data.combined_single_limit || null,
        umbrella_each_occurrence: data.umbrella_each_occurrence || null,
        certificate_url: uploadedFileUrl,
        status: 'active',
        additional_insured_verified: data.additional_insured,
        waiver_of_subrogation_verified: data.waiver_of_subrogation,
        primary_noncontributory_verified: data.primary_noncontributory,
        ai_processed: true,
        ai_processed_at: new Date().toISOString(),
      })

      toast.success('Certificate uploaded successfully')
      setShowReviewDialog(false)
      setUploadStatus('complete')
      setExtractedData(null)
      setEditedData({})
      setUploadedFileUrl(null)
      refetchCompliance()
      onUploadComplete?.()

      // Reset after a moment
      setTimeout(() => {
        setUploadStatus('idle')
        setUploadProgress(0)
      }, 2000)
    } catch (err) {
      console.error('Save error:', err)
      toast.error('Failed to save certificate')
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Insurance Certificates</CardTitle>
          </div>
          {complianceStatus && (
            <Badge
              variant={complianceStatus.is_compliant ? 'default' : 'destructive'}
              className="whitespace-nowrap"
            >
              {complianceStatus.is_compliant ? (
                <>
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  Compliant
                </>
              ) : (
                <>
                  <ShieldAlert className="h-3 w-3 mr-1" />
                  Non-Compliant
                </>
              )}
            </Badge>
          )}
        </div>
        <CardDescription>
          Upload your insurance certificates for project compliance
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Compliance Status Summary */}
        {complianceStatus && !complianceStatus.is_compliant && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Compliance Issues</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside text-sm mt-1">
                {complianceStatus.expired_count > 0 && (
                  <li>{complianceStatus.expired_count} expired certificate(s)</li>
                )}
                {complianceStatus.expiring_soon_count > 0 && (
                  <li>{complianceStatus.expiring_soon_count} expiring soon</li>
                )}
                {complianceStatus.missing_insurance_types?.map((type) => (
                  <li key={type}>
                    Missing: {INSURANCE_TYPE_LABELS[type as InsuranceType] || type}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Project Requirements */}
        {projectRequirements && projectRequirements.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">PROJECT REQUIREMENTS</p>
            <div className="flex flex-wrap gap-2">
              {projectRequirements.map((req) => (
                <Badge key={req.id} variant="outline" className="text-xs">
                  {INSURANCE_TYPE_LABELS[req.insurance_type]}
                  {req.min_each_occurrence && (
                    <span className="ml-1">{formatInsuranceLimit(req.min_each_occurrence)}</span>
                  )}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Upload Zone */}
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
            isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
            (uploadStatus !== 'idle' && uploadStatus !== 'error' && uploadStatus !== 'complete')
              && 'cursor-not-allowed opacity-50'
          )}
        >
          <input {...getInputProps()} />

          {uploadStatus === 'idle' || uploadStatus === 'complete' ? (
            <div className="space-y-2">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {isDragActive
                  ? 'Drop your certificate here...'
                  : 'Drag & drop your insurance certificate, or click to browse'}
              </p>
              <p className="text-xs text-muted-foreground">PDF, PNG, or JPEG up to 10MB</p>
            </div>
          ) : uploadStatus === 'uploading' ? (
            <div className="space-y-3">
              <Loader2 className="h-8 w-8 mx-auto text-primary animate-spin" />
              <p className="text-sm">Uploading certificate...</p>
              <Progress value={uploadProgress} className="w-48 mx-auto" />
            </div>
          ) : uploadStatus === 'processing' ? (
            <div className="space-y-3">
              <FileText className="h-8 w-8 mx-auto text-primary animate-pulse" />
              <p className="text-sm">Processing with AI...</p>
              <p className="text-xs text-muted-foreground">
                Extracting certificate information
              </p>
              <Progress value={uploadProgress} className="w-48 mx-auto" />
            </div>
          ) : uploadStatus === 'review' ? (
            <div className="space-y-2">
              <Eye className="h-8 w-8 mx-auto text-primary" />
              <p className="text-sm">Ready for review</p>
              <Button size="sm" onClick={() => setShowReviewDialog(true)}>
                Review & Submit
              </Button>
            </div>
          ) : null}
        </div>

        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Upload Failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Message */}
        {uploadStatus === 'complete' && (
          <Alert className="border-success bg-success-light">
            <CheckCircle className="h-4 w-4 text-success" />
            <AlertTitle className="text-success">Upload Complete</AlertTitle>
            <AlertDescription>
              Your certificate has been submitted for review.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Review Extracted Data
            </DialogTitle>
            <DialogDescription>
              {extractedData?.confidence && extractedData.confidence < 70 ? (
                <span className="text-warning">
                  Low confidence extraction - please verify all fields
                </span>
              ) : (
                'Verify the information extracted from your certificate'
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Insurance Type */}
            <div className="space-y-2">
              <Label>Insurance Type *</Label>
              <Select
                value={selectedInsuranceType}
                onValueChange={(v) => setSelectedInsuranceType(v as InsuranceType)}
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

            {/* Carrier Name */}
            <div className="space-y-2">
              <Label>Insurance Carrier *</Label>
              <Input
                value={editedData.carrier_name ?? extractedData?.carrier_name ?? ''}
                onChange={(e) => setEditedData(prev => ({ ...prev, carrier_name: e.target.value }))}
                placeholder="Enter carrier name"
              />
            </div>

            {/* Policy Number */}
            <div className="space-y-2">
              <Label>Policy Number *</Label>
              <Input
                value={editedData.policy_number ?? extractedData?.policy_number ?? ''}
                onChange={(e) => setEditedData(prev => ({ ...prev, policy_number: e.target.value }))}
                placeholder="Enter policy number"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Effective Date</Label>
                <Input
                  type="date"
                  value={editedData.effective_date ?? extractedData?.effective_date ?? ''}
                  onChange={(e) => setEditedData(prev => ({ ...prev, effective_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Expiration Date *</Label>
                <Input
                  type="date"
                  value={editedData.expiration_date ?? extractedData?.expiration_date ?? ''}
                  onChange={(e) => setEditedData(prev => ({ ...prev, expiration_date: e.target.value }))}
                />
              </div>
            </div>

            {/* Coverage Limits */}
            <div className="space-y-2">
              <Label>Each Occurrence Limit</Label>
              <Input
                type="number"
                value={editedData.each_occurrence_limit ?? extractedData?.each_occurrence_limit ?? ''}
                onChange={(e) => setEditedData(prev => ({
                  ...prev,
                  each_occurrence_limit: e.target.value ? parseInt(e.target.value) : null
                }))}
                placeholder="e.g., 1000000"
              />
            </div>

            <div className="space-y-2">
              <Label>General Aggregate Limit</Label>
              <Input
                type="number"
                value={editedData.general_aggregate_limit ?? extractedData?.general_aggregate_limit ?? ''}
                onChange={(e) => setEditedData(prev => ({
                  ...prev,
                  general_aggregate_limit: e.target.value ? parseInt(e.target.value) : null
                }))}
                placeholder="e.g., 2000000"
              />
            </div>

            {/* Endorsements */}
            <div className="space-y-2">
              <Label>Endorsements</Label>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={(editedData.additional_insured ?? extractedData?.additional_insured) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setEditedData(prev => ({
                    ...prev,
                    additional_insured: !(editedData.additional_insured ?? extractedData?.additional_insured)
                  }))}
                >
                  {(editedData.additional_insured ?? extractedData?.additional_insured) ? (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  ) : null}
                  Additional Insured
                </Badge>
                <Badge
                  variant={(editedData.waiver_of_subrogation ?? extractedData?.waiver_of_subrogation) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setEditedData(prev => ({
                    ...prev,
                    waiver_of_subrogation: !(editedData.waiver_of_subrogation ?? extractedData?.waiver_of_subrogation)
                  }))}
                >
                  {(editedData.waiver_of_subrogation ?? extractedData?.waiver_of_subrogation) ? (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  ) : null}
                  Waiver of Subrogation
                </Badge>
                <Badge
                  variant={(editedData.primary_noncontributory ?? extractedData?.primary_noncontributory) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setEditedData(prev => ({
                    ...prev,
                    primary_noncontributory: !(editedData.primary_noncontributory ?? extractedData?.primary_noncontributory)
                  }))}
                >
                  {(editedData.primary_noncontributory ?? extractedData?.primary_noncontributory) ? (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  ) : null}
                  Primary & Non-Contributory
                </Badge>
              </div>
            </div>

            {/* Confidence Score */}
            {extractedData?.confidence !== undefined && (
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">AI Confidence Score</span>
                  <Badge variant={extractedData.confidence >= 80 ? 'default' : 'secondary'}>
                    {extractedData.confidence}%
                  </Badge>
                </div>
                {extractedData.form_type && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Detected form: {extractedData.form_type.toUpperCase().replace('_', ' ')}
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveCertificate}
              disabled={createCertificate.isPending}
            >
              {createCertificate.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Submit Certificate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default InsuranceUploadWidget
