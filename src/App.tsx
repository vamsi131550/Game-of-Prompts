import React, { useState, useEffect, useRef } from 'react';
import { 
  Cloud, 
  Droplets, 
  Thermometer, 
  Wind, 
  Upload, 
  Leaf, 
  AlertCircle, 
  CheckCircle2, 
  MapPin,
  Loader2,
  ChevronRight,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getWeatherData, getWeatherAdvice, getWeatherDescription, WeatherData } from './services/weatherService';
import { analyzeCropImage, AnalysisResult } from './services/geminiService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface HistoryItem {
  id: string;
  timestamp: number;
  image: string;
  result: AnalysisResult;
}

export default function App() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ lat: latitude, lon: longitude });
          fetchWeather(latitude, longitude);
        },
        () => {
          setError("Location access denied. Using default location (San Francisco).");
          const defaultLat = 37.7749;
          const defaultLon = -122.4194;
          setLocation({ lat: defaultLat, lon: defaultLon });
          fetchWeather(defaultLat, defaultLon);
        }
      );
    }

    // Load history from localStorage
    const savedHistory = localStorage.getItem('crop_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  const fetchWeather = async (lat: number, lon: number) => {
    try {
      const data = await getWeatherData(lat, lon);
      setWeather(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setPreviewImage(base64);
      setIsAnalyzing(true);
      setAnalysisResult(null);
      setError(null);

      try {
        const result = await analyzeCropImage(base64, file.type);
        setAnalysisResult(result);
        
        // Save to history
        const newItem: HistoryItem = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          image: base64,
          result
        };
        const updatedHistory = [newItem, ...history].slice(0, 10);
        setHistory(updatedHistory);
        localStorage.setItem('crop_history', JSON.stringify(updatedHistory));
      } catch (err) {
        setError("AI analysis failed. Please try again.");
        console.error(err);
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-[#1A1A1A] font-sans selection:bg-emerald-100">
      {/* Header */}
      <header className="border-b border-black/5 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Leaf className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">CropHealth AI</h1>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium text-black/60">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              {location ? "Localized Dashboard" : "Detecting Location..."}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Weather & Advice */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white rounded-2xl border border-black/5 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-lg">Farm Weather</h2>
              <Cloud className="text-black/20 w-5 h-5" />
            </div>
            
            {weather ? (
              <div className="space-y-6">
                <div className="flex items-end gap-2">
                  <span className="text-5xl font-light tracking-tighter">{Math.round(weather.temperature)}°</span>
                  <span className="text-black/40 mb-2 font-medium">Celsius</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-xl flex items-center gap-3">
                    <Droplets className="text-blue-500 w-4 h-4" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wider font-bold text-black/40">Humidity</p>
                      <p className="text-sm font-semibold">{weather.humidity}%</p>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl flex items-center gap-3">
                    <Wind className="text-emerald-500 w-4 h-4" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wider font-bold text-black/40">Wind</p>
                      <p className="text-sm font-semibold">{weather.windSpeed} km/h</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-black/5">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 p-1.5 bg-amber-50 rounded-lg">
                      <Thermometer className="text-amber-600 w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-black/40 mb-1">AI Weather Advice</p>
                      <p className="text-sm leading-relaxed text-black/80">
                        {getWeatherAdvice(weather.temperature, weather.weatherCode)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-black/20">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p className="text-sm">Fetching data...</p>
              </div>
            )}
          </section>

          <section className="bg-emerald-900 rounded-2xl p-6 text-white shadow-lg overflow-hidden relative">
            <div className="relative z-10">
              <h3 className="font-semibold mb-2">Sustainable Farming</h3>
              <p className="text-emerald-100/80 text-sm leading-relaxed">
                Early detection of crop diseases can reduce pesticide use by up to 40%. Upload a clear photo of your plant's leaves for instant AI analysis.
              </p>
            </div>
            <Leaf className="absolute -bottom-4 -right-4 w-24 h-24 text-emerald-800/50 rotate-12" />
          </section>
        </div>

        {/* Right Column: Analysis & Upload */}
        <div className="lg:col-span-8 space-y-8">
          {/* Upload Section */}
          <section className="bg-white rounded-2xl border-2 border-dashed border-black/10 p-8 text-center transition-all hover:border-emerald-500/50 group">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageUpload}
            />
            
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Upload className="text-emerald-600 w-8 h-8" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Analyze Crop Health</h2>
              <p className="text-black/40 text-sm mb-6">
                Upload a photo of a leaf or stem to detect diseases, pests, or nutrient deficiencies.
              </p>
              <button 
                onClick={triggerUpload}
                disabled={isAnalyzing}
                className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2 mx-auto"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing Image...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Select Photo
                  </>
                )}
              </button>
            </div>
          </section>

          {/* Results Section */}
          <AnimatePresence mode="wait">
            {(previewImage || analysisResult) && (
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl border border-black/5 overflow-hidden shadow-sm"
              >
                <div className="grid grid-cols-1 md:grid-cols-2">
                  <div className="aspect-square bg-slate-100 relative overflow-hidden">
                    {previewImage && (
                      <img 
                        src={previewImage} 
                        alt="Crop Preview" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    {isAnalyzing && (
                      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center">
                        <div className="text-center text-white">
                          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-2" />
                          <p className="text-sm font-medium">AI Scanning...</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-8 flex flex-col justify-center">
                    {analysisResult ? (
                      <div className="space-y-6">
                        <div className="flex items-center gap-3">
                          {analysisResult.healthStatus === 'Healthy' ? (
                            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider">
                              <CheckCircle2 className="w-4 h-4" />
                              Healthy
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-bold uppercase tracking-wider">
                              <AlertCircle className="w-4 h-4" />
                              {analysisResult.healthStatus}
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <h3 className="text-2xl font-semibold mb-2">{analysisResult.diagnosis}</h3>
                          <p className="text-black/60 leading-relaxed">
                            {analysisResult.advice}
                          </p>
                        </div>

                        <div className="pt-6 border-t border-black/5">
                          <button 
                            onClick={triggerUpload}
                            className="text-emerald-600 font-semibold flex items-center gap-1 text-sm hover:gap-2 transition-all"
                          >
                            Analyze another photo <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-black/20 text-center">
                        <History className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-sm">Upload an image to see the AI diagnosis here.</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* History Section */}
          {history.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg">Recent Analysis</h2>
                <button 
                  onClick={() => { setHistory([]); localStorage.removeItem('crop_history'); }}
                  className="text-xs font-bold uppercase tracking-wider text-black/40 hover:text-red-500 transition-colors"
                >
                  Clear History
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {history.map((item) => (
                  <div 
                    key={item.id} 
                    className="bg-white rounded-xl border border-black/5 p-2 group cursor-pointer hover:shadow-md transition-all"
                    onClick={() => {
                      setPreviewImage(item.image);
                      setAnalysisResult(item.result);
                      window.scrollTo({ top: 400, behavior: 'smooth' });
                    }}
                  >
                    <div className="aspect-square rounded-lg overflow-hidden mb-2">
                      <img src={item.image} alt="History" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <p className="text-[10px] font-bold truncate text-black/60 px-1">
                      {item.result.diagnosis}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-black/5 py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Leaf className="text-emerald-600 w-5 h-5" />
            <span className="font-semibold">CropHealth AI</span>
          </div>
          <p className="text-black/40 text-sm">
            Powered by Gemini AI. Always consult with local agricultural experts for critical decisions.
          </p>
        </div>
      </footer>

      {/* Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-red-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3"
          >
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{error}</span>
            <button onClick={() => setError(null)} className="ml-2 text-white/60 hover:text-white">✕</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
