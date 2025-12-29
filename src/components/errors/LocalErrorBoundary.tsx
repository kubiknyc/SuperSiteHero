/**
 * LocalErrorBoundary - Lightweight error boundary for specific UI sections
 * Use this to wrap components that might fail (charts, complex renders)
 * without crashing the entire page
 */

import { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { logger } from '@/lib/utils/logger';

interface LocalErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback UI to render on error */
  fallback?: ReactNode;
  /** Callback when error occurs */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Title to show in default error UI */
  title?: string;
  /** Description to show in default error UI */
  description?: string;
  /** Whether to show the retry button */
  showRetry?: boolean;
  /** Custom className for the error container */
  className?: string;
}

interface LocalErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class LocalErrorBoundary extends Component<LocalErrorBoundaryProps, LocalErrorBoundaryState> {
  constructor(props: LocalErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): LocalErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('LocalErrorBoundary caught error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    const {
      children,
      fallback,
      title = 'Unable to load this section',
      description = 'Something went wrong while loading this content.',
      showRetry = true,
      className = '',
    } = this.props;

    if (this.state.hasError) {
      // Custom fallback provided
      if (fallback) {
        return fallback;
      }

      // Default compact error UI
      return (
        <Card className={`border-destructive/50 bg-destructive/5 ${className}`}>
          <CardContent className="py-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="p-2 rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <h3 className="font-medium text-sm text-destructive">{title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
              </div>
              {showRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={this.handleRetry}
                  className="mt-2"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Try Again
                </Button>
              )}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-2 text-xs text-left w-full">
                  <summary className="cursor-pointer text-muted-foreground">
                    Error details
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                    {this.state.error.message}
                    {'\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    return children;
  }
}

export default LocalErrorBoundary;
