export interface GeminiLiveConfig {
  apiKey: string;
  model?: string;
  systemInstruction?: string;
}

export interface GeminiLiveState {
  isConnected: boolean;
  isRecording: boolean;
  isSpeaking: boolean;
  error?: string;
  transcript?: string;
  response?: string;
}

export type GeminiLiveStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export interface AudioChunk {
  mimeType: string;
  data: string;
}

export interface StreamingLog {
  date: Date;
  type: string;
  message: any;
}
