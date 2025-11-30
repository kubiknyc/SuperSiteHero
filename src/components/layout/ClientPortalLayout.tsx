/**
 * Client Portal Layout
 *
 * Simplified layout for client portal with read-only navigation.
 */

import { type ReactNode } from 'react'
import { Link, useLocation, useParams, Outlet } from 'react-router-dom'
import { useAuth } from '@/lib/auth/AuthContext'
import { useClientProjects, useClientProject } from '@/features/client-portal/hooks/useClientPortal'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Calendar,
  Image,
  FileText,
  HelpCircle,
  FileEdit,
  LogOut,
  Building2,
  ChevronDown,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  settingKey?: string
}

export function ClientPortalLayout() {
  const { signOut, userProfile } = useAuth()
  const location = useLocation()
  const { projectId } = useParams<{ projectId: string }>()

  const { data: projects } = useClientProjects()
  const { data: currentProject } = useClientProject(projectId)

  // Build navigation based on project settings
  const getNavigation = (): NavItem[] => {
    const baseNav: NavItem[] = [
      { name: 'Overview', href: `/client/projects/${projectId}`, icon: LayoutDashboard },
    ]

    if (!currentProject) {return baseNav}

    const conditionalNav: NavItem[] = []

    if (currentProject.show_schedule) {
      conditionalNav.push({
        name: 'Schedule',
        href: `/client/projects/${projectId}/schedule`,
        icon: Calendar,
        settingKey: 'show_schedule',
      })
    }

    if (currentProject.show_photos) {
      conditionalNav.push({
        name: 'Photos',
        href: `/client/projects/${projectId}/photos`,
        icon: Image,
        settingKey: 'show_photos',
      })
    }

    if (currentProject.show_documents) {
      conditionalNav.push({
        name: 'Documents',
        href: `/client/projects/${projectId}/documents`,
        icon: FileText,
        settingKey: 'show_documents',
      })
    }

    if (currentProject.show_rfis) {
      conditionalNav.push({
        name: 'RFIs',
        href: `/client/projects/${projectId}/rfis`,
        icon: HelpCircle,
        settingKey: 'show_rfis',
      })
    }

    if (currentProject.show_change_orders) {
      conditionalNav.push({
        name: 'Change Orders',
        href: `/client/projects/${projectId}/change-orders`,
        icon: FileEdit,
        settingKey: 'show_change_orders',
      })
    }

    return [...baseNav, ...conditionalNav]
  }

  const navigation = projectId ? getNavigation() : []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50">
        <div className="h-full px-4 flex items-center justify-between">
          {/* Logo & Project Selector */}
          <div className="flex items-center gap-4">
            <Link to="/client" className="flex items-center gap-2">
              <div className="rounded-lg bg-blue-600 p-2">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <span className="font-semibold text-gray-900">Client Portal</span>
            </Link>

            {projects && projects.length > 0 && (
              <>
                <span className="text-gray-300">|</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2">
                      <span className="text-gray-700">
                        {currentProject?.name || 'Select Project'}
                      </span>
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64">
                    <DropdownMenuLabel>Your Projects</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {projects.map((project) => (
                      <DropdownMenuItem key={project.id} asChild>
                        <Link
                          to={`/client/projects/${project.id}`}
                          className="flex items-center gap-2"
                        >
                          <Building2 className="h-4 w-4" />
                          <div className="flex flex-col">
                            <span>{project.name}</span>
                            {project.project_number && (
                              <span className="text-xs text-gray-500">
                                #{project.project_number}
                              </span>
                            )}
                          </div>
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
                <span className="text-gray-700">
                  {userProfile?.first_name || userProfile?.email?.split('@')[0]}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                {userProfile?.email}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()} className="text-red-600">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="pt-16 flex">
        {/* Sidebar (only when project is selected) */}
        {projectId && navigation.length > 0 && (
          <aside className="fixed left-0 top-16 bottom-0 w-56 bg-white border-r border-gray-200">
            <nav className="p-4 space-y-1">
              {navigation.map((item) => {
                const isActive =
                  location.pathname === item.href ||
                  (item.href !== `/client/projects/${projectId}` &&
                    location.pathname.startsWith(item.href))
                const Icon = item.icon

                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>

            {/* Project Info Card */}
            {currentProject && (
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <p className="font-medium text-gray-900 truncate">
                    {currentProject.name}
                  </p>
                  {currentProject.address && (
                    <p className="text-gray-500 text-xs truncate mt-1">
                      {currentProject.address}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                        currentProject.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : currentProject.status === 'completed'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      )}
                    >
                      {currentProject.status || 'Active'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </aside>
        )}

        {/* Main Content */}
        <main
          className={cn(
            'flex-1 min-h-[calc(100vh-4rem)]',
            projectId && navigation.length > 0 ? 'ml-56' : ''
          )}
        >
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
