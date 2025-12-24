/**
 * Report Share Dialog Component
 *
 * Modal dialog for creating, viewing, and managing report shares.
 * Supports:
 * - Public link generation with copy-to-clipboard
 * - Expiration date selection
 * - Export permission control
 * - Embed code generation
 * - Multiple share management
 */

import { useState, useEffect } from 'react'
import { format, addDays } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Link2,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  Globe,
  Lock,
  Clock,
  Code,
  Download,
  ExternalLink,
  Loader2,
  Eye,
  AlertTriangle,
} from 'lucide-react'
import { useAuth } from '@/lib/auth/AuthContext'
import {
  useReportShares,
  useCreateReportShare,
  useUpdateReportShare,
  useDeleteReportShare,
  useRegenerateShareToken,
  useCopyToClipboard,
} from '../hooks/useReportSharing'
import { reportSharingApi } from '@/lib/api/services/report-sharing'
import type { ReportTemplate, SharedReport } from '@/types/report-builder'
import { SHARE_EXPIRATION_PRESETS } from '@/types/report-builder'

interface ReportShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: ReportTemplate
}

export function ReportShareDialog({
  open,
  onOpenChange,
  template,
}: ReportShareDialogProps) {
  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id

  // State
  const [activeTab, setActiveTab] = useState('link')
  const [copied, setCopied] = useState(false)
  const [embedCopied, setEmbedCopied] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedShare, setSelectedShare] = useState<SharedReport | null>(null)

  // New share form state
  const [isPublic, setIsPublic] = useState(true)
  const [expirationDays, setExpirationDays] = useState<number | null>(null)
  const [allowExport, setAllowExport] = useState(true)
  const [showBranding, setShowBranding] = useState(true)
  const [customMessage, setCustomMessage] = useState('')

  // Queries
  const { data: shares, isLoading: sharesLoading } = useReportShares(template.id)

  // Mutations
  const createShare = useCreateReportShare()
  const updateShare = useUpdateReportShare()
  const deleteShare = useDeleteReportShare()
  const regenerateToken = useRegenerateShareToken()
  const { copyToClipboard } = useCopyToClipboard()

  // Get the first (or only) share for this report
  const activeShare = shares?.[0]

  // Reset copied state after delay
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [copied])

  useEffect(() => {
    if (embedCopied) {
      const timer = setTimeout(() => setEmbedCopied(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [embedCopied])

  // Create new share
  const handleCreateShare = async () => {
    if (!companyId) return

    const expiresAt = expirationDays
      ? addDays(new Date(), expirationDays).toISOString()
      : null

    await createShare.mutateAsync({
      reportTemplateId: template.id,
      companyId,
      isPublic,
      expiresAt,
      allowExport,
      showBranding,
      customMessage: customMessage.trim() || null,
    })
  }

  // Copy share URL
  const handleCopyLink = async () => {
    if (!activeShare) return
    const url = reportSharingApi.getShareUrl(activeShare.public_token)
    const success = await copyToClipboard(url, 'Share link')
    if (success) setCopied(true)
  }

  // Copy embed code
  const handleCopyEmbed = async () => {
    if (!activeShare) return
    const embedCode = reportSharingApi.getEmbedCode(activeShare.public_token)
    const success = await copyToClipboard(embedCode, 'Embed code')
    if (success) setEmbedCopied(true)
  }

  // Regenerate token
  const handleRegenerateToken = async () => {
    if (!activeShare) return
    await regenerateToken.mutateAsync({
      shareId: activeShare.id,
      reportTemplateId: template.id,
    })
  }

  // Delete share
  const handleDeleteShare = async () => {
    if (!selectedShare) return
    await deleteShare.mutateAsync({
      shareId: selectedShare.id,
      reportTemplateId: template.id,
    })
    setDeleteDialogOpen(false)
    setSelectedShare(null)
  }

  // Update share settings
  const handleUpdateShare = async (shareId: string, updates: Partial<SharedReport>) => {
    await updateShare.mutateAsync({
      shareId,
      data: {
        isPublic: updates.is_public,
        allowExport: updates.allow_export,
        showBranding: updates.show_branding,
        customMessage: updates.custom_message,
      },
    })
  }

  // Check if share is expired
  const isExpired = (share: SharedReport) => {
    if (!share.expires_at) return false
    return new Date(share.expires_at) < new Date()
  }

  const shareUrl = activeShare ? reportSharingApi.getShareUrl(activeShare.public_token) : ''
  const embedCode = activeShare ? reportSharingApi.getEmbedCode(activeShare.public_token) : ''

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Share Report
            </DialogTitle>
            <DialogDescription>
              Create a shareable link for &quot;{template.name}&quot;
            </DialogDescription>
          </DialogHeader>

          {sharesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !activeShare ? (
            // Create new share form
            <div className="space-y-6">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  {/* Access Type */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        {isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                        Public Access
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {isPublic
                          ? 'Anyone with the link can view this report'
                          : 'Only specific users can access this report'}
                      </p>
                    </div>
                    <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                  </div>

                  {/* Expiration */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Link Expiration
                    </Label>
                    <Select
                      value={expirationDays === null ? 'never' : String(expirationDays)}
                      onValueChange={(v) => setExpirationDays(v === 'never' ? null : Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SHARE_EXPIRATION_PRESETS.map((preset) => (
                          <SelectItem
                            key={preset.value ?? 'never'}
                            value={preset.value === null ? 'never' : String(preset.value)}
                          >
                            {preset.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Export Permission */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        Allow Export
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Allow viewers to export to PDF, Excel, and CSV
                      </p>
                    </div>
                    <Switch checked={allowExport} onCheckedChange={setAllowExport} />
                  </div>

                  {/* Branding */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Show Branding</Label>
                      <p className="text-sm text-muted-foreground">
                        Display &quot;Powered by SuperSiteHero&quot; footer
                      </p>
                    </div>
                    <Switch checked={showBranding} onCheckedChange={setShowBranding} />
                  </div>

                  {/* Custom Message */}
                  <div className="space-y-2">
                    <Label>Custom Message (Optional)</Label>
                    <Textarea
                      placeholder="Add a message to display on the shared report..."
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateShare}
                  disabled={createShare.isPending}
                >
                  {createShare.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  <Link2 className="h-4 w-4 mr-2" />
                  Create Share Link
                </Button>
              </div>
            </div>
          ) : (
            // Existing share management
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="link" className="gap-2">
                  <Link2 className="h-4 w-4" />
                  Link
                </TabsTrigger>
                <TabsTrigger value="embed" className="gap-2">
                  <Code className="h-4 w-4" />
                  Embed
                </TabsTrigger>
                <TabsTrigger value="settings" className="gap-2">
                  <Lock className="h-4 w-4" />
                  Settings
                </TabsTrigger>
              </TabsList>

              {/* Link Tab */}
              <TabsContent value="link" className="space-y-4">
                {isExpired(activeShare) && (
                  <div className="flex items-center gap-2 p-3 bg-warning-light border border-yellow-200 rounded-lg text-yellow-800">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">This share link has expired</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Share Link</Label>
                  <div className="flex gap-2">
                    <Input
                      value={shareUrl}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      onClick={handleCopyLink}
                      className="shrink-0"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    {activeShare.view_count} views
                  </div>
                  {activeShare.expires_at && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Expires {format(new Date(activeShare.expires_at), 'MMM d, yyyy')}
                    </div>
                  )}
                  <Badge variant={activeShare.is_public ? 'default' : 'secondary'}>
                    {activeShare.is_public ? (
                      <>
                        <Globe className="h-3 w-3 mr-1" />
                        Public
                      </>
                    ) : (
                      <>
                        <Lock className="h-3 w-3 mr-1" />
                        Private
                      </>
                    )}
                  </Badge>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Preview
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerateToken}
                    disabled={regenerateToken.isPending}
                  >
                    {regenerateToken.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    New Link
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-error hover:text-error-dark"
                    onClick={() => {
                      setSelectedShare(activeShare)
                      setDeleteDialogOpen(true)
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                </div>
              </TabsContent>

              {/* Embed Tab */}
              <TabsContent value="embed" className="space-y-4">
                <div className="space-y-2">
                  <Label>Embed Code</Label>
                  <Textarea
                    value={embedCode}
                    readOnly
                    className="font-mono text-sm h-24"
                  />
                </div>

                <Button
                  variant="outline"
                  onClick={handleCopyEmbed}
                >
                  {embedCopied ? (
                    <Check className="h-4 w-4 mr-2 text-success" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  Copy Embed Code
                </Button>

                <div className="text-sm text-muted-foreground">
                  <p>Paste this code into your website or application to embed the report.</p>
                  <p className="mt-1">The embedded report will automatically update when data changes.</p>
                </div>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-4">
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    {/* Access Type */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Public Access</Label>
                        <p className="text-sm text-muted-foreground">
                          Anyone with the link can view
                        </p>
                      </div>
                      <Switch
                        checked={activeShare.is_public}
                        onCheckedChange={(checked) =>
                          handleUpdateShare(activeShare.id, { is_public: checked })
                        }
                        disabled={updateShare.isPending}
                      />
                    </div>

                    {/* Export Permission */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Allow Export</Label>
                        <p className="text-sm text-muted-foreground">
                          Allow PDF, Excel, CSV export
                        </p>
                      </div>
                      <Switch
                        checked={activeShare.allow_export}
                        onCheckedChange={(checked) =>
                          handleUpdateShare(activeShare.id, { allow_export: checked })
                        }
                        disabled={updateShare.isPending}
                      />
                    </div>

                    {/* Branding */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Show Branding</Label>
                        <p className="text-sm text-muted-foreground">
                          Display SuperSiteHero footer
                        </p>
                      </div>
                      <Switch
                        checked={activeShare.show_branding}
                        onCheckedChange={(checked) =>
                          handleUpdateShare(activeShare.id, { show_branding: checked })
                        }
                        disabled={updateShare.isPending}
                      />
                    </div>
                  </CardContent>
                </Card>

                <div className="text-sm text-muted-foreground">
                  <p>Created {format(new Date(activeShare.created_at), 'MMM d, yyyy')}</p>
                  {activeShare.creator && (
                    <p>by {activeShare.creator.full_name || activeShare.creator.email}</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Share Link?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the share link. Anyone with the link will no longer
              be able to access this report. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteShare}
              className="bg-error hover:bg-red-700"
            >
              {deleteShare.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default ReportShareDialog
