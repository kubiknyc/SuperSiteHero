/**
 * Lien Waiver Reminders Hook
 *
 * React Query hooks for managing lien waiver reminder functionality
 * including stats, manual triggers, and configuration.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  lienWaiverReminderService,
  WaiverReminderConfig,
  DEFAULT_REMINDER_CONFIG,
} from '@/lib/api/services/lien-waiver-reminders';
import { lienWaiverKeys } from './useLienWaivers';

// Query keys for reminders
export const reminderKeys = {
  all: [...lienWaiverKeys.all, 'reminders'] as const,
  stats: () => [...reminderKeys.all, 'stats'] as const,
  pending: () => [...reminderKeys.all, 'pending'] as const,
  overdue: () => [...reminderKeys.all, 'overdue'] as const,
  config: () => [...reminderKeys.all, 'config'] as const,
};

/**
 * Get reminder statistics for dashboard display
 */
export function useLienWaiverReminderStats() {
  const { user } = useAuth();
  const companyId = user?.user_metadata?.company_id;

  return useQuery({
    queryKey: reminderKeys.stats(),
    queryFn: async () => {
      if (!companyId) {throw new Error('Company ID required');}
      return lienWaiverReminderService.getReminderStats(companyId);
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refresh every 10 minutes
  });
}

/**
 * Get waivers that need reminders (approaching due date)
 */
export function useWaiversNeedingReminders(config?: Partial<WaiverReminderConfig>) {
  const { user } = useAuth();
  const companyId = user?.user_metadata?.company_id;
  const mergedConfig = { ...DEFAULT_REMINDER_CONFIG, ...config };

  return useQuery({
    queryKey: [...reminderKeys.pending(), config],
    queryFn: async () => {
      if (!companyId) {throw new Error('Company ID required');}
      return lienWaiverReminderService.getWaiversNeedingReminders(companyId, mergedConfig);
    },
    enabled: !!companyId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Get overdue waivers
 */
export function useOverdueWaivers() {
  const { user } = useAuth();
  const companyId = user?.user_metadata?.company_id;

  return useQuery({
    queryKey: reminderKeys.overdue(),
    queryFn: async () => {
      if (!companyId) {throw new Error('Company ID required');}
      return lienWaiverReminderService.getOverdueWaivers(companyId);
    },
    enabled: !!companyId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Manually trigger reminder processing for all pending waivers
 * Useful for testing or manual batch sends
 */
export function useProcessWaiverReminders() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyId = user?.user_metadata?.company_id;

  return useMutation({
    mutationFn: async (config?: Partial<WaiverReminderConfig>) => {
      if (!companyId) {throw new Error('Company ID required');}
      const mergedConfig = { ...DEFAULT_REMINDER_CONFIG, ...config };
      return lienWaiverReminderService.processReminders(companyId, mergedConfig);
    },
    onSuccess: () => {
      // Invalidate all reminder-related queries
      queryClient.invalidateQueries({ queryKey: reminderKeys.all });
      // Also invalidate the main waiver list since reminder_sent_at will be updated
      queryClient.invalidateQueries({ queryKey: lienWaiverKeys.lists() });
    },
  });
}

/**
 * Send a single reminder for a specific waiver
 */
export function useSendWaiverReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      waiver,
      escalationLevel,
      config,
    }: {
      waiver: Parameters<typeof lienWaiverReminderService.sendWaiverReminder>[0];
      escalationLevel: 'first' | 'second' | 'third' | 'overdue';
      config?: Partial<WaiverReminderConfig>;
    }) => {
      const mergedConfig = { ...DEFAULT_REMINDER_CONFIG, ...config };
      return lienWaiverReminderService.sendWaiverReminder(waiver, escalationLevel, mergedConfig);
    },
    onSuccess: (_, variables) => {
      // Invalidate specific waiver
      queryClient.invalidateQueries({ queryKey: lienWaiverKeys.detail(variables.waiver.id) });
      // Invalidate reminder stats
      queryClient.invalidateQueries({ queryKey: reminderKeys.stats() });
    },
  });
}

/**
 * Hook to get reminder urgency level based on due date
 */
export function useWaiverUrgency(dueDate: string | null | undefined): {
  level: 'none' | 'first' | 'second' | 'third' | 'overdue';
  daysUntilDue: number;
  isOverdue: boolean;
  color: string;
  label: string;
} {
  if (!dueDate) {
    return {
      level: 'none',
      daysUntilDue: 0,
      isOverdue: false,
      color: 'gray',
      label: 'No due date',
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysUntilDue < 0) {
    return {
      level: 'overdue',
      daysUntilDue,
      isOverdue: true,
      color: 'red',
      label: `${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) !== 1 ? 's' : ''} overdue`,
    };
  }

  if (daysUntilDue <= 1) {
    return {
      level: 'third',
      daysUntilDue,
      isOverdue: false,
      color: 'red',
      label: daysUntilDue === 0 ? 'Due today' : 'Due tomorrow',
    };
  }

  if (daysUntilDue <= 3) {
    return {
      level: 'second',
      daysUntilDue,
      isOverdue: false,
      color: 'orange',
      label: `Due in ${daysUntilDue} days`,
    };
  }

  if (daysUntilDue <= 7) {
    return {
      level: 'first',
      daysUntilDue,
      isOverdue: false,
      color: 'yellow',
      label: `Due in ${daysUntilDue} days`,
    };
  }

  return {
    level: 'none',
    daysUntilDue,
    isOverdue: false,
    color: 'green',
    label: `Due in ${daysUntilDue} days`,
  };
}

/**
 * Export types for external use
 */
export type { WaiverReminderConfig };
export { DEFAULT_REMINDER_CONFIG };
