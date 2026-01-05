/**
 * User Approvals Admin Page
 *
 * Admin page for managing pending user registrations
 */

import { PendingUsersManager } from '@/features/user-management/components/PendingUsersManager';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SmartLayout } from '@/components/layout/SmartLayout';
import { InfoIcon } from 'lucide-react';

export default function UserApprovalsPage() {
  return (
    <SmartLayout title="User Approvals" subtitle="Pending user requests">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Approvals</h1>
          <p className="text-muted-foreground mt-2">
            Manage pending user registrations for your company
          </p>
        </div>

        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertTitle>About User Approvals</AlertTitle>
          <AlertDescription>
            When someone registers with your company's name, they need approval from an
            admin or owner before gaining access to the system. Approved users will
            receive an email notification and can immediately log in.
          </AlertDescription>
        </Alert>

        <PendingUsersManager />
      </div>
    </SmartLayout>
  );
}
