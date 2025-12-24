// File: /src/features/site-instructions/components/MobileAcknowledgmentForm.tsx
// Mobile-optimized acknowledgment form for QR code workflow
// Milestone 1.2: Site Instructions QR Code Workflow

import { useState, useRef, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import {
  Loader2,
  MapPin,
  CheckCircle2,
  AlertCircle,
  WifiOff,
  Clock,
  Building2,
  FileText,
  User,
} from 'lucide-react'
import { SignatureCanvas, type SignatureCanvasHandle } from './SignatureCanvas'
import { SiteInstructionStatusBadge } from './SiteInstructionStatusBadge'
import { SiteInstructionPriorityBadge } from './SiteInstructionPriorityBadge'
import { useCreateAcknowledgment } from '../hooks/useSiteInstructionAcknowledgment'
import { useAuth } from '@/lib/auth/AuthContext'
import { useToast } from '@/lib/notifications/ToastContext'
import { captureDeviceInfo } from '../store/offlineAcknowledgmentStore'
import type { SiteInstructionWithQR, GPSLocation } from '@/types/site-instruction-acknowledgment'
import { format, parseISO } from 'date-fns'

const acknowledgmentSchema = z.object({
  acknowledgerName: z.string().min(2, 'Please enter your full name'),
  notes: z.string().optional(),
  captureLocation: z.boolean().default(true),
})

type AcknowledgmentFormData = z.infer<typeof acknowledgmentSchema>

interface MobileAcknowledgmentFormProps {
  instruction: SiteInstructionWithQR
  onSuccess?: () => void
  isAnonymous?: boolean // For users without accounts (via QR code)
}

export function MobileAcknowledgmentForm({
  instruction,
  onSuccess,
  isAnonymous = false,
}: MobileAcknowledgmentFormProps) {
  const { user, userProfile } = useAuth()
  const { showToast } = useToast()
  const signatureRef = useRef<SignatureCanvasHandle>(null)
  const createAcknowledgment = useCreateAcknowledgment()

  const [hasSignature, setHasSignature] = useState(false)
  const [location, setLocation] = useState<GPSLocation | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [isCapturingLocation, setIsCapturingLocation] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AcknowledgmentFormData>({
    resolver: zodResolver(acknowledgmentSchema),
    defaultValues: {
      acknowledgerName: userProfile?.full_name || '',
      notes: '',
      captureLocation: true,
    },
  })

  const captureLocation = watch('captureLocation')

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Auto-populate name for logged-in users
  useEffect(() => {
    if (userProfile?.full_name) {
      setValue('acknowledgerName', userProfile.full_name)
    }
  }, [userProfile, setValue])

  // Capture GPS location
  const handleCaptureLocation = useCallback(async () => {
    if (!('geolocation' in navigator)) {
      setLocationError('Geolocation is not supported by your browser')
      return
    }

    setIsCapturingLocation(true)
    setLocationError(null)

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        })
      })

      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      })
    } catch (error) {
      const geoError = error as GeolocationPositionError
      switch (geoError.code) {
        case geoError.PERMISSION_DENIED:
          setLocationError('Location permission denied. Please enable location access.')
          break
        case geoError.POSITION_UNAVAILABLE:
          setLocationError('Location information is unavailable.')
          break
        case geoError.TIMEOUT:
          setLocationError('Location request timed out. Please try again.')
          break
        default:
          setLocationError('An error occurred while getting location.')
      }
    } finally {
      setIsCapturingLocation(false)
    }
  }, [])

  // Auto-capture location when enabled
  useEffect(() => {
    if (captureLocation && !location && !locationError) {
      handleCaptureLocation()
    }
  }, [captureLocation, location, locationError, handleCaptureLocation])

  const onSubmit = async (data: AcknowledgmentFormData) => {
    // Validate signature
    if (!hasSignature || signatureRef.current?.isEmpty()) {
      showToast({
        title: 'Signature Required',
        description: 'Please sign in the signature box to acknowledge this instruction.',
        type: 'error',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const signatureData = signatureRef.current?.getSignatureData()
      const deviceInfo = captureDeviceInfo()

      const acknowledgmentData = {
        site_instruction_id: instruction.id,
        acknowledged_by: isAnonymous ? undefined : user?.id,
        acknowledged_by_name: data.acknowledgerName,
        signature_data: signatureData || undefined,
        location_lat: location?.latitude,
        location_lng: location?.longitude,
        location_accuracy: location?.accuracy,
        notes: data.notes || undefined,
        device_info: deviceInfo,
        is_offline_submission: !isOnline,
        offline_submitted_at: !isOnline ? new Date().toISOString() : undefined,
      }

      await createAcknowledgment.mutateAsync(acknowledgmentData)

      setIsSuccess(true)
      showToast({
        title: isOnline ? 'Acknowledgment Submitted' : 'Acknowledgment Saved',
        description: isOnline
          ? 'Your acknowledgment has been recorded successfully.'
          : 'Your acknowledgment has been saved and will be synced when online.',
        type: 'success',
      })

      onSuccess?.()
    } catch (error) {
      showToast({
        title: 'Error',
        description: 'Failed to submit acknowledgment. Please try again.',
        type: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardContent className="py-12">
          <div className="flex flex-col items-center text-center">
            <CheckCircle2 className="h-16 w-16 text-success mb-4" />
            <h2 className="text-2xl font-semibold mb-2" className="heading-section">Thank You!</h2>
            <p className="text-muted-foreground mb-6">
              Your acknowledgment has been {isOnline ? 'recorded' : 'saved'} successfully.
            </p>
            {!isOnline && (
              <Alert className="mb-4">
                <WifiOff className="h-4 w-4" />
                <AlertDescription>
                  Your acknowledgment will be synced when you're back online.
                </AlertDescription>
              </Alert>
            )}
            <div className="text-sm text-muted-foreground">
              <p>Instruction: {instruction.title}</p>
              <p>Reference: {instruction.reference_number}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-8">
      {/* Offline indicator */}
      {!isOnline && (
        <Alert variant="default" className="bg-warning-light border-amber-200">
          <WifiOff className="h-4 w-4 text-warning" />
          <AlertDescription className="text-amber-800">
            You're offline. Your acknowledgment will be saved locally and synced when connected.
          </AlertDescription>
        </Alert>
      )}

      {/* Instruction Details Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <CardTitle className="text-lg leading-tight">{instruction.title}</CardTitle>
              {instruction.reference_number && (
                <CardDescription className="mt-1">
                  {instruction.reference_number}
                </CardDescription>
              )}
            </div>
            <div className="flex flex-col gap-1 items-end">
              {instruction.status && (
                <SiteInstructionStatusBadge status={instruction.status as any} />
              )}
              {instruction.priority && (
                <SiteInstructionPriorityBadge priority={instruction.priority as any} />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {instruction.description && (
            <div className="text-sm text-muted-foreground whitespace-pre-wrap">
              {instruction.description}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            {instruction.project?.name && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span className="truncate">{instruction.project.name}</span>
              </div>
            )}
            {instruction.due_date && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{format(parseISO(instruction.due_date), 'MMM d, yyyy')}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Acknowledgment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Acknowledge Receipt
          </CardTitle>
          <CardDescription>
            Please confirm your receipt and understanding of this site instruction.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="acknowledgerName" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Your Full Name *
              </Label>
              <Input
                id="acknowledgerName"
                placeholder="Enter your full name"
                {...register('acknowledgerName')}
                disabled={!isAnonymous && !!userProfile?.full_name}
              />
              {errors.acknowledgerName && (
                <p className="text-sm text-destructive">{errors.acknowledgerName.message}</p>
              )}
            </div>

            {/* Signature */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Signature *
              </Label>
              <SignatureCanvas
                ref={signatureRef}
                height={120}
                onSignatureChange={setHasSignature}
                className="w-full"
              />
              {!hasSignature && (
                <p className="text-xs text-muted-foreground">
                  Your signature is required to acknowledge this instruction.
                </p>
              )}
            </div>

            {/* Location Capture */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="captureLocation" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Capture Location
                </Label>
                <Switch
                  id="captureLocation"
                  checked={captureLocation}
                  onCheckedChange={(checked) => setValue('captureLocation', checked)}
                />
              </div>

              {captureLocation && (
                <div className="pl-6">
                  {isCapturingLocation ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Getting location...
                    </div>
                  ) : locationError ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-warning">
                        <AlertCircle className="h-4 w-4" />
                        {locationError}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCaptureLocation}
                      >
                        Try Again
                      </Button>
                    </div>
                  ) : location ? (
                    <div className="flex items-center gap-2 text-sm text-success">
                      <CheckCircle2 className="h-4 w-4" />
                      Location captured ({location.accuracy.toFixed(0)}m accuracy)
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any comments or questions about this instruction..."
                rows={3}
                {...register('notes')}
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 text-base"
              disabled={isSubmitting || !hasSignature}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  {isOnline ? 'Submit Acknowledgment' : 'Save Acknowledgment'}
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              By submitting, you confirm that you have read and understood this site instruction.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
