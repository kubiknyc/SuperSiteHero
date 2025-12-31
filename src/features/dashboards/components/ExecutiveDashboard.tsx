/**
 * Executive Dashboard
 *
 * Portfolio-level dashboard for executives:
 * - Multi-project overview
 * - Financial summary across projects
 * - Risk assessment
 * - Resource utilization
 * - Key performance indicators
 */

import * as React from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import {
  DollarSign,
  TrendingUp,
  BarChart2,
  Building2,
  Users,
  Target,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
  Activity,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useExecutiveDashboard } from '../hooks/useExecutiveDashboard'

interface ExecutiveDashboardProps {
  companyId?: string
}

export function ExecutiveDashboard({ companyId }: ExecutiveDashboardProps) {
  // Fetch real data from the dashboard hook
  const { data, isLoading, error } = useExecutiveDashboard(companyId)

  // Use real data or fallback defaults
  const portfolioMetrics = data?.portfolioMetrics || {
    totalProjects: 0,
    activeProjects: 0,
    totalContractValue: 0,
    revenueToDate: 0,
    profitMargin: 0,
    projectedRevenue: 0,
    backlog: 0,
  }

  const projectsSummary = data?.projectsSummary || []

  const financialTrends = data?.financialTrends || {
    revenueGrowth: 0,
    profitGrowth: 0,
    cashOnHand: 0,
    arAging: {
      current: 0,
      over30: 0,
      over60: 0,
      over90: 0,
    },
    unbilledRevenue: 0,
  }

  const safetyMetrics = data?.safetyMetrics || {
    emr: 0,
    trir: 0,
    totalIncidents: 0,
    nearMisses: 0,
    daysWithoutLostTime: 0,
    safetyScore: 0,
  }

  const resourceUtilization = data?.resourceUtilization || {
    totalEmployees: 0,
    fieldWorkers: 0,
    pmUtilization: 0,
    equipmentUtilization: 0,
    subcontractorSpend: 0,
  }

  const kpis = data?.kpis || []

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)
  }

  const _formatCurrencyFull = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2 heading-section">
              <Building2 className="h-6 w-6 text-indigo-600" />
              Executive Dashboard
            </h2>
            <p className="text-muted-foreground">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground mt-2">Loading dashboard data...</p>
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
            <Building2 className="h-6 w-6 text-indigo-600" />
            Executive Dashboard
          </h2>
          <p className="text-muted-foreground">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/reports/templates">
            <Button variant="outline">
              <BarChart2 className="h-4 w-4 mr-2" />
              Reports
            </Button>
          </Link>
          <Link to="/analytics">
            <Button>
              <Activity className="h-4 w-4 mr-2" />
              Full Analytics
            </Button>
          </Link>
        </div>
      </div>

      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-indigo-100">Total Contract Value</p>
                <p className="text-3xl font-bold">{formatCurrency(portfolioMetrics.totalContractValue)}</p>
                <p className="text-sm text-indigo-100 mt-1">
                  {portfolioMetrics.activeProjects} active projects
                </p>
              </div>
              <DollarSign className="h-10 w-10 text-indigo-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-100">Revenue to Date</p>
                <p className="text-3xl font-bold">{formatCurrency(portfolioMetrics.revenueToDate)}</p>
                <div className="flex items-center gap-1 text-sm text-emerald-100 mt-1">
                  <TrendingUp className="h-3 w-3" />
                  <span>{financialTrends.revenueGrowth}% YoY</span>
                </div>
              </div>
              <TrendingUp className="h-10 w-10 text-emerald-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-100">Profit Margin</p>
                <p className="text-3xl font-bold">{portfolioMetrics.profitMargin}%</p>
                <div className="flex items-center gap-1 text-sm text-blue-100 mt-1">
                  <TrendingUp className="h-3 w-3" />
                  <span>{financialTrends.profitGrowth}% vs last year</span>
                </div>
              </div>
              <Target className="h-10 w-10 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-100">Backlog</p>
                <p className="text-3xl font-bold">{formatCurrency(portfolioMetrics.backlog)}</p>
                <p className="text-sm text-amber-100 mt-1">
                  ~8 months of work
                </p>
              </div>
              <Briefcase className="h-10 w-10 text-amber-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPIs */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Key Performance Indicators</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi, index) => (
              <div key={index} className="p-4 bg-surface rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{kpi.name}</span>
                  {kpi.trend === 'up' && <ArrowUpRight className="h-4 w-4 text-success" />}
                  {kpi.trend === 'down' && <ArrowDownRight className="h-4 w-4 text-error" />}
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold">{kpi.value}%</span>
                  <span className="text-sm text-muted-foreground mb-1">/ {kpi.target}% target</span>
                </div>
                <Progress
                  value={kpi.value}
                  className={`h-2 mt-2 ${kpi.value >= kpi.target ? 'bg-success-light' : 'bg-amber-100'}`}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Projects Overview */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Active Projects</CardTitle>
            <Link to="/projects">
              <Button variant="ghost" size="sm">
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="pb-3 font-medium">Project</th>
                  <th className="pb-3 font-medium text-right">Contract Value</th>
                  <th className="pb-3 font-medium text-center">Progress</th>
                  <th className="pb-3 font-medium text-right">Margin</th>
                  <th className="pb-3 font-medium text-center">Schedule</th>
                  <th className="pb-3 font-medium text-center">Risk</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {projectsSummary.map((project) => (
                  <tr key={project.id} className="border-b last:border-0">
                    <td className="py-3">
                      <Link to={`/projects/${project.id}`} className="font-medium hover:text-primary">
                        {project.name}
                      </Link>
                    </td>
                    <td className="py-3 text-right">{formatCurrency(project.contractValue)}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2 justify-center">
                        <Progress value={project.percentComplete} className="w-20 h-2" />
                        <span className="text-xs">{project.percentComplete}%</span>
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <span className={project.margin >= 8 ? 'text-success' : project.margin >= 6 ? 'text-warning' : 'text-error'}>
                        {project.margin}%
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      <Badge
                        variant="secondary"
                        className={
                          project.scheduleStatus === 'ahead' ? 'bg-success-light text-green-800' :
                          project.scheduleStatus === 'on-track' ? 'bg-info-light text-blue-800' :
                          'bg-error-light text-red-800'
                        }
                      >
                        {project.scheduleStatus}
                      </Badge>
                    </td>
                    <td className="py-3 text-center">
                      <div className={`w-3 h-3 rounded-full mx-auto ${
                        project.risk === 'low' ? 'bg-green-500' :
                        project.risk === 'medium' ? 'bg-warning' : 'bg-red-500'
                      }`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial Health */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Financial Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Cash on Hand</span>
                <span className="font-bold text-success">{formatCurrency(financialTrends.cashOnHand)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Unbilled Revenue</span>
                <span className="font-bold">{formatCurrency(financialTrends.unbilledRevenue)}</span>
              </div>
              <div className="pt-3 border-t">
                <p className="text-sm font-medium mb-2">Accounts Receivable Aging</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Current</span>
                    <span className="text-success">{formatCurrency(financialTrends.arAging.current)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">30-60 days</span>
                    <span className="text-warning">{formatCurrency(financialTrends.arAging.over30)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">60-90 days</span>
                    <span className="text-orange-600">{formatCurrency(financialTrends.arAging.over60)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Over 90 days</span>
                    <span className="text-error">{formatCurrency(financialTrends.arAging.over90)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Safety Performance */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Safety Performance</CardTitle>
              <Link to="/safety">
                <Button variant="ghost" size="sm">
                  Details <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-success-light rounded-lg text-center">
                  <p className="text-2xl font-bold text-success-dark">{safetyMetrics.emr}</p>
                  <p className="text-xs text-success">EMR</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-primary-hover">{safetyMetrics.trir}</p>
                  <p className="text-xs text-primary">TRIR</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Days Without Lost Time</span>
                  <Badge variant="secondary" className="bg-success-light text-green-800">
                    {safetyMetrics.daysWithoutLostTime}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Incidents (YTD)</span>
                  <span className="font-medium">{safetyMetrics.totalIncidents}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Near Misses Reported</span>
                  <span className="font-medium">{safetyMetrics.nearMisses}</span>
                </div>
              </div>
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Overall Safety Score</span>
                  <span className="text-sm font-bold text-success">{safetyMetrics.safetyScore}%</span>
                </div>
                <Progress value={safetyMetrics.safetyScore} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resource Utilization */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Resource Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Total Workforce</span>
                </div>
                <span className="font-bold">{resourceUtilization.totalEmployees}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground ml-6">Field Workers</span>
                <span className="text-sm">{resourceUtilization.fieldWorkers}</span>
              </div>
              <div className="pt-3 border-t space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">PM Utilization</span>
                    <span className="text-sm font-medium">{resourceUtilization.pmUtilization}%</span>
                  </div>
                  <Progress value={resourceUtilization.pmUtilization} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">Equipment Utilization</span>
                    <span className="text-sm font-medium">{resourceUtilization.equipmentUtilization}%</span>
                  </div>
                  <Progress value={resourceUtilization.equipmentUtilization} className="h-2" />
                </div>
              </div>
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Subcontractor Spend (YTD)</span>
                  <span className="font-bold">{formatCurrency(resourceUtilization.subcontractorSpend)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ExecutiveDashboard
