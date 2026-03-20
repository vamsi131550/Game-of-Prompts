import { GoogleGenAI } from "@google/genai";
import { rateLimiter } from "../utils/rateLimiter";
import { logger } from "../utils/logger";

class SecureGeminiService {
  private static instance: SecureGeminiService;
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  }

  static getInstance(): SecureGeminiService {
    if (!SecureGeminiService.instance) {
      SecureGeminiService.instance = new SecureGeminiService();
    }
    return SecureGeminiService.instance;
  }

  async generateContent(model: string, contents: any[], config?: any) {
    const userId = 'anonymous'; // In real app, get from auth context
    
    if (!rateLimiter.canMakeRequest('GEMINI_API', userId)) {
      const resetTime = rateLimiter.getResetTime('GEMINI_API', userId);
      const remaining = rateLimiter.getRemainingRequests('GEMINI_API', userId);
      
      logger.warn('Rate limit exceeded for Gemini API', {
        userId,
        remaining,
        resetTime: new Date(resetTime!).toISOString()
      });
      
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    try {
      const response = await this.ai.models.generateContent({
        model,
        contents,
        config
      });
      
      logger.info('Gemini API request successful', {
        userId,
        model,
        contentLength: JSON.stringify(contents).length
      });
      
      return response;
    } catch (error: unknown) {
      logger.error('Gemini API request failed', {
        userId,
        model,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Don't expose sensitive error details
      if (error instanceof Error && error.message.includes('API_KEY')) {
        throw new Error('Authentication failed');
      }
      
      throw error;
    }
  }

  async generateContentStream(model: string, contents: any[], config?: any) {
    const userId = 'anonymous'; // In real app, get from auth context
    
    if (!rateLimiter.canMakeRequest('GEMINI_API', userId)) {
      const resetTime = rateLimiter.getResetTime('GEMINI_API', userId);
      
      logger.warn('Rate limit exceeded for Gemini API stream', {
        userId,
        resetTime: new Date(resetTime!).toISOString()
      });
      
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    try {
      const stream = await this.ai.models.generateContentStream({
        model,
        contents,
        config
      });
      
      logger.info('Gemini API stream started', {
        userId,
        model
      });
      
      return stream;
    } catch (error: unknown) {
      logger.error('Gemini API stream failed', {
        userId,
        model,
        error: error instanceof Error ? error.message : String(error)
      });
      
      if (error instanceof Error && error.message.includes('API_KEY')) {
        throw new Error('Authentication failed');
      }
      
      throw error;
    }
  }

  getRateLimitInfo(userId: string = 'anonymous') {
    return {
      remaining: rateLimiter.getRemainingRequests('GEMINI_API', userId),
      resetTime: rateLimiter.getResetTime('GEMINI_API', userId),
      maxRequests: 60 // This should match the LIMITS constant
    };
  }
}

export const secureGeminiService = SecureGeminiService.getInstance();
