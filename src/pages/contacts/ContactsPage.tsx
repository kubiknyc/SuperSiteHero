// File: /src/pages/contacts/ContactsPage.tsx
// Main contacts directory page with search, filtering, and CRUD operations

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { useProjects } from '@/features/projects/hooks/useProjects'
import { useContacts, useDeleteContact } from '@/features/contacts/hooks/useContacts'
import { ContactCard } from '@/features/contacts/components/ContactCard'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import {
  Plus,
  Search,
  Users,
  Loader2,
  AlertCircle,
  Phone,
  Building2,
  Trash2,
} from 'lucide-react'

type ContactTypeFilter = 'all' | 'subcontractor' | 'architect' | 'engineer' | 'inspector' | 'supplier' | 'owner' | 'consultant' | 'other'

export function ContactsPage() {
  const navigate = useNavigate()
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [contactTypeFilter, setContactTypeFilter] = useState<ContactTypeFilter>('all')
  const [showPrimaryOnly, setShowPrimaryOnly] = useState(false)

  // Fetch data
  const { data: projects, isLoading: projectsLoading } = useProjects()
  const { data: contacts, isLoading: contactsLoading, error: contactsError } = useContacts(
    selectedProjectId || undefined,
    {
      contactType: contactTypeFilter !== 'all' ? contactTypeFilter : undefined,
      isPrimary: showPrimaryOnly ? true : undefined,
      searchTerm,
    }
  )

  const deleteContact = useDeleteContact()

  // Calculate statistics
  const stats = useMemo(() => {
    if (!contacts) {return { total: 0, subcontractors: 0, primary: 0, emergency: 0 }}

    return {
      total: contacts.length,
      subcontractors: contacts.filter((c) => c.contact_type === 'subcontractor').length,
      primary: contacts.filter((c) => c.is_primary).length,
      emergency: contacts.filter((c) => c.is_emergency_contact).length,
    }
  }, [contacts])

  const handleDeleteContact = async (contactId: string, contactName: string) => {
    if (confirm(`Are you sure you want to delete ${contactName}?`)) {
      try {
        await deleteContact.mutateAsync(contactId)
      } catch (error) {
        alert('Failed to delete contact: ' + (error as Error).message)
      }
    }
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground heading-page">Contacts Directory</h1>
            <p className="text-secondary mt-1">Manage contacts for your projects</p>
          </div>
          <Button
            onClick={() => navigate(`/contacts/new?projectId=${selectedProjectId}`)}
            disabled={!selectedProjectId}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>

        {/* Project Selector */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
              <div className="flex-1 w-full sm:w-auto">
                <Label htmlFor="project-select" className="text-sm font-medium text-secondary">
                  Select Project
                </Label>
                <Select
                  id="project-select"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="mt-1"
                  disabled={projectsLoading}
                >
                  <option value="">Select a project...</option>
                  {projects?.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </Select>
              </div>
              {!selectedProjectId && (
                <p className="text-sm text-warning flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Select a project to view contacts
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        {selectedProjectId && !contactsLoading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-info-light">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                    <p className="text-sm text-secondary">Total Contacts</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100">
                    <Building2 className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.subcontractors}</p>
                    <p className="text-sm text-secondary">Subcontractors</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-warning-light">
                    <Phone className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.primary}</p>
                    <p className="text-sm text-secondary">Primary</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-error-light">
                    <AlertCircle className="h-5 w-5 text-error" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.emergency}</p>
                    <p className="text-sm text-secondary">Emergency</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        {selectedProjectId && (
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-disabled" />
                    <Input
                      placeholder="Search by name, company, phone, or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Contact Type Filter */}
                <div className="w-full md:w-56">
                  <Select
                    value={contactTypeFilter}
                    onChange={(e) => setContactTypeFilter(e.target.value as ContactTypeFilter)}
                  >
                    <option value="all">All Types</option>
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

                {/* Primary Only Toggle */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="primary-only"
                    checked={showPrimaryOnly}
                    onChange={(e) => setShowPrimaryOnly(e.target.checked)}
                    className="rounded border-input"
                  />
                  <Label htmlFor="primary-only" className="text-sm font-normal cursor-pointer">
                    Primary only
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contacts List */}
        {!selectedProjectId ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2 heading-subsection">No Project Selected</h3>
              <p className="text-secondary">Select a project above to view and manage contacts</p>
            </CardContent>
          </Card>
        ) : contactsLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Loader2 className="h-12 w-12 text-disabled mx-auto mb-4 animate-spin" />
              <p className="text-secondary">Loading contacts...</p>
            </CardContent>
          </Card>
        ) : contactsError ? (
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2 heading-subsection">Error Loading Contacts</h3>
              <p className="text-secondary">{contactsError.message}</p>
            </CardContent>
          </Card>
        ) : contacts && contacts.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2 heading-subsection">No Contacts Yet</h3>
              <p className="text-secondary mb-4">Add your first contact to get started</p>
              <Button onClick={() => navigate(`/contacts/new?projectId=${selectedProjectId}`)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contacts?.map((contact) => {
              const displayName =
                [contact.first_name, contact.last_name].filter(Boolean).join(' ') ||
                contact.company_name ||
                'Unnamed Contact'
              return (
                <div key={contact.id} className="relative group">
                  <ContactCard
                    contact={contact}
                    onClick={() => navigate(`/contacts/${contact.id}`)}
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteContact(contact.id, displayName)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
