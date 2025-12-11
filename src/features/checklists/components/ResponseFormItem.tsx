// File: /src/features/checklists/components/ResponseFormItem.tsx
// Polymorphic form input component for different checklist item types
// Phase: 3.1 - Checklist Execution UI

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check, X, Minus, Camera, PenTool } from 'lucide-react'
import { PhotoGallery } from './PhotoGallery'
import { PhotoCaptureDialog } from './PhotoCaptureDialog'
import { SignatureCaptureDialog } from './SignatureCaptureDialog'
import { VoiceInputButton } from '@/components/ui/voice-input'
import type {
  ChecklistResponse,
  ChecklistTemplateItem,
  ScoreValue,
  CheckboxResponseData,
  TextResponseData,
  NumberResponseData,
} from '@/types/checklists'

interface ResponseFormItemProps {
  response: ChecklistResponse
  templateItem: ChecklistTemplateItem
  onChange: (updates: Partial<ChecklistResponse>) => void
  disabled?: boolean
}

export function ResponseFormItem({
  response,
  templateItem,
  onChange,
  disabled = false,
}: ResponseFormItemProps) {
  const [notes, setNotes] = useState(response.notes || '')
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false)
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false)

  const handleNotesBlur = () => {
    if (notes !== response.notes) {
      onChange({ notes: notes.trim() || null })
    }
  }

  // Render based on item type
  const renderInput = () => {
    switch (templateItem.item_type) {
      case 'checkbox':
        return renderCheckboxInput()
      case 'text':
        return renderTextInput()
      case 'number':
        return renderNumberInput()
      case 'photo':
        return renderPhotoInput()
      case 'signature':
        return renderSignatureInput()
      default:
        return null
    }
  }

  // Checkbox (Pass/Fail/NA) input
  const renderCheckboxInput = () => {
    const currentValue = (response.response_data as CheckboxResponseData)?.value || 'unchecked'
    const scoreValue = response.score_value

    const handleScoreChange = (value: ScoreValue) => {
      onChange({
        score_value: value,
        response_data: { value } as CheckboxResponseData,
      })
    }

    return (
      <div className="space-y-3">
        {templateItem.scoring_enabled && templateItem.pass_fail_na_scoring ? (
          // Pass/Fail/NA scoring buttons
          <div className="flex gap-2">
            <Button
              type="button"
              variant={scoreValue === 'pass' ? 'default' : 'outline'}
              size="lg"
              onClick={() => handleScoreChange('pass')}
              disabled={disabled}
              className={scoreValue === 'pass' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              <Check className="w-4 h-4 mr-2" />
              Pass
            </Button>
            <Button
              type="button"
              variant={scoreValue === 'fail' ? 'default' : 'outline'}
              size="lg"
              onClick={() => handleScoreChange('fail')}
              disabled={disabled}
              className={scoreValue === 'fail' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              <X className="w-4 h-4 mr-2" />
              Fail
            </Button>
            <Button
              type="button"
              variant={scoreValue === 'na' ? 'default' : 'outline'}
              size="lg"
              onClick={() => handleScoreChange('na')}
              disabled={disabled}
              className={scoreValue === 'na' ? 'bg-gray-600 hover:bg-gray-700' : ''}
            >
              <Minus className="w-4 h-4 mr-2" />
              N/A
            </Button>
          </div>
        ) : (
          // Simple checkbox
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`checkbox-${response.id}`}
              checked={currentValue === 'checked'}
              onChange={(e) =>
                onChange({
                  response_data: {
                    value: e.target.checked ? 'checked' : 'unchecked',
                  } as CheckboxResponseData,
                })
              }
              disabled={disabled}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Label
              htmlFor={`checkbox-${response.id}`}
              className="text-base font-normal cursor-pointer"
            >
              {currentValue === 'checked' ? 'Checked' : 'Unchecked'}
            </Label>
          </div>
        )}
      </div>
    )
  }

  // Text input
  const renderTextInput = () => {
    const currentValue = (response.response_data as TextResponseData)?.value || ''
    const config = templateItem.config as any
    const isMultiline = config?.multiline
    const maxLength = config?.max_length
    const placeholder = config?.placeholder || 'Enter text...'

    const handleChange = (value: string) => {
      onChange({
        response_data: { value } as TextResponseData,
      })
    }

    if (isMultiline) {
      return (
        <div className="relative">
          <textarea
            value={currentValue}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={placeholder || 'Enter text (tap mic to dictate)'}
            maxLength={maxLength}
            disabled={disabled}
            rows={4}
            className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <div className="absolute right-2 top-2">
            <VoiceInputButton
              onTranscript={handleChange}
              currentValue={currentValue}
              mode="append"
              disabled={disabled}
            />
          </div>
        </div>
      )
    }

    return (
      <Input
        type="text"
        value={currentValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
      />
    )
  }

  // Number input
  const renderNumberInput = () => {
    const currentValue = (response.response_data as NumberResponseData)?.value || 0
    const config = templateItem.config as any
    const min = config?.min
    const max = config?.max
    const units = config?.units
    const decimalPlaces = config?.decimal_places || 0

    const handleChange = (value: number) => {
      onChange({
        response_data: {
          value,
          units,
        } as NumberResponseData,
      })
    }

    return (
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={currentValue}
          onChange={(e) => handleChange(parseFloat(e.target.value) || 0)}
          min={min}
          max={max}
          step={decimalPlaces > 0 ? 1 / Math.pow(10, decimalPlaces) : 1}
          disabled={disabled}
          className="max-w-xs"
        />
        {units && <span className="text-sm text-gray-600">{units}</span>}
      </div>
    )
  }

  // Photo input
  const renderPhotoInput = () => {
    const photoUrls = response.photo_urls || []
    const config = templateItem.config as any
    const minPhotos = config?.min_photos || 0
    const maxPhotos = config?.max_photos || 5

    // Extract checklist ID from response
    const checklistId = response.checklist_id

    const handlePhotosUpdated = (newPhotoUrls: string[]) => {
      onChange({ photo_urls: newPhotoUrls })
    }

    return (
      <div className="space-y-3">
        {photoUrls.length > 0 ? (
          <PhotoGallery
            photos={photoUrls}
            readOnly={disabled}
            maxPhotos={maxPhotos}
            minPhotos={minPhotos}
          />
        ) : (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Camera className="w-4 h-4" />
            <span>
              No photos yet
              {minPhotos > 0 && ` (minimum ${minPhotos} required)`}
            </span>
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={() => setPhotoDialogOpen(true)}
          disabled={disabled}
        >
          <Camera className="w-4 h-4 mr-2" />
          {photoUrls.length > 0 ? 'Manage Photos' : 'Add Photos'}
        </Button>

        {/* Photo Capture Dialog */}
        <PhotoCaptureDialog
          open={photoDialogOpen}
          onOpenChange={setPhotoDialogOpen}
          checklistId={checklistId}
          responseId={response.id}
          currentPhotos={photoUrls}
          minPhotos={minPhotos}
          maxPhotos={maxPhotos}
          onPhotosUpdated={handlePhotosUpdated}
          disabled={disabled}
        />
      </div>
    )
  }

  // Signature input
  const renderSignatureInput = () => {
    const signatureUrl = response.signature_url
    const config = templateItem.config as any
    const role = config?.role
    const title = config?.title

    // Extract checklist ID from response
    const checklistId = response.checklist_id

    const handleSignatureUpdated = (newSignatureUrl: string | null) => {
      onChange({ signature_url: newSignatureUrl })
    }

    return (
      <div className="space-y-3">
        {(role || title) && (
          <div className="text-sm text-gray-600">
            {role && <div>Role: {role}</div>}
            {title && <div>Title: {title}</div>}
          </div>
        )}

        {signatureUrl ? (
          <div className="border rounded-lg p-4 bg-gray-50">
            <img src={signatureUrl} alt="Signature" className="max-w-xs h-24 object-contain" />
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <PenTool className="w-8 h-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">No signature captured</p>
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={() => setSignatureDialogOpen(true)}
          disabled={disabled}
        >
          <PenTool className="w-4 h-4 mr-2" />
          {signatureUrl ? 'Update Signature' : 'Capture Signature'}
        </Button>

        {/* Signature Capture Dialog */}
        <SignatureCaptureDialog
          open={signatureDialogOpen}
          onOpenChange={setSignatureDialogOpen}
          checklistId={checklistId}
          responseId={response.id}
          currentSignature={signatureUrl}
          role={role}
          title={title}
          onSignatureUpdated={handleSignatureUpdated}
          disabled={disabled}
        />
      </div>
    )
  }

  return (
    <div className="border rounded-lg p-4 bg-white">
      {/* Item Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Label className="text-base font-medium">
              {templateItem.label}
              {templateItem.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Badge variant="outline" className="text-xs">
              {templateItem.item_type}
            </Badge>
          </div>
          {templateItem.description && (
            <p className="text-sm text-gray-600 mt-1">{templateItem.description}</p>
          )}
        </div>
      </div>

      {/* Item Input */}
      <div className="mb-3">{renderInput()}</div>

      {/* Notes Section with Voice Input */}
      <div>
        <Label htmlFor={`notes-${response.id}`} className="text-sm text-gray-700 mb-1">
          Notes (optional)
        </Label>
        <div className="relative">
          <textarea
            id={`notes-${response.id}`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="Add any additional notes (tap mic to dictate)..."
            rows={2}
            disabled={disabled}
            className="w-full px-3 py-2 pr-12 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <div className="absolute right-2 top-2">
            <VoiceInputButton
              onTranscript={(text) => {
                setNotes(text)
                // Trigger blur to save
                onChange({ notes: text.trim() || null })
              }}
              currentValue={notes}
              mode="append"
              disabled={disabled}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
