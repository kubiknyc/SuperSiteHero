// File: /src/features/notices/hooks/index.ts
// Central export for Notice hooks

// Query hooks
export {
  noticeKeys,
  useNotices,
  useNotice,
  useNoticeStats,
  useOverdueNotices,
  useNoticesDueSoon,
  useCriticalNotices,
  useNoticesByStatus,
  useNoticesByDirection,
} from './useNotices'

// Mutation hooks with notifications
export {
  useCreateNoticeWithNotification,
  useUpdateNoticeWithNotification,
  useDeleteNoticeWithNotification,
  useUpdateNoticeStatusWithNotification,
  useRecordNoticeResponseWithNotification,
  useUploadNoticeDocumentWithNotification,
} from './useNoticeMutations'
