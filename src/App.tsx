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
  History,
  Bell,
  Search,
  LogOut,
  LogIn,
  MessageCircle,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getWeatherData, getWeatherAdvice, WeatherData } from './services/weatherService';
import { analyzeCropImage, AnalysisResult } from './services/geminiService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { BottomNav } from './components/BottomNav';
import { WeatherDashboard } from './components/WeatherDashboard';
import { FarmersVoice } from './components/FarmersVoice';
import { AIChat } from './components/AIChat';
import { SensorDashboard } from './components/SensorDashboard';
import { HomeDashboard } from './components/HomeDashboard';
import { auth, db, googleProvider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { getLatestSensorData, SensorData } from './services/sensorService';
import { useWeather } from './hooks/useWeather';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface HistoryItem {
  id: string;
  timestamp: number;
  image: string;
  result: AnalysisResult;
  uid?: string;
}

import { logger } from './utils/logger';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('Uncaught error:', { error: error.message, stack: error.stack, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-red-50">
          <AlertCircle className="w-12 h-12 text-red-600 mb-4" />
          <h1 className="text-xl font-bold text-red-900 mb-2">Something went wrong</h1>
          <p className="text-sm text-red-700 mb-6">
            {this.state.error?.message?.startsWith('{') 
              ? "A database error occurred. Our team has been notified."
              : "An unexpected error occurred. Please try refreshing the page."}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-red-600 text-white rounded-full font-bold shadow-lg hover:bg-red-700 transition-all"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const { weather, error: weatherError, loading: weatherLoading } = useWeather();
  const sensorData = getLatestSensorData();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setHistory([]);
      return;
    }

    const q = query(
      collection(db, 'crop_history'),
      where('uid', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => doc.data() as HistoryItem);
      setHistory(items);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'crop_history');
      setError("Failed to load history.");
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        // User closed the popup, no need to show an error message
        return;
      }
      logger.error('Login failed', { error: err });
      setError("Login failed. Please try again.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err: unknown) {
      logger.error('Logout failed', { error: err });
    }
  };

  const compressImage = (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user) {
      setError("Please login to analyze crops.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const originalBase64 = reader.result as string;
      setIsAnalyzing(true);
      setAnalysisResult(null);
      setError(null);
      setActiveTab('scan');

      try {
        const compressedBase64 = await compressImage(originalBase64);
        setPreviewImage(compressedBase64);
        
        const result = await analyzeCropImage(compressedBase64, 'image/jpeg');
        setAnalysisResult(result);
        
        if (user) {
          const newItem: HistoryItem = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            image: compressedBase64,
            result,
            uid: user.uid
          };
          await addDoc(collection(db, 'crop_history'), newItem);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'crop_history');
        setError("AI analysis failed. Please try again.");
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'weather':
        return <WeatherDashboard />;
      case 'chat':
        return <AIChat weather={weather || undefined} sensorData={sensorData} />;
      case 'sensors':
        return <SensorDashboard />;
      case 'voice':
        return <FarmersVoice />;
      case 'history':
        return (
          <div className="px-4 space-y-6 pb-24 pt-4">
            <header>
              <h2 className="text-2xl font-bold tracking-tight">Scan History</h2>
              <p className="text-black/40 text-sm">Your previous crop health checks</p>
            </header>
            {history.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {history.map((item) => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-4 rounded-2xl border border-black/5 flex gap-4 shadow-sm"
                    onClick={() => {
                      setPreviewImage(item.image);
                      setAnalysisResult(item.result);
                      setActiveTab('scan');
                    }}
                  >
                    <img src={item.image} className="w-20 h-20 rounded-xl object-cover" referrerPolicy="no-referrer" />
                    <div className="flex-1 py-1">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-sm">{item.result.diagnosis}</h4>
                        <span className="text-[10px] text-black/40 font-bold">{new Date(item.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-black/60 line-clamp-2 mt-1">{item.result.advice}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-black/20">
                <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No history yet. Start scanning your crops!</p>
              </div>
            )}
          </div>
        );
      case 'scan':
        return (
          <div className="px-4 space-y-6 pb-24 pt-4">
            <header>
              <h2 className="text-2xl font-bold tracking-tight">Crop Scanner</h2>
              <p className="text-black/40 text-sm">Instant AI disease detection</p>
            </header>
            
            <section className="bg-white rounded-3xl border-2 border-dashed border-black/10 p-8 text-center transition-all hover:border-emerald-500/50 group">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                aria-hidden="true"
                onChange={handleImageUpload} 
              />
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="text-emerald-600 w-8 h-8" />
              </div>
              <h3 className="font-bold mb-2">Upload Photo</h3>
              <p className="text-black/40 text-xs mb-6">Clear photo of leaf or stem</p>
              <button 
                onClick={triggerUpload}
                disabled={isAnalyzing}
                aria-label={isAnalyzing ? "Analyzing image" : "Select image to upload"}
                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {isAnalyzing ? "Analyzing..." : "Select Image"}
              </button>
            </section>

            <AnimatePresence>
              {(previewImage || analysisResult) && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-3xl border border-black/5 overflow-hidden shadow-sm"
                >
                  <div className="aspect-square bg-slate-100 relative">
                    {previewImage && <img src={previewImage} className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
                    {isAnalyzing && (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center text-white">
                        <div className="text-center">
                          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-2" />
                          <p className="font-bold">AI Scanning...</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {analysisResult && (
                    <div className="p-6 space-y-4">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                          analysisResult.healthStatus === 'Healthy' ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                        )}>
                          {analysisResult.healthStatus}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold">{analysisResult.diagnosis}</h3>
                      <p className="text-sm text-black/60 leading-relaxed">{analysisResult.advice}</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      default:
        return <HomeDashboard weather={weather} sensorData={sensorData} onLogin={handleLogin} />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#FDFCF8] text-[#1A1A1A] font-sans selection:bg-emerald-100 pb-10">
        {/* Mobile Container */}
        <div className="max-w-md mx-auto min-h-screen relative bg-[#FDFCF8] shadow-2xl shadow-black/5">
          <main className="min-h-screen">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </main>

          <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>

        {/* Error Toast */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] bg-red-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 w-[90%] max-w-sm"
            >
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs font-medium">{error}</span>
              <button onClick={() => setError(null)} className="ml-auto text-white/60 hover:text-white">✕</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
