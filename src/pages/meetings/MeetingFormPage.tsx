// File: /src/pages/meetings/MeetingFormPage.tsx
// Create and edit meetings form

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { SmartLayout } from '@/components/layout/SmartLayout'
import { useMyProjects } from '@/features/projects/hooks/useProjects'
import {
  useMeeting,
  useMeetings,
  useCreateMeeting,
  useUpdateMeeting,
  MEETING_TYPES,
  MEETING_STATUSES,
  ACTION_ITEM_PRIORITIES,
  ACTION_ITEM_CATEGORIES,
  ATTENDEE_REPRESENTING,
  type MeetingAttendee,
  type MeetingActionItem,
} from '@/features/meetings/hooks'
import { useAuth } from '@/lib/auth/AuthContext'
import type { Json } from '@/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect as Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Users,
  ListChecks,
  Calendar,
  Link2,
  Copy,
} from 'lucide-react'
import { logger } from '../../lib/utils/logger';


interface FormData {
  project_id: string
  meeting_name: string
  meeting_number: string
  meeting_type: string
  meeting_status: string
  meeting_date: string
  meeting_time: string
  duration_minutes: string
  location: string
  agenda: string
  discussion_notes: string
  decisions: string
  attendees: MeetingAttendee[]
  action_items: MeetingActionItem[]
  previous_meeting_id: string
}

const initialFormData: FormData = {
  project_id: '',
  meeting_name: '',
  meeting_number: '',
  meeting_type: 'oac_meeting',
  meeting_status: 'scheduled',
  meeting_date: new Date().toISOString().split('T')[0],
  meeting_time: '09:00',
  duration_minutes: '60',
  location: '',
  agenda: '',
  discussion_notes: '',
  decisions: '',
  attendees: [],
  action_items: [],
  previous_meeting_id: '',
}

export function MeetingFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isEditing = !!id

  const { data: projects } = useMyProjects()
  const { data: existingMeeting, isLoading: loadingMeeting } = useMeeting(isEditing ? id : undefined)
  const createMeeting = useCreateMeeting()
  const updateMeeting = useUpdateMeeting()

  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [showCarryover, setShowCarryover] = useState(false)
  const [carryoverItems, setCarryoverItems] = useState<string[]>([])

  // Get previous meetings for linking (only for selected project)
  const { data: previousMeetings } = useMeetings(formData.project_id || undefined)

  // Get details of the selected previous meeting for action item carryover
  const { data: previousMeetingDetails } = useMeeting(formData.previous_meeting_id || undefined)

  // Load existing meeting data
  useEffect(() => {
    if (existingMeeting) {
      setFormData({
        project_id: existingMeeting.project_id,
        meeting_name: existingMeeting.meeting_name || '',
        meeting_type: existingMeeting.meeting_type,
        meeting_date: existingMeeting.meeting_date,
        meeting_time: existingMeeting.meeting_time || '',
        duration_minutes: existingMeeting.duration_minutes?.toString() || '',
        location: existingMeeting.location || '',
        agenda: existingMeeting.agenda || '',
        discussion_notes: existingMeeting.discussion_notes || '',
        decisions: existingMeeting.decisions || '',
        attendees: (existingMeeting.attendees as MeetingAttendee[]) || [],
        action_items: (existingMeeting.action_items as MeetingActionItem[]) || [],
        previous_meeting_id: existingMeeting.previous_meeting_id || '',
      })
    }
  }, [existingMeeting])

  // Set default project
  useEffect(() => {
    if (!isEditing && projects && projects.length > 0 && !formData.project_id) {
      const activeProject = projects.find((p) => p.status === 'active')
      if (activeProject) {
        setFormData((prev) => ({ ...prev, project_id: activeProject.id }))
      }
    }
  }, [projects, isEditing, formData.project_id])

  // Handle input change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  // Add attendee
  const addAttendee = () => {
    setFormData((prev) => ({
      ...prev,
      attendees: [
        ...prev.attendees,
        {
          name: '',
          company: '',
          email: '',
          phone: '',
          role: '',
          title: '',
          trade: '',
          representing: undefined,
          present: true,
          required: false,
        },
      ],
    }))
  }

  // Update attendee
  const updateAttendee = (index: number, field: keyof MeetingAttendee, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      attendees: prev.attendees.map((a, i) => (i === index ? { ...a, [field]: value } : a)),
    }))
  }

  // Remove attendee
  const removeAttendee = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      attendees: prev.attendees.filter((_, i) => i !== index),
    }))
  }

  // Add action item
  const addActionItem = () => {
    setFormData((prev) => ({
      ...prev,
      action_items: [
        ...prev.action_items,
        {
          id: crypto.randomUUID(),
          description: '',
          assignee: '',
          assignee_company: '',
          dueDate: '',
          status: 'open',
          priority: 'medium',
          category: undefined,
          cost_impact: false,
          schedule_impact: false,
          created_at: new Date().toISOString(),
        },
      ],
    }))
  }

  // Update action item
  const updateActionItem = (index: number, field: keyof MeetingActionItem, value: string) => {
    setFormData((prev) => ({
      ...prev,
      action_items: prev.action_items.map((a, i) =>
        i === index ? { ...a, [field]: value } : a
      ),
    }))
  }

  // Remove action item
  const removeActionItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      action_items: prev.action_items.filter((_, i) => i !== index),
    }))
  }

  // Get uncompleted action items from previous meeting for carryover
  const uncompletedPreviousItems = previousMeetingDetails?.action_items?.filter(
    (item: MeetingActionItem) => item.status !== 'completed' && item.status !== 'cancelled'
  ) || []

  // Handle carryover toggle
  const toggleCarryoverItem = (itemId: string) => {
    setCarryoverItems(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    )
  }

  // Carry over selected action items from previous meeting
  const handleCarryoverItems = () => {
    if (!previousMeetingDetails?.action_items) {return}

    const itemsToCarry = previousMeetingDetails.action_items.filter(
      (item: MeetingActionItem) => carryoverItems.includes(item.id)
    )

    const newItems = itemsToCarry.map((item: MeetingActionItem) => ({
      ...item,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      status: 'open' as const,
      carryover_from_meeting_id: formData.previous_meeting_id,
    }))

    setFormData(prev => ({
      ...prev,
      action_items: [...prev.action_items, ...newItems],
    }))

    setShowCarryover(false)
    setCarryoverItems([])
  }

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.project_id) {
      newErrors.project_id = 'Project is required'
    }
    if (!formData.meeting_type) {
      newErrors.meeting_type = 'Meeting type is required'
    }
    if (!formData.meeting_date) {
      newErrors.meeting_date = 'Meeting date is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {return}

    setIsSaving(true)
    try {
      const meetingData = {
        project_id: formData.project_id,
        meeting_name: formData.meeting_name || null,
        meeting_type: formData.meeting_type,
        meeting_date: formData.meeting_date,
        meeting_time: formData.meeting_time || null,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        location: formData.location || null,
        agenda: formData.agenda || null,
        discussion_notes: formData.discussion_notes || null,
        decisions: formData.decisions || null,
        attendees: formData.attendees.length > 0 ? (formData.attendees as unknown as Json) : null,
        action_items: formData.action_items.length > 0 ? (formData.action_items as unknown as Json) : null,
        previous_meeting_id: formData.previous_meeting_id || null,
        created_by: user?.id,
      }

      if (isEditing && id) {
        await updateMeeting.mutateAsync({ id, ...meetingData })
        navigate(`/meetings/${id}`)
      } else {
        const result = await createMeeting.mutateAsync(meetingData)
        navigate(`/meetings/${result.id}`)
      }
    } catch (err) {
      logger.error('Failed to save meeting:', err)
    } finally {
      setIsSaving(false)
    }
  }

  if (isEditing && loadingMeeting) {
    return (
      <SmartLayout title="Meeting">
        <div className="p-6 text-center">
          <p className="text-muted">Loading meeting...</p>
        </div>
      </SmartLayout>
    )
  }

  return (
    <SmartLayout title="Meeting">
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate('/meetings')}
              className="mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Meetings
            </Button>
            <h1 className="text-3xl font-bold text-foreground heading-page">
              {isEditing ? 'Edit Meeting' : 'New Meeting'}
            </h1>
          </div>
          <Button type="submit" disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Meeting'}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Meeting Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="project_id">Project *</Label>
                    <Select
                      id="project_id"
                      name="project_id"
                      value={formData.project_id}
                      onChange={handleChange}
                      className={errors.project_id ? 'border-red-500' : ''}
                    >
                      <option value="">Select project...</option>
                      {projects?.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </Select>
                    {errors.project_id && (
                      <p className="text-sm text-error mt-1">{errors.project_id}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="meeting_type">Meeting Type *</Label>
                    <Select
                      id="meeting_type"
                      name="meeting_type"
                      value={formData.meeting_type}
                      onChange={handleChange}
                      className={errors.meeting_type ? 'border-red-500' : ''}
                    >
                      {MEETING_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </Select>
                    {errors.meeting_type && (
                      <p className="text-sm text-error mt-1">{errors.meeting_type}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="meeting_name">Meeting Name (optional)</Label>
                    <Input
                      id="meeting_name"
                      name="meeting_name"
                      value={formData.meeting_name}
                      onChange={handleChange}
                      placeholder="e.g., Weekly Progress Meeting"
                    />
                  </div>
                  <div>
                    <Label htmlFor="meeting_number">Meeting Number</Label>
                    <Input
                      id="meeting_number"
                      name="meeting_number"
                      value={formData.meeting_number}
                      onChange={handleChange}
                      placeholder="e.g., OAC-023, TTK-045"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-4">
                  <div>
                    <Label htmlFor="meeting_date">Date *</Label>
                    <Input
                      id="meeting_date"
                      name="meeting_date"
                      type="date"
                      value={formData.meeting_date}
                      onChange={handleChange}
                      className={errors.meeting_date ? 'border-red-500' : ''}
                    />
                    {errors.meeting_date && (
                      <p className="text-sm text-error mt-1">{errors.meeting_date}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="meeting_time">Time</Label>
                    <Input
                      id="meeting_time"
                      name="meeting_time"
                      type="time"
                      value={formData.meeting_time}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <Label htmlFor="duration_minutes">Duration (min)</Label>
                    <Input
                      id="duration_minutes"
                      name="duration_minutes"
                      type="number"
                      value={formData.duration_minutes}
                      onChange={handleChange}
                      placeholder="60"
                      min="1"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="meeting_status">Status</Label>
                    <Select
                      id="meeting_status"
                      name="meeting_status"
                      value={formData.meeting_status}
                      onChange={handleChange}
                    >
                      {MEETING_STATUSES.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="e.g., Site trailer, Conference Room A, Zoom"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Previous Meeting Link */}
            {!isEditing && formData.project_id && previousMeetings && previousMeetings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="h-5 w-5" />
                    Link to Previous Meeting
                  </CardTitle>
                  <CardDescription>
                    Link this meeting to a previous meeting and carry over open action items
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="previous_meeting_id">Previous Meeting</Label>
                    <Select
                      id="previous_meeting_id"
                      name="previous_meeting_id"
                      value={formData.previous_meeting_id}
                      onChange={handleChange}
                    >
                      <option value="">Select previous meeting (optional)...</option>
                      {previousMeetings
                        .filter(m => m.id !== id) // Exclude current meeting if editing
                        .sort((a, b) => new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime())
                        .map((meeting) => (
                          <option key={meeting.id} value={meeting.id}>
                            {meeting.meeting_date} - {meeting.meeting_name || MEETING_TYPES.find(t => t.value === meeting.meeting_type)?.label || meeting.meeting_type}
                          </option>
                        ))}
                    </Select>
                  </div>

                  {/* Action Item Carryover */}
                  {formData.previous_meeting_id && uncompletedPreviousItems.length > 0 && (
                    <div className="border rounded-lg p-4 bg-muted/30">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Copy className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Open Action Items</span>
                          <span className="text-sm text-muted-foreground">
                            ({uncompletedPreviousItems.length} items)
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowCarryover(!showCarryover)}
                        >
                          {showCarryover ? 'Hide' : 'Carry Over'}
                        </Button>
                      </div>

                      {showCarryover && (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground mb-2">
                            Select action items to carry over to this meeting:
                          </p>
                          {uncompletedPreviousItems.map((item: MeetingActionItem) => (
                            <label
                              key={item.id}
                              className="flex items-start gap-2 p-2 rounded border bg-background cursor-pointer hover:bg-muted/50"
                            >
                              <input
                                type="checkbox"
                                checked={carryoverItems.includes(item.id)}
                                onChange={() => toggleCarryoverItem(item.id)}
                                className="mt-1 rounded"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{item.description}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                  {item.assignee && <span>Assigned: {item.assignee}</span>}
                                  {item.dueDate && <span>Due: {item.dueDate}</span>}
                                  {item.priority && (
                                    <span className={`px-1.5 py-0.5 rounded ${
                                      item.priority === 'high' ? 'bg-red-100 text-red-800' :
                                      item.priority === 'low' ? 'bg-green-100 text-green-800' :
                                      'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {item.priority}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </label>
                          ))}
                          {carryoverItems.length > 0 && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleCarryoverItems}
                              className="mt-2"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add {carryoverItems.length} Item{carryoverItems.length !== 1 ? 's' : ''} to This Meeting
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {formData.previous_meeting_id && uncompletedPreviousItems.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">
                      No open action items to carry over from the selected meeting.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Agenda & Minutes */}
            <Card>
              <CardHeader>
                <CardTitle>Agenda & Minutes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="agenda">Agenda</Label>
                  <Textarea
                    id="agenda"
                    name="agenda"
                    value={formData.agenda}
                    onChange={handleChange}
                    placeholder="Meeting agenda items..."
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="discussion_notes">Meeting Minutes / Discussion Notes</Label>
                  <Textarea
                    id="discussion_notes"
                    name="discussion_notes"
                    value={formData.discussion_notes}
                    onChange={handleChange}
                    placeholder="Record meeting discussions and notes..."
                    rows={6}
                  />
                </div>

                <div>
                  <Label htmlFor="decisions">Key Decisions</Label>
                  <Textarea
                    id="decisions"
                    name="decisions"
                    value={formData.decisions}
                    onChange={handleChange}
                    placeholder="Document key decisions made..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Action Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5" />
                  Action Items
                </CardTitle>
                <CardDescription>
                  Track follow-up tasks from this meeting
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.action_items.map((item, index) => (
                  <div key={item.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <Input
                          value={item.description}
                          onChange={(e) =>
                            updateActionItem(index, 'description', e.target.value)
                          }
                          placeholder="Action item description..."
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeActionItem(index)}
                      >
                        <Trash2 className="h-4 w-4 text-error" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Assignee</Label>
                        <Input
                          value={item.assignee || ''}
                          onChange={(e) =>
                            updateActionItem(index, 'assignee', e.target.value)
                          }
                          placeholder="Who is responsible?"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Company</Label>
                        <Input
                          value={item.assignee_company || ''}
                          onChange={(e) =>
                            updateActionItem(index, 'assignee_company', e.target.value)
                          }
                          placeholder="Responsible company"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <Label className="text-xs">Priority</Label>
                        <Select
                          value={item.priority || 'medium'}
                          onChange={(e) =>
                            updateActionItem(index, 'priority', e.target.value)
                          }
                        >
                          {ACTION_ITEM_PRIORITIES.map((p) => (
                            <option key={p.value} value={p.value}>
                              {p.label}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Category</Label>
                        <Select
                          value={item.category || ''}
                          onChange={(e) =>
                            updateActionItem(index, 'category', e.target.value)
                          }
                        >
                          <option value="">Select...</option>
                          {ACTION_ITEM_CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Due Date</Label>
                        <Input
                          type="date"
                          value={item.dueDate || ''}
                          onChange={(e) =>
                            updateActionItem(index, 'dueDate', e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Status</Label>
                        <Select
                          value={item.status}
                          onChange={(e) =>
                            updateActionItem(index, 'status', e.target.value)
                          }
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.cost_impact || false}
                          onChange={(e) =>
                            updateActionItem(index, 'cost_impact', e.target.checked.toString())
                          }
                          className="rounded"
                        />
                        Cost Impact
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.schedule_impact || false}
                          onChange={(e) =>
                            updateActionItem(index, 'schedule_impact', e.target.checked.toString())
                          }
                          className="rounded"
                        />
                        Schedule Impact
                      </label>
                    </div>
                  </div>
                ))}

                <Button type="button" variant="outline" onClick={addActionItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Action Item
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Attendees */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Attendees
                </CardTitle>
                <CardDescription>
                  {formData.attendees.length} attendee{formData.attendees.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.attendees.map((attendee, index) => (
                  <div key={index} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Input
                        value={attendee.name}
                        onChange={(e) => updateAttendee(index, 'name', e.target.value)}
                        placeholder="Name *"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttendee(index)}
                      >
                        <Trash2 className="h-4 w-4 text-error" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={attendee.company || ''}
                        onChange={(e) => updateAttendee(index, 'company', e.target.value)}
                        placeholder="Company"
                      />
                      <Input
                        value={attendee.title || ''}
                        onChange={(e) => updateAttendee(index, 'title', e.target.value)}
                        placeholder="Title (PM, Super...)"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={attendee.email || ''}
                        onChange={(e) => updateAttendee(index, 'email', e.target.value)}
                        placeholder="Email"
                        type="email"
                      />
                      <Input
                        value={attendee.phone || ''}
                        onChange={(e) => updateAttendee(index, 'phone', e.target.value)}
                        placeholder="Phone"
                        type="tel"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={attendee.representing || ''}
                        onChange={(e) => updateAttendee(index, 'representing', e.target.value)}
                      >
                        <option value="">Representing...</option>
                        {ATTENDEE_REPRESENTING.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </Select>
                      <Input
                        value={attendee.trade || ''}
                        onChange={(e) => updateAttendee(index, 'trade', e.target.value)}
                        placeholder="Trade (if sub)"
                      />
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={attendee.present !== false}
                          onChange={(e) => updateAttendee(index, 'present', e.target.checked)}
                          className="rounded"
                        />
                        Present
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={attendee.required || false}
                          onChange={(e) => updateAttendee(index, 'required', e.target.checked)}
                          className="rounded"
                        />
                        Required
                      </label>
                    </div>
                  </div>
                ))}

                <Button type="button" variant="outline" onClick={addAttendee} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Attendee
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </SmartLayout>
  )
}
