export interface DashboardSummary {
  soil: {
    status: "Critical" | "Low" | "High" | "Optimal";
    moisture: "Low" | "Medium" | "High";
    pH: number;
    NPK: { N: number; P: number; K: number };
    alerts: string[];
  };
  weather: {
    current_temp: number;
    humidity: number;
    wind_speed: number;
    rainfall: number;
    forecast: string[];
    alerts: string[];
  };
  crop_health: {
    ndvi_index: "Low" | "Medium" | "High";
    alerts: string[];
  };
  market: {
    crop_prices: { crop: string; price: number }[];
    alerts: string[];
  };
  positive_insights: string[];
  negative_insights: string[];
  overall_summary: string;
  ai_recommendations: {
    issue: string;
    confidence: number;
    advice: string;
  }[];
}
