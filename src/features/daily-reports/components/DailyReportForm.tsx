// Daily report form with offline support and auto-save
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useOfflineReportStore } from '@/features/daily-reports/store/offlineReportStore'
import { useOfflineSync } from '@/features/daily-reports/hooks/useOfflineSync'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormError } from '@/components/ui/form-error'
import {
  Cloud,
  CloudOff,
  Check,
  AlertCircle,
  Save,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import { WeatherSection } from './WeatherSection'
import { WorkSection } from './WorkSection'
import { IssuesSection } from './IssuesSection'
import { WorkforceSection } from './WorkforceSection'
import { EquipmentSection } from './EquipmentSection'
import { DeliveriesSection } from './DeliveriesSection'
import { VisitorsSection } from './VisitorsSection'
import { PhotosSection } from './PhotosSection'
import { dailyReportSchema, type DailyReportFormData as ValidatedFormData } from '../validation/dailyReportSchema'
import toast from 'react-hot-toast'

export interface DailyReportFormData {
  report_date: string
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'in_review'
  weather_condition?: string
  temperature_high?: number
  temperature_low?: number
  total_workers?: number
  weather_delays?: boolean
  other_delays?: string
  notes?: string
}

interface DailyReportFormProps {
  projectId: string
  reportDate?: string
  onSave?: () => void
  onCancel?: () => void
  onSubmit?: (formData: DailyReportFormData) => Promise<void>
  isLoading?: boolean
  initialData?: any
}

export function DailyReportForm({
  projectId,
  reportDate,
  onSave,
  onCancel,
  onSubmit,
  isLoading,
  initialData,
}: DailyReportFormProps) {
  const store = useOfflineReportStore()
  const { syncStatus, isOnline, hasPendingSync } = useOfflineSync()

  const [expanded, setExpanded] = useState({
    weather: true,
    work: true,
    issues: false,
    workforce: false,
    equipment: false,
    deliveries: false,
    visitors: false,
    photos: false,
  })

  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // Initialize React Hook Form with Zod validation
  const {
    formState: { errors, isValid },
    trigger,
  } = useForm<ValidatedFormData>({
    resolver: zodResolver(dailyReportSchema),
    mode: 'onBlur',
  })

  useEffect(() => {
    if (!store.draftReport) {
      store.initializeDraft(projectId, reportDate ?? new Date().toISOString().split('T')[0])
    }
  }, [projectId, reportDate, store])

  const validateForm = async (): Promise<boolean> => {
    // Construct form data from store
    const formData: ValidatedFormData = {
      project_id: projectId,
      report_date: reportDate ?? new Date().toISOString().split('T')[0],
      work: {
        work_performed: store.draftReport?.work_performed || '',
        work_completed: store.draftReport?.work_completed,
        work_planned: store.draftReport?.work_planned,
      },
      weather: {
        weather_conditions: store.draftReport?.weather_conditions || '',
        temperature_high: store.draftReport?.temperature_high,
        temperature_low: store.draftReport?.temperature_low,
        precipitation: store.draftReport?.precipitation,
        wind_conditions: store.draftReport?.wind_conditions,
        weather_delays: store.draftReport?.weather_delays,
        weather_notes: store.draftReport?.weather_notes,
      },
      issues: {
        safety_incidents: store.draftReport?.safety_incidents,
        quality_issues: store.draftReport?.quality_issues,
        schedule_delays: store.draftReport?.schedule_delays,
        general_notes: store.draftReport?.general_notes,
      },
      workforce: store.workforce,
      equipment: store.equipment,
      deliveries: store.deliveries,
      visitors: store.visitors,
      photos: store.photos.map((p) => ({
        id: p.id,
        caption: p.caption,
        uploadStatus: p.uploadStatus,
      })),
    }

    const result = dailyReportSchema.safeParse(formData)

    if (!result.success) {
      const errorMessages = result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`)
      setValidationErrors(errorMessages)
      toast.error('Please fix validation errors before submitting')
      return false
    }

    setValidationErrors([])
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!store.draftReport) return

    // Validate form before submission
    const isFormValid = await validateForm()
    if (!isFormValid) {
      // Expand sections with errors for visibility
      setExpanded({
        weather: true,
        work: true,
        issues: true,
        workforce: true,
        equipment: true,
        deliveries: true,
        visitors: true,
        photos: true,
      })
      return
    }

    store.addToSyncQueue({
      id: 'sync-' + Date.now(),
      reportId: store.draftReport.id,
      action: store.draftReport.id.includes('temp') ? 'create' : 'update',
    })

    store.updateDraft({ status: 'submitted' })
    toast.success('Daily report submitted successfully')
    onSave?.()
  }

  const handleSaveDraft = () => {
    store.setSyncStatus('success')
    setTimeout(() => store.setSyncStatus('idle'), 1500)
  }

  const getBgClass = () => {
    if (!isOnline) {return 'bg-blue-50 border border-blue-200'}
    if (syncStatus === 'success') {return 'bg-green-50 border border-green-200'}
    if (syncStatus === 'syncing') {return 'bg-yellow-50 border border-yellow-200'}
    if (syncStatus === 'error') {return 'bg-red-50 border border-red-200'}
    return 'bg-gray-50 border border-gray-200'
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Validation Errors Summary */}
      {validationErrors.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Validation Errors
            </CardTitle>
            <CardDescription className="text-red-600">
              Please correct the following errors before submitting
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className={clsx('rounded-lg p-4 flex items-center justify-between', getBgClass())}>
        <div className="flex items-center gap-2">
          {!isOnline ? (
            <>
              <CloudOff className="h-5 w-5 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">Offline Mode</p>
                <p className="text-sm text-gray-600">Changes are saved locally</p>
              </div>
            </>
          ) : syncStatus === 'syncing' ? (
            <>
              <div className="animate-spin">
                <Cloud className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Syncing</p>
                <p className="text-sm text-gray-600">Uploading to server</p>
              </div>
            </>
          ) : syncStatus === 'success' ? (
            <>
              <Check className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-gray-900">Synced</p>
                <p className="text-sm text-gray-600">All changes saved</p>
              </div>
            </>
          ) : syncStatus === 'error' ? (
            <>
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-gray-900">Sync Error</p>
                <p className="text-sm text-gray-600">Will retry when online</p>
              </div>
            </>
          ) : (
            <>
              <Cloud className="h-5 w-5 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">Ready to Sync</p>
                <p className="text-sm text-gray-600">Connected to server</p>
              </div>
            </>
          )}
        </div>
        {hasPendingSync && (
          <span className="inline-flex items-center gap-1 bg-white px-3 py-1 rounded-full text-sm font-medium text-gray-700 border border-gray-200">
            {store.syncQueue.length} pending
          </span>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Information</CardTitle>
          <CardDescription>Date and basic report details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Report Date</label>
              <Input type="date" value={reportDate} disabled className="bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Report Number (Optional)</label>
              <Input
                type="text"
                placeholder="e.g., DR-2025-001"
                value={store.draftReport?.report_number || ''}
                onChange={(e) => store.updateDraft({ report_number: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {store.draftReport && (
        <>
          <WeatherSection
            expanded={expanded.weather}
            onToggle={() => setExpanded({ ...expanded, weather: !expanded.weather })}
            draft={store.draftReport}
            onUpdate={store.updateDraft}
          />

          <WorkSection
            expanded={expanded.work}
            onToggle={() => setExpanded({ ...expanded, work: !expanded.work })}
            draft={store.draftReport}
            onUpdate={store.updateDraft}
          />

          <IssuesSection
            expanded={expanded.issues}
            onToggle={() => setExpanded({ ...expanded, issues: !expanded.issues })}
            draft={store.draftReport}
            onUpdate={store.updateDraft}
          />

          <WorkforceSection
            expanded={expanded.workforce}
            onToggle={() => setExpanded({ ...expanded, workforce: !expanded.workforce })}
            entries={store.workforce}
            onAdd={store.addWorkforceEntry}
            onUpdate={store.updateWorkforceEntry}
            onRemove={store.removeWorkforceEntry}
          />

          <EquipmentSection
            expanded={expanded.equipment}
            onToggle={() => setExpanded({ ...expanded, equipment: !expanded.equipment })}
            entries={store.equipment}
            onAdd={store.addEquipmentEntry}
            onRemove={store.removeEquipmentEntry}
          />

          <DeliveriesSection
            expanded={expanded.deliveries}
            onToggle={() => setExpanded({ ...expanded, deliveries: !expanded.deliveries })}
            entries={store.deliveries}
            onAdd={store.addDeliveryEntry}
            onRemove={store.removeDeliveryEntry}
          />

          <VisitorsSection
            expanded={expanded.visitors}
            onToggle={() => setExpanded({ ...expanded, visitors: !expanded.visitors })}
            entries={store.visitors}
            onAdd={store.addVisitorEntry}
            onRemove={store.removeVisitorEntry}
          />

          <PhotosSection
            expanded={expanded.photos}
            onToggle={() => setExpanded({ ...expanded, photos: !expanded.photos })}
            photos={store.photos}
            onAddPhotos={(photos) => photos.forEach(store.addPhoto)}
            onRemovePhoto={store.removePhoto}
            onUpdateCaption={store.updatePhotoCaption}
          />
        </>
      )}

      <div className="flex gap-3 sticky bottom-0 bg-white p-6 border-t">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 h-12">
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button type="button" onClick={handleSaveDraft} variant="outline" className="flex-1 h-12">
          <Save className="h-4 w-4 mr-2" />
          Save Draft
        </Button>
        <Button type="submit" className="flex-1 h-12">
          <Check className="h-4 w-4 mr-2" />
          Submit Report
        </Button>
      </div>
    </form>
  )
}
