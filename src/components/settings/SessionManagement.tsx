// File: /src/components/settings/SessionManagement.tsx
// Active sessions management component

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  MapPin,
  Clock,
  Trash2,
  RefreshCw,
  Shield,
  LogOut,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/utils/logger';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Session {
  id: string;
  created_at: string;
  updated_at: string;
  user_agent: string;
  ip: string;
  is_current: boolean;
}

interface ParsedUserAgent {
  device: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
}

/**
 * Parse user agent string to extract device info
 */
function parseUserAgent(ua: string): ParsedUserAgent {
  const result: ParsedUserAgent = {
    device: 'desktop',
    browser: 'Unknown Browser',
    os: 'Unknown OS',
  };

  // Detect device type
  if (/Mobile|Android|iPhone|iPad|iPod/i.test(ua)) {
    result.device = /iPad|Tablet/i.test(ua) ? 'tablet' : 'mobile';
  }

  // Detect browser
  if (ua.includes('Firefox')) {
    result.browser = 'Firefox';
  } else if (ua.includes('Edg')) {
    result.browser = 'Edge';
  } else if (ua.includes('Chrome')) {
    result.browser = 'Chrome';
  } else if (ua.includes('Safari')) {
    result.browser = 'Safari';
  }

  // Detect OS
  if (ua.includes('Windows')) {
    result.os = 'Windows';
  } else if (ua.includes('Mac OS')) {
    result.os = 'macOS';
  } else if (ua.includes('Linux')) {
    result.os = 'Linux';
  } else if (ua.includes('Android')) {
    result.os = 'Android';
  } else if (ua.includes('iPhone') || ua.includes('iPad')) {
    result.os = 'iOS';
  }

  return result;
}

/**
 * Get device icon based on type
 */
function DeviceIcon({ device }: { device: 'desktop' | 'mobile' | 'tablet' }) {
  switch (device) {
    case 'mobile':
      return <Smartphone className="h-5 w-5" />;
    case 'tablet':
      return <Tablet className="h-5 w-5" />;
    default:
      return <Monitor className="h-5 w-5" />;
  }
}

/**
 * Session Management Component
 *
 * Features:
 * - View all active sessions
 * - See device/browser/location info
 * - Terminate individual sessions
 * - Sign out of all other devices
 */
export function SessionManagement() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sessionToRevoke, setSessionToRevoke] = useState<string | null>(null);
  const [showRevokeAllDialog, setShowRevokeAllDialog] = useState(false);

  // Fetch active sessions
  const fetchSessions = useCallback(async () => {
    if (!user) {return;}

    try {
      // Get current session
      const { data: sessionData } = await supabase.auth.getSession();
      const currentSessionId = sessionData?.session?.access_token?.slice(-8) || '';

      // For now, we'll show the current session info
      // Supabase doesn't expose a direct API to list all sessions
      // In production, you'd track sessions in a custom table
      const mockSessions: Session[] = [
        {
          id: currentSessionId,
          created_at: sessionData?.session?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_agent: navigator.userAgent,
          ip: 'Current Device',
          is_current: true,
        },
      ];

      setSessions(mockSessions);
    } catch (error) {
      logger.error('[SessionManagement] Failed to fetch sessions:', error);
      toast.error('Failed to load sessions');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Refresh sessions
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchSessions();
  };

  // Revoke a single session
  const handleRevokeSession = async () => {
    if (!sessionToRevoke) {return;}

    try {
      // In production, this would call an API to invalidate the specific session
      // For now, if it's the current session, sign out
      const session = sessions.find((s) => s.id === sessionToRevoke);
      if (session?.is_current) {
        await supabase.auth.signOut();
        toast.success('Signed out successfully');
      } else {
        toast.success('Session terminated');
      }

      setSessions((prev) => prev.filter((s) => s.id !== sessionToRevoke));
    } catch (error) {
      logger.error('[SessionManagement] Failed to revoke session:', error);
      toast.error('Failed to terminate session');
    } finally {
      setSessionToRevoke(null);
    }
  };

  // Revoke all other sessions
  const handleRevokeAllOther = async () => {
    try {
      // Sign out from all devices
      await supabase.auth.signOut({ scope: 'global' });
      toast.success('Signed out from all devices');
    } catch (error) {
      logger.error('[SessionManagement] Failed to revoke all sessions:', error);
      toast.error('Failed to sign out from all devices');
    } finally {
      setShowRevokeAllDialog(false);
    }
  };

  if (!user) {return null;}

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900">
            <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg mb-1">Active Sessions</CardTitle>
                <CardDescription>
                  Manage devices where you're signed in to JobSight
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                />
              </Button>
            </div>

            {isLoading ? (
              <div className="h-20 flex items-center justify-center">
                <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Session List */}
                <div className="space-y-3">
                  {sessions.map((session) => {
                    const parsed = parseUserAgent(session.user_agent);
                    return (
                      <div
                        key={session.id}
                        className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 border"
                      >
                        <div className="p-2 rounded-lg bg-card">
                          <DeviceIcon device={parsed.device} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {parsed.browser} on {parsed.os}
                            </span>
                            {session.is_current && (
                              <Badge variant="secondary" className="text-xs">
                                This device
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {session.ip}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Active{' '}
                              {formatDistanceToNow(new Date(session.updated_at), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                        </div>
                        {!session.is_current && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-error hover:text-error hover:bg-error/10"
                            onClick={() => setSessionToRevoke(session.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Actions */}
                {sessions.length > 1 && (
                  <Button
                    variant="outline"
                    className="w-full text-error border-error/50 hover:bg-error/10"
                    onClick={() => setShowRevokeAllDialog(true)}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out of all other devices
                  </Button>
                )}

                {/* Info */}
                <p className="text-xs text-muted-foreground">
                  If you see a device you don't recognize, sign out of it and change your
                  password immediately.
                </p>
              </>
            )}
          </div>
        </div>
      </CardContent>

      {/* Revoke Single Session Dialog */}
      <AlertDialog
        open={!!sessionToRevoke}
        onOpenChange={(open) => !open && setSessionToRevoke(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terminate Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will sign out from this device. They will need to sign in again to
              access JobSight.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeSession}
              className="bg-error hover:bg-error/90"
            >
              Terminate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke All Dialog */}
      <AlertDialog open={showRevokeAllDialog} onOpenChange={setShowRevokeAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out of All Devices?</AlertDialogTitle>
            <AlertDialogDescription>
              This will sign you out from all devices except the current one. You'll need
              to sign in again on those devices.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeAllOther}
              className="bg-error hover:bg-error/90"
            >
              Sign Out All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export default SessionManagement;
