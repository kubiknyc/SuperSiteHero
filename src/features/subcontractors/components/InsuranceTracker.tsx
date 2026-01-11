/**
 * InsuranceTracker Component
 * Enhanced insurance tracking with COI management, expiration alerts, and compliance dashboard
 */

import { useState, useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format, addDays, differenceInDays, isAfter, isBefore, parseISO } from 'date-fns'
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
  Edit,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  FileWarning,
  Filter,
  Loader2,
  Mail,
  MoreHorizontal,
  PauseCircle,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Upload,
  X,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import {
  useInsuranceComplianceList,
  useInsuranceComplianceDashboard,
  useExpiringCertificates,
  useExpirationCalendar,
  useReminderSettings,
  useUpdateReminderSettings,
  useSendBulkReminders,
  useSendReminder,
  useUploadCertificate,
  useVerifyCertificate,
  getInsuranceTypeName,
  getComplianceStatusColor,
  getExpiryText,
} from '../hooks'
import type {
  InsuranceType,
  InsuranceCertificate,
  InsuranceComplianceSubcontractor,
  InsuranceComplianceFilters,
  ReminderSettings,
} from '../types'
import { cn } from '@/lib/utils'

// Insurance types configuration
const INSURANCE_TYPES: { value: InsuranceType; label: string; description: string }[] = [
  { value: 'general_liability', label: 'General Liability', description: 'Commercial general liability coverage' },
  { value: 'auto_liability', label: 'Auto Liability', description: 'Commercial auto liability coverage' },
  { value: 'workers_comp', label: 'Workers Compensation', description: 'Workers compensation and employer liability' },
  { value: 'umbrella', label: 'Umbrella/Excess', description: 'Umbrella or excess liability coverage' },
  { value: 'professional', label: 'Professional Liability', description: 'Errors and omissions coverage' },
  { value: 'pollution', label: 'Pollution Liability', description: 'Environmental and pollution coverage' },
  { value: 'builders_risk', label: 'Builders Risk', description: 'Course of construction coverage' },
]

// Coverage requirements
const COVERAGE_REQUIREMENTS: Record<InsuranceType, { minLimit: number; required: boolean }> = {
  general_liability: { minLimit: 1000000, required: true },
  auto_liability: { minLimit: 1000000, required: true },
  workers_comp: { minLimit: 500000, required: true },
  umbrella: { minLimit: 2000000, required: false },
  professional: { minLimit: 1000000, required: false },
  pollution: { minLimit: 1000000, required: false },
  builders_risk: { minLimit: 0, required: false },
}

// Form schema
const certificateSchema = z.object({
  insuranceType: z.string().min(1, 'Insurance type is required'),
  carrier: z.string().min(1, 'Insurance carrier is required'),
  policyNumber: z.string().min(1, 'Policy number is required'),
  effectiveDate: z.string().min(1, 'Effective date is required'),
  expirationDate: z.string().min(1, 'Expiration date is required'),
  coverageAmount: z.number().min(0, 'Coverage amount must be positive'),
  aggregateAmount: z.number().optional(),
  deductible: z.number().optional(),
  additionalInsured: z.boolean().default(false),
  waiverOfSubrogation: z.boolean().default(false),
  primaryNonContributory: z.boolean().default(false),
  namedInsuredExact: z.boolean().default(false),
  notes: z.string().optional(),
})

type CertificateFormValues = z.infer<typeof certificateSchema>

interface InsuranceTrackerProps {
  projectId?: string
  subcontractorId?: string
  onViewSubcontractor?: (id: string) => void
  showDashboard?: boolean
}

export function InsuranceTracker({
  projectId,
  subcontractorId,
  onViewSubcontractor,
  showDashboard = true,
}: InsuranceTrackerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'compliant' | 'expiring' | 'non_compliant' | 'missing'>('all')
  const [selectedSubcontractorId, setSelectedSubcontractorId] = useState<string | null>(subcontractorId || null)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [showSettingsSheet, setShowSettingsSheet] = useState(false)
  const [selectedCertificates, setSelectedCertificates] = useState<Set<string>>(new Set())
  const [uploadingFor, setUploadingFor] = useState<string | null>(null)

  // Queries
  const filters: InsuranceComplianceFilters = useMemo(() => ({
    projectId,
    search: searchQuery || undefined,
    status: statusFilter !== 'all' ? [statusFilter] : undefined,
  }), [projectId, searchQuery, statusFilter])

  const { data: subcontractors, isLoading } = useInsuranceComplianceList(filters)
  const { data: dashboard, isLoading: dashboardLoading } = useInsuranceComplianceDashboard()
  const { data: expiringCerts } = useExpiringCertificates(90)
  const { data: calendar } = useExpirationCalendar()
  const { data: reminderSettings } = useReminderSettings()

  // Mutations
  const updateRemindersMutation = useUpdateReminderSettings()
  const sendBulkRemindersMutation = useSendBulkReminders()
  const sendReminderMutation = useSendReminder()
  const uploadMutation = useUploadCertificate()
  const verifyMutation = useVerifyCertificate()

  // Get selected subcontractor details
  const selectedSubcontractor = useMemo(() => {
    if (!selectedSubcontractorId || !subcontractors) {return null}
    return subcontractors.find((s) => s.id === selectedSubcontractorId)
  }, [selectedSubcontractorId, subcontractors])

  // Handle send reminders
  const handleSendReminders = useCallback(async () => {
    if (selectedCertificates.size === 0) {return}

    const subIds = Array.from(selectedCertificates)
    await sendBulkRemindersMutation.mutateAsync({
      subcontractorIds: subIds,
      reminderType: 'expiring',
    })
    setSelectedCertificates(new Set())
  }, [selectedCertificates, sendBulkRemindersMutation])

  // Handle upload certificate
  const handleUpload = useCallback(async (data: CertificateFormValues) => {
    if (!uploadingFor) {return}

    await uploadMutation.mutateAsync({
      subcontractorId: uploadingFor,
      ...data,
    })
    setShowUploadDialog(false)
    setUploadingFor(null)
  }, [uploadingFor, uploadMutation])

  if (isLoading) {
    return <InsuranceTrackerLoading />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Insurance Compliance
          </h2>
          <p className="text-muted-foreground">
            Track certificates of insurance, policy expirations, and compliance status
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedCertificates.size > 0 && (
            <Button
              variant="outline"
              onClick={handleSendReminders}
              disabled={sendBulkRemindersMutation.isPending}
            >
              <Mail className="h-4 w-4 mr-2" />
              Send Reminders ({selectedCertificates.size})
            </Button>
          )}
          <Sheet open={showSettingsSheet} onOpenChange={setShowSettingsSheet}>
            <SheetTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Reminder Settings</SheetTitle>
                <SheetDescription>
                  Configure automatic expiration reminders
                </SheetDescription>
              </SheetHeader>
              <ReminderSettingsForm
                settings={reminderSettings}
                onSave={updateRemindersMutation.mutateAsync}
                isLoading={updateRemindersMutation.isPending}
              />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Dashboard Stats */}
      {showDashboard && dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <DashboardCard
            title="Total Subcontractors"
            value={dashboard.totalSubcontractors}
            icon={Building2}
            color="bg-primary/10 text-primary"
            loading={dashboardLoading}
          />
          <DashboardCard
            title="Fully Compliant"
            value={dashboard.compliantSubcontractors}
            icon={ShieldCheck}
            color="bg-success/10 text-success"
            loading={dashboardLoading}
          />
          <DashboardCard
            title="Expiring (30d)"
            value={dashboard.expiringIn30Days}
            icon={Clock}
            color="bg-warning/10 text-warning"
            loading={dashboardLoading}
          />
          <DashboardCard
            title="Non-Compliant"
            value={dashboard.nonCompliantSubcontractors}
            icon={ShieldAlert}
            color="bg-error/10 text-error"
            loading={dashboardLoading}
          />
          <DashboardCard
            title="On Payment Hold"
            value={dashboard.onPaymentHold}
            icon={PauseCircle}
            color="bg-error/10 text-error"
            loading={dashboardLoading}
          />
          <DashboardCard
            title="Compliance Rate"
            value={`${dashboard.complianceRate}%`}
            icon={FileCheck}
            color="bg-primary/10 text-primary"
            loading={dashboardLoading}
            progress={dashboard.complianceRate}
          />
        </div>
      )}

      {/* Urgent Alerts */}
      {expiringCerts && expiringCerts.filter((c) => c.daysUntilExpiry <= 7).length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Urgent: Certificates Expiring This Week</AlertTitle>
          <AlertDescription>
            {expiringCerts.filter((c) => c.daysUntilExpiry <= 7).length} certificate(s) will expire within 7 days.
            Send reminders immediately to avoid compliance issues.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Subcontractors List */}
        <div className="flex-1">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search subcontractors..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                    <SelectTrigger className="w-40">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="compliant">Compliant</SelectItem>
                      <SelectItem value="expiring">Expiring</SelectItem>
                      <SelectItem value="non_compliant">Non-Compliant</SelectItem>
                      <SelectItem value="missing">Missing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={
                            selectedCertificates.size === subcontractors?.length &&
                            selectedCertificates.size > 0
                          }
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCertificates(new Set(subcontractors?.map((s) => s.id) || []))
                            } else {
                              setSelectedCertificates(new Set())
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Subcontractor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Compliance</TableHead>
                      <TableHead>Certificates</TableHead>
                      <TableHead>Next Expiry</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!subcontractors || subcontractors.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                          {searchQuery || statusFilter !== 'all'
                            ? 'No subcontractors match your filters'
                            : 'No subcontractors found'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      subcontractors.map((sub) => (
                        <SubcontractorRow
                          key={sub.id}
                          subcontractor={sub}
                          isSelected={selectedCertificates.has(sub.id)}
                          isDetailSelected={selectedSubcontractorId === sub.id}
                          onSelect={() => {
                            setSelectedCertificates((prev) => {
                              const next = new Set(prev)
                              if (next.has(sub.id)) {
                                next.delete(sub.id)
                              } else {
                                next.add(sub.id)
                              }
                              return next
                            })
                          }}
                          onViewDetails={() => setSelectedSubcontractorId(sub.id)}
                          onUpload={() => {
                            setUploadingFor(sub.id)
                            setShowUploadDialog(true)
                          }}
                          onSendReminder={() => sendReminderMutation.mutateAsync({ subcontractorId: sub.id })}
                        />
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detail Panel */}
        {selectedSubcontractor && (
          <SubcontractorDetailPanel
            subcontractor={selectedSubcontractor}
            onClose={() => setSelectedSubcontractorId(null)}
            onUpload={() => {
              setUploadingFor(selectedSubcontractor.id)
              setShowUploadDialog(true)
            }}
            onVerify={verifyMutation.mutateAsync}
            onViewSubcontractor={onViewSubcontractor}
          />
        )}
      </div>

      {/* Expiration Calendar */}
      {calendar && calendar.length > 0 && (
        <ExpirationCalendar calendar={calendar} />
      )}

      {/* Upload Certificate Dialog */}
      <UploadCertificateDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onSubmit={handleUpload}
        isLoading={uploadMutation.isPending}
      />
    </div>
  )
}

// =============================================
// Sub-components
// =============================================

interface DashboardCardProps {
  title: string
  value: string | number
  icon: typeof Shield
  color: string
  loading?: boolean
  progress?: number
}

function DashboardCard({ title, value, icon: Icon, color, loading, progress }: DashboardCardProps) {
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
        {progress !== undefined && (
          <Progress value={progress} className="h-1 mt-3" />
        )}
      </CardContent>
    </Card>
  )
}

interface SubcontractorRowProps {
  subcontractor: InsuranceComplianceSubcontractor
  isSelected: boolean
  isDetailSelected: boolean
  onSelect: () => void
  onViewDetails: () => void
  onUpload: () => void
  onSendReminder: () => void
}

function SubcontractorRow({
  subcontractor,
  isSelected,
  isDetailSelected,
  onSelect,
  onViewDetails,
  onUpload,
  onSendReminder,
}: SubcontractorRowProps) {
  const statusConfig = {
    compliant: { label: 'Compliant', icon: ShieldCheck, color: 'bg-success/10 text-success' },
    expiring: { label: 'Expiring', icon: Clock, color: 'bg-warning/10 text-warning' },
    non_compliant: { label: 'Non-Compliant', icon: ShieldAlert, color: 'bg-error/10 text-error' },
    missing: { label: 'Missing', icon: ShieldOff, color: 'bg-error/10 text-error' },
  }

  const status = statusConfig[subcontractor.overallStatus]
  const StatusIcon = status.icon

  const nextExpiring = subcontractor.expiringCertificates[0]

  return (
    <TableRow className={cn(isDetailSelected && 'bg-muted/50')}>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={isSelected} onCheckedChange={onSelect} />
      </TableCell>
      <TableCell>
        <button
          onClick={onViewDetails}
          className="text-left hover:text-primary transition-colors"
        >
          <p className="font-medium">{subcontractor.companyName}</p>
          {subcontractor.contactName && (
            <p className="text-xs text-muted-foreground">{subcontractor.contactName}</p>
          )}
        </button>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Badge className={status.color}>
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
          <Progress value={subcontractor.complianceScore} className="h-2 w-16" />
          <span className="text-sm">{subcontractor.complianceScore}%</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <span className="text-sm">{subcontractor.certificates.length} total</span>
          {subcontractor.missingTypes.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="destructive" className="text-xs">
                    {subcontractor.missingTypes.length} missing
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <ul className="space-y-1">
                    {subcontractor.missingTypes.map((type) => (
                      <li key={type}>{getInsuranceTypeName(type)}</li>
                    ))}
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </TableCell>
      <TableCell>
        {nextExpiring ? (
          <span className={cn(
            'text-sm',
            nextExpiring.daysUntilExpiry <= 7 && 'text-error font-medium',
            nextExpiring.daysUntilExpiry > 7 && nextExpiring.daysUntilExpiry <= 30 && 'text-warning'
          )}>
            {getExpiryText(nextExpiring.daysUntilExpiry)}
          </span>
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
            <DropdownMenuItem onClick={onViewDetails}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onUpload}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Certificate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSendReminder}>
              <Mail className="h-4 w-4 mr-2" />
              Send Reminder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

interface SubcontractorDetailPanelProps {
  subcontractor: InsuranceComplianceSubcontractor
  onClose: () => void
  onUpload: () => void
  onVerify: (data: { certificateId: string; verified: boolean }) => Promise<any>
  onViewSubcontractor?: (id: string) => void
}

function SubcontractorDetailPanel({
  subcontractor,
  onClose,
  onUpload,
  onVerify,
  onViewSubcontractor,
}: SubcontractorDetailPanelProps) {
  const [verifyingId, setVerifyingId] = useState<string | null>(null)

  const handleVerify = async (certificateId: string, verified: boolean) => {
    setVerifyingId(certificateId)
    await onVerify({ certificateId, verified })
    setVerifyingId(null)
  }

  return (
    <Card className="lg:w-[400px] shrink-0">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{subcontractor.companyName}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              {subcontractor.contactName && (
                <>
                  <span>{subcontractor.contactName}</span>
                  <span className="text-muted-foreground">|</span>
                </>
              )}
              {subcontractor.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {subcontractor.phone}
                </span>
              )}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Compliance Score */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
          <span className="font-medium">Compliance Score</span>
          <div className="flex items-center gap-2">
            <Progress value={subcontractor.complianceScore} className="h-2 w-20" />
            <span className="font-bold">{subcontractor.complianceScore}%</span>
          </div>
        </div>

        {/* Missing Coverage Alert */}
        {subcontractor.missingTypes.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Missing Coverage</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 space-y-1">
                {subcontractor.missingTypes.map((type) => (
                  <li key={type} className="flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    {getInsuranceTypeName(type)}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Certificates */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Certificates</h4>
            <Button variant="outline" size="sm" onClick={onUpload}>
              <Upload className="h-3 w-3 mr-1" />
              Upload
            </Button>
          </div>
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {subcontractor.certificates.map((cert) => (
                <CertificateCard
                  key={cert.id}
                  certificate={cert}
                  isVerifying={verifyingId === cert.id}
                  onVerify={(verified) => handleVerify(cert.id, verified)}
                />
              ))}
              {subcontractor.certificates.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <FileWarning className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No certificates on file</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onViewSubcontractor?.(subcontractor.id)}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Profile
          </Button>
          <Button variant="outline" className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            Export COI
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

interface CertificateCardProps {
  certificate: InsuranceComplianceSubcontractor['certificates'][0]
  isVerifying: boolean
  onVerify: (verified: boolean) => void
}

function CertificateCard({ certificate, isVerifying, onVerify }: CertificateCardProps) {
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

      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <p>
          <span className="text-muted-foreground">Policy:</span> {certificate.policyNumber}
        </p>
        <p>
          <span className="text-muted-foreground">Expires:</span>{' '}
          {format(new Date(certificate.expirationDate), 'MMM d, yyyy')}
        </p>
        {certificate.coverageAmount && (
          <p>
            <span className="text-muted-foreground">Limit:</span>{' '}
            ${certificate.coverageAmount.toLocaleString()}
          </p>
        )}
        <p>
          <span className="text-muted-foreground">Days:</span>{' '}
          <span className={cn(
            certificate.daysUntilExpiry <= 7 && 'text-error font-medium',
            certificate.daysUntilExpiry > 7 && certificate.daysUntilExpiry <= 30 && 'text-warning'
          )}>
            {certificate.daysUntilExpiry}
          </span>
        </p>
      </div>

      <div className="mt-2 flex items-center gap-3">
        {certificate.additionalInsured && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className="text-xs gap-1">
                  <Check className="h-2 w-2" />
                  AI
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Additional Insured</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {certificate.waiverOfSubrogation && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className="text-xs gap-1">
                  <Check className="h-2 w-2" />
                  WOS
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Waiver of Subrogation</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {certificate.verified && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="default" className="text-xs gap-1">
                  <CheckCircle className="h-2 w-2" />
                  Verified
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                Verified on {format(new Date(certificate.verifiedAt || ''), 'MMM d, yyyy')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {!certificate.verified && (
        <div className="mt-3 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            disabled={isVerifying}
            onClick={() => onVerify(true)}
          >
            {isVerifying ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <Check className="h-3 w-3 mr-1" />
                Verify
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onVerify(false)}
            disabled={isVerifying}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  )
}

interface ExpirationCalendarProps {
  calendar: Array<{
    date: string
    certificates: Array<{
      id: string
      subcontractorName: string
      type: string
    }>
  }>
}

function ExpirationCalendar({ calendar }: ExpirationCalendarProps) {
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null)

  // Group by month
  const monthlyData = useMemo(() => {
    const months: Record<string, typeof calendar> = {}

    calendar.forEach((day) => {
      const monthKey = format(parseISO(day.date), 'yyyy-MM')
      if (!months[monthKey]) {
        months[monthKey] = []
      }
      months[monthKey].push(day)
    })

    return Object.entries(months).map(([key, days]) => ({
      monthKey: key,
      monthLabel: format(parseISO(days[0].date), 'MMMM yyyy'),
      days,
      totalCerts: days.reduce((sum, d) => sum + d.certificates.length, 0),
    }))
  }, [calendar])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Expiration Calendar
        </CardTitle>
        <CardDescription>
          Upcoming certificate expirations by month
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {monthlyData.map((month) => (
            <div key={month.monthKey} className="border rounded-lg">
              <button
                className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                onClick={() => setExpandedMonth(
                  expandedMonth === month.monthKey ? null : month.monthKey
                )}
              >
                <div className="flex items-center gap-2">
                  {expandedMonth === month.monthKey ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <span className="font-medium">{month.monthLabel}</span>
                </div>
                <Badge variant="secondary">{month.totalCerts} certificates</Badge>
              </button>
              {expandedMonth === month.monthKey && (
                <div className="border-t p-3 space-y-2">
                  {month.days.map((day) => (
                    <div key={day.date} className="flex items-start gap-3">
                      <div className="text-center min-w-[50px]">
                        <p className="text-2xl font-bold">{format(parseISO(day.date), 'd')}</p>
                        <p className="text-xs text-muted-foreground">{format(parseISO(day.date), 'EEE')}</p>
                      </div>
                      <div className="flex-1 space-y-1">
                        {day.certificates.map((cert) => (
                          <div key={cert.id} className="flex items-center justify-between text-sm p-2 rounded bg-muted">
                            <span>{cert.subcontractorName}</span>
                            <Badge variant="outline" className="text-xs">
                              {getInsuranceTypeName(cert.type as InsuranceType)}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

interface ReminderSettingsFormProps {
  settings?: ReminderSettings
  onSave: (data: ReminderSettings) => Promise<any>
  isLoading: boolean
}

function ReminderSettingsForm({ settings, onSave, isLoading }: ReminderSettingsFormProps) {
  const [localSettings, setLocalSettings] = useState<ReminderSettings>(settings || {
    enabled: true,
    reminderDays: [90, 60, 30, 14, 7],
    ccEmails: [],
    autoHoldOnExpired: true,
  })

  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Enable Automatic Reminders</Label>
          <p className="text-xs text-muted-foreground">
            Send email reminders when certificates are expiring
          </p>
        </div>
        <Switch
          checked={localSettings.enabled}
          onCheckedChange={(checked) => setLocalSettings({ ...localSettings, enabled: checked })}
        />
      </div>

      <Separator />

      <div className="space-y-2">
        <Label>Send reminders at</Label>
        <div className="space-y-2">
          {[90, 60, 30, 14, 7, 3, 1].map((days) => (
            <div key={days} className="flex items-center gap-2">
              <Checkbox
                checked={localSettings.reminderDays.includes(days)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setLocalSettings({
                      ...localSettings,
                      reminderDays: [...localSettings.reminderDays, days].sort((a, b) => b - a),
                    })
                  } else {
                    setLocalSettings({
                      ...localSettings,
                      reminderDays: localSettings.reminderDays.filter((d) => d !== days),
                    })
                  }
                }}
              />
              <span className="text-sm">{days} days before expiration</span>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label>CC Addresses</Label>
        <Input
          placeholder="email@example.com, email2@example.com"
          value={localSettings.ccEmails?.join(', ') || ''}
          onChange={(e) => setLocalSettings({
            ...localSettings,
            ccEmails: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
          })}
        />
        <p className="text-xs text-muted-foreground">
          Separate multiple emails with commas
        </p>
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Auto Payment Hold</Label>
          <p className="text-xs text-muted-foreground">
            Automatically place on payment hold when coverage expires
          </p>
        </div>
        <Switch
          checked={localSettings.autoHoldOnExpired}
          onCheckedChange={(checked) => setLocalSettings({ ...localSettings, autoHoldOnExpired: checked })}
        />
      </div>

      <SheetFooter>
        <Button
          onClick={() => onSave(localSettings)}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </Button>
      </SheetFooter>
    </div>
  )
}

interface UploadCertificateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CertificateFormValues) => Promise<void>
  isLoading: boolean
}

function UploadCertificateDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: UploadCertificateDialogProps) {
  const form = useForm<CertificateFormValues>({
    resolver: zodResolver(certificateSchema),
    defaultValues: {
      additionalInsured: false,
      waiverOfSubrogation: false,
      primaryNonContributory: false,
      namedInsuredExact: false,
    },
  })

  const handleSubmit = async (data: CertificateFormValues) => {
    await onSubmit(data)
    form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Certificate of Insurance</DialogTitle>
          <DialogDescription>
            Enter the certificate details from the COI document
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="insuranceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Insurance Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {INSURANCE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="carrier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Insurance Carrier *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Liberty Mutual" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="policyNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Policy Number *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Policy number from COI" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="effectiveDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Effective Date *</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expirationDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiration Date *</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="coverageAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Per Occurrence Limit *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder="1,000,000"
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="aggregateAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aggregate Limit</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder="2,000,000"
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="deductible"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deductible</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder="5,000"
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="additionalInsured"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Additional Insured</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="waiverOfSubrogation"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Waiver of Subrogation</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="primaryNonContributory"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Primary & Non-Contributory</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="namedInsuredExact"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Named Insured Exact Match</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} placeholder="Any additional notes..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Certificate
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function InsuranceTrackerLoading() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-24" />
      </div>
      <div className="grid grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-[500px]" />
    </div>
  )
}
