import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  GripVertical,
  FileText,
  CheckCircle,
  MessageSquare,
  List,
} from 'lucide-react'
import { meetingNotesApi } from '@/lib/api/services/meetings'
import type {
  MeetingNote,
  CreateMeetingNoteDTO,
  UpdateMeetingNoteDTO,
  NoteType,
} from '@/types/meetings'

interface MeetingNotesEditorProps {
  meetingId: string
  readOnly?: boolean
}

const NOTE_TYPE_OPTIONS = [
  { value: 'general', label: 'General Note', icon: FileText },
  { value: 'decision', label: 'Decision', icon: CheckCircle },
  { value: 'discussion', label: 'Discussion Point', icon: MessageSquare },
  { value: 'agenda_item', label: 'Agenda Item', icon: List },
]

export function MeetingNotesEditor({ meetingId, readOnly = false }: MeetingNotesEditorProps) {
  const queryClient = useQueryClient()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingNote, setEditingNote] = useState<MeetingNote | null>(null)
  const [newNote, setNewNote] = useState({
    section_title: '',
    content: '',
    note_type: 'general' as NoteType | string,
  })

  // Fetch notes
  const { data: notes, isLoading } = useQuery({
    queryKey: ['meeting-notes', meetingId],
    queryFn: () => meetingNotesApi.getNotes(meetingId),
  })

  // Create mutation
  const createNote = useMutation({
    mutationFn: (dto: CreateMeetingNoteDTO) => meetingNotesApi.createNote(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-notes', meetingId] })
      setShowAddDialog(false)
      setNewNote({ section_title: '', content: '', note_type: 'general' })
    },
  })

  // Update mutation
  const updateNote = useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & UpdateMeetingNoteDTO) =>
      meetingNotesApi.updateNote(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-notes', meetingId] })
      setEditingNote(null)
    },
  })

  // Delete mutation
  const deleteNote = useMutation({
    mutationFn: (id: string) => meetingNotesApi.deleteNote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-notes', meetingId] })
    },
  })

  const handleAddNote = () => {
    if (!newNote.content.trim()) {return}

    createNote.mutate({
      meeting_id: meetingId,
      section_title: newNote.section_title || undefined,
      content: newNote.content,
      note_type: newNote.note_type,
      note_order: (notes?.length || 0) + 1,
    })
  }

  const handleUpdateNote = () => {
    if (!editingNote) {return}

    updateNote.mutate({
      id: editingNote.id,
      section_title: editingNote.section_title || undefined,
      content: editingNote.content,
      note_type: editingNote.note_type,
    })
  }

  const getNoteTypeIcon = (type: string) => {
    const option = NOTE_TYPE_OPTIONS.find(o => o.value === type)
    if (!option) {return FileText}
    return option.icon
  }

  const getNoteTypeLabel = (type: string) => {
    const option = NOTE_TYPE_OPTIONS.find(o => o.value === type)
    return option?.label || 'Note'
  }

  const getNoteTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      general: 'bg-muted text-foreground',
      decision: 'bg-success-light text-green-800',
      discussion: 'bg-info-light text-blue-800',
      agenda_item: 'bg-purple-100 text-purple-800',
    }
    return colors[type] || 'bg-muted text-foreground'
  }

  if (isLoading) {
    return (
      <div className="text-center py-4 text-muted">Loading notes...</div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2 heading-subsection">
          <FileText className="h-4 w-4" />
          Meeting Notes
        </h3>
        {!readOnly && (
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Note
          </Button>
        )}
      </div>

      {/* Notes List */}
      {notes?.length === 0 ? (
        <div className="text-center py-8 border rounded-lg bg-surface">
          <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-muted text-sm">No notes yet</p>
          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => setShowAddDialog(true)}
            >
              Add first note
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {notes?.map((note) => {
            const Icon = getNoteTypeIcon(note.note_type)

            return (
              <Card key={note.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {!readOnly && (
                      <div className="pt-1 cursor-grab">
                        <GripVertical className="h-4 w-4 text-disabled" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="h-4 w-4 text-muted" />
                        {note.section_title && (
                          <span className="font-medium">{note.section_title}</span>
                        )}
                        <Badge className={getNoteTypeBadgeColor(note.note_type)}>
                          {getNoteTypeLabel(note.note_type)}
                        </Badge>
                      </div>
                      <p className="text-secondary whitespace-pre-wrap">{note.content}</p>
                      {note.created_by_user && (
                        <p className="text-xs text-disabled mt-2">
                          Added by {note.created_by_user.full_name}
                        </p>
                      )}
                    </div>
                    {!readOnly && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingNote(note)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-error"
                          onClick={() => {
                            if (confirm('Delete this note?')) {
                              deleteNote.mutate(note.id)
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Note Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
            <DialogDescription>
              Add a new note to the meeting minutes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="note_type">Note Type</Label>
              <select
                id="note_type"
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={newNote.note_type}
                onChange={(e) => setNewNote({ ...newNote, note_type: e.target.value })}
              >
                {NOTE_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="section_title">Section Title (optional)</Label>
              <Input
                id="section_title"
                placeholder="e.g., Safety Discussion"
                value={newNote.section_title}
                onChange={(e) => setNewNote({ ...newNote, section_title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                placeholder="Enter note content..."
                value={newNote.content}
                onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddNote}
              disabled={!newNote.content.trim() || createNote.isPending}
            >
              {createNote.isPending ? 'Adding...' : 'Add Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Note Dialog */}
      <Dialog open={!!editingNote} onOpenChange={(open) => !open && setEditingNote(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
          </DialogHeader>
          {editingNote && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit_note_type">Note Type</Label>
                <select
                  id="edit_note_type"
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={editingNote.note_type}
                  onChange={(e) => setEditingNote({ ...editingNote, note_type: e.target.value as NoteType })}
                >
                  {NOTE_TYPE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_section_title">Section Title</Label>
                <Input
                  id="edit_section_title"
                  value={editingNote.section_title || ''}
                  onChange={(e) => setEditingNote({ ...editingNote, section_title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_content">Content *</Label>
                <Textarea
                  id="edit_content"
                  value={editingNote.content}
                  onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                  rows={5}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingNote(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateNote}
              disabled={!editingNote?.content.trim() || updateNote.isPending}
            >
              {updateNote.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default MeetingNotesEditor
