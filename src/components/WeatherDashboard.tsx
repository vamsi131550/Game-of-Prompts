import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { Cloud, Sun, CloudRain, Wind, Droplets, Thermometer } from 'lucide-react';
import { motion } from 'motion/react';

const mockForecast = [
  { day: 'Mon', temp: 24, humidity: 65, rain: 10 },
  { day: 'Tue', temp: 26, humidity: 60, rain: 5 },
  { day: 'Wed', temp: 22, humidity: 80, rain: 40 },
  { day: 'Thu', temp: 21, humidity: 85, rain: 60 },
  { day: 'Fri', temp: 25, humidity: 70, rain: 20 },
  { day: 'Sat', temp: 28, humidity: 55, rain: 0 },
  { day: 'Sun', temp: 27, humidity: 58, rain: 5 },
];

const mockHistory = [
  { time: '6am', temp: 18 },
  { time: '9am', temp: 21 },
  { time: '12pm', temp: 25 },
  { time: '3pm', temp: 27 },
  { time: '6pm', temp: 24 },
  { time: '9pm', temp: 20 },
];

export const WeatherDashboard: React.FC = () => {
  return (
    <div className="space-y-6 pb-24">
      <header className="px-4 pt-4">
        <h2 className="text-2xl font-bold tracking-tight">Weather Insights</h2>
        <p className="text-black/40 text-sm">Previous 24h and 7-day forecast</p>
      </header>

      {/* Current Highlights */}
      <div className="grid grid-cols-2 gap-4 px-4" role="region" aria-label="Current Weather Highlights">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-4 rounded-2xl border border-black/5 shadow-sm"
          role="status"
          aria-label="Average Temperature"
        >
          <div className="flex items-center gap-2 mb-2">
            <Thermometer className="w-4 h-4 text-amber-500" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-wider text-black/40">Avg Temp</span>
          </div>
          <p className="text-2xl font-semibold">24.5°C</p>
          <p className="text-[10px] text-emerald-600 font-bold mt-1">+1.2° from yesterday</p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-4 rounded-2xl border border-black/5 shadow-sm"
          role="status"
          aria-label="Rain Probability"
        >
          <div className="flex items-center gap-2 mb-2">
            <CloudRain className="w-4 h-4 text-blue-500" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-wider text-black/40">Rain Prob</span>
          </div>
          <p className="text-2xl font-semibold">15%</p>
          <p className="text-[10px] text-black/40 font-bold mt-1">Low chance of rain</p>
        </motion.div>
      </div>

      {/* Previous 24h Chart */}
      <section 
        className="bg-white mx-4 p-6 rounded-3xl border border-black/5 shadow-sm"
        aria-labelledby="temp-trend-title"
      >
        <h3 id="temp-trend-title" className="text-sm font-bold uppercase tracking-wider text-black/40 mb-6">Temperature Trend (24h)</h3>
        <div className="h-48 w-full min-w-0 min-h-[192px]" role="img" aria-label="Area chart showing temperature trend over the last 24 hours.">
          <ResponsiveContainer width="100%" height="100%" aspect={2}>
            <AreaChart data={mockHistory}>
              <defs>
                <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="temp" stroke="#10b981" fillOpacity={1} fill="url(#colorTemp)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 7-Day Forecast */}
      <section 
        className="px-4 space-y-4"
        aria-labelledby="forecast-title"
      >
        <h3 id="forecast-title" className="text-sm font-bold uppercase tracking-wider text-black/40">7-Day Forecast</h3>
        <div className="space-y-3" role="list">
          {mockForecast.map((day, i) => (
            <motion.div 
              key={day.day}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white p-4 rounded-2xl border border-black/5 flex items-center justify-between shadow-sm"
              role="listitem"
              aria-label={`${day.day}: ${day.temp} degrees, ${day.humidity}% humidity, ${day.rain > 30 ? 'Rainy' : day.temp > 26 ? 'Sunny' : 'Cloudy'}`}
            >
              <div className="flex items-center gap-4">
                <span className="w-10 font-bold text-sm" aria-hidden="true">{day.day}</span>
                {day.rain > 30 ? <CloudRain className="w-5 h-5 text-blue-500" aria-hidden="true" /> : day.temp > 26 ? <Sun className="w-5 h-5 text-amber-500" aria-hidden="true" /> : <Cloud className="w-5 h-5 text-slate-400" aria-hidden="true" />}
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-1.5">
                  <Droplets className="w-3 h-3 text-blue-400" aria-hidden="true" />
                  <span className="text-xs font-semibold text-black/60">{day.humidity}%</span>
                </div>
                <span className="text-sm font-bold w-8 text-right">{day.temp}°</span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};
