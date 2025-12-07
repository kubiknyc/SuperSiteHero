// File: /src/features/documents/components/markup/MarkupSharingDialog.tsx
// Dialog for sharing markups with team members and subcontractors

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Share2,
  Users,
  UserCheck,
  Building2,
  Lock,
  Globe,
  Eye,
  Edit2,
  Shield,
  Check,
  Copy,
  Link,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MarkupShareSettings, MarkupPermissionLevel } from '../../types/markup'

interface MarkupSharingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  markupId: string
  currentSettings: MarkupShareSettings
  onSave: (settings: MarkupShareSettings) => void
  availableRoles: { id: string; name: string }[]
  availableUsers: { id: string; name: string; role?: string }[]
  isLoading?: boolean
}

const PERMISSION_LEVELS: {
  value: MarkupPermissionLevel
  label: string
  description: string
  icon: React.ReactNode
}[] = [
  {
    value: 'view',
    label: 'View Only',
    description: 'Can view but not edit the markup',
    icon: <Eye className="w-4 h-4" />,
  },
  {
    value: 'edit',
    label: 'Can Edit',
    description: 'Can view and modify the markup',
    icon: <Edit2 className="w-4 h-4" />,
  },
  {
    value: 'admin',
    label: 'Full Access',
    description: 'Can edit, share, and delete the markup',
    icon: <Shield className="w-4 h-4" />,
  },
]

const DEFAULT_ROLES = [
  { id: 'superintendent', name: 'Superintendent' },
  { id: 'project_manager', name: 'Project Manager' },
  { id: 'office_admin', name: 'Office Admin' },
  { id: 'field_employee', name: 'Field Employee' },
  { id: 'subcontractor', name: 'Subcontractor' },
  { id: 'architect', name: 'Architect' },
]

export function MarkupSharingDialog({
  open,
  onOpenChange,
  markupId,
  currentSettings,
  onSave,
  availableRoles = DEFAULT_ROLES,
  availableUsers = [],
  isLoading = false,
}: MarkupSharingDialogProps) {
  const [settings, setSettings] = useState<MarkupShareSettings>(currentSettings)
  const [copied, setCopied] = useState(false)

  const handleToggleShared = () => {
    setSettings({
      ...settings,
      isShared: !settings.isShared,
    })
  }

  const handleToggleTeam = () => {
    setSettings({
      ...settings,
      sharedWithTeam: !settings.sharedWithTeam,
    })
  }

  const handleToggleSubcontractors = () => {
    setSettings({
      ...settings,
      sharedWithSubcontractors: !settings.sharedWithSubcontractors,
    })
  }

  const handleToggleRole = (roleId: string) => {
    const newRoles = settings.sharedWithRoles.includes(roleId)
      ? settings.sharedWithRoles.filter(r => r !== roleId)
      : [...settings.sharedWithRoles, roleId]
    setSettings({
      ...settings,
      sharedWithRoles: newRoles,
    })
  }

  const handleToggleUser = (userId: string) => {
    const newUsers = settings.sharedWithUsers.includes(userId)
      ? settings.sharedWithUsers.filter(u => u !== userId)
      : [...settings.sharedWithUsers, userId]
    setSettings({
      ...settings,
      sharedWithUsers: newUsers,
    })
  }

  const handlePermissionChange = (level: MarkupPermissionLevel) => {
    setSettings({
      ...settings,
      permissionLevel: level,
    })
  }

  const handleSave = () => {
    onSave(settings)
    onOpenChange(false)
  }

  const handleCopyLink = async () => {
    // Generate a shareable link (in production, this would be a real URL)
    const shareUrl = `${window.location.origin}/documents/markup/${markupId}`
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Markup
          </DialogTitle>
          <DialogDescription>
            Control who can see and edit this markup annotation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Visibility Toggle */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Visibility</Label>
            <div className="space-y-2">
              <button
                onClick={handleToggleShared}
                className={cn(
                  'w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all',
                  settings.isShared
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div className="flex items-center gap-3">
                  {settings.isShared ? (
                    <Globe className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Lock className="w-5 h-5 text-gray-500" />
                  )}
                  <div className="text-left">
                    <p className="font-medium text-sm">
                      {settings.isShared ? 'Shared' : 'Private'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {settings.isShared
                        ? 'Others can see this markup based on permissions below'
                        : 'Only you can see this markup'}
                    </p>
                  </div>
                </div>
                <div
                  className={cn(
                    'w-10 h-6 rounded-full transition-colors relative',
                    settings.isShared ? 'bg-blue-500' : 'bg-gray-300'
                  )}
                >
                  <div
                    className={cn(
                      'w-4 h-4 rounded-full bg-white absolute top-1 transition-transform',
                      settings.isShared ? 'translate-x-5' : 'translate-x-1'
                    )}
                  />
                </div>
              </button>
            </div>
          </div>

          {settings.isShared && (
            <>
              {/* Quick Share Options */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Quick Share</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleToggleTeam}
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-lg border-2 transition-all',
                      settings.sharedWithTeam
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <Users className={cn('w-5 h-5', settings.sharedWithTeam ? 'text-green-600' : 'text-gray-500')} />
                    <div className="text-left">
                      <p className="font-medium text-sm">Team</p>
                      <p className="text-xs text-gray-500">All team members</p>
                    </div>
                    {settings.sharedWithTeam && (
                      <Check className="w-4 h-4 text-green-600 ml-auto" />
                    )}
                  </button>

                  <button
                    onClick={handleToggleSubcontractors}
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-lg border-2 transition-all',
                      settings.sharedWithSubcontractors
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <Building2 className={cn('w-5 h-5', settings.sharedWithSubcontractors ? 'text-orange-600' : 'text-gray-500')} />
                    <div className="text-left">
                      <p className="font-medium text-sm">Subs</p>
                      <p className="text-xs text-gray-500">Subcontractors</p>
                    </div>
                    {settings.sharedWithSubcontractors && (
                      <Check className="w-4 h-4 text-orange-600 ml-auto" />
                    )}
                  </button>
                </div>
              </div>

              {/* Permission Level */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Permission Level</Label>
                <div className="grid grid-cols-3 gap-2">
                  {PERMISSION_LEVELS.map((level) => (
                    <button
                      key={level.value}
                      onClick={() => handlePermissionChange(level.value)}
                      className={cn(
                        'flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all',
                        settings.permissionLevel === level.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      {level.icon}
                      <span className="text-xs font-medium">{level.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  {PERMISSION_LEVELS.find(l => l.value === settings.permissionLevel)?.description}
                </p>
              </div>

              {/* Share by Role */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Share with Roles</Label>
                <div className="flex flex-wrap gap-2">
                  {availableRoles.map((role) => (
                    <button
                      key={role.id}
                      onClick={() => handleToggleRole(role.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                        settings.sharedWithRoles.includes(role.id)
                          ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-500'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      )}
                    >
                      {role.name}
                      {settings.sharedWithRoles.includes(role.id) && (
                        <Check className="w-3 h-3 inline ml-1" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Share with Specific Users */}
              {availableUsers.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Share with Specific People</Label>
                  <div className="max-h-32 overflow-y-auto border rounded-lg divide-y">
                    {availableUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-2 hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{user.name}</p>
                            {user.role && (
                              <p className="text-xs text-gray-500">{user.role}</p>
                            )}
                          </div>
                        </div>
                        <Checkbox
                          checked={settings.sharedWithUsers.includes(user.id)}
                          onCheckedChange={() => handleToggleUser(user.id)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Copy Link */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Share Link</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="w-full"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Link className="w-4 h-4 mr-2" />
                      Copy shareable link
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {/* Summary */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <Label className="text-xs font-medium text-gray-600 mb-2 block">Summary</Label>
            <div className="flex flex-wrap gap-1">
              {!settings.isShared ? (
                <Badge variant="secondary">Private - Only you</Badge>
              ) : (
                <>
                  {settings.sharedWithTeam && <Badge className="bg-green-100 text-green-800">Team</Badge>}
                  {settings.sharedWithSubcontractors && <Badge className="bg-orange-100 text-orange-800">Subcontractors</Badge>}
                  {settings.sharedWithRoles.map(role => (
                    <Badge key={role} className="bg-blue-100 text-blue-800">
                      {availableRoles.find(r => r.id === role)?.name || role}
                    </Badge>
                  ))}
                  {settings.sharedWithUsers.length > 0 && (
                    <Badge className="bg-purple-100 text-purple-800">
                      +{settings.sharedWithUsers.length} user{settings.sharedWithUsers.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                  <Badge variant="outline">
                    {PERMISSION_LEVELS.find(l => l.value === settings.permissionLevel)?.label}
                  </Badge>
                </>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Sharing Settings'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default MarkupSharingDialog
