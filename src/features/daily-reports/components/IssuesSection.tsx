import { useState } from 'react'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { FormField } from '@/components/ui/form-field'
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { DraftReport } from '@/features/daily-reports/store/offlineReportStore'
import { issuesSectionSchema } from '../validation/dailyReportSchema'
import { getCharacterCount } from '../validation/validationUtils'

interface IssuesSectionProps {
  expanded: boolean
  onToggle: () => void
  draft: DraftReport | null
  onUpdate: (updates: Partial<DraftReport>) => void
}

interface FieldErrors {
  safety_incidents?: string
  quality_issues?: string
  schedule_delays?: string
  general_notes?: string
}

export function IssuesSection({ expanded, onToggle, draft, onUpdate }: IssuesSectionProps) {
  const [errors, setErrors] = useState<FieldErrors>({})

  if (!draft) {return null}

  const validateField = (field: keyof FieldErrors, value: any) => {
    const fieldSchema = issuesSectionSchema.shape[field]
    if (!fieldSchema) {return}

    const result = fieldSchema.safeParse(value)
    setErrors((prev) => ({
      ...prev,
      [field]: result.success ? undefined : result.error.issues[0]?.message,
    }))
  }

  const safetyCount = getCharacterCount(draft.safety_incidents, 1000)
  const qualityCount = getCharacterCount(draft.quality_issues, 1000)
  const scheduleCount = getCharacterCount(draft.schedule_delays, 1000)
  const notesCount = getCharacterCount(draft.general_notes, 2000)

  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-gray-600" />
          <div className="text-left">
            <CardTitle className="text-base">Issues & Observations</CardTitle>
            <CardDescription>Safety incidents, quality issues, and delays</CardDescription>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {expanded && (
        <CardContent className="space-y-4 border-t pt-6">
          <FormField
            label="Safety Incidents"
            htmlFor="safety_incidents"
            error={errors.safety_incidents}
            description="Document any safety incidents or near misses"
            characterCount={{
              current: safetyCount.count,
              max: 1000,
              isNearLimit: safetyCount.isNearLimit,
              isOverLimit: safetyCount.isOverLimit,
            }}
          >
            <textarea
              id="safety_incidents"
              placeholder="Describe safety incidents, near misses, or safety concerns..."
              value={draft.safety_incidents || ''}
              onChange={(e) => {
                onUpdate({ safety_incidents: e.target.value })
                validateField('safety_incidents', e.target.value)
              }}
              onBlur={(e) => validateField('safety_incidents', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] ${
                errors.safety_incidents ? 'border-red-500' : 'border-gray-300'
              }`}
            />
          </FormField>

          <FormField
            label="Quality Issues"
            htmlFor="quality_issues"
            error={errors.quality_issues}
            description="Document quality concerns or defects"
            characterCount={{
              current: qualityCount.count,
              max: 1000,
              isNearLimit: qualityCount.isNearLimit,
              isOverLimit: qualityCount.isOverLimit,
            }}
          >
            <textarea
              id="quality_issues"
              placeholder="Describe quality issues, defects, or rework needed..."
              value={draft.quality_issues || ''}
              onChange={(e) => {
                onUpdate({ quality_issues: e.target.value })
                validateField('quality_issues', e.target.value)
              }}
              onBlur={(e) => validateField('quality_issues', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] ${
                errors.quality_issues ? 'border-red-500' : 'border-gray-300'
              }`}
            />
          </FormField>

          <FormField
            label="Schedule Delays"
            htmlFor="schedule_delays"
            error={errors.schedule_delays}
            description="Document delays and their causes"
            characterCount={{
              current: scheduleCount.count,
              max: 1000,
              isNearLimit: scheduleCount.isNearLimit,
              isOverLimit: scheduleCount.isOverLimit,
            }}
          >
            <textarea
              id="schedule_delays"
              placeholder="Describe schedule delays and reasons..."
              value={draft.schedule_delays || ''}
              onChange={(e) => {
                onUpdate({ schedule_delays: e.target.value })
                validateField('schedule_delays', e.target.value)
              }}
              onBlur={(e) => validateField('schedule_delays', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] ${
                errors.schedule_delays ? 'border-red-500' : 'border-gray-300'
              }`}
            />
          </FormField>

          <FormField
            label="General Notes"
            htmlFor="general_notes"
            error={errors.general_notes}
            description="Additional observations and comments"
            characterCount={{
              current: notesCount.count,
              max: 2000,
              isNearLimit: notesCount.isNearLimit,
              isOverLimit: notesCount.isOverLimit,
            }}
          >
            <textarea
              id="general_notes"
              placeholder="General observations, notes, or additional information..."
              value={draft.general_notes || ''}
              onChange={(e) => {
                onUpdate({ general_notes: e.target.value })
                validateField('general_notes', e.target.value)
              }}
              onBlur={(e) => validateField('general_notes', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px] ${
                errors.general_notes ? 'border-red-500' : 'border-gray-300'
              }`}
            />
          </FormField>
        </CardContent>
      )}
    </Card>
  )
}
