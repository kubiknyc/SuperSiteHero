/**
 * JSA Detail Page
 * Full view of a Job Safety Analysis with:
 * - JSA details and status
 * - Hazard list with controls
 * - Worker acknowledgments
 * - Status transitions (Submit -> Approve -> Start -> Complete)
 */

import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { SmartLayout } from '@/components/layout/SmartLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useJSA,
  useSubmitJSAForReview,
  useApproveJSA,
  useStartJSAWork,
  useCompleteJSA,
  useCancelJSA,
  useDeleteJSA,
  useAddJSAAcknowledgment,
  useRemoveJSAAcknowledgment,
} from '@/features/jsa/hooks/useJSA';
import {
  getJSAStatusLabel,
  getJSAStatusColor,
  getRiskLevelLabel,
  getRiskLevelColor,
  calculateOverallRisk,
  getRequiredPPE,
  canEditJSA,
  type JSAStatus,
  type JSAHazard,
} from '@/types/jsa';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  ClipboardList,
  Play,
  CheckCircle2,
  XCircle,
  Trash2,
  Edit,
  AlertTriangle,
  HardHat,
  Send,
  UserCheck,
  Loader2,
  Plus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// Status Badge Component
function JSAStatusBadge({ status, size = 'sm' }: { status: JSAStatus; size?: 'sm' | 'md' }) {
  const color = getJSAStatusColor(status);
  const label = getJSAStatusLabel(status);

  const colorClasses: Record<string, string> = {
    gray: 'bg-muted text-foreground border-border',
    yellow: 'bg-warning-light text-yellow-800 border-yellow-200',
    blue: 'bg-info-light text-blue-800 border-blue-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
    green: 'bg-success-light text-green-800 border-green-200',
    red: 'bg-error-light text-red-800 border-red-200',
  };

  return (
    <Badge
      variant="outline"
      className={`${colorClasses[color] || colorClasses.gray} ${size === 'md' ? 'text-sm px-3 py-1' : ''}`}
    >
      {label}
    </Badge>
  );
}

// Risk Level Badge Component
function RiskBadge({ level }: { level: string }) {
  const color = getRiskLevelColor(level as any);
  const label = getRiskLevelLabel(level as any);

  const colorClasses: Record<string, string> = {
    green: 'bg-success-light text-green-800',
    yellow: 'bg-warning-light text-yellow-800',
    orange: 'bg-orange-100 text-orange-800',
    red: 'bg-error-light text-red-800',
  };

  return (
    <Badge className={colorClasses[color] || 'bg-muted text-foreground'}>
      {label}
    </Badge>
  );
}

// Hazard Card Component
function HazardCard({ hazard, index }: { hazard: JSAHazard; index: number }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between p-4 bg-surface cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-info-light text-blue-800 font-medium text-sm">
            {hazard.step_number || index + 1}
          </span>
          <div>
            <p className="font-medium text-foreground">{hazard.step_description}</p>
            <p className="text-sm text-secondary">{hazard.hazard_description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RiskBadge level={hazard.risk_level} />
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-disabled" />
          ) : (
            <ChevronDown className="h-4 w-4 text-disabled" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="p-4 border-t space-y-4">
          {/* Hazard Type */}
          {hazard.hazard_type && (
            <div>
              <Label className="text-xs text-muted">Hazard Type</Label>
              <p className="text-sm text-foreground capitalize">{hazard.hazard_type}</p>
            </div>
          )}

          {/* Controls (Hierarchy) */}
          <div className="space-y-2">
            <Label className="text-xs text-muted">Control Measures</Label>
            <div className="grid gap-2">
              {hazard.elimination_controls && (
                <div className="text-sm">
                  <span className="font-medium text-success-dark">Elimination:</span>{' '}
                  {hazard.elimination_controls}
                </div>
              )}
              {hazard.substitution_controls && (
                <div className="text-sm">
                  <span className="font-medium text-primary-hover">Substitution:</span>{' '}
                  {hazard.substitution_controls}
                </div>
              )}
              {hazard.engineering_controls && (
                <div className="text-sm">
                  <span className="font-medium text-purple-700">Engineering:</span>{' '}
                  {hazard.engineering_controls}
                </div>
              )}
              {hazard.administrative_controls && (
                <div className="text-sm">
                  <span className="font-medium text-orange-700">Administrative:</span>{' '}
                  {hazard.administrative_controls}
                </div>
              )}
            </div>
          </div>

          {/* PPE Required */}
          {hazard.ppe_required && hazard.ppe_required.length > 0 && (
            <div>
              <Label className="text-xs text-muted">PPE Required</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {hazard.ppe_required.map((ppe) => (
                  <Badge key={ppe} variant="outline" className="text-xs">
                    {ppe}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Responsible Party */}
          {hazard.responsible_party && (
            <div>
              <Label className="text-xs text-muted">Responsible Party</Label>
              <p className="text-sm text-foreground">{hazard.responsible_party}</p>
            </div>
          )}

          {/* Verification Status */}
          <div className="flex items-center gap-2 pt-2 border-t">
            {hazard.controls_verified ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-sm text-success-dark">Controls Verified</span>
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 text-warning" />
                <span className="text-sm text-yellow-700">Awaiting Verification</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Acknowledgment Sign-in Form
function AcknowledgmentForm({ jsaId, onClose }: { jsaId: string; onClose: () => void }) {
  const [workerName, setWorkerName] = useState('');
  const [workerCompany, setWorkerCompany] = useState('');
  const [workerTrade, setWorkerTrade] = useState('');

  const addAcknowledgment = useAddJSAAcknowledgment();

  const handleSubmit = async () => {
    if (!workerName.trim()) {return;}

    await addAcknowledgment.mutateAsync({
      jsa_id: jsaId,
      worker_name: workerName.trim(),
      worker_company: workerCompany.trim() || undefined,
      worker_trade: workerTrade.trim() || undefined,
      understands_hazards: true,
    });

    onClose();
  };

  return (
    <div className="space-y-4 p-4 bg-surface rounded-lg">
      <div>
        <Label htmlFor="workerName">Worker Name *</Label>
        <Input
          id="workerName"
          value={workerName}
          onChange={(e) => setWorkerName(e.target.value)}
          placeholder="Enter full name"
        />
      </div>
      <div>
        <Label htmlFor="workerCompany">Company</Label>
        <Input
          id="workerCompany"
          value={workerCompany}
          onChange={(e) => setWorkerCompany(e.target.value)}
          placeholder="Company name"
        />
      </div>
      <div>
        <Label htmlFor="workerTrade">Trade</Label>
        <Input
          id="workerTrade"
          value={workerTrade}
          onChange={(e) => setWorkerTrade(e.target.value)}
          placeholder="e.g., Electrician, Carpenter"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!workerName.trim() || addAcknowledgment.isPending}
        >
          {addAcknowledgment.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Signing...
            </>
          ) : (
            <>
              <UserCheck className="h-4 w-4 mr-2" />
              Sign In
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export function JSADetailPage() {
  const { projectId, jsaId } = useParams<{ projectId: string; jsaId: string }>();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [approvalNotes] = useState('');
  const [completionNotes] = useState('');

  const { data: jsa, isLoading, error } = useJSA(jsaId || '');

  const submitForReview = useSubmitJSAForReview();
  const approveJSA = useApproveJSA();
  const startWork = useStartJSAWork();
  const completeJSA = useCompleteJSA();
  const cancelJSA = useCancelJSA();
  const deleteJSA = useDeleteJSA();
  const removeAcknowledgment = useRemoveJSAAcknowledgment();

  if (isLoading) {
    return (
      <SmartLayout title="JSA Details">
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-disabled" />
            <p className="ml-2 text-muted">Loading JSA...</p>
          </div>
        </div>
      </SmartLayout>
    );
  }

  if (error || !jsa) {
    return (
      <SmartLayout title="JSA Details">
        <div className="p-6">
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 mx-auto text-red-400 mb-4" />
            <h2 className="text-lg font-medium text-foreground heading-section">JSA Not Found</h2>
            <p className="text-muted mt-1">
              The Job Safety Analysis you're looking for doesn't exist or has been deleted.
            </p>
            <Link to={`/projects/${projectId}/jsa`}>
              <Button className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to JSAs
              </Button>
            </Link>
          </div>
        </div>
      </SmartLayout>
    );
  }

  const overallRisk = calculateOverallRisk(jsa.hazards || []);
  const requiredPPE = getRequiredPPE(jsa.hazards || []);

  const handleSubmitForReview = () => {
    if (confirm('Submit this JSA for review?')) {
      submitForReview.mutate(jsa.id);
    }
  };

  const handleApprove = () => {
    if (confirm('Approve this JSA?')) {
      approveJSA.mutate({ jsaId: jsa.id, notes: approvalNotes || undefined });
    }
  };

  const handleStartWork = () => {
    if (confirm('Start work on this JSA? All workers must acknowledge before proceeding.')) {
      startWork.mutate(jsa.id);
    }
  };

  const handleComplete = () => {
    if (confirm('Mark this JSA as completed?')) {
      completeJSA.mutate({ jsaId: jsa.id, notes: completionNotes || undefined });
    }
  };

  const handleCancel = () => {
    if (confirm('Cancel this JSA?')) {
      cancelJSA.mutate(jsa.id);
    }
  };

  const handleDelete = () => {
    deleteJSA.mutate(jsa.id, {
      onSuccess: () => navigate(`/projects/${projectId}/jsa`),
    });
    setShowDeleteConfirm(false);
  };

  const handleRemoveAcknowledgment = (acknowledgmentId: string) => {
    if (confirm('Remove this worker sign-in?')) {
      removeAcknowledgment.mutate({ acknowledgmentId, jsaId: jsa.id });
    }
  };

  return (
    <SmartLayout title="JSA Details">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <Link
              to={`/projects/${projectId}/jsa`}
              className="inline-flex items-center text-sm text-muted hover:text-secondary mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to JSAs
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground heading-page">{jsa.jsa_number}</h1>
              <JSAStatusBadge status={jsa.status} size="md" />
              {overallRisk !== 'low' && (
                <RiskBadge level={overallRisk} />
              )}
            </div>
            <p className="text-muted mt-1 max-w-2xl">{jsa.task_description}</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Status-based actions */}
            {jsa.status === 'draft' && (
              <>
                <Button
                  onClick={handleSubmitForReview}
                  disabled={submitForReview.isPending}
                  className="bg-primary hover:bg-primary-hover"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Submit for Review
                </Button>
                <Link to={`/projects/${projectId}/jsa/${jsa.id}/edit`}>
                  <Button variant="outline">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </Link>
              </>
            )}

            {jsa.status === 'pending_review' && (
              <Button
                onClick={handleApprove}
                disabled={approveJSA.isPending}
                className="bg-success hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approve JSA
              </Button>
            )}

            {jsa.status === 'approved' && (
              <Button
                onClick={handleStartWork}
                disabled={startWork.isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Work
              </Button>
            )}

            {jsa.status === 'in_progress' && (
              <Button
                onClick={handleComplete}
                disabled={completeJSA.isPending}
                className="bg-success hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Complete JSA
              </Button>
            )}

            {['draft', 'pending_review', 'approved', 'in_progress'].includes(jsa.status) && (
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={cancelJSA.isPending}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}

            {jsa.status === 'draft' && (
              <Button
                variant="outline"
                className="text-error hover:text-error-dark hover:bg-error-light"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 max-w-md mx-4">
              <h3 className="text-lg font-medium text-foreground mb-2 heading-subsection">
                Delete JSA?
              </h3>
              <p className="text-muted mb-4">
                This will permanently delete {jsa.jsa_number} and all associated
                hazards and acknowledgments. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-error hover:bg-red-700"
                  onClick={handleDelete}
                  disabled={deleteJSA.isPending}
                >
                  {deleteJSA.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* JSA Details */}
            <div className="bg-card rounded-lg border p-6">
              <h2 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2 heading-section">
                <ClipboardList className="h-5 w-5 text-disabled" />
                JSA Details
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted">Scheduled Date</Label>
                  <span className="flex items-center gap-1 text-sm text-foreground">
                    <Calendar className="h-4 w-4 text-disabled" />
                    {format(new Date(jsa.scheduled_date), 'MMMM d, yyyy')}
                  </span>
                </div>

                {jsa.start_time && (
                  <div>
                    <Label className="text-xs text-muted">Start Time</Label>
                    <span className="flex items-center gap-1 text-sm text-foreground">
                      <Clock className="h-4 w-4 text-disabled" />
                      {jsa.start_time}
                    </span>
                  </div>
                )}

                {jsa.work_location && (
                  <div>
                    <Label className="text-xs text-muted">Work Location</Label>
                    <span className="flex items-center gap-1 text-sm text-foreground">
                      <MapPin className="h-4 w-4 text-disabled" />
                      {jsa.work_location}
                    </span>
                  </div>
                )}

                {jsa.supervisor_name && (
                  <div>
                    <Label className="text-xs text-muted">Supervisor</Label>
                    <span className="flex items-center gap-1 text-sm text-foreground">
                      <User className="h-4 w-4 text-disabled" />
                      {jsa.supervisor_name}
                    </span>
                  </div>
                )}

                {jsa.contractor_company && (
                  <div>
                    <Label className="text-xs text-muted">Contractor</Label>
                    <span className="text-sm text-foreground">{jsa.contractor_company}</span>
                  </div>
                )}

                {jsa.estimated_duration && (
                  <div>
                    <Label className="text-xs text-muted">Estimated Duration</Label>
                    <span className="text-sm text-foreground">{jsa.estimated_duration}</span>
                  </div>
                )}
              </div>

              {/* Equipment Used */}
              {jsa.equipment_used && jsa.equipment_used.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <Label className="text-xs text-muted">Equipment Used</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {jsa.equipment_used.map((equip) => (
                      <Badge key={equip} variant="outline">
                        {equip}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Weather Conditions */}
              {jsa.weather_conditions && (
                <div className="mt-4 pt-4 border-t">
                  <Label className="text-xs text-muted">Weather Conditions</Label>
                  <p className="text-sm text-foreground">{jsa.weather_conditions}</p>
                </div>
              )}
            </div>

            {/* Required PPE Summary */}
            {requiredPPE.length > 0 && (
              <div className="bg-warning-light rounded-lg border border-yellow-200 p-4">
                <h3 className="font-medium text-yellow-800 flex items-center gap-2 mb-3 heading-subsection">
                  <HardHat className="h-5 w-5" />
                  Required PPE for This Task
                </h3>
                <div className="flex flex-wrap gap-2">
                  {requiredPPE.map((ppe) => (
                    <Badge key={ppe} className="bg-warning-light text-yellow-800 border-yellow-300">
                      {ppe}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Hazards Section */}
            <div className="bg-card rounded-lg border p-6">
              <h2 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2 heading-section">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Job Steps & Hazards ({jsa.hazards?.length || 0})
              </h2>

              {jsa.hazards && jsa.hazards.length > 0 ? (
                <div className="space-y-4">
                  {jsa.hazards.map((hazard, index) => (
                    <HazardCard key={hazard.id} hazard={hazard} index={index} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted">
                  <AlertTriangle className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p>No hazards have been identified yet.</p>
                  {canEditJSA(jsa) && (
                    <Link to={`/projects/${projectId}/jsa/${jsa.id}/edit`}>
                      <Button variant="outline" className="mt-3">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Hazards
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Review Notes (for approved/completed) */}
            {jsa.review_notes && (
              <div className="bg-card rounded-lg border p-6">
                <h2 className="text-lg font-medium text-foreground mb-4 heading-section">Review Notes</h2>
                <p className="text-sm text-secondary whitespace-pre-wrap">{jsa.review_notes}</p>
                {jsa.reviewed_by_user && jsa.reviewed_at && (
                  <p className="text-xs text-muted mt-2">
                    Reviewed by {jsa.reviewed_by_user.full_name} on{' '}
                    {format(new Date(jsa.reviewed_at), 'MMM d, yyyy h:mm a')}
                  </p>
                )}
              </div>
            )}

            {/* Completion Notes */}
            {jsa.completion_notes && (
              <div className="bg-success-light rounded-lg border border-green-200 p-6">
                <h2 className="text-lg font-medium text-green-800 mb-4 flex items-center gap-2 heading-section">
                  <CheckCircle2 className="h-5 w-5" />
                  Completion Notes
                </h2>
                <p className="text-sm text-success-dark whitespace-pre-wrap">{jsa.completion_notes}</p>
                {jsa.completed_date && (
                  <p className="text-xs text-success mt-2">
                    Completed on {format(new Date(jsa.completed_date), 'MMMM d, yyyy')}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Sidebar - Acknowledgments */}
          <div className="space-y-6">
            <div className="bg-card rounded-lg border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-foreground flex items-center gap-2 heading-section">
                  <UserCheck className="h-5 w-5 text-disabled" />
                  Worker Sign-In
                </h2>
                <span className="text-sm text-muted">
                  {jsa.acknowledgments?.length || 0} signed
                </span>
              </div>

              {/* Sign-in form toggle */}
              {['approved', 'in_progress'].includes(jsa.status) && !showSignIn && (
                <Button
                  variant="outline"
                  className="w-full mb-4"
                  onClick={() => setShowSignIn(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Worker Sign-In
                </Button>
              )}

              {showSignIn && (
                <AcknowledgmentForm
                  jsaId={jsa.id}
                  onClose={() => setShowSignIn(false)}
                />
              )}

              {/* Acknowledgment list */}
              {jsa.acknowledgments && jsa.acknowledgments.length > 0 ? (
                <div className="space-y-3 mt-4">
                  {jsa.acknowledgments.map((ack) => (
                    <div
                      key={ack.id}
                      className="flex items-start justify-between p-3 bg-surface rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-sm text-foreground">{ack.worker_name}</p>
                        {ack.worker_company && (
                          <p className="text-xs text-muted">{ack.worker_company}</p>
                        )}
                        {ack.worker_trade && (
                          <p className="text-xs text-muted">{ack.worker_trade}</p>
                        )}
                        <p className="text-xs text-disabled mt-1">
                          {format(new Date(ack.acknowledged_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                      {['approved', 'in_progress'].includes(jsa.status) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-error hover:text-error-dark hover:bg-error-light"
                          onClick={() => handleRemoveAcknowledgment(ack.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                !showSignIn && (
                  <p className="text-sm text-muted text-center py-4">
                    No workers have signed in yet.
                  </p>
                )
              )}
            </div>

            {/* Status Summary */}
            {jsa.status === 'completed' && (
              <div className="bg-success-light rounded-lg border border-green-200 p-4">
                <div className="flex items-center gap-2 text-green-800 mb-3">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">JSA Completed</span>
                </div>
                <div className="space-y-2 text-sm text-success-dark">
                  {jsa.completed_date && (
                    <div>
                      Completed: {format(new Date(jsa.completed_date), 'MMM d, yyyy')}
                    </div>
                  )}
                  <div>
                    Workers: {jsa.acknowledgments?.length || 0} signed in
                  </div>
                  <div>
                    Hazards: {jsa.hazards?.length || 0} identified
                  </div>
                </div>
              </div>
            )}

            {/* Project Info */}
            {jsa.project && (
              <div className="bg-card rounded-lg border p-4">
                <Label className="text-xs text-muted">Project</Label>
                <p className="text-sm font-medium text-foreground">{jsa.project.name}</p>
                {jsa.project.project_number && (
                  <p className="text-xs text-muted">{jsa.project.project_number}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </SmartLayout>
  );
}

export default JSADetailPage;
