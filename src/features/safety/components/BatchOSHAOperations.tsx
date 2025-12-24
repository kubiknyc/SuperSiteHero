/**
 * Batch OSHA Operations Component
 *
 * Provides bulk operations for OSHA recordable incidents:
 * - Batch case number assignment
 * - Bulk recordability determination updates
 * - Batch privacy case flagging
 * - Multi-incident export
 */

import { useState } from 'react'
import { Check, X, FileText, Eye, EyeOff, Hash, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/notifications/ToastContext'
import type { SafetyIncident } from '@/types/safety-incidents'

// ============================================================================
// Types
// ============================================================================

interface BatchOSHAOperationsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedIncidents: SafetyIncident[]
  projectId?: string
  onOperationComplete?: () => void
}

type BatchOperation = 'assign_case_numbers' | 'update_recordability' | 'toggle_privacy' | 'export'

// ============================================================================
// Component
// ============================================================================

export const BatchOSHAOperations: React.FC<BatchOSHAOperationsProps> = ({
  open,
  onOpenChange,
  selectedIncidents,
  projectId,
  onOperationComplete,
}) => {
  const [selectedOperation, setSelectedOperation] = useState<BatchOperation>('assign_case_numbers')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Options for recordability update
  const [recordabilityValue, setRecordabilityValue] = useState<boolean>(true)

  // Options for privacy toggle
  const [privacyValue, setPrivacyValue] = useState<boolean>(true)

  const { showToast } = useToast()

  const handleAssignCaseNumbers = async () => {
    setLoading(true)
    setError(null)

    try {
      const year = new Date().getFullYear()
      const incidentsNeedingCaseNumbers = selectedIncidents.filter(
        (incident) => !incident.case_number && incident.osha_recordable
      )

      if (incidentsNeedingCaseNumbers.length === 0) {
        setError('All selected incidents already have case numbers or are not OSHA recordable.')
        return
      }

      // Get next case number for each incident
      const updates: Array<{ id: string; case_number: string }> = []

      for (const incident of incidentsNeedingCaseNumbers) {
        const incidentYear = new Date(incident.incident_date).getFullYear()

        // Call the get_next_osha_case_number function
        const { data, error: rpcError } = await supabase.rpc('get_next_osha_case_number', {
          p_project_id: incident.project_id,
          p_year: incidentYear,
        })

        if (rpcError) throw rpcError

        updates.push({
          id: incident.id,
          case_number: data,
        })
      }

      // Perform batch update
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('safety_incidents')
          .update({ case_number: update.case_number })
          .eq('id', update.id)

        if (updateError) throw updateError
      }

      setSuccess(true)
      showToast({
        type: 'success',
        title: 'Case Numbers Assigned',
        message: `Assigned case numbers to ${updates.length} incident(s).`,
      })

      setTimeout(() => {
        onOpenChange(false)
        onOperationComplete?.()
      }, 1500)
    } catch (err) {
      console.error('Error assigning case numbers:', err)
      setError(err instanceof Error ? err.message : 'Failed to assign case numbers')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateRecordability = async () => {
    setLoading(true)
    setError(null)

    try {
      const incidentIds = selectedIncidents.map((i) => i.id)

      const { error: updateError } = await supabase
        .from('safety_incidents')
        .update({ osha_recordable: recordabilityValue })
        .in('id', incidentIds)

      if (updateError) throw updateError

      setSuccess(true)
      showToast({
        type: 'success',
        title: 'Recordability Updated',
        message: `Updated ${incidentIds.length} incident(s) to ${recordabilityValue ? 'OSHA recordable' : 'not OSHA recordable'}.`,
      })

      setTimeout(() => {
        onOpenChange(false)
        onOperationComplete?.()
      }, 1500)
    } catch (err) {
      console.error('Error updating recordability:', err)
      setError(err instanceof Error ? err.message : 'Failed to update recordability')
    } finally {
      setLoading(false)
    }
  }

  const handleTogglePrivacy = async () => {
    setLoading(true)
    setError(null)

    try {
      const incidentIds = selectedIncidents.map((i) => i.id)

      const { error: updateError } = await supabase
        .from('safety_incidents')
        .update({ is_privacy_case: privacyValue })
        .in('id', incidentIds)

      if (updateError) throw updateError

      setSuccess(true)
      showToast({
        type: 'success',
        title: 'Privacy Status Updated',
        message: `Updated ${incidentIds.length} incident(s) to ${privacyValue ? 'privacy case' : 'not privacy case'}.`,
      })

      setTimeout(() => {
        onOpenChange(false)
        onOperationComplete?.()
      }, 1500)
    } catch (err) {
      console.error('Error updating privacy status:', err)
      setError(err instanceof Error ? err.message : 'Failed to update privacy status')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    // This would trigger an export of selected incidents
    // For now, just close the dialog and let the parent handle export
    showToast({
      type: 'info',
      title: 'Export Selected',
      message: `${selectedIncidents.length} incident(s) selected for export. Use the Export button to continue.`,
    })
    onOpenChange(false)
  }

  const handleExecuteOperation = async () => {
    switch (selectedOperation) {
      case 'assign_case_numbers':
        await handleAssignCaseNumbers()
        break
      case 'update_recordability':
        await handleUpdateRecordability()
        break
      case 'toggle_privacy':
        await handleTogglePrivacy()
        break
      case 'export':
        await handleExport()
        break
    }
  }

  const getOperationDescription = () => {
    switch (selectedOperation) {
      case 'assign_case_numbers':
        return 'Automatically assign sequential case numbers to incidents that don\'t have one.'
      case 'update_recordability':
        return 'Bulk update whether incidents are OSHA recordable or not.'
      case 'toggle_privacy':
        return 'Mark incidents as privacy cases (employee name will be withheld on 300 log).'
      case 'export':
        return 'Export selected incidents to Excel or CSV format.'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Batch OSHA Operations</DialogTitle>
          <DialogDescription>
            Perform bulk operations on {selectedIncidents.length} selected incident(s)
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <Alert className="border-green-500 bg-success-light">
            <Check className="h-5 w-5 text-success" />
            <AlertDescription className="text-green-800">
              Operation completed successfully!
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Selected Incidents Summary */}
            <Card className="bg-surface">
              <CardContent className="py-4">
                <p className="text-sm font-medium text-secondary mb-2">
                  Selected Incidents: {selectedIncidents.length}
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-secondary">OSHA Recordable:</span>
                    <span className="ml-2 font-semibold">
                      {selectedIncidents.filter((i) => i.osha_recordable).length}
                    </span>
                  </div>
                  <div>
                    <span className="text-secondary">With Case Numbers:</span>
                    <span className="ml-2 font-semibold">
                      {selectedIncidents.filter((i) => i.case_number).length}
                    </span>
                  </div>
                  <div>
                    <span className="text-secondary">Privacy Cases:</span>
                    <span className="ml-2 font-semibold">
                      {selectedIncidents.filter((i) => i.is_privacy_case).length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Operation Selection */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Select Operation</Label>
              <RadioGroup
                value={selectedOperation}
                onValueChange={(value: BatchOperation) => {
                  setSelectedOperation(value)
                  setError(null)
                }}
              >
                <div className="space-y-3">
                  {/* Assign Case Numbers */}
                  <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-surface cursor-pointer">
                    <RadioGroupItem value="assign_case_numbers" id="assign_case_numbers" className="mt-1" />
                    <Label htmlFor="assign_case_numbers" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2 font-medium">
                        <Hash className="h-4 w-4" />
                        Assign Case Numbers
                      </div>
                      <p className="text-sm text-secondary mt-1">
                        Auto-assign sequential case numbers to OSHA recordable incidents
                      </p>
                    </Label>
                  </div>

                  {/* Update Recordability */}
                  <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-surface cursor-pointer">
                    <RadioGroupItem value="update_recordability" id="update_recordability" className="mt-1" />
                    <Label htmlFor="update_recordability" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2 font-medium">
                        <FileText className="h-4 w-4" />
                        Update Recordability Status
                      </div>
                      <p className="text-sm text-secondary mt-1">
                        Mark incidents as OSHA recordable or not recordable
                      </p>
                    </Label>
                  </div>

                  {/* Toggle Privacy */}
                  <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-surface cursor-pointer">
                    <RadioGroupItem value="toggle_privacy" id="toggle_privacy" className="mt-1" />
                    <Label htmlFor="toggle_privacy" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2 font-medium">
                        <EyeOff className="h-4 w-4" />
                        Set Privacy Case Status
                      </div>
                      <p className="text-sm text-secondary mt-1">
                        Mark incidents as privacy cases (withholds employee name on 300 log)
                      </p>
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Operation-Specific Options */}
            {selectedOperation === 'update_recordability' && (
              <div className="space-y-3 pl-6 border-l-2 border-blue-500">
                <Label>Set OSHA Recordable Status To:</Label>
                <RadioGroup
                  value={recordabilityValue ? 'true' : 'false'}
                  onValueChange={(value) => setRecordabilityValue(value === 'true')}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id="recordable_true" />
                    <Label htmlFor="recordable_true" className="cursor-pointer">
                      OSHA Recordable
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id="recordable_false" />
                    <Label htmlFor="recordable_false" className="cursor-pointer">
                      Not OSHA Recordable
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {selectedOperation === 'toggle_privacy' && (
              <div className="space-y-3 pl-6 border-l-2 border-blue-500">
                <Label>Set Privacy Case Status To:</Label>
                <RadioGroup
                  value={privacyValue ? 'true' : 'false'}
                  onValueChange={(value) => setPrivacyValue(value === 'true')}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id="privacy_true" />
                    <Label htmlFor="privacy_true" className="cursor-pointer">
                      Privacy Case (Withhold Name)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id="privacy_false" />
                    <Label htmlFor="privacy_false" className="cursor-pointer">
                      Not a Privacy Case (Show Name)
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Operation Description */}
            <Alert>
              <AlertDescription className="text-sm">
                <strong>About this operation:</strong> {getOperationDescription()}
              </AlertDescription>
            </Alert>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleExecuteOperation}
                disabled={loading || selectedIncidents.length === 0}
              >
                {loading ? 'Processing...' : 'Execute Operation'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
