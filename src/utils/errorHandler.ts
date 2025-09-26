import { toast } from '@/hooks/use-toast';

export interface ErrorLogEntry {
  id: string;
  timestamp: Date;
  level: 'error' | 'warn' | 'info';
  message: string;
  source: string;
  userId?: string;
  metadata?: Record<string, any>;
  stack?: string;
}

class ErrorHandler {
  private logs: ErrorLogEntry[] = [];
  private maxLogs = 100;

  log(
    level: 'error' | 'warn' | 'info',
    message: string,
    source: string,
    metadata?: Record<string, any>,
    error?: Error
  ): ErrorLogEntry {
    const entry: ErrorLogEntry = {
      id: Date.now().toString(),
      timestamp: new Date(),
      level,
      message,
      source,
      metadata,
      stack: error?.stack,
    };

    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      const logMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
      logMethod(`[${source}] ${message}`, metadata, error);
    }

    return entry;
  }

  error(message: string, source: string, error?: Error, metadata?: Record<string, any>): void {
    this.log('error', message, source, metadata, error);
    
    // Show user-friendly error toast
    toast({
      title: 'Error',
      description: this.getUserFriendlyMessage(message),
      variant: 'destructive',
    });
  }

  warn(message: string, source: string, metadata?: Record<string, any>): void {
    this.log('warn', message, source, metadata);
  }

  info(message: string, source: string, metadata?: Record<string, any>): void {
    this.log('info', message, source, metadata);
  }

  private getUserFriendlyMessage(message: string): string {
    // Convert technical errors to user-friendly messages
    if (message.includes('network') || message.includes('fetch')) {
      return 'Network connection issue. Please check your internet connection.';
    }
    if (message.includes('auth') || message.includes('unauthorized')) {
      return 'Authentication error. Please sign in again.';
    }
    if (message.includes('upload') || message.includes('storage')) {
      return 'File upload failed. Please try again.';
    }
    if (message.includes('database') || message.includes('supabase')) {
      return 'Database connection issue. Please try again in a moment.';
    }
    
    return 'An error occurred. Please try again.';
  }

  getLogs(): ErrorLogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  // Handle chat-specific errors
  handleChatError(error: Error, context?: Record<string, any>): void {
    this.error(
      error.message || 'Chat error occurred',
      'ChatInterface',
      error,
      context
    );
  }

  // Handle file upload errors
  handleUploadError(error: Error, fileName?: string): void {
    this.error(
      `File upload failed${fileName ? ` for ${fileName}` : ''}`,
      'FileUpload',
      error,
      { fileName }
    );
  }

  // Handle API errors
  handleApiError(error: Error, endpoint: string, requestData?: any): void {
    this.error(
      `API request failed: ${endpoint}`,
      'API',
      error,
      { endpoint, requestData }
    );
  }

  // Handle database errors
  handleDbError(error: Error, operation: string, table?: string): void {
    this.error(
      `Database ${operation} failed${table ? ` on ${table}` : ''}`,
      'Database',
      error,
      { operation, table }
    );
  }
}

export const errorHandler = new ErrorHandler();

// Utility functions for common error patterns
export const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  source: string,
  errorMessage?: string
): Promise<T | null> => {
  try {
    return await operation();
  } catch (error) {
    errorHandler.error(
      errorMessage || 'Operation failed',
      source,
      error instanceof Error ? error : new Error(String(error))
    );
    return null;
  }
};

export const safeAsync = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  source: string,
  errorMessage?: string
) => {
  return async (...args: T): Promise<R | null> => {
    return withErrorHandling(() => fn(...args), source, errorMessage);
  };
};