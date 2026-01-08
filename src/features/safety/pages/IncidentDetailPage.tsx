/**
 * Incident Detail Page
 *
 * Detailed view of a single safety incident with:
 * - Incident information
 * - People involved
 * - Photos/evidence
 * - Corrective actions
 * - Investigation notes
 */

import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { SmartLayout } from '@/components/layout/SmartLayout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SeverityBadge, IncidentReportForm } from '../components'
import {
  useIncidentWithDetails,
  useUpdateIncident,
  useDeleteIncident,
  useIncidentPeople,
  useIncidentPhotos,
  useCorrectiveActions,
  useCreateCorrectiveAction,
  useUpdateCorrectiveAction,
} from '../hooks/useIncidents'
import {
  INCIDENT_STATUS_CONFIG,
  INCIDENT_TYPE_CONFIG,
  ROOT_CAUSE_CATEGORY_CONFIG,
  type IncidentStatus,
  type CorrectiveActionStatus,
} from '@/types/safety-incidents'
import {
  ArrowLeft,
  Edit,
  Trash2,
  MapPin,
  Calendar,
  Clock,
  User,
  Building,
  FileText,
  Camera,
  Users,
  CheckSquare,
  AlertTriangle,
  Plus,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showAddAction, setShowAddAction] = useState(false)
  const [newAction, setNewAction] = useState({ description: '', assigned_to: '', due_date: '' })

  const { data: incident, isLoading } = useIncidentWithDetails(id!)
  const { data: people = [] } = useIncidentPeople(id!)
  const { data: photos = [] } = useIncidentPhotos(id!)
  const { data: correctiveActions = [] } = useCorrectiveActions({ incident_id: id! })

  const updateIncident = useUpdateIncident()
  const deleteIncident = useDeleteIncident()
  const createAction = useCreateCorrectiveAction()
  const updateAction = useUpdateCorrectiveAction()

  if (isLoading) {
    return (
      <SmartLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </SmartLayout>
    )
  }

  if (!incident) {
    return (
      <SmartLayout>
        <div className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-disabled mx-auto" />
          <h2 className="text-lg font-medium text-foreground mt-4 heading-section">Incident not found</h2>
          <p className="text-muted mt-2">The incident you're looking for doesn't exist.</p>
          <Link to="/safety" className="mt-4 inline-block">
            <Button>Back to Incidents</Button>
          </Link>
        </div>
      </SmartLayout>
    )
  }

  const handleDelete = async () => {
    await deleteIncident.mutateAsync(id!)
    navigate('/safety')
  }

  const handleStatusChange = async (newStatus: IncidentStatus) => {
    await updateIncident.mutateAsync({
      id: id!,
      data: { status: newStatus },
    })
  }

  const handleAddAction = async () => {
    if (!newAction.description) {return}
    await createAction.mutateAsync({
      incident_id: id!,
      description: newAction.description,
      assigned_to: newAction.assigned_to || undefined,
      due_date: newAction.due_date || undefined,
    })
    setNewAction({ description: '', assigned_to: '', due_date: '' })
    setShowAddAction(false)
  }

  const handleActionStatusChange = async (actionId: string, status: CorrectiveActionStatus) => {
    await updateAction.mutateAsync({
      id: actionId,
      data: {
        status,
        completed_date: status === 'completed' ? new Date().toISOString() : null,
      },
    })
  }

  const statusConfig = INCIDENT_STATUS_CONFIG[incident.status]
  const typeConfig = INCIDENT_TYPE_CONFIG[incident.incident_type]

  if (isEditing) {
    return (
      <SmartLayout>
        <div className="p-6">
          <div className="mb-6">
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancel Edit
            </Button>
            <h1 className="text-2xl font-bold text-foreground heading-page">Edit Incident</h1>
          </div>
          <div className="bg-card rounded-lg border p-6">
            <IncidentReportForm
              incident={incident}
              onSuccess={() => setIsEditing(false)}
              onCancel={() => setIsEditing(false)}
            />
          </div>
        </div>
      </SmartLayout>
    )
  }

  return (
    <SmartLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <Link to="/safety">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Incidents
            </Button>
          </Link>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-foreground heading-page">{incident.incident_number}</h1>
                <SeverityBadge severity={incident.severity} />
                <Badge className={cn('text-xs', statusConfig.color)}>
                  {statusConfig.label}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(incident.incident_date), 'MMM d, yyyy')}
                </span>
                {incident.incident_time && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {incident.incident_time}
                  </span>
                )}
                {incident.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {incident.location}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                className="text-error hover:bg-error-light"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 max-w-md mx-4">
              <h3 className="text-lg font-semibold text-foreground heading-subsection">Delete Incident?</h3>
              <p className="text-muted mt-2">
                This action cannot be undone. All data associated with this incident will be
                permanently deleted.
              </p>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteIncident.isPending}
                >
                  {deleteIncident.isPending ? 'Deleting...' : 'Delete Incident'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Status Actions */}
        <div className="bg-card rounded-lg border p-4 mb-6">
          <h3 className="text-sm font-medium text-secondary mb-3 heading-subsection">Update Status</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(INCIDENT_STATUS_CONFIG).map(([status, config]) => (
              <Button
                key={status}
                variant={incident.status === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusChange(status as IncidentStatus)}
                disabled={updateIncident.isPending}
              >
                {config.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="details" className="space-y-4">
          <TabsList>
            <TabsTrigger value="details" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="people" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              People ({people.length})
            </TabsTrigger>
            <TabsTrigger value="photos" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Photos ({photos.length})
            </TabsTrigger>
            <TabsTrigger value="actions" className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Actions ({correctiveActions.length})
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Incident Information */}
              <div className="bg-card rounded-lg border p-6">
                <h3 className="text-lg font-semibold mb-4 heading-subsection">Incident Information</h3>
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-muted">Type</dt>
                    <dd className="mt-1">
                      <Badge variant="outline">{typeConfig.label}</Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted">Description</dt>
                    <dd className="mt-1 text-foreground">{incident.description}</dd>
                  </div>
                  {incident.immediate_actions && (
                    <div>
                      <dt className="text-sm font-medium text-muted">Immediate Actions Taken</dt>
                      <dd className="mt-1 text-foreground">{incident.immediate_actions}</dd>
                    </div>
                  )}
                  {incident.root_cause && (
                    <div>
                      <dt className="text-sm font-medium text-muted">Root Cause</dt>
                      <dd className="mt-1 text-foreground">{incident.root_cause}</dd>
                    </div>
                  )}
                  {incident.root_cause_category && (
                    <div>
                      <dt className="text-sm font-medium text-muted">Root Cause Category</dt>
                      <dd className="mt-1">
                        <Badge variant="outline">
                          {ROOT_CAUSE_CATEGORY_CONFIG[incident.root_cause_category]?.label ||
                            incident.root_cause_category}
                        </Badge>
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* OSHA Information */}
              <div className="bg-card rounded-lg border p-6">
                <h3 className="text-lg font-semibold mb-4 heading-subsection">OSHA Information</h3>
                <dl className="space-y-4">
                  <div className="flex items-center justify-between">
                    <dt className="text-sm font-medium text-muted">OSHA Recordable</dt>
                    <dd>
                      <Badge variant={incident.osha_recordable ? 'destructive' : 'secondary'}>
                        {incident.osha_recordable ? 'Yes' : 'No'}
                      </Badge>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-sm font-medium text-muted">Lost Time</dt>
                    <dd>
                      <Badge variant={incident.days_away_from_work > 0 ? 'destructive' : 'secondary'}>
                        {incident.days_away_from_work} days
                      </Badge>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-sm font-medium text-muted">Restricted Duty</dt>
                    <dd>
                      <Badge variant={incident.days_restricted_duty > 0 ? 'default' : 'secondary'}>
                        {incident.days_restricted_duty} days
                      </Badge>
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Project Information */}
              {incident.project && (
                <div className="bg-card rounded-lg border p-6">
                  <h3 className="text-lg font-semibold mb-4 heading-subsection">Project</h3>
                  <div className="flex items-center gap-3">
                    <div className="bg-info-light rounded-lg p-2">
                      <Building className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{incident.project.name}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Reporter Information */}
              <div className="bg-card rounded-lg border p-6">
                <h3 className="text-lg font-semibold mb-4 heading-subsection">Reported By</h3>
                <div className="flex items-center gap-3">
                  <div className="bg-muted rounded-full p-2">
                    <User className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {incident.reporter?.full_name || 'Unknown'}
                    </p>
                    <p className="text-sm text-muted">
                      {format(new Date(incident.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* People Tab */}
          <TabsContent value="people">
            <div className="bg-card rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4 heading-subsection">People Involved</h3>
              {people.length === 0 ? (
                <p className="text-muted text-center py-8">
                  No people have been added to this incident.
                </p>
              ) : (
                <div className="space-y-4">
                  {people.map((person) => (
                    <div
                      key={person.id}
                      className="flex items-start justify-between p-4 bg-surface rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{person.name}</p>
                        <p className="text-sm text-muted capitalize">
                          {person.person_type.replace('_', ' ')}
                        </p>
                        {person.company_name && (
                          <p className="text-sm text-muted">{person.company_name}</p>
                        )}
                        {person.contact_phone && (
                          <p className="text-sm text-muted">{person.contact_phone}</p>
                        )}
                      </div>
                      {person.statement && (
                        <div className="text-sm text-secondary max-w-md">
                          <p className="font-medium text-secondary">Statement:</p>
                          <p className="italic">"{person.statement}"</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Photos Tab */}
          <TabsContent value="photos">
            <div className="bg-card rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4 heading-subsection">Photos & Evidence</h3>
              {photos.length === 0 ? (
                <p className="text-muted text-center py-8">
                  No photos have been added to this incident.
                </p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative group">
                      <img
                        src={photo.photo_url}
                        alt={photo.caption || 'Incident photo'}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      {photo.caption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-sm p-2 rounded-b-lg">
                          {photo.caption}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Corrective Actions Tab */}
          <TabsContent value="actions">
            <div className="bg-card rounded-lg border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold heading-subsection">Corrective Actions</h3>
                <Button size="sm" onClick={() => setShowAddAction(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Action
                </Button>
              </div>

              {/* Add Action Form */}
              {showAddAction && (
                <div className="bg-surface rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium heading-card">New Corrective Action</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddAction(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-secondary">Description *</label>
                      <textarea
                        value={newAction.description}
                        onChange={(e) =>
                          setNewAction({ ...newAction, description: e.target.value })
                        }
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                        rows={2}
                        placeholder="Describe the corrective action..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-secondary">Assigned To</label>
                        <input
                          type="text"
                          value={newAction.assigned_to}
                          onChange={(e) =>
                            setNewAction({ ...newAction, assigned_to: e.target.value })
                          }
                          className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                          placeholder="Person responsible"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-secondary">Due Date</label>
                        <input
                          type="date"
                          value={newAction.due_date}
                          onChange={(e) =>
                            setNewAction({ ...newAction, due_date: e.target.value })
                          }
                          className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={handleAddAction}
                        disabled={!newAction.description || createAction.isPending}
                      >
                        {createAction.isPending ? 'Adding...' : 'Add Action'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {correctiveActions.length === 0 && !showAddAction ? (
                <p className="text-muted text-center py-8">
                  No corrective actions have been added yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {correctiveActions.map((action) => (
                    <div
                      key={action.id}
                      className={cn(
                        'p-4 rounded-lg border',
                        action.status === 'completed'
                          ? 'bg-success-light border-green-200'
                          : action.status === 'in_progress'
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-surface border-border'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{action.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted">
                            {action.assigned_to && (
                              <span>Assigned: {action.assigned_to}</span>
                            )}
                            {action.due_date && (
                              <span>Due: {format(new Date(action.due_date), 'MMM d, yyyy')}</span>
                            )}
                            {action.completed_date && (
                              <span className="text-success">
                                Completed: {format(new Date(action.completed_date), 'MMM d, yyyy')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={action.status}
                            onChange={(e) =>
                              handleActionStatusChange(
                                action.id,
                                e.target.value as CorrectiveActionStatus
                              )
                            }
                            className="text-sm border rounded px-2 py-1"
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </SmartLayout>
  )
}

export default IncidentDetailPage
