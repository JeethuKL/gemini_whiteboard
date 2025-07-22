import { useState, useEffect, useRef, useCallback } from "react";
import { LiveConnectConfig } from "@google/genai";
import { GeminiLiveClient, LiveClientOptions } from "../lib/gemini-live-client";
import { AudioRecorder } from "../lib/audio-recorder";
import { AudioStreamer } from "../lib/audio-streamer";
import { GeminiLiveState } from "../types/gemini-live";
import { WhiteboardData } from "../types/whiteboard";
import { whiteboardTools, processToolCall } from "../tools/whiteboard-tools";

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

**CRITICAL: YOU MUST USE TOOLS FOR ALL TASK OPERATIONS**

**AVAILABLE TOOLS:**
1. **get_whiteboard_info** - Search and find existing tasks by text content
2. **move_task** - Move existing tasks between columns (easiest for moving)
3. **update_whiteboard** - Add new tasks or bulk operations

**WORKFLOW FOR MOVING TASKS:**
When user says "move X to done" or "mark Y as complete":
1. FIRST use get_whiteboard_info to find the task (optional but helpful for verification)
2. THEN use move_task with taskText and targetColumn

**WHEN USERS SAY:**
- "I need to do X" → ALWAYS call update_whiteboard tool to add to TO DO column (x: 100)
- "I'm working on Y" → ALWAYS call update_whiteboard tool to add to IN PROGRESS column (x: 460)
- "I finished Z" → ALWAYS call update_whiteboard tool to add to DONE column (x: 820)
- "Move X to in progress" → ALWAYS call move_task tool with taskText="X" and targetColumn="inprogress"
- "Mark Y as done" → ALWAYS call move_task tool with taskText="Y" and targetColumn="done"
- "What tasks are in progress?" → ALWAYS call get_whiteboard_info with query="progress" and column="inprogress"
- "Find task about API" → ALWAYS call get_whiteboard_info with query="API"

**TOOL USAGE EXAMPLES:**
- To move existing task: Call move_task with taskText (partial match is fine) and targetColumn
- To add new task: Call update_whiteboard with action:"add" and elements array with proper x,y,color
- To find tasks: Call get_whiteboard_info with search query and optional column filter

ALWAYS use tools - never just describe what should happen, actually DO IT with the tool calls.`,
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
      console.log("🔍 Tool call details:", JSON.stringify(toolCall, null, 2));

      try {
        if (toolCall.functionCalls) {
          console.log("✅ Processing functionCalls:", toolCall.functionCalls);

          toolCall.functionCalls.forEach((call: any) => {
            console.log(
              "📞 Processing function call:",
              call.name,
              "with args:",
              call.args
            );

            if (
              call.name === "update_whiteboard" ||
              call.name === "get_whiteboard_info" ||
              call.name === "move_task"
            ) {
              console.log("📝 Processing tool call:", call.name, call.args);

              try {
                // Process the tool call and get response
                const result = processToolCall(
                  // We need to get current data - let's pass it via global function
                  (window as any).getCurrentWhiteboardData?.() || {
                    elements: [],
                  },
                  call.name,
                  call.args
                );

                // Send success response back to Gemini FIRST
                clientRef.current?.sendToolResponse({
                  functionResponses: [
                    {
                      name: call.name,
                      id: call.id,
                      response: result.response,
                    },
                  ],
                });

                console.log(
                  "✅ Sent tool response back to Gemini:",
                  result.response
                );

                // If there's new data, update the whiteboard
                if (result.newData && call.args) {
                  console.log("🎨 Updating whiteboard with new data");

                  // Try global function first (main method)
                  if ((window as any).updateWhiteboardFromGemini) {
                    console.log(
                      "🌍 Using global function to update whiteboard"
                    );
                    (window as any).updateWhiteboardFromGemini(call.args);
                  } else if (onWhiteboardUpdate) {
                    // Fallback to callback if provided
                    console.log("📞 Using callback to update whiteboard");
                    onWhiteboardUpdate(result.newData);
                  } else {
                    console.warn("⚠️ No whiteboard update handler available");
                  }
                }
              } catch (error) {
                console.error("❌ Error processing tool call:", error);

                // Send error response back to Gemini
                clientRef.current?.sendToolResponse({
                  functionResponses: [
                    {
                      name: call.name,
                      id: call.id,
                      response: {
                        success: false,
                        error:
                          error instanceof Error
                            ? error.message
                            : "Unknown error",
                      },
                    },
                  ],
                });
              }
            } else {
              console.log("❓ Unknown function call:", call.name);
            }
          });
        } else {
          console.warn("⚠️ No functionCalls in tool call:", toolCall);
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
    console.log("📋 Tools being passed to Gemini Live:", config.tools);
    const toolsArray = config.tools as Array<{ functionDeclarations: any[] }>;
    console.log(
      "🔧 Number of tools:",
      toolsArray?.[0]?.functionDeclarations?.length
    );
    console.log(
      "🛠️ Tool names:",
      toolsArray?.[0]?.functionDeclarations?.map((t: any) => t.name)
    );

    setState((prev) => ({ ...prev, error: undefined }));
    clientRef.current.disconnect();

    try {
      await clientRef.current.connect(model, config);
      console.log("Connected successfully!");
      console.log("✅ Connection established with tools enabled");
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
