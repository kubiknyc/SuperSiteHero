/**
 * Company Profile Page
 *
 * Allows company owners/admins to manage company information,
 * branding, and contact details.
 */

import { useState, useEffect, useRef } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Building2,
  MapPin,
  Palette,
  Upload,
  Trash2,
  Loader2,
  Save,
} from 'lucide-react'
import {
  useCompanyProfile,
  useUpdateCompanyProfile,
  useUploadCompanyLogo,
  useDeleteCompanyLogo,
} from '@/features/company-settings/hooks/useCompanyProfile'
import { Skeleton } from '@/components/ui/skeleton'

export function CompanyProfilePage() {
  const { data: company, isLoading, error } = useCompanyProfile()
  const updateMutation = useUpdateCompanyProfile()
  const uploadLogoMutation = useUploadCompanyLogo()
  const deleteLogoMutation = useDeleteCompanyLogo()

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#3b82f6')

  // Initialize form from company data
  useEffect(() => {
    if (company) {
      // Use setTimeout to avoid calling setState synchronously within effect
      setTimeout(() => {
        setName(company.name || '')
        setEmail(company.email || '')
        setPhone(company.phone || '')
        setAddress(company.address || '')
        setCity(company.city || '')
        setState(company.state || '')
        setZip(company.zip || '')
        setPrimaryColor(company.primary_color || '#3b82f6')
      }, 0)
    }
  }, [company])

  const handleSaveBasicInfo = async () => {
    await updateMutation.mutateAsync({
      name,
      email,
      phone,
    })
  }

  const handleSaveAddress = async () => {
    await updateMutation.mutateAsync({
      address,
      city,
      state,
      zip,
    })
  }

  const handleSaveBranding = async () => {
    await updateMutation.mutateAsync({
      primary_color: primaryColor,
    })
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {return}

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return
    }

    await uploadLogoMutation.mutateAsync(file)
  }

  const handleDeleteLogo = async () => {
    await deleteLogoMutation.mutateAsync()
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container max-w-4xl py-6 space-y-6">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72 mt-2" />
          </div>
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout>
        <div className="container max-w-4xl py-6">
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">Failed to load company profile</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="container max-w-4xl py-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold heading-page">Company Profile</h1>
          <p className="text-muted-foreground">
            Manage your company information and branding
          </p>
        </div>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <Building2 className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>Basic details about your company</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter company name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="company@example.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleSaveBasicInfo}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info-light">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Address</CardTitle>
                <CardDescription>Your company's physical address</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP Code</Label>
                <Input
                  id="zip"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="12345"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleSaveAddress}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Branding */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Palette className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle>Branding</CardTitle>
                <CardDescription>Customize your company's appearance</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo Upload */}
            <div className="space-y-3">
              <Label>Company Logo</Label>
              <div className="flex items-center gap-4">
                {company?.logo_url ? (
                  <div className="relative">
                    <img
                      src={company.logo_url}
                      alt="Company logo"
                      className="h-20 w-20 object-contain rounded-lg border"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={handleDeleteLogo}
                      disabled={deleteLogoMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="h-20 w-20 rounded-lg border-2 border-dashed flex items-center justify-center text-muted-foreground">
                    <Building2 className="h-8 w-8" />
                  </div>
                )}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadLogoMutation.isPending}
                  >
                    {uploadLogoMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Upload Logo
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG up to 2MB
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Primary Color */}
            <div className="space-y-3">
              <Label htmlFor="primaryColor">Brand Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="primaryColor"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-14 rounded border cursor-pointer"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#3b82f6"
                  className="w-28 font-mono"
                />
                <div
                  className="h-10 flex-1 rounded-md"
                  style={{ backgroundColor: primaryColor }}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSaveBranding}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

export default CompanyProfilePage
