/**
 * Toolbox Talk Form Page
 *
 * Create or edit a toolbox talk with topic selection,
 * scheduling, and presenter assignment.
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useToolboxTalk,
  useToolboxTopicsByCategory,
  useCreateToolboxTalk,
  useUpdateToolboxTalk,
} from '@/features/toolbox-talks/hooks'
import {
  TOPIC_CATEGORY_LABELS,
  type ToolboxTopicCategory,
  type CreateToolboxTalkDTO,
  type UpdateToolboxTalkDTO,
} from '@/types/toolbox-talks'
import { useProjectContext } from '@/lib/contexts/ProjectContext'
import { useAuth } from '@/lib/auth/AuthContext'
import {
  ArrowLeft,
  Save,
  Calendar,
  MapPin,
  User,
  FileText,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function ToolboxTalkFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEditing = !!id

  const { currentProject } = useProjectContext()
  const { userProfile } = useAuth()

  // Fetch existing talk if editing
  const { data: existingTalk, isLoading: isLoadingTalk } = useToolboxTalk(id || '')

  // Fetch topics grouped by category
  const { data: topicsByCategory = {}, isLoading: isLoadingTopics } =
    useToolboxTopicsByCategory(userProfile?.company_id || null)

  const createTalk = useCreateToolboxTalk()
  const updateTalk = useUpdateToolboxTalk()

  // Form state
  const [formData, setFormData] = useState({
    topic_id: '' as string,
    custom_topic_title: '',
    custom_topic_description: '',
    category: 'other' as ToolboxTopicCategory,
    scheduled_date: new Date().toISOString().split('T')[0],
    scheduled_time: '07:00',
    location: '',
    presenter_name: '',
    presenter_title: '',
  })

  const [useCustomTopic, setUseCustomTopic] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Populate form when editing
  useEffect(() => {
    if (existingTalk) {
      setTimeout(() => {
        setFormData({
          topic_id: existingTalk.topic_id || '',
          custom_topic_title: existingTalk.custom_topic_title || '',
          custom_topic_description: existingTalk.custom_topic_description || '',
          category: existingTalk.category,
          scheduled_date: existingTalk.scheduled_date,
          scheduled_time: existingTalk.scheduled_time || '07:00',
          location: existingTalk.location || '',
          presenter_name: existingTalk.presenter_name || '',
          presenter_title: existingTalk.presenter_title || '',
        })
        setUseCustomTopic(!existingTalk.topic_id)
      }, 0)
    }
  }, [existingTalk])

  // Get selected topic details
  const selectedTopic = formData.topic_id
    ? Object.values(topicsByCategory)
        .flat()
        .find((t) => t.id === formData.topic_id)
    : null

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when field changes
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const handleTopicChange = (topicId: string) => {
    const topic = Object.values(topicsByCategory)
      .flat()
      .find((t) => t.id === topicId)

    setFormData((prev) => ({
      ...prev,
      topic_id: topicId,
      category: topic?.category || prev.category,
    }))
    setUseCustomTopic(false)
  }

  const handleUseCustomTopic = () => {
    setUseCustomTopic(true)
    setFormData((prev) => ({
      ...prev,
      topic_id: '',
    }))
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!useCustomTopic && !formData.topic_id) {
      newErrors.topic_id = 'Please select a topic or create a custom one'
    }

    if (useCustomTopic && !formData.custom_topic_title.trim()) {
      newErrors.custom_topic_title = 'Topic title is required'
    }

    if (!formData.scheduled_date) {
      newErrors.scheduled_date = 'Scheduled date is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {return}
    if (!currentProject) {
      setErrors({ project: 'No project selected' })
      return
    }

    if (isEditing && id) {
      const dto: UpdateToolboxTalkDTO = {
        topic_id: useCustomTopic ? null : formData.topic_id || null,
        custom_topic_title: useCustomTopic ? formData.custom_topic_title : null,
        custom_topic_description: useCustomTopic
          ? formData.custom_topic_description || null
          : null,
        category: formData.category,
        scheduled_date: formData.scheduled_date,
        scheduled_time: formData.scheduled_time || null,
        location: formData.location || null,
        presenter_name: formData.presenter_name || null,
        presenter_title: formData.presenter_title || null,
      }

      updateTalk.mutate(
        { id, dto },
        {
          onSuccess: () => navigate(`/toolbox-talks/${id}`),
        }
      )
    } else {
      const dto: CreateToolboxTalkDTO = {
        project_id: currentProject.id,
        company_id: userProfile?.company_id || '',
        topic_id: useCustomTopic ? null : formData.topic_id || null,
        custom_topic_title: useCustomTopic ? formData.custom_topic_title : null,
        custom_topic_description: useCustomTopic
          ? formData.custom_topic_description || null
          : null,
        category: formData.category,
        scheduled_date: formData.scheduled_date,
        scheduled_time: formData.scheduled_time || null,
        location: formData.location || null,
        presenter_name: formData.presenter_name || null,
        presenter_title: formData.presenter_title || null,
      }

      createTalk.mutate(dto, {
        onSuccess: (talk) => navigate(`/toolbox-talks/${talk.id}`),
      })
    }
  }

  const isLoading = isLoadingTalk || isLoadingTopics
  const isSaving = createTalk.isPending || updateTalk.isPending

  if (!currentProject) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 mx-auto text-yellow-400 mb-4" />
            <h2 className="text-lg font-medium text-foreground heading-section">No Project Selected</h2>
            <p className="text-muted mt-1">
              Please select a project before scheduling a toolbox talk.
            </p>
            <Link to="/projects">
              <Button className="mt-4">Go to Projects</Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/toolbox-talks"
            className="inline-flex items-center text-sm text-muted hover:text-secondary mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Toolbox Talks
          </Link>
          <h1 className="text-2xl font-bold text-foreground heading-page">
            {isEditing ? 'Edit Toolbox Talk' : 'Schedule Toolbox Talk'}
          </h1>
          <p className="text-muted mt-1">
            {isEditing
              ? 'Update the toolbox talk details'
              : 'Schedule a safety briefing for your team'}
          </p>
        </div>

        {isLoading ? (
          <div className="animate-pulse space-y-6">
            <div className="bg-card rounded-lg border p-6">
              <div className="h-6 bg-muted rounded w-1/3 mb-4" />
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 bg-muted rounded" />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Topic Selection */}
            <div className="bg-card rounded-lg border p-6">
              <h2 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2 heading-section">
                <FileText className="h-5 w-5 text-disabled" />
                Topic
              </h2>

              {!useCustomTopic ? (
                <div className="space-y-4">
                  {/* Topic dropdown by category */}
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Select Topic
                    </label>
                    <Select
                      value={formData.topic_id}
                      onValueChange={handleTopicChange}
                    >
                      <SelectTrigger
                        className={cn(errors.topic_id && 'border-red-500')}
                      >
                        <SelectValue placeholder="Choose a topic..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {Object.entries(topicsByCategory).map(([category, topics]) => (
                          <div key={category}>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted uppercase tracking-wide">
                              {TOPIC_CATEGORY_LABELS[category as ToolboxTopicCategory]}
                            </div>
                            {topics.map((topic) => (
                              <SelectItem key={topic.id} value={topic.id}>
                                <div className="flex items-center gap-2">
                                  <span>{topic.title}</span>
                                  {topic.requires_certification && (
                                    <span className="text-xs text-primary">(Cert)</span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.topic_id && (
                      <p className="text-sm text-error mt-1">{errors.topic_id}</p>
                    )}
                  </div>

                  {/* Selected topic preview */}
                  {selectedTopic && (
                    <div className="p-3 bg-surface rounded-lg">
                      <p className="text-sm text-secondary">{selectedTopic.description}</p>
                      {selectedTopic.requires_certification && (
                        <p className="text-xs text-primary mt-2">
                          This topic grants certification for{' '}
                          {selectedTopic.certification_valid_days} days
                        </p>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleUseCustomTopic}
                    className="text-sm text-primary hover:text-blue-800"
                  >
                    Or create a custom topic...
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Custom Topic Title *
                    </label>
                    <Input
                      value={formData.custom_topic_title}
                      onChange={(e) =>
                        handleChange('custom_topic_title', e.target.value)
                      }
                      placeholder="Enter topic title"
                      className={cn(errors.custom_topic_title && 'border-red-500')}
                    />
                    {errors.custom_topic_title && (
                      <p className="text-sm text-error mt-1">
                        {errors.custom_topic_title}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.custom_topic_description}
                      onChange={(e) =>
                        handleChange('custom_topic_description', e.target.value)
                      }
                      placeholder="Brief description of the topic..."
                      rows={3}
                      className="w-full px-3 py-2 border border-input rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Category
                    </label>
                    <Select
                      value={formData.category}
                      onValueChange={(v) =>
                        handleChange('category', v as ToolboxTopicCategory)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TOPIC_CATEGORY_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <button
                    type="button"
                    onClick={() => setUseCustomTopic(false)}
                    className="text-sm text-primary hover:text-blue-800"
                  >
                    Or select from topic library...
                  </button>
                </div>
              )}
            </div>

            {/* Schedule */}
            <div className="bg-card rounded-lg border p-6">
              <h2 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2 heading-section">
                <Calendar className="h-5 w-5 text-disabled" />
                Schedule
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">
                    Date *
                  </label>
                  <Input
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) => handleChange('scheduled_date', e.target.value)}
                    className={cn(errors.scheduled_date && 'border-red-500')}
                  />
                  {errors.scheduled_date && (
                    <p className="text-sm text-error mt-1">{errors.scheduled_date}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">
                    Time
                  </label>
                  <Input
                    type="time"
                    value={formData.scheduled_time}
                    onChange={(e) => handleChange('scheduled_time', e.target.value)}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-secondary mb-1">
                    Location
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-disabled" />
                    <Input
                      value={formData.location}
                      onChange={(e) => handleChange('location', e.target.value)}
                      placeholder="Where on the job site?"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Presenter */}
            <div className="bg-card rounded-lg border p-6">
              <h2 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2 heading-section">
                <User className="h-5 w-5 text-disabled" />
                Presenter
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">
                    Name
                  </label>
                  <Input
                    value={formData.presenter_name}
                    onChange={(e) => handleChange('presenter_name', e.target.value)}
                    placeholder="Who will present?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">
                    Title
                  </label>
                  <Input
                    value={formData.presenter_title}
                    onChange={(e) => handleChange('presenter_title', e.target.value)}
                    placeholder="Job title or role"
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <Link to="/toolbox-talks">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving
                  ? 'Saving...'
                  : isEditing
                  ? 'Save Changes'
                  : 'Schedule Talk'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  )
}

export default ToolboxTalkFormPage
