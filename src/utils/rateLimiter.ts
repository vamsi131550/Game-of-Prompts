interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private static instance: RateLimiter;
  private limits: Map<string, RateLimitEntry> = new Map();

  // Rate limits per endpoint
  private readonly LIMITS = {
    GEMINI_API: { maxRequests: 60, windowMs: 60000 }, // 60 requests per minute
    WEATHER_API: { maxRequests: 1000, windowMs: 3600000 }, // 1000 requests per hour
    FIRESTORE_WRITE: { maxRequests: 50, windowMs: 60000 }, // 50 writes per minute
    FIRESTORE_READ: { maxRequests: 100, windowMs: 60000 }, // 100 reads per minute
    IMAGE_UPLOAD: { maxRequests: 10, windowMs: 60000 }, // 10 uploads per minute
  };

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  canMakeRequest(endpoint: keyof typeof RateLimiter.prototype['LIMITS'], identifier: string = 'default'): boolean {
    const key = `${endpoint}:${identifier}`;
    const limit = this.LIMITS[endpoint];
    const now = Date.now();
    
    let entry = this.limits.get(key);
    
    if (!entry || now > entry.resetTime) {
      // New window or expired
      entry = { count: 1, resetTime: now + limit.windowMs };
      this.limits.set(key, entry);
      return true;
    }
    
    if (entry.count >= limit.maxRequests) {
      return false;
    }
    
    entry.count++;
    return true;
  }

  getRemainingRequests(endpoint: keyof typeof RateLimiter.prototype['LIMITS'], identifier: string = 'default'): number {
    const key = `${endpoint}:${identifier}`;
    const limit = this.LIMITS[endpoint];
    const entry = this.limits.get(key);
    
    if (!entry || Date.now() > entry.resetTime) {
      return limit.maxRequests;
    }
    
    return Math.max(0, limit.maxRequests - entry.count);
  }

  getResetTime(endpoint: keyof typeof RateLimiter.prototype['LIMITS'], identifier: string = 'default'): number | null {
    const key = `${endpoint}:${identifier}`;
    const entry = this.limits.get(key);
    
    if (!entry) {
      return null;
    }
    
    return entry.resetTime;
  }

  reset(endpoint: keyof typeof RateLimiter.prototype['LIMITS'], identifier: string = 'default'): void {
    const key = `${endpoint}:${identifier}`;
    this.limits.delete(key);
  }

  // Cleanup expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }
}

// Auto-cleanup every 5 minutes
setInterval(() => {
  RateLimiter.getInstance().cleanup();
}, 300000);

export const rateLimiter = RateLimiter.getInstance();
