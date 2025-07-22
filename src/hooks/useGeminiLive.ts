import { useState, useEffect, useRef, useCallback } from "react";
import { LiveConnectConfig } from "@google/genai";
import { GeminiLiveClient, LiveClientOptions } from "../lib/gemini-live-client";
import { AudioRecorder } from "../lib/audio-recorder";
import { AudioStreamer } from "../lib/audio-streamer";
import { GeminiLiveState } from "../types/gemini-live";
import { WhiteboardData } from "../types/whiteboard";
import {
  whiteboardTools,
  processWhiteboardToolCall,
} from "../tools/whiteboard-tools";

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

export function useGeminiLive(
  options: LiveClientOptions,
  onWhiteboardUpdate?: (data: WhiteboardData) => void
): UseGeminiLiveResult {
  const clientRef = useRef<GeminiLiveClient | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioStreamerRef = useRef<AudioStreamer | null>(null);

  const [model, setModel] = useState<string>("models/gemini-2.0-flash-exp");
  const [config, setConfig] = useState<LiveConnectConfig>({
    systemInstruction: {
      parts: [
        {
          text: `You are a helpful AI assistant integrated into a Kanban-style digital whiteboard for project management. The whiteboard has three columns:

**KANBAN LAYOUT:**
- � **TO DO Column** (x: 60-380): Tasks that need to be started (yellow sticky notes)
- � **IN PROGRESS Column** (x: 420-740): Tasks currently being worked on (orange sticky notes)  
- ✅ **DONE Column** (x: 780-1100): Completed tasks (green sticky notes)

**CURRENT PROJECT:**
- 🚀 Project: Digital Whiteboard App - Sprint 3 Q1 2025
- 🎯 Goal: AI Integration & Kanban Features

**YOUR CAPABILITIES:**
1. **Intelligent Task Placement** - Place tasks in correct columns based on status
2. **Project Management** - Help organize tasks, set priorities, track progress
3. **Task Creation** - Add new tasks to appropriate columns
4. **Status Updates** - Move tasks between columns as status changes
5. **Sprint Planning** - Help with backlog grooming and sprint planning

**COLUMN POSITIONING RULES:**
- **TO DO tasks**: x: 100, color: "yellow"
- **IN PROGRESS tasks**: x: 460, color: "orange"  
- **DONE tasks**: x: 820, color: "green"
- **Y positions**: Start at 180, then 270, 360, 450, etc. (90px spacing)

**WHEN USERS SAY:**
- "I need to do X" → Add to TO DO column (x: 100)
- "I'm working on Y" → Add to IN PROGRESS column (x: 460)
- "I finished Z" → Add to DONE column (x: 820)
- "Move X to in progress" → Update existing task position and color
- "Mark Y as done" → Move task to DONE column
- "Add a new task" → Add to TO DO by default
- "What should I work on next?" → Suggest tasks from TO DO column

Always use the update_whiteboard tool to create tasks with proper Kanban positioning. Be proactive in organizing tasks and maintaining the Kanban structure.`,
        },
      ],
    },
    tools: [{ functionDeclarations: whiteboardTools }],
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

    const onToolCall = (toolCall: any) => {
      console.log("🔧 Tool call received:", toolCall);

      try {
        if (toolCall.functionCalls) {
          toolCall.functionCalls.forEach((call: any) => {
            if (call.name === "update_whiteboard") {
              console.log("📝 Processing whiteboard update:", call.args);

              // Send success response back to Gemini
              clientRef.current?.sendToolResponse({
                functionResponses: [
                  {
                    name: call.name,
                    id: call.id,
                    response: {
                      success: true,
                      message: "Whiteboard updated successfully",
                    },
                  },
                ],
              });

              // Trigger whiteboard update callback
              if (call.args) {
                console.log(
                  "🎨 Calling whiteboard update with args:",
                  call.args
                );

                // Try global function first (main method)
                if ((window as any).updateWhiteboardFromGemini) {
                  (window as any).updateWhiteboardFromGemini(call.args);
                } else if (onWhiteboardUpdate) {
                  // Fallback to callback if provided
                  onWhiteboardUpdate(call.args);
                } else {
                  console.warn("⚠️ No whiteboard update handler available");
                }
              }
            }
          });
        }
      } catch (error) {
        console.error("❌ Error processing tool call:", error);

        // Send error response back to Gemini
        if (toolCall.functionCalls) {
          clientRef.current?.sendToolResponse({
            functionResponses: toolCall.functionCalls.map((call: any) => ({
              name: call.name,
              id: call.id,
              response: {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
              },
            })),
          });
        }
      }
    };

    clientRef.current
      .on("open", onOpen)
      .on("close", onClose)
      .on("error", onError)
      .on("audio", onAudio)
      .on("content", onContent)
      .on("interrupted", onInterrupted)
      .on("turncomplete", onTurnComplete)
      .on("toolcall", onToolCall);
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
