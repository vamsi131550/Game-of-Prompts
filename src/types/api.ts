/**
 * API Response Types
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, unknown>;
  timestamp: number;
}

/**
 * Weather API Types
 */

export interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  pressure: number;
  visibility: number;
  uvIndex: number;
  weatherCode: number;
  description: string;
  location: {
    lat: number;
    lon: number;
    city: string;
    country: string;
  };
  timestamp: number;
  sunrise: number;
  sunset: number;
}

export interface WeatherForecast {
  current: WeatherData;
  hourly: WeatherData[];
  daily: Array<{
    date: string;
    minTemp: number;
    maxTemp: number;
    weatherCode: number;
    description: string;
    precipitationChance: number;
  }>;
}

/**
 * Sensor Data Types
 */

export interface SensorData {
  moisture: number;
  soilTemp: number;
  soilPh: number;
  humidity: number;
  airTemp: number;
  lightLevel: number;
  batteryLevel: number;
  status: 'optimal' | 'warning' | 'critical' | 'offline';
  lastUpdated: number;
  deviceId: string;
  location: {
    lat: number;
    lon: number;
    field: string;
  };
}

export interface SensorReading {
  timestamp: number;
  value: number;
  unit: string;
  type: 'moisture' | 'temperature' | 'ph' | 'humidity' | 'light' | 'battery';
  quality: 'good' | 'fair' | 'poor';
}

/**
 * AI Service Types
 */

export interface GeminiRequest {
  model: string;
  contents: GeminiContent[];
  config?: GeminiConfig;
}

export interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

export interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export interface GeminiConfig {
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
  tools?: Array<{
    googleSearch?: Record<string, unknown>;
    googleMaps?: Record<string, unknown>;
  }>;
  systemInstruction?: string;
  responseMimeType?: string;
  responseSchema?: Record<string, unknown>;
}

export interface GeminiResponse {
  candidates: Array<{
    content: GeminiContent;
    finishReason: string;
    index: number;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

/**
 * Image Analysis Types
 */

export interface ImageAnalysisRequest {
  image: string; // Base64 encoded
  filename: string;
  mimeType: string;
  context?: {
    weather?: WeatherData;
    sensorData?: SensorData;
    location?: string;
  };
}

export interface CropDisease {
  name: string;
  scientificName: string;
  confidence: number;
  severity: 'mild' | 'moderate' | 'severe';
  description: string;
  symptoms: string[];
  treatment: string[];
  prevention: string[];
}

export interface AnalysisResult {
  disease?: CropDisease;
  plantHealth: 'healthy' | 'stressed' | 'diseased';
  confidence: number;
  recommendations: string[];
  nextSteps: string[];
  urgency: 'low' | 'medium' | 'high';
  estimatedYieldImpact?: number; // percentage
}

/**
 * Dashboard Types
 */

export interface DashboardSummary {
  soil: {
    moisture: number;
    temperature: number;
    ph: number;
    status: 'optimal' | 'warning' | 'critical';
  };
  weather: {
    current: WeatherData;
    forecast: string;
    alerts: string[];
  };
  cropHealth: {
    overall: 'excellent' | 'good' | 'fair' | 'poor';
    diseases: string[];
    stressFactors: string[];
    recommendations: string[];
  };
  market: {
    crops: Array<{
      name: string;
      price: number;
      trend: 'up' | 'down' | 'stable';
      unit: string;
    }>;
    advice: string;
  };
  positiveInsights: string[];
  negativeInsights: string[];
  overallSummary: string;
  timestamp: number;
}

/**
 * User and Authentication Types
 */

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
  location?: {
    lat: number;
    lon: number;
    address: string;
  };
  farmInfo?: {
    name: string;
    size: number; // in hectares
    crops: string[];
    soilType: string;
  };
  preferences: {
    language: string;
    units: 'metric' | 'imperial';
    notifications: boolean;
    theme: 'light' | 'dark' | 'auto';
  };
  createdAt: number;
  lastLogin: number;
}

export interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

/**
 * Voice Recording Types
 */

export interface VoiceNote {
  id: string;
  url: string;
  duration: number;
  size: number; // in bytes
  format: string;
  author: string;
  authorUid: string;
  transcript?: string;
  timestamp: number;
  tags: string[];
  isPublic: boolean;
}

export interface RecordingState {
  isRecording: boolean;
  duration: number;
  audioBlob?: Blob;
  error?: string;
}

/**
 * Notification Types
 */

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  action?: {
    label: string;
    url: string;
  };
}

/**
 * Performance Monitoring Types
 */

export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  apiResponseTime: number;
  memoryUsage: number;
  errorCount: number;
  userInteractions: number;
  timestamp: number;
}

/**
 * Rate Limiting Types
 */

export interface RateLimitInfo {
  remaining: number;
  resetTime: number;
  maxRequests: number;
  windowMs: number;
}

/**
 * File Upload Types
 */

export interface FileUpload {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  url?: string;
  error?: string;
}
