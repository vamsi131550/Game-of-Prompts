import { GoogleGenAI } from "@google/genai";

export interface AnalysisResult {
  healthStatus: 'Healthy' | 'Diseased' | 'Unknown';
  diagnosis: string;
  advice: string;
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function analyzeCropImage(base64Image: string, mimeType: string): Promise<AnalysisResult> {
  try {
    const model = "gemini-3-flash-preview";
    const prompt = `Analyze this crop/plant image. 
    1. Identify if the plant is healthy or diseased.
    2. If diseased, identify the specific disease.
    3. Provide actionable advice for the farmer.
    
    Return the result in JSON format with the following structure:
    {
      "healthStatus": "Healthy" | "Diseased" | "Unknown",
      "diagnosis": "Short description of the condition",
      "advice": "Actionable steps for the farmer"
    }`;

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { data: base64Image.split(',')[1], mimeType } }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const result = JSON.parse(response.text || '{}');
    return {
      healthStatus: result.healthStatus || 'Unknown',
      diagnosis: result.diagnosis || 'Could not determine condition.',
      advice: result.advice || 'Consult a local agronomist for detailed advice.'
    };
  } catch (e) {
    console.error("Failed to analyze crop image", e);
    return {
      healthStatus: 'Unknown',
      diagnosis: 'Analysis failed.',
      advice: 'Please try uploading a clearer image.'
    };
  }
}
