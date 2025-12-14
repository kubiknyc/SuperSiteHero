/**
 * Safety Observation Form Component
 *
 * Mobile-friendly form for field teams to submit safety observations.
 * Supports safe behaviors, unsafe conditions, near-misses, and best practices.
 */

import React, { useState, useCallback, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCreateObservation } from '../hooks/useSafetyObservations'
import {
  OBSERVATION_TYPE_CONFIG,
  CATEGORY_CONFIG,
  SEVERITY_CONFIG,
  isPositiveObservation,
  requiresCorrectiveAction,
  SafetyObservationType,
  SafetyObservationCategory,
  ObservationSeverity,
} from '@/types/safety-observations'
import {
  ThumbsUp,
  AlertTriangle,
  AlertCircle,
  Award,
  Camera,
  MapPin,
  X,
  Upload,
  Loader2,
  Check,
} from 'lucide-react'

// Form validation schema
const observationSchema = z.object({
  observation_type: z.enum(['safe_behavior', 'unsafe_condition', 'near_miss', 'best_practice']),
  category: z.enum([
    'ppe',
    'housekeeping',
    'equipment',
    'procedures',
    'ergonomics',
    'fall_protection',
    'electrical',
    'excavation',
    'confined_space',
    'fire_prevention',
    'traffic_control',
    'chemical_handling',
    'communication',
    'training',
    'leadership',
    'other',
  ]),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  location: z.string().optional(),
  corrective_action: z.string().optional(),
  recognized_person: z.string().optional(),
  recognized_company: z.string().optional(),
  recognition_message: z.string().optional(),
  weather_conditions: z.string().optional(),
  shift: z.string().optional(),
  work_area: z.string().optional(),
})

type ObservationFormData = z.infer<typeof observationSchema>

interface SafetyObservationFormProps {
  projectId: string
  companyId: string
  onSuccess?: () => void
  onCancel?: () => void
  className?: string
}

const TYPE_ICONS: Record<SafetyObservationType, React.ComponentType<{ className?: string }>> = {
  safe_behavior: ThumbsUp,
  unsafe_condition: AlertTriangle,
  near_miss: AlertCircle,
  best_practice: Award,
}

export function SafetyObservationForm({
  projectId,
  companyId,
  onSuccess,
  onCancel,
  className,
}: SafetyObservationFormProps) {
  const [photos, setPhotos] = useState<File[]>([])
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [locationCoordinates, setLocationCoordinates] = useState<{ lat: number; lng: number } | null>(null)

  const createObservation = useCreateObservation()

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ObservationFormData>({
    resolver: zodResolver(observationSchema),
    defaultValues: {
      observation_type: 'safe_behavior',
      category: 'ppe',
      severity: 'low',
    },
  })

  const observationType = watch('observation_type')
  const isPositive = isPositiveObservation(observationType)
  const needsAction = requiresCorrectiveAction(observationType)

  // Get current location
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      return
    }

    setIsGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationCoordinates({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setIsGettingLocation(false)
      },
      () => {
        setIsGettingLocation(false)
      },
      { enableHighAccuracy: true }
    )
  }, [])

  // Handle photo selection
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setPhotos((prev) => [...prev, ...files])
      // Create preview URLs
      files.forEach((file) => {
        const url = URL.createObjectURL(file)
        setPhotoUrls((prev) => [...prev, url])
      })
    }
  }

  // Remove a photo
  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoUrls[index])
    setPhotos((prev) => prev.filter((_, i) => i !== index))
    setPhotoUrls((prev) => prev.filter((_, i) => i !== index))
  }

  // Clean up preview URLs on unmount
  useEffect(() => {
    return () => {
      photoUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  const onSubmit = async (data: ObservationFormData) => {
    try {
      // For now, we'll upload photos after creating the observation
      // In production, you'd upload to storage first and get URLs
      const photoUrlsToSave: string[] = []

      await createObservation.mutateAsync({
        project_id: projectId,
        company_id: companyId,
        observation_type: data.observation_type,
        category: data.category,
        severity: data.severity || 'low',
        title: data.title,
        description: data.description,
        location: data.location || null,
        location_coordinates: locationCoordinates,
        photo_urls: photoUrlsToSave,
        corrective_action: data.corrective_action || null,
        recognized_person: data.recognized_person || null,
        recognized_company: data.recognized_company || null,
        recognition_message: data.recognition_message || null,
        weather_conditions: data.weather_conditions || null,
        shift: data.shift || null,
        work_area: data.work_area || null,
      })

      onSuccess?.()
    } catch (error) {
      // Error is handled by the mutation
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={cn('space-y-6', className)}>
      {/* Observation Type Selection */}
      <div className="space-y-3">
        <Label className="text-base font-medium">What type of observation?</Label>
        <Controller
          name="observation_type"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-2 gap-3">
              {(Object.entries(OBSERVATION_TYPE_CONFIG) as [SafetyObservationType, typeof OBSERVATION_TYPE_CONFIG[SafetyObservationType]][]).map(
                ([type, config]) => {
                  const Icon = TYPE_ICONS[type]
                  const isSelected = field.value === type

                  const colorClasses: Record<string, string> = {
                    green: 'border-green-500 bg-green-50 text-green-700',
                    yellow: 'border-yellow-500 bg-yellow-50 text-yellow-700',
                    orange: 'border-orange-500 bg-orange-50 text-orange-700',
                    blue: 'border-blue-500 bg-blue-50 text-blue-700',
                  }

                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => field.onChange(type)}
                      className={cn(
                        'flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all',
                        isSelected
                          ? colorClasses[config.color]
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      )}
                    >
                      <Icon className="h-6 w-6 mb-2" />
                      <span className="text-sm font-medium">{config.label}</span>
                    </button>
                  )
                }
              )}
            </div>
          )}
        />
      </div>

      {/* Category Selection */}
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Controller
          name="category"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(CATEGORY_CONFIG) as [SafetyObservationCategory, typeof CATEGORY_CONFIG[SafetyObservationCategory]][]).map(
                  ([cat, config]) => (
                    <SelectItem key={cat} value={cat}>
                      {config.label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Severity (for unsafe conditions and near misses) */}
      {needsAction && (
        <div className="space-y-2">
          <Label htmlFor="severity">Severity</Label>
          <Controller
            name="severity"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(SEVERITY_CONFIG) as [ObservationSeverity, typeof SEVERITY_CONFIG[ObservationSeverity]][]).map(
                    ([sev, config]) => (
                      <SelectItem key={sev} value={sev}>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn('w-2 h-2 rounded-full', {
                              'bg-gray-400': config.color === 'gray',
                              'bg-yellow-500': config.color === 'yellow',
                              'bg-orange-500': config.color === 'orange',
                              'bg-red-500': config.color === 'red',
                            })}
                          />
                          {config.label}
                        </div>
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      )}

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          {...register('title')}
          placeholder={
            isPositive
              ? 'e.g., Worker properly using fall protection'
              : 'e.g., Exposed electrical wiring in break room'
          }
        />
        {errors.title && (
          <p className="text-sm text-red-500">{errors.title.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...register('description')}
          rows={4}
          placeholder={
            isPositive
              ? 'Describe the safe behavior or best practice you observed...'
              : 'Describe the unsafe condition or near-miss in detail...'
          }
        />
        {errors.description && (
          <p className="text-sm text-red-500">{errors.description.message}</p>
        )}
      </div>

      {/* Location with GPS */}
      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <div className="flex gap-2">
          <Input
            id="location"
            {...register('location')}
            placeholder="e.g., Building A, Floor 3, Near elevator"
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={getCurrentLocation}
            disabled={isGettingLocation}
          >
            {isGettingLocation ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : locationCoordinates ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <MapPin className="h-4 w-4" />
            )}
          </Button>
        </div>
        {locationCoordinates && (
          <p className="text-xs text-gray-500">
            GPS: {locationCoordinates.lat.toFixed(6)}, {locationCoordinates.lng.toFixed(6)}
          </p>
        )}
      </div>

      {/* Recognition Fields (for positive observations) */}
      {isPositive && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-green-800">Recognition Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="recognized_person">Person Being Recognized</Label>
                <Input
                  id="recognized_person"
                  {...register('recognized_person')}
                  placeholder="Name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recognized_company">Their Company</Label>
                <Input
                  id="recognized_company"
                  {...register('recognized_company')}
                  placeholder="Company name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recognition_message">Recognition Message</Label>
              <Textarea
                id="recognition_message"
                {...register('recognition_message')}
                rows={2}
                placeholder="Write a message to recognize their safe behavior..."
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Corrective Action (for unsafe conditions) */}
      {needsAction && (
        <div className="space-y-2">
          <Label htmlFor="corrective_action">Suggested Corrective Action</Label>
          <Textarea
            id="corrective_action"
            {...register('corrective_action')}
            rows={3}
            placeholder="What should be done to address this hazard?"
          />
        </div>
      )}

      {/* Photo Attachments */}
      <div className="space-y-3">
        <Label>Photo Evidence</Label>
        <div className="flex flex-wrap gap-3">
          {photoUrls.map((url, index) => (
            <div key={index} className="relative group">
              <img
                src={url}
                alt={`Photo ${index + 1}`}
                className="w-20 h-20 object-cover rounded-lg border"
              />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors">
            <Camera className="h-6 w-6 text-gray-400" />
            <span className="text-xs text-gray-500 mt-1">Add Photo</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              className="hidden"
              multiple
            />
          </label>
        </div>
        <p className="text-xs text-gray-500">
          Adding photos earns bonus points!
        </p>
      </div>

      {/* Additional Details (collapsible) */}
      <details className="space-y-4">
        <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
          Additional Details (optional)
        </summary>
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="shift">Shift</Label>
              <Select
                value={watch('shift') || ''}
                onValueChange={(value) => setValue('shift', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select shift" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day Shift</SelectItem>
                  <SelectItem value="night">Night Shift</SelectItem>
                  <SelectItem value="swing">Swing Shift</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="weather_conditions">Weather</Label>
              <Input
                id="weather_conditions"
                {...register('weather_conditions')}
                placeholder="e.g., Sunny, 75F"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="work_area">Work Area / Trade</Label>
            <Input
              id="work_area"
              {...register('work_area')}
              placeholder="e.g., Electrical, Framing, HVAC"
            />
          </div>
        </div>
      </details>

      {/* Points Preview */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">Estimated points for this observation:</span>
            <span className="text-lg font-bold text-blue-600">
              {OBSERVATION_TYPE_CONFIG[observationType].pointsBase}
              {photoUrls.length > 0 && ' + 5'}
              {needsAction && watch('corrective_action') && ' + 10'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex gap-3 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting || createObservation.isPending}
          className={cn('flex-1', isPositive ? 'bg-green-600 hover:bg-green-700' : '')}
        >
          {isSubmitting || createObservation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Submit Observation
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

export default SafetyObservationForm
