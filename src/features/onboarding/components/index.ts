// File: /src/features/onboarding/components/index.ts
// Export all onboarding components

// Main onboarding wizard
export { OnboardingWizard } from './OnboardingWizard'
export { default as OnboardingWizardDefault } from './OnboardingWizard'

// Feature tour
export { FeatureTour, TourList } from './FeatureTour'
export { default as FeatureTourDefault } from './FeatureTour'

// Help tooltips
export {
  HelpTooltip,
  InlineHelp,
  FieldHelp,
  HelpBadge,
  HelpSection,
} from './HelpTooltip'
export { default as HelpTooltipDefault } from './HelpTooltip'

// Help panel
export {
  HelpPanel,
  HelpPanelProvider,
  HelpButton,
  useHelpPanel,
  WhatsThisProvider,
  WhatsThisButton,
  useWhatsThis,
} from './HelpPanel'
export { default as HelpPanelDefault } from './HelpPanel'

// Onboarding provider
export {
  OnboardingProvider,
  OnboardingReminder,
  RoleGate,
  OnboardingGate,
  useOnboarding,
} from './OnboardingProvider'
export { default as OnboardingProviderDefault } from './OnboardingProvider'
