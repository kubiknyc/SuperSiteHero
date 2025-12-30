/**
 * Compliance Matrix Component
 * Shows a matrix view of subcontractors vs. insurance types with compliance status
 */

import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Ban,
  Shield,
  Building2,
  DollarSign,
  RefreshCw,
} from 'lucide-react'
import {
  useCompanyComplianceStatuses,
  useInsuranceCertificates,
  useApplyPaymentHold,
  useReleasePaymentHold,
  useRecalculateComplianceStatus,
} from '../hooks/useInsurance'
import {
  INSURANCE_TYPE_LABELS,
  formatInsuranceLimit,
  type SubcontractorComplianceStatus,
  type InsuranceCertificateWithRelations,
  type InsuranceType,
} from '@/types/insurance'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

interface ComplianceMatrixProps {
  projectId?: string
  onViewSubcontractor?: (subcontractorId: string) => void
  onViewCertificate?: (certificate: InsuranceCertificateWithRelations) => void
}

const CORE_INSURANCE_TYPES: InsuranceType[] = [
  'general_liability',
  'auto_liability',
  'workers_compensation',
  'umbrella',
]

interface ComplianceCellProps {
  subcontractorId: string
  insuranceType: InsuranceType
  certificates: InsuranceCertificateWithRelations[]
  onViewCertificate?: (certificate: InsuranceCertificateWithRelations) => void
}

function ComplianceCell({
  subcontractorId,
  insuranceType,
  certificates,
  onViewCertificate,
}: ComplianceCellProps) {
  const subCerts = certificates.filter(
    (c) => c.subcontractor_id === subcontractorId && c.insurance_type === insuranceType
  )

  if (subCerts.length === 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center p-2 bg-error-light rounded cursor-pointer hover:bg-error/20">
              <XCircle className="h-5 w-5 text-error" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">Missing Coverage</p>
            <p className="text-xs text-muted-foreground">
              No {INSURANCE_TYPE_LABELS[insuranceType]} on file
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Find the best certificate (active, not void)
  const activeCerts = subCerts.filter((c) => c.status === 'active')
  const expiringCerts = subCerts.filter((c) => c.status === 'expiring_soon')
  const expiredCerts = subCerts.filter((c) => c.status === 'expired')
  const bestCert = activeCerts[0] || expiringCerts[0] || expiredCerts[0] || subCerts[0]

  if (!bestCert) {return null}

  const getStatusInfo = () => {
    if (bestCert.status === 'active') {
      return { icon: CheckCircle, color: 'text-success', bg: 'bg-success-light', label: 'Valid' }
    }
    if (bestCert.status === 'expiring_soon') {
      return { icon: Clock, color: 'text-warning', bg: 'bg-warning-light', label: 'Expiring Soon' }
    }
    if (bestCert.status === 'expired') {
      return { icon: AlertTriangle, color: 'text-error', bg: 'bg-error-light', label: 'Expired' }
    }
    if (bestCert.status === 'void') {
      return { icon: Ban, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Void' }
    }
    return { icon: Clock, color: 'text-primary', bg: 'bg-primary-light', label: 'Pending' }
  }

  const statusInfo = getStatusInfo()
  const StatusIcon = statusInfo.icon

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex items-center justify-center p-2 rounded cursor-pointer hover:opacity-80 transition-opacity',
              statusInfo.bg
            )}
            onClick={() => onViewCertificate?.(bestCert)}
          >
            <StatusIcon className={cn('h-5 w-5', statusInfo.color)} />
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{statusInfo.label}</p>
            <p className="text-xs">{bestCert.carrier_name}</p>
            <p className="text-xs text-muted-foreground">
              Expires: {new Date(bestCert.expiration_date).toLocaleDateString()}
            </p>
            {bestCert.each_occurrence_limit && (
              <p className="text-xs text-muted-foreground">
                Coverage: {formatInsuranceLimit(bestCert.each_occurrence_limit)}
              </p>
            )}
            <p className="text-xs text-primary mt-1">Click to view details</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface SubcontractorRowData {
  id: string
  name: string
  complianceStatus?: SubcontractorComplianceStatus
}

export function ComplianceMatrix({
  projectId,
  onViewSubcontractor,
  onViewCertificate,
}: ComplianceMatrixProps) {
  const { toast } = useToast()
  const [holdDialogOpen, setHoldDialogOpen] = useState(false)
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false)
  const [selectedSub, setSelectedSub] = useState<SubcontractorRowData | null>(null)
  const [holdReason, setHoldReason] = useState('')
  const [overrideReason, setOverrideReason] = useState('')

  const { data: complianceStatuses, isLoading: statusLoading } = useCompanyComplianceStatuses({
    projectId,
  })
  const { data: certificates, isLoading: certsLoading } = useInsuranceCertificates({ projectId })

  const applyHoldMutation = useApplyPaymentHold()
  const releaseHoldMutation = useReleasePaymentHold()
  const recalculateMutation = useRecalculateComplianceStatus()

  const isLoading = statusLoading || certsLoading

  // Build subcontractor list from certificates
  const subcontractors = useMemo(() => {
    if (!certificates) {return []}

    const subMap = new Map<string, SubcontractorRowData>()

    certificates.forEach((cert) => {
      if (cert.subcontractor_id && cert.subcontractor) {
        if (!subMap.has(cert.subcontractor_id)) {
          subMap.set(cert.subcontractor_id, {
            id: cert.subcontractor_id,
            name: cert.subcontractor.company_name,
            complianceStatus: complianceStatuses?.find(
              (s) => s.subcontractor_id === cert.subcontractor_id
            ),
          })
        }
      }
    })

    // Sort by compliance score (worst first)
    return Array.from(subMap.values()).sort((a, b) => {
      const aScore = a.complianceStatus?.compliance_score ?? 100
      const bScore = b.complianceStatus?.compliance_score ?? 100
      return aScore - bScore
    })
  }, [certificates, complianceStatuses])

  const handleApplyHold = async () => {
    if (!selectedSub || !projectId) {return}
    try {
      await applyHoldMutation.mutateAsync({
        subcontractorId: selectedSub.id,
        projectId,
        reason: holdReason || 'Insurance compliance violation',
      })
      toast({ title: 'Payment hold applied', description: `Hold placed on ${selectedSub.name}` })
      setHoldDialogOpen(false)
      setHoldReason('')
      setSelectedSub(null)
    } catch (_error) {
      toast({ title: 'Error', description: 'Failed to apply payment hold', variant: 'destructive' })
    }
  }

  const handleReleaseHold = async () => {
    if (!selectedSub || !projectId) {return}
    try {
      await releaseHoldMutation.mutateAsync({
        subcontractorId: selectedSub.id,
        projectId,
        overrideReason: overrideReason || undefined,
      })
      toast({ title: 'Payment hold released', description: `Hold removed from ${selectedSub.name}` })
      setReleaseDialogOpen(false)
      setOverrideReason('')
      setSelectedSub(null)
    } catch (_error) {
      toast({ title: 'Error', description: 'Failed to release payment hold', variant: 'destructive' })
    }
  }

  const handleRecalculate = async (sub: SubcontractorRowData) => {
    try {
      await recalculateMutation.mutateAsync({
        subcontractorId: sub.id,
        projectId,
      })
      toast({ title: 'Recalculated', description: `Compliance status updated for ${sub.name}` })
    } catch (_error) {
      toast({ title: 'Error', description: 'Failed to recalculate compliance', variant: 'destructive' })
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (subcontractors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Insurance Compliance Matrix
          </CardTitle>
          <CardDescription>
            Subcontractor coverage status by insurance type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Building2 className="h-12 w-12 mb-4" />
            <p className="font-medium">No subcontractors with certificates</p>
            <p className="text-sm">Add certificates for subcontractors to see compliance status</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Insurance Compliance Matrix
          </CardTitle>
          <CardDescription>
            Subcontractor coverage status by insurance type ({subcontractors.length} subcontractors)
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left p-3 border-b font-medium min-w-[200px]">Subcontractor</th>
                {CORE_INSURANCE_TYPES.map((type) => (
                  <th key={type} className="text-center p-3 border-b font-medium min-w-[120px]">
                    <span className="text-xs">{INSURANCE_TYPE_LABELS[type].split(' ')[0]}</span>
                  </th>
                ))}
                <th className="text-center p-3 border-b font-medium min-w-[100px]">Score</th>
                <th className="text-center p-3 border-b font-medium min-w-[100px]">Status</th>
                <th className="text-center p-3 border-b font-medium min-w-[80px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subcontractors.map((sub) => {
                const status = sub.complianceStatus
                const hasHold = status?.payment_hold

                return (
                  <tr
                    key={sub.id}
                    className={cn(
                      'hover:bg-muted/50 transition-colors',
                      hasHold && 'bg-warning-light'
                    )}
                  >
                    <td className="p-3 border-b">
                      <div
                        className="flex items-center gap-2 cursor-pointer hover:text-primary"
                        onClick={() => onViewSubcontractor?.(sub.id)}
                      >
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{sub.name}</span>
                        {hasHold && (
                          <Badge variant="outline" className="text-warning border-warning">
                            <DollarSign className="h-3 w-3 mr-1" />
                            Hold
                          </Badge>
                        )}
                      </div>
                    </td>
                    {CORE_INSURANCE_TYPES.map((type) => (
                      <td key={type} className="p-3 border-b">
                        <ComplianceCell
                          subcontractorId={sub.id}
                          insuranceType={type}
                          certificates={certificates || []}
                          onViewCertificate={onViewCertificate}
                        />
                      </td>
                    ))}
                    <td className="p-3 border-b text-center">
                      <div
                        className={cn(
                          'inline-flex items-center justify-center w-12 h-8 rounded font-medium text-sm',
                          (status?.compliance_score ?? 100) >= 90
                            ? 'bg-success-light text-success'
                            : (status?.compliance_score ?? 100) >= 70
                              ? 'bg-warning-light text-warning'
                              : 'bg-error-light text-error'
                        )}
                      >
                        {status?.compliance_score?.toFixed(0) ?? '--'}%
                      </div>
                    </td>
                    <td className="p-3 border-b text-center">
                      {status?.is_compliant ? (
                        <Badge variant="default">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Compliant
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Issues
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 border-b text-center">
                      <div className="flex items-center justify-center gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleRecalculate(sub)}
                                disabled={recalculateMutation.isPending}
                              >
                                <RefreshCw
                                  className={cn(
                                    'h-4 w-4',
                                    recalculateMutation.isPending && 'animate-spin'
                                  )}
                                />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Recalculate compliance</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        {projectId && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={cn('h-8 w-8', hasHold ? 'text-success' : 'text-warning')}
                                  onClick={() => {
                                    setSelectedSub(sub)
                                    if (hasHold) {
                                      setReleaseDialogOpen(true)
                                    } else {
                                      setHoldDialogOpen(true)
                                    }
                                  }}
                                >
                                  <DollarSign className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {hasHold ? 'Release payment hold' : 'Apply payment hold'}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Legend */}
          <div className="flex items-center gap-6 mt-4 pt-4 border-t text-sm">
            <span className="text-muted-foreground">Legend:</span>
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-success" />
              <span>Valid</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-warning" />
              <span>Expiring</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-error" />
              <span>Expired</span>
            </div>
            <div className="flex items-center gap-1">
              <XCircle className="h-4 w-4 text-error" />
              <span>Missing</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Apply Hold Dialog */}
      <Dialog open={holdDialogOpen} onOpenChange={setHoldDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Payment Hold</DialogTitle>
            <DialogDescription>
              This will place a payment hold on {selectedSub?.name} until compliance issues are resolved.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter reason for payment hold..."
              value={holdReason}
              onChange={(e) => setHoldReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHoldDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleApplyHold}
              disabled={applyHoldMutation.isPending}
            >
              {applyHoldMutation.isPending ? 'Applying...' : 'Apply Hold'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Release Hold Dialog */}
      <Dialog open={releaseDialogOpen} onOpenChange={setReleaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Release Payment Hold</DialogTitle>
            <DialogDescription>
              This will release the payment hold on {selectedSub?.name}.
              {selectedSub?.complianceStatus?.is_compliant === false && (
                <span className="block mt-2 text-warning">
                  Warning: This subcontractor still has compliance issues. Releasing the hold requires an override reason.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter override reason (optional if compliant)..."
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReleaseDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReleaseHold}
              disabled={releaseHoldMutation.isPending}
            >
              {releaseHoldMutation.isPending ? 'Releasing...' : 'Release Hold'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
