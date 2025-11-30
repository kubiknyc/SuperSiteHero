/**
 * Client Change Orders View
 *
 * Read-only change order list for clients to track project amendments.
 */

import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useClientChangeOrders } from '../hooks/useClientPortal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  FileEdit,
  Search,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import type { ClientChangeOrderView } from '@/types/client-portal'

// Status configuration
const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ComponentType<{ className?: string }> }> = {
  draft: { label: 'Draft', color: 'text-gray-700', bgColor: 'bg-gray-100', icon: FileEdit },
  pending: { label: 'Pending Approval', color: 'text-yellow-700', bgColor: 'bg-yellow-100', icon: Clock },
  submitted: { label: 'Submitted', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: AlertCircle },
  approved: { label: 'Approved', color: 'text-green-700', bgColor: 'bg-green-100', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'text-red-700', bgColor: 'bg-red-100', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'text-gray-700', bgColor: 'bg-gray-100', icon: XCircle },
}

// Format currency
const formatCurrency = (amount: number | null): string => {
  if (amount === null) {return '-'}
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function ClientChangeOrders() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: changeOrders, isLoading } = useClientChangeOrders(projectId)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedCO, setSelectedCO] = useState<ClientChangeOrderView | null>(null)

  // Filter change orders
  const filteredCOs = useMemo(() => {
    if (!changeOrders) {return []}
    return changeOrders.filter(co => {
      const matchesSearch = !searchTerm ||
        co.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        co.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        co.number.toString().includes(searchTerm)
      const matchesStatus = statusFilter === 'all' || co.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [changeOrders, searchTerm, statusFilter])

  // Calculate totals
  const totals = useMemo(() => {
    if (!changeOrders) {return { approved: 0, pending: 0, total: 0 }}
    return {
      approved: changeOrders
        .filter(co => co.status === 'approved')
        .reduce((sum, co) => sum + (co.cost_impact || 0), 0),
      pending: changeOrders
        .filter(co => co.status === 'pending' || co.status === 'submitted')
        .reduce((sum, co) => sum + (co.cost_impact || 0), 0),
      total: changeOrders.length,
    }
  }, [changeOrders])

  // Stats by status
  const stats = useMemo(() => {
    if (!changeOrders) {return { pending: 0, approved: 0, rejected: 0 }}
    return {
      pending: changeOrders.filter(co => co.status === 'pending' || co.status === 'submitted').length,
      approved: changeOrders.filter(co => co.status === 'approved').length,
      rejected: changeOrders.filter(co => co.status === 'rejected').length,
    }
  }, [changeOrders])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Change Orders</h1>
        <p className="text-gray-600 mt-1">
          Review and track change orders for your project.
        </p>
      </div>

      {/* Summary Cards */}
      {changeOrders && changeOrders.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Approved Total</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(totals.approved)}
                  </p>
                  <p className="text-xs text-gray-400">{stats.approved} change orders</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pending Approval</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {formatCurrency(totals.pending)}
                  </p>
                  <p className="text-xs text-gray-400">{stats.pending} change orders</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <FileEdit className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Change Orders</p>
                  <p className="text-2xl font-bold">{totals.total}</p>
                  <p className="text-xs text-gray-400">
                    {stats.rejected > 0 && `${stats.rejected} rejected`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      {changeOrders && changeOrders.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by title, description, or CO number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(statusConfig).map(([value, config]) => (
                <SelectItem key={value} value={value}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* CO Count */}
      {filteredCOs.length > 0 && (
        <p className="text-sm text-gray-500">
          Showing {filteredCOs.length} change order{filteredCOs.length !== 1 ? 's' : ''}
          {searchTerm || statusFilter !== 'all' ? ' (filtered)' : ''}
        </p>
      )}

      {/* Change Orders Table */}
      {filteredCOs.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">CO #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Cost Impact</TableHead>
                  <TableHead className="text-center">Schedule Impact</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCOs.map((co) => {
                  const status = statusConfig[co.status] || statusConfig.draft
                  const StatusIcon = status.icon
                  const hasPositiveCost = co.cost_impact !== null && co.cost_impact > 0
                  const hasNegativeCost = co.cost_impact !== null && co.cost_impact < 0

                  return (
                    <TableRow
                      key={co.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedCO(co)}
                    >
                      <TableCell>
                        <span className="font-medium text-gray-900">
                          #{co.number}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">{co.title}</p>
                          {co.description && (
                            <p className="text-sm text-gray-500 truncate max-w-xs">
                              {co.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium',
                          status.bgColor,
                          status.color
                        )}>
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {co.cost_impact !== null ? (
                          <span className={cn(
                            'flex items-center justify-end gap-1 font-medium',
                            hasPositiveCost && 'text-red-600',
                            hasNegativeCost && 'text-green-600'
                          )}>
                            {hasPositiveCost && <ArrowUpRight className="h-4 w-4" />}
                            {hasNegativeCost && <ArrowDownRight className="h-4 w-4" />}
                            {formatCurrency(Math.abs(co.cost_impact))}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {co.schedule_impact_days !== null ? (
                          <span className={cn(
                            'font-medium',
                            co.schedule_impact_days > 0 && 'text-red-600',
                            co.schedule_impact_days < 0 && 'text-green-600'
                          )}>
                            {co.schedule_impact_days > 0 ? '+' : ''}
                            {co.schedule_impact_days} days
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {format(new Date(co.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FileEdit className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No Change Orders Found</h3>
            <p className="text-gray-500 mt-1">
              {searchTerm || statusFilter !== 'all'
                ? 'No change orders match your filters. Try adjusting your search.'
                : 'Change orders for this project will appear here.'}
            </p>
            {(searchTerm || statusFilter !== 'all') && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                }}
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Change Order Detail Dialog */}
      <Dialog open={!!selectedCO} onOpenChange={() => setSelectedCO(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>Change Order #{selectedCO?.number}</span>
              {selectedCO && (
                <span className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                  statusConfig[selectedCO.status]?.bgColor || 'bg-gray-100',
                  statusConfig[selectedCO.status]?.color || 'text-gray-700'
                )}>
                  {statusConfig[selectedCO.status]?.label || selectedCO.status}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedCO && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900">{selectedCO.title}</h4>
                {selectedCO.description && (
                  <p className="text-gray-600 mt-2 whitespace-pre-wrap">
                    {selectedCO.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-gray-500">Cost Impact</p>
                  {selectedCO.cost_impact !== null ? (
                    <p className={cn(
                      'text-lg font-bold',
                      selectedCO.cost_impact > 0 && 'text-red-600',
                      selectedCO.cost_impact < 0 && 'text-green-600'
                    )}>
                      {selectedCO.cost_impact > 0 ? '+' : ''}
                      {formatCurrency(selectedCO.cost_impact)}
                    </p>
                  ) : (
                    <p className="text-gray-400">Not specified</p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-gray-500">Schedule Impact</p>
                  {selectedCO.schedule_impact_days !== null ? (
                    <p className={cn(
                      'text-lg font-bold',
                      selectedCO.schedule_impact_days > 0 && 'text-red-600',
                      selectedCO.schedule_impact_days < 0 && 'text-green-600'
                    )}>
                      {selectedCO.schedule_impact_days > 0 ? '+' : ''}
                      {selectedCO.schedule_impact_days} days
                    </p>
                  ) : (
                    <p className="text-gray-400">Not specified</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="font-medium">
                    {format(new Date(selectedCO.created_at), 'MMMM d, yyyy')}
                  </p>
                </div>

                {selectedCO.approved_at && (
                  <div>
                    <p className="text-sm text-gray-500">Approved</p>
                    <p className="font-medium text-green-600">
                      {format(new Date(selectedCO.approved_at), 'MMMM d, yyyy')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
