// File: /src/features/checklists/pages/ActiveExecutionPage.tsx
// Interactive checklist execution page with auto-save
// Phase: 3.1 - Checklist Execution UI

import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft,
  Save,
  Send,
  Clock,
  MapPin,
  Cloud,
  Thermometer,
  User,
  CheckCircle2,
} from 'lucide-react'
import { ResponseFormItem } from '../components/ResponseFormItem'
import { useExecutionWithResponses, useUpdateExecution } from '../hooks/useExecutions'
import { useUpdateResponse } from '../hooks/useResponses'
import { useTemplateItems } from '../hooks/useTemplateItems'
import type { ChecklistResponse } from '@/types/checklists'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

export function ActiveExecutionPage() {
  const { executionId } = useParams<{ executionId: string }>()
  const navigate = useNavigate()

  // Data hooks
  const { data: execution, isLoading } = useExecutionWithResponses(executionId!)
  const { data: templateItems = [] } = useTemplateItems(execution?.checklist_template_id || '')
  const updateResponse = useUpdateResponse()
  const updateExecution = useUpdateExecution()

  // Local state for auto-save delay
  const [savingResponseId, setSavingResponseId] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Metadata editing
  const [isEditingMetadata, setIsEditingMetadata] = useState(false)
  const [location, setLocation] = useState('')
  const [weather, setWeather] = useState('')
  const [temperature, setTemperature] = useState('')
  const [inspectorName, setInspectorName] = useState('')

  // Initialize metadata state
  useEffect(() => {
    if (execution) {
      setLocation(execution.location || '')
      setWeather(execution.weather_conditions || '')
      setTemperature(execution.temperature?.toString() || '')
      setInspectorName(execution.inspector_name || '')
    }
  }, [execution])

  // Calculate progress
  const progress = useMemo(() => {
    if (!execution?.responses || execution.responses.length === 0) {
      return { completed: 0, total: 0, percentage: 0 }
    }

    const total = execution.responses.length
    const completed = execution.responses.filter((r) => {
      // Consider a response completed if it has data
      const data = r.response_data as any
      if (!data) {return false}

      switch (r.item_type) {
        case 'checkbox':
          return data.value && data.value !== 'unchecked'
        case 'text':
          return data.value && data.value.trim().length > 0
        case 'number':
          return data.value !== null && data.value !== undefined
        case 'photo':
          return data.photo_urls && data.photo_urls.length > 0
        case 'signature':
          return data.signature_url && data.signature_url.length > 0
        default:
          return false
      }
    }).length

    return {
      completed,
      total,
      percentage: Math.round((completed / total) * 100),
    }
  }, [execution?.responses])

  // Group responses by section
  const sections = useMemo(() => {
    if (!execution?.responses || !templateItems.length) {return []}

    // Create a map of responses by template item ID for quick lookup
    const responseMap = new Map(
      execution.responses.map((r) => [r.checklist_template_item_id, r])
    )

    // Group template items by section
    const sectionMap = new Map<string, typeof templateItems>()

    templateItems.forEach((item) => {
      const section = item.section || 'General'
      if (!sectionMap.has(section)) {
        sectionMap.set(section, [])
      }
      sectionMap.get(section)!.push(item)
    })

    // Convert to array with responses
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

  const handleResponseChange = async (responseId: string, updates: Partial<ChecklistResponse>) => {
    setSavingResponseId(responseId)

    try {
      await updateResponse.mutateAsync({
        id: responseId,
        ...updates,
      })
      setLastSaved(new Date())
    } catch (error) {
      console.error('Failed to save response:', error)
    } finally {
      setSavingResponseId(null)
    }
  }

  const handleSaveMetadata = async () => {
    if (!executionId) {return}

    try {
      await updateExecution.mutateAsync({
        id: executionId,
        location: location.trim() || null,
        weather_conditions: weather.trim() || null,
        temperature: temperature ? parseInt(temperature) : null,
        inspector_name: inspectorName.trim() || null,
      })
      setIsEditingMetadata(false)
      toast.success('Metadata updated successfully')
    } catch (error) {
      console.error('Failed to update metadata:', error)
    }
  }

  const handleSubmit = async () => {
    if (!executionId || !execution) {return}

    // Check if all required items are completed
    const requiredItems = templateItems.filter((item) => item.is_required)
    const responses = execution.responses || []
    const responseMap = new Map(responses.map((r) => [r.checklist_template_item_id, r]))

    const missingRequired = requiredItems.filter((item) => {
      const response = responseMap.get(item.id)
      if (!response) {return true}

      const data = response.response_data as any
      if (!data) {return true}

      switch (response.item_type) {
        case 'checkbox':
          return !data.value || data.value === 'unchecked'
        case 'text':
          return !data.value || data.value.trim().length === 0
        case 'number':
          return data.value === null || data.value === undefined
        case 'photo':
          return !data.photo_urls || data.photo_urls.length === 0
        case 'signature':
          return !data.signature_url || data.signature_url.length === 0
        default:
          return true
      }
    })

    if (missingRequired.length > 0) {
      toast.error(
        `Please complete all required items. ${missingRequired.length} required item(s) remaining.`
      )
      return
    }

    try {
      await updateExecution.mutateAsync({
        id: executionId,
        status: 'submitted',
        is_completed: true,
        completed_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
      })
      toast.success('Checklist submitted successfully!')
      navigate(`/checklists/executions/${executionId}`)
    } catch (error) {
      console.error('Failed to submit checklist:', error)
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
                    execution.status === 'submitted'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }
                >
                  {execution.status.replace('_', ' ')}
                </Badge>
                {execution.category && <Badge variant="outline">{execution.category}</Badge>}
                <span className="text-sm text-gray-500">
                  Created {formatDistanceToNow(new Date(execution.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-gray-900">Progress</span>
            </div>
            <span className="text-sm font-medium text-gray-700">
              {progress.completed} / {progress.total} items ({progress.percentage}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                progress.percentage === 100 ? 'bg-green-600' : 'bg-blue-600'
              }`}
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          {lastSaved && (
            <p className="text-xs text-gray-500 mt-2">
              Last saved {formatDistanceToNow(lastSaved, { addSuffix: true })}
            </p>
          )}
        </div>

        {/* Metadata Section */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Inspection Details</h2>
            {canEdit && !isEditingMetadata && (
              <Button variant="outline" size="sm" onClick={() => setIsEditingMetadata(true)}>
                Edit
              </Button>
            )}
          </div>

          {isEditingMetadata ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="location">Location</Label>
                <div className="flex items-center gap-2 mt-1">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Building A - Level 3"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="inspector">Inspector Name</Label>
                <div className="flex items-center gap-2 mt-1">
                  <User className="w-4 h-4 text-gray-400" />
                  <Input
                    id="inspector"
                    value={inspectorName}
                    onChange={(e) => setInspectorName(e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="weather">Weather</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Cloud className="w-4 h-4 text-gray-400" />
                    <Input
                      id="weather"
                      value={weather}
                      onChange={(e) => setWeather(e.target.value)}
                      placeholder="Sunny"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="temperature">Temperature (°F)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Thermometer className="w-4 h-4 text-gray-400" />
                    <Input
                      id="temperature"
                      type="number"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                      placeholder="72"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveMetadata} disabled={updateExecution.isPending}>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button variant="outline" onClick={() => setIsEditingMetadata(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {execution.location && (
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{execution.location}</span>
                </div>
              )}
              {execution.inspector_name && (
                <div className="flex items-center gap-2 text-gray-700">
                  <User className="w-4 h-4 text-gray-400" />
                  <span>{execution.inspector_name}</span>
                </div>
              )}
              {execution.weather_conditions && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Cloud className="w-4 h-4 text-gray-400" />
                  <span>{execution.weather_conditions}</span>
                </div>
              )}
              {execution.temperature && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Thermometer className="w-4 h-4 text-gray-400" />
                  <span>{execution.temperature}°F</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Checklist Items */}
        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.name}>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{section.name}</h2>
              <div className="space-y-3">
                {section.items.map(({ templateItem, response }) => (
                  <ResponseFormItem
                    key={response!.id}
                    response={response!}
                    templateItem={templateItem}
                    onChange={(updates) => handleResponseChange(response!.id, updates)}
                    disabled={!canEdit || savingResponseId === response!.id}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Submit Button */}
        {canEdit && (
          <div className="mt-8 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/checklists/executions')}
            >
              Save & Exit
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={updateExecution.isPending || progress.percentage < 100}
              size="lg"
            >
              <Send className="w-4 h-4 mr-2" />
              Submit Checklist
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ActiveExecutionPage
