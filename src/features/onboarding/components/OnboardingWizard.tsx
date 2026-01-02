// File: /src/features/onboarding/components/OnboardingWizard.tsx
// Multi-step onboarding wizard with progress tracking

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HardHat,
  ClipboardCheck,
  Building2,
  Users,
  Compass,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Briefcase,
  Shield,
  Calculator,
  LineChart,
  Hammer,
  UserCircle,
} from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  useOnboardingStore,
  type UserRole,
  type OnboardingStep,
  type CompanyProfile,
} from '../stores/onboardingStore'

// Step configuration
interface StepConfig {
  id: OnboardingStep
  title: string
  description: string
  icon: React.ElementType
}

const STEPS: StepConfig[] = [
  {
    id: 'welcome',
    title: 'Welcome to JobSight',
    description: 'Let\'s get you set up for success',
    icon: Compass,
  },
  {
    id: 'company_setup',
    title: 'Company Setup',
    description: 'Tell us about your company',
    icon: Building2,
  },
  {
    id: 'first_project',
    title: 'First Project',
    description: 'Create your first project',
    icon: ClipboardCheck,
  },
  {
    id: 'team_invite',
    title: 'Invite Your Team',
    description: 'Add team members to collaborate',
    icon: Users,
  },
  {
    id: 'feature_tour',
    title: 'Feature Tour',
    description: 'Learn the key features',
    icon: Compass,
  },
]

// Role configuration
interface RoleConfig {
  id: UserRole
  title: string
  description: string
  icon: React.ElementType
  features: string[]
}

const ROLES: RoleConfig[] = [
  {
    id: 'project_manager',
    title: 'Project Manager',
    description: 'Oversee multiple projects and teams',
    icon: Briefcase,
    features: ['Project dashboards', 'Budget tracking', 'Schedule management', 'Team coordination'],
  },
  {
    id: 'superintendent',
    title: 'Superintendent',
    description: 'Manage daily field operations',
    icon: HardHat,
    features: ['Daily reports', 'Safety tracking', 'Crew management', 'Quality control'],
  },
  {
    id: 'estimator',
    title: 'Estimator',
    description: 'Handle bidding and cost estimation',
    icon: Calculator,
    features: ['Takeoffs', 'Cost databases', 'Bid management', 'Proposal generation'],
  },
  {
    id: 'safety_manager',
    title: 'Safety Manager',
    description: 'Ensure site safety compliance',
    icon: Shield,
    features: ['Incident tracking', 'Safety checklists', 'Training records', 'OSHA compliance'],
  },
  {
    id: 'executive',
    title: 'Executive',
    description: 'High-level oversight and reporting',
    icon: LineChart,
    features: ['Executive dashboards', 'Financial reports', 'Portfolio view', 'Analytics'],
  },
  {
    id: 'subcontractor',
    title: 'Subcontractor',
    description: 'Work on assigned scopes',
    icon: Hammer,
    features: ['Assigned tasks', 'Submittals', 'RFI responses', 'Daily logs'],
  },
  {
    id: 'owner_rep',
    title: 'Owner Representative',
    description: 'Monitor project progress',
    icon: UserCircle,
    features: ['Progress tracking', 'Document access', 'Approval workflows', 'Reports'],
  },
]

interface OnboardingWizardProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onComplete?: () => void
}

export function OnboardingWizard({
  open: controlledOpen,
  onOpenChange,
  onComplete,
}: OnboardingWizardProps) {
  const {
    currentStep,
    completedSteps,
    selectedRole,
    companyProfile,
    isOnboardingComplete,
    isOnboardingSkipped,
    setCurrentStep,
    setSelectedRole,
    setCompanyProfile,
    goToNextStep,
    goToPreviousStep,
    skipOnboarding,
    completeOnboarding,
    getProgress,
  } = useOnboardingStore()

  // Local state for controlled mode
  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled
    ? controlledOpen
    : !isOnboardingComplete && !isOnboardingSkipped

  // Local form state
  const [companyName, setCompanyName] = useState(companyProfile?.name || '')
  const [companyAddress, setCompanyAddress] = useState(companyProfile?.address || '')
  const [companyPhone, setCompanyPhone] = useState(companyProfile?.phone || '')
  const [companyWebsite, setCompanyWebsite] = useState(companyProfile?.website || '')

  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      skipOnboarding()
    }
    onOpenChange?.(newOpen)
  }, [skipOnboarding, onOpenChange])

  const handleRoleSelect = useCallback((role: UserRole) => {
    setSelectedRole(role)
  }, [setSelectedRole])

  const handleCompanySave = useCallback(() => {
    const profile: CompanyProfile = {
      name: companyName,
      address: companyAddress,
      phone: companyPhone,
      website: companyWebsite,
    }
    setCompanyProfile(profile)
  }, [companyName, companyAddress, companyPhone, companyWebsite, setCompanyProfile])

  const handleNext = useCallback(() => {
    if (currentStep === 'company_setup') {
      handleCompanySave()
    }
    if (currentStep === 'feature_tour') {
      completeOnboarding()
      onComplete?.()
    } else {
      goToNextStep()
    }
  }, [currentStep, handleCompanySave, completeOnboarding, goToNextStep, onComplete])

  const handleSkip = useCallback(() => {
    skipOnboarding()
    onComplete?.()
  }, [skipOnboarding, onComplete])

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep)
  const progress = getProgress()

  const canProceed = () => {
    switch (currentStep) {
      case 'welcome':
        return selectedRole !== null
      case 'company_setup':
        return companyName.trim().length > 0
      case 'first_project':
      case 'team_invite':
      case 'feature_tour':
        return true
      default:
        return true
    }
  }

  // Animation variants
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 'welcome':
        return <WelcomeStep selectedRole={selectedRole} onRoleSelect={handleRoleSelect} />
      case 'company_setup':
        return (
          <CompanySetupStep
            companyName={companyName}
            setCompanyName={setCompanyName}
            companyAddress={companyAddress}
            setCompanyAddress={setCompanyAddress}
            companyPhone={companyPhone}
            setCompanyPhone={setCompanyPhone}
            companyWebsite={companyWebsite}
            setCompanyWebsite={setCompanyWebsite}
          />
        )
      case 'first_project':
        return <FirstProjectStep />
      case 'team_invite':
        return <TeamInviteStep />
      case 'feature_tour':
        return <FeatureTourStep selectedRole={selectedRole} />
      default:
        return null
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        {/* Progress bar */}
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Step {currentStepIndex + 1} of {STEPS.length}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {progress}% complete
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step indicators */}
        <div className="flex justify-center gap-2 px-6 py-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon
            const isCompleted = completedSteps.includes(step.id)
            const isCurrent = step.id === currentStep
            return (
              <button
                key={step.id}
                onClick={() => isCompleted && setCurrentStep(step.id)}
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full transition-all',
                  isCompleted && 'bg-primary text-white cursor-pointer',
                  isCurrent && !isCompleted && 'bg-primary/20 text-primary ring-2 ring-primary',
                  !isCompleted && !isCurrent && 'bg-muted text-muted-foreground cursor-not-allowed'
                )}
                disabled={!isCompleted}
                title={step.title}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </button>
            )
          })}
        </div>

        {/* Step content */}
        <div className="relative min-h-[400px] px-6 pb-6 overflow-hidden">
          <AnimatePresence mode="wait" custom={1}>
            <motion.div
              key={currentStep}
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-6 py-4 bg-muted/50 border-t">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="text-muted-foreground"
          >
            <X className="w-4 h-4 mr-2" />
            Skip for now
          </Button>

          <div className="flex gap-2">
            {currentStepIndex > 0 && (
              <Button variant="outline" onClick={goToPreviousStep}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
            >
              {currentStep === 'feature_tour' ? (
                <>
                  Get Started
                  <Check className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Welcome Step - Role Selection
function WelcomeStep({
  selectedRole,
  onRoleSelect,
}: {
  selectedRole: UserRole | null
  onRoleSelect: (role: UserRole) => void
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-primary/10"
        >
          <HardHat className="w-8 h-8 text-primary" />
        </motion.div>
        <h2 className="text-2xl font-bold">Welcome to JobSight</h2>
        <p className="text-muted-foreground mt-2">
          What best describes your role? This helps us personalize your experience.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {ROLES.map((role, index) => {
          const Icon = role.icon
          const isSelected = selectedRole === role.id
          return (
            <motion.button
              key={role.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onRoleSelect(role.id)}
              className={cn(
                'flex flex-col items-center p-4 rounded-lg border-2 transition-all text-left',
                isSelected
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              )}
            >
              <div
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center mb-3',
                  isSelected ? 'bg-primary text-white' : 'bg-muted'
                )}
              >
                <Icon className="w-6 h-6" />
              </div>
              <span className="font-medium text-sm text-center">{role.title}</span>
            </motion.button>
          )
        })}
      </div>

      {selectedRole && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4"
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {ROLES.find(r => r.id === selectedRole)?.title}
              </CardTitle>
              <CardDescription>
                {ROLES.find(r => r.id === selectedRole)?.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium mb-2">Key features for you:</p>
              <div className="flex flex-wrap gap-2">
                {ROLES.find(r => r.id === selectedRole)?.features.map((feature) => (
                  <span
                    key={feature}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}

// Company Setup Step
function CompanySetupStep({
  companyName,
  setCompanyName,
  companyAddress,
  setCompanyAddress,
  companyPhone,
  setCompanyPhone,
  companyWebsite,
  setCompanyWebsite,
}: {
  companyName: string
  setCompanyName: (value: string) => void
  companyAddress: string
  setCompanyAddress: (value: string) => void
  companyPhone: string
  setCompanyPhone: (value: string) => void
  companyWebsite: string
  setCompanyWebsite: (value: string) => void
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-primary/10"
        >
          <Building2 className="w-8 h-8 text-primary" />
        </motion.div>
        <h2 className="text-2xl font-bold">Set Up Your Company</h2>
        <p className="text-muted-foreground mt-2">
          Add your company details to personalize documents and reports.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company-name">
              Company Name <span className="text-error">*</span>
            </Label>
            <Input
              id="company-name"
              placeholder="Enter your company name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-address">Address</Label>
            <Input
              id="company-address"
              placeholder="Enter company address"
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company-phone">Phone</Label>
              <Input
                id="company-phone"
                placeholder="(555) 123-4567"
                value={companyPhone}
                onChange={(e) => setCompanyPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-website">Website</Label>
              <Input
                id="company-website"
                placeholder="www.example.com"
                value={companyWebsite}
                onChange={(e) => setCompanyWebsite(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground text-center">
        You can always update these details later in Settings.
      </p>
    </div>
  )
}

// First Project Step
function FirstProjectStep() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-primary/10"
        >
          <ClipboardCheck className="w-8 h-8 text-primary" />
        </motion.div>
        <h2 className="text-2xl font-bold">Create Your First Project</h2>
        <p className="text-muted-foreground mt-2">
          Projects are the central hub for all construction activities.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:border-primary transition-colors">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-primary" />
              Create a Project
            </CardTitle>
            <CardDescription>
              Start fresh with a new project. Enter details like name, address, and timeline.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:border-primary transition-colors">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Use a Template
            </CardTitle>
            <CardDescription>
              Start with a pre-configured project template based on project type.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <p className="text-sm text-muted-foreground text-center">
        You can skip this step and create a project later from the dashboard.
      </p>
    </div>
  )
}

// Team Invite Step
function TeamInviteStep() {
  const [emails, setEmails] = useState<string[]>([''])

  const addEmailField = () => {
    setEmails([...emails, ''])
  }

  const updateEmail = (index: number, value: string) => {
    const newEmails = [...emails]
    newEmails[index] = value
    setEmails(newEmails)
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-primary/10"
        >
          <Users className="w-8 h-8 text-primary" />
        </motion.div>
        <h2 className="text-2xl font-bold">Invite Your Team</h2>
        <p className="text-muted-foreground mt-2">
          Collaboration is key. Invite team members to get started together.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          {emails.map((email, index) => (
            <div key={index} className="flex gap-2">
              <Input
                type="email"
                placeholder="team@example.com"
                value={email}
                onChange={(e) => updateEmail(index, e.target.value)}
              />
            </div>
          ))}

          <Button variant="outline" onClick={addEmailField} className="w-full">
            + Add another email
          </Button>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground text-center">
        Invitations will be sent after you complete the setup.
        You can also invite team members later.
      </p>
    </div>
  )
}

// Feature Tour Step
function FeatureTourStep({ selectedRole }: { selectedRole: UserRole | null }) {
  const roleFeatures: Record<UserRole, string[]> = {
    project_manager: [
      'Create and manage multiple projects from the dashboard',
      'Track budgets and costs across all projects',
      'Generate reports for stakeholders',
      'Coordinate tasks and schedules',
    ],
    superintendent: [
      'Submit daily reports with photos and weather',
      'Track safety incidents and inspections',
      'Manage crew assignments and hours',
      'Create and track punch lists',
    ],
    estimator: [
      'Create digital takeoffs from plans',
      'Manage bid packages and proposals',
      'Track material costs and labor rates',
      'Generate detailed estimates',
    ],
    safety_manager: [
      'Conduct safety inspections with checklists',
      'Track incidents and near-misses',
      'Manage toolbox talks and training',
      'Monitor OSHA compliance',
    ],
    executive: [
      'View executive dashboards and KPIs',
      'Access financial summaries',
      'Monitor portfolio performance',
      'Generate executive reports',
    ],
    subcontractor: [
      'View assigned tasks and deadlines',
      'Submit daily logs and timesheets',
      'Respond to RFIs and submittals',
      'Track your work progress',
    ],
    owner_rep: [
      'Monitor project progress and milestones',
      'Access project documents and drawings',
      'Review and approve change orders',
      'Generate progress reports',
    ],
    other: [
      'Access project information',
      'View documents and drawings',
      'Track tasks and activities',
      'Collaborate with the team',
    ],
  }

  const features = selectedRole ? roleFeatures[selectedRole] : roleFeatures.other

  return (
    <div className="space-y-6">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-primary/10"
        >
          <Compass className="w-8 h-8 text-primary" />
        </motion.div>
        <h2 className="text-2xl font-bold">You're All Set!</h2>
        <p className="text-muted-foreground mt-2">
          Here's what you can do with JobSight.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <ul className="space-y-4">
            {features.map((feature, index) => (
              <motion.li
                key={feature}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-3"
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                  <Check className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm">{feature}</span>
              </motion.li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">
          Need help? Look for the
          <span className="inline-flex items-center mx-1 text-primary">
            <HelpCircleIcon className="w-4 h-4" />
          </span>
          icons throughout the app.
        </p>
      </div>
    </div>
  )
}

// Simple help circle icon
function HelpCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

export default OnboardingWizard
