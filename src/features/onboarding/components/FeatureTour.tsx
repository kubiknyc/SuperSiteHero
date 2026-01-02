// File: /src/features/onboarding/components/FeatureTour.tsx
// Interactive feature tour with step-by-step highlights

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  ChevronLeft,
  ChevronRight,
  SkipForward,
  Play,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { useOnboardingStore, type FeatureTourId } from '../stores/onboardingStore'
import { getTourById, type TourStep, type HighlightPosition } from '../data/tourSteps'

interface FeatureTourProps {
  tourId: FeatureTourId
  onComplete?: () => void
  onSkip?: () => void
  autoStart?: boolean
}

interface TooltipPosition {
  top: number
  left: number
  arrowPosition: 'top' | 'bottom' | 'left' | 'right'
}

export function FeatureTour({
  tourId,
  onComplete,
  onSkip,
  autoStart = false,
}: FeatureTourProps) {
  const { completeTour, isTourCompleted, startTour } = useOnboardingStore()
  const [isActive, setIsActive] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [targetElement, setTargetElement] = useState<Element | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const tour = getTourById(tourId)
  const isCompleted = isTourCompleted(tourId)

  // Get current step
  const currentStep = tour?.steps[currentStepIndex]
  const totalSteps = tour?.steps.length || 0
  const progress = totalSteps > 0 ? ((currentStepIndex + 1) / totalSteps) * 100 : 0

  // Find target element
  useEffect(() => {
    if (!isActive || !currentStep) {
      setTargetElement(null)
      return
    }

    const findElement = () => {
      const element = document.querySelector(currentStep.targetSelector)
      if (element) {
        setTargetElement(element)
        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else {
        setTargetElement(null)
      }
    }

    // Try to find element after a short delay (for dynamic content)
    const delay = currentStep.delay || 100
    const timer = setTimeout(findElement, delay)

    return () => clearTimeout(timer)
  }, [isActive, currentStep])

  // Calculate tooltip position
  useEffect(() => {
    if (!targetElement || !currentStep) {
      setTooltipPosition(null)
      return
    }

    const calculatePosition = () => {
      const rect = targetElement.getBoundingClientRect()
      const tooltipWidth = 320
      const tooltipHeight = 200
      const padding = currentStep.spotlightPadding || 8
      const offset = 12

      let top = 0
      let left = 0
      let arrowPosition: TooltipPosition['arrowPosition'] = 'top'

      const position = currentStep.position

      switch (position) {
        case 'top':
          top = rect.top - tooltipHeight - offset
          left = rect.left + rect.width / 2 - tooltipWidth / 2
          arrowPosition = 'bottom'
          break
        case 'bottom':
          top = rect.bottom + offset
          left = rect.left + rect.width / 2 - tooltipWidth / 2
          arrowPosition = 'top'
          break
        case 'left':
          top = rect.top + rect.height / 2 - tooltipHeight / 2
          left = rect.left - tooltipWidth - offset
          arrowPosition = 'right'
          break
        case 'right':
          top = rect.top + rect.height / 2 - tooltipHeight / 2
          left = rect.right + offset
          arrowPosition = 'left'
          break
        case 'top-left':
          top = rect.top - tooltipHeight - offset
          left = rect.left
          arrowPosition = 'bottom'
          break
        case 'top-right':
          top = rect.top - tooltipHeight - offset
          left = rect.right - tooltipWidth
          arrowPosition = 'bottom'
          break
        case 'bottom-left':
          top = rect.bottom + offset
          left = rect.left
          arrowPosition = 'top'
          break
        case 'bottom-right':
          top = rect.bottom + offset
          left = rect.right - tooltipWidth
          arrowPosition = 'top'
          break
        case 'center':
          top = window.innerHeight / 2 - tooltipHeight / 2
          left = window.innerWidth / 2 - tooltipWidth / 2
          arrowPosition = 'top'
          break
      }

      // Keep tooltip within viewport
      if (left < 16) left = 16
      if (left + tooltipWidth > window.innerWidth - 16) {
        left = window.innerWidth - tooltipWidth - 16
      }
      if (top < 16) top = 16
      if (top + tooltipHeight > window.innerHeight - 16) {
        top = window.innerHeight - tooltipHeight - 16
      }

      setTooltipPosition({ top, left, arrowPosition })
    }

    calculatePosition()
    window.addEventListener('resize', calculatePosition)
    window.addEventListener('scroll', calculatePosition)

    return () => {
      window.removeEventListener('resize', calculatePosition)
      window.removeEventListener('scroll', calculatePosition)
    }
  }, [targetElement, currentStep])

  // Start tour
  const handleStart = useCallback(() => {
    if (!tour) return
    setIsActive(true)
    setCurrentStepIndex(0)
    startTour(tourId)
  }, [tour, tourId, startTour])

  // Auto-start if configured
  useEffect(() => {
    if (autoStart && tour && !isCompleted) {
      const timer = setTimeout(handleStart, 500)
      return () => clearTimeout(timer)
    }
  }, [autoStart, tour, isCompleted, handleStart])

  // Navigation
  const handleNext = useCallback(() => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(prev => prev + 1)
    } else {
      // Complete tour
      completeTour(tourId)
      setIsActive(false)
      onComplete?.()
    }
  }, [currentStepIndex, totalSteps, tourId, completeTour, onComplete])

  const handlePrevious = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1)
    }
  }, [currentStepIndex])

  const handleSkip = useCallback(() => {
    setIsActive(false)
    onSkip?.()
  }, [onSkip])

  const handleClose = useCallback(() => {
    setIsActive(false)
  }, [])

  // Render spotlight overlay and tooltip
  const renderTourOverlay = () => {
    if (!isActive || !currentStep) return null

    const spotlightRect = targetElement?.getBoundingClientRect()
    const padding = currentStep.spotlightPadding || 8

    return createPortal(
      <div className="fixed inset-0 z-[100]">
        {/* Overlay with spotlight cutout */}
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <mask id="spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {spotlightRect && (
                <rect
                  x={spotlightRect.left - padding}
                  y={spotlightRect.top - padding}
                  width={spotlightRect.width + padding * 2}
                  height={spotlightRect.height + padding * 2}
                  rx="8"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.6)"
            mask="url(#spotlight-mask)"
          />
        </svg>

        {/* Spotlight border */}
        {spotlightRect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute pointer-events-none"
            style={{
              top: spotlightRect.top - padding,
              left: spotlightRect.left - padding,
              width: spotlightRect.width + padding * 2,
              height: spotlightRect.height + padding * 2,
              borderRadius: 8,
              boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.5)',
            }}
          />
        )}

        {/* Tooltip */}
        <AnimatePresence mode="wait">
          {tooltipPosition && (
            <motion.div
              ref={tooltipRef}
              key={currentStep.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-10"
              style={{
                top: tooltipPosition.top,
                left: tooltipPosition.left,
                width: 320,
              }}
            >
              <Card className="shadow-xl border-2 border-primary/20">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base pr-6">
                      {currentStep.title}
                    </CardTitle>
                    <button
                      onClick={handleClose}
                      className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {currentStep.description}
                  </p>

                  {/* Video link if available */}
                  {currentStep.videoUrl && (
                    <a
                      href={currentStep.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Play className="w-4 h-4" />
                      Watch tutorial video
                    </a>
                  )}

                  {/* Progress and navigation */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Step {currentStepIndex + 1} of {totalSteps}</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-1" />

                    <div className="flex items-center justify-between pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSkip}
                        className="text-muted-foreground"
                      >
                        <SkipForward className="w-4 h-4 mr-1" />
                        Skip tour
                      </Button>

                      <div className="flex gap-2">
                        {currentStepIndex > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePrevious}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                        )}
                        <Button size="sm" onClick={handleNext}>
                          {currentStepIndex === totalSteps - 1 ? (
                            <>
                              <Check className="w-4 h-4 mr-1" />
                              Done
                            </>
                          ) : (
                            <>
                              Next
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>

                {/* Arrow */}
                <TooltipArrow position={tooltipPosition.arrowPosition} />
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Click blocker (allow clicking spotlight area) */}
        <div
          className="absolute inset-0"
          onClick={handleClose}
          style={{
            clipPath: spotlightRect
              ? `polygon(
                  0 0, 100% 0, 100% 100%, 0 100%, 0 0,
                  ${spotlightRect.left - 8}px ${spotlightRect.top - 8}px,
                  ${spotlightRect.left - 8}px ${spotlightRect.bottom + 8}px,
                  ${spotlightRect.right + 8}px ${spotlightRect.bottom + 8}px,
                  ${spotlightRect.right + 8}px ${spotlightRect.top - 8}px,
                  ${spotlightRect.left - 8}px ${spotlightRect.top - 8}px
                )`
              : undefined,
          }}
        />
      </div>,
      document.body
    )
  }

  // If tour doesn't exist, return null
  if (!tour) return null

  // If completed and not active, show restart button
  if (isCompleted && !isActive) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleStart}
        className="gap-2"
      >
        <Play className="w-4 h-4" />
        Replay {tour.name}
      </Button>
    )
  }

  // If not started yet, show start button
  if (!isActive) {
    return (
      <Button
        variant="default"
        size="sm"
        onClick={handleStart}
        className="gap-2"
      >
        <Play className="w-4 h-4" />
        Start {tour.name}
      </Button>
    )
  }

  // Render overlay
  return renderTourOverlay()
}

// Tooltip arrow component
function TooltipArrow({ position }: { position: 'top' | 'bottom' | 'left' | 'right' }) {
  const arrowStyles: Record<typeof position, React.CSSProperties> = {
    top: {
      top: -8,
      left: '50%',
      transform: 'translateX(-50%)',
      borderLeft: '8px solid transparent',
      borderRight: '8px solid transparent',
      borderBottom: '8px solid white',
    },
    bottom: {
      bottom: -8,
      left: '50%',
      transform: 'translateX(-50%)',
      borderLeft: '8px solid transparent',
      borderRight: '8px solid transparent',
      borderTop: '8px solid white',
    },
    left: {
      left: -8,
      top: '50%',
      transform: 'translateY(-50%)',
      borderTop: '8px solid transparent',
      borderBottom: '8px solid transparent',
      borderRight: '8px solid white',
    },
    right: {
      right: -8,
      top: '50%',
      transform: 'translateY(-50%)',
      borderTop: '8px solid transparent',
      borderBottom: '8px solid transparent',
      borderLeft: '8px solid white',
    },
  }

  return (
    <div
      className="absolute w-0 h-0"
      style={arrowStyles[position]}
    />
  )
}

// Tour list component to show all available tours
export function TourList() {
  const { completedTours } = useOnboardingStore()
  const [activeTourId, setActiveTourId] = useState<FeatureTourId | null>(null)

  const tours: { id: FeatureTourId; name: string }[] = [
    { id: 'dashboard', name: 'Dashboard Overview' },
    { id: 'projects', name: 'Projects Management' },
    { id: 'daily_reports', name: 'Daily Reports' },
    { id: 'rfis', name: 'RFIs' },
    { id: 'submittals', name: 'Submittals' },
    { id: 'tasks', name: 'Task Management' },
    { id: 'documents', name: 'Document Management' },
    { id: 'safety', name: 'Safety Management' },
    { id: 'punch_lists', name: 'Punch Lists' },
    { id: 'change_orders', name: 'Change Orders' },
  ]

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Feature Tours</h3>
      <div className="grid gap-3">
        {tours.map((tour) => {
          const isCompleted = completedTours.includes(tour.id)
          return (
            <div
              key={tour.id}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg border',
                isCompleted ? 'bg-primary/5 border-primary/20' : 'bg-card'
              )}
            >
              <div className="flex items-center gap-3">
                {isCompleted && (
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                )}
                <span className={cn(
                  'font-medium',
                  isCompleted && 'text-primary'
                )}>
                  {tour.name}
                </span>
              </div>
              <Button
                variant={isCompleted ? 'outline' : 'default'}
                size="sm"
                onClick={() => setActiveTourId(tour.id)}
              >
                {isCompleted ? 'Replay' : 'Start'}
              </Button>
            </div>
          )
        })}
      </div>

      {/* Active tour */}
      {activeTourId && (
        <FeatureTour
          tourId={activeTourId}
          onComplete={() => setActiveTourId(null)}
          onSkip={() => setActiveTourId(null)}
        />
      )}
    </div>
  )
}

export default FeatureTour
