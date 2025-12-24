/**
 * Insurance Compliance Dashboard Component
 * Main dashboard showing insurance compliance overview
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  TrendingUp,
  Building2,
  FileCheck,
} from 'lucide-react'
import { useInsuranceDashboardStats, useComplianceSummary } from '../hooks/useInsurance'
import { InsuranceExpirationAlerts } from './InsuranceExpirationAlerts'
import type { ComplianceSummary, InsuranceDashboardStats, ExpiringCertificate } from '@/types/insurance'
import { cn } from '@/lib/utils'

interface InsuranceComplianceDashboardProps {
  onViewCertificate?: (certificate: ExpiringCertificate) => void
  onViewAllAlerts?: () => void
  onViewSubcontractor?: (subcontractorId: string) => void
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  color,
}: {
  title: string
  value: number | string
  icon: typeof Shield
  description?: string
  trend?: number
  color: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={cn('p-2 rounded-lg', color)}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        {trend !== undefined && (
          <div className="flex items-center gap-1 mt-2 text-xs">
            <TrendingUp
              className={cn('h-3 w-3', trend >= 0 ? 'text-success' : 'text-error')}
            />
            <span className={trend >= 0 ? 'text-success' : 'text-error'}>
              {trend >= 0 ? '+' : ''}
              {trend}%
            </span>
            <span className="text-muted-foreground">from last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ComplianceRing({ percentage }: { percentage: number }) {
  const radius = 60
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="transform -rotate-90" width="140" height="140">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          className="text-muted"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={cn(
            percentage >= 90
              ? 'text-success'
              : percentage >= 70
                ? 'text-warning'
                : 'text-error'
          )}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold">{percentage}%</span>
        <span className="text-xs text-muted-foreground">Compliant</span>
      </div>
    </div>
  )
}

function SubcontractorComplianceList({
  compliance,
  onViewSubcontractor,
}: {
  compliance: ComplianceSummary[]
  onViewSubcontractor?: (subcontractorId: string) => void
}) {
  // Sort by compliance issues (expired first, then expiring)
  const sorted = [...compliance].sort((a, b) => {
    if (a.expired_certificates !== b.expired_certificates) {
      return b.expired_certificates - a.expired_certificates
    }
    return b.expiring_certificates - a.expiring_certificates
  })

  const withIssues = sorted.filter((s) => s.expired_certificates > 0 || s.expiring_certificates > 0)

  if (withIssues.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <CheckCircle className="h-5 w-5 mr-2 text-success" />
        All subcontractors are in compliance
      </div>
    )
  }

  return (
    <div className="divide-y">
      {withIssues.slice(0, 5).map((sub) => (
        <div
          key={sub.subcontractor_id}
          className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
          onClick={() => onViewSubcontractor?.(sub.subcontractor_id)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'p-2 rounded-lg',
                  sub.expired_certificates > 0 ? 'bg-error-light' : 'bg-warning-light'
                )}
              >
                <Building2
                  className={cn(
                    'h-4 w-4',
                    sub.expired_certificates > 0 ? 'text-error' : 'text-warning'
                  )}
                />
              </div>
              <div>
                <p className="font-medium text-sm">{sub.subcontractor_name}</p>
                {sub.project_name && (
                  <p className="text-xs text-muted-foreground">{sub.project_name}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {sub.expired_certificates > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {sub.expired_certificates} expired
                </Badge>
              )}
              {sub.expiring_certificates > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {sub.expiring_certificates} expiring
                </Badge>
              )}
              {sub.active_certificates > 0 && (
                <Badge variant="outline" className="text-xs">
                  {sub.active_certificates} active
                </Badge>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function InsuranceComplianceDashboard({
  onViewCertificate,
  onViewAllAlerts,
  onViewSubcontractor,
}: InsuranceComplianceDashboardProps) {
  const { data: stats, isLoading: statsLoading } = useInsuranceDashboardStats()
  const { data: complianceSummary, isLoading: complianceLoading } = useComplianceSummary()

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const safeStats: InsuranceDashboardStats = stats || {
    totalCertificates: 0,
    activeCertificates: 0,
    expiringWithin30Days: 0,
    expiredCertificates: 0,
    pendingRenewal: 0,
    complianceRate: 0,
    subcontractorsWithGaps: 0,
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Certificates"
          value={safeStats.totalCertificates}
          icon={FileCheck}
          description="Tracked in system"
          color="bg-info-light text-primary"
        />
        <StatCard
          title="Active Certificates"
          value={safeStats.activeCertificates}
          icon={CheckCircle}
          description="Currently valid"
          color="bg-success-light text-success"
        />
        <StatCard
          title="Expiring Soon"
          value={safeStats.expiringWithin30Days}
          icon={Clock}
          description="Within 30 days"
          color="bg-warning-light text-warning"
        />
        <StatCard
          title="Expired"
          value={safeStats.expiredCertificates}
          icon={XCircle}
          description="Need renewal"
          color="bg-error-light text-error"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compliance Overview */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Compliance Rate
            </CardTitle>
            <CardDescription>Overall insurance compliance status</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center py-6">
            <ComplianceRing percentage={safeStats.complianceRate} />
            <div className="mt-6 w-full space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Active</span>
                <span className="font-medium">{safeStats.activeCertificates}</span>
              </div>
              <Progress
                value={
                  safeStats.totalCertificates > 0
                    ? (safeStats.activeCertificates / safeStats.totalCertificates) * 100
                    : 0
                }
                className="h-2"
              />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pending Renewal</span>
                <span className="font-medium">{safeStats.pendingRenewal}</span>
              </div>
              <Progress
                value={
                  safeStats.totalCertificates > 0
                    ? (safeStats.pendingRenewal / safeStats.totalCertificates) * 100
                    : 0
                }
                className="h-2 [&>div]:bg-blue-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Expiration Alerts */}
        <div className="lg:col-span-2">
          <InsuranceExpirationAlerts
            daysAhead={60}
            maxItems={5}
            onViewCertificate={onViewCertificate}
            onViewAll={onViewAllAlerts}
          />
        </div>
      </div>

      {/* Subcontractor Compliance */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Subcontractor Compliance
              </CardTitle>
              <CardDescription>
                {safeStats.subcontractorsWithGaps > 0
                  ? `${safeStats.subcontractorsWithGaps} subcontractors with coverage gaps`
                  : 'All subcontractors have valid coverage'}
              </CardDescription>
            </div>
            {safeStats.subcontractorsWithGaps > 0 && (
              <Badge variant="destructive">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {safeStats.subcontractorsWithGaps} Issues
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {complianceLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <SubcontractorComplianceList
              compliance={complianceSummary || []}
              onViewSubcontractor={onViewSubcontractor}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
