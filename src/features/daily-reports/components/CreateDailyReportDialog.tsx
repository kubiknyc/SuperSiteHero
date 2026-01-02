// File: /src/features/daily-reports/components/CreateDailyReportDialog.tsx
// Dialog for creating a new daily report with copy from previous feature

import { useEffect, useState, useCallback } from 'react'
import { useCreateDailyReportWithNotification } from '../hooks/useDailyReportsMutations'
import { usePreviousDayReport, extractCopyableFields } from '../hooks/useDailyReports'
import { useFormValidation, dailyReportCreateSchema } from '@/lib/validation'
import { useAuth } from '@/lib/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { InputWithError, TextareaWithError } from '@/components/form/ValidationError'
import { CompactPhotoCapture, type CapturedPhoto } from '@/components/ui/photo-capture'
import { Copy, Calendar, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { logger } from '../../../lib/utils/logger';


interface CreateDailyReportDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateDailyReportDialog({
  projectId,
  open,
  onOpenChange,
  onSuccess,
}: CreateDailyReportDialogProps) {
  const [formData, setFormData] = useState({
    project_id: projectId,
    report_date: '',
    weather_condition: '',
    temperature_high: '',
    temperature_low: '',
    total_workers: '',
    weather_delays: false,
    other_delays: '',
    notes: '',
    status: 'draft' as const,
  })
  const [copiedFromPrevious, setCopiedFromPrevious] = useState(false)
  const [photos, setPhotos] = useState<CapturedPhoto[]>([])

  const { userProfile } = useAuth()
  const createReport = useCreateDailyReportWithNotification()
  const { validate, getFieldError, clearErrors } = useFormValidation(dailyReportCreateSchema)

  // Fetch previous day's report for copy feature
  const today = new Date().toISOString().split('T')[0]
  const { data: previousReport, isLoading: previousLoading } = usePreviousDayReport(projectId, today)

  // Copy from previous report handler
  const handleCopyFromPrevious = useCallback(() => {
    if (!previousReport) return

    const copyableFields = extractCopyableFields(previousReport)
    setFormData((prev) => ({
      ...prev,
      weather_condition: copyableFields.weather_condition as string || '',
      temperature_high: copyableFields.temperature_high?.toString() || '',
      temperature_low: copyableFields.temperature_low?.toString() || '',
      total_workers: copyableFields.total_workers?.toString() || '',
      weather_delays: copyableFields.weather_delays as boolean || false,
      other_delays: copyableFields.other_delays as string || '',
      notes: '', // Don't copy notes - each day should have fresh notes
    }))
    setCopiedFromPrevious(true)
  }, [previousReport])

  // Initialize form and set today's date
  useEffect(() => {
    if (open) {
      const todayDate = new Date().toISOString().split('T')[0]
      setTimeout(() => {
        setFormData((prev) => ({
          ...prev,
          project_id: projectId,
          report_date: todayDate,
        }))
        clearErrors()
        setCopiedFromPrevious(false)
        setPhotos([])
      }, 0)
    }
  }, [open, projectId, clearErrors])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as any
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!userProfile?.id) {
      logger.error('User not authenticated')
      return
    }

    const submitData = {
      ...formData,
      temperature_high: formData.temperature_high ? Number(formData.temperature_high) : null,
      temperature_low: formData.temperature_low ? Number(formData.temperature_low) : null,
      total_workers: formData.total_workers ? Number(formData.total_workers) : null,
      reporter_id: userProfile.id,
    }

    // Step 1: Validate client-side
    const validation = validate(submitData)
    if (!validation.success) {
      return // Errors automatically shown in InputWithError components
    }

    // Step 2: Call API (with notifications handled by mutation hook)
    try {
      await createReport.mutateAsync(validation.data as any)

      // Step 3: Success! Toast shown automatically by mutation hook
      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      // Error toast shown automatically by mutation hook
      logger.error('Failed to create daily report:', error)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !createReport.isPending) {
      clearErrors()
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Daily Report</DialogTitle>
            <DialogDescription>
              Document today's activities, weather, and workforce
            </DialogDescription>

            {/* Copy from Previous Report */}
            {previousReport && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Previous report: {format(new Date(previousReport.report_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyFromPrevious}
                    disabled={createReport.isPending || previousLoading || copiedFromPrevious}
                    className="gap-2"
                  >
                    {previousLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : copiedFromPrevious ? (
                      <>
                        <Copy className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy from Previous
                      </>
                    )}
                  </Button>
                </div>
                {copiedFromPrevious && (
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      Weather, temperatures, and worker count copied
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="report_date">
                Report Date <span className="text-error">*</span>
              </Label>
              <InputWithError
                id="report_date"
                name="report_date"
                type="date"
                value={formData.report_date}
                onChange={handleChange}
                error={getFieldError('report_date')}
                disabled={createReport.isPending}
              />
            </div>

            {/* Weather Section */}
            <div className="border-t pt-4">
              <h3 className="font-semibold text-foreground mb-4 heading-subsection">Weather Conditions</h3>

              <div className="space-y-2">
                <Label htmlFor="weather_condition">Weather Condition</Label>
                <InputWithError
                  id="weather_condition"
                  name="weather_condition"
                  value={formData.weather_condition}
                  onChange={handleChange}
                  placeholder="Sunny, Cloudy, Rainy, etc."
                  error={getFieldError('weather_condition')}
                  disabled={createReport.isPending}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="temperature_high">High Temperature (°F)</Label>
                  <InputWithError
                    id="temperature_high"
                    name="temperature_high"
                    type="number"
                    value={formData.temperature_high}
                    onChange={handleChange}
                    placeholder="85"
                    error={getFieldError('temperature_high')}
                    disabled={createReport.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="temperature_low">Low Temperature (°F)</Label>
                  <InputWithError
                    id="temperature_low"
                    name="temperature_low"
                    type="number"
                    value={formData.temperature_low}
                    onChange={handleChange}
                    placeholder="65"
                    error={getFieldError('temperature_low')}
                    disabled={createReport.isPending}
                  />
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <Label>
                  <input
                    type="checkbox"
                    name="weather_delays"
                    checked={formData.weather_delays}
                    onChange={handleChange}
                    disabled={createReport.isPending}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium">Weather caused delays</span>
                </Label>
              </div>
            </div>

            {/* Workforce Section */}
            <div className="border-t pt-4">
              <h3 className="font-semibold text-foreground mb-4 heading-subsection">Workforce</h3>

              <div className="space-y-2">
                <Label htmlFor="total_workers">Total Workers on Site</Label>
                <InputWithError
                  id="total_workers"
                  name="total_workers"
                  type="number"
                  value={formData.total_workers}
                  onChange={handleChange}
                  placeholder="0"
                  error={getFieldError('total_workers')}
                  disabled={createReport.isPending}
                />
              </div>
            </div>

            {/* Site Photos Section */}
            <div className="border-t pt-4">
              <h3 className="font-semibold text-foreground mb-4 heading-subsection">Site Photos</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Capture photos of site conditions, progress, or issues
              </p>
              <CompactPhotoCapture
                photos={photos}
                onPhotosChange={setPhotos}
                maxPhotos={10}
                disabled={createReport.isPending}
                label="Site Photos"
              />
            </div>

            {/* Delays and Notes Section */}
            <div className="border-t pt-4">
              <h3 className="font-semibold text-foreground mb-4 heading-subsection">Additional Information</h3>

              <div className="space-y-2">
                <Label htmlFor="other_delays">Other Delays or Issues</Label>
                <TextareaWithError
                  id="other_delays"
                  name="other_delays"
                  value={formData.other_delays}
                  onChange={handleChange}
                  placeholder="Describe any other delays or issues encountered..."
                  rows={3}
                  error={getFieldError('other_delays')}
                  disabled={createReport.isPending}
                />
              </div>

              <div className="space-y-2 mt-4">
                <Label htmlFor="notes">General Notes</Label>
                <TextareaWithError
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Additional notes or observations..."
                  rows={3}
                  error={getFieldError('notes')}
                  disabled={createReport.isPending}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createReport.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createReport.isPending}>
              {createReport.isPending ? 'Creating...' : 'Create Report'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
