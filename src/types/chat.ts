export interface Message {
  role: 'user' | 'model';
  text: string;
  image?: string;
  timestamp?: number;
}

export interface ChatSession {
  id: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface AudioContextState {
  context: AudioContext | null;
  processor: ScriptProcessorNode | null;
  source: MediaStreamAudioSourceNode | null;
}

export interface LiveSessionConfig {
  model: string;
  config: {
    responseModalities: string[];
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: string;
        };
      };
    };
    systemInstruction: string;
  };
}

export interface AudioBuffer {
  data: Int16Array;
  sampleRate: number;
}

export interface TTSRequest {
  text: string;
  voiceName: string;
  sampleRate: number;
}

export interface TTSResponse {
  audioData: string;
  mimeType: string;
}
