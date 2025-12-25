// File: /src/pages/contacts/ContactDetailPage.tsx
// Contact detail view page

import { useNavigate, useParams } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { useContact, useDeleteContact } from '@/features/contacts/hooks/useContacts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Phone,
  Mail,
  MapPin,
  Building2,
  Briefcase,
  Star,
  Edit,
  Trash2,
  Loader2,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const contactTypeColors: Record<string, string> = {
  subcontractor: 'bg-info-light text-blue-800',
  architect: 'bg-purple-100 text-purple-800',
  engineer: 'bg-success-light text-green-800',
  inspector: 'bg-orange-100 text-orange-800',
  supplier: 'bg-warning-light text-yellow-800',
  owner: 'bg-error-light text-red-800',
  consultant: 'bg-indigo-100 text-indigo-800',
  other: 'bg-muted text-foreground',
}

export function ContactDetailPage() {
  const navigate = useNavigate()
  const { contactId } = useParams<{ contactId: string }>()
  const { data: contact, isLoading, error } = useContact(contactId)
  const deleteContact = useDeleteContact()

  const handleEdit = () => {
    navigate(`/contacts/${contactId}/edit`)
  }

  const handleDelete = async () => {
    if (!contact) {return}
    const displayName =
      [contact.first_name, contact.last_name].filter(Boolean).join(' ') ||
      contact.company_name ||
      'this contact'

    if (confirm(`Are you sure you want to delete ${displayName}?`)) {
      try {
        await deleteContact.mutateAsync(contactId!)
        navigate('/contacts')
      } catch (error) {
        alert('Failed to delete contact: ' + (error as Error).message)
      }
    }
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 flex items-center justify-center min-h-96">
          <Loader2 className="h-12 w-12 text-disabled animate-spin" />
        </div>
      </AppLayout>
    )
  }

  if (error || !contact) {
    return (
      <AppLayout>
        <div className="p-6">
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2 heading-subsection">Contact Not Found</h3>
              <p className="text-secondary mb-4">{error?.message || 'The contact could not be loaded'}</p>
              <Button onClick={() => navigate('/contacts')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Contacts
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    )
  }

  const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(' ')
  const displayName = fullName || contact.company_name || 'Unnamed Contact'

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/contacts')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold text-foreground heading-page">{displayName}</h1>
                {contact.is_primary && (
                  <Star className="h-5 w-5 text-warning fill-yellow-500" aria-label="Primary Contact" />
                )}
              </div>
              {contact.title && <p className="text-secondary mt-1">{contact.title}</p>}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge
            className={cn(
              'capitalize',
              contactTypeColors[contact.contact_type] || contactTypeColors.other
            )}
          >
            {contact.contact_type}
          </Badge>
          {contact.trade && (
            <Badge variant="outline">
              <Briefcase className="h-3 w-3 mr-1" />
              {contact.trade}
            </Badge>
          )}
          {contact.is_emergency_contact && (
            <Badge variant="destructive">Emergency Contact</Badge>
          )}
        </div>

        {/* Main Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Company */}
            {contact.company_name && fullName && (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Building2 className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-secondary">Company</p>
                  <p className="font-medium">{contact.company_name}</p>
                </div>
              </div>
            )}

            {/* Phone Numbers */}
            {contact.phone_mobile && (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-info-light">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-secondary">Mobile</p>
                  <a href={`tel:${contact.phone_mobile}`} className="font-medium text-primary hover:underline">
                    {contact.phone_mobile}
                  </a>
                </div>
              </div>
            )}

            {contact.phone_office && (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-info-light">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-secondary">Office</p>
                  <a href={`tel:${contact.phone_office}`} className="font-medium text-primary hover:underline">
                    {contact.phone_office}
                  </a>
                </div>
              </div>
            )}

            {contact.phone_fax && (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Phone className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-secondary">Fax</p>
                  <p className="font-medium">{contact.phone_fax}</p>
                </div>
              </div>
            )}

            {/* Email */}
            {contact.email && (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success-light">
                  <Mail className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-secondary">Email</p>
                  <a href={`mailto:${contact.email}`} className="font-medium text-primary hover:underline">
                    {contact.email}
                  </a>
                </div>
              </div>
            )}

            {/* Address */}
            {(contact.address || contact.city || contact.state || contact.zip) && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-100">
                  <MapPin className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-secondary">Address</p>
                  <div className="font-medium">
                    {contact.address && <p>{contact.address}</p>}
                    {(contact.city || contact.state || contact.zip) && (
                      <p>{[contact.city, contact.state, contact.zip].filter(Boolean).join(', ')}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes Card */}
        {contact.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-secondary whitespace-pre-wrap">{contact.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
