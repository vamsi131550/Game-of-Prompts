import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, Volume2, User, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, storage } from '../firebase';
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface VoiceNote {
  id: string;
  url: string;
  timestamp: number;
  duration: number;
  author: string;
}

export const FarmersVoice: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'voice_notes'),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as VoiceNote[];
      setVoiceNotes(notes);
    });

    return () => unsubscribe();
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.current.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.current.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        
        if (!auth.currentUser) return;

        // Upload to Storage
        const storageRef = ref(storage, `voice_notes/${Date.now()}.webm`);
        await uploadBytes(storageRef, blob);
        const url = await getDownloadURL(storageRef);

        // Save to Firestore
        await addDoc(collection(db, 'voice_notes'), {
          url,
          timestamp: Date.now(),
          duration: recordingTime,
          author: auth.currentUser.displayName || 'Farmer',
          authorUid: auth.currentUser.uid
        });

        setRecordingTime(0);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      timerInterval.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };

  const togglePlay = (note: VoiceNote) => {
    if (playingId === note.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(note.url);
      audioRef.current.play();
      setPlayingId(note.id);
      audioRef.current.onended = () => setPlayingId(null);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      if (timerInterval.current) clearInterval(timerInterval.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 pb-24">
      <header className="px-4 pt-4">
        <h2 className="text-2xl font-bold tracking-tight">Farmer's Voice</h2>
        <p className="text-black/40 text-sm">Share and listen to community advice</p>
      </header>

      {/* Recording Section */}
      <section className="mx-4 bg-emerald-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 text-center space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Record Advice</h3>
            <p className="text-emerald-100/60 text-xs">Share your experience with other farmers</p>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="text-4xl font-light tracking-tighter font-mono">
              {formatTime(recordingTime)}
            </div>
            
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                isRecording ? 'bg-red-500 animate-pulse' : 'bg-white text-emerald-900'
              }`}
              aria-label={isRecording ? 'Stop Recording' : 'Start Recording'}
            >
              {isRecording ? <Square className="w-8 h-8 fill-current" /> : <Mic className="w-8 h-8" />}
            </button>
            
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-100/40">
              {isRecording ? 'Recording in progress...' : 'Tap to start recording'}
            </p>
          </div>
        </div>
        <Volume2 className="absolute -bottom-4 -right-4 w-32 h-32 text-emerald-800/30 -rotate-12" />
      </section>

      {/* Community Feed */}
      <section className="px-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-black/40">Community Feed</h3>
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">New Updates</span>
        </div>

        <div className="space-y-3">
          {voiceNotes.map((note) => (
            <motion.div 
              key={note.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-4 rounded-2xl border border-black/5 flex items-center gap-4 shadow-sm"
            >
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-black/20">
                <User className="w-6 h-6" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{note.author}</span>
                  <div className="flex items-center gap-1 text-[10px] text-black/40 font-bold">
                    <Clock className="w-3 h-3" />
                    {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => togglePlay(note)}
                    className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center"
                    aria-label={playingId === note.id ? `Pause voice note from ${note.author}` : `Play voice note from ${note.author}`}
                  >
                    {playingId === note.id ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                  </button>
                  <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className={cn("h-full bg-emerald-500 transition-all duration-300", playingId === note.id ? "w-full" : "w-0")} />
                  </div>
                  <span className="text-[10px] font-bold text-black/40">{formatTime(note.duration)}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};
