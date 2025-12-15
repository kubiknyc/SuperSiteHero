/**
 * Settings Hooks
 *
 * Re-export all settings-related hooks for convenient imports.
 */

export {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useResetNotificationPreferences,
  useEnableAllEmailNotifications,
  useDisableAllEmailNotifications,
  useUpdateQuietHours,
  preferencesKeys,
} from './useNotificationPreferences'

export { usePushNotifications } from './usePushNotifications'
