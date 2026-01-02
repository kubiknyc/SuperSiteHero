// File: /src/features/onboarding/components/OnboardingProvider.tsx
// Global context provider for onboarding state management

import React, { createContext, useContext, useEffect, useCallback, useState } from 'react'
import { useOnboardingStore, type UserRole, type FeatureTourId } from '../stores/onboardingStore'
import { getTourForPath, type FeatureTour } from '../data/tourSteps'
import { OnboardingWizard } from './OnboardingWizard'
import { FeatureTour as FeatureTourComponent } from './FeatureTour'
import { HelpPanelProvider, WhatsThisProvider } from './HelpPanel'

// Context value type
interface OnboardingContextValue {
  // Onboarding state
  isOnboardingComplete: boolean
  isOnboardingSkipped: boolean
  currentStep: string
  selectedRole: UserRole | null
  progress: number

  // Onboarding actions
  startOnboarding: () => void
  skipOnboarding: () => void
  resetOnboarding: () => void
  restartOnboarding: () => void

  // Feature tour state and actions
  activeTourId: FeatureTourId | null
  startTour: (tourId: FeatureTourId) => void
  stopTour: () => void
  isTourCompleted: (tourId: FeatureTourId) => boolean
  completedTours: FeatureTourId[]

  // Helper flags
  showOnboardingWizard: boolean
  shouldShowWelcome: boolean
  shouldShowReminder: boolean

  // UI controls
  openWizard: () => void
  closeWizard: () => void
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null)

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider')
  }
  return context
}

// Provider props
interface OnboardingProviderProps {
  children: React.ReactNode
  /** Auto-show wizard for new users */
  autoShowWizard?: boolean
  /** Auto-start tours when visiting pages */
  autoStartTours?: boolean
  /** Sync onboarding state to backend */
  syncToBackend?: boolean
  /** User ID for backend sync */
  userId?: string
}

export function OnboardingProvider({
  children,
  autoShowWizard = true,
  autoStartTours = true,
  syncToBackend = false,
  userId,
}: OnboardingProviderProps) {
  // Get store values and actions
  const {
    isOnboardingComplete,
    isOnboardingSkipped,
    currentStep,
    selectedRole,
    completedTours,
    showReminder,
    startOnboarding: storeStartOnboarding,
    skipOnboarding: storeSkipOnboarding,
    resetOnboarding: storeResetOnboarding,
    completeTour,
    isTourCompleted,
    getProgress,
    syncToSupabase,
    loadFromSupabase,
  } = useOnboardingStore()

  // Local state
  const [showWizard, setShowWizard] = useState(false)
  const [activeTourId, setActiveTourId] = useState<FeatureTourId | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)

  const progress = getProgress()

  // Determine if we should show the wizard
  const shouldShowWelcome = !isOnboardingComplete && !isOnboardingSkipped
  const shouldShowReminder = !isOnboardingComplete && isOnboardingSkipped && showReminder
  const showOnboardingWizard = showWizard || (autoShowWizard && shouldShowWelcome && hasInitialized)

  // Load from backend on mount
  useEffect(() => {
    if (syncToBackend && userId) {
      loadFromSupabase(userId).finally(() => {
        setHasInitialized(true)
      })
    } else {
      setHasInitialized(true)
    }
  }, [syncToBackend, userId, loadFromSupabase])

  // Sync to backend on changes
  useEffect(() => {
    if (syncToBackend && userId && hasInitialized) {
      syncToSupabase(userId)
    }
  }, [
    syncToBackend,
    userId,
    hasInitialized,
    isOnboardingComplete,
    isOnboardingSkipped,
    currentStep,
    selectedRole,
    completedTours,
    syncToSupabase,
  ])

  // Auto-start tour based on current path
  useEffect(() => {
    if (!autoStartTours || !isOnboardingComplete) return

    const path = window.location.pathname
    const tour = getTourForPath(path)

    if (tour && !isTourCompleted(tour.id) && tour.autoStart) {
      // Delay to allow page to render
      const timer = setTimeout(() => {
        setActiveTourId(tour.id)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [autoStartTours, isOnboardingComplete, isTourCompleted])

  // Actions
  const startOnboarding = useCallback(() => {
    storeStartOnboarding()
    setShowWizard(true)
  }, [storeStartOnboarding])

  const skipOnboarding = useCallback(() => {
    storeSkipOnboarding()
    setShowWizard(false)
  }, [storeSkipOnboarding])

  const resetOnboarding = useCallback(() => {
    storeResetOnboarding()
    setShowWizard(false)
  }, [storeResetOnboarding])

  const restartOnboarding = useCallback(() => {
    storeResetOnboarding()
    setShowWizard(true)
  }, [storeResetOnboarding])

  const startTour = useCallback((tourId: FeatureTourId) => {
    setActiveTourId(tourId)
  }, [])

  const stopTour = useCallback(() => {
    setActiveTourId(null)
  }, [])

  const openWizard = useCallback(() => {
    setShowWizard(true)
  }, [])

  const closeWizard = useCallback(() => {
    setShowWizard(false)
  }, [])

  const handleTourComplete = useCallback(() => {
    if (activeTourId) {
      completeTour(activeTourId)
    }
    setActiveTourId(null)
  }, [activeTourId, completeTour])

  const contextValue: OnboardingContextValue = {
    isOnboardingComplete,
    isOnboardingSkipped,
    currentStep,
    selectedRole,
    progress,
    startOnboarding,
    skipOnboarding,
    resetOnboarding,
    restartOnboarding,
    activeTourId,
    startTour,
    stopTour,
    isTourCompleted,
    completedTours,
    showOnboardingWizard,
    shouldShowWelcome,
    shouldShowReminder,
    openWizard,
    closeWizard,
  }

  return (
    <OnboardingContext.Provider value={contextValue}>
      <HelpPanelProvider>
        <WhatsThisProvider>
          {children}

          {/* Onboarding Wizard */}
          <OnboardingWizard
            open={showOnboardingWizard}
            onOpenChange={(open) => {
              if (!open) {
                closeWizard()
              }
            }}
            onComplete={closeWizard}
          />

          {/* Active Feature Tour */}
          {activeTourId && (
            <FeatureTourComponent
              tourId={activeTourId}
              onComplete={handleTourComplete}
              onSkip={stopTour}
            />
          )}
        </WhatsThisProvider>
      </HelpPanelProvider>
    </OnboardingContext.Provider>
  )
}

// Onboarding reminder banner
interface OnboardingReminderProps {
  className?: string
}

export function OnboardingReminder({ className }: OnboardingReminderProps) {
  const { shouldShowReminder, openWizard, skipOnboarding } = useOnboarding()
  const { dismissReminder } = useOnboardingStore()

  if (!shouldShowReminder) return null

  return (
    <div
      className={`flex items-center justify-between p-3 bg-primary/10 border-b border-primary/20 ${className || ''}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm">
          You haven't finished setting up JobSight.
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={openWizard}
          className="text-sm font-medium text-primary hover:underline"
        >
          Continue setup
        </button>
        <span className="text-muted-foreground">|</span>
        <button
          onClick={dismissReminder}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}

// Role-based feature gate
interface RoleGateProps {
  allowedRoles: UserRole[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function RoleGate({ allowedRoles, children, fallback = null }: RoleGateProps) {
  const { selectedRole } = useOnboarding()

  if (!selectedRole || !allowedRoles.includes(selectedRole)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// Show content only after onboarding is complete
interface OnboardingGateProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  requireComplete?: boolean
}

export function OnboardingGate({
  children,
  fallback = null,
  requireComplete = true,
}: OnboardingGateProps) {
  const { isOnboardingComplete, isOnboardingSkipped } = useOnboarding()

  if (requireComplete && !isOnboardingComplete && !isOnboardingSkipped) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

export default OnboardingProvider
