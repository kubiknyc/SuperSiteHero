// File: /src/features/checklists/pages/ExecutionDetailPage.tsx
// Read-only detail view for completed checklist executions
// Phase: 3.1 - Checklist Execution UI

import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowLeft,
  Edit,
  Download,
  MapPin,
  Cloud,
  Thermometer,
  User,
  Calendar,
  CheckCircle2,
  XCircle,
  Minus,
  FileText,
} from 'lucide-react'
import { useExecutionWithResponses } from '../hooks/useExecutions'
import { useExecutionScore } from '../hooks/useResponses'
import { useTemplateItems } from '../hooks/useTemplateItems'
import { FailedItemsNotification } from '../components/FailedItemsNotification'
import { ChecklistGradeDisplay } from '../components/ChecklistGradeDisplay'
import type { ScoreValue } from '@/types/checklists'
import type { ChecklistScore } from '@/types/checklist-scoring'
import { format } from 'date-fns'
import { generateChecklistPDF } from '../utils/pdfExport'
import toast from 'react-hot-toast'
import { logger } from '../../../lib/utils/logger';


export function ExecutionDetailPage() {
  const { executionId } = useParams<{ executionId: string }>()
  const navigate = useNavigate()

  // Data hooks
  const { data: execution, isLoading } = useExecutionWithResponses(executionId!)
  const { data: score } = useExecutionScore(executionId!)
  const { data: templateItems = [] } = useTemplateItems(execution?.checklist_template_id || '')

  // Group responses by section
  const sections = useMemo(() => {
    if (!execution?.responses || !templateItems.length) {return []}

    const responseMap = new Map(
      execution.responses.map((r) => [r.checklist_template_item_id, r])
    )

    const sectionMap = new Map<string, typeof templateItems>()

    templateItems.forEach((item) => {
      const section = item.section || 'General'
      if (!sectionMap.has(section)) {
        sectionMap.set(section, [])
      }
      sectionMap.get(section)!.push(item)
    })

    return Array.from(sectionMap.entries()).map(([name, items]) => ({
      name,
      items: items
        .map((item) => ({
          templateItem: item,
          response: responseMap.get(item.id),
        }))
        .filter((pair) => pair.response !== undefined),
    }))
  }, [execution?.responses, templateItems])

  const renderResponseValue = (response: any, itemType: string) => {
    const data = response.response_data as any

    switch (itemType) {
      case 'checkbox':
        if (response.score_value) {
          return (
            <div className="flex items-center gap-2">
              {response.score_value === 'pass' && (
                <>
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  <span className="font-medium text-success-dark">Pass</span>
                </>
              )}
              {response.score_value === 'fail' && (
                <>
                  <XCircle className="w-5 h-5 text-error" />
                  <span className="font-medium text-error-dark">Fail</span>
                </>
              )}
              {response.score_value === 'na' && (
                <>
                  <Minus className="w-5 h-5 text-secondary" />
                  <span className="font-medium text-secondary">N/A</span>
                </>
              )}
            </div>
          )
        }
        return (
          <span className="text-secondary">
            {data?.value === 'checked' ? 'Checked' : 'Unchecked'}
          </span>
        )

      case 'text':
        return <p className="text-secondary whitespace-pre-wrap">{data?.value || 'No response'}</p>

      case 'number':
        return (
          <span className="text-secondary">
            {data?.value} {data?.units || ''}
          </span>
        )

      case 'photo':
        const photoUrls = response.photo_urls || []
        return photoUrls.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {photoUrls.map((url: string, index: number) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                <img src={url} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        ) : (
          <span className="text-muted">No photos</span>
        )

      case 'signature':
        return response.signature_url ? (
          <div className="border rounded-lg p-4 bg-surface max-w-xs">
            <img
              src={response.signature_url}
              alt="Signature"
              className="w-full h-24 object-contain"
            />
          </div>
        ) : (
          <span className="text-muted">No signature</span>
        )

      default:
        return <span className="text-muted">Unknown type</span>
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
          <p className="text-secondary">Loading checklist...</p>
        </div>
      </div>
    )
  }

  if (!execution) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2 heading-section">Checklist not found</h2>
          <Button variant="outline" onClick={() => navigate('/checklists/executions')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Checklists
          </Button>
        </div>
      </div>
    )
  }

  const canEdit = execution.status === 'draft' || execution.status === 'in_progress'

  const handleExportPDF = async () => {
    if (!execution) {return}

    try {
      await generateChecklistPDF(execution, templateItems, score || null, execution.project_id)
      toast.success('PDF exported successfully')
    } catch (error) {
      logger.error('Failed to generate PDF:', error)
      toast.error('Failed to generate PDF. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/checklists/executions')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Checklists
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground mb-2 heading-page">{execution.name}</h1>
              {execution.description && (
                <p className="text-secondary mb-3">{execution.description}</p>
              )}
              <div className="flex items-center gap-3 flex-wrap">
                <Badge
                  className={
                    execution.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : execution.status === 'rejected'
                      ? 'bg-error-light text-red-800'
                      : execution.status === 'submitted'
                      ? 'bg-success-light text-green-800'
                      : 'bg-info-light text-blue-800'
                  }
                >
                  {execution.status.replace('_', ' ')}
                </Badge>
                {execution.category && <Badge variant="outline">{execution.category}</Badge>}
              </div>
            </div>

            <div className="flex gap-2">
              {canEdit && (
                <Button
                  onClick={() => navigate(`/checklists/executions/${executionId}/fill`)}
                  size="sm"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Continue Editing
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Failed Items Notification */}
        {execution.is_completed && execution.score_fail > 0 && (
          <div className="mb-6">
            <FailedItemsNotification
              execution={execution}
              responses={execution.responses}
              autoShow={true}
            />
          </div>
        )}

        {/* Score Summary (if scoring enabled) - Enhanced with Grade Display */}
        {score && score.total_count > 0 && (
          <div className="mb-6">
            <ChecklistGradeDisplay
              score={{
                execution_id: executionId!,
                scoring_type: execution.grade ? 'letter_grade' : 'percentage',
                score: score.pass_percentage,
                grade: execution.grade || undefined,
                passed: execution.passed !== null ? execution.passed : score.pass_percentage >= 70,
                breakdown: {
                  total_items: score.total_count,
                  completed_items: score.total_count,
                  scorable_items: score.pass_count + score.fail_count,
                  pass_count: score.pass_count,
                  fail_count: score.fail_count,
                  na_count: score.na_count,
                  item_scores: [],
                },
                calculated_at: execution.updated_at,
              }}
              size="md"
            />
          </div>
        )}

        {/* Metadata */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Inspection Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {execution.location && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-disabled mt-0.5" />
                  <div>
                    <div className="text-muted">Location</div>
                    <div className="text-foreground font-medium">{execution.location}</div>
                  </div>
                </div>
              )}
              {execution.inspector_name && (
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-disabled mt-0.5" />
                  <div>
                    <div className="text-muted">Inspector</div>
                    <div className="text-foreground font-medium">{execution.inspector_name}</div>
                  </div>
                </div>
              )}
              {execution.weather_conditions && (
                <div className="flex items-start gap-2">
                  <Cloud className="w-4 h-4 text-disabled mt-0.5" />
                  <div>
                    <div className="text-muted">Weather</div>
                    <div className="text-foreground font-medium">{execution.weather_conditions}</div>
                  </div>
                </div>
              )}
              {execution.temperature && (
                <div className="flex items-start gap-2">
                  <Thermometer className="w-4 h-4 text-disabled mt-0.5" />
                  <div>
                    <div className="text-muted">Temperature</div>
                    <div className="text-foreground font-medium">{execution.temperature}°F</div>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-disabled mt-0.5" />
                <div>
                  <div className="text-muted">Created</div>
                  <div className="text-foreground font-medium">
                    {format(new Date(execution.created_at), 'PPP p')}
                  </div>
                </div>
              </div>
              {execution.completed_at && (
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-disabled mt-0.5" />
                  <div>
                    <div className="text-muted">Completed</div>
                    <div className="text-foreground font-medium">
                      {format(new Date(execution.completed_at), 'PPP p')}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Checklist Items */}
        <div className="space-y-6">
          {sections.map((section) => (
            <Card key={section.name}>
              <CardHeader>
                <CardTitle>{section.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {section.items.map(({ templateItem, response }) => (
                  <div key={response!.id} className="border-b border-border pb-4 last:border-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-foreground heading-subsection">{templateItem.label}</h3>
                          <Badge variant="outline" className="text-xs">
                            {templateItem.item_type}
                          </Badge>
                          {templateItem.is_required && (
                            <Badge variant="outline" className="text-xs text-error">
                              Required
                            </Badge>
                          )}
                        </div>
                        {templateItem.description && (
                          <p className="text-sm text-secondary mt-1">{templateItem.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-2">
                      {renderResponseValue(response, templateItem.item_type)}
                    </div>

                    {response!.notes && (
                      <div className="mt-3 pl-4 border-l-2 border-border">
                        <div className="flex items-start gap-2">
                          <FileText className="w-4 h-4 text-disabled mt-0.5" />
                          <div>
                            <div className="text-xs text-muted mb-1">Notes</div>
                            <p className="text-sm text-secondary">{response!.notes}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ExecutionDetailPage
