import { useState } from 'react'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { FormField } from '@/components/ui/form-field'
import { ChevronDown, ChevronUp, Briefcase } from 'lucide-react'
import { DraftReport } from '@/features/daily-reports/store/offlineReportStore'
import { workSectionSchema } from '../validation/dailyReportSchema'
import { getCharacterCount } from '../validation/validationUtils'

interface WorkSectionProps {
  expanded: boolean
  onToggle: () => void
  draft: DraftReport | null
  onUpdate: (updates: Partial<DraftReport>) => void
}

interface FieldErrors {
  work_performed?: string
  work_completed?: string
  work_planned?: string
}

export function WorkSection({ expanded, onToggle, draft, onUpdate }: WorkSectionProps) {
  const [errors, setErrors] = useState<FieldErrors>({})

  if (!draft) {return null}

  const validateField = (field: keyof FieldErrors, value: any) => {
    const fieldSchema = workSectionSchema.shape[field]
    if (!fieldSchema) {return}

    const result = fieldSchema.safeParse(value)
    setErrors((prev) => ({
      ...prev,
      [field]: result.success ? undefined : result.error.issues[0]?.message,
    }))
  }

  const performedCount = getCharacterCount(draft.work_performed ?? '', 2000)
  const completedCount = getCharacterCount(draft.work_completed ?? '', 1000)
  const plannedCount = getCharacterCount(draft.work_planned ?? '', 1000)

  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 hover:bg-surface"
      >
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-secondary" />
          <div className="text-left">
            <CardTitle className="text-base">Work Progress</CardTitle>
            <CardDescription>Daily work summary and accomplishments</CardDescription>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-disabled" />
        ) : (
          <ChevronDown className="h-5 w-5 text-disabled" />
        )}
      </button>

      {expanded && (
        <CardContent className="space-y-4 border-t pt-6">
          <FormField
            label="Work Performed"
            htmlFor="work_performed"
            required
            error={errors.work_performed}
            description="Describe the work completed today"
            characterCount={{
              current: performedCount.count,
              max: 2000,
              isNearLimit: performedCount.isNearLimit,
              isOverLimit: performedCount.isOverLimit,
            }}
          >
            <textarea
              id="work_performed"
              placeholder="Describe the work performed today..."
              value={draft.work_performed || ''}
              onChange={(e) => {
                onUpdate({ work_performed: e.target.value })
                validateField('work_performed', e.target.value)
              }}
              onBlur={(e) => validateField('work_performed', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px] ${
                errors.work_performed ? 'border-red-500' : 'border-input'
              }`}
            />
          </FormField>

          <FormField
            label="Work Completed"
            htmlFor="work_completed"
            error={errors.work_completed}
            description="Specific tasks or milestones completed"
            characterCount={{
              current: completedCount.count,
              max: 1000,
              isNearLimit: completedCount.isNearLimit,
              isOverLimit: completedCount.isOverLimit,
            }}
          >
            <textarea
              id="work_completed"
              placeholder="List specific completed items..."
              value={draft.work_completed || ''}
              onChange={(e) => {
                onUpdate({ work_completed: e.target.value })
                validateField('work_completed', e.target.value)
              }}
              onBlur={(e) => validateField('work_completed', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] ${
                errors.work_completed ? 'border-red-500' : 'border-input'
              }`}
            />
          </FormField>

          <FormField
            label="Work Planned"
            htmlFor="work_planned"
            error={errors.work_planned}
            description="Work planned for tomorrow or upcoming days"
            characterCount={{
              current: plannedCount.count,
              max: 1000,
              isNearLimit: plannedCount.isNearLimit,
              isOverLimit: plannedCount.isOverLimit,
            }}
          >
            <textarea
              id="work_planned"
              placeholder="Describe upcoming work..."
              value={draft.work_planned || ''}
              onChange={(e) => {
                onUpdate({ work_planned: e.target.value })
                validateField('work_planned', e.target.value)
              }}
              onBlur={(e) => validateField('work_planned', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] ${
                errors.work_planned ? 'border-red-500' : 'border-input'
              }`}
            />
          </FormField>
        </CardContent>
      )}
    </Card>
  )
}
