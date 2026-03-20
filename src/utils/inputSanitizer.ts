import { logger } from './logger';

export class InputSanitizer {
  private static readonly MAX_TEXT_LENGTH = 10000;
  private static readonly MAX_FILENAME_LENGTH = 255;
  private static readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  private static readonly MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

  static sanitizeTextInput(input: string): string {
    if (typeof input !== 'string') {
      logger.warn('Invalid input type for text sanitization', { inputType: typeof input });
      return '';
    }

    // Trim whitespace
    let sanitized = input.trim();

    // Remove null bytes and control characters except newlines and tabs
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Limit length
    if (sanitized.length > this.MAX_TEXT_LENGTH) {
      logger.warn('Input too long, truncating', { 
        originalLength: sanitized.length, 
        maxLength: this.MAX_TEXT_LENGTH 
      });
      sanitized = sanitized.substring(0, this.MAX_TEXT_LENGTH);
    }

    // Normalize Unicode
    sanitized = sanitized.normalize('NFC');

    return sanitized;
  }

  static sanitizeFileName(filename: string): string {
    if (typeof filename !== 'string') {
      return 'unknown';
    }

    // Remove path traversal attempts
    let sanitized = filename.replace(/[\/\\]/g, '_');

    // Remove dangerous characters
    sanitized = sanitized.replace(/[<>:"|?*]/g, '');

    // Remove control characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

    // Limit length
    if (sanitized.length > this.MAX_FILENAME_LENGTH) {
      const extension = sanitized.substring(sanitized.lastIndexOf('.'));
      const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'));
      const maxNameLength = this.MAX_FILENAME_LENGTH - extension.length;
      sanitized = nameWithoutExt.substring(0, maxNameLength) + extension;
    }

    // Ensure it's not empty
    if (sanitized.trim() === '') {
      sanitized = 'file';
    }

    return sanitized;
  }

  static validateImageFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    if (!this.ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return { 
        valid: false, 
        error: `Invalid file type. Allowed types: ${this.ALLOWED_IMAGE_TYPES.join(', ')}` 
      };
    }

    // Check file size
    if (file.size > this.MAX_IMAGE_SIZE) {
      return { 
        valid: false, 
        error: `File too large. Maximum size: ${this.MAX_IMAGE_SIZE / (1024 * 1024)}MB` 
      };
    }

    // Check file name
    const sanitizedName = this.sanitizeFileName(file.name);
    if (sanitizedName !== file.name) {
      logger.warn('File name was sanitized', { 
        original: file.name, 
        sanitized: sanitizedName 
      });
    }

    return { valid: true };
  }

  static sanitizeHtml(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    // Basic HTML sanitization - remove all HTML tags
    return input.replace(/<[^>]*>/g, '');
  }

  static sanitizeEmail(email: string): string {
    if (typeof email !== 'string') {
      return '';
    }

    // Basic email validation and sanitization
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const sanitized = email.trim().toLowerCase();
    
    if (!emailRegex.test(sanitized)) {
      return '';
    }

    return sanitized;
  }

  static sanitizePhoneNumber(phone: string): string {
    if (typeof phone !== 'string') {
      return '';
    }

    // Remove all non-digit characters except + for international numbers
    const sanitized = phone.replace(/[^\d+]/g, '');
    
    // Basic validation - should be between 10 and 15 digits
    if (sanitized.length < 10 || sanitized.length > 15) {
      return '';
    }

    return sanitized;
  }

  static sanitizeUrl(url: string): string {
    if (typeof url !== 'string') {
      return '';
    }

    try {
      // Validate URL format
      const urlObj = new URL(url);
      
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return '';
      }

      // Remove potential dangerous parts
      urlObj.hash = '';
      urlObj.username = '';
      urlObj.password = '';

      return urlObj.toString();
    } catch {
      // Invalid URL format
      return '';
    }
  }

  static sanitizeJsonInput(input: any): any {
    if (input === null || input === undefined) {
      return null;
    }

    if (typeof input === 'string') {
      return this.sanitizeTextInput(input);
    }

    if (typeof input === 'number') {
      if (!isFinite(input)) {
        return 0;
      }
      return input;
    }

    if (typeof input === 'boolean') {
      return input;
    }

    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeJsonInput(item));
    }

    if (typeof input === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        const sanitizedKey = this.sanitizeTextInput(key);
        if (sanitizedKey) {
          sanitized[sanitizedKey] = this.sanitizeJsonInput(value);
        }
      }
      return sanitized;
    }

    return null;
  }
}
