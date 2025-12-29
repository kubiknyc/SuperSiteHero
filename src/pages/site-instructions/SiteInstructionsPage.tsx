import { useState, useMemo, useCallback } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  Plus,
  FileText,
  AlertCircle,
  Clock,
  CheckCircle2,
  Users,
  Copy,
  Send,
  PenTool,
  Camera,
  History,
  Building2,
  Calendar,
  User,
  AlertTriangle,
  ChevronRight,
  FileCheck,
  FileWarning,
  ClipboardCheck,
  ClipboardList,
  Eye,
  RefreshCw,
} from 'lucide-react'
import { useSiteInstructions, type SiteInstructionFilters, type SiteInstructionWithRelations } from '@/features/site-instructions/hooks'
import { SiteInstructionFilters as Filters } from '@/features/site-instructions/components'
import { useProjects } from '@/features/projects/hooks/useProjects'
import { useContacts } from '@/features/contacts/hooks/useContacts'
import type { SiteInstructionStatus, SiteInstructionPriority } from '@/types/database'
import { format, isPast, isToday } from 'date-fns'
import { cn } from '@/lib/utils'

// Template data for quick instruction creation
const INSTRUCTION_TEMPLATES = [
  {
    id: 'safety-procedure',
    title: 'Safety Procedure Reminder',
    description: 'Reminder to follow safety protocols for specific work activities',
    category: 'Safety',
    icon: AlertTriangle,
  },
  {
    id: 'schedule-change',
    title: 'Schedule Change Notification',
    description: 'Notify subcontractor of schedule adjustments',
    category: 'Schedule',
    icon: Calendar,
  },
  {
    id: 'quality-requirement',
    title: 'Quality Requirement Update',
    description: 'Communicate updated quality standards or specifications',
    category: 'Quality',
    icon: CheckCircle2,
  },
  {
    id: 'material-handling',
    title: 'Material Handling Instructions',
    description: 'Specific instructions for material storage or handling',
    category: 'Materials',
    icon: Building2,
  },
  {
    id: 'coordination-request',
    title: 'Coordination Request',
    description: 'Request coordination between trades or activities',
    category: 'Coordination',
    icon: Users,
  },
  {
    id: 'corrective-action',
    title: 'Corrective Action Required',
    description: 'Address non-conformance or deficient work',
    category: 'Corrective',
    icon: AlertCircle,
  },
]

// Status workflow steps for digital signature tracking
const WORKFLOW_STEPS = [
  { key: 'draft', label: 'Draft', icon: FileText },
  { key: 'issued', label: 'Issued', icon: Send },
  { key: 'acknowledged', label: 'Acknowledged', icon: PenTool },
  { key: 'in_progress', label: 'In Progress', icon: RefreshCw },
  { key: 'completed', label: 'Completed', icon: CheckCircle2 },
  { key: 'verified', label: 'Verified', icon: FileCheck },
]

// Mock distribution history data (would come from API in real app)
interface DistributionRecord {
  id: string
  action: string
  recipient: string
  recipientEmail: string
  timestamp: string
  method: 'email' | 'app' | 'sms'
  status: 'delivered' | 'opened' | 'failed'
}

// Instruction card component with enhanced features
function EnhancedInstructionCard({
  instruction,
  isSelected,
  onSelect,
  onViewDetails,
  onCopy,
}: {
  instruction: SiteInstructionWithRelations
  isSelected: boolean
  onSelect: (id: string, selected: boolean) => void
  onViewDetails: (id: string) => void
  onCopy: (instruction: SiteInstructionWithRelations) => void
}) {
  const referenceNumber = instruction.reference_number || instruction.instruction_number || 'N/A'
  const isOverdue = instruction.due_date && isPast(new Date(instruction.due_date)) &&
    !['completed', 'verified', 'void'].includes(instruction.status || '')
  const isDueToday = instruction.due_date && isToday(new Date(instruction.due_date))

  // Calculate acknowledgment percentage (mock data - would come from API)
  const acknowledgmentProgress = instruction.acknowledged ? 100 : instruction.status === 'issued' ? 0 : 50

  // Get workflow step index
  const currentStepIndex = WORKFLOW_STEPS.findIndex(step => step.key === instruction.status)

  return (
    <Card className={cn(
      "hover:border-primary/50 transition-all cursor-pointer relative",
      isSelected && "ring-2 ring-primary border-primary",
      isOverdue && "border-destructive/50"
    )}>
      {/* Selection checkbox */}
      <div className="absolute top-3 left-3 z-10">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(instruction.id, !!checked)}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      <Link to={`/site-instructions/${instruction.id}`} className="block">
        <CardHeader className="pb-2 pl-10">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <FileText className="h-4 w-4" />
                <span className="font-mono">{referenceNumber}</span>
                {isOverdue && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Overdue
                  </Badge>
                )}
                {isDueToday && !isOverdue && (
                  <Badge variant="warning" className="text-xs">
                    Due Today
                  </Badge>
                )}
              </div>
              <CardTitle className="text-base line-clamp-2">{instruction.title}</CardTitle>
            </div>
            <div className="flex flex-col items-end gap-1">
              <StatusBadge status={instruction.status} />
              <PriorityBadge priority={instruction.priority} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pl-10">
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {instruction.description}
          </p>

          {/* Acknowledgment Progress */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="flex items-center gap-1">
                <PenTool className="h-3 w-3" />
                Acknowledgment
              </span>
              <span>{acknowledgmentProgress}%</span>
            </div>
            <Progress value={acknowledgmentProgress} className="h-1.5" />
          </div>

          {/* Workflow Progress Indicator */}
          <div className="flex items-center gap-1 mb-3">
            {WORKFLOW_STEPS.slice(0, 5).map((step, index) => {
              const StepIcon = step.icon
              const isCompleted = index < currentStepIndex
              const isCurrent = index === currentStepIndex
              const isVoid = instruction.status === 'void'

              return (
                <div key={step.key} className="flex items-center">
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center",
                      isVoid && "bg-muted text-muted-foreground",
                      !isVoid && isCompleted && "bg-success text-white",
                      !isVoid && isCurrent && "bg-primary text-white",
                      !isVoid && !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                    )}
                    title={step.label}
                  >
                    <StepIcon className="h-3 w-3" />
                  </div>
                  {index < 4 && (
                    <div className={cn(
                      "w-4 h-0.5",
                      isCompleted ? "bg-success" : "bg-muted"
                    )} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {instruction.subcontractor && (
              <div className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                <span>{instruction.subcontractor.company_name}</span>
              </div>
            )}
            {instruction.due_date && (
              <div className={cn(
                "flex items-center gap-1",
                isOverdue && "text-destructive"
              )}>
                <Calendar className="h-3 w-3" />
                <span>Due: {format(new Date(instruction.due_date), 'MMM d, yyyy')}</span>
              </div>
            )}
            {instruction.issued_by_user && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>By: {instruction.issued_by_user.full_name}</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onCopy(instruction)
              }}
              className="h-7 text-xs"
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onViewDetails(instruction.id)
              }}
              className="h-7 text-xs"
            >
              <Eye className="h-3 w-3 mr-1" />
              Details
            </Button>
          </div>
        </CardContent>
      </Link>
    </Card>
  )
}

// Status badge component
function StatusBadge({ status }: { status: SiteInstructionStatus | null }) {
  const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline' }> = {
    draft: { label: 'Draft', variant: 'secondary' },
    issued: { label: 'Issued', variant: 'default' },
    acknowledged: { label: 'Acknowledged', variant: 'warning' },
    in_progress: { label: 'In Progress', variant: 'warning' },
    completed: { label: 'Completed', variant: 'success' },
    verified: { label: 'Verified', variant: 'success' },
    void: { label: 'Void', variant: 'destructive' },
  }

  const { label, variant } = config[status || 'draft'] || config.draft

  return <Badge variant={variant}>{label}</Badge>
}

// Priority badge component
function PriorityBadge({ priority }: { priority: SiteInstructionPriority | null }) {
  const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline' }> = {
    low: { label: 'Low', variant: 'outline' },
    normal: { label: 'Normal', variant: 'secondary' },
    high: { label: 'High', variant: 'warning' },
    urgent: { label: 'Urgent', variant: 'destructive' },
  }

  const { label, variant } = config[priority || 'normal'] || config.normal

  return <Badge variant={variant} className="text-xs">{label}</Badge>
}

// Skeleton loading component for stats
function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Skeleton loading component for instruction cards
function InstructionsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-5 w-48" />
              </div>
              <Skeleton className="h-5 w-20" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-3" />
            <Skeleton className="h-2 w-full mb-3" />
            <div className="flex gap-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Compliance status by subcontractor component
function SubcontractorCompliancePanel({
  instructions,
  contacts,
}: {
  instructions: SiteInstructionWithRelations[]
  contacts: Array<{ id: string; company_name: string | null }>
}) {
  const complianceBySubcontractor = useMemo(() => {
    const groups: Record<string, {
      name: string
      total: number
      acknowledged: number
      pending: number
      overdue: number
      completed: number
    }> = {}

    instructions.forEach((instruction) => {
      if (!instruction.subcontractor_id) return

      const subId = instruction.subcontractor_id
      if (!groups[subId]) {
        const contact = contacts.find(c => c.id === subId)
        groups[subId] = {
          name: contact?.company_name || instruction.subcontractor?.company_name || 'Unknown',
          total: 0,
          acknowledged: 0,
          pending: 0,
          overdue: 0,
          completed: 0,
        }
      }

      groups[subId].total++

      if (instruction.acknowledged) {
        groups[subId].acknowledged++
      }

      if (['completed', 'verified'].includes(instruction.status || '')) {
        groups[subId].completed++
      } else if (instruction.due_date && isPast(new Date(instruction.due_date))) {
        groups[subId].overdue++
      } else if (instruction.status === 'issued' && !instruction.acknowledged) {
        groups[subId].pending++
      }
    })

    return Object.entries(groups).map(([id, data]) => ({
      id,
      ...data,
      complianceRate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
      acknowledgmentRate: data.total > 0 ? Math.round((data.acknowledged / data.total) * 100) : 0,
    }))
  }, [instructions, contacts])

  if (complianceBySubcontractor.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No subcontractor data available
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {complianceBySubcontractor.map((sub) => (
        <Card key={sub.id}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{sub.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {sub.total} instructions
                </Badge>
                {sub.overdue > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {sub.overdue} overdue
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-3">
              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Acknowledgment Rate</span>
                  <span>{sub.acknowledgmentRate}%</span>
                </div>
                <Progress value={sub.acknowledgmentRate} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Compliance Rate</span>
                  <span>{sub.complianceRate}%</span>
                </div>
                <Progress value={sub.complianceRate} className="h-2" />
              </div>
            </div>

            <div className="flex items-center gap-4 mt-3 text-xs">
              <div className="flex items-center gap-1 text-warning">
                <Clock className="h-3 w-3" />
                <span>{sub.pending} pending</span>
              </div>
              <div className="flex items-center gap-1 text-success">
                <CheckCircle2 className="h-3 w-3" />
                <span>{sub.completed} completed</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Distribution history panel component
function DistributionHistoryPanel({ instructionId: _instructionId }: { instructionId: string }) {
  // Mock distribution history - would come from API
  // Using useMemo to avoid impure Date calls during render
  const mockHistory: DistributionRecord[] = useMemo(() => [
    {
      id: '1',
      action: 'Instruction issued',
      recipient: 'John Smith',
      recipientEmail: 'john.smith@company.com',
      timestamp: new Date().toISOString(),
      method: 'email',
      status: 'delivered',
    },
    {
      id: '2',
      action: 'Reminder sent',
      recipient: 'John Smith',
      recipientEmail: 'john.smith@company.com',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      method: 'app',
      status: 'opened',
    },
  ], [])

  return (
    <div className="space-y-3">
      {mockHistory.map((record) => (
        <div key={record.id} className="flex items-start gap-3 p-3 rounded-lg border">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            record.status === 'delivered' && "bg-success/10 text-success",
            record.status === 'opened' && "bg-primary/10 text-primary",
            record.status === 'failed' && "bg-destructive/10 text-destructive"
          )}>
            {record.method === 'email' && <Send className="h-4 w-4" />}
            {record.method === 'app' && <FileText className="h-4 w-4" />}
            {record.method === 'sms' && <FileText className="h-4 w-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{record.action}</p>
            <p className="text-xs text-muted-foreground">{record.recipient}</p>
            <p className="text-xs text-muted-foreground">{record.recipientEmail}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">
              {format(new Date(record.timestamp), 'MMM d, h:mm a')}
            </p>
            <Badge
              variant={record.status === 'failed' ? 'destructive' : 'secondary'}
              className="text-xs mt-1"
            >
              {record.status}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function SiteInstructionsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  // Get project from URL or default
  const projectId = searchParams.get('project') || ''

  // State
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [subcontractorFilter, setSubcontractorFilter] = useState('all')
  const [selectedInstructions, setSelectedInstructions] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState('all')

  // Dialog states
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [showBulkAssignDialog, setShowBulkAssignDialog] = useState(false)
  const [showDistributionSheet, setShowDistributionSheet] = useState(false)
  const [selectedDistributionId, setSelectedDistributionId] = useState<string | null>(null)
  const [copyingInstruction, setCopyingInstruction] = useState<SiteInstructionWithRelations | null>(null)

  // Fetch projects for selector
  const { data: projects, isLoading: projectsLoading } = useProjects()

  // Fetch contacts (subcontractors) for the selected project
  const { data: contacts = [] } = useContacts(projectId)
  const subcontractors = contacts.filter((c) => c.contact_type === 'subcontractor')

  // Build filters object
  const filters: SiteInstructionFilters = useMemo(() => {
    const f: SiteInstructionFilters = {}
    if (statusFilter !== 'all') f.status = statusFilter as SiteInstructionStatus
    if (priorityFilter !== 'all') f.priority = priorityFilter as SiteInstructionPriority
    if (subcontractorFilter !== 'all') f.subcontractorId = subcontractorFilter
    if (search) f.search = search
    return f
  }, [statusFilter, priorityFilter, subcontractorFilter, search])

  // Fetch site instructions
  const {
    data: instructions = [],
    isLoading,
    error,
    refetch,
  } = useSiteInstructions(projectId, filters)

  // Handlers
  const handleProjectChange = (value: string) => {
    setSearchParams({ project: value })
    setSubcontractorFilter('all')
    setSelectedInstructions(new Set())
  }

  const handleSelectInstruction = useCallback((id: string, selected: boolean) => {
    setSelectedInstructions(prev => {
      const next = new Set(prev)
      if (selected) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedInstructions(new Set(instructions.map(i => i.id)))
    } else {
      setSelectedInstructions(new Set())
    }
  }, [instructions])

  const handleViewDetails = useCallback((id: string) => {
    setSelectedDistributionId(id)
    setShowDistributionSheet(true)
  }, [])

  const handleCopyInstruction = useCallback((instruction: SiteInstructionWithRelations) => {
    setCopyingInstruction(instruction)
  }, [])

  const handleCreateFromTemplate = useCallback((templateId: string) => {
    const template = INSTRUCTION_TEMPLATES.find(t => t.id === templateId)
    if (template) {
      navigate(`/site-instructions/new?project=${projectId}&template=${templateId}`)
    }
    setShowTemplateDialog(false)
  }, [navigate, projectId])

  const handleBulkAssign = useCallback((subcontractorIds: string[]) => {
    // Would trigger bulk assignment API call
    console.log('Bulk assign to:', subcontractorIds, 'instructions:', Array.from(selectedInstructions))
    setShowBulkAssignDialog(false)
    setSelectedInstructions(new Set())
  }, [selectedInstructions])

  // Stats calculation
  const stats = useMemo(() => {
    const total = instructions.length
    const pendingAck = instructions.filter((i) =>
      i.status === 'issued' && !i.acknowledged
    ).length
    const acknowledged = instructions.filter((i) => i.acknowledged).length
    const overdue = instructions.filter((i) =>
      i.due_date && isPast(new Date(i.due_date)) && !['completed', 'verified', 'void'].includes(i.status || '')
    ).length
    const completed = instructions.filter((i) =>
      ['completed', 'verified'].includes(i.status || '')
    ).length
    const inProgress = instructions.filter((i) =>
      ['acknowledged', 'in_progress'].includes(i.status || '')
    ).length

    return { total, pendingAck, acknowledged, overdue, completed, inProgress }
  }, [instructions])

  // Filter instructions by tab
  const filteredInstructions = useMemo(() => {
    switch (activeTab) {
      case 'pending':
        return instructions.filter(i => i.status === 'issued' && !i.acknowledged)
      case 'overdue':
        return instructions.filter(i =>
          i.due_date && isPast(new Date(i.due_date)) && !['completed', 'verified', 'void'].includes(i.status || '')
        )
      case 'completed':
        return instructions.filter(i => ['completed', 'verified'].includes(i.status || ''))
      default:
        return instructions
    }
  }, [instructions, activeTab])

  // Loading state for projects
  if (projectsLoading) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-40" />
          </div>
          <StatsSkeleton />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold heading-page">Site Instructions</h1>
            <p className="text-muted-foreground">
              Formal written instructions and directives to subcontractors
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={projectId} onValueChange={handleProjectChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects?.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {projectId && (
              <>
                <Button variant="outline" onClick={() => setShowTemplateDialog(true)}>
                  <Copy className="h-4 w-4 mr-2" />
                  From Template
                </Button>
                <Button asChild>
                  <Link to={`/site-instructions/new?project=${projectId}`}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Instruction
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>

        {!projectId ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2 heading-subsection">Select a Project</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Choose a project from the dropdown above to view and manage site instructions.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats Cards */}
            {isLoading ? (
              <StatsSkeleton />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveTab('all')}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <ClipboardList className="h-4 w-4" />
                      Total Instructions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.total}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.inProgress} in progress
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className={cn(
                    "cursor-pointer hover:border-primary/50 transition-colors",
                    activeTab === 'pending' && "border-primary"
                  )}
                  onClick={() => setActiveTab('pending')}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4 text-warning" />
                      Pending Acknowledgment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-warning">{stats.pendingAck}</div>
                    <p className="text-xs text-muted-foreground">
                      Awaiting signature
                    </p>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveTab('all')}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <ClipboardCheck className="h-4 w-4 text-success" />
                      Acknowledged
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-success">{stats.acknowledged}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.total > 0 ? Math.round((stats.acknowledged / stats.total) * 100) : 0}% rate
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className={cn(
                    "cursor-pointer hover:border-destructive/50 transition-colors",
                    activeTab === 'overdue' && "border-destructive"
                  )}
                  onClick={() => setActiveTab('overdue')}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <FileWarning className="h-4 w-4 text-destructive" />
                      Overdue
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-destructive">{stats.overdue}</div>
                    <p className="text-xs text-muted-foreground">
                      Requires attention
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tabs and Filters */}
            <div className="space-y-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="pending">
                      Pending
                      {stats.pendingAck > 0 && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {stats.pendingAck}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="overdue">
                      Overdue
                      {stats.overdue > 0 && (
                        <Badge variant="destructive" className="ml-2 text-xs">
                          {stats.overdue}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                  </TabsList>

                  {/* Bulk actions */}
                  {selectedInstructions.size > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {selectedInstructions.size} selected
                      </span>
                      <Button variant="outline" size="sm" onClick={() => setShowBulkAssignDialog(true)}>
                        <Users className="h-4 w-4 mr-2" />
                        Bulk Assign
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedInstructions(new Set())}>
                        Clear
                      </Button>
                    </div>
                  )}
                </div>
              </Tabs>

              {/* Filters */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedInstructions.size === filteredInstructions.length && filteredInstructions.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm text-muted-foreground">Select all</span>
                </div>
                <div className="flex-1">
                  <Filters
                    search={search}
                    onSearchChange={setSearch}
                    status={statusFilter}
                    onStatusChange={setStatusFilter}
                    priority={priorityFilter}
                    onPriorityChange={setPriorityFilter}
                    subcontractorId={subcontractorFilter}
                    onSubcontractorChange={setSubcontractorFilter}
                    contacts={subcontractors}
                  />
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Instructions List */}
              <div className="lg:col-span-3">
                {isLoading ? (
                  <InstructionsSkeleton />
                ) : error ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                      <h3 className="text-lg font-medium mb-2 heading-subsection">Error Loading Instructions</h3>
                      <p className="text-muted-foreground text-center mb-4">
                        {error instanceof Error ? error.message : 'An unexpected error occurred'}
                      </p>
                      <Button onClick={() => refetch()} variant="outline">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retry
                      </Button>
                    </CardContent>
                  </Card>
                ) : filteredInstructions.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2 heading-subsection">No Site Instructions</h3>
                      <p className="text-muted-foreground text-center max-w-md mb-4">
                        {search || statusFilter !== 'all' || priorityFilter !== 'all'
                          ? 'No instructions match your current filters.'
                          : 'Create your first site instruction to provide formal directives to subcontractors.'}
                      </p>
                      {!search && statusFilter === 'all' && priorityFilter === 'all' && (
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => setShowTemplateDialog(true)}>
                            <Copy className="h-4 w-4 mr-2" />
                            From Template
                          </Button>
                          <Button asChild>
                            <Link to={`/site-instructions/new?project=${projectId}`}>
                              <Plus className="h-4 w-4 mr-2" />
                              Create First Instruction
                            </Link>
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {filteredInstructions.map((instruction) => (
                      <EnhancedInstructionCard
                        key={instruction.id}
                        instruction={instruction}
                        isSelected={selectedInstructions.has(instruction.id)}
                        onSelect={handleSelectInstruction}
                        onViewDetails={handleViewDetails}
                        onCopy={handleCopyInstruction}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Sidebar - Compliance by Subcontractor */}
              <div className="lg:col-span-1 space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Compliance by Subcontractor
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Acknowledgment and completion rates
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="max-h-[600px] overflow-y-auto">
                    <SubcontractorCompliancePanel
                      instructions={instructions}
                      contacts={subcontractors}
                    />
                  </CardContent>
                </Card>

                {/* Execution Photos Summary */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      Execution Photos
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Photo documentation status
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">With photos</span>
                        <span className="font-medium">
                          {instructions.filter(i => i.status === 'completed' || i.status === 'verified').length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Missing photos</span>
                        <span className="font-medium text-warning">
                          {instructions.filter(i => i.status === 'in_progress').length}
                        </span>
                      </div>
                      <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                        <Link to={`/site-instructions?project=${projectId}&view=photos`}>
                          <Camera className="h-4 w-4 mr-2" />
                          View All Photos
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}

        {/* Template Selection Dialog */}
        <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create from Template</DialogTitle>
              <DialogDescription>
                Select a template to quickly create a new site instruction
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 max-h-[400px] overflow-y-auto py-4">
              {INSTRUCTION_TEMPLATES.map((template) => {
                const Icon = template.icon
                return (
                  <button
                    key={template.id}
                    onClick={() => handleCreateFromTemplate(template.id)}
                    className="flex items-start gap-4 p-4 rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{template.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {template.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {template.description}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </button>
                )
              })}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Assign Dialog */}
        <Dialog open={showBulkAssignDialog} onOpenChange={setShowBulkAssignDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Assign Instructions</DialogTitle>
              <DialogDescription>
                Assign {selectedInstructions.size} selected instructions to subcontractors
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Select subcontractors to receive these instructions:
              </p>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {subcontractors.map((sub) => (
                  <label
                    key={sub.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox />
                    <div>
                      <p className="font-medium">{sub.company_name}</p>
                      {sub.contact_name && (
                        <p className="text-xs text-muted-foreground">{sub.contact_name}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={() => handleBulkAssign([])}>
                <Send className="h-4 w-4 mr-2" />
                Assign & Notify
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Copy Instruction Dialog */}
        <Dialog open={!!copyingInstruction} onOpenChange={(open) => !open && setCopyingInstruction(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Copy Instruction</DialogTitle>
              <DialogDescription>
                Create a new instruction based on "{copyingInstruction?.title}"
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-4">
                This will create a new draft instruction with the same content. You can modify it before issuing.
              </p>
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2">{copyingInstruction?.title}</h4>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {copyingInstruction?.description}
                </p>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                onClick={() => {
                  if (copyingInstruction) {
                    navigate(`/site-instructions/new?project=${projectId}&copy=${copyingInstruction.id}`)
                  }
                  setCopyingInstruction(null)
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Create Copy
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Distribution History Sheet */}
        <Sheet open={showDistributionSheet} onOpenChange={setShowDistributionSheet}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Distribution History
              </SheetTitle>
              <SheetDescription>
                Track how this instruction was distributed and acknowledged
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              {selectedDistributionId && (
                <DistributionHistoryPanel instructionId={selectedDistributionId} />
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </AppLayout>
  )
}
