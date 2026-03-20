import { logger } from './logger';

export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN = 'UNKNOWN'
}

export interface SecureError {
  type: ErrorType;
  message: string;
  userMessage: string;
  statusCode?: number;
  shouldRetry?: boolean;
  context?: Record<string, unknown>;
}

class SecureErrorHandler {
  private static readonly SENSITIVE_KEYWORDS = [
    'password', 'token', 'key', 'secret', 'credential',
    'database', 'internal', 'stack', 'trace', 'path',
    'file', 'directory', 'config', 'environment'
  ];

  private static readonly GENERIC_MESSAGES = {
    [ErrorType.NETWORK]: 'Network connection failed. Please check your internet connection.',
    [ErrorType.AUTHENTICATION]: 'Authentication failed. Please log in again.',
    [ErrorType.AUTHORIZATION]: 'You do not have permission to perform this action.',
    [ErrorType.VALIDATION]: 'Invalid input provided. Please check your data and try again.',
    [ErrorType.RATE_LIMIT]: 'Too many requests. Please wait a moment and try again.',
    [ErrorType.SERVER_ERROR]: 'Server error occurred. Please try again later.',
    [ErrorType.UNKNOWN]: 'An unexpected error occurred. Please try again.'
  };

  static classifyError(error: unknown): ErrorType {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      const stack = error.stack?.toLowerCase() || '';

      if (message.includes('network') || message.includes('fetch') || 
          message.includes('connection') || stack.includes('fetch')) {
        return ErrorType.NETWORK;
      }

      if (message.includes('unauthorized') || message.includes('401') ||
          message.includes('authentication') || message.includes('login')) {
        return ErrorType.AUTHENTICATION;
      }

      if (message.includes('forbidden') || message.includes('403') ||
          message.includes('permission') || message.includes('access denied')) {
        return ErrorType.AUTHORIZATION;
      }

      if (message.includes('validation') || message.includes('invalid') ||
          message.includes('required') || message.includes('format')) {
        return ErrorType.VALIDATION;
      }

      if (message.includes('rate limit') || message.includes('429') ||
          message.includes('too many requests')) {
        return ErrorType.RATE_LIMIT;
      }

      if (message.includes('500') || message.includes('internal') ||
          message.includes('server error')) {
        return ErrorType.SERVER_ERROR;
      }
    }

    return ErrorType.UNKNOWN;
  }

  static sanitizeErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      let message = error.message;

      // Remove sensitive information
      for (const keyword of this.SENSITIVE_KEYWORDS) {
        const regex = new RegExp(`[^\\s]*${keyword}[^\\s]*`, 'gi');
        message = message.replace(regex, '[REDACTED]');
      }

      // Remove file paths
      message = message.replace(/\/[^\/\s]*\/[^\/\s]*/g, '[PATH]');
      message = message.replace(/C:\\[^\\s\\]*/g, '[PATH]');

      // Remove stack traces
      if (message.includes('Stack trace:') || message.includes('at ')) {
        message = message.split('\n')[0];
      }

      // Limit length
      if (message.length > 200) {
        message = message.substring(0, 197) + '...';
      }

      return message;
    }

    return String(error);
  }

  static createUserMessage(errorType: ErrorType, originalError?: unknown): string {
    const baseMessage = this.GENERIC_MESSAGES[errorType];

    // Add specific context for certain error types
    if (errorType === ErrorType.RATE_LIMIT && originalError instanceof Error) {
      const match = originalError.message.match(/(\d+)\s*(seconds?|minutes?|hours?)/i);
      if (match) {
        return `${baseMessage} Try again in ${match[1]} ${match[2]}.`;
      }
    }

    if (errorType === ErrorType.VALIDATION) {
      return `${baseMessage} Please review your input and ensure all required fields are filled correctly.`;
    }

    return baseMessage;
  }

  static shouldRetry(errorType: ErrorType, statusCode?: number): boolean {
    switch (errorType) {
      case ErrorType.NETWORK:
      case ErrorType.RATE_LIMIT:
      case ErrorType.SERVER_ERROR:
        return true;
      case ErrorType.AUTHENTICATION:
      case ErrorType.AUTHORIZATION:
      case ErrorType.VALIDATION:
        return false;
      case ErrorType.UNKNOWN:
        return statusCode ? (statusCode >= 500) : false;
      default:
        return false;
    }
  }

  static createSecureError(error: unknown, context?: Record<string, unknown>): SecureError {
    const errorType = this.classifyError(error);
    const sanitizedMessage = this.sanitizeErrorMessage(error);
    const userMessage = this.createUserMessage(errorType, error);

    const secureError: SecureError = {
      type: errorType,
      message: sanitizedMessage,
      userMessage,
      shouldRetry: this.shouldRetry(errorType),
      context
    };

    // Extract status code if available
    if (error instanceof Error) {
      const statusCodeMatch = error.message.match(/status\s*(code)?\s*:\s*(\d+)/i);
      if (statusCodeMatch) {
        secureError.statusCode = parseInt(statusCodeMatch[2]);
      }
    }

    return secureError;
  }

  static handleError(error: unknown, context?: Record<string, unknown>): SecureError {
    const secureError = this.createSecureError(error, context);

    // Log the full error for debugging (only in development)
    logger.error('Error handled securely', {
      type: secureError.type,
      message: secureError.message,
      userMessage: secureError.userMessage,
      statusCode: secureError.statusCode,
      shouldRetry: secureError.shouldRetry,
      context
    }, error instanceof Error ? error : new Error(String(error)));

    return secureError;
  }

  static isRetryableError(error: SecureError): boolean {
    return Boolean(error.shouldRetry);
  }

  static getRetryDelay(error: SecureError, attempt: number): number {
    switch (error.type) {
      case ErrorType.RATE_LIMIT:
        return Math.min(1000 * Math.pow(2, attempt), 30000); // Exponential backoff, max 30s
      case ErrorType.NETWORK:
        return Math.min(1000 * Math.pow(2, attempt), 10000); // Exponential backoff, max 10s
      case ErrorType.SERVER_ERROR:
        return Math.min(2000 * Math.pow(2, attempt), 60000); // Exponential backoff, max 60s
      default:
        return 0;
    }
  }
}

export const secureErrorHandler = SecureErrorHandler;
