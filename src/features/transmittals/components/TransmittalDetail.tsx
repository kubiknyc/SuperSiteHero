/**
 * TransmittalDetail Component
 * Displays detailed view of a single transmittal
 */

import { format } from 'date-fns';
import {
  FileText,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  Building2,
  User,
  Mail,
  Phone,
  Package,
  Download,
  Edit,
  Trash2,
  AlertCircle,
  MessageSquare,
  Paperclip,
  ArrowLeft,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
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
  useTransmittal,
  useSendTransmittal,
  useVoidTransmittal,
  useDeleteTransmittal,
} from '../hooks/useTransmittals';
import {
  type TransmittalStatus,
  getTransmittalStatusColor,
  getTransmittalStatusLabel,
  getItemTypeLabel,
  getActionLabel,
  getFormatLabel,
  getTransmissionMethodLabel,
  canEditTransmittal,
  canSendTransmittal,
} from '@/types/transmittal';

interface TransmittalDetailProps {
  transmittalId: string;
  projectId: string;
}

const statusIcons: Record<TransmittalStatus, React.ReactNode> = {
  draft: <FileText className="h-5 w-5" />,
  sent: <Send className="h-5 w-5" />,
  received: <Clock className="h-5 w-5" />,
  acknowledged: <CheckCircle className="h-5 w-5" />,
  void: <XCircle className="h-5 w-5" />,
};

export function TransmittalDetail({ transmittalId, projectId }: TransmittalDetailProps) {
  const navigate = useNavigate();
  const { data: transmittal, isLoading, error } = useTransmittal(transmittalId);
  const sendMutation = useSendTransmittal();
  const voidMutation = useVoidTransmittal();
  const deleteMutation = useDeleteTransmittal();

  const handleSend = async () => {
    await sendMutation.mutateAsync(transmittalId);
  };

  const handleVoid = async () => {
    await voidMutation.mutateAsync(transmittalId);
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(transmittalId);
    navigate(`/projects/${projectId}/transmittals`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !transmittal) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h3 className="text-lg font-medium mb-2 heading-subsection">Transmittal Not Found</h3>
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
    );
  }

  const statusColor = getTransmittalStatusColor(transmittal.status);
  const statusLabel = getTransmittalStatusLabel(transmittal.status);
  const icon = statusIcons[transmittal.status];
  const canEdit = canEditTransmittal(transmittal);
  const canSend = canSendTransmittal(transmittal);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Button variant="ghost" size="icon" asChild>
              <Link to={`/projects/${projectId}/transmittals`}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold heading-page">{transmittal.transmittal_number}</h1>
            <Badge
              variant="outline"
              className={`
                ${statusColor === 'gray' ? 'bg-muted text-foreground border-border' : ''}
                ${statusColor === 'blue' ? 'bg-info-light text-blue-800 border-blue-200' : ''}
                ${statusColor === 'green' ? 'bg-success-light text-green-800 border-green-200' : ''}
                ${statusColor === 'emerald' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : ''}
                ${statusColor === 'red' ? 'bg-error-light text-red-800 border-red-200' : ''}
              `}
            >
              <span className="mr-1">{icon}</span>
              {statusLabel}
            </Badge>
          </div>
          <p className="text-muted-foreground">{transmittal.subject}</p>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <Button variant="outline" asChild>
              <Link to={`/projects/${projectId}/transmittals/${transmittalId}/edit`}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
          )}

          {canSend && (
            <Button onClick={handleSend} disabled={sendMutation.isPending}>
              <Send className="h-4 w-4 mr-2" />
              {sendMutation.isPending ? 'Sending...' : 'Send'}
            </Button>
          )}

          {transmittal.status !== 'void' && transmittal.status !== 'draft' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  <XCircle className="h-4 w-4 mr-2" />
                  Void
                </Button>
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
          )}

          {canEdit && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
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
          )}

          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Parties */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* From */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2 text-muted-foreground heading-card">
                    <Building2 className="h-4 w-4" />
                    From
                  </h4>
                  <div>
                    <p className="font-medium">{transmittal.from_company}</p>
                    {transmittal.from_contact && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {transmittal.from_contact}
                      </p>
                    )}
                    {transmittal.from_email && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {transmittal.from_email}
                      </p>
                    )}
                    {transmittal.from_phone && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {transmittal.from_phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* To */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2 text-muted-foreground heading-card">
                    <Building2 className="h-4 w-4" />
                    To
                  </h4>
                  <div>
                    <p className="font-medium">{transmittal.to_company}</p>
                    {transmittal.to_contact && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {transmittal.to_contact}
                      </p>
                    )}
                    {transmittal.to_email && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {transmittal.to_email}
                      </p>
                    )}
                    {transmittal.to_phone && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {transmittal.to_phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Items ({transmittal.items?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transmittal.items && transmittal.items.length > 0 ? (
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
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No items in this transmittal
                </p>
              )}
            </CardContent>
          </Card>

          {/* Remarks */}
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

          {/* Attachments */}
          {transmittal.attachments && transmittal.attachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Paperclip className="h-5 w-5" />
                  Attachments ({transmittal.attachments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {transmittal.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
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
          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Project</p>
                <p className="font-medium">{transmittal.project?.name || 'N/A'}</p>
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
                  <p className="font-medium">{transmittal.tracking_number}</p>
                </div>
              )}

              <Separator />

              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">
                  {format(new Date(transmittal.created_at), 'MMM d, yyyy h:mm a')}
                </p>
                {transmittal.created_by_user && (
                  <p className="text-sm text-muted-foreground">
                    by {transmittal.created_by_user.full_name}
                  </p>
                )}
              </div>

              {transmittal.date_sent && (
                <div>
                  <p className="text-sm text-muted-foreground">Date Sent</p>
                  <p className="font-medium">
                    {format(new Date(transmittal.date_sent), 'MMM d, yyyy')}
                  </p>
                  {transmittal.sent_by_user && (
                    <p className="text-sm text-muted-foreground">
                      by {transmittal.sent_by_user.full_name}
                    </p>
                  )}
                </div>
              )}

              {transmittal.date_due && (
                <div>
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p className="font-medium">
                    {format(new Date(transmittal.date_due), 'MMM d, yyyy')}
                  </p>
                </div>
              )}

              {transmittal.response_required && (
                <>
                  <Separator />
                  <div className="bg-warning-light dark:bg-amber-950 p-3 rounded-lg">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      Response Required
                    </p>
                    {transmittal.response_due_date && (
                      <p className="text-sm text-warning dark:text-amber-400">
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
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="text-sm">{transmittal.acknowledgment_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default TransmittalDetail;
