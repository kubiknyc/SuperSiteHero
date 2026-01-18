// File: /src/features/onboarding/stores/__tests__/onboardingStore.test.ts
// Comprehensive unit tests for the onboardingStore Zustand store

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Mock dependencies BEFORE importing the store
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))
    }))
  }
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

// Import after mocks are set up
import { renderHook, act } from '@testing-library/react'
import {
  useOnboardingStore,
  useIsOnboardingComplete,
  useCurrentOnboardingStep,
  useOnboardingProgress,
  useShouldShowOnboarding,
  useShouldShowReminder,
  type UserRole,
  type OnboardingStep,
  type FeatureTourId,
  type CompanyProfile,
  type TeamInvitation
} from '../onboardingStore'

describe('onboardingStore', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()

    // Reset store to initial state
    const { result } = renderHook(() => useOnboardingStore())
    act(() => {
      result.current.resetOnboarding()
    })

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useOnboardingStore())

      expect(result.current.isOnboardingComplete).toBe(false)
      expect(result.current.isOnboardingSkipped).toBe(false)
      expect(result.current.showReminder).toBe(true)
      expect(result.current.reminderDismissedAt).toBeNull()
      expect(result.current.currentStep).toBe('welcome')
      expect(result.current.completedSteps).toEqual([])
      expect(result.current.selectedRole).toBeNull()
      expect(result.current.companyProfile).toBeNull()
      expect(result.current.firstProjectId).toBeNull()
      expect(result.current.teamInvitations).toEqual([])
      expect(result.current.completedTours).toEqual([])
      expect(result.current.startedAt).toBeNull()
      expect(result.current.completedAt).toBeNull()
      // lastUpdatedAt is set by resetOnboarding() in beforeEach
      expect(result.current.lastUpdatedAt).not.toBeNull()
    })
  })

  describe('Step Navigation', () => {
    describe('setCurrentStep', () => {
      it('should set current step', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          result.current.setCurrentStep('company_setup')
        })

        expect(result.current.currentStep).toBe('company_setup')
        expect(result.current.lastUpdatedAt).not.toBeNull()
      })

      it('should update lastUpdatedAt when setting step', () => {
        const { result } = renderHook(() => useOnboardingStore())
        const beforeTime = new Date().toISOString()

        act(() => {
          result.current.setCurrentStep('first_project')
        })

        expect(result.current.lastUpdatedAt).toBeTruthy()
        expect(new Date(result.current.lastUpdatedAt!).getTime()).toBeGreaterThanOrEqual(
          new Date(beforeTime).getTime()
        )
      })
    })

    describe('completeStep', () => {
      it('should add step to completed steps', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          result.current.completeStep('welcome')
        })

        expect(result.current.completedSteps).toContain('welcome')
      })

      it('should not duplicate completed steps', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          result.current.completeStep('welcome')
          result.current.completeStep('welcome')
        })

        expect(result.current.completedSteps).toEqual(['welcome'])
      })

      it('should allow completing multiple steps', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          result.current.completeStep('welcome')
          result.current.completeStep('company_setup')
          result.current.completeStep('first_project')
        })

        expect(result.current.completedSteps).toEqual([
          'welcome',
          'company_setup',
          'first_project'
        ])
      })

      it('should update lastUpdatedAt when completing step', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          result.current.completeStep('welcome')
        })

        expect(result.current.lastUpdatedAt).not.toBeNull()
      })
    })

    describe('goToNextStep', () => {
      it('should advance to next step', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          result.current.goToNextStep()
        })

        expect(result.current.currentStep).toBe('company_setup')
      })

      it('should complete current step when advancing', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          result.current.goToNextStep()
        })

        expect(result.current.completedSteps).toContain('welcome')
      })

      it('should not complete current step if already completed', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          result.current.completeStep('welcome')
          result.current.goToNextStep()
        })

        expect(result.current.completedSteps).toEqual(['welcome'])
      })

      it('should not advance past final step', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          result.current.setCurrentStep('complete')
          result.current.goToNextStep()
        })

        expect(result.current.currentStep).toBe('complete')
      })

      it('should handle multiple sequential advances', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          result.current.goToNextStep() // welcome -> company_setup
          result.current.goToNextStep() // company_setup -> first_project
          result.current.goToNextStep() // first_project -> team_invite
        })

        expect(result.current.currentStep).toBe('team_invite')
        expect(result.current.completedSteps).toContain('welcome')
        expect(result.current.completedSteps).toContain('company_setup')
        expect(result.current.completedSteps).toContain('first_project')
      })
    })

    describe('goToPreviousStep', () => {
      it('should go back to previous step', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          result.current.setCurrentStep('company_setup')
          result.current.goToPreviousStep()
        })

        expect(result.current.currentStep).toBe('welcome')
      })

      it('should not go back from first step', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          result.current.goToPreviousStep()
        })

        expect(result.current.currentStep).toBe('welcome')
      })

      it('should handle multiple backward steps', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          result.current.setCurrentStep('team_invite')
          result.current.goToPreviousStep() // team_invite -> first_project
          result.current.goToPreviousStep() // first_project -> company_setup
        })

        expect(result.current.currentStep).toBe('company_setup')
      })

      it('should update lastUpdatedAt when going back', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          result.current.setCurrentStep('company_setup')
          result.current.goToPreviousStep()
        })

        expect(result.current.lastUpdatedAt).not.toBeNull()
      })
    })
  })

  describe('Role Selection', () => {
    it('should set selected role', () => {
      const { result } = renderHook(() => useOnboardingStore())
      const role: UserRole = 'superintendent'

      act(() => {
        result.current.setSelectedRole(role)
      })

      expect(result.current.selectedRole).toBe('superintendent')
    })

    it('should handle all role types', () => {
      const { result } = renderHook(() => useOnboardingStore())
      const roles: UserRole[] = [
        'superintendent',
        'project_manager',
        'estimator',
        'safety_manager',
        'executive',
        'subcontractor',
        'owner_rep',
        'other'
      ]

      roles.forEach(role => {
        act(() => {
          result.current.setSelectedRole(role)
        })
        expect(result.current.selectedRole).toBe(role)
      })
    })

    it('should update lastUpdatedAt when setting role', () => {
      const { result } = renderHook(() => useOnboardingStore())

      act(() => {
        result.current.setSelectedRole('project_manager')
      })

      expect(result.current.lastUpdatedAt).not.toBeNull()
    })
  })

  describe('Company Profile', () => {
    it('should set company profile', () => {
      const { result } = renderHook(() => useOnboardingStore())
      const profile: CompanyProfile = {
        name: 'ACME Construction',
        address: '123 Main St',
        phone: '555-1234',
        website: 'https://acme.com',
        industry: 'commercial',
        size: 'medium'
      }

      act(() => {
        result.current.setCompanyProfile(profile)
      })

      expect(result.current.companyProfile).toEqual(profile)
    })

    it('should handle minimal company profile', () => {
      const { result } = renderHook(() => useOnboardingStore())
      const profile: CompanyProfile = {
        name: 'Test Company'
      }

      act(() => {
        result.current.setCompanyProfile(profile)
      })

      expect(result.current.companyProfile).toEqual(profile)
    })

    it('should handle company profile with logoUrl', () => {
      const { result } = renderHook(() => useOnboardingStore())
      const profile: CompanyProfile = {
        name: 'Test Company',
        logoUrl: 'https://example.com/logo.png'
      }

      act(() => {
        result.current.setCompanyProfile(profile)
      })

      expect(result.current.companyProfile?.logoUrl).toBe('https://example.com/logo.png')
    })

    it('should update lastUpdatedAt when setting company profile', () => {
      const { result } = renderHook(() => useOnboardingStore())

      act(() => {
        result.current.setCompanyProfile({ name: 'Test' })
      })

      expect(result.current.lastUpdatedAt).not.toBeNull()
    })
  })

  describe('First Project', () => {
    it('should set first project ID', () => {
      const { result } = renderHook(() => useOnboardingStore())
      const projectId = 'project-123'

      act(() => {
        result.current.setFirstProjectId(projectId)
      })

      expect(result.current.firstProjectId).toBe(projectId)
    })

    it('should update lastUpdatedAt when setting project ID', () => {
      const { result } = renderHook(() => useOnboardingStore())

      act(() => {
        result.current.setFirstProjectId('project-456')
      })

      expect(result.current.lastUpdatedAt).not.toBeNull()
    })
  })

  describe('Team Invitations', () => {
    describe('addTeamInvitation', () => {
      it('should add team invitation', () => {
        const { result } = renderHook(() => useOnboardingStore())
        const invitation: Omit<TeamInvitation, 'sent'> = {
          email: 'john@example.com',
          name: 'John Doe',
          role: 'superintendent'
        }

        act(() => {
          result.current.addTeamInvitation(invitation)
        })

        expect(result.current.teamInvitations).toHaveLength(1)
        expect(result.current.teamInvitations[0]).toEqual({
          ...invitation,
          sent: false
        })
      })

      it('should not add duplicate invitations by email', () => {
        const { result } = renderHook(() => useOnboardingStore())
        const invitation: Omit<TeamInvitation, 'sent'> = {
          email: 'john@example.com',
          name: 'John Doe',
          role: 'superintendent'
        }

        act(() => {
          result.current.addTeamInvitation(invitation)
          result.current.addTeamInvitation(invitation)
        })

        expect(result.current.teamInvitations).toHaveLength(1)
      })

      it('should add multiple different invitations', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          result.current.addTeamInvitation({
            email: 'john@example.com',
            role: 'superintendent'
          })
          result.current.addTeamInvitation({
            email: 'jane@example.com',
            role: 'project_manager'
          })
        })

        expect(result.current.teamInvitations).toHaveLength(2)
      })

      it('should set sent to false by default', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          result.current.addTeamInvitation({
            email: 'test@example.com',
            role: 'estimator'
          })
        })

        expect(result.current.teamInvitations[0].sent).toBe(false)
      })
    })

    describe('markInvitationSent', () => {
      it('should mark invitation as sent', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          result.current.addTeamInvitation({
            email: 'john@example.com',
            role: 'superintendent'
          })
          result.current.markInvitationSent('john@example.com')
        })

        expect(result.current.teamInvitations[0].sent).toBe(true)
        expect(result.current.teamInvitations[0].sentAt).toBeTruthy()
      })

      it('should only mark specific invitation', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          result.current.addTeamInvitation({
            email: 'john@example.com',
            role: 'superintendent'
          })
          result.current.addTeamInvitation({
            email: 'jane@example.com',
            role: 'project_manager'
          })
          result.current.markInvitationSent('john@example.com')
        })

        expect(result.current.teamInvitations[0].sent).toBe(true)
        expect(result.current.teamInvitations[1].sent).toBe(false)
      })

      it('should set sentAt timestamp', () => {
        const { result } = renderHook(() => useOnboardingStore())
        const beforeTime = new Date().toISOString()

        act(() => {
          result.current.addTeamInvitation({
            email: 'test@example.com',
            role: 'superintendent'
          })
          result.current.markInvitationSent('test@example.com')
        })

        const sentAt = result.current.teamInvitations[0].sentAt
        expect(sentAt).toBeTruthy()
        expect(new Date(sentAt!).getTime()).toBeGreaterThanOrEqual(
          new Date(beforeTime).getTime()
        )
      })
    })

    describe('removeTeamInvitation', () => {
      it('should remove invitation by email', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          result.current.addTeamInvitation({
            email: 'john@example.com',
            role: 'superintendent'
          })
          result.current.removeTeamInvitation('john@example.com')
        })

        expect(result.current.teamInvitations).toHaveLength(0)
      })

      it('should only remove specific invitation', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          result.current.addTeamInvitation({
            email: 'john@example.com',
            role: 'superintendent'
          })
          result.current.addTeamInvitation({
            email: 'jane@example.com',
            role: 'project_manager'
          })
          result.current.removeTeamInvitation('john@example.com')
        })

        expect(result.current.teamInvitations).toHaveLength(1)
        expect(result.current.teamInvitations[0].email).toBe('jane@example.com')
      })

      it('should handle removing non-existent invitation', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          result.current.addTeamInvitation({
            email: 'john@example.com',
            role: 'superintendent'
          })
          result.current.removeTeamInvitation('nonexistent@example.com')
        })

        expect(result.current.teamInvitations).toHaveLength(1)
      })
    })
  })

  describe('Feature Tours', () => {
    describe('startTour', () => {
      it('should call logger when starting tour', async () => {
        const { result } = renderHook(() => useOnboardingStore())
        const { logger } = await import('@/lib/utils/logger')

        act(() => {
          result.current.startTour('dashboard')
        })

        expect(logger.log).toHaveBeenCalledWith('Starting tour: dashboard')
      })

      it('should handle all tour types', async () => {
        const { result } = renderHook(() => useOnboardingStore())
        const { logger } = await import('@/lib/utils/logger')
        const tours: FeatureTourId[] = [
          'dashboard',
          'projects',
          'daily_reports',
          'rfis',
          'submittals',
          'tasks',
          'documents',
          'safety',
          'punch_lists',
          'change_orders'
        ]

        tours.forEach(tour => {
          act(() => {
            result.current.startTour(tour)
          })
          expect(logger.log).toHaveBeenCalledWith(`Starting tour: ${tour}`)
        })
      })
    })

    describe('completeTour', () => {
      it('should add tour to completed tours', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          result.current.completeTour('dashboard')
        })

        expect(result.current.completedTours).toContain('dashboard')
      })

      it('should not duplicate completed tours', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          result.current.completeTour('dashboard')
          result.current.completeTour('dashboard')
        })

        expect(result.current.completedTours).toEqual(['dashboard'])
      })

      it('should complete multiple tours', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          result.current.completeTour('dashboard')
          result.current.completeTour('projects')
          result.current.completeTour('daily_reports')
        })

        expect(result.current.completedTours).toEqual([
          'dashboard',
          'projects',
          'daily_reports'
        ])
      })
    })

    describe('isTourCompleted', () => {
      it('should return true for completed tour', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          result.current.completeTour('dashboard')
        })

        expect(result.current.isTourCompleted('dashboard')).toBe(true)
      })

      it('should return false for incomplete tour', () => {
        const { result } = renderHook(() => useOnboardingStore())

        expect(result.current.isTourCompleted('dashboard')).toBe(false)
      })

      it('should correctly track multiple tours', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          result.current.completeTour('dashboard')
          result.current.completeTour('projects')
        })

        expect(result.current.isTourCompleted('dashboard')).toBe(true)
        expect(result.current.isTourCompleted('projects')).toBe(true)
        expect(result.current.isTourCompleted('daily_reports')).toBe(false)
      })
    })
  })

  describe('Onboarding Management', () => {
    describe('startOnboarding', () => {
      it('should reset to initial state with startedAt timestamp', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          // Set some state first
          result.current.setSelectedRole('superintendent')
          result.current.completeStep('welcome')
          // Start onboarding
          result.current.startOnboarding()
        })

        expect(result.current.isOnboardingComplete).toBe(false)
        expect(result.current.isOnboardingSkipped).toBe(false)
        expect(result.current.currentStep).toBe('welcome')
        expect(result.current.completedSteps).toEqual([])
        expect(result.current.selectedRole).toBeNull()
        expect(result.current.startedAt).not.toBeNull()
        expect(result.current.lastUpdatedAt).not.toBeNull()
      })

      it('should set startedAt to current time', () => {
        const { result } = renderHook(() => useOnboardingStore())
        const beforeTime = new Date().toISOString()

        act(() => {
          result.current.startOnboarding()
        })

        expect(result.current.startedAt).toBeTruthy()
        expect(new Date(result.current.startedAt!).getTime()).toBeGreaterThanOrEqual(
          new Date(beforeTime).getTime()
        )
      })
    })

    describe('skipOnboarding', () => {
      it('should set isOnboardingSkipped to true', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          result.current.skipOnboarding()
        })

        expect(result.current.isOnboardingSkipped).toBe(true)
      })

      it('should set showReminder to true', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          result.current.skipOnboarding()
        })

        expect(result.current.showReminder).toBe(true)
      })

      it('should update lastUpdatedAt', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          result.current.skipOnboarding()
        })

        expect(result.current.lastUpdatedAt).not.toBeNull()
      })
    })

    describe('completeOnboarding', () => {
      it('should set isOnboardingComplete to true', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          result.current.completeOnboarding()
        })

        expect(result.current.isOnboardingComplete).toBe(true)
      })

      it('should set currentStep to complete', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          result.current.completeOnboarding()
        })

        expect(result.current.currentStep).toBe('complete')
      })

      it('should add complete to completedSteps', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          result.current.completeOnboarding()
        })

        expect(result.current.completedSteps).toContain('complete')
      })

      it('should set completedAt timestamp', () => {
        const { result } = renderHook(() => useOnboardingStore())
        const beforeTime = new Date().toISOString()

        act(() => {
          result.current.completeOnboarding()
        })

        expect(result.current.completedAt).toBeTruthy()
        expect(new Date(result.current.completedAt!).getTime()).toBeGreaterThanOrEqual(
          new Date(beforeTime).getTime()
        )
      })

      it('should set showReminder to false', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          result.current.completeOnboarding()
        })

        expect(result.current.showReminder).toBe(false)
      })

      it('should preserve existing completed steps', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          result.current.completeStep('welcome')
          result.current.completeStep('company_setup')
          result.current.completeOnboarding()
        })

        expect(result.current.completedSteps).toContain('welcome')
        expect(result.current.completedSteps).toContain('company_setup')
        expect(result.current.completedSteps).toContain('complete')
      })
    })

    describe('resetOnboarding', () => {
      it('should reset all state to initial values', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          // Set various state
          result.current.setSelectedRole('superintendent')
          result.current.setCompanyProfile({ name: 'Test' })
          result.current.completeStep('welcome')
          result.current.addTeamInvitation({
            email: 'test@example.com',
            role: 'superintendent'
          })
          result.current.completeTour('dashboard')
          // Reset
          result.current.resetOnboarding()
        })

        expect(result.current.isOnboardingComplete).toBe(false)
        expect(result.current.isOnboardingSkipped).toBe(false)
        expect(result.current.currentStep).toBe('welcome')
        expect(result.current.completedSteps).toEqual([])
        expect(result.current.selectedRole).toBeNull()
        expect(result.current.companyProfile).toBeNull()
        expect(result.current.teamInvitations).toEqual([])
        expect(result.current.completedTours).toEqual([])
        expect(result.current.startedAt).toBeNull()
        expect(result.current.completedAt).toBeNull()
      })

      it('should update lastUpdatedAt', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          result.current.resetOnboarding()
        })

        expect(result.current.lastUpdatedAt).not.toBeNull()
      })
    })

    describe('dismissReminder', () => {
      it('should set showReminder to false', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          result.current.dismissReminder()
        })

        expect(result.current.showReminder).toBe(false)
      })

      it('should set reminderDismissedAt timestamp', () => {
        const { result } = renderHook(() => useOnboardingStore())
        const beforeTime = new Date().toISOString()

        act(() => {
          result.current.dismissReminder()
        })

        expect(result.current.reminderDismissedAt).toBeTruthy()
        expect(new Date(result.current.reminderDismissedAt!).getTime()).toBeGreaterThanOrEqual(
          new Date(beforeTime).getTime()
        )
      })
    })

    describe('showReminderAgain', () => {
      it('should set showReminder to true', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          result.current.dismissReminder()
          result.current.showReminderAgain()
        })

        expect(result.current.showReminder).toBe(true)
      })
    })
  })

  describe('Progress Calculations', () => {
    describe('getProgress', () => {
      it('should return 0 for no completed steps', () => {
        const { result } = renderHook(() => useOnboardingStore())

        const progress = result.current.getProgress()

        expect(progress).toBe(0)
      })

      it('should calculate percentage correctly', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          result.current.completeStep('welcome')
        })

        const progress = result.current.getProgress()
        // 1 out of 5 steps (excluding 'complete') = 20%
        expect(progress).toBe(20)
      })

      it('should round progress to nearest integer', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          result.current.completeStep('welcome')
          result.current.completeStep('company_setup')
        })

        const progress = result.current.getProgress()
        // 2 out of 5 steps = 40%
        expect(progress).toBe(40)
      })

      it('should calculate 100% for all steps completed', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          result.current.completeStep('welcome')
          result.current.completeStep('company_setup')
          result.current.completeStep('first_project')
          result.current.completeStep('team_invite')
          result.current.completeStep('feature_tour')
        })

        const progress = result.current.getProgress()
        expect(progress).toBe(100)
      })
    })

    describe('getCompletedStepsCount', () => {
      it('should return 0 for no completed steps', () => {
        const { result } = renderHook(() => useOnboardingStore())

        const count = result.current.getCompletedStepsCount()

        expect(count).toBe(0)
      })

      it('should count completed steps', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          result.current.completeStep('welcome')
          result.current.completeStep('company_setup')
        })

        const count = result.current.getCompletedStepsCount()
        expect(count).toBe(2)
      })

      it('should exclude complete step from count', () => {
        const { result } = renderHook(() => useOnboardingStore())

        act(() => {
          result.current.completeStep('welcome')
          result.current.completeStep('complete' as OnboardingStep)
        })

        const count = result.current.getCompletedStepsCount()
        expect(count).toBe(1)
      })
    })

    describe('getTotalStepsCount', () => {
      it('should return total steps excluding complete', () => {
        const { result } = renderHook(() => useOnboardingStore())

        const total = result.current.getTotalStepsCount()

        // 6 steps total - 1 (complete) = 5
        expect(total).toBe(5)
      })
    })
  })

  describe('Supabase Sync', () => {
    describe('syncToSupabase', () => {
      it('should call supabase update with correct data', async () => {
        const { result } = renderHook(() => useOnboardingStore())
        // Import mocked modules
        const { supabase } = await import('@/lib/supabase')
        const userId = 'user-123'

        act(() => {
          result.current.setSelectedRole('superintendent')
          result.current.setCompanyProfile({ name: 'Test Company' })
        })

        await act(async () => {
          await result.current.syncToSupabase(userId)
        })

        expect(supabase.from).toHaveBeenCalledWith('profiles')
      })

      it('should handle sync errors gracefully', async () => {
        const { result } = renderHook(() => useOnboardingStore())
        const { supabase } = await import('@/lib/supabase')
        const { logger } = await import('@/lib/utils/logger')

        vi.mocked(supabase.from).mockReturnValueOnce({
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Error' } }))
          }))
        } as any)

        await act(async () => {
          await result.current.syncToSupabase('user-123')
        })

        expect(logger.error).toHaveBeenCalled()
      })

      it('should log success on successful sync', async () => {
        const { result } = renderHook(() => useOnboardingStore())
        const { logger } = await import('@/lib/utils/logger')

        await act(async () => {
          await result.current.syncToSupabase('user-123')
        })

        expect(logger.log).toHaveBeenCalledWith('Onboarding synced to Supabase')
      })
    })

    describe('loadFromSupabase', () => {
      it('should load data from Supabase', async () => {
        const { result } = renderHook(() => useOnboardingStore())
        const { supabase } = await import('@/lib/supabase')

        const mockData = {
          is_onboarding_complete: true,
          is_onboarding_skipped: false,
          onboarding_current_step: 'complete',
          onboarding_completed_steps: ['welcome', 'company_setup'],
          onboarding_selected_role: 'superintendent',
          onboarding_company_profile: { name: 'Test Company' },
          onboarding_first_project_id: 'project-123',
          onboarding_team_invitations: [{ email: 'test@example.com', role: 'superintendent', sent: false }],
          onboarding_completed_tours: ['dashboard'],
          onboarding_started_at: '2024-01-01T00:00:00Z',
          onboarding_completed_at: '2024-01-02T00:00:00Z'
        }

        vi.mocked(supabase.from).mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: mockData, error: null }))
            }))
          }))
        } as any)

        await act(async () => {
          await result.current.loadFromSupabase('user-123')
        })

        expect(result.current.isOnboardingComplete).toBe(true)
        expect(result.current.currentStep).toBe('complete')
        expect(result.current.selectedRole).toBe('superintendent')
        expect(result.current.companyProfile).toEqual({ name: 'Test Company' })
      })

      it('should handle load errors gracefully', async () => {
        const { result } = renderHook(() => useOnboardingStore())
        const { supabase } = await import('@/lib/supabase')
        const { logger } = await import('@/lib/utils/logger')

        vi.mocked(supabase.from).mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: null,
                error: { message: 'Not found' }
              }))
            }))
          }))
        } as any)

        await act(async () => {
          await result.current.loadFromSupabase('user-123')
        })

        expect(logger.warn).toHaveBeenCalled()
      })

      it('should use default values for missing data', async () => {
        const { result } = renderHook(() => useOnboardingStore())
        const { supabase } = await import('@/lib/supabase')

        const mockData = {
          is_onboarding_complete: null,
          is_onboarding_skipped: null,
          onboarding_current_step: null,
          onboarding_completed_steps: null,
          onboarding_selected_role: null,
          onboarding_company_profile: null,
          onboarding_first_project_id: null,
          onboarding_team_invitations: null,
          onboarding_completed_tours: null,
          onboarding_started_at: null,
          onboarding_completed_at: null
        }

        vi.mocked(supabase.from).mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: mockData, error: null }))
            }))
          }))
        } as any)

        await act(async () => {
          await result.current.loadFromSupabase('user-123')
        })

        expect(result.current.isOnboardingComplete).toBe(false)
        expect(result.current.currentStep).toBe('welcome')
        expect(result.current.completedSteps).toEqual([])
      })

      it('should log success on successful load', async () => {
        const { result } = renderHook(() => useOnboardingStore())
        const { supabase } = await import('@/lib/supabase')
        const { logger } = await import('@/lib/utils/logger')

        vi.mocked(supabase.from).mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: { is_onboarding_complete: false },
                error: null
              }))
            }))
          }))
        } as any)

        await act(async () => {
          await result.current.loadFromSupabase('user-123')
        })

        expect(logger.log).toHaveBeenCalledWith('Onboarding loaded from Supabase')
      })
    })
  })

  describe('Selector Hooks', () => {
    describe('useIsOnboardingComplete', () => {
      it('should return false initially', () => {
        const { result } = renderHook(() => useIsOnboardingComplete())

        expect(result.current).toBe(false)
      })

      it('should return true after completing onboarding', () => {
        const { result: storeResult } = renderHook(() => useOnboardingStore())
        const { result } = renderHook(() => useIsOnboardingComplete())

        act(() => {
          storeResult.current.completeOnboarding()
        })

        expect(result.current).toBe(true)
      })
    })

    describe('useCurrentOnboardingStep', () => {
      it('should return welcome initially', () => {
        const { result } = renderHook(() => useCurrentOnboardingStep())

        expect(result.current).toBe('welcome')
      })

      it('should update when step changes', () => {
        const { result: storeResult } = renderHook(() => useOnboardingStore())
        const { result } = renderHook(() => useCurrentOnboardingStep())

        act(() => {
          storeResult.current.setCurrentStep('company_setup')
        })

        expect(result.current).toBe('company_setup')
      })
    })

    describe('useOnboardingProgress', () => {
      it('should return 0 initially', () => {
        const { result } = renderHook(() => useOnboardingProgress())

        expect(result.current).toBe(0)
      })

      it('should update when steps are completed', () => {
        const { result: storeResult } = renderHook(() => useOnboardingStore())
        const { result } = renderHook(() => useOnboardingProgress())

        act(() => {
          storeResult.current.completeStep('welcome')
        })

        expect(result.current).toBe(20)
      })
    })

    describe('useShouldShowOnboarding', () => {
      it('should return true initially', () => {
        const { result } = renderHook(() => useShouldShowOnboarding())

        expect(result.current).toBe(true)
      })

      it('should return false after completing onboarding', () => {
        const { result: storeResult } = renderHook(() => useOnboardingStore())
        const { result } = renderHook(() => useShouldShowOnboarding())

        act(() => {
          storeResult.current.completeOnboarding()
        })

        expect(result.current).toBe(false)
      })

      it('should return false after skipping onboarding', () => {
        const { result: storeResult } = renderHook(() => useOnboardingStore())
        const { result } = renderHook(() => useShouldShowOnboarding())

        act(() => {
          storeResult.current.skipOnboarding()
        })

        expect(result.current).toBe(false)
      })
    })

    describe('useShouldShowReminder', () => {
      it('should return false initially', () => {
        const { result } = renderHook(() => useShouldShowReminder())

        expect(result.current).toBe(false)
      })

      it('should return true after skipping onboarding', () => {
        const { result: storeResult } = renderHook(() => useOnboardingStore())
        const { result } = renderHook(() => useShouldShowReminder())

        act(() => {
          storeResult.current.skipOnboarding()
        })

        expect(result.current).toBe(true)
      })

      it('should return false after dismissing reminder', () => {
        const { result: storeResult } = renderHook(() => useOnboardingStore())
        const { result } = renderHook(() => useShouldShowReminder())

        act(() => {
          storeResult.current.skipOnboarding()
          storeResult.current.dismissReminder()
        })

        expect(result.current).toBe(false)
      })

      it('should return false after completing onboarding', () => {
        const { result: storeResult } = renderHook(() => useOnboardingStore())
        const { result } = renderHook(() => useShouldShowReminder())

        act(() => {
          storeResult.current.skipOnboarding()
          storeResult.current.completeOnboarding()
        })

        expect(result.current).toBe(false)
      })
    })
  })
})
