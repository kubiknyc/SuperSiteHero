/**
 * Subcontractor Dashboard Page
 * Main dashboard for subcontractor portal showing overview of all items
 */

import { Link } from 'react-router-dom'
import {
  useSubcontractorDashboard,
  useScheduleSummary,
  useSafetyComplianceSummary,
  useMeetingSummary,
  useCertificationSummary,
  useLienWaiverSummary,
  useRetainageSummary,
} from '@/features/subcontractor-portal/hooks'
import { DashboardStats, BidCard, StatusBadge } from '@/features/subcontractor-portal/components'
import {
  ScheduleWidgetSkeleton,
  SafetyWidgetSkeleton,
  MeetingWidgetSkeleton,
  CertificationWidgetSkeleton,
  LienWaiverWidgetSkeleton,
  RetainageWidgetSkeleton,
} from '@/features/subcontractor-portal/components/DashboardSkeletons'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  ArrowRight,
  FileText,
  ClipboardList,
  CheckSquare,
  AlertTriangle,
  Building2,
  Calendar,
  CalendarClock,
  Shield,
  Users,
  Award,
  FileSignature,
  Banknote,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

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

  // Fetch additional data for new features
  const { data: scheduleSummary } = useScheduleSummary()
  const { data: safetySummary } = useSafetyComplianceSummary()
  const { data: meetingSummary } = useMeetingSummary()
  const { data: certificationSummary } = useCertificationSummary()
  const { data: lienWaiverSummary } = useLienWaiverSummary()
  const { data: retainageSummary } = useRetainageSummary()

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
      {/* Hero Header with gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-transparent to-primary/10 p-6 md:p-8 border border-primary/10">
        <div className="absolute inset-0 bg-blueprint-grid-fine opacity-20" />
        <div className="relative">
          <h1 className="heading-page mb-2">
            Welcome, {data.subcontractor.company_name}
          </h1>
          <p className="text-muted-foreground text-lg">
            Here's an overview of your current work across all projects.
          </p>
        </div>
      </div>

      {/* Stats */}
      <DashboardStats stats={data.stats} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Bids */}
        <Card className="hover-lift transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="heading-card flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Pending Bids
              </CardTitle>
              <CardDescription>Bid requests awaiting your response</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/sub/bids">
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
              <CardTitle className="heading-card flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Active Punch Items
              </CardTitle>
              <CardDescription>Items assigned to you</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/sub/punch-items">
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
                      <p className="truncate heading-subsection">{item.title}</p>
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
              <CardTitle className="heading-card flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                Active Tasks
              </CardTitle>
              <CardDescription>Tasks assigned to you</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/sub/tasks">
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
                      <p className="truncate heading-subsection">{task.title}</p>
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
              <CardTitle className="heading-card flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Expiring Documents
              </CardTitle>
              <CardDescription>Documents expiring within 30 days</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/sub/compliance">
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
                      <p className="truncate heading-subsection">{doc.document_name}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {doc.document_type.replace('_', ' ')}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        doc.days_until_expiration <= 7
                          ? 'bg-destructive/10 text-destructive border-destructive/20'
                          : 'bg-warning/10 text-warning-800 border-warning/20'
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
            <CardTitle className="heading-card flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Your Projects
            </CardTitle>
            <CardDescription>All projects you're working on</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/sub/projects">
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
                  to={`/sub/projects/${project.id}`}
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

      {/* New Features Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Schedule Widget */}
        {scheduleSummary ? (
          <Card className="hover-lift transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="heading-card flex items-center gap-2">
                  <CalendarClock className="h-5 w-5 text-primary" />
                  Schedule
                </CardTitle>
                <CardDescription>Your upcoming activities</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/sub/schedule">
                  View <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">This Week</span>
                  <span className="font-medium stat-number">{scheduleSummary.activities_this_week}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">In Progress</span>
                  <Badge variant="secondary">{scheduleSummary.in_progress_count}</Badge>
                </div>
                {scheduleSummary.overdue_count > 0 && (
                  <div className="flex justify-between items-center text-destructive">
                    <span className="text-sm flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Overdue
                    </span>
                    <Badge variant="destructive">{scheduleSummary.overdue_count}</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <ScheduleWidgetSkeleton />
        )}

        {/* Safety Widget */}
        {safetySummary ? (
          <Card className={cn(
            'hover-lift transition-all duration-200',
            safetySummary.compliance_score < 80 && 'border-warning'
          )}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="heading-card flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Safety
                </CardTitle>
                <CardDescription>Compliance status</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/sub/safety">
                  View <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Compliance Score</span>
                  <span className={cn(
                    'stat-number text-lg',
                    safetySummary.compliance_score >= 90 ? 'text-success' :
                      safetySummary.compliance_score >= 70 ? 'text-warning' : 'text-destructive'
                  )}>
                    {safetySummary.compliance_score}%
                  </span>
                </div>
                <Progress
                  value={safetySummary.compliance_score}
                  className="h-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{safetySummary.days_since_last_incident} days without incident</span>
                  <span>{safetySummary.open_corrective_actions} open actions</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <SafetyWidgetSkeleton />
        )}

        {/* Meetings Widget */}
        {meetingSummary ? (
          <Card className={cn(
            'hover-lift transition-all duration-200',
            meetingSummary.overdue_action_items > 0 && 'border-destructive'
          )}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="heading-card flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Meetings
                </CardTitle>
                <CardDescription>Action items status</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/sub/meetings">
                  View <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Upcoming</span>
                  <Badge variant="outline">{meetingSummary.upcoming_meetings}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Open Action Items</span>
                  <Badge variant="secondary">{meetingSummary.open_action_items}</Badge>
                </div>
                {meetingSummary.overdue_action_items > 0 && (
                  <div className="flex justify-between items-center text-destructive">
                    <span className="text-sm flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Overdue Items
                    </span>
                    <Badge variant="destructive">{meetingSummary.overdue_action_items}</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <MeetingWidgetSkeleton />
        )}
      </div>

      {/* Certifications & Financial Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Certifications Widget */}
        {certificationSummary ? (
          <Card className={cn(
            'hover-lift transition-all duration-200',
            (certificationSummary.expired_count > 0 || certificationSummary.expiring_soon_count > 0) && 'border-warning'
          )}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="heading-card flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  Certifications
                </CardTitle>
                <CardDescription>Team credentials</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/sub/certifications">
                  View <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-success">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-medium stat-number">{certificationSummary.valid_count}</span>
                    <span className="text-xs text-muted-foreground">Valid</span>
                  </div>
                  {certificationSummary.expiring_soon_count > 0 && (
                    <div className="flex items-center gap-1 text-warning">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium stat-number">{certificationSummary.expiring_soon_count}</span>
                      <span className="text-xs text-muted-foreground">Expiring</span>
                    </div>
                  )}
                  {certificationSummary.expired_count > 0 && (
                    <div className="flex items-center gap-1 text-destructive">
                      <XCircle className="h-4 w-4" />
                      <span className="font-medium stat-number">{certificationSummary.expired_count}</span>
                      <span className="text-xs text-muted-foreground">Expired</span>
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {certificationSummary.total_certifications} total certifications tracked
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <CertificationWidgetSkeleton />
        )}

        {/* Lien Waivers Widget */}
        {lienWaiverSummary ? (
          <Card className="hover-lift transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="heading-card flex items-center gap-2">
                  <FileSignature className="h-5 w-5 text-primary" />
                  Lien Waivers
                </CardTitle>
                <CardDescription>Waiver status</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/sub/lien-waivers">
                  View <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Pending Signature</span>
                  <Badge variant={lienWaiverSummary.awaiting_signature_count > 0 ? 'secondary' : 'outline'}>
                    {lienWaiverSummary.awaiting_signature_count}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Awaiting Approval</span>
                  <Badge variant="outline">{lienWaiverSummary.signed_count}</Badge>
                </div>
                <div className="flex justify-between items-center text-success">
                  <span className="text-sm flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Approved
                  </span>
                  <span className="font-medium stat-number">{lienWaiverSummary.approved_count}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <LienWaiverWidgetSkeleton />
        )}

        {/* Retainage Widget */}
        {retainageSummary ? (
          <Card className="hover-lift transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="heading-card flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-primary" />
                  Retainage
                </CardTitle>
                <CardDescription>Financial summary</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/sub/retainage">
                  View <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Held</span>
                  <span className="stat-number text-lg">
                    ${(retainageSummary.total_retention_held / 1000).toFixed(1)}k
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Eligible for Release</span>
                  <span className="font-medium text-success stat-number">
                    ${(retainageSummary.eligible_for_release / 1000).toFixed(1)}k
                  </span>
                </div>
                {retainageSummary.pending_releases > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Pending Release
                    </span>
                    <Badge variant="secondary">{retainageSummary.pending_releases}</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <RetainageWidgetSkeleton />
        )}
      </div>
    </div>
  )
}

export default SubcontractorDashboardPage
