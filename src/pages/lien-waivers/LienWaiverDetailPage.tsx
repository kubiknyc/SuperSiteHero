// File: /src/pages/lien-waivers/LienWaiverDetailPage.tsx
// Lien Waiver detail page with workflow actions

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  useLienWaiver,
  useLienWaiverHistory,
  useSendWaiverRequest,
  useMarkWaiverReceived,
  useApproveWaiver,
  useRejectWaiver,
  useVoidWaiver,
  useSignWaiver,
} from '@/features/lien-waivers/hooks/useLienWaivers';
import {
  LienWaiverStatusBadge,
  LienWaiverTypeBadge,
} from '@/features/lien-waivers/components';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  FileCheck,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Edit,
  Trash2,
  History,
  User,
  Building2,
  DollarSign,
  Calendar,
  FileText,
  AlertTriangle,
  Ban,
  PenTool,
  FileSignature,
} from 'lucide-react';
import { DocumentSignatureDialog, type SignatureData } from '@/components/shared';
import { cn } from '@/lib/utils';
import { downloadLienWaiverPDF } from '@/features/lien-waivers/utils/pdfExport';
import type { LienWaiverHistory } from '@/types/lien-waiver';
import { formatWaiverAmount, getStateName, isWaiverOverdue } from '@/types/lien-waiver';
import { logger } from '../../lib/utils/logger';


export function LienWaiverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Fetch data
  const { data: waiver, isLoading, error } = useLienWaiver(id!);
  const { data: history } = useLienWaiverHistory(id!);

  // Mutations
  const sendRequest = useSendWaiverRequest();
  const markReceived = useMarkWaiverReceived();
  const approveWaiver = useApproveWaiver();
  const rejectWaiver = useRejectWaiver();
  const voidWaiver = useVoidWaiver();
  const signWaiver = useSignWaiver();

  // Dialog states
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);

  // Form states
  const [sendToEmail, setSendToEmail] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [voidReason, setVoidReason] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-disabled" />
        </div>
      </AppLayout>
    );
  }

  if (error || !waiver) {
    return (
      <AppLayout>
        <div className="p-6">
          <Card className="border-red-200 bg-error-light">
            <CardContent className="py-8 text-center">
              <AlertCircle className="h-8 w-8 mx-auto text-error mb-4" />
              <h3 className="text-lg font-medium text-red-800 mb-2 heading-subsection">Error Loading Waiver</h3>
              <p className="text-error">{error?.message || 'Waiver not found'}</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/lien-waivers')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Waivers
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const isOverdue = isWaiverOverdue(waiver);

  // Action handlers
  const handleSendRequest = async () => {
    if (!sendToEmail.trim()) {return;}
    try {
      await sendRequest.mutateAsync({ id: waiver.id, sent_to_email: sendToEmail });
      setSendDialogOpen(false);
      setSendToEmail('');
    } catch (error) {
      logger.error('Failed to send waiver request:', error);
    }
  };

  const handleMarkReceived = async () => {
    try {
      await markReceived.mutateAsync(waiver.id);
    } catch (error) {
      logger.error('Failed to mark waiver as received:', error);
    }
  };

  const handleApprove = async () => {
    try {
      await approveWaiver.mutateAsync({ id: waiver.id });
    } catch (error) {
      logger.error('Failed to approve waiver:', error);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {return;}
    try {
      await rejectWaiver.mutateAsync({ id: waiver.id, rejection_reason: rejectionReason });
      setRejectDialogOpen(false);
      setRejectionReason('');
    } catch (error) {
      logger.error('Failed to reject waiver:', error);
    }
  };

  const handleVoid = async () => {
    if (!voidReason.trim()) {return;}
    try {
      await voidWaiver.mutateAsync({ id: waiver.id, reason: voidReason });
      setVoidDialogOpen(false);
      setVoidReason('');
    } catch (error) {
      logger.error('Failed to void waiver:', error);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await downloadLienWaiverPDF({
        waiver,
        projectId: waiver.project_id
      });
    } catch (error) {
      logger.error('Failed to export PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Signature handlers
  const handleSignatureComplete = async (data: SignatureData) => {
    try {
      await signWaiver.mutateAsync({
        id: waiver.id,
        signature_url: data.signatureUrl,
        claimant_name: data.signedBy || '',
        claimant_title: data.title || '',
        claimant_company: data.company || '',
        signature_date: data.signedAt || new Date().toISOString(),
      });
      setSignatureDialogOpen(false);
    } catch (error) {
      logger.error('Failed to sign waiver:', error);
    }
  };

  const handleSignatureRemove = async () => {
    try {
      // Note: Removing signature requires clearing the signature fields
      // The useSignWaiver hook only updates, so we'll clear the signature by setting empty values
      await signWaiver.mutateAsync({
        id: waiver.id,
        signature_url: '',
        claimant_name: '',
        claimant_title: '',
        claimant_company: '',
        signature_date: '',
      });
      setSignatureDialogOpen(false);
    } catch (error) {
      logger.error('Failed to remove signature:', error);
    }
  };

  // Can sign check (only when waiver is sent or received)
  const canSign = ['sent', 'received'].includes(waiver.status);

  // Render workflow actions based on status
  const renderActions = () => {
    const actions: React.ReactNode[] = [];

    // Export PDF button (always available)
    actions.push(
      <Button key="export" variant="outline" onClick={handleExportPDF} disabled={isExporting}>
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Download className="h-4 w-4 mr-2" />
        )}
        Export PDF
      </Button>
    );

    switch (waiver.status) {
      case 'pending':
        actions.push(
          <Dialog key="send" open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Send className="h-4 w-4 mr-2" />
                Send Request
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Waiver Request</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="send-email">Recipient Email *</Label>
                  <Input
                    id="send-email"
                    type="email"
                    value={sendToEmail}
                    onChange={(e) => setSendToEmail(e.target.value)}
                    placeholder="vendor@example.com"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setSendDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSendRequest} disabled={sendRequest.isPending}>
                    {sendRequest.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Send
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        );
        break;

      case 'sent':
        actions.push(
          <Button key="received" onClick={handleMarkReceived} disabled={markReceived.isPending}>
            {markReceived.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark as Received
          </Button>
        );
        break;

      case 'received':
      case 'under_review':
        actions.push(
          <Button key="approve" onClick={handleApprove} disabled={approveWaiver.isPending}>
            {approveWaiver.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve
          </Button>
        );
        actions.push(
          <Dialog key="reject" open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="text-error border-red-200 hover:bg-error-light">
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reject Waiver</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="rejection-reason">Rejection Reason *</Label>
                  <Textarea
                    id="rejection-reason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Describe why the waiver is being rejected..."
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={rejectWaiver.isPending}
                  >
                    {rejectWaiver.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Reject Waiver
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        );
        break;
    }

    // Void action (available for most statuses)
    if (!['void', 'approved'].includes(waiver.status)) {
      actions.push(
        <Dialog key="void" open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" className="text-muted">
              <Ban className="h-4 w-4 mr-2" />
              Void
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Void Waiver</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="p-3 bg-warning-light border border-amber-200 rounded text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 inline mr-2" />
                This action cannot be undone.
              </div>
              <div className="space-y-2">
                <Label htmlFor="void-reason">Reason for Voiding *</Label>
                <Textarea
                  id="void-reason"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="Describe why the waiver is being voided..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setVoidDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleVoid}
                  disabled={voidWaiver.isPending}
                >
                  {voidWaiver.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Void Waiver
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      );
    }

    return actions;
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="mb-2"
              onClick={() => navigate('/lien-waivers')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Waivers
            </Button>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground heading-page">
                {waiver.waiver_number}
              </h1>
              <LienWaiverStatusBadge status={waiver.status} />
              <LienWaiverTypeBadge type={waiver.waiver_type} />
              {isOverdue && (
                <Badge className="bg-error-light text-error-dark">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Overdue
                </Badge>
              )}
            </div>
            <p className="text-secondary mt-1">
              {waiver.project?.name || 'Unknown Project'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {renderActions()}
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="details" className="space-y-4">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="document">Document</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Vendor/Subcontractor Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Vendor Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="text-sm text-muted">Company</span>
                    <p className="font-medium">
                      {waiver.subcontractor?.company_name || waiver.vendor_name || 'N/A'}
                    </p>
                  </div>
                  {waiver.claimant_name && (
                    <div>
                      <span className="text-sm text-muted">Claimant</span>
                      <p className="font-medium">{waiver.claimant_name}</p>
                      {waiver.claimant_title && (
                        <p className="text-sm text-secondary">{waiver.claimant_title}</p>
                      )}
                    </div>
                  )}
                  {waiver.sent_to_email && (
                    <div>
                      <span className="text-sm text-muted">Email</span>
                      <p className="font-medium">{waiver.sent_to_email}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Payment Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="text-sm text-muted">Amount</span>
                    <p className="font-medium text-lg text-success-dark">
                      {formatWaiverAmount(waiver.payment_amount)}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-muted">Through Date</span>
                    <p className="font-medium">
                      {format(new Date(waiver.through_date), 'MMMM d, yyyy')}
                    </p>
                  </div>
                  {waiver.check_number && (
                    <div>
                      <span className="text-sm text-muted">Check Number</span>
                      <p className="font-medium">{waiver.check_number}</p>
                    </div>
                  )}
                  {waiver.payment_application && (
                    <div>
                      <span className="text-sm text-muted">Payment Application</span>
                      <p className="font-medium">
                        App #{waiver.payment_application.application_number}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Dates */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Dates
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="text-sm text-muted">Created</span>
                    <p className="font-medium">
                      {format(new Date(waiver.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  {waiver.due_date && (
                    <div>
                      <span className="text-sm text-muted">Due Date</span>
                      <p className={cn('font-medium', isOverdue && 'text-error')}>
                        {format(new Date(waiver.due_date), 'MMMM d, yyyy')}
                        {isOverdue && ' (Overdue)'}
                      </p>
                    </div>
                  )}
                  {waiver.sent_at && (
                    <div>
                      <span className="text-sm text-muted">Sent</span>
                      <p className="font-medium">
                        {format(new Date(waiver.sent_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  )}
                  {waiver.received_at && (
                    <div>
                      <span className="text-sm text-muted">Received</span>
                      <p className="font-medium">
                        {format(new Date(waiver.received_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  )}
                  {waiver.approved_at && (
                    <div>
                      <span className="text-sm text-muted">Approved</span>
                      <p className="font-medium text-success">
                        {format(new Date(waiver.approved_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Signature Info */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileSignature className="h-4 w-4" />
                    Signature
                  </CardTitle>
                  {canSign && !waiver.signed_at && (
                    <Button
                      size="sm"
                      onClick={() => setSignatureDialogOpen(true)}
                    >
                      <PenTool className="h-4 w-4 mr-2" />
                      Sign Waiver
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {waiver.signed_at ? (
                    <>
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle className="h-4 w-4" />
                        <span className="font-medium">Signed</span>
                      </div>
                      {waiver.signature_url && (
                        <div className="border rounded-lg p-3 bg-surface">
                          <img
                            src={waiver.signature_url}
                            alt="Signature"
                            className="max-h-20 mx-auto"
                          />
                        </div>
                      )}
                      <div>
                        <span className="text-sm text-muted">Signed By</span>
                        <p className="font-medium">{waiver.claimant_name}</p>
                        {waiver.claimant_title && (
                          <p className="text-sm text-secondary">{waiver.claimant_title}</p>
                        )}
                        {waiver.claimant_company && (
                          <p className="text-sm text-secondary">{waiver.claimant_company}</p>
                        )}
                      </div>
                      <div>
                        <span className="text-sm text-muted">Signed On</span>
                        <p className="font-medium">
                          {format(new Date(waiver.signed_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      {canSign && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => setSignatureDialogOpen(true)}
                        >
                          <PenTool className="h-4 w-4 mr-2" />
                          Update Signature
                        </Button>
                      )}
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-muted">
                        <Clock className="h-4 w-4" />
                        <span>Awaiting signature</span>
                      </div>
                      {canSign && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setSignatureDialogOpen(true)}
                        >
                          <PenTool className="h-4 w-4 mr-2" />
                          Sign Waiver
                        </Button>
                      )}
                    </div>
                  )}
                  {waiver.notarization_required && (
                    <div className="pt-2 border-t">
                      <Badge variant="outline" className="mb-2">
                        Notarization Required
                      </Badge>
                      {waiver.notarized_at ? (
                        <div className="text-sm text-success">
                          <CheckCircle className="h-3 w-3 inline mr-1" />
                          Notarized on {format(new Date(waiver.notarized_at), 'MMM d, yyyy')}
                        </div>
                      ) : (
                        <div className="text-sm text-warning">
                          <Clock className="h-3 w-3 inline mr-1" />
                          Pending notarization
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Notes/Exceptions */}
            {(waiver.exceptions || waiver.notes || waiver.rejection_reason) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Additional Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {waiver.exceptions && (
                    <div>
                      <span className="text-sm font-medium text-secondary">Exceptions</span>
                      <p className="text-secondary mt-1">{waiver.exceptions}</p>
                    </div>
                  )}
                  {waiver.notes && (
                    <div>
                      <span className="text-sm font-medium text-secondary">Notes</span>
                      <p className="text-secondary mt-1">{waiver.notes}</p>
                    </div>
                  )}
                  {waiver.rejection_reason && (
                    <div className="p-3 bg-error-light border border-red-200 rounded">
                      <span className="text-sm font-medium text-error-dark">Rejection Reason</span>
                      <p className="text-error mt-1">{waiver.rejection_reason}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Document Tab */}
          <TabsContent value="document">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Waiver Document
                </CardTitle>
                <CardDescription>
                  {waiver.template?.name || 'Custom waiver document'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {waiver.document_url ? (
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4 bg-surface">
                      <p className="text-sm text-secondary mb-4">
                        Document has been uploaded and is ready for review.
                      </p>
                      <Button asChild>
                        <a href={waiver.document_url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-2" />
                          Download Document
                        </a>
                      </Button>
                    </div>
                  </div>
                ) : waiver.rendered_content ? (
                  <div
                    className="prose max-w-none border rounded-lg p-6 bg-card"
                    dangerouslySetInnerHTML={{ __html: waiver.rendered_content }}
                  />
                ) : (
                  <div className="text-center py-8 text-muted">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No document generated yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {history && history.length > 0 ? (
                  <div className="space-y-4">
                    {history.map((entry: LienWaiverHistory) => (
                      <div
                        key={entry.id}
                        className="flex items-start gap-3 pb-4 border-b last:border-b-0"
                      >
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          {entry.action === 'created' && <FileCheck className="h-4 w-4 text-primary" />}
                          {entry.action === 'sent' && <Send className="h-4 w-4 text-primary" />}
                          {entry.action === 'received' && <CheckCircle className="h-4 w-4 text-warning" />}
                          {entry.action === 'signed' && <User className="h-4 w-4 text-success" />}
                          {entry.action === 'approved' && <CheckCircle className="h-4 w-4 text-success" />}
                          {entry.action === 'rejected' && <XCircle className="h-4 w-4 text-error" />}
                          {entry.action === 'status_changed' && <Clock className="h-4 w-4 text-secondary" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium capitalize">
                              {entry.action.replace('_', ' ')}
                            </span>
                            <span className="text-sm text-muted">
                              {format(new Date(entry.changed_at), 'MMM d, yyyy h:mm a')}
                            </span>
                          </div>
                          {entry.notes && (
                            <p className="text-sm text-secondary mt-1">{entry.notes}</p>
                          )}
                          {entry.old_value && entry.new_value && (
                            <p className="text-sm text-muted mt-1">
                              {entry.field_changed}: {entry.old_value} → {entry.new_value}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No history available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Signature Dialog */}
      <DocumentSignatureDialog
        open={signatureDialogOpen}
        onOpenChange={setSignatureDialogOpen}
        documentType="lien_waiver"
        documentId={waiver.id}
        documentName={waiver.waiver_number}
        role="claimant"
        roleLabel="Claimant"
        defaultSignerName={waiver.claimant_name || ''}
        existingSignature={waiver.signature_url}
        onSignatureComplete={handleSignatureComplete}
        onSignatureRemove={handleSignatureRemove}
        requireSignerInfo={true}
        disabled={signWaiver.isPending}
        allowDocuSign={true}
      />
    </AppLayout>
  );
}

export default LienWaiverDetailPage;
