// File: /src/pages/settings/AuditLogsPage.tsx
// Audit logs viewer for admin users - HIPAA, SOX, ISO 27001 compliance

import { useState, useEffect, useCallback } from 'react'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { SmartLayout } from '@/components/layout/SmartLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Shield,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  User,
  Calendar,
  Eye,
  AlertTriangle,
  LogIn,
  LogOut,
  Edit,
  Trash2,
  Plus,
  FileText,
  Lock,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { logger } from '@/lib/utils/logger'
import { cn } from '@/lib/utils'
import type { AuditAction, AuditResourceType } from '@/lib/audit/audit-logger'

// ============================================================================
// Types
// ============================================================================

interface AuditLogEntry {
  id: string
  user_id: string | null
  company_id: string | null
  action: AuditAction
  resource_type: AuditResourceType
  resource_id: string | null
  ip_address: string | null
  user_agent: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  created_at: string
  // Joined data
  user?: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
  }
}

interface AuditLogFilters {
  userId: string
  action: string
  resourceType: string
  dateRange: 'today' | 'week' | 'month' | 'custom'
  startDate: string
  endDate: string
  search: string
}

// ============================================================================
// Constants
// ============================================================================

const ACTION_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  // Authentication
  login: { label: 'Login', icon: LogIn, color: 'text-success bg-success-light' },
  logout: { label: 'Logout', icon: LogOut, color: 'text-info bg-info-light' },
  failed_login: { label: 'Failed Login', icon: AlertTriangle, color: 'text-error bg-error-light' },
  password_reset: { label: 'Password Reset', icon: Lock, color: 'text-warning bg-warning-light' },
  password_change: { label: 'Password Change', icon: Lock, color: 'text-warning bg-warning-light' },
  session_refresh: { label: 'Session Refresh', icon: RefreshCw, color: 'text-muted-foreground bg-muted' },
  session_expired: { label: 'Session Expired', icon: AlertTriangle, color: 'text-warning bg-warning-light' },
  // Data operations
  create: { label: 'Created', icon: Plus, color: 'text-success bg-success-light' },
  update: { label: 'Updated', icon: Edit, color: 'text-info bg-info-light' },
  delete: { label: 'Deleted', icon: Trash2, color: 'text-error bg-error-light' },
  view: { label: 'Viewed', icon: Eye, color: 'text-muted-foreground bg-muted' },
  download: { label: 'Downloaded', icon: Download, color: 'text-info bg-info-light' },
  export: { label: 'Exported', icon: FileText, color: 'text-primary bg-primary-50' },
  // Security
  security_warning: { label: 'Security Warning', icon: AlertTriangle, color: 'text-warning bg-warning-light' },
  suspicious_activity: { label: 'Suspicious Activity', icon: Shield, color: 'text-error bg-error-light' },
  rate_limit_exceeded: { label: 'Rate Limited', icon: AlertTriangle, color: 'text-warning bg-warning-light' },
}

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  user: 'User',
  company: 'Company',
  project: 'Project',
  document: 'Document',
  rfi: 'RFI',
  submittal: 'Submittal',
  change_order: 'Change Order',
  payment_application: 'Payment Application',
  lien_waiver: 'Lien Waiver',
  daily_report: 'Daily Report',
  safety_incident: 'Safety Incident',
  meeting: 'Meeting',
  task: 'Task',
  punch_item: 'Punch Item',
  session: 'Session',
  authentication: 'Authentication',
  settings: 'Settings',
}

const PAGE_SIZE = 25

// ============================================================================
// Helper Functions
// ============================================================================

function getActionBadge(action: string) {
  const config = ACTION_LABELS[action] || {
    label: action,
    icon: FileText,
    color: 'text-muted-foreground bg-muted',
  }
  const Icon = config.icon

  return (
    <Badge variant="outline" className={cn('gap-1', config.color)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

function formatUserAgent(ua: string | null): string {
  if (!ua) {return 'Unknown'}

  // Parse browser
  let browser = 'Unknown Browser'
  if (ua.includes('Chrome')) {browser = 'Chrome'}
  else if (ua.includes('Firefox')) {browser = 'Firefox'}
  else if (ua.includes('Safari')) {browser = 'Safari'}
  else if (ua.includes('Edge')) {browser = 'Edge'}

  // Parse OS
  let os = 'Unknown OS'
  if (ua.includes('Windows')) {os = 'Windows'}
  else if (ua.includes('Mac')) {os = 'macOS'}
  else if (ua.includes('Linux')) {os = 'Linux'}
  else if (ua.includes('Android')) {os = 'Android'}
  else if (ua.includes('iPhone') || ua.includes('iPad')) {os = 'iOS'}

  return `${browser} on ${os}`
}

// ============================================================================
// Components
// ============================================================================

function AuditLogDetailDialog({
  log,
  open,
  onClose,
}: {
  log: AuditLogEntry | null
  open: boolean
  onClose: () => void
}) {
  if (!log) {return null}

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Audit Log Details
          </DialogTitle>
          <DialogDescription>
            {format(new Date(log.created_at), 'PPpp')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Action and Resource */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Action</Label>
              <div className="mt-1">{getActionBadge(log.action)}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">Resource Type</Label>
              <p className="mt-1 font-medium">
                {RESOURCE_TYPE_LABELS[log.resource_type] || log.resource_type}
              </p>
            </div>
          </div>

          {/* User Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">User</Label>
              <p className="mt-1 font-medium">
                {log.user
                  ? `${log.user.first_name || ''} ${log.user.last_name || ''}`.trim() || log.user.email
                  : 'System'}
              </p>
              {log.user?.email && (
                <p className="text-sm text-muted-foreground">{log.user.email}</p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">Resource ID</Label>
              <p className="mt-1 font-mono text-sm">
                {log.resource_id || 'N/A'}
              </p>
            </div>
          </div>

          {/* IP and User Agent */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">IP Address</Label>
              <p className="mt-1 font-mono text-sm">{log.ip_address || 'Not recorded'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Device</Label>
              <p className="mt-1 text-sm">{formatUserAgent(log.user_agent)}</p>
            </div>
          </div>

          {/* Old Values */}
          {log.old_values && Object.keys(log.old_values).length > 0 && (
            <div>
              <Label className="text-muted-foreground">Previous Values</Label>
              <pre className="mt-1 p-3 bg-muted rounded-md text-sm overflow-x-auto">
                {JSON.stringify(log.old_values, null, 2)}
              </pre>
            </div>
          )}

          {/* New Values */}
          {log.new_values && Object.keys(log.new_values).length > 0 && (
            <div>
              <Label className="text-muted-foreground">New Values</Label>
              <pre className="mt-1 p-3 bg-muted rounded-md text-sm overflow-x-auto">
                {JSON.stringify(log.new_values, null, 2)}
              </pre>
            </div>
          )}

          {/* Metadata */}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <div>
              <Label className="text-muted-foreground">Additional Metadata</Label>
              <pre className="mt-1 p-3 bg-muted rounded-md text-sm overflow-x-auto">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function AuditLogsPage() {
  const { userProfile } = useAuth()
  const isAdmin = userProfile?.role === 'owner' || userProfile?.role === 'admin'

  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null)
  const [exporting, setExporting] = useState(false)

  const [filters, setFilters] = useState<AuditLogFilters>({
    userId: '',
    action: '',
    resourceType: '',
    dateRange: 'week',
    startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    search: '',
  })

  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([])

  // Fetch users for filter dropdown
  useEffect(() => {
    if (!userProfile?.company_id) {return}

    const fetchUsers = async () => {
      const { data } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('company_id', userProfile.company_id)
        .order('first_name')

      if (data) {
        setUsers(
          data.map((u) => ({
            id: u.id,
            name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'Unknown',
            email: u.email || '',
          }))
        )
      }
    }

    fetchUsers()
  }, [userProfile?.company_id])

  // Calculate date range based on selection
  const getDateRange = useCallback(() => {
    const now = new Date()
    switch (filters.dateRange) {
      case 'today':
        return {
          start: startOfDay(now),
          end: endOfDay(now),
        }
      case 'week':
        return {
          start: startOfDay(subDays(now, 7)),
          end: endOfDay(now),
        }
      case 'month':
        return {
          start: startOfDay(subDays(now, 30)),
          end: endOfDay(now),
        }
      case 'custom':
        return {
          start: startOfDay(new Date(filters.startDate)),
          end: endOfDay(new Date(filters.endDate)),
        }
    }
  }, [filters.dateRange, filters.startDate, filters.endDate])

  // Fetch audit logs
  const fetchLogs = useCallback(async () => {
    if (!userProfile?.company_id) {return}

    setLoading(true)
    try {
      const { start, end } = getDateRange()

      let query = supabase
        .from('audit_logs')
        .select(
          `
          *,
          user:users(id, first_name, last_name, email)
        `,
          { count: 'exact' }
        )
        .eq('company_id', userProfile.company_id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (filters.userId) {
        query = query.eq('user_id', filters.userId)
      }
      if (filters.action) {
        query = query.eq('action', filters.action)
      }
      if (filters.resourceType) {
        query = query.eq('resource_type', filters.resourceType)
      }
      if (filters.search) {
        // Search in metadata jsonb
        query = query.or(`resource_id.ilike.%${filters.search}%`)
      }

      const { data, count, error } = await query

      if (error) {
        logger.error('[AuditLogs] Fetch error:', error)
        return
      }

      setLogs(data || [])
      setTotalCount(count || 0)
    } catch (error) {
      logger.error('[AuditLogs] Error:', error)
    } finally {
      setLoading(false)
    }
  }, [userProfile?.company_id, page, filters, getDateRange])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // Handle date range change
  const handleDateRangeChange = (value: string) => {
    setPage(0)
    if (value !== 'custom') {
      setFilters((prev) => ({ ...prev, dateRange: value as AuditLogFilters['dateRange'] }))
    } else {
      setFilters((prev) => ({
        ...prev,
        dateRange: 'custom',
        startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
      }))
    }
  }

  // Export logs to CSV
  const handleExport = async () => {
    if (!userProfile?.company_id) {return}

    setExporting(true)
    try {
      const { start, end } = getDateRange()

      let query = supabase
        .from('audit_logs')
        .select('*, user:users(first_name, last_name, email)')
        .eq('company_id', userProfile.company_id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false })

      if (filters.userId) {query = query.eq('user_id', filters.userId)}
      if (filters.action) {query = query.eq('action', filters.action)}
      if (filters.resourceType) {query = query.eq('resource_type', filters.resourceType)}

      const { data, error } = await query

      if (error) {throw error}

      // Convert to CSV
      const headers = [
        'Timestamp',
        'User',
        'Email',
        'Action',
        'Resource Type',
        'Resource ID',
        'IP Address',
        'User Agent',
      ]

      const rows = (data || []).map((log) => [
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        log.user ? `${log.user.first_name || ''} ${log.user.last_name || ''}`.trim() : 'System',
        log.user?.email || '',
        log.action,
        log.resource_type,
        log.resource_id || '',
        log.ip_address || '',
        log.user_agent || '',
      ])

      const csv = [headers, ...rows].map((row) => row.map((v) => `"${v}"`).join(',')).join('\n')

      // Download
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      logger.error('[AuditLogs] Export error:', error)
    } finally {
      setExporting(false)
    }
  }

  // Access control
  if (!isAdmin) {
    return (
      <SmartLayout title="Audit Logs" subtitle="Security and compliance audit trail">
        <div className="container max-w-4xl py-6">
          <Card>
            <CardContent className="p-12 text-center">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">
                You need admin or owner permissions to view audit logs.
              </p>
            </CardContent>
          </Card>
        </div>
      </SmartLayout>
    )
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <SmartLayout title="Audit Logs" subtitle="Security and compliance audit trail">
      <div className="container max-w-7xl py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="heading-page">Audit Logs</h1>
            <p className="text-muted-foreground">
              Track all security and data access events for compliance
            </p>
          </div>
          <Button onClick={handleExport} disabled={exporting} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* User Filter */}
              <div>
                <Label>User</Label>
                <Select
                  value={filters.userId}
                  onValueChange={(v) => {
                    setPage(0)
                    setFilters((prev) => ({ ...prev, userId: v === 'all' ? '' : v }))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All users</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Action Filter */}
              <div>
                <Label>Action</Label>
                <Select
                  value={filters.action}
                  onValueChange={(v) => {
                    setPage(0)
                    setFilters((prev) => ({ ...prev, action: v === 'all' ? '' : v }))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All actions</SelectItem>
                    {Object.entries(ACTION_LABELS).map(([value, { label }]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Resource Type Filter */}
              <div>
                <Label>Resource Type</Label>
                <Select
                  value={filters.resourceType}
                  onValueChange={(v) => {
                    setPage(0)
                    setFilters((prev) => ({ ...prev, resourceType: v === 'all' ? '' : v }))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All resources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All resources</SelectItem>
                    {Object.entries(RESOURCE_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range Filter */}
              <div>
                <Label>Date Range</Label>
                <Select value={filters.dateRange} onValueChange={handleDateRangeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 days</SelectItem>
                    <SelectItem value="month">Last 30 days</SelectItem>
                    <SelectItem value="custom">Custom range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Search */}
              <div>
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search logs..."
                    value={filters.search}
                    onChange={(e) => {
                      setPage(0)
                      setFilters((prev) => ({ ...prev, search: e.target.value }))
                    }}
                    className="pl-8"
                  />
                </div>
              </div>
            </div>

            {/* Custom Date Range */}
            {filters.dateRange === 'custom' && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => {
                      setPage(0)
                      setFilters((prev) => ({ ...prev, startDate: e.target.value }))
                    }}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => {
                      setPage(0)
                      setFilters((prev) => ({ ...prev, endDate: e.target.value }))
                    }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-lg">
                {totalCount.toLocaleString()} {totalCount === 1 ? 'entry' : 'entries'}
              </CardTitle>
              <CardDescription>
                Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, totalCount)} of{' '}
                {totalCount}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
              <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Timestamp
                    </div>
                  </TableHead>
                  <TableHead className="w-[200px]">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      User
                    </div>
                  </TableHead>
                  <TableHead className="w-[150px]">Action</TableHead>
                  <TableHead className="w-[150px]">Resource</TableHead>
                  <TableHead className="w-[140px]">IP Address</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-8 w-16 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <Shield className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-muted-foreground">No audit logs found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono text-sm">
                        {format(new Date(log.created_at), 'MMM d, h:mm a')}
                      </TableCell>
                      <TableCell>
                        <div className="truncate max-w-[200px]">
                          {log.user
                            ? `${log.user.first_name || ''} ${log.user.last_name || ''}`.trim() ||
                              log.user.email
                            : 'System'}
                        </div>
                      </TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell className="text-sm">
                        {RESOURCE_TYPE_LABELS[log.resource_type] || log.resource_type}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.ip_address || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Detail Dialog */}
      <AuditLogDetailDialog
        log={selectedLog}
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </SmartLayout>
  )
}

export default AuditLogsPage
