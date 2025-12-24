/**
 * Client Dashboard
 *
 * Main landing page for client portal showing all assigned projects
 * and quick stats.
 */

import { Link } from 'react-router-dom'
import { useClientProjects, useClientDashboardStats } from '../hooks/useClientPortal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Building2,
  Calendar,
  FileText,
  HelpCircle,
  FileEdit,
  ChevronRight,
  MapPin,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export function ClientDashboard() {
  const { data: projects, isLoading: projectsLoading } = useClientProjects()
  const { data: stats, isLoading: statsLoading } = useClientDashboardStats()

  if (projectsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground" className="heading-page">Welcome to Your Project Portal</h1>
        <p className="text-secondary mt-1">
          View progress, documents, and updates for your construction projects.
        </p>
      </div>

      {/* Stats Cards */}
      {!statsLoading && stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-info-light rounded-lg">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total_projects}</p>
                  <p className="text-sm text-muted">Total Projects</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-success-light rounded-lg">
                  <Calendar className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.upcoming_milestones}</p>
                  <p className="text-sm text-muted">Upcoming Milestones</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-warning-light rounded-lg">
                  <HelpCircle className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.open_rfis}</p>
                  <p className="text-sm text-muted">Open RFIs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <FileEdit className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pending_change_orders}</p>
                  <p className="text-sm text-muted">Pending Change Orders</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Projects Grid */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4" className="heading-section">Your Projects</h2>

        {!projects || projects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 text-disabled mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground" className="heading-subsection">No Projects Yet</h3>
              <p className="text-muted mt-1">
                You haven't been added to any projects yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/client/projects/${project.id}`}
                className="group"
              >
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg group-hover:text-primary transition-colors">
                          {project.name}
                        </CardTitle>
                        {project.project_number && (
                          <CardDescription className="mt-1">
                            #{project.project_number}
                          </CardDescription>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-disabled group-hover:text-primary transition-colors" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Location */}
                    {project.address && (
                      <div className="flex items-center gap-2 text-sm text-secondary mb-3">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">
                          {project.address}
                          {project.city && `, ${project.city}`}
                          {project.state && `, ${project.state}`}
                        </span>
                      </div>
                    )}

                    {/* Dates */}
                    {(project.start_date || project.end_date) && (
                      <div className="flex items-center gap-2 text-sm text-secondary mb-3">
                        <Clock className="h-4 w-4" />
                        <span>
                          {project.start_date && format(new Date(project.start_date), 'MMM d, yyyy')}
                          {project.start_date && project.end_date && ' - '}
                          {project.end_date && format(new Date(project.end_date), 'MMM d, yyyy')}
                        </span>
                      </div>
                    )}

                    {/* Status Badge */}
                    <div className="flex items-center gap-2 mt-4">
                      <span
                        className={cn(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                          project.status === 'active'
                            ? 'bg-success-light text-green-800'
                            : project.status === 'completed'
                            ? 'bg-info-light text-blue-800'
                            : project.status === 'on_hold'
                            ? 'bg-warning-light text-yellow-800'
                            : 'bg-muted text-foreground'
                        )}
                      >
                        {project.status?.replace('_', ' ') || 'Active'}
                      </span>
                    </div>

                    {/* Available Sections */}
                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                      {project.show_schedule && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted">
                          <Calendar className="h-3 w-3" /> Schedule
                        </span>
                      )}
                      {project.show_documents && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted">
                          <FileText className="h-3 w-3" /> Documents
                        </span>
                      )}
                      {project.show_rfis && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted">
                          <HelpCircle className="h-3 w-3" /> RFIs
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
