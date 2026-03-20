/**
 * @fileoverview Security utility functions for Crop Health AI
 * Provides centralized security functions including validation, sanitization, and protection
 * @author Crop Health AI Team
 * @version 1.0.0
 * @since 2024-03-20
 */

import { InputSanitizer } from './inputSanitizer';
import { csrfProtection } from './csrfProtection';
import { rateLimiter } from './rateLimiter';
import { secureErrorHandler } from './secureErrorHandler';
import { logger } from './logger';

/**
 * Security configuration options
 * @interface SecurityConfig
 */
export interface SecurityConfig {
  /** Enable CSRF protection */
  enableCSRF: boolean;
  /** Enable rate limiting */
  enableRateLimit: boolean;
  /** Enable input sanitization */
  enableSanitization: boolean;
  /** Maximum allowed file size in bytes */
  maxFileSize: number;
  /** Allowed file MIME types */
  allowedMimeTypes: string[];
  /** Session timeout in milliseconds */
  sessionTimeout: number;
}

/**
 * Default security configuration
 * @constant {SecurityConfig}
 */
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  enableCSRF: true,
  enableRateLimit: true,
  enableSanitization: true,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
};

/**
 * Centralized security utilities class
 * @class SecurityUtils
 */
export class SecurityUtils {
  private static config: SecurityConfig = DEFAULT_SECURITY_CONFIG;

  /**
   * Configure security settings
   * @param {Partial<SecurityConfig>} config - Security configuration options
   * @returns {void}
   * @example
   * SecurityUtils.configure({
   *   maxFileSize: 5 * 1024 * 1024,
   *   allowedMimeTypes: ['image/jpeg', 'image/png']
   * });
   */
  static configure(config: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Security configuration updated', { config: this.config });
  }

  /**
   * Get current security configuration
   * @returns {SecurityConfig} Current security settings
   */
  static getConfig(): SecurityConfig {
    return { ...this.config };
  }

  /**
   * Validate and sanitize user input
   * @param {string} input - Raw user input
   * @param {string} type - Input type for validation rules
   * @returns {string} Sanitized input
   * @throws {Error} If input validation fails
   * @example
   * const cleanInput = SecurityUtils.sanitizeInput(userInput, 'text');
   */
  static sanitizeInput(input: string, type: 'text' | 'email' | 'url' | 'html' = 'text'): string {
    if (!this.config.enableSanitization) {
      return input;
    }

    try {
      switch (type) {
        case 'email':
          return InputSanitizer.sanitizeEmail(input);
        case 'url':
          return InputSanitizer.sanitizeUrl(input);
        case 'html':
          return InputSanitizer.sanitizeHtml(input);
        default:
          return InputSanitizer.sanitizeTextInput(input);
      }
    } catch (error) {
      const secureError = secureErrorHandler.handleError(error, { input, type });
      throw new Error(secureError.userMessage);
    }
  }

  /**
   * Validate uploaded file
   * @param {File} file - File to validate
   * @returns {boolean} True if file is valid
   * @example
   * if (SecurityUtils.validateFile(uploadFile)) {
   *   // Process file
   * }
   */
  static validateFile(file: File): boolean {
    const validation = InputSanitizer.validateImageFile(file);
    
    if (!validation.valid) {
      logger.warn('File validation failed', {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        error: validation.error
      });
      return false;
    }

    return true;
  }

  /**
   * Check if user can make API request (rate limiting)
   * @param {string} endpoint - API endpoint identifier
   * @param {string} userId - User identifier
   * @returns {boolean} True if request is allowed
   * @example
   * if (SecurityUtils.canMakeRequest('GEMINI_API', userId)) {
   *   // Make API call
   * }
   */
  static canMakeRequest(endpoint: string, userId: string = 'default'): boolean {
    if (!this.config.enableRateLimit) {
      return true;
    }

    const canProceed = rateLimiter.canMakeRequest(endpoint as any, userId);
    
    if (!canProceed) {
      const remaining = rateLimiter.getRemainingRequests(endpoint as any, userId);
      const resetTime = rateLimiter.getResetTime(endpoint as any, userId);
      
      logger.warn('Rate limit exceeded', {
        endpoint,
        userId,
        remaining,
        resetTime: new Date(resetTime!).toISOString()
      });
    }

    return canProceed;
  }

  /**
   * Get rate limit information
   * @param {string} endpoint - API endpoint identifier
   * @param {string} userId - User identifier
   * @returns {Object} Rate limit details
   * @example
   * const rateInfo = SecurityUtils.getRateLimitInfo('GEMINI_API', userId);
   * console.log(`Remaining requests: ${rateInfo.remaining}`);
   */
  static getRateLimitInfo(endpoint: string, userId: string = 'default') {
    if (!this.config.enableRateLimit) {
      return { remaining: Infinity, resetTime: null, maxRequests: Infinity };
    }

    return {
      remaining: rateLimiter.getRemainingRequests(endpoint as any, userId),
      resetTime: rateLimiter.getResetTime(endpoint as any, userId),
      maxRequests: 60 // This should match the rate limiter configuration
    };
  }

  /**
   * Add CSRF token to request headers
   * @param {Record<string, string>} headers - Existing request headers
   * @returns {Record<string, string>} Headers with CSRF token
   * @example
   * const headers = SecurityUtils.addCSRFToken({ 'Content-Type': 'application/json' });
   * fetch('/api/data', { headers });
   */
  static addCSRFToken(headers: Record<string, string> = {}): Record<string, string> {
    if (!this.config.enableCSRF) {
      return headers;
    }

    return csrfProtection.addTokenToHeaders(headers);
  }

  /**
   * Validate CSRF token from request
   * @param {string} token - CSRF token from request
   * @returns {boolean} True if token is valid
   * @example
   * if (SecurityUtils.validateCSRFToken(requestToken)) {
   *   // Process request
   * }
   */
  static validateCSRFToken(token: string): boolean {
    if (!this.config.enableCSRF) {
      return true;
    }

    const isValid = csrfProtection.validateToken(token);
    
    if (!isValid) {
      logger.warn('CSRF token validation failed', {
        tokenLength: token.length,
        tokenPrefix: token.substring(0, 8)
      });
    }

    return isValid;
  }

  /**
   * Handle security-related errors
   * @param {unknown} error - Raw error object
   * @param {Record<string, unknown>} context - Error context
   * @returns {Object} Secure error information
   * @example
   * try {
   *   await riskyOperation();
   * } catch (error) {
   *   const secureError = SecurityUtils.handleError(error, { operation: 'upload' });
   *   showUserMessage(secureError.userMessage);
   * }
   */
  static handleError(error: unknown, context?: Record<string, unknown>) {
    return secureErrorHandler.handleError(error, context);
  }

  /**
   * Check if error is retryable
   * @param {Object} secureError - Secure error object
   * @returns {boolean} True if error can be retried
   * @example
   * if (SecurityUtils.isRetryableError(secureError)) {
   *   // Retry operation
   * }
   */
  static isRetryableError(secureError: any): boolean {
    return secureErrorHandler.isRetryableError(secureError);
  }

  /**
   * Get retry delay for error
   * @param {Object} secureError - Secure error object
   * @param {number} attempt - Current attempt number
   * @returns {number} Delay in milliseconds
   * @example
   * const delay = SecurityUtils.getRetryDelay(error, attempt);
   * setTimeout(retry, delay);
   */
  static getRetryDelay(secureError: any, attempt: number): number {
    return secureErrorHandler.getRetryDelay(secureError, attempt);
  }

  /**
   * Generate secure random token
   * @param {number} length - Token length in bytes
   * @returns {string} Hexadecimal token
   * @example
   * const token = SecurityUtils.generateSecureToken(32);
   */
  static generateSecureToken(length: number = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Check if session is valid
   * @param {number} lastActivity - Last activity timestamp
   * @returns {boolean} True if session is valid
   * @example
   * if (SecurityUtils.isSessionValid(lastActivity)) {
   *   // Continue session
   * }
   */
  static isSessionValid(lastActivity: number): boolean {
    const now = Date.now();
    const sessionAge = now - lastActivity;
    return sessionAge < this.config.sessionTimeout;
  }

  /**
   * Log security event
   * @param {string} event - Security event type
   * @param {Record<string, unknown>} data - Event data
   * @returns {void}
   * @example
   * SecurityUtils.logSecurityEvent('LOGIN_ATTEMPT', { userId, success: true });
   */
  static logSecurityEvent(event: string, data: Record<string, unknown>): void {
    logger.info(`Security event: ${event}`, {
      event,
      timestamp: Date.now(),
      ...data
    });
  }

  /**
   * Initialize security utilities
   * @param {Partial<SecurityConfig>} config - Optional configuration
   * @returns {void}
   * @example
   * SecurityUtils.initialize({ maxFileSize: 5 * 1024 * 1024 });
   */
  static initialize(config?: Partial<SecurityConfig>): void {
    if (config) {
      this.configure(config);
    }

    // Initialize CSRF protection
    if (this.config.enableCSRF) {
      csrfProtection.initialize();
      csrfProtection.addMetaTag();
    }

    // Log initialization
    logger.info('Security utilities initialized', {
      config: this.config,
      timestamp: Date.now()
    });
  }
}

// Auto-initialize with default configuration
SecurityUtils.initialize();
