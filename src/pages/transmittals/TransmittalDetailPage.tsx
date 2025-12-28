/**
 * TransmittalDetailPage
 * Page for viewing a single transmittal with all details
 */

import { useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { TransmittalDetail } from '@/features/transmittals/components';

export function TransmittalDetailPage() {
  const { projectId, transmittalId } = useParams<{
    projectId: string;
    transmittalId: string;
  }>();

  if (!projectId || !transmittalId) {
    return <AppLayout><div className="p-6">Project ID and Transmittal ID are required</div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <TransmittalDetail
          transmittalId={transmittalId}
          projectId={projectId}
        />
      </div>
    </AppLayout>
  );
}

export default TransmittalDetailPage;
