/**
 * Client RFIs View
 *
 * Read-only RFI list for clients to track requests for information.
 */

import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useClientRFIs } from '../hooks/useClientPortal'
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  HelpCircle,
  Search,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  Circle,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, isPast } from 'date-fns'
import type { ClientRFIView } from '@/types/client-portal'

// Status configuration
const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ComponentType<{ className?: string }> }> = {
  open: { label: 'Open', color: 'text-primary-hover', bgColor: 'bg-info-light', icon: Circle },
  pending: { label: 'Pending', color: 'text-yellow-700', bgColor: 'bg-warning-light', icon: Clock },
  in_progress: { label: 'In Progress', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: AlertCircle },
  resolved: { label: 'Resolved', color: 'text-success-dark', bgColor: 'bg-success-light', icon: CheckCircle2 },
  closed: { label: 'Closed', color: 'text-secondary', bgColor: 'bg-muted', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'text-error-dark', bgColor: 'bg-error-light', icon: XCircle },
}

const priorityConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Low', color: 'text-secondary', bgColor: 'bg-muted' },
  medium: { label: 'Medium', color: 'text-warning', bgColor: 'bg-warning-light' },
  high: { label: 'High', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  critical: { label: 'Critical', color: 'text-error', bgColor: 'bg-error-light' },
}

export function ClientRFIs() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: rfis, isLoading } = useClientRFIs(projectId)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Filter RFIs
  const filteredRFIs = useMemo(() => {
    if (!rfis) {return []}
    return rfis.filter(rfi => {
      const matchesSearch = !searchTerm ||
        rfi.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rfi.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rfi.number.toString().includes(searchTerm)
      const matchesStatus = statusFilter === 'all' || rfi.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [rfis, searchTerm, statusFilter])

  // Stats
  const stats = useMemo(() => {
    if (!rfis) {return { open: 0, pending: 0, resolved: 0, total: 0 }}
    return {
      open: rfis.filter(r => r.status === 'open' || r.status === 'in_progress').length,
      pending: rfis.filter(r => r.status === 'pending').length,
      resolved: rfis.filter(r => r.status === 'resolved' || r.status === 'closed').length,
      total: rfis.length,
    }
  }, [rfis])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
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
        <h1 className="text-2xl font-bold text-foreground" className="heading-page">Requests for Information</h1>
        <p className="text-secondary mt-1">
          Track RFIs and their responses for your project.
        </p>
      </div>

      {/* Stats Cards */}
      {rfis && rfis.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <HelpCircle className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted">Total RFIs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-info-light rounded-lg">
                  <Circle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.open}</p>
                  <p className="text-sm text-muted">Open</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning-light rounded-lg">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-sm text-muted">Pending Response</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success-light rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.resolved}</p>
                  <p className="text-sm text-muted">Resolved</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      {rfis && rfis.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-disabled" />
            <Input
              placeholder="Search by title, description, or RFI number..."
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

      {/* RFI Count */}
      {filteredRFIs.length > 0 && (
        <p className="text-sm text-muted">
          Showing {filteredRFIs.length} RFI{filteredRFIs.length !== 1 ? 's' : ''}
          {searchTerm || statusFilter !== 'all' ? ' (filtered)' : ''}
        </p>
      )}

      {/* RFI List */}
      {filteredRFIs.length > 0 ? (
        <Card>
          <CardContent className="pt-6">
            <Accordion type="single" collapsible className="space-y-4">
              {filteredRFIs.map((rfi) => {
                const status = statusConfig[rfi.status] || statusConfig.open
                const priority = rfi.priority ? priorityConfig[rfi.priority] : null
                const StatusIcon = status.icon
                const isOverdue = rfi.due_date && isPast(new Date(rfi.due_date)) && !['resolved', 'closed', 'cancelled'].includes(rfi.status)

                return (
                  <AccordionItem
                    key={rfi.id}
                    value={rfi.id}
                    className="border rounded-lg px-4"
                  >
                    <AccordionTrigger className="hover:no-underline py-4">
                      <div className="flex items-center gap-4 flex-1 text-left">
                        <div className="flex-shrink-0">
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-muted text-secondary font-semibold">
                            #{rfi.number}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium text-foreground truncate" className="heading-subsection">
                              {rfi.title}
                            </h3>
                            {isOverdue && (
                              <Badge variant="destructive" className="text-xs">
                                Overdue
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(rfi.created_at), 'MMM d, yyyy')}
                            </span>
                            {rfi.due_date && (
                              <span className={cn(
                                'flex items-center gap-1',
                                isOverdue && 'text-error'
                              )}>
                                <Clock className="h-3 w-3" />
                                Due: {format(new Date(rfi.due_date), 'MMM d, yyyy')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {priority && (
                            <span className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                              priority.bgColor,
                              priority.color
                            )}>
                              {priority.label}
                            </span>
                          )}
                          <span className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium',
                            status.bgColor,
                            status.color
                          )}>
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div className="space-y-4 pt-2">
                        {/* Description */}
                        {rfi.description && (
                          <div>
                            <h4 className="text-sm font-medium text-secondary mb-1" className="heading-card">Description</h4>
                            <p className="text-secondary whitespace-pre-wrap">{rfi.description}</p>
                          </div>
                        )}

                        {/* Resolution */}
                        {rfi.resolution && (
                          <div className="bg-success-light border border-green-200 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-green-800 mb-1 flex items-center gap-2" className="heading-card">
                              <CheckCircle2 className="h-4 w-4" />
                              Resolution
                            </h4>
                            <p className="text-success-dark whitespace-pre-wrap">{rfi.resolution}</p>
                            {rfi.resolved_at && (
                              <p className="text-sm text-success mt-2">
                                Resolved on {format(new Date(rfi.resolved_at), 'MMMM d, yyyy')}
                              </p>
                            )}
                          </div>
                        )}

                        {/* No resolution yet */}
                        {!rfi.resolution && !['resolved', 'closed', 'cancelled'].includes(rfi.status) && (
                          <div className="bg-surface border border-border rounded-lg p-4">
                            <p className="text-muted text-sm">
                              Awaiting response...
                            </p>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <HelpCircle className="h-12 w-12 text-disabled mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground" className="heading-subsection">No RFIs Found</h3>
            <p className="text-muted mt-1">
              {searchTerm || statusFilter !== 'all'
                ? 'No RFIs match your filters. Try adjusting your search.'
                : 'RFIs for this project will appear here.'}
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
    </div>
  )
}
