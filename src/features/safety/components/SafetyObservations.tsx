/**
 * SafetyObservations Component
 *
 * Enhanced safety observations management with:
 * - Quick-add observation form
 * - Observation type (positive, at-risk, near-miss)
 * - Photo capture
 * - Location tagging
 * - Severity rating
 * - Corrective action required
 * - Follow-up tracking
 * - Trend analysis dashboard
 */

import { useState, useMemo } from 'react';
import { format, parseISO, subDays, startOfMonth, endOfMonth } from 'date-fns';
import {
  Eye,
  Camera,
  MapPin,
  AlertTriangle,
  ThumbsUp,
  AlertCircle,
  Award,
  Filter,
  Search,
  Plus,
  TrendingUp,
  TrendingDown,
  Calendar,
  CheckCircle,
  Clock,
  MessageSquare,
  BarChart3,
  PieChart,
  Activity,
  User,
  Building,
  Image,
  X,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  useObservations,
  useObservationStats,
  useLeadingIndicators,
  useCreateObservation,
  useAcknowledgeObservation,
  useRequireAction,
  useResolveObservation,
  useUploadObservationPhoto,
  useLeaderboard,
} from '../hooks/useSafetyObservations';
import {
  OBSERVATION_TYPE_CONFIG,
  CATEGORY_CONFIG,
  SEVERITY_CONFIG,
  STATUS_CONFIG,
  type SafetyObservation,
  type SafetyObservationType,
  type SafetyObservationCategory,
  type SafetyObservationStatus,
  type ObservationSeverity,
  type CreateObservationDTO,
  type ObservationFilters,
  getObservationTypeLabel,
  getCategoryLabel,
  getSeverityLabel,
  isPositiveObservation,
  requiresCorrectiveAction,
} from '@/types/safety-observations';
import { useAuth } from '@/lib/auth/AuthContext';
import { cn } from '@/lib/utils';

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Observation type icon
 */
function ObservationTypeIcon({ type }: { type: SafetyObservationType }) {
  const iconMap = {
    safe_behavior: ThumbsUp,
    unsafe_condition: AlertTriangle,
    near_miss: AlertCircle,
    best_practice: Award,
  };
  const Icon = iconMap[type] || Eye;
  const config = OBSERVATION_TYPE_CONFIG[type];

  return (
    <div
      className={cn(
        'p-2 rounded-full',
        config.color === 'green' && 'bg-green-100 text-green-600',
        config.color === 'orange' && 'bg-orange-100 text-orange-600',
        config.color === 'yellow' && 'bg-yellow-100 text-yellow-600',
        config.color === 'blue' && 'bg-blue-100 text-blue-600'
      )}
    >
      <Icon className="h-5 w-5" />
    </div>
  );
}

/**
 * Severity badge
 */
function SeverityBadge({ severity }: { severity: ObservationSeverity }) {
  const config = SEVERITY_CONFIG[severity];
  const colorClasses = {
    gray: 'bg-gray-100 text-gray-800 border-gray-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    orange: 'bg-orange-100 text-orange-800 border-orange-200',
    red: 'bg-red-100 text-red-800 border-red-200',
  };

  return (
    <Badge variant="outline" className={cn('font-medium', colorClasses[config.color])}>
      {config.label}
    </Badge>
  );
}

/**
 * Status badge
 */
function StatusBadge({ status }: { status: SafetyObservationStatus }) {
  const config = STATUS_CONFIG[status];
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    cyan: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    orange: 'bg-orange-100 text-orange-800 border-orange-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    green: 'bg-green-100 text-green-800 border-green-200',
    gray: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  return (
    <Badge variant="outline" className={cn('font-medium', colorClasses[config.color])}>
      {config.label}
    </Badge>
  );
}

/**
 * Stats overview cards
 */
function StatsOverview({ projectId }: { projectId?: string }) {
  const { data: stats, isLoading } = useObservationStats(projectId);
  const { data: indicators } = useLeadingIndicators(projectId);

  if (isLoading || !stats) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-8 bg-muted rounded w-20 mb-2" />
              <div className="h-4 bg-muted rounded w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const positiveRatio = stats.total_observations > 0
    ? Math.round(
        ((stats.safe_behavior_count + stats.best_practice_count) / stats.total_observations) * 100
      )
    : 0;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Total Observations</CardDescription>
          <CardTitle className="text-2xl flex items-center gap-2">
            {stats.total_observations}
            {stats.last_7_days > 0 && (
              <span className="text-sm font-normal text-green-600 flex items-center">
                <TrendingUp className="h-4 w-4 mr-1" />
                +{stats.last_7_days} this week
              </span>
            )}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Positive Observation Rate</CardDescription>
          <CardTitle className="text-2xl text-green-600">{positiveRatio}%</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={positiveRatio} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            Safe behaviors + Best practices
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Pending Actions</CardDescription>
          <CardTitle className="text-2xl text-orange-600">
            {stats.action_required_count}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            {stats.pending_count} awaiting acknowledgment
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Points Awarded</CardDescription>
          <CardTitle className="text-2xl text-blue-600">
            {stats.total_points_awarded.toLocaleString()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            This month: {stats.last_30_days} observations
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Trend chart placeholder
 */
function TrendAnalysis({ projectId }: { projectId?: string }) {
  const { data: stats } = useObservationStats(projectId);

  if (!stats) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Observation Trends
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {/* By Type */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">By Type</h4>
            {Object.entries(stats.by_type).map(([type, count]) => {
              const config = OBSERVATION_TYPE_CONFIG[type as SafetyObservationType];
              const percent = stats.total_observations > 0
                ? Math.round((count / stats.total_observations) * 100)
                : 0;
              return (
                <div key={type} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{config?.label || type}</span>
                    <span>{count} ({percent}%)</span>
                  </div>
                  <Progress
                    value={percent}
                    className={cn(
                      'h-2',
                      config?.color === 'green' && '[&>div]:bg-green-500',
                      config?.color === 'orange' && '[&>div]:bg-orange-500',
                      config?.color === 'yellow' && '[&>div]:bg-yellow-500',
                      config?.color === 'blue' && '[&>div]:bg-blue-500'
                    )}
                  />
                </div>
              );
            })}
          </div>

          {/* By Category - Top 5 */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Top Categories</h4>
            {Object.entries(stats.by_category)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([category, count]) => {
                const config = CATEGORY_CONFIG[category as SafetyObservationCategory];
                const percent = stats.total_observations > 0
                  ? Math.round((count / stats.total_observations) * 100)
                  : 0;
                return (
                  <div key={category} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{config?.label || category}</span>
                      <span>{count} ({percent}%)</span>
                    </div>
                    <Progress value={percent} className="h-2" />
                  </div>
                );
              })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Observation card
 */
function ObservationCard({
  observation,
  onAcknowledge,
  onRequireAction,
  onResolve,
  onClick,
}: {
  observation: SafetyObservation;
  onAcknowledge?: () => void;
  onRequireAction?: () => void;
  onResolve?: () => void;
  onClick?: () => void;
}) {
  const isPositive = isPositiveObservation(observation.observation_type);
  const needsAction = requiresCorrectiveAction(observation.observation_type);

  return (
    <Card
      className={cn(
        'cursor-pointer hover:shadow-md transition-shadow',
        observation.severity === 'critical' && 'border-red-300',
        observation.severity === 'high' && 'border-orange-300'
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <ObservationTypeIcon type={observation.observation_type} />
            <div>
              <CardTitle className="text-base">{observation.title}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <span>{observation.observation_number}</span>
                <span>-</span>
                <span>{format(parseISO(observation.observed_at), 'MMM d, yyyy h:mm a')}</span>
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <StatusBadge status={observation.status} />
            <SeverityBadge severity={observation.severity} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-2">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {observation.description}
        </p>

        <div className="flex flex-wrap gap-2 mt-3">
          <Badge variant="secondary">
            {getCategoryLabel(observation.category)}
          </Badge>
          {observation.location && (
            <Badge variant="outline" className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {observation.location}
            </Badge>
          )}
          {observation.photo_urls.length > 0 && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Camera className="h-3 w-3" />
              {observation.photo_urls.length} photo{observation.photo_urls.length !== 1 && 's'}
            </Badge>
          )}
          {observation.points_awarded > 0 && (
            <Badge variant="outline" className="flex items-center gap-1 text-blue-600">
              <Award className="h-3 w-3" />
              +{observation.points_awarded} pts
            </Badge>
          )}
        </div>

        {/* Positive observation: Show who was recognized */}
        {isPositive && observation.recognized_person && (
          <div className="mt-3 p-2 bg-green-50 rounded-md">
            <p className="text-sm">
              <span className="font-medium">Recognized:</span> {observation.recognized_person}
              {observation.recognized_company && ` (${observation.recognized_company})`}
            </p>
          </div>
        )}

        {/* Action required: Show corrective action */}
        {needsAction && observation.corrective_action && (
          <div className="mt-3 p-2 bg-orange-50 rounded-md">
            <p className="text-sm">
              <span className="font-medium">Corrective Action:</span>{' '}
              {observation.corrective_action}
            </p>
            {observation.due_date && (
              <p className="text-xs text-muted-foreground mt-1">
                Due: {format(parseISO(observation.due_date), 'MMM d, yyyy')}
              </p>
            )}
          </div>
        )}
      </CardContent>

      {(onAcknowledge || onRequireAction || onResolve) && (
        <CardFooter className="pt-2 gap-2" onClick={(e) => e.stopPropagation()}>
          {observation.status === 'submitted' && onAcknowledge && (
            <Button size="sm" variant="outline" onClick={onAcknowledge}>
              <CheckCircle className="h-4 w-4 mr-1" />
              Acknowledge
            </Button>
          )}
          {observation.status === 'acknowledged' && needsAction && onRequireAction && (
            <Button size="sm" variant="outline" onClick={onRequireAction}>
              <AlertTriangle className="h-4 w-4 mr-1" />
              Require Action
            </Button>
          )}
          {(observation.status === 'action_required' ||
            observation.status === 'in_progress') &&
            onResolve && (
              <Button size="sm" variant="outline" onClick={onResolve}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Resolve
              </Button>
            )}
        </CardFooter>
      )}
    </Card>
  );
}

// ============================================================================
// Quick Add Form
// ============================================================================

interface QuickAddFormProps {
  projectId: string;
  companyId: string;
  onSuccess?: () => void;
}

function QuickAddForm({ projectId, companyId, onSuccess }: QuickAddFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<CreateObservationDTO>>({
    observation_type: 'safe_behavior',
    category: 'ppe',
    severity: 'low',
    title: '',
    description: '',
    location: '',
  });

  const createMutation = useCreateObservation();
  const uploadPhotoMutation = useUploadObservationPhoto();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const observation = await createMutation.mutateAsync({
        ...formData,
        project_id: projectId,
        company_id: companyId,
      } as CreateObservationDTO);

      setIsOpen(false);
      setFormData({
        observation_type: 'safe_behavior',
        category: 'ppe',
        severity: 'low',
        title: '',
        description: '',
        location: '',
      });
      onSuccess?.();
    } catch (error) {
      console.error('Failed to create observation:', error);
    }
  };

  const isPositive = isPositiveObservation(formData.observation_type as SafetyObservationType);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Quick Add Observation
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              New Safety Observation
            </DialogTitle>
            <DialogDescription>
              Submit a safety observation for review and tracking.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type Selection */}
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(OBSERVATION_TYPE_CONFIG).map(([type, config]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, observation_type: type as SafetyObservationType })
                  }
                  className={cn(
                    'p-3 rounded-lg border-2 text-left transition-colors',
                    formData.observation_type === type
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-primary/50'
                  )}
                >
                  <div className="font-medium text-sm">{config.label}</div>
                  <div className="text-xs text-muted-foreground">{config.description}</div>
                </button>
              ))}
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                required
                placeholder="Brief description of what was observed"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                required
                placeholder="Provide details about the observation..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            {/* Category & Severity */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) =>
                    setFormData({ ...formData, category: v as SafetyObservationCategory })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_CONFIG).map(([value, config]) => (
                      <SelectItem key={value} value={value}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Severity</Label>
                <Select
                  value={formData.severity}
                  onValueChange={(v) =>
                    setFormData({ ...formData, severity: v as ObservationSeverity })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SEVERITY_CONFIG).map(([value, config]) => (
                      <SelectItem key={value} value={value}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </Label>
              <Input
                placeholder="Where did this occur? (e.g., Building A, Level 3)"
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>

            {/* Recognition (for positive) */}
            {isPositive && (
              <div className="space-y-4 p-3 bg-green-50 rounded-lg">
                <h4 className="font-medium text-sm text-green-800">Recognition Details</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Person Recognized</Label>
                    <Input
                      placeholder="Name of person"
                      value={formData.recognized_person || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, recognized_person: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Their Company</Label>
                    <Input
                      placeholder="Company name"
                      value={formData.recognized_company || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, recognized_company: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Recognition Message</Label>
                  <Textarea
                    placeholder="What specifically did they do well?"
                    value={formData.recognition_message || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, recognition_message: e.target.value })
                    }
                    rows={2}
                  />
                </div>
              </div>
            )}

            {/* Corrective Action (for at-risk) */}
            {requiresCorrectiveAction(formData.observation_type as SafetyObservationType) && (
              <div className="space-y-4 p-3 bg-orange-50 rounded-lg">
                <h4 className="font-medium text-sm text-orange-800">Corrective Action</h4>
                <div className="space-y-2">
                  <Label>Suggested Corrective Action</Label>
                  <Textarea
                    placeholder="What should be done to address this?"
                    value={formData.corrective_action || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, corrective_action: e.target.value })
                    }
                    rows={2}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Observation'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface SafetyObservationsProps {
  projectId: string;
  companyId?: string;
}

export function SafetyObservations({ projectId, companyId }: SafetyObservationsProps) {
  const { userProfile } = useAuth();
  const effectiveCompanyId = companyId || userProfile?.company_id || '';

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<SafetyObservationType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<SafetyObservationStatus | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'list' | 'trends' | 'leaderboard'>('list');

  // Filters
  const filters: ObservationFilters = useMemo(
    () => ({
      project_id: projectId,
      observation_type: selectedType !== 'all' ? selectedType : undefined,
      status: selectedStatus !== 'all' ? selectedStatus : undefined,
      search: searchQuery || undefined,
    }),
    [projectId, selectedType, selectedStatus, searchQuery]
  );

  // Queries
  const { data: observations, isLoading, refetch } = useObservations(filters);
  const { data: leaderboard } = useLeaderboard({ project_id: projectId, limit: 10 });

  // Mutations
  const acknowledgeMutation = useAcknowledgeObservation();
  const resolveMutation = useResolveObservation();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Eye className="h-6 w-6" />
            Safety Observations
          </h2>
          <p className="text-muted-foreground">
            Track and analyze safety observations across the project
          </p>
        </div>
        <QuickAddForm
          projectId={projectId}
          companyId={effectiveCompanyId}
          onSuccess={() => refetch()}
        />
      </div>

      {/* Stats */}
      <StatsOverview projectId={projectId} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Observations
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            Leaderboard
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
                  placeholder="Search observations..."
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
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(OBSERVATION_TYPE_CONFIG).map(([value, config]) => (
                  <SelectItem key={value} value={value}>
                    {config.label}
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
                {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                  <SelectItem key={value} value={value}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Observations Grid */}
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="pt-6">
                    <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-4 bg-muted rounded w-1/2 mb-4" />
                    <div className="h-16 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : observations?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No observations found. Start by adding a new observation.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {observations?.map((obs) => (
                <ObservationCard
                  key={obs.id}
                  observation={obs}
                  onAcknowledge={
                    obs.status === 'submitted'
                      ? () => acknowledgeMutation.mutate(obs.id)
                      : undefined
                  }
                  onResolve={
                    obs.status === 'action_required' || obs.status === 'in_progress'
                      ? () => resolveMutation.mutate({ id: obs.id, resolutionNotes: '' })
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends">
          <TrendAnalysis projectId={projectId} />
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                Top Observers
              </CardTitle>
              <CardDescription>
                Recognition for safety observation contributions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {leaderboard && leaderboard.length > 0 ? (
                <div className="space-y-4">
                  {leaderboard.map((entry, index) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                    >
                      <div
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center font-bold',
                          index === 0 && 'bg-yellow-100 text-yellow-700',
                          index === 1 && 'bg-gray-200 text-gray-700',
                          index === 2 && 'bg-orange-100 text-orange-700',
                          index > 2 && 'bg-muted text-muted-foreground'
                        )}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">
                          {entry.observer_name || entry.observer_email}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {entry.total_observations} observations - Current streak:{' '}
                          {entry.current_streak} days
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-blue-600">
                          {entry.total_points.toLocaleString()} pts
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {entry.monthly_points} this month
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No leaderboard data available yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default SafetyObservations;
