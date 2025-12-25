import { Link } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { Bell, Workflow, Receipt, ChevronRight, Building2, Users, LayoutTemplate, UsersRound, Shield, Bot, Moon, Calendar } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { ThemeSelector } from '@/components/ThemeToggle'
import { PWAInstallButton } from '@/components/PWAInstallPrompt'
import { GloveModeToggle } from '@/components/ui/glove-mode-toggle'

interface SettingsSection {
  title: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  iconBgColor: string
  iconColor: string
  adminOnly?: boolean
}

const settingsSections: SettingsSection[] = [
  {
    title: 'Company Profile',
    description: 'Manage your company information, logo, and branding',
    href: '/settings/company',
    icon: Building2,
    iconBgColor: 'bg-orange-100',
    iconColor: 'text-orange-600',
    adminOnly: true,
  },
  {
    title: 'User Management',
    description: 'Manage team members, invite users, and control access',
    href: '/settings/users',
    icon: Users,
    iconBgColor: 'bg-cyan-100',
    iconColor: 'text-info',
    adminOnly: true,
  },
  {
    title: 'Notifications',
    description: 'Manage your email and in-app notification preferences',
    href: '/settings/notifications',
    icon: Bell,
    iconBgColor: 'bg-info-light',
    iconColor: 'text-primary',
  },
  {
    title: 'Calendar Integrations',
    description: 'Connect Google Calendar and Outlook to sync meetings',
    href: '/settings/calendar',
    icon: Calendar,
    iconBgColor: 'bg-sky-100',
    iconColor: 'text-info',
  },
  {
    title: 'Approval Workflows',
    description: 'Configure approval workflows for documents, submittals, RFIs, and change orders',
    href: '/settings/approval-workflows',
    icon: Workflow,
    iconBgColor: 'bg-purple-100',
    iconColor: 'text-purple-600',
  },
  {
    title: 'Project Templates',
    description: 'Create reusable templates for standardized project setup',
    href: '/settings/project-templates',
    icon: LayoutTemplate,
    iconBgColor: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    adminOnly: true,
  },
  {
    title: 'Distribution Lists',
    description: 'Create reusable contact groups for notifications',
    href: '/settings/distribution-lists',
    icon: UsersRound,
    iconBgColor: 'bg-teal-100',
    iconColor: 'text-teal-600',
  },
  {
    title: 'Roles & Permissions',
    description: 'Manage custom roles, permissions, and feature flags',
    href: '/settings/roles',
    icon: Shield,
    iconBgColor: 'bg-rose-100',
    iconColor: 'text-rose-600',
    adminOnly: true,
  },
  {
    title: 'QuickBooks Integration',
    description: 'Sync your financial data with QuickBooks Online',
    href: '/settings/quickbooks',
    icon: Receipt,
    iconBgColor: 'bg-success-light',
    iconColor: 'text-success',
  },
  {
    title: 'AI Settings',
    description: 'Configure AI-powered features, providers, and usage limits',
    href: '/settings/ai',
    icon: Bot,
    iconBgColor: 'bg-violet-100',
    iconColor: 'text-violet-600',
    adminOnly: true,
  },
]

export function SettingsPage() {
  const { userProfile } = useAuth()
  const isAdmin = userProfile?.role === 'owner' || userProfile?.role === 'admin'

  // Filter sections based on user role
  const visibleSections = settingsSections.filter(
    (section) => !section.adminOnly || isAdmin
  )

  return (
    <AppLayout>
      <div className="container max-w-4xl py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold heading-page">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Appearance & App Settings */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold heading-section">Appearance & App</h2>

          {/* Theme Selector */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900">
                  <Moon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg mb-1">Theme</CardTitle>
                  <CardDescription className="mb-4">
                    Choose your preferred color theme for the application
                  </CardDescription>
                  <ThemeSelector />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Glove Mode Toggle */}
          <Card>
            <CardContent className="p-6">
              <GloveModeToggle />
            </CardContent>
          </Card>

          {/* PWA Install */}
          <PWAInstallButton />
        </div>

        {/* Settings Sections */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold heading-section">Configuration</h2>
          <div className="grid gap-4">
            {visibleSections.map((section) => {
              const Icon = section.icon
              return (
                <Link key={section.href} to={section.href}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${section.iconBgColor}`}>
                          <Icon className={`h-6 w-6 ${section.iconColor}`} />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg">{section.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {section.description}
                          </CardDescription>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default SettingsPage
