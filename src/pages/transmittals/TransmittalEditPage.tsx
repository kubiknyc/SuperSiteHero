/**
 * TransmittalEditPage
 * Page for editing an existing transmittal
 */

import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TransmittalForm } from '@/features/transmittals/components';
import { useTransmittal } from '@/features/transmittals/hooks/useTransmittals';
import type { Transmittal } from '@/types/transmittal';

export function TransmittalEditPage() {
  const { projectId, transmittalId } = useParams<{
    projectId: string;
    transmittalId: string;
  }>();
  const navigate = useNavigate();
  const { data: transmittal, isLoading, error } = useTransmittal(transmittalId || '');

  if (!projectId || !transmittalId) {
    return <div>Project ID and Transmittal ID are required</div>;
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !transmittal) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h3 className="text-lg font-medium mb-2 heading-subsection">Transmittal Not Found</h3>
            <p className="text-muted-foreground mb-4">
              The transmittal you're trying to edit doesn't exist or you don't have access.
            </p>
            <Button asChild>
              <Link to={`/projects/${projectId}/transmittals`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Transmittals
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (transmittal.status !== 'draft') {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-warning mb-4" />
            <h3 className="text-lg font-medium mb-2 heading-subsection">Cannot Edit Transmittal</h3>
            <p className="text-muted-foreground mb-4">
              Only draft transmittals can be edited. This transmittal has already been sent.
            </p>
            <Button asChild>
              <Link to={`/projects/${projectId}/transmittals/${transmittalId}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                View Transmittal
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSuccess = (updated: Transmittal) => {
    navigate(`/projects/${projectId}/transmittals/${updated.id}`);
  };

  const handleCancel = () => {
    navigate(`/projects/${projectId}/transmittals/${transmittalId}`);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/projects/${projectId}/transmittals/${transmittalId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold heading-page">Edit {transmittal.transmittal_number}</h1>
      </div>

      <TransmittalForm
        projectId={projectId}
        transmittal={transmittal}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
}

export default TransmittalEditPage;
