// Daily report form with offline support and auto-save
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useOfflineReportStore } from '@/features/daily-reports/store/offlineReportStore'
import { useOfflineSync } from '@/features/daily-reports/hooks/useOfflineSync'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { ConflictResolutionDialog } from './ConflictResolutionDialog'
import { TemplateSelector } from './TemplateSelector'
import { SignatureCapture } from './SignatureCapture'
import type { WorkforceEntry, EquipmentEntry } from '../store/offlineReportStore'
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
  onSubmit: _onSubmit,
  isLoading: _isLoading,
  initialData: _initialData,
}: DailyReportFormProps) {
  const store = useOfflineReportStore()
  const { syncStatus, isOnline, hasPendingSync, hasConflict, conflict, resolveConflict } = useOfflineSync()

  const [expanded, setExpanded] = useState({
    templates: false,
    weather: true,
    work: true,
    issues: false,
    workforce: false,
    equipment: false,
    deliveries: false,
    visitors: false,
    photos: false,
    signatures: false,
  })

  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // Initialize React Hook Form with Zod validation
  // Note: Form state management is handled via useOfflineReportStore,
  // but we keep useForm initialized for potential future form integration
  useForm<ValidatedFormData>({
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
        work_completed: store.draftReport?.work_completed ?? undefined,
        work_planned: store.draftReport?.work_planned ?? undefined,
      },
      weather: {
        weather_condition: store.draftReport?.weather_condition || '',
        temperature_high: store.draftReport?.temperature_high ?? undefined,
        temperature_low: store.draftReport?.temperature_low ?? undefined,
        precipitation: store.draftReport?.precipitation?.toString() ?? undefined,
        wind_conditions: store.draftReport?.wind_conditions ?? undefined,
        weather_delays: store.draftReport?.weather_delays ?? undefined,
        weather_notes: store.draftReport?.weather_notes ?? undefined,
      },
      issues: {
        safety_incidents: store.draftReport?.safety_incidents ?? undefined,
        quality_issues: store.draftReport?.quality_issues ?? undefined,
        schedule_delays: store.draftReport?.schedule_delays ?? undefined,
        general_notes: store.draftReport?.general_notes ?? undefined,
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
      const errorMessages = result.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`)
      setValidationErrors(errorMessages)
      toast.error('Please fix validation errors before submitting')
      return false
    }

    setValidationErrors([])
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!store.draftReport) {return}

    // Validate form before submission
    const isFormValid = await validateForm()
    if (!isFormValid) {
      // Expand sections with errors for visibility
      setExpanded({
        templates: false,
        weather: true,
        work: true,
        issues: true,
        workforce: true,
        equipment: true,
        deliveries: true,
        visitors: true,
        photos: true,
        signatures: false,
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
    if (syncStatus === 'success') {return 'bg-success-light border border-green-200'}
    if (syncStatus === 'syncing') {return 'bg-warning-light border border-yellow-200'}
    if (syncStatus === 'error') {return 'bg-error-light border border-red-200'}
    return 'bg-surface border border-border'
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Validation Errors Summary */}
      {validationErrors.length > 0 && (
        <Card className="border-red-200 bg-error-light">
          <CardHeader>
            <CardTitle className="text-error-dark flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Validation Errors
            </CardTitle>
            <CardDescription className="text-error">
              Please correct the following errors before submitting
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm text-error-dark">
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
              <CloudOff className="h-5 w-5 text-secondary" />
              <div>
                <p className="font-medium text-foreground">Offline Mode</p>
                <p className="text-sm text-secondary">Changes are saved locally</p>
              </div>
            </>
          ) : syncStatus === 'syncing' ? (
            <>
              <div className="animate-spin">
                <Cloud className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="font-medium text-foreground">Syncing</p>
                <p className="text-sm text-secondary">Uploading to server</p>
              </div>
            </>
          ) : syncStatus === 'success' ? (
            <>
              <Check className="h-5 w-5 text-success" />
              <div>
                <p className="font-medium text-foreground">Synced</p>
                <p className="text-sm text-secondary">All changes saved</p>
              </div>
            </>
          ) : syncStatus === 'error' ? (
            <>
              <AlertCircle className="h-5 w-5 text-error" />
              <div>
                <p className="font-medium text-foreground">Sync Error</p>
                <p className="text-sm text-secondary">Will retry when online</p>
              </div>
            </>
          ) : (
            <>
              <Cloud className="h-5 w-5 text-secondary" />
              <div>
                <p className="font-medium text-foreground">Ready to Sync</p>
                <p className="text-sm text-secondary">Connected to server</p>
              </div>
            </>
          )}
        </div>
        {hasPendingSync && (
          <span className="inline-flex items-center gap-1 bg-card px-3 py-1 rounded-full text-sm font-medium text-secondary border border-border">
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
              <label className="block text-sm font-medium text-secondary mb-2">Report Date</label>
              <Input type="date" value={reportDate} disabled className="bg-surface" />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">Report Number (Optional)</label>
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
          {/* Template Selector */}
          <TemplateSelector
            projectId={projectId}
            userId={store.draftReport.id}
            currentDraft={store.draftReport}
            currentWorkforce={store.workforce}
            currentEquipment={store.equipment}
            onApplyTemplate={(draftUpdates, workforce, equipment) => {
              // Apply draft updates
              store.updateDraft(draftUpdates)
              // Replace workforce entries
              store.workforce.forEach(w => store.removeWorkforceEntry(w.id))
              workforce.forEach(w => store.addWorkforceEntry(w as WorkforceEntry))
              // Replace equipment entries
              store.equipment.forEach(e => store.removeEquipmentEntry(e.id))
              equipment.forEach(e => store.addEquipmentEntry(e as EquipmentEntry))
            }}
            expanded={expanded.templates}
            onToggle={() => setExpanded({ ...expanded, templates: !expanded.templates })}
          />

          <WeatherSection
            expanded={expanded.weather}
            onToggle={() => setExpanded({ ...expanded, weather: !expanded.weather })}
            draft={store.draftReport}
            onUpdate={store.updateDraft}
            reportDate={reportDate}
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
            onUpdate={store.updateDeliveryEntry}
            onRemove={store.removeDeliveryEntry}
          />

          <VisitorsSection
            expanded={expanded.visitors}
            onToggle={() => setExpanded({ ...expanded, visitors: !expanded.visitors })}
            entries={store.visitors}
            onAdd={store.addVisitorEntry}
            onUpdate={store.updateVisitorEntry}
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

          {/* Signature Section - Only shown when submitting */}
          {expanded.signatures && (
            <Card>
              <CardHeader>
                <CardTitle>Signatures</CardTitle>
                <CardDescription>Sign to submit the report</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <SignatureCapture
                  label="Submitted By Signature"
                  existingSignature={store.draftReport.submitted_by_signature}
                  onSave={(signature) => store.updateDraft({ submitted_by_signature: signature })}
                  onClear={() => store.updateDraft({ submitted_by_signature: undefined })}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}

      <div className="flex gap-3 sticky bottom-0 bg-card p-6 border-t">
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

      {/* Conflict Resolution Dialog */}
      {hasConflict && conflict && (
        <ConflictResolutionDialog
          conflict={conflict}
          onResolve={(strategy) => {
            resolveConflict(strategy)
            toast.success(
              strategy === 'keep_local'
                ? 'Keeping your local changes'
                : strategy === 'keep_server'
                  ? 'Using server version'
                  : 'Changes merged successfully'
            )
          }}
        />
      )}
    </form>
  )
}
