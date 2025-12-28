/**
 * NCR Detail Page
 *
 * Full detail view for a Non-Conformance Report with:
 * - NCR information display
 * - Workflow status transitions
 * - History timeline
 * - Edit/Delete actions
 */

import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  NCRStatusBadge,
  NCRSeverityBadge,
  NCRFormDialog,
} from '@/features/quality-control/components';
import {
  useNCR,
  useNCRHistory,
  useDeleteNCR,
  useStartNCRInvestigation,
  useStartCorrectiveAction,
  useSubmitNCRForVerification,
  useVerifyNCR,
  useCloseNCR,
  useReopenNCR,
  useTransitionNCRStatus,
} from '@/features/quality-control/hooks';
import { useAuth } from '@/lib/auth/AuthContext';
import { NCRStatus } from '@/types/quality-control';
import { format } from 'date-fns';
import {
  ArrowLeft,
  FileWarning,
  Edit,
  Trash2,
  Clock,
  User,
  Building2,
  MapPin,
  DollarSign,
  Calendar,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Play,
  RotateCcw,
  FileCheck,
  Loader2,
} from 'lucide-react';

export function NCRDetailPage() {
  const { projectId, ncrId } = useParams<{ projectId: string; ncrId: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  // Data fetching
  const { data: ncr, isLoading, error } = useNCR(ncrId || '');
  const { data: history = [] } = useNCRHistory(ncrId || '');

  // Mutations
  const deleteNCR = useDeleteNCR();
  const startInvestigation = useStartNCRInvestigation();
  const startCorrectiveAction = useStartCorrectiveAction();
  const submitForVerification = useSubmitNCRForVerification();
  const verifyNCR = useVerifyNCR();
  const closeNCR = useCloseNCR();
  const reopenNCR = useReopenNCR();
  const transitionStatus = useTransitionNCRStatus();

  // UI state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [actionNotes, setActionNotes] = useState('');
  const [isActioning, setIsActioning] = useState(false);

  const handleDelete = async () => {
    if (!ncrId) {return;}
    try {
      await deleteNCR.mutateAsync(ncrId);
      navigate(`/projects/${projectId}/quality-control`);
    } catch (err) {
      console.error('Failed to delete NCR:', err);
    }
  };

  const handleWorkflowAction = async (
    action: 'investigate' | 'corrective' | 'complete' | 'verify' | 'close' | 'reopen' | 'void'
  ) => {
    if (!ncrId) {return;}
    setIsActioning(true);
    try {
      switch (action) {
        case 'investigate':
          await startInvestigation.mutateAsync(ncrId);
          break;
        case 'corrective':
          await startCorrectiveAction.mutateAsync({ id: ncrId, action: actionNotes || 'Corrective action required' });
          break;
        case 'complete':
          await submitForVerification.mutateAsync(ncrId);
          break;
        case 'verify':
          await verifyNCR.mutateAsync({ id: ncrId, notes: actionNotes });
          break;
        case 'close':
          await closeNCR.mutateAsync({ id: ncrId, disposition: actionNotes });
          break;
        case 'reopen':
          await reopenNCR.mutateAsync({ id: ncrId, reason: actionNotes });
          break;
        case 'void':
          await transitionStatus.mutateAsync({ id: ncrId, status: NCRStatus.VOIDED, notes: actionNotes });
          setShowVoidDialog(false);
          break;
      }
      setActionNotes('');
    } catch (err) {
      console.error(`Failed to ${action} NCR:`, err);
    } finally {
      setIsActioning(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-48" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
            <Skeleton className="h-96" />
          </div>
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (error || !ncr) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="text-center py-12 bg-card rounded-lg border">
            <FileWarning className="h-12 w-12 text-gray-300 mx-auto" />
            <h3 className="text-lg font-medium text-foreground mt-4">NCR Not Found</h3>
            <p className="text-muted mt-2">
              The requested NCR could not be found or you don't have access.
            </p>
            <Link to={`/projects/${projectId}/quality-control`}>
              <Button className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Quality Control
              </Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  const canEdit = ncr.status === NCRStatus.OPEN || ncr.status === NCRStatus.UNDER_REVIEW;
  const canVoid = ncr.status !== NCRStatus.VOIDED && ncr.status !== NCRStatus.CLOSED;

  return (
    <AppLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to={`/projects/${projectId}/quality-control`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">
                  NCR-{ncr.ncr_number?.toString().padStart(4, '0')}
                </h1>
                <NCRStatusBadge status={ncr.status} />
                <NCRSeverityBadge severity={ncr.severity} />
              </div>
              <p className="text-muted mt-1">{ncr.title}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {canEdit && (
              <Button variant="outline" onClick={() => setShowEditDialog(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            {canVoid && (
              <Button variant="outline" className="text-destructive" onClick={() => setShowVoidDialog(true)}>
                <XCircle className="h-4 w-4 mr-2" />
                Void
              </Button>
            )}
            <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileWarning className="h-5 w-5" />
                  Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-wrap">
                  {ncr.description || 'No description provided.'}
                </p>
              </CardContent>
            </Card>

            {/* Details Card */}
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted">Category</span>
                  <p className="font-medium capitalize">{ncr.category?.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <span className="text-sm text-muted">Type</span>
                  <p className="font-medium capitalize">{ncr.ncr_type?.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <span className="text-sm text-muted">Priority</span>
                  <Badge variant={ncr.priority === 'urgent' ? 'destructive' : ncr.priority === 'high' ? 'warning' : 'secondary'}>
                    {ncr.priority}
                  </Badge>
                </div>
                <div>
                  <span className="text-sm text-muted">Identified Date</span>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {ncr.identified_date ? format(new Date(ncr.identified_date), 'MMM d, yyyy') : 'N/A'}
                  </p>
                </div>
                {ncr.due_date && (
                  <div>
                    <span className="text-sm text-muted">Due Date</span>
                    <p className="font-medium flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {format(new Date(ncr.due_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                )}
                {ncr.spec_section && (
                  <div>
                    <span className="text-sm text-muted">Spec Section</span>
                    <p className="font-medium">{ncr.spec_section}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Location Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-4">
                <div>
                  <span className="text-sm text-muted">Building</span>
                  <p className="font-medium">{ncr.building || '-'}</p>
                </div>
                <div>
                  <span className="text-sm text-muted">Floor</span>
                  <p className="font-medium">{ncr.floor || '-'}</p>
                </div>
                <div>
                  <span className="text-sm text-muted">Area/Room</span>
                  <p className="font-medium">{ncr.area || '-'}</p>
                </div>
                {ncr.location_details && (
                  <div className="col-span-3">
                    <span className="text-sm text-muted">Additional Details</span>
                    <p className="font-medium">{ncr.location_details}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Responsibility Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Responsibility
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted">Responsible Party Type</span>
                    <p className="font-medium capitalize">{ncr.responsible_party_type?.replace(/_/g, ' ') || '-'}</p>
                  </div>
                  {ncr.subcontractor_name && (
                    <div>
                      <span className="text-sm text-muted">Subcontractor</span>
                      <p className="font-medium flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        {ncr.subcontractor_name}
                      </p>
                    </div>
                  )}
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted">Identified By</span>
                    <p className="font-medium">{ncr.identified_by_name || ncr.identified_by || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted">Assigned To</span>
                    <p className="font-medium">{ncr.assigned_to_name || ncr.assigned_to || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Impact Card */}
            {(ncr.cost_impact || ncr.schedule_impact || ncr.safety_impact) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Impact Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className={`h-5 w-5 ${ncr.cost_impact ? 'text-yellow-500' : 'text-gray-300'}`} />
                    <div>
                      <span className="text-sm text-muted">Cost Impact</span>
                      <p className="font-medium">{ncr.cost_impact ? 'Yes' : 'No'}</p>
                      {ncr.estimated_cost && (
                        <p className="text-sm text-muted">${ncr.estimated_cost.toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className={`h-5 w-5 ${ncr.schedule_impact ? 'text-orange-500' : 'text-gray-300'}`} />
                    <div>
                      <span className="text-sm text-muted">Schedule Impact</span>
                      <p className="font-medium">{ncr.schedule_impact ? 'Yes' : 'No'}</p>
                      {ncr.schedule_impact_days && (
                        <p className="text-sm text-muted">{ncr.schedule_impact_days} days</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className={`h-5 w-5 ${ncr.safety_impact ? 'text-red-500' : 'text-gray-300'}`} />
                    <div>
                      <span className="text-sm text-muted">Safety Impact</span>
                      <p className="font-medium">{ncr.safety_impact ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* History Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-muted text-center py-4">No history yet</p>
                ) : (
                  <div className="space-y-4">
                    {history.map((entry, index) => (
                      <div key={entry.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                          {index < history.length - 1 && (
                            <div className="w-0.5 h-full bg-border flex-1 mt-1" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium capitalize">
                              {entry.action?.replace(/_/g, ' ')}
                            </span>
                            {entry.previous_status && entry.new_status && (
                              <span className="text-sm text-muted">
                                {entry.previous_status} → {entry.new_status}
                              </span>
                            )}
                          </div>
                          {entry.notes && (
                            <p className="text-sm text-muted mt-1">{entry.notes}</p>
                          )}
                          <p className="text-xs text-muted mt-1">
                            {entry.changed_by_name || 'System'} •{' '}
                            {format(new Date(entry.changed_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Workflow Actions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Workflow Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Action Notes (Optional)</label>
                  <Textarea
                    placeholder="Add notes for this action..."
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  {/* Open -> Under Review */}
                  {ncr.status === NCRStatus.OPEN && (
                    <Button
                      className="w-full"
                      onClick={() => handleWorkflowAction('investigate')}
                      disabled={isActioning}
                    >
                      {isActioning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                      Start Investigation
                    </Button>
                  )}

                  {/* Under Review -> Corrective Action */}
                  {ncr.status === NCRStatus.UNDER_REVIEW && (
                    <Button
                      className="w-full"
                      onClick={() => handleWorkflowAction('corrective')}
                      disabled={isActioning}
                    >
                      {isActioning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                      Start Corrective Action
                    </Button>
                  )}

                  {/* Corrective Action -> Verification */}
                  {ncr.status === NCRStatus.CORRECTIVE_ACTION && (
                    <Button
                      className="w-full"
                      onClick={() => handleWorkflowAction('complete')}
                      disabled={isActioning}
                    >
                      {isActioning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                      Complete Corrective Action
                    </Button>
                  )}

                  {/* Verification -> Resolved */}
                  {ncr.status === NCRStatus.VERIFICATION && (
                    <Button
                      className="w-full"
                      onClick={() => handleWorkflowAction('verify')}
                      disabled={isActioning}
                    >
                      {isActioning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileCheck className="h-4 w-4 mr-2" />}
                      Verify & Resolve
                    </Button>
                  )}

                  {/* Resolved -> Closed */}
                  {ncr.status === NCRStatus.RESOLVED && (
                    <Button
                      className="w-full"
                      onClick={() => handleWorkflowAction('close')}
                      disabled={isActioning}
                    >
                      {isActioning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                      Close NCR
                    </Button>
                  )}

                  {/* Reopen from Closed/Resolved */}
                  {(ncr.status === NCRStatus.CLOSED || ncr.status === NCRStatus.RESOLVED) && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleWorkflowAction('reopen')}
                      disabled={isActioning}
                    >
                      {isActioning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                      Reopen NCR
                    </Button>
                  )}

                  {ncr.status === NCRStatus.VOIDED && (
                    <p className="text-center text-muted text-sm py-2">
                      This NCR has been voided
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Info */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Created</span>
                  <span>{format(new Date(ncr.created_at), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Last Updated</span>
                  <span>{format(new Date(ncr.updated_at), 'MMM d, yyyy')}</span>
                </div>
                {ncr.resolved_at && (
                  <div className="flex justify-between">
                    <span className="text-muted">Resolved</span>
                    <span>{format(new Date(ncr.resolved_at), 'MMM d, yyyy')}</span>
                  </div>
                )}
                {ncr.closed_at && (
                  <div className="flex justify-between">
                    <span className="text-muted">Closed</span>
                    <span>{format(new Date(ncr.closed_at), 'MMM d, yyyy')}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Edit Dialog */}
        {userProfile?.company_id && (
          <NCRFormDialog
            projectId={projectId || ''}
            companyId={userProfile.company_id}
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            ncr={ncr}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete NCR</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete NCR-{ncr.ncr_number?.toString().padStart(4, '0')}?
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

        {/* Void Confirmation Dialog */}
        <AlertDialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Void NCR</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to void NCR-{ncr.ncr_number?.toString().padStart(4, '0')}?
                Voided NCRs are kept for records but marked as invalid.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <label className="text-sm font-medium">Reason for Voiding</label>
              <Textarea
                placeholder="Enter reason for voiding this NCR..."
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                rows={3}
                className="mt-2"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleWorkflowAction('void')}
                disabled={isActioning}
              >
                {isActioning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Void NCR
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}

export default NCRDetailPage;
