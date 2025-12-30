/**
 * DocuSign Integration Page
 *
 * Settings page for managing DocuSign e-signature integration,
 * viewing dashboard and envelope activity.
 */

import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DocuSignConnectionSettings } from '@/features/docusign/components/DocuSignConnectionSettings';
import { DocuSignDashboard } from '@/features/docusign/components/DocuSignDashboard';
import { useDocuSignConnectionStatus } from '@/features/docusign/hooks/useDocuSign';
import {
  FileSignature,
  Settings,
  BarChart3,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Clock,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

function ConnectionStatusBanner() {
  const { data: status, isLoading, error, refetch } = useDocuSignConnectionStatus();

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mb-6 border-destructive/50 bg-destructive/5">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-destructive/10">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="font-medium text-destructive">Connection Error</p>
                <p className="text-sm text-muted-foreground">
                  Unable to check DocuSign connection status
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isConnected = status?.isConnected;
  const lastSync = status?.lastConnectedAt;

  return (
    <Card className={cn(
      'mb-6',
      isConnected ? 'border-success/50 bg-success/5' : 'border-warning/50 bg-warning/5'
    )}>
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-full',
              isConnected ? 'bg-success/10' : 'bg-warning/10'
            )}>
              {isConnected ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : (
                <XCircle className="h-5 w-5 text-warning" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className={cn(
                  'font-medium',
                  isConnected ? 'text-success' : 'text-warning'
                )}>
                  {isConnected ? 'Connected to DocuSign' : 'Not Connected'}
                </p>
                {isConnected && (
                  <Badge variant="outline" className="text-xs">
                    {status?.accountName || 'Production'}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {isConnected && lastSync ? (
                  <>
                    <Clock className="inline h-3 w-3 mr-1" />
                    Last synced {formatDistanceToNow(new Date(lastSync), { addSuffix: true })}
                  </>
                ) : (
                  'Connect your DocuSign account to enable e-signatures'
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isConnected && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={() => refetch()}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh connection status</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <Button
              variant={isConnected ? 'outline' : 'default'}
              size="sm"
              asChild
            >
              <a
                href="https://account.docusign.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                DocuSign Portal
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickStartGuide() {
  return (
    <Card className="mb-6 border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <HelpCircle className="h-4 w-4" />
          Quick Start Guide
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
              1
            </div>
            <div>
              <p className="font-medium text-sm">Connect Account</p>
              <p className="text-xs text-muted-foreground">
                Link your DocuSign account in Settings tab
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
              2
            </div>
            <div>
              <p className="font-medium text-sm">Send Documents</p>
              <p className="text-xs text-muted-foreground">
                Use "Send for Signature" on any document
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
              3
            </div>
            <div>
              <p className="font-medium text-sm">Track Status</p>
              <p className="text-xs text-muted-foreground">
                Monitor signatures in the Dashboard
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DocuSignIntegrationPage() {
  const navigate = useNavigate();
  const { data: status, isLoading } = useDocuSignConnectionStatus();

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground heading-page flex items-center gap-2">
                <FileSignature className="h-6 w-6 text-primary" />
                DocuSign Integration
              </h1>
              {!isLoading && (
                <Badge variant={status?.isConnected ? 'default' : 'secondary'}>
                  {status?.isConnected ? 'Active' : 'Inactive'}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              Manage electronic signature workflows for construction documents
            </p>
          </div>
        </div>

        {/* Connection Status Banner */}
        <ConnectionStatusBanner />

        {/* Quick Start Guide - show only when not connected */}
        {!isLoading && !status?.isConnected && <QuickStartGuide />}

        {/* Main Tabs */}
        <Tabs defaultValue={status?.isConnected ? 'dashboard' : 'settings'}>
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

        {/* Footer Help */}
        <Card className="mt-6 bg-muted/50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileSignature className="h-4 w-4" />
                <span>
                  DocuSign integration enables legally binding e-signatures on payment applications,
                  change orders, and lien waivers.
                </span>
              </div>
              <Button variant="link" size="sm" asChild>
                <a
                  href="https://support.docusign.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Need Help?
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

export default DocuSignIntegrationPage;
