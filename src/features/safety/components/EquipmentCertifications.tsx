/**
 * EquipmentCertifications Component
 *
 * Comprehensive equipment operator certification management:
 * - List all equipment requiring certification
 * - Certification type (crane, forklift, scaffold, etc.)
 * - Expiration date tracking
 * - Operator assignments
 * - Upload certification documents
 * - Expiring soon alerts (30, 60, 90 days)
 * - Recertification reminders
 */

import { useState, useMemo } from 'react';
import { format, differenceInDays, parseISO } from 'date-fns';
import {
  Award,
  AlertTriangle,
  Calendar,
  Clock,
  User,
  Building,
  FileText,
  Upload,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  Bell,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronRight,
  Shield,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import {
  useCertifications,
  useCertificationStats,
  useExpiringCertifications,
  useOperatorCertificationSummaries,
  useCreateCertification,
  useUpdateCertification,
  useDeleteCertification,
  useVerifyCertification,
  useUploadCertificationDocument,
  useSendRenewalReminder,
} from '../hooks/useEquipmentCerts';
import {
  CERTIFICATION_TYPE_LABELS,
  CERTIFICATION_STATUS_COLORS,
  CERTIFICATION_STATUS_LABELS,
  ISSUING_AUTHORITY_LABELS,
  type EquipmentCertification,
  type CertificationType,
  type CertificationStatus,
  type IssuingAuthorityType,
  type CreateEquipmentCertificationDTO,
  type CertificationFilters,
  calculateCertificationStatus,
  calculateDaysUntilExpiry,
  getCertificationTypeLabel,
} from '@/types/equipment-certifications';
import { useAuth } from '@/lib/auth/AuthContext';
import { cn } from '@/lib/utils';

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Status badge with color coding
 */
function CertificationStatusBadge({ status }: { status: CertificationStatus }) {
  const colorClasses = {
    valid: 'bg-green-100 text-green-800 border-green-200',
    expiring_soon: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    expired: 'bg-red-100 text-red-800 border-red-200',
    pending: 'bg-blue-100 text-blue-800 border-blue-200',
  };

  return (
    <Badge variant="outline" className={cn('font-medium', colorClasses[status])}>
      {CERTIFICATION_STATUS_LABELS[status]}
    </Badge>
  );
}

/**
 * Days until expiry indicator
 */
function ExpiryIndicator({ daysUntil }: { daysUntil: number | null }) {
  if (daysUntil === null) {
    return <span className="text-muted-foreground text-sm">No expiration</span>;
  }

  if (daysUntil < 0) {
    return (
      <span className="text-red-600 font-medium text-sm">
        Expired {Math.abs(daysUntil)} days ago
      </span>
    );
  }

  if (daysUntil === 0) {
    return <span className="text-red-600 font-medium text-sm">Expires today</span>;
  }

  if (daysUntil <= 30) {
    return (
      <span className="text-orange-600 font-medium text-sm">
        {daysUntil} days left
      </span>
    );
  }

  if (daysUntil <= 60) {
    return (
      <span className="text-yellow-600 text-sm">{daysUntil} days left</span>
    );
  }

  return <span className="text-muted-foreground text-sm">{daysUntil} days left</span>;
}

/**
 * Alert cards for expiring certifications
 */
function ExpiringAlerts({
  expiring30,
  expiring60,
  expiring90,
}: {
  expiring30: EquipmentCertification[];
  expiring60: EquipmentCertification[];
  expiring90: EquipmentCertification[];
}) {
  if (expiring30.length === 0 && expiring60.length === 0 && expiring90.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {expiring30.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="flex items-center gap-2">
            Critical - 30 Days
            <Badge variant="destructive">{expiring30.length}</Badge>
          </AlertTitle>
          <AlertDescription className="mt-2">
            <ul className="text-sm space-y-1">
              {expiring30.slice(0, 3).map((cert) => (
                <li key={cert.id}>
                  {cert.operator_name} - {getCertificationTypeLabel(cert.certification_type)}
                </li>
              ))}
              {expiring30.length > 3 && (
                <li className="text-muted-foreground">
                  +{expiring30.length - 3} more
                </li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {expiring60.length > 0 && (
        <Alert className="border-orange-500 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="flex items-center gap-2 text-orange-800">
            Warning - 60 Days
            <Badge variant="outline" className="bg-orange-100 text-orange-800">
              {expiring60.length}
            </Badge>
          </AlertTitle>
          <AlertDescription className="mt-2 text-orange-700">
            <ul className="text-sm space-y-1">
              {expiring60.slice(0, 3).map((cert) => (
                <li key={cert.id}>
                  {cert.operator_name} - {getCertificationTypeLabel(cert.certification_type)}
                </li>
              ))}
              {expiring60.length > 3 && (
                <li className="text-orange-600">+{expiring60.length - 3} more</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {expiring90.length > 0 && (
        <Alert className="border-yellow-500 bg-yellow-50">
          <Clock className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="flex items-center gap-2 text-yellow-800">
            Upcoming - 90 Days
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
              {expiring90.length}
            </Badge>
          </AlertTitle>
          <AlertDescription className="mt-2 text-yellow-700">
            <ul className="text-sm space-y-1">
              {expiring90.slice(0, 3).map((cert) => (
                <li key={cert.id}>
                  {cert.operator_name} - {getCertificationTypeLabel(cert.certification_type)}
                </li>
              ))}
              {expiring90.length > 3 && (
                <li className="text-yellow-600">+{expiring90.length - 3} more</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

/**
 * Statistics cards
 */
function StatsCards({
  total,
  valid,
  expiringSoon,
  expired,
  operators,
}: {
  total: number;
  valid: number;
  expiringSoon: number;
  expired: number;
  operators: number;
}) {
  const validPercent = total > 0 ? Math.round((valid / total) * 100) : 0;

  return (
    <div className="grid gap-4 md:grid-cols-5">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Total Certifications</CardDescription>
          <CardTitle className="text-2xl">{total}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground">
            {operators} operators
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Valid</CardDescription>
          <CardTitle className="text-2xl text-green-600">{valid}</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={validPercent} className="h-2" />
          <div className="text-xs text-muted-foreground mt-1">
            {validPercent}% compliance
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Expiring Soon</CardDescription>
          <CardTitle className="text-2xl text-yellow-600">{expiringSoon}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground">Within 30 days</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Expired</CardDescription>
          <CardTitle className="text-2xl text-red-600">{expired}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground">Needs renewal</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Compliance Rate</CardDescription>
          <CardTitle className="text-2xl">{validPercent}%</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress
            value={validPercent}
            className={cn(
              'h-2',
              validPercent >= 90 && '[&>div]:bg-green-500',
              validPercent >= 70 && validPercent < 90 && '[&>div]:bg-yellow-500',
              validPercent < 70 && '[&>div]:bg-red-500'
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Add/Edit Certification Dialog
// ============================================================================

interface CertificationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certification?: EquipmentCertification;
  onSuccess?: () => void;
}

function CertificationFormDialog({
  open,
  onOpenChange,
  certification,
  onSuccess,
}: CertificationFormDialogProps) {
  const { userProfile } = useAuth();
  const isEditing = !!certification;

  const [formData, setFormData] = useState<Partial<CreateEquipmentCertificationDTO>>({
    operator_name: certification?.operator_name || '',
    operator_company: certification?.operator_company || '',
    operator_badge_number: certification?.operator_badge_number || '',
    operator_employee_id: certification?.operator_employee_id || '',
    certification_type: certification?.certification_type || 'forklift_operator',
    certification_name: certification?.certification_name || '',
    certification_number: certification?.certification_number || '',
    issuing_authority: certification?.issuing_authority || 'company',
    issuing_authority_name: certification?.issuing_authority_name || '',
    issue_date: certification?.issue_date || format(new Date(), 'yyyy-MM-dd'),
    expiration_date: certification?.expiration_date || '',
    capacity_rating: certification?.capacity_rating || '',
    restrictions: certification?.restrictions || '',
    training_provider: certification?.training_provider || '',
    training_hours: certification?.training_hours || undefined,
    notes: certification?.notes || '',
  });

  const createMutation = useCreateCertification();
  const updateMutation = useUpdateCertification();

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEditing && certification) {
        await updateMutation.mutateAsync({
          id: certification.id,
          dto: formData,
        });
      } else {
        await createMutation.mutateAsync({
          ...formData,
          company_id: userProfile?.company_id || '',
        } as CreateEquipmentCertificationDTO);
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to save certification:', error);
    }
  };

  // Auto-fill certification name based on type
  const handleTypeChange = (type: CertificationType) => {
    setFormData({
      ...formData,
      certification_type: type,
      certification_name: formData.certification_name || CERTIFICATION_TYPE_LABELS[type],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            {isEditing ? 'Edit Certification' : 'Add New Certification'}
          </DialogTitle>
          <DialogDescription>
            Record operator certification details for equipment operation authorization.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Operator Information */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Operator Information
            </h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Operator Name *</Label>
                <Input
                  required
                  placeholder="Full name"
                  value={formData.operator_name}
                  onChange={(e) =>
                    setFormData({ ...formData, operator_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Company</Label>
                <Input
                  placeholder="Employer company"
                  value={formData.operator_company || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, operator_company: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Badge/ID Number</Label>
                <Input
                  placeholder="Employee badge number"
                  value={formData.operator_badge_number || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, operator_badge_number: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Employee ID</Label>
                <Input
                  placeholder="Internal employee ID"
                  value={formData.operator_employee_id || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, operator_employee_id: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          {/* Certification Details */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Award className="h-4 w-4" />
              Certification Details
            </h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Certification Type *</Label>
                <Select
                  value={formData.certification_type}
                  onValueChange={(v) => handleTypeChange(v as CertificationType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CERTIFICATION_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Certification Name *</Label>
                <Input
                  required
                  placeholder="e.g., CCO Mobile Crane"
                  value={formData.certification_name}
                  onChange={(e) =>
                    setFormData({ ...formData, certification_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Certification Number</Label>
                <Input
                  placeholder="Certificate ID/Number"
                  value={formData.certification_number || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, certification_number: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Issuing Authority</Label>
                <Select
                  value={formData.issuing_authority}
                  onValueChange={(v) =>
                    setFormData({ ...formData, issuing_authority: v as IssuingAuthorityType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select authority" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ISSUING_AUTHORITY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Issue Date *</Label>
                <Input
                  type="date"
                  required
                  value={formData.issue_date}
                  onChange={(e) =>
                    setFormData({ ...formData, issue_date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Expiration Date</Label>
                <Input
                  type="date"
                  value={formData.expiration_date || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, expiration_date: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="space-y-4">
            <h4 className="font-medium">Additional Details</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Capacity Rating</Label>
                <Input
                  placeholder="e.g., 10 tons, Class 1-4"
                  value={formData.capacity_rating || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, capacity_rating: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Training Provider</Label>
                <Input
                  placeholder="Training company/school"
                  value={formData.training_provider || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, training_provider: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Training Hours</Label>
                <Input
                  type="number"
                  placeholder="Hours completed"
                  value={formData.training_hours || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      training_hours: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Restrictions</Label>
                <Input
                  placeholder="Any limitations or restrictions"
                  value={formData.restrictions || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, restrictions: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes..."
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? 'Saving...'
                : isEditing
                ? 'Save Changes'
                : 'Add Certification'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface EquipmentCertificationsProps {
  companyId?: string;
}

export function EquipmentCertifications({ companyId }: EquipmentCertificationsProps) {
  const { userProfile } = useAuth();
  const effectiveCompanyId = companyId || userProfile?.company_id;

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<CertificationType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<CertificationStatus | 'all'>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedCert, setSelectedCert] = useState<EquipmentCertification | undefined>();
  const [activeTab, setActiveTab] = useState<'list' | 'operators' | 'alerts'>('list');

  // Filters
  const filters: CertificationFilters = useMemo(
    () => ({
      company_id: effectiveCompanyId,
      certification_type: selectedType !== 'all' ? selectedType : undefined,
      status: selectedStatus !== 'all' ? selectedStatus : undefined,
      search: searchQuery || undefined,
      is_active: true,
    }),
    [effectiveCompanyId, selectedType, selectedStatus, searchQuery]
  );

  // Queries
  const { data: certifications, isLoading } = useCertifications(filters);
  const { data: stats } = useCertificationStats(effectiveCompanyId);
  const { data: operatorSummaries } = useOperatorCertificationSummaries(effectiveCompanyId);
  const { data: expiring30 } = useExpiringCertifications(30);

  // Mutations
  const deleteMutation = useDeleteCertification();
  const verifyMutation = useVerifyCertification();
  const sendReminderMutation = useSendRenewalReminder();

  // Handlers
  const handleEdit = (cert: EquipmentCertification) => {
    setSelectedCert(cert);
    setShowAddDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this certification?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleVerify = async (id: string) => {
    await verifyMutation.mutateAsync(id);
  };

  const handleSendReminder = async (id: string) => {
    await sendReminderMutation.mutateAsync(id);
  };

  const handleDialogClose = () => {
    setShowAddDialog(false);
    setSelectedCert(undefined);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Award className="h-6 w-6" />
            Equipment Certifications
          </h2>
          <p className="text-muted-foreground">
            Manage operator certifications for equipment operation authorization
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Certification
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <StatsCards
          total={stats.total_certifications}
          valid={stats.valid_count}
          expiringSoon={stats.expiring_soon_count}
          expired={stats.expired_count}
          operators={stats.operators_with_certifications}
        />
      )}

      {/* Expiring Alerts */}
      {stats && (
        <ExpiringAlerts
          expiring30={stats.expiring_30_days}
          expiring60={stats.expiring_60_days}
          expiring90={stats.expiring_90_days}
        />
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            All Certifications
          </TabsTrigger>
          <TabsTrigger value="operators" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            By Operator
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Expiring Soon
            {stats && stats.expiring_soon_count > 0 && (
              <Badge variant="destructive" className="ml-1">
                {stats.expiring_soon_count}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* List Tab */}
        <TabsContent value="list" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, certification..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <Select
              value={selectedType}
              onValueChange={(v) => setSelectedType(v as typeof selectedType)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Certification Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(CERTIFICATION_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedStatus}
              onValueChange={(v) => setSelectedStatus(v as typeof selectedStatus)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="valid">Valid</SelectItem>
                <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Operator</TableHead>
                  <TableHead>Certification</TableHead>
                  <TableHead>Cert #</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading certifications...
                    </TableCell>
                  </TableRow>
                ) : certifications?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="text-muted-foreground">
                        No certifications found. Add your first certification.
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  certifications?.map((cert) => (
                    <TableRow key={cert.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{cert.operator_name}</div>
                          {cert.operator_company && (
                            <div className="text-sm text-muted-foreground">
                              {cert.operator_company}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div>{cert.certification_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {getCertificationTypeLabel(cert.certification_type)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {cert.certification_number || '-'}
                      </TableCell>
                      <TableCell>
                        {format(parseISO(cert.issue_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {cert.expiration_date ? (
                          <div>
                            <div>{format(parseISO(cert.expiration_date), 'MMM d, yyyy')}</div>
                            <ExpiryIndicator daysUntil={cert.days_until_expiry ?? null} />
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No expiration</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <CertificationStatusBadge status={cert.status || 'valid'} />
                      </TableCell>
                      <TableCell>
                        {cert.verified ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(cert)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {!cert.verified && (
                              <DropdownMenuItem onClick={() => handleVerify(cert.id)}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Verify
                              </DropdownMenuItem>
                            )}
                            {cert.status === 'expiring_soon' && (
                              <DropdownMenuItem onClick={() => handleSendReminder(cert.id)}>
                                <Bell className="h-4 w-4 mr-2" />
                                Send Reminder
                              </DropdownMenuItem>
                            )}
                            {cert.document_url && (
                              <DropdownMenuItem asChild>
                                <a href={cert.document_url} target="_blank" rel="noopener noreferrer">
                                  <Download className="h-4 w-4 mr-2" />
                                  View Document
                                </a>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(cert.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Operators Tab */}
        <TabsContent value="operators" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {operatorSummaries?.map((summary) => (
              <Card key={summary.operator_id || summary.operator_name}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{summary.operator_name}</CardTitle>
                      {summary.operator_company && (
                        <CardDescription>{summary.operator_company}</CardDescription>
                      )}
                    </div>
                    <Badge variant="outline">
                      {summary.total_certifications} certs
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2 flex-wrap">
                    {summary.valid_certifications > 0 && (
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        {summary.valid_certifications} valid
                      </Badge>
                    )}
                    {summary.expiring_certifications > 0 && (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                        {summary.expiring_certifications} expiring
                      </Badge>
                    )}
                    {summary.expired_certifications > 0 && (
                      <Badge variant="outline" className="bg-red-50 text-red-700">
                        {summary.expired_certifications} expired
                      </Badge>
                    )}
                  </div>

                  <div className="text-sm text-muted-foreground">
                    <div className="font-medium mb-1">Certified for:</div>
                    <div className="flex flex-wrap gap-1">
                      {summary.certification_types.map((type) => (
                        <Badge key={type} variant="secondary" className="text-xs">
                          {getCertificationTypeLabel(type)}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {summary.next_expiration && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Next expiration: </span>
                      <span className="font-medium">
                        {format(parseISO(summary.next_expiration), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          {expiring30 && expiring30.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Operator</TableHead>
                  <TableHead>Certification</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Days Left</TableHead>
                  <TableHead>Reminder Sent</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expiring30.map((cert) => (
                  <TableRow key={cert.id}>
                    <TableCell className="font-medium">{cert.operator_name}</TableCell>
                    <TableCell>{cert.certification_name}</TableCell>
                    <TableCell>
                      {cert.expiration_date
                        ? format(parseISO(cert.expiration_date), 'MMM d, yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <ExpiryIndicator daysUntil={cert.days_until_expiry ?? null} />
                    </TableCell>
                    <TableCell>
                      {cert.renewal_reminder_sent ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          Sent
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not sent</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSendReminder(cert.id)}
                        disabled={sendReminderMutation.isPending}
                      >
                        <Bell className="h-4 w-4 mr-1" />
                        Send Reminder
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <p className="text-muted-foreground">
                  No certifications expiring within 30 days
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <CertificationFormDialog
        open={showAddDialog}
        onOpenChange={handleDialogClose}
        certification={selectedCert}
      />
    </div>
  );
}

export default EquipmentCertifications;
