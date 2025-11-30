/**
 * Client Project Detail
 *
 * Overview page for a single project in the client portal.
 */

import { useParams, Link } from 'react-router-dom'
import { useClientProject, useClientDashboardStats } from '../hooks/useClientPortal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  Calendar,
  Image,
  FileText,
  HelpCircle,
  FileEdit,
  MapPin,
  Clock,
  Target,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export function ClientProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: project, isLoading } = useClientProject(projectId)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Project Not Found</h2>
        <p className="text-gray-500 mt-2">This project may not exist or you don't have access.</p>
        <Button asChild className="mt-4">
          <Link to="/client">Back to Dashboard</Link>
        </Button>
      </div>
    )
  }

  const availableSections = [
    {
      name: 'Schedule',
      description: 'View project timeline and milestones',
      href: `/client/projects/${projectId}/schedule`,
      icon: Calendar,
      enabled: project.show_schedule,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      name: 'Photos',
      description: 'Browse project progress photos',
      href: `/client/projects/${projectId}/photos`,
      icon: Image,
      enabled: project.show_photos,
      color: 'bg-green-100 text-green-600',
    },
    {
      name: 'Documents',
      description: 'Access project documents and files',
      href: `/client/projects/${projectId}/documents`,
      icon: FileText,
      enabled: project.show_documents,
      color: 'bg-purple-100 text-purple-600',
    },
    {
      name: 'RFIs',
      description: 'View requests for information',
      href: `/client/projects/${projectId}/rfis`,
      icon: HelpCircle,
      enabled: project.show_rfis,
      color: 'bg-yellow-100 text-yellow-600',
    },
    {
      name: 'Change Orders',
      description: 'Review change orders and amendments',
      href: `/client/projects/${projectId}/change-orders`,
      icon: FileEdit,
      enabled: project.show_change_orders,
      color: 'bg-orange-100 text-orange-600',
    },
  ].filter(section => section.enabled)

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      {project.welcome_message && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <p className="text-blue-800">{project.welcome_message}</p>
          </CardContent>
        </Card>
      )}

      {/* Project Info */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Project Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>General information about your project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {project.project_number && (
              <div>
                <p className="text-sm text-gray-500">Project Number</p>
                <p className="font-medium">#{project.project_number}</p>
              </div>
            )}

            {project.description && (
              <div>
                <p className="text-sm text-gray-500">Description</p>
                <p className="text-gray-700">{project.description}</p>
              </div>
            )}

            {project.address && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="text-gray-700">
                    {project.address}
                    {project.city && <>, {project.city}</>}
                    {project.state && <>, {project.state}</>}
                    {project.zip && <> {project.zip}</>}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <span
                className={cn(
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                  project.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : project.status === 'completed'
                    ? 'bg-blue-100 text-blue-800'
                    : project.status === 'on_hold'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                )}
              >
                {project.status?.replace('_', ' ') || 'Active'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Timeline Card */}
        <Card>
          <CardHeader>
            <CardTitle>Project Timeline</CardTitle>
            <CardDescription>Key dates and milestones</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {project.start_date && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Clock className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Start Date</p>
                  <p className="font-medium">
                    {format(new Date(project.start_date), 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>
            )}

            {project.substantial_completion_date && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Target className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Substantial Completion</p>
                  <p className="font-medium">
                    {format(new Date(project.substantial_completion_date), 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>
            )}

            {project.final_completion_date && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Calendar className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Final Completion</p>
                  <p className="font-medium">
                    {format(new Date(project.final_completion_date), 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>
            )}

            {project.end_date && !project.final_completion_date && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Calendar className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">End Date</p>
                  <p className="font-medium">
                    {format(new Date(project.end_date), 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>
            )}

            {!project.start_date && !project.end_date && (
              <p className="text-gray-500 text-sm">No timeline information available.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Budget Info (if enabled) */}
      {(project.budget !== null || project.contract_value !== null) && (
        <Card>
          <CardHeader>
            <CardTitle>Financial Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {project.contract_value !== null && (
                <div>
                  <p className="text-sm text-gray-500">Contract Value</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${project.contract_value.toLocaleString()}
                  </p>
                </div>
              )}
              {project.budget !== null && (
                <div>
                  <p className="text-sm text-gray-500">Budget</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${project.budget.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Sections */}
      {availableSections.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Resources</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availableSections.map((section) => {
              const Icon = section.icon
              return (
                <Link key={section.name} to={section.href} className="group">
                  <Card className="h-full transition-shadow hover:shadow-md">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={cn('p-3 rounded-lg', section.color)}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                              {section.name}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                              {section.description}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
