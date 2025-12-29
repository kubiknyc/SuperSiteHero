/**
 * Maintenance Alerts Component
 * Phase 5: Field Workflow Automation - Milestone 5.2
 *
 * Displays equipment maintenance alerts with actions
 */

import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle,
  MoreVertical,
  Wrench,
  Bell,
  BellOff,
  Calendar,
} from 'lucide-react'
import {
  useMaintenanceAlerts,
  useCompanyMaintenanceAlerts,
  useAcknowledgeAlert,
  useDismissAlert,
  useMaintenanceAlertCount,
} from '../hooks/useEquipmentMaintenanceSchedule'
import type {
  EquipmentMaintenanceAlertWithDetails,
  MaintenanceAlertType,
} from '@/types/workflow-automation'
import { cn } from '@/lib/utils'

// ============================================================================
// Alert Badge Component
// ============================================================================

interface AlertBadgeProps {
  type: MaintenanceAlertType
  className?: string
}

export function MaintenanceAlertBadge({ type, className }: AlertBadgeProps) {
  const config = {
    upcoming: {
      variant: 'secondary' as const,
      icon: Clock,
      label: 'Upcoming',
    },
    due: {
      variant: 'outline' as const,
      icon: Bell,
      label: 'Due',
    },
    overdue: {
      variant: 'destructive' as const,
      icon: AlertTriangle,
      label: 'Overdue',
    },
    critical: {
      variant: 'destructive' as const,
      icon: AlertCircle,
      label: 'Critical',
    },
  }[type]

  const Icon = config.icon

  return (
    <Badge variant={config.variant} className={cn('flex items-center gap-1', className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

// ============================================================================
// Single Alert Card
// ============================================================================

interface AlertCardProps {
  alert: EquipmentMaintenanceAlertWithDetails
  showEquipment?: boolean
  onScheduleMaintenance?: (alert: EquipmentMaintenanceAlertWithDetails) => void
}

export function MaintenanceAlertCard({
  alert,
  showEquipment = true,
  onScheduleMaintenance,
}: AlertCardProps) {
  const acknowledgeAlert = useAcknowledgeAlert()
  const dismissAlert = useDismissAlert()

  const handleAcknowledge = () => {
    acknowledgeAlert.mutate(alert.id)
  }

  const handleDismiss = (hours: number) => {
    const dismissUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
    dismissAlert.mutate({ alertId: alert.id, dismissUntil })
  }

  const alertStyles = {
    upcoming: 'border-blue-200 bg-blue-50',
    due: 'border-yellow-200 bg-warning-light',
    overdue: 'border-orange-200 bg-orange-50',
    critical: 'border-red-200 bg-error-light',
  }[alert.alert_type]

  return (
    <div className={cn('p-4 rounded-lg border', alertStyles)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <MaintenanceAlertBadge type={alert.alert_type} />
            {showEquipment && alert.equipment && (
              <span className="font-medium">
                {alert.equipment.equipment_number} - {alert.equipment.name}
              </span>
            )}
          </div>

          <p className="text-sm">
            {alert.schedule?.maintenance_type || 'Maintenance'} - {alert.message || 'Due for maintenance'}
          </p>

          <p className="text-xs text-muted-foreground">
            Triggered {formatDistanceToNow(new Date(alert.triggered_at), { addSuffix: true })}
            {alert.acknowledged_at && (
              <span className="ml-2">
                (Acknowledged by {alert.acknowledged_by_user?.full_name})
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onScheduleMaintenance && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onScheduleMaintenance(alert)}
            >
              <Wrench className="h-4 w-4 mr-1" />
              Schedule
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!alert.acknowledged_at && (
                <DropdownMenuItem onClick={handleAcknowledge}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Acknowledge
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => handleDismiss(24)}>
                <BellOff className="h-4 w-4 mr-2" />
                Dismiss for 24 hours
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDismiss(72)}>
                <BellOff className="h-4 w-4 mr-2" />
                Dismiss for 3 days
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDismiss(168)}>
                <Calendar className="h-4 w-4 mr-2" />
                Dismiss for 1 week
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Equipment Alerts List
// ============================================================================

interface EquipmentMaintenanceAlertsProps {
  equipmentId: string
  onScheduleMaintenance?: (alert: EquipmentMaintenanceAlertWithDetails) => void
}

export function EquipmentMaintenanceAlerts({
  equipmentId,
  onScheduleMaintenance,
}: EquipmentMaintenanceAlertsProps) {
  const { data: alerts, isLoading } = useMaintenanceAlerts(equipmentId)

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Loading alerts...</div>
  }

  if (!alerts || alerts.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <MaintenanceAlertCard
          key={alert.id}
          alert={alert}
          showEquipment={false}
          onScheduleMaintenance={onScheduleMaintenance}
        />
      ))}
    </div>
  )
}

// ============================================================================
// Company-wide Alerts Dashboard
// ============================================================================

interface MaintenanceAlertsDashboardProps {
  companyId: string
  maxAlerts?: number
  onScheduleMaintenance?: (alert: EquipmentMaintenanceAlertWithDetails) => void
}

export function MaintenanceAlertsDashboard({
  companyId,
  maxAlerts = 10,
  onScheduleMaintenance,
}: MaintenanceAlertsDashboardProps) {
  const { data: alerts, isLoading } = useCompanyMaintenanceAlerts(companyId)
  const { data: unackedCount } = useMaintenanceAlertCount(companyId)

  const criticalAlerts = alerts?.filter((a) => a.alert_type === 'critical') || []
  const overdueAlerts = alerts?.filter((a) => a.alert_type === 'overdue') || []
  const dueAlerts = alerts?.filter((a) => a.alert_type === 'due') || []
  const upcomingAlerts = alerts?.filter((a) => a.alert_type === 'upcoming') || []

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading maintenance alerts...</div>
        </CardContent>
      </Card>
    )
  }

  if (!alerts || alerts.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-success mx-auto mb-3" />
            <p className="text-lg font-medium">All Clear</p>
            <p className="text-muted-foreground">No maintenance alerts at this time</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Maintenance Alerts
            {(unackedCount ?? 0) > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unackedCount} unacknowledged
              </Badge>
            )}
          </CardTitle>
        </div>

        {/* Summary badges */}
        <div className="flex flex-wrap gap-2 pt-2">
          {criticalAlerts.length > 0 && (
            <Badge variant="destructive">
              {criticalAlerts.length} Critical
            </Badge>
          )}
          {overdueAlerts.length > 0 && (
            <Badge variant="destructive" className="bg-orange-500">
              {overdueAlerts.length} Overdue
            </Badge>
          )}
          {dueAlerts.length > 0 && (
            <Badge variant="outline" className="border-warning text-yellow-700">
              {dueAlerts.length} Due
            </Badge>
          )}
          {upcomingAlerts.length > 0 && (
            <Badge variant="secondary">
              {upcomingAlerts.length} Upcoming
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {alerts.slice(0, maxAlerts).map((alert) => (
          <MaintenanceAlertCard
            key={alert.id}
            alert={alert}
            onScheduleMaintenance={onScheduleMaintenance}
          />
        ))}

        {alerts.length > maxAlerts && (
          <p className="text-center text-sm text-muted-foreground pt-2">
            And {alerts.length - maxAlerts} more alerts...
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Alert Banner (for equipment detail page)
// ============================================================================

interface MaintenanceAlertBannerProps {
  equipmentId: string
}

export function MaintenanceAlertBanner({ equipmentId }: MaintenanceAlertBannerProps) {
  const { data: alerts } = useMaintenanceAlerts(equipmentId)

  if (!alerts || alerts.length === 0) {
    return null
  }

  const criticalOrOverdue = alerts.filter(
    (a) => a.alert_type === 'critical' || a.alert_type === 'overdue'
  )

  if (criticalOrOverdue.length === 0) {
    return null
  }

  const mostSevere = criticalOrOverdue[0]

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Maintenance Required</AlertTitle>
      <AlertDescription>
        This equipment has {criticalOrOverdue.length} overdue maintenance item(s).
        {mostSevere.schedule?.maintenance_type && (
          <span className="block mt-1">
            Most urgent: {mostSevere.schedule.maintenance_type}
          </span>
        )}
      </AlertDescription>
    </Alert>
  )
}

// ============================================================================
// Blocked Equipment Warning
// ============================================================================

interface BlockedEquipmentWarningProps {
  isBlocked: boolean
  maintenanceType?: string
}

export function BlockedEquipmentWarning({
  isBlocked,
  maintenanceType,
}: BlockedEquipmentWarningProps) {
  if (!isBlocked) {
    return null
  }

  return (
    <Alert variant="destructive" className="border-red-500 bg-error-light">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Equipment Usage Blocked</AlertTitle>
      <AlertDescription>
        This equipment cannot be used until {maintenanceType || 'required maintenance'} is completed.
        Usage has been blocked due to overdue maintenance.
      </AlertDescription>
    </Alert>
  )
}

// Default export
export default MaintenanceAlertsDashboard
