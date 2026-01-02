// File: /src/features/onboarding/index.ts
// Main export file for the onboarding feature

// Components
export {
  // Onboarding Wizard
  OnboardingWizard,
  OnboardingWizardDefault,

  // Feature Tour
  FeatureTour,
  TourList,
  FeatureTourDefault,

  // Help Tooltips
  HelpTooltip,
  InlineHelp,
  FieldHelp,
  HelpBadge,
  HelpSection,
  HelpTooltipDefault,

  // Help Panel
  HelpPanel,
  HelpPanelProvider,
  HelpButton,
  useHelpPanel,
  WhatsThisProvider,
  WhatsThisButton,
  useWhatsThis,
  HelpPanelDefault,

  // Onboarding Provider
  OnboardingProvider,
  OnboardingReminder,
  RoleGate,
  OnboardingGate,
  useOnboarding,
  OnboardingProviderDefault,
} from './components'

// Store
export {
  useOnboardingStore,
  useIsOnboardingComplete,
  useCurrentOnboardingStep,
  useOnboardingProgress,
  useShouldShowOnboarding,
  useShouldShowReminder,
} from './stores/onboardingStore'

export type {
  UserRole,
  OnboardingStep,
  FeatureTourId,
  CompanyProfile,
  TeamInvitation,
  OnboardingState,
  OnboardingActions,
} from './stores/onboardingStore'

// Tour Steps Data
export {
  dashboardTour,
  projectsTour,
  dailyReportsTour,
  rfisTour,
  submittalsTour,
  tasksTour,
  documentsTour,
  safetyTour,
  punchListsTour,
  changeOrdersTour,
  allTours,
  getTourById,
  getTourForPath,
  getAllTourIds,
} from './data/tourSteps'

export type {
  HighlightPosition,
  TourStep,
  FeatureTour as FeatureTourType,
} from './data/tourSteps'
