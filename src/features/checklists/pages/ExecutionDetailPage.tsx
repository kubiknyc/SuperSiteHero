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
import type { ScoreValue } from '@/types/checklists'
import { format } from 'date-fns'

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
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-700">Pass</span>
                </>
              )}
              {response.score_value === 'fail' && (
                <>
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="font-medium text-red-700">Fail</span>
                </>
              )}
              {response.score_value === 'na' && (
                <>
                  <Minus className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-700">N/A</span>
                </>
              )}
            </div>
          )
        }
        return (
          <span className="text-gray-700">
            {data?.value === 'checked' ? 'Checked' : 'Unchecked'}
          </span>
        )

      case 'text':
        return <p className="text-gray-700 whitespace-pre-wrap">{data?.value || 'No response'}</p>

      case 'number':
        return (
          <span className="text-gray-700">
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
          <span className="text-gray-500">No photos</span>
        )

      case 'signature':
        return response.signature_url ? (
          <div className="border rounded-lg p-4 bg-gray-50 max-w-xs">
            <img
              src={response.signature_url}
              alt="Signature"
              className="w-full h-24 object-contain"
            />
          </div>
        ) : (
          <span className="text-gray-500">No signature</span>
        )

      default:
        return <span className="text-gray-500">Unknown type</span>
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4" />
          <p className="text-gray-600">Loading checklist...</p>
        </div>
      </div>
    )
  }

  if (!execution) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Checklist not found</h2>
          <Button variant="outline" onClick={() => navigate('/checklists/executions')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Checklists
          </Button>
        </div>
      </div>
    )
  }

  const canEdit = execution.status === 'draft' || execution.status === 'in_progress'

  return (
    <div className="min-h-screen bg-gray-50">
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{execution.name}</h1>
              {execution.description && (
                <p className="text-gray-600 mb-3">{execution.description}</p>
              )}
              <div className="flex items-center gap-3 flex-wrap">
                <Badge
                  className={
                    execution.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : execution.status === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : execution.status === 'submitted'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
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
              <Button variant="outline" size="sm" disabled>
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Score Summary (if scoring enabled) */}
        {score && score.total_count > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Score Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{score.pass_count}</div>
                  <div className="text-sm text-gray-600">Pass</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">{score.fail_count}</div>
                  <div className="text-sm text-gray-600">Fail</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-600">{score.na_count}</div>
                  <div className="text-sm text-gray-600">N/A</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {Math.round(score.pass_percentage)}%
                  </div>
                  <div className="text-sm text-gray-600">Pass Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
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
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <div className="text-gray-500">Location</div>
                    <div className="text-gray-900 font-medium">{execution.location}</div>
                  </div>
                </div>
              )}
              {execution.inspector_name && (
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <div className="text-gray-500">Inspector</div>
                    <div className="text-gray-900 font-medium">{execution.inspector_name}</div>
                  </div>
                </div>
              )}
              {execution.weather_conditions && (
                <div className="flex items-start gap-2">
                  <Cloud className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <div className="text-gray-500">Weather</div>
                    <div className="text-gray-900 font-medium">{execution.weather_conditions}</div>
                  </div>
                </div>
              )}
              {execution.temperature && (
                <div className="flex items-start gap-2">
                  <Thermometer className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <div className="text-gray-500">Temperature</div>
                    <div className="text-gray-900 font-medium">{execution.temperature}°F</div>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-gray-500">Created</div>
                  <div className="text-gray-900 font-medium">
                    {format(new Date(execution.created_at), 'PPP p')}
                  </div>
                </div>
              </div>
              {execution.completed_at && (
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <div className="text-gray-500">Completed</div>
                    <div className="text-gray-900 font-medium">
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
                  <div key={response!.id} className="border-b border-gray-200 pb-4 last:border-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900">{templateItem.label}</h3>
                          <Badge variant="outline" className="text-xs">
                            {templateItem.item_type}
                          </Badge>
                          {templateItem.is_required && (
                            <Badge variant="outline" className="text-xs text-red-600">
                              Required
                            </Badge>
                          )}
                        </div>
                        {templateItem.description && (
                          <p className="text-sm text-gray-600 mt-1">{templateItem.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-2">
                      {renderResponseValue(response, templateItem.item_type)}
                    </div>

                    {response!.notes && (
                      <div className="mt-3 pl-4 border-l-2 border-gray-200">
                        <div className="flex items-start gap-2">
                          <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Notes</div>
                            <p className="text-sm text-gray-700">{response!.notes}</p>
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
