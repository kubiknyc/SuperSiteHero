import { Link } from 'react-router-dom'
import { SmartLayout } from '@/components/layout/SmartLayout'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Bell, Workflow, Receipt, ChevronRight, Building2, Users, LayoutTemplate, UsersRound, Shield, Bot, Moon, Calendar, FileSignature, Pencil, ClipboardList } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { ThemeSelector } from '@/components/ThemeToggle'
import { PWAInstallButton } from '@/components/PWAInstallPrompt'
import { GloveModeToggle } from '@/components/ui/glove-mode-toggle'
import { OfflineSyncSettings } from '@/components/settings/OfflineSyncSettings'
import { SessionManagement } from '@/components/settings/SessionManagement'
import { NavigationLayoutSelector } from '@/components/settings/NavigationLayoutSelector'

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
    iconBgColor: 'bg-warning-light',
    iconColor: 'text-warning',
    adminOnly: true,
  },
  {
    title: 'User Management',
    description: 'Manage team members, invite users, and control access',
    href: '/settings/users',
    icon: Users,
    iconBgColor: 'bg-info-light',
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
    iconBgColor: 'bg-info-light',
    iconColor: 'text-info',
  },
  {
    title: 'Approval Workflows',
    description: 'Configure approval workflows for documents, submittals, RFIs, and change orders',
    href: '/settings/approval-workflows',
    icon: Workflow,
    iconBgColor: 'bg-primary-50',
    iconColor: 'text-primary',
  },
  {
    title: 'Project Templates',
    description: 'Create reusable templates for standardized project setup',
    href: '/settings/project-templates',
    icon: LayoutTemplate,
    iconBgColor: 'bg-primary-50',
    iconColor: 'text-primary',
    adminOnly: true,
  },
  {
    title: 'Distribution Lists',
    description: 'Create reusable contact groups for notifications',
    href: '/settings/distribution-lists',
    icon: UsersRound,
    iconBgColor: 'bg-success-light',
    iconColor: 'text-success',
  },
  {
    title: 'Roles & Permissions',
    description: 'Manage custom roles, permissions, and feature flags',
    href: '/settings/roles',
    icon: Shield,
    iconBgColor: 'bg-error-light',
    iconColor: 'text-error',
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
    title: 'DocuSign Integration',
    description: 'Enable electronic signatures for payment applications, change orders, and lien waivers',
    href: '/settings/docusign',
    icon: FileSignature,
    iconBgColor: 'bg-info-light',
    iconColor: 'text-info',
  },
  {
    title: 'AI Settings',
    description: 'Configure AI-powered features, providers, and usage limits',
    href: '/settings/ai',
    icon: Bot,
    iconBgColor: 'bg-primary-50',
    iconColor: 'text-primary',
    adminOnly: true,
  },
  {
    title: 'Audit Logs',
    description: 'View security and compliance audit trail for all sensitive operations',
    href: '/settings/audit-logs',
    icon: ClipboardList,
    iconBgColor: 'bg-muted',
    iconColor: 'text-muted-foreground',
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

  // Get initials for avatar fallback
  const getInitials = () => {
    const first = userProfile?.first_name?.[0] || ''
    const last = userProfile?.last_name?.[0] || ''
    return (first + last).toUpperCase() || 'U'
  }

  return (
    <SmartLayout title="Settings" subtitle="Manage your account settings and preferences">
      <div className="container max-w-4xl py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold heading-page">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Profile Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-border">
                {userProfile?.avatar_url ? (
                  <AvatarImage src={userProfile.avatar_url} alt="Profile" />
                ) : null}
                <AvatarFallback className="text-lg bg-primary/10 text-primary">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg truncate">
                  {userProfile?.first_name} {userProfile?.last_name}
                </h3>
                <p className="text-sm text-muted-foreground truncate">
                  {userProfile?.email}
                </p>
                <p className="text-sm text-muted-foreground capitalize">
                  {userProfile?.role}
                </p>
              </div>
              <Button variant="outline" asChild>
                <Link to="/profile/edit">
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Profile
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Appearance & App Settings */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold heading-section">Appearance & App</h2>

          {/* Theme Selector */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary-50 dark:bg-primary-950">
                  <Moon className="h-6 w-6 text-primary dark:text-primary-400" />
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

          {/* Navigation Layout Selector */}
          <NavigationLayoutSelector />

          {/* Glove Mode Toggle */}
          <Card>
            <CardContent className="p-6">
              <GloveModeToggle />
            </CardContent>
          </Card>

          {/* PWA Install */}
          <PWAInstallButton />

          {/* Offline & Sync Settings */}
          <OfflineSyncSettings />
        </div>

        {/* Security Settings */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold heading-section">Security</h2>

          {/* Session Management */}
          <SessionManagement />
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
    </SmartLayout>
  )
}

export default SettingsPage
