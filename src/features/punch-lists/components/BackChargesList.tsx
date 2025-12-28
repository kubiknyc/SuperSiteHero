// File: /src/features/punch-lists/components/BackChargesList.tsx
// List component for displaying back-charges on a punch item

import * as React from 'react'
import { useState } from 'react'
import { useBackChargesForPunchItem } from '../hooks/usePunchListBackCharges'
import { BackChargeFormDialog } from './BackChargeFormDialog'
import { BackChargeStatusBadge } from './BackChargeStatusBadge'
import {
  type PunchItemBackCharge,
  BackChargeStatus,
  BACK_CHARGE_REASONS,
} from '@/types/punch-list-back-charge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DollarSign,
  Plus,
  Clock,
  User,
  ChevronRight,
  AlertTriangle,
  Receipt,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface BackChargesListProps {
  punchItemId: string
  projectId: string
  subcontractorId?: string | null
  subcontractorName?: string | null
  onViewDetail?: (backCharge: PunchItemBackCharge) => void
}

export function BackChargesList({
  punchItemId,
  projectId,
  subcontractorId,
  subcontractorName,
  onViewDetail,
}: BackChargesListProps) {
  const { data: backCharges, isLoading, error } = useBackChargesForPunchItem(punchItemId)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedBackCharge, setSelectedBackCharge] = useState<PunchItemBackCharge | null>(null)

  const handleEdit = (backCharge: PunchItemBackCharge) => {
    setSelectedBackCharge(backCharge)
    setIsFormOpen(true)
  }

  const handleCreate = () => {
    setSelectedBackCharge(null)
    setIsFormOpen(true)
  }

  const getReasonLabel = (reason: string) => {
    const found = BACK_CHARGE_REASONS.find((r) => r.value === reason)
    return found?.label || reason
  }

  // Calculate totals
  const totalAmount = backCharges?.reduce((sum, bc) => sum + bc.total_amount, 0) || 0
  const pendingAmount = backCharges
    ?.filter((bc) => bc.status !== BackChargeStatus.APPLIED && bc.status !== BackChargeStatus.VOIDED)
    .reduce((sum, bc) => sum + bc.total_amount, 0) || 0

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center gap-2 text-destructive">
            <AlertTriangle className="h-8 w-8" />
            <p>Failed to load back-charges</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Receipt className="h-5 w-5 text-orange-500" />
          Back-Charges
          {backCharges && backCharges.length > 0 && (
            <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-sm px-2 py-0.5 rounded-full">
              {backCharges.length}
            </span>
          )}
        </CardTitle>
        <Button size="sm" onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Add Back-Charge
        </Button>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : !backCharges || backCharges.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No back-charges recorded</p>
            <p className="text-sm mt-1">
              Add a back-charge if work requires correction costs
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-xl font-bold">${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-xl font-bold text-orange-600">
                  ${pendingAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* List */}
            {backCharges.map((backCharge) => (
              <div
                key={backCharge.id}
                className="group border rounded-lg p-4 hover:border-primary/50 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => onViewDetail ? onViewDetail(backCharge) : handleEdit(backCharge)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm text-muted-foreground">
                        BC-{String(backCharge.back_charge_number).padStart(3, '0')}
                      </span>
                      <BackChargeStatusBadge status={backCharge.status as BackChargeStatus} />
                    </div>
                    <p className="font-medium truncate">{getReasonLabel(backCharge.reason)}</p>
                    {backCharge.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {backCharge.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(backCharge.date_initiated), { addSuffix: true })}
                      </span>
                      {backCharge.subcontractor_name && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {backCharge.subcontractor_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold">
                      ${backCharge.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <BackChargeFormDialog
        punchItemId={punchItemId}
        projectId={projectId}
        subcontractorId={subcontractorId}
        subcontractorName={subcontractorName}
        existingBackCharge={selectedBackCharge}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
      />
    </Card>
  )
}
