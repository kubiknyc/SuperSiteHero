/**
 * Superintendent Dashboard
 *
 * Field operations focused dashboard for superintendents:
 * - Daily reports status
 * - Workforce on-site
 * - Safety metrics
 * - Punch list progress
 * - Weather conditions
 * - Equipment tracking
 * - Inspections schedule
 */

import * as React from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import {
  FileText,
  Users,
  Shield,
  CheckSquare,
  Truck,
  ClipboardCheck,
  AlertTriangle,
  HardHat,
  TrendingUp,
  TrendingDown,
  Calendar,
  Sun,
  CloudRain,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import type { Project } from '@/types/database'
import { useSuperintendentDashboard } from '../hooks/useSuperintendentDashboard'

interface SuperintendentDashboardProps {
  project?: Project | null
  projectId?: string
}

export function SuperintendentDashboard({ project: _project, projectId }: SuperintendentDashboardProps) {
  // Fetch real data from the dashboard hook
  const { data, isLoading } = useSuperintendentDashboard(projectId)

  // Use real data or fallback defaults
  const dailyReportStatus = data?.dailyReportStatus || {
    submitted: false,
    lastSubmitted: null,
  }

  const workforceMetrics = data?.workforceMetrics || {
    totalOnSite: 0,
    byTrade: [],
    hoursToday: 0,
    trend: 'stable' as const,
    trendValue: 0,
  }

  const safetyMetrics = data?.safetyMetrics || {
    daysSinceIncident: 0,
    nearMissesThisWeek: 0,
    toolboxTalksCompleted: 0,
    openObservations: 0,
    safetyScore: 0,
  }

  const punchListMetrics = data?.punchListMetrics || {
    open: 0,
    inProgress: 0,
    readyForReview: 0,
    completedThisWeek: 0,
    percentComplete: 0,
  }

  const weather = data?.weather || {
    condition: 'Unknown',
    temperature: 0,
    high: 0,
    low: 0,
    humidity: 0,
    windSpeed: 0,
    workable: true,
  }

  const equipmentOnSite = data?.equipmentOnSite || []

  const upcomingInspections = data?.upcomingInspections || []

  const todaysChecklist = data?.todaysChecklist || []

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2 heading-section">
              <HardHat className="h-6 w-6 text-warning" />
              Field Operations Dashboard
            </h2>
            <p className="text-muted-foreground">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-3 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground mt-2">Loading field data...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 heading-section">
            <HardHat className="h-6 w-6 text-warning" />
            Field Operations Dashboard
          </h2>
          <p className="text-muted-foreground">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        {!dailyReportStatus.submitted && (
          <Link to={projectId ? `/projects/${projectId}/daily-reports/new` : '/daily-reports/new'}>
            <Button className="bg-primary hover:bg-primary-hover">
              <FileText className="h-4 w-4 mr-2" />
              Submit Daily Report
            </Button>
          </Link>
        )}
      </div>

      {/* Daily Report Alert */}
      {!dailyReportStatus.submitted && (
        <Card className="border-amber-300 bg-warning-light">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <div className="flex-1">
                <p className="font-medium text-amber-800">Daily Report Not Submitted</p>
                <p className="text-sm text-amber-700">
                  Last report: {dailyReportStatus.lastSubmitted
                    ? format(new Date(dailyReportStatus.lastSubmitted), 'MMM d, yyyy')
                    : 'None'}
                </p>
              </div>
              <Link to={projectId ? `/projects/${projectId}/daily-reports/new` : '/daily-reports/new'}>
                <Button size="sm" variant="outline" className="border-amber-600 text-amber-700">
                  Submit Now
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Row - Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Workforce */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Workforce On-Site</p>
                <p className="text-3xl font-bold">{workforceMetrics.totalOnSite}</p>
                <div className="flex items-center gap-1 text-xs mt-1">
                  {workforceMetrics.trend === 'up' ? (
                    <TrendingUp className="h-3 w-3 text-success" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-error" />
                  )}
                  <span className={workforceMetrics.trend === 'up' ? 'text-success' : 'text-error'}>
                    {workforceMetrics.trendValue}% vs yesterday
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-info-light">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Safety */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Days Without Incident</p>
                <p className="text-3xl font-bold text-success">{safetyMetrics.daysSinceIncident}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Safety Score: {safetyMetrics.safetyScore}%
                </p>
              </div>
              <div className="p-3 rounded-full bg-success-light">
                <Shield className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Punch List */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Punch Items</p>
                <p className="text-3xl font-bold">{punchListMetrics.open}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {punchListMetrics.completedThisWeek} completed this week
                </p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <CheckSquare className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weather */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Weather</p>
                <p className="text-3xl font-bold">{weather.temperature}°F</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {weather.condition}
                </p>
              </div>
              <div className={`p-3 rounded-full ${weather.workable ? 'bg-info-light' : 'bg-error-light'}`}>
                {weather.condition.includes('Rain') ? (
                  <CloudRain className={`h-6 w-6 ${weather.workable ? 'text-primary' : 'text-error'}`} />
                ) : (
                  <Sun className={`h-6 w-6 ${weather.workable ? 'text-primary' : 'text-error'}`} />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workforce Breakdown */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Workforce by Trade</CardTitle>
              <Badge variant="secondary">{workforceMetrics.hoursToday} hrs today</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {workforceMetrics.byTrade.map((trade) => (
                <div key={trade.trade} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-24 text-sm font-medium">{trade.trade}</div>
                    <div className="text-sm text-muted-foreground">{trade.subcontractor}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={(trade.count / workforceMetrics.totalOnSite) * 100} className="w-24" />
                    <span className="w-8 text-sm font-medium text-right">{trade.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Today's Checklist */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Today's Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {todaysChecklist.map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    item.completed ? 'bg-success border-success' : 'border-input'
                  }`}>
                    {item.completed && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-sm ${item.completed ? 'text-muted-foreground line-through' : ''}`}>
                    {item.task}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Equipment On-Site */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Equipment Status</CardTitle>
              <Link to={projectId ? `/projects/${projectId}/equipment` : '/equipment'}>
                <Button variant="ghost" size="sm">
                  View All <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {equipmentOnSite.map((equip, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{equip.name}</p>
                      {equip.operator && (
                        <p className="text-xs text-muted-foreground">{equip.operator}</p>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      equip.status === 'active' ? 'bg-success-light text-green-800' :
                      equip.status === 'idle' ? 'bg-muted text-foreground' :
                      'bg-amber-100 text-amber-800'
                    }
                  >
                    {equip.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Inspections */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Upcoming Inspections</CardTitle>
              <Link to={projectId ? `/projects/${projectId}/inspections` : '/inspections'}>
                <Button variant="ghost" size="sm">
                  View All <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingInspections.map((inspection, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{inspection.type}</p>
                      <p className="text-xs text-muted-foreground">{inspection.date}</p>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={inspection.status === 'scheduled' ? 'bg-success-light text-green-800' : 'bg-amber-100 text-amber-800'}
                  >
                    {inspection.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Safety Summary */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Safety This Week</CardTitle>
              <Link to={projectId ? `/projects/${projectId}/safety` : '/safety'}>
                <Button variant="ghost" size="sm">
                  View All <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Near Misses Reported</span>
                <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                  {safetyMetrics.nearMissesThisWeek}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Toolbox Talks Completed</span>
                <Badge variant="secondary" className="bg-success-light text-green-800">
                  {safetyMetrics.toolboxTalksCompleted}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Open Observations</span>
                <Badge variant="secondary" className="bg-info-light text-blue-800">
                  {safetyMetrics.openObservations}
                </Badge>
              </div>
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Safety Score</span>
                  <span className="text-sm font-bold text-success">{safetyMetrics.safetyScore}%</span>
                </div>
                <Progress value={safetyMetrics.safetyScore} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <Link to={projectId ? `/projects/${projectId}/daily-reports/new` : '/daily-reports/new'}>
              <Button variant="outline" className="w-full h-auto py-3 flex-col gap-1">
                <FileText className="h-5 w-5" />
                <span className="text-xs">Daily Report</span>
              </Button>
            </Link>
            <Link to={projectId ? `/projects/${projectId}/punch-lists/new` : '/punch-lists/new'}>
              <Button variant="outline" className="w-full h-auto py-3 flex-col gap-1">
                <CheckSquare className="h-5 w-5" />
                <span className="text-xs">Add Punch</span>
              </Button>
            </Link>
            <Link to={projectId ? `/projects/${projectId}/safety/new` : '/safety/new'}>
              <Button variant="outline" className="w-full h-auto py-3 flex-col gap-1">
                <AlertTriangle className="h-5 w-5" />
                <span className="text-xs">Log Incident</span>
              </Button>
            </Link>
            <Link to={projectId ? `/projects/${projectId}/toolbox-talks/new` : '/toolbox-talks/new'}>
              <Button variant="outline" className="w-full h-auto py-3 flex-col gap-1">
                <Shield className="h-5 w-5" />
                <span className="text-xs">Toolbox Talk</span>
              </Button>
            </Link>
            <Link to={projectId ? `/projects/${projectId}/equipment` : '/equipment'}>
              <Button variant="outline" className="w-full h-auto py-3 flex-col gap-1">
                <Truck className="h-5 w-5" />
                <span className="text-xs">Equipment</span>
              </Button>
            </Link>
            <Link to={projectId ? `/projects/${projectId}/inspections/schedule` : '/inspections/schedule'}>
              <Button variant="outline" className="w-full h-auto py-3 flex-col gap-1">
                <Calendar className="h-5 w-5" />
                <span className="text-xs">Inspections</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default SuperintendentDashboard
