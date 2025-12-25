// File: /src/pages/contacts/ContactFormPage.tsx
// Form page for creating and editing contacts

import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { useContact, useCreateContact, useUpdateContact } from '@/features/contacts/hooks/useContacts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Loader2, Save, X } from 'lucide-react'

export function ContactFormPage() {
  const navigate = useNavigate()
  const { contactId } = useParams<{ contactId: string }>()
  const [searchParams] = useSearchParams()
  const projectIdParam = searchParams.get('projectId')

  const isEditMode = !!contactId
  const { data: contact, isLoading: contactLoading } = useContact(contactId)
  const createContact = useCreateContact()
  const updateContact = useUpdateContact()

  const [formData, setFormData] = useState({
    project_id: projectIdParam || '',
    contact_type: 'subcontractor',
    first_name: '',
    last_name: '',
    company_name: '',
    title: '',
    trade: '',
    email: '',
    phone_mobile: '',
    phone_office: '',
    phone_fax: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    notes: '',
    is_primary: false,
    is_emergency_contact: false,
  })

  // Load contact data in edit mode
  useEffect(() => {
    if (contact) {
      setFormData({
        project_id: contact.project_id || '',
        contact_type: contact.contact_type,
        first_name: contact.first_name || '',
        last_name: contact.last_name || '',
        company_name: contact.company_name || '',
        title: contact.title || '',
        trade: contact.trade || '',
        email: contact.email || '',
        phone_mobile: contact.phone_mobile || '',
        phone_office: contact.phone_office || '',
        phone_fax: contact.phone_fax || '',
        address: contact.address || '',
        city: contact.city || '',
        state: contact.state || '',
        zip: contact.zip || '',
        notes: contact.notes || '',
        is_primary: contact.is_primary || false,
        is_emergency_contact: contact.is_emergency_contact || false,
      })
    }
  }, [contact])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.project_id) {
      alert('Project ID is required')
      return
    }

    if (!formData.first_name && !formData.last_name && !formData.company_name) {
      alert('Please provide at least a name or company name')
      return
    }

    try {
      if (isEditMode && contactId) {
        await updateContact.mutateAsync({
          id: contactId,
          updates: formData,
        })
      } else {
        await createContact.mutateAsync(formData)
      }
      navigate('/contacts')
    } catch (error) {
      alert('Failed to save contact: ' + (error as Error).message)
    }
  }

  const handleCancel = () => {
    navigate('/contacts')
  }

  if (contactLoading) {
    return (
      <AppLayout>
        <div className="p-6 flex items-center justify-center min-h-96">
          <Loader2 className="h-12 w-12 text-disabled animate-spin" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground heading-page">
            {isEditMode ? 'Edit Contact' : 'Add New Contact'}
          </h1>
          <p className="text-secondary mt-1">
            {isEditMode ? 'Update contact information' : 'Create a new contact for your project'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Info Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact_type">Contact Type *</Label>
                  <Select
                    id="contact_type"
                    value={formData.contact_type}
                    onChange={(e) => setFormData({ ...formData, contact_type: e.target.value })}
                    required
                  >
                    <option value="subcontractor">Subcontractor</option>
                    <option value="architect">Architect</option>
                    <option value="engineer">Engineer</option>
                    <option value="inspector">Inspector</option>
                    <option value="supplier">Supplier</option>
                    <option value="owner">Owner</option>
                    <option value="consultant">Consultant</option>
                    <option value="other">Other</option>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="trade">Trade</Label>
                  <Input
                    id="trade"
                    value={formData.trade}
                    onChange={(e) => setFormData({ ...formData, trade: e.target.value })}
                    placeholder="e.g. Electrical, Plumbing, HVAC"
                  />
                </div>
              </div>

              {/* Name Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  />
                </div>
              </div>

              {/* Company & Title */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="title">Title/Position</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Project Manager, Foreman"
                  />
                </div>
              </div>

              {/* Phone Numbers */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="phone_mobile">Mobile Phone</Label>
                  <Input
                    id="phone_mobile"
                    type="tel"
                    value={formData.phone_mobile}
                    onChange={(e) => setFormData({ ...formData, phone_mobile: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <Label htmlFor="phone_office">Office Phone</Label>
                  <Input
                    id="phone_office"
                    type="tel"
                    value={formData.phone_office}
                    onChange={(e) => setFormData({ ...formData, phone_office: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <Label htmlFor="phone_fax">Fax</Label>
                  <Input
                    id="phone_fax"
                    type="tel"
                    value={formData.phone_fax}
                    onChange={(e) => setFormData({ ...formData, phone_fax: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@example.com"
                />
              </div>

              {/* Address */}
              <div>
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="CA"
                    maxLength={2}
                  />
                </div>

                <div>
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input
                    id="zip"
                    value={formData.zip}
                    onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                    placeholder="12345"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full min-h-24 px-3 py-2 border rounded-md"
                  placeholder="Additional notes about this contact..."
                />
              </div>

              {/* Flags */}
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_primary"
                    checked={formData.is_primary}
                    onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                    className="rounded border-input"
                  />
                  <Label htmlFor="is_primary" className="font-normal cursor-pointer">
                    Primary Contact
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_emergency_contact"
                    checked={formData.is_emergency_contact}
                    onChange={(e) => setFormData({ ...formData, is_emergency_contact: e.target.checked })}
                    className="rounded border-input"
                  />
                  <Label htmlFor="is_emergency_contact" className="font-normal cursor-pointer">
                    Emergency Contact
                  </Label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createContact.isPending || updateContact.isPending}
                >
                  {(createContact.isPending || updateContact.isPending) ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {isEditMode ? 'Update Contact' : 'Create Contact'}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </AppLayout>
  )
}
