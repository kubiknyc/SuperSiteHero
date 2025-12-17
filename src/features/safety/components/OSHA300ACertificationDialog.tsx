/**
 * OSHA 300A Certification Dialog
 *
 * Component for certifying the OSHA Form 300A Annual Summary.
 * Includes digital signature capture (typed or drawn) and certification details.
 *
 * OSHA Requirement: The summary must be certified by a company executive and posted
 * from February 1 to April 30 of the year following the year covered by the form.
 */

import { useState, useRef, useEffect } from 'react'
import { X, Pen, Type, Trash2, CheckCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { OSHA300ASummary } from '@/types/safety-incidents'

// ============================================================================
// Types
// ============================================================================

interface OSHA300ACertificationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  summary: OSHA300ASummary
  companyId: string
  projectId?: string
  onCertificationComplete?: () => void
}

interface CertificationData {
  certifying_official_name: string
  certifying_official_title: string
  certifying_official_phone: string
  certifying_official_email: string
  certification_date: string
  signature_type: 'typed' | 'drawn'
  signature_typed_name: string
  signature_data: string | null
  notes: string
  total_hours_worked: number | null
  average_number_employees: number | null
}

// ============================================================================
// Signature Canvas Component
// ============================================================================

interface SignatureCanvasProps {
  width: number
  height: number
  onSave: (dataUrl: string) => void
  signatureData?: string | null
}

const SignatureCanvas: React.FC<SignatureCanvasProps> = ({
  width,
  height,
  onSave,
  signatureData,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  useEffect(() => {
    if (canvasRef.current && signatureData) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (ctx) {
        const img = new Image()
        img.onload = () => {
          ctx.drawImage(img, 0, 0)
          setHasSignature(true)
        }
        img.src = signatureData
      }
    }
  }, [signatureData])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top

    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
    setHasSignature(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top

    ctx.lineTo(x, y)
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    setIsDrawing(false)

    const canvas = canvasRef.current
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png')
      onSave(dataUrl)
    }
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      setHasSignature(false)
      onSave('')
    }
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border border-gray-300 rounded-md cursor-crosshair bg-white"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      {hasSignature && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clearCanvas}
          className="w-full"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clear Signature
        </Button>
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export const OSHA300ACertificationDialog: React.FC<OSHA300ACertificationDialogProps> = ({
  open,
  onOpenChange,
  summary,
  companyId,
  projectId,
  onCertificationComplete,
}) => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState<CertificationData>({
    certifying_official_name: '',
    certifying_official_title: '',
    certifying_official_phone: '',
    certifying_official_email: user?.email || '',
    certification_date: new Date().toISOString().split('T')[0],
    signature_type: 'typed',
    signature_typed_name: '',
    signature_data: null,
    notes: '',
    total_hours_worked: null,
    average_number_employees: null,
  })

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setError(null)
      setSuccess(false)
    }
  }, [open])

  const handleInputChange = (field: keyof CertificationData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSignatureSave = (dataUrl: string) => {
    handleInputChange('signature_data', dataUrl || null)
  }

  const calculateRates = () => {
    const hoursWorked = formData.total_hours_worked || 0
    if (hoursWorked === 0) {
      return { trir: null, dart_rate: null }
    }

    // TRIR = (Total Recordable Cases / Total Hours Worked) × 200,000
    const trir = ((summary.total_recordable_cases || 0) / hoursWorked) * 200000

    // DART Rate = (Days Away + Job Transfer Cases / Total Hours Worked) × 200,000
    const dartCases = (summary.total_days_away_cases || 0) + (summary.total_job_transfer_cases || 0)
    const dart_rate = (dartCases / hoursWorked) * 200000

    return {
      trir: parseFloat(trir.toFixed(2)),
      dart_rate: parseFloat(dart_rate.toFixed(2)),
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Validation
      if (!formData.certifying_official_name) {
        throw new Error('Certifying official name is required')
      }
      if (!formData.certifying_official_title) {
        throw new Error('Certifying official title is required')
      }
      if (!formData.certification_date) {
        throw new Error('Certification date is required')
      }

      if (formData.signature_type === 'typed' && !formData.signature_typed_name) {
        throw new Error('Please type your name to certify')
      }

      if (formData.signature_type === 'drawn' && !formData.signature_data) {
        throw new Error('Please draw your signature to certify')
      }

      const rates = calculateRates()

      // Save certification to database
      const certificationData = {
        company_id: companyId,
        project_id: projectId || null,
        calendar_year: summary.year,
        establishment_name: summary.project_name,
        certifying_official_name: formData.certifying_official_name,
        certifying_official_title: formData.certifying_official_title,
        certifying_official_phone: formData.certifying_official_phone || null,
        certifying_official_email: formData.certifying_official_email || null,
        signature_type: formData.signature_type,
        signature_data: formData.signature_type === 'drawn' ? formData.signature_data : null,
        signature_typed_name: formData.signature_type === 'typed' ? formData.signature_typed_name : null,
        certification_date: formData.certification_date,
        certified_by: user?.id,
        total_hours_worked: formData.total_hours_worked,
        average_number_employees: formData.average_number_employees,
        total_deaths: summary.total_deaths,
        total_days_away_cases: summary.total_days_away_cases,
        total_job_transfer_cases: summary.total_job_transfer_cases,
        total_other_recordable_cases: summary.total_other_recordable_cases,
        total_recordable_cases: summary.total_recordable_cases,
        total_injuries: summary.total_injuries,
        total_skin_disorders: summary.total_skin_disorders,
        total_respiratory_conditions: summary.total_respiratory_conditions,
        total_poisonings: summary.total_poisonings,
        total_hearing_losses: summary.total_hearing_losses,
        total_other_illnesses: summary.total_other_illnesses,
        total_days_away: summary.total_days_away,
        total_days_transfer: summary.total_days_transfer,
        trir: rates.trir,
        dart_rate: rates.dart_rate,
        notes: formData.notes || null,
      }

      const { error: dbError } = await supabase
        .from('osha_300a_certifications')
        .upsert(certificationData, {
          onConflict: 'company_id,calendar_year,project_id',
        })

      if (dbError) throw dbError

      setSuccess(true)
      setTimeout(() => {
        onOpenChange(false)
        onCertificationComplete?.()
      }, 1500)
    } catch (err) {
      console.error('Error saving certification:', err)
      setError(err instanceof Error ? err.message : 'Failed to save certification')
    } finally {
      setLoading(false)
    }
  }

  const rates = calculateRates()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>OSHA Form 300A Certification</DialogTitle>
          <DialogDescription>
            Certify the annual summary for {summary.year}. This form must be posted from February
            1 through April 30, {summary.year + 1}.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <Alert className="border-green-500 bg-green-50">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <AlertDescription className="text-green-800">
              OSHA 300A form certified successfully! Remember to post this form from February 1 to
              April 30, {summary.year + 1}.
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Summary Stats */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4">Annual Summary for {summary.year}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Recordable Cases:</span>
                    <p className="font-semibold">{summary.total_recordable_cases || 0}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Deaths:</span>
                    <p className="font-semibold">{summary.total_deaths || 0}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Days Away Cases:</span>
                    <p className="font-semibold">{summary.total_days_away_cases || 0}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Job Transfer Cases:</span>
                    <p className="font-semibold">{summary.total_job_transfer_cases || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Employee Hours Data */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="total_hours_worked">
                  Total Hours Worked by All Employees *
                </Label>
                <Input
                  id="total_hours_worked"
                  type="number"
                  min="0"
                  value={formData.total_hours_worked || ''}
                  onChange={(e) =>
                    handleInputChange('total_hours_worked', parseInt(e.target.value) || null)
                  }
                  placeholder="e.g., 200000"
                />
                <p className="text-xs text-muted-foreground">
                  Required for TRIR and DART rate calculations
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="average_number_employees">Average Number of Employees</Label>
                <Input
                  id="average_number_employees"
                  type="number"
                  min="0"
                  value={formData.average_number_employees || ''}
                  onChange={(e) =>
                    handleInputChange('average_number_employees', parseInt(e.target.value) || null)
                  }
                  placeholder="e.g., 100"
                />
              </div>
            </div>

            {/* Calculated Rates */}
            {formData.total_hours_worked && formData.total_hours_worked > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-4">Calculated Incident Rates</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">
                        Total Recordable Incident Rate (TRIR):
                      </span>
                      <p className="font-semibold text-lg">{rates.trir?.toFixed(2) || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">DART Rate:</span>
                      <p className="font-semibold text-lg">{rates.dart_rate?.toFixed(2) || 'N/A'}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Rates calculated as (N / Hours Worked) × 200,000
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Certifying Official Info */}
            <div className="space-y-4">
              <h3 className="font-semibold">Certifying Official Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="official_name">Name *</Label>
                  <Input
                    id="official_name"
                    value={formData.certifying_official_name}
                    onChange={(e) =>
                      handleInputChange('certifying_official_name', e.target.value)
                    }
                    placeholder="Company Executive Name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="official_title">Title *</Label>
                  <Input
                    id="official_title"
                    value={formData.certifying_official_title}
                    onChange={(e) =>
                      handleInputChange('certifying_official_title', e.target.value)
                    }
                    placeholder="e.g., President, CEO, VP of Safety"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="official_phone">Phone</Label>
                  <Input
                    id="official_phone"
                    type="tel"
                    value={formData.certifying_official_phone}
                    onChange={(e) =>
                      handleInputChange('certifying_official_phone', e.target.value)
                    }
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="official_email">Email</Label>
                  <Input
                    id="official_email"
                    type="email"
                    value={formData.certifying_official_email}
                    onChange={(e) =>
                      handleInputChange('certifying_official_email', e.target.value)
                    }
                    placeholder="executive@company.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="certification_date">Certification Date *</Label>
                <Input
                  id="certification_date"
                  type="date"
                  value={formData.certification_date}
                  onChange={(e) => handleInputChange('certification_date', e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Signature */}
            <div className="space-y-4">
              <h3 className="font-semibold">Certification Signature *</h3>
              <RadioGroup
                value={formData.signature_type}
                onValueChange={(value: 'typed' | 'drawn') =>
                  handleInputChange('signature_type', value)
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="typed" id="typed" />
                  <Label htmlFor="typed" className="flex items-center cursor-pointer">
                    <Type className="h-4 w-4 mr-2" />
                    Type Name
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="drawn" id="drawn" />
                  <Label htmlFor="drawn" className="flex items-center cursor-pointer">
                    <Pen className="h-4 w-4 mr-2" />
                    Draw Signature
                  </Label>
                </div>
              </RadioGroup>

              {formData.signature_type === 'typed' ? (
                <div className="space-y-2">
                  <Label htmlFor="typed_name">Type Your Full Name *</Label>
                  <Input
                    id="typed_name"
                    value={formData.signature_typed_name}
                    onChange={(e) =>
                      handleInputChange('signature_typed_name', e.target.value)
                    }
                    placeholder="Full Legal Name"
                    className="font-serif italic text-lg"
                    required={formData.signature_type === 'typed'}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Draw Your Signature *</Label>
                  <SignatureCanvas
                    width={600}
                    height={150}
                    onSave={handleSignatureSave}
                    signatureData={formData.signature_data}
                  />
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any additional notes about this certification..."
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Certifying...' : 'Certify Form 300A'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
