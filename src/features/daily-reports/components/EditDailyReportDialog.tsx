// File: /src/features/daily-reports/components/EditDailyReportDialog.tsx
// Dialog for editing an existing daily report

import { useEffect, useState } from 'react'
import { useUpdateDailyReportWithNotification } from '../hooks/useDailyReportsMutations'
import { useFormValidation, dailyReportUpdateSchema } from '@/lib/validation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { InputWithError, TextareaWithError } from '@/components/form/ValidationError'
import type { DailyReport } from '@/types/database'
import { logger } from '../../../lib/utils/logger';


interface EditDailyReportDialogProps {
  report: DailyReport
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditDailyReportDialog({
  report,
  open,
  onOpenChange,
}: EditDailyReportDialogProps) {
  const [formData, setFormData] = useState({
    project_id: '',
    report_date: '',
    weather_condition: '',
    temperature_high: '',
    temperature_low: '',
    total_workers: '',
    weather_delays: false,
    other_delays: '',
    notes: '',
  })

  const updateReport = useUpdateDailyReportWithNotification()
  const { validate, getFieldError, clearErrors } = useFormValidation(dailyReportUpdateSchema)

  // Initialize form with report data
  useEffect(() => {
    if (open && report) {
      // Batch state updates together
      const newFormData = {
        project_id: report.project_id || '',
        report_date: report.report_date || '',
        weather_condition: report.weather_condition || '',
        temperature_high: report.temperature_high?.toString() || '',
        temperature_low: report.temperature_low?.toString() || '',
        total_workers: report.total_workers?.toString() || '',
        weather_delays: report.weather_delays || false,
        other_delays: (report.weather_delay_notes || ''),
        notes: report.comments || '',
      }

      // Use a timeout to defer the state update to avoid synchronous setState in effect
      const timeoutId = setTimeout(() => {
        setFormData(newFormData)
        clearErrors()
      }, 0)

      return () => clearTimeout(timeoutId)
    }
  }, [open, report, clearErrors])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as any
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const submitData = {
      project_id: formData.project_id,
      report_date: formData.report_date,
      weather_condition: formData.weather_condition || null,
      temperature_high: formData.temperature_high ? Number(formData.temperature_high) : null,
      temperature_low: formData.temperature_low ? Number(formData.temperature_low) : null,
      total_workers: formData.total_workers ? Number(formData.total_workers) : null,
      weather_delays: formData.weather_delays,
      weather_delay_notes: formData.other_delays || null,
      comments: formData.notes || null,
    }

    // Step 1: Validate client-side
    const validation = validate(submitData)
    if (!validation.success) {
      return // Errors automatically shown in InputWithError components
    }

    // Step 2: Call API (with notifications handled by mutation hook)
    try {
      await updateReport.mutateAsync({
        id: report.id,
        data: validation.data as Partial<Omit<DailyReport, 'id' | 'created_at' | 'updated_at'>>,
      })

      // Step 3: Success! Toast shown automatically by mutation hook
      onOpenChange(false)
    } catch (_error) {
      // Error toast shown automatically by mutation hook
      logger.error('Failed to update daily report:', error)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !updateReport.isPending) {
      clearErrors()
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Daily Report</DialogTitle>
            <DialogDescription>
              Update report information
            </DialogDescription>
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
                disabled={updateReport.isPending}
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
                  disabled={updateReport.isPending}
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
                    disabled={updateReport.isPending}
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
                    disabled={updateReport.isPending}
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
                    disabled={updateReport.isPending}
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
                  disabled={updateReport.isPending}
                />
              </div>
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
                  disabled={updateReport.isPending}
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
                  disabled={updateReport.isPending}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={updateReport.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateReport.isPending}>
              {updateReport.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
