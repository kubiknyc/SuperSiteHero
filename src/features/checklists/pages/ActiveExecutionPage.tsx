// File: /src/features/checklists/pages/ActiveExecutionPage.tsx
// Interactive checklist execution page with auto-save
// Phase: 3.1 - Checklist Execution UI

import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft,
  Save,
  Send,
  MapPin,
  Cloud,
  Thermometer,
  User,
  CheckCircle2,
} from 'lucide-react'
import { ResponseFormItem } from '../components/ResponseFormItem'
import { KeyboardShortcutsHelp } from '../components/KeyboardShortcutsHelp'
import { useExecutionWithResponses, useUpdateExecution } from '../hooks/useExecutions'
import { useUpdateResponse } from '../hooks/useResponses'
import { useTemplateItems } from '../hooks/useTemplateItems'
import { useKeyboardShortcuts, getChecklistShortcuts } from '../hooks/useKeyboardShortcuts'
import { evaluateItemVisibility, buildResponsesMap } from '../utils/conditionEvaluator'
import type {
  ChecklistResponse,
  CheckboxResponseData,
  TextResponseData,
  NumberResponseData,
  PhotoResponseData,
  SignatureResponseData,
} from '@/types/checklists'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import { logger } from '@/lib/utils/logger'

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

  // Current focused item for keyboard shortcuts
  const [focusedItemIndex, setFocusedItemIndex] = useState(0)
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // Initialize metadata state
  useEffect(() => {
    if (execution) {
      setLocation(execution.location || '')
      setWeather(execution.weather_conditions || '')
      setTemperature(execution.temperature?.toString() || '')
      setInspectorName(execution.inspector_name || '')
    }
  }, [execution])

  // Determine if user can edit
  const canEdit = execution
    ? execution.status === 'draft' || execution.status === 'in_progress'
    : false

  // Build responses map for progress calculation (needed before sections)
  const responsesMapForProgress = useMemo(() => {
    if (!execution?.responses) {return new Map<string, ChecklistResponse>()}
    return buildResponsesMap(execution.responses)
  }, [execution?.responses])

  // Calculate progress (only count visible items)
  const progress = useMemo(() => {
    if (!execution?.responses || execution.responses.length === 0 || !templateItems.length) {
      return { completed: 0, total: 0, percentage: 0 }
    }

    // Create template item map for condition checking
    const templateItemMap = new Map(templateItems.map((item) => [item.id, item]))

    // Only count visible items
    const visibleResponses = execution.responses.filter((r) => {
      const templateItem = templateItemMap.get(r.checklist_template_item_id || '')
      if (!templateItem) {return true} // Include if no template item found
      return evaluateItemVisibility(templateItem.conditions, responsesMapForProgress)
    })

    const total = visibleResponses.length
    const completed = visibleResponses.filter((r) => {
      // Consider a response completed if it has data
      const data = r.response_data
      if (!data) {return false}

      switch (r.item_type) {
        case 'checkbox': {
          const checkboxData = data as CheckboxResponseData
          return checkboxData.value && checkboxData.value !== 'unchecked'
        }
        case 'text': {
          const textData = data as TextResponseData
          return textData.value && textData.value.trim().length > 0
        }
        case 'number': {
          const numberData = data as NumberResponseData
          return numberData.value !== null && numberData.value !== undefined
        }
        case 'photo': {
          const photoData = data as PhotoResponseData
          return photoData.photo_urls && photoData.photo_urls.length > 0
        }
        case 'signature': {
          const signatureData = data as SignatureResponseData
          return signatureData.signature_url && signatureData.signature_url.length > 0
        }
        default:
          return false
      }
    }).length

    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  }, [execution?.responses, templateItems, responsesMapForProgress])

  // Use the same responses map for sections (already computed above)
  const responsesMap = responsesMapForProgress

  // Group responses by section with conditional visibility
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

    // Convert to array with responses, filtering by conditional visibility
    return Array.from(sectionMap.entries()).map(([name, items]) => ({
      name,
      items: items
        .map((item) => ({
          templateItem: item,
          response: responseMap.get(item.id),
          // Evaluate visibility based on conditions
          isVisible: evaluateItemVisibility(item.conditions, responsesMap),
        }))
        .filter((pair) => pair.response !== undefined && pair.isVisible),
    }))
  }, [execution?.responses, templateItems, responsesMap])

  // Flatten all responses for keyboard navigation
  const allResponses = useMemo(() => {
    return sections.flatMap((section) => section.items.map((item) => item.response!))
  }, [sections])

  // Get current focused response and template item
  const currentResponse = allResponses[focusedItemIndex]
  const currentTemplateItem = templateItems.find(
    (item) => item.id === currentResponse?.checklist_template_item_id
  )

  // Keyboard shortcut handlers
  const handlePassShortcut = () => {
    if (!currentResponse || !currentTemplateItem) {return}
    if (currentTemplateItem.item_type !== 'checkbox') {return}

    handleResponseChange(currentResponse.id, {
      response_data: { value: 'checked' },
      score_value: 'pass',
    })
    toast.success('Marked as Pass (P)')
  }

  const handleFailShortcut = () => {
    if (!currentResponse || !currentTemplateItem) {return}
    if (currentTemplateItem.item_type !== 'checkbox') {return}

    handleResponseChange(currentResponse.id, {
      response_data: { value: 'checked' },
      score_value: 'fail',
    })
    toast.success('Marked as Fail (F)')
  }

  const handleNAShortcut = () => {
    if (!currentResponse || !currentTemplateItem) {return}
    if (currentTemplateItem.item_type !== 'checkbox') {return}

    handleResponseChange(currentResponse.id, {
      response_data: { value: 'checked' },
      score_value: 'na',
    })
    toast.success('Marked as N/A (N)')
  }

  const handleNextItem = () => {
    if (focusedItemIndex < allResponses.length - 1) {
      const newIndex = focusedItemIndex + 1
      setFocusedItemIndex(newIndex)
      // Scroll to item
      const response = allResponses[newIndex]
      const element = itemRefs.current.get(response.id)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }

  const handlePreviousItem = () => {
    if (focusedItemIndex > 0) {
      const newIndex = focusedItemIndex - 1
      setFocusedItemIndex(newIndex)
      // Scroll to item
      const response = allResponses[newIndex]
      const element = itemRefs.current.get(response.id)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }

  const handleSaveShortcut = () => {
    setLastSaved(new Date())
    toast.success('Progress saved (S)')
  }

  const handleResponseChange = async (responseId: string, updates: Partial<ChecklistResponse>) => {
    setSavingResponseId(responseId)

    try {
      await updateResponse.mutateAsync({
        id: responseId,
        ...updates,
      })
      setLastSaved(new Date())
    } catch (error) {
      logger.error('Failed to save response:', error)
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
      logger.error('Failed to update metadata:', error)
    }
  }

  const handleSubmit = async () => {
    if (!executionId || !execution) {return}

    // Check if all required AND visible items are completed
    // Hidden items (due to conditions) are not required to be filled
    const requiredItems = templateItems.filter((item) => {
      if (!item.is_required) {return false}
      // Only require if the item is visible based on conditions
      return evaluateItemVisibility(item.conditions, responsesMap)
    })
    const responses = execution.responses || []
    const responseMap = new Map(responses.map((r) => [r.checklist_template_item_id, r]))

    const missingRequired = requiredItems.filter((item) => {
      const response = responseMap.get(item.id)
      if (!response) {return true}

      const data = response.response_data
      if (!data) {return true}

      switch (response.item_type) {
        case 'checkbox': {
          const checkboxData = data as CheckboxResponseData
          return !checkboxData.value || checkboxData.value === 'unchecked'
        }
        case 'text': {
          const textData = data as TextResponseData
          return !textData.value || textData.value.trim().length === 0
        }
        case 'number': {
          const numberData = data as NumberResponseData
          return numberData.value === null || numberData.value === undefined
        }
        case 'photo': {
          const photoData = data as PhotoResponseData
          return !photoData.photo_urls || photoData.photo_urls.length === 0
        }
        case 'signature': {
          const signatureData = data as SignatureResponseData
          return !signatureData.signature_url || signatureData.signature_url.length === 0
        }
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
      logger.error('Failed to submit checklist:', error)
    }
  }

  // Keyboard shortcuts configuration
  const shortcuts = getChecklistShortcuts({
    onPass: canEdit && currentTemplateItem?.item_type === 'checkbox' ? handlePassShortcut : undefined,
    onFail: canEdit && currentTemplateItem?.item_type === 'checkbox' ? handleFailShortcut : undefined,
    onNA: canEdit && currentTemplateItem?.item_type === 'checkbox' ? handleNAShortcut : undefined,
    onNext: allResponses.length > 0 ? handleNextItem : undefined,
    onPrevious: allResponses.length > 0 ? handlePreviousItem : undefined,
    onSave: canEdit ? handleSaveShortcut : undefined,
    onSubmit: canEdit && progress.percentage === 100 ? handleSubmit : undefined,
  })

  // Enable keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts,
    enabled: canEdit && !isEditingMetadata,
  })

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
                    execution.status === 'submitted'
                      ? 'bg-success-light text-green-800'
                      : 'bg-info-light text-blue-800'
                  }
                >
                  {execution.status.replace('_', ' ')}
                </Badge>
                {execution.category && <Badge variant="outline">{execution.category}</Badge>}
                <span className="text-sm text-muted">
                  Created {formatDistanceToNow(new Date(execution.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
            {canEdit && <KeyboardShortcutsHelp shortcuts={shortcuts} />}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-card rounded-lg shadow p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <span className="font-medium text-foreground">Progress</span>
            </div>
            <span className="text-sm font-medium text-secondary">
              {progress.completed} / {progress.total} items ({progress.percentage}%)
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                progress.percentage === 100 ? 'bg-success' : 'bg-primary'
              }`}
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          {lastSaved && (
            <p className="text-xs text-muted mt-2">
              Last saved {formatDistanceToNow(lastSaved, { addSuffix: true })}
            </p>
          )}
        </div>

        {/* Metadata Section */}
        <div className="bg-card rounded-lg shadow p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground heading-section">Inspection Details</h2>
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
                  <MapPin className="w-4 h-4 text-disabled" />
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
                  <User className="w-4 h-4 text-disabled" />
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
                    <Cloud className="w-4 h-4 text-disabled" />
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
                    <Thermometer className="w-4 h-4 text-disabled" />
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
                <div className="flex items-center gap-2 text-secondary">
                  <MapPin className="w-4 h-4 text-disabled" />
                  <span>{execution.location}</span>
                </div>
              )}
              {execution.inspector_name && (
                <div className="flex items-center gap-2 text-secondary">
                  <User className="w-4 h-4 text-disabled" />
                  <span>{execution.inspector_name}</span>
                </div>
              )}
              {execution.weather_conditions && (
                <div className="flex items-center gap-2 text-secondary">
                  <Cloud className="w-4 h-4 text-disabled" />
                  <span>{execution.weather_conditions}</span>
                </div>
              )}
              {execution.temperature && (
                <div className="flex items-center gap-2 text-secondary">
                  <Thermometer className="w-4 h-4 text-disabled" />
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
              <h2 className="text-xl font-semibold text-foreground mb-4 heading-section">{section.name}</h2>
              <div className="space-y-3">
                {section.items.map(({ templateItem, response }) => {
                  const isFocused = currentResponse?.id === response!.id
                  return (
                    <div
                      key={response!.id}
                      ref={(el) => {
                        if (el) {
                          itemRefs.current.set(response!.id, el)
                        } else {
                          itemRefs.current.delete(response!.id)
                        }
                      }}
                      className={`transition-all ${
                        isFocused
                          ? 'ring-2 ring-blue-500 ring-offset-2 rounded-lg'
                          : ''
                      }`}
                      onClick={() => {
                        const index = allResponses.findIndex((r) => r.id === response!.id)
                        if (index !== -1) {
                          setFocusedItemIndex(index)
                        }
                      }}
                    >
                      <ResponseFormItem
                        response={response!}
                        templateItem={templateItem}
                        onChange={(updates) => handleResponseChange(response!.id, updates)}
                        disabled={!canEdit || savingResponseId === response!.id}
                      />
                    </div>
                  )
                })}
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
