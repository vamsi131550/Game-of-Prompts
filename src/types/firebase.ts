export interface FirebaseConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId: string;
  storageBucket: string;
  messagingSenderId: string;
  measurementId: string;
}

export interface VoiceNote {
  id: string;
  url: string;
  timestamp: number;
  duration: number;
  author: string;
  authorUid: string;
}

export interface CropAnalysis {
  id: string;
  timestamp: number;
  image: string;
  result: {
    disease?: string;
    confidence?: number;
    recommendations?: string[];
  };
  uid: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  image: string;
  result: {
    disease?: string;
    confidence?: number;
    recommendations?: string[];
  };
  uid?: string;
}

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  tenantId: string | null;
  providerData: ProviderInfo[];
}

export interface ProviderInfo {
  providerId: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}
