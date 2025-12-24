/**
 * 404 Not Found Error Page
 * Displays when a user navigates to a non-existent route
 */

import { useNavigate } from 'react-router-dom';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft, Search } from 'lucide-react';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo size="xl" showText={false} variant="icon-only" />
        </div>

        {/* Error Code */}
        <h1 className="heading-error-code text-orange-500 mb-4" className="heading-page">
          404
        </h1>

        {/* Error Title */}
        <h2 className="heading-page text-foreground dark:text-white mb-4" className="heading-section">
          Page Not Found
        </h2>

        {/* Error Description */}
        <p className="body-large text-secondary dark:text-disabled mb-8">
          The page you're looking for doesn't exist in JobSight.
          It may have been moved, deleted, or the URL might be incorrect.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            size="lg"
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>

          <Button
            onClick={() => navigate('/')}
            size="lg"
            className="gap-2 bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/80"
          >
            <Home className="w-4 h-4" />
            Return to Dashboard
          </Button>
        </div>

        {/* Search Suggestion */}
        <div className="mt-12 p-4 bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700 rounded-lg">
          <div className="flex items-start gap-3">
            <Search className="w-5 h-5 text-primary dark:text-primary-400 mt-0.5 flex-shrink-0" />
            <div className="text-left">
              <p className="body-small font-medium text-primary-900 dark:text-primary-200 mb-1">
                Looking for something specific?
              </p>
              <p className="body-small text-primary-700 dark:text-primary-300">
                Try using the search feature or navigation menu to find what you need.
              </p>
            </div>
          </div>
        </div>

        {/* Helpful Links */}
        <div className="mt-8 body-small text-muted dark:text-disabled">
          <p className="mb-2">Quick links:</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => navigate('/projects')}
              className="text-primary dark:text-primary-400 hover:underline"
            >
              Projects
            </button>
            <button
              onClick={() => navigate('/daily-reports')}
              className="text-primary dark:text-primary-400 hover:underline"
            >
              Daily Reports
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="text-primary dark:text-primary-400 hover:underline"
            >
              Settings
            </button>
            <button
              onClick={() => navigate('/help')}
              className="text-primary dark:text-primary-400 hover:underline"
            >
              Help Center
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-border dark:border-gray-700">
          <p className="text-caption text-disabled dark:text-secondary">
            <span className="font-semibold text-primary dark:text-primary-400">JobSight</span> - Construction Field Management
          </p>
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;
