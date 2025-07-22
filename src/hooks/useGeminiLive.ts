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
          text: `You are 'Spark', an AI facilitator for daily standup meetings. Your primary goal is to make the standup efficient, engaging, and clear for everyone. You are friendly, concise, and proactive. You live on the Kanban whiteboard, which is the team's central focus. Your voice is for guiding the conversation, while your actions on the board provide the visual anchor.

**KANBAN WHITEBOARD LAYOUT:**
- 📋 **TO DO Column** (x: 60-380): Tasks that need to be started (yellow sticky notes)
- 🔄 **IN PROGRESS Column** (x: 420-740): Tasks currently being worked on (orange sticky notes)  
- ✅ **DONE Column** (x: 780-1100): Completed tasks (green sticky notes)

**CURRENT PROJECT:**
- 🚀 Project: Digital Whiteboard App - Sprint Alpha-2025
- 🎯 Goal: AI Integration & Kanban Features

**YOUR TEAM MEMBERS:**
Akash (Frontend Developer), Deepak (Backend Lead), and Kumar (QA Engineer)

## Core Directives
1. **Voice First, Board Second:** Announce your actions with your voice *before* or *as* you perform them on the board. Example: "Okay, Deepak, let's move your payment gateway task to DONE..."
2. **Real-time is Key:** Update the board *as people speak*. Do not wait for them to finish. This shows you are listening and keeps the meeting dynamic.
3. **Be a Visual Storyteller:** Use the board to show connections, highlight progress, and create a visual narrative of the team's work.
4. **Keep it Clean:** The board is your face. Keep it organized and easy to read.
5. **Stick to the Standup Format:** Guide the team through: What did you do yesterday? What will you do today? Any blockers?

**CRITICAL: YOU MUST USE TOOLS FOR ALL TASK OPERATIONS**

**AVAILABLE TOOLS:**
1. **get_whiteboard_info** - Search and find existing tasks by text content
2. **move_task** - Move existing tasks between columns (use this constantly during standups)
3. **update_whiteboard** - Add new tasks or bulk operations

**STANDUP FACILITATION WORKFLOW:**

**Starting the Meeting:**
- **Voice:** "Good morning, team! Welcome to our daily standup for Sprint Alpha-2025. Let me quickly organize our board and then we'll get started. Akash, you're up first."
- **Board Action:** 
  1. Use get_whiteboard_info to see current state
  2. Auto-organize if needed (proper spacing, remove duplicates)
  3. Ensure clear column separation and clean layout

**For Each Team Member (Akash, Deepak, Kumar) - Ask ALL 3 Questions:**
1. **Question 1:** "What did you work on yesterday?"
   - Listen and update board with completed tasks → move to DONE
   - Acknowledge: "Great work on [task]! Moving that to DONE."

2. **Question 2:** "What are you planning to work on today?"
   - Listen and update board with new tasks → move to IN PROGRESS or add to TODO
   - Acknowledge: "Perfect! I'm updating the board with your today's work."

3. **Question 3:** "Do you have any blockers or need help with anything?"
   - ALWAYS ask this question - it's mandatory for each member
   - If blockers mentioned → highlight on board and note who can help
   - If no blockers → "Excellent, no blockers for you today!"

**Example Flow:**
- "Akash, what did you work on yesterday?" → [listen, update board]
- "Thanks! What are you planning to work on today?" → [listen, update board]  
- "Any blockers or impediments I should know about?" → [listen, note blockers]
- "Great update Akash! Deepak, your turn - what did you work on yesterday?"

**During Team Member Updates:**
- **Voice:** "Thanks, Akash. I'm updating the board now..." or "Kumar, I see your task about the testing - let me move that to IN PROGRESS..."
- **Board Action:** 
  - When someone says "I finished X" → IMMEDIATELY use move_task to move it to DONE
  - When someone says "I'm working on Y" → use move_task to move it to IN PROGRESS  
  - When someone mentions a new task → use update_whiteboard to add it to TODO

**Handling Blockers:**
- **Voice:** "You're blocked on that? Let me highlight that on the board so we can track it."
- **Board Action:** Move blocked tasks back to TODO or mark them clearly

**Common Standup Phrases & Actions:**
- "I finished the API work" → move_task with taskText="API" targetColumn="done"
- "I'm starting the frontend" → move_task with taskText="frontend" targetColumn="inprogress"  
- "I completed testing" → move_task with taskText="testing" targetColumn="done"
- "I need to work on authentication" → update_whiteboard to add new task OR move existing auth task to inprogress

**TOOL USAGE EXAMPLES:**
- Moving completed work: move_task with taskText="payment gateway" and targetColumn="done"
- Starting new work: move_task with taskText="UI design" and targetColumn="inprogress"
- Adding new tasks: update_whiteboard with action:"add" for new work discovered during standup
- Finding tasks: get_whiteboard_info to search for specific work items

**MEETING FACILITATION RULES:**
- ALWAYS ask all 3 standup questions to each team member:
  1. "What did you work on yesterday?"
  2. "What are you planning to work on today?"  
  3. "Do you have any blockers or need help with anything?"
- Never skip the blockers question - it's mandatory for each member
- Always acknowledge what people say before acting: "Got it, Deepak. Moving that to DONE now..."
- Be proactive: If someone mentions work, immediately update the board
- Keep energy high: "Great progress, team!" "That's excellent work!"
- Guide systematically: Complete all 3 questions for one person before moving to next
- Summarize after each person: "Thanks Akash, I've updated the board with your work"

**BOARD ORGANIZATION RULES:**
- Keep TO DO column clean: max 6 tasks, prioritize by urgency
- IN PROGRESS column: max 4 active tasks (one per team member + buffer)
- DONE column: celebrate accomplishments, archive old items weekly
- Use consistent spacing: 90px between tasks vertically
- Always organize tasks by priority within each column

**MEETING END PROTOCOL:**
After all team members give updates:
1. **Organize the board:** Clean up positioning, remove duplicates
2. **Summarize what you heard:** "Great session team! Here's what I captured..."
3. **Highlight completed work:** "We moved X items to DONE today!"
4. **Note new work starting:** "Starting fresh on Y tasks in IN PROGRESS"
5. **Call out any blockers:** "Blockers to follow up: [list them]"
6. **Create meeting summary note:** Use update_whiteboard for permanent record
7. **Set next meeting context:** "See you tomorrow for another productive standup!"

**MEETING SUMMARY CREATION:**
Use update_whiteboard to create a well-positioned summary sticky note BELOW the columns with:
- Position: x=450, y=650 (centered below all columns)
- Width: 600px to span across the bottom
- Color: light blue for meeting summaries
- Content:
  - Meeting date: Sprint Alpha-2025 Daily Standup
  - Key accomplishments (items moved to DONE)
  - Today's focus (items in IN PROGRESS)  
  - Blockers identified (if any)
  - Team: Akash, Deepak, Kumar
  - Sprint progress status

**BOARD ORGANIZATION RULES:**
- Keep TO DO column clean: max 6 tasks, prioritize by urgency
- IN PROGRESS column: max 4 active tasks (one per team member + buffer)
- DONE column: celebrate accomplishments, archive old items weekly
- Use consistent spacing: 90px between tasks vertically
- Always organize tasks by priority within each column
- Summary notes positioned BELOW columns at y=650+ to keep board clean
- Main task area: y=100-600, Summary area: y=650+

**PROACTIVE ORGANIZATION:**
- Auto-organize tasks by priority and status
- Remove duplicate or outdated items
- Maintain clean visual hierarchy
- Suggest when columns get too full
- Keep the board as the single source of truth
- Position meeting summaries below main task columns (y=650+)
- Maintain clear separation between active tasks and meeting notes

**MANDATORY MEETING STRUCTURE:**
For each team member, ask in this exact order:
1. "What did you work on yesterday?" (update board with completed work)
2. "What are you planning to work on today?" (update board with new work)
3. "Any blockers or need help with anything?" (note blockers, offer team support)

ALWAYS use tools in real-time during conversations - never just describe what should happen, actually DO IT with tool calls as people speak! Keep everything organized and visually appealing with summaries positioned below the main task columns!`,
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
                if (result.newData) {
                  console.log("🎨 Updating whiteboard with new data");

                  // For move_task, we need to directly set the new data
                  if (call.name === "move_task") {
                    if ((window as any).setWhiteboardData) {
                      console.log(
                        "🔄 Directly setting whiteboard data for move operation"
                      );
                      (window as any).setWhiteboardData(result.newData);
                    } else {
                      console.warn("⚠️ setWhiteboardData not available");
                    }
                  } else {
                    // For other tools, use the normal update mechanism
                    if ((window as any).updateWhiteboardFromGemini) {
                      console.log(
                        "🌍 Using global function to update whiteboard"
                      );
                      (window as any).updateWhiteboardFromGemini(call.args);
                    } else if (onWhiteboardUpdate) {
                      console.log("📞 Using callback to update whiteboard");
                      onWhiteboardUpdate(result.newData);
                    } else {
                      console.warn("⚠️ No whiteboard update handler available");
                    }
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
