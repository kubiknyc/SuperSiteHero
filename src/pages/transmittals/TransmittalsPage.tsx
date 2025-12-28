/**
 * TransmittalsPage
 * Main page for listing and managing transmittals within a project
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TransmittalList, TransmittalForm } from '@/features/transmittals/components';
import type { Transmittal } from '@/types/transmittal';

export function TransmittalsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  if (!projectId) {
    return <AppLayout><div className="p-6">Project ID is required</div></AppLayout>;
  }

  const handleCreateSuccess = (transmittal: Transmittal) => {
    setShowCreateDialog(false);
    navigate(`/projects/${projectId}/transmittals/${transmittal.id}`);
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <TransmittalList
          projectId={projectId}
          onCreateNew={() => setShowCreateDialog(true)}
        />

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Transmittal</DialogTitle>
            </DialogHeader>
            <TransmittalForm
              projectId={projectId}
              onSuccess={handleCreateSuccess}
              onCancel={() => setShowCreateDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

export default TransmittalsPage;
