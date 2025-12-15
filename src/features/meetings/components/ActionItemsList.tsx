import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Plus,
  Edit,
  Trash2,
  User,
  Calendar,
  ArrowRight,
  AlertCircle,
  Clock,
  CheckCircle2,
  Circle,
} from 'lucide-react'
import { meetingActionItemsApi } from '@/lib/api/services/meetings'
import {
  ActionItemStatus,
  ActionItemPriority,
  getActionItemStatusLabel,
  getActionItemStatusColor,
  getActionItemPriorityLabel,
  getActionItemPriorityColor,
  isActionItemOverdue,
  getDaysUntilDue,
} from '@/types/meetings'
import type {
  MeetingActionItem,
  CreateMeetingActionItemDTO,
  UpdateMeetingActionItemDTO,
} from '@/types/meetings'

interface ActionItemsListProps {
  meetingId: string
  projectId?: string
  readOnly?: boolean
}

export function ActionItemsList({ meetingId, projectId, readOnly = false }: ActionItemsListProps) {
  const queryClient = useQueryClient()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<MeetingActionItem | null>(null)
  const [newItem, setNewItem] = useState({
    description: '',
    assignee_name: '',
    assignee_company: '',
    due_date: '',
    priority: 'medium' as ActionItemPriority | string,
    notes: '',
  })

  // Fetch action items
  const { data: actionItems, isLoading } = useQuery({
    queryKey: ['meeting-action-items', meetingId],
    queryFn: () => meetingActionItemsApi.getActionItems(meetingId),
  })

  // Create mutation
  const createItem = useMutation({
    mutationFn: (dto: CreateMeetingActionItemDTO) => meetingActionItemsApi.createActionItem(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-action-items', meetingId] })
      setShowAddDialog(false)
      setNewItem({
        description: '',
        assignee_name: '',
        assignee_company: '',
        due_date: '',
        priority: 'medium',
        notes: '',
      })
    },
  })

  // Update mutation
  const updateItem = useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & UpdateMeetingActionItemDTO) =>
      meetingActionItemsApi.updateActionItem(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-action-items', meetingId] })
      setEditingItem(null)
    },
  })

  // Complete mutation
  const completeItem = useMutation({
    mutationFn: (id: string) => meetingActionItemsApi.completeActionItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-action-items', meetingId] })
    },
  })

  // Delete mutation
  const deleteItem = useMutation({
    mutationFn: (id: string) => meetingActionItemsApi.deleteActionItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-action-items', meetingId] })
    },
  })

  // Convert to task mutation
  const convertToTask = useMutation({
    mutationFn: (id: string) => meetingActionItemsApi.convertToTask(id, projectId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-action-items', meetingId] })
    },
  })

  const handleAddItem = () => {
    if (!newItem.description.trim()) {return}

    createItem.mutate({
      meeting_id: meetingId,
      description: newItem.description,
      assignee_name: newItem.assignee_name || undefined,
      assignee_company: newItem.assignee_company || undefined,
      due_date: newItem.due_date || undefined,
      priority: newItem.priority,
      notes: newItem.notes || undefined,
      item_order: (actionItems?.length || 0) + 1,
    })
  }

  const handleUpdateItem = () => {
    if (!editingItem) {return}

    updateItem.mutate({
      id: editingItem.id,
      description: editingItem.description,
      assignee_name: editingItem.assignee_name || undefined,
      assignee_company: editingItem.assignee_company || undefined,
      due_date: editingItem.due_date || undefined,
      priority: editingItem.priority,
      status: editingItem.status,
      notes: editingItem.notes || undefined,
    })
  }

  const handleToggleComplete = (item: MeetingActionItem) => {
    if (item.status === ActionItemStatus.COMPLETED) {
      updateItem.mutate({
        id: item.id,
        status: ActionItemStatus.PENDING,
        completed_date: undefined,
      })
    } else {
      completeItem.mutate(item.id)
    }
  }

  const getStatusIcon = (status: string) => {
    if (status === ActionItemStatus.COMPLETED) {
      return <CheckCircle2 className="h-5 w-5 text-green-600" />
    }
    if (status === ActionItemStatus.IN_PROGRESS) {
      return <Clock className="h-5 w-5 text-blue-600" />
    }
    return <Circle className="h-5 w-5 text-gray-400" />
  }

  if (isLoading) {
    return (
      <div className="text-center py-4 text-gray-500">Loading action items...</div>
    )
  }

  // Group by status
  const pendingItems = actionItems?.filter(i =>
    i.status !== ActionItemStatus.COMPLETED && i.status !== ActionItemStatus.CANCELLED
  ) || []
  const completedItems = actionItems?.filter(i =>
    i.status === ActionItemStatus.COMPLETED
  ) || []

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Action Items
          {actionItems && actionItems.length > 0 && (
            <Badge variant="outline">
              {pendingItems.length} pending / {completedItems.length} completed
            </Badge>
          )}
        </h3>
        {!readOnly && (
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Action Item
          </Button>
        )}
      </div>

      {/* Action Items List */}
      {actionItems?.length === 0 ? (
        <div className="text-center py-8 border rounded-lg bg-gray-50">
          <CheckCircle2 className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No action items yet</p>
          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => setShowAddDialog(true)}
            >
              Add first action item
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {/* Pending Items */}
          {pendingItems.map((item) => {
            const overdue = isActionItemOverdue(item)
            const daysUntil = getDaysUntilDue(item)

            return (
              <Card key={item.id} className={overdue ? 'border-red-200' : ''}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    {!readOnly && (
                      <button
                        className="mt-0.5"
                        onClick={() => handleToggleComplete(item)}
                      >
                        {getStatusIcon(item.status)}
                      </button>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{item.description}</p>
                        <div className="flex items-center gap-1">
                          <Badge className={getActionItemPriorityColor(item.priority)}>
                            {getActionItemPriorityLabel(item.priority)}
                          </Badge>
                          {!readOnly && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setEditingItem(item)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-red-600"
                                onClick={() => {
                                  if (confirm('Delete this action item?')) {
                                    deleteItem.mutate(item.id)
                                  }
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        {(item.assignee_name || item.assignee?.full_name) && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {item.assignee?.full_name || item.assignee_name}
                            {item.assignee_company && ` (${item.assignee_company})`}
                          </span>
                        )}
                        {item.due_date && (
                          <span className={`flex items-center gap-1 ${overdue ? 'text-red-600 font-medium' : ''}`}>
                            <Calendar className="h-3 w-3" />
                            {overdue ? 'Overdue: ' : ''}
                            {new Date(item.due_date).toLocaleDateString()}
                            {!overdue && daysUntil !== null && daysUntil <= 7 && (
                              <span className="text-yellow-600">({daysUntil} days)</span>
                            )}
                          </span>
                        )}
                        {item.task_id && (
                          <Badge variant="outline" className="text-xs">
                            Linked to Task
                          </Badge>
                        )}
                      </div>

                      {item.notes && (
                        <p className="text-xs text-gray-500 mt-1">{item.notes}</p>
                      )}

                      {/* Convert to Task button */}
                      {!readOnly && projectId && !item.task_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 h-7 text-xs"
                          onClick={() => convertToTask.mutate(item.id)}
                          disabled={convertToTask.isPending}
                        >
                          <ArrowRight className="h-3 w-3 mr-1" />
                          Convert to Task
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {/* Completed Items */}
          {completedItems.length > 0 && (
            <div className="pt-4">
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">
                Completed ({completedItems.length})
              </p>
              {completedItems.map((item) => (
                <Card key={item.id} className="bg-gray-50 opacity-75">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      {!readOnly && (
                        <button
                          className="mt-0.5"
                          onClick={() => handleToggleComplete(item)}
                        >
                          {getStatusIcon(item.status)}
                        </button>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm line-through text-gray-500">
                          {item.description}
                        </p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                          {(item.assignee_name || item.assignee?.full_name) && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {item.assignee?.full_name || item.assignee_name}
                            </span>
                          )}
                          {item.completed_date && (
                            <span>
                              Completed {new Date(item.completed_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Action Item Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Action Item</DialogTitle>
            <DialogDescription>
              Create a new action item to track.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="What needs to be done?"
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="assignee_name">Assignee Name</Label>
                <Input
                  id="assignee_name"
                  placeholder="Who is responsible?"
                  value={newItem.assignee_name}
                  onChange={(e) => setNewItem({ ...newItem, assignee_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignee_company">Company</Label>
                <Input
                  id="assignee_company"
                  placeholder="Company name"
                  value={newItem.assignee_company}
                  onChange={(e) => setNewItem({ ...newItem, assignee_company: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={newItem.due_date}
                  onChange={(e) => setNewItem({ ...newItem, due_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <select
                  id="priority"
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={newItem.priority}
                  onChange={(e) => setNewItem({ ...newItem, priority: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes..."
                value={newItem.notes}
                onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddItem}
              disabled={!newItem.description.trim() || createItem.isPending}
            >
              {createItem.isPending ? 'Adding...' : 'Add Action Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Action Item Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Action Item</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit_description">Description *</Label>
                <Textarea
                  id="edit_description"
                  value={editingItem.description}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_assignee_name">Assignee Name</Label>
                  <Input
                    id="edit_assignee_name"
                    value={editingItem.assignee_name || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, assignee_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_assignee_company">Company</Label>
                  <Input
                    id="edit_assignee_company"
                    value={editingItem.assignee_company || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, assignee_company: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_due_date">Due Date</Label>
                  <Input
                    id="edit_due_date"
                    type="date"
                    value={editingItem.due_date || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, due_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_priority">Priority</Label>
                  <select
                    id="edit_priority"
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    value={editingItem.priority}
                    onChange={(e) => setEditingItem({ ...editingItem, priority: e.target.value as ActionItemPriority })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_status">Status</Label>
                  <select
                    id="edit_status"
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    value={editingItem.status}
                    onChange={(e) => setEditingItem({ ...editingItem, status: e.target.value as ActionItemStatus })}
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_notes">Notes</Label>
                <Textarea
                  id="edit_notes"
                  value={editingItem.notes || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateItem}
              disabled={!editingItem?.description.trim() || updateItem.isPending}
            >
              {updateItem.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ActionItemsList
