/**
 * EVM Dashboard Component
 *
 * Main dashboard for Earned Value Management metrics
 * Displays comprehensive EVM data including:
 * - Performance indices (CPI, SPI)
 * - Cost analysis (EAC, ETC, VAC)
 * - Trend charts
 * - Division breakdown
 * - Alerts
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  RefreshCw,
  TrendingUp,
  DollarSign,
  Clock,
  AlertTriangle,
  BarChart3,
  Table2,
  Activity,
  Calendar,
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

import { EVMMetricsCards } from './EVMMetricsCards'
import { EVMTrendChart } from './EVMTrendChart'
import { EVMAlerts } from './EVMAlerts'
import { EVMDivisionTable } from './EVMDivisionTable'
import {
  useEVMMetrics,
  useEVMTrend,
  useEVMByDivision,
  useEVMAlerts,
  useCreateEVMSnapshot,
  useEVMDisplayValues,
  useEVMHealthCheck,
} from '../../hooks/useEVM'
import { useAuth } from '@/lib/auth/AuthContext'

interface EVMDashboardProps {
  projectId: string
  companyId: string
  projectName?: string
}

export function EVMDashboard({ projectId, companyId, projectName }: EVMDashboardProps) {
  const [trendDays, setTrendDays] = useState(30)
  const [activeTab, setActiveTab] = useState('overview')
  const { userProfile } = useAuth()

  // Fetch EVM data
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useEVMMetrics(projectId)
  const { data: trend, isLoading: trendLoading } = useEVMTrend(projectId, trendDays)
  const { data: byDivision, isLoading: divisionLoading } = useEVMByDivision(projectId)
  const { data: alerts, isLoading: alertsLoading } = useEVMAlerts(projectId)

  // Mutations
  const createSnapshot = useCreateEVMSnapshot()

  // Derived data
  const displayValues = useEVMDisplayValues(metrics)
  const healthCheck = useEVMHealthCheck(projectId)

  const handleCreateSnapshot = async () => {
    await createSnapshot.mutateAsync({
      projectId,
      companyId,
      createdBy: userProfile?.id,
    })
  }

  const handleRefresh = () => {
    refetchMetrics()
  }

  const isLoading = metricsLoading || trendLoading || divisionLoading || alertsLoading

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2 heading-section">
            <Activity className="h-6 w-6 text-primary" />
            Earned Value Management
          </h2>
          <p className="text-muted-foreground mt-1">
            {projectName || 'Project'} Performance Analysis
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Badge */}
          {metrics && (
            <Badge
              variant="secondary"
              className={cn(
                healthCheck.riskLevel === 'low' && 'bg-success-light text-success-dark',
                healthCheck.riskLevel === 'medium' && 'bg-warning-light text-yellow-700',
                healthCheck.riskLevel === 'high' && 'bg-orange-100 text-orange-700',
                healthCheck.riskLevel === 'critical' && 'bg-error-light text-error-dark'
              )}
            >
              {healthCheck.riskLevel === 'low' && 'Healthy'}
              {healthCheck.riskLevel === 'medium' && 'At Risk'}
              {healthCheck.riskLevel === 'high' && 'High Risk'}
              {healthCheck.riskLevel === 'critical' && 'Critical'}
            </Badge>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateSnapshot}
            disabled={createSnapshot.isPending}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Save Snapshot
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className={cn(
            'border',
            metrics.CPI >= 1 ? 'border-green-200 bg-success-light/50' : 'border-red-200 bg-error-light/50'
          )}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">CPI</p>
                  <p className="text-2xl font-bold">{displayValues.cpi}</p>
                </div>
                <DollarSign className={cn(
                  'h-8 w-8',
                  metrics.CPI >= 1 ? 'text-success' : 'text-error'
                )} />
              </div>
              <p className="text-xs mt-1 text-muted-foreground">
                {metrics.CPI >= 1 ? 'Under budget' : 'Over budget'}
              </p>
            </CardContent>
          </Card>

          <Card className={cn(
            'border',
            metrics.SPI >= 1 ? 'border-green-200 bg-success-light/50' : 'border-red-200 bg-error-light/50'
          )}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">SPI</p>
                  <p className="text-2xl font-bold">{displayValues.spi}</p>
                </div>
                <Clock className={cn(
                  'h-8 w-8',
                  metrics.SPI >= 1 ? 'text-success' : 'text-error'
                )} />
              </div>
              <p className="text-xs mt-1 text-muted-foreground">
                {metrics.SPI >= 1 ? 'Ahead of schedule' : 'Behind schedule'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">EAC</p>
                  <p className="text-2xl font-bold">{displayValues.eac}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <p className="text-xs mt-1 text-muted-foreground">
                Estimated final cost
              </p>
            </CardContent>
          </Card>

          <Card className={cn(
            'border',
            metrics.VAC >= 0 ? 'border-green-200 bg-success-light/50' : 'border-red-200 bg-error-light/50'
          )}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">VAC</p>
                  <p className="text-2xl font-bold">{displayValues.vac}</p>
                </div>
                <AlertTriangle className={cn(
                  'h-8 w-8',
                  metrics.VAC >= 0 ? 'text-success' : 'text-error'
                )} />
              </div>
              <p className="text-xs mt-1 text-muted-foreground">
                {metrics.VAC >= 0 ? 'Projected savings' : 'Projected overrun'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerts (if any critical or warning) */}
      {alerts && (alerts.some(a => a.severity === 'critical' || a.severity === 'warning')) && (
        <EVMAlerts alerts={alerts} maxAlerts={3} compact />
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="trend" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Trend Analysis
          </TabsTrigger>
          <TabsTrigger value="divisions" className="flex items-center gap-2">
            <Table2 className="h-4 w-4" />
            By Division
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Alerts
            {alerts && alerts.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {alerts.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <EVMMetricsCards metrics={metrics} isLoading={metricsLoading} />
        </TabsContent>

        <TabsContent value="trend" className="mt-6 space-y-6">
          {/* Trend Period Selector */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Show trend for:</span>
            <Select
              value={trendDays.toString()}
              onValueChange={(v) => setTrendDays(parseInt(v))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <EVMTrendChart
            data={trend}
            isLoading={trendLoading}
            height={400}
          />

          {/* Trend Insights */}
          {trend && trend.length >= 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Trend Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">CPI Change</p>
                    <p className={cn(
                      'text-lg font-bold',
                      (trend[trend.length - 1].CPI - trend[0].CPI) >= 0
                        ? 'text-success'
                        : 'text-error'
                    )}>
                      {(trend[trend.length - 1].CPI - trend[0].CPI) >= 0 ? '+' : ''}
                      {(trend[trend.length - 1].CPI - trend[0].CPI).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">Over {trendDays} days</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">SPI Change</p>
                    <p className={cn(
                      'text-lg font-bold',
                      (trend[trend.length - 1].SPI - trend[0].SPI) >= 0
                        ? 'text-success'
                        : 'text-error'
                    )}>
                      {(trend[trend.length - 1].SPI - trend[0].SPI) >= 0 ? '+' : ''}
                      {(trend[trend.length - 1].SPI - trend[0].SPI).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">Over {trendDays} days</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Progress Made</p>
                    <p className="text-lg font-bold text-primary">
                      +{(trend[trend.length - 1].percent_complete - trend[0].percent_complete).toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {trend[0].percent_complete.toFixed(1)}% → {trend[trend.length - 1].percent_complete.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="divisions" className="mt-6">
          <EVMDivisionTable data={byDivision} isLoading={divisionLoading} />
        </TabsContent>

        <TabsContent value="alerts" className="mt-6">
          <EVMAlerts alerts={alerts} isLoading={alertsLoading} />
        </TabsContent>
      </Tabs>

      {/* Status Date */}
      {metrics && (
        <p className="text-xs text-muted-foreground text-center">
          EVM data as of {format(new Date(metrics.status_date), 'MMMM d, yyyy')}
        </p>
      )}
    </div>
  )
}

export default EVMDashboard
