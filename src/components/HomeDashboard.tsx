import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  Droplets, 
  Thermometer, 
  Wind, 
  Leaf, 
  AlertCircle, 
  CheckCircle2, 
  TrendingUp, 
  CloudRain,
  Activity,
  Zap,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DashboardSummary } from '../types/dashboard';
import { generateDashboardSummary, getLatestDashboardSummary, saveDashboardSummary } from '../services/dashboardService';
import { WeatherData } from '../services/weatherService';
import { SensorData } from '../services/sensorService';
import { auth } from '../firebase';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface HomeDashboardProps {
  weather: WeatherData | null;
  sensorData: SensorData;
  onLogin?: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({ weather, sensorData, onLogin }) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  const fetchSummary = useCallback(async () => {
    const user = auth.currentUser;
    setLoading(true);
    
    try {
      // Try to get latest from DB first if user exists
      if (user) {
        const latest = await getLatestDashboardSummary(user.uid);
        if (latest) {
          setSummary(latest);
        }
      }

      // Generate fresh one regardless of login status
      const fresh = await generateDashboardSummary(weather, sensorData);
      setSummary(fresh);
      
      // Save only if user exists
      if (user) {
        await saveDashboardSummary(user.uid, fresh);
      }
    } catch (err) {
      console.error("Dashboard Error:", err);
      setError("Failed to refresh dashboard insights.");
    } finally {
      setLoading(false);
    }
  }, [weather, sensorData]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary, refreshKey]);

  const memoizedSummary = useMemo(() => summary, [summary]);

  if (loading && !memoizedSummary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4" role="status" aria-live="polite">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
        <p className="text-sm font-bold text-black/40 uppercase tracking-widest">Generating AI Insights...</p>
      </div>
    );
  }

  if (!memoizedSummary) return null;

  return (
    <div className="px-4 space-y-6 pb-24 pt-4" role="main">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
            <Leaf className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none">Farm Dashboard</h1>
            <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest mt-1">Smart AI Insights</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-[10px] text-red-500 font-bold" role="alert">{error}</span>}
          
          <button 
            onClick={() => setRefreshKey(prev => prev + 1)}
            disabled={loading}
            aria-label="Refresh dashboard insights"
            className="p-2 bg-white rounded-xl border border-black/5 shadow-sm text-black/40 hover:text-emerald-600 transition-colors disabled:opacity-50"
            title="Refresh Insights"
          >
            <Activity className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>

          {!auth.currentUser && (
            <button 
              onClick={onLogin}
              aria-label="Sign in with Google"
              className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-emerald-100"
            >
              Sign In
            </button>
          )}

          <div className="flex items-center gap-1.5" aria-label="Live status indicator">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Live</span>
          </div>
        </div>
      </header>

      {/* 1. Top Section - 2 Panes */}
      <div className="grid grid-cols-2 gap-4">
        {/* Pane 1: Weather & Sensors */}
        <motion.button 
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowDetails(true)}
          aria-label={`View detailed weather and soil information. Current status: ${memoizedSummary.soil.status}`}
          className="bg-white p-5 rounded-[32px] border border-black/5 shadow-sm space-y-4 text-left w-full relative group"
        >
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
              <CloudRain className="w-4 h-4 text-blue-600" />
            </div>
            <div className={cn(
              "px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest",
              memoizedSummary.soil.status === 'Critical' ? "bg-red-500 text-white" :
              memoizedSummary.soil.status === 'Low' ? "bg-amber-500 text-white" :
              memoizedSummary.soil.status === 'High' ? "bg-blue-500 text-white" :
              "bg-emerald-500 text-white"
            )}>
              {memoizedSummary.soil.status}
            </div>
          </div>
          <div>
            <h4 className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Weather & Soil</h4>
            <div className="mt-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-black/60">Moisture</span>
                <span className="text-[10px] font-bold">{memoizedSummary.soil.moisture}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-black/60">Temp</span>
                <span className="text-[10px] font-bold">{memoizedSummary.weather.current_temp}°C</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-black/5">
            <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">View Details</span>
            <ChevronRight className="w-3 h-3 text-emerald-600" />
          </div>
        </motion.button>

        {/* Pane 2: NDVI Health */}
        <div className="bg-white p-5 rounded-[32px] border border-black/5 shadow-sm space-y-4" aria-label={`NDVI Health index: ${memoizedSummary.crop_health.ndvi_index}`}>
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center">
              <Activity className="w-4 h-4 text-emerald-600" />
            </div>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-[10px] font-bold text-black/40 uppercase tracking-widest">NDVI Health</h4>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={cn(
                "text-2xl font-bold tracking-tighter",
                memoizedSummary.crop_health.ndvi_index === 'High' ? "text-emerald-600" :
                memoizedSummary.crop_health.ndvi_index === 'Medium' ? "text-amber-600" :
                "text-red-600"
              )}>
                {memoizedSummary.crop_health.ndvi_index}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Good Things */}
      <section className="space-y-3" aria-labelledby="positive-insights-title">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <h3 id="positive-insights-title" className="text-[10px] font-bold uppercase tracking-widest text-black/40">Positive Insights</h3>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {memoizedSummary.positive_insights.map((insight, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-emerald-50/50 border border-emerald-100/50 p-4 rounded-2xl flex items-start gap-3"
            >
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 shrink-0" />
              <p className="text-xs font-medium text-emerald-900 leading-relaxed">{insight}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 3. Bad Things / Needs Attention */}
      <section className="space-y-3" aria-labelledby="needs-attention-title">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <h3 id="needs-attention-title" className="text-[10px] font-bold uppercase tracking-widest text-black/40">Needs Attention</h3>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {memoizedSummary.negative_insights.map((insight, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-red-50/50 border border-red-100/50 p-4 rounded-2xl flex items-start gap-3"
            >
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 shrink-0" />
              <p className="text-xs font-medium text-red-900 leading-relaxed">{insight}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 4. AI Summary */}
      <section className="space-y-3" aria-labelledby="ai-summary-title">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <h3 id="ai-summary-title" className="text-[10px] font-bold uppercase tracking-widest text-black/40">AI Overall Summary</h3>
        </div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 text-white p-6 rounded-[32px] shadow-xl relative overflow-hidden"
        >
          <div className="relative z-10">
            <p className="text-sm font-medium leading-relaxed opacity-90">{memoizedSummary.overall_summary}</p>
          </div>
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
        </motion.div>
      </section>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetails && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDetails(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-white w-full max-w-md rounded-[40px] p-8 relative z-10 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 id="modal-title" className="text-xl font-bold">Field Details</h3>
                  <div className={cn(
                    "inline-block px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest mt-1",
                    memoizedSummary.soil.status === 'Critical' ? "bg-red-500 text-white" :
                    memoizedSummary.soil.status === 'Low' ? "bg-amber-500 text-white" :
                    memoizedSummary.soil.status === 'High' ? "bg-blue-500 text-white" :
                    "bg-emerald-500 text-white"
                  )}>
                    Overall Status: {memoizedSummary.soil.status}
                  </div>
                </div>
                <button 
                  onClick={() => setShowDetails(false)} 
                  aria-label="Close details modal"
                  className="p-2 bg-slate-100 rounded-full text-slate-400"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-3xl" aria-label={`Soil pH: ${memoizedSummary.soil.pH}`}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Soil pH</p>
                  <p className="text-2xl font-bold tracking-tighter">{memoizedSummary.soil.pH}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-3xl" aria-label={`Humidity: ${memoizedSummary.weather.humidity}%`}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Humidity</p>
                  <p className="text-2xl font-bold tracking-tighter">{memoizedSummary.weather.humidity}%</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-3xl" aria-label={`Moisture: ${memoizedSummary.soil.moisture}`}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Moisture</p>
                  <p className="text-2xl font-bold tracking-tighter">{memoizedSummary.soil.moisture}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-3xl" aria-label={`Wind Speed: ${memoizedSummary.weather.wind_speed} km/h`}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Wind Speed</p>
                  <p className="text-2xl font-bold tracking-tighter">{memoizedSummary.weather.wind_speed} km/h</p>
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-[32px] space-y-4" aria-label="NPK Levels">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">NPK Levels</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center" aria-label={`Nitrogen: ${memoizedSummary.soil.NPK.N}`}>
                    <div className="w-full bg-emerald-100 rounded-full h-1.5 mb-2 overflow-hidden">
                      <div className="bg-emerald-500 h-full" style={{ width: `${(memoizedSummary.soil.NPK.N / 20) * 100}%` }} />
                    </div>
                    <p className="text-[10px] font-bold text-slate-400">N: {memoizedSummary.soil.NPK.N}</p>
                  </div>
                  <div className="text-center" aria-label={`Phosphorus: ${memoizedSummary.soil.NPK.P}`}>
                    <div className="w-full bg-blue-100 rounded-full h-1.5 mb-2 overflow-hidden">
                      <div className="bg-blue-500 h-full" style={{ width: `${(memoizedSummary.soil.NPK.P / 20) * 100}%` }} />
                    </div>
                    <p className="text-[10px] font-bold text-slate-400">P: {memoizedSummary.soil.NPK.P}</p>
                  </div>
                  <div className="text-center" aria-label={`Potassium: ${memoizedSummary.soil.NPK.K}`}>
                    <div className="w-full bg-amber-100 rounded-full h-1.5 mb-2 overflow-hidden">
                      <div className="bg-amber-500 h-full" style={{ width: `${(memoizedSummary.soil.NPK.K / 20) * 100}%` }} />
                    </div>
                    <p className="text-[10px] font-bold text-slate-400">K: {memoizedSummary.soil.NPK.K}</p>
                  </div>
                </div>
              </div>

              {memoizedSummary.soil.alerts.length > 0 && (
                <div className="space-y-2" aria-label="Soil Alerts">
                  <h4 className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Soil Alerts</h4>
                  {memoizedSummary.soil.alerts.map((alert, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-2 rounded-xl" role="alert">
                      <AlertCircle className="w-3 h-3" />
                      <span>{alert}</span>
                    </div>
                  ))}
                </div>
              )}

              <button 
                onClick={() => setShowDetails(false)}
                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-600/20"
              >
                Close Details
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
