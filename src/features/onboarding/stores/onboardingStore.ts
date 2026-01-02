// File: /src/features/onboarding/stores/onboardingStore.ts
// Zustand store for onboarding state management with localStorage persistence

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/utils/logger'

/**
 * User role types for onboarding
 */
export type UserRole =
  | 'superintendent'
  | 'project_manager'
  | 'estimator'
  | 'safety_manager'
  | 'executive'
  | 'subcontractor'
  | 'owner_rep'
  | 'other'

/**
 * Onboarding step identifiers
 */
export type OnboardingStep =
  | 'welcome'
  | 'company_setup'
  | 'first_project'
  | 'team_invite'
  | 'feature_tour'
  | 'complete'

/**
 * Feature tour identifiers
 */
export type FeatureTourId =
  | 'dashboard'
  | 'projects'
  | 'daily_reports'
  | 'rfis'
  | 'submittals'
  | 'tasks'
  | 'documents'
  | 'safety'
  | 'punch_lists'
  | 'change_orders'

/**
 * Company profile data
 */
export interface CompanyProfile {
  name: string
  address?: string
  phone?: string
  website?: string
  logoUrl?: string
  industry?: string
  size?: 'small' | 'medium' | 'large' | 'enterprise'
}

/**
 * Team member invitation
 */
export interface TeamInvitation {
  email: string
  name?: string
  role: UserRole
  sent: boolean
  sentAt?: string
}

/**
 * Onboarding progress state
 */
export interface OnboardingState {
  // Overall onboarding status
  isOnboardingComplete: boolean
  isOnboardingSkipped: boolean
  showReminder: boolean
  reminderDismissedAt: string | null

  // Current step tracking
  currentStep: OnboardingStep
  completedSteps: OnboardingStep[]

  // User selections
  selectedRole: UserRole | null

  // Company setup
  companyProfile: CompanyProfile | null

  // First project created
  firstProjectId: string | null

  // Team invitations
  teamInvitations: TeamInvitation[]

  // Feature tours completed
  completedTours: FeatureTourId[]

  // Timestamps
  startedAt: string | null
  completedAt: string | null
  lastUpdatedAt: string | null
}

/**
 * Onboarding store actions
 */
export interface OnboardingActions {
  // Step navigation
  setCurrentStep: (step: OnboardingStep) => void
  completeStep: (step: OnboardingStep) => void
  goToNextStep: () => void
  goToPreviousStep: () => void

  // Role selection
  setSelectedRole: (role: UserRole) => void

  // Company setup
  setCompanyProfile: (profile: CompanyProfile) => void

  // First project
  setFirstProjectId: (projectId: string) => void

  // Team invitations
  addTeamInvitation: (invitation: Omit<TeamInvitation, 'sent'>) => void
  markInvitationSent: (email: string) => void
  removeTeamInvitation: (email: string) => void

  // Feature tours
  startTour: (tourId: FeatureTourId) => void
  completeTour: (tourId: FeatureTourId) => void
  isTourCompleted: (tourId: FeatureTourId) => boolean

  // Onboarding management
  startOnboarding: () => void
  skipOnboarding: () => void
  completeOnboarding: () => void
  resetOnboarding: () => void
  dismissReminder: () => void
  showReminderAgain: () => void

  // Progress calculations
  getProgress: () => number
  getCompletedStepsCount: () => number
  getTotalStepsCount: () => number

  // Sync to Supabase
  syncToSupabase: (userId: string) => Promise<void>
  loadFromSupabase: (userId: string) => Promise<void>
}

const STEP_ORDER: OnboardingStep[] = [
  'welcome',
  'company_setup',
  'first_project',
  'team_invite',
  'feature_tour',
  'complete'
]

const initialState: OnboardingState = {
  isOnboardingComplete: false,
  isOnboardingSkipped: false,
  showReminder: true,
  reminderDismissedAt: null,
  currentStep: 'welcome',
  completedSteps: [],
  selectedRole: null,
  companyProfile: null,
  firstProjectId: null,
  teamInvitations: [],
  completedTours: [],
  startedAt: null,
  completedAt: null,
  lastUpdatedAt: null
}

export const useOnboardingStore = create<OnboardingState & OnboardingActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Step navigation
      setCurrentStep: (step) => {
        set({
          currentStep: step,
          lastUpdatedAt: new Date().toISOString()
        })
      },

      completeStep: (step) => {
        const { completedSteps } = get()
        if (!completedSteps.includes(step)) {
          set({
            completedSteps: [...completedSteps, step],
            lastUpdatedAt: new Date().toISOString()
          })
        }
      },

      goToNextStep: () => {
        const { currentStep, completedSteps } = get()
        const currentIndex = STEP_ORDER.indexOf(currentStep)

        if (currentIndex < STEP_ORDER.length - 1) {
          const nextStep = STEP_ORDER[currentIndex + 1]

          // Complete current step if not already completed
          if (!completedSteps.includes(currentStep)) {
            set({
              completedSteps: [...completedSteps, currentStep],
              currentStep: nextStep,
              lastUpdatedAt: new Date().toISOString()
            })
          } else {
            set({
              currentStep: nextStep,
              lastUpdatedAt: new Date().toISOString()
            })
          }
        }
      },

      goToPreviousStep: () => {
        const { currentStep } = get()
        const currentIndex = STEP_ORDER.indexOf(currentStep)

        if (currentIndex > 0) {
          set({
            currentStep: STEP_ORDER[currentIndex - 1],
            lastUpdatedAt: new Date().toISOString()
          })
        }
      },

      // Role selection
      setSelectedRole: (role) => {
        set({
          selectedRole: role,
          lastUpdatedAt: new Date().toISOString()
        })
      },

      // Company setup
      setCompanyProfile: (profile) => {
        set({
          companyProfile: profile,
          lastUpdatedAt: new Date().toISOString()
        })
      },

      // First project
      setFirstProjectId: (projectId) => {
        set({
          firstProjectId: projectId,
          lastUpdatedAt: new Date().toISOString()
        })
      },

      // Team invitations
      addTeamInvitation: (invitation) => {
        const { teamInvitations } = get()
        const exists = teamInvitations.find(i => i.email === invitation.email)

        if (!exists) {
          set({
            teamInvitations: [
              ...teamInvitations,
              { ...invitation, sent: false }
            ],
            lastUpdatedAt: new Date().toISOString()
          })
        }
      },

      markInvitationSent: (email) => {
        const { teamInvitations } = get()
        set({
          teamInvitations: teamInvitations.map(i =>
            i.email === email
              ? { ...i, sent: true, sentAt: new Date().toISOString() }
              : i
          ),
          lastUpdatedAt: new Date().toISOString()
        })
      },

      removeTeamInvitation: (email) => {
        const { teamInvitations } = get()
        set({
          teamInvitations: teamInvitations.filter(i => i.email !== email),
          lastUpdatedAt: new Date().toISOString()
        })
      },

      // Feature tours
      startTour: (_tourId) => {
        // Could be used for analytics/tracking
        logger.log(`Starting tour: ${_tourId}`)
      },

      completeTour: (tourId) => {
        const { completedTours } = get()
        if (!completedTours.includes(tourId)) {
          set({
            completedTours: [...completedTours, tourId],
            lastUpdatedAt: new Date().toISOString()
          })
        }
      },

      isTourCompleted: (tourId) => {
        const { completedTours } = get()
        return completedTours.includes(tourId)
      },

      // Onboarding management
      startOnboarding: () => {
        set({
          ...initialState,
          startedAt: new Date().toISOString(),
          lastUpdatedAt: new Date().toISOString()
        })
      },

      skipOnboarding: () => {
        set({
          isOnboardingSkipped: true,
          showReminder: true,
          lastUpdatedAt: new Date().toISOString()
        })
      },

      completeOnboarding: () => {
        const { completedSteps } = get()
        set({
          isOnboardingComplete: true,
          currentStep: 'complete',
          completedSteps: [...new Set([...completedSteps, 'complete'])],
          completedAt: new Date().toISOString(),
          lastUpdatedAt: new Date().toISOString(),
          showReminder: false
        })
      },

      resetOnboarding: () => {
        set({
          ...initialState,
          lastUpdatedAt: new Date().toISOString()
        })
      },

      dismissReminder: () => {
        set({
          showReminder: false,
          reminderDismissedAt: new Date().toISOString(),
          lastUpdatedAt: new Date().toISOString()
        })
      },

      showReminderAgain: () => {
        set({
          showReminder: true,
          lastUpdatedAt: new Date().toISOString()
        })
      },

      // Progress calculations
      getProgress: () => {
        const { completedSteps } = get()
        const totalSteps = STEP_ORDER.length - 1 // Exclude 'complete' from count
        return Math.round((completedSteps.length / totalSteps) * 100)
      },

      getCompletedStepsCount: () => {
        const { completedSteps } = get()
        return completedSteps.filter(s => s !== 'complete').length
      },

      getTotalStepsCount: () => {
        return STEP_ORDER.length - 1 // Exclude 'complete'
      },

      // Sync to Supabase
      syncToSupabase: async (userId: string) => {
        const state = get()

        try {
          const onboardingData = {
            is_onboarding_complete: state.isOnboardingComplete,
            is_onboarding_skipped: state.isOnboardingSkipped,
            onboarding_current_step: state.currentStep,
            onboarding_completed_steps: state.completedSteps,
            onboarding_selected_role: state.selectedRole,
            onboarding_company_profile: state.companyProfile,
            onboarding_first_project_id: state.firstProjectId,
            onboarding_team_invitations: state.teamInvitations,
            onboarding_completed_tours: state.completedTours,
            onboarding_started_at: state.startedAt,
            onboarding_completed_at: state.completedAt
          }

          const { error } = await supabase
            .from('profiles')
            .update(onboardingData)
            .eq('id', userId)

          if (error) {
            logger.error('Failed to sync onboarding to Supabase:', error)
          } else {
            logger.log('Onboarding synced to Supabase')
          }
        } catch (error) {
          logger.error('Error syncing onboarding to Supabase:', error)
        }
      },

      loadFromSupabase: async (userId: string) => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select(`
              is_onboarding_complete,
              is_onboarding_skipped,
              onboarding_current_step,
              onboarding_completed_steps,
              onboarding_selected_role,
              onboarding_company_profile,
              onboarding_first_project_id,
              onboarding_team_invitations,
              onboarding_completed_tours,
              onboarding_started_at,
              onboarding_completed_at
            `)
            .eq('id', userId)
            .single()

          if (error) {
            // Profile might not have onboarding columns yet, which is fine
            logger.warn('Could not load onboarding from Supabase:', error.message)
            return
          }

          if (data) {
            set({
              isOnboardingComplete: data.is_onboarding_complete ?? false,
              isOnboardingSkipped: data.is_onboarding_skipped ?? false,
              currentStep: (data.onboarding_current_step as OnboardingStep) ?? 'welcome',
              completedSteps: (data.onboarding_completed_steps as OnboardingStep[]) ?? [],
              selectedRole: (data.onboarding_selected_role as UserRole) ?? null,
              companyProfile: data.onboarding_company_profile as CompanyProfile | null,
              firstProjectId: data.onboarding_first_project_id ?? null,
              teamInvitations: (data.onboarding_team_invitations as TeamInvitation[]) ?? [],
              completedTours: (data.onboarding_completed_tours as FeatureTourId[]) ?? [],
              startedAt: data.onboarding_started_at ?? null,
              completedAt: data.onboarding_completed_at ?? null,
              lastUpdatedAt: new Date().toISOString()
            })
            logger.log('Onboarding loaded from Supabase')
          }
        } catch (error) {
          logger.error('Error loading onboarding from Supabase:', error)
        }
      }
    }),
    {
      name: 'jobsight-onboarding',
      partialize: (state) => ({
        isOnboardingComplete: state.isOnboardingComplete,
        isOnboardingSkipped: state.isOnboardingSkipped,
        showReminder: state.showReminder,
        reminderDismissedAt: state.reminderDismissedAt,
        currentStep: state.currentStep,
        completedSteps: state.completedSteps,
        selectedRole: state.selectedRole,
        companyProfile: state.companyProfile,
        firstProjectId: state.firstProjectId,
        teamInvitations: state.teamInvitations,
        completedTours: state.completedTours,
        startedAt: state.startedAt,
        completedAt: state.completedAt,
        lastUpdatedAt: state.lastUpdatedAt
      })
    }
  )
)

// Selector hooks for common state access patterns
export function useIsOnboardingComplete(): boolean {
  return useOnboardingStore((state) => state.isOnboardingComplete)
}

export function useCurrentOnboardingStep(): OnboardingStep {
  return useOnboardingStore((state) => state.currentStep)
}

export function useOnboardingProgress(): number {
  return useOnboardingStore((state) => state.getProgress())
}

export function useShouldShowOnboarding(): boolean {
  return useOnboardingStore((state) =>
    !state.isOnboardingComplete && !state.isOnboardingSkipped
  )
}

export function useShouldShowReminder(): boolean {
  return useOnboardingStore((state) =>
    !state.isOnboardingComplete && state.isOnboardingSkipped && state.showReminder
  )
}
