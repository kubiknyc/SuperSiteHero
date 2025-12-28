/**
 * DocuSign Integration Page
 *
 * Settings page for managing DocuSign e-signature integration,
 * viewing dashboard and envelope activity.
 */

import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocuSignConnectionSettings } from '@/features/docusign/components/DocuSignConnectionSettings';
import { DocuSignDashboard } from '@/features/docusign/components/DocuSignDashboard';
import {
  FileSignature,
  Settings,
  BarChart3,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function DocuSignIntegrationPage() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground heading-page flex items-center gap-2">
              <FileSignature className="h-6 w-6 text-primary" />
              DocuSign Integration
            </h1>
            <p className="text-muted mt-1">
              Manage electronic signature workflows for construction documents
            </p>
          </div>
        </div>

        <Tabs defaultValue="dashboard">
          <TabsList className="mb-6">
            <TabsTrigger value="dashboard" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Connection Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <DocuSignDashboard />
          </TabsContent>

          <TabsContent value="settings">
            <DocuSignConnectionSettings />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

export default DocuSignIntegrationPage;
