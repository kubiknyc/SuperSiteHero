/**
 * DrawingPinOverlay Component
 *
 * Displays RFI and Submittal pins as clickable markers on drawings/documents.
 * Pins are positioned using normalized coordinates (0-1) and scale with container size.
 *
 * Features:
 * - RFI pins with priority-based colors
 * - Submittal pins with status-based colors
 * - Hover tooltips with entity details
 * - Click to navigate to RFI/Submittal detail
 * - Responsive positioning with zoom support
 * - Toggle visibility of pin types
 */

import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, FileQuestion, FileCheck, Eye, EyeOff, AlertCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useRFIsByDrawing, normalizedToPixel as rfiNormalizedToPixel } from '@/features/rfis/hooks/useRFIDrawingLinks'
import { useSubmittalsByDrawing, normalizedToPixel as submittalNormalizedToPixel } from '@/features/submittals/hooks/useSubmittalDrawingLinks'

// =============================================
// Types
// =============================================

interface DrawingPinOverlayProps {
  /** Document ID to fetch linked RFIs and Submittals */
  documentId: string
  /** Container width in pixels for coordinate calculation */
  containerWidth: number
  /** Container height in pixels for coordinate calculation */
  containerHeight: number
  /** Current zoom level (default: 100) */
  zoom?: number
  /** Show RFI pins (default: true) */
  showRFIs?: boolean
  /** Show Submittal pins (default: true) */
  showSubmittals?: boolean
  /** Enable adding new pins via click (requires onAddPin callback) */
  enableAddPin?: boolean
  /** Callback when user clicks to add a new pin */
  onAddPin?: (type: 'rfi' | 'submittal', normalizedX: number, normalizedY: number) => void
  /** Optional class name for the overlay container */
  className?: string
}

interface PinData {
  id: string
  type: 'rfi' | 'submittal'
  linkId: string
  x: number
  y: number
  color: string
  label: string | null
  number: string
  title: string
  status: string
  priority?: string
  dateRequired?: string | null
}

// =============================================
// Pin Color Helpers
// =============================================

function getRFIPinColor(priority: string): string {
  switch (priority) {
    case 'urgent':
      return '#DC2626' // Red-600
    case 'high':
      return '#F97316' // Orange-500
    case 'normal':
      return '#3B82F6' // Blue-500
    case 'low':
      return '#22C55E' // Green-500
    default:
      return '#EF4444' // Red-500 (default)
  }
}

function getSubmittalPinColor(status: string): string {
  switch (status) {
    case 'approved':
      return '#22C55E' // Green-500
    case 'approved_as_noted':
      return '#84CC16' // Lime-500
    case 'revise_resubmit':
      return '#F97316' // Orange-500
    case 'rejected':
      return '#EF4444' // Red-500
    case 'submitted':
    case 'under_review':
      return '#3B82F6' // Blue-500
    default:
      return '#8B5CF6' // Purple-500 (default for submittals)
  }
}

function getRFIStatusIcon(status: string) {
  switch (status) {
    case 'open':
      return <AlertCircle className="w-3 h-3" />
    case 'in_progress':
      return <AlertTriangle className="w-3 h-3" />
    case 'answered':
      return <CheckCircle className="w-3 h-3" />
    case 'closed':
      return <CheckCircle className="w-3 h-3" />
    default:
      return <Info className="w-3 h-3" />
  }
}

function getSubmittalStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    approved: 'Approved',
    approved_as_noted: 'Approved as Noted',
    revise_resubmit: 'Revise & Resubmit',
    rejected: 'Rejected',
    submitted: 'Submitted',
    under_review: 'Under Review',
    not_submitted: 'Not Submitted',
    void: 'Void',
  }
  return labels[status] || status.replace(/_/g, ' ')
}

// =============================================
// Pin Component
// =============================================

interface PinMarkerProps {
  pin: PinData
  onClick: () => void
}

function PinMarker({ pin, onClick }: PinMarkerProps) {
  const [isHovered, setIsHovered] = useState(false)

  const Icon = pin.type === 'rfi' ? FileQuestion : FileCheck

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={cn(
              'absolute transform -translate-x-1/2 -translate-y-full',
              'transition-all duration-150 ease-out',
              'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary',
              'cursor-pointer z-10',
              isHovered && 'scale-125 z-20'
            )}
            style={{
              left: pin.x,
              top: pin.y,
              filter: isHovered ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
            }}
            aria-label={`${pin.type === 'rfi' ? 'RFI' : 'Submittal'} ${pin.number}: ${pin.title}`}
          >
            {/* Pin shape with drop shadow */}
            <div className="relative">
              {/* Pin body */}
              <svg
                width="32"
                height="40"
                viewBox="0 0 32 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Pin shadow */}
                <ellipse
                  cx="16"
                  cy="38"
                  rx="6"
                  ry="2"
                  fill="rgba(0,0,0,0.2)"
                />
                {/* Pin body */}
                <path
                  d="M16 0C7.163 0 0 7.163 0 16c0 8.837 16 24 16 24s16-15.163 16-24C32 7.163 24.837 0 16 0z"
                  fill={pin.color}
                />
                {/* Pin highlight */}
                <path
                  d="M16 2C8.268 2 2 8.268 2 16c0 3.5 2 8 6 13"
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>

              {/* Icon in center */}
              <div
                className="absolute top-1.5 left-1/2 transform -translate-x-1/2 text-white"
              >
                <Icon className="w-4 h-4" />
              </div>

              {/* Label badge */}
              {pin.label && (
                <div
                  className="absolute -top-1 -right-1 bg-white text-gray-800 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2"
                  style={{ borderColor: pin.color }}
                >
                  {pin.label}
                </div>
              )}
            </div>
          </button>
        </TooltipTrigger>

        <TooltipContent
          side="top"
          className="max-w-xs p-3 bg-card"
          sideOffset={8}
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="text-xs font-mono"
                style={{ borderColor: pin.color, color: pin.color }}
              >
                {pin.type === 'rfi' ? 'RFI' : 'Submittal'} {pin.number}
              </Badge>
              {pin.type === 'rfi' && pin.priority && (
                <Badge
                  variant="outline"
                  className="text-xs capitalize"
                  style={{
                    borderColor: getRFIPinColor(pin.priority),
                    color: getRFIPinColor(pin.priority)
                  }}
                >
                  {pin.priority}
                </Badge>
              )}
            </div>

            <p className="font-medium text-sm line-clamp-2">{pin.title}</p>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {pin.type === 'rfi' ? (
                <>
                  {getRFIStatusIcon(pin.status)}
                  <span className="capitalize">{pin.status.replace(/_/g, ' ')}</span>
                </>
              ) : (
                <span>{getSubmittalStatusLabel(pin.status)}</span>
              )}

              {pin.dateRequired && (
                <>
                  <span className="text-muted">•</span>
                  <span>Due: {new Date(pin.dateRequired).toLocaleDateString()}</span>
                </>
              )}
            </div>

            <p className="text-xs text-primary">Click to view details</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// =============================================
// Main Component
// =============================================

export function DrawingPinOverlay({
  documentId,
  containerWidth,
  containerHeight,
  zoom = 100,
  showRFIs = true,
  showSubmittals = true,
  enableAddPin = false,
  onAddPin,
  className,
}: DrawingPinOverlayProps) {
  const navigate = useNavigate()
  const [rfiVisible, setRfiVisible] = useState(showRFIs)
  const [submittalVisible, setSubmittalVisible] = useState(showSubmittals)
  const [addPinMode, setAddPinMode] = useState<'rfi' | 'submittal' | null>(null)

  // Fetch linked RFIs and Submittals
  const { data: rfiLinks, isLoading: rfisLoading } = useRFIsByDrawing(documentId)
  const { data: submittalLinks, isLoading: submittalsLoading } = useSubmittalsByDrawing(documentId)

  // Scale factor for zoom
  const scale = zoom / 100

  // Transform linked data into pin data
  const pins = useMemo<PinData[]>(() => {
    const allPins: PinData[] = []

    // Add RFI pins
    if (rfiVisible && rfiLinks) {
      rfiLinks.forEach((link) => {
        if (link.pin_x === null || link.pin_y === null || !link.rfi) return

        const pixelPos = rfiNormalizedToPixel(
          link.pin_x,
          link.pin_y,
          containerWidth * scale,
          containerHeight * scale
        )

        allPins.push({
          id: link.rfi.id,
          type: 'rfi',
          linkId: link.id,
          x: pixelPos.x,
          y: pixelPos.y,
          color: link.pin_color || getRFIPinColor(link.rfi.priority || 'normal'),
          label: link.pin_label,
          number: String(link.rfi.rfi_number),
          title: link.rfi.subject,
          status: link.rfi.status,
          priority: link.rfi.priority,
          dateRequired: link.rfi.date_required,
        })
      })
    }

    // Add Submittal pins
    if (submittalVisible && submittalLinks) {
      submittalLinks.forEach((link) => {
        if (link.pin_x === null || link.pin_y === null || !link.submittal) return

        const pixelPos = submittalNormalizedToPixel(
          link.pin_x,
          link.pin_y,
          containerWidth * scale,
          containerHeight * scale
        )

        allPins.push({
          id: link.submittal.id,
          type: 'submittal',
          linkId: link.id,
          x: pixelPos.x,
          y: pixelPos.y,
          color: link.pin_color || getSubmittalPinColor(link.submittal.review_status || 'not_submitted'),
          label: link.pin_label,
          number: link.submittal.submittal_number?.toString() || 'N/A',
          title: link.submittal.title || `${link.submittal.spec_section} - ${link.submittal.spec_section_title}`,
          status: link.submittal.review_status || 'not_submitted',
          dateRequired: link.submittal.date_required,
        })
      })
    }

    return allPins
  }, [rfiLinks, submittalLinks, rfiVisible, submittalVisible, containerWidth, containerHeight, scale])

  // Handle pin click - navigate to detail page
  const handlePinClick = useCallback((pin: PinData) => {
    if (pin.type === 'rfi') {
      navigate(`/rfis/${pin.id}`)
    } else {
      navigate(`/submittals/${pin.id}`)
    }
  }, [navigate])

  // Handle overlay click for adding new pins
  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!enableAddPin || !addPinMode || !onAddPin) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / (containerWidth * scale)
    const y = (e.clientY - rect.top) / (containerHeight * scale)

    onAddPin(addPinMode, x, y)
    setAddPinMode(null)
  }, [enableAddPin, addPinMode, onAddPin, containerWidth, containerHeight, scale])

  const isLoading = rfisLoading || submittalsLoading
  const totalPins = pins.length
  const rfiCount = pins.filter(p => p.type === 'rfi').length
  const submittalCount = pins.filter(p => p.type === 'submittal').length

  return (
    <div
      className={cn(
        'absolute inset-0 pointer-events-none',
        addPinMode && 'cursor-crosshair',
        className
      )}
    >
      {/* Pin markers layer - allow pointer events on pins */}
      <div
        className={cn(
          'absolute inset-0',
          addPinMode ? 'pointer-events-auto' : 'pointer-events-none'
        )}
        onClick={handleOverlayClick}
      >
        {!isLoading && pins.map((pin) => (
          <div key={`${pin.type}-${pin.linkId}`} className="pointer-events-auto">
            <PinMarker
              pin={pin}
              onClick={() => handlePinClick(pin)}
            />
          </div>
        ))}
      </div>

      {/* Controls panel */}
      <div className="absolute top-2 right-2 pointer-events-auto z-30">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              className="shadow-lg gap-2"
            >
              <MapPin className="w-4 h-4" />
              {isLoading ? (
                <span className="text-xs">Loading...</span>
              ) : (
                <span className="text-xs">{totalPins} pins</span>
              )}
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-64" align="end">
            <div className="space-y-4">
              <div className="font-medium text-sm">Drawing Pins</div>

              {/* RFI Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileQuestion className="w-4 h-4 text-red-500" />
                  <span className="text-sm">RFIs</span>
                  <Badge variant="secondary" className="text-xs">
                    {rfiCount}
                  </Badge>
                </div>
                <Switch
                  checked={rfiVisible}
                  onCheckedChange={setRfiVisible}
                  aria-label="Toggle RFI pins"
                />
              </div>

              {/* Submittal Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-purple-500" />
                  <span className="text-sm">Submittals</span>
                  <Badge variant="secondary" className="text-xs">
                    {submittalCount}
                  </Badge>
                </div>
                <Switch
                  checked={submittalVisible}
                  onCheckedChange={setSubmittalVisible}
                  aria-label="Toggle Submittal pins"
                />
              </div>

              {/* Add Pin Controls */}
              {enableAddPin && onAddPin && (
                <>
                  <hr className="border-border" />
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">Add new pin:</div>
                    <div className="flex gap-2">
                      <Button
                        variant={addPinMode === 'rfi' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAddPinMode(addPinMode === 'rfi' ? null : 'rfi')}
                        className="flex-1"
                      >
                        <FileQuestion className="w-3 h-3 mr-1" />
                        RFI
                      </Button>
                      <Button
                        variant={addPinMode === 'submittal' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAddPinMode(addPinMode === 'submittal' ? null : 'submittal')}
                        className="flex-1"
                      >
                        <FileCheck className="w-3 h-3 mr-1" />
                        Submittal
                      </Button>
                    </div>
                    {addPinMode && (
                      <p className="text-xs text-muted-foreground">
                        Click on the drawing to place a {addPinMode === 'rfi' ? 'RFI' : 'Submittal'} pin
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Legend */}
              <hr className="border-border" />
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Legend:</div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-600" />
                    <span>Urgent/Rejected</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                    <span>High/Revise</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span>Normal/Review</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span>Low/Approved</span>
                  </div>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Add pin mode indicator */}
      {addPinMode && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 pointer-events-auto z-30">
          <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <MapPin className="w-4 h-4 animate-pulse" />
            <span className="text-sm font-medium">
              Click to place {addPinMode === 'rfi' ? 'RFI' : 'Submittal'} pin
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAddPinMode(null)}
              className="ml-2 h-6 px-2 text-primary-foreground hover:bg-primary-foreground/20"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DrawingPinOverlay
