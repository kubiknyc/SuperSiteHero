/**
 * Client Notification Settings Page
 *
 * Page component for managing client milestone notification preferences.
 * Includes breadcrumb navigation and help text.
 */

import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronRight, Settings, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/card'
import { MilestoneNotificationSettings } from '../components/MilestoneNotificationSettings'
import { useAuth } from '@/contexts/AuthContext'

// ============================================================================
// Component
// ============================================================================

export function ClientNotificationSettingsPage() {
  const { projectId } = useParams<{ projectId?: string }>()
  const { user } = useAuth()

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card>
          <CardContent className="py-12 px-8 text-center">
            <p className="text-secondary">Please log in to manage notification settings.</p>
            <Button asChild className="mt-4">
              <Link to="/login">Log In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-sm text-secondary">
        <Link
          to="/client/dashboard"
          className="hover:text-foreground transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        {projectId && (
          <>
            <ChevronRight className="h-4 w-4" />
            <Link
              to={`/client/projects/${projectId}`}
              className="hover:text-foreground transition-colors"
            >
              Project
            </Link>
          </>
        )}
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Notification Settings
        </span>
      </nav>

      {/* Help Section */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-6">
          <div className="space-y-3">
            <h3 className="font-semibold text-blue-900 flex items-center gap-2 heading-subsection">
              <Settings className="h-5 w-5" />
              About Notification Preferences
            </h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p>
                Customize which project milestone events you'd like to be notified about. You can choose to receive notifications through:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>
                  <strong>Email:</strong> Notifications sent to your email address
                </li>
                <li>
                  <strong>In-App:</strong> Notifications that appear within the application
                </li>
                <li>
                  <strong>SMS & Push:</strong> Coming soon - receive notifications on your mobile device
                </li>
              </ul>
              <p className="mt-3">
                You can enable or disable individual notification types, or choose different delivery methods for each event.
                Your preferences are saved automatically when you click "Save Changes".
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Settings Component */}
      <MilestoneNotificationSettings
        userId={user.id}
        projectId={projectId || null}
      />

      {/* Additional Help */}
      <Card className="border-border">
        <CardContent className="py-6">
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground heading-subsection">Need Help?</h3>
            <p className="text-sm text-secondary">
              If you're not receiving notifications as expected, please check:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-secondary ml-2">
              <li>Your email address is correct in your profile settings</li>
              <li>Email notifications aren't being filtered as spam</li>
              <li>You have enabled at least one notification channel for the event type</li>
              <li>Your browser allows in-app notifications (check browser settings)</li>
            </ul>
            <p className="text-sm text-secondary mt-3">
              For further assistance, please contact your project manager or{' '}
              <a href="mailto:support@example.com" className="text-primary hover:underline">
                support@example.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
