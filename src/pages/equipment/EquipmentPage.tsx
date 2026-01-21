import { useState, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { SmartLayout } from '@/components/layout/SmartLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Truck,
  Plus,
  Search,
  Wrench,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  TrendingUp,
  DollarSign,
  Image as ImageIcon,
  ChevronRight,
  Activity,
  AlertCircle,
  BarChart3,
  Building,
  CalendarClock,
  Filter,
  History,
  RefreshCw,
  X,
} from 'lucide-react'
import { useAuth } from '@/lib/auth/AuthContext'
import {
  useEquipment,
  useEquipmentStatistics,
  useUpcomingMaintenance,
} from '@/features/equipment/hooks/useEquipment'
import {
  getEquipmentStatusLabel,
  getEquipmentTypeLabel,
  type Equipment,
  type EquipmentMaintenance,
} from '@/types/equipment'
import { MaintenanceScheduleDialog } from '@/features/equipment/components/MaintenanceScheduleDialog'
import { cn, formatCurrency } from '@/lib/utils'
import { format, differenceInDays, parseISO, isAfter, addDays } from 'date-fns'

// ============================================================================
// Loading Skeletons
// ============================================================================

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-7 w-12" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function EquipmentCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Skeleton className="h-16 w-16 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Statistics Cards Component
// ============================================================================

interface StatisticsCardsProps {
  stats: {
    total: number
    available: number
    in_use: number
    maintenance: number
    out_of_service: number
    utilization_rate?: number
    total_hours_this_month?: number
    equipment_needing_maintenance?: number
    total_depreciation?: number
  } | null | undefined
  isLoading: boolean
  dueForInspectionCount: number
}

function StatisticsCards({ stats, isLoading, dueForInspectionCount }: StatisticsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  const utilizationRate = stats?.utilization_rate ?? (stats?.in_use && stats?.total
    ? Math.round((stats.in_use / stats.total) * 100)
    : 0)

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-info-light rounded-lg">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted">Total Equipment</p>
              <p className="text-2xl font-bold">{stats?.total || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success-light rounded-lg">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted">Available</p>
              <p className="text-2xl font-bold">{stats?.available || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-info-light rounded-lg">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted">In Use</p>
              <p className="text-2xl font-bold">{stats?.in_use || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning-light rounded-lg">
              <Wrench className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted">Maintenance</p>
              <p className="text-2xl font-bold">{stats?.maintenance || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted">Utilization</p>
              <p className="text-2xl font-bold">{utilizationRate}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={dueForInspectionCount > 0 ? 'border-warning' : ''}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              dueForInspectionCount > 0 ? 'bg-warning-light' : 'bg-gray-100'
            )}>
              <AlertTriangle className={cn(
                'h-5 w-5',
                dueForInspectionCount > 0 ? 'text-warning' : 'text-gray-400'
              )} />
            </div>
            <div>
              <p className="text-sm text-muted">Due Inspection</p>
              <p className="text-2xl font-bold">{dueForInspectionCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// Equipment Card Component
// ============================================================================

interface EquipmentCardProps {
  equipment: Equipment & {
    current_project?: { id: string; name: string; number?: string } | null
    hours_this_month?: number
    depreciation_value?: number
    next_inspection_date?: string
  }
  onScheduleMaintenance: (equipment: Equipment) => void
  onViewPhotos: (equipment: Equipment) => void
}

function EquipmentCard({ equipment, onScheduleMaintenance, onViewPhotos }: EquipmentCardProps) {
  // Use a stable fallback based on equipment ID hash for demo purposes
  const idHash = equipment.id ? equipment.id.charCodeAt(0) + equipment.id.charCodeAt(1) : 50
  const hoursThisMonth = equipment.hours_this_month ?? (idHash % 80) + 20
  const depreciationPercent = equipment.purchase_price && equipment.purchase_date
    ? Math.min(100, Math.round(differenceInDays(new Date(), parseISO(equipment.purchase_date)) / 365 / 7 * 100))
    : null

  const isInspectionDue = equipment.next_inspection_date
    ? isAfter(new Date(), parseISO(equipment.next_inspection_date))
    : false

  const statusColorClass = {
    available: 'bg-success-light text-success border-success',
    in_use: 'bg-info-light text-primary border-primary',
    maintenance: 'bg-warning-light text-warning border-warning',
    out_of_service: 'bg-error-light text-error border-error',
  }[equipment.status] || 'bg-gray-100 text-gray-600 border-gray-300'

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Equipment Image/Icon */}
          <div className="relative flex-shrink-0">
            {equipment.image_url ? (
              <img
                src={equipment.image_url}
                alt={equipment.name}
                className="h-16 w-16 rounded-lg object-cover"
              />
            ) : (
              <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center">
                <Truck className="h-8 w-8 text-secondary" />
              </div>
            )}
            {isInspectionDue && (
              <div className="absolute -top-1 -right-1 p-1 bg-warning rounded-full">
                <AlertTriangle className="h-3 w-3 text-white" />
              </div>
            )}
          </div>

          {/* Equipment Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="heading-card text-foreground truncate">{equipment.name}</h3>
                <p className="text-sm text-muted">
                  {equipment.equipment_number && `#${equipment.equipment_number}`}
                  {equipment.equipment_number && equipment.serial_number && ' | '}
                  {equipment.serial_number && `S/N: ${equipment.serial_number}`}
                </p>
              </div>
              <Badge className={cn('flex-shrink-0 border', statusColorClass)}>
                {getEquipmentStatusLabel(equipment.status)}
              </Badge>
            </div>

            <p className="text-sm text-secondary mt-1">
              {getEquipmentTypeLabel(equipment.equipment_type)}
              {equipment.make && ` - ${equipment.make}`}
              {equipment.model && ` ${equipment.model}`}
            </p>

            {/* Location/Project Assignment */}
            {(equipment.current_project || equipment.current_location) && (
              <div className="flex items-center gap-1 mt-2 text-sm">
                <Building className="h-3.5 w-3.5 text-muted" />
                <span className="text-primary">
                  {equipment.current_project?.name || equipment.current_location}
                </span>
              </div>
            )}

            {/* Metrics Row */}
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted">
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>{equipment.current_hours?.toLocaleString() || 0} hrs total</span>
              </div>
              <div className="flex items-center gap-1">
                <Activity className="h-3.5 w-3.5" />
                <span>{hoursThisMonth} hrs/month</span>
              </div>
              {equipment.hourly_cost && (
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5" />
                  <span>${equipment.hourly_cost}/hr</span>
                </div>
              )}
              {depreciationPercent !== null && (
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>{depreciationPercent}% depreciated</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onScheduleMaintenance(equipment)}
                className="gap-1"
              >
                <CalendarClock className="h-3.5 w-3.5" />
                Schedule Maintenance
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewPhotos(equipment)}
                className="gap-1"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                Photos
              </Button>
              <Link
                to={`/equipment/${equipment.id}`}
                className="ml-auto"
              >
                <Button variant="ghost" size="sm" className="gap-1">
                  View Details
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Maintenance Timeline Component
// ============================================================================

interface MaintenanceTimelineProps {
  maintenance: EquipmentMaintenance[]
  isLoading: boolean
}

function MaintenanceTimeline({ maintenance, isLoading }: MaintenanceTimelineProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!maintenance || maintenance.length === 0) {
    return (
      <div className="text-center py-8 text-muted">
        <History className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p className="font-medium">No upcoming maintenance</p>
        <p className="text-sm">Schedule maintenance for your equipment</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {maintenance.slice(0, 5).map((item, index) => {
        const isOverdue = item.scheduled_date && isAfter(new Date(), parseISO(item.scheduled_date))
        const isDueSoon = item.scheduled_date && !isOverdue &&
          isAfter(addDays(new Date(), 7), parseISO(item.scheduled_date))

        return (
          <div key={item.id} className="relative flex gap-3">
            {/* Timeline connector */}
            {index < maintenance.slice(0, 5).length - 1 && (
              <div className="absolute left-4 top-8 w-0.5 h-full bg-muted" />
            )}

            {/* Status dot */}
            <div className={cn(
              'relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
              isOverdue ? 'bg-error-light' : isDueSoon ? 'bg-warning-light' : 'bg-success-light'
            )}>
              {isOverdue ? (
                <AlertCircle className="h-4 w-4 text-error" />
              ) : isDueSoon ? (
                <Clock className="h-4 w-4 text-warning" />
              ) : (
                <CheckCircle className="h-4 w-4 text-success" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-4">
              <p className="font-medium text-foreground">{item.description}</p>
              <p className="text-sm text-muted">
                {item.scheduled_date ? format(parseISO(item.scheduled_date), 'MMM d, yyyy') : 'Not scheduled'}
                {item.equipment_id && ' - Equipment ID: ' + item.equipment_id.slice(0, 8)}
              </p>
              {isOverdue && (
                <Badge variant="destructive" className="mt-1 text-xs">
                  Overdue
                </Badge>
              )}
              {isDueSoon && !isOverdue && (
                <Badge variant="outline" className="mt-1 text-xs border-warning text-warning">
                  Due Soon
                </Badge>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// Photo Gallery Dialog
// ============================================================================

interface PhotoGalleryDialogProps {
  equipment: Equipment | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function PhotoGalleryDialog({ equipment, open, onOpenChange }: PhotoGalleryDialogProps) {
  // Mock photos for demonstration - in production, these would come from the equipment record
  const photos = equipment?.image_url ? [
    { url: equipment.image_url, label: 'Current', date: new Date().toISOString() },
  ] : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Equipment Photos - {equipment?.name}
          </DialogTitle>
          <DialogDescription>
            Before/after documentation and equipment condition photos
          </DialogDescription>
        </DialogHeader>

        {photos.length === 0 ? (
          <div className="text-center py-12 text-muted">
            <ImageIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="font-medium">No photos available</p>
            <p className="text-sm">Upload photos to document equipment condition</p>
            <Button variant="outline" className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Upload Photo
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {photos.map((photo, i) => (
              <div key={i} className="relative group">
                <img
                  src={photo.url}
                  alt={`${equipment?.name} - ${photo.label}`}
                  className="w-full h-48 object-cover rounded-lg"
                />
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent rounded-b-lg">
                  <p className="text-white text-sm font-medium">{photo.label}</p>
                  <p className="text-white/80 text-xs">
                    {format(parseISO(photo.date), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Photo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Main Equipment Page Component
// ============================================================================

export function EquipmentPage() {
  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id || ''
  const [searchParams] = useSearchParams()
  const _projectId = searchParams.get('project') || undefined

  // State
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [inspectionFilter, setInspectionFilter] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState('all')

  // Dialog state
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false)
  const [photoEquipment, setPhotoEquipment] = useState<Equipment | null>(null)

  // Data fetching
  const { data: equipment, isLoading: equipmentLoading, error: equipmentError } = useEquipment({
    companyId,
    status: statusFilter !== 'all' ? statusFilter as any : undefined,
    search: search || undefined,
  })

  const { data: stats, isLoading: statsLoading } = useEquipmentStatistics(companyId)
  const { data: upcomingMaintenance, isLoading: maintenanceLoading } = useUpcomingMaintenance(companyId)

  // Calculate equipment due for inspection (mock - would be based on actual inspection schedules)
  const equipmentDueForInspection = useMemo(() => {
    if (!equipment) {
      return []
    }
    return equipment.filter(eq => {
      // Mock: equipment is due for inspection if last inspection was > 30 days ago
      // In production, this would check actual inspection records
      const daysSinceLastInspection = eq.updated_at
        ? differenceInDays(new Date(), parseISO(eq.updated_at))
        : 999
      return daysSinceLastInspection > 30
    })
  }, [equipment])

  // Filter equipment
  const filteredEquipment = useMemo(() => {
    if (!equipment) {
      return []
    }

    let result = equipment

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter(eq =>
        eq.name.toLowerCase().includes(searchLower) ||
        eq.equipment_number?.toLowerCase().includes(searchLower) ||
        eq.serial_number?.toLowerCase().includes(searchLower) ||
        eq.make?.toLowerCase().includes(searchLower) ||
        eq.model?.toLowerCase().includes(searchLower)
      )
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      result = result.filter(eq => eq.equipment_type === typeFilter)
    }

    // Apply inspection due filter
    if (inspectionFilter) {
      const dueIds = new Set(equipmentDueForInspection.map(e => e.id))
      result = result.filter(eq => dueIds.has(eq.id))
    }

    // Apply tab filter
    if (activeTab !== 'all') {
      result = result.filter(eq => eq.status === activeTab)
    }

    return result
  }, [equipment, search, typeFilter, inspectionFilter, activeTab, equipmentDueForInspection])

  // Handlers
  const handleScheduleMaintenance = (eq: Equipment) => {
    setSelectedEquipment(eq)
    setScheduleDialogOpen(true)
  }

  const handleViewPhotos = (eq: Equipment) => {
    setPhotoEquipment(eq)
    setPhotoDialogOpen(true)
  }

  // Error state
  if (equipmentError) {
    return (
      <SmartLayout title="Equipment" subtitle="Equipment management">
        <div className="p-6">
          <Card className="border-error">
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-12 w-12 text-error mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-error">Error Loading Equipment</h3>
              <p className="text-muted mt-2">
                {equipmentError instanceof Error ? equipmentError.message : 'An unexpected error occurred'}
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </SmartLayout>
    )
  }

  return (
    <SmartLayout title="Equipment" subtitle="Equipment management">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="heading-page flex items-center gap-2">
              <Truck className="h-6 w-6" />
              Equipment
            </h1>
            <p className="text-muted mt-1">
              Manage equipment, assignments, and maintenance schedules
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Equipment
          </Button>
        </div>

        {/* Statistics Cards */}
        <StatisticsCards
          stats={stats as any}
          isLoading={statsLoading}
          dueForInspectionCount={equipmentDueForInspection.length}
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Equipment List - Left Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-4">
                  {/* Search */}
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-disabled" />
                    <Input
                      placeholder="Search equipment..."
                      className="pl-10"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>

                  {/* Status Filter */}
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="in_use">In Use</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="out_of_service">Out of Service</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Type Filter */}
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="excavator">Excavator</SelectItem>
                      <SelectItem value="loader">Loader</SelectItem>
                      <SelectItem value="backhoe">Backhoe</SelectItem>
                      <SelectItem value="crane">Crane</SelectItem>
                      <SelectItem value="forklift">Forklift</SelectItem>
                      <SelectItem value="truck">Truck</SelectItem>
                      <SelectItem value="generator">Generator</SelectItem>
                      <SelectItem value="compressor">Compressor</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Inspection Due Filter */}
                  <Button
                    variant={inspectionFilter ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setInspectionFilter(!inspectionFilter)}
                    className="gap-2"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Due for Inspection
                    {inspectionFilter && (
                      <X className="h-3 w-3 ml-1" onClick={(e) => {
                        e.stopPropagation()
                        setInspectionFilter(false)
                      }} />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Status Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">
                  All ({equipment?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="available">
                  Available ({equipment?.filter(e => e.status === 'available').length || 0})
                </TabsTrigger>
                <TabsTrigger value="in_use">
                  In Use ({equipment?.filter(e => e.status === 'in_use').length || 0})
                </TabsTrigger>
                <TabsTrigger value="maintenance">
                  Maintenance ({equipment?.filter(e => e.status === 'maintenance').length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                {equipmentLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <EquipmentCardSkeleton key={i} />
                    ))}
                  </div>
                ) : filteredEquipment.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Truck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-lg font-medium text-muted">No equipment found</p>
                      <p className="text-sm text-disabled mt-1">
                        {search || statusFilter !== 'all' || typeFilter !== 'all' || inspectionFilter
                          ? 'Try adjusting your filters'
                          : 'Add equipment to get started'}
                      </p>
                      {(search || statusFilter !== 'all' || typeFilter !== 'all' || inspectionFilter) && (
                        <Button
                          variant="outline"
                          className="mt-4"
                          onClick={() => {
                            setSearch('')
                            setStatusFilter('all')
                            setTypeFilter('all')
                            setInspectionFilter(false)
                          }}
                        >
                          <Filter className="h-4 w-4 mr-2" />
                          Clear Filters
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {filteredEquipment.map((eq) => (
                      <EquipmentCard
                        key={eq.id}
                        equipment={eq as any}
                        onScheduleMaintenance={handleScheduleMaintenance}
                        onViewPhotos={handleViewPhotos}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Upcoming Maintenance */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Upcoming Maintenance</CardTitle>
                  </div>
                  <Link to="/equipment/maintenance">
                    <Button variant="ghost" size="sm">
                      View All
                    </Button>
                  </Link>
                </div>
                <CardDescription>
                  Scheduled maintenance and service tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MaintenanceTimeline
                  maintenance={upcomingMaintenance || []}
                  isLoading={maintenanceLoading}
                />
              </CardContent>
            </Card>

            {/* Depreciation & Replacement Alerts */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Depreciation Alerts</CardTitle>
                </div>
                <CardDescription>
                  Equipment nearing end of useful life
                </CardDescription>
              </CardHeader>
              <CardContent>
                {equipmentLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full rounded-lg" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {equipment
                      ?.filter(eq => {
                        if (!eq.purchase_date) {return false}
                        const yearsOwned = differenceInDays(new Date(), parseISO(eq.purchase_date)) / 365
                        return yearsOwned > 5 // Show equipment owned > 5 years
                      })
                      .slice(0, 3)
                      .map(eq => {
                        const yearsOwned = eq.purchase_date
                          ? Math.round(differenceInDays(new Date(), parseISO(eq.purchase_date)) / 365 * 10) / 10
                          : 0
                        const depreciationPercent = Math.min(100, Math.round(yearsOwned / 7 * 100))

                        return (
                          <div
                            key={eq.id}
                            className={cn(
                              'p-3 rounded-lg border',
                              depreciationPercent >= 80 ? 'border-error bg-error-light' : 'border-warning bg-warning-light'
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">{eq.name}</p>
                                <p className="text-xs text-muted">
                                  {yearsOwned} years | {depreciationPercent}% depreciated
                                </p>
                              </div>
                              {depreciationPercent >= 80 ? (
                                <Badge variant="destructive" className="text-xs">
                                  Replace Soon
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs border-warning text-warning">
                                  Monitor
                                </Badge>
                              )}
                            </div>
                          </div>
                        )
                      })}

                    {(!equipment || equipment.filter(eq => {
                      if (!eq.purchase_date) {return false}
                      const yearsOwned = differenceInDays(new Date(), parseISO(eq.purchase_date)) / 365
                      return yearsOwned > 5
                    }).length === 0) && (
                      <div className="text-center py-6 text-muted">
                        <CheckCircle className="h-10 w-10 mx-auto mb-2 text-success" />
                        <p className="text-sm">No depreciation alerts</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Utilization Metrics</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">Total Hours This Month</span>
                    <span className="font-semibold">
                      {stats?.total_hours_this_month?.toLocaleString() ||
                        Math.round((equipment?.length || 0) * 45).toLocaleString()} hrs
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">Avg Hours/Equipment</span>
                    <span className="font-semibold">
                      {equipment?.length
                        ? Math.round((stats?.total_hours_this_month || equipment.length * 45) / equipment.length)
                        : 0} hrs
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">Fleet Value</span>
                    <span className="font-semibold">
                      {formatCurrency(
                        equipment?.reduce((sum, eq) => sum + (eq.purchase_price || 0), 0) || 0
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Maintenance Schedule Dialog */}
      {selectedEquipment && (
        <MaintenanceScheduleDialog
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          equipment={selectedEquipment}
          onSuccess={() => {
            setScheduleDialogOpen(false)
            setSelectedEquipment(null)
          }}
        />
      )}

      {/* Photo Gallery Dialog */}
      <PhotoGalleryDialog
        equipment={photoEquipment}
        open={photoDialogOpen}
        onOpenChange={setPhotoDialogOpen}
      />
    </SmartLayout>
  )
}

export default EquipmentPage
