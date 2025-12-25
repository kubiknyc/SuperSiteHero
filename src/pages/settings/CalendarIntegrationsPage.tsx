/**
 * Calendar Integrations Settings Page
 *
 * Allows users to manage Google Calendar and Outlook Calendar connections.
 * Handles OAuth callbacks from calendar providers.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Calendar, RefreshCw, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { CalendarConnectionCard } from '@/features/calendar/components/CalendarConnectionCard';
import { OutlookCalendarConnect } from '@/features/calendar/components/OutlookCalendarConnect';
import { useCompleteGCalConnection, useGCalConnectionStatus } from '@/features/calendar/hooks/useGoogleCalendar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import toast from 'react-hot-toast';

export function CalendarIntegrationsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>('google');
  const [oauthStatus, setOauthStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [oauthError, setOauthError] = useState<string | null>(null);

  const completeGCalConnection = useCompleteGCalConnection();
  const { refetch: refetchGCalStatus } = useGCalConnectionStatus();

  // Handle OAuth callback from Google Calendar
  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (code && state) {
      try {
        // Decode state to determine which provider this is for
        const stateData = JSON.parse(atob(state));

        if (stateData.nonce && stateData.companyId && stateData.userId) {
          // This is a Google Calendar OAuth callback
          setOauthStatus('processing');
          setActiveTab('google');

          // Clean URL
          window.history.replaceState({}, '', window.location.pathname);

          completeGCalConnection.mutate(
            { code, state },
            {
              onSuccess: () => {
                setOauthStatus('success');
                toast.success('Google Calendar connected successfully!');
                refetchGCalStatus();
              },
              onError: (error) => {
                setOauthStatus('error');
                setOauthError(error instanceof Error ? error.message : 'Failed to connect Google Calendar');
                toast.error('Failed to connect Google Calendar');
              },
            }
          );
        }
      } catch {
        // Not a Google Calendar callback - might be Outlook
        // The OutlookCalendarConnect component handles its own callback
      }
    }
  }, [searchParams]);

  return (
    <AppLayout>
      <div className="container max-w-4xl py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/settings')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold heading-page">Calendar Integrations</h1>
            <p className="text-muted-foreground">
              Connect your calendars to sync meetings and events automatically
            </p>
          </div>
        </div>

        {/* OAuth Status Alert */}
        {oauthStatus === 'processing' && (
          <Alert>
            <RefreshCw className="h-4 w-4 animate-spin" />
            <AlertTitle>Connecting...</AlertTitle>
            <AlertDescription>
              Please wait while we complete your calendar connection.
            </AlertDescription>
          </Alert>
        )}

        {oauthStatus === 'success' && (
          <Alert className="bg-success-light border-green-200">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <AlertTitle className="text-green-800">Connected!</AlertTitle>
            <AlertDescription className="text-success-dark">
              Your calendar has been connected successfully. You can now configure sync settings below.
            </AlertDescription>
          </Alert>
        )}

        {oauthStatus === 'error' && oauthError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Connection Failed</AlertTitle>
            <AlertDescription>
              {oauthError}. Please try again or contact support if the problem persists.
            </AlertDescription>
          </Alert>
        )}

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h3 className="font-medium text-blue-900 heading-subsection">About Calendar Integration</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>- Automatically sync meetings to your calendar</li>
                  <li>- Import calendar events as project meetings</li>
                  <li>- Send calendar invites to meeting attendees</li>
                  <li>- Real-time sync with push notifications</li>
                  <li>- Bidirectional sync keeps both calendars up to date</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Provider Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="google" className="flex items-center gap-2">
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
                />
              </svg>
              Google Calendar
            </TabsTrigger>
            <TabsTrigger value="outlook" className="flex items-center gap-2">
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.31.77.1.43.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H7.13q-.46 0-.8-.33-.32-.33-.32-.8V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7Q.58 6 1 6h6.5V2.55q0-.44.3-.75.3-.3.75-.3h12.9q.44 0 .75.3.3.3.3.75V12zm-6-8.25v3h3v-3zm0 4.5v3h3v-3zm0 4.5v1.83l3.05-1.83zm-5.25-9v3h3.75v-3zm0 4.5v3h3.75v-3zm0 4.5v2.03l2.41 1.5 1.34-.8v-2.73zM9 3.75V6h2l.13.01.12.04v-2.3zM5.98 15.98q.9 0 1.6-.3.7-.32 1.19-.86.48-.55.73-1.28.25-.74.25-1.61 0-.83-.25-1.55-.24-.71-.71-1.24t-1.15-.83q-.68-.3-1.55-.3-.92 0-1.64.3-.71.3-1.2.85-.5.54-.75 1.3-.25.74-.25 1.63 0 .85.26 1.56.26.72.74 1.23.48.52 1.17.81.69.3 1.56.3zM7.5 21h12.39L12 16.08V17q0 .41-.3.7-.29.3-.7.3H7.5zm15-.13v-7.24l-5.9 3.54Z"
                />
              </svg>
              Outlook Calendar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="google" className="mt-6">
            <CalendarConnectionCard
              onConnectionChange={() => {
                setOauthStatus('idle');
                setOauthError(null);
              }}
            />
          </TabsContent>

          <TabsContent value="outlook" className="mt-6">
            <OutlookCalendarConnect />
          </TabsContent>
        </Tabs>

        {/* Sync Configuration Tips */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sync Configuration Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg bg-muted">
                <h4 className="font-medium mb-2 heading-card">Two-way Sync</h4>
                <p className="text-sm text-muted-foreground">
                  Changes in either system automatically update the other. Best for keeping both calendars in sync.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <h4 className="font-medium mb-2 heading-card">App to Calendar</h4>
                <p className="text-sm text-muted-foreground">
                  Meetings created here appear in your calendar. Calendar changes do not sync back.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <h4 className="font-medium mb-2 heading-card">Calendar to App</h4>
                <p className="text-sm text-muted-foreground">
                  Import events from your calendar. Changes made here do not sync to your calendar.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

export default CalendarIntegrationsPage;
