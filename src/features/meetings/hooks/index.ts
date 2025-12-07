// File: /src/features/meetings/hooks/index.ts
// Export all meetings hooks

export {
  // Hooks
  useMeetings,
  useAllMeetings,
  useMeeting,
  useCreateMeeting,
  useUpdateMeeting,
  useDeleteMeeting,
  useAddActionItem,
  useUpdateActionItem,

  // Constants
  MEETING_TYPES,
  MEETING_STATUSES,
  ACTION_ITEM_PRIORITIES,
  ACTION_ITEM_CATEGORIES,
  ATTENDEE_REPRESENTING,

  // Types
  type MeetingType,
  type MeetingStatus,
  type MeetingAttendee,
  type MeetingActionItem,
  type MeetingWithDetails,
} from './useMeetings'
