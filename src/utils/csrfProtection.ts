import { logger } from './logger';

class CSRFProtection {
  private static instance: CSRFProtection;
  private readonly TOKEN_LENGTH = 32;
  private readonly TOKEN_KEY = 'csrf_token';
  private readonly HEADER_NAME = 'X-CSRF-Token';

  static getInstance(): CSRFProtection {
    if (!CSRFProtection.instance) {
      CSRFProtection.instance = new CSRFProtection();
    }
    return CSRFProtection.instance;
  }

  generateToken(): string {
    const array = new Uint8Array(this.TOKEN_LENGTH);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  setToken(): string {
    const token = this.generateToken();
    try {
      sessionStorage.setItem(this.TOKEN_KEY, token);
      logger.debug('CSRF token generated and stored');
      return token;
    } catch (error) {
      logger.error('Failed to store CSRF token', { error });
      return '';
    }
  }

  getToken(): string | null {
    try {
      return sessionStorage.getItem(this.TOKEN_KEY);
    } catch (error) {
      logger.error('Failed to retrieve CSRF token', { error });
      return null;
    }
  }

  removeToken(): void {
    try {
      sessionStorage.removeItem(this.TOKEN_KEY);
      logger.debug('CSRF token removed');
    } catch (error) {
      logger.error('Failed to remove CSRF token', { error });
    }
  }

  validateToken(requestToken: string): boolean {
    const storedToken = this.getToken();
    
    if (!storedToken) {
      logger.warn('No CSRF token found in storage');
      return false;
    }

    if (!requestToken) {
      logger.warn('No CSRF token provided in request');
      return false;
    }

    const isValid = storedToken === requestToken;
    
    if (!isValid) {
      logger.warn('CSRF token mismatch', {
        storedToken: storedToken.substring(0, 8) + '...',
        requestToken: requestToken.substring(0, 8) + '...'
      });
    }

    return isValid;
  }

  getHeaderName(): string {
    return this.HEADER_NAME;
  }

  // Add token to fetch requests
  addTokenToHeaders(headers: Record<string, string> = {}): Record<string, string> {
    const token = this.getToken();
    if (token) {
      headers[this.HEADER_NAME] = token;
    }
    return headers;
  }

  // Secure fetch wrapper
  async secureFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const secureHeaders = this.addTokenToHeaders({
      ...options.headers,
      'Content-Type': 'application/json',
    } as Record<string, string>);

    const secureOptions: RequestInit = {
      ...options,
      headers: secureHeaders,
      credentials: 'same-origin',
      mode: 'same-origin',
    };

    try {
      const response = await fetch(url, secureOptions);
      
      // Check for CSRF validation errors
      if (response.status === 403) {
        const errorText = await response.text();
        if (errorText.includes('CSRF') || errorText.includes('csrf')) {
          logger.error('CSRF validation failed', { url, status: response.status });
          this.removeToken(); // Remove invalid token
          throw new Error('CSRF validation failed. Please refresh the page.');
        }
      }

      return response;
    } catch (error) {
      logger.error('Secure fetch failed', { url, error });
      throw error;
    }
  }

  // Initialize CSRF protection
  initialize(): string {
    const existingToken = this.getToken();
    if (existingToken) {
      logger.debug('Existing CSRF token found');
      return existingToken;
    }
    
    return this.setToken();
  }

  // Validate same-origin request
  isSameOrigin(url: string): boolean {
    try {
      const urlObj = new URL(url, window.location.origin);
      return urlObj.origin === window.location.origin;
    } catch {
      return false;
    }
  }

  // Add meta tag to DOM for easy access
  addMetaTag(): void {
    const token = this.getToken();
    if (token) {
      let meta = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'csrf-token';
        document.head.appendChild(meta);
      }
      meta.content = token;
    }
  }
}

export const csrfProtection = CSRFProtection.getInstance();

// Auto-initialize
csrfProtection.initialize();
csrfProtection.addMetaTag();
