/**
 * InsuranceCompliance Component
 * Dashboard for managing subcontractor insurance compliance
 */

import { useState, useMemo, useCallback } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Building2,
  Calendar,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  FileCheck,
  Filter,
  Loader2,
  Mail,
  MoreHorizontal,
  PauseCircle,
  RefreshCw,
  Search,
  Send,
  Settings,
  Shield,
  Upload,
  X,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  useInsuranceComplianceList,
  useInsuranceComplianceDashboard,
  useExpiringCertificates,
  useSendBulkReminders,
  useSendReminder,
  getInsuranceTypeName,
  getComplianceStatusColor,
  getExpiryText,
} from '../hooks'
import type { InsuranceComplianceSubcontractor, InsuranceComplianceFilters } from '../types'
import { cn } from '@/lib/utils'

interface InsuranceComplianceProps {
  projectId?: string
  onViewSubcontractor?: (id: string) => void
  onUploadCertificate?: (subcontractorId: string) => void
}

type ViewMode = 'all' | 'expiring' | 'non_compliant' | 'on_hold'

export function InsuranceCompliance({
  projectId,
  onViewSubcontractor,
  onUploadCertificate,
}: InsuranceComplianceProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showReminderDialog, setShowReminderDialog] = useState(false)

  // Filters based on view mode
  const filters: InsuranceComplianceFilters = useMemo(() => {
    const base: InsuranceComplianceFilters = {
      projectId,
      search: searchQuery || undefined,
    }

    switch (viewMode) {
      case 'expiring':
        base.status = ['expiring']
        break
      case 'non_compliant':
        base.status = ['non_compliant', 'missing']
        break
      case 'on_hold':
        base.onlyWithHold = true
        break
    }

    return base
  }, [projectId, searchQuery, viewMode])

  const { data: subcontractors, isLoading } = useInsuranceComplianceList(filters)
  const { data: dashboardStats, isLoading: statsLoading } = useInsuranceComplianceDashboard()
  const { data: expiringCerts } = useExpiringCertificates(90)

  const sendBulkRemindersMutation = useSendBulkReminders()
  const sendReminderMutation = useSendReminder()

  // Toggle selection
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // Select all
  const selectAll = useCallback(() => {
    if (selectedIds.size === (subcontractors?.length || 0)) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(subcontractors?.map((s) => s.id) || []))
    }
  }, [selectedIds.size, subcontractors])

  // Send reminders to selected
  const handleSendReminders = useCallback(async () => {
    if (selectedIds.size === 0) return

    await sendBulkRemindersMutation.mutateAsync({
      subcontractorIds: Array.from(selectedIds),
      reminderType: 'expiring',
    })

    setSelectedIds(new Set())
    setShowReminderDialog(false)
  }, [selectedIds, sendBulkRemindersMutation])

  // Send single reminder
  const handleSendSingleReminder = useCallback(async (subcontractorId: string) => {
    await sendReminderMutation.mutateAsync({
      subcontractorId,
    })
  }, [sendReminderMutation])

  if (isLoading) {
    return <InsuranceComplianceLoading />
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          title="Total Certificates"
          value={dashboardStats?.totalCertificates || 0}
          icon={FileCheck}
          color="bg-primary/10 text-primary"
          loading={statsLoading}
        />
        <StatCard
          title="Active"
          value={dashboardStats?.activeCertificates || 0}
          icon={CheckCircle}
          color="bg-success/10 text-success"
          loading={statsLoading}
        />
        <StatCard
          title="Expiring (30 days)"
          value={dashboardStats?.expiringIn30Days || 0}
          icon={Clock}
          color="bg-warning/10 text-warning"
          loading={statsLoading}
        />
        <StatCard
          title="Expired"
          value={dashboardStats?.expiredCertificates || 0}
          icon={XCircle}
          color="bg-error/10 text-error"
          loading={statsLoading}
        />
        <StatCard
          title="On Hold"
          value={dashboardStats?.onPaymentHold || 0}
          icon={PauseCircle}
          color="bg-error/10 text-error"
          loading={statsLoading}
        />
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Insurance Compliance
              </CardTitle>
              <CardDescription>
                Manage subcontractor insurance certificates and compliance
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReminderDialog(true)}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Reminders ({selectedIds.size})
                </Button>
              )}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Reminder Settings</SheetTitle>
                    <SheetDescription>
                      Configure automatic reminder notifications
                    </SheetDescription>
                  </SheetHeader>
                  <div className="py-6 space-y-6">
                    <div className="space-y-2">
                      <Label>Send reminders at</Label>
                      <div className="space-y-2">
                        {[90, 60, 30, 14, 7].map((days) => (
                          <div key={days} className="flex items-center gap-2">
                            <Checkbox defaultChecked={days <= 30} />
                            <span className="text-sm">{days} days before expiration</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <Label>CC addresses</Label>
                      <Input placeholder="email@example.com" />
                      <p className="text-xs text-muted-foreground">
                        Separate multiple emails with commas
                      </p>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search subcontractors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="expiring">
                  Expiring
                  {dashboardStats?.expiringIn30Days ? (
                    <Badge variant="secondary" className="ml-1">
                      {dashboardStats.expiringIn30Days}
                    </Badge>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="non_compliant">
                  Non-Compliant
                  {dashboardStats?.nonCompliantSubcontractors ? (
                    <Badge variant="destructive" className="ml-1">
                      {dashboardStats.nonCompliantSubcontractors}
                    </Badge>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="on_hold">On Hold</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.size === (subcontractors?.length || 0) && selectedIds.size > 0}
                      onCheckedChange={selectAll}
                    />
                  </TableHead>
                  <TableHead>Subcontractor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Compliance</TableHead>
                  <TableHead>Certificates</TableHead>
                  <TableHead>Next Expiration</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {!subcontractors || subcontractors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      {searchQuery
                        ? 'No subcontractors match your search'
                        : 'No subcontractors found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  subcontractors.map((sub) => (
                    <SubcontractorRow
                      key={sub.id}
                      subcontractor={sub}
                      isSelected={selectedIds.has(sub.id)}
                      onSelect={() => toggleSelection(sub.id)}
                      onView={() => onViewSubcontractor?.(sub.id)}
                      onUpload={() => onUploadCertificate?.(sub.id)}
                      onSendReminder={() => handleSendSingleReminder(sub.id)}
                      isSendingReminder={sendReminderMutation.isPending}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Expiring Certificates Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Expirations
          </CardTitle>
          <CardDescription>
            Certificates expiring in the next 90 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExpirationTimeline certificates={expiringCerts || []} />
        </CardContent>
      </Card>

      {/* Bulk Reminder Dialog */}
      <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Reminder Emails</DialogTitle>
            <DialogDescription>
              Send insurance renewal reminders to {selectedIds.size} selected subcontractors
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              An email will be sent to each subcontractor reminding them to update their
              insurance certificates before expiration.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReminderDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendReminders}
              disabled={sendBulkRemindersMutation.isPending}
            >
              {sendBulkRemindersMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Reminders
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =============================================
// Sub-components
// =============================================

interface StatCardProps {
  title: string
  value: number
  icon: typeof Shield
  color: string
  loading?: boolean
}

function StatCard({ title, value, icon: Icon, color, loading }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-bold">{value}</p>
            )}
          </div>
          <div className={cn('p-2 rounded-lg', color)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface SubcontractorRowProps {
  subcontractor: InsuranceComplianceSubcontractor
  isSelected: boolean
  onSelect: () => void
  onView: () => void
  onUpload: () => void
  onSendReminder: () => void
  isSendingReminder: boolean
}

function SubcontractorRow({
  subcontractor,
  isSelected,
  onSelect,
  onView,
  onUpload,
  onSendReminder,
  isSendingReminder,
}: SubcontractorRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const statusConfig = {
    compliant: { label: 'Compliant', variant: 'default' as const, icon: CheckCircle },
    expiring: { label: 'Expiring', variant: 'secondary' as const, icon: Clock },
    non_compliant: { label: 'Non-Compliant', variant: 'destructive' as const, icon: XCircle },
    missing: { label: 'Missing', variant: 'destructive' as const, icon: AlertCircle },
  }

  const status = statusConfig[subcontractor.overallStatus]
  const StatusIcon = status.icon

  const nextExpiring = subcontractor.certificates
    .filter((c) => c.daysUntilExpiry > 0)
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)[0]

  return (
    <>
      <TableRow className={cn(isSelected && 'bg-muted/50')}>
        <TableCell>
          <Checkbox checked={isSelected} onCheckedChange={onSelect} />
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
            <div>
              <p className="font-medium">{subcontractor.companyName}</p>
              {subcontractor.contactName && (
                <p className="text-xs text-muted-foreground">{subcontractor.contactName}</p>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Badge variant={status.variant}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
            {subcontractor.paymentHold && (
              <Badge variant="destructive">
                <PauseCircle className="h-3 w-3 mr-1" />
                Hold
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Progress
              value={subcontractor.complianceScore}
              className="h-2 w-16"
            />
            <span className="text-sm">{subcontractor.complianceScore}%</span>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            <span className="text-sm">
              {subcontractor.certificates.length} total
            </span>
            {subcontractor.expiringCertificates.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {subcontractor.expiringCertificates.length} expiring
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell>
          {nextExpiring ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <span className={cn(
                    'text-sm',
                    nextExpiring.daysUntilExpiry <= 14 && 'text-error',
                    nextExpiring.daysUntilExpiry > 14 && nextExpiring.daysUntilExpiry <= 30 && 'text-warning'
                  )}>
                    {getExpiryText(nextExpiring.daysUntilExpiry)}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{getInsuranceTypeName(nextExpiring.type)}</p>
                  <p className="text-xs text-muted-foreground">
                    Expires: {new Date(nextExpiring.expirationDate).toLocaleDateString()}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
        </TableCell>
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onView}>
                <Building2 className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onUpload}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Certificate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onSendReminder}
                disabled={isSendingReminder}
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Reminder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={7} className="bg-muted/30 p-4">
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Certificates</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subcontractor.certificates.map((cert) => (
                  <CertificateCard key={cert.id} certificate={cert} />
                ))}
                {subcontractor.missingTypes.length > 0 && (
                  <div className="border rounded-lg p-3 border-dashed border-error/50 bg-error/5">
                    <h5 className="font-medium text-sm text-error mb-2">Missing Coverage</h5>
                    <ul className="space-y-1">
                      {subcontractor.missingTypes.map((type) => (
                        <li key={type} className="text-sm text-error flex items-center gap-1">
                          <XCircle className="h-3 w-3" />
                          {getInsuranceTypeName(type)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

interface CertificateCardProps {
  certificate: InsuranceComplianceSubcontractor['certificates'][0]
}

function CertificateCard({ certificate }: CertificateCardProps) {
  const statusColors = {
    active: 'border-success bg-success/5',
    expiring_soon: 'border-warning bg-warning/5',
    expired: 'border-error bg-error/5',
  }

  return (
    <div className={cn('border rounded-lg p-3', statusColors[certificate.status])}>
      <div className="flex items-start justify-between">
        <div>
          <h5 className="font-medium text-sm">{certificate.typeName}</h5>
          <p className="text-xs text-muted-foreground">{certificate.carrier}</p>
        </div>
        <Badge
          variant={
            certificate.status === 'active' ? 'default' :
            certificate.status === 'expiring_soon' ? 'secondary' : 'destructive'
          }
        >
          {certificate.status === 'active' ? 'Active' :
           certificate.status === 'expiring_soon' ? 'Expiring' : 'Expired'}
        </Badge>
      </div>
      <div className="mt-2 space-y-1 text-xs">
        <p>
          <span className="text-muted-foreground">Policy:</span> {certificate.policyNumber}
        </p>
        <p>
          <span className="text-muted-foreground">Expires:</span>{' '}
          {new Date(certificate.expirationDate).toLocaleDateString()}
        </p>
        {certificate.coverageAmount && (
          <p>
            <span className="text-muted-foreground">Coverage:</span>{' '}
            ${certificate.coverageAmount.toLocaleString()}
          </p>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        {certificate.additionalInsured && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Check className="h-3 w-3 text-success" />
              </TooltipTrigger>
              <TooltipContent>Additional Insured</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {certificate.waiverOfSubrogation && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Check className="h-3 w-3 text-success" />
              </TooltipTrigger>
              <TooltipContent>Waiver of Subrogation</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  )
}

interface ExpirationTimelineProps {
  certificates: any[]
}

function ExpirationTimeline({ certificates }: ExpirationTimelineProps) {
  // Group by time periods
  const groups = useMemo(() => {
    const now = new Date()
    const periods = [
      { label: 'This Week', days: 7, items: [] as any[] },
      { label: 'Next 2 Weeks', days: 14, items: [] as any[] },
      { label: 'This Month', days: 30, items: [] as any[] },
      { label: 'Next 60 Days', days: 60, items: [] as any[] },
      { label: 'Next 90 Days', days: 90, items: [] as any[] },
    ]

    certificates.forEach((cert) => {
      const expDate = new Date(cert.expiration_date)
      const daysUntil = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      for (const period of periods) {
        if (daysUntil <= period.days) {
          period.items.push({ ...cert, daysUntil })
          break
        }
      }
    })

    return periods.filter((p) => p.items.length > 0)
  }, [certificates])

  if (groups.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No certificates expiring in the next 90 days</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.label}>
          <h4 className={cn(
            'font-medium text-sm mb-3 flex items-center gap-2',
            group.days <= 7 && 'text-error',
            group.days > 7 && group.days <= 30 && 'text-warning'
          )}>
            {group.days <= 7 && <AlertTriangle className="h-4 w-4" />}
            {group.label} ({group.items.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {group.items.map((cert: any) => (
              <div
                key={cert.id}
                className={cn(
                  'border rounded-lg p-3',
                  cert.daysUntil <= 7 && 'border-error bg-error/5',
                  cert.daysUntil > 7 && cert.daysUntil <= 30 && 'border-warning bg-warning/5'
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{cert.subcontractor?.company_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {getInsuranceTypeName(cert.insurance_type)}
                    </p>
                  </div>
                  <Badge variant={cert.daysUntil <= 7 ? 'destructive' : 'secondary'}>
                    {cert.daysUntil} days
                  </Badge>
                </div>
                <p className="text-xs mt-2 text-muted-foreground">
                  Expires: {new Date(cert.expiration_date).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function InsuranceComplianceLoading() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
