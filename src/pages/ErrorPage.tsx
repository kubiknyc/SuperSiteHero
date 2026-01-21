/**
 * 500 Server Error Page
 * Displays when an unexpected error occurs in the application
 */

import { useNavigate, useRouteError } from 'react-router-dom';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/button';
import { Home, RefreshCw, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

interface ErrorPageProps {
  error?: Error;
  resetError?: () => void;
}

function ErrorId() {
  const [errorId] = useState(() => Date.now().toString(36).toUpperCase());
  return (
    <p className="text-caption text-disabled dark:text-secondary mt-1">
      Error ID: {errorId}
    </p>
  );
}

export function ErrorPage({ error: propError, resetError }: ErrorPageProps) {
  const navigate = useNavigate();
  const routeError = useRouteError() as Error | undefined;
  const error = propError || routeError;

  const handleRefresh = () => {
    if (resetError) {
      resetError();
    } else {
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    if (resetError) {
      resetError();
    }
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-card dark:from-background dark:to-muted/30 flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo size="xl" showText={false} variant="icon-only" />
        </div>

        {/* Error Code */}
        <h1 className="heading-error-code text-warning mb-4 heading-page">
          500
        </h1>

        {/* Error Title */}
        <h2 className="heading-page text-foreground dark:text-white mb-4 heading-section">
          Something Went Wrong
        </h2>

        {/* Error Description */}
        <p className="body-large text-secondary dark:text-disabled mb-8">
          We encountered an unexpected error. Our team has been notified and is working on a fix.
          Please try refreshing the page or returning to the dashboard.
        </p>

        {/* Error Details (Development Only) */}
        {import.meta.env.DEV && error && (
          <div className="mb-8 p-4 bg-error-light dark:bg-error/10 border border-error dark:border-error/30 rounded-lg text-left">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-error dark:text-error mt-1 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-error-dark dark:text-error mb-2">
                  Error Details (Development Mode):
                </p>
                <p className="text-sm text-error-dark dark:text-error/80 font-mono mb-2 break-words">
                  {error.message}
                </p>
                {error.stack && (
                  <details className="mt-2">
                    <summary className="text-xs text-error-dark dark:text-error/70 cursor-pointer hover:underline">
                      Stack Trace
                    </summary>
                    <pre className="mt-2 text-xs text-error-dark dark:text-error/70 overflow-x-auto whitespace-pre-wrap break-words">
                      {error.stack}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="lg"
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Page
          </Button>

          <Button
            onClick={handleGoHome}
            size="lg"
            className="gap-2 bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/80"
          >
            <Home className="w-4 h-4" />
            Go to Dashboard
          </Button>
        </div>

        {/* Help Section */}
        <div className="mt-12 p-6 bg-surface dark:bg-surface/50 border border-border dark:border-border rounded-lg">
          <h3 className="heading-sub text-foreground dark:text-white mb-3 heading-subsection">
            Still having issues?
          </h3>
          <p className="body-small text-secondary dark:text-disabled mb-4">
            If the problem persists, please contact our support team. We're here to help!
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center text-sm">
            <a
              href="mailto:support@jobsightapp.com"
              className="text-primary dark:text-primary-400 hover:underline font-medium"
            >
              support@jobsightapp.com
            </a>
            <span className="hidden sm:inline text-muted-foreground">•</span>
            <button
              onClick={() => navigate('/help')}
              className="text-primary dark:text-primary-400 hover:underline font-medium"
            >
              Visit Help Center
            </button>
            <span className="hidden sm:inline text-muted-foreground">•</span>
            <button
              onClick={() => navigate('/settings/feedback')}
              className="text-primary dark:text-primary-400 hover:underline font-medium"
            >
              Send Feedback
            </button>
          </div>
        </div>

        {/* What to Try */}
        <div className="mt-8 text-left">
          <h4 className="text-label text-secondary dark:text-muted-foreground mb-3 heading-card">
            What you can try:
          </h4>
          <ul className="space-y-2 body-small text-secondary dark:text-disabled">
            <li className="flex items-start gap-2">
              <span className="text-primary dark:text-primary-400 mt-0.5">•</span>
              <span>Refresh the page and try again</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary dark:text-primary-400 mt-0.5">•</span>
              <span>Clear your browser cache and cookies</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary dark:text-primary-400 mt-0.5">•</span>
              <span>Check your internet connection</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary dark:text-primary-400 mt-0.5">•</span>
              <span>Try accessing JobSight from a different browser</span>
            </li>
          </ul>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-border dark:border-border">
          <p className="text-caption text-disabled dark:text-secondary">
            <span className="font-semibold text-primary dark:text-primary-400">JobSight</span> - Construction Field Management
          </p>
          <ErrorId />
        </div>
      </div>
    </div>
  );
}

export default ErrorPage;
