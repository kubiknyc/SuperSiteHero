// File: /src/pages/profile/ProfileEditPage.tsx
// User profile edit page for updating personal information

import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth/AuthContext'
import { supabase } from '@/lib/supabase'
import { SmartLayout } from '@/components/layout/SmartLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useToast } from '@/lib/notifications/ToastContext'
import { Camera, User, Phone, Mail, Loader2, ArrowLeft, X, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProfileFormData {
  first_name: string
  last_name: string
  phone: string
}

const MAX_AVATAR_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export function ProfileEditPage() {
  const { userProfile, refreshUserProfile } = useAuth()
  const navigate = useNavigate()
  const { success, error: showError } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState<ProfileFormData>({
    first_name: '',
    last_name: '',
    phone: '',
  })
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize form with current user data
  useEffect(() => {
    if (userProfile) {
      setFormData({
        first_name: userProfile.first_name || '',
        last_name: userProfile.last_name || '',
        phone: userProfile.phone || '',
      })
      setAvatarUrl(userProfile.avatar_url || null)
    }
  }, [userProfile])

  // Check for unsaved changes
  useEffect(() => {
    if (!userProfile) return

    const hasFormChanges =
      formData.first_name !== (userProfile.first_name || '') ||
      formData.last_name !== (userProfile.last_name || '') ||
      formData.phone !== (userProfile.phone || '')

    const hasAvatarChange = avatarFile !== null

    setHasChanges(hasFormChanges || hasAvatarChange)
  }, [formData, avatarFile, userProfile])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      showError('Invalid file type', 'Please upload a JPEG, PNG, GIF, or WebP image')
      return
    }

    // Validate file size
    if (file.size > MAX_AVATAR_SIZE) {
      showError('File too large', 'Please upload an image smaller than 5MB')
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    setAvatarFile(file)
  }

  const handleRemoveAvatar = () => {
    setAvatarPreview(null)
    setAvatarFile(null)
    setAvatarUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !userProfile) return avatarUrl

    setUploadingAvatar(true)

    try {
      const fileExt = avatarFile.name.split('.').pop()
      const fileName = `${userProfile.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      return publicUrl
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to upload avatar')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!userProfile) {
      showError('Error', 'User profile not found')
      return
    }

    // Validate required fields
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      showError('Validation Error', 'First name and last name are required')
      return
    }

    setLoading(true)

    try {
      // Upload new avatar if selected
      let newAvatarUrl = avatarUrl
      if (avatarFile) {
        newAvatarUrl = await uploadAvatar()
      }

      // Update user profile in database
      const { error } = await supabase
        .from('users')
        .update({
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          phone: formData.phone.trim() || null,
          avatar_url: newAvatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userProfile.id)

      if (error) {
        throw error
      }

      // Refresh user profile in context
      await refreshUserProfile()

      success('Profile Updated', 'Your profile has been successfully updated')
      navigate('/settings')
    } catch (err) {
      showError('Error', err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (hasChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
        navigate('/settings')
      }
    } else {
      navigate('/settings')
    }
  }

  // Get initials for avatar fallback
  const getInitials = () => {
    const first = formData.first_name?.[0] || ''
    const last = formData.last_name?.[0] || ''
    return (first + last).toUpperCase() || 'U'
  }

  // Display avatar (preview takes priority over current)
  const displayAvatar = avatarPreview || avatarUrl

  return (
    <SmartLayout title="Edit Profile">
      <div className="container max-w-2xl py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" asChild>
            <Link to="/settings">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold heading-page">Edit Profile</h1>
            <p className="text-muted-foreground">Update your personal information</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Avatar Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Profile Photo</CardTitle>
              <CardDescription>
                Click the avatar to upload a new photo. Maximum size: 5MB.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="relative group">
                  <Avatar
                    className="h-24 w-24 cursor-pointer border-2 border-border hover:border-primary transition-colors"
                    onClick={handleAvatarClick}
                  >
                    {displayAvatar ? (
                      <AvatarImage src={displayAvatar} alt="Profile" />
                    ) : null}
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    onClick={handleAvatarClick}
                  >
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                  {uploadingAvatar && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAvatarClick}
                    disabled={loading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Photo
                  </Button>
                  {displayAvatar && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveAvatar}
                      disabled={loading}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_AVATAR_TYPES.join(',')}
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your name and contact information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first_name">
                    First Name <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="first_name"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      placeholder="John"
                      required
                      disabled={loading}
                      className="pl-10"
                      maxLength={50}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_name">
                    Last Name <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="last_name"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      placeholder="Smith"
                      required
                      disabled={loading}
                      className="pl-10"
                      maxLength={50}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="(555) 555-5555"
                    disabled={loading}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Read-only Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                This information cannot be changed here. Contact your administrator for updates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={userProfile?.email || ''}
                    disabled
                    className="pl-10 bg-muted"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  To change your email, please contact support.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Input
                  value={userProfile?.role ? userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1) : ''}
                  disabled
                  className="bg-muted capitalize"
                />
                <p className="text-xs text-muted-foreground">
                  Your role is managed by your company administrator.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !hasChanges}
              className={cn(!hasChanges && 'opacity-50')}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </div>
    </SmartLayout>
  )
}

export default ProfileEditPage
