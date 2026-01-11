/**
 * OSHA 300A Summary Component
 *
 * Annual summary form that auto-calculates from OSHA 300 log entries.
 * Includes injury/illness totals, incidence rates, certification signature,
 * and print-ready formatting for posting.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  useOSHA300AYearSummary,
  useOSHA300YearEntries,
  useCalculateYearSummary,
  useGenerateOSHA300ASummary,
  useCertifyOSHA300ASummary,
  usePostOSHA300ASummary,
} from '../hooks/useOSHA300A'
import { useAuth } from '@/lib/auth/AuthContext'
import {
  OSHA300ASummary as OSHA300ASummaryType,
  OSHA300Entry,
  calculateTRIR,
  calculateDARTRate,
  calculateLTIR,
  calculateSeverityRate,
  isPostingPeriod,
  getPostingDeadline,
  CASE_CLASSIFICATION_LABELS,
  INJURY_ILLNESS_TYPE_LABELS,
} from '@/types/osha-300'
import {
  FileText,
  Download,
  Printer,
  CheckCircle,
  Clock,
  AlertTriangle,
  Calendar,
  Users,
  Building2,
  Shield,
  ClipboardCheck,
  Send,
  TrendingUp,
  TrendingDown,
  Minus,
  Calculator,
  Eye,
  RefreshCw,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

interface OSHA300ASummaryProps {
  companyId: string
  establishmentId?: string | null
  year?: number
  onYearChange?: (year: number) => void
  className?: string
}

interface CertificationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  summaryId: string
  onCertify: () => void
}

interface PrintableFormProps {
  summary: OSHA300ASummaryType
  entries: OSHA300Entry[]
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) {return '-'}
  return num.toLocaleString()
}

function formatRate(rate: number | null | undefined): string {
  if (rate === null || rate === undefined) {return '-'}
  return rate.toFixed(2)
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'posted':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'certified':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'draft':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'archived':
      return 'bg-gray-100 text-gray-800 border-gray-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'posted':
      return <CheckCircle className="h-4 w-4" />
    case 'certified':
      return <ClipboardCheck className="h-4 w-4" />
    case 'draft':
      return <Clock className="h-4 w-4" />
    default:
      return <FileText className="h-4 w-4" />
  }
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Rate comparison indicator
 */
function RateComparison({
  current,
  previous,
  label,
  lowerIsBetter = true,
}: {
  current: number | null
  previous: number | null
  label: string
  lowerIsBetter?: boolean
}) {
  if (current === null) {
    return (
      <div className="text-center">
        <div className="text-2xl font-bold">-</div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    )
  }

  let trend: 'up' | 'down' | 'neutral' = 'neutral'
  let trendColor = 'text-gray-500'

  if (previous !== null && previous !== 0) {
    const change = ((current - previous) / previous) * 100
    if (Math.abs(change) > 5) {
      trend = change > 0 ? 'up' : 'down'
      const isGood = lowerIsBetter ? trend === 'down' : trend === 'up'
      trendColor = isGood ? 'text-green-600' : 'text-red-600'
    }
  }

  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1">
        <span className="text-2xl font-bold">{formatRate(current)}</span>
        {trend === 'up' && <TrendingUp className={cn('h-4 w-4', trendColor)} />}
        {trend === 'down' && <TrendingDown className={cn('h-4 w-4', trendColor)} />}
        {trend === 'neutral' && <Minus className="h-4 w-4 text-gray-400" />}
      </div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  )
}

/**
 * Summary stat card
 */
function SummaryStatCard({
  label,
  value,
  icon: Icon,
  color = 'gray',
}: {
  label: string
  value: number | string
  icon?: React.ComponentType<{ className?: string }>
  color?: 'gray' | 'red' | 'orange' | 'green' | 'blue'
}) {
  const colorClasses = {
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
  }

  return (
    <div className={cn('rounded-lg border p-3', colorClasses[color])}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4" />}
        <span className="text-xs font-medium uppercase">{label}</span>
      </div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  )
}

/**
 * Certification dialog
 */
function CertificationDialog({
  open,
  onOpenChange,
  summaryId,
  onCertify,
}: CertificationDialogProps) {
  const { user } = useAuth()
  const certifyMutation = useCertifyOSHA300ASummary()

  const [formData, setFormData] = React.useState({
    certifier_name: user?.name || '',
    certifier_title: '',
    certifier_phone: '',
    certifier_signature: '',
  })

  const handleCertify = async () => {
    await certifyMutation.mutateAsync({
      id: summaryId,
      dto: {
        certifier_name: formData.certifier_name,
        certifier_title: formData.certifier_title,
        certifier_phone: formData.certifier_phone || undefined,
        certifier_signature: formData.certifier_signature || undefined,
      },
    })
    onCertify()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Certify OSHA 300A Summary</DialogTitle>
          <DialogDescription>
            I certify that I have examined this document and that to the best of my knowledge
            the entries are true, accurate, and complete.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="certifier_name">Full Name *</Label>
            <Input
              id="certifier_name"
              value={formData.certifier_name}
              onChange={(e) => setFormData({ ...formData, certifier_name: e.target.value })}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="certifier_title">Title *</Label>
            <Input
              id="certifier_title"
              value={formData.certifier_title}
              onChange={(e) => setFormData({ ...formData, certifier_title: e.target.value })}
              placeholder="e.g., Safety Manager, Owner"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="certifier_phone">Phone</Label>
            <Input
              id="certifier_phone"
              value={formData.certifier_phone}
              onChange={(e) => setFormData({ ...formData, certifier_phone: e.target.value })}
              placeholder="(555) 123-4567"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="certifier_signature">Digital Signature</Label>
            <Input
              id="certifier_signature"
              value={formData.certifier_signature}
              onChange={(e) => setFormData({ ...formData, certifier_signature: e.target.value })}
              placeholder="Type your name to sign"
              className="font-cursive"
            />
            <p className="text-xs text-gray-500">
              Typing your name above serves as your electronic signature.
            </p>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Legal Notice</AlertTitle>
            <AlertDescription>
              Knowingly falsifying this document may result in a fine.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCertify}
            disabled={
              !formData.certifier_name ||
              !formData.certifier_title ||
              certifyMutation.isPending
            }
          >
            {certifyMutation.isPending ? 'Certifying...' : 'Certify Document'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Printable OSHA 300A form
 */
function PrintableForm({ summary, entries }: PrintableFormProps) {
  return (
    <div className="printable-form bg-white p-8 text-black" id="osha-300a-print">
      {/* Form Header */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold">Form 300A</h1>
        <h2 className="text-lg font-semibold">Summary of Work-Related Injuries and Illnesses</h2>
        <p className="text-sm text-gray-600">Year {summary.year}</p>
      </div>

      {/* Establishment Information */}
      <div className="border-2 border-black mb-4 p-4">
        <h3 className="font-bold mb-2">Establishment Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium">Establishment name:</p>
            <p className="border-b border-black pb-1">{summary.establishment_name}</p>
          </div>
          <div>
            <p className="text-sm font-medium">NAICS Code:</p>
            <p className="border-b border-black pb-1">{summary.naics_code || '-'}</p>
          </div>
          <div className="col-span-2">
            <p className="text-sm font-medium">Street:</p>
            <p className="border-b border-black pb-1">{summary.street_address}</p>
          </div>
          <div>
            <p className="text-sm font-medium">City:</p>
            <p className="border-b border-black pb-1">{summary.city}</p>
          </div>
          <div>
            <p className="text-sm font-medium">State / ZIP:</p>
            <p className="border-b border-black pb-1">{summary.state} {summary.zip_code}</p>
          </div>
        </div>
      </div>

      {/* Employment Information */}
      <div className="border-2 border-black mb-4 p-4">
        <h3 className="font-bold mb-2">Employment Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium">Annual average number of employees:</p>
            <p className="text-2xl font-bold">{formatNumber(summary.average_annual_employees)}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Total hours worked by all employees last year:</p>
            <p className="text-2xl font-bold">{formatNumber(summary.total_hours_worked)}</p>
          </div>
        </div>
      </div>

      {/* Injury and Illness Types */}
      <div className="border-2 border-black mb-4 p-4">
        <h3 className="font-bold mb-2">Number of Cases</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black">
              <th className="text-left py-2">Classification</th>
              <th className="text-center py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-1">(G) Total deaths</td>
              <td className="text-center font-bold">{summary.total_deaths}</td>
            </tr>
            <tr>
              <td className="py-1">(H) Total cases with days away from work</td>
              <td className="text-center font-bold">{summary.total_days_away}</td>
            </tr>
            <tr>
              <td className="py-1">(I) Total cases with job transfer or restriction</td>
              <td className="text-center font-bold">{summary.total_job_transfer_restriction}</td>
            </tr>
            <tr>
              <td className="py-1">(J) Total other recordable cases</td>
              <td className="text-center font-bold">{summary.total_other_recordable}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Days */}
      <div className="border-2 border-black mb-4 p-4">
        <h3 className="font-bold mb-2">Number of Days</h3>
        <table className="w-full text-sm">
          <tbody>
            <tr>
              <td className="py-1">(K) Total days away from work</td>
              <td className="text-center font-bold">{summary.total_days_away_from_work}</td>
            </tr>
            <tr>
              <td className="py-1">(L) Total days of job transfer or restriction</td>
              <td className="text-center font-bold">{summary.total_days_job_transfer_restriction}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Injury and Illness Types */}
      <div className="border-2 border-black mb-4 p-4">
        <h3 className="font-bold mb-2">Injury and Illness Types</h3>
        <table className="w-full text-sm">
          <tbody>
            <tr>
              <td className="py-1">(M) Injuries</td>
              <td className="text-center font-bold">{summary.total_injuries}</td>
            </tr>
            <tr>
              <td className="py-1">(N) Skin disorders</td>
              <td className="text-center font-bold">{summary.total_skin_disorders}</td>
            </tr>
            <tr>
              <td className="py-1">(O) Respiratory conditions</td>
              <td className="text-center font-bold">{summary.total_respiratory_conditions}</td>
            </tr>
            <tr>
              <td className="py-1">(P) Poisonings</td>
              <td className="text-center font-bold">{summary.total_poisonings}</td>
            </tr>
            <tr>
              <td className="py-1">(Q) Hearing loss</td>
              <td className="text-center font-bold">{summary.total_hearing_loss}</td>
            </tr>
            <tr>
              <td className="py-1">(R) All other illnesses</td>
              <td className="text-center font-bold">{summary.total_other_illnesses}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Certification */}
      <div className="border-2 border-black p-4">
        <h3 className="font-bold mb-2">Certification</h3>
        <p className="text-sm mb-4">
          I certify that I have examined this document and that to the best of my knowledge
          the entries are true, accurate, and complete.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium">Name:</p>
            <p className="border-b border-black pb-1">{summary.certifier_name || ''}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Title:</p>
            <p className="border-b border-black pb-1">{summary.certifier_title || ''}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Phone:</p>
            <p className="border-b border-black pb-1">{summary.certifier_phone || ''}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Date:</p>
            <p className="border-b border-black pb-1">
              {summary.certification_date
                ? new Date(summary.certification_date).toLocaleDateString()
                : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Posting Notice */}
      <div className="mt-4 text-xs text-gray-600 text-center">
        <p>Post this Summary from February 1 to April 30 of the year following the year covered.</p>
        <p>All establishment must complete this Summary page, even if no injuries or illnesses occurred.</p>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * OSHA 300A Summary Component
 *
 * Displays the annual summary form with auto-calculated totals from the OSHA 300 log.
 *
 * Features:
 * - Auto-calculate from OSHA 300 entries
 * - Injury/illness totals by category
 * - Incidence rates (TRIR, DART, LTIR, Severity)
 * - Certification signature flow
 * - Print-ready formatting
 * - Posting period tracking
 */
export function OSHA300ASummary({
  companyId,
  establishmentId,
  year: initialYear,
  onYearChange,
  className,
}: OSHA300ASummaryProps) {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = React.useState(initialYear || currentYear - 1)
  const [showCertifyDialog, setShowCertifyDialog] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState('summary')

  // Data queries
  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useOSHA300AYearSummary(
    companyId,
    establishmentId || null,
    selectedYear
  )
  const { data: entries, isLoading: entriesLoading } = useOSHA300YearEntries(
    companyId,
    establishmentId || null,
    selectedYear
  )
  const { data: calculatedSummary, refetch: recalculate } = useCalculateYearSummary(
    companyId,
    establishmentId || null,
    selectedYear
  )

  // Mutations
  const generateMutation = useGenerateOSHA300ASummary()
  const postMutation = usePostOSHA300ASummary()

  // Generate year options (last 5 years)
  const yearOptions = React.useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => currentYear - i - 1)
  }, [currentYear])

  // Handle year change
  const handleYearChange = (year: string) => {
    const yearNum = parseInt(year)
    setSelectedYear(yearNum)
    onYearChange?.(yearNum)
  }

  // Check if in posting period
  const inPostingPeriod = isPostingPeriod()
  const postingDeadline = getPostingDeadline(selectedYear)

  // Generate summary from entries
  const handleGenerate = async () => {
    await generateMutation.mutateAsync({
      company_id: companyId,
      establishment_id: establishmentId || undefined,
      year: selectedYear,
      establishment_name: summary?.establishment_name || 'Main Establishment',
      street_address: summary?.street_address || '',
      city: summary?.city || '',
      state: summary?.state || '',
      zip_code: summary?.zip_code || '',
      average_annual_employees: calculatedSummary?.average_annual_employees || 0,
      total_hours_worked: calculatedSummary?.total_hours_worked || 0,
    })
    refetchSummary()
  }

  // Post summary
  const handlePost = async () => {
    if (summary) {
      await postMutation.mutateAsync(summary.id)
      refetchSummary()
    }
  }

  // Print summary
  const handlePrint = () => {
    const printContent = document.getElementById('osha-300a-print')
    if (printContent) {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>OSHA Form 300A - ${selectedYear}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { padding: 8px; text-align: left; border: 1px solid #000; }
                .border-2 { border: 2px solid #000; }
                .font-bold { font-weight: bold; }
                @media print {
                  body { margin: 0; }
                }
              </style>
            </head>
            <body>
              ${printContent.innerHTML}
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

  const isLoading = summaryLoading || entriesLoading

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">OSHA Form 300A - Summary of Work-Related Injuries and Illnesses</h2>
          <p className="text-sm text-gray-600">
            Annual summary for {selectedYear}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {summary && (
            <Badge className={cn('flex items-center gap-1', getStatusColor(summary.status))}>
              {getStatusIcon(summary.status)}
              {summary.status.charAt(0).toUpperCase() + summary.status.slice(1)}
            </Badge>
          )}
        </div>
      </div>

      {/* Posting Period Alert */}
      {inPostingPeriod && selectedYear === currentYear - 1 && (
        <Alert className="bg-blue-50 border-blue-200">
          <Calendar className="h-4 w-4 text-blue-600" />
          <AlertTitle>Posting Period Active</AlertTitle>
          <AlertDescription>
            The OSHA 300A summary for {selectedYear} must be posted from February 1 to April 30, {selectedYear + 1}.
            {summary?.status !== 'posted' && ' Please certify and post this form.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        {!summary && (
          <Button onClick={handleGenerate} disabled={generateMutation.isPending}>
            <Calculator className="h-4 w-4 mr-2" />
            {generateMutation.isPending ? 'Generating...' : 'Generate Summary'}
          </Button>
        )}

        {summary && summary.status === 'draft' && (
          <Button onClick={() => setShowCertifyDialog(true)}>
            <ClipboardCheck className="h-4 w-4 mr-2" />
            Certify
          </Button>
        )}

        {summary && summary.status === 'certified' && (
          <Button onClick={handlePost} disabled={postMutation.isPending}>
            <Send className="h-4 w-4 mr-2" />
            {postMutation.isPending ? 'Posting...' : 'Mark as Posted'}
          </Button>
        )}

        <Button variant="outline" onClick={() => recalculate()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Recalculate
        </Button>

        {summary && (
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="details">Detailed Breakdown</TabsTrigger>
          <TabsTrigger value="rates">Incidence Rates</TabsTrigger>
          <TabsTrigger value="print">Print Preview</TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : summary ? (
            <>
              {/* Establishment Info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Establishment Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Name:</span>
                      <p className="font-medium">{summary.establishment_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Address:</span>
                      <p className="font-medium">{summary.street_address}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">City/State:</span>
                      <p className="font-medium">{summary.city}, {summary.state} {summary.zip_code}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">NAICS Code:</span>
                      <p className="font-medium">{summary.naics_code || '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Employment Data */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SummaryStatCard
                  label="Average Employees"
                  value={formatNumber(summary.average_annual_employees)}
                  icon={Users}
                  color="blue"
                />
                <SummaryStatCard
                  label="Total Hours Worked"
                  value={formatNumber(summary.total_hours_worked)}
                  icon={Clock}
                />
                <SummaryStatCard
                  label="Total Cases"
                  value={formatNumber(summary.total_cases)}
                  icon={FileText}
                  color={summary.total_cases > 0 ? 'orange' : 'green'}
                />
                <SummaryStatCard
                  label="TRIR"
                  value={formatRate(summary.trir)}
                  icon={TrendingUp}
                  color={summary.trir && summary.trir > 4 ? 'red' : 'green'}
                />
              </div>

              {/* Case Classification */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Case Classification</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-3xl font-bold text-red-700">
                        {summary.total_deaths}
                      </div>
                      <div className="text-sm text-red-600">Deaths</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-3xl font-bold text-orange-700">
                        {summary.total_days_away}
                      </div>
                      <div className="text-sm text-orange-600">Days Away Cases</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <div className="text-3xl font-bold text-yellow-700">
                        {summary.total_job_transfer_restriction}
                      </div>
                      <div className="text-sm text-yellow-600">Job Transfer/Restriction</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-3xl font-bold text-blue-700">
                        {summary.total_other_recordable}
                      </div>
                      <div className="text-sm text-blue-600">Other Recordable</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Days Lost */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Days Lost</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-3xl font-bold text-red-700">
                        {formatNumber(summary.total_days_away_from_work)}
                      </div>
                      <div className="text-sm text-red-600">Days Away from Work</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-3xl font-bold text-orange-700">
                        {formatNumber(summary.total_days_job_transfer_restriction)}
                      </div>
                      <div className="text-sm text-orange-600">Days of Restriction/Transfer</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Certification Status */}
              {summary.certified && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Certification
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Certified By:</span>
                        <p className="font-medium">{summary.certifier_name}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Title:</span>
                        <p className="font-medium">{summary.certifier_title}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Phone:</span>
                        <p className="font-medium">{summary.certifier_phone || '-'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Date:</span>
                        <p className="font-medium">
                          {summary.certification_date
                            ? new Date(summary.certification_date).toLocaleDateString()
                            : '-'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium mb-2">No Summary Generated</h3>
                <p className="text-gray-500 mb-4">
                  Generate the OSHA 300A summary to view calculated totals from the 300 log.
                </p>
                <Button onClick={handleGenerate} disabled={generateMutation.isPending}>
                  <Calculator className="h-4 w-4 mr-2" />
                  {generateMutation.isPending ? 'Generating...' : 'Generate Summary'}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Detailed Breakdown Tab */}
        <TabsContent value="details" className="space-y-6">
          {summary && (
            <>
              {/* Injury Types */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Injury and Illness Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-medium">Type</th>
                        <th className="text-right py-2 font-medium">Count</th>
                        <th className="text-right py-2 font-medium">% of Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <tr>
                        <td className="py-2">(M) Injuries</td>
                        <td className="text-right font-medium">{summary.total_injuries}</td>
                        <td className="text-right text-gray-500">
                          {summary.total_cases > 0
                            ? ((summary.total_injuries / summary.total_cases) * 100).toFixed(1)
                            : 0}%
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2">(N) Skin Disorders</td>
                        <td className="text-right font-medium">{summary.total_skin_disorders}</td>
                        <td className="text-right text-gray-500">
                          {summary.total_cases > 0
                            ? ((summary.total_skin_disorders / summary.total_cases) * 100).toFixed(1)
                            : 0}%
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2">(O) Respiratory Conditions</td>
                        <td className="text-right font-medium">{summary.total_respiratory_conditions}</td>
                        <td className="text-right text-gray-500">
                          {summary.total_cases > 0
                            ? ((summary.total_respiratory_conditions / summary.total_cases) * 100).toFixed(1)
                            : 0}%
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2">(P) Poisonings</td>
                        <td className="text-right font-medium">{summary.total_poisonings}</td>
                        <td className="text-right text-gray-500">
                          {summary.total_cases > 0
                            ? ((summary.total_poisonings / summary.total_cases) * 100).toFixed(1)
                            : 0}%
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2">(Q) Hearing Loss</td>
                        <td className="text-right font-medium">{summary.total_hearing_loss}</td>
                        <td className="text-right text-gray-500">
                          {summary.total_cases > 0
                            ? ((summary.total_hearing_loss / summary.total_cases) * 100).toFixed(1)
                            : 0}%
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2">(R) All Other Illnesses</td>
                        <td className="text-right font-medium">{summary.total_other_illnesses}</td>
                        <td className="text-right text-gray-500">
                          {summary.total_cases > 0
                            ? ((summary.total_other_illnesses / summary.total_cases) * 100).toFixed(1)
                            : 0}%
                        </td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 font-bold">
                        <td className="py-2">Total</td>
                        <td className="text-right">{summary.total_cases}</td>
                        <td className="text-right">100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </CardContent>
              </Card>

              {/* Log Entries */}
              {entries && entries.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      300 Log Entries ({entries.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Case #</th>
                            <th className="text-left py-2">Employee</th>
                            <th className="text-left py-2">Date</th>
                            <th className="text-left py-2">Classification</th>
                            <th className="text-left py-2">Type</th>
                            <th className="text-right py-2">Days Away</th>
                            <th className="text-right py-2">Days Restr.</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {entries.map((entry) => (
                            <tr key={entry.id} className="hover:bg-gray-50">
                              <td className="py-2 font-mono text-xs">{entry.case_number}</td>
                              <td className="py-2">
                                {entry.is_privacy_case ? 'Privacy Protected' : entry.employee_name}
                              </td>
                              <td className="py-2">
                                {new Date(entry.date_of_injury).toLocaleDateString()}
                              </td>
                              <td className="py-2">
                                <Badge variant="outline" className="text-xs">
                                  {CASE_CLASSIFICATION_LABELS[entry.case_classification]}
                                </Badge>
                              </td>
                              <td className="py-2">
                                <Badge variant="outline" className="text-xs">
                                  {INJURY_ILLNESS_TYPE_LABELS[entry.injury_illness_type]}
                                </Badge>
                              </td>
                              <td className="text-right py-2">{entry.days_away_from_work || '-'}</td>
                              <td className="text-right py-2">{entry.days_job_transfer_restriction || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Incidence Rates Tab */}
        <TabsContent value="rates" className="space-y-6">
          {summary && (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Incidence Rates (per 100 Full-Time Employees)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <RateComparison
                      current={summary.trir}
                      previous={null}
                      label="TRIR"
                    />
                    <RateComparison
                      current={summary.dart_rate}
                      previous={null}
                      label="DART Rate"
                    />
                    <RateComparison
                      current={summary.ltir}
                      previous={null}
                      label="LTIR"
                    />
                    <RateComparison
                      current={summary.severity_rate}
                      previous={null}
                      label="Severity Rate"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Rate Explanations */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Rate Calculations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <h4 className="font-medium">TRIR (Total Recordable Incident Rate)</h4>
                    <p className="text-gray-600">
                      (Number of OSHA recordable cases x 200,000) / Total hours worked
                    </p>
                    <p className="font-mono bg-gray-50 p-2 rounded mt-1">
                      ({summary.total_cases} x 200,000) / {formatNumber(summary.total_hours_worked)} = {formatRate(summary.trir)}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium">DART Rate (Days Away, Restricted, or Transfer)</h4>
                    <p className="text-gray-600">
                      (DART cases x 200,000) / Total hours worked
                    </p>
                    <p className="font-mono bg-gray-50 p-2 rounded mt-1">
                      ({summary.total_days_away + summary.total_job_transfer_restriction} x 200,000) / {formatNumber(summary.total_hours_worked)} = {formatRate(summary.dart_rate)}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium">LTIR (Lost Time Incident Rate)</h4>
                    <p className="text-gray-600">
                      (Lost time cases x 200,000) / Total hours worked
                    </p>
                    <p className="font-mono bg-gray-50 p-2 rounded mt-1">
                      ({summary.total_deaths + summary.total_days_away} x 200,000) / {formatNumber(summary.total_hours_worked)} = {formatRate(summary.ltir)}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium">Severity Rate</h4>
                    <p className="text-gray-600">
                      (Total days away + days restricted) x 200,000 / Total hours worked
                    </p>
                    <p className="font-mono bg-gray-50 p-2 rounded mt-1">
                      ({summary.total_days_away_from_work + summary.total_days_job_transfer_restriction} x 200,000) / {formatNumber(summary.total_hours_worked)} = {formatRate(summary.severity_rate)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Print Preview Tab */}
        <TabsContent value="print">
          {summary && entries && (
            <Card>
              <CardContent className="p-0">
                <PrintableForm summary={summary} entries={entries} />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Certification Dialog */}
      {summary && (
        <CertificationDialog
          open={showCertifyDialog}
          onOpenChange={setShowCertifyDialog}
          summaryId={summary.id}
          onCertify={() => refetchSummary()}
        />
      )}
    </div>
  )
}

export default OSHA300ASummary
