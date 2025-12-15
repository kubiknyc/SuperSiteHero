/**
 * Equipment Cost Posting Component
 *
 * Shows unposted equipment log costs and allows batch posting to cost tracking
 */

import { useState, useMemo } from 'react'
import {
  DollarSign,
  Truck,
  CheckCircle,
  AlertCircle,
  Upload,
  Filter,
  Calendar,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  useUnpostedEquipmentCosts,
  useBatchPostEquipmentCosts,
  usePostEquipmentCost,
} from '../hooks/useEquipment'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { EquipmentLogWithCostDetails } from '@/types/equipment'

interface EquipmentCostPostingProps {
  projectId: string
}

export function EquipmentCostPosting({ projectId }: EquipmentCostPostingProps) {
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set())
  const [dateFilter, setDateFilter] = useState<string>('')

  const { data: unpostedLogs, isLoading, refetch } = useUnpostedEquipmentCosts(projectId)
  const postCost = usePostEquipmentCost()
  const batchPost = useBatchPostEquipmentCosts()

  // Filter by date if set
  const filteredLogs = useMemo((): EquipmentLogWithCostDetails[] => {
    if (!unpostedLogs) {return []}
    if (!dateFilter) {return unpostedLogs as EquipmentLogWithCostDetails[]}
    return (unpostedLogs as EquipmentLogWithCostDetails[]).filter((log) => log.log_date >= dateFilter)
  }, [unpostedLogs, dateFilter])

  // Calculate totals
  const totals = useMemo(() => {
    const selected = filteredLogs.filter((log) => selectedLogs.has(log.id))
    return {
      totalUnposted: filteredLogs.reduce((sum, log) => sum + (log.calculated_cost || 0), 0),
      selectedCount: selected.length,
      selectedTotal: selected.reduce((sum, log) => sum + (log.calculated_cost || 0), 0),
    }
  }, [filteredLogs, selectedLogs])

  const handleSelectAll = () => {
    if (selectedLogs.size === filteredLogs.length) {
      setSelectedLogs(new Set())
    } else {
      setSelectedLogs(new Set(filteredLogs.map(log => log.id)))
    }
  }

  const handleToggleLog = (logId: string) => {
    const newSelected = new Set(selectedLogs)
    if (newSelected.has(logId)) {
      newSelected.delete(logId)
    } else {
      newSelected.add(logId)
    }
    setSelectedLogs(newSelected)
  }

  const handlePostSingle = async (logId: string) => {
    await postCost.mutateAsync(logId)
    setSelectedLogs(prev => {
      const newSet = new Set(prev)
      newSet.delete(logId)
      return newSet
    })
    refetch()
  }

  const handlePostSelected = async () => {
    const logIds = Array.from(selectedLogs)
    await batchPost.mutateAsync(logIds)
    setSelectedLogs(new Set())
    refetch()
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
            Loading equipment costs...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Unposted Costs</p>
                <p className="text-2xl font-bold">{filteredLogs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Value</p>
                <p className="text-2xl font-bold">{formatCurrency(totals.totalUnposted)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Selected</p>
                <p className="text-2xl font-bold">
                  {totals.selectedCount} ({formatCurrency(totals.selectedTotal)})
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Equipment Costs to Post
              </CardTitle>
              <CardDescription>
                Review and post equipment usage costs to the project budget
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="border rounded-md px-2 py-1 text-sm"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">All equipment costs have been posted!</p>
              <p className="text-sm text-gray-400">No unposted equipment logs found</p>
            </div>
          ) : (
            <>
              {/* Actions Bar */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b">
                <div className="flex items-center gap-4">
                  <Checkbox
                    checked={selectedLogs.size === filteredLogs.length && filteredLogs.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm text-gray-500">
                    {selectedLogs.size > 0
                      ? `${selectedLogs.size} selected`
                      : 'Select all'}
                  </span>
                </div>
                <Button
                  onClick={handlePostSelected}
                  disabled={selectedLogs.size === 0 || batchPost.isPending}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Post Selected ({formatCurrency(totals.selectedTotal)})
                </Button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-10 p-3"></th>
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-left p-3 font-medium">Equipment</th>
                      <th className="text-left p-3 font-medium">Cost Code</th>
                      <th className="text-right p-3 font-medium">Hours</th>
                      <th className="text-right p-3 font-medium">Rate</th>
                      <th className="text-right p-3 font-medium">Cost</th>
                      <th className="w-24 p-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredLogs.map((log) => (
                      <tr
                        key={log.id}
                        className={`hover:bg-gray-50 ${
                          selectedLogs.has(log.id) ? 'bg-blue-50' : ''
                        }`}
                      >
                        <td className="p-3">
                          <Checkbox
                            checked={selectedLogs.has(log.id)}
                            onCheckedChange={() => handleToggleLog(log.id)}
                          />
                        </td>
                        <td className="p-3">
                          {formatDate(log.log_date)}
                        </td>
                        <td className="p-3">
                          <div>
                            <span className="font-medium">
                              {log.equipment?.name || 'Unknown'}
                            </span>
                            {log.equipment?.equipment_number && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                {log.equipment.equipment_number}
                              </Badge>
                            )}
                          </div>
                          {log.work_description && (
                            <p className="text-xs text-gray-500 truncate max-w-xs">
                              {log.work_description}
                            </p>
                          )}
                        </td>
                        <td className="p-3">
                          {log.cost_code ? (
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-xs bg-gray-100 px-1 rounded">
                                {log.cost_code.code}
                              </span>
                              <span className="text-gray-600 text-xs truncate max-w-[100px]">
                                {log.cost_code.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">No cost code</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {log.hours_used?.toFixed(1) || '-'}
                        </td>
                        <td className="p-3 text-right">
                          {log.equipment?.hourly_cost
                            ? formatCurrency(log.equipment.hourly_cost)
                            : '-'}
                        </td>
                        <td className="p-3 text-right font-medium">
                          {formatCurrency(log.calculated_cost || 0)}
                        </td>
                        <td className="p-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePostSingle(log.id)}
                            disabled={postCost.isPending}
                          >
                            Post
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2">
                    <tr>
                      <td colSpan={6} className="p-3 font-semibold">
                        Total
                      </td>
                      <td className="p-3 text-right font-bold">
                        {formatCurrency(totals.totalUnposted)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default EquipmentCostPosting
