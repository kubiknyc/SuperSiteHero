/**
 * Subcontractor Safety Compliance Dashboard
 * View safety metrics, incidents, and compliance status (P1-4 Feature)
 */

import { useState } from 'react'
import { Shield, AlertTriangle, CheckCircle2, Clock, Building2, ChevronDown, ChevronUp, Award, BookOpen, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Progress } from '@/components/ui/progress'
import {
  useSafetyComplianceSummary,
  useSubcontractorSafetyIncidents,
  useSubcontractorCorrectiveActions,
  useSubcontractorToolboxTalks,
  getSeverityBadgeVariant,
  getSeverityLabel,
  getSeverityColor,
  getIncidentStatusBadgeVariant,
  getIncidentStatusLabel,
  getActionStatusVariant,
  getActionStatusLabel,
  getPriorityBadgeVariant,
  getPriorityLabel,
  getComplianceScoreColor,
  getComplianceScoreBgColor,
  getComplianceScoreLabel,
  formatSafetyDate,
  formatDaysSince,
  filterIncidentsByStatus,
  filterActionsByStatus,
  type SubcontractorSafetyIncident,
  type SubcontractorCorrectiveAction,
  type SubcontractorToolboxTalk,
} from '@/features/subcontractor-portal/hooks'
import { cn } from '@/lib/utils'

// =============================================
// SUB-COMPONENTS
// =============================================

function ComplianceScoreCard() {
  const { data: summary, isLoading } = useSafetyComplianceSummary()

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-2">
          <div className="h-4 bg-muted rounded w-32" />
        </CardHeader>
        <CardContent>
          <div className="h-16 bg-muted rounded w-24 mx-auto" />
        </CardContent>
      </Card>
    )
  }

  const score = summary?.compliance_score || 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 heading-subsection">
          <Award className="h-4 w-4" />
          Compliance Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          <div className={cn(
            "heading-page text-4xl",
            getComplianceScoreColor(score)
          )}>
            {score}
          </div>
          <Badge className={cn("mt-2", getComplianceScoreBgColor(score))}>
            {getComplianceScoreLabel(score)}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

function SafetySummaryCards() {
  const { data: summary, isLoading } = useSafetyComplianceSummary()

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-24" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="heading-subsection">Days Without Incident</CardTitle>
          <Shield className="h-4 w-4 text-success" />
        </CardHeader>
        <CardContent>
          <div className="heading-section text-success">
            {formatDaysSince(summary?.days_since_last_incident ?? null)}
          </div>
          <p className="text-xs text-muted-foreground">
            Keep up the good work!
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="heading-subsection">Incidents YTD</CardTitle>
          <AlertTriangle className="h-4 w-4 text-warning" />
        </CardHeader>
        <CardContent>
          <div className="heading-section">{summary?.incidents_ytd || 0}</div>
          <p className="text-xs text-muted-foreground">
            {summary?.recordable_incidents_ytd || 0} OSHA recordable
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="heading-subsection">Open Actions</CardTitle>
          <Clock className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="heading-section">{summary?.open_corrective_actions || 0}</div>
          <p className="text-xs text-muted-foreground">
            {summary?.overdue_corrective_actions || 0} overdue
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="heading-subsection">Toolbox Talks</CardTitle>
          <BookOpen className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="heading-section">{summary?.toolbox_talks_this_month || 0}</div>
          <p className="text-xs text-muted-foreground">
            This month
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function CertificateStatusCard() {
  const { data: summary, isLoading } = useSafetyComplianceSummary()

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-5 bg-muted rounded w-32" />
        </CardHeader>
        <CardContent>
          <div className="h-4 bg-muted rounded w-full" />
        </CardContent>
      </Card>
    )
  }

  const total = (summary?.safety_certs_valid || 0) + (summary?.safety_certs_expiring || 0) + (summary?.safety_certs_expired || 0)
  const validPercent = total > 0 ? ((summary?.safety_certs_valid || 0) / total) * 100 : 100

  return (
    <Card>
      <CardHeader>
        <CardTitle className="heading-subsection">Safety Certifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Valid</span>
          <span className="text-success font-medium">{summary?.safety_certs_valid || 0}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Expiring Soon</span>
          <span className="text-warning font-medium">{summary?.safety_certs_expiring || 0}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Expired</span>
          <span className="text-destructive font-medium">{summary?.safety_certs_expired || 0}</span>
        </div>
        <Progress value={validPercent} className="h-2" />
        <p className="text-xs text-muted-foreground text-center">
          {Math.round(validPercent)}% compliant
        </p>
      </CardContent>
    </Card>
  )
}

function IncidentCard({ incident }: { incident: SubcontractorSafetyIncident }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={cn(
        incident.is_osha_recordable && "border-destructive/30 bg-destructive/5"
      )}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <CardTitle className="heading-card">{incident.incident_number}</CardTitle>
                  {incident.is_osha_recordable && (
                    <Badge variant="destructive" className="text-xs">OSHA Recordable</Badge>
                  )}
                </div>
                <CardDescription className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {incident.project_name}
                  </span>
                  <span>{formatSafetyDate(incident.incident_date)}</span>
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={getSeverityBadgeVariant(incident.severity)}>
                  {getSeverityLabel(incident.severity)}
                </Badge>
                <Badge variant={getIncidentStatusBadgeVariant(incident.status)}>
                  {getIncidentStatusLabel(incident.status)}
                </Badge>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 border-t">
            <div className="mt-4 space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-1">Description</h4>
                <p className="text-sm text-muted-foreground">{incident.description || 'No description provided'}</p>
              </div>

              {incident.location && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Location</h4>
                  <p className="text-sm text-muted-foreground">{incident.location}</p>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <h4 className="text-sm font-medium mb-1">Type</h4>
                  <p className="text-sm text-muted-foreground capitalize">{incident.type.replace('_', ' ')}</p>
                </div>
                {incident.days_away > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Days Away</h4>
                    <p className="text-sm text-destructive">{incident.days_away}</p>
                  </div>
                )}
                {incident.days_restricted > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Days Restricted</h4>
                    <p className="text-sm text-warning">{incident.days_restricted}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

function IncidentsList({ filter }: { filter: 'all' | 'open' | 'closed' | 'recordable' }) {
  const { data: incidents = [], isLoading } = useSubcontractorSafetyIncidents()

  const filteredIncidents = filterIncidentsByStatus(incidents, filter)

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-5 bg-muted rounded w-32 mb-2" />
              <div className="h-4 bg-muted rounded w-48" />
            </CardHeader>
          </Card>
        ))}
      </div>
    )
  }

  if (filteredIncidents.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Shield className="h-12 w-12 text-success mx-auto mb-4" />
          <p className="text-muted-foreground">
            {filter === 'all'
              ? "No safety incidents recorded"
              : `No ${filter} incidents`}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {filteredIncidents.map((incident) => (
        <IncidentCard key={incident.id} incident={incident} />
      ))}
    </div>
  )
}

function CorrectiveActionCard({ action }: { action: SubcontractorCorrectiveAction }) {
  return (
    <Card className={cn(
      action.is_overdue && "border-destructive/30 bg-destructive/5"
    )}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="heading-card">From {action.incident_number}</CardTitle>
              {action.is_overdue && (
                <Badge variant="destructive" className="text-xs">Overdue</Badge>
              )}
            </div>
            <CardDescription className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {action.project_name}
              </span>
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getPriorityBadgeVariant(action.priority)}>
              {getPriorityLabel(action.priority)}
            </Badge>
            <Badge variant={getActionStatusVariant(action.status)}>
              {getActionStatusLabel(action.status)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground mb-3">{action.description}</p>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {action.assigned_to_name && (
            <span>Assigned: {action.assigned_to_name}</span>
          )}
          {action.due_date && (
            <span className={cn(action.is_overdue && "text-destructive")}>
              Due: {formatSafetyDate(action.due_date)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function CorrectiveActionsList({ filter }: { filter: 'all' | 'open' | 'overdue' | 'completed' }) {
  const { data: actions = [], isLoading } = useSubcontractorCorrectiveActions()

  const filteredActions = filterActionsByStatus(actions, filter)

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-5 bg-muted rounded w-32 mb-2" />
              <div className="h-4 bg-muted rounded w-48" />
            </CardHeader>
          </Card>
        ))}
      </div>
    )
  }

  if (filteredActions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4" />
          <p className="text-muted-foreground">
            {filter === 'all'
              ? "No corrective actions"
              : `No ${filter} corrective actions`}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {filteredActions.map((action) => (
        <CorrectiveActionCard key={action.id} action={action} />
      ))}
    </div>
  )
}

function ToolboxTalkCard({ talk }: { talk: SubcontractorToolboxTalk }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="heading-card">{talk.topic}</CardTitle>
            <CardDescription className="flex items-center gap-4 mt-1">
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {talk.project_name}
              </span>
              <span>{formatSafetyDate(talk.conducted_at)}</span>
            </CardDescription>
          </div>
          <Badge variant="outline">
            {talk.attendees_count} attendees
          </Badge>
        </div>
      </CardHeader>
      {talk.description && (
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">{talk.description}</p>
        </CardContent>
      )}
    </Card>
  )
}

function ToolboxTalksList() {
  const { data: talks = [], isLoading } = useSubcontractorToolboxTalks()

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-5 bg-muted rounded w-48 mb-2" />
              <div className="h-4 bg-muted rounded w-32" />
            </CardHeader>
          </Card>
        ))}
      </div>
    )
  }

  if (talks.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No toolbox talks recorded</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {talks.map((talk) => (
        <ToolboxTalkCard key={talk.id} talk={talk} />
      ))}
    </div>
  )
}

// =============================================
// MAIN PAGE COMPONENT
// =============================================

export default function SubcontractorSafetyPage() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="heading-page">Safety Compliance</h1>
        <p className="text-muted-foreground">
          View safety metrics, incidents, and compliance status
        </p>
      </div>

      {/* Score and Overview Row */}
      <div className="grid gap-6 lg:grid-cols-4">
        <ComplianceScoreCard />
        <div className="lg:col-span-3">
          <SafetySummaryCards />
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Incidents and Actions Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Incidents */}
          <Card>
            <CardHeader>
              <CardTitle className="heading-card flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Safety Incidents
              </CardTitle>
              <CardDescription>
                Incidents reported on your projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="open">Open</TabsTrigger>
                  <TabsTrigger value="recordable">Recordable</TabsTrigger>
                  <TabsTrigger value="closed">Closed</TabsTrigger>
                </TabsList>

                <TabsContent value="all">
                  <IncidentsList filter="all" />
                </TabsContent>
                <TabsContent value="open">
                  <IncidentsList filter="open" />
                </TabsContent>
                <TabsContent value="recordable">
                  <IncidentsList filter="recordable" />
                </TabsContent>
                <TabsContent value="closed">
                  <IncidentsList filter="closed" />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Corrective Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="heading-card flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Corrective Actions
              </CardTitle>
              <CardDescription>
                Actions required from safety incidents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="open" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="open">Open</TabsTrigger>
                  <TabsTrigger value="overdue">Overdue</TabsTrigger>
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                  <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>

                <TabsContent value="open">
                  <CorrectiveActionsList filter="open" />
                </TabsContent>
                <TabsContent value="overdue">
                  <CorrectiveActionsList filter="overdue" />
                </TabsContent>
                <TabsContent value="completed">
                  <CorrectiveActionsList filter="completed" />
                </TabsContent>
                <TabsContent value="all">
                  <CorrectiveActionsList filter="all" />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Certificate Status */}
          <CertificateStatusCard />

          {/* Toolbox Talks */}
          <Card>
            <CardHeader>
              <CardTitle className="heading-card flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Recent Toolbox Talks
              </CardTitle>
              <CardDescription>
                Safety training sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ToolboxTalksList />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
