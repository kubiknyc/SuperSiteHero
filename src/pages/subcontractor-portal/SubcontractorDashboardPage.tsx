/**
 * Subcontractor Dashboard Page
 * Main dashboard for subcontractor portal showing overview of all items
 */

import { Link } from 'react-router-dom'
import { useSubcontractorDashboard } from '@/features/subcontractor-portal/hooks'
import { DashboardStats, BidCard, StatusBadge } from '@/features/subcontractor-portal/components'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowRight,
  FileText,
  ClipboardList,
  CheckSquare,
  AlertTriangle,
  Building2,
  Calendar,
} from 'lucide-react'
import { format } from 'date-fns'

function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  )
}

export function SubcontractorDashboardPage() {
  const { data, isLoading, isError, error } = useSubcontractorDashboard()

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (isError) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              <p>Failed to load dashboard</p>
              <p className="text-sm">{error?.message}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              <p>No data available</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold heading-page">
          Welcome, {data.subcontractor.company_name}
        </h1>
        <p className="text-muted-foreground">
          Here's an overview of your current work across all projects.
        </p>
      </div>

      {/* Stats */}
      <DashboardStats stats={data.stats} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Bids */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Pending Bids
              </CardTitle>
              <CardDescription>Bid requests awaiting your response</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/portal/bids">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.pending_bids.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No pending bid requests
              </p>
            ) : (
              <div className="space-y-3">
                {data.pending_bids.slice(0, 3).map((bid) => (
                  <BidCard key={bid.id} bid={bid} compact />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Punch Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Active Punch Items
              </CardTitle>
              <CardDescription>Items assigned to you</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/portal/punch-items">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.recent_punch_items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No active punch items
              </p>
            ) : (
              <div className="space-y-2">
                {data.recent_punch_items.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{item.title}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {[item.building, item.floor, item.room].filter(Boolean).join(' > ') || 'No location'}
                      </p>
                    </div>
                    <StatusBadge status={item.status} type="punch-item" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                Active Tasks
              </CardTitle>
              <CardDescription>Tasks assigned to you</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/portal/tasks">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.recent_tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No active tasks
              </p>
            ) : (
              <div className="space-y-2">
                {data.recent_tasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{task.title}</p>
                      {task.due_date && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Due {format(new Date(task.due_date), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={task.status} type="task" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expiring Documents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Expiring Documents
              </CardTitle>
              <CardDescription>Documents expiring within 30 days</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/portal/compliance">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.expiring_documents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No documents expiring soon
              </p>
            ) : (
              <div className="space-y-2">
                {data.expiring_documents.slice(0, 5).map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{doc.document_name}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {doc.document_type.replace('_', ' ')}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        doc.days_until_expiration <= 7
                          ? 'bg-error-light text-error-dark border-red-200'
                          : 'bg-warning-light text-amber-700 border-amber-200'
                      }
                    >
                      {doc.days_until_expiration} days left
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Projects Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Your Projects
            </CardTitle>
            <CardDescription>All projects you're working on</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/portal/projects">
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {data.projects.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No projects assigned
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.projects.slice(0, 6).map((project) => (
                <Link
                  key={project.id}
                  to={`/portal/projects/${project.id}`}
                  className="block"
                >
                  <Card className="hover:bg-muted/50 transition-colors h-full">
                    <CardContent className="p-4">
                      <h3 className="font-medium truncate heading-subsection">{project.name}</h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {project.trade}
                      </p>
                      <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                        <span>{project.punch_item_count} punch items</span>
                        <span>{project.task_count} tasks</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default SubcontractorDashboardPage
