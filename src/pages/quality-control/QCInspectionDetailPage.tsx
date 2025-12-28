/**
 * QC Inspection Detail Page
 *
 * Displays full details of a Quality Control Inspection with checklist items,
 * pass/fail tracking, and related NCR management.
 */

import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  InspectionStatusBadge,
  InspectionResultBadge,
} from '@/features/quality-control/components/InspectionStatusBadge';
import {
  useInspection,
  useInspectionChecklistItems,
  useStartInspection,
  useCompleteInspection,
  useCancelInspection,
  useUpdateChecklistItem,
  useDeleteInspection,
} from '@/features/quality-control/hooks';
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  Trash2,
  MapPin,
  Calendar,
  User,
  FileText,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Play,
  Camera,
  AlertTriangle,
  Link as LinkIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  InspectionStatus,
  InspectionType,
  ChecklistItemResult,
  INSPECTION_STATUS_CONFIG,
} from '@/types/quality-control';

const inspectionTypeLabels: Record<string, string> = {
  [InspectionType.PRE_WORK]: 'Pre-Work',
  [InspectionType.IN_PROCESS]: 'In-Process',
  [InspectionType.FINAL]: 'Final',
  [InspectionType.MOCK_UP]: 'Mock-Up',
  [InspectionType.FIRST_ARTICLE]: 'First Article',
  [InspectionType.RECEIVING]: 'Receiving',
};

export function QCInspectionDetailPage() {
  const { projectId, inspectionId } = useParams<{
    projectId: string;
    inspectionId: string;
  }>();
  const navigate = useNavigate();

  // State for completion
  const [completionNotes, setCompletionNotes] = useState('');
  const [completionResult, setCompletionResult] = useState<
    'pass' | 'fail' | 'conditional' | ''
  >('');
  const [showCompleteForm, setShowCompleteForm] = useState(false);

  // Fetch data
  const { data: inspection, isLoading, error } = useInspection(inspectionId || '');
  const { data: checklistItems = [] } = useInspectionChecklistItems(
    inspectionId || ''
  );

  // Mutations
  const startInspection = useStartInspection();
  const completeInspection = useCompleteInspection();
  const cancelInspection = useCancelInspection();
  const updateChecklistItem = useUpdateChecklistItem();
  const deleteInspection = useDeleteInspection();

  const handleStart = async () => {
    if (!inspection) {return;}
    await startInspection.mutateAsync(inspection.id);
  };

  const handleCancel = async () => {
    if (!inspection) {return;}
    await cancelInspection.mutateAsync({
      id: inspection.id,
      reason: 'Inspection cancelled',
    });
  };

  const handleComplete = async () => {
    if (!inspection || !completionResult) {return;}
    await completeInspection.mutateAsync({
      id: inspection.id,
      result: completionResult,
      notes: completionNotes || undefined,
    });
    setShowCompleteForm(false);
    setCompletionNotes('');
    setCompletionResult('');
  };

  const handleChecklistItemUpdate = async (
    itemId: string,
    result: 'pass' | 'fail' | 'na' | 'pending'
  ) => {
    await updateChecklistItem.mutateAsync({
      id: itemId,
      status: result,
    });
  };

  const handleDelete = async () => {
    if (!inspection) {return;}
    await deleteInspection.mutateAsync(inspection.id);
    navigate(`/projects/${projectId}/quality-control?tab=inspections`);
  };

  // Loading state
  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-32" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-48" />
              <Skeleton className="h-64" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-48" />
              <Skeleton className="h-32" />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (error || !inspection) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="mb-6">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Error Loading Inspection
              </h3>
              <p className="text-muted-foreground">
                {error?.message || 'Inspection not found'}
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const inspectionNumber = `INSP-${String(inspection.inspection_number).padStart(4, '0')}`;
  const isPending = inspection.status === InspectionStatus.PENDING;
  const isInProgress = inspection.status === InspectionStatus.IN_PROGRESS;
  const isCompleted = [
    InspectionStatus.PASSED,
    InspectionStatus.FAILED,
    InspectionStatus.CONDITIONAL,
  ].includes(inspection.status as InspectionStatus);

  // Calculate checklist progress
  const completedItems = checklistItems.filter(
    (item) => item.result && item.result !== ChecklistItemResult.PENDING
  ).length;
  const totalItems = checklistItems.length;
  const passedItems = checklistItems.filter(
    (item) => item.result === ChecklistItemResult.PASS
  ).length;
  const failedItems = checklistItems.filter(
    (item) => item.result === ChecklistItemResult.FAIL
  ).length;

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Back button */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-2xl font-bold text-foreground">
                        {inspectionNumber}
                      </h1>
                      <Badge variant="outline" className="capitalize">
                        {inspectionTypeLabels[inspection.inspection_type] ||
                          inspection.inspection_type}
                      </Badge>
                      <InspectionStatusBadge status={inspection.status} />
                    </div>
                    <CardTitle className="text-lg">{inspection.title}</CardTitle>
                    {inspection.description && (
                      <CardDescription className="mt-2 whitespace-pre-wrap">
                        {inspection.description}
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {inspection.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{inspection.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {format(new Date(inspection.inspection_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                  {inspection.inspector_name && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{inspection.inspector_name}</span>
                    </div>
                  )}
                  {inspection.category && (
                    <div className="flex items-center gap-2">
                      <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                      <span className="capitalize">
                        {inspection.category.replace(/_/g, ' ')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Reference Information */}
                {(inspection.spec_section || inspection.drawing_reference) && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      References
                    </h4>
                    <div className="flex flex-wrap gap-4 text-sm">
                      {inspection.spec_section && (
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span>Spec: {inspection.spec_section}</span>
                        </div>
                      )}
                      {inspection.drawing_reference && (
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span>Drawing: {inspection.drawing_reference}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Result Card (for completed inspections) */}
            {isCompleted && (
              <Card
                className={cn(
                  'border-2',
                  inspection.overall_result === 'pass' &&
                    'border-green-500 bg-green-50 dark:bg-green-950',
                  inspection.overall_result === 'fail' &&
                    'border-red-500 bg-red-50 dark:bg-red-950',
                  inspection.overall_result === 'conditional' &&
                    'border-yellow-500 bg-yellow-50 dark:bg-yellow-950'
                )}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {inspection.overall_result === 'pass' && (
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    )}
                    {inspection.overall_result === 'fail' && (
                      <XCircle className="h-6 w-6 text-red-600" />
                    )}
                    {inspection.overall_result === 'conditional' && (
                      <AlertTriangle className="h-6 w-6 text-yellow-600" />
                    )}
                    Inspection Result
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <InspectionResultBadge
                      result={inspection.overall_result || 'pending'}
                    />
                    {inspection.notes && (
                      <p className="text-sm text-muted-foreground">
                        {inspection.notes}
                      </p>
                    )}
                  </div>

                  {/* Show related NCR if exists */}
                  {inspection.ncr_required && inspection.ncr_id && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span className="text-sm font-medium">NCR Required</span>
                        <Link
                          to={`/projects/${projectId}/quality-control/ncr/${inspection.ncr_id}`}
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          <LinkIcon className="h-3 w-3" />
                          View NCR
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Reinspection required notice */}
                  {inspection.reinspection_required && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center gap-2 text-yellow-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          Reinspection Required
                        </span>
                        {inspection.reinspection_date && (
                          <span className="text-sm">
                            - Scheduled for{' '}
                            {format(
                              new Date(inspection.reinspection_date),
                              'MMM d, yyyy'
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Checklist Items */}
            {checklistItems.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <ClipboardCheck className="h-5 w-5" />
                      Checklist Items
                    </CardTitle>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        {completedItems}/{totalItems} complete
                      </span>
                      <div className="flex gap-2">
                        <Badge
                          variant="outline"
                          className="bg-green-100 text-green-800"
                        >
                          {passedItems} Pass
                        </Badge>
                        <Badge
                          variant="outline"
                          className="bg-red-100 text-red-800"
                        >
                          {failedItems} Fail
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {checklistItems.map((item, index) => (
                      <div
                        key={item.id}
                        className={cn(
                          'p-4 rounded-lg border',
                          item.result === ChecklistItemResult.PASS &&
                            'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800',
                          item.result === ChecklistItemResult.FAIL &&
                            'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800',
                          item.result === ChecklistItemResult.NA &&
                            'bg-gray-50 dark:bg-gray-900'
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-muted-foreground">
                                {item.item_number || index + 1}.
                              </span>
                              <span className="font-medium">
                                {item.description}
                              </span>
                            </div>
                            {item.spec_reference && (
                              <p className="text-sm text-muted-foreground">
                                Ref: {item.spec_reference}
                              </p>
                            )}
                            {item.acceptance_criteria && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Criteria: {item.acceptance_criteria}
                              </p>
                            )}
                            {item.notes && (
                              <p className="text-sm mt-2 italic">{item.notes}</p>
                            )}
                            {item.deviation_noted && item.deviation_description && (
                              <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900 rounded text-sm">
                                <span className="font-medium">Deviation: </span>
                                {item.deviation_description}
                              </div>
                            )}
                          </div>

                          {/* Result buttons - only show when in progress */}
                          {isInProgress && (
                            <div className="flex gap-1">
                              <Button
                                variant={
                                  item.result === ChecklistItemResult.PASS
                                    ? 'default'
                                    : 'outline'
                                }
                                size="sm"
                                onClick={() =>
                                  handleChecklistItemUpdate(item.id, 'pass')
                                }
                                className={cn(
                                  item.result === ChecklistItemResult.PASS &&
                                    'bg-green-600 hover:bg-green-700'
                                )}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant={
                                  item.result === ChecklistItemResult.FAIL
                                    ? 'default'
                                    : 'outline'
                                }
                                size="sm"
                                onClick={() =>
                                  handleChecklistItemUpdate(item.id, 'fail')
                                }
                                className={cn(
                                  item.result === ChecklistItemResult.FAIL &&
                                    'bg-red-600 hover:bg-red-700'
                                )}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant={
                                  item.result === ChecklistItemResult.NA
                                    ? 'default'
                                    : 'outline'
                                }
                                size="sm"
                                onClick={() =>
                                  handleChecklistItemUpdate(item.id, 'na')
                                }
                                className={cn(
                                  item.result === ChecklistItemResult.NA &&
                                    'bg-gray-600 hover:bg-gray-700'
                                )}
                              >
                                <MinusCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          )}

                          {/* Show result badge when not in progress */}
                          {!isInProgress && item.result && (
                            <Badge
                              variant="outline"
                              className={cn(
                                item.result === ChecklistItemResult.PASS &&
                                  'bg-green-100 text-green-800',
                                item.result === ChecklistItemResult.FAIL &&
                                  'bg-red-100 text-red-800',
                                item.result === ChecklistItemResult.NA &&
                                  'bg-gray-100 text-gray-800'
                              )}
                            >
                              {item.result.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Photos */}
            {inspection.photo_urls && inspection.photo_urls.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Photos ({inspection.photo_urls.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {inspection.photo_urls.map((url, index) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="aspect-square rounded-lg overflow-hidden border hover:border-primary transition-colors"
                      >
                        <img
                          src={url}
                          alt={`Inspection photo ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Completion Form */}
            {isInProgress && (
              <Card>
                <CardHeader>
                  <CardTitle>Complete Inspection</CardTitle>
                  <CardDescription>
                    Record the final result of this inspection
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!showCompleteForm ? (
                    <Button onClick={() => setShowCompleteForm(true)}>
                      Complete Inspection
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Label>Overall Result</Label>
                        <div className="flex gap-2 mt-2">
                          <Button
                            variant={completionResult === 'pass' ? 'default' : 'outline'}
                            onClick={() => setCompletionResult('pass')}
                            className={cn(
                              completionResult === 'pass' &&
                                'bg-green-600 hover:bg-green-700'
                            )}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Pass
                          </Button>
                          <Button
                            variant={completionResult === 'fail' ? 'default' : 'outline'}
                            onClick={() => setCompletionResult('fail')}
                            className={cn(
                              completionResult === 'fail' &&
                                'bg-red-600 hover:bg-red-700'
                            )}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Fail
                          </Button>
                          <Button
                            variant={
                              completionResult === 'conditional' ? 'default' : 'outline'
                            }
                            onClick={() => setCompletionResult('conditional')}
                            className={cn(
                              completionResult === 'conditional' &&
                                'bg-yellow-600 hover:bg-yellow-700'
                            )}
                          >
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Conditional
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="completion-notes">Notes (Optional)</Label>
                        <Textarea
                          id="completion-notes"
                          value={completionNotes}
                          onChange={(e) => setCompletionNotes(e.target.value)}
                          placeholder="Add any notes about the inspection result..."
                          rows={3}
                          className="mt-2"
                        />
                      </div>

                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowCompleteForm(false);
                            setCompletionResult('');
                            setCompletionNotes('');
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleComplete}
                          disabled={!completionResult || completeInspection.isPending}
                        >
                          {completeInspection.isPending && (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          )}
                          Submit Result
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 rounded-lg bg-muted">
                  <InspectionStatusBadge
                    status={inspection.status}
                    className="text-base px-4 py-1"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    {INSPECTION_STATUS_CONFIG[inspection.status as InspectionStatus]
                      ?.label || inspection.status}
                  </p>
                </div>

                {/* Start Inspection Button */}
                {isPending && (
                  <Button
                    onClick={handleStart}
                    disabled={startInspection.isPending}
                    className="w-full"
                  >
                    {startInspection.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Start Inspection
                  </Button>
                )}

                {/* Cancel Inspection Button */}
                {isInProgress && (
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={cancelInspection.isPending}
                    className="w-full text-destructive"
                  >
                    {cancelInspection.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Cancel Inspection
                  </Button>
                )}

                {/* Witness Information */}
                {inspection.witness_required && (
                  <div className="pt-4 border-t">
                    <Label className="text-muted-foreground">Witness</Label>
                    {inspection.witness ? (
                      <p className="mt-1">
                        {inspection.witness.full_name}
                        {inspection.witness_signed_at && (
                          <span className="text-sm text-muted-foreground ml-2">
                            (Signed{' '}
                            {format(
                              new Date(inspection.witness_signed_at),
                              'MMM d, yyyy'
                            )}
                            )
                          </span>
                        )}
                      </p>
                    ) : (
                      <p className="mt-1 text-muted-foreground">
                        Witness required but not assigned
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Details Card */}
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Inspection Number</Label>
                  <p className="mt-1 font-medium">{inspectionNumber}</p>
                </div>

                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <p className="mt-1 capitalize">
                    {inspectionTypeLabels[inspection.inspection_type] ||
                      inspection.inspection_type}
                  </p>
                </div>

                {inspection.category && (
                  <div>
                    <Label className="text-muted-foreground">Category</Label>
                    <p className="mt-1 capitalize">
                      {inspection.category.replace(/_/g, ' ')}
                    </p>
                  </div>
                )}

                <div>
                  <Label className="text-muted-foreground">Inspection Date</Label>
                  <p className="mt-1">
                    {format(new Date(inspection.inspection_date), 'MMM d, yyyy')}
                  </p>
                </div>

                {inspection.inspector_name && (
                  <div>
                    <Label className="text-muted-foreground">Inspector</Label>
                    <p className="mt-1">{inspection.inspector_name}</p>
                    {inspection.inspector_email && (
                      <p className="text-xs text-muted-foreground">
                        {inspection.inspector_email}
                      </p>
                    )}
                  </div>
                )}

                {inspection.inspector_signed_at && (
                  <div>
                    <Label className="text-muted-foreground">Signed</Label>
                    <p className="mt-1">
                      {format(
                        new Date(inspection.inspector_signed_at),
                        'MMM d, yyyy h:mm a'
                      )}
                    </p>
                  </div>
                )}

                <div>
                  <Label className="text-muted-foreground">Created</Label>
                  <p className="mt-1">
                    {format(new Date(inspection.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                  {inspection.created_by_name && (
                    <p className="text-xs text-muted-foreground">
                      by {inspection.created_by_name}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Delete Card */}
            {isPending && (
              <Card className="border-red-200 dark:border-red-800">
                <CardHeader>
                  <CardTitle className="text-red-600">Danger Zone</CardTitle>
                </CardHeader>
                <CardContent>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        className="w-full"
                        disabled={deleteInspection.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Inspection
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Inspection?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently
                          delete {inspectionNumber} and all associated data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default QCInspectionDetailPage;
