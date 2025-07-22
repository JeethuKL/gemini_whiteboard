import { useState, useEffect, useRef, useCallback } from "react";
import { LiveConnectConfig } from "@google/genai";
import { GeminiLiveClient, LiveClientOptions } from "../lib/gemini-live-client";
import { AudioRecorder } from "../lib/audio-recorder";
import { AudioStreamer } from "../lib/audio-streamer";
import { GeminiLiveState } from "../types/gemini-live";

export interface UseGeminiLiveResult {
  state: GeminiLiveState;
  connect: () => Promise<void>;
  disconnect: () => void;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  setConfig: (config: LiveConnectConfig) => void;
  setModel: (model: string) => void;
  volume: number;
}

export function useGeminiLive(options: LiveClientOptions): UseGeminiLiveResult {
  const clientRef = useRef<GeminiLiveClient | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioStreamerRef = useRef<AudioStreamer | null>(null);

  const [model, setModel] = useState<string>("models/gemini-2.0-flash-exp");
  const [config, setConfig] = useState<LiveConnectConfig>({
    systemInstruction: {
      parts: [
        {
          text: "You are a helpful AI assistant integrated into a digital whiteboard. You can see and discuss the content on the whiteboard, help users brainstorm ideas, explain concepts, and provide assistance with their work. Be concise but helpful in your responses.",
        },
      ],
    },
  });

  const [state, setState] = useState<GeminiLiveState>({
    isConnected: false,
    isRecording: false,
    isSpeaking: false,
  });

  const [volume, setVolume] = useState(0);

  const setupEventListeners = useCallback(() => {
    if (!clientRef.current) return;

    const onOpen = () => {
      setState((prev) => ({ ...prev, isConnected: true, error: undefined }));
    };

    const onClose = () => {
      setState((prev) => ({ ...prev, isConnected: false, isRecording: false }));
    };

    const onError = (error: ErrorEvent) => {
      console.error("Gemini Live error:", error);
      setState((prev) => ({
        ...prev,
        error: error.message || "Connection error",
        isConnected: false,
        isRecording: false,
      }));
    };

    const onAudio = (data: ArrayBuffer) => {
      setState((prev) => ({ ...prev, isSpeaking: true }));
      audioStreamerRef.current?.addPCM16(new Uint8Array(data));
    };

    const onContent = (data: any) => {
      console.log("Received content:", data);
      if (data.modelTurn?.parts) {
        const textParts = data.modelTurn.parts.filter((part: any) => part.text);
        if (textParts.length > 0) {
          const responseText = textParts
            .map((part: any) => part.text)
            .join(" ");
          setState((prev) => ({
            ...prev,
            response: responseText,
            isSpeaking: false,
          }));
        }
      }
    };

    const onInterrupted = () => {
      audioStreamerRef.current?.stop();
      setState((prev) => ({ ...prev, isSpeaking: false }));
    };

    const onTurnComplete = () => {
      setState((prev) => ({ ...prev, isSpeaking: false }));
    };

    clientRef.current
      .on("open", onOpen)
      .on("close", onClose)
      .on("error", onError)
      .on("audio", onAudio)
      .on("content", onContent)
      .on("interrupted", onInterrupted)
      .on("turncomplete", onTurnComplete);
  }, []);

  // Initialize/update client when API key changes
  useEffect(() => {
    if (options.apiKey && options.apiKey.trim() !== "") {
      console.log(
        "Creating client with API key:",
        options.apiKey.substring(0, 10) + "..."
      );

      // Disconnect existing client if connected
      if (clientRef.current && clientRef.current.status === "connected") {
        clientRef.current.disconnect();
      }

      // Create new client with updated API key
      clientRef.current = new GeminiLiveClient(options);
      setupEventListeners();
    }
  }, [options.apiKey, setupEventListeners]);

  // Initialize audio streamer
  useEffect(() => {
    const initAudioStreamer = async () => {
      if (!audioStreamerRef.current) {
        try {
          audioStreamerRef.current = await AudioStreamer.create();
        } catch (error) {
          console.error("Failed to initialize audio streamer:", error);
          setState((prev) => ({
            ...prev,
            error: "Failed to initialize audio system",
          }));
        }
      }
    };

    initAudioStreamer();
  }, []);

  const connect = useCallback(async () => {
    if (!config || !clientRef.current) {
      throw new Error("Config has not been set or client not initialized");
    }

    console.log(
      "Attempting to connect with API key:",
      options.apiKey?.substring(0, 10) + "..."
    );
    setState((prev) => ({ ...prev, error: undefined }));
    clientRef.current.disconnect();

    try {
      await clientRef.current.connect(model, config);
      console.log("Connected successfully!");
    } catch (error) {
      console.error("Failed to connect:", error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to connect",
      }));
    }
  }, [config, model, options.apiKey]);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
    }
    if (audioRecorderRef.current?.recording) {
      audioRecorderRef.current.stop();
    }
    audioStreamerRef.current?.stop();
    setState((prev) => ({
      ...prev,
      isConnected: false,
      isRecording: false,
      isSpeaking: false,
    }));
  }, []);

  const startRecording = useCallback(async () => {
    if (!state.isConnected || !clientRef.current) {
      throw new Error("Not connected to Gemini Live");
    }

    try {
      if (!audioRecorderRef.current) {
        audioRecorderRef.current = new AudioRecorder(16000);

        audioRecorderRef.current.on("data", (base64Data: string) => {
          if (clientRef.current) {
            clientRef.current.sendRealtimeInput([
              { mimeType: "audio/pcm", data: base64Data },
            ]);
          }
        });

        audioRecorderRef.current.on("volume", (vol: number) => {
          setVolume(vol);
        });
      }

      await audioRecorderRef.current.start();
      setState((prev) => ({ ...prev, isRecording: true }));
    } catch (error) {
      console.error("Failed to start recording:", error);
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "Failed to start recording",
      }));
    }
  }, [state.isConnected]);

  const stopRecording = useCallback(() => {
    if (audioRecorderRef.current?.recording) {
      audioRecorderRef.current.stop();
      setState((prev) => ({ ...prev, isRecording: false }));
      setVolume(0);
    }
  }, []);

  return {
    state,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    setConfig,
    setModel,
    volume,
  };
}
