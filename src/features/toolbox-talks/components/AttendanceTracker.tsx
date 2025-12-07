/**
 * Attendance Tracker Component
 *
 * Displays and manages attendees for a toolbox talk.
 * Supports quick sign-in, adding workers, and bulk operations.
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { AttendanceStatusBadge } from './StatusBadge'
import {
  useToolboxAttendees,
  useAddAttendee,
  useQuickSignIn,
  useMarkAbsent,
  useMarkExcused,
  useRemoveAttendee,
  useBulkSignIn,
} from '../hooks/useToolboxTalks'
import type {
  ToolboxTalkAttendee,
  ToolboxAttendanceStatus,
} from '@/types/toolbox-talks'
import {
  UserPlus,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Trash2,
  MoreVertical,
  Building2,
  Wrench,
  BadgeCheck,
} from 'lucide-react'

interface AttendanceTrackerProps {
  talkId: string
  talkStatus: string
  className?: string
}

export function AttendanceTracker({
  talkId,
  talkStatus,
  className,
}: AttendanceTrackerProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newAttendee, setNewAttendee] = useState({
    worker_name: '',
    worker_company: '',
    worker_trade: '',
    worker_badge_number: '',
  })

  const { data: attendees = [], isLoading } = useToolboxAttendees(talkId)
  const addAttendee = useAddAttendee()
  const quickSignIn = useQuickSignIn()
  const markAbsent = useMarkAbsent()
  const markExcused = useMarkExcused()
  const removeAttendee = useRemoveAttendee()
  const bulkSignIn = useBulkSignIn()

  const canModifyAttendance = ['scheduled', 'in_progress'].includes(talkStatus)
  const canAddAttendees = ['scheduled', 'in_progress', 'draft'].includes(talkStatus)

  // Group attendees by status
  const presentAttendees = attendees.filter((a) => a.attendance_status === 'present')
  const expectedAttendees = attendees.filter((a) => a.attendance_status === 'expected')
  const absentAttendees = attendees.filter((a) => a.attendance_status === 'absent')
  const excusedAttendees = attendees.filter((a) => a.attendance_status === 'excused')

  const handleAddAttendee = async () => {
    if (!newAttendee.worker_name.trim()) return

    await addAttendee.mutateAsync({
      toolbox_talk_id: talkId,
      worker_name: newAttendee.worker_name,
      worker_company: newAttendee.worker_company || undefined,
      worker_trade: newAttendee.worker_trade || undefined,
      worker_badge_number: newAttendee.worker_badge_number || undefined,
    })

    setNewAttendee({
      worker_name: '',
      worker_company: '',
      worker_trade: '',
      worker_badge_number: '',
    })
    setShowAddForm(false)
  }

  const handleQuickSignIn = (attendee: ToolboxTalkAttendee) => {
    quickSignIn.mutate({ attendeeId: attendee.id, talkId })
  }

  const handleMarkAbsent = (attendee: ToolboxTalkAttendee) => {
    markAbsent.mutate({ attendeeId: attendee.id, talkId })
  }

  const handleMarkExcused = (attendee: ToolboxTalkAttendee) => {
    markExcused.mutate({ attendeeId: attendee.id, talkId })
  }

  const handleRemove = (attendee: ToolboxTalkAttendee) => {
    if (confirm(`Remove ${attendee.worker_name} from the attendance list?`)) {
      removeAttendee.mutate({ attendeeId: attendee.id, talkId })
    }
  }

  const handleBulkSignIn = () => {
    if (expectedAttendees.length === 0) return
    if (confirm(`Sign in all ${expectedAttendees.length} expected attendees?`)) {
      bulkSignIn.mutate(talkId)
    }
  }

  if (isLoading) {
    return (
      <div className={cn('animate-pulse', className)}>
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-gray-500" />
          <h3 className="font-medium text-gray-900">
            Attendance ({presentAttendees.length}/{attendees.length})
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {canModifyAttendance && expectedAttendees.length > 0 && (
            <button
              onClick={handleBulkSignIn}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Sign In All
            </button>
          )}
          {canAddAttendees && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              <UserPlus className="h-4 w-4" />
              Add
            </button>
          )}
        </div>
      </div>

      {/* Add Attendee Form */}
      {showAddForm && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Worker Name *
              </label>
              <input
                type="text"
                value={newAttendee.worker_name}
                onChange={(e) =>
                  setNewAttendee({ ...newAttendee, worker_name: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="John Smith"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Company
              </label>
              <input
                type="text"
                value={newAttendee.worker_company}
                onChange={(e) =>
                  setNewAttendee({ ...newAttendee, worker_company: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="ABC Contractors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Trade
              </label>
              <input
                type="text"
                value={newAttendee.worker_trade}
                onChange={(e) =>
                  setNewAttendee({ ...newAttendee, worker_trade: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Electrician"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Badge #
              </label>
              <input
                type="text"
                value={newAttendee.worker_badge_number}
                onChange={(e) =>
                  setNewAttendee({ ...newAttendee, worker_badge_number: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="12345"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleAddAttendee}
              disabled={!newAttendee.worker_name.trim() || addAttendee.isPending}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addAttendee.isPending ? 'Adding...' : 'Add Attendee'}
            </button>
          </div>
        </div>
      )}

      {/* Attendee Lists */}
      {attendees.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Users className="h-12 w-12 mx-auto text-gray-300 mb-2" />
          <p>No attendees added yet</p>
          {canAddAttendees && (
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              Add the first attendee
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Expected (awaiting sign-in) */}
          {expectedAttendees.length > 0 && (
            <AttendeeGroup
              title="Awaiting Sign-In"
              attendees={expectedAttendees}
              icon={<Clock className="h-4 w-4 text-gray-400" />}
              canModify={canModifyAttendance}
              onSignIn={handleQuickSignIn}
              onMarkAbsent={handleMarkAbsent}
              onMarkExcused={handleMarkExcused}
              onRemove={canAddAttendees ? handleRemove : undefined}
            />
          )}

          {/* Present (signed in) */}
          {presentAttendees.length > 0 && (
            <AttendeeGroup
              title="Signed In"
              attendees={presentAttendees}
              icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
              canModify={false}
              onRemove={canAddAttendees ? handleRemove : undefined}
            />
          )}

          {/* Absent */}
          {absentAttendees.length > 0 && (
            <AttendeeGroup
              title="Absent"
              attendees={absentAttendees}
              icon={<XCircle className="h-4 w-4 text-red-500" />}
              canModify={canModifyAttendance}
              onSignIn={handleQuickSignIn}
              onRemove={canAddAttendees ? handleRemove : undefined}
            />
          )}

          {/* Excused */}
          {excusedAttendees.length > 0 && (
            <AttendeeGroup
              title="Excused"
              attendees={excusedAttendees}
              icon={<Clock className="h-4 w-4 text-yellow-500" />}
              canModify={false}
              onRemove={canAddAttendees ? handleRemove : undefined}
            />
          )}
        </div>
      )}
    </div>
  )
}

// Attendee Group Sub-component
interface AttendeeGroupProps {
  title: string
  attendees: ToolboxTalkAttendee[]
  icon: React.ReactNode
  canModify: boolean
  onSignIn?: (attendee: ToolboxTalkAttendee) => void
  onMarkAbsent?: (attendee: ToolboxTalkAttendee) => void
  onMarkExcused?: (attendee: ToolboxTalkAttendee) => void
  onRemove?: (attendee: ToolboxTalkAttendee) => void
}

function AttendeeGroup({
  title,
  attendees,
  icon,
  canModify,
  onSignIn,
  onMarkAbsent,
  onMarkExcused,
  onRemove,
}: AttendeeGroupProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-medium text-gray-700">
          {title} ({attendees.length})
        </span>
      </div>
      <div className="space-y-1">
        {attendees.map((attendee) => (
          <AttendeeRow
            key={attendee.id}
            attendee={attendee}
            canModify={canModify}
            onSignIn={onSignIn}
            onMarkAbsent={onMarkAbsent}
            onMarkExcused={onMarkExcused}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  )
}

// Attendee Row Sub-component
interface AttendeeRowProps {
  attendee: ToolboxTalkAttendee
  canModify: boolean
  onSignIn?: (attendee: ToolboxTalkAttendee) => void
  onMarkAbsent?: (attendee: ToolboxTalkAttendee) => void
  onMarkExcused?: (attendee: ToolboxTalkAttendee) => void
  onRemove?: (attendee: ToolboxTalkAttendee) => void
}

function AttendeeRow({
  attendee,
  canModify,
  onSignIn,
  onMarkAbsent,
  onMarkExcused,
  onRemove,
}: AttendeeRowProps) {
  const [showActions, setShowActions] = useState(false)

  return (
    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md hover:bg-gray-100">
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <div className="font-medium text-sm text-gray-900 truncate">
            {attendee.worker_name}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {attendee.worker_company && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {attendee.worker_company}
              </span>
            )}
            {attendee.worker_trade && (
              <span className="flex items-center gap-1">
                <Wrench className="h-3 w-3" />
                {attendee.worker_trade}
              </span>
            )}
            {attendee.worker_badge_number && (
              <span className="flex items-center gap-1">
                <BadgeCheck className="h-3 w-3" />
                #{attendee.worker_badge_number}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Quick actions for expected attendees */}
        {canModify && attendee.attendance_status === 'expected' && onSignIn && (
          <button
            onClick={() => onSignIn(attendee)}
            className="p-1 text-green-600 hover:bg-green-100 rounded"
            title="Sign In"
          >
            <CheckCircle2 className="h-5 w-5" />
          </button>
        )}

        {/* Status badge for signed in */}
        {attendee.attendance_status === 'present' && attendee.signed_in_at && (
          <span className="text-xs text-green-600">
            {new Date(attendee.signed_in_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )}

        {/* More actions dropdown */}
        {(canModify || onRemove) && (
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {showActions && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowActions(false)}
                />
                <div className="absolute right-0 mt-1 w-36 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-20">
                  {canModify && attendee.attendance_status !== 'present' && onSignIn && (
                    <button
                      onClick={() => {
                        onSignIn(attendee)
                        setShowActions(false)
                      }}
                      className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Mark Present
                    </button>
                  )}
                  {canModify && attendee.attendance_status !== 'absent' && onMarkAbsent && (
                    <button
                      onClick={() => {
                        onMarkAbsent(attendee)
                        setShowActions(false)
                      }}
                      className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Mark Absent
                    </button>
                  )}
                  {canModify && attendee.attendance_status !== 'excused' && onMarkExcused && (
                    <button
                      onClick={() => {
                        onMarkExcused(attendee)
                        setShowActions(false)
                      }}
                      className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Mark Excused
                    </button>
                  )}
                  {onRemove && (
                    <button
                      onClick={() => {
                        onRemove(attendee)
                        setShowActions(false)
                      }}
                      className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default AttendanceTracker
