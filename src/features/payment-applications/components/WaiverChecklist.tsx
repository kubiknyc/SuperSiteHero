/**
 * Waiver Checklist Component
 * Shows lien waiver status for a payment application
 * Tracks required waivers from subcontractors
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { useLienWaivers } from '@/features/lien-waivers/hooks/useLienWaivers'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  FileCheck,

  ExternalLink,
  Plus,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getWaiverTypeLabel,
  getWaiverStatusLabel,
  getWaiverStatusColor,
  formatWaiverAmount,
  isWaiverOverdue,
  type LienWaiverWithDetails,
  type LienWaiverStatus,
} from '@/types/lien-waiver'

interface WaiverChecklistProps {
  paymentApplicationId: string
  projectId: string
  applicationNumber: number
  currentPaymentDue: number
  status: string
  onCreateWaiver?: () => void
}

// Group waivers by subcontractor
interface SubcontractorWaivers {
  subcontractorId: string
  subcontractorName: string
  waivers: LienWaiverWithDetails[]
  hasConditional: boolean
  hasUnconditional: boolean
  isComplete: boolean
}

const STATUS_ICON_MAP: Record<LienWaiverStatus, React.ReactNode> = {
  pending: <Circle className="h-4 w-4 text-disabled" />,
  draft: <Circle className="h-4 w-4 text-disabled" />,
  sent: <Clock className="h-4 w-4 text-primary" />,
  received: <Clock className="h-4 w-4 text-warning" />,
  under_review: <Clock className="h-4 w-4 text-warning" />,
  approved: <CheckCircle2 className="h-4 w-4 text-success" />,
  rejected: <AlertTriangle className="h-4 w-4 text-error" />,
  expired: <AlertTriangle className="h-4 w-4 text-orange-500" />,
  void: <Circle className="h-4 w-4 text-gray-300" />,
}

const STATUS_COLOR_MAP: Record<string, string> = {
  gray: 'bg-muted text-secondary border-border',
  blue: 'bg-info-light text-primary-hover border-blue-200',
  yellow: 'bg-warning-light text-yellow-700 border-yellow-200',
  green: 'bg-success-light text-success-dark border-green-200',
  red: 'bg-error-light text-error-dark border-red-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

export function WaiverChecklist({
  paymentApplicationId,
  projectId,
  applicationNumber,
  currentPaymentDue: _currentPaymentDue,
  status: appStatus,
  onCreateWaiver,
}: WaiverChecklistProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  // Fetch waivers for this payment application
  const { data: waivers, isLoading, error: _error } = useLienWaivers({
    paymentApplicationId,
  })

  // Group waivers by subcontractor
  const groupedWaivers: SubcontractorWaivers[] = waivers
    ? Array.from(
        waivers.reduce((map, waiver) => {
          const key = waiver.subcontractor_id || waiver.vendor_name || 'unknown'
          if (!map.has(key)) {
            map.set(key, {
              subcontractorId: waiver.subcontractor_id || '',
              subcontractorName: waiver.subcontractor?.company_name || waiver.vendor_name || 'Unknown',
              waivers: [],
              hasConditional: false,
              hasUnconditional: false,
              isComplete: false,
            })
          }
          const group = map.get(key)!
          group.waivers.push(waiver)

          // Check waiver types
          if (waiver.waiver_type.includes('conditional') && waiver.status === 'approved') {
            group.hasConditional = true
          }
          if (waiver.waiver_type.includes('unconditional') && waiver.status === 'approved') {
            group.hasUnconditional = true
          }
          // Progress payment is complete with conditional, final needs unconditional
          group.isComplete = group.hasConditional || group.hasUnconditional

          return map
        }, new Map<string, SubcontractorWaivers>())
      ).map(([, group]) => group)
    : []

  // Calculate summary stats
  const totalWaivers = waivers?.length || 0
  const approvedWaivers = waivers?.filter((w) => w.status === 'approved').length || 0
  const pendingWaivers = waivers?.filter((w) => ['pending', 'sent', 'draft'].includes(w.status)).length || 0
  const overdueWaivers = waivers?.filter((w) => isWaiverOverdue(w)).length || 0
  const completionPercent = totalWaivers > 0 ? Math.round((approvedWaivers / totalWaivers) * 100) : 0

  // Determine overall status
  const getOverallStatus = () => {
    if (totalWaivers === 0) {return { label: 'No Waivers', color: 'gray', icon: Circle }}
    if (approvedWaivers === totalWaivers) {return { label: 'All Complete', color: 'green', icon: CheckCircle2 }}
    if (overdueWaivers > 0) {return { label: `${overdueWaivers} Overdue`, color: 'red', icon: AlertTriangle }}
    if (pendingWaivers > 0) {return { label: `${pendingWaivers} Pending`, color: 'yellow', icon: Clock }}
    return { label: 'In Progress', color: 'blue', icon: Clock }
  }

  const overallStatus = getOverallStatus()

  // Check if payment should be blocked
  const isPaymentBlocked = appStatus === 'approved' && approvedWaivers < totalWaivers

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-disabled" />
            <span className="ml-2 text-muted">Loading waivers...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(isPaymentBlocked && 'border-amber-300 bg-warning-light/30')}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileCheck className="h-5 w-5 text-purple-600" />
            <div>
              <CardTitle className="text-lg">Lien Waiver Checklist</CardTitle>
              <CardDescription>
                Track required waivers for App #{applicationNumber}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cn('font-medium', STATUS_COLOR_MAP[overallStatus.color])}>
              <overallStatus.icon className="h-3 w-3 mr-1" />
              {overallStatus.label}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        {totalWaivers > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-secondary">
                {approvedWaivers} of {totalWaivers} waivers complete
              </span>
              <span className="font-medium">{completionPercent}%</span>
            </div>
            <Progress value={completionPercent} className="h-2" />
          </div>
        )}

        {/* Payment Blocked Warning */}
        {isPaymentBlocked && (
          <div className="mt-3 p-3 bg-amber-100 border border-amber-300 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-amber-800">Payment Blocked</p>
              <p className="text-sm text-amber-700">
                All lien waivers must be approved before payment can be released.
                {pendingWaivers > 0 && ` ${pendingWaivers} waiver(s) still pending.`}
              </p>
            </div>
          </div>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          {totalWaivers === 0 ? (
            <div className="text-center py-6 border-t">
              <FileCheck className="h-10 w-10 mx-auto text-gray-300 mb-3" />
              <p className="text-muted mb-4">No lien waivers tracked for this application.</p>
              {onCreateWaiver && (
                <Button variant="outline" onClick={onCreateWaiver} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Request Waiver
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4 border-t pt-4">
              {/* Grouped by Subcontractor */}
              {groupedWaivers.map((group) => (
                <div key={group.subcontractorId || group.subcontractorName} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-foreground heading-card">{group.subcontractorName}</h4>
                    {group.isComplete ? (
                      <Badge variant="outline" className="bg-success-light text-success-dark border-green-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Complete
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-warning-light text-yellow-700 border-yellow-200">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                  </div>

                  <div className="pl-4 space-y-2">
                    {group.waivers.map((waiver) => (
                      <WaiverRow key={waiver.id} waiver={waiver} projectId={projectId} />
                    ))}
                  </div>
                </div>
              ))}

              {/* Add Waiver Button */}
              {onCreateWaiver && (
                <div className="pt-2 border-t">
                  <Button variant="outline" size="sm" onClick={onCreateWaiver} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Request Additional Waiver
                  </Button>
                </div>
              )}

              {/* Link to Full Waiver Page */}
              <div className="pt-2 border-t">
                <Link
                  to={`/projects/${projectId}/lien-waivers?payment_application=${paymentApplicationId}`}
                  className="text-sm text-primary hover:text-primary-hover flex items-center gap-1"
                >
                  View all project waivers
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

// Individual waiver row component
function WaiverRow({ waiver, projectId: _projectId }: { waiver: LienWaiverWithDetails; projectId: string }) {
  const isOverdue = isWaiverOverdue(waiver)
  const statusColor = getWaiverStatusColor(waiver.status)

  return (
    <div
      className={cn(
        'flex items-center justify-between p-2 rounded-lg border',
        isOverdue && waiver.status !== 'approved' && 'border-red-200 bg-error-light',
        !isOverdue && 'border-border bg-surface'
      )}
    >
      <div className="flex items-center gap-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>{STATUS_ICON_MAP[waiver.status]}</span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{getWaiverStatusLabel(waiver.status)}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{getWaiverTypeLabel(waiver.waiver_type)}</span>
            <Badge variant="outline" className={cn('text-xs', STATUS_COLOR_MAP[statusColor])}>
              {getWaiverStatusLabel(waiver.status)}
            </Badge>
          </div>
          <div className="text-xs text-muted">
            {formatWaiverAmount(waiver.payment_amount)}
            {waiver.due_date && (
              <>
                {' · Due '}
                <span className={cn(isOverdue && 'text-error font-medium')}>
                  {format(new Date(waiver.due_date), 'MMM d, yyyy')}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isOverdue && waiver.status !== 'approved' && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertTriangle className="h-4 w-4 text-error" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Overdue - requires attention</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <Link to={`/lien-waivers/${waiver.id}`}>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
            View
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      </div>
    </div>
  )
}

export default WaiverChecklist
