/**
 * TransmittalDetailPage
 * Page for viewing a single transmittal with all details
 */

import { useParams } from 'react-router-dom';
import { TransmittalDetail } from '@/features/transmittals/components';

export function TransmittalDetailPage() {
  const { projectId, transmittalId } = useParams<{
    projectId: string;
    transmittalId: string;
  }>();

  if (!projectId || !transmittalId) {
    return <div>Project ID and Transmittal ID are required</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <TransmittalDetail
        transmittalId={transmittalId}
        projectId={projectId}
      />
    </div>
  );
}

export default TransmittalDetailPage;
