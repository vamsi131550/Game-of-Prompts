import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Image as ImageIcon, Volume2, VolumeX, Loader2, User, Bot, Trash2, Leaf } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  role: 'user' | 'model';
  text: string;
  image?: string;
}

import { logger } from '../utils/logger';
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { SensorData } from '../services/sensorService';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

interface AIChatProps {
  weather?: WeatherData;
  sensorData?: SensorData;
}

export const AIChat: React.FC<AIChatProps> = ({ weather, sensorData }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const liveSessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const stopLiveSession = () => {
    if (liveSessionRef.current) {
      liveSessionRef.current.close();
      liveSessionRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsLiveActive(false);
  };

  const startLiveSession = async () => {
    try {
      setIsLiveActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const weatherContext = weather ? `Current Weather: ${weather.temperature}°C, ${getWeatherDescription(weather.weatherCode)}, Humidity: ${weather.humidity}%, Wind: ${weather.windSpeed}km/h.` : '';
      const sensorContext = sensorData ? `Field Sensors: Soil Moisture: ${sensorData.moisture}%, Soil Temp: ${sensorData.soilTemp}°C, pH: ${sensorData.soilPh}, Status: ${sensorData.status}.` : '';

      const sessionPromise = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-12-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: `You are a helpful agricultural assistant for Indian farmers. 
          ${weatherContext} ${sensorContext}
          Respond naturally and concisely in the language the farmer uses.`,
        },
        callbacks: {
          onopen: () => {
            const source = audioContext.createMediaStreamSource(stream);
            const processor = audioContext.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcm16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                pcm16[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
              }
              const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));
              sessionPromise.then(session => session.sendRealtimeInput({
                audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
              }));
            };

            source.connect(processor);
            processor.connect(audioContext.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              const binaryString = atob(base64Audio);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              const pcm16 = new Int16Array(bytes.buffer);
              const float32 = new Float32Array(pcm16.length);
              for (let i = 0; i < pcm16.length; i++) {
                float32[i] = pcm16[i] / 32768.0;
              }

              const buffer = audioContext.createBuffer(1, float32.length, 24000);
              buffer.getChannelData(0).set(float32);
              const source = audioContext.createBufferSource();
              source.buffer = buffer;
              source.connect(audioContext.destination);
              source.start();
            }

            if (message.serverContent?.interrupted) {
              // Handle interruption if needed
            }
          },
          onclose: () => stopLiveSession(),
          onerror: (err) => {
            logger.error('Live session error', { error: err });
            stopLiveSession();
          }
        }
      });

      liveSessionRef.current = await sessionPromise;
    } catch (err) {
      logger.error('Failed to start live session', { error: err });
      setIsLiveActive(false);
    }
  };

  const toggleLiveMode = () => {
    if (isLiveActive) {
      stopLiveSession();
    } else {
      startLiveSession();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const playAudio = async (text: string) => {
    try {
      setIsSpeaking(true);
      
      // Clean markdown for better TTS
      const cleanText = text
        .replace(/[*#_~`]/g, '') // Remove basic markdown
        .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links but keep text
        .replace(/(\r\n|\n|\r)/gm, " ") // Replace newlines with spaces
        .trim();

      // Truncate if too long (Gemini TTS has limits)
      const truncatedText = cleanText.length > 500 ? cleanText.substring(0, 500) + "..." : cleanText;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: truncatedText }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (base64Audio) {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const binaryString = window.atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Convert PCM16 to Float32
        const pcm16 = new Int16Array(bytes.buffer);
        const float32 = new Float32Array(pcm16.length);
        for (let i = 0; i < pcm16.length; i++) {
          float32[i] = pcm16[i] / 32768.0;
        }

        const audioBuffer = audioContext.createBuffer(1, float32.length, 24000);
        audioBuffer.getChannelData(0).set(float32);

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.onended = () => {
          setIsSpeaking(false);
          audioContext.close();
        };
        source.start();
      } else {
        setIsSpeaking(false);
      }
    } catch (error: Error) {
      logger.error('TTS error', { text: truncatedText }, error);
      // If it's a 500 error, it might be a transient issue or model limitation
      if (error.message?.includes('500') || (error as any).status === 500) {
        logger.warn('Gemini TTS encountered an internal error', { 
          reason: 'text complexity or transient server issues',
          textLength: cleanText.length 
        });
      }
      setIsSpeaking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
    if (e.key === 'Escape' && selectedImage) {
      setSelectedImage(null);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() && !selectedImage) return;

    const userMessage: Message = {
      role: 'user',
      text: input || (selectedImage ? "Please analyze this image." : ""),
      image: selectedImage || undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      const model = "gemini-3-flash-preview";
      
      // Format messages for Gemini API
      const contents = [...messages, userMessage].map(msg => {
        const parts: any[] = [{ text: msg.text || "Analyze this image." }];
        
        // If this is the current user message and it has an image, add it
        if (msg === userMessage && msg.image) {
          parts.push({
            inlineData: {
              data: msg.image.split(',')[1],
              mimeType: "image/jpeg"
            }
          });
        }
        
        return {
          role: msg.role === 'user' ? 'user' : 'model',
          parts
        };
      });

      const weatherContext = weather ? `Current Weather: ${weather.temperature}°C, ${getWeatherDescription(weather.weatherCode)}, Humidity: ${weather.humidity}%, Wind: ${weather.windSpeed}km/h.` : '';
      const sensorContext = sensorData ? `Field Sensors: Soil Moisture: ${sensorData.moisture}%, Soil Temp: ${sensorData.soilTemp}°C, pH: ${sensorData.soilPh}, Status: ${sensorData.status}.` : '';

      const responseStream = await ai.models.generateContentStream({
        model,
        contents,
        config: {
          tools: [
            { googleSearch: {} },
            { googleMaps: {} }
          ],
          systemInstruction: `You are a helpful agricultural assistant for Indian farmers. 
          ${weatherContext} ${sensorContext}
          
          CRITICAL INSTRUCTIONS:
          1. ALWAYS respond in the SAME LANGUAGE as the user's message (English, Telugu, Hindi, etc.).
          2. Use the provided weather and sensor data to contextually analyze images and answer questions. 
          3. Use Google Search and Google Maps tools to provide real-time information about market prices, nearby seed shops, or agricultural experts.
          4. Provide practical, easy-to-understand advice about crops, pests, weather, and farming techniques. 
          5. Keep responses concise and helpful.`,
        }
      });

      let fullText = "";
      const modelMessage: Message = {
        role: 'model',
        text: ""
      };

      setMessages(prev => [...prev, modelMessage]);

      for await (const chunk of responseStream) {
        if (chunk.text) {
          fullText += chunk.text;
          setMessages(prev => {
            const newMessages = [...prev];
            if (newMessages.length > 0) {
              newMessages[newMessages.length - 1] = {
                ...newMessages[newMessages.length - 1],
                text: fullText
              };
            }
            return newMessages;
          });
        }
      }
    } catch (error: Error) {
      logger.error('Chat error', { messageLength: input.length, hasImage: !!selectedImage }, error);
      setMessages(prev => [...prev, { role: 'model', text: `Sorry, I encountered an error: ${error.message}. Please try again.` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setSelectedImage(null);
    setInput('');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-slate-50">
      <header className="p-4 bg-white border-b border-slate-200 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-emerald-900">Farmer AI Assistant</h2>
          <p className="text-xs text-slate-500">Ask in any language • Context aware</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={clearChat}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                clearChat();
              }
            }}
            aria-label="Clear chat history"
            className="p-2 text-slate-400 hover:text-red-500 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
            title="Clear Chat"
            tabIndex={0}
          >
            <Trash2 size={20} />
          </button>
        </div>
      </header>

      <div 
        ref={scrollRef}
        role="log"
        aria-live="polite"
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-60">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
              <Bot size={32} />
            </div>
            <div>
              <p className="font-medium">Namaste! How can I help you today?</p>
              <p className="text-sm">You can ask about crop diseases, weather, or farming tips.</p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm relative group ${
              msg.role === 'user' 
                ? 'bg-emerald-600 text-white rounded-tr-none' 
                : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
            }`}>
              <div className="flex items-center gap-2 mb-1 opacity-60 text-[10px] font-bold uppercase tracking-wider">
                {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                {msg.role === 'user' ? 'You' : 'Assistant'}
              </div>
              
              {msg.image && (
                <img 
                  src={msg.image} 
                  alt="Uploaded" 
                  className="rounded-lg mb-2 max-h-48 w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              )}
              
              <div className="prose prose-sm max-w-none prose-emerald">
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>

              {msg.role === 'model' && (
                <button 
                  onClick={() => playAudio(msg.text)}
                  disabled={isSpeaking}
                  className="mt-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-600 hover:text-emerald-700 transition-colors disabled:opacity-50"
                >
                  <Volume2 size={12} />
                  {isSpeaking ? 'Speaking...' : 'Listen to Advice'}
                </button>
              )}
            </div>
          </motion.div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none p-3 shadow-sm flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-emerald-600" />
              <span className="text-sm text-slate-500">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-slate-200">
        <AnimatePresence>
          {selectedImage && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="relative mb-2"
            >
              <img 
                src={selectedImage} 
                alt="Preview" 
                className="h-20 w-20 object-cover rounded-lg border-2 border-emerald-500"
                referrerPolicy="no-referrer"
              />
              <button 
                onClick={() => setSelectedImage(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedImage(null);
                  }
                }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md focus:outline-none focus:ring-2 focus:ring-red-300"
                aria-label="Remove uploaded image"
                tabIndex={0}
              >
                <Trash2 size={12} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            aria-label="Upload image"
            className="p-2 text-slate-500 hover:text-emerald-600 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded"
            tabIndex={0}
          >
            <ImageIcon size={24} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            aria-hidden="true"
            onChange={handleImageUpload}
          />
          
          <div className="flex-1 relative">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your question..."
              aria-label="Type your message"
              className="w-full bg-slate-100 border-none rounded-full py-2 px-4 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <button 
              onClick={toggleLiveMode}
              aria-label={isLiveActive ? "Stop voice mode" : "Start voice mode"}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors ${
                isLiveActive ? 'bg-red-100 text-red-600 animate-pulse' : 'text-slate-400 hover:text-emerald-600'
              }`}
              title={isLiveActive ? "Stop Live Conversation" : "Start Live Conversation"}
            >
              {isLiveActive ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          </div>

          <button 
            onClick={sendMessage}
            disabled={isLoading || (!input.trim() && !selectedImage)}
            aria-label="Send message"
            className="bg-emerald-600 text-white p-2 rounded-full disabled:opacity-50 shadow-md hover:bg-emerald-700 transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
