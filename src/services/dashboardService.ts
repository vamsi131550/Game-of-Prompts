import { GoogleGenAI, Type } from "@google/genai";
import { DashboardSummary } from "../types/dashboard";
import { WeatherData } from "./weatherService";
import { SensorData } from "./sensorService";
import { db } from "../firebase";
import { doc, setDoc, getDoc, collection, query, orderBy, limit, getDocs } from "firebase/firestore";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const generateDashboardSummary = async (
  weather: WeatherData | null,
  sensorData: SensorData
): Promise<DashboardSummary> => {
  const prompt = `
    Generate a structured agricultural dashboard summary in JSON format based on the following data:
    
    IoT Sensor Data:
    - Soil Moisture: ${sensorData.moisture}%
    - Soil Temperature: ${sensorData.soilTemp}°C
    - pH: ${sensorData.soilPh}
    - Status: ${sensorData.status}
    
    Weather Data:
    - Current Temp: ${weather?.temperature || 'N/A'}°C
    - Humidity: ${weather?.humidity || 'N/A'}%
    - Wind Speed: ${weather?.windSpeed || 'N/A'} km/h
    
    Satellite Data (Mocked for now):
    - NDVI Index: Medium-High
    
    Market Data (Mocked for now):
    - Wheat: 2200 INR/Quintal
    - Rice: 2500 INR/Quintal
    
    Tasks:
    1. Summarize key insights.
    2. Identify positive aspects (Good things).
    3. Identify negative aspects or issues needing attention (Bad things).
    4. Provide a concise overall summary of the farm status.
    5. Follow the exact JSON structure requested.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          dashboard_summary: {
            type: Type.OBJECT,
            properties: {
              soil: {
                type: Type.OBJECT,
                properties: {
                  status: { type: Type.STRING, description: "One of: Critical, Low, High, Optimal" },
                  moisture: { type: Type.STRING },
                  pH: { type: Type.NUMBER },
                  NPK: {
                    type: Type.OBJECT,
                    properties: {
                      N: { type: Type.NUMBER },
                      P: { type: Type.NUMBER },
                      K: { type: Type.NUMBER }
                    }
                  },
                  alerts: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
              },
              weather: {
                type: Type.OBJECT,
                properties: {
                  current_temp: { type: Type.NUMBER },
                  humidity: { type: Type.NUMBER },
                  wind_speed: { type: Type.NUMBER },
                  rainfall: { type: Type.NUMBER },
                  forecast: { type: Type.ARRAY, items: { type: Type.STRING } },
                  alerts: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
              },
              crop_health: {
                type: Type.OBJECT,
                properties: {
                  ndvi_index: { type: Type.STRING },
                  alerts: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
              },
              market: {
                type: Type.OBJECT,
                properties: {
                  crop_prices: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        crop: { type: Type.STRING },
                        price: { type: Type.NUMBER }
                      }
                    }
                  },
                  alerts: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
              },
              positive_insights: { type: Type.ARRAY, items: { type: Type.STRING } },
              negative_insights: { type: Type.ARRAY, items: { type: Type.STRING } },
              overall_summary: { type: Type.STRING },
              ai_recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    issue: { type: Type.STRING },
                    confidence: { type: Type.NUMBER },
                    advice: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  const data = JSON.parse(response.text);
  return data.dashboard_summary;
};

import { handleFirestoreError, OperationType } from "../utils/firestoreErrorHandler";

export const saveDashboardSummary = async (uid: string, summary: DashboardSummary) => {
  const path = `dashboards/${uid}`;
  try {
    const docRef = doc(db, 'dashboards', uid);
    await setDoc(docRef, {
      ...summary,
      timestamp: Date.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const getLatestDashboardSummary = async (uid: string): Promise<DashboardSummary | null> => {
  const path = `dashboards/${uid}`;
  try {
    const docRef = doc(db, 'dashboards', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as DashboardSummary;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
};
