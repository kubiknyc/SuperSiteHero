/**
 * MobileSettings - Settings page for mobile app
 *
 * Provides access to:
 * - Profile settings
 * - Device mode toggle
 * - Notification preferences
 * - Offline settings
 * - Sign out
 */

import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Bell,
  Smartphone,
  Monitor,
  Moon,
  Sun,
  Wifi,
  WifiOff,
  LogOut,
  ChevronRight,
  Settings,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';
import { useAuth } from '../../lib/auth/AuthContext';
import { useDevice } from '../../lib/device';
import { useTheme } from '../../lib/theme/darkMode';
import { cn } from '../../lib/utils';
import { MobileHelpSheet } from './MobileHelpSheet';

interface SettingsItemProps {
  icon: React.ElementType;
  label: string;
  description?: string;
  onClick?: () => void;
  rightElement?: React.ReactNode;
}

const SettingsItem = memo(function SettingsItem({
  icon: Icon,
  label,
  description,
  onClick,
  rightElement,
}: SettingsItemProps) {
  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 w-full p-4",
        onClick && "hover:bg-muted/50 active:bg-muted transition-colors cursor-pointer"
      )}
    >
      <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-1 text-left">
        <p className="font-medium text-foreground">{label}</p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {rightElement || (onClick && <ChevronRight className="h-5 w-5 text-muted-foreground" />)}
    </Wrapper>
  );
});

export const MobileSettings = memo(function MobileSettings() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { mode, setMode, resetMode, hasOverride } = useDevice();
  const { theme, setTheme } = useTheme();
  const [helpSheetOpen, setHelpSheetOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleSwitchToDesktop = () => {
    setMode('desktop');
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Profile Section */}
      <Card>
        <CardContent className="p-0">
          <SettingsItem
            icon={User}
            label={user?.user_metadata?.full_name || 'Your Profile'}
            description={user?.email}
            onClick={() => navigate('/profile')}
          />
        </CardContent>
      </Card>

      {/* Display Settings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground uppercase">Display</CardTitle>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-border">
          {/* Device Mode */}
          <SettingsItem
            icon={mode === 'mobile' ? Smartphone : Monitor}
            label="App Mode"
            description={mode === 'mobile' ? 'Mobile view' : 'Desktop view'}
            rightElement={
              <Button
                variant="outline"
                size="sm"
                onClick={handleSwitchToDesktop}
              >
                {mode === 'mobile' ? 'Switch to Desktop' : 'Switch to Mobile'}
              </Button>
            }
          />
          {hasOverride && (
            <div className="px-4 py-2 bg-muted/50">
              <button
                onClick={resetMode}
                className="text-sm text-primary hover:underline"
              >
                Reset to auto-detect
              </button>
            </div>
          )}

          {/* Theme */}
          <SettingsItem
            icon={theme === 'dark' ? Moon : Sun}
            label="Dark Mode"
            description={theme === 'dark' ? 'On' : 'Off'}
            rightElement={
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
            }
          />
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground uppercase">Notifications</CardTitle>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-border">
          <SettingsItem
            icon={Bell}
            label="Notification Preferences"
            description="Manage your notifications"
            onClick={() => navigate('/settings/notifications')}
          />
        </CardContent>
      </Card>

      {/* Offline & Sync */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground uppercase">Offline & Sync</CardTitle>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-border">
          <SettingsItem
            icon={Wifi}
            label="Offline Mode"
            description="Data is synced when online"
            rightElement={
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm text-muted-foreground">Synced</span>
              </div>
            }
          />
        </CardContent>
      </Card>

      {/* Support */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground uppercase">Support</CardTitle>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-border">
          <SettingsItem
            icon={HelpCircle}
            label="Help & Support"
            onClick={() => setHelpSheetOpen(true)}
          />
          <SettingsItem
            icon={Shield}
            label="Privacy Policy"
            onClick={() => navigate('/privacy')}
          />
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Card>
        <CardContent className="p-0">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-4 w-full p-4 text-destructive hover:bg-destructive/10 transition-colors"
          >
            <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center">
              <LogOut className="h-5 w-5 text-destructive" />
            </div>
            <span className="font-medium">Sign Out</span>
          </button>
        </CardContent>
      </Card>

      {/* Version */}
      <p className="text-center text-xs text-muted-foreground">
        JobSight Mobile v1.0.0
      </p>

      {/* Help Sheet */}
      <MobileHelpSheet open={helpSheetOpen} onOpenChange={setHelpSheetOpen} />
    </div>
  );
});

export default MobileSettings;
