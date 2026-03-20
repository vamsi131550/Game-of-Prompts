import { describe, it, expect, vi } from 'vitest';
import { saveDashboardSummary, getLatestDashboardSummary } from './dashboardService';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { DashboardSummary } from '../types/dashboard';

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  where: vi.fn(),
  getFirestore: vi.fn(),
}));

vi.mock('../firebase', () => ({
  db: {},
  auth: {
    currentUser: { uid: 'test-user' }
  }
}));

const mockSummary: DashboardSummary = {
  soil: {
    status: "Optimal",
    moisture: "Medium",
    pH: 6.8,
    NPK: { N: 12, P: 8, K: 15 },
    alerts: []
  },
  weather: {
    current_temp: 25,
    humidity: 60,
    wind_speed: 10,
    rainfall: 0,
    forecast: ["Sunny"],
    alerts: []
  },
  crop_health: {
    ndvi_index: "High",
    alerts: []
  },
  market: {
    crop_prices: [{ crop: "Wheat", price: 2200 }],
    alerts: []
  },
  positive_insights: ["Good soil moisture"],
  negative_insights: [],
  overall_summary: "Farm is healthy",
  ai_recommendations: [{ issue: "None", confidence: 0.95, advice: "Keep it up" }]
};

describe('dashboardService', () => {
  it('should save dashboard summary', async () => {
    (doc as any).mockReturnValue({});
    (setDoc as any).mockResolvedValueOnce(undefined);

    await saveDashboardSummary('test-user', mockSummary);

    expect(setDoc).toHaveBeenCalled();
  });

  it('should fetch latest dashboard summary', async () => {
    (doc as any).mockReturnValue({});
    (getDoc as any).mockResolvedValueOnce({
      exists: () => true,
      data: () => mockSummary
    });

    const result = await getLatestDashboardSummary('test-user');

    expect(result).not.toBeNull();
    expect(result?.weather.current_temp).toBe(25);
  });
});
