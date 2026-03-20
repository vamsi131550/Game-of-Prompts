import React, { useState } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { Droplets, Thermometer, Wind, Activity, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

const mockSensorHistory = [
  { time: '6am', moisture: 45, nitrogen: 12, phosphorus: 8, potassium: 15 },
  { time: '9am', moisture: 42, nitrogen: 12, phosphorus: 8, potassium: 15 },
  { time: '12pm', moisture: 38, nitrogen: 11, phosphorus: 7, potassium: 14 },
  { time: '3pm', moisture: 35, nitrogen: 11, phosphorus: 7, potassium: 14 },
  { time: '6pm', moisture: 48, nitrogen: 13, phosphorus: 9, potassium: 16 },
  { time: '9pm', moisture: 50, nitrogen: 13, phosphorus: 9, potassium: 16 },
];

const mockSensorForecast = [
  { time: 'Next 6h', moisture: 45, nitrogen: 12, phosphorus: 8, potassium: 15 },
  { time: 'Next 12h', moisture: 40, nitrogen: 11, phosphorus: 7, potassium: 14 },
  { time: 'Next 18h', moisture: 35, nitrogen: 10, phosphorus: 6, potassium: 13 },
  { time: 'Next 24h', moisture: 30, nitrogen: 9, phosphorus: 5, potassium: 12 },
];

const npkData = [
  { name: 'Nitrogen (N)', value: 12, color: '#ef4444' },
  { name: 'Phosphorus (P)', value: 8, color: '#3b82f6' },
  { name: 'Potassium (K)', value: 15, color: '#f59e0b' },
];

export const SensorDashboard: React.FC = () => {
  const [view, setView] = useState<'history' | 'forecast'>('history');
  const currentData = view === 'history' ? mockSensorHistory : mockSensorForecast;

  return (
    <div className="space-y-6 pb-24 bg-slate-50 min-h-screen">
      <header className="px-4 pt-6">
        <h2 className="text-2xl font-bold text-emerald-900 tracking-tight">Crop Sensors</h2>
        <p className="text-slate-500 text-sm">Real-time monitoring of your field</p>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 px-4" role="region" aria-label="Current sensor readings">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm"
          role="status"
          aria-label="Soil Moisture: 42%, Needs watering soon"
        >
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="w-4 h-4 text-blue-500" aria-hidden="true" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Soil Moisture</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">42%</p>
          <div className="flex items-center gap-1 mt-1">
            <AlertTriangle className="w-3 h-3 text-amber-500" aria-hidden="true" />
            <span className="text-[10px] text-amber-600 font-bold">Needs watering soon</span>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm"
          role="status"
          aria-label="NPK Health: Optimal, Nutrients balanced"
        >
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-emerald-500" aria-hidden="true" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">NPK Health</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">Optimal</p>
          <div className="flex items-center gap-1 mt-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" aria-hidden="true" />
            <span className="text-[10px] text-emerald-600 font-bold">Nutrients balanced</span>
          </div>
        </motion.div>
      </div>

      {/* NPK Bar Chart */}
      <section 
        className="bg-white mx-4 p-6 rounded-3xl border border-slate-100 shadow-sm"
        aria-labelledby="npk-chart-title"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 id="npk-chart-title" className="text-xs font-bold uppercase tracking-wider text-slate-400">Nutrient Levels (NPK)</h3>
          <Info className="w-4 h-4 text-slate-300" aria-hidden="true" />
        </div>
        <div className="h-48 w-full min-w-0 min-h-[192px]" role="img" aria-label="Bar chart showing Nitrogen, Phosphorus, and Potassium levels. Nitrogen is at 12, Phosphorus at 8, and Potassium at 15.">
          <ResponsiveContainer width="100%" height="100%" aspect={2}>
            <BarChart data={npkData} layout="vertical">
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} width={80} />
              <Tooltip 
                cursor={{fill: 'transparent'}}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                {npkData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Moisture Trend Chart */}
      <section 
        className="bg-white mx-4 p-6 rounded-3xl border border-slate-100 shadow-sm"
        aria-labelledby="moisture-trend-title"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 id="moisture-trend-title" className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Soil Moisture {view === 'history' ? 'Trend (24h)' : 'Forecast (24h)'}
          </h3>
          <div className="flex bg-slate-100 p-1 rounded-lg" role="tablist" aria-label="Chart view options">
            <button 
              role="tab"
              aria-selected={view === 'history'}
              aria-controls="moisture-chart"
              onClick={() => setView('history')}
              className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${view === 'history' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
            >
              History
            </button>
            <button 
              role="tab"
              aria-selected={view === 'forecast'}
              aria-controls="moisture-chart"
              onClick={() => setView('forecast')}
              className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${view === 'forecast' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
            >
              Forecast
            </button>
          </div>
        </div>
        <div id="moisture-chart" className="h-48 w-full min-w-0 min-h-[192px]" role="img" aria-label={`Line chart showing soil moisture ${view === 'history' ? 'history' : 'forecast'} for the next 24 hours.`}>
          <ResponsiveContainer width="100%" height="100%" aspect={2}>
            <LineChart data={currentData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
              <YAxis hide domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
              />
              <Line 
                type="monotone" 
                dataKey="moisture" 
                stroke="#3b82f6" 
                strokeWidth={3} 
                dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} 
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] text-slate-400 mt-4 text-center italic" aria-live="polite">
          {view === 'history' ? 'Based on actual field sensors' : 'Predicted based on weather and soil absorption'}
        </p>
      </section>

      {/* Detailed Stats */}
      <div className="px-4 space-y-3" role="region" aria-label="Additional soil statistics">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm" role="status" aria-label="Soil Temperature: 22.4°C, Normal">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center text-amber-600" aria-hidden="true">
              <Thermometer size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Soil Temp</p>
              <p className="text-lg font-bold text-slate-800">22.4°C</p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Normal</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm" role="status" aria-label="Soil pH: 6.8, Healthy">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600" aria-hidden="true">
              <Wind size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Soil pH</p>
              <p className="text-lg font-bold text-slate-800">6.8</p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Healthy</span>
        </div>
      </div>
    </div>
  );
};
