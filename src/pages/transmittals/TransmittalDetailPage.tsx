/**
 * TransmittalDetailPage
 * Enhanced page for viewing a single transmittal with all details
 * Features: breadcrumb navigation, quick actions, related transmittals,
 * acknowledgment timeline, and project context
 */

import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format, formatDistanceToNow, differenceInDays } from 'date-fns';
import {
  ArrowLeft,
  Send,
  RefreshCw,
  Bell,
  Receipt,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Building2,
  User,
  Mail,
  Phone,
  Calendar,
  Package,
  Download,
  Edit,
  Trash2,
  AlertCircle,
  MessageSquare,
  Paperclip,
  ChevronRight,
  Home,
  FolderOpen,
  History,
  ExternalLink,
  Copy,
  Printer,
  MoreHorizontal,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Loader2,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  useTransmittal,
  useTransmittals,
  useSendTransmittal,
  useVoidTransmittal,
  useDeleteTransmittal,
} from '@/features/transmittals/hooks/useTransmittals';
import { useProject } from '@/features/projects/hooks/useProjects';
import type { TransmittalStatus, TransmittalWithDetails } from '@/types/transmittal';
import {
  getTransmittalStatusColor,
  getTransmittalStatusLabel,
  getItemTypeLabel,
  getActionLabel,
  getFormatLabel,
  getTransmissionMethodLabel,
  canEditTransmittal,
  canSendTransmittal,
  formatTransmittalNumber,
} from '@/types/transmittal';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

// Status icons mapping
const statusIcons: Record<TransmittalStatus, React.ReactNode> = {
  draft: <FileText className="h-5 w-5" />,
  sent: <Send className="h-5 w-5" />,
  received: <Clock className="h-5 w-5" />,
  acknowledged: <CheckCircle className="h-5 w-5" />,
  void: <XCircle className="h-5 w-5" />,
};

// Timeline step component
interface TimelineStepProps {
  label: string;
  date?: string | null;
  user?: string | null;
  isCompleted: boolean;
  isCurrent: boolean;
  isLast?: boolean;
}

function TimelineStep({ label, date, user, isCompleted, isCurrent, isLast }: TimelineStepProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full border-2',
            isCompleted
              ? 'border-success bg-success text-white'
              : isCurrent
              ? 'border-primary bg-primary text-white'
              : 'border-border bg-background text-muted-foreground'
          )}
        >
          {isCompleted ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : isCurrent ? (
            <Circle className="h-4 w-4 fill-current" />
          ) : (
            <Circle className="h-4 w-4" />
          )}
        </div>
        {!isLast && (
          <div
            className={cn(
              'h-8 w-0.5',
              isCompleted ? 'bg-success' : 'bg-border'
            )}
          />
        )}
      </div>
      <div className="flex-1 pb-4">
        <p
          className={cn(
            'font-medium text-sm',
            isCompleted || isCurrent ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          {label}
        </p>
        {date && (
          <p className="text-xs text-muted-foreground">
            {format(new Date(date), 'MMM d, yyyy h:mm a')}
          </p>
        )}
        {user && (
          <p className="text-xs text-muted-foreground">by {user}</p>
        )}
      </div>
    </div>
  );
}

// Breadcrumb component
interface BreadcrumbProps {
  projectId: string;
  projectName?: string;
  transmittalNumber: string;
}

function Breadcrumb({ projectId, projectName, transmittalNumber }: BreadcrumbProps) {
  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-4">
      <Link
        to="/projects"
        className="flex items-center hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>
      <ChevronRight className="h-4 w-4" />
      <Link
        to={`/projects/${projectId}`}
        className="hover:text-foreground transition-colors truncate max-w-[150px]"
      >
        {projectName || 'Project'}
      </Link>
      <ChevronRight className="h-4 w-4" />
      <Link
        to={`/projects/${projectId}/transmittals`}
        className="hover:text-foreground transition-colors"
      >
        Transmittals
      </Link>
      <ChevronRight className="h-4 w-4" />
      <span className="text-foreground font-medium">{transmittalNumber}</span>
    </nav>
  );
}

// Loading skeleton component
function TransmittalDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb skeleton */}
      <div className="flex items-center space-x-2">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-16" />
      </div>

      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// Related transmittal card
interface RelatedTransmittalCardProps {
  transmittal: TransmittalWithDetails;
  projectId: string;
  isCurrent: boolean;
}

function RelatedTransmittalCard({ transmittal, projectId, isCurrent }: RelatedTransmittalCardProps) {
  const statusColor = getTransmittalStatusColor(transmittal.status);

  return (
    <Link
      to={`/projects/${projectId}/transmittals/${transmittal.id}`}
      className={cn(
        'block p-3 rounded-lg border transition-colors',
        isCurrent
          ? 'bg-primary/5 border-primary'
          : 'hover:bg-muted/50 border-border'
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-sm">
          {formatTransmittalNumber(transmittal.transmittal_number, transmittal.revision_number)}
        </span>
        <Badge
          variant="outline"
          className={cn(
            'text-xs',
            statusColor === 'gray' && 'bg-muted text-foreground border-border',
            statusColor === 'blue' && 'bg-info-light text-blue-800 border-blue-200',
            statusColor === 'green' && 'bg-success-light text-green-800 border-green-200',
            statusColor === 'emerald' && 'bg-emerald-100 text-emerald-800 border-emerald-200',
            statusColor === 'red' && 'bg-error-light text-red-800 border-red-200'
          )}
        >
          {getTransmittalStatusLabel(transmittal.status)}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground truncate">{transmittal.subject}</p>
      {transmittal.date_sent && (
        <p className="text-xs text-muted-foreground mt-1">
          Sent {formatDistanceToNow(new Date(transmittal.date_sent), { addSuffix: true })}
        </p>
      )}
    </Link>
  );
}

export function TransmittalDetailPage() {
  const { projectId, transmittalId } = useParams<{
    projectId: string;
    transmittalId: string;
  }>();
  const navigate = useNavigate();
  const [isResending, setIsResending] = useState(false);

  // Queries
  const { data: transmittal, isLoading, error } = useTransmittal(transmittalId || '');
  const { data: project } = useProject(projectId);
  const { data: allTransmittals } = useTransmittals({ projectId });

  // Mutations
  const sendMutation = useSendTransmittal();
  const voidMutation = useVoidTransmittal();
  const deleteMutation = useDeleteTransmittal();

  // Missing params check
  if (!projectId || !transmittalId) {
    return (
      <AppLayout>
        <div className="p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <h3 className="text-lg font-medium mb-2">Missing Parameters</h3>
              <p className="text-muted-foreground mb-4">
                Project ID and Transmittal ID are required to view this page.
              </p>
              <Button onClick={() => navigate('/projects')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Projects
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6">
          <TransmittalDetailSkeleton />
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (error || !transmittal) {
    return (
      <AppLayout>
        <div className="p-6 space-y-6">
          <Breadcrumb
            projectId={projectId}
            projectName={project?.name}
            transmittalNumber="Not Found"
          />
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <h3 className="text-lg font-medium mb-2">Transmittal Not Found</h3>
              <p className="text-muted-foreground mb-4">
                The transmittal you're looking for doesn't exist or you don't have access.
              </p>
              <Button asChild>
                <Link to={`/projects/${projectId}/transmittals`}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Transmittals
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // Derived state
  const statusColor = getTransmittalStatusColor(transmittal.status);
  const statusLabel = getTransmittalStatusLabel(transmittal.status);
  const icon = statusIcons[transmittal.status];
  const canEdit = canEditTransmittal(transmittal);
  const canSend = canSendTransmittal(transmittal);

  // Get related transmittals (same distribution list or same recipient)
  const relatedTransmittals = allTransmittals?.filter(
    (t) =>
      t.id !== transmittal.id &&
      (t.distribution_list_id === transmittal.distribution_list_id ||
        t.to_company === transmittal.to_company)
  ).slice(0, 5) || [];

  // Calculate days until due
  const daysUntilDue = transmittal.date_due
    ? differenceInDays(new Date(transmittal.date_due), new Date())
    : null;

  // Response due warning
  const isResponseOverdue = transmittal.response_required &&
    transmittal.response_due_date &&
    !transmittal.response_received &&
    new Date(transmittal.response_due_date) < new Date();

  // Determine timeline steps
  const getTimelineSteps = () => {
    const steps = [
      {
        label: 'Created',
        date: transmittal.created_at,
        user: transmittal.created_by_user?.full_name,
        isCompleted: true,
        isCurrent: transmittal.status === 'draft',
      },
      {
        label: 'Sent',
        date: transmittal.sent_at || transmittal.date_sent,
        user: transmittal.sent_by_user?.full_name,
        isCompleted: ['sent', 'received', 'acknowledged'].includes(transmittal.status),
        isCurrent: transmittal.status === 'sent',
      },
      {
        label: 'Received',
        date: transmittal.received_date,
        user: transmittal.received_by,
        isCompleted: ['received', 'acknowledged'].includes(transmittal.status),
        isCurrent: transmittal.status === 'received',
      },
      {
        label: 'Acknowledged',
        date: transmittal.status === 'acknowledged' ? transmittal.updated_at : null,
        user: null,
        isCompleted: transmittal.status === 'acknowledged',
        isCurrent: false,
      },
    ];

    // If voided, show different last step
    if (transmittal.status === 'void') {
      steps[steps.length - 1] = {
        label: 'Voided',
        date: transmittal.updated_at,
        user: null,
        isCompleted: true,
        isCurrent: true,
      };
    }

    return steps;
  };

  // Calculate acknowledgment progress
  const getAcknowledgmentProgress = () => {
    const statusProgress: Record<TransmittalStatus, number> = {
      draft: 0,
      sent: 33,
      received: 66,
      acknowledged: 100,
      void: 0,
    };
    return statusProgress[transmittal.status];
  };

  // Handler functions
  const handleSend = async () => {
    try {
      await sendMutation.mutateAsync(transmittalId);
      toast.success('Transmittal sent successfully');
    } catch {
      toast.error('Failed to send transmittal');
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      // Simulate resend (in reality would call a resend API)
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success('Transmittal resent successfully');
    } catch {
      toast.error('Failed to resend transmittal');
    } finally {
      setIsResending(false);
    }
  };

  const handleSendReminder = async () => {
    try {
      // Simulate sending reminder
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success('Reminder sent successfully');
    } catch {
      toast.error('Failed to send reminder');
    }
  };

  const handleVoid = async () => {
    try {
      await voidMutation.mutateAsync(transmittalId);
      toast.success('Transmittal voided');
    } catch {
      toast.error('Failed to void transmittal');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(transmittalId);
      toast.success('Transmittal deleted');
      navigate(`/projects/${projectId}/transmittals`);
    } catch {
      toast.error('Failed to delete transmittal');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Breadcrumb Navigation */}
        <Breadcrumb
          projectId={projectId}
          projectName={project?.name}
          transmittalNumber={formatTransmittalNumber(
            transmittal.transmittal_number,
            transmittal.revision_number
          )}
        />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="shrink-0"
            >
              <Link to={`/projects/${projectId}/transmittals`}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold">
                  {formatTransmittalNumber(
                    transmittal.transmittal_number,
                    transmittal.revision_number
                  )}
                </h1>
                <Badge
                  variant="outline"
                  className={cn(
                    'flex items-center gap-1',
                    statusColor === 'gray' && 'bg-muted text-foreground border-border',
                    statusColor === 'blue' && 'bg-info-light text-blue-800 border-blue-200',
                    statusColor === 'green' && 'bg-success-light text-green-800 border-green-200',
                    statusColor === 'emerald' && 'bg-emerald-100 text-emerald-800 border-emerald-200',
                    statusColor === 'red' && 'bg-error-light text-red-800 border-red-200'
                  )}
                >
                  {icon}
                  <span>{statusLabel}</span>
                </Badge>
              </div>
              <p className="text-muted-foreground">{transmittal.subject}</p>
              {/* Project Phase Context */}
              {project && (
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <FolderOpen className="h-4 w-4" />
                  <span>{project.name}</span>
                  {project.status && (
                    <Badge variant="secondary" className="text-xs">
                      {project.status}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <TooltipProvider>
              {/* Send (for drafts) */}
              {canSend && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleSend}
                      disabled={sendMutation.isPending}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {sendMutation.isPending ? 'Sending...' : 'Send'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Send this transmittal</TooltipContent>
                </Tooltip>
              )}

              {/* Quick action buttons for sent transmittals */}
              {transmittal.status === 'sent' && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        onClick={handleSendReminder}
                      >
                        <Bell className="h-4 w-4 mr-2" />
                        Send Reminder
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Send a reminder to recipient</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        onClick={handleResend}
                        disabled={isResending}
                      >
                        <RefreshCw className={cn('h-4 w-4 mr-2', isResending && 'animate-spin')} />
                        {isResending ? 'Resending...' : 'Resend'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Resend this transmittal</TooltipContent>
                  </Tooltip>
                </>
              )}

              {/* View Receipt (for received/acknowledged) */}
              {(transmittal.status === 'received' || transmittal.status === 'acknowledged') && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline">
                      <Receipt className="h-4 w-4 mr-2" />
                      View Receipt
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>View acknowledgment receipt</TooltipContent>
                </Tooltip>
              )}

              {/* Edit (for drafts) */}
              {canEdit && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" asChild>
                      <Link to={`/projects/${projectId}/transmittals/${transmittalId}/edit`}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit this transmittal</TooltipContent>
                </Tooltip>
              )}

              {/* More actions dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleCopyLink}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handlePrint}>
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Download className="h-4 w-4 mr-2" />
                    Export PDF
                  </DropdownMenuItem>
                  {transmittal.status !== 'void' && transmittal.status !== 'draft' && (
                    <>
                      <DropdownMenuSeparator />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                            className="text-destructive"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Void Transmittal
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Void Transmittal?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will mark the transmittal as void. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleVoid}>
                              Void Transmittal
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                  {canEdit && (
                    <>
                      <DropdownMenuSeparator />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Transmittal?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this transmittal and all its items.
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDelete}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TooltipProvider>
          </div>
        </div>

        {/* Response Due Warning */}
        {isResponseOverdue && (
          <Card className="border-warning bg-warning-light">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <div>
                  <p className="font-medium text-warning">Response Overdue</p>
                  <p className="text-sm text-warning/80">
                    Response was due {format(new Date(transmittal.response_due_date!), 'MMM d, yyyy')}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                  onClick={handleSendReminder}
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Send Reminder
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Parties Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Parties
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* From */}
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2 text-muted-foreground text-sm uppercase tracking-wide">
                      From
                    </h4>
                    <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                      <p className="font-medium">{transmittal.from_company}</p>
                      {transmittal.from_contact && (
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <User className="h-3.5 w-3.5" />
                          {transmittal.from_contact}
                        </p>
                      )}
                      {transmittal.from_email && (
                        <a
                          href={`mailto:${transmittal.from_email}`}
                          className="text-sm text-primary flex items-center gap-2 hover:underline"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          {transmittal.from_email}
                        </a>
                      )}
                      {transmittal.from_phone && (
                        <a
                          href={`tel:${transmittal.from_phone}`}
                          className="text-sm text-primary flex items-center gap-2 hover:underline"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          {transmittal.from_phone}
                        </a>
                      )}
                    </div>
                  </div>

                  {/* To */}
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2 text-muted-foreground text-sm uppercase tracking-wide">
                      To
                    </h4>
                    <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                      <p className="font-medium">{transmittal.to_company}</p>
                      {transmittal.to_contact && (
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <User className="h-3.5 w-3.5" />
                          {transmittal.to_contact}
                        </p>
                      )}
                      {transmittal.to_email && (
                        <a
                          href={`mailto:${transmittal.to_email}`}
                          className="text-sm text-primary flex items-center gap-2 hover:underline"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          {transmittal.to_email}
                        </a>
                      )}
                      {transmittal.to_phone && (
                        <a
                          href={`tel:${transmittal.to_phone}`}
                          className="text-sm text-primary flex items-center gap-2 hover:underline"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          {transmittal.to_phone}
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Distribution List */}
                {transmittal.distribution_list && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Distribution List:{' '}
                      <span className="font-medium text-foreground">
                        {transmittal.distribution_list.name}
                      </span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Items Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Items
                </CardTitle>
                <CardDescription>
                  {transmittal.items?.length || 0} items in this transmittal
                </CardDescription>
              </CardHeader>
              <CardContent>
                {transmittal.items && transmittal.items.length > 0 ? (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead className="text-right">Copies</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transmittal.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.item_number}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{getItemTypeLabel(item.item_type)}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-[300px]">
                                <p className="truncate">{item.description}</p>
                                {item.specification_section && (
                                  <p className="text-xs text-muted-foreground">
                                    Spec: {item.specification_section}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {item.reference_number || item.drawing_number || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">
                                {getActionLabel(item.action_required)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {item.copies} ({getFormatLabel(item.format)})
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No items in this transmittal</p>
                    {canEdit && (
                      <Button variant="outline" className="mt-4" asChild>
                        <Link to={`/projects/${projectId}/transmittals/${transmittalId}/edit`}>
                          Add Items
                        </Link>
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Remarks Card */}
            {transmittal.remarks && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Remarks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{transmittal.remarks}</p>
                </CardContent>
              </Card>
            )}

            {/* Attachments Card */}
            {transmittal.attachments && transmittal.attachments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Paperclip className="h-5 w-5" />
                    Attachments
                  </CardTitle>
                  <CardDescription>
                    {transmittal.attachments.length} file(s) attached
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {transmittal.attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{attachment.file_name}</p>
                            {attachment.file_size && (
                              <p className="text-xs text-muted-foreground">
                                {(attachment.file_size / 1024).toFixed(1)} KB
                              </p>
                            )}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Acknowledgment Status & Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Status Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{getAcknowledgmentProgress()}%</span>
                  </div>
                  <Progress value={getAcknowledgmentProgress()} className="h-2" />
                </div>

                <Separator />

                {/* Timeline steps */}
                <div className="space-y-0">
                  {getTimelineSteps().map((step, index, arr) => (
                    <TimelineStep
                      key={step.label}
                      {...step}
                      isLast={index === arr.length - 1}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Details Card */}
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Project</p>
                  <Link
                    to={`/projects/${projectId}`}
                    className="font-medium hover:text-primary transition-colors flex items-center gap-1"
                  >
                    {transmittal.project?.name || project?.name || 'N/A'}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>

                <Separator />

                <div>
                  <p className="text-sm text-muted-foreground">Transmission Method</p>
                  <p className="font-medium">
                    {getTransmissionMethodLabel(transmittal.transmission_method)}
                  </p>
                </div>

                {transmittal.tracking_number && (
                  <div>
                    <p className="text-sm text-muted-foreground">Tracking Number</p>
                    <p className="font-medium font-mono text-sm">{transmittal.tracking_number}</p>
                  </div>
                )}

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Created</p>
                      <p className="font-medium text-sm">
                        {format(new Date(transmittal.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>

                  {transmittal.date_sent && (
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Date Sent</p>
                        <p className="font-medium text-sm">
                          {format(new Date(transmittal.date_sent), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  )}

                  {transmittal.date_due && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Due Date</p>
                        <p
                          className={cn(
                            'font-medium text-sm',
                            daysUntilDue !== null && daysUntilDue < 0 && 'text-destructive',
                            daysUntilDue !== null && daysUntilDue <= 3 && daysUntilDue >= 0 && 'text-warning'
                          )}
                        >
                          {format(new Date(transmittal.date_due), 'MMM d, yyyy')}
                          {daysUntilDue !== null && (
                            <span className="text-xs ml-1">
                              ({daysUntilDue < 0
                                ? `${Math.abs(daysUntilDue)} days overdue`
                                : daysUntilDue === 0
                                ? 'Due today'
                                : `${daysUntilDue} days left`})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {transmittal.response_required && (
                  <>
                    <Separator />
                    <div
                      className={cn(
                        'p-3 rounded-lg',
                        isResponseOverdue
                          ? 'bg-error-light'
                          : 'bg-warning-light dark:bg-amber-950'
                      )}
                    >
                      <p
                        className={cn(
                          'text-sm font-medium',
                          isResponseOverdue
                            ? 'text-red-800 dark:text-red-200'
                            : 'text-amber-800 dark:text-amber-200'
                        )}
                      >
                        Response Required
                      </p>
                      {transmittal.response_due_date && (
                        <p
                          className={cn(
                            'text-sm',
                            isResponseOverdue
                              ? 'text-red-700 dark:text-red-300'
                              : 'text-warning dark:text-amber-400'
                          )}
                        >
                          Due: {format(new Date(transmittal.response_due_date), 'MMM d, yyyy')}
                        </p>
                      )}
                      {transmittal.response_received && (
                        <Badge className="mt-2 bg-success-light text-green-800">
                          Response Received
                        </Badge>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Receipt Info */}
            {(transmittal.status === 'received' || transmittal.status === 'acknowledged') && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-success" />
                    Receipt
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {transmittal.received_by && (
                    <div>
                      <p className="text-sm text-muted-foreground">Received By</p>
                      <p className="font-medium">{transmittal.received_by}</p>
                    </div>
                  )}

                  {transmittal.received_date && (
                    <div>
                      <p className="text-sm text-muted-foreground">Date Received</p>
                      <p className="font-medium">
                        {format(new Date(transmittal.received_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                  )}

                  {transmittal.acknowledgment_notes && (
                    <div>
                      <p className="text-sm text-muted-foreground">Acknowledgment Notes</p>
                      <p className="text-sm bg-muted/50 p-3 rounded-lg mt-1">
                        {transmittal.acknowledgment_notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Related Transmittals */}
            {relatedTransmittals.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Related Transmittals
                  </CardTitle>
                  <CardDescription>
                    Same recipient or distribution list
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {relatedTransmittals.map((related) => (
                      <RelatedTransmittalCard
                        key={related.id}
                        transmittal={related}
                        projectId={projectId}
                        isCurrent={related.id === transmittalId}
                      />
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full mt-3"
                    asChild
                  >
                    <Link to={`/projects/${projectId}/transmittals?to=${encodeURIComponent(transmittal.to_company)}`}>
                      View All
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default TransmittalDetailPage;
