import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PhotoTemplateManager from '@/features/photos/components/PhotoTemplateManager';

export default function PhotoTemplatesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  if (!projectId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">No project selected</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Photo Progress Templates</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage location-based photo templates for progress tracking
          </p>
        </div>
      </div>

      <PhotoTemplateManager projectId={projectId} />
    </div>
  );
}
