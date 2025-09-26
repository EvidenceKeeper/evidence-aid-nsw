import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: Date.now().toString(),
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to centralized error handling
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: '',
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <CardTitle className="text-xl">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription>
                  An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
                </AlertDescription>
              </Alert>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                  <strong>Error ID:</strong> {this.state.errorId}<br />
                  <strong>Message:</strong> {this.state.error.message}
                </div>
              )}
              
              <div className="flex gap-2">
                <Button
                  onClick={this.handleRetry}
                  variant="default"
                  className="flex-1"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="flex-1"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Specialized error boundaries for different sections
export function ChatErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex items-center justify-center h-64 bg-muted/50 rounded-lg">
          <div className="text-center space-y-2">
            <AlertTriangle className="w-8 h-8 text-destructive mx-auto" />
            <p className="text-sm text-muted-foreground">Chat temporarily unavailable</p>
            <Button size="sm" onClick={() => window.location.reload()}>
              Refresh Chat
            </Button>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export function EvidenceErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex items-center justify-center h-64 bg-muted/50 rounded-lg">
          <div className="text-center space-y-2">
            <AlertTriangle className="w-8 h-8 text-destructive mx-auto" />
            <p className="text-sm text-muted-foreground">Evidence section temporarily unavailable</p>
            <Button size="sm" onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}