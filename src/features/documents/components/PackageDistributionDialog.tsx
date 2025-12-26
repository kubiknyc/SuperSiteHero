/**
 * Package Distribution Dialog
 * Manage recipients and distribute drawing packages
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
} from '@/components/ui/alert-dialog';
import {
  Mail,
  Link2,
  Download,
  Users,
  Plus,
  Trash2,
  Send,
  Copy,
  Check,
  Clock,
  Eye,
  FileCheck,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  useAddPackageRecipient,
  useAddMultiplePackageRecipients,
  useRemovePackageRecipient,
  useDistributePackage,
  useGenerateShareableLink,
} from '../hooks/useDrawingPackages';
import type {
  DrawingPackage,
  DrawingPackageRecipient,
  DrawingPackageRecipientInsert,
} from '@/types/drawing';
import { logger } from '../../../lib/utils/logger';


interface PackageDistributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  package: DrawingPackage;
  onDistributeSuccess?: () => void;
}

interface RecipientFormData {
  recipientEmail: string;
  recipientName: string;
  recipientCompany: string;
  recipientRole: string;
  distributionMethod: 'email' | 'link' | 'download';
  sendReminder: boolean;
}

const initialFormData: RecipientFormData = {
  recipientEmail: '',
  recipientName: '',
  recipientCompany: '',
  recipientRole: '',
  distributionMethod: 'email',
  sendReminder: true,
};

const RECIPIENT_ROLES = [
  'Contractor',
  'Subcontractor',
  'Architect',
  'Engineer',
  'Owner',
  'Consultant',
  'Inspector',
  'Other',
];

export function PackageDistributionDialog({
  open,
  onOpenChange,
  package: pkg,
  onDistributeSuccess,
}: PackageDistributionDialogProps) {
  const [activeTab, setActiveTab] = useState<'recipients' | 'tracking'>('recipients');
  const [formData, setFormData] = useState<RecipientFormData>(initialFormData);
  const [bulkEmails, setBulkEmails] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [showConfirmDistribute, setShowConfirmDistribute] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const addRecipient = useAddPackageRecipient();
  const addMultipleRecipients = useAddMultiplePackageRecipients();
  const removeRecipient = useRemovePackageRecipient();
  const distributePackage = useDistributePackage();
  const generateLink = useGenerateShareableLink();

  const recipients = pkg.recipients || [];
  const pendingRecipients = recipients.filter((r) => !r.sentAt);
  const sentRecipients = recipients.filter((r) => r.sentAt);

  const updateFormData = useCallback((updates: Partial<RecipientFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleAddRecipient = useCallback(async () => {
    if (!formData.recipientEmail.trim()) {return;}

    try {
      await addRecipient.mutateAsync({
        packageId: pkg.id,
        recipientEmail: formData.recipientEmail.trim().toLowerCase(),
        recipientName: formData.recipientName.trim() || undefined,
        recipientCompany: formData.recipientCompany.trim() || undefined,
        recipientRole: formData.recipientRole || undefined,
        distributionMethod: formData.distributionMethod,
        sendReminder: formData.sendReminder,
      });
      setFormData(initialFormData);
    } catch (error) {
      logger.error('Failed to add recipient:', error);
    }
  }, [pkg.id, formData, addRecipient]);

  const handleBulkAdd = useCallback(async () => {
    const emails = bulkEmails
      .split(/[\n,;]/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    if (emails.length === 0) {return;}

    try {
      await addMultipleRecipients.mutateAsync({
        packageId: pkg.id,
        recipients: emails.map((email) => ({
          recipientEmail: email,
          distributionMethod: 'email',
          sendReminder: true,
        })),
      });
      setBulkEmails('');
    } catch (error) {
      logger.error('Failed to add recipients:', error);
    }
  }, [pkg.id, bulkEmails, addMultipleRecipients]);

  const handleRemoveRecipient = useCallback(
    async (recipientId: string) => {
      try {
        await removeRecipient.mutateAsync({
          id: recipientId,
          packageId: pkg.id,
        });
        setSelectedRecipients((prev) => prev.filter((id) => id !== recipientId));
      } catch (error) {
        logger.error('Failed to remove recipient:', error);
      }
    },
    [pkg.id, removeRecipient]
  );

  const handleDistribute = useCallback(async () => {
    try {
      const recipientIds = selectedRecipients.length > 0 ? selectedRecipients : undefined;
      await distributePackage.mutateAsync({
        packageId: pkg.id,
        recipientIds,
      });
      setShowConfirmDistribute(false);
      setSelectedRecipients([]);
      onDistributeSuccess?.();
    } catch (error) {
      logger.error('Failed to distribute package:', error);
    }
  }, [pkg.id, selectedRecipients, distributePackage, onDistributeSuccess]);

  const handleGenerateLink = useCallback(async () => {
    try {
      const link = await generateLink.mutateAsync({
        packageId: pkg.id,
        expiresInDays: 30,
      });
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch (error) {
      logger.error('Failed to generate link:', error);
    }
  }, [pkg.id, generateLink]);

  const toggleRecipientSelection = useCallback((id: string) => {
    setSelectedRecipients((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  }, []);

  const selectAllPending = useCallback(() => {
    setSelectedRecipients(pendingRecipients.map((r) => r.id));
  }, [pendingRecipients]);

  const isLoading =
    addRecipient.isPending ||
    addMultipleRecipients.isPending ||
    removeRecipient.isPending ||
    distributePackage.isPending ||
    generateLink.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Distribute Package</DialogTitle>
            <DialogDescription>
              {pkg.name} ({pkg.packageNumber})
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="recipients" className="gap-2">
                <Users className="h-4 w-4" />
                Recipients ({recipients.length})
              </TabsTrigger>
              <TabsTrigger value="tracking" className="gap-2">
                <Eye className="h-4 w-4" />
                Tracking
              </TabsTrigger>
            </TabsList>

            <TabsContent value="recipients" className="space-y-4 mt-4">
              {/* Add Recipient Form */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium heading-subsection">Add Recipients</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateLink}
                    disabled={isLoading}
                  >
                    {generateLink.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : copiedLink ? (
                      <Check className="h-4 w-4 mr-2" />
                    ) : (
                      <Link2 className="h-4 w-4 mr-2" />
                    )}
                    {copiedLink ? 'Link Copied!' : 'Generate Link'}
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="recipientEmail">Email *</Label>
                    <Input
                      id="recipientEmail"
                      type="email"
                      value={formData.recipientEmail}
                      onChange={(e) => updateFormData({ recipientEmail: e.target.value })}
                      placeholder="contractor@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recipientName">Name</Label>
                    <Input
                      id="recipientName"
                      value={formData.recipientName}
                      onChange={(e) => updateFormData({ recipientName: e.target.value })}
                      placeholder="John Smith"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recipientCompany">Company</Label>
                    <Input
                      id="recipientCompany"
                      value={formData.recipientCompany}
                      onChange={(e) => updateFormData({ recipientCompany: e.target.value })}
                      placeholder="ABC Construction"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recipientRole">Role</Label>
                    <Select
                      value={formData.recipientRole}
                      onValueChange={(value) => updateFormData({ recipientRole: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {RECIPIENT_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={formData.sendReminder}
                      onCheckedChange={(checked) =>
                        updateFormData({ sendReminder: !!checked })
                      }
                    />
                    Send reminder if not acknowledged
                  </label>
                  <Button
                    onClick={handleAddRecipient}
                    disabled={!formData.recipientEmail.trim() || isLoading}
                    size="sm"
                  >
                    {addRecipient.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    )}
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>

                {/* Bulk Add */}
                <div className="pt-4 border-t space-y-2">
                  <Label htmlFor="bulkEmails">Bulk Add (paste emails)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="bulkEmails"
                      value={bulkEmails}
                      onChange={(e) => setBulkEmails(e.target.value)}
                      placeholder="email1@example.com, email2@example.com"
                      className="flex-1"
                    />
                    <Button
                      onClick={handleBulkAdd}
                      disabled={!bulkEmails.trim() || isLoading}
                      variant="outline"
                      size="sm"
                    >
                      {addMultipleRecipients.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      )}
                      Add All
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Recipient List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium heading-subsection">Pending Recipients</h3>
                  {pendingRecipients.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={selectAllPending}>
                      Select All
                    </Button>
                  )}
                </div>

                {pendingRecipients.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground border rounded-lg">
                    No pending recipients. Add recipients above to distribute the package.
                  </div>
                ) : (
                  <ScrollArea className="h-[200px] border rounded-lg">
                    <div className="divide-y">
                      {pendingRecipients.map((recipient) => (
                        <RecipientRow
                          key={recipient.id}
                          recipient={recipient}
                          isSelected={selectedRecipients.includes(recipient.id)}
                          onToggle={() => toggleRecipientSelection(recipient.id)}
                          onRemove={() => handleRemoveRecipient(recipient.id)}
                          showCheckbox
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </TabsContent>

            <TabsContent value="tracking" className="space-y-4 mt-4">
              {/* Stats Summary */}
              {pkg.statistics && (
                <div className="grid grid-cols-4 gap-4">
                  <StatCard
                    label="Sent"
                    value={pkg.statistics.sentCount}
                    total={pkg.statistics.totalRecipients}
                    icon={<Send className="h-4 w-4" />}
                  />
                  <StatCard
                    label="Accessed"
                    value={pkg.statistics.accessedCount}
                    total={pkg.statistics.sentCount}
                    icon={<Eye className="h-4 w-4" />}
                  />
                  <StatCard
                    label="Downloaded"
                    value={pkg.statistics.downloadedCount}
                    total={pkg.statistics.sentCount}
                    icon={<Download className="h-4 w-4" />}
                  />
                  <StatCard
                    label="Acknowledged"
                    value={pkg.statistics.acknowledgedCount}
                    total={pkg.requireAcknowledgment ? pkg.statistics.sentCount : undefined}
                    icon={<FileCheck className="h-4 w-4" />}
                    highlight={
                      pkg.requireAcknowledgment &&
                      pkg.statistics.pendingAcknowledgments > 0
                    }
                  />
                </div>
              )}

              <Separator />

              {/* Sent Recipients */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium heading-subsection">Distribution History</h3>
                {sentRecipients.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground border rounded-lg">
                    No packages have been distributed yet.
                  </div>
                ) : (
                  <ScrollArea className="h-[300px] border rounded-lg">
                    <div className="divide-y">
                      {sentRecipients.map((recipient) => (
                        <RecipientTrackingRow key={recipient.id} recipient={recipient} />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <Separator />

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {activeTab === 'recipients' && pendingRecipients.length > 0 && (
              <Button
                onClick={() => setShowConfirmDistribute(true)}
                disabled={isLoading}
              >
                <Send className="h-4 w-4 mr-2" />
                Distribute to{' '}
                {selectedRecipients.length > 0
                  ? selectedRecipients.length
                  : pendingRecipients.length}{' '}
                Recipient{(selectedRecipients.length || pendingRecipients.length) !== 1
                  ? 's'
                  : ''}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Distribution Dialog */}
      <AlertDialog open={showConfirmDistribute} onOpenChange={setShowConfirmDistribute}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Distribute Package?</AlertDialogTitle>
            <AlertDialogDescription>
              This will send email notifications to{' '}
              {selectedRecipients.length > 0
                ? selectedRecipients.length
                : pendingRecipients.length}{' '}
              recipient(s) with access to the drawing package. The package status will be
              updated to "Distributed".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDistribute} disabled={isLoading}>
              {distributePackage.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Distribute
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface RecipientRowProps {
  recipient: DrawingPackageRecipient;
  isSelected?: boolean;
  onToggle?: () => void;
  onRemove?: () => void;
  showCheckbox?: boolean;
}

function RecipientRow({
  recipient,
  isSelected,
  onToggle,
  onRemove,
  showCheckbox,
}: RecipientRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 p-3 hover:bg-muted/50 transition-colors',
        isSelected && 'bg-primary/5'
      )}
    >
      {showCheckbox && (
        <Checkbox checked={isSelected} onCheckedChange={onToggle} />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">
            {recipient.recipientName || recipient.recipientEmail}
          </span>
          {recipient.recipientRole && (
            <Badge variant="outline" className="text-xs">
              {recipient.recipientRole}
            </Badge>
          )}
        </div>
        {recipient.recipientName && (
          <p className="text-sm text-muted-foreground truncate">
            {recipient.recipientEmail}
          </p>
        )}
        {recipient.recipientCompany && (
          <p className="text-xs text-muted-foreground">{recipient.recipientCompany}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={cn(
            'text-xs',
            recipient.distributionMethod === 'email' && 'bg-blue-50 text-primary-hover',
            recipient.distributionMethod === 'link' && 'bg-purple-50 text-purple-700',
            recipient.distributionMethod === 'download' && 'bg-success-light text-success-dark'
          )}
        >
          {recipient.distributionMethod === 'email' && <Mail className="h-3 w-3 mr-1" />}
          {recipient.distributionMethod === 'link' && <Link2 className="h-3 w-3 mr-1" />}
          {recipient.distributionMethod === 'download' && (
            <Download className="h-3 w-3 mr-1" />
          )}
          {recipient.distributionMethod}
        </Badge>
        {onRemove && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>
    </div>
  );
}

interface RecipientTrackingRowProps {
  recipient: DrawingPackageRecipient;
}

function RecipientTrackingRow({ recipient }: RecipientTrackingRowProps) {
  return (
    <div className="p-3 hover:bg-muted/50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {recipient.recipientName || recipient.recipientEmail}
          </span>
          {recipient.recipientCompany && (
            <span className="text-sm text-muted-foreground">
              ({recipient.recipientCompany})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {recipient.acknowledgedAt && (
            <Badge variant="default" className="bg-green-500">
              <FileCheck className="h-3 w-3 mr-1" />
              Acknowledged
            </Badge>
          )}
          {recipient.downloadedAt && !recipient.acknowledgedAt && (
            <Badge variant="secondary">
              <Download className="h-3 w-3 mr-1" />
              Downloaded
            </Badge>
          )}
          {recipient.firstAccessedAt &&
            !recipient.downloadedAt &&
            !recipient.acknowledgedAt && (
              <Badge variant="outline">
                <Eye className="h-3 w-3 mr-1" />
                Viewed
              </Badge>
            )}
          {!recipient.firstAccessedAt && (
            <Badge variant="outline" className="text-muted-foreground">
              <Clock className="h-3 w-3 mr-1" />
              Pending
            </Badge>
          )}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 text-xs text-muted-foreground">
        <div>
          <span className="block text-muted">Sent</span>
          {recipient.sentAt
            ? format(new Date(recipient.sentAt), 'MM/dd/yy h:mm a')
            : '-'}
        </div>
        <div>
          <span className="block text-muted">First Viewed</span>
          {recipient.firstAccessedAt
            ? formatDistanceToNow(new Date(recipient.firstAccessedAt), {
                addSuffix: true,
              })
            : '-'}
        </div>
        <div>
          <span className="block text-muted">Downloads</span>
          {recipient.downloadCount || 0}
        </div>
        <div>
          <span className="block text-muted">Acknowledged</span>
          {recipient.acknowledgedAt
            ? format(new Date(recipient.acknowledgedAt), 'MM/dd/yy')
            : '-'}
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  total?: number;
  icon: React.ReactNode;
  highlight?: boolean;
}

function StatCard({ label, value, total, icon, highlight }: StatCardProps) {
  return (
    <div
      className={cn(
        'p-4 border rounded-lg',
        highlight && 'border-warning bg-warning-light'
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-2xl font-bold">
        {value}
        {total !== undefined && (
          <span className="text-sm font-normal text-muted-foreground">/{total}</span>
        )}
      </div>
    </div>
  );
}
