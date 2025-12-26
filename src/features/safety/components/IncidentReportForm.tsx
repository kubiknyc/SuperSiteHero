/**
 * Incident Report Form Component
 *
 * OSHA-compliant incident report form with severity classification,
 * root cause analysis, and photo documentation.
 */

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/utils/logger'
import { supabase } from '@/lib/supabase'
import type {
  CreateIncidentDTO,
  UpdateIncidentDTO,
  SafetyIncident,
  IncidentSeverity,
  IncidentType,
  RootCauseCategory,
  OSHAInjuryIllnessType,
} from '@/types/safety-incidents'
import {
  SEVERITY_CONFIG,
  INCIDENT_TYPE_CONFIG,
  ROOT_CAUSE_LABELS,
  OSHA_INJURY_ILLNESS_TYPES,
  isSeriousIncident,
} from '@/types/safety-incidents'
import { AlertTriangle, Info, Shield } from 'lucide-react'

interface IncidentReportFormProps {
  projectId?: string
  companyId?: string
  incident?: SafetyIncident
  onSubmit?: (data: CreateIncidentDTO | UpdateIncidentDTO) => void
  onSuccess?: ((incidentId: string) => void) | (() => void)
  onCancel?: () => void
  isSubmitting?: boolean
}

type FormData = {
  incident_date: string
  incident_time: string
  location: string
  weather_conditions: string
  description: string
  severity: IncidentSeverity
  incident_type: IncidentType
  immediate_actions: string
  root_cause_category: RootCauseCategory | ''
  root_cause: string
  preventive_measures: string
  osha_recordable: boolean
  osha_report_number: string
  days_away_from_work: number
  days_restricted_duty: number
  // OSHA 300 Log fields
  case_number: string
  employee_name: string
  employee_job_title: string
  injury_illness_type: OSHAInjuryIllnessType | ''
  body_part_affected: string
  object_substance: string
  death_date: string
  days_away_count: number
  days_transfer_restriction: number
  is_privacy_case: boolean
}

export function IncidentReportForm({
  projectId,
  companyId,
  incident,
  onSubmit,
  onSuccess,
  onCancel,
  isSubmitting = false,
}: IncidentReportFormProps) {
  const isEditing = !!incident

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      incident_date: incident?.incident_date || new Date().toISOString().split('T')[0],
      incident_time: incident?.incident_time || '',
      location: incident?.location || '',
      weather_conditions: incident?.weather_conditions || '',
      description: incident?.description || '',
      severity: incident?.severity || 'near_miss',
      incident_type: incident?.incident_type || 'near_miss',
      immediate_actions: incident?.immediate_actions || '',
      root_cause_category: incident?.root_cause_category || '',
      root_cause: incident?.root_cause || '',
      preventive_measures: incident?.preventive_measures || '',
      osha_recordable: incident?.osha_recordable || false,
      osha_report_number: incident?.osha_report_number || '',
      days_away_from_work: incident?.days_away_from_work || 0,
      days_restricted_duty: incident?.days_restricted_duty || 0,
      // OSHA 300 Log fields
      case_number: incident?.case_number || '',
      employee_name: incident?.employee_name || '',
      employee_job_title: incident?.employee_job_title || '',
      injury_illness_type: incident?.injury_illness_type || '',
      body_part_affected: incident?.body_part_affected || '',
      object_substance: incident?.object_substance || '',
      death_date: incident?.death_date || '',
      days_away_count: incident?.days_away_count || 0,
      days_transfer_restriction: incident?.days_transfer_restriction || 0,
      is_privacy_case: incident?.is_privacy_case || false,
    },
  })

  const selectedSeverity = watch('severity')
  const oshaRecordable = watch('osha_recordable')
  const isSerious = isSeriousIncident(selectedSeverity)
  const incidentDate = watch('incident_date')
  const currentCaseNumber = watch('case_number')

  // State for next available case number
  const [nextCaseNumber, setNextCaseNumber] = useState<string>('')
  const [fetchingCaseNumber, setFetchingCaseNumber] = useState(false)

  // Auto-fetch next case number when OSHA recordable is set to true
  useEffect(() => {
    const fetchNextCaseNumber = async () => {
      // Only fetch if:
      // 1. OSHA recordable is true
      // 2. Not editing an existing incident (or editing one without a case number)
      // 3. Current case number is empty
      // 4. We have a project ID
      if (!oshaRecordable || !projectId || (isEditing && currentCaseNumber)) {
        return
      }

      if (currentCaseNumber) {
        return // User has already entered a case number
      }

      setFetchingCaseNumber(true)
      try {
        const year = incidentDate ? new Date(incidentDate).getFullYear() : new Date().getFullYear()

        const { data, error } = await supabase.rpc('get_next_osha_case_number', {
          p_project_id: projectId,
          p_year: year,
        })

        if (error) {
          logger.error('Error fetching next case number:', error)
          return
        }

        if (data) {
          setNextCaseNumber(data)
          // Auto-fill the case number
          setValue('case_number', data)
        }
      } catch (err) {
        logger.error('Error fetching next case number:', err)
      } finally {
        setFetchingCaseNumber(false)
      }
    }

    fetchNextCaseNumber()
  }, [oshaRecordable, projectId, incidentDate, currentCaseNumber, isEditing, setValue])

  const handleFormSubmit = (data: FormData) => {
    if (isEditing) {
      const updateData: UpdateIncidentDTO = {
        incident_date: data.incident_date,
        incident_time: data.incident_time || null,
        location: data.location || null,
        weather_conditions: data.weather_conditions || null,
        description: data.description,
        severity: data.severity,
        incident_type: data.incident_type,
        immediate_actions: data.immediate_actions || null,
        root_cause_category: data.root_cause_category || null,
        root_cause: data.root_cause || null,
        preventive_measures: data.preventive_measures || null,
        osha_recordable: data.osha_recordable,
        osha_report_number: data.osha_report_number || null,
        days_away_from_work: data.days_away_from_work,
        days_restricted_duty: data.days_restricted_duty,
        // OSHA 300 Log fields
        case_number: data.case_number || null,
        employee_name: data.employee_name || null,
        employee_job_title: data.employee_job_title || null,
        injury_illness_type: data.injury_illness_type || null,
        body_part_affected: data.body_part_affected || null,
        object_substance: data.object_substance || null,
        death_date: data.death_date || null,
        days_away_count: data.days_away_count,
        days_transfer_restriction: data.days_transfer_restriction,
      }
      onSubmit?.(updateData)
      if (onSuccess) {(onSuccess as () => void)()}
    } else {
      if (!projectId || !companyId) {
        logger.error('projectId and companyId are required for creating incidents')
        return
      }
      const createData: CreateIncidentDTO = {
        project_id: projectId,
        company_id: companyId,
        incident_date: data.incident_date,
        incident_time: data.incident_time || null,
        location: data.location || null,
        weather_conditions: data.weather_conditions || null,
        description: data.description,
        severity: data.severity,
        incident_type: data.incident_type,
        immediate_actions: data.immediate_actions || null,
        osha_recordable: data.osha_recordable,
      }
      onSubmit?.(createData)
      if (onSuccess) {(onSuccess as () => void)()}
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Severity Warning */}
      {isSerious && (
        <div className="bg-error-light border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-error mt-0.5" />
          <div>
            <h4 className="font-medium text-red-800 heading-card">Serious Incident</h4>
            <p className="text-sm text-error-dark mt-1">
              This severity level ({SEVERITY_CONFIG[selectedSeverity].label}) requires
              immediate notification to project managers and may require OSHA reporting.
            </p>
          </div>
        </div>
      )}

      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="incident_date">Date of Incident *</Label>
          <Input
            id="incident_date"
            type="date"
            {...register('incident_date', { required: 'Date is required' })}
            className={cn(errors.incident_date && 'border-red-500')}
          />
          {errors.incident_date && (
            <p className="text-sm text-error mt-1">{errors.incident_date.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="incident_time">Time of Incident</Label>
          <Input
            id="incident_time"
            type="time"
            {...register('incident_time')}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="location">Location on Site</Label>
          <Input
            id="location"
            placeholder="e.g., Building A, Floor 3"
            {...register('location')}
          />
        </div>

        <div>
          <Label htmlFor="weather_conditions">Weather Conditions</Label>
          <Input
            id="weather_conditions"
            placeholder="e.g., Rainy, 45°F"
            {...register('weather_conditions')}
          />
        </div>
      </div>

      {/* Classification */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="severity">Severity Level *</Label>
          <Select
            value={selectedSeverity}
            onValueChange={(value) => setValue('severity', value as IncidentSeverity)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select severity" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SEVERITY_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full',
                        config.color === 'green' && 'bg-green-500',
                        config.color === 'yellow' && 'bg-warning',
                        config.color === 'orange' && 'bg-orange-500',
                        config.color === 'red' && 'bg-red-500',
                        config.color === 'purple' && 'bg-purple-500'
                      )}
                    />
                    {config.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted mt-1">
            {SEVERITY_CONFIG[selectedSeverity].description}
          </p>
        </div>

        <div>
          <Label htmlFor="incident_type">Incident Type *</Label>
          <Select
            value={watch('incident_type')}
            onValueChange={(value) => setValue('incident_type', value as IncidentType)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(INCIDENT_TYPE_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">Description of Incident *</Label>
        <Textarea
          id="description"
          rows={4}
          placeholder="Describe what happened, who was involved, and the circumstances..."
          {...register('description', {
            required: 'Description is required',
            minLength: { value: 20, message: 'Please provide more detail (at least 20 characters)' },
          })}
          className={cn(errors.description && 'border-red-500')}
        />
        {errors.description && (
          <p className="text-sm text-error mt-1">{errors.description.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="immediate_actions">Immediate Actions Taken</Label>
        <Textarea
          id="immediate_actions"
          rows={3}
          placeholder="What was done immediately after the incident..."
          {...register('immediate_actions')}
        />
      </div>

      {/* Root Cause Analysis (for editing/investigation) */}
      {isEditing && (
        <>
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-foreground mb-4 heading-subsection">
              Root Cause Analysis
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="root_cause_category">Root Cause Category</Label>
                <Select
                  value={watch('root_cause_category') || ''}
                  onValueChange={(value) =>
                    setValue('root_cause_category', value as RootCauseCategory)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROOT_CAUSE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4">
              <Label htmlFor="root_cause">Root Cause Description</Label>
              <Textarea
                id="root_cause"
                rows={3}
                placeholder="Detailed analysis of the root cause..."
                {...register('root_cause')}
              />
            </div>

            <div className="mt-4">
              <Label htmlFor="preventive_measures">Preventive Measures</Label>
              <Textarea
                id="preventive_measures"
                rows={3}
                placeholder="What measures will be taken to prevent recurrence..."
                {...register('preventive_measures')}
              />
            </div>
          </div>
        </>
      )}

      {/* OSHA Information */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2 heading-subsection">
          <Shield className="h-5 w-5 text-primary" />
          OSHA Tracking
          <span className="text-sm font-normal text-muted">(if applicable)</span>
        </h3>

        <div className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            id="osha_recordable"
            {...register('osha_recordable')}
            className="h-4 w-4 rounded border-input"
          />
          <Label htmlFor="osha_recordable" className="font-normal">
            This incident is OSHA recordable
          </Label>
        </div>

        {oshaRecordable && (
          <div className="space-y-4 bg-surface p-4 rounded-lg">
            {/* Basic OSHA fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="case_number">
                  OSHA 300 Case Number
                  {fetchingCaseNumber && <span className="ml-2 text-xs text-primary">(Fetching...)</span>}
                </Label>
                <Input
                  id="case_number"
                  placeholder="e.g., 2024-001"
                  {...register('case_number')}
                  disabled={fetchingCaseNumber}
                />
                {nextCaseNumber && !currentCaseNumber && (
                  <p className="text-xs text-success mt-1">
                    ✓ Auto-assigned: {nextCaseNumber}
                  </p>
                )}
                {!nextCaseNumber && !currentCaseNumber && !fetchingCaseNumber && (
                  <p className="text-xs text-muted mt-1">
                    Format: YYYY-###. Will auto-assign next available number.
                  </p>
                )}
                {currentCaseNumber && currentCaseNumber !== nextCaseNumber && (
                  <p className="text-xs text-primary mt-1">
                    Manual override: {currentCaseNumber}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="osha_report_number">OSHA Report Number</Label>
                <Input
                  id="osha_report_number"
                  placeholder="e.g., 300-123"
                  {...register('osha_report_number')}
                />
              </div>

              <div>
                <Label htmlFor="injury_illness_type">Injury/Illness Type</Label>
                <Select
                  value={watch('injury_illness_type') || ''}
                  onValueChange={(value) => setValue('injury_illness_type', value as OSHAInjuryIllnessType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {OSHA_INJURY_ILLNESS_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        ({type.column}) {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Employee Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="employee_name">Injured Employee Name</Label>
                <Input
                  id="employee_name"
                  placeholder="Full name of injured employee"
                  {...register('employee_name')}
                />
              </div>

              <div>
                <Label htmlFor="employee_job_title">Employee Job Title</Label>
                <Input
                  id="employee_job_title"
                  placeholder="e.g., Electrician, Laborer"
                  {...register('employee_job_title')}
                />
              </div>
            </div>

            {/* Injury Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="body_part_affected">Body Part Affected</Label>
                <Input
                  id="body_part_affected"
                  placeholder="e.g., Left hand, Lower back"
                  {...register('body_part_affected')}
                />
              </div>

              <div>
                <Label htmlFor="object_substance">Object/Substance Causing Injury</Label>
                <Input
                  id="object_substance"
                  placeholder="e.g., Ladder, Chemical exposure"
                  {...register('object_substance')}
                />
              </div>
            </div>

            {/* Days tracking */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="days_away_from_work">Days Away from Work</Label>
                <Input
                  id="days_away_from_work"
                  type="number"
                  min="0"
                  {...register('days_away_from_work', { valueAsNumber: true })}
                />
              </div>

              <div>
                <Label htmlFor="days_restricted_duty">Days on Restricted Duty</Label>
                <Input
                  id="days_restricted_duty"
                  type="number"
                  min="0"
                  {...register('days_restricted_duty', { valueAsNumber: true })}
                />
              </div>

              <div>
                <Label htmlFor="days_away_count">Total Days Away (OSHA)</Label>
                <Input
                  id="days_away_count"
                  type="number"
                  min="0"
                  {...register('days_away_count', { valueAsNumber: true })}
                />
              </div>

              <div>
                <Label htmlFor="days_transfer_restriction">Days Transfer/Restriction</Label>
                <Input
                  id="days_transfer_restriction"
                  type="number"
                  min="0"
                  {...register('days_transfer_restriction', { valueAsNumber: true })}
                />
              </div>
            </div>

            {/* Death date and privacy */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="death_date">Date of Death (if fatality)</Label>
                <Input
                  id="death_date"
                  type="date"
                  {...register('death_date')}
                />
              </div>

              <div className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  id="is_privacy_case"
                  {...register('is_privacy_case')}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="is_privacy_case" className="font-normal">
                  Privacy case (hide name on OSHA 300 Log)
                </Label>
              </div>
            </div>

            {/* Info box */}
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
              <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-blue-800">
                Privacy cases include: sexual assault, HIV status, mental illness,
                needle stick injuries involving blood, and other sensitive conditions.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? 'Saving...'
            : isEditing
            ? 'Update Incident'
            : 'Report Incident'}
        </Button>
      </div>
    </form>
  )
}

export default IncidentReportForm
