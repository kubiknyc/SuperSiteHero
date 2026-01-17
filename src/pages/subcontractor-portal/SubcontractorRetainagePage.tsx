/**
 * Subcontractor Retainage Page
 * View retainage balances and release history from the subcontractor portal
 */

import { useState, useMemo } from 'react'
import {
  useRetainageInfo,
  useRetainageReleases,
  useRetainageSummary,
  getContractStatusLabel,
  getContractStatusBadgeVariant,
  getReleaseTypeLabel,
  getReleaseStatusLabel,
  getReleaseStatusBadgeVariant,
  formatRetainageAmount,
  formatRetainagePercent,
  getMilestoneStatus,
  getRetainageHealth,
  isEligibleForSubstantialRelease,
  isEligibleForFinalRelease,
} from '@/features/subcontractor-portal/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Banknote,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  FileCheck,
  History,
  Info,
  Shield,
  TrendingUp,
  XCircle,
  AlertTriangle,
} from 'lucide-react'
import { format } from 'date-fns'
import type { SubcontractorRetainageInfo, RetainageRelease } from '@/types/subcontractor-portal'

function RetainageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    </div>
  )
}

export function SubcontractorRetainagePage() {
  const [selectedContract, setSelectedContract] = useState<SubcontractorRetainageInfo | null>(null)
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)

  const { data: contracts, isLoading, isError } = useRetainageInfo()
  const { data: summary } = useRetainageSummary()
  const { data: releases } = useRetainageReleases(selectedContract?.id)

  // Calculate health status
  const healthStatus = useMemo(() => {
    if (!summary) { return null }
    return getRetainageHealth(summary)
  }, [summary])

  const handleViewHistory = (contract: SubcontractorRetainageInfo) => {
    setSelectedContract(contract)
    setHistoryDialogOpen(true)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 heading-page">
          <Banknote className="h-6 w-6" />
          Retainage Tracking
        </h1>
        <p className="text-muted-foreground">
          Track retainage balances, releases, and milestones across your contracts.
        </p>
      </div>

      {/* Health Status Alert */}
      {healthStatus && healthStatus.status !== 'good' && (
        <Alert variant={healthStatus.status === 'action_required' ? 'destructive' : 'default'}>
          {healthStatus.status === 'action_required' ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <Info className="h-4 w-4" />
          )}
          <AlertTitle>
            {healthStatus.status === 'action_required' ? 'Action Required' : 'Attention'}
          </AlertTitle>
          <AlertDescription>{healthStatus.message}</AlertDescription>
        </Alert>
      )}

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <div>
                  <p className="heading-section">{summary.total_contracts}</p>
                  <p className="text-sm text-muted-foreground">Active Contracts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-warning" />
                <div>
                  <p className="heading-section">{formatRetainageAmount(summary.total_retention_held)}</p>
                  <p className="text-sm text-muted-foreground">Total Held</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <div>
                  <p className="heading-section">{formatRetainageAmount(summary.total_retention_released)}</p>
                  <p className="text-sm text-muted-foreground">Total Released</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <div>
                  <p className="heading-section">{formatRetainageAmount(summary.total_retention_balance)}</p>
                  <p className="text-sm text-muted-foreground">Balance Due</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Contract Cards */}
      {isLoading ? (
        <RetainageSkeleton />
      ) : isError ? (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load retainage information. Please try again later.
          </AlertDescription>
        </Alert>
      ) : !contracts || contracts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Banknote className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="mb-2 heading-subsection">No Contracts</h3>
            <p className="text-muted-foreground">
              You have no contracts with retainage tracking at this time.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {contracts.map((contract) => (
            <ContractCard
              key={contract.id}
              contract={contract}
              onViewHistory={() => handleViewHistory(contract)}
            />
          ))}
        </div>
      )}

      {/* Release History Dialog */}
      {selectedContract && (
        <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 heading-card">
                <History className="h-5 w-5" />
                Release History
              </DialogTitle>
              <DialogDescription>
                {selectedContract.contract_number} - {selectedContract.project_name}
              </DialogDescription>
            </DialogHeader>

            {releases && releases.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Lien Waiver</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {releases.map((release) => (
                    <TableRow key={release.id}>
                      <TableCell>{format(new Date(release.release_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{getReleaseTypeLabel(release.release_type)}</TableCell>
                      <TableCell className="font-semibold">
                        {formatRetainageAmount(release.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getReleaseStatusBadgeVariant(release.status)}>
                          {getReleaseStatusLabel(release.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {release.lien_waiver_required ? (
                          release.lien_waiver_received ? (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Received
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <Clock className="h-3 w-3" />
                              Required
                            </Badge>
                          )
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No release history for this contract.</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

interface ContractCardProps {
  contract: SubcontractorRetainageInfo
  onViewHistory: () => void
}

function ContractCard({ contract, onViewHistory }: ContractCardProps) {
  const milestones = getMilestoneStatus(contract)
  const eligibleForSubstantial = isEligibleForSubstantialRelease(contract)
  const eligibleForFinal = isEligibleForFinalRelease(contract)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="heading-card">{contract.contract_number}</CardTitle>
            <CardDescription className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {contract.project_name}
            </CardDescription>
          </div>
          <Badge variant={getContractStatusBadgeVariant(contract.status)}>
            {getContractStatusLabel(contract.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Contract Progress</span>
            <span className="font-medium">{formatRetainagePercent(contract.percent_complete)}</span>
          </div>
          <Progress value={contract.percent_complete} className="h-2" />
        </div>

        {/* Contract Values */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Contract Value</p>
            <p className="font-semibold">{formatRetainageAmount(contract.current_contract_value)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Retention Rate</p>
            <p className="font-semibold">{formatRetainagePercent(contract.retention_percent)}</p>
          </div>
        </div>

        {/* Retainage Breakdown */}
        <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Retention Held</span>
            <span className="font-semibold text-warning">{formatRetainageAmount(contract.retention_held)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Released</span>
            <span className="font-semibold text-success">{formatRetainageAmount(contract.retention_released)}</span>
          </div>
          <div className="flex justify-between text-sm border-t pt-2">
            <span className="font-medium">Balance Due</span>
            <span className="heading-subsection">{formatRetainageAmount(contract.retention_balance)}</span>
          </div>
        </div>

        {/* Milestones */}
        <div className="space-y-2">
          <p className="heading-subsection">Release Milestones</p>
          <div className="flex flex-wrap gap-2">
            <MilestoneBadge
              label="Substantial"
              status={milestones.substantial}
              date={contract.substantial_completion_date}
            />
            <MilestoneBadge
              label="Final"
              status={milestones.final}
              date={contract.final_completion_date}
            />
            <MilestoneBadge
              label="Warranty"
              status={milestones.warranty}
              date={contract.warranty_expiration_date}
            />
          </div>
        </div>

        {/* Pending Lien Waivers Warning */}
        {contract.pending_lien_waivers > 0 && (
          <Alert className="py-2">
            <FileCheck className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {contract.pending_lien_waivers} lien waiver{contract.pending_lien_waivers > 1 ? 's' : ''} pending
              signature - required for retainage release.
            </AlertDescription>
          </Alert>
        )}

        {/* Eligibility Notices */}
        {eligibleForSubstantial && (
          <Alert className="py-2 border-success">
            <CheckCircle className="h-4 w-4 text-success" />
            <AlertDescription className="text-sm">
              Contract is eligible for substantial completion release (typically 50% of retainage).
            </AlertDescription>
          </Alert>
        )}
        {eligibleForFinal && (
          <Alert className="py-2 border-success">
            <CheckCircle className="h-4 w-4 text-success" />
            <AlertDescription className="text-sm">
              Contract is eligible for final retainage release.
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onViewHistory} className="flex-1">
            <History className="h-4 w-4 mr-2" />
            Release History
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

interface MilestoneBadgeProps {
  label: string
  status: 'pending' | 'achieved' | 'active' | 'expired' | 'not_applicable'
  date: string | null
}

function MilestoneBadge({ label, status, date }: MilestoneBadgeProps) {
  const getVariant = (): 'default' | 'secondary' | 'outline' | 'destructive' => {
    switch (status) {
      case 'achieved':
        return 'default'
      case 'active':
        return 'default'
      case 'pending':
        return 'secondary'
      case 'expired':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const getIcon = () => {
    switch (status) {
      case 'achieved':
        return <CheckCircle className="h-3 w-3" />
      case 'active':
        return <Shield className="h-3 w-3" />
      case 'pending':
        return <Clock className="h-3 w-3" />
      case 'expired':
        return <XCircle className="h-3 w-3" />
      default:
        return null
    }
  }

  if (status === 'not_applicable') {
    return (
      <Badge variant="outline" className="gap-1 opacity-50">
        {label}
      </Badge>
    )
  }

  return (
    <Badge variant={getVariant()} className="gap-1">
      {getIcon()}
      {label}
      {date && status === 'achieved' && (
        <span className="text-xs opacity-75">({format(new Date(date), 'M/d/yy')})</span>
      )}
    </Badge>
  )
}

export default SubcontractorRetainagePage
