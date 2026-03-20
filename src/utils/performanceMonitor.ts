import { logger } from './logger';

interface PerformanceEntry {
  name: string;
  startTime: number;
  duration?: number;
  endTime?: number;
  metadata?: Record<string, unknown>;
}

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  apiResponseTime: number;
  memoryUsage: number;
  errorCount: number;
  userInteractions: number;
  timestamp: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private entries: Map<string, PerformanceEntry> = new Map();
  private metrics: PerformanceMetrics = {
    loadTime: 0,
    renderTime: 0,
    apiResponseTime: 0,
    memoryUsage: 0,
    errorCount: 0,
    userInteractions: 0,
    timestamp: Date.now()
  };
  private observers: PerformanceObserver[] = [];

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  constructor() {
    this.initializeObservers();
    this.trackPageLoad();
  }

  private initializeObservers() {
    // Observe navigation timing
    if ('PerformanceObserver' in window) {
      try {
        const navObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming;
              this.metrics.loadTime = navEntry.loadEventEnd - navEntry.loadEventStart;
              this.metrics.renderTime = navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart;
              
              logger.info('Page load metrics', {
                loadTime: this.metrics.loadTime,
                renderTime: this.metrics.renderTime
              });
            }
          }
        });
        
        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navObserver);
      } catch (error) {
        logger.warn('Failed to initialize navigation observer', { error });
      }

      // Observe resource timing
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'resource') {
              const resource = entry as PerformanceResourceTiming;
              if (resource.name.includes('/api/')) {
                this.metrics.apiResponseTime += resource.responseEnd - resource.requestStart;
              }
            }
          }
        });
        
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);
      } catch (error) {
        logger.warn('Failed to initialize resource observer', { error });
      }

      // Observe user interactions
      try {
        const interactionObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'event') {
              this.metrics.userInteractions++;
            }
          }
        });
        
        interactionObserver.observe({ entryTypes: ['event'] });
        this.observers.push(interactionObserver);
      } catch (error) {
        logger.warn('Failed to initialize interaction observer', { error });
      }
    }
  }

  private trackPageLoad() {
    if ('performance' in window && 'getEntriesByType' in performance) {
      const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      if (entries.length > 0) {
        const navEntry = entries[0];
        this.metrics.loadTime = navEntry.loadEventEnd - navEntry.loadEventStart;
        this.metrics.renderTime = navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart;
      }
    }
  }

  startTimer(name: string, metadata?: Record<string, unknown>): void {
    this.entries.set(name, {
      name,
      startTime: performance.now(),
      metadata
    });
  }

  endTimer(name: string): number | null {
    const entry = this.entries.get(name);
    if (!entry) {
      logger.warn('Timer not found', { name });
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - entry.startTime;

    this.entries.set(name, {
      ...entry,
      endTime,
      duration
    });

    logger.debug('Timer completed', {
      name,
      duration: Math.round(duration),
      metadata: entry.metadata
    });

    return duration;
  }

  measureFunction<T extends (...args: any[]) => any>(
    name: string,
    fn: T,
    metadata?: Record<string, unknown>
  ): T {
    return ((...args: any[]) => {
      this.startTimer(name, metadata);
      try {
        const result = fn(...args);
        
        // Handle async functions
        if (result instanceof Promise) {
          return result
            .then((value) => {
              this.endTimer(name);
              return value;
            })
            .catch((error) => {
              this.endTimer(name);
              throw error;
            });
        }
        
        this.endTimer(name);
        return result;
      } catch (error) {
        this.endTimer(name);
        throw error;
      }
    }) as T;
  }

  trackUserInteraction(action: string, element?: string): void {
    this.metrics.userInteractions++;
    
    logger.debug('User interaction tracked', {
      action,
      element,
      totalInteractions: this.metrics.userInteractions
    });
  }

  trackError(error: Error, context?: Record<string, unknown>): void {
    this.metrics.errorCount++;
    
    logger.debug('Error tracked', {
      errorType: error.name,
      errorMessage: error.message,
      context,
      totalErrors: this.metrics.errorCount
    });
  }

  trackMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = memory.usedJSHeapSize;
      
      logger.debug('Memory usage tracked', {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      });
    }
  }

  getMetrics(): PerformanceMetrics {
    this.trackMemoryUsage();
    return { ...this.metrics };
  }

  getTimer(name: string): PerformanceEntry | null {
    return this.entries.get(name) || null;
  }

  getAllTimers(): Map<string, PerformanceEntry> {
    return new Map(this.entries);
  }

  clearTimers(): void {
    this.entries.clear();
  }

  generateReport(): string {
    const metrics = this.getMetrics();
    const timers = Array.from(this.entries.entries())
      .filter(([_, entry]) => entry.duration !== undefined)
      .sort(([_, a], [__, b]) => (b.duration || 0) - (a.duration || 0));

    return `
Performance Report - ${new Date().toISOString()}
=====================================

Overall Metrics:
- Load Time: ${metrics.loadTime.toFixed(2)}ms
- Render Time: ${metrics.renderTime.toFixed(2)}ms
- API Response Time: ${metrics.apiResponseTime.toFixed(2)}ms
- Memory Usage: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB
- Error Count: ${metrics.errorCount}
- User Interactions: ${metrics.userInteractions}

Slowest Operations:
${timers.slice(0, 10).map(([name, entry]) => 
  `- ${name}: ${entry.duration?.toFixed(2)}ms`
).join('\n')}

Recommendations:
${this.generateRecommendations(metrics, timers)}
    `.trim();
  }

  private generateRecommendations(metrics: PerformanceMetrics, timers: Array<[string, PerformanceEntry]>): string {
    const recommendations: string[] = [];

    if (metrics.loadTime > 3000) {
      recommendations.push('- Consider optimizing initial bundle size');
    }

    if (metrics.renderTime > 1000) {
      recommendations.push('- Optimize component rendering and reduce re-renders');
    }

    if (metrics.apiResponseTime > 2000) {
      recommendations.push('- Implement API response caching and optimize backend calls');
    }

    if (metrics.memoryUsage > 50 * 1024 * 1024) { // 50MB
      recommendations.push('- Monitor for memory leaks and optimize data structures');
    }

    const slowTimers = timers.filter(([_, entry]) => (entry.duration || 0) > 1000);
    if (slowTimers.length > 0) {
      recommendations.push(`- Optimize slow operations: ${slowTimers.map(([name]) => name).join(', ')}`);
    }

    if (metrics.errorCount > 10) {
      recommendations.push('- Address frequent errors to improve user experience');
    }

    return recommendations.length > 0 ? recommendations.join('\n') : '- Performance looks good!';
  }

  sendToAnalytics(): void {
    if (import.meta.env.PROD) {
      const metrics = this.getMetrics();
      
      // Send to analytics service
      fetch('/api/analytics/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metrics)
      }).catch(error => {
        logger.warn('Failed to send performance analytics', { error });
      });
    }
  }

  cleanup(): void {
    // Disconnect all observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.clearTimers();
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Auto-send metrics every 30 seconds in production
if (import.meta.env.PROD) {
  setInterval(() => {
    performanceMonitor.sendToAnalytics();
  }, 30000);
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  performanceMonitor.sendToAnalytics();
  performanceMonitor.cleanup();
});
