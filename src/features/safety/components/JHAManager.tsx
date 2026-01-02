/**
 * JHA Manager Component
 *
 * Comprehensive Job Hazard Analysis management dashboard including:
 * - JHA list with filtering and search
 * - Status tracking (draft, pending review, approved, in progress, completed)
 * - Risk level indicators
 * - Worker acknowledgment tracking
 * - Link to daily reports
 * - Statistics and analytics
 */

import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format, parseISO, differenceInDays } from 'date-fns';
import {
  Shield,
  Calendar,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  Send,
  Copy,
  FileSignature,
  ClipboardCheck,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Link as LinkIcon,
  MoreVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import {
  useJHAs,
  useJHAStatistics,
  usePendingAcknowledgments,
  useSubmitJHAForReview,
  useApproveJHA,
  useCompleteJHA,
  type JHAStatistics,
} from '../hooks/useJHA';
import { useAuth } from '@/lib/auth/AuthContext';
import { cn } from '@/lib/utils';
import type { RiskLevel, JSAWithDetails } from '@/types/jsa';

// ============================================================================
// Types
// ============================================================================

interface JHAManagerProps {
  projectId: string;
  className?: string;
}

type JHAStatus = 'draft' | 'pending_review' | 'approved' | 'in_progress' | 'completed';

// ============================================================================
// Constants
// ============================================================================

const STATUS_CONFIG: Record<JHAStatus, { label: string; color: string; bgColor: string }> = {
  draft: { label: 'Draft', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  pending_review: { label: 'Pending Review', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  approved: { label: 'Approved', color: 'text-green-600', bgColor: 'bg-green-100' },
  in_progress: { label: 'In Progress', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  completed: { label: 'Completed', color: 'text-purple-600', bgColor: 'bg-purple-100' },
};

const RISK_LEVEL_CONFIG: Record<RiskLevel, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Low', color: 'text-green-600', bgColor: 'bg-green-100' },
  medium: { label: 'Medium', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  high: { label: 'High', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  critical: { label: 'Critical', color: 'text-red-600', bgColor: 'bg-red-100' },
};

// ============================================================================
// Helper Components
// ============================================================================

function StatusBadge({ status }: { status: JHAStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={cn('font-medium', config.bgColor, config.color)}>
      {config.label}
    </Badge>
  );
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const config = RISK_LEVEL_CONFIG[level];
  return (
    <Badge variant="outline" className={cn('font-medium', config.bgColor, config.color)}>
      {config.label}
    </Badge>
  );
}

function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'blue',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: { value: number; positive: boolean };
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
  };

  return (
    <Card className={cn('border', colorClasses[color])}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <Icon className="h-8 w-8 opacity-50" />
        </div>
        {trend && (
          <div className="mt-2 flex items-center text-xs">
            {trend.positive ? (
              <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-1 text-red-600" />
            )}
            <span className={trend.positive ? 'text-green-600' : 'text-red-600'}>
              {trend.value}%
            </span>
            <span className="text-muted-foreground ml-1">vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function JHARow({
  jha,
  onView,
  onEdit,
  onSubmit,
  onApprove,
  onComplete,
}: {
  jha: JSAWithDetails;
  onView: () => void;
  onEdit: () => void;
  onSubmit: () => void;
  onApprove: () => void;
  onComplete: () => void;
}) {
  const daysUntil = jha.scheduled_date
    ? differenceInDays(parseISO(jha.scheduled_date), new Date())
    : null;

  return (
    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={onView}>
      <TableCell>
        <div>
          <div className="font-medium">{jha.jsa_number}</div>
          <div className="text-sm text-muted-foreground line-clamp-1">
            {jha.task_description}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <StatusBadge status={jha.status as JHAStatus} />
      </TableCell>
      <TableCell>
        {jha.max_risk_level ? (
          <RiskBadge level={jha.max_risk_level as RiskLevel} />
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        {jha.scheduled_date ? (
          <div>
            <div>{format(parseISO(jha.scheduled_date), 'MMM d, yyyy')}</div>
            {daysUntil !== null && daysUntil >= 0 && daysUntil <= 7 && (
              <div className="text-xs text-muted-foreground">
                {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`}
              </div>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">Not scheduled</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{jha.acknowledgment_count || 0}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          <span>{jha.hazard_count || 0}</span>
        </div>
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onView}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            {(jha.status === 'draft' || jha.status === 'pending_review') && (
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {jha.status === 'draft' && (
              <DropdownMenuItem onClick={onSubmit}>
                <Send className="h-4 w-4 mr-2" />
                Submit for Review
              </DropdownMenuItem>
            )}
            {jha.status === 'pending_review' && (
              <DropdownMenuItem onClick={onApprove}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </DropdownMenuItem>
            )}
            {jha.status === 'in_progress' && (
              <DropdownMenuItem onClick={onComplete}>
                <ClipboardCheck className="h-4 w-4 mr-2" />
                Mark Complete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function JHAManager({ projectId, className }: JHAManagerProps) {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  // State
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'active' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');

  // Queries
  const { data: jhas, isLoading, refetch } = useJHAs({
    projectId,
    status: statusFilter !== 'all' ? (statusFilter as JHAStatus) : undefined,
    riskLevel: riskFilter !== 'all' ? (riskFilter as RiskLevel) : undefined,
    search: searchQuery || undefined,
  });
  const { data: stats } = useJHAStatistics(projectId);
  const { data: pendingAcks } = usePendingAcknowledgments(projectId);

  // Mutations
  const submitMutation = useSubmitJHAForReview();
  const approveMutation = useApproveJHA();
  const completeMutation = useCompleteJHA();

  // Filtered data based on active tab
  const filteredJHAs = useMemo(() => {
    if (!jhas) return [];

    switch (activeTab) {
      case 'pending':
        return jhas.filter((j) => j.status === 'pending_review');
      case 'active':
        return jhas.filter((j) => ['approved', 'in_progress'].includes(j.status));
      case 'completed':
        return jhas.filter((j) => j.status === 'completed');
      default:
        return jhas;
    }
  }, [jhas, activeTab]);

  // Handlers
  const handleView = (jhaId: string) => {
    navigate(`/projects/${projectId}/jha/${jhaId}`);
  };

  const handleEdit = (jhaId: string) => {
    navigate(`/projects/${projectId}/jha/${jhaId}/edit`);
  };

  const handleSubmit = async (jhaId: string) => {
    await submitMutation.mutateAsync(jhaId);
    refetch();
  };

  const handleApprove = async (jhaId: string) => {
    await approveMutation.mutateAsync({ jhaId });
    refetch();
  };

  const handleComplete = async (jhaId: string) => {
    await completeMutation.mutateAsync({ jhaId });
    refetch();
  };

  const handleCreateNew = () => {
    navigate(`/projects/${projectId}/jha/new`);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Job Hazard Analysis
          </h2>
          <p className="text-muted-foreground">
            Create and manage job hazard analyses for safe work planning
          </p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Create JHA
        </Button>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatsCard
            title="Total JHAs"
            value={stats.total_jhas}
            icon={FileText}
            color="blue"
          />
          <StatsCard
            title="Pending Review"
            value={stats.pending_review}
            icon={Clock}
            color="yellow"
          />
          <StatsCard
            title="Approved"
            value={stats.approved}
            icon={CheckCircle}
            color="green"
          />
          <StatsCard
            title="High/Critical Risk"
            value={stats.high_risk_count + stats.critical_risk_count}
            icon={AlertTriangle}
            color="red"
          />
          <StatsCard
            title="Completion Rate"
            value={`${stats.completion_rate}%`}
            icon={BarChart3}
            color="purple"
          />
        </div>
      )}

      {/* Alerts */}
      {stats && stats.pending_review > 0 && (
        <Alert className="border-yellow-500 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800">Action Required</AlertTitle>
          <AlertDescription className="text-yellow-700">
            {stats.pending_review} JHA{stats.pending_review !== 1 && 's'} pending review.
          </AlertDescription>
        </Alert>
      )}

      {pendingAcks && pendingAcks.length > 0 && (
        <Alert className="border-blue-500 bg-blue-50">
          <FileSignature className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Worker Acknowledgments Needed</AlertTitle>
          <AlertDescription className="text-blue-700">
            {pendingAcks.length} active JHA{pendingAcks.length !== 1 && 's'} need worker sign-offs.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs and Content */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="all" className="flex items-center gap-2">
              All
              <Badge variant="secondary" className="ml-1">{jhas?.length || 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              Pending Review
              {stats?.pending_review ? (
                <Badge variant="destructive" className="ml-1">{stats.pending_review}</Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search JHAs..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending_review">Pending Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Risk Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risks</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>JHA / Task</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Acknowledgments</TableHead>
                <TableHead>Hazards</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Loading JHAs...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredJHAs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No JHAs found</p>
                      <Button variant="link" onClick={handleCreateNew}>
                        Create your first JHA
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredJHAs.map((jha) => (
                  <JHARow
                    key={jha.id}
                    jha={jha}
                    onView={() => handleView(jha.id)}
                    onEdit={() => handleEdit(jha.id)}
                    onSubmit={() => handleSubmit(jha.id)}
                    onApprove={() => handleApprove(jha.id)}
                    onComplete={() => handleComplete(jha.id)}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </Tabs>

      {/* Risk Distribution */}
      {stats && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                Risk Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      Low Risk
                    </span>
                    <span className="font-medium">
                      {stats.total_jhas - stats.high_risk_count - stats.critical_risk_count}
                    </span>
                  </div>
                  <Progress
                    value={
                      stats.total_jhas > 0
                        ? ((stats.total_jhas - stats.high_risk_count - stats.critical_risk_count) /
                            stats.total_jhas) *
                          100
                        : 0
                    }
                    className="h-2 [&>div]:bg-green-500"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500" />
                      High Risk
                    </span>
                    <span className="font-medium">{stats.high_risk_count}</span>
                  </div>
                  <Progress
                    value={
                      stats.total_jhas > 0
                        ? (stats.high_risk_count / stats.total_jhas) * 100
                        : 0
                    }
                    className="h-2 [&>div]:bg-orange-500"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      Critical Risk
                    </span>
                    <span className="font-medium">{stats.critical_risk_count}</span>
                  </div>
                  <Progress
                    value={
                      stats.total_jhas > 0
                        ? (stats.critical_risk_count / stats.total_jhas) * 100
                        : 0
                    }
                    className="h-2 [&>div]:bg-red-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileSignature className="h-4 w-4" />
                Acknowledgment Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Acknowledgments</span>
                  <span className="text-2xl font-bold">{stats.total_acknowledgments}</span>
                </div>
                <Separator />
                <div className="text-sm text-muted-foreground">
                  Average of{' '}
                  <span className="font-medium text-foreground">
                    {stats.avg_hazards_per_jha}
                  </span>{' '}
                  hazards identified per JHA
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default JHAManager;
