import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home, Bug } from 'lucide-react';
import { logger } from '../utils/logger';
import { secureErrorHandler, SecureError } from '../utils/secureErrorHandler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: SecureError, errorInfo: ErrorInfo) => void;
  isolate?: boolean; // Prevent error bubbling
  retryLimit?: number;
}

interface State {
  hasError: boolean;
  error: SecureError | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  componentStack: string;
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  private retryTimeouts: NodeJS.Timeout[] = [];

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      componentStack: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      componentStack: error.stack || ''
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const secureError = secureErrorHandler.handleError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: 'EnhancedErrorBoundary',
      timestamp: Date.now()
    });

    this.setState({
      error: secureError,
      errorInfo
    });

    // Log the full error for debugging
    logger.error('Error boundary caught an error', {
      errorType: secureError.type,
      userMessage: secureError.userMessage,
      componentStack: errorInfo.componentStack,
      shouldRetry: secureError.shouldRetry
    }, error);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(secureError, errorInfo);
    }

    // Report to error tracking service (in production)
    if (import.meta.env.PROD) {
      this.reportError(secureError, errorInfo);
    }
  }

  componentWillUnmount() {
    // Clear any pending retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
  }

  private reportError = (error: SecureError, errorInfo: ErrorInfo) => {
    // In production, you would send this to an error tracking service
    // like Sentry, Bugsnag, or a custom endpoint
    try {
      // Example: Send to error tracking service
      fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: {
            type: error.type,
            message: error.message,
            userMessage: error.userMessage,
            statusCode: error.statusCode,
            shouldRetry: error.shouldRetry,
            context: error.context
          },
          errorInfo: {
            componentStack: errorInfo.componentStack,
            errorBoundary: 'EnhancedErrorBoundary'
          },
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: Date.now()
        })
      }).catch(reportError => {
        logger.error('Failed to report error', { reportError });
      });
    } catch (reportingError) {
      logger.error('Error reporting failed', { reportingError });
    }
  };

  private handleRetry = () => {
    const { retryCount } = this.state;
    const { retryLimit = 3 } = this.props;

    if (retryCount < retryLimit) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }));

      logger.info('Error boundary retry attempted', {
        retryCount: retryCount + 1,
        retryLimit
      });
    }
  };

  private handleAutoRetry = () => {
    const { error, retryCount } = this.state;
    const { retryLimit = 3 } = this.props;

    if (error && secureErrorHandler.isRetryableError(error) && retryCount < retryLimit) {
      const delay = secureErrorHandler.getRetryDelay(error, retryCount);
      
      const timeout = setTimeout(() => {
        this.handleRetry();
      }, delay);

      this.retryTimeouts.push(timeout);

      logger.info('Error boundary auto-retry scheduled', {
        delay,
        retryCount: retryCount + 1,
        errorType: error.type
      });
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private toggleDetails = () => {
    // This could be implemented to show/hide error details
    logger.info('Error details toggled');
  };

  componentDidMount() {
    // Auto-retry for retryable errors
    if (this.state.error && this.state.hasError) {
      this.handleAutoRetry();
    }
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    // Auto-retry when error changes
    if (this.state.error && this.state.hasError && 
        (!prevState.error || prevState.error.type !== this.state.error.type)) {
      this.handleAutoRetry();
    }
  }

  render() {
    const { hasError, error, retryCount } = this.state;
    const { children, fallback, retryLimit = 3 } = this.props;

    if (hasError && error) {
      // Custom fallback component
      if (fallback) {
        return fallback;
      }

      const canRetry = error.shouldRetry && retryCount < retryLimit;
      const isRetrying = retryCount > 0;

      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            {/* Error Icon */}
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>

            {/* Error Title */}
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Something went wrong
            </h1>

            {/* User-friendly error message */}
            <p className="text-gray-600 mb-6 leading-relaxed">
              {error.userMessage}
            </p>

            {/* Retry Status */}
            {isRetrying && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-center text-blue-600">
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  <span className="text-sm">
                    Retrying... ({retryCount}/{retryLimit})
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {canRetry && !isRetrying && (
                <button
                  onClick={this.handleRetry}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Try Again
                </button>
              )}

              <button
                onClick={this.handleReload}
                className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Reload Page
              </button>

              <button
                onClick={this.handleGoHome}
                className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Go to Homepage
              </button>
            </div>

            {/* Error Details (Development Only) */}
            {import.meta.env.DEV && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 flex items-center">
                  <Bug className="w-4 h-4 mr-2" />
                  Error Details
                </summary>
                <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-gray-700">
                  <div className="mb-2">
                    <strong>Type:</strong> {error.type}
                  </div>
                  <div className="mb-2">
                    <strong>Message:</strong> {error.message}
                  </div>
                  {error.statusCode && (
                    <div className="mb-2">
                      <strong>Status:</strong> {error.statusCode}
                    </div>
                  )}
                  {this.state.errorInfo && (
                    <div className="mb-2">
                      <strong>Component Stack:</strong>
                      <pre className="whitespace-pre-wrap mt-1">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Support Info */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                If this problem persists, please contact support
              </p>
              <button
                onClick={this.toggleDetails}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 focus:outline-none focus:underline"
              >
                Report this issue
              </button>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

// HOC for easy error boundary wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <EnhancedErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </EnhancedErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}
