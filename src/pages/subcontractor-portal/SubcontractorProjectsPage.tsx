/**
 * Subcontractor Projects Page
 * Lists all projects the subcontractor has access to
 */

import { Link } from 'react-router-dom'
import { useSubcontractorProjects } from '@/features/subcontractor-portal/hooks'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  FolderOpen,
  MapPin,
  Wrench,
  ClipboardList,
  CheckSquare,
  FileText,
  Eye,
  Calendar,
  DollarSign,
  ArrowRight,
} from 'lucide-react'
import type { SubcontractorProject } from '@/types/subcontractor-portal'

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) { return '-' }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function ProjectsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-64" />
      ))}
    </div>
  )
}

function ProjectStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
    active: { variant: 'default', label: 'Active' },
    planning: { variant: 'secondary', label: 'Planning' },
    on_hold: { variant: 'outline', label: 'On Hold' },
    completed: { variant: 'secondary', label: 'Completed' },
    cancelled: { variant: 'destructive', label: 'Cancelled' },
  }

  const config = statusConfig[status] || { variant: 'secondary' as const, label: status }

  return <Badge variant={config.variant}>{config.label}</Badge>
}

function PermissionsList({ permissions }: { permissions: SubcontractorProject['permissions'] }) {
  const permissionItems = [
    { key: 'can_view_scope', label: 'View Scope', enabled: permissions.can_view_scope },
    { key: 'can_view_documents', label: 'View Docs', enabled: permissions.can_view_documents },
    { key: 'can_submit_bids', label: 'Submit Bids', enabled: permissions.can_submit_bids },
    { key: 'can_view_schedule', label: 'View Schedule', enabled: permissions.can_view_schedule },
    { key: 'can_update_punch_items', label: 'Update Punch', enabled: permissions.can_update_punch_items },
    { key: 'can_update_tasks', label: 'Update Tasks', enabled: permissions.can_update_tasks },
  ]

  const enabledPermissions = permissionItems.filter((p) => p.enabled)

  if (enabledPermissions.length === 0) {
    return <span className="text-muted-foreground text-xs">View only</span>
  }

  return (
    <div className="flex flex-wrap gap-1">
      {enabledPermissions.slice(0, 3).map((p) => (
        <Badge key={p.key} variant="outline" className="text-xs">
          {p.label}
        </Badge>
      ))}
      {enabledPermissions.length > 3 && (
        <Badge variant="outline" className="text-xs">
          +{enabledPermissions.length - 3} more
        </Badge>
      )}
    </div>
  )
}

function ProjectCard({ project }: { project: SubcontractorProject }) {
  const hasItems = project.punch_item_count > 0 || project.task_count > 0 || project.pending_bid_count > 0

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="truncate heading-card">{project.name}</CardTitle>
            {project.address && (
              <CardDescription className="flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{project.address}</span>
              </CardDescription>
            )}
          </div>
          <ProjectStatusBadge status={project.status} />
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        {/* Trade & Scope */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{project.trade}</span>
          </div>
          {project.scope_of_work && (
            <p className="text-sm text-muted-foreground line-clamp-2">{project.scope_of_work}</p>
          )}
        </div>

        {/* Contract Info */}
        {(project.contract_amount || project.contract_start_date) && (
          <div className="flex flex-wrap gap-4 text-sm">
            {project.contract_amount && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <DollarSign className="h-3 w-3" />
                <span>{formatCurrency(project.contract_amount)}</span>
              </div>
            )}
            {project.contract_start_date && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>
                  {new Date(project.contract_start_date).toLocaleDateString()}
                  {project.contract_end_date && (
                    <> - {new Date(project.contract_end_date).toLocaleDateString()}</>
                  )}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Item Counts */}
        {hasItems && (
          <div className="flex flex-wrap gap-3 text-sm">
            {project.punch_item_count > 0 && (
              <div className="flex items-center gap-1">
                <ClipboardList className="h-4 w-4 text-warning" />
                <span>{project.punch_item_count} punch items</span>
              </div>
            )}
            {project.task_count > 0 && (
              <div className="flex items-center gap-1">
                <CheckSquare className="h-4 w-4 text-primary" />
                <span>{project.task_count} tasks</span>
              </div>
            )}
            {project.pending_bid_count > 0 && (
              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4 text-info" />
                <span>{project.pending_bid_count} pending bids</span>
              </div>
            )}
          </div>
        )}

        {/* Permissions */}
        <div className="pt-2 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Eye className="h-3 w-3" />
            <span>Your Access:</span>
          </div>
          <PermissionsList permissions={project.permissions} />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {project.permissions.can_view_scope && (
            <Button variant="outline" size="sm" asChild className="flex-1">
              <Link to={`/sub/projects/${project.id}/scope`}>
                View Scope
              </Link>
            </Button>
          )}
          <Button size="sm" asChild className="flex-1">
            <Link to={`/sub/punch-items?project=${project.id}`}>
              View Items
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function SubcontractorProjectsPage() {
  const { data: projects, isLoading, isError } = useSubcontractorProjects()

  const activeProjects = projects?.filter((p) => p.status === 'active') || []
  const otherProjects = projects?.filter((p) => p.status !== 'active') || []

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 heading-page">
          <FolderOpen className="h-6 w-6" />
          My Projects
        </h1>
        <p className="text-muted-foreground">
          Projects you have access to as a subcontractor.
        </p>
      </div>

      {/* Content */}
      {isLoading ? (
        <ProjectsSkeleton />
      ) : isError ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Failed to load projects
          </CardContent>
        </Card>
      ) : !projects || projects.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="mb-2 heading-subsection">No Projects Yet</h3>
            <p className="text-muted-foreground">
              You haven't been invited to any projects yet. Contact the general contractor to request access.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Active Projects */}
          {activeProjects.length > 0 && (
            <section>
              <h2 className="mb-4 flex items-center gap-2 heading-section">
                Active Projects
                <Badge variant="default">{activeProjects.length}</Badge>
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {activeProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </section>
          )}

          {/* Other Projects */}
          {otherProjects.length > 0 && (
            <section>
              <h2 className="mb-4 flex items-center gap-2 heading-section">
                Other Projects
                <Badge variant="secondary">{otherProjects.length}</Badge>
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {otherProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

export default SubcontractorProjectsPage
