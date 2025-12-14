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
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart2,
  PieChart,
  Building2,
  Users,
  Shield,
  Target,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
  Activity,
  Gauge,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface ExecutiveDashboardProps {
  companyId?: string
}

export function ExecutiveDashboard({ companyId }: ExecutiveDashboardProps) {
  // Mock data - replace with actual queries
  const portfolioMetrics = {
    totalProjects: 8,
    activeProjects: 5,
    totalContractValue: 87500000,
    revenueToDate: 52300000,
    profitMargin: 8.2,
    projectedRevenue: 89200000,
    backlog: 35200000,
  }

  const projectsSummary = [
    {
      id: '1',
      name: 'Downtown Office Tower',
      status: 'active',
      contractValue: 24500000,
      percentComplete: 62,
      margin: 9.1,
      risk: 'medium',
      scheduleStatus: 'on-track',
    },
    {
      id: '2',
      name: 'Riverside Apartments',
      status: 'active',
      contractValue: 18200000,
      percentComplete: 45,
      margin: 7.8,
      risk: 'low',
      scheduleStatus: 'ahead',
    },
    {
      id: '3',
      name: 'Medical Center Expansion',
      status: 'active',
      contractValue: 32000000,
      percentComplete: 28,
      margin: 8.5,
      risk: 'high',
      scheduleStatus: 'behind',
    },
    {
      id: '4',
      name: 'Retail Plaza Phase 2',
      status: 'active',
      contractValue: 8500000,
      percentComplete: 85,
      margin: 10.2,
      risk: 'low',
      scheduleStatus: 'on-track',
    },
    {
      id: '5',
      name: 'Industrial Warehouse',
      status: 'active',
      contractValue: 4300000,
      percentComplete: 72,
      margin: 6.9,
      risk: 'medium',
      scheduleStatus: 'on-track',
    },
  ]

  const financialTrends = {
    revenueGrowth: 12.5,
    profitGrowth: 8.3,
    cashOnHand: 4250000,
    arAging: {
      current: 2800000,
      over30: 450000,
      over60: 125000,
      over90: 45000,
    },
    unbilledRevenue: 1850000,
  }

  const safetyMetrics = {
    emr: 0.85,
    trir: 1.2,
    totalIncidents: 3,
    nearMisses: 12,
    daysWithoutLostTime: 342,
    safetyScore: 94,
  }

  const resourceUtilization = {
    totalEmployees: 156,
    fieldWorkers: 124,
    pmUtilization: 87,
    equipmentUtilization: 72,
    subcontractorSpend: 45200000,
  }

  const kpis = [
    { name: 'On-Time Delivery', value: 88, target: 90, trend: 'up' },
    { name: 'Budget Performance', value: 94, target: 95, trend: 'stable' },
    { name: 'Client Satisfaction', value: 92, target: 90, trend: 'up' },
    { name: 'Safety Score', value: 94, target: 95, trend: 'up' },
  ]

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)
  }

  const formatCurrencyFull = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
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
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{kpi.name}</span>
                  {kpi.trend === 'up' && <ArrowUpRight className="h-4 w-4 text-green-600" />}
                  {kpi.trend === 'down' && <ArrowDownRight className="h-4 w-4 text-red-600" />}
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold">{kpi.value}%</span>
                  <span className="text-sm text-muted-foreground mb-1">/ {kpi.target}% target</span>
                </div>
                <Progress
                  value={kpi.value}
                  className={`h-2 mt-2 ${kpi.value >= kpi.target ? 'bg-green-100' : 'bg-amber-100'}`}
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
                      <Link to={`/projects/${project.id}`} className="font-medium hover:text-blue-600">
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
                      <span className={project.margin >= 8 ? 'text-green-600' : project.margin >= 6 ? 'text-amber-600' : 'text-red-600'}>
                        {project.margin}%
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      <Badge
                        variant="secondary"
                        className={
                          project.scheduleStatus === 'ahead' ? 'bg-green-100 text-green-800' :
                          project.scheduleStatus === 'on-track' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }
                      >
                        {project.scheduleStatus}
                      </Badge>
                    </td>
                    <td className="py-3 text-center">
                      <div className={`w-3 h-3 rounded-full mx-auto ${
                        project.risk === 'low' ? 'bg-green-500' :
                        project.risk === 'medium' ? 'bg-amber-500' : 'bg-red-500'
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
                <span className="font-bold text-green-600">{formatCurrency(financialTrends.cashOnHand)}</span>
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
                    <span className="text-green-600">{formatCurrency(financialTrends.arAging.current)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">30-60 days</span>
                    <span className="text-amber-600">{formatCurrency(financialTrends.arAging.over30)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">60-90 days</span>
                    <span className="text-orange-600">{formatCurrency(financialTrends.arAging.over60)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Over 90 days</span>
                    <span className="text-red-600">{formatCurrency(financialTrends.arAging.over90)}</span>
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
                <div className="p-3 bg-green-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-700">{safetyMetrics.emr}</p>
                  <p className="text-xs text-green-600">EMR</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-700">{safetyMetrics.trir}</p>
                  <p className="text-xs text-blue-600">TRIR</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Days Without Lost Time</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
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
                  <span className="text-sm font-bold text-green-600">{safetyMetrics.safetyScore}%</span>
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
